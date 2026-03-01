import { useState, useEffect } from 'react'
import { useUserStore } from '../stores/userStore.js'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

const ROLES = ['owner','admin','moderator','vip','verified','member','new']
const ROLE_COLORS = {
  owner:'#F59E0B', admin:'#EF4444', moderator:'#8B5CF6',
  vip:'#38BDF8', verified:'#10B981', member:'#6B7A9E', new:'#3A4460'
}

export default function AdminPanel() {
  const { user, authHeader } = useUserStore()
  const [tab, setTab]         = useState('users')
  const [users, setUsers]     = useState([])
  const [storms, setStorms]   = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null)

  const isAdmin = ['owner','admin'].includes(user?.role)
  if (!isAdmin) return (
    <div style={{ padding:40, color:'var(--red)', fontFamily:'var(--mono)' }}>
      ⛔ Access denied — admins only
    </div>
  )

  useEffect(() => { if (tab === 'users') fetchUsers() }, [tab])
  useEffect(() => { if (tab === 'storms') fetchStorms() }, [tab])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/users/list`, { headers: authHeader() })
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch { setUsers([]) }
    setLoading(false)
  }

  async function fetchStorms() {
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/storms`, { headers: authHeader() })
      const data = await res.json()
      setStorms(data.storms ?? [])
    } catch { setStorms([]) }
    setLoading(false)
  }

  async function updateRole(userId, role) {
    const res = await fetch(`${API_BASE}/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ role }),
    })
    if (res.ok) { setMsg(`Role updated`); fetchUsers() }
  }

  async function deleteUser(userId, username) {
    if (!confirm(`Delete user ${username}? This cannot be undone.`)) return
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE', headers: authHeader(),
    })
    if (res.ok) { setMsg(`User deleted`); fetchUsers() }
  }

  async function addStorm(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const body = Object.fromEntries(fd)
    body.wind_kt = +body.wind_kt
    body.pressure_mb = +body.pressure_mb
    body.lat = +body.lat
    body.lon = +body.lon
    const res = await fetch(`${API_BASE}/storms`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify(body),
    })
    if (res.ok) { setMsg('Storm added'); e.target.reset(); fetchStorms() }
  }

  async function deleteStorm(id) {
    if (!confirm('Remove this storm?')) return
    await fetch(`${API_BASE}/storms/${id}`, { method:'DELETE', headers: authHeader() })
    setMsg('Storm removed'); fetchStorms()
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:24, fontFamily:'var(--sans)' }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <span style={{ fontSize:20 }}>⚡</span>
          <h1 style={{ fontSize:20, fontWeight:800, color:'var(--t1)', fontFamily:'var(--mono)' }}>
            CHASERNET ADMIN
          </h1>
          <span style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>
            logged in as {user?.username}
          </span>
        </div>

        {msg && (
          <div onClick={() => setMsg(null)} style={{
            padding:'8px 14px', background:'rgba(16,185,129,0.12)',
            border:'1px solid rgba(16,185,129,0.3)', borderRadius:6,
            color:'var(--green)', fontSize:12, marginBottom:16, cursor:'pointer',
          }}>
            ✓ {msg} — click to dismiss
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
          {['users','storms','database'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:'8px 16px', border:'none', background:'transparent',
              borderBottom:`2px solid ${tab===t ? 'var(--blue)' : 'transparent'}`,
              color: tab===t ? 'var(--blue)' : 'var(--t3)',
              fontWeight:700, fontSize:11, fontFamily:'var(--mono)',
              textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer',
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <div>
            <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', marginBottom:12 }}>
              {users.length} users registered
            </div>
            {loading ? <div style={{ color:'var(--t3)' }}>Loading…</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {users.map(u => (
                  <div key={u.id} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                    background:'var(--card)', borderRadius:8, border:'1px solid var(--border)',
                  }}>
                    <div style={{
                      width:32, height:32, borderRadius:'50%', flexShrink:0,
                      background:`${u.avatar_color ?? '#38BDF8'}18`,
                      border:`1.5px solid ${u.avatar_color ?? '#38BDF8'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:700, color: u.avatar_color ?? '#38BDF8',
                      fontFamily:'var(--mono)',
                    }}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{u.username}</div>
                      <div style={{ fontSize:11, color:'var(--t3)' }}>{u.email}</div>
                    </div>
                    <select
                      value={u.role}
                      onChange={e => updateRole(u.id, e.target.value)}
                      style={{
                        background:'var(--panel)', border:`1px solid ${ROLE_COLORS[u.role] ?? 'var(--border)'}`,
                        borderRadius:5, color: ROLE_COLORS[u.role] ?? 'var(--t2)',
                        padding:'4px 8px', fontSize:11, fontFamily:'var(--mono)', fontWeight:700,
                      }}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {u.id !== user?.id && (
                      <button onClick={() => deleteUser(u.id, u.username)} style={{
                        padding:'4px 10px', background:'rgba(239,68,68,0.1)',
                        border:'1px solid rgba(239,68,68,0.3)', borderRadius:5,
                        color:'var(--red)', fontSize:11, fontFamily:'var(--mono)',
                      }}>
                        delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STORMS TAB ── */}
        {tab === 'storms' && (
          <div>
            {/* Add storm form */}
            <div style={{ padding:16, background:'var(--card)', borderRadius:10, border:'1px solid var(--border)', marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--amber)', fontFamily:'var(--mono)', marginBottom:12, letterSpacing:'0.08em' }}>
                + ADD STORM ROOM
              </div>
              <form onSubmit={addStorm}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  {[
                    ['id','Room ID (e.g. ian-2026)','ian-2026'],
                    ['name','Storm Name','Hurricane Ian'],
                    ['basin','Basin','atlantic'],
                    ['category','Category','C4'],
                    ['wind_kt','Wind (kt)','130'],
                    ['pressure_mb','Pressure (mb)','938'],
                    ['lat','Latitude','26.4'],
                    ['lon','Longitude','-82.1'],
                  ].map(([n,l,p]) => (
                    <div key={n}>
                      <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', marginBottom:3 }}>{l}</div>
                      <input name={n} placeholder={p} required style={{ width:'100%', padding:'7px 9px' }} />
                    </div>
                  ))}
                </div>
                <button type="submit" style={{
                  padding:'8px 20px', background:'var(--amber)', border:'none',
                  borderRadius:6, color:'var(--bg)', fontWeight:700, fontSize:12,
                  fontFamily:'var(--mono)',
                }}>
                  CREATE STORM ROOM
                </button>
              </form>
            </div>

            {/* Storm list */}
            {loading ? <div style={{ color:'var(--t3)' }}>Loading…</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {storms.map(s => (
                  <div key={s.id} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                    background:'var(--card)', borderRadius:8, border:'1px solid var(--border)',
                  }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{s.name}</div>
                      <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>
                        {s.category} · {s.wind_kt}kt · {s.basin} · {s.lat},{s.lon}
                      </div>
                    </div>
                    <div style={{
                      padding:'3px 8px', borderRadius:4, fontSize:10, fontFamily:'var(--mono)',
                      background: s.active ? 'rgba(16,185,129,0.12)' : 'rgba(58,68,96,0.3)',
                      color: s.active ? 'var(--green)' : 'var(--t3)',
                    }}>
                      {s.active ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                    <button onClick={() => deleteStorm(s.id)} style={{
                      padding:'4px 10px', background:'rgba(239,68,68,0.1)',
                      border:'1px solid rgba(239,68,68,0.3)', borderRadius:5,
                      color:'var(--red)', fontSize:11, fontFamily:'var(--mono)',
                    }}>
                      remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DATABASE TAB ── */}
        {tab === 'database' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { label:'D1 Database', val:'chasernet-db', note:'ec6ee472-7f7d-4d5f-aeeb-5740e3502cde' },
              { label:'KV Namespace', val:'chasernet-CHASERNET_KV', note:'1aee15e72bcf49cfa67255deb4a78707' },
              { label:'R2 Bucket', val:'chasernet-assets', note:'Object storage' },
              { label:'API Worker', val:'chasernet-api', note:'api.chasernet.com' },
              { label:'Cron Worker', val:'chasernet-cron', note:'Every 15 minutes' },
            ].map(r => (
              <div key={r.label} style={{ padding:'12px 16px', background:'var(--card)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', marginBottom:4 }}>{r.label}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', fontFamily:'var(--mono)' }}>{r.val}</div>
                <div style={{ fontSize:11, color:'var(--t2)', marginTop:2 }}>{r.note}</div>
              </div>
            ))}
            <div style={{ padding:14, background:'rgba(56,189,248,0.07)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:8 }}>
              <div style={{ fontSize:11, color:'var(--blue)', fontFamily:'var(--mono)', marginBottom:6, fontWeight:700 }}>
                DIRECT DATABASE ACCESS
              </div>
              <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.6 }}>
                Go to <strong style={{ color:'var(--t1)' }}>dash.cloudflare.com → D1 → chasernet-db → Console</strong> to run SQL queries directly against your database.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
