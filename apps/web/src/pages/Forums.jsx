import { useState, useRef, useEffect } from 'react'
import { useUserStore } from '../stores/userStore.js'
import { REGION_TAGS, INTEREST_TAGS } from '../components/UI/TagPicker.jsx'

// Channel definitions matching the spec
const CHANNELS = [
  // Public
  { id:'general',     name:'general',      cat:'PUBLIC',   emoji:'💬', desc:'Main community chat',           visibility:'public',   tag:null },
  { id:'alerts',      name:'alerts',       cat:'PUBLIC',   emoji:'🚨', desc:'Live NWS/NHC alerts',           visibility:'public',   tag:null },
  { id:'announce',    name:'announcements',cat:'PUBLIC',   emoji:'📢', desc:'ChaserNet news',                visibility:'public',   tag:null },
  // Regions
  { id:'gulf-coast',        name:'gulf-coast',        cat:'REGIONS', emoji:'🌊', desc:'Gulf Coast tracking',   visibility:'tag-gated', tag:'gulf-coast'         },
  { id:'southeast-usa',     name:'southeast-usa',     cat:'REGIONS', emoji:'🏖', desc:'Southeast weather',     visibility:'tag-gated', tag:'southeast-usa'      },
  { id:'northeast-usa',     name:'northeast-usa',     cat:'REGIONS', emoji:'🌲', desc:'Northeast weather',     visibility:'tag-gated', tag:'northeast-usa'      },
  { id:'tornado-alley',     name:'tornado-alley',     cat:'REGIONS', emoji:'🌪', desc:'Plains severe weather', visibility:'tag-gated', tag:'tornado-alley'      },
  { id:'caribbean-atlantic',name:'caribbean-atlantic',cat:'REGIONS', emoji:'🌴', desc:'Atlantic tropical basin',visibility:'tag-gated', tag:'caribbean-atlantic' },
  { id:'western-pacific',   name:'western-pacific',   cat:'REGIONS', emoji:'🌏', desc:'West Pacific tracking', visibility:'tag-gated', tag:'western-pacific'    },
  { id:'west-coast',        name:'west-coast',        cat:'REGIONS', emoji:'🌁', desc:'West Coast weather',    visibility:'tag-gated', tag:'west-coast'         },
  { id:'canada',            name:'canada',            cat:'REGIONS', emoji:'🍁', desc:'Canadian weather',      visibility:'tag-gated', tag:'canada'             },
  // Interests
  { id:'tropical',    name:'tropical',      cat:'TOPICS',  emoji:'🌀', desc:'Tropical cyclone analysis',    visibility:'tag-gated', tag:'tropical'  },
  { id:'severe',      name:'severe-wx',     cat:'TOPICS',  emoji:'⛈', desc:'Severe weather & tornadoes',   visibility:'tag-gated', tag:'severe'    },
  { id:'winter',      name:'winter-weather',cat:'TOPICS',  emoji:'❄', desc:'Snow, ice, winter storms',     visibility:'tag-gated', tag:'winter'    },
  { id:'fire',        name:'fire-weather',  cat:'TOPICS',  emoji:'🔥', desc:'Fire weather & red flag',      visibility:'tag-gated', tag:'fire'      },
  { id:'models',      name:'model-analysis',cat:'TOPICS',  emoji:'📊', desc:'Model runs and analysis',      visibility:'tag-gated', tag:'models'    },
  { id:'ai-ml',       name:'ai-ml-models',  cat:'TOPICS',  emoji:'🤖', desc:'AI/ML weather models',         visibility:'tag-gated', tag:'ai-ml'     },
  { id:'chasing',     name:'storm-chasing', cat:'TOPICS',  emoji:'📸', desc:'Field reports & chasing',      visibility:'tag-gated', tag:'chasing'   },
  { id:'marine',      name:'marine-surge',  cat:'TOPICS',  emoji:'🌊', desc:'Marine weather & surge',       visibility:'tag-gated', tag:'marine'    },
  // Role-locked
  { id:'vip-lounge',  name:'vip-lounge',    cat:'VIP',     emoji:'⭐', desc:'VIP members only',             visibility:'role-locked', role:'vip'      },
  { id:'verified',    name:'chaser-reports',cat:'VERIFIED',emoji:'✓',  desc:'Field reports from verified chasers', visibility:'role-locked', role:'verified' },
]

