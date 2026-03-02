#!/usr/bin/env python3
"""
ChaserNet GRIB2 → JSON Grid Processor

Downloads GRIB2 files from NOAA NOMADS / ECMWF Open Data,
extracts key variables via wgrib2, converts to compressed JSON grids.

Output format per file:
{
  "model": "gfs",
  "run": "20260301",
  "cycle": "12",
  "fhour": 24,
  "variable": "wind_10m",
  "grid": { "lat0": 90, "lon0": 0, "dlat": -1.0, "dlon": 1.0, "nlat": 181, "nlon": 360 },
  "data": { "u": [...], "v": [...] }   // or { "values": [...] } for scalar fields
}

Grid is downsampled to 1° for manageable file sizes (~65k values per field).
Compressed with gzip → ~20-50KB per file.
"""

import argparse
import gzip
import json
import math
import os
import struct
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

# ── Variables to extract ───────────────────────────────

VARIABLES = {
    'wind_10m': {
        'gfs_match':   ':UGRD:10 m above ground:|:VGRD:10 m above ground:',
        'ecmwf_param': '10u/10v',
        'icon_match':  ':10U:|:10V:',
        'components':  ['u', 'v'],
    },
    'temp_2m': {
        'gfs_match':   ':TMP:2 m above ground:',
        'ecmwf_param': '2t',
        'icon_match':  ':T_2M:',
        'components':  ['values'],
    },
    'mslp': {
        'gfs_match':   ':PRMSL:mean sea level:',
        'ecmwf_param': 'msl',
        'icon_match':  ':PMSL:',
        'components':  ['values'],
    },
    'precip': {
        'gfs_match':   ':APCP:surface:',
        'ecmwf_param': 'tp',
        'icon_match':  ':TOT_PREC:',
        'components':  ['values'],
    },
    'cape': {
        'gfs_match':   ':CAPE:surface:',
        'ecmwf_param': 'cape',
        'icon_match':  ':CAPE_ML:',
        'components':  ['values'],
    },
    'hgt_500': {
        'gfs_match':   ':HGT:500 mb:',
        'ecmwf_param': 'gh',
        'icon_match':  ':FI:50000:',
        'components':  ['values'],
    },
}

# Forecast hours to process (every 6h out to 168h, plus key early hours)
FORECAST_HOURS = [0, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168]

# Output grid: 1° global (downsampled for size)
OUT_NLAT = 181   # 90N to 90S
OUT_NLON = 360   # 0E to 359E
OUT_DLAT = -1.0
OUT_DLON = 1.0
OUT_LAT0 = 90.0
OUT_LON0 = 0.0


def download(url, dest, timeout=120):
    """Download a file with progress."""
    print(f"  ↓ {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ChaserNet/1.0'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            with open(dest, 'wb') as f:
                f.write(data)
            size_mb = len(data) / 1024 / 1024
            print(f"    ✓ {size_mb:.1f} MB")
            return True
    except Exception as e:
        print(f"    ✗ Failed: {e}")
        return False


def wgrib2_extract(grib_path, match_pattern, out_csv):
    """Use wgrib2 to extract matching fields to CSV (lon, lat, value)."""
    cmd = f"wgrib2 {grib_path} -match '{match_pattern}' -csv {out_csv}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    wgrib2 error: {result.stderr[:200]}")
        return False
    return True


def wgrib2_to_grid(grib_path, match_pattern):
    """Extract a field from GRIB2 and regrid to 1° global grid."""
    with tempfile.NamedTemporaryFile(suffix='.bin', delete=False) as tmp:
        tmp_bin = tmp.name

    try:
        # Use wgrib2 to regrid to 1x1 degree and output as binary
        cmd = (
            f"wgrib2 {grib_path} -match '{match_pattern}' "
            f"-new_grid_winds earth "
            f"-new_grid latlon 0:360:1 90:181:-1 {tmp_bin}"
        )
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"    wgrib2 regrid error: {result.stderr[:300]}")
            return None

        # Read binary float32 data
        with open(tmp_bin, 'rb') as f:
            raw = f.read()

        if len(raw) == 0:
            return None

        # Each grid is nlat * nlon float32 values
        expected = OUT_NLAT * OUT_NLON * 4
        if len(raw) < expected:
            print(f"    Short read: {len(raw)} bytes, expected {expected}")
            return None

        values = list(struct.unpack(f'{OUT_NLAT * OUT_NLON}f', raw[:expected]))

        # Replace extreme values (wgrib2 uses 9.999e20 for missing)
        values = [round(v, 2) if abs(v) < 1e10 else None for v in values]
        return values

    finally:
        if os.path.exists(tmp_bin):
            os.unlink(tmp_bin)


