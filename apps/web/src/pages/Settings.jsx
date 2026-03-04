import { useState } from 'react'
import { useUserStore } from '../stores/userStore.js'
import { useNavigate }  from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export default function Settings() {
  const { user, token, login, logout } = useUserStore()
  const navigate = useNavigate()

  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail]       = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [msg, setMsg]             = useState(null)
  const [err, setErr]             = useState(null)
  const [loading, setLoading]     = useState(false)

  async function updateProfile(e) {
    e.preventDefault()
    setMsg(null); setErr(null); setLoading(true)
    try {
      const body = {}
      if (username && username !== user?.username) body.username = username
      if (email) body.email = email
      if (Object.keys(body).length === 0) { setErr('No changes to save'); setLoading(false); return }

      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')

      // Update local user state
      if (data.user) login(data.user, token)
      setMsg('Profile updated successfully')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    setMsg(null); setErr(null)

    if (!currentPw || !newPw) { setErr('Both current and new password required'); return }
    if (newPw.length < 6) { setErr('New password must be at least 6 characters'); return }
    if (newPw !== confirmPw) { setErr('New passwords do not match'); return }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Password change failed')
      setMsg('Password changed successfully')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  const inputStyle = {
    width:'100%', padding:'10px 12px', boxSizing:'border-box',
    background:'var(--card)', border:'1px solid var(--border)',
    borderRadius:6, color:'var(--t1)', fontSize:13,
    fontFamily:'var(--sans)', outline:'none',
  }

  const labelStyle = {
    fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)',
    display:'block', marginBottom:4, letterSpacing:'0.05em',
  }

  const sectionStyle = {
    background:'var(--panel)', border:'1px solid var(--border)',
    borderRadius:12, padding:20, marginBottom:16,
  }

  return (
    <div style={{ maxWidth:500, margin:'0 auto', padding:'24px 16px' }}>
      <h1 style={{
        fontSize:20, fontWeight:800, color:'var(--t1)',
        fontFamily:'var(--mono)', marginBottom:24,
      }}>
        ⚙️ Settings
      </h1>

      {/* Status messages */}
      {msg && (
        <div style={{ padding:'9px 12px', background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)',
          borderRadius:6, color:'#22C55E', fontSize:12, marginBottom:16 }}>{msg}</div>
      )}
      {err && (
        <div style={{ padding:'9px 12px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)',
          borderRadius:6, color:'#EF4444', fontSize:12, marginBottom:16 }}>{err}</div>
      )}

      {/* Profile Section */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize:14, fontWeight:700, color:'var(--blue)', fontFamily:'var(--mono)', marginBottom:16 }}>
          PROFILE
        </h2>
        <form onSubmit={updateProfile}>
          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>USERNAME</label>
            <input type="text" name="username" autoComplete="username"
              value={username} onChange={e => setUsername(e.target.value)}
              style={inputStyle} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={labelStyle}>EMAIL</label>
            <input type="email" name="email" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Enter new email" style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} style={{
            padding:'9px 20px', background:'var(--blue)', border:'none',
            borderRadius:6, color:'var(--bg)', fontWeight:700, fontSize:12, cursor:'pointer',
          }}>
            Save Changes
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize:14, fontWeight:700, color:'var(--blue)', fontFamily:'var(--mono)', marginBottom:16 }}>
          CHANGE PASSWORD
        </h2>
        <form onSubmit={changePassword} autoComplete="off">
          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>CURRENT PASSWORD</label>
            <input type="password" name="current-password" autoComplete="current-password"
              value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              style={inputStyle} />
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>NEW PASSWORD</label>
            <input type="password" name="new-password" autoComplete="new-password"
              value={newPw} onChange={e => setNewPw(e.target.value)}
              style={inputStyle} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
            <input type="password" name="confirm-password" autoComplete="new-password"
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} style={{
            padding:'9px 20px', background:'var(--blue)', border:'none',
            borderRadius:6, color:'var(--bg)', fontWeight:700, fontSize:12, cursor:'pointer',
          }}>
            Change Password
          </button>
        </form>
      </div>

      {/* Notification Preferences */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize:14, fontWeight:700, color:'var(--blue)', fontFamily:'var(--mono)', marginBottom:16 }}>
          NOTIFICATIONS
        </h2>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <NotifToggle label="New model runs" sublabel="Get notified when GFS, Euro, etc. publish new data" defaultOn={true} />
          <NotifToggle label="Storm alerts" sublabel="NWS warnings for your tracked regions" defaultOn={true} />
          <NotifToggle label="Forum replies" sublabel="When someone replies to your posts" defaultOn={true} />
          <NotifToggle label="Direct messages" sublabel="New DMs from other chasers" defaultOn={true} />
        </div>
      </div>

      {/* Discord */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize:14, fontWeight:700, color:'#5865F2', fontFamily:'var(--mono)', marginBottom:16 }}>
          DISCORD
        </h2>
        {user?.discord_id ? (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{
                width:36, height:36, borderRadius:'50%', background:'#5865F2',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:16, color:'white', fontWeight:700,
              }}>
                {user.discord_username?.[0]?.toUpperCase() ?? 'D'}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--t1)' }}>
                  {user.discord_username ?? 'Connected'}
                </div>
                <div style={{ fontSize:10, color:'#5865F2', fontFamily:'var(--mono)' }}>
                  ✓ Discord linked
                </div>
              </div>
            </div>
            <button onClick={async () => {
              try {
                await fetch(`${API_BASE}/auth/me`, {
                  method:'PATCH',
                  headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
                  body:JSON.stringify({ discord_id:null, discord_username:null }),
                })
                login({ ...user, discord_id:null, discord_username:null }, token)
                setMsg('Discord unlinked')
              } catch { setErr('Failed to unlink') }
            }} style={{
              padding:'8px 16px', background:'rgba(88,101,242,0.12)',
              border:'1px solid rgba(88,101,242,0.3)', borderRadius:6,
              color:'#5865F2', fontWeight:600, fontSize:11, cursor:'pointer',
            }}>
              Unlink Discord
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize:12, color:'var(--t2)', marginBottom:12, lineHeight:1.5 }}>
              Link your Discord account for one-click login, storm alerts in your server,
              and two-way chat bridging between Discord and ChaserNet storm rooms.
            </p>
            <a href={`${API_BASE}/discord/oauth`} style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'9px 18px', background:'#5865F2', border:'none',
              borderRadius:6, color:'#fff', fontWeight:700, fontSize:12,
              cursor:'pointer', textDecoration:'none',
            }}>
              <svg width="16" height="12" viewBox="0 0 71 55" fill="none">
                <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.5 37.5 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.7 58.7 0 0017.9 9.1.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.7.2.2 0 01.5-.4l1.1.9a42 42 0 0035.8 0l1.1-.9a.2.2 0 01.4.4 36.3 36.3 0 01-5.5 2.7.2.2 0 00-.1.3 47.1 47.1 0 003.6 5.9.2.2 0 00.3.1 58.5 58.5 0 0018-9.1v-.1c1.4-15-2.3-28-9.8-39.6a.2.2 0 00-.1-.1zM23.7 37.3c-3.4 0-6.2-3.1-6.2-7s2.7-7 6.2-7 6.3 3.2 6.2 7-2.8 7-6.2 7zm23 0c-3.4 0-6.2-3.1-6.2-7s2.7-7 6.2-7 6.3 3.2 6.2 7-2.8 7-6.2 7z" fill="white"/>
              </svg>
              Connect Discord
            </a>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div style={{ ...sectionStyle, borderColor:'rgba(239,68,68,0.3)' }}>
        <h2 style={{ fontSize:14, fontWeight:700, color:'#EF4444', fontFamily:'var(--mono)', marginBottom:16 }}>
          ACCOUNT
        </h2>
        <button onClick={handleLogout} style={{
          padding:'9px 20px', background:'rgba(239,68,68,0.12)',
          border:'1px solid rgba(239,68,68,0.3)', borderRadius:6,
          color:'#EF4444', fontWeight:700, fontSize:12, cursor:'pointer',
        }}>
          Log Out
        </button>
      </div>
    </div>
  )
}

function NotifToggle({ label, sublabel, defaultOn }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <div>
        <div style={{ fontSize:12, color:'var(--t1)', fontWeight:600 }}>{label}</div>
        <div style={{ fontSize:10, color:'var(--t3)', marginTop:1 }}>{sublabel}</div>
      </div>
      <div onClick={() => setOn(!on)} style={{
        width:36, height:20, borderRadius:10, cursor:'pointer',
        background: on ? 'var(--blue)' : 'var(--card)',
        border:'1px solid ' + (on ? 'var(--blue)' : 'var(--border)'),
        position:'relative', transition:'all 0.15s', flexShrink:0,
      }}>
        <div style={{
          width:14, height:14, borderRadius:'50%',
          background: on ? '#fff' : 'var(--t3)',
          position:'absolute', top:2,
          left: on ? 18 : 2,
          transition:'left 0.15s',
        }} />
      </div>
    </div>
  )
}
