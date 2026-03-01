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
    const canvas = canvasRef.current; if (!canvas) return
    const resize = () => { const w = canvas.parentElement; if (!w) return; canvas.width=w.offsetWidth; canvas.height=w.offsetHeight }
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    windParticles.current = Array.from({ length: 900 }, () => ({ x:Math.random(), y:Math.random(), age:Math.random()*100, maxAge:60+Math.random()*80, speed:0.0006+Math.random()*0.0012 }))
  }, [mapState.dataA, mapState.layer])

  useEffect(() => {
    cancelAnimationFrame(animRef.current)
    const canvas = canvasRef.current; if (!canvas || !map) return
    const draw = () => {
      const W=canvas.width, H=canvas.height
      if (!W||!H) { animRef.current=requestAnimationFrame(draw); return }
      const ctx=canvas.getContext('2d'), ms=storeRef.current
      frameRef.current++
      if (ms.layer !== 'wind') ctx.clearRect(0,0,W,H)
      const hourly=ms.dataA?.raw?.hourly??{}
      const hi=Math.min(Math.floor(ms.hour),(hourly.windspeed_10m?.length??1)-1)
      if (ms.showGraticule) drawGraticule(ctx,map,W,H)
      if (ms.layer==='wind')        drawWindLayer(ctx,hourly,hi,windParticles.current,W,H)
      else if (ms.layer==='temp')   drawTempLayer(ctx,hourly,hi,W,H)
      else if (ms.layer==='precip') drawPrecipLayer(ctx,hourly,hi,W,H)
      else if (ms.layer==='cape')   drawCapeLayer(ctx,hourly,hi,W,H)
      else if (ms.layer==='500mb')  drawPressureLayer(ctx,hourly,hi,W,H)
      if (ms.showBarbs && hourly.windspeed_10m) drawWindBarbs(ctx,hourly,hi,W,H)
      animRef.current=requestAnimationFrame(draw)
    }
    draw(); return () => cancelAnimationFrame(animRef.current)
  }, [map, activeRoom, mapState.layer, mapState.showGraticule, mapState.showBarbs])

  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:3, opacity:activeRoom?1:0.4, transition:'opacity 0.4s' }} />
}

function project(map,lon,lat) { try { const p=map.project([lon,lat]); return [p.x,p.y] } catch { return null } }

function drawGraticule(ctx,map,W,H) {
  const b=map.getBounds()
  const minLon=Math.floor(b.getWest()/10)*10, maxLon=Math.ceil(b.getEast()/10)*10
  const minLat=Math.floor(b.getSouth()/10)*10, maxLat=Math.ceil(b.getNorth()/10)*10
  ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=0.5; ctx.setLineDash([4,8])
  ctx.font="9px 'SF Mono',monospace"; ctx.fillStyle='rgba(255,255,255,0.3)'
  for (let lon=minLon; lon<=maxLon; lon+=10) {
    const top=project(map,lon,maxLat), bot=project(map,lon,minLat); if (!top||!bot) continue
    ctx.beginPath(); ctx.moveTo(top[0],top[1]); ctx.lineTo(bot[0],bot[1]); ctx.stroke()
    const lbl=lon<0?Math.abs(lon)+'\u00b0W':lon>0?lon+'\u00b0E':'0\u00b0'
    ctx.fillText(lbl,top[0]+2,H-8)
  }
  for (let lat=minLat; lat<=maxLat; lat+=10) {
    const l=project(map,minLon,lat), r=project(map,maxLon,lat); if (!l||!r) continue
    ctx.beginPath(); ctx.moveTo(l[0],l[1]); ctx.lineTo(r[0],r[1]); ctx.stroke()
    const lbl=lat<0?Math.abs(lat)+'\u00b0S':lat>0?lat+'\u00b0N':'0\u00b0'
    ctx.fillText(lbl,4,l[1]-3)
  }
  const tropics=[{lat:23.5,label:'Tropic of Cancer',color:'rgba(245,158,11,0.3)'},{lat:-23.5,label:'Tropic of Capricorn',color:'rgba(245,158,11,0.25)'},{lat:0,label:'Equator',color:'rgba(34,197,94,0.3)'}]
  tropics.forEach(({lat,label,color}) => {
    const l=project(map,minLon,lat), r=project(map,maxLon,lat); if (!l||!r) return
    ctx.setLineDash([8,6]); ctx.strokeStyle=color; ctx.lineWidth=1
    ctx.beginPath(); ctx.moveTo(l[0],l[1]); ctx.lineTo(r[0],r[1]); ctx.stroke()
    ctx.fillStyle=color; ctx.fillText(label,W*0.5-40,l[1]-3)
  })
  ctx.restore()
}

function drawWindBarbs(ctx,hourly,hi,W,H) {
  const speed=hourly.windspeed_10m?.[hi]??0, dir=hourly.winddirection_10m?.[hi]??0
  const spacing=80
  for (let x=spacing;x<W;x+=spacing) for (let y=spacing;y<H;y+=spacing) drawBarb(ctx,x,y,speed,dir)
}

