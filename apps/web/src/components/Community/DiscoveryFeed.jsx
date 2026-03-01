import { useNavigate }  from 'react-router-dom'
import { useRoomStore } from '../../stores/roomStore.js'

const ALERTS = [
  { id:'a1', type:'disagreement', color:'#EF4444', icon:'⚡', title:'Euro vs GFS — 187km spread',    sub:'Hurricane Beatriz · 96h track · HIGH SPREAD', room:'beatriz-2026',    time:'2m ago' },
  { id:'a2', type:'model_run',    color:'#10B981', icon:'📡', title:'EC-AIFS 12z cycle complete',    sub:'All basins · 8m ago',                         room:'beatriz-2026',    time:'8m ago' },
  { id:'a3', type:'battle',       color:'#F59E0B', icon:'⚔',  title:'Battle closing — Beatriz 72h', sub:'14h 22m remaining · 89 forecasters',           room:'beatriz-2026',    time:'14h left' },
  { id:'a4', type:'thread',       color:'#38BDF8', icon:'💬', title:'47 replies: Euro 12z Analysis', sub:'wx_mike · Hurricane Beatriz',                 room:'beatriz-2026',    time:'14m ago' },
  { id:'a5', type:'model_run',    color:'#8B5CF6', icon:'📡', title:'GEFS 12z ingesting',            sub:'Invest 96W · ensemble members loading',        room:'invest96w-2026',  time:'now' },
]

export default function DiscoveryFeed() {
  const navigate        = useNavigate()
  const { rooms, setActiveRoom, setRightTab } = useRoomStore()

  function goToRoom(roomId, tab='live') {
    setActiveRoom(roomId)
    setRightTab(tab)
    navigate(`/app/storm/${roomId}`)
  }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:12 }}>

      {/* Live alerts */}
      <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, marginBottom:10, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>
        LIVE ALERTS &amp; ACTIVITY
      </div>

      {ALERTS.map(a => (
        <div key={a.id} onClick={() => goToRoom(a.room, a.type==='battle'?'battle':'live')}
          style={{ padding:10, background:'var(--card)', borderRadius:8, border:'1px solid var(--border)',
            marginBottom:8, cursor:'pointer', display:'flex', gap:10, alignItems:'flex-start',
            transition:'border-color 0.15s' }}>
          <div style={{ width:32,height:32,borderRadius:8,background:`${a.color}18`,border:`1px solid ${a.color}44`,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0 }}>
            {a.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)', marginBottom:2 }}>{a.title}</div>
            <div style={{ fontSize:10, color:'var(--t2)', marginBottom:4 }}>{a.sub}</div>
            <div style={{ fontSize:10, color:a.color, fontFamily:'var(--mono)' }}>{a.time}</div>
          </div>
        </div>
      ))}

      <div style={{ height:1, background:'var(--border)', margin:'12px 0' }}/>

      {/* Active rooms */}
      <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, marginBottom:10, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>
        ACTIVE STORM ROOMS
      </div>

      {rooms.map(r => (
        <div key={r.id} onClick={() => goToRoom(r.id)}
          style={{ padding:10, background:'var(--card)', borderRadius:8, border:'1px solid var(--border)',
            marginBottom:6, cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:`${r.catColor}18`,border:`1.5px solid ${r.catColor}`,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:r.catColor,fontFamily:'var(--mono)' }}>
            {r.short}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{r.name}</div>
            <div style={{ fontSize:10, color:'var(--t2)', fontFamily:'var(--mono)' }}>{r.category} · {r.wind}kt · {r.basin}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'var(--green)', fontFamily:'var(--mono)' }}>{r.users} online</div>
            {r.active && <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--red)',marginLeft:'auto',marginTop:4,animation:'pulse 2s infinite' }}/>}
          </div>
        </div>
      ))}
    </div>
  )
}
