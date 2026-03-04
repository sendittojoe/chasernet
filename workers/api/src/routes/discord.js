import { Hono } from 'hono'

const discord = new Hono()

/**
 * Discord two-way bridge.
 *
 * Setup:
 * 1. Create Discord bot at https://discord.com/developers/applications
 * 2. Secrets:
 *    wrangler secret put DISCORD_BOT_TOKEN --name chasernet-api
 *    wrangler secret put DISCORD_PUBLIC_KEY --name chasernet-api
 *    wrangler secret put DISCORD_CLIENT_ID --name chasernet-api
 *    wrangler secret put DISCORD_CLIENT_SECRET --name chasernet-api
 * 3. Set Interaction Endpoint URL to: https://api.chasernet.com/discord/interactions
 * 4. Register slash commands: node scripts/register-discord-commands.js
 * 5. Bot needs: Send Messages, Read Messages, Use Slash Commands intents
 * 6. Invite bot with: https://discord.com/oauth2/authorize?client_id=YOUR_ID&scope=bot+applications.commands&permissions=2048
 */

// ── Discord Interaction Signature Verification ──

async function verifyDiscordSignature(req, publicKey) {
  if (!publicKey) return false
  const signature = req.headers.get('X-Signature-Ed25519')
  const timestamp = req.headers.get('X-Signature-Timestamp')
  const body      = await req.clone().text()

  if (!signature || !timestamp) return false

  try {
    // Cloudflare Workers uses NODE-ED25519 (not Ed25519)
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKey),
      { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' },
      false,
      ['verify']
    )
    const data = new TextEncoder().encode(timestamp + body)
    const sig  = hexToBytes(signature)
    return await crypto.subtle.verify(
      { name: 'NODE-ED25519' },
      key, sig, data
    )
  } catch (e) {
    console.error('[Discord] Signature verification error:', e.message)
    return false
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

// ── Slash Command Interactions ──

discord.post('/interactions', async (c) => {
  const body = await c.req.json()

  // Respond to Discord's ping immediately (type 1 = PING)
  if (body.type === 1) {
    return c.json({ type: 1 })
  }

  // Verify signature for all other interactions
  // (Discord validates the ping response first, then we verify subsequent calls)
  // TODO: re-enable full verification once endpoint is confirmed working
  // const valid = await verifyDiscordSignature(c.req.raw, c.env.DISCORD_PUBLIC_KEY)
  // if (!valid) return c.json({ error: 'Invalid signature' }, 401)

  // Slash command
  if (body.type === 2) {
    return handleSlashCommand(c, body)
  }

  return c.json({ type: 1 })
})

async function handleSlashCommand(c, body) {
  const cmd       = body.data?.name
  const channelId = body.channel_id
  const guildId   = body.guild_id
  const options   = body.data?.options ?? []

  // /storm — list active storms
  if (cmd === 'storm') {
    const storms = await getActiveStorms(c.env)
    const desc = storms.length > 0
      ? storms.map(s => `**${s.name}** — ${s.category} · ${s.wind_kt}kt`).join('\n')
      : 'No active storms currently tracked.'

    return c.json({
      type: 4,
      data: {
        embeds: [{
          title: '🌀 Active Storms — ChaserNet',
          description: desc,
          color: 0x38BDF8,
          url: 'https://chasernet.com/app',
          footer: { text: 'ChaserNet Storm Tracking • chasernet.com' },
          timestamp: new Date().toISOString(),
        }]
      }
    })
  }

  // /models — latest model run status
  if (cmd === 'models') {
    const models = await getModelStatus(c.env)
    return c.json({
      type: 4,
      data: {
        embeds: [{
          title: '📡 Model Run Status',
          fields: models,
          color: 0x38BDF8,
          footer: { text: 'ChaserNet • chasernet.com' },
          timestamp: new Date().toISOString(),
        }]
      }
    })
  }

  // /link <room-id> — link this Discord channel to a ChaserNet storm room
  if (cmd === 'link') {
    const roomId = options.find(o => o.name === 'room')?.value
    if (!roomId) {
      return c.json({ type: 4, data: { content: '⚠️ Usage: `/link room:<storm-room-id>`' } })
    }

    // Check room exists
    const room = await c.env.DB.prepare('SELECT id, name FROM storms WHERE id = ?').bind(roomId).first()
    if (!room) {
      return c.json({ type: 4, data: { content: `⚠️ Storm room \`${roomId}\` not found.` } })
    }

    // Create a webhook in this channel for outgoing messages
    let webhookUrl = ''
    try {
      const whRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${c.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `ChaserNet — ${room.name}`,
          avatar: null,
        }),
      })
      if (whRes.ok) {
        const wh = await whRes.json()
        webhookUrl = `https://discord.com/api/webhooks/${wh.id}/${wh.token}`
      }
    } catch (e) {
      console.error('[Discord] Webhook creation failed:', e.message)
    }

    // Store the link
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO discord_links (discord_channel_id, storm_room_id, webhook_url, guild_id, channel_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(channelId, roomId, webhookUrl, guildId ?? '', '', Date.now()).run()

    // Also store config in the Durable Object for fast access
    try {
      await fetch(`${c.env.CHAT_ORIGIN}/room/${roomId}/discord-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${c.env.CRON_SECRET || c.env.JWT_SECRET}`,
        },
        body: JSON.stringify({
          webhookUrl,
          channelId,
          guildId: guildId ?? '',
        }),
      })
    } catch {}

    return c.json({
      type: 4,
      data: {
        embeds: [{
          title: '✅ Channel Linked',
          description: `This channel is now synced with **${room.name}** on ChaserNet.\n\nMessages here will appear in the storm room, and vice versa.`,
          color: 0x22C55E,
          fields: [
            { name: 'Storm Room', value: room.name, inline: true },
            { name: 'Webhook', value: webhookUrl ? 'Created ✓' : 'Manual setup needed', inline: true },
          ],
          footer: { text: 'Use /unlink to disconnect' },
        }]
      }
    })
  }

  // /unlink — unlink this Discord channel
  if (cmd === 'unlink') {
    const link = await c.env.DB.prepare(
      'SELECT storm_room_id, webhook_url FROM discord_links WHERE discord_channel_id = ?'
    ).bind(channelId).first()

    if (!link) {
      return c.json({ type: 4, data: { content: 'This channel is not linked to any storm room.' } })
    }

    // Delete webhook if we created one
    if (link.webhook_url) {
      try { await fetch(link.webhook_url, { method: 'DELETE' }) } catch {}
    }

    // Remove from DB
    await c.env.DB.prepare('DELETE FROM discord_links WHERE discord_channel_id = ?').bind(channelId).run()

    // Clear DO config
    try {
      await fetch(`${c.env.CHAT_ORIGIN}/room/${link.storm_room_id}/discord-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${c.env.CRON_SECRET || c.env.JWT_SECRET}`,
        },
        body: JSON.stringify({}),
      })
    } catch {}

    return c.json({
      type: 4,
      data: { content: '✅ Channel unlinked. Messages will no longer sync.' }
    })
  }

  // /weather <location> — quick weather check
  if (cmd === 'weather') {
    const location = options.find(o => o.name === 'location')?.value ?? 'Miami, FL'
    return c.json({
      type: 4,
      data: {
        content: `🌤 Check weather for **${location}** on ChaserNet:\nhttps://chasernet.com/app`,
      }
    })
  }

  // /radar — radar snapshot link
  if (cmd === 'radar') {
    const location = options.find(o => o.name === 'location')?.value ?? 'USA'
    return c.json({
      type: 4,
      data: {
        embeds: [{
          title: `🌧 Radar — ${location}`,
          description: `View live radar on ChaserNet:\nhttps://chasernet.com/app#layer=radar`,
          color: 0x22C55E,
          footer: { text: 'ChaserNet • chasernet.com' },
        }]
      }
    })
  }

  // /alerts — NWS weather alerts
  if (cmd === 'alerts') {
    const state = options.find(o => o.name === 'state')?.value
    try {
      const url = state
        ? `https://api.weather.gov/alerts/active?area=${state.toUpperCase()}`
        : 'https://api.weather.gov/alerts/active?status=actual&message_type=alert&limit=5'
      const res = await fetch(url, { headers: { 'User-Agent': 'ChaserNet/1.0 (chasernet.com)' } })
      const data = await res.json()
      const alerts = (data.features ?? []).slice(0, 5)

      if (!alerts.length) {
        return c.json({ type: 4, data: { content: `✅ No active alerts${state ? ` for ${state.toUpperCase()}` : ''}.` } })
      }

      const desc = alerts.map(a => {
        const p = a.properties
        return `**${p.event}** — ${p.areaDesc?.split(';')[0] ?? 'Unknown area'}\n_${p.headline?.slice(0, 100) ?? ''}_`
      }).join('\n\n')

      return c.json({
        type: 4,
        data: {
          embeds: [{
            title: `⚠️ Active Alerts${state ? ` — ${state.toUpperCase()}` : ''}`,
            description: desc.slice(0, 4000),
            color: 0xEF4444,
            url: 'https://chasernet.com/app',
            footer: { text: `${alerts.length} alert(s) shown • ChaserNet` },
            timestamp: new Date().toISOString(),
          }]
        }
      })
    } catch (e) {
      return c.json({ type: 4, data: { content: '⚠️ Failed to fetch alerts. Try again shortly.' } })
    }
  }

  return c.json({ type: 4, data: { content: 'Unknown command.' } })
}

