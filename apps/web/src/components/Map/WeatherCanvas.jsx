import { useEffect, useRef } from 'react'
import { useMapStore }  from '../../stores/mapStore.js'
import { useRoomStore } from '../../stores/roomStore.js'

// Storm tracks: [hour, lat, lon]
const TRACKS = {
  'beatriz-2026': {
    euro: [[0,16.2,-104.8],[24,18.4,-107.2],[48,20.1,-109.8],[72,21.9,-112.1],[96,23.4,-114.8],[120,24.2,-117.2],[144,24.8,-119.1],[168,25.0,-120.5]],
    gfs:  [[0,16.2,-104.8],[24,18.1,-106.5],[48,20.3,-108.9],[72,22.1,-111.0],[96,23.9,-113.2],[120,25.0,-115.8],[144,25.9,-118.0],[168,26.5,-119.8]],
  },
  'invest96w-2026': {
    euro: [[0,14.8,138.2],[24,15.6,135.8],[48,16.9,132.4],[72,18.2,129.1],[96,19.8,125.6],[120,21.2,122.4],[144,22.6,119.8],[168,23.8,117.2]],
    gfs:  [[0,14.8,138.2],[24,15.2,136.4],[48,16.1,133.8],[72,17.4,130.6],[96,18.8,127.4],[120,20.1,124.2],[144,21.5,121.1],[168,22.8,118.5]],
  },
}

function initParticle() {
  const a = Math.random() * Math.PI * 2
  const r = 40 + Math.random() * 140
  return { bx: Math.cos(a)*r, by: Math.sin(a)*r, life: Math.random(), maxLife: 0.4+Math.random()*0.6, spd: 0.3+Math.random()*0.9, sz: 0.8+Math.random()*1.6 }
}

export default function WeatherCanvas({ map }) {
  const canvasRef   = useRef(null)
  const animRef     = useRef(null)
  const particles   = useRef([])
  const frameCount  = useRef(0)
  const storeRef    = useRef({})

  const { activeRoom, getRoom } = useRoomStore()
  const room = getRoom(activeRoom)

  // Keep a ref to the latest store values so the animation loop reads fresh state
  // without re-creating the animation loop on every render
  const mapState = useMapStore()
  storeRef.current = mapState

  // Reset particles when room changes
  useEffect(() => {
    particles.current = Array.from({ length: 220 }, initParticle)
  }, [activeRoom])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const wrap = canvas.parentElement
      if (!wrap) return
      canvas.width  = wrap.offsetWidth
      canvas.height = wrap.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  // Animation loop
  useEffect(() => {
    cancelAnimationFrame(animRef.current)

    const canvas = canvasRef.current
    if (!canvas || !map) return

    const draw = () => {
      const W = canvas.width, H = canvas.height
      if (!W || !H) { animRef.current = requestAnimationFrame(draw); return }

      const ctx   = canvas.getContext('2d')
      const ms    = storeRef.current
      const track = TRACKS[activeRoom] ?? TRACKS['beatriz-2026']
      frameCount.current++

      ctx.clearRect(0, 0, W, H)

      // Storm center
      const [sx, sy] = project(map, track.euro[0][2], track.euro[0][1])

      // Layer atmosphere overlay
      drawAtmosphere(ctx, ms.layer, sx, sy, W, H)

      // Disagreement cone
      if (ms.split || ms.spaghetti) drawCone(ctx, map, track, ms.hour)

      // Spaghetti
      if (ms.spaghetti) drawSpaghetti(ctx, map, track.euro)

      // Tracks
      drawTrack(ctx, map, track.euro, '#38BDF8', false)
      if (ms.split) drawTrack(ctx, map, track.gfs, '#F59E0B', true)

      // Hour marker
      drawHourMarker(ctx, map, track, ms.hour, ms.split)

      // Particles
      drawParticles(ctx, particles.current, sx, sy)

      // Storm
      drawStorm(ctx, sx, sy, frameCount.current)

      // Labels
      drawLabels(ctx, map, track, room, ms.split)

      // Watermark
      ctx.fillStyle = 'rgba(56,189,248,0.07)'
      ctx.font      = "bold 20px 'SF Mono',monospace"
      ctx.fillText('⚡ ChaserNet', W - 152, H - 12)

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [map, activeRoom])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none', zIndex: 5,
        opacity: activeRoom ? 1 : 0.15,
        transition: 'opacity 0.4s',
      }}
    />
  )
}

