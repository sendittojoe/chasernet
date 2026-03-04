-- ChaserNet D1 Schema (comprehensive)
-- Run: wrangler d1 execute chasernet-db --file=./migrations/001_schema.sql --remote

-- ── Users ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT DEFAULT 'member',
  avatar_color  TEXT DEFAULT '#38BDF8',
  bio           TEXT,
  location      TEXT,
  forecast_score INTEGER DEFAULT 0,
  forecast_wins  INTEGER DEFAULT 0,
  last_active   INTEGER,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ── Direct Messages ──────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id         TEXT PRIMARY KEY,
  from_id    TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  content    TEXT NOT NULL,
  read       INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (from_id) REFERENCES users(id),
  FOREIGN KEY (to_id)   REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_dm_from    ON direct_messages(from_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dm_to      ON direct_messages(to_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dm_unread  ON direct_messages(to_id, read);

-- ── Notifications ────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read       INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at);

-- ── Forum Posts ──────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_posts (
  id         TEXT PRIMARY KEY,
  room_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  map_pin    TEXT,
  poll       TEXT,
  upvotes    INTEGER DEFAULT 0,
  replies    INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_forum_room ON forum_posts(room_id, created_at);

-- ── Forum Replies ────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_replies (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  body       TEXT NOT NULL,
  upvotes    INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES forum_posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_replies_post ON forum_replies(post_id, created_at);

-- ── Battle Entries ───────────────────────────────
CREATE TABLE IF NOT EXISTS battle_entries (
  id           TEXT PRIMARY KEY,
  storm_id     TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  lat_72h      REAL NOT NULL,
  lon_72h      REAL NOT NULL,
  wind_kt      INTEGER NOT NULL,
  notes        TEXT,
  score        INTEGER DEFAULT 0,
  track_error  REAL,
  verified     INTEGER DEFAULT 0,
  submitted_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_battle_storm ON battle_entries(storm_id);
CREATE INDEX IF NOT EXISTS idx_battle_user  ON battle_entries(user_id);
