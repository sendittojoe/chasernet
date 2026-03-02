import { useEffect, useRef, useCallback } from 'react'
import { useMapStore, ALL_MODELS } from '../../stores/mapStore.js'

const API     = import.meta.env.VITE_API_BASE ?? 'https://api.chasernet.com'
const R2_BASE = 'https://assets.chasernet.com/tiles'

// Color ramps for different variables
const COLOR_RAMPS = {
  temp_2m: [
    [-40, [128,   0, 128]],  // deep purple = extreme cold
    [-20, [ 64,  64, 255]],  // blue
    [  0, [  0, 192, 255]],  // cyan
    [ 10, [  0, 255, 128]],  // green
    [ 20, [255, 255,   0]],  // yellow
    [ 30, [255, 128,   0]],  // orange
    [ 40, [255,   0,   0]],  // red
    [ 50, [128,   0,   0]],  // dark red
  ],
  mslp: [
    [ 960, [128,   0, 128]],
    [ 980, [ 64,  64, 255]],
    [ 995, [  0, 192, 255]],
    [1005, [  0, 255, 128]],
    [1013, [255, 255,   0]],
    [1025, [255, 128,   0]],
    [1040, [255,   0,   0]],
    [1060, [128,   0,   0]],
  ],
  precip: [
    [  0,   [  0,   0,   0, 0]],     // transparent for no precip
    [  0.1, [  0, 128, 255, 80]],
    [  1,   [  0, 192, 128, 120]],
    [  5,   [  0, 255,   0, 160]],
    [ 10,   [255, 255,   0, 180]],
    [ 25,   [255, 128,   0, 200]],
    [ 50,   [255,   0,   0, 220]],
    [100,   [128,   0, 128, 240]],
  ],
  cape: [
    [   0, [  0,   0,   0, 0]],
    [ 100, [ 64, 128, 255, 60]],
    [ 500, [  0, 255, 128, 100]],
    [1000, [255, 255,   0, 140]],
    [2000, [255, 128,   0, 180]],
    [3000, [255,   0,   0, 200]],
    [5000, [128,   0, 128, 240]],
  ],
  hgt_500: [
    [4800, [128,   0, 128]],
    [5100, [ 64,  64, 255]],
    [5280, [  0, 192, 255]],
    [5400, [  0, 255, 128]],
    [5520, [255, 255,   0]],
    [5640, [255, 128,   0]],
    [5880, [255,   0,   0]],
  ],
}

// Map our layer IDs to tile variable names
const LAYER_TO_VARIABLE = {
  wind:   'wind_10m',
  temp:   'temp_2m',
  precip: 'precip',
  mslp:   'mslp',
  cape:   'cape',
  '500mb': 'hgt_500',
}

/**
 * GridLayer — renders GRIB2-derived gridded weather data on the MapLibre map.
 *
 * Fetches JSON grid tiles from R2 (uploaded by the GRIB2 pipeline)
 * and renders them as a canvas overlay using MapLibre's addImage + fill pattern
 * or a custom canvas source.
 *
 * Falls back gracefully when tile data isn't available yet.
 */