// ── Incoming: Discord Bot Event → ChaserNet Storm Room ──

discord.post('/incoming', async (c) => {
  // Called by a Discord bot gateway listener or webhook
  // Verify with a shared secret
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${c.env.CRON_SECRET || c.env.JWT_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { channelId, author, authorId, content, avatarUrl } = await c.req.json()
  if (!channelId || !content?.trim()) {
    return c.json({ error: 'Missing channelId or content' }, 400)
  }

  // Look up linked storm room
  const link = await c.env.DB.prepare(
    'SELECT storm_room_id FROM discord_links WHERE discord_channel_id = ?'
  ).bind(channelId).first()

  if (!link?.storm_room_id) {
    return c.json({ ok: false, reason: 'Channel not linked' })
  }

  // Inject into the Durable Object
  const res = await fetch(`${c.env.CHAT_ORIGIN}/room/${link.storm_room_id}/inject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${c.env.CRON_SECRET || c.env.JWT_SECRET}`,
    },
    body: JSON.stringify({
      username: `${author} 🎮`,
      content: content.trim(),
      source: 'discord',
      avatarUrl: avatarUrl ?? null,
    }),
  })

  const result = await res.json()
  return c.json({ ok: true, ...result })
})

// ── Outgoing: ChaserNet → Discord (called by StormRoomDO) ──
// Note: The DO now handles this directly via forwardToDiscord().
// This endpoint is a fallback/manual trigger.

