import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export const useMapStore = create(
  subscribeWithSelector((set, get) => ({
    modelA: 'Euro IFS', modelB: 'GFS',
    split: true, spaghetti: false,
    layer: 'wind',
    showRadar: false, showSatellite: false, showSST: false,
    showBarbs: true, showGraticule: true, showCone: true, showShear: false, showBuoys: false,
    hour: 72, playing: false,
    dataA: null, dataB: null, dataLoading: false, dataError: null,
    inspectPoint: null,
    setModelA: (m) => set({ modelA: m, dataA: null }),
    setModelB: (m) => set({ modelB: m, dataB: null, split: true }),
    setLayer:  (l) => set({ layer: l }),
    setHour:   (h) => set({ hour: h }),
    setSplit:      (v) => set({ split: v }),
    setSpaghetti:  (v) => set({ spaghetti: v }),
    setShowRadar:     (v) => set({ showRadar: v }),
    setShowSatellite: (v) => set({ showSatellite: v }),
    setShowSST:       (v) => set({ showSST: v }),
    setShowBarbs:     (v) => set({ showBarbs: v }),
    setShowGraticule: (v) => set({ showGraticule: v }),
    setShowCone:      (v) => set({ showCone: v }),
    setShowShear:     (v) => set({ showShear: v }),
    setShowBuoys:     (v) => set({ showBuoys: v }),
    setDataA:       (d) => set({ dataA: d }),
    setDataB:       (d) => set({ dataB: d }),
    setDataLoading: (v) => set({ dataLoading: v }),
    setDataError:   (e) => set({ dataError: e }),
    setInspectPoint:(p) => set({ inspectPoint: p }),
    teleport: ({ modelA, modelB, layer, hour }) => set({
      ...(modelA !== undefined && { modelA, dataA: null }),
      ...(modelB !== undefined && { modelB, dataB: null, split: true }),
      ...(layer  !== undefined && { layer }),
      ...(hour   !== undefined && { hour }),
    }),
    tickHour: () => { const { hour } = get(); set({ hour: hour >= 168 ? 0 : hour + 6 }) },
  }))
)
