import { useEffect, useRef } from 'react'

const ALERT_COLORS = {
  'Tornado Warning':         '#FF0000',
  'Tornado Watch':           '#FFFF00',
  'Severe Thunderstorm Warning': '#FFA500',
  'Severe Thunderstorm Watch':   '#DB7093',
  'Flash Flood Warning':     '#8B0000',
  'Flash Flood Watch':       '#2E8B57',
  'Hurricane Warning':       '#DC143C',
  'Hurricane Watch':         '#FF69B4',
  'Tropical Storm Warning':  '#B22222',
  'Tropical Storm Watch':    '#F08080',
  'Winter Storm Warning':    '#FF69B4',
  'Blizzard Warning':        '#FF4500',
  'Special Weather Statement': '#FFE4B5',
}

const DEFAULT_COLOR = '#4FC3F7'
const SOURCE_ID     = 'nws-alerts'
const LAYER_FILL    = 'nws-alerts-fill'
const LAYER_LINE    = 'nws-alerts-line'
const LAYER_LABEL   = 'nws-alerts-label'

export default function NWSAlertsLayer({ map, ready, enabled }) {
  const popupRef  = useRef(null)
  const timerRef  = useRef(null)
  const fetchedAt = useRef(0)

  useEffect(() => {
    if (!map || !ready) return

    async function loadAlerts() {
      if (Date.now() - fetchedAt.current < 5 * 60 * 1000) return // 5 min cache
      try {
        const res  = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert', {
          headers: { 'Accept': 'application/geo+json' }
        })
        if (!res.ok) return
        const geojson = await res.json()
        fetchedAt.current = Date.now()

        // Attach color property to each feature
        geojson.features = (geojson.features || []).map(f => {
          const event = f.properties?.event ?? ''
          return {
            ...f,
            properties: {
              ...f.properties,
              _color: ALERT_COLORS[event] ?? DEFAULT_COLOR,
              _label: event,
            }
          }
        })

        if (map.getSource(SOURCE_ID)) {
          map.getSource(SOURCE_ID).setData(geojson)
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })

          map.addLayer({
            id: LAYER_FILL,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
              'fill-color':   ['get', '_color'],
              'fill-opacity': 0.18,
            },
          })

          map.addLayer({
            id: LAYER_LINE,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color':   ['get', '_color'],
              'line-width':   1.5,
              'line-opacity': 0.85,
            },
          })
        }
      } catch (e) {
        console.warn('NWS alerts fetch failed:', e)
      }
    }

    function addPopup(e) {
      const props = e.features?.[0]?.properties
      if (!props) return
      if (popupRef.current) popupRef.current.remove()

      const { maplibregl } = window
      if (!maplibregl) return

      const onset    = props.onset    ? new Date(props.onset).toLocaleString()    : '—'
      const expires  = props.expires  ? new Date(props.expires).toLocaleString()  : '—'
      const headline = props.headline ?? props.description?.slice(0, 160) ?? ''

      const el = document.createElement('div')
      el.innerHTML = `
        <div style="font-family:monospace;font-size:12px;max-width:280px;line-height:1.5">
          <div style="font-weight:800;color:${props._color};font-size:13px;margin-bottom:6px">
            ${props._label}
          </div>
          <div style="color:#ccc;margin-bottom:4px">${props.areaDesc ?? ''}</div>
          <div style="color:#aaa;font-size:11px">Onset: ${onset}</div>
          <div style="color:#aaa;font-size:11px">Expires: ${expires}</div>
          ${headline ? `<div style="color:#ddd;margin-top:8px;font-size:11px">${headline}</div>` : ''}
        </div>
      `

      const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
        .setLngLat(e.lngLat)
        .setDOMContent(el)
        .addTo(map)

      popupRef.current = popup
    }

    if (enabled) {
      loadAlerts()
      timerRef.current = setInterval(loadAlerts, 5 * 60 * 1000)
      map.on('click', LAYER_FILL, addPopup)
      map.on('mouseenter', LAYER_FILL, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', LAYER_FILL, () => { map.getCanvas().style.cursor = '' })
    }

    return () => {
      clearInterval(timerRef.current)
      if (popupRef.current) popupRef.current.remove()
      try {
        map.off('click', LAYER_FILL, addPopup)
        if (map.getLayer(LAYER_FILL))  map.removeLayer(LAYER_FILL)
        if (map.getLayer(LAYER_LINE))  map.removeLayer(LAYER_LINE)
        if (map.getLayer(LAYER_LABEL)) map.removeLayer(LAYER_LABEL)
        if (map.getSource(SOURCE_ID))  map.removeSource(SOURCE_ID)
      } catch(_) {}
    }
  }, [map, ready, enabled])

  return null
}
