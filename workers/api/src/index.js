import { Hono }     from 'hono'
import { cors }     from 'hono/cors'
import { logger }   from 'hono/logger'
import { timing }   from 'hono/timing'
import auth          from './routes/auth.js'
import storms        from './routes/storms.js'
import models        from './routes/models.js'
import battles       from './routes/battles.js'
import forum         from './routes/forum.js'
import users         from './routes/users.js'
import messages      from './routes/messages.js'

const app = new Hono()

// ── Global middleware ─────────────────────────────
app.use('*', timing())
app.use('*', logger())
app.use('*', cors({
  origin:       (origin, c) => {
    const allowed = [c.env.ALLOWED_ORIGIN, 'http://localhost:5173']
    return allowed.includes(origin) ? origin : allowed[0]
  },
  allowMethods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization'],
  credentials:  true,
}))

// ── Health check ─────────────────────────────────
app.get('/', (c) => c.json({ status: 'ok', service: 'chasernet-api', version: '0.1.0' }))

// ── Route groups ─────────────────────────────────
app.route('/auth',     auth)
app.route('/storms',   storms)
app.route('/models',   models)
app.route('/battles',  battles)
app.route('/forum',    forum)
app.route('/users',    users)
app.route('/messages', messages)

// ── 404 ──────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// ── Error handler ────────────────────────────────
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message || 'Internal server error' }, 500)
})

export default app
