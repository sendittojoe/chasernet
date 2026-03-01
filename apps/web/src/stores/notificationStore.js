import { create } from 'zustand'

const API = 'https://api.chasernet.com'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unread: 0,

  fetch: async () => {
    const token = JSON.parse(localStorage.getItem('chasernet-user') ?? '{}')?.state?.token
    if (!token) return
    try {
      const res  = await fetch(API + '/notifications', { headers: { Authorization: 'Bearer ' + token } })
      if (!res.ok) return
      const data = await res.json()
      set({ notifications: data.notifications ?? [], unread: data.unread ?? 0 })
    } catch {}
  },

  markAllRead: async () => {
    const token = JSON.parse(localStorage.getItem('chasernet-user') ?? '{}')?.state?.token
    if (!token) return
    await fetch(API + '/notifications/read-all', { method:'PATCH', headers:{ Authorization:'Bearer '+token } })
    set(s => ({ unread:0, notifications: s.notifications.map(n => ({...n, read:1})) }))
  },

  markRead: async (id) => {
    const token = JSON.parse(localStorage.getItem('chasernet-user') ?? '{}')?.state?.token
    if (!token) return
    await fetch(API + '/notifications/' + id + '/read', { method:'PATCH', headers:{ Authorization:'Bearer '+token } })
    set(s => ({
      notifications: s.notifications.map(n => n.id===id ? {...n,read:1} : n),
      unread: Math.max(0, s.unread - 1),
    }))
  },

  addLocal: (notif) => set(s => ({
    notifications: [{ ...notif, id: Date.now().toString(), read:0, created_at:Date.now() }, ...s.notifications],
    unread: s.unread + 1,
  })),
}))
