import { Hono } from 'hono'
import { verifyJwt } from '../middleware/auth.js'

const discord = new Hono()

/**
 * Discord two-way bridge.
 * 
 * Incoming: Discord webhook → this handler → Durable Object chat room → all connected users
 * Outgoing: User sends message in storm room → Durable Object → Discord webhook
 * 
 * Setup:
 * 1. Create Discord bot at https://discord.com/developers/applications
 * 2. Bot token → wrangler secret put DISCORD_BOT_TOKEN
 * 3. Create webhook in each Discord channel → store URL in D1
 * 4. Set bot's Interaction Endpoint URL to https://api.chasernet.com/discord/interactions
 */

// ── Discord Interaction Endpoint (for slash commands) ──

discord.post('/interactions', async (c) => {
  const body = await c.req.json()

  // Discord verification ping
  if (body.type === 1) {
    return c.json({ type: 1 })
  }

  // Slash command
  if (body.type === 2) {
    const cmd = body.data?.name
    const channelId = body.channel_id

    if (cmd === 'storm') {
      // /storm — list active storms
      const storms = await getActiveStorms(c.env)
      const desc = storms.length > 0
        ? storms.map(s => `**${s.name}** — ${s.category} · ${s.wind_kt}kt`).join('\n')
        : 'No active storms tracked.'

      return c.json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          embeds: [{
            title: '🌀 Active Storms',
            description: desc,
            color: 0x38BDF8,
            footer: { text: 'ChaserNet Storm Tracking' },
          }]
        }
      })
    }

    if (cmd === 'models') {
      // /models — latest model run status
      return c.json({
        type: 4,
        data: {
          embeds: [{
            title: '📡 Model Status',
            fields: [
              { name: 'GFS', value: 'Latest: 06z · 3h ago', inline: true },
              { name: 'Euro IFS', value: 'Latest: 00z · 8h ago', inline: true },
              { name: 'HRRR', value: 'Latest: 05z · 1h ago', inline: true },
            ],
            color: 0x38BDF8,
          }]
        }
      })
    }

    if (cmd === 'link') {
      // /link <room> — link a Discord channel to a ChaserNet storm room
      const roomId = body.data?.options?.[0]?.value
      if (!roomId) {
        return c.json({ type: 4, data: { content: '⚠️ Usage: /link <storm-room-id>' } })
      }

      await c.env.DB.prepare(
        'INSERT OR REPLACE INTO discord_links (discord_channel_id, storm_room_id, webhook_url, created_at) VALUES (?, ?, ?, ?)'
      ).bind(channelId, roomId, '', Date.now()).run()

      return c.json({
        type: 4,
        data: { content: `✅ Linked this channel to storm room \`${roomId}\`. Messages will sync both ways.` }
      })
    }

    return c.json({ type: 4, data: { content: 'Unknown command.' } })
  }

  return c.json({ type: 1 })
})

// ── Outgoing: Forward ChaserNet messages to Discord ──

discord.post('/forward', async (c) => {
  // Called by Durable Objects when a new message is posted in a storm room
  const { roomId, username, content, avatarColor } = await c.req.json()

  // Look up Discord webhook for this room
  const link = await c.env.DB.prepare(
    'SELECT webhook_url FROM discord_links WHERE storm_room_id = ?'
  ).bind(roomId).first()

  if (!link?.webhook_url) return c.json({ ok: false, reason: 'no webhook' })

  // Send to Discord via webhook
  try {
    const res = await fetch(link.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `${username} (ChaserNet)`,
        content,
        embeds: [],
      })
    })
    return c.json({ ok: res.ok })
  } catch (e) {
    return c.json({ ok: false, error: e.message })
  }
})

// ── Incoming: Discord message → ChaserNet ──

discord.post('/incoming', async (c) => {
  // Called by a Discord bot event handler (or webhook listener)
  const { channelId, author, content } = await c.req.json()

  // Verify this channel is linked
  const link = await c.env.DB.prepare(
    'SELECT storm_room_id FROM discord_links WHERE discord_channel_id = ?'
  ).bind(channelId).first()

  if (!link?.storm_room_id) return c.json({ ok: false, reason: 'unlinked channel' })

  // Forward to the Durable Object storm room
  try {
    const roomUrl = `https://chat.chasernet.com/room/${link.storm_room_id}/inject`
    const res = await fetch(roomUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.CRON_SECRET}`, // internal auth
      },
      body: JSON.stringify({
        username: `${author} (Discord)`,
        content,
        source: 'discord',
      })
    })
    return c.json({ ok: res.ok })
  } catch (e) {
    return c.json({ ok: false, error: e.message })
  }
})

// ── Webhook management ──

discord.post('/webhook', async (c) => {
  // Admin: set webhook URL for a linked channel
  const { channelId, webhookUrl } = await c.req.json()

  await c.env.DB.prepare(
    'UPDATE discord_links SET webhook_url = ? WHERE discord_channel_id = ?'
  ).bind(webhookUrl, channelId).run()

  return c.json({ ok: true })
})

// ── Send alert to all linked channels ──

discord.post('/alert', async (c) => {
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${c.env.CRON_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { title, description, color, fields } = await c.req.json()

  const links = await c.env.DB.prepare(
    'SELECT webhook_url FROM discord_links WHERE webhook_url != ""'
  ).all()

  let sent = 0
  for (const link of links.results ?? []) {
    try {
      await fetch(link.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ChaserNet',
          embeds: [{ title, description, color: color ?? 0x38BDF8, fields }]
        })
      })
      sent++
    } catch {}
  }

  return c.json({ ok: true, sent })
})

// ── Helpers ──

async function getActiveStorms(env) {
  try {
    const result = await env.DB.prepare(
      "SELECT name, category, wind_kt FROM storms WHERE status = 'active' ORDER BY wind_kt DESC LIMIT 10"
    ).all()
    return result.results ?? []
  } catch {
    return []
  }
}

export default discord
