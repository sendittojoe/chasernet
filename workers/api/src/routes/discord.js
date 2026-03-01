import { Hono } from 'hono'
import { requireAuth, requireRole } from '../lib/auth.js'

const discord = new Hono()

discord.post('/webhook', requireAuth, requireRole('owner','co_creator','admin'), async (c) => {
  const { webhookUrl } = await c.req.json()
  return c.json({ ok: true, message: 'Webhook configured' })
})

discord.post('/post', async (c) => {
  const { webhookUrl, content, username, role, channelName, threadTitle, link } = await c.req.json()
  if (!webhookUrl) return c.json({ error: 'No webhook URL' }, 400)

  const ROLE_COLORS = { owner:9987007, co_creator:16750848, admin:15548997, moderator:9699539, vip:16766720, verified:2263842, contributor:3901635, member:7372944 }

  const payload = {
    username: 'ChaserNet',
    embeds: [{
      title: threadTitle ?? 'New post',
      description: content?.slice(0, 400) + (content?.length > 400 ? '...' : ''),
      color: ROLE_COLORS[role] ?? 7372944,
      author: { name: '@' + username },
      footer: { text: '#' + channelName + ' on ChaserNet' },
      url: link ?? 'https://chasernet.com',
      timestamp: new Date().toISOString(),
    }]
  }

  try {
    const res = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) throw new Error('Discord returned ' + res.status)
    return c.json({ ok: true })
  } catch(e) {
    return c.json({ error: e.message }, 502)
  }
})

export default discord
