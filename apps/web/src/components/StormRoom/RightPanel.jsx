import { useRoomStore } from '../../stores/roomStore.js'
import OnlinePresence from './OnlinePresence.jsx'
import DiscoveryFeed   from '../Community/DiscoveryFeed.jsx'
import LiveTab         from './tabs/LiveTab.jsx'
import AnalysisTab     from './tabs/AnalysisTab.jsx'
import ModelsTab       from './tabs/ModelsTab.jsx'
import BattleTab       from './tabs/BattleTab.jsx'

const TABS = [
  { id:'live',     label:'Live'     },
  { id:'analysis', label:'Analysis' },
  { id:'models',   label:'Models'   },
  { id:'battle',   label:'Battle'   },
]

export default function RightPanel() {
  const { activeRoom, rightTab, setRightTab } = useRoomStore()

  return (
    <aside style={{
      width:        320,
      background:   'var(--panel)',
      borderLeft:   '1px solid var(--border)',
      display:      'flex',
      flexDirection:'column',
      flexShrink:   0,
      overflow:     'hidden',
    }}>
      {true ? (
        <>
          {/* Tab bar */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setRightTab(t.id)}
                style={{
                  flex:1, padding:'11px 0', background:'transparent', border:'none',
                  borderBottom: `2px solid ${rightTab===t.id ? 'var(--blue)' : 'transparent'}`,
                  color:  rightTab===t.id ? 'var(--blue)' : 'var(--t3)',
                  fontSize:10, cursor:'pointer', fontFamily:'var(--mono)',
                  fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
                  transition:'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            {rightTab === 'live'     && <LiveTab     />}
            {rightTab === 'analysis' && <AnalysisTab />}
            {rightTab === 'models'   && <ModelsTab   />}
            {rightTab === 'battle'   && <BattleTab   />}
          </div>
        </>
      ) : (
        <>
          <div style={{
            padding:'10px 12px', borderBottom:'1px solid var(--border)',
            fontSize:11, fontWeight:700, color:'var(--t2)',
            fontFamily:'var(--mono)', letterSpacing:'0.06em',
          }}>
            DISCOVERY FEED
          </div>
          <DiscoveryFeed />
        </>
      )}
    </aside>
  )
}
