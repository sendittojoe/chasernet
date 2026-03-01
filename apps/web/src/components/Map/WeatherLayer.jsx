import { useEffect, useRef, useState } from 'react'
import { useMapStore } from '../../stores/mapStore.js'
import { useRoomStore } from '../../stores/roomStore.js'

export default function WeatherLayer({ map }) {
  const canvasRef     = useRef(null)
  const animRef       = useRef(null)
  const windParticles = useRef([])
  const frameRef      = useRef(0)
  const storeRef      = useRef({})
  const [debugInfo, setDebugInfo] = useState('initializing...')

  const mapState = useMapStore()
  storeRef.current = mapState
  const { activeRoom } = useRoomStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      if (!canvas.parentElement) return
      canvas.width  = canvas.parentElement.offsetWidth
      canvas.height = canvas.parentElement.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    windParticles.current = Array.from({ length: 800 }, () => ({
      x: Math.random(), y: Math.random(),
      age: Math.floor(Math.random() * 60),
      maxAge: 80 + Math.random() * 80,
      speed: 0.5 + Math.random() * 1.0,
    }))
  }, [mapState.layer])

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

      const data   = ms.modelData?.[ms.primaryModel] ?? null
      const hourly = data?.raw?.hourly ?? null

      if (!hourly) {
        ctx.clearRect(0, 0, W, H)
        const t = (Math.sin(frameRef.current * 0.04) + 1) / 2
        ctx.fillStyle = `rgba(56,189,248,${0.05 + t * 0.05})`
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = `rgba(56,189,248,${0.5 + t * 0.4})`
        ctx.font = 'bold 13px monospace'
        ctx.fillText(`⟳ Fetching ${ms.primaryModel ?? 'model'}...`, 14, 34)
        animRef.current = requestAnimationFrame(draw)
        return
      }

      const maxIdx = (hourly.windspeed_10m?.length ?? 1) - 1
      const hi = Math.min(Math.floor(ms.hour ?? 0), maxIdx)
      const layer = ms.layer ?? 'wind'

      if (layer === 'wind' || layer === 'radar') {
        drawWind(ctx, hourly, hi, windParticles.current, W, H)
      } else {
        ctx.clearRect(0, 0, W, H)
        if (layer === 'temp')   drawTemp(ctx, hourly, hi, W, H)
        if (layer === 'precip') drawPrecip(ctx, hourly, hi, W, H)
        if (layer === 'cape')   drawCape(ctx, hourly, hi, W, H)
        if (layer === '500mb')  drawPressure(ctx, hourly, hi, W, H)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [map, activeRoom, mapState.layer, mapState.primaryModel, mapState.modelData])

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = storeRef.current
      const keys = Object.keys(ms.modelData ?? {})
      setDebugInfo(keys.length > 0 ? `✅ ${keys.join(', ')}` : `⟳ fetching ${ms.primaryModel}...`)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:3, mixBlendMode:'screen' }} />
      <div style={{ position:'absolute', top:52, left:8, zIndex:20, background:'rgba(0,0,0,0.8)', border:'1px solid rgba(56,189,248,0.35)', borderRadius:6, padding:'4px 10px', fontFamily:'monospace', fontSize:10, color:'#38BDF8', pointerEvents:'none' }}>
        {debugInfo}
      </div>
    </>
  )
}

function windColor(kt) {
  if (kt < 15)  return [100,210,255]
  if (kt < 25)  return [56,189,248]
  if (kt < 35)  return [34,197,94]
  if (kt < 50)  return [250,204,21]
  if (kt < 65)  return [249,115,22]
  if (kt < 100) return [239,68,68]
  return [220,38,38]
}

