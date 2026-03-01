import { useState } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

const LAYERS = [
  { key:'none',   icon:'-', label:'NONE',   color:'#6B7280' },
  { key:'temp',   icon:'T', label:'TEMP',   color:'#F97316' },
  { key:'precip', icon:'P', label:'PRECIP', color:'#60A5FA' },
  { key:'cape',   icon:'C', label:'CAPE',   color:'#A78BFA' },
  { key:'500mb',  icon:'5', label:'500MB',  color:'#34D399' },
  { key:'track',  icon:'X', label:'TRACK',  color:'#F59E0B' },
]

const PRESSURE_LEVELS = [
  { key:'surface', label:'SFC'  },
  { key:'850',     label:'850'  },
  { key:'700',     label:'700'  },
  { key:'500',     label:'500'  },
  { key:'300',     label:'300'  },
  { key:'250',     label:'250'  },
]

const OVERLAYS = [
  { key:'showWind',      label:'WIND',   color:'#38BDF8' },
  { key:'showRadar',     label:'RADAR',  color:'#22C55E' },
  { key:'showSatellite', label:'SAT IR', color:'#A78BFA' },
  { key:'showSST',       label:'SST',    color:'#0EA5E9' },
  { key:'showBarbs',     label:'BARBS',  color:'#38BDF8' },
  { key:'showGraticule', label:'GRID',   color:'#6B7280' },
  { key:'showCone',      label:'CONE',   color:'#F59E0B' },
  { key:'showShear',     label:'SHEAR',  color:'#EF4444' },
]

const RGB = {
  '#38BDF8':'56,189,248','#F97316':'249,115,22','#60A5FA':'96,165,250',
  '#A78BFA':'167,139,250','#34D399':'52,211,153','#F59E0B':'245,158,11',
  '#22C55E':'34,197,94','#0EA5E9':'14,165,233','#6B7280':'107,114,128',
  '#EF4444':'239,68,68',
}

