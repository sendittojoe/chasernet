// StormRoom page — sets the active room in store, Shell renders the rest
import { useEffect }    from 'react'
import { useParams }    from 'react-router-dom'
import { useRoomStore } from '../stores/roomStore.js'

export default function StormRoom() {
  const { stormId }       = useParams()
  const { setActiveRoom } = useRoomStore()
  useEffect(() => { setActiveRoom(stormId) }, [stormId])
  return null  // UI is rendered by Shell → ChaserMap + RightPanel
}
