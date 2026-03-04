import { useEffect, useRef, useState } from 'react'
import maplibregl           from 'maplibre-gl'
import { useMapStore }      from '../../stores/mapStore.js'
import { useRoomStore }     from '../../stores/roomStore.js'
import { useWeatherData }   from '../../hooks/useWeatherData.js'
import { useDisagreement }  from '../../hooks/useDisagreement.js'
import DisagreementIndex    from './DisagreementIndex.jsx'
import WeatherCanvas        from './WeatherCanvas.jsx'
import WeatherLayer         from './WeatherLayer.jsx'
import MapControlBar        from './MapControlBar.jsx'
import NWSAlertsLayer       from './NWSAlertsLayer.jsx'
import RadarLayer           from './RadarLayer.jsx'
import LightningLayer       from './LightningLayer.jsx'
import SatelliteLayer       from './SatelliteLayer.jsx'
import SSTLayer             from './SSTLayer.jsx'
import TrackLayer           from './TrackLayer.jsx'
import GridLayer            from './GridLayer.jsx'
import SplitView            from './SplitView.jsx'
import SpaghettiLayer       from './SpaghettiLayer.jsx'
import ClickInspect         from './ClickInspect.jsx'
import SearchBar            from './SearchBar.jsx'
import { useShareableUrl, getInitialViewFromHash } from '../../hooks/useShareableUrl.js'

const CAT_COLORS = { TD:'#38BDF8',TS:'#F59E0B',C1:'#FCD34D',C2:'#FB923C',C3:'#EF4444',C4:'#DC2626',C5:'#7F1D1D',TY:'#EF4444',STY:'#7F1D1D',INV:'#8B5CF6',Invest:'#8B5CF6' }

// DEM tiles disabled — AWS/MapLibre demo tiles both lack CORS
// TODO: proxy through api.chasernet.com or use MapTiler with API key
const DEM_TILES_URL = null

