# ChaserNet — Claude Desktop Briefing
> Context transfer doc for Claude sessions. Read this first.
> Last updated: 2026-03-03

## What ChaserNet Is
A storm tracking + weather modeling platform at **chasernet.com** (Cloudflare Pages).
Competing with Windy/Ventusky. Built with React + MapLibre GL JS + Cloudflare stack.
Full community platform: chat, forums, DMs, roles, admin panel, storm rooms.

## Tech Stack
- **Frontend:** React + Vite → `apps/web/src/`
- **Map:** MapLibre GL JS v5.19.0 + OpenFreeMap tiles (free, no API key)
- **Weather data:** Open-Meteo API (free tier, switch before paid launch)
- **State:** Zustand stores in `apps/web/src/stores/`
- **Deploy:** `npm run deploy -- --web-only` from project root
- **Backend:** Cloudflare Workers at `api.chasernet.com`
- **Chat:** Cloudflare Durable Objects at `chat.chasernet.com`
- **DB:** Cloudflare D1
- **Storage:** Cloudflare R2

## Key Files
```
apps/web/src/
  pages/
    Shell.jsx          ← main layout, mounts CommandPalette globally
    App.jsx            ← all routes defined here
    Settings.jsx       ← user settings (profile, password, notifications)
    Members.jsx        ← members directory
    DirectMessages.jsx ← DM threads
    Forums.jsx         ← forum threads
    AdminPanel.jsx     ← admin panel
  components/
    Map/
      ChaserMap.jsx       ← MapLibre init, globe projection, storm markers
      WeatherLayer.jsx    ← canvas wind particle animation
      WeatherCanvas.jsx
      MapControlBar.jsx   ← 4-mode layer UI: presets, drag stack, browse, ⌘K
      CommandPalette.jsx  ← ⌘K global search (layers, presets, tools)
      FacetedPicker.jsx   ← full-screen layer browser (category/source/tag facets)
      RadarLayer.jsx      ← RainViewer 6-frame animated radar
      SSTLayer.jsx        ← NOAA CoastWatch SST tiles
      TrackLayer.jsx      ← model forecast track lines + dots
      GridLayer.jsx       ← GRIB2 gridded data canvas overlay
      LightningLayer.jsx  ← Blitzortung WebSocket real-time strikes
      SatelliteLayer.jsx  ← RainViewer IR satellite
      NWSAlertsLayer.jsx  ← live NWS alert polygons
      SplitView.jsx       ← dual-pane model comparison
      SpaghettiLayer.jsx  ← ensemble spaghetti tracks
      ClickInspect.jsx    ← right-click weather data popup
      SearchBar.jsx       ← geocoding via Nominatim
      ShareButton.jsx
      FreshnessBadges.jsx
    Nav/
      NavRail.jsx         ← left icon nav (desktop), hover-expand
      MobileBottomNav.jsx
    StormRoom/
      RightPanel.jsx
      tabs/ModelsTab.jsx
  stores/
    mapStore.js        ← map state, ALL_LAYERS (55+), LAYER_CATEGORIES,
                          LAYER_TAGS, LAYER_PRESETS, layer actions
    userStore.js       ← auth + user profile
    roomStore.js       ← storm rooms + online presence
  hooks/
    useWeatherData.js  ← fetches Open-Meteo for active models
    useModelFreshness.js
    useShareableUrl.js
    usePresence.js     ← WebSocket connection to UserPresenceDO
```

## Layer UI System (NEW — 2026-03-03)
4-mode hybrid layer system, inspired by extensive research across 10+ platforms:

### 1. Smart Presets (new users)
6 curated combos in horizontal scroll row:
- Storm Chasing: Radar + Lightning + CAPE + Gusts + Alerts
- Marine: SST + Waves + Wind + Pressure
- Aviation: Visibility + Clouds + Freeze Level + Jet Stream
- Winter Wx: Snow + Precip + Temp + Freeze Level + Radar
- Air Quality: US AQI + PM2.5 + Dust + Wind
- Synoptic: 500mb + Pressure + 850mb Temp + Jet Stream

