ALTER TABLE users ADD COLUMN region_tags TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN interest_tags TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN experience_level TEXT DEFAULT 'enthusiast';
ALTER TABLE users ADD COLUMN onboarding_complete INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN post_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN forecast_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN accuracy INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS channels (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  emoji         TEXT,
  description   TEXT,
  visibility    TEXT NOT NULL DEFAULT 'public',
  required_tag  TEXT,
  required_role TEXT,
  lock_level    TEXT NOT NULL DEFAULT 'soft',
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS forum_threads (
  id          TEXT PRIMARY KEY,
  channel_id  TEXT NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  tag         TEXT,
  pinned      INTEGER DEFAULT 0,
  locked      INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  view_count  INTEGER DEFAULT 0,
  last_reply  INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_threads_channel ON forum_threads(channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS thread_replies (
  id          TEXT PRIMARY KEY,
  thread_id   TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  likes       INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_thread_replies ON thread_replies(thread_id, created_at ASC);

INSERT OR IGNORE INTO channels (id, name, category, emoji, description, visibility, required_tag, lock_level, created_at) VALUES
  ('general',       'general',        'PUBLIC',  '💬', 'Main community chat',          'public',     null,                 'soft', unixepoch()*1000),
  ('alerts',        'alerts',         'PUBLIC',  '🚨', 'Live NWS/NHC alerts',          'public',     null,                 'soft', unixepoch()*1000),
  ('tropical',      'tropical',       'TOPICS',  '🌀', 'Tropical cyclone analysis',    'tag-gated',  'tropical',           'soft', unixepoch()*1000),
  ('severe',        'severe-wx',      'TOPICS',  '⛈', 'Severe weather and tornadoes', 'tag-gated',  'severe',             'soft', unixepoch()*1000),
  ('winter',        'winter-weather', 'TOPICS',  '❄', 'Snow ice and winter storms',   'tag-gated',  'winter',             'soft', unixepoch()*1000),
  ('models',        'model-analysis', 'TOPICS',  '📊', 'Model runs and analysis',      'tag-gated',  'models',             'soft', unixepoch()*1000),
  ('ai-ml',         'ai-ml-models',   'TOPICS',  '🤖', 'AI/ML weather models',         'tag-gated',  'ai-ml',              'soft', unixepoch()*1000),
  ('chasing',       'storm-chasing',  'TOPICS',  '📸', 'Field reports and chasing',    'tag-gated',  'chasing',            'soft', unixepoch()*1000),
  ('gulf-coast',    'gulf-coast',     'REGIONS', '🌊', 'Gulf Coast tracking',          'tag-gated',  'gulf-coast',         'soft', unixepoch()*1000),
  ('tornado-alley', 'tornado-alley',  'REGIONS', '🌪', 'Plains severe weather',        'tag-gated',  'tornado-alley',      'soft', unixepoch()*1000),
  ('northeast-usa', 'northeast-usa',  'REGIONS', '🌲', 'Northeast weather',            'tag-gated',  'northeast-usa',      'soft', unixepoch()*1000),
  ('caribbean',     'caribbean-atl',  'REGIONS', '🌴', 'Atlantic tropical basin',      'tag-gated',  'caribbean-atlantic', 'soft', unixepoch()*1000),
  ('vip-lounge',    'vip-lounge',     'VIP',     '⭐', 'VIP members only',             'role-locked',null,                 'hard', unixepoch()*1000);
