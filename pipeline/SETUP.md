# ChaserNet GRIB2 Pipeline — Setup Guide

## Architecture

```
NOAA NOMADS / ECMWF Open Data / DWD Open Data
           │  (GRIB2 files)
           ▼
  GitHub Actions (every 6h)
  ├─ wgrib2 extract + regrid to 1°
  └─ Python → compressed JSON grids
           │
           ▼
  Cloudflare R2 (chasernet-assets bucket)
  tiles/{model}/{date}/{cycle}z/{variable}_f{fhour}.json
           │
           ▼
  API Worker → /tiles/* routes
           │
           ▼
  GridLayer.jsx → canvas overlay on MapLibre
```

## Variables Processed

| Variable | Description | Units | Color Ramp |
|----------|-------------|-------|------------|
| wind_10m | 10m wind (U+V) | m/s → knots | Blue → Red → Purple |
| temp_2m | 2m temperature | K → °C | Purple → Blue → Green → Yellow → Red |
| mslp | Mean sea level pressure | Pa → hPa | Purple → Yellow → Red |
| precip | Accumulated precipitation | mm | Transparent → Blue → Green → Red |
| cape | Convective available potential energy | J/kg | Transparent → Blue → Yellow → Red |
| hgt_500 | 500hPa geopotential height | m | Purple → Blue → Green → Yellow → Red |

## Models Processed

| Model | Source | Cycles | Resolution |
|-------|--------|--------|------------|
| GFS | NOAA NOMADS | 00z/06z/12z/18z | 1° (from 1° native) |
| ECMWF IFS | ECMWF Open Data | 00z/12z | 0.25° → 1° |
| ICON | DWD Open Data | 00z/06z/12z/18z | 13km → 1° |

## Forecast Hours

0, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168

## Setup Steps

### 1. R2 Public Access

The `chasernet-assets` R2 bucket needs a custom domain for public access:

```bash
# In Cloudflare Dashboard → R2 → chasernet-assets → Settings
# Add custom domain: assets.chasernet.com
# This serves tiles directly via CDN
```

### 2. GitHub Secrets

Add these secrets to the GitHub repository:

```
R2_ENDPOINT    = https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY  = <R2 API token access key>
R2_SECRET_KEY  = <R2 API token secret key>
CRON_SECRET    = <same secret used by cron worker for auth>
```

To create R2 API tokens:
- Cloudflare Dashboard → R2 → Manage R2 API Tokens
- Create token with Object Read & Write permissions for chasernet-assets bucket

### 3. API Worker Secret

```bash
cd workers/api
wrangler secret put CRON_SECRET
# Enter the same secret used in GitHub
```

### 4. Test Locally

```bash
# Install wgrib2
brew install wgrib2   # macOS
# or: sudo apt install wgrib2   # Ubuntu

# Install Python deps
pip install -r pipeline/requirements.txt

# Run for latest GFS
python pipeline/process_grib.py --model gfs --date $(date -u +%Y%m%d) --cycle 12 --output /tmp/tiles

# Check output
ls -la /tmp/tiles/gfs/
```

### 5. Manual Trigger

Go to GitHub → Actions → GRIB2 Pipeline → Run workflow:
- model: `gfs` (or `all`)
- cycle: `auto` (or `12z`)

## Tile JSON Format

Each tile file is gzip-compressed JSON:

```json
{
  "model": "gfs",
  "run": "20260301",
  "cycle": "12",
  "fhour": 24,
  "variable": "wind_10m",
  "grid": {
    "lat0": 90, "lon0": 0,
    "dlat": -1.0, "dlon": 1.0,
    "nlat": 181, "nlon": 360
  },
  "data": {
    "u": [/* 65160 float values, row-major, north to south */],
    "v": [/* 65160 float values */]
  }
}
```

Grid is 1° global (360×181 = 65,160 points).
Each file compresses to ~20-50 KB with gzip.

## Cost Estimate

| Component | Free Tier | At Scale |
|-----------|-----------|----------|
| GitHub Actions | 2000 min/mo | ~100 min/mo used |
| R2 Storage | 10 GB free | ~2 GB for 3 days of tiles |
| R2 Reads | 10M req/mo free | Cached via CDN |
| Total | $0/mo | $0/mo |

## File Sizes

Per model run, per model:
- 6 variables × 18 forecast hours = 108 files
- ~30KB average per file = ~3.2 MB per model run
- 3 models × 4 runs/day = ~38 MB/day
- 3-day retention = ~115 MB total

Well within R2 free tier (10 GB).
