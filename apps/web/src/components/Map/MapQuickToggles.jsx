import { useMapStore } from '../../stores/mapStore.js'

export default function MapQuickToggles() {
  const { split, spaghetti, setSplit, setSpaghetti } = useMapStore()

  const Toggle = ({ active, onClick, label }) => (
    <button onClick={onClick} style={{
      padding:    '3px 8px',
      borderRadius: 5,
      fontFamily: 'var(--mono)',
      fontWeight: 700,
      fontSize:   9,
      border:     `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
      background: active ? 'rgba(56,189,248,0.15)' : 'transparent',
      color:      active ? 'var(--blue)' : 'var(--t2)',
      letterSpacing: '0.05em',
    }}>
      {label}
    </button>
  )

  return (
    <div style={{ display:'flex', gap:5 }}>
      <Toggle active={split}     onClick={() => setSplit(!split)}         label="⊞ COMPARE"  />
      <Toggle active={spaghetti} onClick={() => setSpaghetti(!spaghetti)} label="🌀 ENSEMBLE" />
    </div>
  )
}
