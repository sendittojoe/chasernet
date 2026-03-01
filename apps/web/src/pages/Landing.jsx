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

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit() {
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

  function devBypass() {
    login({ id:'dev', username:'dev_user', role:'admin', avatarColor:'#38BDF8' }, 'dev-token')
    navigate('/app')
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
            <button key={m} onClick={() => setMode(m)} style={{
              flex:1, padding:'8px 0', border:'none', borderRadius:6,
              background: mode===m ? 'var(--panel)' : 'transparent',
              color:      mode===m ? 'var(--t1)' : 'var(--t3)',
              fontWeight: mode===m ? 700 : 400, fontSize:13,
            }}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', display:'block', marginBottom:4 }}>USERNAME</label>
            <input type="text" value={form.username} onChange={e => update('username', e.target.value)}
              placeholder="wx_hawk" style={{ width:'100%', padding:'10px 12px' }} />
          </div>
        )}

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', display:'block', marginBottom:4 }}>EMAIL</label>
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
            placeholder="you@example.com" style={{ width:'100%', padding:'10px 12px' }} />
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', display:'block', marginBottom:4 }}>PASSWORD</label>
          <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
            placeholder="••••••••" style={{ width:'100%', padding:'10px 12px' }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        {err && (
          <div style={{ padding:'9px 12px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)',
            borderRadius:6, color:'#EF4444', fontSize:12, marginBottom:16 }}>
            {err}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width:'100%', padding:'11px', background:'var(--blue)', border:'none',
          borderRadius:7, color:'var(--bg)', fontWeight:700, fontSize:14,
        }}>
          {loading ? 'Loading…' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>

        {import.meta.env.DEV && (
          <button onClick={devBypass} style={{
            width:'100%', marginTop:10, padding:'9px', background:'transparent',
            border:'1px dashed var(--border)', borderRadius:7,
            color:'var(--t3)', fontSize:12,
          }}>
            Dev bypass (skip auth)
          </button>
        )}
      </div>
    </div>
  )
}
