-- ═══════════════════════════════════════════════════════
--  ChaserNet D1 Schema
--  Run via: npm run db:init
--  Local:   npm run db:local
-- ═══════════════════════════════════════════════════════

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Users ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  username       TEXT UNIQUE NOT NULL,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'member',
  -- role hierarchy: owner | co-creator | admin | moderator | vip | verified | member | new
  avatar_color   TEXT NOT NULL DEFAULT '#38BDF8',
  bio            TEXT,
  location       TEXT,
  created_at     INTEGER NOT NULL,
  last_active    INTEGER,
  forecast_score INTEGER NOT NULL DEFAULT 0,
  forecast_wins  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);

-- ── Storms ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS storms (
  id             TEXT PRIMARY KEY,           -- e.g. beatriz-2026
  name           TEXT NOT NULL,
  basin          TEXT NOT NULL,              -- atlantic|epac|cpac|wpac|indian|shem
  category       TEXT,                       -- TD|TS|C1|C2|C3|C4|C5|TY|STY|Invest
  wind_kt        INTEGER,
  pressure_mb    INTEGER,
  lat            REAL,
  lon            REAL,
  movement_dir   TEXT,
  movement_kt    INTEGER,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_storms_active ON storms(active, updated_at DESC);

-- ── Model Runs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_runs (
  id             TEXT PRIMARY KEY,           -- e.g. gfs-20260301-12z
  model          TEXT NOT NULL,              -- gfs|ecmwf|hrrr|icon|aifs|...
  cycle          TEXT NOT NULL,              -- 00z|06z|12z|18z|{hour}z (HRRR)
  run_date       TEXT NOT NULL,              -- YYYYMMDD
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending|ingesting|ready|failed
  completed_at   INTEGER,
  data_url       TEXT                        -- R2 path to cached data
);

CREATE INDEX IF NOT EXISTS idx_runs_date_cycle ON model_runs(run_date DESC, cycle DESC);
CREATE INDEX IF NOT EXISTS idx_runs_model      ON model_runs(model, run_date DESC);

-- ── Room Messages ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_messages (
  id             TEXT PRIMARY KEY,
  room_id        TEXT NOT NULL,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  map_pin        TEXT,                       -- JSON: {model,modelB,layer,hour,spread,label}
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON room_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON room_messages(user_id);

-- ── Forum Posts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_posts (
  id             TEXT PRIMARY KEY,
  room_id        TEXT NOT NULL,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  map_pin        TEXT,                       -- JSON map state
  poll           TEXT,                       -- JSON: {q, opts:[str], pct:[int]}
  reply_count    INTEGER NOT NULL DEFAULT 0,
  view_count     INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_room ON forum_posts(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user ON forum_posts(user_id);

-- ── Forum Replies ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_replies (
  id             TEXT PRIMARY KEY,
  post_id        TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body           TEXT NOT NULL,
  map_pin        TEXT,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_replies_post ON forum_replies(post_id, created_at ASC);

-- ── Battle Entries ────────────────────────────────────
CREATE TABLE IF NOT EXISTS battle_entries (
  id             TEXT PRIMARY KEY,
  storm_id       TEXT NOT NULL REFERENCES storms(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat_72h        REAL NOT NULL,
  lon_72h        REAL NOT NULL,
  wind_kt        INTEGER NOT NULL,
  notes          TEXT,
  track_error    REAL,                       -- km, filled after verification
  intensity_error INTEGER,                   -- kt, filled after verification
  score          INTEGER,                    -- computed score
  verified       INTEGER NOT NULL DEFAULT 0,
  submitted_at   INTEGER NOT NULL,
  UNIQUE(storm_id, user_id)                  -- one entry per user per storm
);

CREATE INDEX IF NOT EXISTS idx_entries_storm ON battle_entries(storm_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_entries_user  ON battle_entries(user_id);

-- ── Direct Messages ───────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id             TEXT PRIMARY KEY,
  from_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  read           INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(from_id, to_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_to           ON direct_messages(to_id, read, created_at DESC);

-- ── Push Subscriptions ────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint       TEXT NOT NULL UNIQUE,
  p256dh         TEXT NOT NULL,
  auth           TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
