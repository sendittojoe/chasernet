import { Outlet, useLocation } from 'react-router-dom'
import NavRail                 from '../components/Nav/NavRail.jsx'
import ChaserMap               from '../components/Map/ChaserMap.jsx'
import RightPanel              from '../components/StormRoom/RightPanel.jsx'
import { useStorms }           from '../hooks/useStorms.js'
import { useWeatherData }      from '../hooks/useWeatherData.js'

export default function Shell() {
  const location = useLocation()
  const isAdmin  = location.pathname === '/app/admin'

  // Global hooks — run everywhere
  useStorms()      // loads real storms from API into nav rail
  useWeatherData() // fetches Open-Meteo tracks for active storm

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