def process_gfs(date, cycle, output_dir):
    """Download and process GFS GRIB2 files."""
    print(f"\n{'='*50}")
    print(f"GFS {date} {cycle}z")
    print(f"{'='*50}")

    base_url = f"https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/gfs.{date}/{cycle}/atmos"
    model_dir = output_dir / 'gfs' / date / f'{cycle}z'
    model_dir.mkdir(parents=True, exist_ok=True)

    for fhour in FORECAST_HOURS:
        fh_str = f"{fhour:03d}"
        # GFS 0.25° files — we'll download the smaller 1° index files
        # Actually use pgrb2.1p00 for faster downloads
        url = f"{base_url}/gfs.t{cycle}z.pgrb2.1p00.f{fh_str}"

        with tempfile.NamedTemporaryFile(suffix='.grib2', delete=False) as tmp:
            grib_path = tmp.name

        try:
            if not download(url, grib_path):
                continue

            for var_name, var_conf in VARIABLES.items():
                pattern = var_conf['gfs_match']
                components = var_conf['components']

                if components == ['u', 'v']:
                    # Vector field — extract both components
                    u_pattern = pattern.split('|')[0]
                    v_pattern = pattern.split('|')[1]

                    u_data = wgrib2_to_grid(grib_path, u_pattern)
                    v_data = wgrib2_to_grid(grib_path, v_pattern)

                    if u_data and v_data:
                        tile = make_tile('gfs', date, cycle, fhour, var_name, {'u': u_data, 'v': v_data})
                        save_tile(tile, model_dir / f'{var_name}_f{fh_str}.json')
                else:
                    # Scalar field
                    data = wgrib2_to_grid(grib_path, pattern)
                    if data:
                        tile = make_tile('gfs', date, cycle, fhour, var_name, {'values': data})
                        save_tile(tile, model_dir / f'{var_name}_f{fh_str}.json')

        finally:
            if os.path.exists(grib_path):
                os.unlink(grib_path)


def process_ecmwf(date, cycle, output_dir):
    """Download and process ECMWF Open Data GRIB2 files."""
    print(f"\n{'='*50}")
    print(f"ECMWF IFS {date} {cycle}z")
    print(f"{'='*50}")

    # ECMWF open data URL format
    ec_date = f"{date[:4]}-{date[4:6]}-{date[6:8]}"
    base_url = f"https://data.ecmwf.int/forecasts/{ec_date}/{cycle}z/ifs/0p25/oper"

    model_dir = output_dir / 'ecmwf' / date / f'{cycle}z'
    model_dir.mkdir(parents=True, exist_ok=True)

    # ECMWF packages data differently — single-level and pressure-level files
    # Download specific step files
    for fhour in FORECAST_HOURS:
        # Single level fields (wind 10m, temp 2m, mslp, precip, cape)
        url = f"{base_url}/{ec_date}_{cycle}0000-{fhour}h-oper-fc.grib2"

        with tempfile.NamedTemporaryFile(suffix='.grib2', delete=False) as tmp:
            grib_path = tmp.name

        try:
            if not download(url, grib_path):
                continue

            # ECMWF uses different field names — extract via wgrib2 short names
            ecmwf_patterns = {
                'wind_10m':  ':10U:|:10V:',
                'temp_2m':   ':2T:',
                'mslp':      ':MSL:',
                'precip':    ':TP:',
                'cape':      ':CAPE:',
                'hgt_500':   ':GH:.*:500 mb:',
            }

            for var_name, pattern in ecmwf_patterns.items():
                components = VARIABLES[var_name]['components']
                fh_str = f"{fhour:03d}"

                if components == ['u', 'v']:
                    u_data = wgrib2_to_grid(grib_path, pattern.split('|')[0])
                    v_data = wgrib2_to_grid(grib_path, pattern.split('|')[1])
                    if u_data and v_data:
                        tile = make_tile('ecmwf', date, cycle, fhour, var_name, {'u': u_data, 'v': v_data})
                        save_tile(tile, model_dir / f'{var_name}_f{fh_str}.json')
                else:
                    data = wgrib2_to_grid(grib_path, pattern)
                    if data:
                        tile = make_tile('ecmwf', date, cycle, fhour, var_name, {'values': data})
                        save_tile(tile, model_dir / f'{var_name}_f{fh_str}.json')

        finally:
            if os.path.exists(grib_path):
                os.unlink(grib_path)


