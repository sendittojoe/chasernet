import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { useMapStore } from '../../stores/mapStore.js'
import GridLayer from './GridLayer.jsx'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

/**
 * SplitView — Two synced MapLibre instances for side-by-side model comparison.
 * 
 * Left pane: modelA (default: primary model)
 * Right pane: modelB (default: second active model)
 * Position, zoom, bearing, pitch all synced bidirectionally.
 * Each pane gets its own GridLayer rendering different model tiles.
 */
export default function SplitView({ parentMap }) {
  const { splitMode, modelA, modelB, setSplitMode, layer, hour } = useMapStore()
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const leftMap = useRef(null)
  const rightMap = useRef(null)
  const syncing = useRef(false)
  const [ready, setReady] = useState({ left: false, right: false })

  // Initialize both maps
  useEffect(() => {
    if (!splitMode) return

    const center = parentMap?.getCenter?.() ?? { lng: -60, lat: 25 }
    const zoom = parentMap?.getZoom?.() ?? 4

    const opts = {
      style: MAP_STYLE,
      center: [center.lng, center.lat],
      zoom,
      attributionControl: false,
    }

    if (leftRef.current && !leftMap.current) {
      leftMap.current = new maplibregl.Map({ container: leftRef.current, ...opts })
      leftMap.current.on('load', () => setReady(r => ({ ...r, left: true })))
    }

    if (rightRef.current && !rightMap.current) {
      rightMap.current = new maplibregl.Map({ container: rightRef.current, ...opts })
      rightMap.current.on('load', () => setReady(r => ({ ...r, right: true })))
    }

    return () => {
      leftMap.current?.remove()
      rightMap.current?.remove()
      leftMap.current = null
      rightMap.current = null
      setReady({ left: false, right: false })
    }
  }, [splitMode])

  // Sync movement between panes
  useEffect(() => {
    if (!leftMap.current || !rightMap.current) return

    function syncTo(target) {
      return () => {
        if (syncing.current) return
        syncing.current = true
        const src = target === 'right' ? leftMap.current : rightMap.current
        const dst = target === 'right' ? rightMap.current : leftMap.current
        dst.jumpTo({
          center: src.getCenter(),
          zoom: src.getZoom(),
          bearing: src.getBearing(),
          pitch: src.getPitch(),
        })
        syncing.current = false
      }
    }

    const syncRight = syncTo('right')
    const syncLeft = syncTo('left')

    leftMap.current.on('move', syncRight)
    rightMap.current.on('move', syncLeft)

    return () => {
      leftMap.current?.off('move', syncRight)
      rightMap.current?.off('move', syncLeft)
    }
  }, [ready.left, ready.right])

  if (!splitMode) return null

  const models = useMapStore.getState()
  const allModels = models.activeModels || []

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', background: '#060A12',
    }}>
      {/* Left pane */}
      <div style={{ flex: 1, position: 'relative', borderRight: '2px solid #1E293B' }}>
        <div ref={leftRef} style={{ width: '100%', height: '100%' }} />
        {ready.left && <SplitGridLayer map={leftMap.current} model={modelA} />}
        <PaneLabel model={modelA} side="left" />
      </div>

      {/* Right pane */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={rightRef} style={{ width: '100%', height: '100%' }} />
        {ready.right && <SplitGridLayer map={rightMap.current} model={modelB} />}
        <PaneLabel model={modelB} side="right" />
      </div>

      {/* Close button */}
      <button
        onClick={() => setSplitMode(false)}
        style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 60, background: 'rgba(6,10,18,0.9)', border: '1px solid #38BDF8',
          color: '#38BDF8', borderRadius: 8, padding: '6px 16px',
          fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        ✕ EXIT SPLIT VIEW
      </button>

      {/* Divider drag handle */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 60, background: '#0F172A', border: '1px solid #334155',
        borderRadius: 20, padding: '8px 4px', display: 'flex', flexDirection: 'column',
        gap: 2,
      }}>
        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#64748B' }} />
        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#64748B' }} />
        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#64748B' }} />
      </div>
    </div>
  )
}

/**
 * SplitGridLayer — renders grid tiles for a specific model override.
 * Wraps the normal GridLayer but forces a specific model.
 */
