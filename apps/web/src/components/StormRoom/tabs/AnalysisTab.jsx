import { useState }       from 'react'
import { useRoomStore }   from '../../../stores/roomStore.js'
import MapPin             from '../../UI/MapPin.jsx'

const THREADS = {
  'beatriz-2026': [
    { id:'t1', title:'Euro 12z Major Westward Shift — Full Analysis', author:'wx_mike', replies:47, hot:true, time:'14m ago',
      pin:{ model:'Euro IFS', modelB:'GFS', layer:'wind', hour:96, spread:180, label:'Euro 12z — 96h Track Compare' },
      body:'The Euro 12z run represents a significant departure from previous runs and from GFS. The 500mb ridge to the north is breaking down ~12h faster in Euro, opening a southwestward track corridor. The steering flow difference is clear at 300mb.',
      poll:{ q:'Which model do you trust at 96h?', opts:['Euro IFS (westward)','GFS (eastward)','Too uncertain'], pct:[58,27,15] }
    },
    { id:'t2', title:'Shear Analysis — Window Closing for RI?', author:'storm_sarah', replies:31, hot:true, time:'2h ago',
      pin:{ model:'HRRR', modelB:null, layer:'wind', hour:24, spread:null, label:'HRRR Shear — 24h' }},
    { id:'t3', title:'GEFS Spread — Trimodal Uncertainty at 120h', author:'data_nerd', replies:23, hot:false, time:'3h ago',
      pin:{ model:'GEFS', modelB:null, layer:'track', hour:120, spread:240, label:'GEFS 120h Spaghetti' }},
    { id:'t4', title:'EC-AIFS vs Classical Ensemble — Season Review', author:'chase_dev', replies:18, hot:false, time:'4h ago',
      pin:{ model:'EC-AIFS', modelB:'GEFS', layer:'wind', hour:96, spread:145, label:'AI vs Ensemble' }},
  ],
  'invest96w-2026': [
    { id:'t5', title:'96W: Development Chances — Model Disagreement', author:'typhoon_tom', replies:12, hot:false, time:'45m ago',
      pin:{ model:'ICON', modelB:'GFS', layer:'wind', hour:48, spread:null, label:'96W Development Models' }},
  ],
}

export default function AnalysisTab() {
  const { activeRoom } = useRoomStore()
  const [thread, setThread] = useState(null)
  const threads = THREADS[activeRoom] ?? []

  if (thread) return <ThreadDetail thread={thread} onBack={() => setThread(null)} />

  return (
    <div style={{ flex:1, overflowY:'auto', padding:12 }}>
      {threads.map(t => (
        <div key={t.id} onClick={() => setThread(t)}
          style={{ padding:10, background:'var(--card)', borderRadius:8, border:'1px solid var(--border)',
            cursor:'pointer', marginBottom:8, transition:'border-color 0.15s' }}>

          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--t1)', lineHeight:1.4 }}>{t.title}</span>
            {t.hot && <span style={{ flexShrink:0, marginLeft:6, fontSize:9, fontWeight:700, color:'var(--red)',
              background:'rgba(239,68,68,0.12)', padding:'2px 5px', borderRadius:3, fontFamily:'var(--mono)' }}>HOT</span>}
          </div>

          {/* Inline map pin */}
          {t.pin && (
            <div onClick={e => e.stopPropagation()}
              style={{ marginBottom:7 }}>
              <MapPin pin={t.pin} />
            </div>
          )}

          <div style={{ display:'flex', gap:8, fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>
            <span>{t.author}</span><span>·</span>
            <span>{t.replies} replies</span><span>·</span>
            <span>{t.time}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ThreadDetail({ thread, onBack }) {
  return (
    <div style={{ flex:1, overflowY:'auto', padding:12 }}>
      <button onClick={onBack} style={{
        marginBottom:10, padding:'4px 8px', background:'var(--card)',
        border:'1px solid var(--border)', borderRadius:5,
        color:'var(--t2)', fontSize:11, fontFamily:'var(--mono)',
      }}>← back</button>

      <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', lineHeight:1.4, marginBottom:8 }}>{thread.title}</div>

      {thread.pin && <MapPin pin={thread.pin} />}

      {thread.body && (
        <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.65, marginTop:10 }}>{thread.body}</div>
      )}

      {thread.poll && (
        <div style={{ marginTop:14, padding:10, background:'var(--card)', borderRadius:8, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--amber)', marginBottom:6, fontFamily:'var(--mono)', letterSpacing:'0.06em' }}>THREAD POLL</div>
          <div style={{ fontSize:12, color:'var(--t1)', marginBottom:10 }}>{thread.poll.q}</div>
          {thread.poll.opts.map((opt,i) => (
            <div key={i} style={{ marginBottom:7 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:11, color:'var(--t2)' }}>{opt}</span>
                <span style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>{thread.poll.pct[i]}%</span>
              </div>
              <div style={{ height:4, background:'var(--border)', borderRadius:2 }}>
                <div style={{ width:`${thread.poll.pct[i]}%`, height:'100%', borderRadius:2,
                  background:['var(--blue)','var(--amber)','var(--t3)'][i] }}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