export default function GridLayer({ map }) {
  const canvasRef  = useRef(null)
  const sourceRef  = useRef(null)
  const tileCache  = useRef({})
  const loadingRef = useRef(new Set())
  const frameRef   = useRef(null)

  useEffect(() => {
    if (!map) return

    const canvas = document.createElement('canvas')
    canvas.width  = 360   // 1° per pixel
    canvas.height = 181
    canvasRef.current = canvas

    const trySetup = () => {
      if (map.isStyleLoaded()) setup(map, canvas)
      else map.once('load', () => setup(map, canvas))
    }
    trySetup()

    // Subscribe to store changes
    const unsub = useMapStore.subscribe(
      (s) => ({ layer: s.layer, hour: s.hour, primaryModel: s.primaryModel, activeLayers: s.activeLayers }),
      () => requestRender(map)
    )

    return () => {
      unsub()
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      cleanup(map)
    }
  }, [map])

  function setup(map, canvas) {
    // Add a canvas source for the grid overlay
    map.addSource('grid-source', {
      type: 'canvas',
      canvas: canvas,
      coordinates: [
        [0, 90],     // top-left (lon, lat)
        [360, 90],   // top-right
        [360, -90],  // bottom-right
        [0, -90],    // bottom-left
      ],
      animate: true,
    })

    map.addLayer({
      id: 'grid-layer',
      type: 'raster',
      source: 'grid-source',
      paint: {
        'raster-opacity': 0.55,
        'raster-fade-duration': 0,
      },
    }, 'track-line-' + useMapStore.getState().primaryModel) // below tracks

    sourceRef.current = map.getSource('grid-source')
    requestRender(map)
  }

  function requestRender(map) {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => render(map))
  }

  async function render(map) {
    const { layer, hour, primaryModel, activeLayers } = useMapStore.getState()
    const canvas = canvasRef.current
    if (!canvas || !map) return

    const ctx = canvas.getContext('2d')

    // Check if grid layer toggle is visible
    const gridToggle = activeLayers.find(l => l.id === layer)
    const visible = gridToggle?.visible !== false

    // Update MapLibre layer visibility
    if (map.getLayer('grid-layer')) {
      map.setLayoutProperty('grid-layer', 'visibility', visible ? 'visible' : 'none')
      map.setPaintProperty('grid-layer', 'raster-opacity', (gridToggle?.opacity ?? 0.55))
    }

    if (!visible) return

    // Determine which tile to load
    const variable = LAYER_TO_VARIABLE[layer]
    if (!variable) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    // Find model ID mapping
    const modelDef = ALL_MODELS.find(m => m.id === primaryModel)
    const tileModel = mapModelToTile(primaryModel)
    if (!tileModel) return

    // Find nearest forecast hour
    const fhour = nearestForecastHour(hour)
    const fhStr = String(fhour).padStart(3, '0')

    // Fetch tile data
    const tileKey = `${tileModel}/${variable}_f${fhStr}`
    let tile = tileCache.current[tileKey]

    if (!tile && !loadingRef.current.has(tileKey)) {
      loadingRef.current.add(tileKey)
      tile = await fetchTile(tileModel, variable, fhStr)
      if (tile) {
        tileCache.current[tileKey] = tile
      }
      loadingRef.current.delete(tileKey)
    }

    if (!tile) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    // Render tile to canvas
    renderTileToCanvas(ctx, tile, variable)

    // Trigger canvas source update
    if (sourceRef.current) {
      // MapLibre canvas sources auto-update when animate:true
    }
  }

  return null
}


// ── Helpers ───────────────────────────────────────────

function mapModelToTile(modelId) {
  const map = {
    'Euro IFS': 'ecmwf',
    'EC-AIFS':  'ecmwf',
    'GFS':      'gfs',
    'ICON':     'icon',
    'HRRR':     'gfs',     // fallback to GFS tiles
    'NAM 3km':  'gfs',     // fallback
    'CMC':      'gfs',     // fallback
    'UKMET':    'gfs',     // fallback
    'GraphCast':'ecmwf',   // fallback
    'GEFS':     'gfs',     // fallback
  }
  return map[modelId] ?? 'gfs'
}

const VALID_FHOURS = [0, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168]

function nearestForecastHour(hour) {
  let best = 0
  for (const fh of VALID_FHOURS) {
    if (Math.abs(fh - hour) < Math.abs(best - hour)) best = fh
  }
  return best
}

