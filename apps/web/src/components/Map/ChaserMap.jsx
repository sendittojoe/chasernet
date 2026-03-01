import { useEffect, useRef, useState } from 'react'
import maplibregl               from 'maplibre-gl'
import { useMapStore }          from '../../stores/mapStore.js'
import { useRoomStore }         from '../../stores/roomStore.js'
import { useWeatherData }       from '../../hooks/useWeatherData.js'
import { useDisagreement }      from '../../hooks/useDisagreement.js'
import DisagreementIndex        from './DisagreementIndex.jsx'
import WeatherCanvas            from './WeatherCanvas.jsx'
import TimelineScrubber         from './TimelineScrubber.jsx'
import MapQuickToggles          from './MapQuickToggles.jsx'

/**
 * ChaserMap — the always-visible map surface.
 *
 * MapLibre GL JS renders the base map.
 * WeatherCanvas draws all weather overlays on a <canvas> on top.
 * DisagreementIndex lives in the header bar.
 * TimelineScrubber lives at the bottom of the map.
 */
export default function ChaserMap() {
  const mapRef    = useRef(null)
  const mapObj    = useRef(null)
  const [ready, setReady] = useState(false)

  const { activeRoom, getRoom } = useRoomStore()
  const room = getRoom(activeRoom)

  // Fetch real weather data whenever model or room changes
  useWeatherData()

  // Initialize MapLibre
  useEffect(() => {
    if (mapObj.current) return

    mapObj.current = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLE,
      center:    [room?.lon ?? -104.8, room?.lat ?? 16.2],
      zoom:      4.2,
      minZoom:   2,
      maxZoom:   12,
      attributionControl: false,
      pitchWithRotate:    false,
      dragRotate:         false,
    })

    mapObj.current.on('load', () => setReady(true))

    return () => {
      mapObj.current?.remove()
      mapObj.current = null
    }
  }, [])

  // Fly to active room when it changes
  useEffect(() => {
    if (!mapObj.current || !room) return
    mapObj.current.flyTo({
      center: [room.lon, room.lat],
      zoom:   4.5,
      speed:  0.8,
      curve:  1.4,
    })
  }, [activeRoom])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* Header bar — Disagreement Index + quick toggles */}
      <div style={{
        height: 44, background: 'var(--panel)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, flexShrink: 0,
      }}>
        {room ? (
          <>
            {/* Storm identity */}
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--red)',animation:'pulse 2s infinite' }}/>
              <span style={{ fontWeight:700, color:'var(--red)', fontSize:12, fontFamily:'var(--mono)' }}>
                {room.name}
              </span>
              <span style={{ color:'var(--t3)', fontSize:11 }}>·</span>
              <span style={{ color:'var(--t2)', fontSize:11 }}>
                {room.category} · {room.wind}kt · {room.pressure}mb
              </span>
            </div>

            <div style={{ width:1, height:18, background:'var(--border)' }}/>

            {/* Disagreement Index */}
            <DisagreementIndex />

            <div style={{ flex:1 }}/>

            {/* Quick toggles */}
            <MapQuickToggles />
          </>
        ) : (
          <span style={{ color:'var(--t2)', fontSize:12, fontFamily:'var(--mono)' }}>
            ⚡ ChaserNet — Select a storm room
          </span>
        )}
      </div>

      {/* Map canvas area */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <div ref={mapRef} style={{ position:'absolute', inset:0 }} />

        {/* Weather canvas overlay — drawn on top of the map */}
        {ready && <WeatherCanvas map={mapObj.current} />}

        {/* Timeline scrubber at the bottom */}
        {room && <TimelineScrubber />}
      </div>
    </div>
  )
}

/* ── Dark ocean map style ────────────────────── */
const MAP_STYLE = {
  version: 8,
  glyphs:  'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type:      'raster',
      tiles:     ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize:  256,
    },
  },
  layers: [
    {
      id:   'background',
      type: 'background',
      paint: { 'background-color': '#06080E' },
    },
    {
      id:     'osm-tiles',
      type:   'raster',
      source: 'osm',
      paint: {
        'raster-opacity':        0.16,
        'raster-brightness-min': 0,
        'raster-brightness-max': 0.18,
        'raster-contrast':       0.05,
        'raster-saturation':     -1,
        'raster-hue-rotate':     200,
      },
    },
  ],
}
