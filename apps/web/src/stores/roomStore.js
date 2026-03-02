import { create } from 'zustand'

/**
 * roomStore — which storm room is active, and room metadata.
 */
export const useRoomStore = create((set, get) => ({
  // Active room id — null = Discovery Feed
  activeRoom: null,

  // Active right panel tab
  rightTab: 'live',    // live | analysis | models | battle

  // Rooms list — populated from live NHC data via useStorms() hook
  rooms: [],

  // ── Actions ──────────────────────────────────────
  setActiveRoom: (id)  => set({ activeRoom: id, rightTab: 'live' }),
  setRightTab:   (tab) => set({ rightTab: tab }),

  getRoom: (id) => get().rooms.find(r => r.id === id) ?? null,

  /** Called when new storm data arrives from API/WebSocket */
  updateRoom: (id, patch) => set(state => ({
    rooms: state.rooms.map(r => r.id === id ? { ...r, ...patch } : r),
  })),

  /** Add a new room (from cron worker alert) */
  addRoom: (room) => set(state => ({
    rooms: [...state.rooms.filter(r => r.id !== room.id), room],
  })),
}))
