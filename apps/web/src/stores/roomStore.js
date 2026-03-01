import { create } from 'zustand'

/**
 * roomStore — which storm room is active, and room metadata.
 */
export const useRoomStore = create((set, get) => ({
  // Active room id — null = Discovery Feed
  activeRoom: null,

  // Active right panel tab
  rightTab: 'live',    // live | analysis | models | battle

  // Rooms list (populated from API in Phase 2, seeded here for Phase 1)
  rooms: [
    {
      id:        'beatriz-2026',
      name:      'Hurricane Beatriz',
      short:     'B',
      category:  'C3',
      catColor:  '#EF4444',
      basin:     'EPac',
      wind:      115,
      pressure:  950,
      lat:       16.2,
      lon:       -104.8,
      users:     89,
      active:    true,
    },
    {
      id:        'invest96w-2026',
      name:      'Invest 96W',
      short:     '96W',
      category:  'Invest',
      catColor:  '#8B5CF6',
      basin:     'WPac',
      wind:      35,
      pressure:  1007,
      lat:       14.8,
      lon:       138.2,
      users:     31,
      active:    false,
    },
  ],

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
