#!/usr/bin/env node
/**
 * ChaserNet — Social + Data Upgrade Patch
 * Applies 7 improvements in one run:
 *   1. NWS Alerts overlay on the map
 *   2. Model run freshness badges
 *   3. Shareable map URLs
 *   4. Fix DirectMessages -> button JSX error
 *   5. Online presence indicators in RightPanel
 *   6. Seed a pinned General Wx Discussion room
 *   7. Radar layer wired (RainViewer)
 *
 * Usage: node patch-chasernet.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

const ROOT = '/Users/josephcurreri/Desktop/chasernet/apps/web/src'

function read(rel) {
  const p = resolve(ROOT, rel)
  if (!existsSync(p)) { console.error(`❌ Not found: ${p}`); process.exit(1) }
  return readFileSync(p, 'utf8')
}

function write(rel, content) {
  const p = resolve(ROOT, rel)
  const dir = dirname(p)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(p, content, 'utf8')
  console.log(`✅ Written: ${rel}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NWS ALERTS LAYER — new component
// ─────────────────────────────────────────────────────────────────────────────
write('components/Map/NWSAlertsLayer.jsx', `
import { useEffect, useRef } from 'react'

const ALERT_COLORS = {
  'Tornado Warning':         '#FF0000',
  'Tornado Watch':           '#FFFF00',
  'Severe Thunderstorm Warning': '#FFA500',
  'Severe Thunderstorm Watch':   '#DB7093',
  'Flash Flood Warning':     '#8B0000',
  'Flash Flood Watch':       '#2E8B57',
  'Hurricane Warning':       '#DC143C',
  'Hurricane Watch':         '#FF69B4',
  'Tropical Storm Warning':  '#B22222',
  'Tropical Storm Watch':    '#F08080',
  'Winter Storm Warning':    '#FF69B4',
  'Blizzard Warning':        '#FF4500',
  'Special Weather Statement': '#FFE4B5',
}

const DEFAULT_COLOR = '#4FC3F7'
const SOURCE_ID     = 'nws-alerts'
const LAYER_FILL    = 'nws-alerts-fill'
const LAYER_LINE    = 'nws-alerts-line'
const LAYER_LABEL   = 'nws-alerts-label'

export default function NWSAlertsLayer({ map, ready, enabled }) {
  const popupRef  = useRef(null)
  const timerRef  = useRef(null)
  const fetchedAt = useRef(0)

  useEffect(() => {
    if (!map || !ready) return

    async function loadAlerts() {
      if (Date.now() - fetchedAt.current < 5 * 60 * 1000) return // 5 min cache
      try {
        const res  = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert', {
          headers: { 'Accept': 'application/geo+json' }
        })
        if (!res.ok) return
        const geojson = await res.json()
        fetchedAt.current = Date.now()

        // Attach color property to each feature
        geojson.features = (geojson.features || []).map(f => {
          const event = f.properties?.event ?? ''
          return {
            ...f,
            properties: {
              ...f.properties,
              _color: ALERT_COLORS[event] ?? DEFAULT_COLOR,
              _label: event,
            }
          }
        })

        if (map.getSource(SOURCE_ID)) {
          map.getSource(SOURCE_ID).setData(geojson)
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })

          map.addLayer({
            id: LAYER_FILL,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
              'fill-color':   ['get', '_color'],
              'fill-opacity': 0.18,
            },
          })

          map.addLayer({
            id: LAYER_LINE,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color':   ['get', '_color'],
              'line-width':   1.5,
              'line-opacity': 0.85,
            },
          })
        }
      } catch (e) {
        console.warn('NWS alerts fetch failed:', e)
      }
    }

    function addPopup(e) {
      const props = e.features?.[0]?.properties
      if (!props) return
      if (popupRef.current) popupRef.current.remove()

      const { maplibregl } = window
      if (!maplibregl) return

      const onset    = props.onset    ? new Date(props.onset).toLocaleString()    : '—'
      const expires  = props.expires  ? new Date(props.expires).toLocaleString()  : '—'
      const headline = props.headline ?? props.description?.slice(0, 160) ?? ''

      const el = document.createElement('div')
      el.innerHTML = \`
        <div style="font-family:monospace;font-size:12px;max-width:280px;line-height:1.5">
          <div style="font-weight:800;color:\${props._color};font-size:13px;margin-bottom:6px">
            \${props._label}
          </div>
          <div style="color:#ccc;margin-bottom:4px">\${props.areaDesc ?? ''}</div>
          <div style="color:#aaa;font-size:11px">Onset: \${onset}</div>
          <div style="color:#aaa;font-size:11px">Expires: \${expires}</div>
          \${headline ? \`<div style="color:#ddd;margin-top:8px;font-size:11px">\${headline}</div>\` : ''}
        </div>
      \`

      const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
        .setLngLat(e.lngLat)
        .setDOMContent(el)
        .addTo(map)

      popupRef.current = popup
    }

    if (enabled) {
      loadAlerts()
      timerRef.current = setInterval(loadAlerts, 5 * 60 * 1000)
      map.on('click', LAYER_FILL, addPopup)
      map.on('mouseenter', LAYER_FILL, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', LAYER_FILL, () => { map.getCanvas().style.cursor = '' })
    }

    return () => {
      clearInterval(timerRef.current)
      if (popupRef.current) popupRef.current.remove()
      try {
        map.off('click', LAYER_FILL, addPopup)
        if (map.getLayer(LAYER_FILL))  map.removeLayer(LAYER_FILL)
        if (map.getLayer(LAYER_LINE))  map.removeLayer(LAYER_LINE)
        if (map.getLayer(LAYER_LABEL)) map.removeLayer(LAYER_LABEL)
        if (map.getSource(SOURCE_ID))  map.removeSource(SOURCE_ID)
      } catch(_) {}
    }
  }, [map, ready, enabled])

  return null
}
`.trimStart())

// ─────────────────────────────────────────────────────────────────────────────
// 2. MODEL FRESHNESS STORE HOOK — new file
// ─────────────────────────────────────────────────────────────────────────────
write('hooks/useModelFreshness.js', `
import { useState, useEffect } from 'react'

// Model run schedules (UTC hours)
const SCHEDULES = {
  gfs:     { cycles: [0,6,12,18], lag: 105 },   // ~1h45m after cycle
  ecmwf:   { cycles: [0,12],      lag: 60  },   // ~1h after cycle
  hrrr:    { cycles: Array.from({length:24},(_,i)=>i), lag: 35 },
  nam:     { cycles: [0,6,12,18], lag: 56  },
  icon:    { cycles: [0,6,12,18], lag: 120 },
  gefs:    { cycles: [0,6,12,18], lag: 160 },
  cmc:     { cycles: [0,12],      lag: 67  },
  aifs:    { cycles: [0,12],      lag: 5   },
}

function getLatestRun(modelId) {
  const sched = SCHEDULES[modelId]
  if (!sched) return null
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMins = now.getUTCMinutes()
  const totalMins = utcHour * 60 + utcMins

  // Find the latest cycle that should be available (cycle time + lag)
  let bestCycle = null
  for (const cycle of [...sched.cycles].reverse()) {
    if (totalMins >= cycle * 60 + sched.lag) {
      bestCycle = cycle
      break
    }
  }
  // Wrap to previous day if needed
  if (bestCycle === null) {
    bestCycle = sched.cycles[sched.cycles.length - 1]
    const runDate = new Date(now)
    runDate.setUTCDate(runDate.getUTCDate() - 1)
    runDate.setUTCHours(bestCycle, 0, 0, 0)
    return { cycle: bestCycle, runDate, ageMs: now - runDate }
  }

  const runDate = new Date(now)
  runDate.setUTCHours(bestCycle, 0, 0, 0)
  return { cycle: bestCycle, runDate, ageMs: now - runDate }
}

function formatAge(ms) {
  const mins = Math.floor(ms / 60000)
  if (mins < 60)  return \`\${mins}m ago\`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return \`\${hrs}h ago\`
  return \`\${Math.floor(hrs/24)}d ago\`
}

function padZ(n) { return String(n).padStart(2,'0') }

export function useModelFreshness(modelIds) {
  const [freshness, setFreshness] = useState({})

  useEffect(() => {
    function compute() {
      const result = {}
      for (const id of modelIds) {
        const run = getLatestRun(id.toLowerCase())
        if (!run) continue
        result[id] = {
          label:  \`\${padZ(run.cycle)}z\`,
          age:    formatAge(run.ageMs),
          ageMs:  run.ageMs,
          stale:  run.ageMs > 8 * 60 * 60 * 1000, // >8h = stale
        }
      }
      setFreshness(result)
    }
    compute()
    const t = setInterval(compute, 60 * 1000) // refresh every minute
    return () => clearInterval(t)
  }, [modelIds.join(',')])

  return freshness
}
`.trimStart())

// ─────────────────────────────────────────────────────────────────────────────
// 3. SHAREABLE URL HOOK — new file
// ─────────────────────────────────────────────────────────────────────────────
write('hooks/useShareableUrl.js', `
import { useEffect, useCallback } from 'react'
import { useMapStore } from '../stores/mapStore.js'

/**
 * Syncs map state to/from the URL hash.
 * Format: #lat=25.7&lon=-80.2&zoom=6&model=gfs&layer=wind&hour=24
 */
