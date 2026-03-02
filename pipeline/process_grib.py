#!/usr/bin/env python3
"""
ChaserNet GRIB2 → JSON Grid Processor (v2 — CSV extraction)

Downloads GRIB2 files from NOAA NOMADS / ECMWF Open Data,
extracts key variables via wgrib2 CSV output, grids to 1° JSON.
"""

import argparse
import gzip
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from collections import defaultdict
from pathlib import Path

# ── Variables to extract ───────────────────────────────

VARIABLES = {
    'wind_u': {
        'gfs_match': 'UGRD:10 m above ground',
        'component': 'u',
        'group': 'wind_10m',
    },
    'wind_v': {
        'gfs_match': 'VGRD:10 m above ground',
        'component': 'v',
        'group': 'wind_10m',
    },
    'temp_2m': {
        'gfs_match': 'TMP:2 m above ground',
        'component': 'values',
        'group': 'temp_2m',
    },
    'mslp': {
        'gfs_match': 'PRMSL:mean sea level',
        'component': 'values',
        'group': 'mslp',
    },
    'precip': {
        'gfs_match': 'APCP:surface',
        'component': 'values',
        'group': 'precip',
    },
    'cape': {
        'gfs_match': 'CAPE:surface',
        'component': 'values',
        'group': 'cape',
    },
    'hgt_500': {
        'gfs_match': 'HGT:500 mb',
        'component': 'values',
        'group': 'hgt_500',
    },
}

# Forecast hours to process
FORECAST_HOURS = [0, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168]

# Output grid: 1° global
OUT_NLAT = 181   # 90N to 90S
OUT_NLON = 360   # 0E to 359E


def download(url, dest, timeout=180):
    """Download a file with retry."""
    print(f"  ↓ {url.split('/')[-1]}", end='', flush=True)
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'ChaserNet/1.0'})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
                with open(dest, 'wb') as f:
                    f.write(data)
                size_mb = len(data) / 1024 / 1024
                print(f" ✓ {size_mb:.1f}MB")
                return True
        except Exception as e:
            if attempt < 2:
                print(f" retry({attempt+1})", end='', flush=True)
            else:
                print(f" ✗ {e}")
                return False
    return False


def wgrib2_csv_extract(grib_path, match_str):
    """
    Use wgrib2 to extract a single variable as CSV.
    Returns dict mapping (lat, lon) → value.
    """
    with tempfile.NamedTemporaryFile(suffix='.csv', delete=False, mode='w') as tmp:
        csv_path = tmp.name

    try:
        cmd = f'wgrib2 {grib_path} -match "{match_str}" -csv {csv_path}'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)

        if result.stderr:
            # Print first line of stderr for debugging
            err_lines = result.stderr.strip().split('\n')
            for el in err_lines[:3]:
                print(f"    [wgrib2] {el}")

        if not os.path.exists(csv_path) or os.path.getsize(csv_path) == 0:
            print(f"    ✗ no data for: {match_str}")
            return None

        csv_size = os.path.getsize(csv_path)
        print(f"    CSV for {match_str}: {csv_size} bytes")

        # Parse CSV: format is "date","variable","level","lon","lat","value"
        grid = {}
        count = 0
        with open(csv_path, 'r') as f:
            for line in f:
                parts = line.strip().split(',')
                if len(parts) < 6:
                    continue
                try:
                    lon = float(parts[3].strip('"'))
                    lat = float(parts[4].strip('"'))
                    val = float(parts[5].strip('"'))

                    # Snap to 1° grid
                    ilat = round(lat)
                    ilon = round(lon) % 360

                    grid[(ilat, ilon)] = val
                    count += 1
                except (ValueError, IndexError):
                    continue

        if count == 0:
            return None

        print(f"    {match_str}: {count} points → {len(grid)} grid cells")
        return grid

    finally:
        if os.path.exists(csv_path):
            os.unlink(csv_path)


def grid_to_array(grid_dict):
    """Convert {(lat, lon): value} dict to row-major array (north to south)."""
    arr = []
    for ilat in range(90, -91, -1):  # 90N to 90S
        for ilon in range(0, 360):    # 0E to 359E
            val = grid_dict.get((ilat, ilon))
            if val is not None:
                arr.append(round(val, 2))
            else:
                arr.append(None)
    return arr


