import { useMemo } from 'react'
import { useMapStore } from '../stores/mapStore.js'

/**
 * Compute the model disagreement (spread) for the current forecast hour.
 *
 * For Phase 1 we derive spread from wind speed difference between model A and B.
 * In Phase 2 this upgrades to actual track position difference using GRIB lat/lon data.
 *
 * Returns: { km, level, color }
 *   km    — spread in kilometres
 *   level — 'low' | 'moderate' | 'high' | 'extreme'
 *   color — hex string
 */
export function useDisagreement() {
  const { dataA, dataB, hour } = useMapStore()

  return useMemo(() => {
    if (!dataA || !dataB) return { km: null, level: 'loading', color: '#3A4460' }

    // Wind speed at the storm-position forecast hour index
    const idx   = Math.min(Math.round(hour), (dataA.hourly?.windspeed_10m?.length ?? 1) - 1)
    const windA = dataA.hourly?.windspeed_10m?.[idx] ?? 0
    const windB = dataB.hourly?.windspeed_10m?.[idx] ?? 0
    const diff  = Math.abs(windA - windB)

    // Scale to km: each knot difference ≈ 7–8 km track spread (rough empirical for tropical)
    const km = Math.round(diff * 7.5 + 30 + hour * 0.65)

    const level =
      km < 80  ? 'low'      :
      km < 140 ? 'moderate' :
      km < 200 ? 'high'     : 'extreme'

    const color =
      level === 'low'      ? '#10B981' :
      level === 'moderate' ? '#F59E0B' :
      level === 'high'     ? '#F97316' : '#EF4444'

    return { km, level, color }
  }, [dataA, dataB, hour])
}