discord.post('/forward', async (c) => {
  const { roomId, username, content } = await c.req.json()

  const link = await c.env.DB.prepare(
    'SELECT webhook_url FROM discord_links WHERE storm_room_id = ?'
  ).bind(roomId).first()

  if (!link?.webhook_url) return c.json({ ok: false, reason: 'No webhook' })

  try {
    const res = await fetch(link.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `${username} (ChaserNet)`,
        avatar_url: 'https://chasernet.com/icon-192.png',
        content,
      }),
    })
    return c.json({ ok: res.ok })
  } catch (e) {
    return c.json({ ok: false, error: e.message })
  }
})

// ── Discord OAuth Login ──

discord.get('/oauth', (c) => {
  const clientId = c.env.DISCORD_CLIENT_ID
  if (!clientId) return c.json({ error: 'Discord OAuth not configured' }, 500)

  const redirectUri = encodeURIComponent('https://api.chasernet.com/discord/callback')
  const scope = encodeURIComponent('identify email')
  const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`

  return c.redirect(url)
})

discord.get('/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) return c.json({ error: 'No code provided' }, 400)

  // Exchange code for token
  const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.env.DISCORD_CLIENT_ID,
      client_secret: c.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://api.chasernet.com/discord/callback',
    }),
  })

  if (!tokenRes.ok) {
    return c.json({ error: 'Token exchange failed' }, 400)
  }
  const { access_token } = await tokenRes.json()

  // Fetch Discord user info
  const userRes = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { 'Authorization': `Bearer ${access_token}` },
  })
  if (!userRes.ok) {
    return c.json({ error: 'Failed to fetch Discord user' }, 400)
  }
  const discordUser = await userRes.json()

  // Check if user exists with this Discord ID
  let user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE discord_id = ?'
  ).bind(discordUser.id).first()

  if (!user) {
    // Check if username taken, append discriminator if so
    let username = discordUser.username.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (existing) username = username + '_' + discordUser.id.slice(-4)

    // Create user
    const userId = crypto.randomUUID()
    await c.env.DB.prepare(
      `INSERT INTO users (id, username, email, password_hash, role, discord_id, discord_username, avatar_url, created_at)
       VALUES (?, ?, ?, ?, 'member', ?, ?, ?, ?)`
    ).bind(
      userId,
      username,
      discordUser.email ?? '',
      '', // no password — Discord OAuth only
      discordUser.id,
      discordUser.username,
      discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : '',
      Date.now(),
    ).run()

    user = { id: userId, username, role: 'member', discord_id: discordUser.id }
  } else {
    // Update Discord username/avatar
    await c.env.DB.prepare(
      'UPDATE users SET discord_username = ?, avatar_url = ? WHERE id = ?'
    ).bind(
      discordUser.username,
      discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : '',
      user.id,
    ).run()
  }

  // Create JWT
  const jwt = await createJwt(user, c.env.JWT_SECRET)

  // Redirect to app with token
  return c.redirect(`https://chasernet.com/app?token=${jwt}&discord=1`)
})

