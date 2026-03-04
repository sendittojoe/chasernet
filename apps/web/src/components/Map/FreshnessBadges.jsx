import { useModelFreshness } from '../../hooks/useModelFreshness.js'
import { useMapStore } from '../../stores/mapStore.js'

const MODEL_LABELS = {
  ecmwf:'Euro IFS', gfs:'GFS', hrrr:'HRRR', nam:'NAM',
  icon:'ICON', gefs:'GEFS', cmc:'CMC', aifs:'AIFS',
}

export default function FreshnessBadges() {
  const { activeModels, primaryModel } = useMapStore()
  const models = activeModels?.length ? activeModels : [primaryModel ?? 'ecmwf']
  const freshness = useModelFreshness(models)

  if (!models.length) return null

  return (
    <div style={{
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      padding: '4px 0',
      justifyContent: 'flex-end',
    }}>
      {models.map(m => {
        const f = freshness[m]
        if (!f) return null
        const isPrimary = m === primaryModel
        return (
          <div key={m} title={`${MODEL_LABELS[m] ?? m} — ${f.label} run, posted ${f.age}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 12,
            background: isPrimary ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${isPrimary ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.12)'}`,
            cursor: 'default',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: f.stale ? '#EF4444' : '#22C55E',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--mono, monospace)',
              fontSize: 10,
              fontWeight: 700,
              color: isPrimary ? '#38BDF8' : 'var(--t2, #ccc)',
              letterSpacing: '0.03em',
            }}>
              {MODEL_LABELS[m] ?? m}
            </span>
            <span style={{
              fontFamily: 'var(--mono, monospace)',
              fontSize: 9,
              color: 'var(--t3, #888)',
              fontWeight: 500,
            }}>
              {f.label} · {f.age}
            </span>
          </div>
        )
      })}
    </div>
  )
}
