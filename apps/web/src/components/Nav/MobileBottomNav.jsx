import { useNavigate, useLocation } from 'react-router-dom'
import { useUserStore }             from '../../stores/userStore.js'
import { useNotificationStore }     from '../../stores/notificationStore.js'

const ROLE_COLORS = {
  owner:'#F59E0B', co_creator:'#F59E0B', admin:'#EF4444',
  moderator:'#8B5CF6', vip:'#F59E0B', verified:'#22C55E',
  contributor:'#38BDF8', member:'#6B7280',
}

export default function MobileBottomNav({ onPanelToggle, panelOpen }) {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user }   = useUserStore()
  const { unread } = useNotificationStore()
  const roleColor  = ROLE_COLORS[user?.role] ?? '#6B7280'

  const tabs = [
    { icon:'🌐', label:'Map',    path:'/app' },
    { icon:'📋', label:'Forums', path:'/app/forums' },
    { icon:'💬', label:'Chat',   action: onPanelToggle, active: panelOpen },
    { icon:'✉',  label:'DMs',    path:'/app/messages' },
    { icon:'🔔', label:'Alerts', path:'/app', badge: unread },
  ]

  return (
    <nav style={{ height:56, background:'var(--panel)', borderTop:'1px solid var(--border)', display:'flex', alignItems:'stretch', flexShrink:0, zIndex:60 }}>
      {tabs.map((tab, i) => {
        const isActive = tab.active ?? (tab.path && location.pathname === tab.path)
        return (
          <div key={i} onClick={() => tab.action ? tab.action() : navigate(tab.path)} style={{
            flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:2, cursor:'pointer', position:'relative',
            borderTop: isActive ? '2px solid var(--blue)' : '2px solid transparent',
          }}>
            <span style={{ fontSize:18 }}>{tab.icon}</span>
            <span style={{ fontSize:9, color: isActive ? 'var(--blue)' : 'var(--t3)', fontFamily:'var(--mono)', fontWeight:700 }}>{tab.label}</span>
            {tab.badge > 0 && (
              <div style={{ position:'absolute', top:6, right:'calc(50% - 18px)', minWidth:14, height:14, borderRadius:'50%', background:'var(--red)', fontSize:8, fontWeight:800, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)' }}>
                {tab.badge > 99 ? '99+' : tab.badge}
              </div>
            )}
          </div>
        )
      })}
      <div onClick={() => navigate('/app/profile/' + user?.username)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, cursor:'pointer' }}>
        <div style={{ width:26, height:26, borderRadius:'50%', background: user?.avatarColor ?? roleColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'var(--bg)', fontFamily:'var(--mono)' }}>
          {user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <span style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)', fontWeight:700 }}>Me</span>
      </div>
    </nav>
  )
}
