-- ChaserNet D1 Migration v2 — Fix direct_messages schema
-- Table exists with wrong columns. Drop and recreate.

DROP TABLE IF EXISTS direct_messages;

CREATE TABLE direct_messages (
  id         TEXT PRIMARY KEY,
  from_id    TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  content    TEXT NOT NULL,
  read       INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_dm_from   ON direct_messages(from_id, created_at);
CREATE INDEX idx_dm_to     ON direct_messages(to_id, created_at);
CREATE INDEX idx_dm_unread ON direct_messages(to_id, read);

-- Ensure other tables exist
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read       INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS forum_posts (
  id TEXT PRIMARY KEY, room_id TEXT NOT NULL, user_id TEXT NOT NULL,
  title TEXT NOT NULL, body TEXT NOT NULL, map_pin TEXT, poll TEXT,
  upvotes INTEGER DEFAULT 0, replies INTEGER DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forum_room ON forum_posts(room_id, created_at);

CREATE TABLE IF NOT EXISTS forum_replies (
  id TEXT PRIMARY KEY, post_id TEXT NOT NULL, user_id TEXT NOT NULL,
  body TEXT NOT NULL, upvotes INTEGER DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_replies_post ON forum_replies(post_id, created_at);

CREATE TABLE IF NOT EXISTS battle_entries (
  id TEXT PRIMARY KEY, storm_id TEXT NOT NULL, user_id TEXT NOT NULL,
  lat_72h REAL NOT NULL, lon_72h REAL NOT NULL, wind_kt INTEGER NOT NULL,
  notes TEXT, score INTEGER DEFAULT 0, track_error REAL,
  verified INTEGER DEFAULT 0, submitted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_battle_storm ON battle_entries(storm_id);
CREATE INDEX IF NOT EXISTS idx_battle_user  ON battle_entries(user_id);