function SplitGridLayer({ map, model }) {
  // Override the store's primaryModel just for this pane's render
  useEffect(() => {
    if (!map) return

    const API = import.meta.env.VITE_API_BASE ?? 'https://api.chasernet.com'
    const MODEL_TILE = {
      'GFS': 'gfs', 'Euro IFS': 'ecmwf', 'EC-AIFS': 'ecmwf',
      'ICON': 'icon', 'HRRR': 'gfs', 'NAM 3km': 'gfs',
    }
    const LAYER_VAR = {
      wind: 'wind_10m', temp: 'temp_2m', precip: 'precip',
      mslp: 'mslp', cape: 'cape', '500mb': 'hgt_500',
    }
    const FHOURS = [0,3,6,12,18,24,36,48,60,72,84,96,108,120,132,144,156,168]

    // Import color ramp logic from GridLayer
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
          return c0.map((c,j) => Math.round(c + (c1[j] - c) * t))
        }
      }
      return ramp[ramp.length-1][1]
    }

    const placeholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/OEsKGAAAAABJRU5ErkJggg=='

    try { if (map.getSource('split-grid')) return } catch {}

    map.addSource('split-grid', {
      type: 'image', url: placeholder,
      coordinates: [[-180,85.05],[180,85.05],[180,-85.05],[-180,-85.05]]
    })
    map.addLayer({ id: 'split-grid-layer', type: 'raster', source: 'split-grid',
      paint: { 'raster-opacity': 0.7, 'raster-fade-duration': 0 } })

    let prevKey = ''
    const cache = {}

    async function render() {
      const { layer: activeLayer, hour: activeHour } = useMapStore.getState()
      const variable = LAYER_VAR[activeLayer]
      if (!variable) return

      const tileModel = MODEL_TILE[model] ?? 'gfs'
      const fh = String(FHOURS.reduce((best, f) =>
        Math.abs(f - activeHour) < Math.abs(best - activeHour) ? f : best, 0
      )).padStart(3, '0')
      const key = `${tileModel}/${variable}_f${fh}`
      if (key === prevKey) return
      prevKey = key

      let tile = cache[key]
      if (!tile) {
        try {
          // Try today then yesterday
          const now = new Date()
          for (let d = 0; d < 2; d++) {
            const dt = new Date(now - d * 86400000).toISOString().slice(0,10).replace(/-/g,'')
            const cycles = tileModel === 'ecmwf' ? ['12z','00z'] : ['18z','12z','06z','00z']
            for (const c of cycles) {
              const r = await fetch(`${API}/tiles/${tileModel}/${dt}/${c}/${variable}_f${fh}.json`)
              if (r.ok) { tile = await r.json(); cache[key] = tile; break }
            }
            if (tile) break
          }
        } catch {}
      }
      if (!tile) return

      // Render to canvas
      const { grid, data } = tile
      const canvas = document.createElement('canvas')
      canvas.width = grid.nlon; canvas.height = grid.nlat
      const ctx = canvas.getContext('2d')
      const img = ctx.createImageData(grid.nlon, grid.nlat)
      const px = img.data
      const half = Math.floor(grid.nlon / 2)

      if (variable === 'wind_10m' && data.u && data.v) {
        for (let r = 0; r < grid.nlat; r++) {
          for (let c = 0; c < grid.nlon; c++) {
            const si = r * grid.nlon + ((c + half) % grid.nlon)
            const spd = Math.sqrt((data.u[si]||0)**2 + (data.v[si]||0)**2) * 1.94384
            const [cr,cg,cb,ca] = lerp(WIND_RAMP, spd)
            const p = (r * grid.nlon + c) * 4
            px[p]=cr; px[p+1]=cg; px[p+2]=cb; px[p+3]=ca
          }
        }
      } else if (data.values) {
        const ramp = RAMPS[variable]
        if (!ramp) return
        let vals = data.values
        if (variable === 'temp_2m') vals = vals.map(v => v != null ? v - 273.15 : null)
        if (variable === 'mslp') vals = vals.map(v => v != null ? v / 100 : null)
        for (let r = 0; r < grid.nlat; r++) {
          for (let c = 0; c < grid.nlon; c++) {
            const si = r * grid.nlon + ((c + half) % grid.nlon)
            const val = vals[si]; if (val == null) continue
            const [cr,cg,cb,ca] = lerp(ramp, val)
            const p = (r * grid.nlon + c) * 4
            px[p]=cr; px[p+1]=cg; px[p+2]=cb; px[p+3]=ca
          }
        }
      }
      ctx.putImageData(img, 0, 0)

      try {
        const src = map.getSource('split-grid')
        if (src) src.updateImage({
          url: canvas.toDataURL('image/png'),
          coordinates: [[-180,85.05],[180,85.05],[180,-85.05],[-180,-85.05]]
        })
      } catch {}
    }

    render()
    const unsub = useMapStore.subscribe(
      s => `${s.layer}|${s.hour}`,
      () => render()
    )

    return () => {
      unsub()
      try {
        if (map.style && map.getLayer('split-grid-layer')) map.removeLayer('split-grid-layer')
        if (map.style && map.getSource('split-grid')) map.removeSource('split-grid')
      } catch {}
    }
  }, [map, model])

  return null
}

function PaneLabel({ model, side }) {
  const colors = {
    'GFS': '#38BDF8', 'Euro IFS': '#F87171', 'EC-AIFS': '#A78BFA',
    'ICON': '#FBBF24', 'HRRR': '#34D399', 'NAM 3km': '#FB923C',
  }
  return (
    <div style={{
      position: 'absolute', top: 12,
      [side === 'left' ? 'left' : 'right']: 12,
      zIndex: 55, background: 'rgba(6,10,18,0.9)',
      border: `1px solid ${colors[model] ?? '#38BDF8'}40`,
      borderRadius: 8, padding: '6px 14px',
      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
      color: colors[model] ?? '#38BDF8',
    }}>
      {model}
    </div>
  )
}
