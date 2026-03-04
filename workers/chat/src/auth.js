/**
 * JWT verification for the Chat Worker.
 * Same algorithm as API worker — HMAC-SHA256.
 * 
 * Usage in WebSocket handler:
 *   const user = await verifyToken(token, env.JWT_SECRET)
 *   if (!user) { ws.close(4001, 'Invalid token') }
 */

const encoder = new TextEncoder()

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4
  const b64 = pad ? padded + '='.repeat(4 - pad) : padded
  const binary = atob(b64)
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)))
}

export async function verifyToken(token, secret) {
  if (!token || !secret) return null
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.')
    if (!headerB64 || !payloadB64 || !signatureB64) return null

    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )

    const data = encoder.encode(`${headerB64}.${payloadB64}`)
    const sig = base64UrlDecode(signatureB64)
    const valid = await crypto.subtle.verify('HMAC', key, sig, data)
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}
