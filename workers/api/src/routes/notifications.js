import { Hono } from 'hono'
import { getDB } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'

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

export default notifs
