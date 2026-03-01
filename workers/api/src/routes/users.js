import { Hono } from 'hono'
import { getDB } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'

const users = new Hono()

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

export default users
