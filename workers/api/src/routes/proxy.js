import { Hono } from 'hono'

const proxy = new Hono()

/**
 * SST tile proxy — converts z/x/y tile coordinates to WMS bbox parameters
 * and proxies to NOAA ERDDAP, adding CORS headers.
 */
proxy.get('/sst', async (c) => {
  const url = new URL(c.req.url)
  const z = parseInt(url.searchParams.get('z') ?? '0')
  const x = parseInt(url.searchParams.get('x') ?? '0')
  const y = parseInt(url.searchParams.get('y') ?? '0')

  // Convert tile coords to EPSG:3857 bbox
  const n = Math.pow(2, z)
  const tileSize = 20037508.342789244 * 2 / n
  const minX = -20037508.342789244 + x * tileSize
  const maxX = minX + tileSize
  const maxY = 20037508.342789244 - y * tileSize
  const minY = maxY - tileSize

  const bbox = `${minX},${minY},${maxX},${maxY}`

  const upstream = 'https://coastwatch.pfeg.noaa.gov/erddap/wms/jplMURSST41/request?' +
    `service=WMS&version=1.1.1&request=GetMap&layers=jplMURSST41:analysed_sst` +
    `&styles=&crs=EPSG:3857&format=image/png&transparent=true` +
    `&width=256&height=256&bbox=${bbox}`

  try {
    const res = await fetch(upstream, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    })
    const buf = await res.arrayBuffer()
    return new Response(buf, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      },
    })
  } catch (e) {
    return new Response('upstream error', { status: 502 })
  }
})

export default proxy
