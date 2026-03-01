import { useEffect, useRef } from 'react'
import { useMapStore }  from '../stores/mapStore.js'

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

async function fetchPoint(lat, lon, model, pressureLevel) {
  const omModel = OM_MODELS[model] ?? 'best_match'
  const isSurface = !pressureLevel || pressureLevel === 'surface'
  const hourly = isSurface
    ? 'windspeed_10m,winddirection_10m,temperature_2m,precipitation,cape,pressure_msl'
    : 'windspeed_'+pressureLevel+'hPa,winddirection_'+pressureLevel+'hPa,temperature_'+pressureLevel+'hPa,geopotential_height_'+pressureLevel+'hPa'
  const params = new URLSearchParams({
    latitude: lat.toFixed(2), longitude: lon.toFixed(2),
    hourly, wind_speed_unit: 'kn', models: omModel, forecast_days: '7', timezone: 'UTC',
  })
  if (!isSurface) params.set('pressure_level', pressureLevel)
  const res = await fetch('https://api.open-meteo.com/v1/forecast?' + params)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const data = await res.json()
  return { lat, lon, hourly: data.hourly ?? {} }
}

function buildGrid(bounds, cols=5, rows=4) {
  const { minLat, maxLat, minLon, maxLon } = bounds
  const pts = []
  for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
    pts.push({
      lat: parseFloat((minLat + (maxLat-minLat)*(r/(rows-1))).toFixed(2)),
      lon: parseFloat((minLon + (maxLon-minLon)*(c/(cols-1))).toFixed(2)),
    })
  }
  return pts
}

export function useGridData(map) {
  const { modelA, setGridData, setGridLoading, pressureLevel } = useMapStore()
  const fetchRef = useRef(null)
  const keyRef   = useRef(null)

  useEffect(() => {
    if (!map) return
    const refresh = () => {
      const b = map.getBounds()
      const bounds = {
        minLat: Math.max(-85, b.getSouth()-2), maxLat: Math.min(85, b.getNorth()+2),
        minLon: b.getWest()-2, maxLon: b.getEast()+2,
      }
      const key = [modelA, pressureLevel,
        bounds.minLat.toFixed(0), bounds.maxLat.toFixed(0),
        bounds.minLon.toFixed(0), bounds.maxLon.toFixed(0),
      ].join('|')
      if (keyRef.current === key) return
      keyRef.current = key
      clearTimeout(fetchRef.current)
      fetchRef.current = setTimeout(async () => {
        setGridLoading(true)
        const pts = buildGrid(bounds, 10, 8)
        try {
          const results = await Promise.all(
            pts.map(p => fetchPoint(p.lat, p.lon, modelA, pressureLevel)
              .catch(() => ({ lat: p.lat, lon: p.lon, hourly: {} })))
          )
          setGridData(results)
          console.log('[useGridData] ' + results.length + ' pts @ ' + pressureLevel)
        } catch(e) { console.warn('[useGridData]', e.message) }
        setGridLoading(false)
      }, 600)
    }
    refresh()
    map.on('moveend', refresh)
    return () => { map.off('moveend', refresh); clearTimeout(fetchRef.current) }
  }, [map, modelA, pressureLevel])
}