### 2. Command Palette (power users)
`⌘K` / `Ctrl+K` opens Bloomberg Terminal-style fuzzy search.
Searches all 55 layers, 6 presets, 3 tools (split, spaghetti, 3D).
Full keyboard nav: ↑↓ browse, Enter toggle, Esc close.

### 3. Faceted Picker (exploration)
Full-screen modal with left sidebar facets:
- Category (12 groups), Data Source (5), Tags (20)
- AND logic: selecting multiple tags intersects results
- Card grid with inline opacity sliders

### 4. Drag Stack (compositing)
Active layers shown as cards. Drag ONLY from ⠿ grip handle.
Tap card body to toggle visibility on/off.
Opacity slider isolated from drag events.
Reorder = change z-order (bottom paints first).

### Tag System
55 layers × 20 tags (cross-cutting, not hierarchical):
real-time, chasing, animated, forecast, surface, severe, convection,
aviation, precipitation, winter, synoptic, ocean, marine, air-quality,
health, solar, energy, agriculture, upper-air, overlay

### Store Data
- `ALL_LAYERS` — 55 layer definitions (id, label, emoji, color, source, category)
- `LAYER_TAGS` — per-layer tag arrays
- `LAYER_PRESETS` — 6 preset definitions with layer IDs + opacities
- `activeLayers` — array of {id, opacity, visible}
- Actions: `toggleLayer`, `setLayerOpacity`, `removeLayer`, `reorderLayers`, `applyPreset`

## Critical Rules
1. **Zustand: NEVER use getter syntax.** `get foo()` breaks silently after first `set()` call because `Object.assign` strips getters. Always use plain properties.
2. **MapLibre image sources: NEVER use data: or blob: URLs.** They cause `AJAXError: Failed to fetch` spam. Create source lazily on first real data load instead.
3. **MapLibre raster layers: NEVER set opacity to exactly 0.** MapLibre optimizes away tile loading. Use 0.01 for "invisible but loaded."
4. **MapLibre fonts: Use 'Open Sans Bold' not 'Noto Sans Bold'.** OpenFreeMap Liberty style doesn't include Noto. Wrong font = "Ne is not defined" errors.
5. **D1 migrations: DROP + recreate, not CREATE IF NOT EXISTS.** Existing tables with wrong schemas cause silent failures.
6. **Deployment verification:** Check bundle hash via `document.querySelectorAll('script[src]')` and hard refresh `Cmd+Shift+R`.
7. **Batch deployments preferred.** Group fixes into single deploy cycles.

## Known Issues (Current)
- **3D terrain disabled** — No free DEM tile source with CORS headers. MapLibre demo server dead, AWS tiles lack CORS. 3D toggle still works (pitch change only). TODO: proxy DEM tiles through api.chasernet.com or use MapTiler.
- **GridLayer data: URI** — Now deferred (source created on first data load), but updateImage still uses canvas.toDataURL(). Works because updateImage uses `new Image()` which handles data URIs, unlike the source constructor which uses `fetch()`.
- **SST layer** — proxy works but layer rendering not verified recently.
- **Track layer** — renders but no real tropical track data currently (only synthetic from Open-Meteo point forecasts).

## Recently Completed Features
- ✅ 4-mode hybrid layer UI (presets, ⌘K, faceted picker, drag stack)
- ✅ 55 layers organized into 12 categories with 20 cross-cutting tags
- ✅ RadarLayer — animated RainViewer 6-frame radar on map
- ✅ LightningLayer — Blitzortung WebSocket real-time strikes
- ✅ SatelliteLayer — RainViewer IR composite
- ✅ GridLayer — canvas-rendered GRIB2 data with color ramps
- ✅ TrackLayer — model forecast tracks with spaghetti view
- ✅ Globe projection (MapLibre v5.19.0 adaptive composite)
- ✅ Geocoding search bar (Nominatim)
- ✅ Click-to-inspect (right-click → Open-Meteo point forecast)
- ✅ Geolocation auto-center on first load
- ✅ Members directory, NWS alerts, model freshness badges
- ✅ Shareable hash-based URLs, online presence indicators
- ✅ Real-time WebSocket (UserPresenceDO + StormRoomDO)
- ✅ GRIB2 pipeline (GitHub Actions → wgrib2 → R2)
- ✅ Console error cleanup (terrain, GridLayer, TrackLayer, RadarLayer)

