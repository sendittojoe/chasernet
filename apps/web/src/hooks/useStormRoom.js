import { useEffect, useRef, useState, useCallback } from 'react'
import { useUserStore } from '../stores/userStore.js'

const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'wss://chat.chasernet.com'

/**
 * useStormRoom — WebSocket connection to a storm room chat.
 *
 * Phase 1: not connected (chat is static mock data)
 * Phase 3: connects to Cloudflare Durable Object WebSocket
 *
 * Returns: { messages, send, connected, userCount }
 */
export function useStormRoom(roomId) {
  const { token }        = useUserStore()
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const [userCount, setUserCount] = useState(0)
  const wsRef = useRef(null)

  useEffect(() => {
    // Phase 1: WebSocket not yet wired, return early
    // Remove this guard in Phase 3 when Durable Objects are deployed
    if (!roomId) return

    const url = `${WS_BASE}/room/${roomId}?token=${token}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'message')    setMessages(p => [...p, msg.payload])
        if (msg.type === 'user_count') setUserCount(msg.count)
        if (msg.type === 'history')    setMessages(msg.messages)
      } catch (err) {
        console.warn('WS parse error:', err)
      }
    }

    ws.onclose = () => { setConnected(false); wsRef.current = null }
    ws.onerror = (e) => console.warn('WS error:', e)

    return () => { ws.close(); wsRef.current = null }
  }, [roomId, token])

  const send = useCallback((content, mapPin = null) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'message', content, mapPin }))
  }, [])

  return { messages, send, connected, userCount }
}
