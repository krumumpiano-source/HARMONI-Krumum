-- HARMONI Schema Migration — 74 Tables
-- Generated from HARMONI-Technical.md Section 3.1

-- ==================== GROUP 1: AUTH & CONFIG (14) ====================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('teacher','student')),
  display_name TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prefix TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT,
  academic_standing TEXT,
  employee_id TEXT,
  phone TEXT,
  email TEXT,
  profile_photo_url TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(teacher_id, key)
);
CREATE TABLE IF NOT EXISTS semesters (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  semester INTEGER NOT NULL CHECK(semester IN (1,2)),
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  credits REAL,
  hours_per_week REAL,
  subject_type TEXT DEFAULT 'regular' CHECK(subject_type IN ('regular','homeroom','ethics')),
  grade_level INTEGER,
  description TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  room_number INTEGER NOT NULL,
  academic_year INTEGER,
  student_count INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS subject_classrooms (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(subject_id, classroom_id, semester_id)
);
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  activity_type TEXT CHECK(activity_type IN ('club','band','ensemble','sport','scout','other')),
  description TEXT,
  max_members INTEGER,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS activity_positions (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER
);
CREATE TABLE IF NOT EXISTS lesson_models (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT CHECK(category IN ('active_learning','cooperative','inquiry','blended','traditional','music','mixed','music_specific')),
  steps_template TEXT,
  description TEXT,
  is_preset INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS curriculum_indicators (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  strand TEXT,
  grade_level INTEGER,
  sort_order INTEGER
);
CREATE TABLE IF NOT EXISTS grade_configs (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT,
  config_type TEXT CHECK(config_type IN ('numeric','pass_fail','custom')),
  config_data TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS document_types (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  template_structure TEXT,
  is_preset INTEGER DEFAULT 0
);

-- ==================== GROUP 2: STUDENTS (6) ====================
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  user_id TEXT,
  student_code TEXT UNIQUE NOT NULL,
  prefix TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  gender TEXT CHECK(gender IN ('M','F','other')),
  birth_date TEXT,
  national_id TEXT,
  phone TEXT,
  address TEXT,
  photo_url TEXT,
  special_needs TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS student_classrooms (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  student_number INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  UNIQUE(student_id, classroom_id, semester_id)
);
CREATE TABLE IF NOT EXISTS student_parents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  relationship TEXT CHECK(relationship IN ('father','mother','guardian','other')),
  prefix TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  occupation TEXT,
  address TEXT
);
CREATE TABLE IF NOT EXISTS activity_members (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  position_id TEXT,
  semester_id TEXT NOT NULL,
  joined_at TEXT,
  UNIQUE(activity_id, student_id, semester_id)
);
CREATE TABLE IF NOT EXISTS pdpa_consents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  consent_type TEXT CHECK(consent_type IN ('location','photo','health_data','general')),
  consented INTEGER DEFAULT 0,
  consented_by TEXT,
  consented_at TEXT,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS homeroom_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  role TEXT DEFAULT 'homeroom_teacher',
  assigned_at TEXT
);

-- ==================== GROUP 3: SCHEDULE & ATTENDANCE (4) ====================
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT CHECK(event_type IN ('holiday','exam','activity','deadline','other')),
  date TEXT NOT NULL,
  end_date TEXT,
  all_day INTEGER DEFAULT 1,
  color TEXT,
  notes TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS attendance_zones (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  name TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  radius_meters INTEGER DEFAULT 50,
  is_active INTEGER DEFAULT 1,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  subject_id TEXT,
  date TEXT NOT NULL,
  period INTEGER,
  status TEXT NOT NULL CHECK(status IN ('present','absent','late','leave','sick')),
  check_in_time TEXT,
  check_in_lat REAL,
  check_in_lng REAL,
  check_in_method TEXT CHECK(check_in_method IN ('manual','gps','student_app')),
  notes TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS work_hours (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('teaching','support','other')),
  date TEXT NOT NULL,
  hours REAL NOT NULL,
  description TEXT,
  evidence_id TEXT,
  created_at TEXT
);

-- ==================== GROUP 4: TEACHING (7) ====================
CREATE TABLE IF NOT EXISTS course_structures (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  subject_classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  total_hours REAL,
  score_distribution TEXT,
  learning_objectives TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS learning_units (
  id TEXT PRIMARY KEY,
  course_structure_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  unit_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  hours REAL,
  indicators TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS lesson_plans (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  learning_unit_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  plan_number INTEGER,
  title TEXT NOT NULL,
  lesson_model_id TEXT NOT NULL,
  date TEXT,
  period INTEGER,
  duration_minutes INTEGER DEFAULT 50,
  objectives TEXT,
  content TEXT,
  steps TEXT,
  materials TEXT,
  assessment_notes TEXT,
  media_urls TEXT,
  ai_generated INTEGER DEFAULT 0,
  is_locked INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS post_lesson_notes (
  id TEXT PRIMARY KEY,
  lesson_plan_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  raw_text TEXT,
  polished_text TEXT,
  strengths TEXT,
  improvements TEXT,
  next_steps TEXT,
  student_issues TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS lesson_locks (
  id TEXT PRIMARY KEY,
  lesson_plan_id TEXT NOT NULL UNIQUE,
  locked_at TEXT NOT NULL,
  locked_reason TEXT CHECK(locked_reason IN ('submitted','pa_evidence'))
);
CREATE TABLE IF NOT EXISTS student_submissions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  lesson_plan_id TEXT NOT NULL,
  submission_type TEXT CHECK(submission_type IN ('assignment','portfolio_item')),
  file_url TEXT,
  description TEXT,
  score REAL,
  feedback TEXT,
  submitted_at TEXT,
  graded_at TEXT
);
CREATE TABLE IF NOT EXISTS classroom_materials (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  subject_id TEXT,
  title TEXT NOT NULL,
  material_type TEXT CHECK(material_type IN ('presentation','worksheet','video','audio','link','other')),
  file_url TEXT,
  description TEXT,
  tags TEXT,
  is_shared INTEGER DEFAULT 0,
  created_at TEXT
);

-- ==================== GROUP 5: ASSESSMENT (9) ====================
CREATE TABLE IF NOT EXISTS assessment_tools (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tool_type TEXT CHECK(tool_type IN ('rubric','checklist','rating_scale','observation')),
  subject_id TEXT,
  description TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id TEXT PRIMARY KEY,
  assessment_tool_id TEXT NOT NULL,
  criterion TEXT NOT NULL,
  max_score REAL NOT NULL,
  levels TEXT,
  sort_order INTEGER
);
CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  title TEXT NOT NULL,
  test_type TEXT CHECK(test_type IN ('pretest','posttest','midterm','final','quiz')),
  total_questions INTEGER,
  total_score REAL,
  time_limit_minutes INTEGER,
  instructions TEXT,
  is_published INTEGER DEFAULT 0,
  allow_review INTEGER DEFAULT 0,
  shuffle_questions INTEGER DEFAULT 0,
  shuffle_choices INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 1,
  show_score_immediately INTEGER DEFAULT 1,
  passing_score REAL,
  available_from TEXT,
  available_until TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS test_questions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  question_type TEXT CHECK(question_type IN (
    'multiple_choice','multiple_select','true_false',
    'short_answer','essay','matching','ordering',
    'fill_blank','audio_record'
  )),
  question_text TEXT NOT NULL,
  choices TEXT,
  correct_answer TEXT,
  matching_pairs TEXT,
  correct_order TEXT,
  media_url TEXT,
  score REAL NOT NULL,
  bloom_level TEXT,
  difficulty TEXT CHECK(difficulty IN ('easy','medium','hard')),
  sort_order INTEGER
);
CREATE TABLE IF NOT EXISTS test_responses (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  answers TEXT,
  total_score REAL,
  started_at TEXT,
  submitted_at TEXT,
  time_spent_seconds INTEGER,
  graded_at TEXT,
  graded_by TEXT CHECK(graded_by IN ('auto','teacher','ai_assisted'))
);
CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  score_type TEXT NOT NULL CHECK(score_type IN ('midterm','final','assignment','quiz','behavior')),
  score REAL NOT NULL,
  max_score REAL NOT NULL,
  description TEXT,
  scored_at TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS trait_categories (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  name TEXT NOT NULL,
  category_type TEXT CHECK(category_type IN ('character','competency','literacy')),
  sort_order INTEGER
);
CREATE TABLE IF NOT EXISTS trait_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER
);
CREATE TABLE IF NOT EXISTS trait_scores (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  trait_item_id TEXT NOT NULL,
  score INTEGER CHECK(score BETWEEN 0 AND 3),
  notes TEXT,
  updated_at TEXT,
  UNIQUE(student_id, semester_id, trait_item_id)
);

-- ==================== GROUP 6: GRADE RESULTS (1) ====================
CREATE TABLE IF NOT EXISTS grade_results (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  raw_score REAL,
  grade TEXT,
  grade_config_id TEXT NOT NULL,
  is_final INTEGER DEFAULT 0,
  computed_at TEXT,
  notes TEXT
);

-- ==================== GROUP 7: RESEARCH, PA, SAR (5) ====================
CREATE TABLE IF NOT EXISTS researches (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  title TEXT NOT NULL,
  problem_statement TEXT,
  objectives TEXT,
  hypothesis TEXT,
  methodology TEXT,
  population TEXT,
  sample TEXT,
  instruments TEXT,
  data_collection TEXT,
  data_analysis TEXT,
  results TEXT,
  conclusion TEXT,
  recommendations TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','in_progress','completed','published')),
  ai_generated_sections TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS research_cycles (
  id TEXT PRIMARY KEY,
  research_id TEXT NOT NULL,
  cycle_number INTEGER NOT NULL,
  plan TEXT,
  action TEXT,
  check_results TEXT,
  adjustment TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS pa_agreements (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  teaching_hours_target REAL,
  support_hours_target REAL,
  other_hours_target REAL,
  teaching_duties TEXT,
  support_duties TEXT,
  other_duties TEXT,
  challenging_task TEXT,
  innovation_plan TEXT,
  research_plan TEXT,
  submitted_at TEXT,
  approved_by TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS pa_results (
  id TEXT PRIMARY KEY,
  pa_agreement_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  teaching_hours_actual REAL,
  support_hours_actual REAL,
  other_hours_actual REAL,
  teaching_results TEXT,
  support_results TEXT,
  other_results TEXT,
  student_quality_results TEXT,
  research_results TEXT,
  innovation_results TEXT,
  evidence_summary TEXT,
  self_assessment_score REAL,
  evaluator_score REAL,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved')),
  ai_generated INTEGER DEFAULT 0,
  submitted_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS sar_reports (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  part1_context TEXT,
  part2_results TEXT,
  part3_analysis TEXT,
  part4_improvement TEXT,
  overall_status TEXT DEFAULT 'draft' CHECK(overall_status IN ('draft','completed')),
  ai_generated_sections TEXT,
  submitted_at TEXT,
  created_at TEXT
);

-- ==================== GROUP 8: AWARDS & PORTFOLIO (7) ====================
CREATE TABLE IF NOT EXISTS award_types (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  name TEXT NOT NULL,
  name_short TEXT,
  tier INTEGER CHECK(tier IN (1,2,3)),
  level TEXT CHECK(level IN ('national','district','school')),
  organizing_body TEXT,
  typical_deadline_month INTEGER,
  evidence_requirements TEXT,
  is_preset INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS awards (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  award_type_id TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  status TEXT DEFAULT 'planning' CHECK(status IN ('planning','applied','received','not_applied')),
  application_date TEXT,
  result_date TEXT,
  result TEXT CHECK(result IN ('won','lost','pending')),
  level_achieved TEXT,
  evidence_ids TEXT,
  notes TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS portfolio_items (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT CHECK(category IN ('teaching','research','innovation','award','training','other')),
  description TEXT,
  file_urls TEXT,
  date TEXT,
  tags TEXT,
  is_featured INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS innovations (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  title TEXT NOT NULL,
  innovation_type TEXT CHECK(innovation_type IN ('teaching_material','app','method','curriculum','other')),
  problem_addressed TEXT,
  description TEXT,
  implementation TEXT,
  results TEXT,
  effectiveness_data TEXT,
  published_at TEXT,
  published_where TEXT,
  evidence_urls TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','in_use','published')),
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS plc_records (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  session_date TEXT NOT NULL,
  topic TEXT NOT NULL,
  participants TEXT,
  objectives TEXT,
  activities TEXT,
  outcomes TEXT,
  next_steps TEXT,
  evidence_urls TEXT,
  hours REAL,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS log_entries (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('teaching','support','other')),
  hours REAL NOT NULL,
  description TEXT,
  related_module TEXT,
  related_id TEXT,
  evidence_urls TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS quick_drops (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_type TEXT CHECK(file_type IN ('image','pdf','video','audio','link','text')),
  ai_category TEXT,
  ai_module_links TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','categorized','linked')),
  linked_to_module TEXT,
  linked_to_id TEXT,
  dropped_at TEXT,
  categorized_at TEXT
);

-- ==================== GROUP 9: STUDENT CARE (4) ====================
CREATE TABLE IF NOT EXISTS home_visits (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  visit_type TEXT CHECK(visit_type IN ('routine','urgent','follow_up')),
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
CREATE TABLE IF NOT EXISTS sdq_screenings (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  screen_date TEXT NOT NULL,
  respondent_type TEXT CHECK(respondent_type IN ('teacher','parent','self')),
  emotional_score INTEGER,
  conduct_score INTEGER,
  hyperactivity_score INTEGER,
  peer_score INTEGER,
  prosocial_score INTEGER,
  total_difficulty INTEGER,
  risk_level TEXT CHECK(risk_level IN ('normal','borderline','abnormal')),
  ai_interpretation TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS care_records (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  care_step INTEGER CHECK(care_step BETWEEN 1 AND 5),
  record_date TEXT NOT NULL,
  description TEXT,
  action_taken TEXT,
  outcome TEXT,
  referral_to TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS iep_plans (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  current_level TEXT,
  goals TEXT,
  strategies TEXT,
  evaluation_criteria TEXT,
  review_dates TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','suspended')),
  created_at TEXT,
  updated_at TEXT
);

-- ==================== GROUP 10: DOCUMENTS (2) ====================
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  document_type_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','final')),
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS cover_templates (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  template_type TEXT CHECK(template_type IN ('lesson_plan','research','sar','portfolio','custom')),
  design_data TEXT,
  preview_url TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT
);

-- ==================== GROUP 11: MUSIC-SPECIFIC (3) ====================
CREATE TABLE IF NOT EXISTS instruments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK(category IN ('percussion','string','wind','keyboard','electronic','other')),
  condition TEXT DEFAULT 'good' CHECK(condition IN ('good','fair','poor','repair')),
  quantity INTEGER DEFAULT 1,
  serial_number TEXT,
  purchase_date TEXT,
  purchase_price REAL,
  storage_location TEXT,
  notes TEXT,
  photo_url TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS rehearsals (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  rehearsal_date TEXT NOT NULL,
  duration_minutes INTEGER,
  topic TEXT,
  members_present TEXT,
  notes TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS performances (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT CHECK(event_type IN ('school','district','national','competition')),
  performance_date TEXT NOT NULL,
  venue TEXT,
  participants TEXT,
  result TEXT,
  notes TEXT,
  photo_urls TEXT,
  created_at TEXT
);

-- ==================== GROUP 12: SYSTEM (6) ====================
CREATE TABLE IF NOT EXISTS cross_links (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  source_module TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_module TEXT NOT NULL,
  target_id TEXT NOT NULL,
  link_type TEXT CHECK(link_type IN ('evidence','related','derived')),
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  backup_type TEXT CHECK(backup_type IN ('auto','manual')),
  file_url TEXT,
  file_size INTEGER,
  tables_included TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','completed','failed')),
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT CHECK(notification_type IN ('early_warning','pa_deadline','award_deadline','system')),
  related_module TEXT,
  related_id TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT,
  expires_at TEXT
);
CREATE TABLE IF NOT EXISTS drive_files (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  drive_file_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  module TEXT,
  related_id TEXT,
  uploaded_at TEXT
);
CREATE TABLE IF NOT EXISTS student_alerts (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  alert_type TEXT CHECK(alert_type IN ('academic','attendance','behavior','combined')),
  risk_level TEXT CHECK(risk_level IN ('normal','watch','critical')),
  risk_score REAL,
  factors TEXT,
  ai_recommendation TEXT,
  is_resolved INTEGER DEFAULT 0,
  generated_at TEXT
);
CREATE TABLE IF NOT EXISTS evidence_pool (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK(evidence_type IN ('teaching','support','other','research','innovation')),
  pa_category TEXT CHECK(pa_category IN ('teaching_hours','support_hours','other_hours','challenging_task')),
  title TEXT NOT NULL,
  description TEXT,
  source_module TEXT NOT NULL,
  source_id TEXT NOT NULL,
  file_urls TEXT,
  auto_collected INTEGER DEFAULT 1,
  created_at TEXT
);

-- ==================== GROUP 13: STUDENT CLASSROOM (6) ====================
CREATE TABLE IF NOT EXISTS classroom_posts (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  subject_classroom_id TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK(post_type IN ('announcement','material','assignment','quiz','poll','discussion')),
  title TEXT NOT NULL,
  content TEXT,
  attachments TEXT,
  is_pinned INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  scheduled_at TEXT,
  due_date TEXT,
  max_score REAL,
  test_id TEXT,
  allow_late INTEGER DEFAULT 0,
  late_penalty_percent REAL DEFAULT 0,
  poll_options TEXT,
  sort_order INTEGER,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  assignment_type TEXT CHECK(assignment_type IN ('file_upload','text_entry','url_link','audio_record','mixed')),
  rubric_id TEXT,
  group_assignment INTEGER DEFAULT 0,
  max_file_size_mb INTEGER DEFAULT 10,
  allowed_file_types TEXT,
  instructions_detail TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  submission_text TEXT,
  submission_url TEXT,
  file_urls TEXT,
  audio_url TEXT,
  status TEXT DEFAULT 'submitted' CHECK(status IN ('draft','submitted','returned','graded')),
  score REAL,
  max_score REAL,
  rubric_scores TEXT,
  feedback TEXT,
  feedback_audio_url TEXT,
  graded_at TEXT,
  submitted_at TEXT,
  resubmitted_at TEXT,
  attempt_count INTEGER DEFAULT 1,
  is_late INTEGER DEFAULT 0,
  late_days REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  post_id TEXT,
  student_id TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  answers TEXT,
  total_score REAL,
  max_score REAL,
  started_at TEXT,
  submitted_at TEXT,
  time_spent_seconds INTEGER,
  auto_graded INTEGER DEFAULT 0,
  manually_graded INTEGER DEFAULT 0,
  graded_at TEXT,
  feedback TEXT
);
CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_role TEXT CHECK(user_role IN ('teacher','student')),
  parent_comment_id TEXT,
  content TEXT NOT NULL,
  attachments TEXT,
  is_private INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS student_notifications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT CHECK(notification_type IN (
    'new_post','assignment_due','quiz_available','grade_released',
    'feedback','comment_reply','announcement'
  )),
  related_post_id TEXT,
  related_module TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT,
  expires_at TEXT
);

-- ==================== GROUP 9: GAMIFICATION ====================
CREATE TABLE IF NOT EXISTS student_xp (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  source_type TEXT,
  source TEXT,
  source_id TEXT,
  xp_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS behavior_points (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  points REAL NOT NULL,
  reason TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS student_streaks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  freeze_count INTEGER DEFAULT 2,
  last_update TEXT
);
CREATE TABLE IF NOT EXISTS weekly_leagues (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  league TEXT DEFAULT 'bronze' CHECK(league IN ('bronze','silver','gold','diamond')),
  weekly_xp REAL DEFAULT 0,
  week_start TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS student_badges (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  badge_key TEXT NOT NULL,
  unlocked_at TEXT,
  UNIQUE(student_id, badge_key)
);
-- ==================== GROUP 10: LIVE SESSIONS ====================
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  date TEXT NOT NULL,
  period INTEGER,
  subject_id TEXT,
  semester_id TEXT,
  is_open INTEGER DEFAULT 1,
  opened_at TEXT,
  closed_at TEXT
);
CREATE TABLE IF NOT EXISTS live_sessions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  session_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting','question','results','finished')),
  current_question INTEGER DEFAULT 0,
  scoring_mode TEXT DEFAULT 'standard',
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS live_participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  nickname TEXT,
  joined_at TEXT,
  total_score REAL DEFAULT 0,
  total_xp REAL DEFAULT 0,
  UNIQUE(session_id, student_id)
);
CREATE TABLE IF NOT EXISTS live_responses (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer TEXT,
  is_correct INTEGER DEFAULT 0,
  time_ms INTEGER,
  xp_earned REAL DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  created_at TEXT
);
-- ==================== GROUP 11: STUDENT INTERACTION ====================
CREATE TABLE IF NOT EXISTS board_posts (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS board_likes (
  id TEXT PRIMARY KEY,
  board_post_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(board_post_id, student_id)
);
CREATE TABLE IF NOT EXISTS poll_responses (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  option_text TEXT,
  created_at TEXT,
  UNIQUE(post_id, student_id)
);
CREATE TABLE IF NOT EXISTS student_portfolio_items (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  subject_id TEXT,
  file_urls TEXT,
  reflection TEXT,
  created_at TEXT,
  updated_at TEXT
);
-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user ON teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_teacher_key ON app_settings(teacher_id, key);
CREATE INDEX IF NOT EXISTS idx_semesters_teacher ON semesters(teacher_id);
CREATE INDEX IF NOT EXISTS idx_semesters_active ON semesters(is_active);
CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sc_teacher ON subject_classrooms(teacher_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_activities_teacher ON activities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_evidence_teacher_sem ON evidence_pool(teacher_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence_pool(source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_evidence_pa ON evidence_pool(pa_category);
CREATE INDEX IF NOT EXISTS idx_crosslinks_source ON cross_links(source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_crosslinks_target ON cross_links(target_module, target_id);
CREATE INDEX IF NOT EXISTS idx_cs_sc ON course_structures(subject_classroom_id);
CREATE INDEX IF NOT EXISTS idx_lu_cs ON learning_units(course_structure_id);
CREATE INDEX IF NOT EXISTS idx_pln_teacher ON post_lesson_notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_pln_lesson ON post_lesson_notes(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_stu_teacher ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_stucls_stu ON student_classrooms(student_id);
CREATE INDEX IF NOT EXISTS idx_stucls_cls_sem ON student_classrooms(classroom_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_research_teacher ON researches(teacher_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_pa_teacher_year ON pa_agreements(teacher_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_sar_teacher ON sar_reports(teacher_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_hv_student ON home_visits(student_id);
CREATE INDEX IF NOT EXISTS idx_sdq_student ON sdq_screenings(student_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_care_student ON care_records(student_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_alerts_teacher ON student_alerts(teacher_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_alerts_risk ON student_alerts(risk_level);
CREATE INDEX IF NOT EXISTS idx_portfolio_teacher ON portfolio_items(teacher_id);
CREATE INDEX IF NOT EXISTS idx_awards_teacher ON awards(teacher_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_log_teacher_sem ON log_entries(teacher_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_log_category ON log_entries(category);
CREATE INDEX IF NOT EXISTS idx_plc_teacher ON plc_records(teacher_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_notif_teacher ON notifications(teacher_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_expires ON notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_qd_teacher ON quick_drops(teacher_id);
CREATE INDEX IF NOT EXISTS idx_qd_status ON quick_drops(status);
CREATE INDEX IF NOT EXISTS idx_drive_teacher ON drive_files(teacher_id);
CREATE INDEX IF NOT EXISTS idx_drive_module ON drive_files(module, related_id);
CREATE INDEX IF NOT EXISTS idx_instr_teacher ON instruments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reh_activity ON rehearsals(activity_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_perf_activity ON performances(activity_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_wh_teacher_sem ON work_hours(teacher_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_wh_category ON work_hours(category);
CREATE INDEX IF NOT EXISTS idx_cposts_sc ON classroom_posts(subject_classroom_id);
CREATE INDEX IF NOT EXISTS idx_cposts_teacher ON classroom_posts(teacher_id, post_type);
CREATE INDEX IF NOT EXISTS idx_cposts_due ON classroom_posts(due_date);
CREATE INDEX IF NOT EXISTS idx_asub_assignment ON assignment_submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_asub_status ON assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_test_student ON quiz_attempts(test_id, student_id);
CREATE INDEX IF NOT EXISTS idx_pcomments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_snotif_student ON student_notifications(student_id, is_read);
CREATE INDEX IF NOT EXISTS idx_snotif_expires ON student_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_tests_teacher ON tests(teacher_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_tq_test ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_tr_test ON test_responses(test_id, student_id);
CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_scores_classroom ON scores(classroom_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_gr_classroom ON grade_results(classroom_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_lp_unit ON lesson_plans(learning_unit_id);
CREATE INDEX IF NOT EXISTS idx_lp_teacher_sem ON lesson_plans(teacher_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_att_student ON attendance_records(student_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_att_classroom ON attendance_records(classroom_id, date);
