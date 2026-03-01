import { Hono }  from 'hono'
import { getDB } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'

// ════════════════════════════════════════════════
// FORUM
// ════════════════════════════════════════════════
export const forum = new Hono()

forum.get('/', async (c) => {
  const { room_id, limit=20, offset=0 } = c.req.query()
  const db = getDB(c.env.DB)
  const q  = room_id
    ? `SELECT p.*, u.username, u.avatar_color, u.role
       FROM forum_posts p JOIN users u ON u.id = p.user_id
       WHERE p.room_id = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    : `SELECT p.*, u.username, u.avatar_color, u.role
       FROM forum_posts p JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  const rows = room_id
    ? await db.all(q, [room_id, +limit, +offset])
    : await db.all(q, [+limit, +offset])
  return c.json({ posts: rows })
})

forum.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  const { room_id, title, body, map_pin, poll } = await c.req.json()
  if (!room_id || !title || !body) return c.json({ error: 'room_id, title, body required' }, 400)
  const db = getDB(c.env.DB)
  const id = crypto.randomUUID()
  await db.run(
    `INSERT INTO forum_posts (id, room_id, user_id, title, body, map_pin, poll, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, room_id, user.sub, title, body, map_pin ? JSON.stringify(map_pin) : null, poll ? JSON.stringify(poll) : null, Date.now()]
  )
  return c.json({ id }, 201)
})

forum.get('/:id', async (c) => {
  const db = getDB(c.env.DB)
  const row = await db.first(
    `SELECT p.*, u.username, u.avatar_color FROM forum_posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    [c.req.param('id')]
  )
  if (!row) return c.json({ error: 'Not found' }, 404)
  await db.run('UPDATE forum_posts SET view_count = view_count + 1 WHERE id = ?', [row.id])
  return c.json({ post: row })
})

// ════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════
export const users = new Hono()

users.get('/:username', async (c) => {
  const db = getDB(c.env.DB)
  const row = await db.first(
    `SELECT id, username, role, avatar_color, bio, location, forecast_score, forecast_wins, created_at
     FROM users WHERE username = ?`,
    [c.req.param('username')]
  )
  if (!row) return c.json({ error: 'User not found' }, 404)
  return c.json({ user: row })
})

users.patch('/me', requireAuth, async (c) => {
  const user = c.get('user')
  const { bio, location } = await c.req.json()
  const db = getDB(c.env.DB)
  await db.run('UPDATE users SET bio = ?, location = ? WHERE id = ?', [bio ?? null, location ?? null, user.sub])
  return c.json({ ok: true })
})

// ════════════════════════════════════════════════
// MESSAGES (room chat history — Phase 2)
// ════════════════════════════════════════════════
export const messages = new Hono()

messages.get('/:roomId', async (c) => {
  const db   = getDB(c.env.DB)
  const { limit=50 } = c.req.query()
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
export default forum
