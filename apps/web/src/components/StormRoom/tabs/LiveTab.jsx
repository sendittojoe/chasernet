import { useState, useRef, useEffect } from 'react'
import { useRoomStore }  from '../../../stores/roomStore.js'
import { useUserStore }  from '../../../stores/userStore.js'
import { useChat }       from '../../../hooks/useChat.js'
import MapPin            from '../../UI/MapPin.jsx'

export default function LiveTab() {
  const { activeRoom, getRoom } = useRoomStore()
  const { user }                = useUserStore()
  const room                    = getRoom(activeRoom)

  // Real WebSocket chat
  const { messages, presence, typing, status, userCount, send, sendTyping } = useChat(activeRoom)
  const [input, setInput]       = useState('')
  const bottomRef               = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages.length])

  function handleSend() {
    if (!input.trim()) return
    const sent = send(input.trim())
    if (sent) setInput('')
  }

  function handleInput(e) {
    setInput(e.target.value)
    sendTyping()
  }

  const statusColor = status === 'connected' ? 'var(--green)' : status === 'connecting' ? '#F59E0B' : 'var(--red)'
  const statusLabel = status === 'connected' ? `${userCount} in room` : status === 'connecting' ? 'connecting…' : 'reconnecting…'

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Status bar */}
      <div style={{
        padding:'6px 12px', borderBottom:'1px solid var(--border)',
        fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)',
        display:'flex', alignItems:'center', gap:6, flexShrink:0,
      }}>
        <div style={{ width:6,height:6,borderRadius:'50%',background:statusColor }}/>
        {statusLabel}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:12 }}>
        {messages.length === 0 && (
          <div style={{ padding:'24px 0', textAlign:'center', color:'var(--t3)', fontSize:11, fontFamily:'var(--mono)' }}>
            {status === 'connected'
              ? `No messages yet in ${room?.name ?? 'this room'}. Be the first to post!`
              : 'Connecting to storm room…'}
          </div>
        )}
        {messages.map(msg => {
          // System messages (join/leave)
          if (msg.type === 'system') return (
            <div key={msg.id} style={{ textAlign:'center', fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', padding:'4px 0' }}>
              {msg.msg}
            </div>
          )

          const isOwn = msg.userId === user?.id || msg.username === user?.username
          const color = msg.avatarColor ?? msg.color ?? '#38BDF8'

          return (
            <div key={msg.id} style={{ display:'flex', gap:8, animation:'fadein 0.2s ease' }}>
              {/* Avatar */}
              <div style={{
                width:26, height:26, borderRadius:'50%', flexShrink:0,
                background:`${color}18`, border:`1.5px solid ${color}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:700, color, fontFamily:'var(--mono)',
              }}>
                {(msg.username ?? msg.user ?? '?')[0].toUpperCase()}
              </div>

              {/* Body */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', gap:6, alignItems:'baseline', marginBottom:3 }}>
                  <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'var(--mono)' }}>
                    {msg.username ?? msg.user}{isOwn ? ' (you)' : ''}
                  </span>
                  <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : msg.time ?? ''}
                  </span>
                </div>
                <span style={{ fontSize:12, color:'var(--t2)', lineHeight:1.55 }}>{msg.content ?? msg.msg}</span>
                {msg.mapPin && <MapPin pin={msg.mapPin} />}
              </div>
            </div>
          )
        })}

        {/* Typing indicators */}
        {typing.length > 0 && (
          <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', fontStyle:'italic', padding:'2px 0' }}>
            {typing.map(t => t.username).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing…
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:'8px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:8, flexShrink:0 }}>
        <input
          value={input}
          onChange={handleInput}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={status === 'connected' ? 'Message storm room…' : 'Connecting…'}
          disabled={status !== 'connected'}
          style={{ flex:1, padding:'8px 10px' }}
        />
        <button onClick={handleSend} disabled={status !== 'connected'} style={{
          padding:'8px 14px', background: status === 'connected' ? 'var(--blue)' : 'rgba(255,255,255,0.1)',
          border:'none', borderRadius:6, color:'var(--bg)', fontSize:13, fontWeight:700,
          cursor: status === 'connected' ? 'pointer' : 'default',
        }}>↑</button>
      </div>
    </div>
  )
}
