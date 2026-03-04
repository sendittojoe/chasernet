import { useEffect } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

const SOURCE_ID = 'noaa-sst'
const LAYER_ID  = 'noaa-sst-layer'

// Proxy SST tiles through our API to avoid CORS issues
const API = import.meta.env.VITE_API_BASE ?? 'https://api.chasernet.com'
const SST_TILE_URL = `${API}/proxy/sst?z={z}&x={x}&y={y}`

/**
 * Adds SST (Sea Surface Temperature) tiles to the MapLibre map.
 * Routes through our API proxy to avoid CORS issues with NOAA ERDDAP.
 */
export default function SSTLayer({ map }) {

  useEffect(() => {
    if (!map) return

    function addSST() {
      try {
        if (map.getSource(SOURCE_ID)) return
      } catch { return }

      map.addSource(SOURCE_ID, {
        type: 'raster',
        tiles: [SST_TILE_URL],
        tileSize: 256,
        attribution: '© NOAA CoastWatch',
      })

      map.addLayer({
        id: LAYER_ID,
        type: 'raster',
        source: SOURCE_ID,
        paint: { 'raster-opacity': 0.6 },
      })

      syncVisibility(map)
    }

    // ChaserMap only renders us when ready=true (after map 'load')
    try { addSST() } catch(e) {
      console.warn('[SSTLayer] deferred:', e.message)
      requestAnimationFrame(() => { try { addSST() } catch {} })
    }

    return () => {
      try {
        if (map.style && map.getLayer(LAYER_ID))  map.removeLayer(LAYER_ID)
        if (map.style && map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch {}
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

  return null
}

function syncVisibility(map) {
  try { if (!map.style || !map.getLayer(LAYER_ID)) return } catch { return }
  const layers = useMapStore.getState().activeLayers
  const sst    = layers.find(l => l.id === 'sst')
  const visible = sst?.visible ?? false
  const opacity = sst?.opacity ?? 0.6

  map.setLayoutProperty(LAYER_ID, 'visibility', visible ? 'visible' : 'none')
  map.setPaintProperty(LAYER_ID, 'raster-opacity', opacity)
}
