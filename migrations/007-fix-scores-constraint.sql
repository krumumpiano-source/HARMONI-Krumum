-- Migration 007: Fix scores table - remove CHECK constraint on score_type
-- D1/SQLite doesn't easily ALTER CHECK constraints, so we recreate the table

CREATE TABLE IF NOT EXISTS scores_new (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  score_type TEXT NOT NULL,
  score REAL NOT NULL,
  max_score REAL NOT NULL,
  description TEXT,
  scored_at TEXT,
  created_at TEXT
);

INSERT OR IGNORE INTO scores_new SELECT * FROM scores;
DROP TABLE IF EXISTS scores;
ALTER TABLE scores_new RENAME TO scores;
