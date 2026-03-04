import { useEffect, useRef, useCallback } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json'

/**
 * RadarLayer — simplest possible approach:
 * 1. Fetch RainViewer frames on mount
 * 2. Add all 6 as raster layers
 * 3. Animate through them on an interval
 * 4. Subscribe to store for visibility/opacity
 */
export default function RadarLayer({ map }) {
  const framesRef  = useRef([])
  const indexRef   = useRef(0)
  const timerRef   = useRef(null)
  const readyRef   = useRef(false)

  useEffect(() => {
    if (!map) {
      console.log('[Radar] no map prop')
      return
    }
    console.log('[Radar] mount, styleLoaded=', map.isStyleLoaded?.())

    let dead = false

    async function go() {
      console.log('[Radar] go() called')
      try {
        const res = await fetch(RAINVIEWER_API)
        if (!res.ok) { console.warn('[Radar] API status', res.status); return }
        const json = await res.json()
        const past = json?.radar?.past ?? []
        console.log('[Radar] got', past.length, 'frames')
        if (!past.length || dead) return

        const frames = past.slice(-6)
        framesRef.current = frames

        // Add sources + layers
        frames.forEach((f, i) => {
          const sid = 'rv-s-' + i
          const lid = 'rv-l-' + i
          const tileUrl = `https://tilecache.rainviewer.com${f.path}/256/{z}/{x}/{y}/6/1_1.png`

          // Clean up if they exist from a previous mount
          try { map.getLayer(lid) && map.removeLayer(lid) } catch {}
          try { map.getSource(sid) && map.removeSource(sid) } catch {}

          map.addSource(sid, { type: 'raster', tiles: [tileUrl], tileSize: 256 })
          map.addLayer({
            id: lid,
            type: 'raster',
            source: sid,
            paint: {
              'raster-opacity': i === frames.length - 1 ? 0.65 : 0.01,
              'raster-opacity-transition': { duration: 0 },
            },
          })
        })

        indexRef.current = frames.length - 1
        readyRef.current = true
        console.log('[Radar] layers added, starting animation')

        // Start animation
        timerRef.current = setInterval(() => {
          if (dead || !readyRef.current) return
          const n = framesRef.current.length
          if (!n) return

          // Check store
          const state = useMapStore.getState()
          const entry = state.activeLayers.find(l => l.id === 'radar')
          const vis = entry?.visible ?? false
          const opa = entry?.opacity ?? 0.65

          // Hide current
          try { map.setPaintProperty('rv-l-' + indexRef.current, 'raster-opacity', 0.01) } catch {}

          // Advance
          indexRef.current = (indexRef.current + 1) % n

          // Show next (only if visible)
          if (vis) {
            try { map.setPaintProperty('rv-l-' + indexRef.current, 'raster-opacity', opa) } catch {}
          }
        }, 800)

      } catch (err) {
        console.error('[Radar] error:', err)
      }
    }

    // Style is guaranteed loaded because ChaserMap only renders us after ready=true
    go()

    // Also sync visibility when store changes (e.g. user toggles radar off)
    const unsub = useMapStore.subscribe((state) => {
      if (!readyRef.current) return
      const entry = state.activeLayers.find(l => l.id === 'radar')
      const vis = entry?.visible ?? false
      const opa = entry?.opacity ?? 0.65

      framesRef.current.forEach((_, i) => {
        try {
          if (!vis) {
            map.setPaintProperty('rv-l-' + i, 'raster-opacity', 0.01)
          } else if (i === indexRef.current) {
            map.setPaintProperty('rv-l-' + i, 'raster-opacity', opa)
          }
        } catch {}
      })
    })

    return () => {
      dead = true
      readyRef.current = false
      if (timerRef.current) clearInterval(timerRef.current)
      unsub()
      // Cleanup layers
      for (let i = 0; i < 6; i++) {
        try { map.getLayer('rv-l-' + i) && map.removeLayer('rv-l-' + i) } catch {}
        try { map.getSource('rv-s-' + i) && map.removeSource('rv-s-' + i) } catch {}
      }
    }
  }, [map])

  return null
}
