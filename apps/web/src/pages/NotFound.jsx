import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', color: 'var(--t2)', gap: 12 }}>
      <div style={{ fontSize: 48 }}>🌀</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--t1)' }}>Page not found</div>
      <Link to="/" style={{ fontSize: 12, color: 'var(--blue)' }}>← Back to ChaserNet</Link>
    </div>
  )
}
