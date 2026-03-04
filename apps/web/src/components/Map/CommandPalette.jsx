import { useState, useEffect, useRef, useCallback } from 'react'
import { useMapStore, ALL_LAYERS, ALL_MODELS, LAYER_CATEGORIES, LAYER_PRESETS } from '../../stores/mapStore.js'

// ═══════════════════════════════════════════════════════════
// COMMAND PALETTE  —  ⌘K (Mac) / Ctrl+K (Win)
// Bloomberg-inspired instant access to everything
// ═══════════════════════════════════════════════════════════

export default function CommandPalette() {
  const [open, setOpen]           = useState(false)
  const [query, setQuery]         = useState('')
  const [selectedIdx, setSelected]= useState(0)
  const inputRef = useRef(null)
  const listRef  = useRef(null)

  const { toggleLayer, activeLayers, applyPreset,
          toggleSplit, toggleSpaghetti, toggle3D } = useMapStore()

  // ── Global keyboard shortcut ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Auto-focus input
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // ── Build search results ──
  const results = useCallback(() => {
    const q = query.toLowerCase().trim()
    const items = []

    // Layers
    ALL_LAYERS.forEach(l => {
      const cat = LAYER_CATEGORIES.find(c => c.id === l.cat)
      const match = !q ||
        l.label.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        (l.source || '').toLowerCase().includes(q) ||
        (cat?.label || '').toLowerCase().includes(q)
      if (!match) return
      const isActive = activeLayers.find(a => a.id === l.id && a.visible)
      items.push({
        type: 'layer',
        id: l.id,
        icon: l.emoji,
        label: l.label,
        meta: cat?.label || '',
        color: l.color,
        active: !!isActive,
        action: () => toggleLayer(l.id),
      })
    })

    // Presets
    LAYER_PRESETS.forEach(p => {
      const match = !q ||
        p.label.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        'preset'.includes(q)
      if (!match) return
      items.push({
        type: 'preset',
        id: 'preset-' + p.id,
        icon: p.emoji,
        label: p.label,
        meta: p.desc,
        color: p.color,
        active: false,
        action: () => applyPreset(p),
      })
    })

    // Tools
    const tools = [
      { id:'split',     icon:'◫', label:'Split View',      meta:'Compare two models', action: toggleSplit },
      { id:'spaghetti', icon:'〰', label:'Spaghetti Plots', meta:'Ensemble spread',    action: toggleSpaghetti },
      { id:'3d',        icon:'🌐', label:'Toggle 3D Globe', meta:'Globe / terrain',    action: toggle3D },
    ]
    tools.forEach(t => {
      const match = !q || t.label.toLowerCase().includes(q) || t.meta.toLowerCase().includes(q) || 'tool'.includes(q)
      if (!match) return
      items.push({ type:'tool', id: 'tool-' + t.id, icon: t.icon, label: t.label, meta: t.meta, color: '#38BDF8', active: false, action: t.action })
    })

    return items
  }, [query, activeLayers, toggleLayer, applyPreset, toggleSplit, toggleSpaghetti, toggle3D])()

  // ── Keyboard navigation ──
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      results[selectedIdx].action()
      if (results[selectedIdx].type === 'preset') setOpen(false)
    }
  }

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIdx]
      if (el) el.scrollIntoView({ block:'nearest' })
    }
  }, [selectedIdx])

  // Reset selection on query change
  useEffect(() => { setSelected(0) }, [query])

  if (!open) return null

  const typeBadge = (type) => {
    const colors = { layer:'#38BDF8', preset:'#F59E0B', tool:'#A78BFA' }
    return (
      <span style={{
        fontSize:8, fontWeight:800, letterSpacing:'0.08em',
        padding:'1px 6px', borderRadius:8,
        color: colors[type] || '#94A3B8',
        background: (colors[type] || '#94A3B8') + '18',
        textTransform:'uppercase',
        fontFamily:'var(--mono)',
      }}>{type}</span>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => setOpen(false)} style={{
        position:'fixed', inset:0, zIndex:9000,
        background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)',
      }} />

      {/* Palette */}
      <div style={{
        position:'fixed', top:'15%', left:'50%', transform:'translateX(-50%)',
        width:'min(540px, 92vw)', zIndex:9001,
        background:'rgba(13,19,32,0.98)', border:'1px solid rgba(56,189,248,0.25)',
        borderRadius:16, boxShadow:'0 24px 80px rgba(0,0,0,0.7)',
        backdropFilter:'blur(16px)', overflow:'hidden',
      }}>
        {/* Search input */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize:16, opacity:0.4 }}>⌘</span>
          <input ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search layers, presets, tools..."
            style={{
              flex:1, background:'none', border:'none', outline:'none',
              color:'var(--t1)', fontFamily:'var(--mono)', fontSize:14, fontWeight:600,
            }}
          />
          <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight:'360px', overflowY:'auto', padding:'6px 0' }}>
          {results.length === 0 && (
            <div style={{ padding:'24px', textAlign:'center', color:'var(--t3)', fontFamily:'var(--mono)', fontSize:12 }}>
              No results for "{query}"
            </div>
          )}
          {results.map((r, i) => (
            <div key={r.id}
              onClick={() => { r.action(); if (r.type === 'preset') setOpen(false) }}
              onMouseEnter={() => setSelected(i)}
              style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 18px', cursor:'pointer',
                background: i === selectedIdx ? 'rgba(56,189,248,0.08)' : 'transparent',
                transition:'background 0.08s',
              }}
            >
              <span style={{ fontSize:18, width:28, textAlign:'center', flexShrink:0 }}>{r.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{
                  fontSize:12, fontWeight:700, fontFamily:'var(--mono)',
                  color: r.active ? r.color : 'var(--t1)',
                  display:'flex', alignItems:'center', gap:8,
                }}>
                  {r.label}
                  {r.active && <span style={{ width:6, height:6, borderRadius:'50%', background:r.color }} />}
                </div>
                {r.meta && <div style={{ fontSize:9, color:'var(--t3)', marginTop:1 }}>{r.meta}</div>}
              </div>
              {typeBadge(r.type)}
            </div>
          ))}
        </div>

        {/* Hints bar */}
        <div style={{
          display:'flex', gap:16, padding:'8px 18px', borderTop:'1px solid rgba(255,255,255,0.06)',
          fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', alignItems:'center',
        }}>
          <span><Kbd>↑↓</Kbd> navigate</span>
          <span><Kbd>⏎</Kbd> toggle</span>
          <span><Kbd>esc</Kbd> close</span>
          <span style={{ marginLeft:'auto', color:'rgba(56,189,248,0.5)' }}>⌘K anywhere</span>
        </div>
      </div>
    </>
  )
}

function Kbd({ children }) {
  return (
    <span style={{
      display:'inline-block', padding:'1px 5px', borderRadius:3,
      background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
      fontFamily:'var(--mono)', fontSize:9, fontWeight:600, marginRight:2,
    }}>{children}</span>
  )
}
