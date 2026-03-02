import { useEffect } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

const SOURCE_ID = 'noaa-sst'
const LAYER_ID  = 'noaa-sst-layer'

// NOAA CoastWatch SST tiles (GOES/OSTIA composite)
// These are freely available WMS tiles served as raster
const SST_TILE_URL =
  'https://coastwatch.pfeg.noaa.gov/erddap/wms/jplMURSST41/request?' +
  'service=WMS&version=1.1.1&request=GetMap&layers=jplMURSST41:analysed_sst' +
  '&styles=&crs=EPSG:3857&format=image/png&transparent=true' +
  '&width=256&height=256&bbox={bbox-epsg-3857}'

/**
 * Adds NOAA SST (Sea Surface Temperature) tiles to the MapLibre map.
 * Uses ERDDAP WMS endpoint for global SST data.
 */
export default function SSTLayer({ map }) {

  useEffect(() => {
    if (!map) return

    function addSST() {
      if (map.getSource(SOURCE_ID)) return

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

    if (map.isStyleLoaded()) {
      addSST()
    } else {
      map.once('load', addSST)
    }

    return () => {
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

  return null
}

function syncVisibility(map) {
  if (!map.getLayer(LAYER_ID)) return
  const layers = useMapStore.getState().activeLayers
  const sst    = layers.find(l => l.id === 'sst')
  const visible = sst?.visible ?? false
  const opacity = sst?.opacity ?? 0.6

  map.setLayoutProperty(LAYER_ID, 'visibility', visible ? 'visible' : 'none')
  map.setPaintProperty(LAYER_ID, 'raster-opacity', opacity)
}
