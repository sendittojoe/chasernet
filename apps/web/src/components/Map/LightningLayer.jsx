import { useEffect, useRef } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

/**
 * LightningLayer — Real-time lightning strikes from Blitzortung.org
 *
 * Connects to Blitzortung WebSocket for live strike data.
 * Renders animated "bomb ping" circles that expand and fade out.
 * Strikes age from white (fresh) → yellow → red → dark (old).
 */

const WS_SERVERS = [
  'wss://ws1.blitzortung.org:3000',
  'wss://ws7.blitzortung.org:3000',
  'wss://ws8.blitzortung.org:3000',
]

// Max age in ms before a strike is removed
const MAX_AGE = 20 * 60 * 1000 // 20 minutes
const CLEANUP_INTERVAL = 15000

function getStrikeColor(ageMs) {
  const ratio = Math.min(ageMs / MAX_AGE, 1)
  if (ratio < 0.05) return 'rgba(255,255,255,0.95)'  // brand new — white flash
  if (ratio < 0.15) return 'rgba(255,255,100,0.85)'   // very recent — bright yellow
  if (ratio < 0.35) return 'rgba(255,200,50,0.7)'     // recent — gold
  if (ratio < 0.55) return 'rgba(255,140,0,0.55)'     // minutes old — orange
  if (ratio < 0.75) return 'rgba(255,60,60,0.4)'      // older — red
  return 'rgba(180,30,30,0.25)'                        // oldest — dark red
}

export default function LightningLayer({ map }) {
  const wsRef = useRef(null)
  const strikesRef = useRef([]) // { lat, lon, time }
  const sourceAddedRef = useRef(false)
  const animFrameRef = useRef(null)
  const { activeLayers } = useMapStore()
  const layerState = activeLayers.find(l => l.id === 'lightning')
  const visible = layerState?.visible ?? false
  const opacity = layerState?.opacity ?? 0.85

  // Manage WebSocket connection
  useEffect(() => {
    if (!visible) {
      // Disconnect when layer is off
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    function connect() {
      const url = WS_SERVERS[Math.floor(Math.random() * WS_SERVERS.length)]
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        // Subscribe to live strikes — empty filter = global
        ws.send(JSON.stringify({ a: 111 }))
      }

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data)
          if (data.lat !== undefined && data.lon !== undefined) {
            strikesRef.current.push({
              lat: data.lat,
              lon: data.lon,
              time: Date.now(),
            })
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      ws.onerror = () => {
        ws.close()
      }

      ws.onclose = () => {
        // Reconnect after delay if still visible
        if (visible) {
          setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [visible])

  // Cleanup old strikes
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => {
      const cutoff = Date.now() - MAX_AGE
      strikesRef.current = strikesRef.current.filter(s => s.time > cutoff)
    }, CLEANUP_INTERVAL)
    return () => clearInterval(id)
  }, [visible])

  // Render strikes as a GeoJSON source with animated circles
  useEffect(() => {
    if (!map || !visible) return

    const SOURCE_ID = 'lightning-strikes'
    const LAYER_ID = 'lightning-circles'
    const GLOW_LAYER_ID = 'lightning-glow'

    // Ensure source exists
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      sourceAddedRef.current = true
    }

    // Glow layer (outer expanding ring for fresh strikes)
    if (!map.getLayer(GLOW_LAYER_ID)) {
      map.addLayer({
        id: GLOW_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'age'],
            0, 12,
            0.1, 16,
            0.3, 10,
            1, 4,
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['interpolate', ['linear'], ['get', 'age'],
            0, 0.6,
            0.1, 0.3,
            0.5, 0.1,
            1, 0,
          ],
          'circle-blur': 1.0,
        },
      })
    }

    // Core strike dot
    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'age'],
            0, 5,
            0.05, 4,
            0.3, 3,
            1, 2,
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['interpolate', ['linear'], ['get', 'age'],
            0, 1,
            0.5, 0.6,
            1, 0.15,
          ],
        },
      })
    }

    // Animation loop — update features every frame
    function updateFrame() {
      if (!map.getSource(SOURCE_ID)) return

      const now = Date.now()
      const features = strikesRef.current.map(s => {
        const ageMs = now - s.time
        const ageRatio = Math.min(ageMs / MAX_AGE, 1)
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
          properties: {
            age: ageRatio,
            color: getStrikeColor(ageMs),
          },
        }
      })

      map.getSource(SOURCE_ID).setData({
        type: 'FeatureCollection',
        features,
      })

      animFrameRef.current = requestAnimationFrame(updateFrame)
    }

    // Start animation at lower framerate to save CPU
    let lastUpdate = 0
    function throttledUpdate() {
      const now = performance.now()
      if (now - lastUpdate > 500) { // update every 500ms
        lastUpdate = now
        const ts = Date.now()
        const features = strikesRef.current.map(s => {
          const ageMs = ts - s.time
          const ageRatio = Math.min(ageMs / MAX_AGE, 1)
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
            properties: { age: ageRatio, color: getStrikeColor(ageMs) },
          }
        })
        if (map.getSource(SOURCE_ID)) {
          map.getSource(SOURCE_ID).setData({ type: 'FeatureCollection', features })
        }
      }
      animFrameRef.current = requestAnimationFrame(throttledUpdate)
    }

    throttledUpdate()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
        if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch (e) {}
      sourceAddedRef.current = false
    }
  }, [map, visible])

  // Update opacity
  useEffect(() => {
    if (!map) return
    try {
      if (map.getLayer('lightning-circles')) {
        map.setPaintProperty('lightning-circles', 'circle-opacity',
          ['interpolate', ['linear'], ['get', 'age'], 0, opacity, 0.5, opacity * 0.6, 1, opacity * 0.15]
        )
      }
      if (map.getLayer('lightning-glow')) {
        map.setPaintProperty('lightning-glow', 'circle-opacity',
          ['interpolate', ['linear'], ['get', 'age'], 0, opacity * 0.6, 0.1, opacity * 0.3, 0.5, opacity * 0.1, 1, 0]
        )
      }
    } catch (e) {}
  }, [map, opacity])

  return null
}
