#!/usr/bin/env node
/**
 * deploy.js — one-command deploy for all ChaserNet services.
 *
 * Usage: npm run deploy
 *   --api-only    Deploy only the API worker
 *   --web-only    Deploy only the frontend
 *   --preview     Deploy to preview environment
 */

import { execSync } from 'child_process'
import { resolve }  from 'path'

const ROOT = resolve(import.meta.dirname, '..')

const args    = process.argv.slice(2)
const apiOnly = args.includes('--api-only')
const webOnly = args.includes('--web-only')
const preview = args.includes('--preview')
const env     = preview ? '--env preview' : ''

function run(cmd, cwd = ROOT) {
  console.log(`\n▸ ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

console.log('\n⚡ ChaserNet Deploy\n' + '─'.repeat(40))

// ── Build frontend ────────────────────────────────────
if (!apiOnly) {
  console.log('\n📦 Building frontend…')
  run('npm run build', resolve(ROOT, 'apps/web'))
}

// ── Deploy Cloudflare Pages (frontend) ───────────────
if (!apiOnly) {
  console.log('\n🌐 Deploying to Cloudflare Pages…')
  run(
    `wrangler pages deploy apps/web/dist --project-name chasernet ${preview ? '--branch preview' : ''}`,
    ROOT
  )
}

// ── Deploy API Worker ─────────────────────────────────
if (!webOnly) {
  console.log('\n⚙️  Deploying API Worker…')
  run(`wrangler deploy ${env}`, resolve(ROOT, 'workers/api'))
}

// ── Deploy Cron Worker ────────────────────────────────
if (!webOnly) {
  console.log('\n⏱  Deploying Cron Worker…')
  run(`wrangler deploy ${env}`, resolve(ROOT, 'workers/cron'))
}

// ── Deploy Chat Worker ────────────────────────────────
if (!webOnly) {
  console.log('\n💬 Deploying Chat Worker…')
  run(`wrangler deploy ${env}`, resolve(ROOT, 'workers/chat'))
}

console.log('\n✅ Deploy complete!')
console.log('   Frontend: https://chasernet.com')
console.log('   API:      https://api.chasernet.com')
console.log('   Cron:     (scheduled, no URL)')
