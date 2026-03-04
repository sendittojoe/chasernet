import { useEffect, useRef } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

const API = import.meta.env.VITE_API_BASE ?? 'https://api.chasernet.com'

// Map layer IDs → tile variable names
const LAYER_VAR = {
  wind:   'wind_10m',
  temp:   'temp_2m',
  precip: 'precip',
  mslp:   'mslp',
  cape:   'cape',
  '500mb': 'hgt_500',
}

// Map model display names → tile path names
const MODEL_TILE = {
  'GFS': 'gfs', 'Euro IFS': 'ecmwf', 'EC-AIFS': 'ecmwf',
  'ICON': 'icon', 'HRRR': 'gfs', 'NAM 3km': 'gfs',
  'CMC': 'gfs', 'UKMET': 'gfs', 'GraphCast': 'ecmwf', 'GEFS': 'gfs',
}

const FHOURS = [0,3,6,12,18,24,36,48,60,72,84,96,108,120,132,144,156,168]
function nearestFH(h) {
  let best = 0
  for (const f of FHOURS) if (Math.abs(f - h) < Math.abs(best - h)) best = f
  return best
}

// ── Color ramps ──────────────────────────────────
const WIND_RAMP = [
  [0,[100,180,255,60]], [5,[0,200,255,100]], [15,[0,255,150,140]],
  [25,[255,255,0,170]], [34,[255,200,0,190]], [50,[255,128,0,210]],
  [64,[255,50,0,230]], [96,[255,0,0,245]], [130,[180,0,255,255]],
]
const RAMPS = {
  temp_2m: [[-40,[128,0,128,180]],[-20,[64,64,255,180]],[0,[0,192,255,180]],
    [10,[0,255,128,180]],[20,[255,255,0,180]],[30,[255,128,0,180]],
    [40,[255,0,0,180]],[50,[128,0,0,180]]],
  mslp: [[960,[128,0,128,180]],[980,[64,64,255,180]],[995,[0,192,255,180]],
    [1005,[0,255,128,180]],[1013,[255,255,0,180]],[1025,[255,128,0,180]],
    [1040,[255,0,0,180]],[1060,[128,0,0,180]]],
  precip: [[0,[0,0,0,0]],[0.1,[0,128,255,80]],[1,[0,192,128,120]],
    [5,[0,255,0,160]],[10,[255,255,0,180]],[25,[255,128,0,200]],
    [50,[255,0,0,220]],[100,[128,0,128,240]]],
  cape: [[0,[0,0,0,0]],[100,[64,128,255,60]],[500,[0,255,128,100]],
    [1000,[255,255,0,140]],[2000,[255,128,0,180]],[3000,[255,0,0,200]],
    [5000,[128,0,128,240]]],
  hgt_500: [[4800,[128,0,128,180]],[5100,[64,64,255,180]],[5280,[0,192,255,180]],
    [5400,[0,255,128,180]],[5520,[255,255,0,180]],[5640,[255,128,0,180]],
    [5880,[255,0,0,180]]],
}

function lerp(ramp, val) {
  if (val <= ramp[0][0]) return ramp[0][1]
  if (val >= ramp[ramp.length-1][0]) return ramp[ramp.length-1][1]
  for (let i = 1; i < ramp.length; i++) {
    if (val <= ramp[i][0]) {
      const [v0,c0] = ramp[i-1], [v1,c1] = ramp[i]
      const t = (val - v0) / (v1 - v0)
      return [
        Math.round(c0[0]+(c1[0]-c0[0])*t),
        Math.round(c0[1]+(c1[1]-c0[1])*t),
        Math.round(c0[2]+(c1[2]-c0[2])*t),
        Math.round(c0[3]+(c1[3]-c0[3])*t),
      ]
    }
  }
  return ramp[ramp.length-1][1]
}

