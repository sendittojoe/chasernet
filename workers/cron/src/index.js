export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAll(env))
  },
  async fetch(req, env) {
    if (req.method === 'POST') {
      await runAll(env)
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('ChaserNet Cron', { status: 200 })
  }
}

async function runAll(env) {
  await Promise.allSettled([
    fetchNHCStorms(env),
    pollModelRuns(env),
  ])
}

async function fetchNHCStorms(env) {
  console.log('[cron] Fetching NHC active storms...')
  try {
    const res  = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json', { signal: AbortSignal.timeout(10000) })
    if (!res.ok) { console.warn('[cron] NHC fetch failed:', res.status); return }
    const data = await res.json()
    const storms = data.activeStorms ?? []
    console.log(`[cron] Found ${storms.length} active storms`)

    for (const storm of storms) {
      await upsertStorm(env.DB, storm)
    }

    if (storms.length > 0) {
      const activeIds = storms.map(s => `'${stormId(s)}'`).join(',')
      await env.DB.prepare(
        `UPDATE storms SET is_active = 0 WHERE id NOT IN (${activeIds}) AND is_active = 1`
      ).run()
    }
  } catch (e) {
    console.error('[cron] NHC error:', e.message)
  }
}

function stormId(storm) {
  const year = new Date().getFullYear()
  const base = storm.atcfID ?? storm.id ?? storm.name?.toLowerCase().replace(/\s+/g,'-') ?? 'unknown'
  return `${base.toLowerCase()}-${year}`
}

function basinFromId(atcfId) {
  if (!atcfId) return 'unknown'
  const prefix = atcfId.slice(0,2).toLowerCase()
  const map = { al:'atlantic', ep:'epac', cp:'cpac', wp:'wpac', io:'indian', sh:'shem' }
  return map[prefix] ?? 'unknown'
}

function categoryFromWind(wind) {
  const w = +wind
  if (w >= 137) return 'C5'
  if (w >= 113) return 'C4'
  if (w >= 96)  return 'C3'
  if (w >= 83)  return 'C2'
  if (w >= 64)  return 'C1'
  if (w >= 34)  return 'TS'
  return 'TD'
}

async function upsertStorm(db, storm) {
  const id       = stormId(storm)
  const name     = storm.name ?? storm.id ?? 'Unknown'
  const atcfId   = storm.atcfID ?? storm.id ?? ''
  const basin    = basinFromId(atcfId)
  const wind     = storm.maxWinds ?? storm.intensity ?? 0
  const pressure = storm.minPressure ?? storm.pressure ?? 1010
  const lat      = parseFloat(storm.latitudeNumeric ?? storm.lat ?? 0)
  const lon      = parseFloat(storm.longitudeNumeric ?? storm.lon ?? 0)
  const category = storm.classification === 'Invest' ? 'Invest' : categoryFromWind(wind)
  const now      = new Date().toISOString()

  console.log(`[cron] Upserting: ${name} (${id}) ${category} ${wind}kt ${lat},${lon}`)

  await db.prepare(
    `INSERT INTO storms (id, name, basin, category, wind_kt, pressure_mb, lat, lon, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, category=excluded.category,
       wind_kt=excluded.wind_kt, pressure_mb=excluded.pressure_mb,
       lat=excluded.lat, lon=excluded.lon, is_active=1, updated_at=excluded.updated_at`
  ).bind(id, name, basin, category, wind, pressure, lat, lon, now, now).run()
}

async function pollModelRuns(env) {
  const now  = new Date()
  const date = now.toISOString().slice(0,10).replace(/-/g,'')
  const h    = String(now.getUTCHours()).padStart(2,'0')
  const cycle = `${h}z`

  await Promise.allSettled([
    checkGFS(date, h, cycle, env),
    checkHRRR(date, h, cycle, env),
  ])
}

async function checkGFS(date, h, cycle, env) {
  const url = `https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/gfs.${date}/${h}/atmos/gfs.t${h}z.pgrb2.0p25.f000`
  try {
    const res = await fetch(url, { method:'HEAD', signal: AbortSignal.timeout(6000) })
    const id  = `gfs-${date}-${cycle}`
    await upsertRun(env.DB, { id, model:'gfs', cycle, run_date:date, status: res.ok ? 'ready' : 'pending' })
    if (res.ok) await notify(env.KV, id, 'GFS', cycle)
  } catch {}
}

async function checkHRRR(date, h, cycle, env) {
  const url = `https://nomads.ncep.noaa.gov/pub/data/nccf/com/hrrr/prod/hrrr.${date}/conus/hrrr.t${h}z.wrfnatf00.grib2`
  try {
    const res = await fetch(url, { method:'HEAD', signal: AbortSignal.timeout(6000) })
    const id  = `hrrr-${date}-${cycle}`
    await upsertRun(env.DB, { id, model:'hrrr', cycle, run_date:date, status: res.ok ? 'ready' : 'pending' })
    if (res.ok) await notify(env.KV, id, 'HRRR', cycle)
  } catch {}
}

async function upsertRun(db, run) {
  await db.prepare(
    `INSERT INTO model_runs (id, model, cycle, run_date, status, completed_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET status=excluded.status, completed_at=excluded.completed_at`
  ).bind(run.id, run.model, run.cycle, run.run_date, run.status, run.status === 'ready' ? new Date().toISOString() : null).run()
}

async function notify(kv, id, model, cycle) {
  const key = `notify:${id}`
  try { const existing = await kv.get(key); if (existing) return } catch {}
  await kv.put(key, JSON.stringify({ model, cycle, timestamp: Date.now() }), { expirationTtl: 3600 })
  console.log(`[cron] New run ready: ${model} ${cycle}`)
}
