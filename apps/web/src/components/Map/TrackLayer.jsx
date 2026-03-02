import { useEffect, useRef } from 'react'
import { useMapStore, ALL_MODELS } from '../../stores/mapStore.js'

const SRC_PREFIX  = 'track-src-'
const LINE_PREFIX = 'track-line-'
const DOT_PREFIX  = 'track-dot-'

/**
 * TrackLayer — renders model forecast tracks on the MapLibre map.
 *
 * Reads track arrays from mapStore.modelData[modelId].track
 * Each track is [[hour, lat, lon], ...] built by useWeatherData.
 *
 * - Primary model: solid thick line + hour-labeled dots
 * - Other active models: thinner dashed lines (spaghetti-style)
 * - Syncs visibility/opacity with the 'track' layer toggle in store
 */
export default function TrackLayer({ map }) {
  const drawnRef = useRef(new Set())

  // ── Draw/update tracks whenever model data or active models change ──
  useEffect(() => {
    if (!map) return

    const unsub = useMapStore.subscribe(
      state => ({
        modelData:    state.modelData,
        activeModels: state.activeModels,
        primaryModel: state.primaryModel,
        activeLayers: state.activeLayers,
        hour:         state.hour,
      }),
      () => render(map, drawnRef),
    )

    // Initial render
    const tryRender = () => {
      if (map.isStyleLoaded()) {
        render(map, drawnRef)
      } else {
        map.once('load', () => render(map, drawnRef))
      }
    }
    tryRender()

    return () => {
      unsub()
      cleanup(map, drawnRef)
    }
  }, [map])

  return null
}

// ── Hour markers to label on the track ──
const LABEL_HOURS = [0, 12, 24, 48, 72, 96, 120, 144, 168]

function render(map, drawnRef) {
  const { modelData, activeModels, primaryModel, activeLayers, hour } =
    useMapStore.getState()

  const trackLayer = activeLayers.find(l => l.id === 'track')
  const visible    = trackLayer?.visible ?? false
  const opacity    = trackLayer?.opacity ?? 0.85

  // Clean up old layers that are no longer active
  for (const id of drawnRef.current) {
    const modelId = id.replace(SRC_PREFIX, '')
    if (!activeModels.includes(modelId) || !modelData?.[modelId]?.track) {
      removeModel(map, modelId)
      drawnRef.current.delete(id)
    }
  }

  // Draw each active model's track
  for (const modelId of activeModels) {
    const track = modelData?.[modelId]?.track
    if (!track || track.length < 2) continue

    const def       = ALL_MODELS.find(m => m.id === modelId)
    const color     = def?.color ?? '#38BDF8'
    const isPrimary = modelId === primaryModel

    const srcId  = SRC_PREFIX  + modelId
    const lineId = LINE_PREFIX + modelId
    const dotId  = DOT_PREFIX  + modelId

    // Build GeoJSON line
    const coordinates = track.map(([, lat, lon]) => [lon, lat])
    const lineGeoJSON = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
    }

    // Build GeoJSON dots at label hours
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

    // Current position marker (interpolated)
    const currentIdx = track.findIndex(([h]) => h >= hour)
    if (currentIdx >= 1) {
      const [h0, lat0, lon0] = track[currentIdx - 1]
      const [h1, lat1, lon1] = track[currentIdx]
      const t = (hour - h0) / (h1 - h0 || 1)
      const cLat = lat0 + (lat1 - lat0) * t
      const cLon = lon0 + (lon1 - lon0) * t
      dotFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [cLon, cLat] },
        properties: { hour, label: `▶${hour}h`, isPrimary, isNow: true },
      })
    }

    const dotsGeoJSON = { type: 'FeatureCollection', features: dotFeatures }

    // ── Add or update source + layers ──
    if (map.getSource(srcId)) {
      // Update existing
      map.getSource(srcId).setData(lineGeoJSON)
      map.getSource(srcId + '-dots').setData(dotsGeoJSON)
    } else {
      // Line source + layer
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

      // Dots source + layers
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

    // Update paint properties for primary/non-primary changes
    if (map.getLayer(lineId)) {
      map.setPaintProperty(lineId, 'line-width', isPrimary ? 3 : 1.5)
      map.setPaintProperty(lineId, 'line-opacity', opacity)
      map.setLayoutProperty(lineId, 'visibility', visible ? 'visible' : 'none')

      // Dasharray can't be updated dynamically with expressions, so set it
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
  const lineId = LINE_PREFIX + modelId
  const dotId  = DOT_PREFIX  + modelId
  const srcId  = SRC_PREFIX  + modelId

  if (map.getLayer(dotId + '-label')) map.removeLayer(dotId + '-label')
  if (map.getLayer(dotId))           map.removeLayer(dotId)
  if (map.getLayer(lineId))          map.removeLayer(lineId)
  if (map.getSource(srcId + '-dots')) map.removeSource(srcId + '-dots')
  if (map.getSource(srcId))          map.removeSource(srcId)
}

function cleanup(map, drawnRef) {
  for (const srcId of drawnRef.current) {
    const modelId = srcId.replace(SRC_PREFIX, '')
    removeModel(map, modelId)
  }
  drawnRef.current.clear()
}
