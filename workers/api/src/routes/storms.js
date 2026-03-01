import { Hono }  from 'hono'
import { getDB } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'

// ════════════════════════════════════════════════
// STORMS
// ════════════════════════════════════════════════
export const storms = new Hono()

storms.get('/', async (c) => {
  const db   = getDB(c.env.DB)
  const rows = await db.all('SELECT * FROM storms WHERE active = 1 ORDER BY updated_at DESC')
  return c.json({ storms: rows })
})

storms.get('/:id', async (c) => {
  const db  = getDB(c.env.DB)
  const row = await db.first('SELECT * FROM storms WHERE id = ?', [c.req.param('id')])
  if (!row) return c.json({ error: 'Storm not found' }, 404)
  return c.json({ storm: row })
})

// Admin only — create/update storms (populated by cron worker in Phase 2)
storms.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['owner','admin'].includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  const id   = body.id ?? `storm-${Date.now()}`
  const now  = Date.now()
  const db   = getDB(c.env.DB)
  await db.run(
    `INSERT INTO storms (id, name, basin, category, wind_kt, pressure_mb, lat, lon, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category,
       wind_kt=excluded.wind_kt, pressure_mb=excluded.pressure_mb, lat=excluded.lat,
       lon=excluded.lon, updated_at=excluded.updated_at`,
    [id, body.name, body.basin, body.category, body.wind_kt, body.pressure_mb, body.lat, body.lon, now, now]
  )
  return c.json({ id }, 201)
})
export default storms

storms.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['owner','admin'].includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
  const db = getDB(c.env.DB)
  await db.run('UPDATE storms SET active = 0 WHERE id = ?', [c.req.param('id')])
  return c.json({ ok: true })
})
