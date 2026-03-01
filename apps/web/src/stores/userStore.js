import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * userStore — authentication and user profile.
 * Persisted to localStorage so sessions survive page refresh.
 */
export const useUserStore = create(
  persist(
    (set, get) => ({
      user:  null,    // { id, username, role, avatarColor, bio, location, forecastScore }
      token: null,    // JWT

      // ── Actions ──────────────────────────────────────

      login: (user, token) => set({ user, token }),

      logout: () => {
        set({ user: null, token: null })
        window.location.href = '/'
      },

      updateProfile: (patch) => set(state => ({
        user: state.user ? { ...state.user, ...patch } : null,
      })),

      // Helper: return Authorization header for fetch calls
      authHeader: () => {
        const { token } = get()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },

      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin' || user?.role === 'owner'
      },

      isMod: () => {
        const { user } = get()
        return ['owner','admin','moderator'].includes(user?.role)
      },
    }),
    {
      name:    'chasernet-user',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
