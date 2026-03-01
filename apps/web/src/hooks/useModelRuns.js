import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://api.chasernet.com'

/**
 * useModelRuns — polls the API for current model run status.
 * Fires browser push notification when a new run completes.
 *
 * Phase 1: uses mock data
 * Phase 2+: polls /api/models/runs
 */
export function useModelRuns() {
  const [runs, setRuns] = useState(MOCK_RUNS)
  const [lastChecked, setLastChecked] = useState(Date.now())

  useEffect(() => {
    // Phase 1: polling not wired yet
    // In Phase 3, uncomment below and set VITE_ENABLE_POLLING=true
    /*
    if (import.meta.env.VITE_ENABLE_POLLING !== 'true') return

    const poll = async () => {
      try {
        const res  = await fetch(`${API_BASE}/models/runs`)
        const data = await res.json()
        const prev = runs
        setRuns(data.runs)
        setLastChecked(Date.now())

        // Notify for any newly-ready runs
        data.runs.forEach(run => {
          const was = prev.find(r => r.id === run.id)
          if (run.status === 'ready' && was?.status !== 'ready') {
            notifyNewRun(run)
          }
        })
      } catch (err) {
        console.warn('Model run poll failed:', err)
      }
    }

    poll()
    const interval = setInterval(poll, 5 * 60 * 1000)  // every 5 min
    return () => clearInterval(interval)
    */
  }, [])

  return { runs, lastChecked }
}

async function notifyNewRun(run) {
  if (Notification.permission !== 'granted') return
  new Notification(`⚡ ${run.model} ${run.cycle} ready`, {
    body: `New model run available — ${run.model} ${run.cycle}`,
    icon: '/icons/icon-192.png',
  })
}

// ── Mock data for Phase 1 ────────────────────────
const MOCK_RUNS = [
  { id:'ecmwf-12z',  model:'Euro IFS',  cycle:'12z', status:'ready',   age:'1h ago'     },
  { id:'gfs-12z',    model:'GFS',       cycle:'12z', status:'ready',   age:'2h ago'     },
  { id:'aifs-12z',   model:'EC-AIFS',   cycle:'12z', status:'ready',   age:'8m ago'     },
  { id:'hrrr-19z',   model:'HRRR',      cycle:'19z', status:'ready',   age:'12m ago'    },
  { id:'gefs-12z',   model:'GEFS',      cycle:'12z', status:'running', age:'ingesting…' },
  { id:'icon-12z',   model:'ICON',      cycle:'12z', status:'ready',   age:'4h ago'     },
  { id:'nam-12z',    model:'NAM 3km',   cycle:'12z', status:'ready',   age:'3h ago'     },
  { id:'cmc-12z',    model:'CMC',       cycle:'12z', status:'ready',   age:'5h ago'     },
]
