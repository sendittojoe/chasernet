import { useEffect, useRef } from 'react'
import { useMapStore }  from '../../stores/mapStore.js'
import { useRoomStore } from '../../stores/roomStore.js'

function initParticle() {
  const a = Math.random() * Math.PI * 2
  const r = 40 + Math.random() * 140
  return { bx: Math.cos(a)*r, by: Math.sin(a)*r, life: Math.random(), maxLife: 0.4+Math.random()*0.6, spd: 0.3+Math.random()*0.9, sz: 0.8+Math.random()*1.6 }
}

export default function WeatherCanvas({ map }) {
  const canvasRef  = useRef(null)
  const animRef    = useRef(null)
  const particles  = useRef([])
  const frameCount = useRef(0)
  const storeRef   = useRef({})
  const { activeRoom, getRoom } = useRoomStore()
  const room = getRoom(activeRoom)
  const mapState = useMapStore()
  storeRef.current = mapState

  useEffect(() => { particles.current = Array.from({ length: 220 }, initParticle) }, [activeRoom])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => { const w = canvas.parentElement; if (!w) return; canvas.width = w.offsetWidth; canvas.height = w.offsetHeight }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    cancelAnimationFrame(animRef.current)
    const canvas = canvasRef.current
    if (!canvas || !map) return
    const draw = () => {
      const W = canvas.width, H = canvas.height
      if (!W || !H) { animRef.current = requestAnimationFrame(draw); return }
      const ctx = canvas.getContext('2d')
      const ms  = storeRef.current
      frameCount.current++
      ctx.clearRect(0, 0, W, H)
      const trackA = ms.dataA?.track ?? (room ? [[0, room.lat, room.lon]] : null)
      const trackB = ms.dataB?.track ?? trackA
      if (!trackA || trackA.length === 0) { animRef.current = requestAnimationFrame(draw); return }
      const [sx, sy] = project(map, trackA[0][2], trackA[0][1])
      drawAtmosphere(ctx, ms.layer, sx, sy, W, H)
      if ((ms.split || ms.spaghetti) && trackB && trackB !== trackA) drawCone(ctx, map, trackA, trackB, ms.hour)
      if (ms.spaghetti) drawSpaghetti(ctx, map, trackA)
      drawTrack(ctx, map, trackA, '#38BDF8', false)
      if (ms.split && trackB && trackB !== trackA) drawTrack(ctx, map, trackB, '#F59E0B', true)
      if (ms.hour > 0) drawHourMarker(ctx, map, trackA, trackB, ms.hour, ms.split)
      drawParticles(ctx, particles.current, sx, sy)
      drawStorm(ctx, sx, sy, frameCount.current)
      if (room) drawLabels(ctx, map, trackA, trackB, room, ms.split, ms.dataA?.model, ms.dataB?.model)
      ctx.fillStyle = 'rgba(56,189,248,0.07)'; ctx.font = "bold 20px 'SF Mono',monospace"
      ctx.fillText('\u26a1 ChaserNet', W - 152, H - 12)
      if (ms.dataLoading) { ctx.fillStyle = 'rgba(56,189,248,0.7)'; ctx.font = "11px 'SF Mono',monospace"; ctx.fillText('Loading model data\u2026', 12, H - 12) }
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [map, activeRoom])

  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:5, opacity: activeRoom ? 1 : 0.15, transition:'opacity 0.4s' }} />
}

function project(map, lon, lat) { const pt = map.project([lon, lat]); return [pt.x, pt.y] }

