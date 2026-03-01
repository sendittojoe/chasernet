import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API = 'https://api.chasernet.com'

export const useUserStore = create(
  persist(
    (set, get) => ({
      user:               null,
      token:              null,
      onboardingComplete: false,

      login: (user, token) => set({ user, token }),

      logout: () => {
        set({ user: null, token: null, onboardingComplete: false })
        window.location.href = '/'
      },

      updateProfile: (patch) => set(state => ({
        user: state.user ? { ...state.user, ...patch } : null,
      })),

      saveTagsAndOnboard: async (regionTags, interestTags, experienceLevel) => {
        set(state => ({
          onboardingComplete: true,
          user: state.user ? { ...state.user, regionTags, interestTags, experienceLevel } : null,
        }))
        const { token } = get()
        if (token) {
          fetch(API + '/users/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ regionTags, interestTags, experienceLevel, onboardingComplete: true }),
          }).catch(() => {})
        }
        return true
      },

      saveProfile: async (fields) => {
        set(state => ({ user: state.user ? { ...state.user, ...fields } : null }))
        const { token } = get()
        if (token) {
          fetch(API + '/users/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify(fields),
          }).catch(() => {})
        }
      },

      authHeader: () => {
        const { token } = get()
        return token ? { Authorization: 'Bearer ' + token } : {}
      },

      isAdmin: () => ['owner','co_creator','admin'].includes(get().user?.role),
      isMod:   () => ['owner','co_creator','admin','moderator'].includes(get().user?.role),
    }),
    {
      name: 'chasernet-user',
      partialize: (s) => ({ user: s.user, token: s.token, onboardingComplete: s.onboardingComplete }),
    }
  )
)
