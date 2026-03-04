import { useState } from 'react'
import { useNavigate, useLocation }  from 'react-router-dom'
import { useRoomStore } from '../../stores/roomStore.js'
import { useUserStore } from '../../stores/userStore.js'
import { useDMStore }   from '../../hooks/usePresence.js'
import { useNotificationStore } from '../../stores/notificationStore.js'

const ROLE_COLORS = {
  owner:'#F59E0B', co_creator:'#F59E0B', admin:'#EF4444',
  moderator:'#8B5CF6', vip:'#F59E0B', verified:'#22C55E',
  contributor:'#38BDF8', member:'#6B7280', probation:'#6B7280',
}

const NAV_ITEMS = [
  { id:'discovery', icon:'🌐', label:'Discovery' },
  { id:'messages',  icon:'💬', label:'Messages' },
  { id:'members',   icon:'👥', label:'Members' },
  { id:'forums',    icon:'📋', label:'Forums' },
]

const BOTTOM_ITEMS = [
  { id:'notif',    icon:'🔔', label:'Alerts' },
  { id:'admin',    icon:'🛡', label:'Admin', roles:['owner','co_creator','admin','moderator'] },
  { id:'settings', icon:'⚙️', label:'Settings' },
]

export default function NavRail() {
  const { rooms, activeRoom, setActiveRoom } = useRoomStore()
  const { user, logout }  = useUserStore()
  const dmUnread           = useDMStore(s => s.totalUnread)
  const notifUnread        = useNotificationStore(s => s.unread)
  const navigate          = useNavigate()
  const location          = useLocation()
  const [hovered, setHovered] = useState(false)

  const expanded = hovered
  const railWidth = expanded ? 160 : 56

  function goToRoom(roomId) {
    setActiveRoom(roomId)
    navigate('/app/storm/' + roomId)
  }

  function goTo(id) {
    setActiveRoom(null)
    if (id === 'discovery') navigate('/app')
    else if (id === 'notif') {} // TODO: notification panel
    else navigate('/app/' + id)
  }

  const onProfile = location.pathname.includes('/profile/')
  const roleColor = ROLE_COLORS[user?.role] ?? '#6B7280'

  return (
    <nav
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: railWidth,
        background:'var(--panel)',
        borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column',
        alignItems: expanded ? 'stretch' : 'center',
        padding:'10px 0', gap:4,
        zIndex:30, flexShrink:0,
        transition:'width 0.2s ease',
        overflow:'hidden',
      }}
    >

      {/* Logo */}
      <div
        onClick={() => { setActiveRoom(null); navigate('/app') }}
        style={{
          display:'flex', alignItems:'center', gap:10,
          padding: expanded ? '0 10px' : '0',
          justifyContent: expanded ? 'flex-start' : 'center',
          marginBottom:6, cursor:'pointer',
        }}
      >
        <div style={{
          width:36, height:36, borderRadius:10, flexShrink:0,
          background:'linear-gradient(135deg,var(--blue) 0%,#6366F1 100%)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:17,
        }}>⚡</div>
        {expanded && (
          <span style={{
            fontSize:13, fontWeight:800, color:'var(--blue)',
            fontFamily:'var(--mono)', letterSpacing:'-0.02em',
            whiteSpace:'nowrap',
          }}>CHASERNET</span>
        )}
      </div>

      {/* Storm room buttons */}
      {rooms.map(room => (
        <RoomButton
          key={room.id} room={room}
          active={activeRoom === room.id}
          onClick={() => goToRoom(room.id)}
          expanded={expanded}
        />
      ))}

      {rooms.length > 0 && <Divider expanded={expanded} />}

      {/* Nav items */}
      {NAV_ITEMS.map(item => (
        <RailIcon
          key={item.id}
          label={item.label}
          active={
            item.id === 'discovery' ? (!activeRoom && location.pathname === '/app') :
            location.pathname.startsWith('/app/' + item.id)
          }
          onClick={() => goTo(item.id)}
          badge={item.id === 'messages' ? (dmUnread || undefined) : undefined}
          expanded={expanded}
        >{item.icon}</RailIcon>
      ))}

      <div style={{ flex:1 }} />

      {/* Bottom items */}
      {BOTTOM_ITEMS.map(item => {
        if (item.roles && !item.roles.includes(user?.role)) return null
        return (
          <RailIcon
            key={item.id}
            label={item.label}
            active={location.pathname === '/app/' + item.id}
            onClick={() => goTo(item.id)}
            badge={item.id === 'notif' ? (notifUnread || undefined) : undefined}
            expanded={expanded}
          >{item.icon}</RailIcon>
        )
      })}

      <Divider expanded={expanded} />

      {/* Profile */}
      <div
        onClick={() => navigate('/app/profile/' + user?.username)}
        title={'@' + user?.username}
        style={{
          display:'flex', alignItems:'center', gap:10,
          padding: expanded ? '4px 10px' : '0',
          justifyContent: expanded ? 'flex-start' : 'center',
          cursor:'pointer',
        }}
      >
        <div style={{
          width:34, height:34, borderRadius:'50%', flexShrink:0,
          background: user?.avatarColor ?? roleColor,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:13, fontWeight:700, color:'var(--bg)',
          fontFamily:'var(--mono)',
          border: onProfile ? '2px solid ' + roleColor : '2px solid transparent',
          transition:'all 0.15s',
        }}>
          {user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        {expanded && (
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--t1)', fontFamily:'var(--mono)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              @{user?.username}
            </div>
            <div style={{ fontSize:9, color:roleColor, fontWeight:700, fontFamily:'var(--mono)', textTransform:'uppercase' }}>
              {user?.role}
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <RailIcon
        label="Log out"
        onClick={() => { logout(); navigate('/') }}
        expanded={expanded}
      >🚪</RailIcon>
    </nav>
  )
}