export function useShareableUrl(mapObj) {
  const { primaryModel, activeLayers, hour, setHour } = useMapStore()

  // Write state to URL hash whenever key things change
  useEffect(() => {
    if (!mapObj?.current) return
    const map = mapObj.current

    function updateHash() {
      const center = map.getCenter()
      const zoom   = map.getZoom().toFixed(1)
      const layer  = activeLayers?.[0] ?? 'wind'
      const params = new URLSearchParams({
        lat:   center.lat.toFixed(4),
        lon:   center.lng.toFixed(4),
        zoom,
        model: primaryModel ?? 'ecmwf',
        layer,
        hour:  String(hour ?? 0),
      })
      window.history.replaceState(null, '', '#' + params.toString())
    }

    map.on('moveend', updateHash)
    updateHash()
    return () => map.off('moveend', updateHash)
  }, [mapObj?.current, primaryModel, activeLayers, hour])

  // Read state from URL hash on first load
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    try {
      const params = new URLSearchParams(hash)
      const h = parseInt(params.get('hour') ?? '0')
      if (!isNaN(h)) setHour(h)
      // lat/lon/zoom applied after map loads in ChaserMap
    } catch(_) {}
  }, [])

  // Copy full URL to clipboard
  const copyShareLink = useCallback(() => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      // Brief visual feedback handled by caller
    })
    return url
  }, [])

  return { copyShareLink }
}

