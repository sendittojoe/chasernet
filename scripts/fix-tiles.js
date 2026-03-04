#!/usr/bin/env node
/**
 * Re-upload gzipped R2 tiles as plain JSON.
 * Usage: node scripts/fix-tiles.js
 */
import { execSync } from 'child_process'

const BUCKET = 'chasernet-assets'
const PREFIX = 'tiles/gfs/20260302/00z'

// List all tiles
console.log('Listing tiles...')
const list = execSync(`npx wrangler r2 object list ${BUCKET} --prefix="${PREFIX}/"`, { encoding: 'utf-8' })

// Parse the JSON output to get keys
let keys = []
try {
  const parsed = JSON.parse(list)
  keys = parsed.objects?.map(o => o.key) ?? []
} catch {
  // Try line-by-line parsing
  const lines = list.split('\n').filter(l => l.includes('.json'))
  keys = lines.map(l => {
    const match = l.match(/(tiles\/[^\s"]+\.json)/)
    return match ? match[1] : null
  }).filter(Boolean)
}

console.log(`Found ${keys.length} tiles`)

for (const key of keys) {
  const localFile = `/tmp/tile_${key.split('/').pop()}`
  const decompFile = localFile + '.dec'
  
  try {
    // Download from R2
    execSync(`npx wrangler r2 object get ${BUCKET}/${key} --file=${localFile}`, { stdio: 'pipe' })
    
    // Try to gunzip - if it fails, it's already plain
    try {
      execSync(`gunzip -c ${localFile} > ${decompFile} 2>/dev/null`)
      // Verify it's valid JSON
      execSync(`python3 -c "import json; json.load(open('${decompFile}'))"`, { stdio: 'pipe' })
      // Re-upload as plain JSON
      execSync(`npx wrangler r2 object put ${BUCKET}/${key} --file=${decompFile} --content-type="application/json"`, { stdio: 'pipe' })
      console.log(`✅ ${key} — decompressed & re-uploaded`)
    } catch {
      console.log(`⏭ ${key} — already plain JSON`)
    }
    
    // Cleanup
    execSync(`rm -f ${localFile} ${decompFile}`, { stdio: 'pipe' })
  } catch (e) {
    console.warn(`❌ ${key} — ${e.message}`)
  }
}

console.log('\nDone! Tiles are now plain JSON.')
