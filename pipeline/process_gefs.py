#!/usr/bin/env python3
"""
GEFS Ensemble Processor — downloads all 30 GEFS members from NOAA NOMADS
and outputs JSON tiles with per-member data for spaghetti plot rendering.

Output format per tile:
{
  "grid": { "nlat": 181, "nlon": 360, "lat0": 90, "lon0": 0, "dlat": -1, "dlon": 1 },
  "members": [
    { "id": "gep01", "values": [...] },
    { "id": "gep02", "values": [...] },
    ...
  ],
  "mean": [...],
  "spread": [...]
}

Usage:
  python process_gefs.py --date 20260303 --cycle 00 --variable HGT:500 --output ./tiles-output
"""

import argparse
import json
import math
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

NOMADS = 'https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod'
MEMBERS = [f'gep{str(i).zfill(2)}' for i in range(1, 31)]  # gep01..gep30

# Variables we extract
VAR_MAP = {
    'HGT:500': {'wgrib_match': ':HGT:500 mb:', 'out_name': 'hgt_500', 'unit': 'm'},
    'PRMSL': {'wgrib_match': ':PRMSL:mean sea level:', 'out_name': 'mslp', 'unit': 'Pa'},
    'TMP:2m': {'wgrib_match': ':TMP:2 m above ground:', 'out_name': 'temp_2m', 'unit': 'K'},
    'UGRD:10m': {'wgrib_match': ':UGRD:10 m above ground:', 'out_name': 'u10', 'unit': 'm/s'},
    'VGRD:10m': {'wgrib_match': ':VGRD:10 m above ground:', 'out_name': 'v10', 'unit': 'm/s'},
}

FHOURS = [0, 6, 12, 24, 48, 72, 96, 120, 144, 168, 192, 240]


def download_member(date, cycle, member, fhour, tmpdir):
    """Download a single GEFS member GRIB2 file."""
    fh = str(fhour).zfill(3)
    url = f'{NOMADS}/gefs.{date}/{cycle}/atmos/pgrb2ap5/{member}.t{cycle}z.pgrb2a.0p50.f{fh}'
    out = os.path.join(tmpdir, f'{member}_f{fh}.grib2')

    if os.path.exists(out):
        return out

    print(f'  ↓ {member} f{fh}', end='', flush=True)
    try:
        urllib.request.urlretrieve(url, out)
        sz = os.path.getsize(out) / 1024 / 1024
        print(f' ({sz:.1f}MB)')
        return out
    except Exception as e:
        print(f' ✗ {e}')
        return None


def extract_field(grib_path, wgrib_match):
    """Extract a single field from GRIB2 and return as flat list of values."""
    try:
        # Use wgrib2 to extract the field as CSV-ish text
        result = subprocess.run(
            ['wgrib2', grib_path, '-match', wgrib_match, '-text', '-'],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return None

        lines = result.stdout.strip().split('\n')
        # First line is header (nlon nlat), rest are values
        if len(lines) < 2:
            return None

        header = lines[0].split()
        nlon, nlat = int(header[0]), int(header[1])
        values = [float(v) for v in lines[1:] if v.strip()]

        if len(values) != nlon * nlat:
            print(f'    ⚠ Expected {nlon*nlat} values, got {len(values)}')
            return None

        return {'nlat': nlat, 'nlon': nlon, 'values': values}
    except Exception as e:
        print(f'    ⚠ wgrib2 error: {e}')
        return None


def compute_stats(member_values):
    """Compute ensemble mean and spread (standard deviation)."""
    n = len(member_values)
    if n == 0:
        return [], []

    length = len(member_values[0])
    mean = [0.0] * length
    spread = [0.0] * length

    for vals in member_values:
        for i in range(length):
            mean[i] += vals[i]

    for i in range(length):
        mean[i] /= n

    for vals in member_values:
        for i in range(length):
            spread[i] += (vals[i] - mean[i]) ** 2

    for i in range(length):
        spread[i] = math.sqrt(spread[i] / n)

    # Round for size
    mean = [round(v, 2) for v in mean]
    spread = [round(v, 2) for v in spread]

    return mean, spread


def process_variable(date, cycle, variable, fhour, tmpdir, output_dir):
    """Process all members for a given variable and forecast hour."""
    var_info = VAR_MAP[variable]
    fh_str = str(fhour).zfill(3)

    member_data = []
    member_values = []

    for member in MEMBERS:
        grib_path = download_member(date, cycle, member, fhour, tmpdir)
        if not grib_path:
            continue

        field = extract_field(grib_path, var_info['wgrib_match'])
        if not field:
            continue

        # Round values for smaller JSON
        rounded = [round(v, 2) for v in field['values']]
        member_data.append({'id': member, 'values': rounded})
        member_values.append(field['values'])

    if not member_data:
        print(f'  ⚠ No members succeeded for {variable} f{fh_str}')
        return

    # Compute ensemble stats
    mean, spread = compute_stats(member_values)

    # Use grid from first successful member
    nlat = 361  # 0.5° grid: 90 to -90
    nlon = 720  # 0.5° grid: 0 to 359.5

    tile = {
        'grid': {
            'nlat': nlat, 'nlon': nlon,
            'lat0': 90, 'lon0': 0,
            'dlat': -0.5, 'dlon': 0.5,
        },
        'members': member_data,
        'mean': mean,
        'spread': spread,
        'meta': {
            'model': 'gefs',
            'variable': var_info['out_name'],
            'fhour': fhour,
            'date': date,
            'cycle': f'{cycle}z',
            'n_members': len(member_data),
        }
    }

    out_path = os.path.join(output_dir, 'gefs', date, f'{cycle}z')
    os.makedirs(out_path, exist_ok=True)
    out_file = os.path.join(out_path, f'{var_info["out_name"]}_ens_f{fh_str}.json')

    with open(out_file, 'w') as f:
        json.dump(tile, f, separators=(',', ':'))

    sz = os.path.getsize(out_file) / 1024 / 1024
    print(f'  ✓ {var_info["out_name"]}_ens_f{fh_str}.json — {len(member_data)} members, {sz:.1f}MB')


def main():
    parser = argparse.ArgumentParser(description='GEFS Ensemble Processor')
    parser.add_argument('--date', required=True, help='Date YYYYMMDD')
    parser.add_argument('--cycle', required=True, help='Cycle: 00, 06, 12, 18')
    parser.add_argument('--variable', default='HGT:500', help='Variable to extract')
    parser.add_argument('--output', default='./tiles-output', help='Output directory')
    parser.add_argument('--fhours', default=None, help='Comma-separated forecast hours')
    args = parser.parse_args()

    fhours = [int(x) for x in args.fhours.split(',')] if args.fhours else FHOURS

    with tempfile.TemporaryDirectory() as tmpdir:
        print(f'🌊 GEFS Ensemble — {args.date} {args.cycle}z')
        print(f'   Variable: {args.variable}')
        print(f'   Hours: {fhours}')
        print(f'   Members: {len(MEMBERS)}')
        print()

        for fh in fhours:
            print(f'── f{str(fh).zfill(3)} ──')
            process_variable(args.date, args.cycle, args.variable, fh, tmpdir, args.output)
            print()


if __name__ == '__main__':
    main()
