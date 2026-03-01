import { useEffect, useRef } from 'react'
import { useMapStore }  from '../stores/mapStore.js'
import { useRoomStore } from '../stores/roomStore.js'

const OM_MODELS = {
  'Euro IFS':  'ecmwf_ifs025',
  'GFS':       'gfs025',
  'EC-AIFS':   'ecmwf_aifs025',
  'HRRR':      'best_match',
  'ICON':      'icon_global',
  'NAM 3km':   'best_match',
  'CMC':       'gem_global',
  'UKMET':     'ukmo_global',
  'GraphCast': 'ecmwf_aifs025',
  'GEFS':      'gfs025',
}

function buildUrl(modelName, lat, lon) {
  const model = OM_MODELS[modelName] ?? 'best_match'
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    hourly: 'windspeed_10m,winddirection_10m,temperature_2m,precipitation,cape,pressure_msl',
    wind_speed_unit: 'kn', models: model, forecast_days: '7', timezone: 'UTC',
  })
  return 'https://api.open-meteo.com/v1/forecast?' + params
}

function buildTrack(lat, lon, hourly) {
  const { windspeed_10m: speeds, winddirection_10m: dirs } = hourly
  if (!speeds || !dirs) return [[0, lat, lon]]
  const track = [[0, lat, lon]]
  let curLat = lat, curLon = lon
  const DEG_PER_NM = 1/60
  for (let h = 0; h < Math.min(168, speeds.length-1); h += 6) {
    let avgSpeed=0, sinSum=0, cosSum=0
    for (let i=h; i<h+6&&i<speeds.length; i++) {
      const rad=(dirs[i]??0)*Math.PI/180
      avgSpeed+=(speeds[i]??0)/6; sinSum+=Math.sin(rad)/6; cosSum+=Math.cos(rad)/6
    }
    const steeringKt=avgSpeed*0.55, movDir=Math.atan2(sinSum,cosSum), distNm=steeringKt*6
    curLat+=Math.cos(movDir)*distNm*DEG_PER_NM+0.05
    curLon+=Math.sin(movDir)*distNm*DEG_PER_NM-0.03
    track.push([h+6, parseFloat(curLat.toFixed(4)), parseFloat(curLon.toFixed(4))])
  }
  return track
}

export function useWeatherData() {
  const { modelA, modelB, setDataA, setDataB, setDataLoading, setDataError } = useMapStore()
  const { activeRoom, getRoom } = useRoomStore()
  const prevA = useRef(null), prevB = useRef(null)
  const room = getRoom(activeRoom)
  const lat = room?.lat ?? 16.2, lon = room?.lon ?? -104.8
  const coords = lat+','+lon

  useEffect(() => {
    const key = modelA+'|'+coords
    if (prevA.current === key) return
    prevA.current = key
    let cancelled = false
    setDataLoading(true)
    fetch(buildUrl(modelA, lat, lon))
      .then(r => { if (!r.ok) throw new Error('HTTP '+r.status); return r.json() })
      .then(raw => { if (cancelled) return; const track=buildTrack(lat,lon,raw.hourly??{}); setDataA({raw,track,model:modelA}); setDataLoading(false); console.log('[useWeatherData] '+modelA+': '+track.length+' pts') })
      .catch(err => { if (!cancelled) { setDataError(err.message); setDataLoading(false) } })
    return () => { cancelled = true }
  }, [modelA, coords])

  useEffect(() => {
    const key = modelB+'|'+coords
    if (prevB.current === key) return
    prevB.current = key
    let cancelled = false
    fetch(buildUrl(modelB, lat, lon))
      .then(r => { if (!r.ok) throw new Error('HTTP '+r.status); return r.json() })
      .then(raw => { if (cancelled) return; const track=buildTrack(lat,lon,raw.hourly??{}); setDataB({raw,track,model:modelB}); console.log('[useWeatherData] '+modelB+': '+track.length+' pts') })
      .catch(err => console.warn('[useWeatherData] Model B failed:', err))
    return () => { cancelled = true }
  }, [modelB, coords])
}