// ── Drawing helpers ────────────────────────────

function project(map, lon, lat) {
  const pt = map.project([lon, lat])
  return [pt.x, pt.y]
}

function drawAtmosphere(ctx, layer, sx, sy, W, H) {
  if (layer === 'cape') {
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.35)
    g.addColorStop(0, 'rgba(139,92,246,0.12)'); g.addColorStop(1, 'transparent')
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H)
  } else if (layer === 'temp') {
    const g = ctx.createLinearGradient(0,0,W,H)
    g.addColorStop(0,'rgba(239,68,68,0.06)'); g.addColorStop(1,'rgba(56,189,248,0.04)')
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H)
  } else if (layer === 'precip') {
    const g = ctx.createRadialGradient(sx, sy, 20, sx, sy, W*.24)
    g.addColorStop(0,'rgba(56,189,248,0.11)'); g.addColorStop(1,'transparent')
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H)
  }
}

function drawCone(ctx, map, track, currentHour) {
  const startIdx = Math.max(0, Math.floor(currentHour / 24) - 1)
  ctx.beginPath()
  for (let i = startIdx; i < track.euro.length; i++) {
    const [x, y] = project(map, track.euro[i][2], track.euro[i][1])
    i === startIdx ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
  }
  for (let i = track.gfs.length - 1; i >= startIdx; i--) {
    const [x, y] = project(map, track.gfs[i][2], track.gfs[i][1])
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle   = 'rgba(245,158,11,0.07)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(245,158,11,0.13)'; ctx.lineWidth = 0.5; ctx.stroke()
}

function drawSpaghetti(ctx, map, baseTrack) {
  ctx.setLineDash([3,3])
  for (let m = 0; m < 14; m++) {
    ctx.beginPath(); ctx.strokeStyle = 'rgba(139,92,246,0.22)'; ctx.lineWidth = 1
    baseTrack.forEach(([h, lat, lon], i) => {
      const noise1 = Math.sin(m*2.7 + h*0.4) * 1.2
      const noise2 = Math.sin(m*1.9 + h*0.3) * 0.8
      const [x,y]  = project(map, lon+noise2, lat+noise1)
      i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
    })
    ctx.stroke()
  }
  ctx.setLineDash([])
}

function drawTrack(ctx, map, track, color, dashed) {
  ctx.beginPath()
  ctx.strokeStyle = color; ctx.lineWidth = 2.5
  if (dashed) ctx.setLineDash([7,4]); else ctx.setLineDash([])
  track.forEach(([h, lat, lon], i) => {
    const [x,y] = project(map, lon, lat)
    i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
  })
  ctx.stroke(); ctx.setLineDash([])
  track.forEach(([h, lat, lon]) => {
    if (h > 0 && h % 24 === 0) {
      const [x,y] = project(map, lon, lat)
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle = color; ctx.fill()
    }
  })
}

function interpTrack(map, track, hour) {
  const idx  = Math.min(Math.floor(hour/24), track.length-2)
  const t    = (hour%24)/24
  const [,la, lo]   = track[idx]
  const [,la2, lo2] = track[idx+1] ?? track[idx]
  return project(map, lo+(lo2-lo)*t, la+(la2-la)*t)
}

function drawHourMarker(ctx, map, track, hour, showB) {
  if (hour <= 0) return
  const [ex,ey] = interpTrack(map, track.euro, hour)
  ctx.beginPath(); ctx.arc(ex,ey,8,0,Math.PI*2); ctx.fillStyle='#38BDF8'; ctx.fill()
  ctx.beginPath(); ctx.arc(ex,ey,8,0,Math.PI*2); ctx.strokeStyle='white'; ctx.lineWidth=2.5; ctx.stroke()

  if (showB) {
    const [gx,gy] = interpTrack(map, track.gfs, hour)
    ctx.beginPath(); ctx.arc(gx,gy,8,0,Math.PI*2); ctx.fillStyle='#F59E0B'; ctx.fill()
    ctx.beginPath(); ctx.arc(gx,gy,8,0,Math.PI*2); ctx.strokeStyle='white'; ctx.lineWidth=2.5; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(gx,gy)
    ctx.strokeStyle='rgba(245,158,11,0.5)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([])
  }
}

function drawParticles(ctx, parts, sx, sy) {
  parts.forEach(p => {
    const px = sx+p.bx, py = sy+p.by
    const dx = px-sx, dy = py-sy, dist = Math.sqrt(dx*dx+dy*dy)
    const angle = Math.atan2(dy,dx), force = Math.max(0.3, 12/(dist+5))
    p.bx += (-Math.sin(angle)*force*p.spd) + (-dx*0.003*force)
    p.by += ( Math.cos(angle)*force*p.spd) + (-dy*0.003*force)
    p.life += 0.005
    if (p.life > p.maxLife || dist < 8 || dist > 200) {
      const np = initParticle(); p.bx=np.bx; p.by=np.by; p.life=0
    }
    const alpha = Math.sin(p.life/p.maxLife * Math.PI) * 0.6
    ctx.beginPath(); ctx.arc(sx+p.bx, sy+p.by, p.sz, 0, Math.PI*2)
    ctx.fillStyle = `rgba(56,189,248,${alpha})`; ctx.fill()
  })
}

function drawStorm(ctx, sx, sy, frame) {
  const pulse = 1 + Math.sin(frame * 0.03) * 0.04
  const glow  = ctx.createRadialGradient(sx,sy,0,sx,sy,52*pulse)
  glow.addColorStop(0,'rgba(239,68,68,0.2)'); glow.addColorStop(0.7,'rgba(245,158,11,0.07)'); glow.addColorStop(1,'transparent')
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx,sy,52*pulse,0,Math.PI*2); ctx.fill()
  ;[25,36].forEach((r,i) => {
    ctx.beginPath(); ctx.arc(sx,sy,r*pulse,0,Math.PI*2)
    ctx.strokeStyle = `rgba(239,68,68,${0.6-i*0.18})`; ctx.lineWidth = 3-i; ctx.stroke()
  })
  const eye = ctx.createRadialGradient(sx,sy,0,sx,sy,12)
  eye.addColorStop(0,'rgba(255,255,255,0.9)'); eye.addColorStop(0.5,'rgba(255,200,200,0.5)'); eye.addColorStop(1,'transparent')
  ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(sx,sy,12,0,Math.PI*2); ctx.fill()
}

function drawLabels(ctx, map, track, room, showB) {
  if (!room) return
  const [sx,sy] = project(map, track.euro[0][2], track.euro[0][1])
  ctx.fillStyle = 'rgba(239,68,68,0.92)'; ctx.font = "bold 11px 'SF Mono',monospace"
  ctx.fillText(room.name, sx+22, sy-16)
  ctx.fillStyle = 'rgba(239,68,68,0.6)'; ctx.font = "10px 'SF Mono',monospace"
  ctx.fillText(`${room.category}  ·  ${room.wind}kt`, sx+22, sy+2)

  const el    = track.euro[track.euro.length-1]
  const [ex,ey] = project(map, el[2], el[1])
  ctx.fillStyle = '#38BDF8'; ctx.font = "bold 10px 'SF Mono',monospace"
  ctx.fillText('Euro IFS →', ex+6, ey)

  if (showB) {
    const gl    = track.gfs[track.gfs.length-1]
    const [gx,gy] = project(map, gl[2], gl[1])
    ctx.fillStyle = '#F59E0B'; ctx.font = "bold 10px 'SF Mono',monospace"
    ctx.fillText('GFS →', gx+6, gy+14)
  }
}
