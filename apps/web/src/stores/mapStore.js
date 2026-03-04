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

// ═══════════════════════════════════════════════════════════
// 55 LAYERS — Organized by category
// More than Windy's ~50. All free data sources.
// ═══════════════════════════════════════════════════════════

export const LAYER_CATEGORIES = [
  { id: 'live',     label: 'Live & Now',         icon: '📡' },
  { id: 'wind',     label: 'Wind',               icon: '💨' },
  { id: 'temp',     label: 'Temperature',        icon: '🌡' },
  { id: 'precip',   label: 'Rain, Snow',         icon: '🌧' },
  { id: 'severe',   label: 'Severe & Storms',    icon: '⚡' },
  { id: 'clouds',   label: 'Clouds & Pressure',  icon: '☁️' },
  { id: 'ocean',    label: 'Ocean & Marine',      icon: '🌊' },
  { id: 'air',      label: 'Air Quality',         icon: '🫁' },
  { id: 'solar',    label: 'Solar & UV',          icon: '☀️' },
  { id: 'soil',     label: 'Soil & Agriculture',  icon: '🌱' },
  { id: 'upper',    label: 'Upper Air',           icon: '📊' },
  { id: 'overlays', label: 'Overlays',            icon: '🗺' },
]

export const ALL_LAYERS = [
  // ── Live & Now ──
  { id:'radar',          label:'Radar',              emoji:'📡', color:'#EF4444',  cat:'live',    source:'RainViewer' },
  { id:'lightning',      label:'Lightning',           emoji:'⚡', color:'#FBBF24',  cat:'live',    source:'Blitzortung' },
  { id:'satellite-ir',   label:'Satellite IR',        emoji:'🛰', color:'#818CF8',  cat:'live',    source:'RainViewer' },
  { id:'satellite-vis',  label:'Satellite Visible',   emoji:'🌎', color:'#A5B4FC',  cat:'live',    source:'RainViewer' },
  { id:'alerts',         label:'NWS Alerts',          emoji:'🚨', color:'#F87171',  cat:'live',    source:'NWS' },

  // ── Wind ──
  { id:'wind',           label:'Wind Speed',           emoji:'💨', color:'#38BDF8',  cat:'wind',    param:'windspeed_10m' },
  { id:'gusts',          label:'Wind Gusts',           emoji:'🌬', color:'#F472B6',  cat:'wind',    param:'windgusts_10m' },
  { id:'wind-dir',       label:'Wind Direction',       emoji:'🧭', color:'#67E8F9',  cat:'wind',    param:'winddirection_10m' },
  { id:'wind-80m',       label:'Wind 80m',             emoji:'🏗', color:'#7DD3FC',  cat:'wind',    param:'windspeed_80m' },
  { id:'wind-120m',      label:'Wind 120m',            emoji:'⚡', color:'#BAE6FD',  cat:'wind',    param:'windspeed_120m' },

  // ── Temperature ──
  { id:'temp',           label:'Temperature',          emoji:'🌡', color:'#F59E0B',  cat:'temp',    param:'temperature_2m' },
  { id:'feels-like',     label:'Feels Like',           emoji:'🤒', color:'#FB923C',  cat:'temp',    param:'apparent_temperature' },
  { id:'dewpoint',       label:'Dew Point',            emoji:'💧', color:'#22D3EE',  cat:'temp',    param:'dewpoint_2m' },
  { id:'humidity',       label:'Humidity',             emoji:'💦', color:'#06B6D4',  cat:'temp',    param:'relativehumidity_2m' },
  { id:'freeze-level',   label:'Freezing Level',       emoji:'🧊', color:'#A5F3FC',  cat:'temp',    param:'freezinglevel_height' },

  // ── Precipitation ──
  { id:'precip',         label:'Precipitation',        emoji:'🌧', color:'#60A5FA',  cat:'precip',  param:'precipitation' },
  { id:'precip-prob',    label:'Precip Probability',   emoji:'📊', color:'#93C5FD',  cat:'precip',  param:'precipitation_probability' },
  { id:'rain',           label:'Rain',                 emoji:'🌧', color:'#3B82F6',  cat:'precip',  param:'rain' },
  { id:'snow',           label:'Snowfall',             emoji:'❄️', color:'#E0F2FE',  cat:'precip',  param:'snowfall' },
  { id:'snow-depth',     label:'Snow Depth',           emoji:'⛷', color:'#BFDBFE',  cat:'precip',  param:'snow_depth' },

  // ── Severe & Storms ──
  { id:'cape',           label:'CAPE',                 emoji:'⚡', color:'#A78BFA',  cat:'severe',  param:'cape' },
  { id:'cin',            label:'CIN',                  emoji:'🛡', color:'#C4B5FD',  cat:'severe',  param:'convective_inhibition' },
  { id:'lifted-index',   label:'Lifted Index',         emoji:'📈', color:'#DDD6FE',  cat:'severe',  param:'lifted_index' },
  { id:'thunderstorm',   label:'Thunderstorm Prob',    emoji:'⛈', color:'#8B5CF6',  cat:'severe',  param:'cape' },
  { id:'hail',           label:'Hail',                 emoji:'🧊', color:'#C084FC',  cat:'severe',  param:'cape' },

  // ── Clouds & Pressure ──
  { id:'clouds',         label:'Cloud Cover',          emoji:'☁️', color:'#94A3B8',  cat:'clouds',  param:'cloudcover' },
  { id:'clouds-low',     label:'Low Clouds',           emoji:'🌫', color:'#CBD5E1',  cat:'clouds',  param:'cloudcover_low' },
  { id:'clouds-mid',     label:'Mid Clouds',           emoji:'☁️', color:'#E2E8F0',  cat:'clouds',  param:'cloudcover_mid' },
  { id:'clouds-high',    label:'High Clouds',          emoji:'🌤', color:'#F1F5F9',  cat:'clouds',  param:'cloudcover_high' },
  { id:'pressure',       label:'Pressure (MSL)',       emoji:'🔵', color:'#6366F1',  cat:'clouds',  param:'pressure_msl' },
  { id:'visibility',     label:'Visibility',           emoji:'👁', color:'#A3E635',  cat:'clouds',  param:'visibility' },
  { id:'boundary-layer', label:'Boundary Layer',       emoji:'📐', color:'#D4D4D8',  cat:'clouds',  param:'boundary_layer_height' },

  // ── Ocean & Marine ──
  { id:'sst',            label:'Sea Surface Temp',     emoji:'🌊', color:'#06B6D4',  cat:'ocean',   source:'NOAA' },
  { id:'wave-height',    label:'Wave Height',          emoji:'🌊', color:'#22D3EE',  cat:'ocean',   param:'wave_height', api:'marine' },
  { id:'wave-period',    label:'Wave Period',          emoji:'〰️', color:'#67E8F9',  cat:'ocean',   param:'wave_period', api:'marine' },
  { id:'wave-dir',       label:'Wave Direction',       emoji:'➡️', color:'#A5F3FC',  cat:'ocean',   param:'wave_direction', api:'marine' },
  { id:'swell-height',   label:'Swell Height',         emoji:'🏄', color:'#0EA5E9',  cat:'ocean',   param:'swell_wave_height', api:'marine' },

  // ── Air Quality ──
  { id:'aqi-us',         label:'US AQI',               emoji:'🫁', color:'#F97316',  cat:'air',     param:'us_aqi', api:'air' },
  { id:'pm25',           label:'PM 2.5',               emoji:'😷', color:'#FB923C',  cat:'air',     param:'pm2_5', api:'air' },
  { id:'pm10',           label:'PM 10',                emoji:'🌫', color:'#FBBF24',  cat:'air',     param:'pm10', api:'air' },
  { id:'ozone',          label:'Ozone',                emoji:'🟣', color:'#A78BFA',  cat:'air',     param:'ozone', api:'air' },
  { id:'dust',           label:'Saharan Dust',         emoji:'🏜', color:'#D97706',  cat:'air',     param:'dust', api:'air' },
  { id:'pollen',         label:'Pollen',               emoji:'🌾', color:'#84CC16',  cat:'air',     param:'grass_pollen', api:'air' },

  // ── Solar & UV ──
  { id:'uv-index',       label:'UV Index',             emoji:'☀️', color:'#F59E0B',  cat:'solar',   param:'uv_index' },
  { id:'solar-rad',      label:'Solar Radiation',      emoji:'🔆', color:'#FBBF24',  cat:'solar',   param:'shortwave_radiation' },
  { id:'direct-rad',     label:'Direct Radiation',     emoji:'☀️', color:'#FDE68A',  cat:'solar',   param:'direct_radiation' },
  { id:'sunshine',       label:'Sunshine Duration',    emoji:'🌅', color:'#FEF3C7',  cat:'solar',   param:'sunshine_duration' },

  // ── Soil & Agriculture ──
  { id:'soil-temp',      label:'Soil Temperature',     emoji:'🌱', color:'#84CC16',  cat:'soil',    param:'soil_temperature_0cm' },
  { id:'soil-moisture',  label:'Soil Moisture',        emoji:'💧', color:'#22C55E',  cat:'soil',    param:'soil_moisture_0_to_1cm' },
  { id:'et',             label:'Evapotranspiration',   emoji:'🌿', color:'#4ADE80',  cat:'soil',    param:'et0_fao_evapotranspiration' },

  // ── Upper Air / Pressure Levels ──
  { id:'500mb',          label:'500mb Heights',        emoji:'📊', color:'#34D399',  cat:'upper',   param:'geopotential_height_500hPa' },
  { id:'850mb-temp',     label:'850mb Temp',           emoji:'🌡', color:'#F97316',  cat:'upper',   param:'temperature_850hPa' },
  { id:'300mb-wind',     label:'Jet Stream (300mb)',   emoji:'✈️', color:'#60A5FA',  cat:'upper',   param:'windspeed_300hPa' },
  { id:'700mb-rh',       label:'700mb Humidity',       emoji:'💧', color:'#38BDF8',  cat:'upper',   param:'relativehumidity_700hPa' },
  { id:'250mb-wind',     label:'250mb Winds',          emoji:'🌀', color:'#818CF8',  cat:'upper',   param:'windspeed_250hPa' },

  // ── Overlays ──
  { id:'track',          label:'Storm Tracks',         emoji:'🌀', color:'#F97316',  cat:'overlays', source:'NOAA' },
  { id:'day-night',      label:'Day/Night',            emoji:'🌗', color:'#64748B',  cat:'overlays' },
  { id:'grid',           label:'Lat/Lon Grid',         emoji:'#️⃣', color:'#475569',  cat:'overlays' },
]

