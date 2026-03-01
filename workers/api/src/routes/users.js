import { Hono } from 'hono'
import { getDB } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'

const users = new Hono()

// Admin: list all users — must come BEFORE /:username
users.get('/list', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['owner','admin'].includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
  const db = getDB(c.env.DB)
  const rows = await db.all(
    'SELECT id, username, email, role, avatar_color, created_at, last_active FROM users ORDER BY created_at DESC'
  )
  return c.json({ users: rows })
})

// Admin: update role
users.patch('/:id/role', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['owner','admin'].includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
  const { role } = await c.req.json()
  const db = getDB(c.env.DB)
  await db.run('UPDATE users SET role = ? WHERE id = ?', [role, c.req.param('id')])
  return c.json({ ok: true })
})

// Admin: delete user
users.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['owner','admin'].includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
  const db = getDB(c.env.DB)
  await db.run('DELETE FROM users WHERE id = ?', [c.req.param('id')])
  return c.json({ ok: true })
})

// Get user by username
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

// Update own profile
users.patch('/me', requireAuth, async (c) => {
  const user = c.get('user')
  const { bio, location } = await c.req.json()
  const db = getDB(c.env.DB)
  await db.run('UPDATE users SET bio = ?, location = ? WHERE id = ?', [bio ?? null, location ?? null, user.sub])
  return c.json({ ok: true })
})

export default users
