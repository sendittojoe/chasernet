import { Hono }  from 'hono'
import { getDB } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'

// ════════════════════════════════════════════════
// BATTLES
// ════════════════════════════════════════════════
export const battles = new Hono()

battles.get('/', async (c) => {
  const { storm_id } = c.req.query()
  const db = getDB(c.env.DB)
  const q  = storm_id
    ? 'SELECT * FROM battle_entries WHERE storm_id = ? ORDER BY submitted_at DESC'
    : 'SELECT * FROM battle_entries ORDER BY submitted_at DESC LIMIT 100'
  const rows = storm_id ? await db.all(q, [storm_id]) : await db.all(q)
  return c.json({ entries: rows })
})

battles.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  const { storm_id, lat_72h, lon_72h, wind_kt, notes } = await c.req.json()
  if (!storm_id || !lat_72h || !lon_72h || !wind_kt)
    return c.json({ error: 'storm_id, lat_72h, lon_72h, wind_kt required' }, 400)
  const db = getDB(c.env.DB)
  const id = crypto.randomUUID()
  await db.run(
    `INSERT INTO battle_entries (id, storm_id, user_id, lat_72h, lon_72h, wind_kt, notes, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, storm_id, user.sub, lat_72h, lon_72h, wind_kt, notes ?? null, Date.now()]
  )
  return c.json({ id }, 201)
})

battles.get('/leaderboard', async (c) => {
  const db = getDB(c.env.DB)
  const rows = await db.all(
    `SELECT u.username, u.avatar_color, u.role,
            SUM(e.score) as total_score,
            COUNT(CASE WHEN e.score > 0 THEN 1 END) as wins,
            ROUND(AVG(e.track_error), 0) as avg_error
     FROM battle_entries e
     JOIN users u ON u.id = e.user_id
     WHERE e.verified = 1
     GROUP BY e.user_id
     ORDER BY total_score DESC
     LIMIT 50`
  )
  return c.json({ leaderboard: rows })
})
export default battles
