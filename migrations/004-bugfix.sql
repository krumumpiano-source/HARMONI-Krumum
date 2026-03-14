-- Migration 004: Bug fixes — schema-vs-API mismatches
-- 1. home_visits: expand visit_type CHECK to include 'in_person','phone','online'
-- 2. notifications: make message nullable (TEXT instead of TEXT NOT NULL)
-- 3. evidence_pool: make source_id + semester_id nullable (for manual entries)

-- ===== 1. home_visits =====
CREATE TABLE IF NOT EXISTS home_visits_new (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  visit_type TEXT CHECK(visit_type IN ('routine','urgent','follow_up','in_person','phone','online')),
  lat REAL,
  lng REAL,
  address_visited TEXT,
  photo_urls TEXT,
  family_present TEXT,
  raw_notes TEXT,
  official_notes TEXT,
  follow_up_needed INTEGER DEFAULT 0,
  follow_up_notes TEXT,
  created_at TEXT
);
INSERT OR IGNORE INTO home_visits_new SELECT * FROM home_visits;
DROP TABLE IF EXISTS home_visits;
ALTER TABLE home_visits_new RENAME TO home_visits;
CREATE INDEX IF NOT EXISTS idx_hv_teacher ON home_visits(teacher_id);
CREATE INDEX IF NOT EXISTS idx_hv_student ON home_visits(student_id);

-- ===== 2. notifications =====
CREATE TABLE IF NOT EXISTS notifications_new (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  notification_type TEXT CHECK(notification_type IN ('early_warning','pa_deadline','award_deadline','system')),
  related_module TEXT,
  related_id TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT,
  expires_at TEXT
);
INSERT OR IGNORE INTO notifications_new SELECT * FROM notifications;
DROP TABLE IF EXISTS notifications;
ALTER TABLE notifications_new RENAME TO notifications;
CREATE INDEX IF NOT EXISTS idx_notif_teacher ON notifications(teacher_id);

-- ===== 3. evidence_pool =====
CREATE TABLE IF NOT EXISTS evidence_pool_new (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT,
  evidence_type TEXT NOT NULL CHECK(evidence_type IN ('teaching','support','other','research','innovation')),
  pa_category TEXT CHECK(pa_category IN ('teaching_hours','support_hours','other_hours','challenging_task')),
  title TEXT NOT NULL,
  description TEXT,
  source_module TEXT NOT NULL,
  source_id TEXT,
  file_urls TEXT,
  auto_collected INTEGER DEFAULT 1,
  created_at TEXT
);
INSERT OR IGNORE INTO evidence_pool_new SELECT * FROM evidence_pool;
DROP TABLE IF EXISTS evidence_pool;
ALTER TABLE evidence_pool_new RENAME TO evidence_pool;
CREATE INDEX IF NOT EXISTS idx_ep_teacher ON evidence_pool(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ep_semester ON evidence_pool(semester_id);
