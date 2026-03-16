-- Migration 006: Super Classroom — All-in-One Platform
-- Phase 9: Gamification
CREATE TABLE IF NOT EXISTS behavior_points (
  id TEXT PRIMARY KEY,
  teacher_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  classroom_id INTEGER NOT NULL,
  semester_id INTEGER,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_xp (
  id TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL,
  xp_amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_streaks (
  id TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TEXT,
  freeze_count INTEGER DEFAULT 2,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_badges (
  id TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL,
  badge_key TEXT NOT NULL,
  unlocked_at TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, badge_key)
);

-- Phase 3: Live Quiz
CREATE TABLE IF NOT EXISTS live_sessions (
  id TEXT PRIMARY KEY,
  teacher_id INTEGER NOT NULL,
  test_id INTEGER NOT NULL,
  session_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'waiting',
  current_question INTEGER DEFAULT 0,
  scoring_mode TEXT DEFAULT 'speed_accuracy',
  team_mode INTEGER DEFAULT 0,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS live_responses (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer TEXT,
  is_correct INTEGER,
  time_ms INTEGER,
  xp_earned INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS live_participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  nickname TEXT,
  total_score INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(session_id, student_id)
);

-- Phase 5: Interactive Video
CREATE TABLE IF NOT EXISTS video_questions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  question_text TEXT NOT NULL,
  choices TEXT,
  correct_answer TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS video_responses (
  id TEXT PRIMARY KEY,
  video_question_id TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  answer TEXT,
  is_correct INTEGER,
  answered_at TEXT DEFAULT (datetime('now'))
);

-- Phase 10: Student Portfolio
CREATE TABLE IF NOT EXISTS student_portfolio_items (
  id TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  subject_id INTEGER,
  file_urls TEXT,
  reflection TEXT,
  teacher_feedback TEXT,
  is_featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Phase 2: Board mode - add columns to post_comments
-- Using new table for board posts since ALTER TABLE ADD COLUMN can't have UNIQUE constraints in SQLite
CREATE TABLE IF NOT EXISTS board_posts (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  likes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS board_likes (
  id TEXT PRIMARY KEY,
  board_post_id TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(board_post_id, student_id)
);

-- Phase 2: Poll responses
CREATE TABLE IF NOT EXISTS poll_responses (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  option_index INTEGER NOT NULL,
  option_text TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(post_id, student_id)
);

-- Phase 9: Weekly league
CREATE TABLE IF NOT EXISTS weekly_leagues (
  id TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  league TEXT DEFAULT 'bronze',
  weekly_xp INTEGER DEFAULT 0,
  rank_position INTEGER,
  UNIQUE(student_id, week_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_behavior_points_student ON behavior_points(student_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_student_xp_student ON student_xp(student_id);
CREATE INDEX IF NOT EXISTS idx_live_responses_session ON live_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_live_participants_session ON live_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_board_posts_post ON board_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_post ON poll_responses(post_id);
CREATE INDEX IF NOT EXISTS idx_video_questions_post ON video_questions(post_id);
CREATE INDEX IF NOT EXISTS idx_student_portfolio_student ON student_portfolio_items(student_id);
CREATE INDEX IF NOT EXISTS idx_weekly_leagues_week ON weekly_leagues(week_start, league);
