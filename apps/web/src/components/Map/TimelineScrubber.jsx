import { useEffect, useRef, useState } from 'react'
import { useMapStore } from '../../stores/mapStore.js'

const PRESSURE_LEVELS = [
  { key:'surface', label:'SFC'  },
  { key:'850',     label:'850mb' },
  { key:'700',     label:'700mb' },
  { key:'500',     label:'500mb' },
  { key:'300',     label:'300mb' },
  { key:'250',     label:'250mb' },
]

const HOUR_MARKERS = [0,24,48,72,96,120,144,168]

function fmtHour(h) {
  const now = new Date()
  now.setHours(now.getHours() + h, 0, 0, 0)
  const day = now.toLocaleDateString('en-US', { weekday:'short' })
  const time = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false })
  return { day, time, label: h === 0 ? 'NOW' : '+' + h + 'h' }
}

function fmtRadarTime(ts) {
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false })
}

export default function TimelineScrubber() {
  const {
    hour, setHour, playing, modelA, modelB, split,
    pressureLevel, setPressureLevel,
    radarFrames, radarFrameIndex, setRadarFrameIndex, radarPlaying, setRadarPlaying,
    showRadar, showSatellite,
    satFrames, satFrameIndex, setSatFrameIndex,
    animSpeed,
  } = useMapStore()

  const playRef    = useRef(null)
  const radarRef   = useRef(null)
  const [tab, setTab] = useState('forecast')

  // Auto-switch to radar loop tab when radar/sat enabled
  useEffect(() => {
    if (showRadar || showSatellite) setTab('radar')
    else setTab('forecast')
  }, [showRadar, showSatellite])

  const isRadarMode = tab === 'radar' && (showRadar || showSatellite)
  const frames      = showSatellite ? satFrames : radarFrames
  const frameIdx    = showSatellite ? satFrameIndex : radarFrameIndex
  const setFrameIdx = showSatellite ? setSatFrameIndex : setRadarFrameIndex

  // Forecast playback
  useEffect(() => {
    clearInterval(playRef.current)
    if (!playing) return
    const speed = Math.max(100, 600 / (animSpeed ?? 1))
    playRef.current = setInterval(() => {
      const { hour: h } = useMapStore.getState()
      setHour(h >= 168 ? 0 : h + 6)
    }, speed)
    return () => clearInterval(playRef.current)
  }, [playing, animSpeed])

  // Radar loop
  useEffect(() => {
    clearInterval(radarRef.current)
    if (!radarPlaying || !frames.length) return
    const speed = Math.max(80, 400 / (animSpeed ?? 1))
    radarRef.current = setInterval(() => {
      const { radarFrames: rf, radarFrameIndex: ri, satFrames: sf, satFrameIndex: si } = useMapStore.getState()
      const fr = showSatellite ? sf : rf
      const idx = showSatellite ? si : ri
      const next = idx >= fr.length - 1 ? 0 : idx + 1
      setFrameIdx(next)
    }, speed)
    return () => clearInterval(radarRef.current)
  }, [radarPlaying, frames.length, animSpeed, showSatellite])

  const t = fmtHour(hour)

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{
      padding:'3px 10px', borderRadius:5, border:'none', cursor:'pointer',
      fontFamily:'var(--mono)', fontWeight:700, fontSize:9, letterSpacing:'0.06em',
      background: tab===id ? 'rgba(56,189,248,0.2)' : 'transparent',
      color: tab===id ? '#38BDF8' : 'rgba(255,255,255,0.35)',
      borderBottom: tab===id ? '2px solid #38BDF8' : '2px solid transparent',
    }}>{label}</button>
  )

  return (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0, zIndex:10,
      background:'linear-gradient(to top, rgba(6,10,18,0.97) 60%, transparent 100%)',
      padding:'0 16px 14px',
    }}>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:2, marginBottom:8, alignItems:'center' }}>
        <TabBtn id="forecast" label="FORECAST" />
        {(showRadar || showSatellite) && <TabBtn id="radar" label={showSatellite ? 'SAT LOOP' : 'RADAR LOOP'} />}
        <div style={{ flex:1 }}/>

        {/* Pressure level selector */}
        <div style={{ display:'flex', gap:2, alignItems:'center' }}>
          <span style={{ fontSize:8, color:'rgba(255,255,255,0.3)', fontFamily:'var(--mono)', marginRight:4 }}>LEVEL</span>
          {PRESSURE_LEVELS.map(pl => (
            <button key={pl.key} onClick={() => setPressureLevel(pl.key)} style={{
              padding:'2px 6px', borderRadius:4, border:'none', cursor:'pointer',
              fontFamily:'var(--mono)', fontWeight:700, fontSize:8,
              background: pressureLevel===pl.key ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
              color: pressureLevel===pl.key ? '#F59E0B' : 'rgba(255,255,255,0.3)',
              outline: pressureLevel===pl.key ? '1px solid rgba(245,158,11,0.4)' : 'none',
            }}>{pl.label}</button>
          ))}
        </div>
      </div>

      {/* FORECAST TAB */}
      {tab === 'forecast' && (
        <>
          {/* Time display */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <button
              onClick={() => {
              const s = useMapStore.getState()
              if (showRadar || showSatellite) {
                useMapStore.setState({ radarPlaying: !s.radarPlaying })
              } else {
                useMapStore.setState({ playing: !s.playing })
              }
            }}
              style={{
                width:28, height:28, borderRadius:6, border:'none', cursor:'pointer',
                background: playing ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.08)',
                color: playing ? '#38BDF8' : 'rgba(255,255,255,0.6)',
                fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              }}
            >
              {(playing || radarPlaying) ? '⏸' : '▶'}
            </button>

            <div style={{ fontFamily:'var(--mono)', display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontSize:18, fontWeight:700, color:'#38BDF8', lineHeight:1 }}>{t.label}</span>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>{t.day} {t.time} UTC</span>
            </div>
            <div style={{ flex:1 }}/>
            <button onClick={() => setHour(0)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:8, color:'rgba(255,255,255,0.3)', fontFamily:'var(--mono)' }}>RESET</button>
          </div>

          {/* Scrubber track */}
          <div style={{ position:'relative', marginBottom:6 }}>
            {/* Day tick marks */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:16, display:'flex', pointerEvents:'none' }}>
              {HOUR_MARKERS.map(h => (
                <div key={h} style={{ position:'absolute', left: (h/168*100)+'%', transform:'translateX(-50%)' }}>
                  <div style={{ width:1, height:6, background:'rgba(255,255,255,0.15)', margin:'0 auto' }}/>
                  <div style={{ fontSize:7, color:'rgba(255,255,255,0.25)', fontFamily:'var(--mono)', textAlign:'center', marginTop:1 }}>
                    {h === 0 ? 'NOW' : fmtHour(h).day}
                  </div>
                </div>
              ))}
            </div>

            <input
              type="range" min={0} max={168} step={6} value={hour}
              onChange={e => setHour(+e.target.value)}
              style={{ width:'100%', marginTop:18, cursor:'pointer' }}
            />
          </div>

          {/* Model legend */}
          <div style={{ display:'flex', gap:12 }}>
            <ModelPill color="#38BDF8" label={modelA} level={pressureLevel} />
            {split && <ModelPill color="#F59E0B" label={modelB} level={pressureLevel} />}
          </div>
        </>
      )}

      {/* RADAR/SAT LOOP TAB */}
      {tab === 'radar' && (showRadar || showSatellite) && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <button
              onClick={() => setRadarPlaying(!radarPlaying)}
              style={{
                width:28, height:28, borderRadius:6, border:'none', cursor:'pointer',
                background: radarPlaying ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)',
                color: radarPlaying ? '#22C55E' : 'rgba(255,255,255,0.6)',
                fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              }}
            >
              {radarPlaying ? '⏸' : '▶'}
            </button>

            <div style={{ fontFamily:'var(--mono)', display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#22C55E', lineHeight:1 }}>
                {frames[frameIdx] ? fmtRadarTime(frames[frameIdx].time) : '--:--'}
              </span>
              <span style={{ fontSize:9, color:'rgba(255,255,255,0.4)' }}>
                UTC &nbsp;·&nbsp; frame {frameIdx + 1}/{frames.length}
              </span>
            </div>
            <div style={{ flex:1 }}/>
            <span style={{ fontSize:8, color:'rgba(255,255,255,0.3)', fontFamily:'var(--mono)' }}>
              {showSatellite ? 'IR SATELLITE' : 'COMPOSITE RADAR'} &nbsp;·&nbsp; last 2hrs
            </span>
          </div>

          {/* Frame scrubber */}
          <div style={{ position:'relative', marginBottom:6 }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:16, display:'flex', pointerEvents:'none', justifyContent:'space-between' }}>
              {frames.map((f, i) => (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={{ width:1, height: i === frameIdx ? 10 : 5, background: i === frameIdx ? '#22C55E' : 'rgba(255,255,255,0.12)' }}/>
                </div>
              ))}
            </div>
            <input
              type="range" min={0} max={Math.max(0, frames.length - 1)} step={1} value={frameIdx}
              onChange={e => { setRadarPlaying(false); setFrameIdx(+e.target.value) }}
              style={{ width:'100%', marginTop:18, cursor:'pointer' }}
            />
          </div>

          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:8, color:'rgba(255,255,255,0.25)', fontFamily:'var(--mono)' }}>
              {frames[0] ? fmtRadarTime(frames[0].time) : ''} UTC
            </span>
            <span style={{ fontSize:8, color:'rgba(255,255,255,0.25)', fontFamily:'var(--mono)' }}>
              {frames[frames.length-1] ? fmtRadarTime(frames[frames.length-1].time) : ''} UTC
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function ModelPill({ color, label, level }) {
  return (
    <span style={{ fontSize:9, color, fontFamily:'var(--mono)', display:'flex', alignItems:'center', gap:4 }}>
      <span style={{ width:14, height:2, background:color, display:'inline-block', borderRadius:1 }}/>
      {label}
      {level !== 'surface' && (
        <span style={{ fontSize:8, color:'rgba(255,255,255,0.3)', marginLeft:2 }}>@ {level}mb</span>
      )}
    </span>
  )
}
