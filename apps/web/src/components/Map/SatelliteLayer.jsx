import { useEffect, useRef } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

/**
 * SatelliteLayer — GOES-East visible/infrared satellite imagery
 *
 * Uses RainViewer's satellite endpoint (free, global coverage)
 * Combines GOES-East, EUMETSAT, and Himawari data.
 */

const SATELLITE_API = 'https://api.rainviewer.com/public/weather-maps.json'

export default function SatelliteLayer({ map }) {
  const { activeLayers } = useMapStore()
  const layerState = activeLayers.find(l => l.id === 'satellite')
  const visible = layerState?.visible ?? false
  const opacity = layerState?.opacity ?? 0.7
  const sourceRef = useRef(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!map || !visible) return

    const SOURCE_ID = 'satellite-tiles'
    const LAYER_ID = 'satellite-layer'

    async function loadSatellite() {
      try {
        const res = await fetch(SATELLITE_API)
        const data = await res.json()
        const infrared = data.satellite?.infrared
        if (!infrared || infrared.length === 0) return

        // Use the most recent frame
        const latest = infrared[infrared.length - 1]
        const tileUrl = `https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/1/0_0.png`

        if (map.getSource(SOURCE_ID)) {
          // Update tiles URL
          map.removeLayer(LAYER_ID)
          map.removeSource(SOURCE_ID)
        }

        map.addSource(SOURCE_ID, {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
        })

        map.addLayer({
          id: LAYER_ID,
          type: 'raster',
          source: SOURCE_ID,
          paint: {
            'raster-opacity': opacity,
            'raster-fade-duration': 300,
          },
        }, 'building') // Insert below labels

        sourceRef.current = true
      } catch (e) {
        console.warn('[SatelliteLayer] load error:', e.message)
      }
    }

    loadSatellite()
    // Refresh every 10 minutes
    intervalRef.current = setInterval(loadSatellite, 10 * 60 * 1000)

    return () => {
      clearInterval(intervalRef.current)
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch (e) {}
      sourceRef.current = false
    }
  }, [map, visible])

  // Update opacity
  useEffect(() => {
    if (!map) return
    try {
      if (map.getLayer('satellite-layer')) {
        map.setPaintProperty('satellite-layer', 'raster-opacity', opacity)
      }
    } catch (e) {}
  }, [map, opacity])

  return null
}
