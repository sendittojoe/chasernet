import { useState, useCallback } from 'react'
import { useShareableUrl } from '../../hooks/useShareableUrl.js'

export default function ShareButton({ mapRef }) {
  const [copied, setCopied] = useState(false)
  const { copyShareLink } = useShareableUrl(mapRef)

  const handle = useCallback(() => {
    copyShareLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }, [copyShareLink])

  return (
    <button
      onClick={handle}
      title="Copy shareable map link"
      style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 35,
        padding: '6px 14px',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.15)',
        background: copied ? 'rgba(34,197,94,0.25)' : 'rgba(10,14,26,0.82)',
        backdropFilter: 'blur(8px)',
        color: copied ? '#22C55E' : 'rgba(255,255,255,0.7)',
        fontFamily: 'var(--mono, monospace)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s ease',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ fontSize: 13 }}>{copied ? '✓' : '🔗'}</span>
      {copied ? 'LINK COPIED' : 'SHARE MAP'}
    </button>
  )
}