function Divider({ expanded }) {
  return <div style={{ width: expanded ? 'calc(100% - 20px)' : 28, height:1, background:'var(--border)', margin:'2px auto' }} />
}

function RoomButton({ room, active, onClick, expanded }) {
  return (
    <div onClick={onClick} title={room.name} style={{
      display:'flex', alignItems:'center', gap:10,
      padding: expanded ? '4px 10px' : '0',
      justifyContent: expanded ? 'flex-start' : 'center',
      cursor:'pointer',
    }}>
      <div style={{
        position:'relative', width:40, height:40, borderRadius:11, flexShrink:0,
        border:'1.5px solid ' + (active ? room.catColor : 'var(--border)'),
        background: active ? room.catColor + '20' : 'var(--card)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:10, fontWeight:800,
        color: active ? room.catColor : 'var(--t2)',
        fontFamily:'var(--mono)', transition:'all 0.15s',
      }}>
        {room.short}
        {room.active && (
          <div style={{
            position:'absolute', top:-3, right:-3,
            width:9, height:9, borderRadius:'50%',
            background:'var(--red)', border:'2px solid var(--panel)',
            animation:'pulse 2s infinite',
          }}/>
        )}
      </div>
      {expanded && (
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color: active ? room.catColor : 'var(--t2)', fontFamily:'var(--mono)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {room.name}
          </div>
          <div style={{ fontSize:8, color:room.catColor, fontWeight:800, fontFamily:'var(--mono)' }}>
            {room.category}
          </div>
        </div>
      )}
    </div>
  )
}

function RailIcon({ children, label, active, onClick, badge, expanded }) {
  return (
    <div onClick={onClick} title={expanded ? undefined : label} style={{
      display:'flex', alignItems:'center', gap:10,
      padding: expanded ? '4px 10px' : '0',
      justifyContent: expanded ? 'flex-start' : 'center',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{
        position:'relative', width:40, height:40, borderRadius:11, flexShrink:0,
        border:'1px solid ' + (active ? 'var(--blue)' : 'var(--border)'),
        background: active ? 'rgba(56,189,248,0.12)' : 'var(--card)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:15, transition:'border-color 0.15s',
      }}>
        {children}
        {badge && (
          <div style={{
            position:'absolute', top:-3, right:-3,
            minWidth:14, height:14, borderRadius:'50%',
            background:'var(--red)', fontSize:8, fontWeight:700,
            color:'white', display:'flex', alignItems:'center',
            justifyContent:'center', fontFamily:'var(--mono)', padding:'0 2px',
          }}>{badge}</div>
        )}
      </div>
      {expanded && (
        <span style={{
          fontSize:11, fontWeight: active ? 700 : 500,
          color: active ? 'var(--blue)' : 'var(--t2)',
          fontFamily:'var(--mono)', whiteSpace:'nowrap',
        }}>{label}</span>
      )}
    </div>
  )
}
