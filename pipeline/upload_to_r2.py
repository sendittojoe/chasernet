#!/usr/bin/env python3
"""
Upload tile JSON files to Cloudflare R2 via S3-compatible API.

Required env vars:
  CF_ACCOUNT_ID          — Cloudflare account ID
  R2_ACCESS_KEY       — R2 S3 API access key ID
  R2_SECRET_KEY   — R2 S3 API secret access key
  R2_BUCKET              — (optional) bucket name, defaults to chasernet-assets
"""

import os
import sys
import json
import gzip
import boto3
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

BUCKET     = os.environ.get('R2_BUCKET', 'chasernet-assets')
ACCOUNT_ID = os.environ['CF_ACCOUNT_ID']
ACCESS_KEY = os.environ['R2_ACCESS_KEY']
SECRET_KEY = os.environ['R2_SECRET_KEY']
ENDPOINT   = f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com'


def get_s3():
    return boto3.client(
        's3',
        endpoint_url=ENDPOINT,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name='auto',
    )


def upload_file(s3, local_path, r2_key):
    """Upload a single JSON file to R2 (gzip compressed)."""
    with open(local_path, 'rb') as f:
        raw = f.read()

    # Gzip compress for smaller storage + faster CDN delivery
    compressed = gzip.compress(raw, compresslevel=6)
    savings = (1 - len(compressed) / len(raw)) * 100 if raw else 0

    s3.put_object(
        Bucket=BUCKET,
        Key=r2_key,
        Body=compressed,
        ContentType='application/json',
        ContentEncoding='gzip',
        CacheControl='public, max-age=3600, stale-while-revalidate=7200',
    )
    return r2_key, len(raw), len(compressed), savings


def main():
    if len(sys.argv) < 2:
        print('Usage: upload_to_r2.py <tiles-output-dir>')
        sys.exit(1)

    output_dir = Path(sys.argv[1])
    if not output_dir.exists():
        print(f'Error: {output_dir} does not exist')
        sys.exit(1)

    files = list(output_dir.rglob('*.json'))
    if not files:
        print('No JSON files found to upload')
        sys.exit(0)

    print(f'📦 Found {len(files)} files to upload to R2 ({BUCKET})')
    s3 = get_s3()

    uploaded = 0
    failed = 0
    total_raw = 0
    total_compressed = 0

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {}
        for f in files:
            rel = f.relative_to(output_dir)
            r2_key = f'tiles/{rel}'
            futures[pool.submit(upload_file, s3, f, r2_key)] = str(rel)

        for future in as_completed(futures):
            name = futures[future]
            try:
                key, raw_sz, comp_sz, savings = future.result()
                uploaded += 1
                total_raw += raw_sz
                total_compressed += comp_sz
                if uploaded % 20 == 0 or uploaded == len(files):
                    print(f'  ↑ {uploaded}/{len(files)} — {name} ({savings:.0f}% smaller)')
            except Exception as e:
                failed += 1
                print(f'  ✗ {name}: {e}')

    print(f'\n✓ Upload complete: {uploaded} uploaded, {failed} failed')
    print(f'  Raw: {total_raw/1024/1024:.1f}MB → Compressed: {total_compressed/1024/1024:.1f}MB')
    print(f'  Savings: {(1-total_compressed/max(total_raw,1))*100:.0f}%')

    if failed > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
