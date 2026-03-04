import { Hono } from 'hono'

const tiles = new Hono()

/**
 * GET /tiles/latest/:model — returns latest available tile run info
 */
tiles.get('/latest/:model', async (c) => {
  const model = c.req.param('model')

  try {
    // Check KV for cached latest info
    const cached = await c.env.KV.get(`tiles:latest:${model}`, 'json')
    if (cached) return c.json(cached)
  } catch {}

  // Scan R2 for latest tiles
  try {
    const now = new Date()
    const cycles = model === 'ecmwf' ? ['12z', '00z'] : ['18z', '12z', '06z', '00z']

    for (let d = 0; d < 3; d++) {
      const dt = new Date(now - d * 86400000)
      const date = dt.toISOString().slice(0,10).replace(/-/g,'')

      for (const cycle of cycles) {
        // Check if a known tile exists
        const key = `tiles/${model}/${date}/${cycle}/wind_10m_f000.json`
        try {
          const obj = await c.env.ASSETS.head(key)
          if (obj) {
            const info = { available: true, model, date, cycle, updated: obj.uploaded?.toISOString() }
            // Cache for 10 minutes
            try { await c.env.KV.put(`tiles:latest:${model}`, JSON.stringify(info), { expirationTtl: 600 }) } catch {}
            return c.json(info)
          }
        } catch {}
      }
    }
  } catch {}

  return c.json({ available: false, model })
})

/**
 * GET /tiles/:model/:date/:cycle/:filename — serve a tile from R2
 */
tiles.get('/:model/:date/:cycle/:filename', async (c) => {
  const { model, date, cycle, filename } = c.req.param()
  const key = `tiles/${model}/${date}/${cycle}/${filename}`

  try {
    const obj = await c.env.ASSETS.get(key)
    if (!obj) return c.json({ error: 'Tile not found' }, 404)

    const body = await obj.arrayBuffer()
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      'Access-Control-Allow-Origin': '*',
    }

    // Handle gzip-encoded tiles
    if (obj.httpMetadata?.contentEncoding === 'gzip') {
      headers['Content-Encoding'] = 'gzip'
    }

    return new Response(body, { headers })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

/**
 * POST /tiles/refresh — called by pipeline after uploading new tiles.
 * - Invalidates KV cache
 * - Pushes notifications to model subscribers
 * - Sends Discord alerts
 * 
 * Auth: Bearer CRON_SECRET
 */
tiles.post('/refresh', async (c) => {
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${c.env.CRON_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { date, cycle, model } = await c.req.json().catch(() => ({}))

  // 1. Invalidate KV caches
  const models = model ? [model.replace(/z$/, '')] : ['gfs', 'ecmwf', 'icon', 'gefs']
  for (const m of models) {
    try { await c.env.KV.delete(`tiles:latest:${m}`) } catch {}
  }

  // 2. Push notifications to subscribers
  let notified = 0
  try {
    // Get all users who subscribed to model alerts
    const subs = await c.env.DB.prepare(
      'SELECT DISTINCT user_id FROM model_subscriptions WHERE model_id IN (' +
      models.map(() => '?').join(',') + ') AND active = 1'
    ).bind(...models).all()

    const now = Date.now()
    const modelLabel = models.join(', ').toUpperCase()
    const cycleLabel = cycle ?? 'latest'

    for (const sub of subs.results ?? []) {
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, user_id, type, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
      ).bind(
        `notif-${now}-${sub.user_id}-${models[0]}`,
        sub.user_id,
        'model_run',
        `New ${modelLabel} data available`,
        `${cycleLabel} cycle for ${date ?? 'today'} is now loaded.`,
        '/app',
        now,
      ).run()
      notified++
    }
  } catch (e) {
    console.error('[Refresh] notification error:', e)
  }

  // 3. Send Discord alerts to linked channels
  try {
    const links = await c.env.DB.prepare(
      'SELECT webhook_url FROM discord_links WHERE webhook_url != ""'
    ).all()

    for (const link of links.results ?? []) {
      try {
        await fetch(link.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'ChaserNet Pipeline',
            embeds: [{
              title: `📡 New Model Data: ${models.join(', ').toUpperCase()} ${cycle ?? ''}`,
              description: `Fresh tiles uploaded for ${date ?? 'today'}. Open ChaserNet to view.`,
              color: 0x38BDF8,
              timestamp: new Date().toISOString(),
            }]
          })
        })
      } catch {}
    }
  } catch {}

  return c.json({ ok: true, invalidated: models, notified })
})

/**
 * Model alert subscriptions
 */

// Subscribe to model alerts
tiles.post('/subscribe', async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Auth required' }, 401)

  const { models } = await c.req.json()
  if (!Array.isArray(models)) return c.json({ error: 'models array required' }, 400)

  const now = Date.now()
  for (const modelId of models) {
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO model_subscriptions (user_id, model_id, active, created_at) VALUES (?, ?, 1, ?)'
    ).bind(userId, modelId, now).run()
  }

  return c.json({ ok: true, subscribed: models })
})

// Unsubscribe
tiles.post('/unsubscribe', async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Auth required' }, 401)

  const { models } = await c.req.json()
  for (const modelId of models) {
    await c.env.DB.prepare(
      'UPDATE model_subscriptions SET active = 0 WHERE user_id = ? AND model_id = ?'
    ).bind(userId, modelId).run()
  }

  return c.json({ ok: true })
})

// Get user's subscriptions
tiles.get('/subscriptions', async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Auth required' }, 401)

  const result = await c.env.DB.prepare(
    'SELECT model_id FROM model_subscriptions WHERE user_id = ? AND active = 1'
  ).bind(userId).all()

  return c.json({ models: (result.results ?? []).map(r => r.model_id) })
})

export default tiles
