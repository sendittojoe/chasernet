import { useNavigate }  from 'react-router-dom'
import { useRoomStore } from '../../stores/roomStore.js'
import { useUserStore } from '../../stores/userStore.js'

const ALL_ALERTS = [
  { id:'a1', type:'disagreement', color:'#EF4444', icon:'⚡', title:'Euro vs GFS — 187km spread',     sub:'Hurricane Beatriz · 96h track · HIGH SPREAD', room:'beatriz-2026',   time:'2m ago',  tags:['tropical','caribbean-atlantic'] },
  { id:'a2', type:'model_run',    color:'#10B981', icon:'📡', title:'EC-AIFS 12z cycle complete',     sub:'All basins · 8m ago',                         room:'beatriz-2026',   time:'8m ago',  tags:['tropical','models','ai-ml'] },
  { id:'a3', type:'battle',       color:'#F59E0B', icon:'⚔',  title:'Battle closing — Beatriz 72h',  sub:'14h 22m remaining · 89 forecasters',           room:'beatriz-2026',   time:'14h left',tags:['tropical'] },
  { id:'a4', type:'thread',       color:'#38BDF8', icon:'💬', title:'47 replies: Euro 12z Analysis',  sub:'wx_mike · Hurricane Beatriz',                 room:'beatriz-2026',   time:'14m ago', tags:['tropical','models'] },
  { id:'a5', type:'model_run',    color:'#8B5CF6', icon:'📡', title:'GEFS 12z ingesting',             sub:'Invest 96W · ensemble members loading',        room:'invest96w-2026', time:'now',     tags:['tropical','models'] },
  { id:'a6', type:'alert',        color:'#EF4444', icon:'🌪', title:'Tornado Watch — TX Panhandle',   sub:'SPC · Valid until 9PM CDT',                    room:null,             time:'just now',tags:['severe','tornado-alley'] },
  { id:'a7', type:'thread',       color:'#38BDF8', icon:'❄', title:'Pattern change — Major snow event W of Rockies', sub:'winter_wx · Model Analysis',   room:null,             time:'45m ago', tags:['winter','central-mountain'] },
  { id:'a8', type:'model_run',    color:'#10B981', icon:'📡', title:'HRRR 18z — fire weather upgrade',sub:'Red flag warnings possible · CA/NV',           room:null,             time:'30m ago', tags:['fire','west-coast'] },
  { id:'a9', type:'thread',       color:'#38BDF8', icon:'🤖', title:'GraphCast vs AIFS on Beatriz — surprisingly close', sub:'ai_wx_lab · AI/ML Models', room:'beatriz-2026',   time:'1h ago',  tags:['ai-ml','tropical'] },
  { id:'a10',type:'alert',        color:'#0EA5E9', icon:'🌊', title:'Coastal Flood Advisory — NE Coast', sub:'NWS Boston · Sat-Sun',                     room:null,             time:'2h ago',  tags:['marine','northeast-usa'] },
]

const TYPE_LABELS = {
  disagreement: 'MODEL SPREAD',
  model_run:    'MODEL RUN',
  battle:       'BATTLE',
  thread:       'THREAD',
  alert:        'ALERT',
}

