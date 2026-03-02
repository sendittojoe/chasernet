import { useEffect, useRef } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json'
const SOURCE_ID = 'rainviewer-radar'
const LAYER_ID  = 'rainviewer-radar-layer'

/**
 * Adds RainViewer radar tiles to the MapLibre map.
 * Fetches latest radar timestamp, adds raster tile layer,
 * and syncs visibility/opacity with mapStore.activeLayers.
 */
export default function RadarLayer({ map }) {
  const tsRef = useRef(null)
  const intervalRef = useRef(null)

  // Add/update radar source + layer
  useEffect(() => {
    if (!map) return

    async function loadRadar() {
      try {
        const res  = await fetch(RAINVIEWER_API)
        const data = await res.json()
        const past = data?.radar?.past ?? []
        if (!past.length) return
        const latest = past[past.length - 1]
        const ts = latest.path  // e.g. "/v2/radar/1709654400"

        // Skip if same timestamp
        if (tsRef.current === ts) return
        tsRef.current = ts

        const tileUrl = `https://tilecache.rainviewer.com${ts}/256/{z}/{x}/{y}/6/1_1.png`

        // Remove old source/layer if exists
        if (map.getLayer(LAYER_ID))  map.removeLayer(LAYER_ID)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)

        map.addSource(SOURCE_ID, {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          attribution: '© RainViewer',
        })

        map.addLayer({
          id: LAYER_ID,
          type: 'raster',
          source: SOURCE_ID,
          paint: { 'raster-opacity': 0.65 },
        })

        // Apply current store state immediately
        syncVisibility(map)
      } catch (err) {
        console.warn('[RadarLayer] Failed to load RainViewer:', err)
      }
    }

    // Wait for map style to be loaded
    if (map.isStyleLoaded()) {
      loadRadar()
    } else {
      map.once('load', loadRadar)
    }

    // Refresh radar every 5 minutes (RainViewer updates every 10min)
    intervalRef.current = setInterval(loadRadar, 5 * 60 * 1000)

    return () => {
      clearInterval(intervalRef.current)
      if (map.getLayer(LAYER_ID))  map.removeLayer(LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map])

  // Subscribe to store changes for visibility/opacity
  useEffect(() => {
    if (!map) return
    const unsub = useMapStore.subscribe(
      state => state.activeLayers,
      () => syncVisibility(map),
    )
    return unsub
  }, [map])

  return null // pure side-effect component
}

function syncVisibility(map) {
  if (!map.getLayer(LAYER_ID)) return
  const layers = useMapStore.getState().activeLayers
  const radar  = layers.find(l => l.id === 'radar')
  const visible = radar?.visible ?? false
  const opacity = radar?.opacity ?? 0.65

  map.setLayoutProperty(LAYER_ID, 'visibility', visible ? 'visible' : 'none')
  map.setPaintProperty(LAYER_ID, 'raster-opacity', opacity)
}
