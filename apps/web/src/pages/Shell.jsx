import { Outlet }       from 'react-router-dom'
import NavRail          from '../components/Nav/NavRail.jsx'
import ChaserMap        from '../components/Map/ChaserMap.jsx'
import RightPanel       from '../components/StormRoom/RightPanel.jsx'
import { useRoomStore } from '../stores/roomStore.js'
import { useLocation }  from 'react-router-dom'

export default function Shell() {
  const { activeRoom } = useRoomStore()
  const location       = useLocation()
  const isAdmin        = location.pathname === '/app/admin'

  if (isAdmin) {
    return (
      <div style={{ display:'flex', width:'100vw', height:'100dvh', overflow:'hidden', background:'var(--bg)' }}>
        <NavRail />
        <div style={{ flex:1, overflow:'hidden' }}>
          <Outlet />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', width:'100vw', height:'100dvh', overflow:'hidden', background:'var(--bg)' }}>
      <NavRail />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <ChaserMap />
      </div>
      <RightPanel />
    </div>
  )
}
