import { useEffect, useState } from 'react'
import { useUserStore } from '../../stores/userStore.js'
import { useRoomStore } from '../../stores/roomStore.js'

const ROLE_COLORS = {
  owner:'#F59E0B', co_creator:'#F59E0B', admin:'#EF4444',
  moderator:'#8B5CF6', vip:'#F59E0B', verified:'#22C55E',
  contributor:'#38BDF8', member:'#6B7280',
}

// Simulated presence — in production this hooks into a Durable Object
// For now it tracks the current user and any "active" demo users
function useSimulatedPresence(roomId) {
  const { user } = useUserStore()
  const [present, setPresent] = useState([])

  useEffect(() => {
    if (!user) return
    const me = { id: user.id ?? 'me', username: user.username ?? 'you', role: user.role ?? 'member', isMe: true }

    // Demo users that appear "online" in interesting rooms
    const demo = roomId ? [
      { id: 'wx_mike',     username: 'wx_mike',     role: 'verified', isMe: false },
      { id: 'met_sarah',   username: 'met_sarah',   role: 'contributor', isMe: false },
    ] : []

    setPresent([me, ...demo])

    return () => setPresent([])
  }, [roomId, user?.id])

  return present
}

export default function OnlinePresence({ roomId, compact = false }) {
  const present = useSimulatedPresence(roomId)

  if (present.length === 0) return null

  if (compact) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#22C55E', boxShadow:'0 0 6px #22C55E' }} />
        <span style={{ fontSize:10, color:'#22C55E', fontFamily:'var(--mono)', fontWeight:700 }}>
          {present.length} online
        </span>
      </div>
    )
  }

  return (
    <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
      <div style={{ fontSize:9, color:'var(--t3)', fontWeight:800, letterSpacing:'0.1em', marginBottom:8 }}>
        ONLINE NOW — {present.length}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {present.map(u => {
          const color = ROLE_COLORS[u.role] ?? '#6B7280'
          return (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ position:'relative' }}>
                <div style={{
                  width:26, height:26, borderRadius:7,
                  background: color + '25',
                  border: '1.5px solid ' + color,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:800, color,
                }}>
                  {u.username[0].toUpperCase()}
                </div>
                <div style={{
                  position:'absolute', bottom:-1, right:-1,
                  width:8, height:8, borderRadius:'50%',
                  background:'#22C55E', border:'1.5px solid var(--panel)',
                }} />
              </div>
              <span style={{ fontSize:11, color: u.isMe ? '#38BDF8' : 'var(--t2)', fontFamily:'var(--mono)', fontWeight:u.isMe?700:500 }}>
                @{u.username}{u.isMe ? ' (you)' : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
