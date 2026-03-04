-- ChaserNet D1 Migration v6 — Discord integration columns
-- Run: npx wrangler d1 execute chasernet-db --file=./migrations/006_discord.sql --remote

-- Add Discord columns to users table
ALTER TABLE users ADD COLUMN discord_id TEXT;
ALTER TABLE users ADD COLUMN discord_username TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_users_discord ON users(discord_id);

-- Recreate discord_links with all needed columns
DROP TABLE IF EXISTS discord_links;
CREATE TABLE discord_links (
  discord_channel_id TEXT PRIMARY KEY,
  storm_room_id      TEXT NOT NULL,
  webhook_url        TEXT DEFAULT '',
  guild_id           TEXT DEFAULT '',
  channel_name       TEXT DEFAULT '',
  created_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_discord_room ON discord_links(storm_room_id);
