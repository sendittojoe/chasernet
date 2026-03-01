import { useEffect, useRef } from 'react'
import { useMapStore }  from '../stores/mapStore.js'
import { useRoomStore } from '../stores/roomStore.js'

/**
 * MODEL → Open-Meteo model string mapping.
 * Full list: https://open-meteo.com/en/docs#models
 */
const OM_MODELS = {
  'Euro IFS':  'ecmwf_ifs025',
  'GFS':       'gfs025',
  'EC-AIFS':   'ecmwf_aifs025',
  'HRRR':      'best_match',   // HRRR not directly exposed, best_match picks it for CONUS
  'ICON':      'icon_global',
  'NAM 3km':   'best_match',
  'CMC':       'gem_global',
  'UKMET':     'ukmo_global',
  'GraphCast': 'ecmwf_aifs025',
  'GEFS':      'gfs025',       // ensemble mean via GFS for now
}

/**
 * Build Open-Meteo URL for a given model + location.
 * Returns all variables we ever need in one call.
 */
function buildUrl(modelName, lat, lon) {
  const model = OM_MODELS[modelName] ?? 'best_match'
  const params = new URLSearchParams({
    latitude:       lat,
    longitude:      lon,
    hourly:         'windspeed_10m,winddirection_10m,temperature_2m,precipitation,cape,pressure_msl',
    wind_speed_unit:'kn',
    models:          model,
    forecast_days:  '7',
    timezone:       'UTC',
  })
  return `https://api.open-meteo.com/v1/forecast?${params}`
}

/**
 * useWeatherData
 *
 * Watches mapStore for modelA/modelB changes and the activeRoom
 * for coordinate changes. Fetches Open-Meteo and writes results
 * back into mapStore (dataA / dataB).
 *
 * De-duplicates: won't re-fetch if model + coords haven't changed.
 */
export function useWeatherData() {
  const { modelA, modelB, setDataA, setDataB, setDataLoading, setDataError } = useMapStore()
  const { activeRoom, getRoom } = useRoomStore()
  const prevA = useRef(null)
  const prevB = useRef(null)

  const room   = getRoom(activeRoom)
  const lat    = room?.lat  ?? 16.2
  const lon    = room?.lon  ?? -104.8
  const coords = `${lat},${lon}`

  // Fetch model A
  useEffect(() => {
    const key = `${modelA}|${coords}`
    if (prevA.current === key) return
    prevA.current = key

    let cancelled = false
    setDataLoading(true)

    fetch(buildUrl(modelA, lat, lon))
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { if (!cancelled) { setDataA(data); setDataLoading(false) } })
      .catch(err => { if (!cancelled) { setDataError(err.message); setDataLoading(false) } })

    return () => { cancelled = true }
  }, [modelA, coords])

  // Fetch model B
  useEffect(() => {
    const key = `${modelB}|${coords}`
    if (prevB.current === key) return
    prevB.current = key

    let cancelled = false

    fetch(buildUrl(modelB, lat, lon))
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { if (!cancelled) setDataB(data) })
      .catch(err => console.warn('Model B fetch failed:', err))

    return () => { cancelled = true }
  }, [modelB, coords])
}
