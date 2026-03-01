import { useEffect } from 'react'
import { useMapStore }  from '../stores/mapStore.js'
import { useRoomStore } from '../stores/roomStore.js'

const OM_MODELS = {
  'Euro IFS':'ecmwf_ifs025','GFS':'gfs025','EC-AIFS':'ecmwf_aifs025',
  'HRRR':'best_match','ICON':'icon_global','NAM 3km':'best_match',
  'CMC':'gem_global','UKMET':'ukmo_global','GraphCast':'ecmwf_aifs025','GEFS':'gfs025',
}

function buildUrl(modelId, lat, lon) {
  return 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
    latitude: String(lat), longitude: String(lon),
    hourly: 'windspeed_10m,winddirection_10m,temperature_2m,precipitation,cape,pressure_msl',
    wind_speed_unit: 'kn', models: OM_MODELS[modelId] ?? 'best_match',
    forecast_days: '7', timezone: 'UTC',
  })
}

function buildTrack(lat, lon, hourly) {
  const { windspeed_10m: speeds, winddirection_10m: dirs } = hourly
  if (!speeds || !dirs) return [[0, lat, lon]]
  const track = [[0, lat, lon]]; let cLat = lat, cLon = lon
  for (let h = 0; h < Math.min(168, speeds.length - 1); h += 6) {
    let spd=0, sin=0, cos=0
    for (let i=h; i<h+6 && i<speeds.length; i++) {
      const r=(dirs[i]??0)*Math.PI/180; spd+=(speeds[i]??0)/6; sin+=Math.sin(r)/6; cos+=Math.cos(r)/6
    }
    cLat+=Math.cos(Math.atan2(sin,cos))*spd*0.55*6/60+0.05
    cLon+=Math.sin(Math.atan2(sin,cos))*spd*0.55*6/60-0.03
    track.push([h+6, parseFloat(cLat.toFixed(4)), parseFloat(cLon.toFixed(4))])
  }
  return track
}

async function fetchModel(modelId, lat, lon, setModelData) {
  console.log(`🌐 Fetching ${modelId} @ ${lat},${lon}`)
  try {
    const res = await fetch(buildUrl(modelId, lat, lon))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw = await res.json()
    if (!raw?.hourly?.windspeed_10m) throw new Error('missing hourly data')
    const track = buildTrack(lat, lon, raw.hourly)
    setModelData(modelId, { raw, track, model: modelId })
    console.log(`✅ ${modelId} loaded — ${raw.hourly.windspeed_10m.length} steps`)
  } catch (err) {
    console.error(`❌ ${modelId} failed:`, err.message)
  }
}

export function useWeatherData() {
  const { activeModels, primaryModel, setModelData, userLocation, activeLayers, setLayer } = useMapStore()
  const { activeRoom, getRoom } = useRoomStore()
  const room = getRoom(activeRoom)
  const lat  = room?.lat ?? userLocation?.lat ?? 20
  const lon  = room?.lon ?? userLocation?.lon ?? -40

  useEffect(() => {
    const first = activeLayers.find(l => l.visible)
    if (first) setLayer(first.id)
  }, [activeLayers])

  useEffect(() => {
    const rLat = parseFloat(lat.toFixed(2))
    const rLon = parseFloat(lon.toFixed(2))
    fetchModel(primaryModel, rLat, rLon, setModelData)
    const others = activeModels.filter(m => m !== primaryModel)
    const timers = others.map((id, i) => setTimeout(() => fetchModel(id, rLat, rLon, setModelData), 1000 + i * 500))
    return () => timers.forEach(clearTimeout)
  }, [primaryModel, activeModels.join(','), Math.round(lat * 10), Math.round(lon * 10)])
}
