import { useState, useRef, useEffect } from 'react'
import { useUserStore } from '../stores/userStore.js'

const ROLE_COLORS = {
  owner:'#F59E0B', co_creator:'#F59E0B', admin:'#EF4444',
  moderator:'#8B5CF6', vip:'#F59E0B', verified:'#22C55E',
  contributor:'#38BDF8', member:'#6B7280', pro:'#EF4444',
  advanced:'#8B5CF6', enthusiast:'#38BDF8',
}

const MOCK_CONVOS = [
  { id:'wx_mike',       username:'wx_mike',       role:'verified',   unread:2,  lastMsg:'Agreed on the Euro track  -  see my latest analysis thread', time:'3m ago',   online:true  },
  { id:'met_sarah',     username:'met_sarah',      role:'pro',        unread:0,  lastMsg:'Thanks for the CAPE overlay tip!',                         time:'1h ago',   online:true  },
  { id:'stormchaser_tx',username:'stormchaser_tx', role:'contributor',unread:1,  lastMsg:'You coming to the Panhandle chase next week?',              time:'2h ago',   online:false },
  { id:'tropics_watch', username:'tropics_watch',  role:'enthusiast', unread:0,  lastMsg:'96W looking more organized on latest SAT IR',              time:'5h ago',   online:true  },
  { id:'ensemble_guy',  username:'ensemble_guy',   role:'member',     unread:0,  lastMsg:'That GEFS spaghetti plot was wild',                        time:'1d ago',   online:false },
]

const MOCK_MESSAGES = {
  wx_mike: [
    { id:1, from:'wx_mike',  body:'Hey, saw your post in the tropical channel. Good catch on the 850mb anomaly.',       time:'10:14 AM' },
    { id:2, from:'me',       body:'Thanks! I have been watching that for a few runs. Euro keeps insisting on it.',        time:'10:16 AM' },
    { id:3, from:'wx_mike',  body:'Agreed on the Euro track  -  see my latest analysis thread. I break down why I trust it this cycle.', time:'10:22 AM' },
    { id:4, from:'wx_mike',  body:'Also  -  are you submitting a forecast for the Beatriz battle? Window closes in 14h.', time:'10:23 AM' },
  ],
  met_sarah: [
    { id:1, from:'met_sarah', body:'Hey! Quick question  -  how do you get the CAPE overlay to show up on the 850mb level? Not seeing it.', time:'Yesterday' },
    { id:2, from:'me',        body:'Go to LAYERS > CAPE, then hit the 850 button in the LEVEL section. It should pull 850hPa CAPE from Open-Meteo.', time:'Yesterday' },
    { id:3, from:'met_sarah', body:'Thanks for the CAPE overlay tip!', time:'Yesterday' },
  ],
  stormchaser_tx: [
    { id:1, from:'stormchaser_tx', body:'You coming to the Panhandle chase next week?', time:'2h ago' },
  ],
}