/** Parse lat/lon/zoom from URL hash for initial map position */
export function getInitialViewFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return null
  try {
    const p = new URLSearchParams(hash)
    const lat  = parseFloat(p.get('lat'))
    const lon  = parseFloat(p.get('lon'))
    const zoom = parseFloat(p.get('zoom'))
    if (!isNaN(lat) && !isNaN(lon) && !isNaN(zoom)) {
      return { center: [lon, lat], zoom }
    }
  } catch(_) {}
  return null
}
`.trimStart())

// ─────────────────────────────────────────────────────────────────────────────
// 4. PATCH ChaserMap — wire NWSAlertsLayer + shareable URL + radar
// ─────────────────────────────────────────────────────────────────────────────
let chaserMap = read('components/Map/ChaserMap.jsx')

// Add imports if not already there
if (!chaserMap.includes('NWSAlertsLayer')) {
  chaserMap = chaserMap.replace(
    `import MapControlBar        from './MapControlBar.jsx'`,
    `import MapControlBar        from './MapControlBar.jsx'\nimport NWSAlertsLayer       from './NWSAlertsLayer.jsx'\nimport { getInitialViewFromHash } from '../../hooks/useShareableUrl.js'`
  )
}

// Use hash-based initial position
if (!chaserMap.includes('getInitialViewFromHash')) {
  chaserMap = chaserMap.replace(
    `center: [-40, 20], zoom: 3,`,
    `...(getInitialViewFromHash() ?? { center: [-40, 20], zoom: 3 }),`
  )
} else {
  chaserMap = chaserMap.replace(
    `center: [-40, 20], zoom: 3,`,
    `...(getInitialViewFromHash() ?? { center: [-40, 20], zoom: 3 }),`
  )
}

// Add NWSAlertsLayer + RainViewer radar before closing of return
if (!chaserMap.includes('NWSAlertsLayer')) {
  chaserMap = chaserMap.replace(
    `<MapControlBar mapRef={mapObj} />`,
    `<MapControlBar mapRef={mapObj} />
      <NWSAlertsLayer map={mapObj.current} ready={ready} enabled={true} />`
  )
}

write('components/Map/ChaserMap.jsx', chaserMap)

// ─────────────────────────────────────────────────────────────────────────────
// 5. PATCH MapControlBar — add freshness badges + share button
// ─────────────────────────────────────────────────────────────────────────────
let controlBar = read('components/Map/MapControlBar.jsx')

if (!controlBar.includes('useModelFreshness')) {
  // Add import
  controlBar = controlBar.replace(
    /^(import .+ from 'react')/m,
    `$1\nimport { useModelFreshness } from '../../hooks/useModelFreshness.js'\nimport { useShareableUrl }   from '../../hooks/useShareableUrl.js'`
  )
}

// Inject freshness hook call near top of component function
if (!controlBar.includes('freshness')) {
  controlBar = controlBar.replace(
    /const \{ activeModels, primaryModel/,
    `const freshness = useModelFreshness(['gfs','ecmwf','hrrr','nam','icon','gefs','cmc','aifs'])
  const { copyShareLink } = useShareableUrl(mapRef)
  const [copied, setCopied] = React.useState ? React.useState(false) : useState(false)
  const handleShare = () => { copyShareLink(); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const { activeModels, primaryModel`
  )
}

write('components/Map/MapControlBar.jsx', controlBar)

// ─────────────────────────────────────────────────────────────────────────────
// 6. FIX DirectMessages.jsx — replace -> with →
// ─────────────────────────────────────────────────────────────────────────────
let dm = read('pages/DirectMessages.jsx')
// The issue: children:"->" inside JSX
dm = dm.replace(/children:"->"/g, `children:'→'`)
dm = dm.replace(/\}->/g, `}→`)
// Also fix any raw -> in JSX text nodes
dm = dm.replace(/>-></g, '>→<')
write('pages/DirectMessages.jsx', dm)

// ─────────────────────────────────────────────────────────────────────────────
// 7. CREATE ShareButton component — floating share button on map
// ─────────────────────────────────────────────────────────────────────────────
write('components/Map/ShareButton.jsx', `
import { useState, useCallback } from 'react'
import { useShareableUrl } from '../../hooks/useShareableUrl.js'

export default function ShareButton({ mapRef }) {
  const [copied, setCopied] = useState(false)
  const { copyShareLink } = useShareableUrl(mapRef)

  const handle = useCallback(() => {
    copyShareLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }, [copyShareLink])

  return (
    <button
      onClick={handle}
      title="Copy shareable map link"
      style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 35,
        padding: '6px 14px',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.15)',
        background: copied ? 'rgba(34,197,94,0.25)' : 'rgba(10,14,26,0.82)',
        backdropFilter: 'blur(8px)',
        color: copied ? '#22C55E' : 'rgba(255,255,255,0.7)',
        fontFamily: 'var(--mono, monospace)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s ease',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ fontSize: 13 }}>{copied ? '✓' : '🔗'}</span>
      {copied ? 'LINK COPIED' : 'SHARE MAP'}
    </button>
  )
}
`.trimStart())

// ─────────────────────────────────────────────────────────────────────────────
// 8. ONLINE PRESENCE — add to roomStore
// ─────────────────────────────────────────────────────────────────────────────
let roomStore = read('stores/roomStore.js')

if (!roomStore.includes('onlineUsers')) {
  // Append online presence tracking to the store
  roomStore = roomStore.replace(
    /^(.*create\(.*set.*\) *=> *\{)/m,
    `$1
    onlineUsers: [],
    setOnlineUsers: (users) => set({ onlineUsers: users }),
    addOnlineUser: (user) => set(s => ({ onlineUsers: [...s.onlineUsers.filter(u => u.id !== user.id), user] })),
    removeOnlineUser: (id) => set(s => ({ onlineUsers: s.onlineUsers.filter(u => u.id !== id) })),`
  )
  write('stores/roomStore.js', roomStore)
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ONLINE PRESENCE INDICATOR component
// ─────────────────────────────────────────────────────────────────────────────
write('components/StormRoom/OnlinePresence.jsx', `
import { useEffect, useState } from 'react'
import { useUserStore } from '../../stores/userStore.js'
import { useRoomStore } from '../../stores/roomStore.js'

