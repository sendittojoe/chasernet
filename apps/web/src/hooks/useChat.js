import { useEffect, useRef, useCallback, useState } from 'react'
import { useUserStore } from '../stores/userStore.js'

const CHAT_URL = import.meta.env.VITE_CHAT_URL ?? 'wss://chat.chasernet.com'
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]

export function useChat(roomId) {
  const { token } = useUserStore()
  const ws        = useRef(null)
  const retryIdx  = useRef(0)
  const retryTimer= useRef(null)
  const mounted   = useRef(true)
  const typingTimer = useRef(null)
  const [messages,  setMessages]  = useState([])
  const [presence,  setPresence]  = useState([])
  const [typing,    setTyping]    = useState([])
  const [status,    setStatus]    = useState('connecting')
  const [userCount, setUserCount] = useState(0)

  function connect() {
    if (!roomId || !token) return
    setStatus('connecting')
    const url  = CHAT_URL + '/room/' + roomId + '?token=' + encodeURIComponent(token)
    const sock = new WebSocket(url)
    ws.current = sock
    sock.onopen = () => { retryIdx.current = 0; setStatus('connected'); sock._ping = setInterval(() => { if (sock.readyState === 1) sock.send(JSON.stringify({ type:'ping' })) }, 25000) }
    sock.onmessage = (ev) => { try { handleEvent(JSON.parse(ev.data)) } catch {} }
    sock.onclose = () => { clearInterval(sock._ping); if (!mounted.current) return; setStatus('disconnected'); retryTimer.current = setTimeout(connect, RECONNECT_DELAYS[Math.min(retryIdx.current++, 4)]) }
    sock.onerror = () => { setStatus('error'); sock.close() }
  }

  function handleEvent(data) {
    if (data.type === 'history')      setMessages(data.messages ?? [])
    else if (data.type === 'message') setMessages(m => [...m, data.payload])
    else if (data.type === 'system')  { setUserCount(data.count ?? 0); setMessages(m => [...m, { id: crypto.randomUUID(), type:'system', msg: data.text, createdAt: Date.now() }]) }
    else if (data.type === 'presence'){ setPresence(data.users ?? []); setUserCount(data.users?.length ?? 0) }
    else if (data.type === 'typing_start') setTyping(t => t.find(u => u.userId===data.userId) ? t : [...t, { userId:data.userId, username:data.username }])
    else if (data.type === 'typing_stop')  setTyping(t => t.filter(u => u.userId !== data.userId))
    else if (data.type === 'user_count')   setUserCount(data.count)
  }

  const send = useCallback((content, mapPin=null) => {
    if (!ws.current || ws.current.readyState !== 1) return false
    ws.current.send(JSON.stringify({ type:'message', content, mapPin }))
    return true
  }, [])

  const sendTyping = useCallback(() => {
    if (!ws.current || ws.current.readyState !== 1 || typingTimer.current) return
    ws.current.send(JSON.stringify({ type:'typing' }))
    typingTimer.current = setTimeout(() => { typingTimer.current = null }, 2000)
  }, [])

  useEffect(() => {
    mounted.current = true
    connect()
    return () => { mounted.current = false; clearTimeout(retryTimer.current); if (ws.current) { clearInterval(ws.current._ping); ws.current.close() } }
  }, [roomId, token])

  return { messages, presence, typing, status, userCount, send, sendTyping }
}