export default function MapLayerPanel() {
  const [expanded, setExpanded] = useState(true)
  const store = useMapStore()
  const pressureLevel = store.pressureLevel ?? 'surface'

  return (
    <div style={{
      position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
      zIndex:10, background:'rgba(8,12,22,0.9)',
      border:'1px solid rgba(255,255,255,0.08)', borderRadius:12,
      backdropFilter:'blur(12px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
      width: expanded ? 108 : 40, transition:'width 0.2s ease',
      overflow:'hidden', padding:'6px 4px',
    }}>
      <button onClick={() => setExpanded(!expanded)} style={{
        background:'none', border:'none', cursor:'pointer', padding:'4px',
        borderRadius:6, marginBottom:4, color:'rgba(255,255,255,0.3)', fontSize:10,
        fontFamily:'var(--mono)', display:'flex', alignItems:'center',
        justifyContent: expanded ? 'flex-end' : 'center', width:'100%',
      }}>{expanded ? '<' : '>'}</button>

      {expanded && <SectionLabel>LAYERS</SectionLabel>}

      {LAYERS.map(item => {
        const active = store.layer === item.key
        return (
          <button key={item.key} onClick={() => store.setLayer(item.key)} style={{
            display:'flex', alignItems:'center', gap: expanded ? 8 : 0,
            width:'100%', padding: expanded ? '7px 10px' : '8px',
            justifyContent: expanded ? 'flex-start' : 'center',
            borderRadius:7, border:'none', cursor:'pointer',
            background: active ? 'rgba('+RGB[item.color]+',0.18)' : 'transparent',
          }}>
            <span style={{ fontSize:11, fontWeight:900, fontFamily:'var(--mono)', color: active ? item.color : 'rgba(255,255,255,0.4)', flexShrink:0, width:14, textAlign:'center' }}>{item.icon}</span>
            {expanded && <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', fontFamily:'var(--mono)', color: active ? item.color : 'rgba(255,255,255,0.5)' }}>{item.label}</span>}
            {active && <div style={{ marginLeft:'auto', width:3, height:16, borderRadius:2, background:item.color, flexShrink:0, boxShadow:'0 0 6px '+item.color }}/>}
          </button>
        )
      })}

      <div style={{ height:1, background:'rgba(255,255,255,0.07)', margin:'6px 8px' }}/>
      {expanded && <SectionLabel>OVERLAYS</SectionLabel>}

      {OVERLAYS.map(item => {
        const active = store[item.key]
        const cap = item.key.charAt(0).toUpperCase()+item.key.slice(1)
        return (
          <button key={item.key} onClick={() => store['set'+cap](!active)} style={{
            display:'flex', alignItems:'center', gap: expanded ? 8 : 0,
            width:'100%', padding: expanded ? '6px 10px' : '7px',
            justifyContent: expanded ? 'flex-start' : 'center',
            borderRadius:7, border:'none', cursor:'pointer', opacity: active ? 1 : 0.5,
            background: active ? 'rgba('+RGB[item.color]+',0.15)' : 'transparent',
          }}>
            <div style={{ width:6, height:6, borderRadius:1, background: active ? item.color : 'rgba(255,255,255,0.3)', flexShrink:0 }}/>
            {expanded && <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', fontFamily:'var(--mono)', color: active ? item.color : 'rgba(255,255,255,0.45)' }}>{item.label}</span>}
            {active && expanded && <span style={{ marginLeft:'auto', fontSize:8, color:item.color, fontFamily:'var(--mono)', fontWeight:800 }}>ON</span>}
          </button>
        )
      })}

      <div style={{ height:1, background:'rgba(255,255,255,0.07)', margin:'6px 8px' }}/>

      <div style={{ height:1, background:'rgba(255,255,255,0.07)', margin:'6px 8px' }}/>
      {expanded && <SectionLabel>LEVEL</SectionLabel>}
      {PRESSURE_LEVELS.map(pl => {
        const active = pressureLevel === pl.key
        return (
          <button key={pl.key} onClick={() => store.setPressureLevel(pl.key)} style={{
            display:'flex', alignItems:'center', gap: expanded ? 8 : 0,
            width:'100%', padding: expanded ? '6px 10px' : '7px',
            justifyContent: expanded ? 'flex-start' : 'center',
            borderRadius:7, border:'none', cursor:'pointer',
            background: active ? 'rgba(245,158,11,0.18)' : 'transparent',
            opacity: active ? 1 : 0.55,
          }}>
            <div style={{ width:6, height:6, borderRadius:1, background: active ? '#F59E0B' : 'rgba(255,255,255,0.3)', flexShrink:0 }}/>
            {expanded && <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', fontFamily:'var(--mono)', color: active ? '#F59E0B' : 'rgba(255,255,255,0.45)' }}>{pl.label}</span>}
            {active && expanded && <span style={{ marginLeft:'auto', fontSize:8, color:'#F59E0B', fontFamily:'var(--mono)', fontWeight:800 }}>ON</span>}
          </button>
        )
      })}

      <div style={{ height:1, background:'rgba(255,255,255,0.07)', margin:'6px 8px' }}/>

      {[{key:'split',label:'COMPARE',set:'setSplit'},{key:'spaghetti',label:'ENSEMBLE',set:'setSpaghetti'}].map(({key,label,set}) => {
        const active = store[key]
        return (
          <button key={key} onClick={() => store[set](!active)} style={{
            display:'flex', alignItems:'center', gap: expanded ? 8 : 0,
            width:'100%', padding: expanded ? '6px 10px' : '7px',
            justifyContent: expanded ? 'flex-start' : 'center',
            borderRadius:7, border:'none', cursor:'pointer', opacity: active ? 1 : 0.5,
            background: active ? 'rgba(56,189,248,0.15)' : 'transparent',
          }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background: active ? '#38BDF8' : 'rgba(255,255,255,0.3)', flexShrink:0 }}/>
            {expanded && <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', fontFamily:'var(--mono)', color: active ? '#38BDF8' : 'rgba(255,255,255,0.45)' }}>{label}</span>}
          </button>
        )
      })}
    </div>
  )
}

function SectionLabel({ children }) {
  return <div style={{ padding:'2px 10px 4px', fontSize:8, color:'rgba(255,255,255,0.25)', fontFamily:'var(--mono)', letterSpacing:'0.1em' }}>{children}</div>
}
