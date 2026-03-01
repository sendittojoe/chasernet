import { useEffect, useRef } from 'react'
import { useMapStore }  from '../../stores/mapStore.js'
import { useRoomStore } from '../../stores/roomStore.js'

export default function WeatherLayer({ map }) {
  const canvasRef     = useRef(null)
  const animRef       = useRef(null)
  const storeRef      = useRef({})
  const windParticles = useRef([])
  const frameRef      = useRef(0)

  const mapState = useMapStore()
  storeRef.current = mapState
  const { activeRoom } = useRoomStore()

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
    windParticles.current = Array.from({ length: 800 }, () => ({ x: Math.random(), y: Math.random(), age: Math.random()*100, maxAge: 60+Math.random()*80, speed: 0.0008+Math.random()*0.001 }))
  }, [mapState.dataA, mapState.layer])

  useEffect(() => {
    cancelAnimationFrame(animRef.current)
    const canvas = canvasRef.current
    if (!canvas || !map) return
    const draw = () => {
      const W = canvas.width, H = canvas.height
      if (!W || !H) { animRef.current = requestAnimationFrame(draw); return }
      const ctx = canvas.getContext('2d')
      const ms  = storeRef.current
      frameRef.current++
      ctx.clearRect(0, 0, W, H)
      const data = ms.dataA
      if (!data || !data.raw) { animRef.current = requestAnimationFrame(draw); return }
      const hourly = data.raw.hourly ?? {}
      const hi = Math.min(Math.floor(ms.hour), (hourly.windspeed_10m?.length ?? 1) - 1)
      if (ms.layer === 'wind')  drawWindLayer(ctx, hourly, hi, windParticles.current, W, H)
      else if (ms.layer === 'temp')   drawTempLayer(ctx, hourly, hi, W, H)
      else if (ms.layer === 'precip') drawPrecipLayer(ctx, hourly, hi, W, H)
      else if (ms.layer === 'cape')   drawCapeLayer(ctx, hourly, hi, W, H)
      else if (ms.layer === '500mb')  drawPressureLayer(ctx, hourly, hi, W, H)
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [map, activeRoom, mapState.layer])

  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:3, opacity: activeRoom ? 1 : 0, transition:'opacity 0.4s' }} />
}

function windColor(kt) {
  if (kt < 10)  return 'rgb(100,200,255)'
  if (kt < 20)  return 'rgb(56,189,248)'
  if (kt < 35)  return 'rgb(34,197,94)'
  if (kt < 50)  return 'rgb(234,179,8)'
  if (kt < 65)  return 'rgb(249,115,22)'
  if (kt < 100) return 'rgb(239,68,68)'
  return 'rgb(220,38,38)'
}

function windLabel(kt) {
  if (kt < 34)  return 'TD'
  if (kt < 64)  return 'TS'
  if (kt < 83)  return 'C1'
  if (kt < 96)  return 'C2'
  if (kt < 113) return 'C3'
  if (kt < 137) return 'C4'
  return 'C5'
}

function drawWindLayer(ctx, hourly, hi, particles, W, H) {
  const speed = hourly.windspeed_10m?.[hi] ?? 20
  const dir   = hourly.winddirection_10m?.[hi] ?? 225
  const toRad = ((dir + 180) % 360) * Math.PI / 180
  const dx = Math.sin(toRad), dy = -Math.cos(toRad)
  const color = windColor(speed)
  ctx.fillStyle = 'rgba(6,8,14,0.04)'
  ctx.fillRect(0, 0, W, H)
  particles.forEach(p => {
    const spd = (speed / 30) * p.speed * W
    p.x += dx * spd / W; p.y += dy * spd / H; p.age++
    if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0
    if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0
    if (p.age > p.maxAge) { p.x = Math.random(); p.y = Math.random(); p.age = 0; return }
    const alpha = Math.sin(p.age / p.maxAge * Math.PI) * 0.65
    ctx.beginPath(); ctx.arc(p.x*W, p.y*H, 1.3, 0, Math.PI*2)
    ctx.fillStyle = color.replace('rgb(','rgba(').replace(')',`,${alpha})`); ctx.fill()
  })
  ctx.fillStyle = 'rgba(6,8,14,0.65)'; ctx.fillRect(10, 10, 240, 28)
  ctx.fillStyle = color; ctx.font = "bold 11px 'SF Mono',monospace"
  ctx.fillText(`WIND  ${Math.round(speed)}kt  ${windLabel(speed)}  ${Math.round(dir)}\u00b0`, 18, 28)
}

