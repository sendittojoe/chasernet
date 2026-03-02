#!/usr/bin/env node
/**
 * ChaserNet — Members Directory Patch
 * 1. Creates Members.jsx page — searchable member list with DM buttons
 * 2. Adds /app/members route to App.jsx
 * 3. Adds Members icon to NavRail + MobileBottomNav
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = '/Users/josephcurreri/Desktop/chasernet/apps/web/src'

function read(rel) {
  const p = resolve(ROOT, rel)
  if (!existsSync(p)) { console.error(`❌ Not found: ${p}`); process.exit(1) }
  return readFileSync(p, 'utf8')
}
function write(rel, content) {
  writeFileSync(resolve(ROOT, rel), content, 'utf8')
  console.log(`✅ ${rel}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MEMBERS PAGE
// ─────────────────────────────────────────────────────────────────────────────
write('pages/Members.jsx', `
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore.js'

const ROLE_COLORS = {
  owner:'#F59E0B', co_creator:'#F59E0B', admin:'#EF4444',
  moderator:'#8B5CF6', vip:'#F59E0B', verified:'#22C55E',
  contributor:'#38BDF8', member:'#6B7280', probation:'#6B7280',
}
const ROLE_LABELS = {
  owner:'OWNER', co_creator:'CO-CREATOR', admin:'ADMIN',
  moderator:'MOD', vip:'VIP ⭐', verified:'VERIFIED ✓',
  contributor:'CONTRIBUTOR', member:'MEMBER', probation:'PROBATION',
}

// Seed members — replace with real API call once backend is wired
const SEED_MEMBERS = [
  { id:'wx_mike',      username:'wx_mike',      role:'verified',    region:'Gulf Coast',     interests:['tropical','models'],         bio:'NWS-trained. 15yr chaser. Euro evangelist.',          online:true,  joinDate:'Jan 2026' },
  { id:'met_sarah',    username:'met_sarah',    role:'contributor', region:'Southeast',      interests:['severe','tropical'],          bio:'Operational met at regional TV. CAPE queen.',         online:true,  joinDate:'Jan 2026' },
  { id:'stormchaser_tx',username:'stormchaser_tx',role:'contributor',region:'Tornado Alley', interests:['severe','chasing'],          bio:'Plains chaser since 2018. 200+ tornado intercepts.',  online:false, joinDate:'Feb 2026' },
  { id:'tropics_watch',username:'tropics_watch',role:'member',      region:'Caribbean',      interests:['tropical','marine'],          bio:'Hurricane hunter wannabe. Atlantic obsessed.',        online:true,  joinDate:'Feb 2026' },
  { id:'ensemble_guy', username:'ensemble_guy', role:'member',      region:'Northeast',      interests:['models','winter'],            bio:'GEFS spaghetti is my love language.',                 online:false, joinDate:'Feb 2026' },
  { id:'ai_wx_lab',    username:'ai_wx_lab',    role:'contributor', region:'West Coast',     interests:['ai-ml','models'],             bio:'ML researcher. GraphCast vs AIFS nerd.',              online:false, joinDate:'Jan 2026' },
  { id:'winter_wx',    username:'winter_wx',    role:'member',      region:'Northeast',      interests:['winter','models'],            bio:'Snow lover. Nor\'easter or bust.',                    online:true,  joinDate:'Feb 2026' },
  { id:'numwx_nerd',   username:'numwx_nerd',   role:'contributor', region:'Central Plains', interests:['models','severe'],            bio:'NWP hobbyist. Runs local WRF on a gaming PC.',        online:false, joinDate:'Jan 2026' },
  { id:'fire_wx_dan',  username:'fire_wx_dan',  role:'member',      region:'West Coast',     interests:['fire','models'],              bio:'Red flag warnings are my jam. SoCal native.',        online:false, joinDate:'Feb 2026' },
  { id:'marine_mike',  username:'marine_mike',  role:'member',      region:'Gulf Coast',     interests:['marine','tropical'],          bio:'Offshore sailor. Swell period > wave height always.', online:true,  joinDate:'Feb 2026' },
]

const ALL_INTERESTS = ['tropical','severe','winter','fire','marine','models','ai-ml','chasing']
const ALL_REGIONS   = ['Gulf Coast','Southeast','Tornado Alley','Caribbean','Northeast','West Coast','Central Plains']

export default function Members() {
  const navigate       = useNavigate()
  const { user }       = useUserStore()
  const [search, setSearch]         = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterTag, setFilterTag]   = useState('all')
  const [filterOnline, setFilterOnline] = useState(false)

  const filtered = SEED_MEMBERS.filter(m => {
    if (m.id === user?.id) return false // don't show yourself
    if (filterOnline && !m.online) return false
    if (filterRole !== 'all' && m.role !== filterRole) return false
    if (filterTag  !== 'all' && !m.interests.includes(filterTag)) return false
    if (search) {
      const q = search.toLowerCase()
      return m.username.includes(q) || m.bio?.toLowerCase().includes(q) || m.region?.toLowerCase().includes(q)
    }
    return true
  })

  function dmUser(memberId) {
    navigate('/app/messages/' + memberId)
  }

  function viewProfile(memberId) {
    navigate('/app/profile/' + memberId)
  }

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%',
      fontFamily:'var(--mono)', background:'var(--bg)', overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding:'16px 20px 12px', borderBottom:'1px solid var(--border)',
        flexShrink:0,
      }}>
        <div style={{ fontSize:16, fontWeight:800, color:'var(--t1)', marginBottom:2 }}>
          👥 Members
        </div>
        <div style={{ fontSize:11, color:'var(--t3)' }}>
          {SEED_MEMBERS.length} members · {SEED_MEMBERS.filter(m=>m.online).length} online now
        </div>
      </div>

      {/* Filters */}
      <div style={{
        padding:'10px 20px', borderBottom:'1px solid var(--border)',
        display:'flex', gap:8, flexWrap:'wrap', flexShrink:0,
        background:'var(--panel)',
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search members..."
          style={{
            flex:1, minWidth:140, padding:'7px 12px', borderRadius:8,
            border:'1px solid var(--border)', background:'rgba(255,255,255,0.05)',
            color:'var(--t1)', fontFamily:'var(--mono)', fontSize:11, outline:'none',
          }}
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{
            padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)',
            background:'var(--card)', color:'var(--t2)', fontFamily:'var(--mono)', fontSize:11,
          }}
        >
          <option value="all">All roles</option>
          <option value="verified">Verified</option>
          <option value="contributor">Contributor</option>
          <option value="member">Member</option>
          <option value="moderator">Moderator</option>
        </select>
        <select
          value={filterTag}
          onChange={e => setFilterTag(e.target.value)}
          style={{
            padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)',
            background:'var(--card)', color:'var(--t2)', fontFamily:'var(--mono)', fontSize:11,
          }}
        >
          <option value="all">All interests</option>
          {ALL_INTERESTS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={() => setFilterOnline(p => !p)}
          style={{
            padding:'7px 12px', borderRadius:8, cursor:'pointer',
            border:'1px solid ' + (filterOnline ? '#22C55E' : 'var(--border)'),
            background: filterOnline ? 'rgba(34,197,94,0.15)' : 'var(--card)',
            color: filterOnline ? '#22C55E' : 'var(--t3)',
            fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
          }}
        >
          🟢 Online only
        </button>
      </div>

      {/* Member list */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 20px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', color:'var(--t3)', fontSize:13, padding:40 }}>
            No members match your filters.
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:10 }}>
          {filtered.map(m => {
            const color = ROLE_COLORS[m.role] ?? '#6B7280'
            return (
              <div key={m.id} style={{
                padding:'14px 16px', background:'var(--card)',
                border:'1px solid var(--border)', borderRadius:12,
                display:'flex', gap:12, alignItems:'flex-start',
                transition:'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = color + '60'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Avatar */}
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{
                    width:42, height:42, borderRadius:12,
                    background: color + '25', border:'2px solid ' + color,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:17, fontWeight:800, color,
                  }}>
                    {m.username[0].toUpperCase()}
                  </div>
                  {m.online && (
                    <div style={{
                      position:'absolute', bottom:-2, right:-2,
                      width:11, height:11, borderRadius:'50%',
                      background:'#22C55E', border:'2px solid var(--card)',
                    }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:800, color:'var(--t1)' }}>
                      @{m.username}
                    </span>
                    <span style={{
                      fontSize:8, fontWeight:800, color,
                      background: color + '20', padding:'1px 5px',
                      borderRadius:3, border:'1px solid ' + color + '40',
                    }}>
                      {ROLE_LABELS[m.role] ?? m.role.toUpperCase()}
                    </span>
                  </div>
                  {m.bio && (
                    <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.5, marginBottom:6 }}>
                      {m.bio}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                    {m.region && (
                      <span style={{
                        fontSize:9, color:'var(--t3)', background:'rgba(255,255,255,0.06)',
                        padding:'2px 6px', borderRadius:4, border:'1px solid rgba(255,255,255,0.08)',
                      }}>
                        📍 {m.region}
                      </span>
                    )}
                    {m.interests.map(i => (
                      <span key={i} style={{
                        fontSize:9, color:'var(--t3)', background:'rgba(255,255,255,0.06)',
                        padding:'2px 6px', borderRadius:4, border:'1px solid rgba(255,255,255,0.08)',
                      }}>
                        {i}
                      </span>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button
                      onClick={() => dmUser(m.id)}
                      style={{
                        padding:'5px 12px', borderRadius:7, cursor:'pointer',
                        border:'none', background:'var(--blue)',
                        color:'var(--bg)', fontFamily:'var(--mono)',
                        fontSize:10, fontWeight:800,
                      }}
                    >
                      💬 Message
                    </button>
                    <button
                      onClick={() => viewProfile(m.id)}
                      style={{
                        padding:'5px 12px', borderRadius:7, cursor:'pointer',
                        border:'1px solid var(--border)', background:'transparent',
                        color:'var(--t2)', fontFamily:'var(--mono)', fontSize:10, fontWeight:700,
                      }}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
`.trimStart())

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADD ROUTE TO App.jsx
// ─────────────────────────────────────────────────────────────────────────────
let app = read('pages/App.jsx')

if (!app.includes('Members')) {
  app = app.replace(
    `import DirectMessages  from './DirectMessages.jsx'`,
    `import DirectMessages  from './DirectMessages.jsx'\nimport Members         from './Members.jsx'`
  )
  app = app.replace(
    `<Route path="messages/:userId"        element={<DirectMessages />} />`,
    `<Route path="messages/:userId"        element={<DirectMessages />} />\n          <Route path="members"                 element={<Members />} />`
  )
  write('pages/App.jsx', app)
} else {
  console.log('⏭  App.jsx already has Members route')
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADD NAV ICON TO NavRail
// ─────────────────────────────────────────────────────────────────────────────
let nav = read('components/Nav/NavRail.jsx')

if (!nav.includes('members')) {
  // Add after the DM icon line
  nav = nav.replace(
    `<RailIcon label="Direct Messages">💬</RailIcon>`,
    `<RailIcon label="Direct Messages">💬</RailIcon>
      <RailIcon
        label="Members"
        active={location.pathname === '/app/members'}
        onClick={() => navigate('/app/members')}
      >👥</RailIcon>`
  )
  write('components/Nav/NavRail.jsx', nav)
} else {
  console.log('⏭  NavRail already has Members icon')
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADD TO MobileBottomNav
// ─────────────────────────────────────────────────────────────────────────────
let mob = read('components/Nav/MobileBottomNav.jsx')

if (!mob.includes('members')) {
  // Add members tab — replace the DM tab line to add after it
  mob = mob.replace(
    /(<.*label.*[Mm]essage.*\/>)/,
    `$1\n      <MobileTab label="Members" icon="👥" active={location.pathname==='/app/members'} onClick={()=>navigate('/app/members')} />`
  )
  write('components/Nav/MobileBottomNav.jsx', mob)
} else {
  console.log('⏭  MobileBottomNav already has Members tab')
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Members directory patch applied!

What's new:
  • /app/members — searchable member grid
  • Filter by role, interest tag, online status
  • 💬 Message button → goes straight to DM thread
  • View Profile button → goes to profile page
  • 👥 icon added to nav rail + mobile bottom nav

Next:
  cd /Users/josephcurreri/Desktop/chasernet
  npm run deploy -- --web-only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
