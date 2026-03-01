import { useState, useRef, useEffect } from 'react'
import { useRoomStore }  from '../../../stores/roomStore.js'
import { useUserStore }  from '../../../stores/userStore.js'
import MapPin            from '../../UI/MapPin.jsx'

// Mock messages — Phase 2 replaces with real API fetch + WebSocket
const MOCK_MESSAGES = {
  'beatriz-2026': [
    { id:1, user:'wx_mike',    color:'#38BDF8', time:'2:34', msg:'Euro 12z just came in — significant westward shift at 96h. This is big.',
      pin:{ model:'Euro IFS', modelB:'GFS', layer:'wind', hour:96, spread:180, label:'Euro 12z vs GFS · 96h Track' }},
    { id:2, user:'storm_sarah',color:'#F97316', time:'2:36', msg:'GFS still holding east. Spread is 180km at 96h. Who do you trust?' },
    { id:3, user:'chase_dev',  color:'#10B981', time:'2:41', msg:'EC-AIFS agrees with Euro. Two AI models both tracking west now.',
      pin:{ model:'EC-AIFS', modelB:'GFS', layer:'wind', hour:96, spread:165, label:'AI models vs GFS · 96h' }},
    { id:4, user:'data_nerd',  color:'#8B5CF6', time:'2:45', msg:'When Euro/GFS spread >150km at 96h in EPac, Euro verifies ~61% of cases. Worth tracking.' },
    { id:5, user:'gulfcoast_wx',color:'#F59E0B',time:'2:52', msg:'CAPE environment supports the Euro solution. Deep layer shear down to 10kts in the corridor.',
      pin:{ model:'Euro IFS', modelB:null, layer:'cape', hour:48, spread:null, label:'CAPE Analysis — Euro 48h' }},
  ],
  'invest96w-2026': [
    { id:1, user:'typhoon_tom',color:'#8B5CF6', time:'1:15', msg:'GFS showing this getting organized next 48h. JTWC holding off but the environment looks favorable.' },
    { id:2, user:'wx_mike',   color:'#38BDF8', time:'1:30', msg:'ICON ensemble is more bullish on development. GFS less so.',
      pin:{ model:'ICON', modelB:'GFS', layer:'wind', hour:48, spread:null, label:'ICON vs GFS · 48h Development' }},
  ],
}

export default function LiveTab() {
  const { activeRoom, getRoom } = useRoomStore()
  const { user }                = useUserStore()
  const room                    = getRoom(activeRoom)

  const [messages, setMessages] = useState(MOCK_MESSAGES[activeRoom] ?? [])
  const [input, setInput]       = useState('')
  const bottomRef               = useRef(null)

  // Reset messages when room changes
  useEffect(() => {
    setMessages(MOCK_MESSAGES[activeRoom] ?? [])
  }, [activeRoom])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages.length])

  function send() {
    if (!input.trim()) return
    setMessages(p => [...p, {
      id:    Date.now(),
      user:  user?.username ?? 'you',
      color: user?.avatarColor ?? '#38BDF8',
      time:  new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),
      msg:   input.trim(),
    }])
    setInput('')
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* User count bar */}
      <div style={{
        padding:'6px 12px', borderBottom:'1px solid var(--border)',
        fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)',
        display:'flex', alignItems:'center', gap:6, flexShrink:0,
      }}>
        <div style={{ width:6,height:6,borderRadius:'50%',background:'var(--green)' }}/>
        {room?.users ?? 0} in room
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:12 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display:'flex', gap:8, animation:'fadein 0.2s ease' }}>
            {/* Avatar */}
            <div style={{
              width:26, height:26, borderRadius:'50%', flexShrink:0,
              background:`${msg.color}18`, border:`1.5px solid ${msg.color}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:700, color:msg.color, fontFamily:'var(--mono)',
            }}>
              {msg.user[0].toUpperCase()}
            </div>

            {/* Body */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', gap:6, alignItems:'baseline', marginBottom:3 }}>
                <span style={{ fontSize:12, fontWeight:700, color:msg.color, fontFamily:'var(--mono)' }}>{msg.user}</span>
                <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>{msg.time}</span>
              </div>
              <span style={{ fontSize:12, color:'var(--t2)', lineHeight:1.55 }}>{msg.msg}</span>
              {msg.pin && <MapPin pin={msg.pin} />}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:'8px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:8, flexShrink:0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Message storm room…"
          style={{ flex:1, padding:'8px 10px' }}
        />
        <button onClick={send} style={{
          padding:'8px 14px', background:'var(--blue)', border:'none',
          borderRadius:6, color:'var(--bg)', fontSize:13, fontWeight:700,
        }}>↑</button>
      </div>
    </div>
  )
}
