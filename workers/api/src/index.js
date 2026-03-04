import { Hono }          from 'hono'
import { cors }          from 'hono/cors'
import { logger }        from 'hono/logger'
import { timing }        from 'hono/timing'
import auth              from './routes/auth.js'
import storms            from './routes/storms.js'
import models            from './routes/models.js'
import battles           from './routes/battles.js'
import forum             from './routes/forum.js'
import users             from './routes/users.js'
import messages          from './routes/messages.js'
import notifications     from './routes/notifications.js'
import discord           from './routes/discord.js'
import proxy             from './routes/proxy.js'
import dm                from './routes/dm.js'
import tiles             from './routes/tiles.js'
import weather           from './routes/weather.js'
import { optionalAuth }  from './middleware/auth.js'

const app = new Hono()

app.use('*', timing())
app.use('*', logger())
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = [
      c.env.ALLOWED_ORIGIN ?? 'https://chasernet.com',
      'http://localhost:5173',
      'https://chasernet.com',
      'https://www.chasernet.com',
    ]
    return allowed.includes(origin) ? origin : allowed[0]
  },
  allowMethods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization'],
  credentials: true,
}))

// Apply optional auth globally — user info available if token present
app.use('*', optionalAuth())

app.get('/', (c) => c.json({
  status: 'ok',
  service: 'chasernet-api',
  version: '1.0.0',
  endpoints: [
    '/auth', '/storms', '/models', '/battles', '/forum',
    '/users', '/messages', '/notifications', '/discord',
    '/proxy', '/dm', '/tiles', '/weather',
  ]
}))

app.route('/auth',          auth)
app.route('/storms',        storms)
app.route('/models',        models)
app.route('/battles',       battles)
app.route('/forum',         forum)
app.route('/users',         users)
app.route('/messages',      messages)
app.route('/notifications', notifications)
app.route('/discord',       discord)
app.route('/proxy',         proxy)
app.route('/dm',            dm)
app.route('/tiles',         tiles)
app.route('/weather',       weather)

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message || 'Internal server error' }, 500)
})

export default app
