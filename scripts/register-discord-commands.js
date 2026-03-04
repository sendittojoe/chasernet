#!/usr/bin/env node
/**
 * Register ChaserNet slash commands with Discord.
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=xxx DISCORD_CLIENT_ID=yyy node scripts/register-discord-commands.js
 *
 * Or set them as env vars first.
 * Run this once after creating your bot, and again whenever you add/change commands.
 */

const TOKEN = process.env.DISCORD_BOT_TOKEN
const APP_ID = process.env.DISCORD_CLIENT_ID

if (!TOKEN || !APP_ID) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID env vars')
  process.exit(1)
}

const commands = [
  {
    name: 'storm',
    description: 'List active storms tracked by ChaserNet',
    type: 1,
  },
  {
    name: 'models',
    description: 'Show latest weather model run status (GFS, Euro, HRRR, ICON)',
    type: 1,
  },
  {
    name: 'link',
    description: 'Link this Discord channel to a ChaserNet storm room for two-way chat',
    type: 1,
    options: [
      {
        name: 'room',
        description: 'Storm room ID (from ChaserNet URL, e.g. "milton-2024")',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'unlink',
    description: 'Unlink this Discord channel from its ChaserNet storm room',
    type: 1,
  },
  {
    name: 'weather',
    description: 'Quick weather check for a location',
    type: 1,
    options: [
      {
        name: 'location',
        description: 'City or place name (e.g. "Miami, FL")',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'radar',
    description: 'Get a radar snapshot link for a location',
    type: 1,
    options: [
      {
        name: 'location',
        description: 'City or place name',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'alerts',
    description: 'Show active NWS weather alerts',
    type: 1,
    options: [
      {
        name: 'state',
        description: 'Two-letter state code (e.g. FL, TX)',
        type: 3,
        required: false,
      },
    ],
  },
]

async function register() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`

  console.log(`Registering ${commands.length} commands for app ${APP_ID}...`)

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`Failed (${res.status}):`, err)
    process.exit(1)
  }

  const data = await res.json()
  console.log(`✅ Registered ${data.length} commands:`)
  data.forEach(cmd => console.log(`   /${cmd.name} — ${cmd.description}`))
}

register().catch(console.error)
