import { useEffect, useRef, useState } from 'react'
import maplibregl               from 'maplibre-gl'
import { useMapStore }          from '../../stores/mapStore.js'
import { useRoomStore }         from '../../stores/roomStore.js'
import { useWeatherData }       from '../../hooks/useWeatherData.js'
import { useDisagreement }      from '../../hooks/useDisagreement.js'
import DisagreementIndex        from './DisagreementIndex.jsx'
import WeatherCanvas            from './WeatherCanvas.jsx'
import WeatherLayer             from './WeatherLayer.jsx'
import TimelineScrubber         from './TimelineScrubber.jsx'
import MapQuickToggles          from './MapQuickToggles.jsx'

const MAPTILER_KEY = 'u3sB039ED5sMmJTQH8Ov'

export default function ChaserMap() {
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const [ready, setReady] = useState(false)
  const { activeRoom, getRoom } = useRoomStore()
  const room = getRoom(activeRoom)
  useWeatherData()

  useEffect(() => {
    if (mapObj.current) return
    mapObj.current = new maplibregl.Map({
      container: mapRef.current,
      style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
      center:    [room?.lon ?? -60, room?.lat ?? 20],
      zoom:      3.5, minZoom: 2, maxZoom: 14,
      attributionControl: false, pitchWithRotate: false, dragRotate: false,
    })
    mapObj.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapObj.current.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'nautical' }), 'bottom-right')
    mapObj.current.on('load', () => setReady(true))
    return () => { mapObj.current?.remove(); mapObj.current = null }
  }, [])

  useEffect(() => {
    if (!mapObj.current || !room) return
    mapObj.current.flyTo({ center: [room.lon, room.lat], zoom: 4.5, speed: 0.9, curve: 1.4 })
  }, [activeRoom])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 44, background: 'var(--panel)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, flexShrink: 0 }}>
        {room ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)', animation:'pulse 2s infinite' }}/>
              <span style={{ fontWeight:700, color:'var(--red)', fontSize:12, fontFamily:'var(--mono)' }}>{room.name}</span>
              <span style={{ color:'var(--t3)', fontSize:11 }}>·</span>
              <span style={{ color:'var(--t2)', fontSize:11 }}>{room.category} · {room.wind}kt · {room.pressure}mb</span>
            </div>
            <div style={{ width:1, height:18, background:'var(--border)' }}/>
            <DisagreementIndex />
            <div style={{ flex:1 }}/>
            <MapQuickToggles />
          </>
        ) : (
          <span style={{ color:'var(--t2)', fontSize:12, fontFamily:'var(--mono)' }}>\u26a1 ChaserNet \u2014 Select a storm room</span>
        )}
      </div>
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <div ref={mapRef} style={{ position:'absolute', inset:0 }} />
        {ready && <WeatherLayer map={mapObj.current} />}
        {ready && <WeatherCanvas map={mapObj.current} />}
        {room && <TimelineScrubber />}
        <div style={{ position:'absolute', bottom:30, left:8, fontSize:9, color:'rgba(255,255,255,0.25)', fontFamily:'var(--mono)', pointerEvents:'none' }}>
          \u00a9 MapTiler · OpenStreetMap · Open-Meteo
        </div>
      </div>
    </div>
  )
}
