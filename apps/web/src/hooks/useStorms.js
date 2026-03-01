import { useEffect, useRef } from 'react'
import { useRoomStore }      from '../stores/roomStore.js'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

function catColor(cat) {
  if (!cat) return '#6B7A9E'
  if (cat === 'C5') return '#FF0000'
  if (cat === 'C4') return '#FF4500'
  if (cat === 'C3') return '#EF4444'
  if (cat === 'C2') return '#F97316'
  if (cat === 'C1') return '#F59E0B'
  if (cat === 'TS') return '#38BDF8'
  if (cat === 'Invest') return '#8B5CF6'
  return '#6B7A9E'
}

export function useStorms() {
  const { addRoom } = useRoomStore()
  const intervalRef = useRef(null)

  async function fetchStorms() {
    try {
      const res  = await fetch(`${API_BASE}/storms`)
      const data = await res.json()
      const apiStorms = data.storms ?? []
      for (const s of apiStorms) {
        addRoom({
          id:       s.id,
          name:     s.name,
          short:    s.name.split(' ').map(w => w[0]).join('').slice(0,3),
          category: s.category ?? 'TD',
          catColor: catColor(s.category),
          basin:    s.basin ?? 'ATL',
          wind:     s.wind_kt ?? 0,
          pressure: s.pressure_mb ?? 1010,
          lat:      s.lat ?? 0,
          lon:      s.lon ?? 0,
          users:    0,
          active:   true,
        })
      }
    } catch (e) {
      console.warn('[useStorms] fetch failed:', e.message)
    }
  }

  useEffect(() => {
    fetchStorms()
    intervalRef.current = setInterval(fetchStorms, 5 * 60 * 1000)
    return () => clearInterval(intervalRef.current)
  }, [])
}