// Mock threads per channel
const MOCK_THREADS = {
  general: [
    { id:1, title:'Welcome to ChaserNet!', author:'wx_mike', replies:42, views:891, pinned:true, time:'2h ago', tag:'general' },
    { id:2, title:'How to use the Model Viewer', author:'stormchaser_tx', replies:18, views:234, time:'4h ago', tag:'tutorial' },
    { id:3, title:'Introduction thread — who are you?', author:'admin', replies:127, views:1840, pinned:true, time:'1d ago', tag:'intro' },
  ],
  tropical: [
    { id:4, title:'Euro vs GFS on Beatriz 96h track — significant divergence', author:'wx_mike', replies:47, views:612, pinned:true, time:'14m ago', tag:'analysis', hot:true },
    { id:5, title:'AIFS consistently east of consensus — trustworthy?', author:'met_sarah', replies:23, views:298, time:'1h ago', tag:'models' },
    { id:6, title:'96W invest — what are the odds?', author:'tropics_watch', replies:31, views:445, time:'2h ago', tag:'invest' },
    { id:7, title:'Beatriz forecast battle thread', author:'system', replies:89, views:1102, time:'6h ago', tag:'battle', hot:true },
  ],
  'model-analysis': [
    { id:8, title:'GFS vs Euro skill scores — 2025 season review', author:'numwx_nerd', replies:34, views:567, time:'3h ago', tag:'research' },
    { id:9, title:'GEFS ensemble spread on upcoming ridge pattern', author:'ensemble_guy', replies:12, views:189, time:'5h ago', tag:'ensemble' },
  ],
}

const CAT_ORDER = ['PUBLIC','REGIONS','TOPICS','VIP','VERIFIED']

