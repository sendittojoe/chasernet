import { useMapStore } from '../../stores/mapStore.js'

const LAYERS = [
  { key:'wind',   label:'\ud83d\udca8 WIND'   },
  { key:'temp',   label:'\ud83c\udf21 TEMP'   },
  { key:'precip', label:'\ud83c\udf27 PRECIP' },
  { key:'cape',   label:'\u26a1 CAPE'   },
  { key:'500mb',  label:'\ud83d\udcca 500MB'  },
]

export default function MapQuickToggles() {
  const { layer, setLayer, split, setSplit, spaghetti, setSpaghetti,
    showRadar, setShowRadar, showSatellite, setShowSatellite,
    showSST, setShowSST, showBarbs, setShowBarbs,
    showGraticule, setShowGraticule, showCone, setShowCone,
    showShear, setShowShear } = useMapStore()

  const Btn = ({ active, onClick, label, color='var(--blue)' }) => (
    <button onClick={onClick} style={{
      padding:'3px 8px', borderRadius:5, fontFamily:'var(--mono)', fontWeight:700, fontSize:9,
      border:`1px solid ${active ? color : 'var(--border)'}`,
      background: active ? color.replace('var(--blue)','rgba(56,189,248,0.15)').replace('rgb','rgba').replace(/\)$/,active?',0.15)':'') : 'transparent',
      color: active ? color : 'var(--t2)', cursor:'pointer', letterSpacing:'0.05em', whiteSpace:'nowrap',
    }}>{label}</button>
  )

  return (
    <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'nowrap', overflowX:'auto' }}>
      {LAYERS.map(l => <Btn key={l.key} active={layer===l.key} onClick={()=>setLayer(l.key)} label={l.label} />)}
      <div style={{ width:1, height:16, background:'var(--border)', margin:'0 2px', flexShrink:0 }}/>
      <Btn active={split}     onClick={()=>setSplit(!split)}         label="\u229e COMPARE"  />
      <Btn active={spaghetti} onClick={()=>setSpaghetti(!spaghetti)} label="\ud83c\udf00 ENSEMBLE" />
      <div style={{ width:1, height:16, background:'var(--border)', margin:'0 2px', flexShrink:0 }}/>
      <Btn active={showRadar}     onClick={()=>setShowRadar(!showRadar)}         label="\ud83d\udce1 RADAR"   color="#22C55E" />
      <Btn active={showSatellite} onClick={()=>setShowSatellite(!showSatellite)} label="\ud83d\udef0 SAT IR"  color="#8B5CF6" />
      <Btn active={showSST}       onClick={()=>setShowSST(!showSST)}             label="\ud83c\udf0a SST"     color="#0EA5E9" />
      <Btn active={showBarbs}     onClick={()=>setShowBarbs(!showBarbs)}         label="\ud83d\udea9 BARBS"   />
      <Btn active={showGraticule} onClick={()=>setShowGraticule(!showGraticule)} label="\u2295 GRID"    />
      <Btn active={showCone}      onClick={()=>setShowCone(!showCone)}           label="\ud83d\udd3a CONE"    color="#F59E0B" />
      <Btn active={showShear}     onClick={()=>setShowShear(!showShear)}         label="\u2195 SHEAR"   color="#EF4444" />
    </div>
  )
}
