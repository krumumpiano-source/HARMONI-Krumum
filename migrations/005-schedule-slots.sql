-- Migration 005: Add schedule_slots table (referenced by schedule API but never created)
-- Also add timetable_tasks for pre-created classroom tasks

CREATE TABLE IF NOT EXISTS schedule_slots (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 5),
  period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 10),
  notes TEXT,
  created_at TEXT,
  UNIQUE(teacher_id, semester_id, day_of_week, period)
);
CREATE INDEX IF NOT EXISTS idx_ss_teacher ON schedule_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ss_semester ON schedule_slots(semester_id);
