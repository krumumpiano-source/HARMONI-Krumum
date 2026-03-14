-- Migration 003: Fix schema mismatches
-- 1. Create teaching_logs table (used by post-lesson API, missing from original schema)
-- 2. Expand subjects.subject_type CHECK to include 'elective' and 'activity'

-- teaching_logs table for post-lesson recording
CREATE TABLE IF NOT EXISTS teaching_logs (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  classroom_id TEXT,
  subject_id TEXT,
  semester_id TEXT,
  date TEXT NOT NULL,
  period INTEGER,
  topic TEXT,
  activities TEXT,
  observations TEXT,
  issues TEXT,
  next_plan TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tl_teacher ON teaching_logs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tl_date ON teaching_logs(date);

-- Expand subjects.subject_type: recreate table with wider CHECK
-- Preserve existing data via temp table pattern
CREATE TABLE IF NOT EXISTS subjects_new (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  credits REAL,
  hours_per_week REAL,
  subject_type TEXT DEFAULT 'regular' CHECK(subject_type IN ('regular','homeroom','ethics','elective','activity')),
  grade_level INTEGER,
  description TEXT,
  created_at TEXT
);
INSERT OR IGNORE INTO subjects_new SELECT * FROM subjects;
DROP TABLE IF EXISTS subjects;
ALTER TABLE subjects_new RENAME TO subjects;
CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
