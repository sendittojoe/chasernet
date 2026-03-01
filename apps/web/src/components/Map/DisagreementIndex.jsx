import { useDisagreement } from '../../hooks/useDisagreement.js'

/**
 * DisagreementIndex — first-class UI element in the map header bar.
 * Always visible. Updates live as timeline scrubs.
 * Color-coded: green → amber → orange → red
 */
export default function DisagreementIndex() {
  const { km, level, color } = useDisagreement()

  const pct = km != null ? Math.min(100, (km / 320) * 100) : 0

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ fontSize:9, fontWeight:700, color:'var(--t3)', fontFamily:'var(--mono)', letterSpacing:'0.1em', whiteSpace:'nowrap' }}>
        MODEL SPREAD
      </span>

      {/* Progress bar */}
      <div style={{ width:80, height:4, background:'var(--card)', borderRadius:2, overflow:'hidden', flexShrink:0 }}>
        <div style={{
          height:     '100%',
          width:      `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.4s ease, background 0.4s ease',
        }}/>
      </div>

      {/* km value */}
      <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'var(--mono)', minWidth:52 }}>
        {km != null ? `${km}km` : '…'}
      </span>

      {/* Level badge */}
      <span style={{
        fontSize:    9,
        fontWeight:  700,
        color,
        fontFamily:  'var(--mono)',
        padding:     '2px 6px',
        borderRadius: 3,
        background:  `${color}22`,
        textTransform: 'uppercase',
        whiteSpace:  'nowrap',
        animation:   level === 'extreme' ? 'pulse 1s infinite' : 'none',
      }}>
        {level === 'extreme' ? '⚠ ' : ''}{level === 'loading' ? '…' : level}
      </span>
    </div>
  )
}
