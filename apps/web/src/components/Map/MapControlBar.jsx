import { useState, useEffect } from 'react'
import { useModelFreshness } from '../../hooks/useModelFreshness.js'
import { useMapStore, ALL_MODELS, ALL_LAYERS, LAYER_CATEGORIES, LAYER_PRESETS } from '../../stores/mapStore.js'
import FacetedPicker from './FacetedPicker.jsx'

const TABS = [
  { id:'layers',   icon:'⊞', label:'Layers' },
  { id:'models',   icon:'📡', label:'Models' },
  { id:'timeline', icon:'⏱', label:'Timeline' },
]

export default function MapControlBar() {
  const [tab, setTab]           = useState('layers')
  const [expanded, setExpanded] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, zIndex:15,
        background:'linear-gradient(to top, rgba(6,10,18,0.98) 0%, rgba(6,10,18,0.88) 85%, transparent 100%)',
        backdropFilter:'blur(6px)',
      }}>
        {/* Tab bar */}
        <div style={{
          display:'flex', alignItems:'center', padding:'0 8px',
          borderTop:'1px solid rgba(255,255,255,0.07)', gap:0,
        }}>
          {TABS.map(t => {
            const active = tab === t.id && expanded
            return (
              <button key={t.id}
                onClick={() => { setTab(t.id); setExpanded(true) }}
                style={{
                  padding:'10px 14px', background:'none', border:'none',
                  borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontFamily:'var(--mono)', fontWeight:800, fontSize:11,
                  cursor:'pointer', letterSpacing:'0.06em', transition:'all 0.15s',
                  display:'flex', alignItems:'center', gap:6,
                }}
              >
                <span style={{ fontSize:14 }}>{t.icon}</span>
                {t.label.toUpperCase()}
              </button>
            )
          })}
          <div style={{ flex:1 }} />
          <ActiveBadges />
          {/* ⌘K hint */}
          <span style={{
            fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)',
            padding:'3px 8px', borderRadius:6,
            border:'1px solid rgba(255,255,255,0.08)',
            marginRight:4, cursor:'default',
          }} title="Press ⌘K to search">⌘K</span>
          <button
            onClick={() => setExpanded(p => !p)}
            style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:13, padding:'6px 10px', display:'flex', alignItems:'center' }}
          >
            {expanded ? '▼' : '▲'}
          </button>
        </div>

        {expanded && (
          <div style={{ maxHeight:'50vh', overflowY:'auto' }}>
            {tab === 'layers'   && <LayersPanel onOpenPicker={() => setPickerOpen(true)} />}
            {tab === 'models'   && <ModelsPanel />}
            {tab === 'timeline' && <TimelinePanel />}
          </div>
        )}
      </div>

      {/* Full-screen faceted picker modal */}
      <FacetedPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  Active layer badges (compact summary)                 */