export default function DirectMessages() {
  const { user } = useUserStore()
  const [activeConvo, setActiveConvo] = useState('wx_mike')
  const [messages, setMessages] = useState(MOCK_MESSAGES)
  const [input, setInput]       = useState('')
  const [search, setSearch]     = useState('')
  const bottomRef = useRef(null)

  const convos  = MOCK_CONVOS.filter(c => !search || c.username.toLowerCase().includes(search.toLowerCase()))
  const current = MOCK_CONVOS.find(c => c.id === activeConvo)
  const msgs    = messages[activeConvo] ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [activeConvo, messages])

  function send() {
    if (!input.trim()) return
    setMessages(m => ({
      ...m,
      [activeConvo]: [...(m[activeConvo] ?? []), {
        id: Date.now(), from:'me', body: input.trim(), time:'just now',
      }]
    }))
    setInput('')
  }

  return (
    <div style={{
      display:'flex', height:'100%', fontFamily:'var(--mono)',
      background:'var(--bg)', overflow:'hidden',
    }}>

      {/* -- Conversation List ------------------ */}
      <div style={{
        width:260, background:'var(--panel)',
        borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column', flexShrink:0,
      }}>
        <div style={{ padding:'14px 14px 10px' }}>
          <div style={{ fontSize:10, color:'var(--t3)', fontWeight:800, letterSpacing:'0.1em', marginBottom:10 }}>
            DIRECT MESSAGES
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            style={{
              width:'100%', padding:'7px 10px', borderRadius:7,
              border:'1px solid var(--border)',
              background:'rgba(255,255,255,0.05)', color:'var(--t1)',
              fontFamily:'var(--mono)', fontSize:11, outline:'none',
              boxSizing:'border-box',
            }}
          />
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {convos.map(c => {
            const active = activeConvo === c.id
            const color  = ROLE_COLORS[c.role] ?? '#6B7280'
            return (
              <div key={c.id} onClick={() => setActiveConvo(c.id)} style={{
                padding:'10px 14px', cursor:'pointer',
                background: active ? 'rgba(56,189,248,0.08)' : 'transparent',
                borderLeft: active ? '2px solid #38BDF8' : '2px solid transparent',
                display:'flex', gap:10, alignItems:'center',
                transition:'all 0.12s',
              }}>
                {/* Avatar */}
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{
                    width:36, height:36, borderRadius:10,
                    background: color + '25',
                    border:'1.5px solid ' + color,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, fontWeight:800, color,
                  }}>
                    {c.username[0].toUpperCase()}
                  </div>
                  {c.online && (
                    <div style={{
                      position:'absolute', bottom:-1, right:-1,
                      width:9, height:9, borderRadius:'50%',
                      background:'#22C55E', border:'2px solid var(--panel)',
                    }}/>
                  )}
                </div>
                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                    <span style={{ fontSize:12, fontWeight: c.unread ? 800 : 600, color: active ? '#38BDF8' : 'var(--t1)' }}>
                      @{c.username}
                    </span>
                    <span style={{ fontSize:9, color:'var(--t3)' }}>{c.time}</span>
                  </div>
                  <div style={{
                    fontSize:10, color:'var(--t3)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    fontWeight: c.unread ? 600 : 400,
                  }}>
                    {c.lastMsg}
                  </div>
                </div>
                {/* Unread badge */}
                {c.unread > 0 && (
                  <div style={{
                    width:16, height:16, borderRadius:'50%',
                    background:'var(--red)', fontSize:9, fontWeight:700,
                    color:'white', display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}>{c.unread}</div>
                )}
              </div>
            )
          })}

          {/* New DM button */}
          <div style={{ padding:'10px 14px' }}>
            <button style={{
              width:'100%', padding:'8px', borderRadius:7,
              border:'1px dashed rgba(255,255,255,0.15)',
              background:'transparent', color:'var(--t3)', cursor:'pointer',
              fontFamily:'var(--mono)', fontSize:11,
            }}>
              + New Message
            </button>
          </div>
        </div>
      </div>

      {/* -- Chat Window ------------------------ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        {current && (
          <div style={{
            padding:'12px 20px', borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', gap:12, flexShrink:0,
          }}>
            <div style={{ position:'relative' }}>
              <div style={{
                width:38, height:38, borderRadius:10,
                background:(ROLE_COLORS[current.role]??'#6B7280')+'25',
                border:'1.5px solid '+(ROLE_COLORS[current.role]??'#6B7280'),
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:15, fontWeight:800, color:ROLE_COLORS[current.role]??'#6B7280',
              }}>
                {current.username[0].toUpperCase()}
              </div>
              {current.online && (
                <div style={{ position:'absolute', bottom:-1, right:-1, width:10, height:10, borderRadius:'50%', background:'#22C55E', border:'2px solid var(--panel)' }}/>
              )}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)' }}>@{current.username}</div>
              <div style={{ fontSize:10, color: current.online ? '#22C55E' : 'var(--t3)' }}>
                {current.online ? '* Online' : 'o Offline'}
              </div>
            </div>
            <div style={{ flex:1 }}/>
            <button style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--t2)', cursor:'pointer', padding:'5px 10px', fontFamily:'var(--mono)', fontSize:10 }}>
              View Profile
            </button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {msgs.map((msg, i) => {
            const isMe = msg.from === 'me'
            const color = isMe ? 'var(--blue)' : (ROLE_COLORS[current?.role] ?? '#6B7280')
            const showAvatar = !isMe && (i === 0 || msgs[i-1]?.from !== msg.from)
            return (
              <div key={msg.id} style={{
                display:'flex', gap:10,
                flexDirection: isMe ? 'row-reverse' : 'row',
                alignItems:'flex-end',
              }}>
                {!isMe && (
                  <div style={{
                    width:28, height:28, borderRadius:8, flexShrink:0,
                    background: showAvatar ? color+'25' : 'transparent',
                    border: showAvatar ? '1px solid '+color : 'none',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:800, color,
                  }}>
                    {showAvatar ? current?.username[0].toUpperCase() : ''}
                  </div>
                )}
                <div style={{
                  maxWidth:'70%',
                  padding:'9px 13px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: isMe ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.06)',
                  border: isMe ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ fontSize:12, color:'var(--t1)', lineHeight:1.5 }}>{msg.body}</div>
                  <div style={{ fontSize:9, color:'var(--t3)', marginTop:4, textAlign: isMe ? 'right' : 'left' }}>{msg.time}</div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() }}}
              placeholder={'Message @' + (current?.username ?? '') + '... (Enter to send)'}
              rows={1}
              style={{
                flex:1, padding:'10px 12px', borderRadius:8,
                background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)',
                color:'var(--t1)', fontFamily:'var(--mono)', fontSize:12,
                resize:'none', outline:'none', maxHeight:120,
              }}
            />
            <button onClick={send} style={{
              padding:'10px 16px', borderRadius:8, border:'none', cursor:'pointer',
              background:'var(--blue)', color:'var(--bg)',
              fontFamily:'var(--mono)', fontWeight:800, fontSize:12, flexShrink:0,
            }}>-></button>
          </div>
        </div>
      </div>
    </div>
  )
}