def process_icon(date, cycle, output_dir):
    """Download and process DWD ICON global GRIB2 files."""
    print(f"\n{'='*50}")
    print(f"ICON Global {date} {cycle}z")
    print(f"{'='*50}")

    model_dir = output_dir / 'icon' / date / f'{cycle}z'
    model_dir.mkdir(parents=True, exist_ok=True)

    # ICON has separate files per variable per timestep
    icon_vars = {
        'temp_2m':  ('t_2m', 'single-level'),
        'mslp':     ('pmsl', 'single-level'),
        'wind_10m': ('u_10m', 'single-level'),  # also need v_10m
        'precip':   ('tot_prec', 'single-level'),
    }

    for fhour in FORECAST_HOURS:
        fh_str = f"{fhour:03d}"

        for var_name, (icon_param, level_type) in icon_vars.items():
            url = (
                f"https://opendata.dwd.de/weather/nwp/icon/grib/{cycle}/"
                f"{icon_param}/icon_global_icosahedral_{level_type}_{date}{cycle}_{fh_str}_{icon_param.upper()}.grib2.bz2"
            )

            with tempfile.NamedTemporaryFile(suffix='.grib2.bz2', delete=False) as tmp:
                bz2_path = tmp.name

            grib_path = bz2_path.replace('.bz2', '')

            try:
                if not download(url, bz2_path):
                    continue

                # Decompress bz2
                subprocess.run(f"bunzip2 -f {bz2_path}", shell=True, capture_output=True)

                if not os.path.exists(grib_path):
                    continue

                # ICON uses icosahedral grid — wgrib2 can regrid it
                data = wgrib2_to_grid(grib_path, '.*')
                if data:
                    tile = make_tile('icon', date, cycle, fhour, var_name, {'values': data})
                    save_tile(tile, model_dir / f'{var_name}_f{fh_str}.json')

            finally:
                for p in [bz2_path, grib_path]:
                    if os.path.exists(p):
                        os.unlink(p)


def make_tile(model, date, cycle, fhour, variable, data):
    """Create a tile JSON object."""
    return {
        'model':    model,
        'run':      date,
        'cycle':    cycle,
        'fhour':    fhour,
        'variable': variable,
        'grid': {
            'lat0': OUT_LAT0,
            'lon0': OUT_LON0,
            'dlat': OUT_DLAT,
            'dlon': OUT_DLON,
            'nlat': OUT_NLAT,
            'nlon': OUT_NLON,
        },
        'data': data,
    }


def save_tile(tile, path):
    """Save tile as gzipped JSON."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    json_str = json.dumps(tile, separators=(',', ':'))
    compressed = gzip.compress(json_str.encode(), compresslevel=6)

    with open(path, 'wb') as f:
        f.write(compressed)

    size_kb = len(compressed) / 1024
    print(f"  → {path.name}  ({size_kb:.0f} KB)")


def main():
    parser = argparse.ArgumentParser(description='ChaserNet GRIB2 Processor')
    parser.add_argument('--model',  required=True, choices=['gfs', 'ecmwf', 'icon', 'all'])
    parser.add_argument('--date',   required=True, help='YYYYMMDD')
    parser.add_argument('--cycle',  required=True, help='00, 06, 12, or 18')
    parser.add_argument('--output', required=True, help='Output directory')
    args = parser.parse_args()

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    models = ['gfs', 'ecmwf', 'icon'] if args.model == 'all' else [args.model]

    for model in models:
        try:
            if model == 'gfs':
                process_gfs(args.date, args.cycle, output)
            elif model == 'ecmwf':
                process_ecmwf(args.date, args.cycle, output)
            elif model == 'icon':
                process_icon(args.date, args.cycle, output)
        except Exception as e:
            print(f"\n✗ {model} failed: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n✓ Pipeline complete. Output: {output}")


if __name__ == '__main__':
    main()
