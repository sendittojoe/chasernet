import { useMapStore }    from '../../../stores/mapStore.js'
import { useModelRuns }   from '../../../hooks/useModelRuns.js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const ALL_MODELS = [
  { name:'Euro IFS',  color:'#38BDF8' },
  { name:'GFS',       color:'#F59E0B' },
  { name:'EC-AIFS',   color:'#8B5CF6' },
  { name:'HRRR',      color:'#10B981' },
  { name:'ICON',      color:'#86EFAC' },
  { name:'NAM 3km',   color:'#A78BFA' },
  { name:'CMC',       color:'#FCA5A5' },
  { name:'UKMET',     color:'#93C5FD' },
  { name:'GraphCast', color:'#22D3EE' },
  { name:'GEFS',      color:'#FB923C' },
]
const LAYERS = ['wind','temp','precip','cape','500mb','track']

const Chip = ({ label, active, color, onClick }) => (
  <button onClick={onClick} style={{
    padding:'4px 8px', borderRadius:5, fontFamily:'var(--mono)',
    fontWeight:700, fontSize:10, cursor:'pointer', margin:2,
    border:`1px solid ${active ? (color||'var(--blue)') : 'var(--border)'}`,
    background:active ? `${color||'#38BDF8'}22` : 'transparent',
    color:active ? (color||'var(--blue)') : 'var(--t2)',
    transition:'all 0.12s',
  }}>
    {label}
  </button>
)

// Fake meteogram data — Phase 2 replaces with real Open-Meteo hourly
const METRO = Array.from({length:15},(_,i)=>({
  h:`${i*12}h`,
  Euro: Math.round(115 + Math.sin(i*.4)*8  - i*.4),
  GFS:  Math.round(115 + Math.sin(i*.5+.8)*6 - i*.6),
  AIFS: Math.round(115 + Math.sin(i*.35)*9 - i*.3),
}))

export default function ModelsTab() {
  const { modelA, modelB, layer, split, spaghetti, setModelA, setModelB, setSplit, setSpaghetti, setLayer } = useMapStore()
  const { runs } = useModelRuns()

  return (
    <div style={{ flex:1, overflowY:'auto', padding:12 }}>

      {/* Model A */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, marginBottom:6, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>MODEL A</div>
        <div>{ALL_MODELS.map(m => <Chip key={m.name} label={m.name} color={m.color} active={modelA===m.name} onClick={() => setModelA(m.name)} />)}</div>
      </div>

      {/* Model B */}
      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>MODEL B</div>
          <button onClick={() => setSplit(!split)} style={{
            padding:'2px 7px', borderRadius:4, fontSize:9, fontFamily:'var(--mono)', fontWeight:700, cursor:'pointer',
            border:`1px solid ${split ? 'var(--blue)' : 'var(--border)'}`,
            background:split ? 'rgba(56,189,248,0.15)' : 'transparent',
            color:split ? 'var(--blue)' : 'var(--t3)',
          }}>
            {split ? '⊞ ON' : '⊞ OFF'}
          </button>
        </div>
        <div style={{ opacity: split ? 1 : 0.4 }}>
          {ALL_MODELS.map(m => <Chip key={m.name} label={m.name} color={m.color} active={split && modelB===m.name} onClick={() => { setModelB(m.name) }} />)}
        </div>
      </div>

      <div style={{ height:1, background:'var(--border)', margin:'8px 0 12px' }}/>

      {/* Layer */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, marginBottom:6, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>LAYER</div>
        <div>{LAYERS.map(l => <Chip key={l} label={l.toUpperCase()} active={layer===l} onClick={() => setLayer(l)} />)}</div>
      </div>

      {/* Ensemble */}
      <div style={{ marginBottom:12 }}>
        <button onClick={() => setSpaghetti(!spaghetti)} style={{
          padding:'5px 10px', borderRadius:5, fontFamily:'var(--mono)', fontWeight:700, fontSize:10, cursor:'pointer',
          border:`1px solid ${spaghetti ? 'var(--violet)' : 'var(--border)'}`,
          background:spaghetti ? 'rgba(139,92,246,0.15)' : 'transparent',
          color:spaghetti ? 'var(--violet)' : 'var(--t2)',
        }}>
          🌀 ENSEMBLE SPAGHETTI
        </button>
      </div>

      <div style={{ height:1, background:'var(--border)', margin:'8px 0 12px' }}/>

      {/* Run status */}
      <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, marginBottom:8, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>MODEL RUN STATUS</div>
      {runs.map(r => (
        <div key={r.id} style={{ display:'flex', alignItems:'center', padding:'6px 9px', borderRadius:6, background:'var(--card)', marginBottom:3 }}>
          <div style={{ width:7,height:7,borderRadius:'50%',marginRight:9,flexShrink:0,
            background:r.status==='ready' ? 'var(--green)' : 'var(--amber)',
            animation:r.status!=='ready' ? 'pulse 1.5s infinite' : 'none' }}/>
          <span style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--t1)', fontFamily:'var(--mono)' }}>{r.model}</span>
          <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', marginRight:10 }}>{r.cycle}</span>
          <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', minWidth:80, textAlign:'right' }}>{r.age}</span>
        </div>
      ))}

      <div style={{ height:1, background:'var(--border)', margin:'12px 0' }}/>

      {/* Meteogram */}
      <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, marginBottom:8, fontFamily:'var(--mono)', letterSpacing:'0.08em' }}>INTENSITY FORECAST (kt)</div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={METRO} margin={{ top:2, right:6, bottom:0, left:-16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="h" tick={{ fontSize:8, fill:'var(--t3)', fontFamily:'var(--mono)' }} />
          <YAxis tick={{ fontSize:8, fill:'var(--t3)', fontFamily:'var(--mono)' }} />
          <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:6, fontSize:10, fontFamily:'var(--mono)' }} />
          <Line type="monotone" dataKey="Euro" stroke="#38BDF8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="GFS"  stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="5 3" />
          <Line type="monotone" dataKey="AIFS" stroke="#8B5CF6" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
