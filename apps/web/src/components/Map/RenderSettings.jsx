import { useState } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

const COLOR_SCHEMES = [
  { key:'thermal',  label:'THERMAL',  colors:['#38BDF8','#34D399','#F59E0B','#EF4444'] },
  { key:'rainbow',  label:'RAINBOW',  colors:['#818CF8','#38BDF8','#34D399','#F59E0B','#EF4444'] },
  { key:'plasma',   label:'PLASMA',   colors:['#4C1D95','#7C3AED','#EC4899','#F97316'] },
  { key:'grayscale',label:'GRAY',     colors:['#374151','#6B7280','#9CA3AF','#E5E7EB'] },
]

export default function RenderSettings() {
  const [open, setOpen] = useState(false)
  const store = useMapStore()
  const particleDensity = store.particleDensity ?? 0.7
  const layerOpacity    = store.layerOpacity    ?? 0.8
  const colorScheme     = store.colorScheme     ?? 'thermal'
  const animSpeed       = store.animSpeed       ?? 1.0

  return (
    <>
      <button onClick={() => setOpen(!open)} style={{
        position:'absolute', bottom:44, right:10, zIndex:10,
        width:36, height:36, borderRadius:8, cursor:'pointer', fontSize:15,
        display:'flex', alignItems:'center', justifyContent:'center',
        background: open ? 'rgba(56,189,248,0.2)' : 'rgba(8,12,22,0.88)',
        border: open ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
        backdropFilter:'blur(12px)', boxShadow:'0 4px 16px rgba(0,0,0,0.4)',
        transition:'all 0.15s',
      }}>
        {open ? 'x' : 'Rdr'}
      </button>

      {open && (
        <div style={{
          position:'absolute', bottom:86, right:10, zIndex:10, width:240,
          background:'rgba(8,12,22,0.96)', border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:12, padding:'14px', backdropFilter:'blur(16px)',
          boxShadow:'0 8px 40px rgba(0,0,0,0.6)', fontFamily:'var(--mono)',
        }}>
          <div style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.5)', letterSpacing:'0.12em', marginBottom:14 }}>
            RENDER SETTINGS
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', letterSpacing:'0.08em', marginBottom:7 }}>COLOR SCHEME</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
              {COLOR_SCHEMES.map(s => (
                <button key={s.key} onClick={() => store.setColorScheme(s.key)} style={{
                  padding:'6px 8px', borderRadius:7, cursor:'pointer', border:'none',
                  background: colorScheme===s.key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                  outline: colorScheme===s.key ? '1px solid rgba(56,189,248,0.4)' : '1px solid transparent',
                  display:'flex', flexDirection:'column', gap:4, alignItems:'flex-start',
                }}>
                  <div style={{ display:'flex', gap:2 }}>
                    {s.colors.map((c,i) => <div key={i} style={{ width:10, height:10, borderRadius:2, background:c }}/>)}
                  </div>
                  <span style={{ fontSize:8, color: colorScheme===s.key ? '#38BDF8' : 'rgba(255,255,255,0.4)', fontWeight:700, letterSpacing:'0.06em' }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Slider label="LAYER OPACITY"     value={layerOpacity}     min={0.1} max={1.0}  step={0.05} display={Math.round(layerOpacity*100)+'%'}      onChange={v=>store.setLayerOpacity(v)}     color="#38BDF8" />
          <Slider label="PARTICLE DENSITY"  value={particleDensity}  min={0.1} max={1.0}  step={0.05} display={Math.round(particleDensity*100)+'%'}   onChange={v=>store.setParticleDensity(v)}  color="#A78BFA" />
          <Slider label="ANIMATION SPEED"   value={animSpeed}        min={0.25} max={3.0} step={0.25} display={animSpeed.toFixed(2)+'x'}              onChange={v=>store.setAnimSpeed(v)}        color="#34D399" />

          <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.06)', fontSize:8, color:'rgba(255,255,255,0.2)', textAlign:'center' }}>
            Settings apply immediately
          </div>
        </div>
      )}
    </>
  )
}

function Slider({ label, value, min, max, step, display, onChange, color }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:9, color:'rgba(255,255,255,0.35)', letterSpacing:'0.08em' }}>{label}</span>
        <span style={{ fontSize:9, color, fontWeight:700 }}>{display}</span>
      </div>
      <div style={{ position:'relative', height:20, display:'flex', alignItems:'center' }}>
        <div style={{ position:'absolute', height:3, left:0, right:0, borderRadius:2, background:'rgba(255,255,255,0.08)' }}/>
        <div style={{ position:'absolute', height:3, left:0, borderRadius:2, background:color, width:((value-min)/(max-min)*100)+'%', opacity:0.7 }}/>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(parseFloat(e.target.value))}
          style={{ position:'absolute', width:'100%', opacity:0, cursor:'pointer', height:20, margin:0 }}
        />
      </div>
    </div>
  )
}
