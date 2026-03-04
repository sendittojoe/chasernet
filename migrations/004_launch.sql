-- ChaserNet D1 Migration v4 — Launch tables
-- Run: npx wrangler d1 execute chasernet-db --file=./migrations/004_launch.sql --remote

-- Discord channel ↔ storm room links
CREATE TABLE IF NOT EXISTS discord_links (
  discord_channel_id TEXT PRIMARY KEY,
  storm_room_id TEXT NOT NULL,
  webhook_url TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

-- Model alert subscriptions (users subscribe to model run notifications)
CREATE TABLE IF NOT EXISTS model_subscriptions (
  user_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, model_id)
);
CREATE INDEX IF NOT EXISTS idx_model_subs_model ON model_subscriptions(model_id, active);

-- Storms table (tracked storms — hurricanes, cyclones, etc.)
CREATE TABLE IF NOT EXISTS storms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  basin TEXT DEFAULT 'AL',
  category TEXT DEFAULT 'TD',
  status TEXT DEFAULT 'active',
  lat REAL,
  lon REAL,
  wind_kt INTEGER DEFAULT 0,
  pressure_mb INTEGER,
  nhc_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_storms_status ON storms(status);
CREATE INDEX IF NOT EXISTS idx_storms_basin ON storms(basin, status);

-- User sessions for presence tracking
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  last_active INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
