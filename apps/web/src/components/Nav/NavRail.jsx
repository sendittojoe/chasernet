import { useNavigate }  from 'react-router-dom'
import { useRoomStore } from '../../stores/roomStore.js'
import { useUserStore } from '../../stores/userStore.js'

export default function NavRail() {
  const { rooms, activeRoom, setActiveRoom } = useRoomStore()
  const { user, logout }  = useUserStore()
  const navigate          = useNavigate()

  function goToRoom(roomId) {
    setActiveRoom(roomId)
    navigate(`/app/storm/${roomId}`)
  }

  function goToDiscovery() {
    setActiveRoom(null)
    navigate('/app')
  }

  return (
    <nav style={{
      width:       56,
      background:  'var(--panel)',
      borderRight: '1px solid var(--border)',
      display:     'flex',
      flexDirection: 'column',
      alignItems:  'center',
      padding:     '10px 0',
      gap:         6,
      zIndex:      30,
      flexShrink:  0,
    }}>

      <div style={{
        width:56-20, height:36, borderRadius:10,
        background: 'linear-gradient(135deg, var(--blue) 0%, #6366F1 100%)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:17, marginBottom:6, cursor:'pointer',
      }} onClick={goToDiscovery}>
        ⚡
      </div>

      {rooms.map(room => (
        <RoomButton
          key={room.id}
          room={room}
          active={activeRoom === room.id}
          onClick={() => goToRoom(room.id)}
        />
      ))}

      <div style={{ width:28, height:1, background:'var(--border)', margin:'2px 0' }} />

      <RailIcon label="Discovery Feed" active={!activeRoom} onClick={goToDiscovery}>🌐</RailIcon>
      <RailIcon label="Direct Messages" badge={3}>💬</RailIcon>

      <div style={{ flex:1 }} />

      {(user?.role === 'admin' || user?.role === 'owner') && (
        <RailIcon label="Admin Panel" onClick={() => navigate('/app/admin')}>⚙️</RailIcon>
      )}

      <div
        onClick={() => navigate(`/app/profile/${user?.username}`)}
        style={{
          width:34, height:34, borderRadius:'50%',
          background: user?.avatarColor ?? 'var(--blue)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:13, fontWeight:700, color:'var(--bg)',
          cursor:'pointer', fontFamily:'var(--mono)',
        }}
        title={user?.username}
      >
        {user?.username?.[0]?.toUpperCase() ?? '?'}
      </div>
    </nav>
  )
}

function RoomButton({ room, active, onClick }) {
  return (
    <div
      onClick={onClick}
      title={room.name}
      style={{
        position:   'relative',
        width:      40,
        height:     40,
        borderRadius: 11,
        cursor:     'pointer',
        border:     `1.5px solid ${active ? room.catColor : 'var(--border)'}`,
        background: active ? `${room.catColor}20` : 'var(--card)',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize:   10,
        fontWeight: 800,
        color:      active ? room.catColor : 'var(--t2)',
        fontFamily: 'var(--mono)',
        transition: 'all 0.15s',
      }}
    >
      {room.short}
      {room.active && (
        <div style={{
          position:  'absolute', top:-3, right:-3,
          width:9, height:9, borderRadius:'50%',
          background: 'var(--red)',
          border:    '2px solid var(--panel)',
          animation: 'pulse 2s infinite',
        }}/>
      )}
      <div style={{
        position:   'absolute', bottom:-5, right:-5,
        minWidth:   18, height:14, borderRadius:4,
        background: room.catColor,
        display:    'flex', alignItems:'center', justifyContent:'center',
        fontSize:7, fontWeight:800, color:'white', padding:'0 3px',
        fontFamily: 'var(--mono)',
      }}>
        {room.category}
      </div>
    </div>
  )
}

function RailIcon({ children, label, active, onClick, badge }) {
  return (
    <div
      onClick={onClick}
      title={label}
      style={{
        position:   'relative',
        width:      40, height:40, borderRadius:11,
        cursor:     'pointer',
        border:     `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
        background: active ? 'rgba(56,189,248,0.12)' : 'var(--card)',
        display:    'flex', alignItems:'center', justifyContent:'center',
        fontSize:   15, transition:'border-color 0.15s',
      }}
    >
      {children}
      {badge && (
        <div style={{
          position:  'absolute', top:-3, right:-3,
          minWidth:  14, height:14, borderRadius:'50%',
          background:'var(--red)',
          fontSize:  8, fontWeight:700, color:'white',
          display:   'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--mono)', padding:'0 2px',
        }}>
          {badge}
        </div>
      )}
    </div>
  )
}
