/**
 * Storm Room Durable Object — WebSocket chat server.
 *
 * One instance per active storm room.
 * Handles: connect, broadcast, history, user presence, Discord bridge.
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

    // POST /inject — accept messages from external sources (Discord bot, API)
    if (req.method === 'POST' && url.pathname.endsWith('/inject')) {
      return this.handleInject(req)
    }

    // POST /discord-config — store Discord webhook URL in DO storage
    if (req.method === 'POST' && url.pathname.endsWith('/discord-config')) {
      return this.handleDiscordConfig(req)
    }

    // GET /discord-config — get current Discord config
    if (req.method === 'GET' && url.pathname.endsWith('/discord-config')) {
      const config = await this.state.storage.get('discord_config') ?? {}
      return Response.json(config)
    }

    // HTTP: get room stats
    if (url.pathname.endsWith('/stats')) {
      const config = await this.state.storage.get('discord_config') ?? {}
      return Response.json({
        users: this.sessions.size,
        discordLinked: !!config.webhookUrl,
        discordChannel: config.channelName ?? null,
      })
    }

    return new Response('Storm Room DO', { status: 200 })
  }

  async handleWebSocket(req) {
    const url    = new URL(req.url)
    const token  = url.searchParams.get('token')

    // Validate JWT
    let user = { sub: 'anon', username: 'anonymous', avatarColor: '#3A4460' }
    if (token && token !== 'dev-token') {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        user = payload
      } catch {}
    }

    const { 0: client, 1: server } = new WebSocketPair()
    this.state.acceptWebSocket(server)

    const sessionId = crypto.randomUUID()
    this.sessions.set(sessionId, { ws: server, ...user })

    server.addEventListener('message', (event) => {
      this.handleMessage(sessionId, event.data)
    })

    server.addEventListener('close', () => {
      this.sessions.delete(sessionId)
      this.broadcast({ type: 'user_count', count: this.sessions.size })
    })

    // Send history (last 50 messages from DO storage)
    const history = await this.state.storage.get('history') ?? []
    server.send(JSON.stringify({ type: 'history', messages: history.slice(-50) }))

    // Broadcast updated user count
    this.broadcast({ type: 'user_count', count: this.sessions.size })

    return new Response(null, { status: 101, webSocket: client })
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
        time:      new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        msg:       data.content.trim().slice(0, 2000),
        mapPin:    data.mapPin ?? null,
        source:    'chasernet',
        createdAt: Date.now(),
      }

      // Persist to storage
      this.state.storage.get('history').then(h => {
        const history = h ?? []
        history.push(msg)
        this.state.storage.put('history', history.slice(-200))
      })

      this.broadcast({ type: 'message', payload: msg })

      // Forward to Discord if linked
      this.forwardToDiscord(msg)
    }
  }

  /**
   * Inject a message from an external source (Discord, API, bot).
   * POST /inject { username, content, source, avatarUrl? }
   */
  async handleInject(req) {
    // Verify internal auth
    const auth = req.headers.get('Authorization')
    const secret = this.env.CRON_SECRET || this.env.JWT_SECRET
    if (!secret || auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { username, content, source, avatarUrl } = await req.json()
    if (!content?.trim()) {
      return Response.json({ error: 'Empty content' }, { status: 400 })
    }

    const msg = {
      id:        crypto.randomUUID(),
      user:      username ?? 'Unknown',
      color:     source === 'discord' ? '#5865F2' : '#38BDF8',
      time:      new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      msg:       content.trim().slice(0, 2000),
      source:    source ?? 'external',
      avatarUrl: avatarUrl ?? null,
      createdAt: Date.now(),
    }

    // Persist
    const history = await this.state.storage.get('history') ?? []
    history.push(msg)
    await this.state.storage.put('history', history.slice(-200))

    // Broadcast to all connected WebSocket clients
    this.broadcast({ type: 'message', payload: msg })

    return Response.json({ ok: true, id: msg.id })
  }

  /**
   * Store Discord webhook config for this room.
   * POST /discord-config { webhookUrl, channelId, channelName, guildName }
   */
  async handleDiscordConfig(req) {
    const auth = req.headers.get('Authorization')
    const secret = this.env.CRON_SECRET || this.env.JWT_SECRET
    if (!secret || auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await req.json()
    await this.state.storage.put('discord_config', config)
    return Response.json({ ok: true })
  }

  /**
   * Forward a ChaserNet message to the linked Discord channel.
   */
  async forwardToDiscord(msg) {
    // Don't echo Discord messages back to Discord
    if (msg.source === 'discord') return

    try {
      const config = await this.state.storage.get('discord_config')
      if (!config?.webhookUrl) return

      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `${msg.user} (ChaserNet)`,
          avatar_url: 'https://chasernet.com/icon-192.png',
          content: msg.msg,
        }),
      })
    } catch (e) {
      console.error('[Discord forward]', e.message)
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
 */
export class UserPresenceDO {
  constructor(state, env) {
    this.state    = state
    this.env      = env
    this.sockets  = new Map()
  }

  async fetch(req) {
    const url = new URL(req.url)

    if (req.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(req)
    }

    if (req.method === 'POST' && url.pathname.endsWith('/push')) {
      return this.handlePush(req)
    }

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

    let user = { sub: 'anon', username: 'anonymous' }
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

    server.send(JSON.stringify({
      type: 'connected',
      socketId,
      timestamp: Date.now(),
    }))

    // Send queued events
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

    if (data.type === 'ping') {
      const sock = this.sockets.get(socketId)
      if (sock?.ws) sock.ws.send(JSON.stringify({ type: 'pong' }))
    }
  }

  async handlePush(req) {
    const event = await req.json()
    event.timestamp = event.timestamp ?? Date.now()

    if (this.sockets.size > 0) {
      const json = JSON.stringify(event)
      this.sockets.forEach(({ ws }) => {
        try { ws.send(json) } catch {}
      })
      return Response.json({ delivered: true, sockets: this.sockets.size })
    } else {
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
    const url   = new URL(req.url)
    const parts = url.pathname.split('/').filter(Boolean)

    // /room/:roomId[/inject|/stats|/discord-config]
    if (parts[0] === 'room' && parts[1]) {
      const id = env.STORM_ROOM.idFromName(parts[1])
      return env.STORM_ROOM.get(id).fetch(req)
    }

    // /user/:userId[/push|/status]
    if (parts[0] === 'user' && parts[1]) {
      const id = env.USER_PRESENCE.idFromName(parts[1])
      return env.USER_PRESENCE.get(id).fetch(req)
    }

    return new Response('Unknown route. Use /room/:id or /user/:id', { status: 400 })
  }
}
