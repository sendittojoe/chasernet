import { useEffect, useRef, useState } from 'react'
import maplibregl          from 'maplibre-gl'
import { useMapStore }     from '../../stores/mapStore.js'
import { useRoomStore }    from '../../stores/roomStore.js'
import { useWeatherData }  from '../../hooks/useWeatherData.js'
import { useDisagreement } from '../../hooks/useDisagreement.js'
import DisagreementIndex   from './DisagreementIndex.jsx'
import WeatherCanvas       from './WeatherCanvas.jsx'
import WeatherLayer        from './WeatherLayer.jsx'
import TimelineScrubber    from './TimelineScrubber.jsx'
import MapQuickToggles     from './MapQuickToggles.jsx'
import ClickInspect        from './ClickInspect.jsx'

const MAPTILER_KEY = 'u3sB039ED5sMmJTQH8Ov'

export default function ChaserMap() {
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const [ready, setReady] = useState(false)
  const { activeRoom, getRoom } = useRoomStore()
  const room = getRoom(activeRoom)
  const { showRadar, showSatellite, showSST, setInspectPoint, inspectPoint } = useMapStore()
  useWeatherData()

  useEffect(() => {
    if (mapObj.current) return
    mapObj.current = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://api.maptiler.com/maps/dataviz-dark/style.json?key=' + MAPTILER_KEY,
      center: [room?.lon ?? -60, room?.lat ?? 20],
      zoom: 3.5, minZoom: 2, maxZoom: 14,
      attributionControl: false, pitchWithRotate: false, dragRotate: false,
    })
    mapObj.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapObj.current.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'nautical' }), 'bottom-right')
    mapObj.current.on('load', async () => {
      await loadRainViewerLayers(mapObj.current)
      setReady(true)
    })
    mapObj.current.on('click', (e) => {
      const { lng, lat } = e.lngLat
      setInspectPoint({ lat: parseFloat(lat.toFixed(4)), lon: parseFloat(lng.toFixed(4)) })
    })
    return () => { mapObj.current?.remove(); mapObj.current = null }
  }, [])

  useEffect(() => {
    if (!mapObj.current || !room) return
    mapObj.current.flyTo({ center: [room.lon, room.lat], zoom: 4.5, speed: 0.9, curve: 1.4 })
  }, [activeRoom])

  useEffect(() => {
    if (!mapObj.current || !ready) return
    if (mapObj.current.getLayer('radar-layer'))
      mapObj.current.setPaintProperty('radar-layer', 'raster-opacity', showRadar ? 0.7 : 0)
  }, [showRadar, ready])

  useEffect(() => {
    if (!mapObj.current || !ready) return
    if (mapObj.current.getLayer('satellite-layer'))
      mapObj.current.setPaintProperty('satellite-layer', 'raster-opacity', showSatellite ? 0.65 : 0)
  }, [showSatellite, ready])

  useEffect(() => {
    if (!mapObj.current || !ready) return
    if (mapObj.current.getLayer('sst-layer'))
      mapObj.current.setPaintProperty('sst-layer', 'raster-opacity', showSST ? 0.55 : 0)
  }, [showSST, ready])

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <div style={{ height:44, background:'var(--panel)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 14px', gap:10, flexShrink:0, overflow:'auto' }}>
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
          <span style={{ color:'var(--t2)', fontSize:12, fontFamily:'var(--mono)' }}>⚡ ChaserNet — Select a storm room</span>
        )}
      </div>
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <div ref={mapRef} style={{ position:'absolute', inset:0 }} />
        {ready && <WeatherLayer map={mapObj.current} />}
        {ready && <WeatherCanvas map={mapObj.current} />}
        {room && <TimelineScrubber />}
        {inspectPoint && <ClickInspect map={mapObj.current} />}
        <div style={{ position:'absolute', bottom:30, left:8, fontSize:9, color:'rgba(255,255,255,0.2)', fontFamily:'var(--mono)', pointerEvents:'none' }}>
          \u00a9 MapTiler · OpenStreetMap · Open-Meteo · RainViewer
        </div>
      </div>
    </div>
  )
}

async function loadRainViewerLayers(map) {
  try {
    const res  = await fetch('https://api.rainviewer.com/public/weather-maps.json')
    const data = await res.json()
    const radarFrames = data.radar?.past ?? []
    const latestRadar = radarFrames[radarFrames.length - 1]
    if (latestRadar) {
      map.addSource('radar', { type:'raster', tiles: ['https://tilecache.rainviewer.com/v2/radar/' + latestRadar.time + '/512/{z}/{x}/{y}/8/1_1.png'], tileSize:512 })
      map.addLayer({ id:'radar-layer', type:'raster', source:'radar', paint:{ 'raster-opacity':0 } })
    }
    const satFrames = data.satellite?.infrared ?? []
    const latestSat = satFrames[satFrames.length - 1]
    if (latestSat) {
      map.addSource('satellite-ir', { type:'raster', tiles: ['https://tilecache.rainviewer.com/v2/satellite/infrared/' + latestSat.time + '/512/{z}/{x}/{y}/0/0_0.png'], tileSize:512 })
      map.addLayer({ id:'satellite-layer', type:'raster', source:'satellite-ir', paint:{ 'raster-opacity':0 } })
    }
    map.addSource('sst', { type:'raster', tiles:['https://coastwatch.pfeg.noaa.gov/erddap/wms/erdMH1sstd8day/request?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX={bbox-epsg-3857}&CRS=EPSG:3857&WIDTH=256&HEIGHT=256&LAYERS=erdMH1sstd8day:sstMasked&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&colorBarMinimum=18&colorBarMaximum=32&colorBarPalette=KT_thermal'], tileSize:256 })
    map.addLayer({ id:'sst-layer', type:'raster', source:'sst', paint:{ 'raster-opacity':0 } })
  } catch(e) { console.warn('[ChaserMap] layer load failed:', e.message) }
}