/* ═══════════════════════════════════════════════════════ */
function ActiveBadges() {
  const activeLayers = useMapStore(s => s.activeLayers)
  const visible = activeLayers.filter(l => l.visible)
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'wrap', maxWidth:350 }}>
      {visible.slice(0, 6).map(l => {
        const d = ALL_LAYERS.find(x => x.id === l.id)
        return d ? (
          <span key={l.id} style={{
            fontSize:9, fontWeight:800, color:d.color,
            background:d.color + '20', border:'1px solid ' + d.color + '40',
            borderRadius:10, padding:'2px 7px', fontFamily:'var(--mono)',
          }}>{d.emoji} {d.label}</span>
        ) : null
      })}
      {visible.length > 6 && (
        <span style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)' }}>+{visible.length - 6}</span>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  LAYERS PANEL — Presets + Drag Stack + Add Layers      */
/* ═══════════════════════════════════════════════════════ */
function LayersPanel({ onOpenPicker }) {
  const { activeLayers, toggleLayer, setLayerOpacity, removeLayer, reorderLayers,
          applyPreset, toggleSplit, splitMode, toggleSpaghetti, spaghettiEnabled } = useMapStore()
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const visibleLayers = activeLayers.filter(l => l.visible)

  // ── Drag handlers ──
  const handleDragStart = (idx) => (e) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    // For Firefox
    e.dataTransfer.setData('text/plain', idx.toString())
  }

  const handleDragOver = (idx) => (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(idx)
  }

  const handleDrop = (toIdx) => (e) => {
    e.preventDefault()
    if (dragIdx !== null && dragIdx !== toIdx) {
      reorderLayers(dragIdx, toIdx)
    }
    setDragIdx(null)
    setDragOver(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setDragOver(null)
  }

  return (
    <div style={{ padding:'6px 0 12px' }}>

      {/* ── Smart Presets Row ── */}
      <div style={{ padding:'4px 12px 10px' }}>
        <div style={{
          fontSize:9, fontWeight:800, letterSpacing:'0.1em', color:'var(--t3)',
          fontFamily:'var(--mono)', marginBottom:6,
        }}>QUICK PRESETS</div>
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
          {LAYER_PRESETS.map(p => (
            <button key={p.id}
              onClick={() => applyPreset(p)}
              style={{
                padding:'8px 14px', borderRadius:10, cursor:'pointer',
                border:`1px solid ${p.color}40`, background:`${p.color}0a`,
                display:'flex', alignItems:'center', gap:8, flexShrink:0,
                transition:'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = p.color + '20'; e.currentTarget.style.borderColor = p.color + '70' }}
              onMouseLeave={e => { e.currentTarget.style.background = p.color + '0a'; e.currentTarget.style.borderColor = p.color + '40' }}
            >
              <span style={{ fontSize:18 }}>{p.emoji}</span>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:p.color, whiteSpace:'nowrap' }}>
                  {p.label}
                </div>
                <div style={{ fontSize:8, color:'var(--t3)', whiteSpace:'nowrap', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis' }}>
                  {p.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Active Layer Stack (drag-reorder) ── */}
      <div style={{ padding:'0 12px 8px' }}>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:6,
        }}>
          <span style={{
            fontSize:9, fontWeight:800, letterSpacing:'0.1em', color:'var(--t3)',
            fontFamily:'var(--mono)',
          }}>
            ACTIVE LAYERS · {activeLayers.length}
          </span>
          <span style={{ fontSize:8, color:'var(--t3)', fontFamily:'var(--mono)' }}>
            ⠿ drag to reorder z-order
          </span>
        </div>

        {activeLayers.length === 0 && (
          <div style={{
            padding:'20px', textAlign:'center', color:'var(--t3)',
            fontFamily:'var(--mono)', fontSize:11,
            border:'1px dashed rgba(255,255,255,0.1)', borderRadius:10,
          }}>
            No active layers. Pick a preset above or browse below.
          </div>
        )}

        {activeLayers.map((l, idx) => {
          const def = ALL_LAYERS.find(x => x.id === l.id)
          if (!def) return null
          const isDragging = dragIdx === idx
          const isOver = dragOver === idx

          return (
            <div key={l.id}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDrop(idx)}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'7px 10px', borderRadius:8, marginBottom:3,
                border: isOver
                  ? '1px solid rgba(56,189,248,0.4)'
                  : isDragging
                    ? `1px solid ${def.color}60`
                    : '1px solid transparent',
                background: isDragging
                  ? `${def.color}15`
                  : isOver
                    ? 'rgba(56,189,248,0.06)'
                    : 'transparent',
                opacity: isDragging ? 0.7 : 1,
                transition:'all 0.1s',
              }}
            >
              {/* Grip handle — ONLY this is draggable */}
              <span
                draggable
                onDragStart={handleDragStart(idx)}
                onDragEnd={handleDragEnd}
                style={{
                  fontSize:12, color:'var(--t3)', cursor:'grab', flexShrink:0,
                  opacity: isDragging ? 1 : 0.4, userSelect:'none',
                  padding:'4px 2px', touchAction:'none',
                }}
              >⠿</span>

              {/* Tappable area — toggles visibility */}
              <div
                onClick={() => toggleLayer(l.id)}
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  flex:1, minWidth:0, cursor:'pointer',
                  padding:'2px 0',
                }}
              >
                <span style={{ fontSize:16, flexShrink:0, opacity: l.visible ? 1 : 0.4 }}>{def.emoji}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:10, fontWeight:700, fontFamily:'var(--mono)',
                    color: l.visible ? def.color : 'var(--t3)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    textDecoration: l.visible ? 'none' : 'line-through',
                  }}>{def.label}</div>
                  <div style={{ fontSize:8, color:'var(--t3)', marginTop:1 }}>
                    {def.source || 'Open-Meteo'}
                  </div>
                </div>
                {/* Visibility indicator dot */}
                <div style={{
                  width:6, height:6, borderRadius:'50%', flexShrink:0,
                  background: l.visible ? def.color : 'rgba(255,255,255,0.15)',
                  boxShadow: l.visible ? `0 0 6px ${def.color}60` : 'none',
                  transition:'all 0.15s',
                }} />
              </div>

              {/* Opacity slider — isolated from drag & tap */}
              <input type="range" min={10} max={100}
                value={Math.round(l.opacity * 100)}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
                onChange={e => { e.stopPropagation(); setLayerOpacity(l.id, parseInt(e.target.value) / 100) }}
                onClick={e => e.stopPropagation()}
                style={{
                  width:50, cursor:'pointer', accentColor: def.color,
                  flexShrink:0,
                }}
              />
              <span style={{
                fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)',
                minWidth:22, textAlign:'right', flexShrink:0,
              }}>{Math.round(l.opacity * 100)}%</span>

              {/* Remove */}
              <button
                onClick={(e) => { e.stopPropagation(); removeLayer(l.id) }}
                style={{
                  width:20, height:20, borderRadius:4, border:'none',
                  background:'transparent', cursor:'pointer', fontSize:12,
                  color:'var(--t3)', display:'flex', alignItems:'center',
                  justifyContent:'center', flexShrink:0,
                }}
                title="Remove layer"
              >×</button>
            </div>
          )
        })}

        {/* ── Add Layers Button → opens Faceted Picker ── */}
        <button
          onClick={onOpenPicker}
          style={{
            width:'100%', padding:'10px', marginTop:6,
            borderRadius:10, cursor:'pointer',
            border:'1px dashed rgba(56,189,248,0.3)',
            background:'rgba(56,189,248,0.04)',
            color:'#38BDF8', fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            transition:'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.1)'; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.04)'; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)' }}
        >
          + BROWSE ALL {ALL_LAYERS.length} LAYERS
        </button>
      </div>

      {/* Split View / Spaghetti */}
      <div style={{ padding:'8px 12px 4px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={toggleSplit} style={{
            flex:1, padding:'8px 12px', borderRadius:8,
            border: splitMode ? '1px solid #38BDF8' : '1px solid #1E293B',
            background: splitMode ? 'rgba(56,189,248,0.15)' : 'rgba(15,23,42,0.8)',
            color: splitMode ? '#38BDF8' : '#64748B',
            fontSize:11, fontWeight:700, fontFamily:'var(--mono)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>◫ SPLIT VIEW</button>
          <button onClick={toggleSpaghetti} style={{
            flex:1, padding:'8px 12px', borderRadius:8,
            border: spaghettiEnabled ? '1px solid #A78BFA' : '1px solid #1E293B',
            background: spaghettiEnabled ? 'rgba(167,139,250,0.15)' : 'rgba(15,23,42,0.8)',
            color: spaghettiEnabled ? '#A78BFA' : '#64748B',
            fontSize:11, fontWeight:700, fontFamily:'var(--mono)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>〰 SPAGHETTI</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  MODELS PANEL                                          */
/* ═══════════════════════════════════════════════════════ */
function ModelsPanel() {
  const freshness = useModelFreshness(['gfs','ecmwf','hrrr','nam','icon','gefs','cmc','aifs'])
  const { activeModels, primaryModel, toggleModel, setPrimaryModel, modelData } = useMapStore()
  return (
    <div style={{ padding:'8px 12px 14px' }}>
      <div style={{ fontSize:9, color:'var(--t3)', fontWeight:700, letterSpacing:'0.1em', marginBottom:8 }}>
        {activeModels.length} MODEL{activeModels.length !== 1 ? 'S' : ''} ACTIVE — click to toggle · ★ to set primary
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:6 }}>
        {ALL_MODELS.map(m => {
          const isActive  = activeModels.includes(m.id)
          const isPrimary = primaryModel === m.id
          const hasData   = !!modelData?.[m.id]
          return (
            <div key={m.id} style={{
              padding:'8px 10px', borderRadius:8, cursor:'pointer',
              border:'1px solid ' + (isActive ? m.color + '70' : 'rgba(255,255,255,0.07)'),
              background: isPrimary ? m.color + '22' : isActive ? m.color + '0e' : 'rgba(255,255,255,0.02)',
              transition:'all 0.12s',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }} onClick={() => toggleModel(m.id)}>
                <div style={{
                  width:7, height:7, borderRadius:'50%', flexShrink:0,
                  background: hasData ? '#22C55E' : isActive ? m.color : 'rgba(255,255,255,0.15)',
                  boxShadow: hasData ? '0 0 6px #22C55E80' : 'none',
                }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:800, color: isActive ? m.color : 'var(--t3)', fontFamily:'var(--mono)' }}>{m.short}</div>
                  <div style={{ fontSize:9, color:'var(--t3)' }}>{m.source} · {m.res}</div>
                </div>
                {isActive && (
                  <div onClick={e => { e.stopPropagation(); setPrimaryModel(m.id) }} title="Set primary"
                    style={{ fontSize:15, color: isPrimary ? '#F59E0B' : 'rgba(255,255,255,0.18)', cursor:'pointer', lineHeight:1 }}>★</div>
                )}
              </div>
              {isPrimary && <div style={{ marginTop:3, fontSize:8, color:m.color, fontFamily:'var(--mono)', fontWeight:700, letterSpacing:'0.08em' }}>PRIMARY</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  TIMELINE PANEL                                        */
/* ═══════════════════════════════════════════════════════ */
const TICK_MARKS = [0, 3, 6, 12, 24, 48, 72, 120, 168, 240, 384]

function formatTick(h) {
  if (h === 0) return 'Now'
  if (h < 24) return h + 'h'
  return Math.round(h / 24) + 'd'
}

function TimelinePanel() {
  const { hour, setHour, playing, setPlaying, activeModels, primaryModel } = useMapStore()
  const modelDef = ALL_MODELS.find(m => m.id === primaryModel)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => useMapStore.getState().tickHour(), 400)
    return () => clearInterval(id)
  }, [playing])

  const dayNum = hour < 24 ? 1 : Math.ceil(hour / 24)
  const dateStr = new Date(Date.now() + hour * 3600000).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })

  return (
    <div style={{ padding:'10px 14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
        <button onClick={() => setPlaying(!playing)} style={{
          width:36, height:36, borderRadius:'50%',
          border:'1px solid var(--border)',
          background: playing ? 'var(--blue)' : 'transparent',
          color: playing ? 'var(--bg)' : 'var(--t2)',
          cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>
          {playing ? '⏸' : '▶'}
        </button>

        <div style={{ flex:1 }}>
          <input type="range" min={0} max={384} step={1} value={hour}
            onChange={e => setHour(+e.target.value)}
            style={{ width:'100%', accentColor: modelDef?.color ?? 'var(--blue)', cursor:'pointer' }} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
            {TICK_MARKS.map(h => (
              <span key={h} onClick={() => setHour(h)} style={{
                fontSize:8, fontFamily:'var(--mono)', cursor:'pointer',
                color: h === hour ? 'var(--blue)' : 'var(--t3)',
                fontWeight: h === hour ? 800 : 400,
              }}>{formatTick(h)}</span>
            ))}
          </div>
        </div>

        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:20, fontWeight:800, color: modelDef?.color ?? 'var(--blue)', fontFamily:'var(--mono)' }}>+{hour}h</div>
          <div style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)' }}>Day {dayNum} · {dateStr}</div>
        </div>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {activeModels.map(id => {
          const m = ALL_MODELS.find(x => x.id === id)
          return m ? (
            <span key={id} style={{
              fontSize:9, fontFamily:'var(--mono)', fontWeight:700,
              display:'flex', alignItems:'center', gap:5, color:m.color,
            }}>
              <span style={{ width:18, height:2, background:m.color, display:'inline-block', borderRadius:1 }} />
              {m.short}{id === primaryModel && <span style={{ color:'#F59E0B' }}>★</span>}
            </span>
          ) : null
        })}
      </div>
    </div>
  )
}