// ── Component ────────────────────────────────────
export default function GridLayer({ map }) {
  const tileCache = useRef({})
  const prevKey   = useRef('')
  const setupDone = useRef(false)

  useEffect(() => {
    if (!map) return
    console.log('[GridLayer] mounted')

    function setup() {
      if (setupDone.current) return
      console.log('[GridLayer] setup — style loaded')

      try {
        if (map.getSource('grid-source')) { setupDone.current = true; return }
      } catch { /* style not ready */ }

      // Don't create source until we have real data — placeholder URLs
      // (data: and blob:) cause MapLibre fetch errors
      setupDone.current = true
      console.log('[GridLayer] ready (deferred source creation)')
      renderGrid()
    }

    // ChaserMap only renders us when ready=true (after map 'load' event)
    // So style IS loaded — just call setup directly
    try { setup() } catch(e) {
      console.warn('[GridLayer] setup deferred:', e.message)
      // Retry once on next frame if style wasn't quite ready
      requestAnimationFrame(() => { try { setup() } catch(e2) { console.error('[GridLayer] setup failed:', e2) } })
    }

    // Subscribe to store changes (layer, hour, model, and opacity/visibility)
    const unsub = useMapStore.subscribe(
      (s) => {
        const al = s.activeLayers.find(l => l.id === s.layer)
        return `${s.layer}|${s.hour}|${s.primaryModel}|${al?.visible}|${al?.opacity}`
      },
      () => renderGrid()
    )

    async function renderGrid() {
      const { layer, hour, primaryModel, activeLayers } = useMapStore.getState()

      // Always sync visibility + opacity (if layer exists)
      const toggle = activeLayers.find(l => l.id === layer)
      const visible = toggle?.visible !== false

      try {
        if (map.getLayer && map.getLayer('grid-layer')) {
          map.setLayoutProperty('grid-layer', 'visibility', visible ? 'visible' : 'none')
          map.setPaintProperty('grid-layer', 'raster-opacity', toggle?.opacity ?? 0.7)
        }
      } catch {}

      if (!visible) return

      const variable = LAYER_VAR[layer]
      if (!variable) {
        // Not a grid layer (radar/sst/track) — hide grid
        try { if (map.style && map.getLayer('grid-layer')) map.setLayoutProperty('grid-layer', 'visibility', 'none') } catch {}
        return
      }

      const tileModel = MODEL_TILE[primaryModel] ?? 'gfs'
      const fh = String(nearestFH(hour)).padStart(3, '0')
      const cacheKey = `${tileModel}/${variable}_f${fh}`

      if (cacheKey === prevKey.current) return // same tile, nothing to fetch
      prevKey.current = cacheKey

      console.log('[GridLayer] loading', cacheKey)

      // Check cache
      let tile = tileCache.current[cacheKey]
      if (!tile) {
        tile = await fetchTile(tileModel, variable, fh)
        if (tile) tileCache.current[cacheKey] = tile
      }

      if (!tile) {
        console.log('[GridLayer] ❌ no tile for', cacheKey)
        return
      }

      console.log('[GridLayer] ✅ loaded', cacheKey, '—', tile.data.u?.length || tile.data.values?.length, 'points')

      // Render to canvas → data URL → update image source
      const dataUrl = renderToDataUrl(tile, variable)

      try {
        const src = map.getSource('grid-source')
        if (src) {
          // Source exists — just update
          src.updateImage({ url: dataUrl, coordinates: [[-180, 85.05], [180, 85.05], [180, -85.05], [-180, -85.05]] })
        } else {
          // First data load — create source + layer now
          map.addSource('grid-source', {
            type: 'image',
            url: dataUrl,
            coordinates: [[-180, 85.05], [180, 85.05], [180, -85.05], [-180, -85.05]]
          })
          map.addLayer({
            id: 'grid-layer',
            type: 'raster',
            source: 'grid-source',
            paint: { 'raster-opacity': toggle?.opacity ?? 0.7, 'raster-fade-duration': 0 }
          })
        }
        console.log('[GridLayer] 🎨 rendered', cacheKey)
      } catch (e) {
        console.warn('[GridLayer] update failed:', e.message)
      }
    }

    return () => {
      unsub()
      setupDone.current = false
      prevKey.current = ''
      try {
        if (map.style && map.getLayer('grid-layer')) map.removeLayer('grid-layer')
        if (map.style && map.getSource('grid-source')) map.removeSource('grid-source')
      } catch {}
    }
  }, [map])

  return null
}

// ── Tile fetch ───────────────────────────────────
async function fetchTile(model, variable, fhStr) {
  // Try /tiles/latest/:model first
  try {
    const lr = await fetch(`${API}/tiles/latest/${model}`)
    if (lr.ok) {
      const latest = await lr.json()
      if (latest.available) {
        const r = await fetch(`${API}/tiles/${model}/${latest.date}/${latest.cycle}/${variable}_f${fhStr}.json`)
        if (r.ok) return await r.json()
      }
    }
  } catch {}

  // Fallback: try today's cycles
  try {
    const date = new Date().toISOString().slice(0,10).replace(/-/g,'')
    const cycles = model === 'ecmwf' ? ['12z','00z'] : ['18z','12z','06z','00z']
    for (const c of cycles) {
      const r = await fetch(`${API}/tiles/${model}/${date}/${c}/${variable}_f${fhStr}.json`)
      if (r.ok) return await r.json()
    }
  } catch {}

  return null
}

// ── Canvas render ────────────────────────────────
function renderToDataUrl(tile, variable) {
  const { grid, data } = tile
  const { nlat, nlon } = grid
  const canvas = document.createElement('canvas')
  canvas.width = nlon    // 360
  canvas.height = nlat   // 181
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(nlon, nlat)
  const px = imgData.data

  const half = Math.floor(nlon / 2) // 180 — shift lon 0→359 to -180→179

  if (variable === 'wind_10m' && data.u && data.v) {
    for (let r = 0; r < nlat; r++) {
      for (let c = 0; c < nlon; c++) {
        const si = r * nlon + ((c + half) % nlon)
        const u = data.u[si] || 0, v = data.v[si] || 0
        const spd = Math.sqrt(u*u + v*v) * 1.94384
        const [cr,cg,cb,ca] = lerp(WIND_RAMP, spd)
        const p = (r * nlon + c) * 4
        px[p]=cr; px[p+1]=cg; px[p+2]=cb; px[p+3]=ca
      }
    }
  } else if (data.values) {
    const ramp = RAMPS[variable]
    if (!ramp) { ctx.putImageData(imgData, 0, 0); return canvas.toDataURL('image/png') }

    let vals = data.values
    if (variable === 'temp_2m') vals = vals.map(v => v != null ? v - 273.15 : null)
    if (variable === 'mslp') vals = vals.map(v => v != null ? v / 100 : null)

    for (let r = 0; r < nlat; r++) {
      for (let c = 0; c < nlon; c++) {
        const si = r * nlon + ((c + half) % nlon)
        const val = vals[si]
        if (val == null) continue
        const [cr,cg,cb,ca] = lerp(ramp, val)
        const p = (r * nlon + c) * 4
        px[p]=cr; px[p+1]=cg; px[p+2]=cb; px[p+3]=ca
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)
  return canvas.toDataURL('image/png')
}
