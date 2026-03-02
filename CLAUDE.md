# ChaserNet — Claude Desktop Briefing
> Copy this file to `/Users/josephcurreri/ClaudeWork/chasernet/CLAUDE.md`
> Then tell Claude Desktop: "Read CLAUDE.md and pick up from there"

## What ChaserNet Is
A storm tracking + weather modeling platform at **chasernet.com** (Cloudflare Pages).
Competing with Windy/Ventusky. Built with React + MapLibre GL JS + Cloudflare stack.
Full community platform: chat, forums, DMs, roles, admin panel, storm rooms.

## Tech Stack
- **Frontend:** React + Vite → `apps/web/src/`
- **Map:** MapLibre GL JS + OpenFreeMap tiles (free, no API key)
- **Weather data:** Open-Meteo API (free tier, switch before paid launch)
- **State:** Zustand stores in `apps/web/src/stores/`
- **Deploy:** `npm run deploy -- --web-only` from project root
- **Backend:** Cloudflare Workers at `api.chasernet.com`
- **DB:** Cloudflare D1

## Key Files
```
apps/web/src/
  pages/
    Shell.jsx          ← main layout, Outlet for child routes
    App.jsx            ← all routes defined here
    Members.jsx        ← members directory (just added)
    DirectMessages.jsx ← DM threads
    Forums.jsx         ← forum threads
    AdminPanel.jsx     ← admin panel
  components/
    Map/
      ChaserMap.jsx    ← MapLibre init, OpenFreeMap style
      WeatherLayer.jsx ← canvas wind particle animation
      WeatherCanvas.jsx
      MapControlBar.jsx ← bottom control bar (FIXED)
      NWSAlertsLayer.jsx ← live NWS alerts overlay
      RadarLayer.jsx   ← RainViewer radar tiles (NEW)
      SSTLayer.jsx     ← NOAA CoastWatch SST tiles (NEW)
      TrackLayer.jsx   ← model forecast track lines + dots
      GridLayer.jsx    ← GRIB2 gridded data canvas overlay (NEW)
      ShareButton.jsx
      FreshnessBadges.jsx
    Nav/
      NavRail.jsx      ← left icon nav (desktop)
      MobileBottomNav.jsx
    StormRoom/
      RightPanel.jsx
      tabs/ModelsTab.jsx
  stores/
    mapStore.js        ← weather map state (NO getters - Zustand bug)
    userStore.js       ← auth + user profile
    roomStore.js       ← storm rooms + online presence
  hooks/
    useWeatherData.js  ← fetches Open-Meteo for active models
    useModelFreshness.js
    useShareableUrl.js
```

## Critical Zustand Rule
**NEVER use getter syntax in Zustand stores.** `get foo()` breaks silently after first `set()` call because Zustand uses `Object.assign` which strips getters. Always use plain properties.

## Known Bugs (all fixed)
1. ~~**Models panel → black screen**~~ ✅ FIXED — Removed orphaned `useShareableUrl` import from `MapControlBar.jsx`. Wired `useShareableUrl(mapObj)` into `ChaserMap.jsx` where mapRef lives.

2. ~~**DM badge hardcoded**~~ ✅ VERIFIED GONE — No `badge={3}` in NavRail.jsx.

3. ~~**Radar layer not rendering**~~ ✅ FIXED — Created `RadarLayer.jsx`. Fetches latest RainViewer timestamp, adds raster tile source/layer to MapLibre, syncs visibility/opacity with store, auto-refreshes every 5min.

4. ~~**SST layer not rendering**~~ ✅ FIXED — Created `SSTLayer.jsx`. NOAA CoastWatch ERDDAP WMS tiles as raster layer, same store sync pattern.

5. ~~**Track layer**~~ ✅ FIXED — Created `TrackLayer.jsx`. Reads track arrays from `modelData[modelId].track` (built by `useWeatherData.buildTrack()`). Primary model = solid thick line + hour-labeled dots. Other active models = dashed spaghetti lines. Interpolated current-position marker. All synced with store visibility/opacity.

## Recently Completed Features
- ✅ Members directory page at `/app/members` with search, filter, Message buttons
- ✅ NWS Alerts overlay (live polygons from api.weather.gov)
- ✅ Model freshness badges (shows run age, green/red staleness)
- ✅ Shareable map URLs (hash-based, copy link button)
- ✅ Online presence indicators in storm rooms
- ✅ Admin panel routing fixed (Outlet in Shell.jsx)
- ✅ OpenFreeMap migration (was MapTiler, now free + no key)
- ✅ Zustand getters bug fixed across all stores
- ✅ RadarLayer — live RainViewer tiles on map
- ✅ SSTLayer — NOAA CoastWatch SST on map
- ✅ TrackLayer — model forecast tracks with spaghetti view
- ✅ Real-time WebSocket system — UserPresenceDO + live DMs + notifications + model alerts
- ✅ GRIB2 pipeline — GitHub Actions + wgrib2 + R2 + GridLayer canvas rendering

