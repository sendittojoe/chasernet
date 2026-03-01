import { useMapStore } from '../../stores/mapStore.js'

export default function TimelineScrubber() {
  const { hour, setHour, modelA, modelB, split } = useMapStore()

  return (
    <div style={{
      position:  'absolute', bottom: 0, left: 0, right: 0,
      padding:   '10px 16px 14px',
      background:'linear-gradient(to top, rgba(6,10,18,0.97) 0%, transparent 100%)',
      zIndex:    10,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
        <span style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)' }}>0h</span>
        <input
          type="range" min={0} max={168} step={6} value={hour}
          onChange={e => setHour(+e.target.value)}
          style={{ flex:1 }}
        />
        <span style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)' }}>168h</span>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--blue)', fontFamily:'var(--mono)', minWidth:44 }}>
          +{hour}h
        </span>
      </div>

      {/* Model legend */}
      <div style={{ display:'flex', gap:12 }}>
        <span style={{ fontSize:9, color:'#38BDF8', fontFamily:'var(--mono)', display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:14, height:2, background:'#38BDF8', display:'inline-block', borderRadius:1 }}/>
          {modelA}
        </span>
        {split && (
          <span style={{ fontSize:9, color:'#F59E0B', fontFamily:'var(--mono)', display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:14, height:2, background:'#F59E0B', display:'inline-block', borderRadius:1, opacity:0.8 }}/>
            {modelB}
          </span>
        )}
      </div>
    </div>
  )
}