## GRIB2 Pipeline Architecture
**Flow:** NOAA NOMADS / ECMWF / DWD → GitHub Actions (every 6h) → wgrib2 regrid to 1° → gzip JSON → R2 → API /tiles/* → GridLayer.jsx canvas overlay

**Key files:**
- `.github/workflows/grib-pipeline.yml` — scheduled workflow
- `pipeline/process_grib.py` — download + extract + convert
- `workers/api/src/routes/tiles.js` — tile API + R2 proxy
- `apps/web/src/components/Map/GridLayer.jsx` — canvas renderer

**Tile path:** `tiles/{model}/{date}/{cycle}z/{variable}_f{fhour}.json`
**Variables:** wind_10m, temp_2m, mslp, precip, cape, hgt_500

## Real-Time Architecture
- **UserPresenceDO** — per-user Durable Object, holds WebSocket connections
  - Client: `wss://chat.chasernet.com/user/{userId}?token=...`
  - API push: `POST https://chat.chasernet.com/user/{userId}/push`
- **StormRoomDO** — per-room DO for chat, presence, typing
  - Client: `wss://chat.chasernet.com/room/{roomId}?token=...`
- **Event flow:** API → D1 write → UserPresenceDO push → WebSocket → React stores

## Architecture Notes
- Routes: `/app` = map, `/app/storm/:id` = storm room, `/app/admin`, `/app/settings`, `/app/forums`, `/app/messages/:userId`, `/app/members`
- Shell.jsx renders map always + CommandPalette globally, overlays Outlet for non-map routes
- `window.__map` exposed for debugging (MapLibre instance)
- Wind particles: canvas overlay, reads from `mapStore.modelData[primaryModel].raw.hourly`
- Model data flow: `useWeatherData` → Open-Meteo → `setModelData()` → WeatherLayer reads store

## What To Build Next
1. **ModelViewer component** — core differentiator: animated wind maps, timeline scrubbing, dual-pane comparison, ensemble spaghetti, scenario sandbox, meteograms
2. **Expand model coverage** — ECMWF IFS/AIFS, GEFS ensemble members, AI models
3. **DEM terrain proxy** — route through api.chasernet.com for CORS
4. **Discord bot** — two-way bridge (currently one-way webhook only)
5. **PWA icons** — icon-192.png and icon-512.png
6. **Protomaps migration** — self-hosted map tiles before membership launch

## Deploy Command
```bash
cd /Users/josephcurreri/ClaudeWork/chasernet
npm run deploy -- --web-only
```

## Data Sources (all free)
- **Open-Meteo:** `api.open-meteo.com` — forecast, air quality, marine APIs
- **NWS Alerts:** `api.weather.gov/alerts/active` — live watch/warnings
- **OpenFreeMap:** `tiles.openfreemap.org/styles/liberty` — map tiles (no key)
- **RainViewer:** `api.rainviewer.com` → `tilecache.rainviewer.com` — radar + IR satellite
- **Blitzortung:** WebSocket `ws://ws1.blitzortung.org` — real-time lightning
- **NOAA CoastWatch:** `coastwatch.pfeg.noaa.gov/erddap/wms` — SST tiles
- **ECMWF Open Data:** CC-BY-4.0, free since Oct 2025
- **NOAA NOMADS:** GFS/HRRR/NAM/GEFS public domain
- **Nominatim:** `nominatim.openstreetmap.org` — geocoding
