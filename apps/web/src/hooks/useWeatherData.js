import { useEffect, useRef } from 'react'
import { useMapStore }  from '../stores/mapStore.js'
import { useRoomStore } from '../stores/roomStore.js'

// Open-Meteo model keys
const MODEL_KEYS = {
  'Euro IFS':  'ecmwf_ifs025',
  'GFS':       'gfs025',
  'EC-AIFS':   'ecmwf_aifs025',
  'ICON':      'icon_global',
  'CMC':       'gem_global',
  'UKMET':     'ukmo_global',
  'HRRR':      'best_match',
  'NAM 3km':   'best_match',
}

// Fetch 7-day hourly forecast from Open-Meteo at a lat/lon
async function fetchForecast(lat, lon, modelKey) {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=windspeed_10m,winddirection_10m,temperature_2m,precipitation,cape,pressure_msl` +
    `&wind_speed_unit=kn` +
    `&models=${modelKey}` +
    `&forecast_days=7&timezone=UTC`
  const res  = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  return res.json()
}

// Build a storm track by integrating surface wind vectors from Open-Meteo.
// Uses 10m wind as a proxy for lower-tropospheric steering + beta drift.
function buildTrack(lat, lon, hourlyData) {
  const { windspeed_10m: speeds, winddirection_10m: dirs } = hourlyData
  if (!speeds || !dirs) return [[0, lat, lon]]

  const track = [[0, lat, lon]]
  let curLat = lat
  let curLon = lon
  const DEG_PER_NM = 1/60

  for (let h = 0; h < Math.min(168, speeds.length - 1); h += 6) {
    // Average wind over next 6 hours
    let avgSpeed = 0, sinSum = 0, cosSum = 0
    for (let i = h; i < h + 6 && i < speeds.length; i++) {
      const rad = (dirs[i] ?? 0) * Math.PI / 180
      avgSpeed += (speeds[i] ?? 0) / 6
      sinSum   += Math.sin(rad) / 6
      cosSum   += Math.cos(rad) / 6
    }

    // Steering: ~15-20% of 10m wind for tropical systems (rough empirical)
    const steeringFactor = 0.55
    const steeringKt     = avgSpeed * steeringFactor

    // Wind direction is FROM, so storm moves WITH wind direction
    const movDir = Math.atan2(sinSum, cosSum)

    // Beta drift: small northward + westward correction for NH tropical systems
    const betaDriftLat = 0.05  // degrees per 6h
    const betaDriftLon = -0.03

    // Move storm
    const distNm = steeringKt * 6
    curLat += Math.cos(movDir) * distNm * DEG_PER_NM + betaDriftLat
    curLon += Math.sin(movDir) * distNm * DEG_PER_NM + betaDriftLon

    track.push([h + 6, parseFloat(curLat.toFixed(4)), parseFloat(curLon.toFixed(4))])
  }
  return track
}

export function useWeatherData() {
  const { modelA, modelB, split, setDataA, setDataB, setDataLoading, setDataError } = useMapStore()
  const { activeRoom, getRoom } = useRoomStore()
  const fetchRef = useRef({})

  useEffect(() => {
    const room = getRoom(activeRoom)
    if (!room) return

    const lat = room.lat
    const lon = room.lon
    if (!lat || !lon) return

    const keyA = MODEL_KEYS[modelA] ?? 'ecmwf_ifs025'
    const keyB = MODEL_KEYS[modelB] ?? 'gfs025'

    const cacheKey = `${activeRoom}-${lat}-${lon}-${keyA}-${keyB}`
    if (fetchRef.current.key === cacheKey) return
    fetchRef.current.key = cacheKey

    setDataLoading(true)
    setDataError(null)

    const fetchBoth = async () => {
      try {
        const [rawA, rawB] = await Promise.all([
          fetchForecast(lat, lon, keyA),
          split ? fetchForecast(lat, lon, keyB) : Promise.resolve(null),
        ])

        const hourly = rawA.hourly ?? {}
        const trackA = buildTrack(lat, lon, hourly)
        const trackB = rawB ? buildTrack(lat, lon, rawB.hourly ?? {}) : trackA

        setDataA({ raw: rawA, track: trackA, model: modelA })
        setDataB({ raw: rawB, track: trackB, model: modelB })
        setDataLoading(false)

        console.log(`[useWeatherData] ${modelA} track: ${trackA.length} points | ${modelB} track: ${trackB.length} points`)
      } catch (e) {
        console.error('[useWeatherData] fetch error:', e)
        setDataError(e.message)
        setDataLoading(false)
      }
    }

    fetchBoth()
  }, [activeRoom, modelA, modelB, split])
}
