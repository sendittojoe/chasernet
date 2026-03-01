import { useMemo } from 'react'
import { useMapStore } from '../stores/mapStore.js'

export function useDisagreement() {
  const { modelData, primaryModel, activeModels, hour } = useMapStore()

  return useMemo(() => {
    const dataA = modelData[primaryModel] ?? null
    const secondaryModel = activeModels.find(m => m !== primaryModel)
    const dataB = secondaryModel ? modelData[secondaryModel] ?? null : null

    if (!dataA || !dataB) return { km: null, level: 'loading', color: '#3A4460' }

    const idx   = Math.min(Math.round(hour), (dataA.raw?.hourly?.windspeed_10m?.length ?? 1) - 1)
    const windA = dataA.raw?.hourly?.windspeed_10m?.[idx] ?? 0
    const windB = dataB.raw?.hourly?.windspeed_10m?.[idx] ?? 0
    const diff  = Math.abs(windA - windB)
    const km    = Math.round(diff * 7.5 + 30 + hour * 0.65)

    const level = km < 80 ? 'low' : km < 140 ? 'moderate' : km < 200 ? 'high' : 'extreme'
    const color = level === 'low' ? '#10B981' : level === 'moderate' ? '#F59E0B' : level === 'high' ? '#F97316' : '#EF4444'

    return { km, level, color }
  }, [modelData, primaryModel, activeModels, hour])
}
