-- ChaserNet D1 Migration v3 — Nuclear rebuild
-- Drop ALL tables and recreate with correct schemas

DROP INDEX IF EXISTS idx_dm_from;
DROP INDEX IF EXISTS idx_dm_to;
DROP INDEX IF EXISTS idx_dm_unread;
DROP INDEX IF EXISTS idx_notif_user;
DROP INDEX IF EXISTS idx_forum_room;
DROP INDEX IF EXISTS idx_replies_post;
DROP INDEX IF EXISTS idx_battle_storm;
DROP INDEX IF EXISTS idx_battle_user;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;

DROP TABLE IF EXISTS battle_entries;
DROP TABLE IF EXISTS forum_replies;
DROP TABLE IF EXISTS forum_posts;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS direct_messages;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, role TEXT DEFAULT 'member', avatar_color TEXT DEFAULT '#38BDF8',
  bio TEXT, location TEXT, forecast_score INTEGER DEFAULT 0, forecast_wins INTEGER DEFAULT 0,
  last_active INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

CREATE TABLE direct_messages (
  id TEXT PRIMARY KEY, from_id TEXT NOT NULL, to_id TEXT NOT NULL,
  content TEXT NOT NULL, read INTEGER DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX idx_dm_from ON direct_messages(from_id, created_at);
CREATE INDEX idx_dm_to ON direct_messages(to_id, created_at);
CREATE INDEX idx_dm_unread ON direct_messages(to_id, read);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL,
  title TEXT NOT NULL, body TEXT, link TEXT, read INTEGER DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX idx_notif_user ON notifications(user_id, created_at);

CREATE TABLE forum_posts (
  id TEXT PRIMARY KEY, room_id TEXT NOT NULL, user_id TEXT NOT NULL,
  title TEXT NOT NULL, body TEXT NOT NULL, map_pin TEXT, poll TEXT,
  upvotes INTEGER DEFAULT 0, replies INTEGER DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX idx_forum_room ON forum_posts(room_id, created_at);

CREATE TABLE forum_replies (
  id TEXT PRIMARY KEY, post_id TEXT NOT NULL, user_id TEXT NOT NULL,
  body TEXT NOT NULL, upvotes INTEGER DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX idx_replies_post ON forum_replies(post_id, created_at);

CREATE TABLE battle_entries (
  id TEXT PRIMARY KEY, storm_id TEXT NOT NULL, user_id TEXT NOT NULL,
  lat_72h REAL NOT NULL, lon_72h REAL NOT NULL, wind_kt INTEGER NOT NULL,
  notes TEXT, score INTEGER DEFAULT 0, track_error REAL,
  verified INTEGER DEFAULT 0, submitted_at INTEGER NOT NULL
);
CREATE INDEX idx_battle_storm ON battle_entries(storm_id);
CREATE INDEX idx_battle_user ON battle_entries(user_id);
