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
import RadarLayer            from './RadarLayer.jsx'
import SSTLayer              from './SSTLayer.jsx'
import TrackLayer             from './TrackLayer.jsx'
import GridLayer              from './GridLayer.jsx'
import { useShareableUrl, getInitialViewFromHash } from '../../hooks/useShareableUrl.js'

const CAT_COLORS = { TD:'#38BDF8',TS:'#F59E0B',C1:'#FCD34D',C2:'#FB923C',C3:'#EF4444',C4:'#DC2626',C5:'#7F1D1D',TY:'#EF4444',STY:'#7F1D1D',INV:'#8B5CF6',Invest:'#8B5CF6' }

export default function ChaserMap() {
  const mapRef = useRef(null), mapObj = useRef(null)
  const [ready, setReady] = useState(false)
  const markersRef = useRef([]), locationMarkerRef = useRef(null)
  const { activeRoom, getRoom, setActiveRoom, rooms } = useRoomStore()
  const { userLocation, setUserLocation, setLocationLoading, setLocationError } = useMapStore()
  const room = getRoom(activeRoom)
  useWeatherData()
  useShareableUrl(mapObj)

  useEffect(() => {
    if (mapObj.current) return
    mapObj.current = new maplibregl.Map({ container: mapRef.current, style: 'https://tiles.openfreemap.org/styles/liberty', ...(getInitialViewFromHash() ?? { center: [-40, 20], zoom: 3 }), minZoom: 2, maxZoom: 14 })
    mapObj.current.addControl(new maplibregl.NavigationControl({ showCompass:false }), 'top-right')
    mapObj.current.addControl(new maplibregl.ScaleControl({ maxWidth:100, unit:'nautical' }), 'bottom-right')
    mapObj.current.on('load', () => setReady(true))
    return () => { mapObj.current?.remove(); mapObj.current = null }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => { const loc={lat:pos.coords.latitude,lon:pos.coords.longitude}; setUserLocation(loc); if(!activeRoom&&mapObj.current) mapObj.current.flyTo({center:[loc.lon,loc.lat],zoom:4,speed:1.2,curve:1.6}) },
      err => setLocationError(err.message),
      { enableHighAccuracy:false, timeout:8000 }
    )
  }, [])

  useEffect(() => {
    if (!ready||!mapObj.current||!userLocation) return
    if (locationMarkerRef.current) locationMarkerRef.current.remove()
    if (!document.getElementById('loc-pulse')) { const s=document.createElement('style');s.id='loc-pulse';s.textContent='@keyframes locPulse{0%{box-shadow:0 0 0 0 rgba(56,189,248,0.6)}70%{box-shadow:0 0 0 16px rgba(56,189,248,0)}100%{box-shadow:0 0 0 0 rgba(56,189,248,0)}}';document.head.appendChild(s) }
    const el=document.createElement('div')
    el.style.cssText='width:14px;height:14px;border-radius:50%;background:rgba(56,189,248,0.35);border:2.5px solid #38BDF8;animation:locPulse 2s infinite;cursor:pointer;'
    locationMarkerRef.current=new maplibregl.Marker({element:el}).setLngLat([userLocation.lon,userLocation.lat]).setPopup(new maplibregl.Popup({offset:12}).setHTML(`<div style="font-family:monospace;font-size:11px;color:#38BDF8;background:#0D1929;padding:6px 10px;border-radius:6px;">📍 Your location<br/><span style="color:#6B7280">${userLocation.lat.toFixed(2)}°, ${userLocation.lon.toFixed(2)}°</span></div>`)).addTo(mapObj.current)
  }, [ready, userLocation])

  useEffect(() => {
    if (!ready||!mapObj.current) return
    markersRef.current.forEach(m=>m.remove()); markersRef.current=[]
    if (!document.getElementById('storm-pulse')) { const s=document.createElement('style');s.id='storm-pulse';s.textContent='@keyframes stormPulse{0%,100%{opacity:0.85}50%{opacity:1}} .storm-mk{transition:transform 0.15s}.storm-mk:hover{transform:scale(1.3)!important}';document.head.appendChild(s) }
    rooms.forEach(storm => {
      if (!storm.lat || !storm.lon) return
      const cat = storm.category ?? 'TD'
      const color=CAT_COLORS[cat]??'#6B7A9E', size=['C3','C4','C5','TY','STY'].includes(cat)?32:24
      const el=document.createElement('div'); el.className='storm-mk'
      el.style.cssText=`width:${size}px;height:${size}px;border-radius:50%;background:${color}20;border:2px solid ${color};display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 16px ${color}50;animation:stormPulse 3s infinite;`
      el.innerHTML=`<span style="font-size:7px;font-family:monospace;font-weight:800;color:${color}">${cat==='Invest'?'?':(storm.wind??0)+'kt'}</span>`
      el.addEventListener('click',()=>{ setActiveRoom(storm.id); mapObj.current.flyTo({center:[storm.lon,storm.lat],zoom:5,speed:1,curve:1.4}) })
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([storm.lon,storm.lat]).setPopup(new maplibregl.Popup({offset:16}).setHTML(`<div style="font-family:monospace;font-size:11px;background:#0D1929;padding:8px 12px;border-radius:8px;border:1px solid ${color}40"><div style="color:${color};font-weight:800;margin-bottom:3px">${storm.name}</div><div style="color:#94A3B8">${cat} · ${storm.wind??0}kt · Click to open room</div></div>`)).addTo(mapObj.current)
      markersRef.current.push(marker)
    })
  }, [ready, rooms])

  useEffect(() => { if(mapObj.current&&room) mapObj.current.flyTo({center:[room.lon,room.lat],zoom:5,speed:0.9,curve:1.4}) }, [activeRoom])

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',height:'100%'}}>
      <div style={{height:44,background:'var(--panel)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',padding:'0 12px',gap:10,flexShrink:0,zIndex:10}}>
        {room ? (
          <>
            <div style={{width:7,height:7,borderRadius:'50%',background:'var(--red)',animation:'pulse 2s infinite',flexShrink:0}}/>
            <span style={{fontWeight:800,color:'var(--red)',fontSize:12,fontFamily:'var(--mono)'}}>{room.name}</span>
            <span style={{color:'var(--t3)'}}>·</span>
            <span style={{color:'var(--t2)',fontSize:11}}>{room.category} · {room.wind}kt · {room.pressure}mb</span>
            <div style={{width:1,height:18,background:'var(--border)'}}/>
            <DisagreementIndex />
            <button onClick={()=>setActiveRoom(null)} style={{marginLeft:'auto',padding:'3px 8px',borderRadius:5,border:'1px solid var(--border)',background:'transparent',color:'var(--t3)',cursor:'pointer',fontFamily:'var(--mono)',fontSize:9}}>← GLOBAL</button>
          </>
        ) : (
          <span style={{color:'var(--t2)',fontSize:11,fontFamily:'var(--mono)'}}>
            ⚡ ChaserNet — Global View
            {userLocation&&<span style={{color:'var(--t3)',marginLeft:10,fontSize:10}}>📍 {userLocation.lat.toFixed(1)}°, {userLocation.lon.toFixed(1)}°</span>}
          </span>
        )}
      </div>
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <div ref={mapRef} style={{position:'absolute',inset:0}}/>
        {ready && <WeatherLayer map={mapObj.current}/>}
        {ready && <WeatherCanvas map={mapObj.current}/>}
        {ready && <RadarLayer map={mapObj.current}/>}
        {ready && <SSTLayer map={mapObj.current}/>}
        {ready && <TrackLayer map={mapObj.current}/>}
        {ready && <GridLayer map={mapObj.current}/>}
        <MapControlBar />
        <div style={{position:'absolute',bottom:8,right:110,fontSize:9,color:'rgba(255,255,255,0.18)',fontFamily:'var(--mono)',pointerEvents:'none',zIndex:5}}>
          OpenFreeMap · OpenStreetMap · Open-Meteo · NOAA
        </div>
      </div>
    </div>
  )
}
