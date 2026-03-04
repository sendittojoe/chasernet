import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore.js'
import { useState }     from 'react'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export default function Landing() {
  const navigate    = useNavigate()
  const { login }   = useUserStore()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username:'', email:'', password:'' })
  const [err,  setErr]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      login(data.user, data.token)
      navigate('/app')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    if (e) e.preventDefault()
    setErr(null)
    try {
      const res = await fetch(`${API_BASE}/auth/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      // Always show success to prevent email enumeration
      setForgotSent(true)
    } catch {
      setForgotSent(true)
    }
  }

  const inputStyle = {
    width:'100%', padding:'10px 12px', boxSizing:'border-box',
    background:'var(--card)', border:'1px solid var(--border)',
    borderRadius:6, color:'var(--t1)', fontSize:13,
    fontFamily:'var(--sans)', outline:'none',
  }

  if (forgotMode) {
    return (
      <div style={{
        minHeight:'100dvh', background:'var(--bg)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'24px', fontFamily:'var(--sans)',
      }}>
        <div style={{ width:'100%', maxWidth:400 }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:48, marginBottom:8 }}>🔑</div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--blue)', fontFamily:'var(--mono)' }}>
              RESET PASSWORD
            </h1>
            <p style={{ color:'var(--t2)', fontSize:13, marginTop:4 }}>
              Enter your email and we'll send a reset link
            </p>
          </div>

          {forgotSent ? (
            <div style={{
              padding:'16px', background:'rgba(34,197,94,0.1)',
              border:'1px solid rgba(34,197,94,0.3)', borderRadius:8,
              color:'#22C55E', fontSize:13, textAlign:'center', marginBottom:20,
            }}>
              If an account exists with that email, a reset link has been sent.
              Check your inbox.
            </div>
          ) : (
            <div onSubmit={handleForgot} style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', display:'block', marginBottom:4 }}>EMAIL</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                autoComplete="email" placeholder="you@example.com" style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleForgot()} />
              <button onClick={handleForgot} style={{
                width:'100%', padding:'11px', background:'var(--blue)', border:'none',
                borderRadius:7, color:'var(--bg)', fontWeight:700, fontSize:14, marginTop:16, cursor:'pointer',
              }}>
                Send Reset Link
              </button>
            </div>
          )}

          <button onClick={() => { setForgotMode(false); setForgotSent(false) }} style={{
            width:'100%', padding:'9px', background:'transparent',
            border:'1px solid var(--border)', borderRadius:7,
            color:'var(--t3)', fontSize:12, cursor:'pointer',
          }}>
            ← Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight:  '100dvh',
      background: 'var(--bg)',
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding:    '24px',
      fontFamily: 'var(--sans)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>⚡</div>
          <h1 style={{ fontSize:28, fontWeight:800, color:'var(--blue)', fontFamily:'var(--mono)', letterSpacing:'-0.03em' }}>
            CHASERNET
          </h1>
          <p style={{ color:'var(--t2)', fontSize:13, marginTop:4 }}>
            Real-time storm tracking &amp; weather community
          </p>
        </div>

        <div style={{ display:'flex', marginBottom:20, background:'var(--card)', borderRadius:8, padding:3 }}>
          {['login','signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(null) }} style={{
              flex:1, padding:'8px 0', border:'none', borderRadius:6, cursor:'pointer',
              background: mode===m ? 'var(--panel)' : 'transparent',
              color:      mode===m ? 'var(--t1)' : 'var(--t3)',
              fontWeight: mode===m ? 700 : 400, fontSize:13,
            }}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Using a real form element so password managers detect submission */}
        <form onSubmit={handleSubmit} autoComplete="on">

          {mode === 'signup' && (
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', display:'block', marginBottom:4 }}>USERNAME</label>
              <input type="text" name="username" autoComplete="username"
                value={form.username} onChange={e => update('username', e.target.value)}
                placeholder="wx_hawk" style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', display:'block', marginBottom:4 }}>EMAIL</label>
            <input type="email" name="email" autoComplete="email"
              value={form.email} onChange={e => update('email', e.target.value)}
              placeholder="you@example.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', display:'block', marginBottom:4 }}>PASSWORD</label>
            <input type="password" name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.password} onChange={e => update('password', e.target.value)}
              placeholder="••••••••" style={inputStyle} />
          </div>

          {mode === 'login' && (
            <div style={{ textAlign:'right', marginBottom:16 }}>
              <button type="button" onClick={() => setForgotMode(true)} style={{
                background:'none', border:'none', color:'var(--blue)',
                fontSize:11, cursor:'pointer', fontFamily:'var(--mono)',
                padding:0, textDecoration:'underline', opacity:0.8,
              }}>
                Forgot password?
              </button>
            </div>
          )}

          {mode === 'signup' && <div style={{ height:8 }} />}

          {err && (
            <div style={{ padding:'9px 12px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)',
              borderRadius:6, color:'#EF4444', fontSize:12, marginBottom:16 }}>
              {err}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'11px', background:'var(--blue)', border:'none',
            borderRadius:7, color:'var(--bg)', fontWeight:700, fontSize:14, cursor:'pointer',
          }}>
            {loading ? 'Loading…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'18px 0' }}>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
          <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>OR</span>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
        </div>

        <a href={`${API_BASE}/discord/oauth`} style={{
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          width:'100%', padding:'11px', background:'#5865F2', border:'none',
          borderRadius:7, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
          textDecoration:'none', boxSizing:'border-box',
        }}>
          <svg width="20" height="15" viewBox="0 0 71 55" fill="none">
            <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.5 37.5 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.7 58.7 0 0017.9 9.1.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.7.2.2 0 01.5-.4l1.1.9a42 42 0 0035.8 0l1.1-.9a.2.2 0 01.4.4 36.3 36.3 0 01-5.5 2.7.2.2 0 00-.1.3 47.1 47.1 0 003.6 5.9.2.2 0 00.3.1 58.5 58.5 0 0018-9.1v-.1c1.4-15-2.3-28-9.8-39.6a.2.2 0 00-.1-.1zM23.7 37.3c-3.4 0-6.2-3.1-6.2-7s2.7-7 6.2-7 6.3 3.2 6.2 7-2.8 7-6.2 7zm23 0c-3.4 0-6.2-3.1-6.2-7s2.7-7 6.2-7 6.3 3.2 6.2 7-2.8 7-6.2 7z" fill="white"/>
          </svg>
          Continue with Discord
        </a>

        {import.meta.env.DEV && (
          <button onClick={() => {
            login({ id:'dev', username:'dev_user', role:'admin', avatarColor:'#38BDF8' }, 'dev-token')
            navigate('/app')
          }} style={{
            width:'100%', marginTop:10, padding:'9px', background:'transparent',
            border:'1px dashed var(--border)', borderRadius:7,
            color:'var(--t3)', fontSize:12, cursor:'pointer',
          }}>
            Dev bypass (skip auth)
          </button>
        )}
      </div>
    </div>
  )
}
