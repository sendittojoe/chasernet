import { useEffect, useRef } from 'react'
import { useMapStore, ALL_MODELS } from '../../stores/mapStore.js'

const SRC_PREFIX  = 'track-src-'
const LINE_PREFIX = 'track-line-'
const DOT_PREFIX  = 'track-dot-'

/**
 * TrackLayer — renders model forecast tracks on the MapLibre map.
 * Only runs when track-relevant state changes.
 */
export default function TrackLayer({ map }) {
  const drawnRef = useRef(new Set())

  useEffect(() => {
    if (!map) return

    // Only subscribe to state that matters for tracks
    const unsub = useMapStore.subscribe(
      state => ({
        modelData:    state.modelData,
        activeModels: state.activeModels,
        primaryModel: state.primaryModel,
        trackVisible: state.activeLayers.find(l => l.id === 'track')?.visible ?? false,
        trackOpacity: state.activeLayers.find(l => l.id === 'track')?.opacity ?? 0.85,
        hour:         state.hour,
      }),
      (curr, prev) => {
        // Only render if something track-relevant actually changed
        if (
          curr.modelData    !== prev.modelData ||
          curr.activeModels !== prev.activeModels ||
          curr.primaryModel !== prev.primaryModel ||
          curr.trackVisible !== prev.trackVisible ||
          curr.trackOpacity !== prev.trackOpacity ||
          curr.hour         !== prev.hour
        ) {
          safeRender(map, drawnRef)
        }
      },
    )

    // Initial render
    safeRender(map, drawnRef)

    return () => {
      unsub()
      cleanup(map, drawnRef)
    }
  }, [map])

  return null
}

const LABEL_HOURS = [0, 12, 24, 48, 72, 96, 120, 144, 168]

function safeRender(map, drawnRef) {
  try {
    if (!map || !map.getStyle || !map.getStyle()) return
    render(map, drawnRef)
  } catch (e) {
    // Silently ignore — map style may not be fully loaded yet
  }
}