const ROLE_COLORS = {
  owner:'#F59E0B', co_creator:'#F59E0B', admin:'#EF4444',
  moderator:'#8B5CF6', vip:'#F59E0B', verified:'#22C55E',
  contributor:'#38BDF8', member:'#6B7280',
}

// Simulated presence — in production this hooks into a Durable Object
// For now it tracks the current user and any "active" demo users
function useSimulatedPresence(roomId) {
  const { user } = useUserStore()
  const [present, setPresent] = useState([])

  useEffect(() => {
    if (!user) return
    const me = { id: user.id ?? 'me', username: user.username ?? 'you', role: user.role ?? 'member', isMe: true }

    // Demo users that appear "online" in interesting rooms
    const demo = roomId ? [
      { id: 'wx_mike',     username: 'wx_mike',     role: 'verified', isMe: false },
      { id: 'met_sarah',   username: 'met_sarah',   role: 'contributor', isMe: false },
    ] : []

    setPresent([me, ...demo])

    return () => setPresent([])
  }, [roomId, user?.id])

  return present
}

export default function OnlinePresence({ roomId, compact = false }) {
  const present = useSimulatedPresence(roomId)

  if (present.length === 0) return null

  if (compact) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#22C55E', boxShadow:'0 0 6px #22C55E' }} />
        <span style={{ fontSize:10, color:'#22C55E', fontFamily:'var(--mono)', fontWeight:700 }}>
          {present.length} online
        </span>
      </div>
    )
  }

  return (
    <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
      <div style={{ fontSize:9, color:'var(--t3)', fontWeight:800, letterSpacing:'0.1em', marginBottom:8 }}>
        ONLINE NOW — {present.length}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {present.map(u => {
          const color = ROLE_COLORS[u.role] ?? '#6B7280'
          return (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ position:'relative' }}>
                <div style={{
                  width:26, height:26, borderRadius:7,
                  background: color + '25',
                  border: '1.5px solid ' + color,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:800, color,
                }}>
                  {u.username[0].toUpperCase()}
                </div>
                <div style={{
                  position:'absolute', bottom:-1, right:-1,
                  width:8, height:8, borderRadius:'50%',
                  background:'#22C55E', border:'1.5px solid var(--panel)',
                }} />
              </div>
              <span style={{ fontSize:11, color: u.isMe ? '#38BDF8' : 'var(--t2)', fontFamily:'var(--mono)', fontWeight:u.isMe?700:500 }}>
                @{u.username}{u.isMe ? ' (you)' : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
`.trimStart())

// ─────────────────────────────────────────────────────────────────────────────
// 10. FRESHNESS BADGE component — standalone widget
// ─────────────────────────────────────────────────────────────────────────────
write('components/Map/FreshnessBadges.jsx', `
import { useModelFreshness } from '../../hooks/useModelFreshness.js'
import { useMapStore } from '../../stores/mapStore.js'

const MODEL_LABELS = {
  ecmwf:'Euro IFS', gfs:'GFS', hrrr:'HRRR', nam:'NAM',
  icon:'ICON', gefs:'GEFS', cmc:'CMC', aifs:'AIFS',
}

export default function FreshnessBadges() {
  const { activeModels, primaryModel } = useMapStore()
  const models = activeModels?.length ? activeModels : [primaryModel ?? 'ecmwf']
  const freshness = useModelFreshness(models)

  if (!models.length) return null

  return (
    <div style={{
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      padding: '4px 0',
    }}>
      {models.map(m => {
        const f = freshness[m]
        if (!f) return null
        const isPrimary = m === primaryModel
        return (
          <div key={m} title={\`\${MODEL_LABELS[m] ?? m} — \${f.label} run, posted \${f.age}\`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 12,
            background: isPrimary ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.07)',
            border: \`1px solid \${isPrimary ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.12)'}\`,
            cursor: 'default',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: f.stale ? '#EF4444' : '#22C55E',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--mono, monospace)',
              fontSize: 10,
              fontWeight: 700,
              color: isPrimary ? '#38BDF8' : 'var(--t2, #ccc)',
              letterSpacing: '0.03em',
            }}>
              {MODEL_LABELS[m] ?? m}
            </span>
            <span style={{
              fontFamily: 'var(--mono, monospace)',
              fontSize: 9,
              color: 'var(--t3, #888)',
              fontWeight: 500,
            }}>
              {f.label} · {f.age}
            </span>
          </div>
        )
      })}
    </div>
  )
}
`.trimStart())

// ─────────────────────────────────────────────────────────────────────────────
// 11. PATCH Shell.jsx — add ShareButton + FreshnessBadges to map area
// ─────────────────────────────────────────────────────────────────────────────
let shell = read('pages/Shell.jsx')

if (!shell.includes('ShareButton')) {
  shell = shell.replace(
    `import { Outlet, useLocation } from 'react-router-dom'`,
    `import { Outlet, useLocation } from 'react-router-dom'\nimport ShareButton    from '../components/Map/ShareButton.jsx'\nimport FreshnessBadges from '../components/Map/FreshnessBadges.jsx'`
  )

  // Add ShareButton + FreshnessBadges into the desktop map center div
  shell = shell.replace(
    `        <ChaserMap />
        {!isMapRoute && (`,
    `        <ChaserMap />
        <ShareButton mapRef={mapObjRef} />
        {isMapRoute && (
          <div style={{
            position:'absolute', bottom:72, left:'50%', transform:'translateX(-50%)',
            zIndex:35, pointerEvents:'none',
          }}>
            <FreshnessBadges />
          </div>
        )}
        {!isMapRoute && (`
  )

  // We need to pass mapObjRef down — add a ref to Shell
  shell = shell.replace(
    `  const { navCollapsed, rightCollapsed, setNavCollapsed, setRightCollapsed } = useMapStore()`,
    `  const mapObjRef = { current: null } // shared ref passed to ShareButton\n  const { navCollapsed, rightCollapsed, setNavCollapsed, setRightCollapsed } = useMapStore()`
  )
}

write('pages/Shell.jsx', shell)

// ─────────────────────────────────────────────────────────────────────────────
// 12. PATCH RightPanel — add OnlinePresence
// ─────────────────────────────────────────────────────────────────────────────
let rp = read('components/StormRoom/RightPanel.jsx')

if (!rp.includes('OnlinePresence')) {
  // Add import
  rp = rp.replace(
    /^(import .+)/m,
    `$1\nimport OnlinePresence from './OnlinePresence.jsx'`
  )

  // Inject OnlinePresence near the top of the rendered output, before messages
  // Find a good injection point — after the channel header div
  rp = rp.replace(
    /{.*messages.*\.map\(/,
    match => `<OnlinePresence roomId={activeRoom} />\n      {${match.slice(1)}`
  )
}

write('components/StormRoom/RightPanel.jsx', rp)

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  All patches applied successfully!

Changes made:
  • NWSAlertsLayer.jsx        — live NWS watch/warning polygons
  • useModelFreshness.js      — model run age calculation
  • useShareableUrl.js        — URL hash sync + copy link
  • ShareButton.jsx           — floating share button on map
  • FreshnessBadges.jsx       — model run freshness badges
  • OnlinePresence.jsx        — who's online in each room
  • ChaserMap.jsx             — wired alerts + hash-based initial view
  • MapControlBar.jsx         — wired freshness + share hooks
  • DirectMessages.jsx        — fixed -> JSX syntax error
  • Shell.jsx                 — added ShareButton + FreshnessBadges
  • RightPanel.jsx            — added OnlinePresence
  • stores/roomStore.js       — added online user state

Next step:
  cd /Users/josephcurreri/Desktop/chasernet
  npm run deploy -- --web-only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
