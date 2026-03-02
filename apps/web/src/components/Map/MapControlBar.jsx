import { useState, useEffect } from 'react'
import { useModelFreshness } from '../../hooks/useModelFreshness.js'
import { useMapStore, ALL_MODELS, ALL_LAYERS } from '../../stores/mapStore.js'

export default function MapControlBar() {
  const [tab, setTab]           = useState('layers')
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{ position:'absolute',bottom:0,left:0,right:0,zIndex:15, background:'linear-gradient(to top, rgba(6,10,18,0.98) 0%, rgba(6,10,18,0.88) 85%, transparent 100%)', backdropFilter:'blur(6px)' }}>
      <div style={{ display:'flex',alignItems:'center',padding:'0 10px',borderTop:'1px solid rgba(255,255,255,0.07)',gap:2 }}>
        {[['layers','⊞ Layers'],['models','📡 Models'],['timeline','⏱ Timeline']].map(([t,label]) => (
          <button key={t} onClick={()=>{setTab(t);setExpanded(true)}} style={{ padding:'8px 12px',background:'none',border:'none', borderTop:tab===t&&expanded?'2px solid var(--blue)':'2px solid transparent', color:tab===t&&expanded?'var(--blue)':'var(--t3)', fontFamily:'var(--mono)',fontWeight:800,fontSize:10,cursor:'pointer',letterSpacing:'0.07em',transition:'all 0.15s' }}>
            {label}
          </button>
        ))}
        <div style={{flex:1}}/>
        <ActiveBadges />
        <button onClick={()=>setExpanded(p=>!p)} style={{ background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:13,padding:'4px 8px' }}>
          {expanded?'▼':'▲'}
        </button>
      </div>
      {expanded && (
        <div style={{maxHeight:'40vh',overflowY:'auto'}}>
          {tab==='layers'   && <LayersPanel />}
          {tab==='models'   && <ModelsPanel />}
          {tab==='timeline' && <TimelinePanel />}
        </div>
      )}
    </div>
  )
}

function ActiveBadges() {
  const { activeLayers } = useMapStore()
  return (
    <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap',maxWidth:300}}>
      {activeLayers.filter(l=>l.visible).map(l => {
        const d = ALL_LAYERS.find(x=>x.id===l.id)
        return d ? <span key={l.id} style={{ fontSize:9,fontWeight:800,color:d.color,background:d.color+'20',border:'1px solid '+d.color+'40',borderRadius:10,padding:'2px 7px',fontFamily:'var(--mono)' }}>{d.emoji} {d.label}</span> : null
      })}
    </div>
  )
}

