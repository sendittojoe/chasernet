import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ShareButton    from '../components/Map/ShareButton.jsx'
import FreshnessBadges from '../components/Map/FreshnessBadges.jsx'
import NavRail             from '../components/Nav/NavRail.jsx'
import ChaserMap           from '../components/Map/ChaserMap.jsx'
import RightPanel          from '../components/StormRoom/RightPanel.jsx'
import MobileBottomNav     from '../components/Nav/MobileBottomNav.jsx'
import { useMapStore }     from '../stores/mapStore.js'
import { useRoomStore }    from '../stores/roomStore.js'
import { useStorms }       from '../hooks/useStorms.js'
import { useModelRuns }    from '../hooks/useModelRuns.js'
import { usePresence, useDirectMessages } from '../hooks/usePresence.js'
import CommandPalette      from '../components/Map/CommandPalette.jsx'

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return mobile
}

export default function Shell() {
  const mapObjRef = { current: null }
  const { rightCollapsed, setRightCollapsed } = useMapStore()
  const { activeRoom } = useRoomStore()
  const isMobile = useIsMobile()
  const [mobilePanel, setMobilePanel] = useState(false)

  useStorms()
  const { runs } = useModelRuns()
  usePresence()

  const { fetchConversations } = useDirectMessages()
  useEffect(() => { fetchConversations() }, [fetchConversations])

  const location = useLocation()
  const isMapRoute = location.pathname === '/app' || location.pathname.startsWith('/app/storm')

  if (isMobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column', width:'100vw', height:'100dvh', overflow:'hidden', background:'var(--bg)' }}>
        <CommandPalette />
        <div style={{ flex:1, position:'relative', minHeight:0 }}>
          <ChaserMap />
          {/* Floating overlays */}
          {isMapRoute && (
            <>
              <div style={{ position:'absolute', top:56, left:10, zIndex:35, pointerEvents:'auto' }}>
                <ShareButton mapRef={mapObjRef} />
              </div>
              <div style={{ position:'absolute', top:56, right:10, zIndex:35, pointerEvents:'auto' }}>
                <FreshnessBadges />
              </div>
            </>
          )}
        </div>
        {(mobilePanel || activeRoom) && (
          <div style={{
            position:'absolute', bottom:56, left:0, right:0,
            height: mobilePanel ? '55vh' : '35vh',
            background:'var(--panel)', borderTop:'1px solid var(--border)',
            borderRadius:'16px 16px 0 0', zIndex:50,
            display:'flex', flexDirection:'column',
            boxShadow:'0 -8px 32px rgba(0,0,0,0.5)',
            transition:'height 0.25s ease',
          }}>
            <div onClick={() => setMobilePanel(p => !p)} style={{ padding:'10px', display:'flex', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)' }}/>
            </div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <RightPanel />
            </div>
          </div>
        )}
        <MobileBottomNav onPanelToggle={() => setMobilePanel(p => !p)} panelOpen={mobilePanel} />
      </div>
    )
  }

  return (
    <div style={{ display:'flex', width:'100vw', height:'100dvh', overflow:'hidden', background:'var(--bg)' }}>
      <CommandPalette />
      <NavRail />

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, position:'relative' }}>
        <ChaserMap />

        {/* Floating overlays on map */}
        {isMapRoute && (
          <div style={{
            position:'absolute', top:56, left:10, right:10, zIndex:35,
            display:'flex', alignItems:'flex-start', justifyContent:'space-between',
            pointerEvents:'none',
          }}>
            <div style={{ pointerEvents:'auto' }}>
              <ShareButton mapRef={mapObjRef} />
            </div>
            <div style={{ pointerEvents:'auto' }}>
              <FreshnessBadges />
            </div>
          </div>
        )}

        {!isMapRoute && (
          <div style={{ position:'absolute', inset:0, zIndex:30, background:'var(--bg)', overflow:'auto', display:'flex' }}>
            <Outlet />
          </div>
        )}
      </div>

      <div onClick={() => setRightCollapsed(!rightCollapsed)} title={rightCollapsed ? 'Expand panel' : 'Collapse panel'} style={{
        position:'absolute', right: rightCollapsed ? 4 : 324, top:'50%', transform:'translateY(-50%)',
        zIndex:40, width:16, height:48, borderRadius:4,
        background:'var(--card)', border:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', fontSize:12, color:'var(--t3)',
        transition:'right 0.2s ease',
      }}>
        {rightCollapsed ? '<' : '>'}
      </div>
      <div style={{ width: rightCollapsed ? 0 : 320, overflow:'hidden', transition:'width 0.2s ease', flexShrink:0 }}>
        <RightPanel />
      </div>
    </div>
  )
}
