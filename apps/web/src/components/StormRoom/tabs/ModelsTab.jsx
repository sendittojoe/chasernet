import { useMapStore, ALL_MODELS, ALL_LAYERS } from '../../../stores/mapStore.js'

export default function ModelsTab() {
  const { activeModels, primaryModel, toggleModel, setPrimaryModel, modelData, layer, setLayer, spaghetti, setSpaghetti } = useMapStore()

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column', gap:14 }}>
      <section>
        <div style={{ fontSize:9, color:'var(--t3)', fontWeight:700, letterSpacing:'0.1em', marginBottom:6 }}>
          MODELS — {activeModels.length} active
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {ALL_MODELS.map(m => {
            const isActive  = activeModels.includes(m.id)
            const isPrimary = primaryModel === m.id
            const hasData   = !!modelData?.[m.id]
            return (
              <div key={m.id} onClick={() => toggleModel(m.id)} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:7, border:'1px solid '+(isActive?m.color+'50':'rgba(255,255,255,0.06)'), background:isPrimary?m.color+'18':isActive?m.color+'08':'transparent', cursor:'pointer', transition:'all 0.12s' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:hasData?'#22C55E':isActive?m.color:'rgba(255,255,255,0.15)', boxShadow:hasData?'0 0 5px #22C55E80':'none' }}/>
                <span style={{ fontSize:11, fontWeight:700, color:isActive?m.color:'var(--t3)', fontFamily:'var(--mono)', flex:1 }}>{m.short}</span>
                <span style={{ fontSize:9, color:'var(--t3)' }}>{m.source} · {m.res}</span>
                {isActive && (
                  <div onClick={e => { e.stopPropagation(); setPrimaryModel(m.id) }} style={{ fontSize:14, color:isPrimary?'#F59E0B':'rgba(255,255,255,0.18)', cursor:'pointer', padding:'0 2px' }}>★</div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ fontSize:9, color:'var(--t3)', marginTop:5, fontFamily:'var(--mono)' }}>● green = loaded · ★ = primary on map</div>
      </section>

      <section>
        <div style={{ fontSize:9, color:'var(--t3)', fontWeight:700, letterSpacing:'0.1em', marginBottom:6 }}>LAYER</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
          {ALL_LAYERS.map(l => (
            <div key={l.id} onClick={() => setLayer(l.id)} style={{ padding:'6px 8px', borderRadius:7, cursor:'pointer', border:'1px solid '+(layer===l.id?l.color+'60':'rgba(255,255,255,0.07)'), background:layer===l.id?l.color+'18':'transparent', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:14 }}>{l.emoji}</span>
              <span style={{ fontSize:10, fontWeight:700, color:layer===l.id?l.color:'var(--t2)', fontFamily:'var(--mono)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div style={{ fontSize:9, color:'var(--t3)', fontWeight:700, letterSpacing:'0.1em', marginBottom:6 }}>OPTIONS</div>
        <div onClick={() => setSpaghetti(!spaghetti)} style={{ padding:'7px 10px', borderRadius:7, cursor:'pointer', border:'1px solid '+(spaghetti?'var(--blue)':'rgba(255,255,255,0.07)'), background:spaghetti?'rgba(56,189,248,0.1)':'transparent', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:14 }}>🌀</span>
          <span style={{ fontSize:11, fontWeight:700, color:spaghetti?'var(--blue)':'var(--t2)', fontFamily:'var(--mono)' }}>Ensemble Spaghetti</span>
          {spaghetti && <span style={{ marginLeft:'auto', fontSize:9, color:'var(--blue)' }}>ON</span>}
        </div>
      </section>
    </div>
  )
}
