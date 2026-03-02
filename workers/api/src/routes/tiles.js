import { Hono } from 'hono'

const tiles = new Hono()

/**
 * GET /tiles/index
 * Returns the latest tile index from R2.
 * The index tells the frontend what models/variables/hours are available.
 */
tiles.get('/index', async (c) => {
  try {
    // Try R2 first
    const obj = await c.env.ASSETS.get('tiles/index.json')
    if (obj) {
      const data = await obj.text()
      return c.json(JSON.parse(data))
    }

    // Fallback: construct from KV cache
    const cached = await c.env.KV.get('tile-index', 'json')
    if (cached) return c.json(cached)

    return c.json({
      tile_base: 'https://assets.chasernet.com/tiles',
      tile_pattern: '{model}/{date}/{cycle}z/{variable}_f{fhour}.json',
      models: {
        gfs:   { name: 'GFS',        cycles: ['00','06','12','18'] },
        ecmwf: { name: 'ECMWF IFS',  cycles: ['00','12'] },
        icon:  { name: 'ICON Global', cycles: ['00','06','12','18'] },
      },
      variables: ['wind_10m','temp_2m','mslp','precip','cape','hgt_500'],
      forecast_hours: [0,3,6,12,18,24,36,48,60,72,84,96,108,120,132,144,156,168],
      grid: { lat0:90, lon0:0, dlat:-1, dlon:1, nlat:181, nlon:360 },
    })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

/**
 * GET /tiles/:model/:date/:cycle/:filename
 * Proxy tile data from R2 with caching headers.
 * Example: /tiles/gfs/20260301/12z/wind_10m_f024.json
 */
tiles.get('/:model/:date/:cycle/:filename', async (c) => {
  const { model, date, cycle, filename } = c.req.param()
  const key = `tiles/${model}/${date}/${cycle}/${filename}`

  try {
    const obj = await c.env.ASSETS.get(key)
    if (!obj) {
      return c.json({ error: 'Tile not found' }, 404)
    }

    const body = await obj.arrayBuffer()
    return new Response(body, {
      headers: {
        'Content-Type':     'application/json',
        'Content-Encoding': 'gzip',
        'Cache-Control':    'public, max-age=3600, stale-while-revalidate=7200',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

/**
 * GET /tiles/latest/:model
 * Get info about the latest available run for a model.
 */
tiles.get('/latest/:model', async (c) => {
  const model = c.req.param('model')

  // Check KV for latest run info (updated by cron or pipeline)
  const latest = await c.env.KV.get(`tile-latest:${model}`, 'json')
  if (latest) return c.json(latest)

  // Fallback: scan R2 for recent dates
  const now   = new Date()
  const dates = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(now - i * 86400000)
    dates.push(d.toISOString().slice(0,10).replace(/-/g,''))
  }

  const cycles = model === 'ecmwf' ? ['12','00'] : ['18','12','06','00']

  for (const date of dates) {
    for (const cycle of cycles) {
      const key = `tiles/${model}/${date}/${cycle}z/wind_10m_f000.json`
      const obj = await c.env.ASSETS.head(key)
      if (obj) {
        const result = { model, date, cycle: `${cycle}z`, available: true }
        // Cache for 15 min
        await c.env.KV.put(`tile-latest:${model}`, JSON.stringify(result), { expirationTtl: 900 })
        return c.json(result)
      }
    }
  }

  return c.json({ model, available: false })
})

/**
 * POST /tiles/refresh
 * Called by GitHub Actions pipeline after uploading new tiles.
 * Updates KV cache with latest run info.
 */
tiles.post('/refresh', async (c) => {
  // Simple auth — cron secret
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${c.env.CRON_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { date, cycle } = await c.req.json()

  // Update latest pointers for all models
  for (const model of ['gfs', 'ecmwf', 'icon']) {
    const key = `tiles/${model}/${date}/${cycle.replace('z','')}z/wind_10m_f000.json`
    const obj = await c.env.ASSETS.head(key)
    if (obj) {
      await c.env.KV.put(`tile-latest:${model}`, JSON.stringify({
        model, date, cycle, available: true, updated: Date.now(),
      }), { expirationTtl: 43200 }) // 12h
    }
  }

  // Store the index refresh timestamp
  await c.env.KV.put('tile-index-updated', String(Date.now()), { expirationTtl: 86400 })

  return c.json({ ok: true, date, cycle })
})

export default tiles
