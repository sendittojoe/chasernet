import { Hono }  from 'hono'
import { getDB } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'

export const storms = new Hono()

storms.get('/', async (c) => {
  const db   = getDB(c.env.DB)
  const rows = await db.all('SELECT * FROM storms WHERE is_active = 1 ORDER BY updated_at DESC')
  return c.json({ storms: rows })
})

storms.get('/:id', async (c) => {
  const db  = getDB(c.env.DB)
  const row = await db.first('SELECT * FROM storms WHERE id = ?', [c.req.param('id')])
  if (!row) return c.json({ error: 'Storm not found' }, 404)
  return c.json({ storm: row })
})

storms.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['owner','admin'].includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  const id   = body.id ?? `storm-${Date.now()}`
  const now  = new Date().toISOString()
  const db   = getDB(c.env.DB)
  await db.prepare(
    `INSERT INTO storms (id, name, basin, category, wind_kt, pressure_mb, lat, lon, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category,
       wind_kt=excluded.wind_kt, pressure_mb=excluded.pressure_mb,
       lat=excluded.lat, lon=excluded.lon, is_active=1, updated_at=excluded.updated_at`
  ).bind(id, body.name, body.basin, body.category, body.wind_kt, body.pressure_mb, body.lat, body.lon, now, now).run()
  return c.json({ id }, 201)
})

storms.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['owner','admin'].includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
  const db = getDB(c.env.DB)
  await db.prepare('UPDATE storms SET is_active = 0 WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

export default storms