// Total: 55 layers

// ═══════════════════════════════════════════════════════════
// LAYER TAGS — cross-cutting tags for faceted filtering
// Each layer can belong to multiple tags (unlike categories)
// ═══════════════════════════════════════════════════════════
export const LAYER_TAGS = {
  'radar':          ['real-time','chasing','animated'],
  'lightning':      ['real-time','chasing','severe','animated'],
  'satellite-ir':   ['real-time','animated'],
  'satellite-vis':  ['real-time','animated'],
  'alerts':         ['real-time','severe','chasing'],
  'wind':           ['forecast','surface','animated','chasing'],
  'gusts':          ['forecast','surface','severe','chasing'],
  'wind-dir':       ['forecast','surface'],
  'wind-80m':       ['forecast','elevated','energy'],
  'wind-120m':      ['forecast','elevated','aviation'],
  'temp':           ['forecast','surface'],
  'feels-like':     ['forecast','surface'],
  'dewpoint':       ['forecast','surface','chasing'],
  'humidity':       ['forecast','surface'],
  'freeze-level':   ['forecast','aviation'],
  'precip':         ['forecast','precipitation','animated'],
  'precip-prob':    ['forecast','precipitation'],
  'rain':           ['forecast','precipitation'],
  'snow':           ['forecast','precipitation','winter'],
  'snow-depth':     ['forecast','precipitation','winter'],
  'cape':           ['forecast','severe','convection','chasing'],
  'cin':            ['forecast','severe','convection'],
  'lifted-index':   ['forecast','severe','convection'],
  'thunderstorm':   ['forecast','severe','convection','chasing'],
  'hail':           ['forecast','severe','chasing'],
  'clouds':         ['forecast','aviation'],
  'clouds-low':     ['forecast','aviation'],
  'clouds-mid':     ['forecast','aviation'],
  'clouds-high':    ['forecast','aviation'],
  'pressure':       ['forecast','synoptic'],
  'visibility':     ['forecast','aviation','surface'],
  'boundary-layer': ['forecast','convection'],
  'sst':            ['ocean','marine'],
  'wave-height':    ['ocean','marine','animated'],
  'wave-period':    ['ocean','marine'],
  'wave-dir':       ['ocean','marine'],
  'swell-height':   ['ocean','marine'],
  'aqi-us':         ['air-quality','health'],
  'pm25':           ['air-quality','health'],
  'pm10':           ['air-quality','health'],
  'ozone':          ['air-quality'],
  'dust':           ['air-quality','animated'],
  'pollen':         ['air-quality','health'],
  'uv-index':       ['solar','health'],
  'solar-rad':      ['solar','energy'],
  'direct-rad':     ['solar','energy'],
  'sunshine':       ['solar'],
  'soil-temp':      ['agriculture','surface'],
  'soil-moisture':  ['agriculture'],
  'et':             ['agriculture'],
  '500mb':          ['upper-air','synoptic'],
  '850mb-temp':     ['upper-air','synoptic'],
  '300mb-wind':     ['upper-air','aviation','synoptic'],
  '700mb-rh':       ['upper-air','synoptic'],
  '250mb-wind':     ['upper-air','aviation'],
  'track':          ['severe','chasing'],
  'day-night':      ['overlay'],
  'grid':           ['overlay'],
}

