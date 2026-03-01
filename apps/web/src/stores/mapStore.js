import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * mapStore — single source of truth for the map viewer state.
 * Everything that changes what the map shows lives here.
 */
export const useMapStore = create(
  subscribeWithSelector((set, get) => ({
    // Current displayed models
    modelA:    'Euro IFS',
    modelB:    'GFS',

    // Display mode
    split:     true,          // side-by-side model comparison
    spaghetti: false,         // ensemble spaghetti overlay

    // Active layer
    layer:     'wind',        // wind | temp | precip | cape | 500mb | track

    // Timeline
    hour:      72,            // forecast hour: 0–168
    playing:   false,         // animation playback

    // Fetched weather data (set by useWeatherData hook)
    dataA:     null,
    dataB:     null,
    dataLoading: false,
    dataError:   null,

    // ── Actions ──────────────────────────────────────

    setModelA: (model) => set({ modelA: model, dataA: null }),
    setModelB: (model) => set({ modelB: model, dataB: null, split: true }),
    setLayer:  (layer) => set({ layer }),
    setHour:   (hour)  => set({ hour }),
    setSplit:  (v)     => set({ split: v }),
    setSpaghetti: (v)  => set({ spaghetti: v }),
    setDataA:  (data)  => set({ dataA: data }),
    setDataB:  (data)  => set({ dataB: data }),
    setDataLoading: (v) => set({ dataLoading: v }),
    setDataError:   (e) => set({ dataError: e }),

    /**
     * teleport — jump map to a pinned state from a chat/forum post.
     * Any field left undefined is unchanged.
     */
    teleport: ({ modelA, modelB, layer, hour }) => {
      set({
        ...(modelA  !== undefined && { modelA,  dataA: null }),
        ...(modelB  !== undefined && { modelB,  dataB: null, split: true }),
        ...(layer   !== undefined && { layer }),
        ...(hour    !== undefined && { hour }),
      })
    },

    /** Step through hours during animation playback */
    tickHour: () => {
      const { hour } = get()
      set({ hour: hour >= 168 ? 0 : hour + 6 })
    },
  }))
)
