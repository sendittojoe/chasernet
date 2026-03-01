import { getDB } from './db.js'

async function verifyJWT(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token')

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['verify']
  )

  const data      = encoder.encode(parts[0] + '.' + parts[1])
  const signature = Uint8Array.from(atob(parts[2].replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0))
  const valid     = await crypto.subtle.verify('HMAC', key, signature, data)
  if (!valid) throw new Error('Invalid signature')

  const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')))
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired')
  return payload
}

export async function requireAuth(c, next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer '))
    return c.json({ error: 'Unauthorized' }, 401)

  const token = header.slice(7)
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET)
    const db  = getDB(c.env.DB)
    const row = await db.first('SELECT role FROM users WHERE id = ?', [payload.sub])
    if (!row) return c.json({ error: 'User not found' }, 401)
    c.set('user', { ...payload, role: row.role })
    await next()
  } catch (e) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}

export function requireRole(...roles) {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    if (!roles.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
    await next()
  }
}