## GRIB2 Pipeline Architecture
**Flow:** NOAA NOMADS / ECMWF / DWD → GitHub Actions (every 6h) → wgrib2 regrid to 1° → gzip JSON → R2 → API /tiles/* → GridLayer.jsx canvas overlay

**Key files:**
- `.github/workflows/grib-pipeline.yml` — scheduled workflow
- `pipeline/process_grib.py` — download + extract + convert
- `pipeline/update_index.py` — tile index generator
- `pipeline/SETUP.md` — full setup guide
- `workers/api/src/routes/tiles.js` — tile API + R2 proxy
- `apps/web/src/components/Map/GridLayer.jsx` — canvas renderer

**Tile path:** `tiles/{model}/{date}/{cycle}z/{variable}_f{fhour}.json`
**Variables:** wind_10m, temp_2m, mslp, precip, cape, hgt_500
**Models:** GFS, ECMWF IFS, ICON
**Setup needed:** R2 public domain (`assets.chasernet.com`), GitHub secrets

## Architecture Notes
- Routes: `/app` = map, `/app/storm/:id` = storm room, `/app/admin`, `/app/forums`, `/app/messages/:userId`, `/app/members`
- Shell.jsx renders map always, overlays Outlet for non-map routes
- `isMapRoute` check: `location.pathname === '/app' || location.pathname.startsWith('/app/storm')`
- Wind particles: canvas overlay on map, reads from `mapStore.modelData[primaryModel].raw.hourly`
- Model data flow: `useWeatherData` hook → fetches Open-Meteo → calls `setModelData(modelId, data)` → WeatherLayer reads from store
- Track data flow: `useWeatherData.buildTrack()` → generates `[hour, lat, lon]` arrays → stored in `modelData[modelId].track` → TrackLayer reads from store and renders GeoJSON lines/dots on MapLibre

## Real-Time Architecture (NEW)
- **UserPresenceDO** — one Durable Object per user. Holds their WebSocket connection(s).
  - Client connects: `wss://chat.chasernet.com/user/{userId}?token=...`
  - API pushes events: `POST https://chat.chasernet.com/user/{userId}/push`
  - Queues events for offline users (last 50), delivers on reconnect
- **StormRoomDO** — one DO per storm room. Handles room chat, presence, typing indicators.
  - Client connects: `wss://chat.chasernet.com/room/{roomId}?token=...`
- **Event flow:** API route (e.g. DM send) → writes to D1 → POSTs to UserPresenceDO → DO pushes to client WebSocket → `usePresence` hook → `dmStore` / `notificationStore` update → React re-renders
- **Push helper:** `workers/api/src/lib/push.js` exports `pushToUser(env, userId, event)` and `createNotification(env, db, {...})`
- **Cron model alerts:** When cron detects a new model run, it fans out push events to all users active in last 24h
- **Browser notifications:** `usePresence` fires native `Notification()` for DMs and model alerts
- **Frontend stores:** `useDMStore` (zustand) for DM conversations/messages, `useNotificationStore` for notifications

## What To Build Next
1. ~~Fix models panel black screen~~ ✅
2. ~~Wire radar layer~~ ✅
3. ~~Wire SST layer~~ ✅
4. ~~Real-time WebSocket for DMs/notifications~~ ✅
5. ~~GRIB2 pipeline~~ ✅ (GitHub Actions → wgrib2 → R2 → GridLayer)
6. Shell layout redesign — proper 3-column Discord-style
7. ~~Push notifications for model runs~~ ✅ (via UserPresenceDO + browser Notification API)
8. Discord bot two-way bridge

## Deploy Command
```bash
cd /Users/josephcurreri/ClaudeWork/chasernet
npm run deploy -- --web-only
```

## Data Sources (all free)
- Open-Meteo: `https://api.open-meteo.com/v1/forecast` — current weather data
- NWS Alerts: `https://api.weather.gov/alerts/active` — live watch/warnings
- OpenFreeMap: `https://tiles.openfreemap.org/styles/liberty` — map tiles
- RainViewer: `https://api.rainviewer.com/public/weather-maps.json` → `https://tilecache.rainviewer.com` — radar tiles
- NOAA CoastWatch: `https://coastwatch.pfeg.noaa.gov/erddap/wms/jplMURSST41/request` — SST tiles
- ECMWF Open Data: CC-BY-4.0, free since Oct 2025
- NOAA NOMADS: GFS/HRRR/NAM/GEFS public domain
