import { verify } from 'hono/jwt'

/**
 * requireAuth — Hono middleware that validates the JWT and
 * sets c.set('user', payload) for downstream route handlers.
 */
export async function requireAuth(c, next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer '))
    return c.json({ error: 'Unauthorized' }, 401)

  const token = header.slice(7)
  try {
    const payload = await verify(token, c.env.JWT_SECRET)
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}

/**
 * requireRole — factory for role-gated middleware.
 * Usage: app.delete('/post/:id', requireRole('admin'), handler)
 */
export function requireRole(...roles) {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    if (!roles.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
    await next()
  }
}