export default function DiscoveryFeed() {
  const navigate        = useNavigate()
  const { rooms, setActiveRoom, setRightTab } = useRoomStore()
  const { user }        = useUserStore()

  const userTags = [...(user?.regionTags ?? []), ...(user?.interestTags ?? [])]
  const hasOnboarded = userTags.length > 0

  // Filter alerts to user's tags — show all if no tags set
  const personalizedAlerts = hasOnboarded
    ? ALL_ALERTS.filter(a => a.tags.some(t => userTags.includes(t)))
    : ALL_ALERTS

  const globalAlerts = ALL_ALERTS.filter(a => !personalizedAlerts.find(p => p.id === a.id))

  function goToRoom(roomId, tab='live') {
    if (!roomId) return
    setActiveRoom(roomId)
    setRightTab(tab)
    navigate('/app/storm/' + roomId)
  }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:12 }}>

      {/* Personalized header */}
      {hasOnboarded && (
        <div style={{
          marginBottom:10, padding:'8px 10px', borderRadius:8,
          background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.2)',
          fontSize:10, color:'#38BDF8', fontFamily:'var(--mono)', fontWeight:700,
          display:'flex', alignItems:'center', gap:6,
        }}>
          <span>⚡</span>
          <span>Personalized for your tags</span>
          <span style={{ marginLeft:'auto', color:'rgba(56,189,248,0.6)', fontWeight:400 }}>
            {personalizedAlerts.length} items
          </span>
        </div>
      )}

      {/* Live alerts */}
      <SectionHeader>LIVE ALERTS &amp; ACTIVITY</SectionHeader>

      {personalizedAlerts.map(a => (
        <AlertCard key={a.id} alert={a} onGo={goToRoom} />
      ))}

      {/* Global alerts user might have missed */}
      {hasOnboarded && globalAlerts.length > 0 && (
        <>
          <Divider />
          <SectionHeader>OTHER ACTIVITY</SectionHeader>
          {globalAlerts.slice(0,3).map(a => (
            <AlertCard key={a.id} alert={a} onGo={goToRoom} dimmed />
          ))}
        </>
      )}

      <Divider />

      {/* Active storm rooms */}
      <SectionHeader>ACTIVE STORM ROOMS</SectionHeader>

      {rooms.map(r => (
        <div key={r.id} onClick={() => goToRoom(r.id)}
          style={{
            padding:10, background:'var(--card)', borderRadius:8,
            border:'1px solid var(--border)', marginBottom:6,
            cursor:'pointer', display:'flex', alignItems:'center', gap:10,
            transition:'border-color 0.15s',
          }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:r.catColor+'18', border:'1.5px solid '+r.catColor,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, color:r.catColor, fontFamily:'var(--mono)',
          }}>
            {r.short}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)', marginBottom:2 }}>{r.name}</div>
            <div style={{ fontSize:10, color:'var(--t2)' }}>{r.category} · {r.wind}kt · {r.pressure}mb</div>
          </div>
          {r.active && (
            <div style={{
              width:7, height:7, borderRadius:'50%',
              background:'var(--red)', animation:'pulse 2s infinite',
            }}/>
          )}
        </div>
      ))}

      {/* Quick nav to forums/DMs */}
      <Divider />
      <SectionHeader>COMMUNITY</SectionHeader>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
        {[
          { icon:'📋', label:'Forums',   sub:'Discussion threads', path:'/app/forums'   },
          { icon:'💬', label:'Messages', sub:'3 unread',           path:'/app/messages', badge:3 },
        ].map(item => (
          <div key={item.path} onClick={() => navigate(item.path)} style={{
            padding:'12px 12px', background:'var(--card)',
            border:'1px solid var(--border)', borderRadius:10,
            cursor:'pointer', transition:'border-color 0.15s',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontSize:16 }}>{item.icon}</span>
              {item.badge && (
                <span style={{
                  fontSize:9, background:'var(--red)', color:'white',
                  padding:'1px 5px', borderRadius:8, fontFamily:'var(--mono)', fontWeight:700,
                }}>{item.badge}</span>
              )}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{item.label}</div>
            <div style={{ fontSize:10, color:'var(--t3)' }}>{item.sub}</div>
          </div>
        ))}
      </div>

    </div>
  )
}

function AlertCard({ alert: a, onGo, dimmed }) {
  return (
    <div onClick={() => onGo(a.room, a.type==='battle'?'battle':'live')}
      style={{
        padding:10, background:'var(--card)', borderRadius:8,
        border:'1px solid var(--border)', marginBottom:8,
        cursor: a.room ? 'pointer' : 'default',
        display:'flex', gap:10, alignItems:'flex-start',
        opacity: dimmed ? 0.6 : 1,
        transition:'border-color 0.15s',
      }}>
      <div style={{
        width:32, height:32, borderRadius:8,
        background:a.color+'18', border:'1px solid '+a.color+'44',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:14, flexShrink:0,
      }}>
        {a.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
          <span style={{
            fontSize:8, fontWeight:800, color:a.color, letterSpacing:'0.06em',
            background:a.color+'18', padding:'1px 5px', borderRadius:3,
          }}>
            {TYPE_LABELS[a.type] ?? a.type.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)', marginBottom:2, lineHeight:1.3 }}>{a.title}</div>
        <div style={{ fontSize:10, color:'var(--t2)', marginBottom:3 }}>{a.sub}</div>
        <div style={{ fontSize:10, color:a.color, fontFamily:'var(--mono)' }}>{a.time}</div>
      </div>
    </div>
  )
}

function SectionHeader({ children }) {
  return (
    <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, marginBottom:8, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height:1, background:'var(--border)', margin:'12px 0' }} />
}
