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

// ── Worker entry ──────────────────────────────────
export default {
  async fetch(req, env) {
    const url    = new URL(req.url)
    const roomId = url.pathname.split('/')[2]  // /room/:roomId

    if (!roomId) return new Response('Room ID required', { status: 400 })

    const id  = env.STORM_ROOM.idFromName(roomId)
    const obj = env.STORM_ROOM.get(id)
    return obj.fetch(req)
  }
}