export default function Forums() {
  const { user } = useUserStore()
  const [selectedChannel, setSelectedChannel] = useState('tropical')
  const [view, setView]  = useState('channels') // 'channels' | 'thread'
  const [selectedThread, setSelectedThread] = useState(null)
  const [search, setSearch] = useState('')
  const userTags = [...(user?.regionTags ?? []), ...(user?.interestTags ?? [])]

  // Determine channel access
  function getAccess(ch) {
    if (ch.visibility === 'public') return 'full'
    if (ch.visibility === 'tag-gated') return userTags.includes(ch.tag) ? 'full' : 'soft-locked'
    if (ch.visibility === 'role-locked') {
      const roleOrder = ['owner','co_creator','admin','moderator','vip','verified','contributor','member','probation']
      const required  = ch.role
      const userRole  = user?.role ?? 'member'
      if (required === 'vip' && ['owner','co_creator','admin','vip'].includes(userRole)) return 'full'
      if (required === 'verified' && ['owner','co_creator','admin','moderator','verified'].includes(userRole)) return 'full'
      return 'hard-locked'
    }
    return 'full'
  }

  const grouped = CAT_ORDER.reduce((acc, cat) => {
    const chs = CHANNELS.filter(c => c.cat === cat)
    if (chs.length) acc[cat] = chs
    return acc
  }, {})

  const threads = (MOCK_THREADS[selectedChannel] ?? []).filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  )

  const activeCh = CHANNELS.find(c => c.id === selectedChannel)

  return (
    <div style={{
      display:'flex', height:'100%', fontFamily:'var(--mono)',
      background:'var(--bg)', overflow:'hidden',
    }}>

      {/* ── Channel Sidebar ─────────────────────── */}
      <div style={{
        width:220, background:'var(--panel)',
        borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column',
        overflowY:'auto', flexShrink:0,
      }}>
        <div style={{ padding:'14px 14px 8px', fontSize:10, color:'var(--t3)', fontWeight:800, letterSpacing:'0.1em' }}>
          FORUMS
        </div>

        {Object.entries(grouped).map(([cat, chs]) => (
          <div key={cat}>
            <div style={{ padding:'10px 14px 4px', fontSize:8, color:'var(--t3)', fontWeight:800, letterSpacing:'0.12em' }}>
              {cat}
            </div>
            {chs.map(ch => {
              const access = getAccess(ch)
              const active = selectedChannel === ch.id
              const locked = access !== 'full'
              return (
                <div key={ch.id}
                  onClick={() => !locked && setSelectedChannel(ch.id)}
                  style={{
                    padding:'7px 14px', cursor: locked ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', gap:8,
                    background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
                    borderLeft: active ? '2px solid #38BDF8' : '2px solid transparent',
                    opacity: access === 'hard-locked' ? 0.3 : locked ? 0.55 : 1,
                    transition:'all 0.12s',
                  }}
                >
                  <span style={{ fontSize:13 }}>{ch.emoji}</span>
                  <span style={{
                    fontSize:11, fontWeight: active ? 700 : 500,
                    color: active ? '#38BDF8' : locked ? 'var(--t3)' : 'var(--t2)',
                    flex:1,
                  }}>
                    #{ch.name}
                  </span>
                  {access === 'soft-locked' && (
                    <span style={{ fontSize:9, color:'var(--t3)', padding:'1px 5px', borderRadius:4, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)' }}>
                      JOIN
                    </span>
                  )}
                  {access === 'hard-locked' && <span style={{ fontSize:10 }}>🔒</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Thread List ─────────────────────────── */}
      {!selectedThread ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Header */}
          <div style={{
            padding:'14px 20px', borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', gap:12, flexShrink:0,
          }}>
            <span style={{ fontSize:18 }}>{activeCh?.emoji}</span>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)' }}>#{activeCh?.name}</div>
              <div style={{ fontSize:11, color:'var(--t3)' }}>{activeCh?.desc}</div>
            </div>
            <div style={{ flex:1 }}/>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search threads..."
              style={{
                padding:'6px 12px', borderRadius:7, border:'1px solid var(--border)',
                background:'rgba(255,255,255,0.05)', color:'var(--t1)',
                fontFamily:'var(--mono)', fontSize:11, outline:'none', width:180,
              }}
            />
            <button style={{
              padding:'7px 14px', borderRadius:7, border:'none', cursor:'pointer',
              background:'var(--blue)', color:'var(--bg)',
              fontFamily:'var(--mono)', fontWeight:800, fontSize:11,
            }}>
              + New Thread
            </button>
          </div>

          {/* Thread list */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px 20px' }}>
            {threads.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--t3)', fontSize:13, padding:40 }}>
                No threads yet. Start the conversation!
              </div>
            ) : threads.map(t => (
              <div key={t.id}
                onClick={() => setSelectedThread(t)}
                style={{
                  padding:'14px 16px', background:'var(--card)',
                  border:'1px solid var(--border)', borderRadius:10,
                  marginBottom:8, cursor:'pointer',
                  borderLeft: t.hot ? '3px solid #EF4444' : t.pinned ? '3px solid #F59E0B' : '3px solid transparent',
                  transition:'all 0.15s',
                }}
              >
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      {t.pinned && <span style={{ fontSize:9, color:'#F59E0B', fontWeight:800, background:'rgba(245,158,11,0.15)', padding:'1px 5px', borderRadius:3 }}>PINNED</span>}
                      {t.hot && <span style={{ fontSize:9, color:'#EF4444', fontWeight:800, background:'rgba(239,68,68,0.15)', padding:'1px 5px', borderRadius:3 }}>🔥 HOT</span>}
                      <span style={{ fontSize:9, color:'var(--t3)', background:'rgba(255,255,255,0.06)', padding:'1px 6px', borderRadius:3, border:'1px solid rgba(255,255,255,0.08)' }}>
                        {t.tag}
                      </span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:5, lineHeight:1.4 }}>
                      {t.title}
                    </div>
                    <div style={{ display:'flex', gap:14, fontSize:10, color:'var(--t3)' }}>
                      <span>by <span style={{ color:'var(--blue)' }}>@{t.author}</span></span>
                      <span>💬 {t.replies} replies</span>
                      <span>👁 {t.views} views</span>
                      <span>{t.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ThreadView thread={selectedThread} onBack={() => setSelectedThread(null)} />
      )}
    </div>
  )
}

function ThreadView({ thread, onBack }) {
  const { user } = useUserStore()
  const [reply, setReply] = useState('')
  const [posts, setPosts] = useState([
    { id:1, author:'wx_mike', role:'verified', color:'#22C55E', time:'14m ago', body:'Euro IFS has consistently been pushing the track further east over the last 3 runs. The 12z run today is now 187km east of GFS at 96h. That kind of spread at this range is significant — means high uncertainty in the 4-5 day window.', likes:12 },
    { id:2, author:'met_sarah', role:'pro', color:'#EF4444', time:'11m ago', body:'Agreed on the spread. Worth noting AIFS is splitting the difference but trending Euro. If we see another eastward shift in the 18z run tonight that will be very telling. Bay of Campeche interaction is still the wildcard.', likes:8 },
    { id:3, author:'tropics_watch', role:'enthusiast', color:'#38BDF8', time:'8m ago', body:'What does the 850mb steering layer look like in the models? Id expect the ridge breakdown timing to be the driver here.', likes:3 },
  ])

  const ROLE_COLORS = { owner:'#F59E0B', admin:'#EF4444', moderator:'#8B5CF6', vip:'#F59E0B', verified:'#22C55E', pro:'#EF4444', advanced:'#8B5CF6', enthusiast:'#38BDF8', member:'#6B7280' }
  const ROLE_LABELS = { owner:'OWNER', admin:'ADMIN', moderator:'MOD', vip:'VIP ⭐', verified:'VERIFIED ✓', pro:'PRO', advanced:'ADV', enthusiast:'ENT', member:'MBR' }

  function sendReply() {
    if (!reply.trim()) return
    setPosts(p => [...p, {
      id: p.length+1, author: user?.username ?? 'you',
      role: user?.role ?? 'member', color: ROLE_COLORS[user?.role] ?? '#6B7280',
      time:'just now', body: reply, likes: 0,
    }])
    setReply('')
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{
        padding:'12px 20px', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:12, flexShrink:0,
      }}>
        <button onClick={onBack} style={{
          background:'none', border:'1px solid var(--border)', borderRadius:6,
          color:'var(--t2)', cursor:'pointer', padding:'5px 10px',
          fontFamily:'var(--mono)', fontSize:11,
        }}>← Back</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'var(--t1)', lineHeight:1.3 }}>{thread.title}</div>
          <div style={{ fontSize:10, color:'var(--t3)' }}>by @{thread.author} · {thread.replies} replies · {thread.views} views</div>
        </div>
        <button style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--t2)', cursor:'pointer', padding:'5px 10px', fontFamily:'var(--mono)', fontSize:11 }}>📌 Pin</button>
      </div>

      {/* Posts */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
        {posts.map(p => (
          <div key={p.id} style={{ display:'flex', gap:12 }}>
            <div style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background: p.color + '30', border:'1.5px solid ' + p.color,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:800, color: p.color,
            }}>
              {p.author[0].toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <span style={{ fontSize:12, fontWeight:800, color:'var(--t1)' }}>@{p.author}</span>
                <span style={{
                  fontSize:8, fontWeight:800, color: p.color,
                  background: p.color + '20', padding:'1px 5px', borderRadius:3,
                  border:'1px solid ' + p.color + '40',
                }}>
                  {ROLE_LABELS[p.role] ?? 'MBR'}
                </span>
                <span style={{ fontSize:10, color:'var(--t3)' }}>{p.time}</span>
              </div>
              <div style={{ fontSize:13, color:'var(--t2)', lineHeight:1.6 }}>{p.body}</div>
              <div style={{ display:'flex', gap:12, marginTop:8 }}>
                <button style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:11, fontFamily:'var(--mono)', padding:0 }}>
                  👍 {p.likes}
                </button>
                <button style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:11, fontFamily:'var(--mono)', padding:0 }}>
                  ↩ Reply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply box */}
      <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:10 }}>
          <textarea
            value={reply} onChange={e => setReply(e.target.value)}
            onKeyDown={e => e.key==='Enter' && e.metaKey && sendReply()}
            placeholder="Write a reply... (⌘+Enter to post)"
            style={{
              flex:1, padding:'10px 12px', borderRadius:8,
              background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)',
              color:'var(--t1)', fontFamily:'var(--mono)', fontSize:12,
              resize:'none', height:64, outline:'none',
            }}
          />
          <button onClick={sendReply} style={{
            padding:'0 18px', borderRadius:8, border:'none', cursor:'pointer',
            background:'var(--blue)', color:'var(--bg)',
            fontFamily:'var(--mono)', fontWeight:800, fontSize:12, flexShrink:0,
          }}>POST</button>
        </div>
      </div>
    </div>
  )
}
