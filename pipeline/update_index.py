#!/usr/bin/env python3
"""
Generate tile index JSON for the API.

Lists all available model runs, variables, and forecast hours.
Uploaded to R2 at tiles/index.json. The API reads this to know
what tiles are available.
"""

import argparse
import json
import os
from datetime import datetime, timedelta
from pathlib import Path


def build_index(date, cycle, output_path):
    """Build an index of what tiles should be available for this run."""

    models = {
        'gfs': {
            'name': 'GFS',
            'source': 'NOAA NOMADS',
            'resolution': '1.0°',
            'cycles': ['00', '06', '12', '18'],
            'max_fhour': 168,
        },
        'ecmwf': {
            'name': 'ECMWF IFS',
            'source': 'ECMWF Open Data',
            'resolution': '0.25° → 1.0°',
            'cycles': ['00', '12'],
            'max_fhour': 168,
        },
        'icon': {
            'name': 'ICON Global',
            'source': 'DWD Open Data',
            'resolution': '13km → 1.0°',
            'cycles': ['00', '06', '12', '18'],
            'max_fhour': 168,
        },
    }

    variables = [
        'wind_10m', 'temp_2m', 'mslp', 'precip', 'cape', 'hgt_500'
    ]

    forecast_hours = [0, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168]

    # Build tile URL pattern
    # Tiles live at: tiles/{model}/{date}/{cycle}z/{variable}_f{fhour:03d}.json
    r2_base = 'https://assets.chasernet.com/tiles'

    index = {
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'latest_run': {
            'date': date,
            'cycle': cycle,
        },
        'tile_base': r2_base,
        'tile_pattern': '{model}/{date}/{cycle}z/{variable}_f{fhour}.json',
        'models': models,
        'variables': variables,
        'forecast_hours': forecast_hours,
        'grid': {
            'lat0': 90.0,
            'lon0': 0.0,
            'dlat': -1.0,
            'dlon': 1.0,
            'nlat': 181,
            'nlon': 360,
        },
    }

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(index, f, indent=2)

    print(f"✓ Index written to {output_path}")
    return index


def main():
    parser = argparse.ArgumentParser(description='Generate tile index')
    parser.add_argument('--date',   required=True, help='YYYYMMDD')
    parser.add_argument('--cycle',  required=True, help='00, 06, 12, or 18')
    parser.add_argument('--output', required=True, help='Output path for index.json')
    args = parser.parse_args()

    build_index(args.date, args.cycle, args.output)


if __name__ == '__main__':
    main()
