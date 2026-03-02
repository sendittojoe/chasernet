import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://api.chasernet.com'

/**
 * useModelRuns — polls the API for current model run status.
 * Fires browser notification when a new run completes.
 */
export function useModelRuns() {
  const [runs, setRuns] = useState([])
  const [lastChecked, setLastChecked] = useState(Date.now())
  const prevRunsRef = useRef([])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/models/runs`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const incoming = data.runs ?? []

        // Check for newly-ready runs vs previous poll
        const prev = prevRunsRef.current
        if (prev.length > 0) {
          for (const run of incoming) {
            const was = prev.find(r => r.id === run.id)
            if (run.status === 'ready' && (!was || was.status !== 'ready')) {
              notifyNewRun(run)
            }
          }
        }

        prevRunsRef.current = incoming
        setRuns(incoming)
        setLastChecked(Date.now())
      } catch (err) {
        console.warn('[useModelRuns] poll failed:', err.message)
        // If API is unreachable, fall back to showing empty state
        // rather than stale mock data
      }
    }

    poll()
    const interval = setInterval(poll, 5 * 60 * 1000) // every 5 min
    return () => clearInterval(interval)
  }, [])

  return { runs, lastChecked }
}

async function notifyNewRun(run) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const modelName = run.model?.toUpperCase() ?? 'Model'
    const cycle = run.cycle ?? ''
    new Notification(`⚡ ${modelName} ${cycle} ready`, {
      body: `New model run available — ${modelName} ${cycle}`,
      icon: '/icons/icon-192.png',
      tag: `model-run-${run.id}`, // prevents duplicate notifications
    })
  } catch (e) {
    console.warn('[useModelRuns] notification failed:', e.message)
  }
}
