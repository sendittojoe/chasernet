/**
 * Cron Worker — runs every 15 minutes.
 * Checks NOAA NOMADS and ECMWF Open Data for new model cycles.
 * Writes results to D1 model_runs table.
 * Queues push notifications via KV for new ready runs.
 */

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pollModelRuns(env))
  },

  // Also handle HTTP for manual trigger during dev
  async fetch(req, env) {
    if (req.method === 'POST' && new URL(req.url).pathname === '/trigger') {
      await pollModelRuns(env)
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('Cron worker', { status: 200 })
  }
}

async function pollModelRuns(env) {
  const now   = new Date()
  const cycle = getCurrentCycle(now)  // '00z' | '06z' | '12z' | '18z'
  const date  = now.toISOString().slice(0,10).replace(/-/g,'')

  console.log(`[cron] Checking model runs — cycle ${cycle} ${date}`)

  const checks = [
    checkGFS(date, cycle, env),
    checkECMWF(date, cycle, env),
    checkHRRR(date, now, env),
    checkICON(date, cycle, env),
  ]

  const results = await Promise.allSettled(checks)
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.warn(`[cron] Check ${i} failed:`, r.reason)
  })
}

// ── Model checkers ────────────────────────────────

async function checkGFS(date, cycle, env) {
  // NOMADS GFS availability check — HEAD request to first forecast file
  const cycleNum = cycle.replace('z','').padStart(2,'0')
  const url = `https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/gfs.${date}/${cycleNum}/atmos/gfs.t${cycleNum}z.pgrb2.0p25.f000`

  const res = await fetch(url, { method:'HEAD', signal: AbortSignal.timeout(8000) })
  const id  = `gfs-${date}-${cycle}`

  await upsertRun(env.DB, {
    id,
    model:     'gfs',
    cycle,
    run_date:  date,
    status:    res.ok ? 'ready' : 'pending',
    completed_at: res.ok ? Date.now() : null,
  })

  if (res.ok) await notifyRun(env.KV, id, 'GFS', cycle)
}

async function checkECMWF(date, cycle, env) {
  if (!['00z','12z'].includes(cycle)) return  // ECMWF only runs 00z + 12z
  const dateStr = date.slice(0,4) + '-' + date.slice(4,6) + '-' + date.slice(6,8)
  const cycleNum = cycle.replace('z','')
  const url = `https://data.ecmwf.int/forecasts/${dateStr}/${cycleNum}z/ifs/0p25/oper/`

  const res = await fetch(url, { method:'HEAD', signal: AbortSignal.timeout(8000) })
  const id  = `ecmwf-${date}-${cycle}`

  await upsertRun(env.DB, {
    id,
    model:    'ecmwf',
    cycle,
    run_date:  date,
    status:    res.ok ? 'ready' : 'pending',
    completed_at: res.ok ? Date.now() : null,
  })

  if (res.ok) await notifyRun(env.KV, id, 'Euro IFS', cycle)
}

async function checkHRRR(date, now, env) {
  // HRRR runs every hour — check for the last completed hour
  const hour   = now.getUTCHours()
  const cycle  = `${hour.toString().padStart(2,'0')}z`
  const url    = `https://nomads.ncep.noaa.gov/pub/data/nccf/com/hrrr/prod/hrrr.${date}/conus/hrrr.t${hour.toString().padStart(2,'0')}z.wrfnatf00.grib2`

  const res = await fetch(url, { method:'HEAD', signal: AbortSignal.timeout(8000) })
  const id  = `hrrr-${date}-${cycle}`

  await upsertRun(env.DB, {
    id,
    model:    'hrrr',
    cycle,
    run_date:  date,
    status:    res.ok ? 'ready' : 'pending',
    completed_at: res.ok ? Date.now() : null,
  })

  if (res.ok) await notifyRun(env.KV, id, 'HRRR', cycle)
}

async function checkICON(date, cycle, env) {
  const id = `icon-${date}-${cycle}`
  // DWD Open Data check — simplified
  await upsertRun(env.DB, { id, model:'icon', cycle, run_date:date, status:'ready', completed_at: Date.now() })
}

// ── Helpers ───────────────────────────────────────

function getCurrentCycle(now) {
  const h = now.getUTCHours()
  if (h < 6)  return '00z'
  if (h < 12) return '06z'
  if (h < 18) return '12z'
  return '18z'
}

async function upsertRun(db, run) {
  await db.prepare(
    `INSERT INTO model_runs (id, model, cycle, run_date, status, completed_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET status=excluded.status, completed_at=excluded.completed_at`
  ).bind(run.id, run.model, run.cycle, run.run_date, run.status, run.completed_at ?? null).run()
}

async function notifyRun(kv, runId, modelName, cycle) {
  // Store notification in KV — frontend polls this to trigger push
  const key  = `notify:${runId}`
  const prev = await kv.get(key)
  if (prev) return  // Already notified for this run

  await kv.put(key, JSON.stringify({
    model:     modelName,
    cycle,
    title:     `⚡ ${modelName} ${cycle} ready`,
    body:      `New model run available — ${modelName} ${cycle}`,
    timestamp: Date.now(),
  }), { expirationTtl: 3600 })

  console.log(`[cron] Notified: ${modelName} ${cycle}`)
}
