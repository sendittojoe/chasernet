import { Hono }   from 'hono'
import { sign, verify } from 'hono/jwt'
import { getDB }  from '../lib/db.js'

const auth = new Hono()

// ── POST /auth/register ───────────────────────────
auth.post('/register', async (c) => {
  const { username, email, password } = await c.req.json()

  if (!username || !email || !password)
    return c.json({ error: 'username, email, and password required' }, 400)

  if (username.length < 3 || username.length > 24)
    return c.json({ error: 'Username must be 3–24 characters' }, 400)

  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return c.json({ error: 'Username: letters, numbers, underscores only' }, 400)

  const db = getDB(c.env.DB)

  // Check uniqueness
  const existing = await db.first('SELECT id FROM users WHERE email = ? OR username = ?', [email, username])
  if (existing) return c.json({ error: 'Email or username already taken' }, 409)

  // Hash password (Web Crypto — no bcrypt in Workers)
  const hash = await hashPassword(password)

  // Pick a random avatar color
  const COLORS = ['#38BDF8','#F59E0B','#10B981','#EF4444','#8B5CF6','#F97316','#EC4899']
  const avatarColor = COLORS[Math.floor(Math.random() * COLORS.length)]

  const id        = crypto.randomUUID()
  const createdAt = Date.now()

  await db.run(
    `INSERT INTO users (id, username, email, password_hash, role, avatar_color, created_at)
     VALUES (?, ?, ?, ?, 'member', ?, ?)`,
    [id, username, email, hash, avatarColor, createdAt]
  )

  const user = { id, username, role:'member', avatarColor }
  const token = await sign({ sub:id, username, role:'member', exp: Math.floor(Date.now()/1000) + 86400*30 }, c.env.JWT_SECRET)

  return c.json({ user, token }, 201)
})

// ── POST /auth/login ──────────────────────────────
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'email and password required' }, 400)

  const db   = getDB(c.env.DB)
  const row  = await db.first('SELECT id, username, role, avatar_color, password_hash FROM users WHERE email = ?', [email])

  if (!row) return c.json({ error: 'Invalid credentials' }, 401)

  const ok = await verifyPassword(password, row.password_hash)
  if (!ok)  return c.json({ error: 'Invalid credentials' }, 401)

  await db.run('UPDATE users SET last_active = ? WHERE id = ?', [Date.now(), row.id])

  const user  = { id:row.id, username:row.username, role:row.role, avatarColor:row.avatar_color }
  const token = await sign({ sub:row.id, username:row.username, role:row.role, exp: Math.floor(Date.now()/1000) + 86400*30 }, c.env.JWT_SECRET)

  return c.json({ user, token })
})

// ── GET /auth/me ──────────────────────────────────
auth.get('/me', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verify(token, c.env.JWT_SECRET)
    const db = getDB(c.env.DB)
    const row = await db.first(
      'SELECT id, username, role, avatar_color, bio, location, forecast_score, forecast_wins FROM users WHERE id = ?',
      [payload.sub]
    )
    if (!row) return c.json({ error: 'User not found' }, 404)
    return c.json({ user: {
      id:          row.id,
      username:    row.username,
      role:        row.role,
      avatarColor: row.avatar_color,
      bio:         row.bio,
      location:    row.location,
      forecastScore: row.forecast_score,
      forecastWins:  row.forecast_wins,
    }})
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

export default auth

// ── Crypto helpers ────────────────────────────────
// PBKDF2 via Web Crypto API (works in Cloudflare Workers)
async function hashPassword(password) {
  const enc  = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key  = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt, iterations:100_000, hash:'SHA-256' }, key, 256
  )
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2,'0')).join('')
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('')
  return `${saltHex}:${hashHex}`
}

async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':')
  const salt  = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h,16)))
  const enc   = new TextEncoder()
  const key   = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits  = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt, iterations:100_000, hash:'SHA-256' }, key, 256
  )
  const check = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('')
  return check === hashHex
}
