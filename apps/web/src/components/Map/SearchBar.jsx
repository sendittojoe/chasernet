import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * SearchBar — Location search using OpenStreetMap Nominatim
 *
 * Typeahead search for cities, addresses, countries, states, landmarks.
 * Results fly the map to the selected location.
 * Respects Nominatim usage policy (1 req/s, custom User-Agent).
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export default function SearchBar({ map }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q,
        format: 'json',
        addressdetails: '1',
        limit: '6',
        dedupe: '1',
      })
      const res = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: { 'User-Agent': 'ChaserNet/1.0 (chasernet.com)' },
      })
      const data = await res.json()
      setResults(data.map(r => ({
        display: r.display_name,
        short: formatShortName(r),
        type: r.type,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        bbox: r.boundingbox?.map(Number),
        icon: getTypeIcon(r.type, r.class),
      })))
    } catch (e) {
      console.warn('[Search] Nominatim error:', e.message)
      setResults([])
    }
    setLoading(false)
  }, [])

  // Debounced search — 400ms after typing stops
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(() => search(query), 400)
    return () => clearTimeout(debounceRef.current)
  }, [query, search])

  function selectResult(r) {
    if (!map) return
    setQuery(r.short)
    setOpen(false)
    setResults([])

    if (r.bbox) {
      // Use bounding box for area results (countries, states)
      const sw = [r.bbox[2], r.bbox[0]] // [lon, lat]
      const ne = [r.bbox[3], r.bbox[1]]
      map.fitBounds([sw, ne], { padding: 60, maxZoom: 14, duration: 1200 })
    } else {
      map.flyTo({ center: [r.lon, r.lat], zoom: 10, speed: 1.2, curve: 1.4 })
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
      setResults([])
      inputRef.current?.blur()
    }
    if (e.key === 'Enter' && results.length > 0) {
      selectResult(results[0])
    }
  }

  const showDropdown = open && (results.length > 0 || loading)

  return (
    <div style={{ position:'relative', width: focused || query ? 280 : 200, transition:'width 0.2s ease' }}>
      {/* Search input */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        padding:'6px 12px', borderRadius:20,
        border:'1px solid rgba(255,255,255,0.15)',
        background:'rgba(10,14,26,0.82)',
        backdropFilter:'blur(8px)',
      }}>
        <span style={{ fontSize:13, opacity:0.5 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setFocused(true); if (results.length) setOpen(true) }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 200) }}
          onKeyDown={handleKeyDown}
          placeholder="Search location..."
          style={{
            flex:1, background:'none', border:'none', outline:'none',
            color:'rgba(255,255,255,0.85)', fontFamily:'var(--mono, monospace)',
            fontSize:11, fontWeight:500,
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            style={{
              background:'none', border:'none', color:'rgba(255,255,255,0.3)',
              cursor:'pointer', fontSize:14, padding:0, lineHeight:1,
            }}
          >×</button>
        )}
        {loading && (
          <div style={{
            width:12, height:12, borderRadius:'50%',
            border:'2px solid rgba(56,189,248,0.3)',
            borderTopColor:'#38BDF8',
            animation:'spin 0.6s linear infinite',
          }}/>
        )}
      </div>

      {/* Results dropdown */}
      {showDropdown && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0,
          marginTop:4, borderRadius:12,
          background:'rgba(10,14,26,0.95)', backdropFilter:'blur(12px)',
          border:'1px solid rgba(255,255,255,0.1)',
          boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
          overflow:'hidden', zIndex:100,
        }}>
          {loading && results.length === 0 && (
            <div style={{ padding:'12px 14px', color:'var(--t3)', fontSize:10, fontFamily:'var(--mono)' }}>
              Searching...
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => selectResult(r)}
              style={{
                padding:'10px 14px', cursor:'pointer',
                borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                display:'flex', alignItems:'flex-start', gap:10,
                transition:'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{r.icon}</span>
              <div style={{ minWidth:0 }}>
                <div style={{
                  fontSize:11, fontWeight:600, color:'var(--t1)',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                }}>{r.short}</div>
                <div style={{
                  fontSize:9, color:'var(--t3)', marginTop:2,
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                }}>{r.display}</div>
              </div>
            </div>
          ))}
          <div style={{
            padding:'6px 14px', fontSize:8, color:'rgba(255,255,255,0.2)',
            fontFamily:'var(--mono)', textAlign:'center',
          }}>
            Data © OpenStreetMap contributors
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function formatShortName(r) {
  const parts = r.display_name.split(', ')
  if (parts.length <= 2) return r.display_name
  // City/town: show name + state/country
  if (['city', 'town', 'village', 'hamlet', 'suburb'].includes(r.type)) {
    return parts.length >= 3 ? `${parts[0]}, ${parts[parts.length - 3]}, ${parts[parts.length - 1]}` : parts.slice(0, 2).join(', ')
  }
  // State/country: show first 2
  if (['state', 'country', 'administrative'].includes(r.type)) {
    return parts.slice(0, 2).join(', ')
  }
  return parts.slice(0, 3).join(', ')
}

function getTypeIcon(type, cls) {
  if (type === 'country' || cls === 'boundary') return '🌍'
  if (type === 'state' || type === 'administrative') return '🏛'
  if (type === 'city' || type === 'town') return '🏙'
  if (type === 'village' || type === 'hamlet') return '🏘'
  if (type === 'suburb' || type === 'neighbourhood') return '📍'
  if (cls === 'highway' || type === 'road') return '🛣'
  if (cls === 'aeroway') return '✈️'
  if (cls === 'natural') return '🏔'
  if (cls === 'waterway' || cls === 'water') return '🌊'
  return '📌'
}
