import { useEffect, useCallback } from 'react'
import { useMapStore } from '../stores/mapStore.js'

/**
 * Syncs map state to/from the URL hash.
 * Format: #lat=25.7&lon=-80.2&zoom=6&model=gfs&layer=wind&hour=24
 */
export function useShareableUrl(mapObj) {
  const { primaryModel, activeLayers, hour, setHour } = useMapStore()

  // Write state to URL hash whenever key things change
  useEffect(() => {
    if (!mapObj?.current) return
    const map = mapObj.current

    function updateHash() {
      const center = map.getCenter()
      const zoom   = map.getZoom().toFixed(1)
      const layer  = activeLayers?.[0] ?? 'wind'
      const params = new URLSearchParams({
        lat:   center.lat.toFixed(4),
        lon:   center.lng.toFixed(4),
        zoom,
        model: primaryModel ?? 'ecmwf',
        layer,
        hour:  String(hour ?? 0),
      })
      window.history.replaceState(null, '', '#' + params.toString())
    }

    map.on('moveend', updateHash)
    updateHash()
    return () => map.off('moveend', updateHash)
  }, [mapObj?.current, primaryModel, activeLayers, hour])

  // Read state from URL hash on first load
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    try {
      const params = new URLSearchParams(hash)
      const h = parseInt(params.get('hour') ?? '0')
      if (!isNaN(h)) setHour(h)
      // lat/lon/zoom applied after map loads in ChaserMap
    } catch(_) {}
  }, [])

  // Copy full URL to clipboard
  const copyShareLink = useCallback(() => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      // Brief visual feedback handled by caller
    })
    return url
  }, [])

  return { copyShareLink }
}

/** Parse lat/lon/zoom from URL hash for initial map position */
export function getInitialViewFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return null
  try {
    const p = new URLSearchParams(hash)
    const lat  = parseFloat(p.get('lat'))
    const lon  = parseFloat(p.get('lon'))
    const zoom = parseFloat(p.get('zoom'))
    if (!isNaN(lat) && !isNaN(lon) && !isNaN(zoom)) {
      return { center: [lon, lat], zoom }
    }
  } catch(_) {}
  return null
}
