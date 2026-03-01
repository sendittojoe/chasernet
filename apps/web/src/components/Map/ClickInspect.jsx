import { useEffect, useState } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

export default function ClickInspect({ map }) {
  const { inspectPoint, setInspectPoint } = useMapStore()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [pos, setPos]         = useState({ x:0, y:0 })

  useEffect(() => {
    if (!inspectPoint || !map) return
    setLoading(true); setData(null)
    const pt = map.project([inspectPoint.lon, inspectPoint.lat])
    setPos({ x: Math.min(pt.x+14, window.innerWidth-260), y: Math.max(pt.y-170, 10) })
    const url = 'https://api.open-meteo.com/v1/forecast?latitude='+inspectPoint.lat+'&longitude='+inspectPoint.lon+
      '&current=windspeed_10m,winddirection_10m,temperature_2m,precipitation,cape,pressure_msl&wind_speed_unit=kn&timezone=UTC'
    fetch(url).then(r=>r.json()).then(d=>{setData(d.current??{});setLoading(false)}).catch(()=>setLoading(false))
  }, [inspectPoint])

  if (!inspectPoint) return null
  const { windspeed_10m:wind, winddirection_10m:dir, temperature_2m:temp, precipitation:precip, cape, pressure_msl:pressure } = data??{}

  return (
    <div style={{ position:'absolute', left:pos.x, top:pos.y, width:232, background:'rgba(10,14,24,0.96)',
      border:'1px solid rgba(56,189,248,0.3)', borderRadius:8, padding:'10px 12px', zIndex:20,
      fontFamily:'var(--mono)', backdropFilter:'blur(8px)', pointerEvents:'all' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ color:'var(--blue)', fontWeight:700, fontSize:10 }}>
          \ud83d\udccd {inspectPoint.lat}\u00b0, {inspectPoint.lon}\u00b0
        </span>
        <button onClick={()=>setInspectPoint(null)} style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:14 }}>\u2715</button>
      </div>
      {loading && <div style={{ color:'var(--t3)', fontSize:10 }}>Fetching data\u2026</div>}
      {data && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px 10px' }}>
          <Row label="WIND"     value={wind!=null?Math.round(wind)+'kt '+dir2card(dir):'\u2014'} color="var(--blue)" />
          <Row label="TEMP"     value={temp!=null?temp.toFixed(1)+'\u00b0C':'\u2014'} color="#F97316" />
          <Row label="PRESSURE" value={pressure!=null?Math.round(pressure)+' mb':'\u2014'} color="var(--blue)" />
          <Row label="PRECIP"   value={precip!=null?precip.toFixed(1)+' mm':'\u2014'} color="#38BDF8" />
          <Row label="CAPE"     value={cape!=null?Math.round(cape)+' J/kg':'\u2014'} color="#8B5CF6" />
          <Row label="DIR FROM" value={dir!=null?Math.round(dir)+'\u00b0':'\u2014'} color="var(--t2)" />
        </div>
      )}
      <div style={{ marginTop:8, paddingTop:6, borderTop:'1px solid var(--border)', fontSize:9, color:'var(--t3)' }}>
        Open-Meteo \u00b7 current conditions
      </div>
    </div>
  )
}

function Row({ label, value, color }) {
  return (
    <>
      <span style={{ fontSize:9, color:'var(--t3)', letterSpacing:'0.05em' }}>{label}</span>
      <span style={{ fontSize:11, color:color??'var(--t1)', fontWeight:600 }}>{value}</span>
    </>
  )
}

function dir2card(deg) {
  if (deg==null) return ''
  return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(deg/22.5)%16]
}
