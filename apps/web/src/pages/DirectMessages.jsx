import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore.js'
import { useDMStore, useDirectMessages } from '../hooks/usePresence.js'

const ROLE_COLORS = {
  owner:'#F59E0B', co_creator:'#F59E0B', admin:'#EF4444',
  moderator:'#8B5CF6', vip:'#F59E0B', verified:'#22C55E',
  contributor:'#38BDF8', member:'#6B7280', pro:'#EF4444',
  advanced:'#8B5CF6', enthusiast:'#38BDF8',
}

export default function DirectMessages() {
  const { userId: routePartnerId } = useParams()
  const navigate = useNavigate()
  const { user }  = useUserStore()

  // Store state
  const conversations  = useDMStore(s => s.conversations)
  const activeMessages = useDMStore(s => s.activeMessages)
  const loading        = useDMStore(s => s.loading)

  // Active conversation
  const [activeConvo, setActiveConvo] = useState(routePartnerId ?? null)
  const [input, setInput]   = useState('')
  const [search, setSearch] = useState('')
  const bottomRef = useRef(null)

  const { fetchMessages, fetchConversations, send } = useDirectMessages(activeConvo)

  // Sync route param
  useEffect(() => {
    if (routePartnerId && routePartnerId !== activeConvo) {
      setActiveConvo(routePartnerId)
    }
  }, [routePartnerId])

  // Fetch conversations on mount
  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Fetch messages when active convo changes
  useEffect(() => {
    if (activeConvo) fetchMessages()
  }, [activeConvo, fetchMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConvo, activeMessages[activeConvo]?.length])

  const filteredConvos = conversations.filter(c =>
    !search || c.partnerUsername?.toLowerCase().includes(search.toLowerCase())
  )

  const current = conversations.find(c => c.partnerId === activeConvo)
  const msgs    = activeMessages[activeConvo] ?? []

  async function handleSend() {
    if (!input.trim()) return
    const ok = await send(input)
    if (ok) setInput('')
  }

  function selectConvo(partnerId) {
    setActiveConvo(partnerId)
    useDMStore.getState().markRead(partnerId)
    navigate('/app/messages/' + partnerId, { replace: true })
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
          {filteredConvos.length === 0 && (
            <div style={{ padding:20, textAlign:'center', color:'var(--t3)', fontSize:11 }}>
              {conversations.length === 0 ? 'No conversations yet' : 'No matches'}
            </div>
          )}

          {filteredConvos.map(c => {
            const active = activeConvo === c.partnerId
            const color  = c.partnerColor ?? ROLE_COLORS[c.partnerRole] ?? '#6B7280'
            return (
              <div key={c.partnerId} onClick={() => selectConvo(c.partnerId)} style={{
                padding:'10px 14px', cursor:'pointer',
                background: active ? 'rgba(56,189,248,0.08)' : 'transparent',
                borderLeft: active ? '2px solid #38BDF8' : '2px solid transparent',
                display:'flex', gap:10, alignItems:'center',
                transition:'all 0.12s',
              }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{
                    width:36, height:36, borderRadius:10,
                    background: color + '25',
                    border:'1.5px solid ' + color,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, fontWeight:800, color,
                  }}>
                    {(c.partnerUsername ?? '?')[0].toUpperCase()}
                  </div>
                  {c.partnerOnline && (
                    <div style={{
                      position:'absolute', bottom:-1, right:-1,
                      width:9, height:9, borderRadius:'50%',
                      background:'#22C55E', border:'2px solid var(--panel)',
                    }}/>
                  )}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                    <span style={{ fontSize:12, fontWeight: c.unread ? 800 : 600, color: active ? '#38BDF8' : 'var(--t1)' }}>
                      @{c.partnerUsername}
                    </span>
                    <span style={{ fontSize:9, color:'var(--t3)' }}>
                      {c.lastMessageAt ? timeAgo(c.lastMessageAt) : ''}
                    </span>
                  </div>
                  <div style={{
                    fontSize:10, color:'var(--t3)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    fontWeight: c.unread ? 600 : 400,
                  }}>
                    {c.lastMessage}
                  </div>
                </div>
                {c.unread > 0 && (
                  <div style={{
                    minWidth:16, height:16, borderRadius:'50%',
                    background:'var(--red)', fontSize:9, fontWeight:700,
                    color:'white', display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0, padding:'0 3px',
                  }}>{c.unread}</div>
                )}
              </div>
            )
          })}

          <div style={{ padding:'10px 14px' }}>
            <button onClick={() => navigate('/app/members')} style={{
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

        {!activeConvo && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:28, opacity:0.3 }}>💬</div>
            <div style={{ fontSize:12, color:'var(--t3)' }}>Select a conversation</div>
          </div>
        )}

        {/* Header */}
        {current && (
          <div style={{
            padding:'12px 20px', borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', gap:12, flexShrink:0,
          }}>
            <div style={{ position:'relative' }}>
              <div style={{
                width:38, height:38, borderRadius:10,
                background:(current.partnerColor ?? '#6B7280') + '25',
                border:'1.5px solid ' + (current.partnerColor ?? '#6B7280'),
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:15, fontWeight:800, color: current.partnerColor ?? '#6B7280',
              }}>
                {(current.partnerUsername ?? '?')[0].toUpperCase()}
              </div>
              {current.partnerOnline && (
                <div style={{ position:'absolute', bottom:-1, right:-1, width:10, height:10, borderRadius:'50%', background:'#22C55E', border:'2px solid var(--panel)' }}/>
              )}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)' }}>@{current.partnerUsername}</div>
              <div style={{ fontSize:10, color: current.partnerOnline ? '#22C55E' : 'var(--t3)' }}>
                {current.partnerOnline ? '● Online' : '○ Offline'}
              </div>
            </div>
            <div style={{ flex:1 }}/>
            <button
              onClick={() => navigate('/app/profile/' + current.partnerUsername)}
              style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--t2)', cursor:'pointer', padding:'5px 10px', fontFamily:'var(--mono)', fontSize:10 }}
            >
              View Profile
            </button>
          </div>
        )}

        {/* Messages */}
        {activeConvo && (
          <>
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              {loading && msgs.length === 0 && (
                <div style={{ textAlign:'center', color:'var(--t3)', fontSize:11, padding:20 }}>Loading...</div>
              )}
              {msgs.map((msg, i) => {
                const isMe = msg.from_id === user?.id
                const color = isMe ? 'var(--blue)' : (current?.partnerColor ?? '#6B7280')
                const showAvatar = !isMe && (i === 0 || msgs[i-1]?.from_id !== msg.from_id)
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
                        {showAvatar ? (msg.username ?? '?')[0].toUpperCase() : ''}
                      </div>
                    )}
                    <div style={{
                      maxWidth:'70%',
                      padding:'9px 13px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: isMe ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.06)',
                      border: isMe ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{ fontSize:12, color:'var(--t1)', lineHeight:1.5 }}>{msg.content}</div>
                      <div style={{ fontSize:9, color:'var(--t3)', marginTop:4, textAlign: isMe ? 'right' : 'left' }}>
                        {msg.created_at ? timeAgo(msg.created_at) : ''}
                      </div>
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
                  onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend() }}}
                  placeholder={'Message @' + (current?.partnerUsername ?? '') + '... (Enter to send)'}
                  rows={1}
                  style={{
                    flex:1, padding:'10px 12px', borderRadius:8,
                    background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)',
                    color:'var(--t1)', fontFamily:'var(--mono)', fontSize:12,
                    resize:'none', outline:'none', maxHeight:120, boxSizing:'border-box',
                  }}
                />
                <button onClick={handleSend} style={{
                  padding:'10px 16px', borderRadius:8, border:'none', cursor:'pointer',
                  background:'var(--blue)', color:'var(--bg)',
                  fontFamily:'var(--mono)', fontWeight:800, fontSize:12, flexShrink:0,
                }}>→</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60000)       return 'just now'
  if (diff < 3600000)     return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000)    return Math.floor(diff / 3600000) + 'h ago'
  if (diff < 604800000)   return Math.floor(diff / 86400000) + 'd ago'
  return new Date(ts).toLocaleDateString()
}
