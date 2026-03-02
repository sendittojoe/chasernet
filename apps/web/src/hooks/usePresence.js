import { useEffect, useRef, useCallback } from 'react'
import { useUserStore } from '../stores/userStore.js'
import { useNotificationStore } from '../stores/notificationStore.js'
import { create } from 'zustand'

const WS_BASE = import.meta.env.VITE_CHAT_URL ?? 'wss://chat.chasernet.com'
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]

/**
 * dmStore — real-time DM state, updated by WebSocket events.
 */
export const useDMStore = create((set, get) => ({
  conversations: [],         // { partnerId, partnerUsername, ... }
  activeMessages: {},        // { [partnerId]: Message[] }
  totalUnread: 0,
  loading: false,

  setConversations: (convos) => set({
    conversations: convos,
    totalUnread: convos.reduce((s, c) => s + (c.unread ?? 0), 0),
  }),

  addIncomingDM: (dm) => set(state => {
    const partnerId = dm.fromId
    const existing  = state.conversations.find(c => c.partnerId === partnerId)

    // Update conversation list
    const updatedConvos = existing
      ? state.conversations.map(c =>
          c.partnerId === partnerId
            ? { ...c, lastMessage: dm.content, lastMessageAt: dm.createdAt, unread: c.unread + 1 }
            : c
        )
      : [{
          partnerId,
          partnerUsername: dm.fromUser,
          partnerColor:   dm.fromColor,
          lastMessage:    dm.content,
          lastMessageAt:  dm.createdAt,
          unread: 1,
          partnerOnline: true,
        }, ...state.conversations]

    // Update active message thread if open
    const activeForPartner = state.activeMessages[partnerId]
    const updatedMessages = activeForPartner
      ? {
          ...state.activeMessages,
          [partnerId]: [...activeForPartner, {
            id: dm.id,
            from_id: dm.fromId,
            username: dm.fromUser,
            avatar_color: dm.fromColor,
            content: dm.content,
            created_at: dm.createdAt,
          }],
        }
      : state.activeMessages

    return {
      conversations: updatedConvos.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0)),
      activeMessages: updatedMessages,
      totalUnread: updatedConvos.reduce((s, c) => s + (c.unread ?? 0), 0),
    }
  }),

  addSentDM: (partnerId, msg) => set(state => ({
    activeMessages: {
      ...state.activeMessages,
      [partnerId]: [...(state.activeMessages[partnerId] ?? []), msg],
    },
    conversations: state.conversations.map(c =>
      c.partnerId === partnerId
        ? { ...c, lastMessage: msg.content, lastMessageAt: msg.created_at }
        : c
    ).sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0)),
  })),

  setActiveMessages: (partnerId, msgs) => set(state => ({
    activeMessages: { ...state.activeMessages, [partnerId]: msgs },
  })),

  markRead: (partnerId) => set(state => ({
    conversations: state.conversations.map(c =>
      c.partnerId === partnerId ? { ...c, unread: 0 } : c
    ),
    totalUnread: state.conversations.reduce((s, c) =>
      s + (c.partnerId === partnerId ? 0 : (c.unread ?? 0)), 0
    ),
  })),

  setLoading: (v) => set({ loading: v }),
}))


/**
 * usePresence — connects to UserPresenceDO WebSocket.
 *
 * Call once at Shell level. Handles:
 * - Real-time DM delivery → updates dmStore
 * - Real-time notifications → updates notificationStore
 * - Model run alerts
 * - Reconnection with exponential backoff
 */
export function usePresence() {
  const { user, token } = useUserStore()
  const { addLocal }     = useNotificationStore()
  const wsRef            = useRef(null)
  const retryIdx         = useRef(0)
  const retryTimer       = useRef(null)
  const mountedRef       = useRef(true)

  const connect = useCallback(() => {
    if (!user?.id || !token) return
    const url = `${WS_BASE}/user/${user.id}?token=${encodeURIComponent(token)}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[Presence] connected')
      retryIdx.current = 0
      // Keep-alive ping every 25s
      ws._ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 25000)
    }

    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data)
        handleEvent(event)
      } catch {}
    }

    ws.onclose = () => {
      clearInterval(ws._ping)
      if (!mountedRef.current) return
      const delay = RECONNECT_DELAYS[Math.min(retryIdx.current++, RECONNECT_DELAYS.length - 1)]
      console.log(`[Presence] reconnecting in ${delay}ms`)
      retryTimer.current = setTimeout(connect, delay)
    }

    ws.onerror = () => ws.close()
  }, [user?.id, token])

  function handleEvent(event) {
    switch (event.type) {
      case 'dm':
        useDMStore.getState().addIncomingDM(event.payload)
        // Fire browser notification for DM
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`💬 @${event.payload.fromUser}`, {
              body: event.payload.content?.slice(0, 100),
              icon: '/icons/icon-192.png',
              tag:  `dm-${event.payload.fromId}`,
            })
          } catch {}
        }
        break

      case 'notification':
        addLocal(event.payload)
        break

      case 'model_alert':
        addLocal({
          type:  'model_run',
          title: event.payload.title ?? 'New model run available',
          body:  event.payload.body,
          link:  '/app',
        })
        // Fire browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`⚡ ${event.payload.title}`, {
              body: event.payload.body,
              icon: '/icons/icon-192.png',
              tag:  `model-${event.payload.runId}`,
            })
          } catch {}
        }
        break

      case 'connected':
        console.log('[Presence] session:', event.socketId)
        break

      case 'pong':
        break

      default:
        console.log('[Presence] unknown event:', event.type)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(retryTimer.current)
      if (wsRef.current) {
        clearInterval(wsRef.current._ping)
        wsRef.current.close()
      }
    }
  }, [connect])
}


/**
 * useDirectMessages — fetch + send DMs via REST, synced with dmStore.
 */
export function useDirectMessages(partnerId) {
  const { token, user } = useUserStore()
  const { setActiveMessages, addSentDM, markRead, setLoading } = useDMStore()
  const API = import.meta.env.VITE_API_BASE ?? 'https://api.chasernet.com'

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async () => {
    if (!partnerId || !token) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/dm/${partnerId}?limit=100`, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (res.ok) {
        const data = await res.json()
        setActiveMessages(partnerId, data.messages ?? [])
        markRead(partnerId)
      }
    } catch (err) {
      console.warn('[DM fetch] failed:', err.message)
    } finally {
      setLoading(false)
    }
  }, [partnerId, token])

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/dm/conversations`, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (res.ok) {
        const data = await res.json()
        useDMStore.getState().setConversations(data.conversations ?? [])
      }
    } catch (err) {
      console.warn('[DM conversations] failed:', err.message)
    }
  }, [token])

  // Send a DM
  const send = useCallback(async (content) => {
    if (!partnerId || !token || !content?.trim()) return false
    try {
      const res = await fetch(`${API}/dm/${partnerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (res.ok) {
        const { id } = await res.json()
        addSentDM(partnerId, {
          id,
          from_id:      user.id,
          username:     user.username,
          avatar_color: user.avatarColor ?? '#38BDF8',
          content:      content.trim(),
          created_at:   Date.now(),
        })
        return true
      }
    } catch (err) {
      console.warn('[DM send] failed:', err.message)
    }
    return false
  }, [partnerId, token, user])

  return { fetchMessages, fetchConversations, send }
}