// Unique sorted tag list for UI
export const ALL_TAGS = [...new Set(Object.values(LAYER_TAGS).flat())].sort()

// ═══════════════════════════════════════════════════════════
// SMART PRESETS — curated layer combos for common workflows
// ═══════════════════════════════════════════════════════════
export const LAYER_PRESETS = [
  {
    id: 'storm-chasing',
    label: 'Storm Chasing',
    emoji: '🌪',
    color: '#EF4444',
    desc: 'Radar + Lightning + CAPE + Gusts + Alerts',
    layers: [
      { id:'radar',     opacity:0.75, visible:true },
      { id:'lightning', opacity:1.0,  visible:true },
      { id:'cape',      opacity:0.65, visible:true },
      { id:'gusts',     opacity:0.5,  visible:true },
      { id:'alerts',    opacity:0.8,  visible:true },
    ],
  },
  {
    id: 'marine-forecast',
    label: 'Marine',
    emoji: '⛵',
    color: '#06B6D4',
    desc: 'SST + Waves + Wind + Pressure',
    layers: [
      { id:'sst',         opacity:0.7, visible:true },
      { id:'wave-height', opacity:0.6, visible:true },
      { id:'wind',        opacity:0.5, visible:true },
      { id:'pressure',    opacity:0.4, visible:true },
    ],
  },
  {
    id: 'aviation',
    label: 'Aviation',
    emoji: '✈️',
    color: '#60A5FA',
    desc: 'Visibility + Clouds + Freeze Level + Jet Stream',
    layers: [
      { id:'visibility',  opacity:0.7, visible:true },
      { id:'clouds',      opacity:0.5, visible:true },
      { id:'freeze-level',opacity:0.6, visible:true },
      { id:'300mb-wind',  opacity:0.5, visible:true },
    ],
  },
  {
    id: 'winter-wx',
    label: 'Winter Wx',
    emoji: '❄️',
    color: '#A5F3FC',
    desc: 'Snow + Precip + Temp + Freeze Level + Radar',
    layers: [
      { id:'snow',        opacity:0.7, visible:true },
      { id:'precip',      opacity:0.6, visible:true },
      { id:'temp',        opacity:0.5, visible:true },
      { id:'freeze-level',opacity:0.5, visible:true },
      { id:'radar',       opacity:0.6, visible:true },
    ],
  },
  {
    id: 'air-quality',
    label: 'Air Quality',
    emoji: '🫁',
    color: '#F97316',
    desc: 'US AQI + PM2.5 + Dust + Wind',
    layers: [
      { id:'aqi-us', opacity:0.7, visible:true },
      { id:'pm25',   opacity:0.5, visible:true },
      { id:'dust',   opacity:0.5, visible:true },
      { id:'wind',   opacity:0.4, visible:true },
    ],
  },
  {
    id: 'synoptic',
    label: 'Synoptic',
    emoji: '📊',
    color: '#34D399',
    desc: '500mb + Pressure + 850mb Temp + Jet Stream',
    layers: [
      { id:'500mb',      opacity:0.7, visible:true },
      { id:'pressure',   opacity:0.5, visible:true },
      { id:'850mb-temp', opacity:0.5, visible:true },
      { id:'300mb-wind', opacity:0.4, visible:true },
    ],
  },
]

