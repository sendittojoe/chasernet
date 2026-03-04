import { useEffect, useRef } from 'react'
import { useMapStore } from '../../stores/mapStore.js'
import { useRoomStore } from '../../stores/roomStore.js'

/**
 * WeatherLayer — lightweight animated wind particle overlay.
 * 
 * Now that GridLayer renders real GRIB2 data as a color-mapped raster,
 * this layer only adds subtle animated wind particles on top for visual flair.
 * It does NOT render color fills — that's GridLayer's job.
 */
export default function WeatherLayer({ map }) {
  const canvasRef     = useRef(null)
  const animRef       = useRef(null)
  const windParticles = useRef([])
  const storeRef      = useRef({})

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
    windParticles.current = Array.from({ length: 600 }, () => ({
      x: Math.random(), y: Math.random(),
      age: Math.floor(Math.random() * 60),
      maxAge: 80 + Math.random() * 80,
      speed: 0.5 + Math.random() * 1.0,
    }))
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
      const layer = ms.layer ?? 'wind'

      // Only show wind particles when wind layer is active
      if (layer === 'wind') {
        const data   = ms.modelData?.[ms.primaryModel] ?? null
        const hourly = data?.raw?.hourly ?? null
        const hi     = Math.min(Math.floor(ms.hour ?? 0), (hourly?.windspeed_10m?.length ?? 1) - 1)

        const speed = hourly?.windspeed_10m?.[hi] ?? 15
        const dir   = hourly?.winddirection_10m?.[hi] ?? 225
        const toRad = ((dir + 180) % 360) * Math.PI / 180
        const dx = Math.sin(toRad), dy = -Math.cos(toRad)

        // Fade trail
        ctx.fillStyle = 'rgba(6,10,18,0.12)'
        ctx.fillRect(0, 0, W, H)

        const spd = (speed / 20) * 0.0018
        const particles = windParticles.current
        for (const p of particles) {
          p.x += dx * spd * p.speed
          p.y += dy * spd * p.speed
          p.age++
          if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0
          if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0
          if (p.age > p.maxAge) { p.x = Math.random(); p.y = Math.random(); p.age = 0; p.speed = 0.5 + Math.random(); continue }
          const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.4
          ctx.beginPath()
          ctx.arc(p.x * W, p.y * H, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200,230,255,${alpha})`
          ctx.fill()
        }
      } else {
        // Clear canvas for non-wind layers (GridLayer handles the color raster)
        ctx.clearRect(0, 0, W, H)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [map, activeRoom, mapState.layer, mapState.primaryModel])

  return (
    <canvas ref={canvasRef} style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:3, mixBlendMode:'screen' }} />
  )
}
