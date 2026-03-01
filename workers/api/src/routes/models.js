import { Hono }  from 'hono'
import { getDB } from '../lib/db.js'

const models = new Hono()

// GET /models/runs — current model run status
models.get('/runs', async (c) => {
  const db   = getDB(c.env.DB)
  const rows = await db.all(
    `SELECT * FROM model_runs
     WHERE run_date >= date('now', '-1 day')
     ORDER BY run_date DESC, cycle DESC`,
  )
  return c.json({ runs: rows })
})

// GET /models/runs/:id — single run status
models.get('/runs/:id', async (c) => {
  const db  = getDB(c.env.DB)
  const row = await db.first('SELECT * FROM model_runs WHERE id = ?', [c.req.param('id')])
  if (!row) return c.json({ error: 'Run not found' }, 404)
  return c.json({ run: row })
})

export default models
