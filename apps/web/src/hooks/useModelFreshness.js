import { useState, useEffect } from 'react'

// Model run schedules (UTC hours)
const SCHEDULES = {
  gfs:     { cycles: [0,6,12,18], lag: 105 },   // ~1h45m after cycle
  ecmwf:   { cycles: [0,12],      lag: 60  },   // ~1h after cycle
  hrrr:    { cycles: Array.from({length:24},(_,i)=>i), lag: 35 },
  nam:     { cycles: [0,6,12,18], lag: 56  },
  icon:    { cycles: [0,6,12,18], lag: 120 },
  gefs:    { cycles: [0,6,12,18], lag: 160 },
  cmc:     { cycles: [0,12],      lag: 67  },
  aifs:    { cycles: [0,12],      lag: 5   },
}

function getLatestRun(modelId) {
  const sched = SCHEDULES[modelId]
  if (!sched) return null
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMins = now.getUTCMinutes()
  const totalMins = utcHour * 60 + utcMins

  // Find the latest cycle that should be available (cycle time + lag)
  let bestCycle = null
  for (const cycle of [...sched.cycles].reverse()) {
    if (totalMins >= cycle * 60 + sched.lag) {
      bestCycle = cycle
      break
    }
  }
  // Wrap to previous day if needed
  if (bestCycle === null) {
    bestCycle = sched.cycles[sched.cycles.length - 1]
    const runDate = new Date(now)
    runDate.setUTCDate(runDate.getUTCDate() - 1)
    runDate.setUTCHours(bestCycle, 0, 0, 0)
    return { cycle: bestCycle, runDate, ageMs: now - runDate }
  }

  const runDate = new Date(now)
  runDate.setUTCHours(bestCycle, 0, 0, 0)
  return { cycle: bestCycle, runDate, ageMs: now - runDate }
}

function formatAge(ms) {
  const mins = Math.floor(ms / 60000)
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs/24)}d ago`
}

function padZ(n) { return String(n).padStart(2,'0') }

export function useModelFreshness(modelIds) {
  const [freshness, setFreshness] = useState({})

  useEffect(() => {
    function compute() {
      const result = {}
      for (const id of modelIds) {
        const run = getLatestRun(id.toLowerCase())
        if (!run) continue
        result[id] = {
          label:  `${padZ(run.cycle)}z`,
          age:    formatAge(run.ageMs),
          ageMs:  run.ageMs,
          stale:  run.ageMs > 8 * 60 * 60 * 1000, // >8h = stale
        }
      }
      setFreshness(result)
    }
    compute()
    const t = setInterval(compute, 60 * 1000) // refresh every minute
    return () => clearInterval(t)
  }, [modelIds.join(',')])

  return freshness
}