export default function ChaserMap() {
  const mapRef = useRef(null), mapObj = useRef(null)
  const [ready, setReady] = useState(false)
  const markersRef = useRef([]), locationMarkerRef = useRef(null)
  const { activeRoom, getRoom, setActiveRoom, rooms } = useRoomStore()
  const { userLocation, setUserLocation, setLocationLoading, setLocationError,
          setInspectPoint, is3D, toggle3D } = useMapStore()
  const room = getRoom(activeRoom)
  useWeatherData()
  useShareableUrl(mapObj)

  // Initialize map with optional globe projection
  useEffect(() => {
    if (mapObj.current) return
    const hashView = getInitialViewFromHash()
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      ...(hashView ?? { center: [-98, 38], zoom: 4 }),
      minZoom: 1,
      maxZoom: 16,
      maxPitch: 85,
      pitch: is3D ? 45 : 0,
      antialias: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'nautical' }), 'bottom-right')

    // Globe control (if available in this version)
    if (maplibregl.GlobeControl) {
      map.addControl(new maplibregl.GlobeControl(), 'top-right')
    }

    map.on('load', () => {
      // Enable globe projection
      try {
        map.setProjection({ type: 'globe' })
      } catch (e) {
        console.warn('[ChaserMap] Globe projection not available:', e.message)
      }

      // Terrain/hillshade disabled until we have a CORS-friendly DEM source
      // 3D toggle still works via pitch change

      setReady(true)
      window.__map = map  // debug: expose map instance
    })

    // Click-to-inspect: right-click for weather picker
    map.on('contextmenu', (e) => {
      setInspectPoint({ lat: +e.lngLat.lat.toFixed(4), lon: +e.lngLat.lng.toFixed(4) })
    })

    mapObj.current = map
    return () => { mapObj.current?.remove(); mapObj.current = null }
  }, [])

  // 3D terrain toggle
  useEffect(() => {
    if (!mapObj.current || !ready) return
    const map = mapObj.current
    try {
      if (is3D) {
        map.easeTo({ pitch: 55, duration: 800 })
      } else {
        map.easeTo({ pitch: 0, duration: 600 })
      }
    } catch (e) {
      console.warn('[ChaserMap] 3D toggle error:', e.message)
    }
  }, [is3D, ready])

  // Geolocation — fly to user on first load
  useEffect(() => {
    if (!navigator.geolocation) return
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setUserLocation(loc)
        if (!window.location.hash && !activeRoom && mapObj.current) {
          mapObj.current.flyTo({ center: [loc.lon, loc.lat], zoom: 6, speed: 1.2, curve: 1.6 })
        }
      },
      err => setLocationError(err.message),
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [])

  // User location marker
  useEffect(() => {
    if (!ready || !mapObj.current || !userLocation) return
    if (locationMarkerRef.current) locationMarkerRef.current.remove()
    if (!document.getElementById('loc-pulse')) {
      const s = document.createElement('style'); s.id = 'loc-pulse'
      s.textContent = '@keyframes locPulse{0%{box-shadow:0 0 0 0 rgba(56,189,248,0.6)}70%{box-shadow:0 0 0 16px rgba(56,189,248,0)}100%{box-shadow:0 0 0 0 rgba(56,189,248,0)}}'
      document.head.appendChild(s)
    }
    const el = document.createElement('div')
    el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:rgba(56,189,248,0.35);border:2.5px solid #38BDF8;animation:locPulse 2s infinite;cursor:pointer;'
    el.title = 'Your location'
    locationMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.lon, userLocation.lat])
      .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(
        `<div style="font-family:monospace;font-size:11px;color:#38BDF8;background:#0D1929;padding:6px 10px;border-radius:6px;">📍 Your location<br/><span style="color:#6B7280">${userLocation.lat.toFixed(2)}°, ${userLocation.lon.toFixed(2)}°</span></div>`
      ))
      .addTo(mapObj.current)
  }, [ready, userLocation])

  // Storm markers
  useEffect(() => {
    if (!ready || !mapObj.current) return
    markersRef.current.forEach(m => m.remove()); markersRef.current = []
    if (!document.getElementById('storm-pulse')) {
      const s = document.createElement('style'); s.id = 'storm-pulse'
      s.textContent = '@keyframes stormPulse{0%,100%{opacity:0.85}50%{opacity:1}} .storm-mk{transition:transform 0.15s}.storm-mk:hover{transform:scale(1.3)!important}'
      document.head.appendChild(s)
    }
    rooms.forEach(storm => {
      if (!storm.lat || !storm.lon) return
      const cat = storm.category ?? 'TD'
      const color = CAT_COLORS[cat] ?? '#6B7A9E'
      const size = ['C3','C4','C5','TY','STY'].includes(cat) ? 32 : 24
      const el = document.createElement('div'); el.className = 'storm-mk'
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color}20;border:2px solid ${color};display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 16px ${color}50;animation:stormPulse 3s infinite;`
      el.innerHTML = `<span style="font-size:7px;font-family:monospace;font-weight:800;color:${color}">${cat === 'Invest' ? '?' : (storm.wind ?? 0) + 'kt'}</span>`
      el.addEventListener('click', () => { setActiveRoom(storm.id); mapObj.current.flyTo({ center: [storm.lon, storm.lat], zoom: 5, speed: 1, curve: 1.4 }) })
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([storm.lon, storm.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(
          `<div style="font-family:monospace;font-size:11px;background:#0D1929;padding:8px 12px;border-radius:8px;border:1px solid ${color}40"><div style="color:${color};font-weight:800;margin-bottom:3px">${storm.name}</div><div style="color:#94A3B8">${cat} · ${storm.wind ?? 0}kt · Click to open room</div></div>`
        ))
        .addTo(mapObj.current)
      markersRef.current.push(marker)
    })
  }, [ready, rooms])

  useEffect(() => { if (mapObj.current && room) mapObj.current.flyTo({ center: [room.lon, room.lat], zoom: 5, speed: 0.9, curve: 1.4 }) }, [activeRoom])

  function flyToMe() {
    if (userLocation && mapObj.current) {
      mapObj.current.flyTo({ center: [userLocation.lon, userLocation.lat], zoom: 8, speed: 1.2 })
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude }; setUserLocation(loc); mapObj.current?.flyTo({ center: [loc.lon, loc.lat], zoom: 8, speed: 1.2 }) },
        () => {}, { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%' }}>
      {/* Top bar */}
      <div style={{
        height: 44, background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10,
        flexShrink: 0, zIndex: 10,
      }}>
        {room ? (
          <>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 12, fontFamily: 'var(--mono)' }}>{room.name}</span>
            <span style={{ color: 'var(--t3)' }}>·</span>
            <span style={{ color: 'var(--t2)', fontSize: 11 }}>{room.category} · {room.wind}kt · {room.pressure}mb</span>
            <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
            <DisagreementIndex />
            <div style={{ flex: 1 }} />
            <SearchBar map={mapObj.current} />
            <button onClick={() => setActiveRoom(null)} style={{
              padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9,
            }}>← GLOBAL</button>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--t2)', fontSize: 11, fontFamily: 'var(--mono)' }}>⚡ ChaserNet</span>
            <div style={{ flex: 1 }} />
            <SearchBar map={mapObj.current} />
            <button onClick={flyToMe} title="Go to my location" style={{
              padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--card)', color: userLocation ? '#38BDF8' : 'var(--t3)',
              cursor: 'pointer', fontSize: 13,
            }}>📍</button>
          </>
        )}
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

        {ready && <WeatherLayer map={mapObj.current} />}
        {ready && <WeatherCanvas map={mapObj.current} />}
        {ready && <RadarLayer map={mapObj.current} />}
        {ready && <LightningLayer map={mapObj.current} />}
        {ready && <SatelliteLayer map={mapObj.current} />}
        {ready && <SSTLayer map={mapObj.current} />}
        {ready && <TrackLayer map={mapObj.current} />}
        {ready && <GridLayer map={mapObj.current} />}
        {ready && <SpaghettiLayer map={mapObj.current} />}
        {ready && <SplitView parentMap={mapObj.current} />}
        {ready && <ClickInspect map={mapObj.current} />}

        <MapControlBar />

        {/* 2D / 3D toggle — floating button */}
        <ViewToggle />

        {/* Attribution */}
        <div style={{
          position: 'absolute', bottom: 8, right: 110, fontSize: 9,
          color: 'rgba(255,255,255,0.18)', fontFamily: 'var(--mono)',
          pointerEvents: 'none', zIndex: 5,
        }}>
          OpenFreeMap · OSM · Open-Meteo · NOAA · Blitzortung
        </div>

        <RightClickHint />
      </div>
    </div>
  )
}

/** 2D/3D toggle button */
function ViewToggle() {
  const { is3D, toggle3D } = useMapStore()
  return (
    <button
      onClick={toggle3D}
      title={is3D ? 'Switch to 2D' : 'Switch to 3D'}
      style={{
        position: 'absolute', bottom: 72, right: 10, zIndex: 15,
        width: 44, height: 32, borderRadius: 8,
        border: `1.5px solid ${is3D ? '#38BDF8' : 'rgba(255,255,255,0.15)'}`,
        background: is3D ? 'rgba(56,189,248,0.15)' : 'rgba(10,14,26,0.8)',
        color: is3D ? '#38BDF8' : 'rgba(255,255,255,0.6)',
        cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
    >
      {is3D ? '3D' : '2D'}
    </button>
  )
}

/** Right-click hint */
function RightClickHint() {
  const [visible, setVisible] = useState(true)
  useEffect(() => { const t = setTimeout(() => setVisible(false), 6000); return () => clearTimeout(t) }, [])
  if (!visible) return null
  return (
    <div style={{
      position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      padding: '6px 14px', borderRadius: 20, zIndex: 12,
      background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(255,255,255,0.1)',
      color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'var(--mono)',
      pointerEvents: 'none', opacity: visible ? 1 : 0, transition: 'opacity 0.5s',
    }}>
      Right-click anywhere for weather data · Scroll to zoom · Ctrl+drag to tilt
    </div>
  )
}