function LayersPanel() {
  const { activeLayers, toggleLayer, setLayerOpacity, removeLayer } = useMapStore()
  return (
    <div style={{padding:'8px 0 12px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(115px,1fr))',gap:6,padding:'0 12px 10px'}}>
        {ALL_LAYERS.map(def => {
          const active = activeLayers.find(l=>l.id===def.id)
          const isOn   = active?.visible
          return (
            <div key={def.id} onClick={()=>toggleLayer(def.id)} style={{ padding:'8px 10px',borderRadius:8,cursor:'pointer', border:'1px solid '+(isOn?def.color+'70':'rgba(255,255,255,0.08)'), background:isOn?def.color+'18':'rgba(255,255,255,0.03)', display:'flex',alignItems:'center',gap:8,transition:'all 0.12s' }}>
              <span style={{fontSize:18}}>{def.emoji}</span>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:isOn?def.color:'var(--t2)',fontFamily:'var(--mono)'}}>{def.label}</div>
                {isOn&&active&&<div style={{fontSize:9,color:'var(--t3)',marginTop:1}}>{Math.round(active.opacity*100)}%</div>}
              </div>
              {isOn&&<div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:def.color}}/>}
            </div>
          )
        })}
      </div>
      {activeLayers.filter(l=>l.visible).length>0&&(
        <div style={{padding:'0 12px',borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:8}}>
          <div style={{fontSize:9,color:'var(--t3)',fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>OPACITY</div>
          {activeLayers.filter(l=>l.visible).map(l=>{
            const d=ALL_LAYERS.find(x=>x.id===l.id)
            if(!d)return null
            return (
              <div key={l.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:5}}>
                <span style={{fontSize:12}}>{d.emoji}</span>
                <span style={{fontSize:10,color:d.color,fontFamily:'var(--mono)',minWidth:50}}>{d.label}</span>
                <input type="range" min={10} max={100} value={Math.round(l.opacity*100)} onChange={e=>setLayerOpacity(l.id,parseInt(e.target.value)/100)} style={{flex:1,accentColor:d.color,cursor:'pointer'}}/>
                <span style={{fontSize:10,color:'var(--t3)',fontFamily:'var(--mono)',minWidth:28,textAlign:'right'}}>{Math.round(l.opacity*100)}%</span>
                <button onClick={e=>{e.stopPropagation();removeLayer(l.id)}} style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:14,padding:'0 2px',lineHeight:1}}>×</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ModelsPanel() {
  const freshness = useModelFreshness(['gfs','ecmwf','hrrr','nam','icon','gefs','cmc','aifs'])
  const { activeModels, primaryModel, toggleModel, setPrimaryModel, modelData } = useMapStore()
  return (
    <div style={{padding:'8px 12px 14px'}}>
      <div style={{fontSize:9,color:'var(--t3)',fontWeight:700,letterSpacing:'0.1em',marginBottom:8}}>
        {activeModels.length} MODEL{activeModels.length!==1?'S':''} ACTIVE — click to toggle · ★ to set primary
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:6}}>
        {ALL_MODELS.map(m=>{
          const isActive  = activeModels.includes(m.id)
          const isPrimary = primaryModel===m.id
          const hasData   = !!modelData?.[m.id]
          return (
            <div key={m.id} style={{ padding:'8px 10px',borderRadius:8,cursor:'pointer', border:'1px solid '+(isActive?m.color+'70':'rgba(255,255,255,0.07)'), background:isPrimary?m.color+'22':isActive?m.color+'0e':'rgba(255,255,255,0.02)', transition:'all 0.12s' }}>
              <div style={{display:'flex',alignItems:'center',gap:7}} onClick={()=>toggleModel(m.id)}>
                <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0, background:hasData?'#22C55E':isActive?m.color:'rgba(255,255,255,0.15)', boxShadow:hasData?'0 0 6px #22C55E80':'none'}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:800,color:isActive?m.color:'var(--t3)',fontFamily:'var(--mono)'}}>{m.short}</div>
                  <div style={{fontSize:9,color:'var(--t3)'}}>{m.source} · {m.res}</div>
                </div>
                {isActive&&(
                  <div onClick={e=>{e.stopPropagation();setPrimaryModel(m.id)}} title="Set primary" style={{fontSize:15,color:isPrimary?'#F59E0B':'rgba(255,255,255,0.18)',cursor:'pointer',lineHeight:1,padding:'0 2px'}}>★</div>
                )}
              </div>
              {isPrimary&&<div style={{marginTop:3,fontSize:8,color:m.color,fontFamily:'var(--mono)',fontWeight:700,letterSpacing:'0.08em'}}>PRIMARY</div>}
            </div>
          )
        })}
      </div>
      <div style={{marginTop:8,fontSize:9,color:'var(--t3)',fontFamily:'var(--mono)'}}>● green = data loaded · ★ = primary shown on map</div>
    </div>
  )
}

function TimelinePanel() {
  const { hour, setHour, playing, setPlaying, activeModels, primaryModel } = useMapStore()
  const modelDef = ALL_MODELS.find(m=>m.id===primaryModel)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => useMapStore.getState().tickHour(), 400)
    return () => clearInterval(id)
  }, [playing])
  return (
    <div style={{padding:'10px 14px 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
        <button onClick={()=>setPlaying(!playing)} style={{ width:36,height:36,borderRadius:'50%',border:'1px solid var(--border)', background:playing?'var(--blue)':'transparent',color:playing?'var(--bg)':'var(--t2)', cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          {playing?'⏸':'▶'}
        </button>
        <div style={{flex:1}}>
          <input type="range" min={0} max={168} step={6} value={hour} onChange={e=>setHour(+e.target.value)} style={{width:'100%',accentColor:modelDef?.color??'var(--blue)',cursor:'pointer'}}/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
            {[0,24,48,72,96,120,144,168].map(h=>(
              <span key={h} onClick={()=>setHour(h)} style={{fontSize:8,color:h===hour?'var(--blue)':'var(--t3)',fontFamily:'var(--mono)',cursor:'pointer',fontWeight:h===hour?800:400}}>{h}h</span>
            ))}
          </div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <div style={{fontSize:20,fontWeight:800,color:modelDef?.color??'var(--blue)',fontFamily:'var(--mono)'}}>+{hour}h</div>
          <div style={{fontSize:9,color:'var(--t3)',fontFamily:'var(--mono)'}}>{hour<24?'Day 1':`Day ${Math.ceil(hour/24)}`}</div>
        </div>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
        {activeModels.map(id=>{
          const m=ALL_MODELS.find(x=>x.id===id)
          return m?<span key={id} style={{fontSize:9,fontFamily:'var(--mono)',fontWeight:700,display:'flex',alignItems:'center',gap:5,color:m.color}}><span style={{width:18,height:2,background:m.color,display:'inline-block',borderRadius:1}}/>{m.short}{id===primaryModel&&<span style={{color:'#F59E0B'}}>★</span>}</span>:null
        })}
      </div>
    </div>
  )
}