export const useMapStore = create(
  subscribeWithSelector((set, get) => ({
    // Models
    activeModels: ['Euro IFS', 'GFS'],
    primaryModel: 'GFS',
    modelData: {},
    dataLoading: false,
    dataError: null,

    // Layers
    layer: 'wind',
    activeLayers: [
      { id:'wind',  opacity:0.85, visible:true },
      { id:'radar', opacity:0.65, visible:true },
    ],

    // Timeline
    hour: 0,
    playing: false,

    // Split-screen
    splitMode: false,
    modelA: 'GFS',
    modelB: 'Euro IFS',

    // Spaghetti plots
    spaghettiEnabled: false,

    // 3D mode
    is3D: false,
    terrainEnabled: false,
    globeEnabled: true, // globe at low zoom, mercator at high zoom

    // Click inspect / weather picker
    inspectPoint: null,

    // Location
    userLocation: null,
    locationLoading: false,
    locationError: null,

    // Layout
    navCollapsed: false,
    rightCollapsed: false,

    // ── Model actions ──
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
    setModelData: (modelId, data) => set(state => ({
      modelData: { ...state.modelData, [modelId]: data },
    })),
    setDataLoading: (v) => set({ dataLoading: v }),
    setDataError:   (e) => set({ dataError: e }),

    // ── Layer actions ──
    toggleLayer: (id) => set(state => {
      const GRID_LAYERS = [
        'wind','temp','precip','cape','500mb','mslp','gusts','dewpoint','clouds',
        'pressure','visibility','humidity','feels-like','rain','snow','snow-depth',
        'precip-prob','cin','lifted-index','thunderstorm','hail','clouds-low',
        'clouds-mid','clouds-high','boundary-layer','freeze-level','wind-dir',
        'wind-80m','wind-120m','uv-index','solar-rad','direct-rad','sunshine',
        'soil-temp','soil-moisture','et','850mb-temp','300mb-wind','700mb-rh',
        '250mb-wind','wave-height','wave-period','wave-dir','swell-height',
        'aqi-us','pm25','pm10','ozone','dust','pollen',
      ]
      const existing = state.activeLayers.find(l => l.id === id)
      const newLayers = existing
        ? state.activeLayers.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
        : [...state.activeLayers, { id, opacity: 0.8, visible: true }]
      const turningOn = !existing || (existing && !existing.visible)
      const newLayer = (GRID_LAYERS.includes(id) && turningOn)
        ? id
        : (GRID_LAYERS.includes(id) && !turningOn)
          ? (newLayers.find(l => GRID_LAYERS.includes(l.id) && l.visible)?.id ?? state.layer)
          : state.layer
      return { activeLayers: newLayers, layer: newLayer }
    }),
    setLayerOpacity: (id, opacity) => set(state => ({
      activeLayers: state.activeLayers.map(l => l.id === id ? { ...l, opacity } : l),
    })),
    removeLayer: (id) => set(state => {
      const next = state.activeLayers.filter(l => l.id !== id)
      return { activeLayers: next, layer: next.find(l => l.visible)?.id ?? 'wind' }
    }),
    reorderLayers: (fromIdx, toIdx) => set(state => {
      const arr = [...state.activeLayers]
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return { activeLayers: arr }
    }),
    applyPreset: (preset) => set({
      activeLayers: preset.layers.map(l => ({ ...l })),
      layer: preset.layers.find(l => l.visible)?.id ?? 'wind',
    }),
    setLayer: (l) => set({ layer: l }),

    // ── Timeline actions ──
    setHour:    (h) => set({ hour: h }),
    setPlaying: (v) => set({ playing: v }),
    tickHour: () => {
      const { hour } = get()
      set({ hour: hour >= 384 ? 0 : hour + 1 })
    },

    // ── Split-screen actions ──
    toggleSplit: () => set(s => ({ splitMode: !s.splitMode })),
    setSplitMode: (on) => set({ splitMode: on }),
    setModelA: (m) => set({ modelA: m }),
    setModelB: (m) => set({ modelB: m }),

    // ── Spaghetti actions ──
    toggleSpaghetti: () => set(s => ({ spaghettiEnabled: !s.spaghettiEnabled })),
    setSpaghetti: (on) => set({ spaghettiEnabled: on }),

    // ── 3D actions ──
    toggle3D: () => set(s => ({ is3D: !s.is3D })),
    set3D: (on) => set({ is3D: on }),
    setTerrainEnabled: (on) => set({ terrainEnabled: on }),
    setGlobeEnabled: (on) => set({ globeEnabled: on }),

    // ── Click inspect ──
    setInspectPoint: (pt) => set({ inspectPoint: pt }),

    // ── Location actions ──
    setUserLocation:    (l) => set({ userLocation: l, locationLoading: false }),
    setLocationLoading: (v) => set({ locationLoading: v }),
    setLocationError:   (e) => set({ locationError: e, locationLoading: false }),

    // ── Layout actions ──
    setNavCollapsed:    (v) => set({ navCollapsed: v }),
    setRightCollapsed:  (v) => set({ rightCollapsed: v }),

    teleport: ({ layer, hour }) => set({
      ...(layer !== undefined && { layer }),
      ...(hour  !== undefined && { hour }),
    }),
  }))
)
