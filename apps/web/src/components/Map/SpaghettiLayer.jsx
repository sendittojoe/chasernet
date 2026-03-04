import { useEffect, useRef, useState } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

const API = import.meta.env.VITE_API_BASE ?? 'https://api.chasernet.com'

/**
 * SpaghettiLayer — renders GEFS ensemble members as contour lines on the map.
 * 
 * Each member gets a thin line in a slightly different hue.
 * Ensemble mean gets a thick white line.
 * ±1σ spread shown as a shaded band.
 * 
 * Toggle individual members, show clusters, or just mean+spread.
 */
export default function SpaghettiLayer({ map }) {
  const [ensData, setEnsData] = useState(null)
  const [mode, setMode] = useState('all') // 'all' | 'mean' | 'clusters'
  const [visibleMembers, setVisibleMembers] = useState(new Set())
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  const { spaghettiEnabled, layer, hour, primaryModel } = useMapStore()

  // Fetch ensemble data when enabled
  useEffect(() => {
    if (!spaghettiEnabled) { setEnsData(null); return }

    const FHOURS = [0,6,12,24,48,72,96,120,144,168]
    const fh = FHOURS.reduce((best, f) =>
      Math.abs(f - hour) < Math.abs(best - hour) ? f : best, 0
    )
    const fhStr = String(fh).padStart(3, '0')

    const LAYER_VAR = { wind: 'wind_10m', temp: 'temp_2m', precip: 'precip',
      mslp: 'mslp', cape: 'cape', '500mb': 'hgt_500' }
    const variable = LAYER_VAR[layer] ?? 'hgt_500'

    async function loadEnsemble() {
      try {
        const now = new Date()
        for (let d = 0; d < 2; d++) {
          const dt = new Date(now - d * 86400000).toISOString().slice(0,10).replace(/-/g,'')
          for (const c of ['12z', '06z', '00z']) {
            const r = await fetch(`${API}/tiles/gefs/${dt}/${c}/${variable}_ens_f${fhStr}.json`)
            if (r.ok) {
              const data = await r.json()
              setEnsData(data)
              // Default: all members visible
              setVisibleMembers(new Set(data.members.map(m => m.id)))
              console.log(`[Spaghetti] loaded ${data.members.length} members for ${variable} f${fhStr}`)
              return
            }
          }
        }
        console.log('[Spaghetti] no ensemble data found')
        setEnsData(null)
      } catch (e) {
        console.warn('[Spaghetti] fetch error:', e)
      }
    }

    loadEnsemble()
  }, [spaghettiEnabled, layer, hour])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      if (!canvas.parentElement) return
      canvas.width = canvas.parentElement.offsetWidth
      canvas.height = canvas.parentElement.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  // Render spaghetti lines
  useEffect(() => {
    cancelAnimationFrame(animRef.current)
    const canvas = canvasRef.current
    if (!canvas || !map || !ensData || !spaghettiEnabled) {
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    function draw() {
      const W = canvas.width, H = canvas.height
      if (!W || !H) return
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)

      const { grid, members, mean, spread } = ensData
      if (!grid || !members?.length) return

      const bounds = map.getBounds()
      const nw = bounds.getNorthWest()
      const se = bounds.getSouthEast()

      // Map lat/lon to pixel
      function toPixel(lat, lon) {
        const pt = map.project([lon, lat])
        return [pt.x, pt.y]
      }

      // Choose contour value based on layer
      const LAYER_VAR = { wind: 'wind_10m', temp: 'temp_2m', '500mb': 'hgt_500', mslp: 'mslp' }
      const variable = LAYER_VAR[layer] ?? 'hgt_500'

      // Contour levels
      const CONTOURS = {
        hgt_500: [5220, 5340, 5460, 5580, 5700, 5820],
        mslp: [980, 992, 1000, 1008, 1013, 1020, 1032],
        temp_2m: [263, 273, 283, 293, 303],
      }
      const levels = CONTOURS[variable] ?? [5460, 5580]

      // For each member, draw contour lines
      const memberColors = generateColors(members.length)

      if (mode === 'all' || mode === 'clusters') {
        members.forEach((member, mi) => {
          if (!visibleMembers.has(member.id)) return

          ctx.strokeStyle = memberColors[mi]
          ctx.lineWidth = 0.8
          ctx.globalAlpha = 0.5

          for (const level of levels) {
            drawContour(ctx, member.values, grid, level, toPixel, nw, se)
          }
        })
      }

      // Mean (thick white)
      if (mean?.length) {
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2.5
        ctx.globalAlpha = 0.9

        for (const level of levels) {
          drawContour(ctx, mean, grid, level, toPixel, nw, se)
        }
      }

      // Spread shading (±1σ)
      if (spread?.length && mode !== 'clusters') {
        ctx.globalAlpha = 0.15
        ctx.fillStyle = '#38BDF8'

        // Simple: shade areas where spread > threshold
        const threshold = variable === 'hgt_500' ? 40 : variable === 'mslp' ? 3 : 2
        for (let r = 0; r < grid.nlat; r += 3) {
          for (let c = 0; c < grid.nlon; c += 3) {
            const si = r * grid.nlon + c
            if (spread[si] > threshold) {
              let lat = grid.lat0 + r * grid.dlat
              let lon = grid.lon0 + c * grid.dlon
              if (lon > 180) lon -= 360
              if (lat < se.lat || lat > nw.lat) continue
              if (lon < nw.lng || lon > se.lng) continue
              const [px, py] = toPixel(lat, lon)
              const sz = Math.min(12, Math.max(3, spread[si] / threshold * 4))
              ctx.fillRect(px - sz/2, py - sz/2, sz, sz)
            }
          }
        }
      }

      ctx.globalAlpha = 1
    }

    draw()

    // Redraw on map move
    const redraw = () => { draw() }
    map.on('move', redraw)
    map.on('zoom', redraw)

    return () => {
      map.off('move', redraw)
      map.off('zoom', redraw)
    }
  }, [map, ensData, spaghettiEnabled, mode, visibleMembers, layer])

  if (!spaghettiEnabled) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8 }}
      />
      {/* Ensemble control panel */}
      <div style={{
        position: 'absolute', top: 60, right: 12, zIndex: 25,
        background: 'rgba(6,10,18,0.95)', border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: 10, padding: 12, fontFamily: 'var(--mono)', fontSize: 10,
        color: '#94A3B8', maxHeight: '60vh', overflowY: 'auto', width: 180,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#38BDF8', marginBottom: 8 }}>
          ENSEMBLE ({ensData?.members?.length ?? 0} members)
        </div>

        {/* Mode toggles */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {['all', 'mean', 'clusters'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '4px 0', borderRadius: 4, fontSize: 9, fontWeight: 700,
              border: mode === m ? '1px solid #38BDF8' : '1px solid #1E293B',
              background: mode === m ? 'rgba(56,189,248,0.15)' : 'transparent',
              color: mode === m ? '#38BDF8' : '#64748B', cursor: 'pointer',
              fontFamily: 'var(--mono)',
            }}>{m.toUpperCase()}</button>
          ))}
        </div>

        {/* Member toggles */}
        {mode === 'all' && ensData?.members && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {ensData.members.map((m, i) => {
              const colors = generateColors(ensData.members.length)
              const on = visibleMembers.has(m.id)
              return (
                <button key={m.id} onClick={() => {
                  setVisibleMembers(prev => {
                    const next = new Set(prev)
                    if (next.has(m.id)) next.delete(m.id)
                    else next.add(m.id)
                    return next
                  })
                }} style={{
                  width: 28, height: 20, borderRadius: 3, fontSize: 8, fontWeight: 700,
                  border: `1px solid ${on ? colors[i] : '#1E293B'}`,
                  background: on ? `${colors[i]}30` : 'transparent',
                  color: on ? colors[i] : '#475569', cursor: 'pointer',
                  fontFamily: 'var(--mono)',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </button>
              )
            })}
          </div>
        )}

        {/* Stats */}
        {ensData?.meta && (
          <div style={{ marginTop: 8, fontSize: 9, color: '#475569' }}>
            {ensData.meta.date} {ensData.meta.cycle} · f{String(ensData.meta.fhour).padStart(3, '0')}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Simple marching-squares-ish contour drawer.
 * Draws line segments where grid values cross the contour level.
 */
function drawContour(ctx, values, grid, level, toPixel, nw, se) {
  ctx.beginPath()
  const { nlat, nlon, lat0, lon0, dlat, dlon } = grid
  const step = Math.max(1, Math.floor(3 / Math.abs(dlat || 1)))

  for (let r = 0; r < nlat - step; r += step) {
    for (let c = 0; c < nlon - step; c += step) {
      const tl = values[r * nlon + c]
      const tr = values[r * nlon + c + step]
      const bl = values[(r + step) * nlon + c]
      const br = values[(r + step) * nlon + c + step]

      if (tl == null || tr == null || bl == null || br == null) continue

      // Check if contour crosses this cell
      const above = [tl >= level, tr >= level, bl >= level, br >= level]
      const nAbove = above.filter(Boolean).length
      if (nAbove === 0 || nAbove === 4) continue

      const lat1 = lat0 + r * dlat
      const lat2 = lat0 + (r + step) * dlat
      let lon1 = lon0 + c * dlon
      let lon2 = lon0 + (c + step) * dlon
      if (lon1 > 180) lon1 -= 360
      if (lon2 > 180) lon2 -= 360

      // Quick bounds check
      const maxLat = Math.max(lat1, lat2), minLat = Math.min(lat1, lat2)
      if (maxLat < se.lat || minLat > nw.lat) continue

      const midLat = (lat1 + lat2) / 2
      const midLon = (lon1 + lon2) / 2
      const [px, py] = toPixel(midLat, midLon)

      // Just draw a dot where contour crosses (simplified)
      ctx.moveTo(px, py)
      ctx.arc(px, py, 1, 0, Math.PI * 2)
    }
  }
  ctx.stroke()
}

/**
 * Generate N evenly-spaced colors in HSL space.
 */
function generateColors(n) {
  return Array.from({ length: n }, (_, i) => {
    const hue = (i * 360 / n + 200) % 360 // Start from blue-ish
    return `hsl(${hue}, 70%, 60%)`
  })
}
