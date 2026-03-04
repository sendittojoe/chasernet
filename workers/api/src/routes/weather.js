import { Hono } from 'hono'

const weather = new Hono()

/**
 * GET /weather/forecast?lat=XX&lon=YY&models=gfs,ecmwf&...
 * 
 * Proxies Open-Meteo API with KV caching.
 * Rounds lat/lon to nearest 0.5° for cache key.
 * TTL: 1 hour (model data doesn't change that fast).
 * 
 * This prevents 20 users loading the same area from burning 20 API calls.
 */
weather.get('/forecast', async (c) => {
  const url = new URL(c.req.url)
  const lat = parseFloat(url.searchParams.get('lat') ?? '0')
  const lon = parseFloat(url.searchParams.get('lon') ?? '0')

  // Round to 0.5° grid for cache efficiency
  const rlat = (Math.round(lat * 2) / 2).toFixed(1)
  const rlon = (Math.round(lon * 2) / 2).toFixed(1)

  // Build a stable cache key from all params
  const params = new URLSearchParams(url.searchParams)
  params.set('lat', rlat)
  params.set('lon', rlon)
  params.sort()
  const cacheKey = `weather:${params.toString()}`

  // Check KV cache
  try {
    const cached = await c.env.KV.get(cacheKey, 'json')
    if (cached) {
      return c.json({ ...cached, _cached: true, _cacheKey: cacheKey })
    }
  } catch {}

  // Forward to Open-Meteo
  const omUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  try {
    const res = await fetch(omUrl, {
      headers: { 'User-Agent': 'ChaserNet/1.0' },
    })

    if (!res.ok) {
      return c.json({ error: `Open-Meteo returned ${res.status}` }, res.status)
    }

    const data = await res.json()

    // Cache in KV for 1 hour
    try {
      await c.env.KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 3600 })
    } catch {}

    return c.json(data)
  } catch (e) {
    return c.json({ error: e.message }, 502)
  }
})

/**
 * GET /weather/alerts?lat=XX&lon=YY
 * Proxy for NWS alerts — cache 5 min.
 */
weather.get('/alerts', async (c) => {
  const lat = c.req.query('lat')
  const lon = c.req.query('lon')
  if (!lat || !lon) return c.json({ error: 'lat and lon required' }, 400)

  const cacheKey = `alerts:${parseFloat(lat).toFixed(1)},${parseFloat(lon).toFixed(1)}`

  try {
    const cached = await c.env.KV.get(cacheKey, 'json')
    if (cached) return c.json(cached)
  } catch {}

  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat},${lon}`,
      { headers: { 'User-Agent': 'ChaserNet/1.0', 'Accept': 'application/geo+json' } }
    )
    if (!res.ok) return c.json({ error: `NWS returned ${res.status}` }, res.status)
    const data = await res.json()

    try {
      await c.env.KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 300 })
    } catch {}

    return c.json(data)
  } catch (e) {
    return c.json({ error: e.message }, 502)
  }
})

export default weather
