import { Hono } from 'hono'
import { getDB } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { pushToUser } from '../lib/push.js'

const notifs = new Hono()

notifs.get('/', requireAuth, async (c) => {
  const db    = getDB(c.env.DB)
  const uid   = c.get('user').sub
  const limit = parseInt(c.req.query('limit') ?? '30')
  const rows  = await db.all(
    'SELECT id, type, title, body, link, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [uid, limit]
  )
  const unread = rows.filter(r => !r.read).length
  return c.json({ notifications: rows, unread })
})

notifs.patch('/read-all', requireAuth, async (c) => {
  const db  = getDB(c.env.DB)
  const uid = c.get('user').sub
  await db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [uid])
  return c.json({ ok: true })
})

notifs.patch('/:id/read', requireAuth, async (c) => {
  const db  = getDB(c.env.DB)
  const uid = c.get('user').sub
  await db.run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [c.req.param('id'), uid])
  return c.json({ ok: true })
})

notifs.delete('/:id', requireAuth, async (c) => {
  const db  = getDB(c.env.DB)
  const uid = c.get('user').sub
  await db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [c.req.param('id'), uid])
  return c.json({ ok: true })
})

// Internal: create + push notification (used by other routes via createNotification helper)
notifs.post('/push', requireAuth, async (c) => {
  const db   = getDB(c.env.DB)
  const { userId, type, title, body, link } = await c.req.json()
  if (!userId || !type || !title) return c.json({ error: 'userId, type, title required' }, 400)

  // Only admins/mods can push to other users
  const caller = c.get('user')
  if (!['owner','co_creator','admin','moderator'].includes(caller.role) && userId !== caller.sub) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  const id  = crypto.randomUUID()
  const now = Date.now()
  await db.run(
    `INSERT INTO notifications (id, user_id, type, title, body, link, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, userId, type, title, body ?? null, link ?? null, now]
  )

  await pushToUser(c.env, userId, {
    type: 'notification',
    payload: { id, type, title, body, link, read: 0, created_at: now },
  })

  return c.json({ id }, 201)
})

export default notifs
