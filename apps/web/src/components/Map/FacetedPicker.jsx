import { useState, useMemo } from 'react'
import { useMapStore, ALL_LAYERS, LAYER_CATEGORIES, LAYER_TAGS, ALL_TAGS } from '../../stores/mapStore.js'

// ═══════════════════════════════════════════════════════════
// FACETED PICKER — NASA Worldview-style full-screen layer browser
// Left facets (category, source, tag) + search + scrollable card grid
// ═══════════════════════════════════════════════════════════

export default function FacetedPicker({ open, onClose }) {
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState(null) // null = all
  const [srcFilter, setSrcFilter] = useState(null)
  const [tagFilters, setTagFilters] = useState([]) // intersect

  const { activeLayers, toggleLayer, setLayerOpacity } = useMapStore()

  // Unique sources
  const allSources = useMemo(() => {
    const s = new Set()
    ALL_LAYERS.forEach(l => {
      if (l.source) s.add(l.source)
      else s.add('Open-Meteo') // default for forecast layers
    })
    return [...s].sort()
  }, [])

  // Filter logic
  const filtered = useMemo(() => {
    return ALL_LAYERS.filter(l => {
      // Search
      if (search.length >= 2) {
        const q = search.toLowerCase()
        const cat = LAYER_CATEGORIES.find(c => c.id === l.cat)
        const haystack = [l.label, l.id, l.source || 'Open-Meteo', cat?.label || '', ...(LAYER_TAGS[l.id] || [])].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      // Category facet
      if (catFilter && l.cat !== catFilter) return false
      // Source facet
      if (srcFilter) {
        const lsrc = l.source || 'Open-Meteo'
        if (lsrc !== srcFilter) return false
      }
      // Tag facets (intersect — must match ALL selected tags)
      if (tagFilters.length > 0) {
        const ltags = LAYER_TAGS[l.id] || []
        if (!tagFilters.every(t => ltags.includes(t))) return false
      }
      return true
    })
  }, [search, catFilter, srcFilter, tagFilters])

  // Count layers per facet value
  const catCounts = useMemo(() => {
    const m = {}
    ALL_LAYERS.forEach(l => { m[l.cat] = (m[l.cat] || 0) + 1 })
    return m
  }, [])

  const srcCounts = useMemo(() => {
    const m = {}
    ALL_LAYERS.forEach(l => {
      const s = l.source || 'Open-Meteo'
      m[s] = (m[s] || 0) + 1
    })
    return m
  }, [])

  const tagCounts = useMemo(() => {
    const m = {}
    Object.values(LAYER_TAGS).flat().forEach(t => { m[t] = (m[t] || 0) + 1 })
    return m
  }, [])

  const clearAll = () => { setCatFilter(null); setSrcFilter(null); setTagFilters([]); setSearch('') }
  const hasFilters = catFilter || srcFilter || tagFilters.length > 0 || search.length >= 2

  if (!open) return null

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:8000,
      background:'rgba(6,10,18,0.98)', backdropFilter:'blur(8px)',
      display:'flex', flexDirection:'column',
    }}>
      {/* ── Header ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'14px 20px',
        borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0,
      }}>
        <span style={{ fontSize:18 }}>⊞</span>
        <input
          autoFocus value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${ALL_LAYERS.length} layers by name, category, source, or tag...`}
          style={{
            flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:10, padding:'10px 14px', color:'var(--t1)',
            fontFamily:'var(--mono)', fontSize:12, outline:'none',
          }}
        />
        <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t2)', fontWeight:700, whiteSpace:'nowrap' }}>
          {filtered.length} / {ALL_LAYERS.length}
        </span>
        {hasFilters && (
          <button onClick={clearAll} style={{
            padding:'6px 14px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)',
            background:'rgba(239,68,68,0.1)', color:'#EF4444',
            fontFamily:'var(--mono)', fontSize:10, fontWeight:700, cursor:'pointer',
          }}>Clear filters</button>
        )}
        <button onClick={onClose} style={{
          width:36, height:36, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)',
          background:'transparent', color:'var(--t2)', cursor:'pointer', fontSize:16,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>×</button>
      </div>

      {/* ── Body: Facets | Grid ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Left facets */}
        <div style={{
          width:200, borderRight:'1px solid rgba(255,255,255,0.06)',
          padding:'12px', overflowY:'auto', flexShrink:0,
        }}>
          {/* Category facet */}
          <FacetGroup title="CATEGORY">
            {LAYER_CATEGORIES.map(cat => (
              <FacetOption key={cat.id}
                label={`${cat.icon} ${cat.label}`}
                count={catCounts[cat.id] || 0}
                active={catFilter === cat.id}
                onClick={() => setCatFilter(catFilter === cat.id ? null : cat.id)}
              />
            ))}
          </FacetGroup>

          {/* Source facet */}
          <FacetGroup title="DATA SOURCE">
            {allSources.map(src => (
              <FacetOption key={src}
                label={src}
                count={srcCounts[src] || 0}
                active={srcFilter === src}
                onClick={() => setSrcFilter(srcFilter === src ? null : src)}
              />
            ))}
          </FacetGroup>

          {/* Tag facet */}
          <FacetGroup title="TAGS">
            {ALL_TAGS.map(tag => (
              <FacetOption key={tag}
                label={'#' + tag}
                count={tagCounts[tag] || 0}
                active={tagFilters.includes(tag)}
                onClick={() => setTagFilters(prev =>
                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                )}
              />
            ))}
          </FacetGroup>
        </div>

        {/* Layer card grid */}
        <div style={{
          flex:1, padding:'16px', overflowY:'auto',
          display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))',
          gap:10, alignContent:'start',
        }}>
          {filtered.length === 0 && (
            <div style={{
              gridColumn:'1 / -1', textAlign:'center', padding:'60px 20px',
              color:'var(--t3)', fontFamily:'var(--mono)', fontSize:13,
            }}>
              No layers match your filters.
              {hasFilters && <button onClick={clearAll} style={{
                display:'block', margin:'12px auto 0', padding:'8px 20px',
                borderRadius:8, border:'1px solid rgba(56,189,248,0.3)',
                background:'rgba(56,189,248,0.1)', color:'#38BDF8',
                fontFamily:'var(--mono)', fontSize:11, fontWeight:700, cursor:'pointer',
              }}>Clear all filters</button>}
            </div>
          )}

          {filtered.map(l => {
            const active = activeLayers.find(a => a.id === l.id)
            const isOn = active?.visible
            const cat = LAYER_CATEGORIES.find(c => c.id === l.cat)
            const tags = LAYER_TAGS[l.id] || []
            const src = l.source || 'Open-Meteo'

            return (
              <div key={l.id}
                onClick={() => toggleLayer(l.id)}
                style={{
                  padding:'14px', borderRadius:12, cursor:'pointer',
                  border: isOn ? `1px solid ${l.color}70` : '1px solid rgba(255,255,255,0.06)',
                  background: isOn ? l.color + '12' : 'rgba(255,255,255,0.02)',
                  transition:'all 0.15s',
                }}
                onMouseEnter={e => { if (!isOn) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                onMouseLeave={e => { if (!isOn) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:22 }}>{l.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{
                      fontFamily:'var(--mono)', fontSize:12, fontWeight:700,
                      color: isOn ? l.color : 'var(--t1)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    }}>{l.label}</div>
                    <div style={{ fontSize:9, color:'var(--t3)', marginTop:1 }}>
                      {src} · {cat?.label}
                    </div>
                  </div>
                  {isOn && <div style={{
                    width:8, height:8, borderRadius:'50%', background:l.color,
                    boxShadow:`0 0 8px ${l.color}80`, flexShrink:0,
                  }} />}
                </div>

                {/* Tags */}
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
                  {tags.slice(0, 4).map(t => (
                    <span key={t} style={{
                      fontFamily:'var(--mono)', fontSize:8, fontWeight:600,
                      padding:'1px 6px', borderRadius:8,
                      background:'rgba(255,255,255,0.04)', color:'var(--t3)',
                    }}>#{t}</span>
                  ))}
                  {tags.length > 4 && (
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>+{tags.length - 4}</span>
                  )}
                </div>

                {/* Opacity slider when active */}
                {isOn && active && (
                  <div onClick={e => e.stopPropagation()} style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
                    <input type="range" min={10} max={100}
                      value={Math.round(active.opacity * 100)}
                      onChange={e => setLayerOpacity(l.id, parseInt(e.target.value) / 100)}
                      style={{ flex:1, accentColor:l.color, cursor:'pointer', height:3 }}
                    />
                    <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', minWidth:24, textAlign:'right' }}>
                      {Math.round(active.opacity * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Facet group ── */
function FacetGroup({ title, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{
        fontFamily:'var(--mono)', fontSize:9, fontWeight:800,
        letterSpacing:'0.12em', color:'var(--t3)', marginBottom:8,
      }}>{title}</div>
      {children}
    </div>
  )
}

/* ── Facet option (checkbox row) ── */
function FacetOption({ label, count, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'4px 8px', borderRadius:6, cursor:'pointer',
      marginBottom:2, transition:'background 0.1s',
      background: active ? 'rgba(56,189,248,0.06)' : 'transparent',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        width:14, height:14, borderRadius:4, flexShrink:0,
        border: active ? '1.5px solid #38BDF8' : '1.5px solid rgba(255,255,255,0.12)',
        background: active ? 'rgba(56,189,248,0.2)' : 'transparent',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:9, color:'#38BDF8',
      }}>
        {active && '✓'}
      </div>
      <span style={{ fontSize:11, color: active ? 'var(--t1)' : 'var(--t2)', flex:1, fontFamily:'var(--mono)', fontWeight: active ? 700 : 400 }}>
        {label}
      </span>
      <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)' }}>{count}</span>
    </div>
  )
}