def make_tile(model, date, cycle, fhour, variable, data):
    """Create a tile JSON object."""
    return {
        'model': model,
        'run': date,
        'cycle': cycle,
        'fhour': fhour,
        'variable': variable,
        'grid': {
            'lat0': 90.0, 'lon0': 0.0,
            'dlat': -1.0, 'dlon': 1.0,
            'nlat': OUT_NLAT, 'nlon': OUT_NLON,
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
    print(f"  → {path.name} ({size_kb:.0f}KB)")
    return True


def process_gfs(date, cycle, output_dir):
    """Download and process GFS GRIB2 files."""
    print(f"\n{'='*50}")
    print(f"GFS {date} {cycle}z")
    print(f"{'='*50}")

    base_url = f"https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/gfs.{date}/{cycle}/atmos"
    model_dir = output_dir / 'gfs' / date / f'{cycle}z'
    model_dir.mkdir(parents=True, exist_ok=True)

    total_tiles = 0

    for fhour in FORECAST_HOURS:
        fh_str = f"{fhour:03d}"
        url = f"{base_url}/gfs.t{cycle}z.pgrb2.1p00.f{fh_str}"

        with tempfile.NamedTemporaryFile(suffix='.grib2', delete=False) as tmp:
            grib_path = tmp.name

        try:
            if not download(url, grib_path):
                continue

            # On first file, dump inventory to find exact field names
            if fhour == 0:
                inv = subprocess.run(f'wgrib2 {grib_path} | grep -iE "UGRD.*10 m|VGRD.*10 m|TMP.*2 m|PRMSL|CAPE.*surface|HGT.*500 mb|APCP" | head -20',
                    shell=True, capture_output=True, text=True)
                print(f"  Matching fields in file:")
                for line in inv.stdout.strip().split('\n'):
                    if line: print(f"    {line}")

            # Collect grids for each variable group
            groups = defaultdict(dict)

            for var_name, var_conf in VARIABLES.items():
                match_str = var_conf['gfs_match']
                component = var_conf['component']
                group = var_conf['group']

                grid_dict = wgrib2_csv_extract(grib_path, match_str)
                if grid_dict:
                    arr = grid_to_array(grid_dict)
                    groups[group][component] = arr

            # Save tiles for each complete group
            for group_name, data in groups.items():
                if group_name == 'wind_10m':
                    if 'u' in data and 'v' in data:
                        tile = make_tile('gfs', date, cycle, fhour, group_name, data)
                        if save_tile(tile, model_dir / f'{group_name}_f{fh_str}.json'):
                            total_tiles += 1
                else:
                    if 'values' in data:
                        tile = make_tile('gfs', date, cycle, fhour, group_name, data)
                        if save_tile(tile, model_dir / f'{group_name}_f{fh_str}.json'):
                            total_tiles += 1

        finally:
            if os.path.exists(grib_path):
                os.unlink(grib_path)

    print(f"\nGFS complete: {total_tiles} tiles generated")
    return total_tiles


def process_ecmwf(date, cycle, output_dir):
    """Download and process ECMWF Open Data GRIB2 files."""
    print(f"\n{'='*50}")
    print(f"ECMWF IFS {date} {cycle}z")
    print(f"{'='*50}")

    ec_date = f"{date[:4]}-{date[4:6]}-{date[6:8]}"
    base_url = f"https://data.ecmwf.int/forecasts/{ec_date}/{cycle}z/ifs/0p25/oper"

    model_dir = output_dir / 'ecmwf' / date / f'{cycle}z'
    model_dir.mkdir(parents=True, exist_ok=True)

    total_tiles = 0

    # ECMWF variable matching (different short names)
    ecmwf_vars = {
        'wind_u':  {'match': '10U:10 m above ground', 'component': 'u',      'group': 'wind_10m'},
        'wind_v':  {'match': '10V:10 m above ground', 'component': 'v',      'group': 'wind_10m'},
        'temp_2m': {'match': '2T:2 m above ground',   'component': 'values', 'group': 'temp_2m'},
        'mslp':    {'match': 'MSL:mean sea level',     'component': 'values', 'group': 'mslp'},
        'precip':  {'match': 'TP:surface',             'component': 'values', 'group': 'precip'},
        'cape':    {'match': 'CAPE:surface',           'component': 'values', 'group': 'cape'},
    }

    for fhour in FORECAST_HOURS:
        fh_str = f"{fhour:03d}"
        url = f"{base_url}/{ec_date}_{cycle}0000-{fhour}h-oper-fc.grib2"

        with tempfile.NamedTemporaryFile(suffix='.grib2', delete=False) as tmp:
            grib_path = tmp.name

        try:
            if not download(url, grib_path):
                continue

            groups = defaultdict(dict)

            for var_name, var_conf in ecmwf_vars.items():
                grid_dict = wgrib2_csv_extract(grib_path, var_conf['match'])
                if grid_dict:
                    arr = grid_to_array(grid_dict)
                    groups[var_conf['group']][var_conf['component']] = arr

            for group_name, data in groups.items():
                if group_name == 'wind_10m':
                    if 'u' in data and 'v' in data:
                        tile = make_tile('ecmwf', date, cycle, fhour, group_name, data)
                        if save_tile(tile, model_dir / f'{group_name}_f{fh_str}.json'):
                            total_tiles += 1
                else:
                    if 'values' in data:
                        tile = make_tile('ecmwf', date, cycle, fhour, group_name, data)
                        if save_tile(tile, model_dir / f'{group_name}_f{fh_str}.json'):
                            total_tiles += 1

        finally:
            if os.path.exists(grib_path):
                os.unlink(grib_path)

    print(f"\nECMWF complete: {total_tiles} tiles generated")
    return total_tiles


def main():
    parser = argparse.ArgumentParser(description='ChaserNet GRIB2 Processor')
    parser.add_argument('--model',  required=True, choices=['gfs', 'ecmwf', 'icon', 'all'])
    parser.add_argument('--date',   required=True, help='YYYYMMDD')
    parser.add_argument('--cycle',  required=True, help='00, 06, 12, or 18')
    parser.add_argument('--output', required=True, help='Output directory')
    args = parser.parse_args()

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    models = ['gfs', 'ecmwf'] if args.model == 'all' else [args.model]
    # Skip ICON for now — its icosahedral grid needs special handling

    total = 0
    for model in models:
        try:
            if model == 'gfs':
                total += process_gfs(args.date, args.cycle, output)
            elif model == 'ecmwf':
                if args.cycle in ('00', '12'):
                    total += process_ecmwf(args.date, args.cycle, output)
                else:
                    print(f"\nSkipping ECMWF — only runs at 00z/12z")
            elif model == 'icon':
                print(f"\nSkipping ICON — icosahedral grid not yet supported")
        except Exception as e:
            print(f"\n✗ {model} failed: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*50}")
    print(f"✓ Pipeline complete. {total} total tiles. Output: {output}")


if __name__ == '__main__':
    main()
