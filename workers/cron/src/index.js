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

// ── NHC Active Storms ─────────────────────────────────

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

// ── Model Run Polling ─────────────────────────────────

async function pollModelRuns(env) {
  const now  = new Date()
  const date = now.toISOString().slice(0,10).replace(/-/g,'')
  const h    = String(now.getUTCHours()).padStart(2,'0')
  const cycle = `${h}z`

  await Promise.allSettled([
    checkGFS(date, h, cycle, env),
    checkHRRR(date, h, cycle, env),
    checkECMWF(date, cycle, env),
    checkICON(date, h, cycle, env),
    checkNAM(date, h, cycle, env),
  ])
}

async function checkGFS(date, h, cycle, env) {
  const url = `https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/gfs.${date}/${h}/atmos/gfs.t${h}z.pgrb2.0p25.f000`
  try {
    const res = await fetch(url, { method:'HEAD', signal: AbortSignal.timeout(6000) })
    const id  = `gfs-${date}-${cycle}`
    await upsertRun(env.DB, { id, model:'gfs', cycle, run_date:date, status: res.ok ? 'ready' : 'pending' })
    if (res.ok) await notify(env.KV, id, 'GFS', cycle, env.DB)
  } catch {}
}

async function checkHRRR(date, h, cycle, env) {
  const url = `https://nomads.ncep.noaa.gov/pub/data/nccf/com/hrrr/prod/hrrr.${date}/conus/hrrr.t${h}z.wrfnatf00.grib2`
  try {
    const res = await fetch(url, { method:'HEAD', signal: AbortSignal.timeout(6000) })
    const id  = `hrrr-${date}-${cycle}`
    await upsertRun(env.DB, { id, model:'hrrr', cycle, run_date:date, status: res.ok ? 'ready' : 'pending' })
    if (res.ok) await notify(env.KV, id, 'HRRR', cycle, env.DB)
  } catch {}
}

async function checkECMWF(date, cycle, env) {
  // ECMWF Open Data runs at 00z and 12z
  const hour = parseInt(cycle)
  if (hour !== 0 && hour !== 12) return
  const h = String(hour).padStart(2, '0')
  // ECMWF open data URL pattern
  const ecDate = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`
  const url = `https://data.ecmwf.int/forecasts/${ecDate}/${h}z/ifs/0p25/oper/`
  try {
    const res = await fetch(url, { method:'HEAD', signal: AbortSignal.timeout(8000) })
    const id  = `ecmwf-${date}-${h}z`
    await upsertRun(env.DB, { id, model:'ecmwf', cycle: `${h}z`, run_date:date, status: res.ok ? 'ready' : 'pending' })
    if (res.ok) await notify(env.KV, id, 'ECMWF IFS', `${h}z`, env.DB)
  } catch {}

  // Also check EC-AIFS (runs 00/06/12/18z)
  const aifsUrl = `https://data.ecmwf.int/forecasts/${ecDate}/${h}z/aifs/0p25/oper/`
  try {
    const res = await fetch(aifsUrl, { method:'HEAD', signal: AbortSignal.timeout(8000) })
    const aifsId = `ecaifs-${date}-${h}z`
    await upsertRun(env.DB, { id: aifsId, model:'ecaifs', cycle: `${h}z`, run_date:date, status: res.ok ? 'ready' : 'pending' })
    if (res.ok) await notify(env.KV, aifsId, 'EC-AIFS', `${h}z`, env.DB)
  } catch {}
}

async function checkICON(date, h, cycle, env) {
  // ICON runs at 00/06/12/18z
  const hour = parseInt(h)
  if (![0,6,12,18].includes(hour)) return
  const hStr = String(hour).padStart(2, '0')
  const url = `https://opendata.dwd.de/weather/nwp/icon/grib/${hStr}/t_2m/icon_global_icosahedral_single-level_${date}${hStr}_000_T_2M.grib2.bz2`
  try {
    const res = await fetch(url, { method:'HEAD', signal: AbortSignal.timeout(8000) })
    const id  = `icon-${date}-${hStr}z`
    await upsertRun(env.DB, { id, model:'icon', cycle: `${hStr}z`, run_date:date, status: res.ok ? 'ready' : 'pending' })
    if (res.ok) await notify(env.KV, id, 'ICON', `${hStr}z`, env.DB)
  } catch {}
}

async function checkNAM(date, h, cycle, env) {
  // NAM runs at 00/06/12/18z
  const hour = parseInt(h)
  if (![0,6,12,18].includes(hour)) return
  const hStr = String(hour).padStart(2, '0')
  const url = `https://nomads.ncep.noaa.gov/pub/data/nccf/com/nam/prod/nam.${date}/nam.t${hStr}z.conusnest.hiresf00.tm00.grib2`
  try {
    const res = await fetch(url, { method:'HEAD', signal: AbortSignal.timeout(6000) })
    const id  = `nam-${date}-${hStr}z`
    await upsertRun(env.DB, { id, model:'nam', cycle: `${hStr}z`, run_date:date, status: res.ok ? 'ready' : 'pending' })
    if (res.ok) await notify(env.KV, id, 'NAM 3km', `${hStr}z`, env.DB)
  } catch {}
}

// ── Helpers ───────────────────────────────────────────

async function upsertRun(db, run) {
  await db.prepare(
    `INSERT INTO model_runs (id, model, cycle, run_date, status, completed_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET status=excluded.status, completed_at=excluded.completed_at`
  ).bind(run.id, run.model, run.cycle, run.run_date, run.status, run.status === 'ready' ? new Date().toISOString() : null).run()
}

async function notify(kv, id, model, cycle, db) {
  const key = `notify:${id}`
  try { const existing = await kv.get(key); if (existing) return } catch {}
  await kv.put(key, JSON.stringify({ model, cycle, timestamp: Date.now() }), { expirationTtl: 3600 })
  console.log(`[cron] New run ready: ${model} ${cycle}`)

  // Push real-time model alert to all users with push subscriptions
  const CHAT_ORIGIN = 'https://chat.chasernet.com'
  try {
    // Get users who have been active in the last 24h
    const activeUsers = await db.prepare(
      `SELECT id FROM users WHERE last_active > ? LIMIT 500`
    ).bind(Date.now() - 86400000).all()

    const event = {
      type: 'model_alert',
      payload: {
        runId: id,
        model,
        cycle,
        title: `${model} ${cycle} is ready`,
        body:  `New ${model} model run (${cycle}) is now available.`,
        timestamp: Date.now(),
      },
    }

    // Fan-out push to active users (fire-and-forget, non-blocking)
    const pushes = (activeUsers.results ?? []).map(u =>
      fetch(`${CHAT_ORIGIN}/user/${u.id}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {})
    )
    await Promise.allSettled(pushes)
    console.log(`[cron] Pushed ${model} ${cycle} alert to ${pushes.length} users`)
  } catch (err) {
    console.warn('[cron] Model alert push failed:', err.message)
  }
}
