/**
 * Storm Room Durable Object — WebSocket chat server.
 *
 * One instance per active storm room.
 * Handles: connect, broadcast, history (last 50 msgs), user presence.
 *
 * Phase 3 feature — wired up after API + auth are stable.
 */

export class StormRoomDO {
  constructor(state, env) {
    this.state    = state
    this.env      = env
    this.sessions = new Map()    // sessionId → { ws, userId, username, color }
  }

  async fetch(req) {
    const url = new URL(req.url)

    // WebSocket upgrade
    if (req.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(req)
    }

    // HTTP: get room stats
    if (url.pathname === '/stats') {
      return Response.json({ users: this.sessions.size })
    }

    return new Response('Storm Room DO', { status: 200 })
  }

  async handleWebSocket(req) {
    const url    = new URL(req.url)
    const token  = url.searchParams.get('token')

    // Validate JWT (simplified — full validation in production)
    let user = { sub:'anon', username:'anonymous', avatarColor:'#3A4460' }
    if (token && token !== 'dev-token') {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        user = payload
      } catch {}
    }

    const { 0: client, 1: server } = new WebSocketPair()
    this.state.acceptWebSocket(server)

    const sessionId = crypto.randomUUID()
    this.sessions.set(sessionId, { ws:server, ...user })

    server.addEventListener('message', (event) => {
      this.handleMessage(sessionId, event.data)
    })

    server.addEventListener('close', () => {
      this.sessions.delete(sessionId)
      this.broadcast({ type:'user_count', count: this.sessions.size })
    })

    // Send history (last 50 messages from DO storage)
    const history = await this.state.storage.get('history') ?? []
    server.send(JSON.stringify({ type:'history', messages: history.slice(-50) }))

    // Broadcast updated user count
    this.broadcast({ type:'user_count', count: this.sessions.size })

    return new Response(null, { status:101, webSocket:client })
  }

  handleMessage(sessionId, raw) {
    let data
    try { data = JSON.parse(raw) } catch { return }

    const session = this.sessions.get(sessionId)
    if (!session) return

    if (data.type === 'message' && data.content?.trim()) {
      const msg = {
        id:        crypto.randomUUID(),
        user:      session.username,
        color:     session.avatarColor ?? '#38BDF8',
        time:      new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),
        msg:       data.content.trim().slice(0, 2000),
        mapPin:    data.mapPin ?? null,
        createdAt: Date.now(),
      }

      // Persist to storage
      this.state.storage.get('history').then(h => {
        const history = h ?? []
        history.push(msg)
        this.state.storage.put('history', history.slice(-200))  // keep last 200
      })

      this.broadcast({ type:'message', payload: msg })
    }
  }

  broadcast(data) {
    const json = JSON.stringify(data)
    this.sessions.forEach(({ ws }) => {
      try { ws.send(json) } catch {}
    })
  }
}

/**
 * UserPresenceDO — per-user Durable Object.
 *
 * Handles:
 * - WebSocket connection for real-time DM + notification delivery
 * - Online presence tracking
 * - Accepts HTTP POST from API worker to push events to user
 *
 * Routes:
 *   GET  /user/:userId (WebSocket upgrade) — client connects here
 *   POST /user/:userId/push                — API pushes events here
 *   GET  /user/:userId/status              — check online status
 */
export class UserPresenceDO {
  constructor(state, env) {
    this.state    = state
    this.env      = env
    this.sockets  = new Map()  // socketId → { ws, connectedAt }
  }

  async fetch(req) {
    const url = new URL(req.url)

    // WebSocket upgrade — client connecting
    if (req.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(req)
    }

    // POST /push — API worker pushes an event to this user
    if (req.method === 'POST' && url.pathname.endsWith('/push')) {
      return this.handlePush(req)
    }

    // GET /status — check if user is online
    if (url.pathname.endsWith('/status')) {
      return Response.json({
        online:  this.sockets.size > 0,
        sockets: this.sockets.size,
      })
    }

    return new Response('UserPresenceDO', { status: 200 })
  }

  async handleWebSocket(req) {
    const url   = new URL(req.url)
    const token = url.searchParams.get('token')

    let user = { sub:'anon', username:'anonymous' }
    if (token && token !== 'dev-token') {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        user = payload
      } catch {}
    }

    const { 0: client, 1: server } = new WebSocketPair()
    this.state.acceptWebSocket(server)

    const socketId = crypto.randomUUID()
    this.sockets.set(socketId, { ws: server, connectedAt: Date.now(), ...user })

    // Send current state
    server.send(JSON.stringify({
      type: 'connected',
      socketId,
      timestamp: Date.now(),
    }))

    // Send any queued events (stored while user was offline)
    const queue = await this.state.storage.get('event_queue') ?? []
    if (queue.length > 0) {
      for (const event of queue) {
        server.send(JSON.stringify(event))
      }
      await this.state.storage.delete('event_queue')
    }

    server.addEventListener('message', (event) => {
      this.handleClientMessage(socketId, event.data)
    })

    server.addEventListener('close', () => {
      this.sockets.delete(socketId)
    })

    return new Response(null, { status: 101, webSocket: client })
  }

  handleClientMessage(socketId, raw) {
    let data
    try { data = JSON.parse(raw) } catch { return }

    // Client can send typing indicators, read receipts, etc.
    if (data.type === 'ping') {
      const sock = this.sockets.get(socketId)
      if (sock?.ws) sock.ws.send(JSON.stringify({ type: 'pong' }))
    }

    if (data.type === 'dm_read') {
      // Could forward read receipt to the sender's DO
      // For now, just acknowledge
    }
  }

  /**
   * Push an event to this user.
   * Called by the API worker when something happens:
   *   - New DM received
   *   - Notification created
   *   - Model run completed
   *   - Battle update
   *
   * Body: { type: 'dm'|'notification'|'model_alert'|..., payload: {...} }
   */
  async handlePush(req) {
    const event = await req.json()
    event.timestamp = event.timestamp ?? Date.now()

    if (this.sockets.size > 0) {
      // User is online — push immediately
      const json = JSON.stringify(event)
      this.sockets.forEach(({ ws }) => {
        try { ws.send(json) } catch {}
      })
      return Response.json({ delivered: true, sockets: this.sockets.size })
    } else {
      // User is offline — queue for next connect (keep last 50)
      const queue = await this.state.storage.get('event_queue') ?? []
      queue.push(event)
      await this.state.storage.put('event_queue', queue.slice(-50))
      return Response.json({ delivered: false, queued: true })
    }
  }
}

// ── Worker entry ──────────────────────────────────
export default {
  async fetch(req, env) {
    const url  = new URL(req.url)
    const parts = url.pathname.split('/').filter(Boolean)
    // /room/:roomId → StormRoomDO
    // /user/:userId → UserPresenceDO

    if (parts[0] === 'room' && parts[1]) {
      const id  = env.STORM_ROOM.idFromName(parts[1])
      return env.STORM_ROOM.get(id).fetch(req)
    }

    if (parts[0] === 'user' && parts[1]) {
      const id  = env.USER_PRESENCE.idFromName(parts[1])
      return env.USER_PRESENCE.get(id).fetch(req)
    }

    return new Response('Unknown route. Use /room/:id or /user/:id', { status: 400 })
  }
}
