-- Migration 008: Attendance Sessions (Student Self Check-in with GPS)
-- Teacher opens a session → students check in via GPS from student app

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  date TEXT NOT NULL,
  period INTEGER,
  subject_id TEXT,
  semester_id TEXT,
  is_open INTEGER DEFAULT 1,
  opened_at TEXT DEFAULT (datetime('now')),
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_att_sessions_classroom ON attendance_sessions(classroom_id, date, is_open);
