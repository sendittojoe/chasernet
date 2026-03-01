import { useMapStore } from '../../stores/mapStore.js'

const LEGENDS = {
  wind: {
    label:'WIND SPEED', unit:'knots',
    stops:[
      { color:'rgb(100,200,255)', label:'Calm'  },
      { color:'rgb(56,189,248)',  label:'Light' },
      { color:'rgb(34,197,94)',   label:'Mod'   },
      { color:'rgb(234,179,8)',   label:'Fresh' },
      { color:'rgb(249,115,22)',  label:'TS'    },
      { color:'rgb(239,68,68)',   label:'Hurr'  },
    ]
  },
  temp: {
    label:'TEMPERATURE', unit:'C',
    stops:[
      { color:'rgb(56,100,248)',  label:'-10' },
      { color:'rgb(56,189,248)',  label:'0'   },
      { color:'rgb(34,197,94)',   label:'15'  },
      { color:'rgb(234,179,8)',   label:'25'  },
      { color:'rgb(249,115,22)',  label:'35'  },
      { color:'rgb(220,38,38)',   label:'40+' },
    ]
  },
  precip: {
    label:'PRECIPITATION', unit:'mm/hr',
    stops:[
      { color:'rgba(56,189,248,0.1)',  label:'None'  },
      { color:'rgba(56,189,248,0.35)', label:'Light' },
      { color:'rgba(56,189,248,0.6)',  label:'Mod'   },
      { color:'rgba(56,189,248,0.8)',  label:'Heavy' },
      { color:'rgba(56,189,248,1.0)',  label:'Ext'   },
    ]
  },
  cape: {
    label:'CAPE', unit:'J/kg',
    stops:[
      { color:'rgba(139,92,246,0.1)',  label:'None' },
      { color:'rgba(139,92,246,0.35)', label:'Low'  },
      { color:'rgba(139,92,246,0.6)',  label:'Mod'  },
      { color:'rgba(139,92,246,0.82)', label:'High' },
      { color:'rgba(139,92,246,1.0)',  label:'Ext'  },
    ]
  },
  '500mb': {
    label:'SFC PRESSURE', unit:'mb',
    stops:[
      { color:'rgb(239,68,68)',   label:'970'  },
      { color:'rgb(249,115,22)',  label:'990'  },
      { color:'rgb(234,179,8)',   label:'1000' },
      { color:'rgb(56,189,248)',  label:'1013' },
      { color:'rgb(34,197,94)',   label:'1020' },
      { color:'rgb(100,200,255)', label:'1030' },
    ]
  },
  track: {
    label:'STORM TRACK', unit:'',
    stops:[
      { color:'rgb(56,189,248)',       label:'Euro'  },
      { color:'rgb(245,158,11)',       label:'GFS'   },
      { color:'rgba(255,255,255,0.2)', label:'Cone'  },
    ]
  },
}

export default function LayerLegend() {
  const { layer, dataA } = useMapStore()
  const legend = LEGENDS[layer]
  if (!legend) return null

  return (
    <div style={{
      position:'absolute', bottom:44, left:130, zIndex:10,
      background:'rgba(8,12,22,0.82)', border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:8, padding:'8px 10px', backdropFilter:'blur(10px)',
      fontFamily:'var(--mono)', pointerEvents:'none', minWidth:130,
    }}>
      <div style={{ fontSize:8, fontWeight:800, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', marginBottom:6 }}>
        {legend.label}{legend.unit ? ' · ' + legend.unit : ''}
      </div>

      <div style={{ display:'flex', gap:0, marginBottom:4, borderRadius:3, overflow:'hidden', height:8 }}>
        {legend.stops.map((s,i) => <div key={i} style={{ flex:1, background:s.color }}/>)}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between' }}>
        {legend.stops.map((s,i) => (
          <span key={i} style={{ fontSize:7, color:'rgba(255,255,255,0.4)' }}>{s.label}</span>
        ))}
      </div>

      {dataA?.model && (
        <div style={{ marginTop:5, paddingTop:5, borderTop:'1px solid rgba(255,255,255,0.06)', fontSize:8, color:'rgba(56,189,248,0.7)', display:'flex', alignItems:'center', gap:4 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'#38BDF8', animation:'pulse 2s infinite' }}/>
          {dataA.model}
        </div>
      )}
    </div>
  )
}
