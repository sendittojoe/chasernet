import { useState, useEffect } from 'react'
import NavRail             from '../components/Nav/NavRail.jsx'
import ChaserMap           from '../components/Map/ChaserMap.jsx'
import RightPanel          from '../components/StormRoom/RightPanel.jsx'
import MobileBottomNav     from '../components/Nav/MobileBottomNav.jsx'
import { useMapStore }     from '../stores/mapStore.js'
import { useRoomStore }    from '../stores/roomStore.js'

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
  const { navCollapsed, rightCollapsed, setNavCollapsed, setRightCollapsed } = useMapStore()
  const { activeRoom } = useRoomStore()
  const isMobile = useIsMobile()
  const [mobilePanel, setMobilePanel] = useState(false)

  if (isMobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column', width:'100vw', height:'100dvh', overflow:'hidden', background:'var(--bg)' }}>
        <div style={{ flex:1, position:'relative', minHeight:0 }}>
          <ChaserMap />
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
      <div style={{ width: navCollapsed ? 0 : 56, overflow:'hidden', transition:'width 0.2s ease', flexShrink:0 }}>
        <NavRail />
      </div>
      <div onClick={() => setNavCollapsed(!navCollapsed)} title={navCollapsed ? 'Expand nav' : 'Collapse nav'} style={{
        position:'absolute', left: navCollapsed ? 4 : 60, top:'50%', transform:'translateY(-50%)',
        zIndex:40, width:16, height:48, borderRadius:4,
        background:'var(--card)', border:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', fontSize:12, color:'var(--t3)',
        transition:'left 0.2s ease',
      }}>
        {navCollapsed ? '>' : '<'}
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, position:'relative' }}>
        <ChaserMap />
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
