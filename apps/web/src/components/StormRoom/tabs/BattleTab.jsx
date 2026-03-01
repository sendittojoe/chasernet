import { useState }     from 'react'
import { useRoomStore } from '../../../stores/roomStore.js'
import { useUserStore } from '../../../stores/userStore.js'

const LEADERS = [
  { user:'wx_mike',     score:2847, wins:14, err:'68km', color:'#38BDF8' },
  { user:'storm_sarah', score:2701, wins:11, err:'74km', color:'#F97316' },
  { user:'data_nerd',   score:2556, wins:9,  err:'81km', color:'#8B5CF6' },
  { user:'chase_dev',   score:2421, wins:8,  err:'88km', color:'#10B981' },
  { user:'gulfcoast_wx',score:2198, wins:7,  err:'92km', color:'#F59E0B' },
]

export default function BattleTab() {
  const { activeRoom, getRoom } = useRoomStore()
  const { user }                = useUserStore()
  const room                    = getRoom(activeRoom)
  const [submitted, setSubmit]  = useState(false)
  const [form, setForm]         = useState({ lat:'', lon:'', wind:'', notes:'' })

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const valid  = form.lat && form.lon && form.wind

  async function submit() {
    // Phase 2: POST to /api/battles
    setSubmit(true)
  }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:12 }}>

      {/* Active battle banner */}
      <div style={{ padding:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--red)', marginBottom:4, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>⚔ ACTIVE BATTLE</div>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:6 }}>{room?.name ?? 'Storm'} — 72h Position &amp; Intensity</div>
        <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--t2)', fontFamily:'var(--mono)' }}>
          <span>⏱ 14h 22m</span>
          <span>👥 89 entered</span>
        </div>
        <div style={{ marginTop:8, padding:'5px 8px', background:'var(--card)', borderRadius:5, fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>
          Consensus: 22.1°N · 111.4°W
        </div>
      </div>

      {submitted ? (
        <div style={{ padding:16, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)',
          borderRadius:8, marginBottom:12, textAlign:'center' }}>
          <div style={{ fontSize:24, marginBottom:6 }}>✓</div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--green)', fontFamily:'var(--mono)' }}>Forecast Submitted</div>
          <div style={{ fontSize:11, color:'var(--t2)', marginTop:4 }}>Verifies in ~14h 22m</div>
        </div>
      ) : (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, marginBottom:10, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>YOUR FORECAST</div>

          {[['lat','Lat 72h (°N)','21.8'], ['lon','Lon 72h (°W)','111.2'], ['wind','Max Wind (kt)','105']].map(([k,lbl,ph]) => (
            <div key={k} style={{ marginBottom:8 }}>
              <div style={{ fontSize:10, color:'var(--t3)', marginBottom:3, fontFamily:'var(--mono)' }}>{lbl}</div>
              <input value={form[k]} onChange={e => update(k, e.target.value)} placeholder={ph}
                style={{ width:'100%', padding:'7px 9px', fontFamily:'var(--mono)' }} />
            </div>
          ))}

          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, color:'var(--t3)', marginBottom:3, fontFamily:'var(--mono)' }}>Reasoning (optional)</div>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
              placeholder="Why do you trust this solution?"
              style={{ width:'100%', height:64, padding:'7px 9px', resize:'none' }} />
          </div>

          <button onClick={submit} disabled={!valid} style={{
            width:'100%', padding:'9px', border:'none', borderRadius:6,
            background: valid ? 'var(--red)' : 'var(--border)',
            color:'white', fontSize:12, fontWeight:700, fontFamily:'var(--mono)', letterSpacing:'0.05em',
          }}>
            SUBMIT FORECAST ⚔
          </button>
        </div>
      )}

      <div style={{ height:1, background:'var(--border)', margin:'6px 0 12px' }}/>

      {/* Leaderboard */}
      <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, marginBottom:8, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>SEASON LEADERBOARD</div>
      {LEADERS.map((l, i) => (
        <div key={l.user} style={{ display:'flex', alignItems:'center', padding:'7px 8px', borderRadius:6, background:'var(--card)', marginBottom:3 }}>
          <span style={{ width:22, fontSize:i<3?14:12, color:['#F59E0B','#9CA3AF','#CD7F32'][i]||'var(--t3)', fontWeight:700 }}>
            {['🥇','🥈','🥉'][i] || i+1}
          </span>
          <div style={{ width:24,height:24,borderRadius:'50%',background:`${l.color}18`,border:`1.5px solid ${l.color}`,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:l.color,fontFamily:'var(--mono)',flexShrink:0 }}>
            {l.user[0].toUpperCase()}
          </div>
          <span style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--t1)', fontFamily:'var(--mono)', marginLeft:8 }}>{l.user}</span>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)', fontFamily:'var(--mono)' }}>{l.score.toLocaleString()}</div>
            <div style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)' }}>±{l.err}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
