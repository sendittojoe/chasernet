import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export const ALL_MODELS = [
  { id:'Euro IFS',  label:'Euro IFS',  short:'IFS',  color:'#38BDF8', source:'ECMWF',  res:'9km'  },
  { id:'GFS',       label:'GFS',       short:'GFS',  color:'#F59E0B', source:'NOAA',   res:'22km' },
  { id:'EC-AIFS',   label:'EC-AIFS',   short:'AIFS', color:'#A78BFA', source:'ECMWF',  res:'9km'  },
  { id:'HRRR',      label:'HRRR',      short:'HRRR', color:'#F97316', source:'NOAA',   res:'3km'  },
  { id:'ICON',      label:'ICON',      short:'ICON', color:'#34D399', source:'DWD',    res:'13km' },
  { id:'NAM 3km',   label:'NAM 3km',   short:'NAM',  color:'#FB923C', source:'NOAA',   res:'3km'  },
  { id:'CMC',       label:'CMC/GDPS',  short:'CMC',  color:'#E879F9', source:'Canada', res:'15km' },
  { id:'UKMET',     label:'UKMET',     short:'UK',   color:'#F43F5E', source:'UKMO',   res:'10km' },
  { id:'GraphCast', label:'GraphCast', short:'GC',   color:'#6EE7B7', source:'Google', res:'25km' },
  { id:'GEFS',      label:'GEFS Ens',  short:'GEFS', color:'#FDE68A', source:'NOAA',   res:'35km' },
]

export const ALL_LAYERS = [
  { id:'wind',   label:'Wind',   emoji:'💨', color:'#38BDF8' },
  { id:'temp',   label:'Temp',   emoji:'🌡', color:'#F59E0B' },
  { id:'precip', label:'Precip', emoji:'🌧', color:'#60A5FA' },
  { id:'cape',   label:'CAPE',   emoji:'⚡', color:'#A78BFA' },
  { id:'500mb',  label:'500mb',  emoji:'📊', color:'#34D399' },
  { id:'radar',  label:'Radar',  emoji:'📡', color:'#EF4444' },
  { id:'sst',    label:'SST',    emoji:'🌊', color:'#06B6D4' },
  { id:'track',  label:'Track',  emoji:'🌀', color:'#F97316' },
]

export const useMapStore = create(
  subscribeWithSelector((set, get) => ({
    activeModels: ['Euro IFS', 'GFS'],
    primaryModel: 'Euro IFS',
    layer: 'wind',
    activeLayers: [
      { id:'wind',  opacity:0.85, visible:true },
      { id:'radar', opacity:0.65, visible:true },
    ],
    hour: 72,
    playing: false,
    modelData: {},
    dataLoading: false,
    dataError: null,
    spaghetti: false,
    userLocation: null,
    locationLoading: false,
    locationError: null,
    navCollapsed: false,
    rightCollapsed: false,

    toggleModel: (id) => set(state => {
      const isActive = state.activeModels.includes(id)
      if (isActive && state.activeModels.length === 1) return state
      const next = isActive
        ? state.activeModels.filter(m => m !== id)
        : [...state.activeModels, id]
      return {
        activeModels: next,
        primaryModel: next.includes(state.primaryModel) ? state.primaryModel : next[0],
      }
    }),

    setPrimaryModel: (id) => set({ primaryModel: id }),

    toggleLayer: (id) => set(state => {
      const existing = state.activeLayers.find(l => l.id === id)
      const newLayers = existing
        ? state.activeLayers.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
        : [...state.activeLayers, { id, opacity:0.8, visible:true }]
      return {
        activeLayers: newLayers,
        layer: newLayers.find(l => l.visible)?.id ?? state.layer,
      }
    }),

    setLayerOpacity: (id, opacity) => set(state => ({
      activeLayers: state.activeLayers.map(l => l.id === id ? { ...l, opacity } : l),
    })),

    removeLayer: (id) => set(state => {
      const next = state.activeLayers.filter(l => l.id !== id)
      return { activeLayers: next, layer: next.find(l => l.visible)?.id ?? 'wind' }
    }),

    setLayer:     (l) => set({ layer: l }),
    setHour:      (h) => set({ hour: h }),
    setPlaying:   (v) => set({ playing: v }),
    setSpaghetti: (v) => set({ spaghetti: v }),

    setModelData: (modelId, data) => set(state => ({
      modelData: { ...state.modelData, [modelId]: data },
    })),

    setDataLoading: (v) => set({ dataLoading: v }),
    setDataError:   (e) => set({ dataError: e }),

    setUserLocation:    (l) => set({ userLocation: l, locationLoading: false }),
    setLocationLoading: (v) => set({ locationLoading: v }),
    setLocationError:   (e) => set({ locationError: e, locationLoading: false }),
    setNavCollapsed:    (v) => set({ navCollapsed: v }),
    setRightCollapsed:  (v) => set({ rightCollapsed: v }),

    teleport: ({ layer, hour }) => set({
      ...(layer !== undefined && { layer }),
      ...(hour  !== undefined && { hour }),
    }),

    tickHour: () => {
      const { hour } = get()
      set({ hour: hour >= 168 ? 0 : hour + 6 })
    },
  }))
)
