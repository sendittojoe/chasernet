/**
 * JWT Authentication Middleware for ChaserNet API
 * 
 * Verifies HMAC-SHA256 signed JWTs using the JWT_SECRET env var.
 * Attaches decoded payload to c.set('user', payload)
 */

const encoder = new TextEncoder()

async function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4
  const b64 = pad ? padded + '='.repeat(4 - pad) : padded
  const binary = atob(b64)
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)))
}

function base64UrlEncode(buf) {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Verify a JWT token. Returns payload if valid, null if invalid.
 */
export async function verifyJwt(token, secret) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts
    const key = await importKey(secret)

    // Verify signature
    const data = encoder.encode(`${headerB64}.${payloadB64}`)
    const signature = base64UrlDecode(signatureB64)

    const valid = await crypto.subtle.verify('HMAC', key, signature, data)
    if (!valid) return null

    // Decode payload
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)))

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Sign a JWT token.
 */
export async function signJwt(payload, secret, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  }

  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)))
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)))

  const key = await importKey(secret)
  const data = encoder.encode(`${headerB64}.${payloadB64}`)
  const sig = await crypto.subtle.sign('HMAC', key, data)
  const sigB64 = base64UrlEncode(sig)

  return `${headerB64}.${payloadB64}.${sigB64}`
}

/**
 * Hono middleware: requireAuth
 * 
 * Extracts Bearer token from Authorization header,
 * verifies JWT signature, attaches user to context.
 */
export function requireAuth() {
  return async (c, next) => {
    const auth = c.req.header('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const token = auth.slice(7)
    const secret = c.env.JWT_SECRET
    if (!secret) {
      console.error('[Auth] JWT_SECRET not configured')
      return c.json({ error: 'Server configuration error' }, 500)
    }

    const payload = await verifyJwt(token, secret)
    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    c.set('user', payload)
    c.set('userId', payload.sub || payload.id)
    await next()
  }
}

/**
 * Optional auth — doesn't reject, just sets user if token is valid
 */
export function optionalAuth() {
  return async (c, next) => {
    const auth = c.req.header('Authorization')
    if (auth?.startsWith('Bearer ')) {
      const payload = await verifyJwt(auth.slice(7), c.env.JWT_SECRET || '')
      if (payload) {
        c.set('user', payload)
        c.set('userId', payload.sub || payload.id)
      }
    }
    await next()
  }
}
