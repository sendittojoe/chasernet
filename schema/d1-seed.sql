-- ═══════════════════════════════════════════════════════
--  ChaserNet D1 Seed Data
--  Run via: npm run db:seed
--  Seeds: owner account + initial storm rooms
-- ═══════════════════════════════════════════════════════

-- ── Owner account ─────────────────────────────────────
-- Password: changeme123 (change immediately after first login)
-- Hash is PBKDF2-SHA256 of 'changeme123' with a fixed salt for seeding
INSERT OR IGNORE INTO users (id, username, email, password_hash, role, avatar_color, created_at)
VALUES (
  'owner-001',
  'chaser_admin',
  'admin@chasernet.com',
  'SEED_HASH_REPLACE_ON_FIRST_LOGIN',
  'owner',
  '#38BDF8',
  unixepoch() * 1000
);

-- ── Initial storm rooms ───────────────────────────────
INSERT OR IGNORE INTO storms (id, name, basin, category, wind_kt, pressure_mb, lat, lon, active, created_at, updated_at)
VALUES
  ('beatriz-2026',    'Hurricane Beatriz', 'epac', 'C3',    115, 950,  16.2, -104.8, 1, unixepoch()*1000, unixepoch()*1000),
  ('invest96w-2026',  'Invest 96W',        'wpac', 'Invest', 35, 1007, 14.8,  138.2, 1, unixepoch()*1000, unixepoch()*1000);

-- ── Initial model run status ──────────────────────────
INSERT OR IGNORE INTO model_runs (id, model, cycle, run_date, status, completed_at)
VALUES
  ('ecmwf-seed-12z', 'ecmwf', '12z', strftime('%Y%m%d','now'), 'ready', unixepoch()*1000),
  ('gfs-seed-12z',   'gfs',   '12z', strftime('%Y%m%d','now'), 'ready', unixepoch()*1000),
  ('hrrr-seed-18z',  'hrrr',  '18z', strftime('%Y%m%d','now'), 'ready', unixepoch()*1000),
  ('icon-seed-12z',  'icon',  '12z', strftime('%Y%m%d','now'), 'ready', unixepoch()*1000),
  ('gefs-seed-12z',  'gefs',  '12z', strftime('%Y%m%d','now'), 'running', NULL);
