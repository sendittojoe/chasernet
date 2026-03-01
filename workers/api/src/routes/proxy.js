import { Hono } from 'hono'

const proxy = new Hono()

// CORS proxy for NOAA CoastWatch SST WMS tiles
proxy.get('/sst', async (c) => {
  const params = new URL(c.req.url).searchParams.toString()
  const upstream = 'https://coastwatch.pfeg.noaa.gov/erddap/wms/erdMH1sstd8day/request?' + params
  try {
    const res = await fetch(upstream)
    const buf = await res.arrayBuffer()
    return new Response(buf, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      }
    })
  } catch {
    return new Response('upstream error', { status: 502 })
  }
})

export default proxy
