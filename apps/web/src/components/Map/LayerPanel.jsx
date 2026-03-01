import { useMapStore, AVAILABLE_LAYERS } from '../../stores/mapStore.js'

export default function LayerPanel({ onClose }) {
  const { activeLayers, toggleLayer, setLayerOpacity, removeLayer, modelA, modelB, setModelA, setModelB, split, setSplit } = useMapStore()
  const MODELS = ['Euro IFS','GFS','EC-AIFS','HRRR','ICON','NAM 3km','CMC','UKMET','GraphCast','GEFS']

  return (
    <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', boxShadow:'0 16px 48px rgba(0,0,0,0.6)', fontFamily:'var(--mono)' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:10, fontWeight:800, color:'var(--t1)', letterSpacing:'0.08em' }}>LAYERS</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:16, lineHeight:1 }}>x</button>
      </div>

      {activeLayers.length > 0 && (
        <div style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
          <div style={{ padding:'2px 14px 6px', fontSize:9, color:'var(--t3)', fontWeight:700, letterSpacing:'0.1em' }}>ACTIVE</div>
          {activeLayers.map(l => {
            const def = AVAILABLE_LAYERS.find(d => d.id === l.id)
            if (!def) return null
            return (
              <div key={l.id} style={{ padding:'6px 14px', background: l.visible ? 'rgba(56,189,248,0.04)' : 'transparent' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: l.visible ? 5 : 0 }}>
                  <div onClick={() => toggleLayer(l.id)} style={{ width:14, height:14, borderRadius:3, cursor:'pointer', border:'1.5px solid '+(l.visible ? def.color : 'var(--border)'), background: l.visible ? def.color+'30' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {l.visible && <div style={{ width:6, height:6, borderRadius:1, background:def.color }}/>}
                  </div>
                  <span style={{ fontSize:13 }}>{def.emoji}</span>
                  <span style={{ fontSize:11, fontWeight:700, color: l.visible ? 'var(--t1)' : 'var(--t3)', flex:1 }}>{def.label}</span>
                  <span style={{ fontSize:9, color:'var(--t3)', minWidth:28, textAlign:'right' }}>{Math.round(l.opacity * 100)}%</span>
                  <button onClick={() => removeLayer(l.id)} style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:14, padding:0, lineHeight:1 }}>x</button>
                </div>
                {l.visible && (
                  <div style={{ paddingLeft:22 }}>
                    <input type="range" min={10} max={100} value={Math.round(l.opacity * 100)} onChange={e => setLayerOpacity(l.id, parseInt(e.target.value)/100)} style={{ width:'100%', accentColor:def.color, cursor:'pointer' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
        <div style={{ padding:'2px 14px 6px', fontSize:9, color:'var(--t3)', fontWeight:700, letterSpacing:'0.1em' }}>ADD LAYER</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, padding:'0 10px 4px' }}>
          {AVAILABLE_LAYERS.map(def => {
            const isActive = !!activeLayers.find(l => l.id === def.id)
            return (
              <div key={def.id} onClick={() => toggleLayer(def.id)} style={{ padding:'7px 10px', borderRadius:7, cursor:'pointer', border:'1px solid '+(isActive ? def.color+'60' : 'var(--border)'), background: isActive ? def.color+'15' : 'transparent', display:'flex', alignItems:'center', gap:6, transition:'all 0.12s' }}>
                <span style={{ fontSize:13 }}>{def.emoji}</span>
                <span style={{ fontSize:10, fontWeight:700, color: isActive ? def.color : 'var(--t2)' }}>{def.label}</span>
                {isActive && <span style={{ marginLeft:'auto', fontSize:9, color:def.color }}>on</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding:'10px 14px 12px' }}>
        <div style={{ fontSize:9, color:'var(--t3)', fontWeight:700, letterSpacing:'0.1em', marginBottom:8 }}>MODELS</div>
        <div style={{ display:'flex', gap:6, marginBottom:8 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:9, color:'var(--t3)', marginBottom:4 }}>PRIMARY</div>
            <select value={modelA} onChange={e => setModelA(e.target.value)} style={{ width:'100%', padding:'5px 8px', borderRadius:6, fontFamily:'var(--mono)', fontSize:11, background:'var(--card)', border:'1px solid var(--border)', color:'var(--t1)', cursor:'pointer' }}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {split && (
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:'var(--t3)', marginBottom:4 }}>COMPARE</div>
              <select value={modelB} onChange={e => setModelB(e.target.value)} style={{ width:'100%', padding:'5px 8px', borderRadius:6, fontFamily:'var(--mono)', fontSize:11, background:'var(--card)', border:'1px solid var(--border)', color:'var(--t1)', cursor:'pointer' }}>
                {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
        <button onClick={() => setSplit(!split)} style={{ width:'100%', padding:'7px', borderRadius:6, cursor:'pointer', border:'1px solid '+(split ? 'var(--blue)' : 'var(--border)'), background: split ? 'rgba(56,189,248,0.1)' : 'transparent', color: split ? 'var(--blue)' : 'var(--t3)', fontFamily:'var(--mono)', fontWeight:800, fontSize:10 }}>
          {split ? 'COMPARING MODELS' : 'COMPARE MODELS'}
        </button>
      </div>
    </div>
  )
}