function render(map, drawnRef) {
  const { modelData, activeModels, primaryModel, activeLayers, hour } =
    useMapStore.getState()

  const trackLayer = activeLayers.find(l => l.id === 'track')
  const visible    = trackLayer?.visible ?? false
  const opacity    = trackLayer?.opacity ?? 0.85

  // Clean up old layers
  for (const id of drawnRef.current) {
    const modelId = id.replace(SRC_PREFIX, '')
    if (!activeModels.includes(modelId) || !modelData?.[modelId]?.track) {
      removeModel(map, modelId)
      drawnRef.current.delete(id)
    }
  }

  // If track layer isn't visible and nothing is drawn, bail early
  if (!visible && drawnRef.current.size === 0) return

  for (const modelId of activeModels) {
    const track = modelData?.[modelId]?.track
    if (!track || track.length < 2) continue

    const def       = ALL_MODELS.find(m => m.id === modelId)
    const color     = def?.color ?? '#38BDF8'
    const isPrimary = modelId === primaryModel

    const srcId  = SRC_PREFIX  + modelId
    const lineId = LINE_PREFIX + modelId
    const dotId  = DOT_PREFIX  + modelId

    // Build GeoJSON
    const coordinates = track.map(([, lat, lon]) => [lon, lat])
    const lineGeoJSON = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
    }

    const dotFeatures = track
      .filter(([h]) => LABEL_HOURS.includes(h))
      .map(([h, lat, lon]) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          hour:      h,
          label:     h === 0 ? '●' : `${h}h`,
          isPrimary: isPrimary,
          isNow:     h <= hour && h + 6 > hour,
        },
      }))

    // Current position interpolation
    const currentIdx = track.findIndex(([h]) => h >= hour)
    if (currentIdx >= 1) {
      const [h0, lat0, lon0] = track[currentIdx - 1]
      const [h1, lat1, lon1] = track[currentIdx]
      const t = (hour - h0) / (h1 - h0 || 1)
      dotFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon0 + (lon1 - lon0) * t, lat0 + (lat1 - lat0) * t] },
        properties: { hour, label: `▶${hour}h`, isPrimary, isNow: true },
      })
    }

    const dotsGeoJSON = { type: 'FeatureCollection', features: dotFeatures }

    // Add or update
    if (map.getSource(srcId)) {
      map.getSource(srcId).setData(lineGeoJSON)
      if (map.getSource(srcId + '-dots')) {
        map.getSource(srcId + '-dots').setData(dotsGeoJSON)
      }
    } else {
      map.addSource(srcId, { type: 'geojson', data: lineGeoJSON })
      map.addLayer({
        id: lineId,
        type: 'line',
        source: srcId,
        paint: {
          'line-color':     color,
          'line-width':     isPrimary ? 3 : 1.5,
          'line-opacity':   opacity,
          'line-dasharray': isPrimary ? [1] : [4, 3],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })

      map.addSource(srcId + '-dots', { type: 'geojson', data: dotsGeoJSON })
      map.addLayer({
        id: dotId,
        type: 'circle',
        source: srcId + '-dots',
        paint: {
          'circle-radius':       ['case', ['get', 'isNow'], 6, isPrimary ? 4 : 3],
          'circle-color':        color,
          'circle-opacity':      opacity,
          'circle-stroke-width': ['case', ['get', 'isNow'], 2, 1],
          'circle-stroke-color': '#0A0E14',
        },
      })

      // Symbol layer for hour labels — use Open Sans (available in OpenFreeMap/Liberty style)
      map.addLayer({
        id: dotId + '-label',
        type: 'symbol',
        source: srcId + '-dots',
        filter: ['==', ['get', 'isPrimary'], true],
        layout: {
          'text-field':  ['get', 'label'],
          'text-font':   ['Open Sans Bold'],
          'text-size':   10,
          'text-offset': [0, -1.4],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color':      color,
          'text-halo-color': '#0A0E14',
          'text-halo-width': 1.5,
          'text-opacity':    opacity,
        },
      })

      drawnRef.current.add(srcId)
    }

    // Update visibility/paint
    if (map.getLayer(lineId)) {
      map.setPaintProperty(lineId, 'line-width', isPrimary ? 3 : 1.5)
      map.setPaintProperty(lineId, 'line-opacity', opacity)
      map.setLayoutProperty(lineId, 'visibility', visible ? 'visible' : 'none')
      map.setPaintProperty(lineId, 'line-dasharray', isPrimary ? [1] : [4, 3])
    }
    if (map.getLayer(dotId)) {
      map.setPaintProperty(dotId, 'circle-opacity', opacity)
      map.setLayoutProperty(dotId, 'visibility', visible ? 'visible' : 'none')
    }
    if (map.getLayer(dotId + '-label')) {
      map.setPaintProperty(dotId + '-label', 'text-opacity', opacity)
      map.setLayoutProperty(dotId + '-label', 'visibility', visible ? 'visible' : 'none')
    }
  }
}

function removeModel(map, modelId) {
  try {
    const lineId = LINE_PREFIX + modelId
    const dotId  = DOT_PREFIX  + modelId
    const srcId  = SRC_PREFIX  + modelId
    if (map.getLayer(dotId + '-label')) map.removeLayer(dotId + '-label')
    if (map.getLayer(dotId))           map.removeLayer(dotId)
    if (map.getLayer(lineId))          map.removeLayer(lineId)
    if (map.getSource(srcId + '-dots')) map.removeSource(srcId + '-dots')
    if (map.getSource(srcId))          map.removeSource(srcId)
  } catch {}
}

function cleanup(map, drawnRef) {
  for (const srcId of drawnRef.current) {
    removeModel(map, srcId.replace(SRC_PREFIX, ''))
  }
  drawnRef.current.clear()
}
