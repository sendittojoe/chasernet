import { Hono } from 'hono'
import { getDB } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'

const messages = new Hono()

messages.get('/:roomId', async (c) => {
  const db = getDB(c.env.DB)
  const { limit = 50 } = c.req.query()
  const rows = await db.all(
    `SELECT m.*, u.username, u.avatar_color, u.role
     FROM room_messages m JOIN users u ON u.id = m.user_id
     WHERE m.room_id = ?
     ORDER BY m.created_at DESC LIMIT ?`,
    [c.req.param('roomId'), +limit]
  )
  return c.json({ messages: rows.reverse() })
})

messages.post('/:roomId', requireAuth, async (c) => {
  const user = c.get('user')
  const { content, map_pin } = await c.req.json()
  if (!content?.trim()) return c.json({ error: 'content required' }, 400)
  const db = getDB(c.env.DB)
  const id = crypto.randomUUID()
  await db.run(
    `INSERT INTO room_messages (id, room_id, user_id, content, map_pin, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, c.req.param('roomId'), user.sub, content.trim(), map_pin ? JSON.stringify(map_pin) : null, Date.now()]
  )
  return c.json({ id }, 201)
})

export default messages