async function fetchTile(model, variable, fhStr) {
  // First try to get latest run info
  try {
    const indexRes = await fetch(`${API}/tiles/latest/${model}`)
    if (indexRes.ok) {
      const latest = await indexRes.json()
      if (latest.available) {
        const url = `${API}/tiles/${model}/${latest.date}/${latest.cycle}/${variable}_f${fhStr}.json`
        const res = await fetch(url)
        if (res.ok) {
          return await res.json()
        }
      }
    }
  } catch (e) {
    console.warn(`[GridLayer] tile fetch failed: ${model}/${variable}_f${fhStr}`, e.message)
  }

  // Direct R2 fallback — try today's date
  try {
    const now  = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const cycles = model === 'ecmwf' ? ['12', '00'] : ['18', '12', '06', '00']

    for (const cycle of cycles) {
      const url = `${R2_BASE}/${model}/${date}/${cycle}z/${variable}_f${fhStr}.json`
      const res = await fetch(url)
      if (res.ok) {
        return await res.json()
      }
    }
  } catch {}

  return null
}

function renderTileToCanvas(ctx, tile, variable) {
  const { grid, data } = tile
  const { nlat, nlon } = grid
  const ramp = COLOR_RAMPS[variable]

  if (!ramp) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    return
  }

  const imgData = ctx.createImageData(nlon, nlat)
  const pixels  = imgData.data

  if (variable === 'wind_10m' && data.u && data.v) {
    // Wind speed from U/V components
    for (let i = 0; i < nlat * nlon; i++) {
      const u   = data.u[i] ?? 0
      const v   = data.v[i] ?? 0
      const spd = Math.sqrt(u * u + v * v) * 1.94384  // m/s → knots
      const color = interpolateRamp(WIND_RAMP, spd)
      const px = i * 4
      pixels[px]     = color[0]
      pixels[px + 1] = color[1]
      pixels[px + 2] = color[2]
      pixels[px + 3] = color[3] ?? 180
    }
  } else if (data.values) {
    // Scalar field
    let values = data.values
    // Convert Kelvin to Celsius for temperature
    if (variable === 'temp_2m') {
      values = values.map(v => v != null ? v - 273.15 : null)
    }
    // Convert Pa to hPa for pressure
    if (variable === 'mslp') {
      values = values.map(v => v != null ? v / 100 : null)
    }

    for (let i = 0; i < nlat * nlon; i++) {
      const val = values[i]
      if (val == null) {
        const px = i * 4
        pixels[px + 3] = 0  // transparent
        continue
      }
      const color = interpolateRamp(ramp, val)
      const px = i * 4
      pixels[px]     = color[0]
      pixels[px + 1] = color[1]
      pixels[px + 2] = color[2]
      pixels[px + 3] = color[3] ?? 180
    }
  }

  ctx.putImageData(imgData, 0, 0)
}

const WIND_RAMP = [
  [  0, [  0, 128, 255, 40]],
  [  5, [  0, 192, 255, 80]],
  [ 15, [  0, 255, 128, 120]],
  [ 25, [255, 255,   0, 160]],
  [ 34, [255, 200,   0, 180]],   // TS threshold
  [ 50, [255, 128,   0, 200]],
  [ 64, [255,  64,   0, 220]],   // Hurricane
  [ 96, [255,   0,   0, 240]],   // Major
  [130, [128,   0, 128, 255]],   // Cat 5
]

function interpolateRamp(ramp, value) {
  if (value <= ramp[0][0]) return ramp[0][1]
  if (value >= ramp[ramp.length - 1][0]) return ramp[ramp.length - 1][1]

  for (let i = 1; i < ramp.length; i++) {
    if (value <= ramp[i][0]) {
      const [v0, c0] = ramp[i - 1]
      const [v1, c1] = ramp[i]
      const t = (value - v0) / (v1 - v0)
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
        Math.round((c0[3] ?? 180) + ((c1[3] ?? 180) - (c0[3] ?? 180)) * t),
      ]
    }
  }
  return ramp[ramp.length - 1][1]
}


function cleanup(map) {
  if (map.getLayer('grid-layer'))  map.removeLayer('grid-layer')
  if (map.getSource('grid-source')) map.removeSource('grid-source')
}
