import { useState }    from 'react'
import { useMapStore } from '../../stores/mapStore.js'
import { useRoomStore } from '../../stores/roomStore.js'

/**
 * MapPin — the core differentiating UI component.
 *
 * Renders a clickable thumbnail that represents a pinned map state.
 * Clicking it calls teleport() on the mapStore, jumping the map
 * to exactly that model/layer/hour view.
 *
 * Used in:
 *  - Chat messages (attached by users when posting)
 *  - Forum/analysis thread listings
 *  - Discovery feed alerts
 */
export default function MapPin({ pin }) {
  const [hovered, setHovered]   = useState(false)
  const { teleport }            = useMapStore()
  const { setRightTab }         = useRoomStore()

  function handleClick() {
    teleport({
      modelA: pin.model,
      modelB: pin.modelB  ?? undefined,
      layer:  pin.layer   ?? 'wind',
      hour:   pin.hour    ?? 72,
    })
    setRightTab('models')
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginTop:  7,
        borderRadius: 8,
        overflow:   'hidden',
        cursor:     'pointer',
        border:     `1px solid ${hovered ? 'var(--blue)' : 'var(--border)'}`,
        background: 'var(--bg)',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height:     52,
        position:   'relative',
        background: 'linear-gradient(135deg, #0D1F3C 0%, #05100A 50%, #0D1F3C 100%)',
        overflow:   'hidden',
      }}>
        {/* Fake storm dot */}
        <div style={{
          position:  'absolute', left:'38%', top:'50%',
          transform: 'translate(-50%,-50%)',
          width:14, height:14, borderRadius:'50%',
          background: 'rgba(239,68,68,0.45)',
          boxShadow:  '0 0 12px rgba(239,68,68,0.6)',
          border:     '1.5px solid #EF4444',
        }}/>

        {/* Euro track line */}
        <div style={{
          position:  'absolute', top:'50%', left:'40%',
          width:50, height:2,
          background:`linear-gradient(90deg, #38BDF8 0%, transparent 100%)`,
          borderRadius:1, transform:'rotate(-8deg) translateY(-1px)',
        }}/>

        {/* GFS track line (if modelB set) */}
        {pin.modelB && (
          <div style={{
            position:  'absolute', top:'58%', left:'40%',
            width:44, height:2,
            background:`linear-gradient(90deg, #F59E0B 0%, transparent 100%)`,
            borderRadius:1, transform:'rotate(-4deg) translateY(-1px)',
            opacity:0.85,
          }}/>
        )}

        {/* Spread badge */}
        {pin.spread && (
          <div style={{ position:'absolute', top:5, right:8, fontSize:9, fontWeight:700, color:'#EF4444', fontFamily:'var(--mono)' }}>
            Δ {pin.spread}km
          </div>
        )}

        {/* Bottom meta */}
        <div style={{ position:'absolute', bottom:4, left:8, fontSize:9, color:'var(--t2)', fontFamily:'var(--mono)' }}>
          {pin.model}{pin.modelB ? ` vs ${pin.modelB}` : ''} · +{pin.hour}h · {pin.layer}
        </div>
        <div style={{
          position:'absolute', bottom:4, right:8, fontSize:9, fontFamily:'var(--mono)',
          color: hovered ? 'var(--blue)' : 'var(--t3)',
          transition:'color 0.15s',
        }}>
          {hovered ? '▶ teleport' : '📍 map pin'}
        </div>
      </div>

      {/* Label */}
      <div style={{ padding:'4px 10px', fontSize:11, color:'var(--t2)', fontFamily:'var(--sans)' }}>
        {pin.label}
      </div>
    </div>
  )
}