function drawWind(ctx, hourly, hi, particles, W, H) {
  const speed = hourly.windspeed_10m?.[hi]     ?? 15
  const dir   = hourly.winddirection_10m?.[hi] ?? 225
  const toRad = ((dir + 180) % 360) * Math.PI / 180
  const dx = Math.sin(toRad), dy = -Math.cos(toRad)
  const [r, g, b] = windColor(speed)

  ctx.fillStyle = 'rgba(6,10,18,0.08)'
  ctx.fillRect(0, 0, W, H)

  const spd = (speed / 20) * 0.0018
  particles.forEach(p => {
    p.x += dx * spd * p.speed; p.y += dy * spd * p.speed; p.age++
    if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0
    if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0
    if (p.age > p.maxAge) { p.x=Math.random();p.y=Math.random();p.age=0;p.speed=0.5+Math.random()*1.0; return }
    const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.85
    ctx.beginPath(); ctx.arc(p.x*W, p.y*H, 2, 0, Math.PI*2)
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`; ctx.fill()
  })

  const cat = speed<34?'BREEZY':speed<64?'TROPICAL STORM':speed<96?'HURRICANE':'MAJOR HUR'
  drawLegend(ctx, 10, 10, `rgb(${r},${g},${b})`, `WIND  ${Math.round(speed)} kt  ${cat}`)
}

function drawTemp(ctx, hourly, hi, W, H) {
  const temp = hourly.temperature_2m?.[hi] ?? 20
  const t = Math.max(0, Math.min(1, (temp + 20) / 60))
  const r=Math.round(30+t*209), g=Math.round(144-t*80), b=Math.round(255-t*215)
  const grad = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.65)
  grad.addColorStop(0,`rgba(${r},${g},${b},0.50)`); grad.addColorStop(0.5,`rgba(${r},${g},${b},0.22)`); grad.addColorStop(1,`rgba(${r},${g},${b},0.04)`)
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H)
  drawLegend(ctx,10,10,`rgb(${r},${g},${b})`,`TEMP  ${temp.toFixed(1)}°C`)
}

function drawPrecip(ctx, hourly, hi, W, H) {
  const mm=hourly.precipitation?.[hi]??0, int=Math.min(0.65,mm*0.15+0.08)
  const grad=ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,Math.max(W,H)*0.6)
  grad.addColorStop(0,`rgba(56,189,248,${int*2.2})`); grad.addColorStop(0.5,`rgba(56,189,248,${int})`); grad.addColorStop(1,'rgba(56,189,248,0.02)')
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H)
  drawLegend(ctx,10,10,'rgb(96,165,250)',`PRECIP  ${mm.toFixed(1)} mm/hr`)
}

function drawCape(ctx, hourly, hi, W, H) {
  const cape=hourly.cape?.[hi]??0, norm=Math.min(1,cape/3500)
  const grad=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.65)
  grad.addColorStop(0,`rgba(167,93,246,${norm*0.55+0.06})`); grad.addColorStop(0.6,`rgba(167,93,246,${norm*0.18})`); grad.addColorStop(1,'rgba(167,93,246,0.02)')
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H)
  const lv=cape<500?'LOW':cape<1500?'MODERATE':cape<3000?'HIGH':'EXTREME'
  drawLegend(ctx,10,10,'rgb(167,93,246)',`CAPE  ${Math.round(cape)} J/kg  ${lv}`)
}

function drawPressure(ctx, hourly, hi, W, H) {
  const mb=hourly.pressure_msl?.[hi]??1013, cx=W/2, cy=H/2
  ;[960,980,1000,1010,1020,1030].forEach((iso,i)=>{
    const r=30+Math.abs(mb-iso)*8
    if(r>Math.max(W,H)) return
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2)
    ctx.strokeStyle=`rgba(56,189,248,${0.4-i*0.04})`; ctx.lineWidth=1.5; ctx.stroke()
    ctx.fillStyle='rgba(56,189,248,0.55)'; ctx.font='9px monospace'
    ctx.fillText(`${iso}`,cx+r+3,cy+4)
  })
  drawLegend(ctx,10,10,'rgb(56,189,248)',`500mb  ${Math.round(mb)} hPa`)
}

function drawLegend(ctx, x, y, color, text) {
  const w=text.length*7.5+20
  ctx.fillStyle='rgba(6,10,18,0.82)'; ctx.fillRect(x,y,w,30)
  ctx.strokeStyle=color; ctx.lineWidth=1; ctx.strokeRect(x,y,w,30)
  ctx.fillStyle=color; ctx.font="bold 11px 'SF Mono',ui-monospace,monospace"
  ctx.fillText(text,x+10,y+20)
}