function drawTempLayer(ctx, hourly, hi, W, H) {
  const temp = hourly.temperature_2m?.[hi] ?? 25
  const t = Math.max(0, Math.min(1, (temp + 10) / 50))
  const r = Math.round(56 + t * 183), g2 = Math.round(189 - t * 121), b = Math.round(248 - t * 180)
  const g = ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.max(W,H)*.6)
  g.addColorStop(0, `rgba(${r},${g2},${b},0.28)`); g.addColorStop(1, 'transparent')
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
  ctx.fillStyle='rgba(6,8,14,0.65)'; ctx.fillRect(10,10,200,28)
  ctx.fillStyle=`rgb(${r},${g2},${b})`; ctx.font="bold 11px 'SF Mono',monospace"
  ctx.fillText(`TEMP  ${temp.toFixed(1)}\u00b0C`, 18, 28)
}

function drawPrecipLayer(ctx, hourly, hi, W, H) {
  const precip = hourly.precipitation?.[hi] ?? 0
  const alpha = Math.min(0.45, precip*0.08+0.05)
  const g = ctx.createRadialGradient(W*.5,H*.5,10,W*.5,H*.5,Math.max(W,H)*.5)
  g.addColorStop(0,`rgba(56,189,248,${alpha*2})`); g.addColorStop(1,'transparent')
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
  ctx.fillStyle='rgba(6,8,14,0.65)'; ctx.fillRect(10,10,240,28)
  ctx.fillStyle='rgb(56,189,248)'; ctx.font="bold 11px 'SF Mono',monospace"
  ctx.fillText(`PRECIP  ${precip.toFixed(1)} mm/hr`, 18, 28)
}

function drawCapeLayer(ctx, hourly, hi, W, H) {
  const cape = hourly.cape?.[hi] ?? 0
  const norm = Math.min(1, cape/4000)
  const g = ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.max(W,H)*.55)
  g.addColorStop(0,`rgba(139,92,246,${norm*0.35+0.03})`); g.addColorStop(1,'transparent')
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
  const level = cape<500?'LOW':cape<1500?'MODERATE':cape<3000?'HIGH':'EXTREME'
  ctx.fillStyle='rgba(6,8,14,0.65)'; ctx.fillRect(10,10,280,28)
  ctx.fillStyle='rgb(139,92,246)'; ctx.font="bold 11px 'SF Mono',monospace"
  ctx.fillText(`CAPE  ${Math.round(cape)} J/kg  ${level}`, 18, 28)
}

function drawPressureLayer(ctx, hourly, hi, W, H) {
  const pressure = hourly.pressure_msl?.[hi] ?? 1013
  const cx=W*.5, cy=H*.5
  ;[980,990,1000,1010,1020,1030].forEach(mb => {
    const r = Math.abs(pressure-mb)*8
    if (r>Math.max(W,H)) return
    ctx.beginPath(); ctx.arc(cx,cy,Math.max(10,r),0,Math.PI*2)
    ctx.strokeStyle='rgba(56,189,248,0.18)'; ctx.lineWidth=1; ctx.stroke()
    ctx.fillStyle='rgba(56,189,248,0.5)'; ctx.font="9px 'SF Mono',monospace"
    ctx.fillText(`${mb}mb`,cx+Math.max(10,r)+4,cy)
  })
  ctx.fillStyle='rgba(6,8,14,0.65)'; ctx.fillRect(10,10,240,28)
  ctx.fillStyle='rgb(56,189,248)'; ctx.font="bold 11px 'SF Mono',monospace"
  ctx.fillText(`SFC PRESSURE  ${Math.round(pressure)} mb`, 18, 28)
}