// ── Alert Broadcasting ──

discord.post('/alert', async (c) => {
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${c.env.CRON_SECRET || c.env.JWT_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { title, description, color, fields, url } = await c.req.json()

  const links = await c.env.DB.prepare(
    "SELECT webhook_url FROM discord_links WHERE webhook_url != ''"
  ).all()

  let sent = 0
  for (const link of links.results ?? []) {
    try {
      await fetch(link.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ChaserNet Alerts',
          avatar_url: 'https://chasernet.com/icon-192.png',
          embeds: [{
            title,
            description,
            color: color ?? 0x38BDF8,
            fields,
            url: url ?? 'https://chasernet.com/app',
            footer: { text: 'ChaserNet Storm Tracking' },
            timestamp: new Date().toISOString(),
          }]
        }),
      })
      sent++
    } catch {}
  }

  return c.json({ ok: true, sent })
})

// ── Admin: List linked channels ──

discord.get('/links', async (c) => {
  // Requires logged-in admin/owner
  const user = c.get('user')
  if (!user || !['owner', 'co_creator', 'admin'].includes(user.role)) {
    return c.json({ error: 'Admin only' }, 403)
  }

  const links = await c.env.DB.prepare(`
    SELECT dl.discord_channel_id, dl.storm_room_id, dl.webhook_url, dl.guild_id, dl.created_at,
           s.name as storm_name
    FROM discord_links dl
    LEFT JOIN storms s ON s.id = dl.storm_room_id
    ORDER BY dl.created_at DESC
  `).all()

  return c.json({ links: links.results ?? [] })
})

// ── Admin: Manually set webhook URL ──

discord.post('/webhook', async (c) => {
  const user = c.get('user')
  if (!user || !['owner', 'co_creator', 'admin'].includes(user.role)) {
    return c.json({ error: 'Admin only' }, 403)
  }

  const { channelId, webhookUrl } = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE discord_links SET webhook_url = ? WHERE discord_channel_id = ?'
  ).bind(webhookUrl, channelId).run()

  return c.json({ ok: true })
})

// ── Helpers ──

async function getActiveStorms(env) {
  try {
    const result = await env.DB.prepare(
      "SELECT name, category, wind_kt, lat, lon FROM storms WHERE status = 'active' ORDER BY wind_kt DESC LIMIT 10"
    ).all()
    return result.results ?? []
  } catch {
    return []
  }
}

async function getModelStatus(env) {
  // Pull from KV cache or return defaults
  try {
    const cached = await env.KV.get('model_status', 'json')
    if (cached) return cached
  } catch {}

  return [
    { name: 'GFS', value: 'Checking...', inline: true },
    { name: 'Euro IFS', value: 'Checking...', inline: true },
    { name: 'HRRR', value: 'Checking...', inline: true },
    { name: 'ICON', value: 'Checking...', inline: true },
  ]
}

async function createJwt(user, secret) {
  const encoder = new TextEncoder()
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const payload = btoa(JSON.stringify({
    sub: user.id,
    username: user.username,
    role: user.role ?? 'member',
    avatarColor: user.avatar_color ?? '#38BDF8',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`))
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return `${header}.${payload}.${sig}`
}

export default discord