function drawAtmosphere(ctx, layer, sx, sy, W, H) {
  if (layer === 'cape') { const g = ctx.createRadialGradient(sx,sy,0,sx,sy,W*0.35); g.addColorStop(0,'rgba(139,92,246,0.12)'); g.addColorStop(1,'transparent'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H) }
  else if (layer === 'temp') { const g = ctx.createLinearGradient(0,0,W,H); g.addColorStop(0,'rgba(239,68,68,0.06)'); g.addColorStop(1,'rgba(56,189,248,0.04)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H) }
  else if (layer === 'precip') { const g = ctx.createRadialGradient(sx,sy,20,sx,sy,W*0.24); g.addColorStop(0,'rgba(56,189,248,0.11)'); g.addColorStop(1,'transparent'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H) }
}

function drawCone(ctx, map, tA, tB, hour) {
  const si = Math.max(0, Math.floor(hour/24)-1)
  ctx.beginPath()
  for (let i=si; i<tA.length; i++) { const [x,y]=project(map,tA[i][2],tA[i][1]); i===si?ctx.moveTo(x,y):ctx.lineTo(x,y) }
  for (let i=tB.length-1; i>=si; i--) { const [x,y]=project(map,tB[i][2],tB[i][1]); ctx.lineTo(x,y) }
  ctx.closePath(); ctx.fillStyle='rgba(245,158,11,0.07)'; ctx.fill()
  ctx.strokeStyle='rgba(245,158,11,0.13)'; ctx.lineWidth=0.5; ctx.stroke()
}

function drawSpaghetti(ctx, map, t) {
  ctx.setLineDash([3,3])
  for (let m=0; m<14; m++) {
    ctx.beginPath(); ctx.strokeStyle='rgba(139,92,246,0.22)'; ctx.lineWidth=1
    t.forEach(([h,la,lo],i) => { const [x,y]=project(map,lo+Math.sin(m*1.9+h*0.03)*0.8,la+Math.sin(m*2.7+h*0.04)*1.2); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
    ctx.stroke()
  }
  ctx.setLineDash([])
}

function drawTrack(ctx, map, track, color, dashed) {
  if (!track || track.length < 2) return
  ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=2.5
  dashed ? ctx.setLineDash([7,4]) : ctx.setLineDash([])
  track.forEach(([h,la,lo],i) => { const [x,y]=project(map,lo,la); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
  ctx.stroke(); ctx.setLineDash([])
  track.forEach(([h,la,lo]) => { if (h>0&&h%24===0) { const [x,y]=project(map,lo,la); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle=color; ctx.fill() } })
}

function interpTrack(map, track, hour) {
  if (!track||track.length===0) return [0,0]
  const a = [...track].reverse().find(p=>p[0]<=hour) ?? track[0]
  const b = track.find(p=>p[0]>hour) ?? a
  if (a===b) return project(map,a[2],a[1])
  const t=(hour-a[0])/((b[0]-a[0])||1)
  return project(map,a[2]+(b[2]-a[2])*t,a[1]+(b[1]-a[1])*t)
}

function drawHourMarker(ctx, map, tA, tB, hour, showB) {
  const [ex,ey]=interpTrack(map,tA,hour)
  ctx.beginPath(); ctx.arc(ex,ey,8,0,Math.PI*2); ctx.fillStyle='#38BDF8'; ctx.fill()
  ctx.beginPath(); ctx.arc(ex,ey,8,0,Math.PI*2); ctx.strokeStyle='white'; ctx.lineWidth=2.5; ctx.stroke()
  if (showB&&tB) {
    const [gx,gy]=interpTrack(map,tB,hour)
    ctx.beginPath(); ctx.arc(gx,gy,8,0,Math.PI*2); ctx.fillStyle='#F59E0B'; ctx.fill()
    ctx.beginPath(); ctx.arc(gx,gy,8,0,Math.PI*2); ctx.strokeStyle='white'; ctx.lineWidth=2.5; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(gx,gy)
    ctx.strokeStyle='rgba(245,158,11,0.5)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([])
  }
}

function drawParticles(ctx, parts, sx, sy) {
  parts.forEach(p => {
    const d=Math.sqrt(p.bx*p.bx+p.by*p.by), angle=Math.atan2(p.by,p.bx), force=Math.max(0.3,12/(d+5))
    p.bx+=(-Math.sin(angle)*force*p.spd)+(-p.bx*0.003*force)
    p.by+=(Math.cos(angle)*force*p.spd)+(-p.by*0.003*force)
    p.life+=0.005
    if (p.life>p.maxLife||Math.sqrt(p.bx*p.bx+p.by*p.by)<8||Math.sqrt(p.bx*p.bx+p.by*p.by)>200) { const n=initParticle(); p.bx=n.bx; p.by=n.by; p.life=0 }
    const alpha=Math.sin(p.life/p.maxLife*Math.PI)*0.6
    ctx.beginPath(); ctx.arc(sx+p.bx,sy+p.by,p.sz,0,Math.PI*2); ctx.fillStyle=`rgba(56,189,248,${alpha})`; ctx.fill()
  })
}

function drawStorm(ctx, sx, sy, frame) {
  const pulse=1+Math.sin(frame*0.03)*0.04
  const glow=ctx.createRadialGradient(sx,sy,0,sx,sy,52*pulse)
  glow.addColorStop(0,'rgba(239,68,68,0.2)'); glow.addColorStop(0.7,'rgba(245,158,11,0.07)'); glow.addColorStop(1,'transparent')
  ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(sx,sy,52*pulse,0,Math.PI*2); ctx.fill()
  ;[25,36].forEach((r,i) => { ctx.beginPath(); ctx.arc(sx,sy,r*pulse,0,Math.PI*2); ctx.strokeStyle=`rgba(239,68,68,${0.6-i*0.18})`; ctx.lineWidth=3-i; ctx.stroke() })
  const eye=ctx.createRadialGradient(sx,sy,0,sx,sy,12)
  eye.addColorStop(0,'rgba(255,255,255,0.9)'); eye.addColorStop(0.5,'rgba(255,200,200,0.5)'); eye.addColorStop(1,'transparent')
  ctx.fillStyle=eye; ctx.beginPath(); ctx.arc(sx,sy,12,0,Math.PI*2); ctx.fill()
}

function drawLabels(ctx, map, tA, tB, room, showB, mA, mB) {
  if (!tA||tA.length===0) return
  const [sx,sy]=project(map,tA[0][2],tA[0][1])
  ctx.fillStyle='rgba(239,68,68,0.92)'; ctx.font="bold 11px 'SF Mono',monospace"; ctx.fillText(room.name,sx+22,sy-16)
  ctx.fillStyle='rgba(239,68,68,0.6)'; ctx.font="10px 'SF Mono',monospace"; ctx.fillText(`${room.category} · ${room.wind}kt`,sx+22,sy+2)
  const el=tA[tA.length-1], [ex,ey]=project(map,el[2],el[1])
  ctx.fillStyle='#38BDF8'; ctx.font="bold 10px 'SF Mono',monospace"; ctx.fillText(`${mA??'Euro IFS'} \u2192`,ex+6,ey)
  if (showB&&tB&&tB!==tA) { const gl=tB[tB.length-1], [gx,gy]=project(map,gl[2],gl[1]); ctx.fillStyle='#F59E0B'; ctx.font="bold 10px 'SF Mono',monospace"; ctx.fillText(`${mB??'GFS'} \u2192`,gx+6,gy+14) }
}