function drawBarb(ctx,cx,cy,speed,dir) {
  const angle=(dir-90)*Math.PI/180, color=windColor(speed)
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle)
  ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.globalAlpha=0.6
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(28,0); ctx.stroke()
  let rem=speed, xPos=28
  while(rem>=50){ctx.beginPath();ctx.moveTo(xPos,0);ctx.lineTo(xPos-8,-10);ctx.lineTo(xPos-8,0);ctx.fillStyle=color;ctx.fill();rem-=50;xPos-=10}
  while(rem>=10){ctx.beginPath();ctx.moveTo(xPos,0);ctx.lineTo(xPos-5,-10);ctx.stroke();rem-=10;xPos-=7}
  if(rem>=5){ctx.beginPath();ctx.moveTo(xPos,0);ctx.lineTo(xPos-3,-5);ctx.stroke()}
  if(speed<3){ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.strokeStyle=color;ctx.stroke()}
  ctx.restore()
}

function windColor(kt) {
  if(kt<10) return 'rgb(100,200,255)'; if(kt<20) return 'rgb(56,189,248)'
  if(kt<35) return 'rgb(34,197,94)';   if(kt<50) return 'rgb(234,179,8)'
  if(kt<65) return 'rgb(249,115,22)';  if(kt<100) return 'rgb(239,68,68)'
  return 'rgb(220,38,38)'
}
function windLabel(kt) {
  if(kt<34) return 'TD'; if(kt<64) return 'TS'; if(kt<83) return 'C1'
  if(kt<96) return 'C2'; if(kt<113) return 'C3'; if(kt<137) return 'C4'; return 'C5'
}

function drawWindLayer(ctx,hourly,hi,particles,W,H) {
  const speed=hourly.windspeed_10m?.[hi]??15, dir=hourly.winddirection_10m?.[hi]??225
  const toRad=((dir+180)%360)*Math.PI/180, dx=Math.sin(toRad), dy=-Math.cos(toRad)
  const color=windColor(speed)
  ctx.fillStyle='rgba(6,8,14,0.06)'; ctx.fillRect(0,0,W,H)
  particles.forEach(p => {
    const spd=(speed/30)*p.speed*W; p.x+=dx*spd/W; p.y+=dy*spd/H; p.age++
    if(p.x<0)p.x=1;if(p.x>1)p.x=0;if(p.y<0)p.y=1;if(p.y>1)p.y=0
    if(p.age>p.maxAge){p.x=Math.random();p.y=Math.random();p.age=0;return}
    const alpha=Math.sin(p.age/p.maxAge*Math.PI)*0.55
    ctx.beginPath();ctx.arc(p.x*W,p.y*H,1.3,0,Math.PI*2)
    ctx.fillStyle=color.replace('rgb(','rgba(').replace(')',','+alpha+')');ctx.fill()
  })
  legend(ctx,`WIND  ${Math.round(speed)}kt  ${windLabel(speed)}  ${Math.round(dir)}\u00b0`,color)
}
function drawTempLayer(ctx,hourly,hi,W,H) {
  const temp=hourly.temperature_2m?.[hi]??25
  const t=Math.max(0,Math.min(1,(temp+10)/50))
  const r=Math.round(56+t*183),g=Math.round(189-t*121),b=Math.round(248-t*180)
  const gr=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.max(W,H)*.6)
  gr.addColorStop(0,`rgba(${r},${g},${b},0.3)`);gr.addColorStop(1,'transparent')
  ctx.fillStyle=gr;ctx.fillRect(0,0,W,H)
  legend(ctx,`TEMP  ${temp.toFixed(1)}\u00b0C`,`rgb(${r},${g},${b})`)
}
function drawPrecipLayer(ctx,hourly,hi,W,H) {
  const p=hourly.precipitation?.[hi]??0, a=Math.min(0.45,p*0.08+0.05)
  const g=ctx.createRadialGradient(W*.5,H*.5,10,W*.5,H*.5,Math.max(W,H)*.5)
  g.addColorStop(0,`rgba(56,189,248,${a*2})`);g.addColorStop(1,'transparent')
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H)
  legend(ctx,`PRECIP  ${p.toFixed(1)} mm/hr`,'rgb(56,189,248)')
}
function drawCapeLayer(ctx,hourly,hi,W,H) {
  const cape=hourly.cape?.[hi]??0, norm=Math.min(1,cape/4000)
  const g=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.max(W,H)*.55)
  g.addColorStop(0,`rgba(139,92,246,${norm*0.38+0.03})`);g.addColorStop(1,'transparent')
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H)
  const lv=cape<500?'LOW':cape<1500?'MODERATE':cape<3000?'HIGH':'EXTREME'
  legend(ctx,`CAPE  ${Math.round(cape)} J/kg  ${lv}`,'rgb(139,92,246)')
}
function drawPressureLayer(ctx,hourly,hi,W,H) {
  const pressure=hourly.pressure_msl?.[hi]??1013, cx=W*.5, cy=H*.5
  ;[970,980,990,1000,1010,1020].forEach(mb => {
    const r=Math.abs(pressure-mb)*9; if(r>Math.max(W,H)||r<5) return
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(56,189,248,0.2)';ctx.lineWidth=1;ctx.stroke()
    ctx.fillStyle='rgba(56,189,248,0.45)';ctx.font="9px 'SF Mono',monospace";ctx.fillText(mb+'mb',cx+r+4,cy)
  })
  legend(ctx,`SFC PRESS  ${Math.round(pressure)} mb`,'rgb(56,189,248)')
}
function legend(ctx,text,color) {
  ctx.fillStyle='rgba(6,8,14,0.72)';ctx.fillRect(10,10,text.length*7.5+16,28)
  ctx.fillStyle=color;ctx.font="bold 11px 'SF Mono',monospace";ctx.fillText(text,18,28)
}
