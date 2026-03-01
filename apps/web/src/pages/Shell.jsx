import { Outlet }       from 'react-router-dom'
import { useState }     from 'react'
import NavRail          from '../components/Nav/NavRail.jsx'
import ChaserMap        from '../components/Map/ChaserMap.jsx'
import RightPanel       from '../components/StormRoom/RightPanel.jsx'
import { useMapStore }  from '../stores/mapStore.js'
import { useRoomStore } from '../stores/roomStore.js'

/**
 * Shell is the persistent layout for all authenticated views.
 *
 * Layout:
 *   [56px NavRail] [MAP — fills remaining width] [320px RightPanel]
 *
 * The map is ALWAYS present. The right panel content swaps based
 * on which room/view is active — it never unmounts the map.
 */
export default function Shell() {
  const { activeRoom } = useRoomStore()

  return (
    <div style={{
      display: 'flex',
      width:   '100vw',
      height:  '100dvh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Left navigation rail — 56px wide */}
      <NavRail />

      {/* Map column — fills all remaining space */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ChaserMap />
      </div>

      {/* Right context panel — 320px */}
      <RightPanel />
    </div>
  )
}
