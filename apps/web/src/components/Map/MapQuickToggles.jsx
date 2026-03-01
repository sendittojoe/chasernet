import { useMapStore } from '../../stores/mapStore.js'

const LAYERS = [
  { key:'wind',   label:'WIND'   },
  { key:'temp',   label:'TEMP'   },
  { key:'precip', label:'PRECIP' },
  { key:'cape',   label:'CAPE'   },
  { key:'500mb',  label:'500MB'  },
]

export default function MapQuickToggles() {
  const { layer, setLayer, split, setSplit, spaghetti, setSpaghetti,
    showRadar, setShowRadar, showSatellite, setShowSatellite,
    showSST, setShowSST, showBarbs, setShowBarbs,
    showGraticule, setShowGraticule, showCone, setShowCone,
    showShear, setShowShear } = useMapStore()

  const Btn = ({ active, onClick, label, color }) => {
    const c = color ?? 'var(--blue)'
    return (
      <button onClick={onClick} style={{
        padding:'3px 10px', borderRadius:5, fontFamily:'var(--mono)', fontWeight:700, fontSize:9,
        border: active ? '1px solid '+c : '1px solid var(--border)',
        background: active ? 'rgba(56,189,248,0.15)' : 'transparent',
        color: active ? c : 'var(--t2)', cursor:'pointer', letterSpacing:'0.05em', whiteSpace:'nowrap', flexShrink:0,
      }}>{label}</button>
    )
  }

  const Sep = () => <div style={{ width:1, height:16, background:'var(--border)', margin:'0 2px', flexShrink:0 }}/>

  return (
    <div style={{ display:'flex', gap:4, alignItems:'center', overflowX:'auto', flexShrink:1 }}>
      {LAYERS.map(l => <Btn key={l.key} active={layer===l.key} onClick={()=>setLayer(l.key)} label={l.label} />)}
      <Sep/>
      <Btn active={split}     onClick={()=>setSplit(!split)}         label="COMPARE"  />
      <Btn active={spaghetti} onClick={()=>setSpaghetti(!spaghetti)} label="ENSEMBLE" />
      <Sep/>
      <Btn active={showRadar}     onClick={()=>setShowRadar(!showRadar)}         label="RADAR"   color="#22C55E" />
      <Btn active={showSatellite} onClick={()=>setShowSatellite(!showSatellite)} label="SAT IR"  color="#8B5CF6" />
      <Btn active={showSST}       onClick={()=>setShowSST(!showSST)}             label="SST"     color="#0EA5E9" />
      <Btn active={showBarbs}     onClick={()=>setShowBarbs(!showBarbs)}         label="BARBS"   />
      <Btn active={showGraticule} onClick={()=>setShowGraticule(!showGraticule)} label="GRID"    />
      <Btn active={showCone}      onClick={()=>setShowCone(!showCone)}           label="CONE"    color="#F59E0B" />
      <Btn active={showShear}     onClick={()=>setShowShear(!showShear)}         label="SHEAR"   color="#EF4444" />
    </div>
  )
}
