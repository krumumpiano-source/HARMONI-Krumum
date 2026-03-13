# HARMONI — Technical Reference (สำหรับเขียนโค้ด)

> เอกสารนี้สำหรับ **นักพัฒนา** — รายละเอียดทางเทคนิคทั้งหมดที่ต้องใช้ตอนเขียนโค้ด
> ดูแนวคิดและที่มา → `HARMONI-Concept.html`

---

## 1. Tech Stack

| Layer | Technology | หมายเหตุ |
|-------|-----------|---------|
| Hosting | Cloudflare Pages | Static HTML + Functions |
| Backend | Pages Functions (Workers) | `/functions/api/*.js` |
| Database | Cloudflare D1 (SQLite) | `.prepare().bind().all()/.first()/.run()`, `db.batch()` |
| Auth | PBKDF2(SHA-256, 100k iter) + salt + session | ดีกว่า plain hash — ใช้ Web Crypto API |
| AI Primary | Gemini Flash (free) | `generativelanguage.googleapis.com` |
| AI Fallback | Groq (free) | `api.groq.com` |
| AI Vision | OpenAI GPT-4o Vision (paid) | เฉพาะรูปภาพเท่านั้น |
| File Storage | Google Drive API (OAuth2) | Private only |
| UI Framework | Bootstrap 5 (CDN) | — |
| Icons | Font Awesome 6 (CDN) | — |
| Dialogs | SweetAlert2 (CDN) | — |
| Charts | Chart.js (CDN) | — |
| Maps | Leaflet.js (CDN) | GPS attendance, home visits |
| Sanitizer | DOMPurify (CDN) | ทุก user input |
| PDF Export | jsPDF + jsPDF-AutoTable | — |
| Word Export | docx.js | ฟอร์มราชการ |
| Excel Export | SheetJS (xlsx) | — |
| Offline | IndexedDB + Service Worker | Auto sync เมื่อกลับมา online |

---

## 2. Project Structure (Target)

```
D:\AI Vs Programe\HARMONI\          ← rename from Krumum
├── index.html                       ← login page
├── teacher.html                     ← SPA ครู (ทุกโมดูล)
├── student.html                     ← SPA นร. (mobile-first)
├── sw.js                            ← Service Worker
├── manifest.json                    ← PWA manifest
├── css/
│   └── app.css                      ← custom styles
├── js/
│   ├── app.js                       ← main router + auth
│   ├── api.js                       ← fetch wrapper + offline queue
│   ├── ai-panel.js                  ← AI Side Panel (Quick AI + Chat AI)
│   ├── export.js                    ← PDF/Word/Excel/CSV/GSheets/GDocs/Print
│   ├── drive.js                     ← Google Drive API wrapper
│   ├── modules/
│   │   ├── dashboard.js
│   │   ├── settings.js
│   │   ├── course-structure.js
│   │   ├── lesson-plan.js
│   │   ├── post-lesson.js
│   │   ├── assessment.js
│   │   ├── test.js
│   │   ├── scores.js
│   │   ├── grade-result.js
│   │   ├── research.js
│   │   ├── pa.js
│   │   ├── sar.js
│   │   ├── innovation.js
│   │   ├── plc.js
│   │   ├── logbook.js
│   │   ├── portfolio.js
│   │   ├── awards.js
│   │   ├── calendar.js
│   │   ├── attendance.js
│   │   ├── homeroom.js
│   │   ├── home-visit.js
│   │   ├── sdq.js
│   │   ├── care-record.js
│   │   ├── documents.js
│   │   ├── cover-designer.js
│   │   ├── instruments.js
│   │   ├── quick-drop.js
│   │   ├── classroom-materials.js
│   │   ├── student-app.js           ← Student module (main)
│   │   ├── student-classroom.js     ← Student Classroom (ห้องเรียนออนไลน์)
│   │   ├── student-quiz.js          ← Quiz/test taking UI
│   │   └── student-assignment.js    ← Assignment submit + review
│   └── lib/                          ← CDN fallback (optional)
├── functions/
│   ├── _middleware.js                 ← auth check + CORS + CSP
│   ├── _helpers.js                   ← AI Router, D1 helpers, UUID
│   └── api/
│       ├── auth.js                    ← login/register/session
│       ├── settings.js
│       ├── semesters.js
│       ├── subjects.js
│       ├── classrooms.js
│       ├── students.js
│       ├── course-structures.js
│       ├── lesson-plans.js
│       ├── post-lesson-notes.js
│       ├── assessment-tools.js
│       ├── tests.js
│       ├── scores.js
│       ├── grade-results.js
│       ├── attendance.js
│       ├── attendance-zones.js
│       ├── work-hours.js
│       ├── calendar.js
│       ├── subject-classrooms.js
│       ├── learning-units.js
│       ├── student-submissions.js
│       ├── researches.js
│       ├── research-cycles.js
│       ├── pa.js
│       ├── sar.js
│       ├── innovations.js
│       ├── plc.js
│       ├── log-entries.js
│       ├── portfolio.js
│       ├── awards.js
│       ├── home-visits.js
│       ├── sdq.js
│       ├── care-records.js
│       ├── documents.js
│       ├── cover-templates.js
│       ├── lesson-models.js
│       ├── curriculum-indicators.js
│       ├── grade-configs.js
│       ├── trait-categories.js
│       ├── document-types.js
│       ├── pdpa-consents.js
│       ├── homeroom-assignments.js
│       ├── student-alerts.js
│       ├── evidence-pool.js
│       ├── iep-plans.js
│       ├── rehearsals.js
│       ├── performances.js
│       ├── instruments.js
│       ├── quick-drops.js
│       ├── classroom-materials.js
│       ├── classroom-posts.js       ← CRUD โพสต์ห้องเรียน
│       ├── assignments.js           ← Assignment mgmt + grading
│       ├── assignment-submissions.js
│       ├── quiz-attempts.js         ← Quiz attempt + auto-grade
│       ├── post-comments.js
│       ├── student-feed.js          ← Student-facing feed API
│       ├── notifications.js
│       ├── backups.js
│       ├── ai.js                      ← AI Router endpoint
│       └── drive.js                   ← Drive proxy
├── wrangler.toml
├── .editorconfig
├── .vscode/settings.json
└── เอกสาร/                            ← 28 form templates (reference)
```

---

## 3. Database Schema — 74 Tables, 13 Groups

### Pattern (จาก Note Chord SoulCiety)
- PK: `TEXT` (UUID v4 via `crypto.randomUUID()`)
- Timestamps: `TEXT` ISO8601 (`new Date().toISOString()`)
- JSON fields: `TEXT` (serialize/deserialize manually)
- No formal FK constraints (D1 limitation) — enforce in code
- Use `db.batch()` for bulk insert/update
- Every teacher-owned table has `teacher_id TEXT`

### Group 1: AUTH & CONFIG (14 tables)
```
users, sessions, teacher_profiles, app_settings, semesters,
subjects, classrooms, subject_classrooms, activities,
activity_positions, lesson_models, curriculum_indicators,
grade_configs, document_types
```

### Group 2: STUDENTS (6 tables)
```
students, student_classrooms, student_parents,
activity_members, pdpa_consents, homeroom_assignments
```

### Group 3: SCHEDULE & ATTENDANCE (4 tables)
```
calendar_events, attendance_zones, attendance_records, work_hours
```

### Group 4: TEACHING (7 tables)
```
course_structures, learning_units, lesson_plans,
post_lesson_notes, lesson_locks, student_submissions,
classroom_materials
```

### Group 5: ASSESSMENT (9 tables)
```
assessment_tools, rubric_criteria, tests, test_questions,
test_responses, scores, trait_categories, trait_items, trait_scores
```

### Group 6: GRADE RESULTS (1 table)
```
grade_results
```

### Group 7: RESEARCH, PA, SAR (5 tables)
```
researches, research_cycles, pa_agreements, pa_results, sar_reports
```

### Group 8: AWARDS & PORTFOLIO (7 tables)
```
award_types, awards, portfolio_items, innovations,
plc_records, log_entries, quick_drops
```

### Group 9: STUDENT CARE (4 tables)
```
home_visits, sdq_screenings, care_records, iep_plans
```

### Group 10: DOCUMENTS (2 tables)
```
documents, cover_templates
```

### Group 11: MUSIC-SPECIFIC (3 tables)
```
instruments, rehearsals, performances
```

### Group 12: SYSTEM (6 tables)
```
cross_links, backups, notifications, drive_files,
student_alerts, evidence_pool
```

### Group 13: STUDENT CLASSROOM (6 tables)
```
classroom_posts, assignments, assignment_submissions,
quiz_attempts, post_comments, student_notifications
```

> **Full schema with columns** → Section 3.1 ด้านล่าง

### 3.1 Full Column Schema (SQL — 74 Tables)

```sql
-- ==================== GROUP 1: AUTH & CONFIG (14) ====================
CREATE TABLE users (
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
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT
);
CREATE TABLE teacher_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prefix TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT,                        -- 'ครู'|'ครูชำนาญการ'|'ครูชำนาญการพิเศษ'|'ครูเชี่ยวชาญ'
  academic_standing TEXT,               -- 'คศ.1'|'คศ.2'|'คศ.3'|'คศ.4'
  employee_id TEXT,
  phone TEXT,
  email TEXT,
  profile_photo_url TEXT,
  updated_at TEXT
);
CREATE TABLE app_settings (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(teacher_id, key)
  -- keys: school_name, school_code, school_address, school_director, school_logo_url,
  --       district_name, province_name, ministry_dept, academic_year, current_semester_id
);
CREATE TABLE semesters (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  academic_year INTEGER NOT NULL,       -- 2568
  semester INTEGER NOT NULL CHECK(semester IN (1,2)),
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,                   -- 'ดนตรี-นาฏศิลป์'
  code TEXT NOT NULL,                   -- 'ศ21101'
  credits REAL,
  hours_per_week REAL,
  subject_type TEXT DEFAULT 'regular' CHECK(subject_type IN ('regular','homeroom','ethics')),
  grade_level INTEGER,                  -- 1=ม.1, 2=ม.2
  description TEXT,
  created_at TEXT
);
CREATE TABLE classrooms (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,                   -- 'ม.1/1'
  grade_level INTEGER NOT NULL,
  room_number INTEGER NOT NULL,
  academic_year INTEGER,
  student_count INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE subject_classrooms (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(subject_id, classroom_id, semester_id)
);
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,                   -- 'ชุมนุมสานฝันด้วยเส้นเสียง'
  activity_type TEXT CHECK(activity_type IN ('club','ensemble','other')),
  description TEXT,
  max_members INTEGER,
  created_at TEXT
);
CREATE TABLE activity_positions (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  name TEXT NOT NULL,                   -- 'ประธาน'|'รองประธาน'|'สมาชิก'
  sort_order INTEGER
);
CREATE TABLE lesson_models (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,                      -- NULL = system preset
  name TEXT NOT NULL,                   -- '5E'
  name_en TEXT,
  category TEXT CHECK(category IN ('active_learning','mixed','music_specific')),
  steps_template TEXT,                  -- JSON: [{step,description,duration_pct}]
  description TEXT,
  is_preset INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE curriculum_indicators (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  code TEXT NOT NULL,                   -- 'ศ 2.1 ม.1/1'
  description TEXT NOT NULL,
  strand TEXT,                          -- 'ศ 2.1'|'ศ 2.2'
  grade_level INTEGER,
  sort_order INTEGER
);
CREATE TABLE grade_configs (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT,
  config_type TEXT CHECK(config_type IN ('numeric','pass_fail','custom')),
  config_data TEXT,                     -- JSON: {levels:[{min,max,grade,label}]}
  is_default INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE document_types (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,                      -- NULL = system preset
  name TEXT NOT NULL,
  category TEXT,                        -- 'official'|'report'|'certificate'
  template_structure TEXT,              -- JSON: form field definitions
  is_preset INTEGER DEFAULT 0
);

-- ==================== GROUP 2: STUDENTS (6) ====================
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  user_id TEXT,                         -- NULL until student registers
  student_code TEXT UNIQUE NOT NULL,    -- รหัสนักเรียน
  prefix TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  gender TEXT CHECK(gender IN ('M','F','other')),
  birth_date TEXT,
  national_id TEXT,                     -- store encrypted
  phone TEXT,
  address TEXT,
  photo_url TEXT,
  special_needs TEXT,                   -- JSON: {type, details}
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE student_classrooms (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  student_number INTEGER NOT NULL,      -- เลขที่
  is_active INTEGER DEFAULT 1,
  UNIQUE(student_id, classroom_id, semester_id)
);
CREATE TABLE student_parents (
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
CREATE TABLE activity_members (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  position_id TEXT,
  semester_id TEXT NOT NULL,
  joined_at TEXT,
  UNIQUE(activity_id, student_id, semester_id)
);
CREATE TABLE pdpa_consents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  consent_type TEXT CHECK(consent_type IN ('location','photo','health_data','general')),
  consented INTEGER DEFAULT 0,
  consented_by TEXT,                    -- ชื่อผู้ปกครอง
  consented_at TEXT,
  notes TEXT
);
CREATE TABLE homeroom_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  role TEXT DEFAULT 'homeroom_teacher',
  assigned_at TEXT
);

-- ==================== GROUP 3: SCHEDULE & ATTENDANCE (4) ====================
CREATE TABLE calendar_events (
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
CREATE TABLE attendance_zones (
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
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  subject_id TEXT,                      -- NULL for homeroom morning check-in
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
CREATE TABLE work_hours (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('teaching','support','other')),
  date TEXT NOT NULL,
  hours REAL NOT NULL,
  description TEXT,
  evidence_id TEXT,                     -- FK → evidence_pool
  created_at TEXT
);

-- ==================== GROUP 4: TEACHING (7) ====================
CREATE TABLE course_structures (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  subject_classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  total_hours REAL,
  score_distribution TEXT,             -- JSON: {midterm:30,final:30,assignment:20,behavior:20}
  learning_objectives TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE learning_units (
  id TEXT PRIMARY KEY,
  course_structure_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  unit_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  hours REAL,
  indicators TEXT,                     -- JSON: [indicator_id, ...]
  created_at TEXT
);
CREATE TABLE lesson_plans (
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
  objectives TEXT,                     -- JSON: [string, ...]
  content TEXT,
  steps TEXT,                          -- JSON: model-specific steps keyed by step name
  materials TEXT,                      -- JSON: [string, ...]
  assessment_notes TEXT,
  media_urls TEXT,                     -- JSON: [url, ...]
  ai_generated INTEGER DEFAULT 0,
  is_locked INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE post_lesson_notes (
  id TEXT PRIMARY KEY,
  lesson_plan_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  raw_text TEXT,                       -- ข้อความสั้นที่ครูพิมพ์เอง
  polished_text TEXT,                  -- หลัง AI ขัดเกลา
  strengths TEXT,
  improvements TEXT,
  next_steps TEXT,
  student_issues TEXT,                 -- JSON: [{student_id, issue}]
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE lesson_locks (
  id TEXT PRIMARY KEY,
  lesson_plan_id TEXT NOT NULL UNIQUE,
  locked_at TEXT NOT NULL,
  locked_reason TEXT CHECK(locked_reason IN ('submitted','pa_evidence'))
);
CREATE TABLE student_submissions (
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
CREATE TABLE classroom_materials (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  subject_id TEXT,
  title TEXT NOT NULL,
  material_type TEXT CHECK(material_type IN ('presentation','worksheet','video','audio','link','other')),
  file_url TEXT,
  description TEXT,
  tags TEXT,                           -- JSON: [string, ...]
  is_shared INTEGER DEFAULT 0,
  created_at TEXT
);

-- ==================== GROUP 5: ASSESSMENT (9) ====================
CREATE TABLE assessment_tools (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tool_type TEXT CHECK(tool_type IN ('rubric','checklist','rating_scale','observation')),
  subject_id TEXT,
  description TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE rubric_criteria (
  id TEXT PRIMARY KEY,
  assessment_tool_id TEXT NOT NULL,
  criterion TEXT NOT NULL,
  max_score REAL NOT NULL,
  levels TEXT,                         -- JSON: [{score,label,description}]
  sort_order INTEGER
);
CREATE TABLE tests (
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
  allow_review INTEGER DEFAULT 0,        -- นร.ดูเฉลยหลังส่งได้?
  shuffle_questions INTEGER DEFAULT 0,
  shuffle_choices INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 1,
  show_score_immediately INTEGER DEFAULT 1,
  passing_score REAL,                    -- คะแนนผ่าน (NULL = ไม่กำหนด)
  available_from TEXT,                   -- เปิดให้ทำเมื่อ
  available_until TEXT,                  -- ปิดเมื่อ
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE test_questions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  question_type TEXT CHECK(question_type IN (
    'multiple_choice','multiple_select','true_false',
    'short_answer','essay','matching','ordering',
    'fill_blank','audio_record'
  )),
  question_text TEXT NOT NULL,
  choices TEXT,                        -- JSON: [string, ...] for MC/MS
  correct_answer TEXT,                 -- string | JSON array (MS/ordering)
  matching_pairs TEXT,                 -- JSON: [{left,right}] for matching
  correct_order TEXT,                  -- JSON: [item,...] for ordering
  media_url TEXT,                      -- รูป/เสียงประกอบคำถาม
  score REAL NOT NULL,
  bloom_level TEXT,                    -- 'remember'|'understand'|'apply'|'analyze'|'evaluate'|'create'
  difficulty TEXT CHECK(difficulty IN ('easy','medium','hard')),
  sort_order INTEGER
);
CREATE TABLE test_responses (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  answers TEXT,                        -- JSON: {question_id: answer}
  total_score REAL,
  started_at TEXT,
  submitted_at TEXT,
  time_spent_seconds INTEGER,
  graded_at TEXT,
  graded_by TEXT CHECK(graded_by IN ('auto','teacher','ai_assisted'))
);
CREATE TABLE scores (
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
CREATE TABLE trait_categories (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,                     -- NULL = system
  name TEXT NOT NULL,
  category_type TEXT CHECK(category_type IN ('character','competency','literacy')),
  sort_order INTEGER
);
CREATE TABLE trait_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER
);
CREATE TABLE trait_scores (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  trait_item_id TEXT NOT NULL,
  score INTEGER CHECK(score BETWEEN 0 AND 3),  -- 0=ไม่ผ่าน 1=ผ่าน 2=ดี 3=ดีเยี่ยม
  notes TEXT,
  updated_at TEXT,
  UNIQUE(student_id, semester_id, trait_item_id)
);

-- ==================== GROUP 6: GRADE RESULTS (1) ====================
CREATE TABLE grade_results (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  raw_score REAL,
  grade TEXT,                          -- '4'|'3.5'|'3'|'2.5'|'2'|'1.5'|'1'|'0'|'ผ'|'มผ'
  grade_config_id TEXT NOT NULL,
  is_final INTEGER DEFAULT 0,
  computed_at TEXT,
  notes TEXT
);

-- ==================== GROUP 7: RESEARCH, PA, SAR (5) ====================
CREATE TABLE researches (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  title TEXT NOT NULL,
  problem_statement TEXT,
  objectives TEXT,                     -- JSON: [string, ...]
  hypothesis TEXT,
  methodology TEXT,
  population TEXT,
  sample TEXT,
  instruments TEXT,                    -- JSON: [string, ...]
  data_collection TEXT,
  data_analysis TEXT,
  results TEXT,
  conclusion TEXT,
  recommendations TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','in_progress','completed','published')),
  ai_generated_sections TEXT,          -- JSON: {section_name: true/false}
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE research_cycles (
  id TEXT PRIMARY KEY,
  research_id TEXT NOT NULL,
  cycle_number INTEGER NOT NULL,
  plan TEXT,
  action TEXT,
  check_results TEXT,
  adjustment TEXT,
  created_at TEXT
);
CREATE TABLE pa_agreements (            -- PA1 — เดือนพฤษภาคม
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  teaching_hours_target REAL,
  support_hours_target REAL,
  other_hours_target REAL,
  teaching_duties TEXT,                -- JSON: [string, ...]
  support_duties TEXT,
  other_duties TEXT,
  challenging_task TEXT,               -- ประเด็นท้าทาย
  innovation_plan TEXT,
  research_plan TEXT,
  submitted_at TEXT,
  approved_by TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE pa_results (               -- PA2 — ปลายปี
  id TEXT PRIMARY KEY,
  pa_agreement_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  teaching_hours_actual REAL,
  support_hours_actual REAL,
  other_hours_actual REAL,
  teaching_results TEXT,               -- JSON
  support_results TEXT,
  other_results TEXT,
  student_quality_results TEXT,
  research_results TEXT,
  innovation_results TEXT,
  evidence_summary TEXT,               -- JSON: {pa_category: [evidence_pool_id, ...]}
  self_assessment_score REAL,
  evaluator_score REAL,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved')),
  ai_generated INTEGER DEFAULT 0,
  submitted_at TEXT,
  updated_at TEXT
);
CREATE TABLE sar_reports (
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
CREATE TABLE award_types (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,                     -- NULL = system preset
  name TEXT NOT NULL,
  name_short TEXT,
  tier INTEGER CHECK(tier IN (1,2,3)),
  level TEXT CHECK(level IN ('national','district','school')),
  organizing_body TEXT,
  typical_deadline_month INTEGER,
  evidence_requirements TEXT,          -- JSON: [string, ...]
  is_preset INTEGER DEFAULT 0
);
CREATE TABLE awards (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  award_type_id TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  status TEXT DEFAULT 'planning' CHECK(status IN ('planning','applied','received','not_applied')),
  application_date TEXT,
  result_date TEXT,
  result TEXT CHECK(result IN ('won','lost','pending')),
  level_achieved TEXT,
  evidence_ids TEXT,                   -- JSON: [evidence_pool_id, ...]
  notes TEXT,
  created_at TEXT
);
CREATE TABLE portfolio_items (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT CHECK(category IN ('teaching','research','innovation','award','training','other')),
  description TEXT,
  file_urls TEXT,                      -- JSON: [url, ...]
  date TEXT,
  tags TEXT,                           -- JSON: [string, ...]
  is_featured INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE innovations (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  title TEXT NOT NULL,
  innovation_type TEXT CHECK(innovation_type IN ('teaching_material','app','method','curriculum','other')),
  problem_addressed TEXT,
  description TEXT,
  implementation TEXT,
  results TEXT,
  effectiveness_data TEXT,             -- JSON: {metric, before, after}
  published_at TEXT,
  published_where TEXT,
  evidence_urls TEXT,                  -- JSON: [url, ...]
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','in_use','published')),
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE plc_records (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  session_date TEXT NOT NULL,
  topic TEXT NOT NULL,
  participants TEXT,                   -- JSON: [name, ...]
  objectives TEXT,
  activities TEXT,
  outcomes TEXT,
  next_steps TEXT,
  evidence_urls TEXT,
  hours REAL,
  created_at TEXT
);
CREATE TABLE log_entries (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('teaching','support','other')),
  hours REAL NOT NULL,
  description TEXT,
  related_module TEXT,                 -- 'lesson_plan'|'homeroom'|'plc'|'research'|...
  related_id TEXT,
  evidence_urls TEXT,
  created_at TEXT
);
CREATE TABLE quick_drops (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_type TEXT CHECK(file_type IN ('image','pdf','video','audio','link','text')),
  ai_category TEXT,
  ai_module_links TEXT,                -- JSON: [{module, label, route}]
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','categorized','linked')),
  linked_to_module TEXT,
  linked_to_id TEXT,
  dropped_at TEXT,
  categorized_at TEXT
);

-- ==================== GROUP 9: STUDENT CARE (4) ====================
CREATE TABLE home_visits (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  visit_type TEXT CHECK(visit_type IN ('routine','urgent','follow_up')),
  lat REAL,
  lng REAL,
  address_visited TEXT,
  photo_urls TEXT,                     -- JSON: [url, ...]
  family_present TEXT,                 -- JSON: [{name, relation}]
  raw_notes TEXT,
  official_notes TEXT,                 -- AI-polished
  follow_up_needed INTEGER DEFAULT 0,
  follow_up_notes TEXT,
  created_at TEXT
);
CREATE TABLE sdq_screenings (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  screen_date TEXT NOT NULL,
  respondent_type TEXT CHECK(respondent_type IN ('teacher','parent','self')),
  emotional_score INTEGER,             -- 0-10
  conduct_score INTEGER,
  hyperactivity_score INTEGER,
  peer_score INTEGER,
  prosocial_score INTEGER,
  total_difficulty INTEGER,
  risk_level TEXT CHECK(risk_level IN ('normal','borderline','abnormal')),
  ai_interpretation TEXT,
  created_at TEXT
);
CREATE TABLE care_records (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  care_step INTEGER CHECK(care_step BETWEEN 1 AND 5),  -- 1=รู้จัก 2=คัดกรอง 3=ส่งเสริม 4=ป้องกัน 5=ส่งต่อ
  record_date TEXT NOT NULL,
  description TEXT,
  action_taken TEXT,
  outcome TEXT,
  referral_to TEXT,
  created_at TEXT
);
CREATE TABLE iep_plans (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  current_level TEXT,
  goals TEXT,                          -- JSON: [{goal, target_date}]
  strategies TEXT,                     -- JSON: [string, ...]
  evaluation_criteria TEXT,            -- JSON: [string, ...]
  review_dates TEXT,                   -- JSON: [date, ...]
  status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','suspended')),
  created_at TEXT,
  updated_at TEXT
);

-- ==================== GROUP 10: DOCUMENTS (2) ====================
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  document_type_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,                        -- JSON: {field_name: value}
  file_url TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','final')),
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE cover_templates (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  template_type TEXT CHECK(template_type IN ('lesson_plan','research','sar','portfolio','custom')),
  design_data TEXT,                    -- JSON: {colors, fonts, layout, logo_position}
  preview_url TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT
);

-- ==================== GROUP 11: MUSIC-SPECIFIC (3) ====================
CREATE TABLE instruments (
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
CREATE TABLE rehearsals (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  rehearsal_date TEXT NOT NULL,
  duration_minutes INTEGER,
  topic TEXT,
  members_present TEXT,                -- JSON: [student_id, ...]
  notes TEXT,
  created_at TEXT
);
CREATE TABLE performances (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT CHECK(event_type IN ('school','district','national','competition')),
  performance_date TEXT NOT NULL,
  venue TEXT,
  participants TEXT,                   -- JSON: [student_id, ...]
  result TEXT,
  notes TEXT,
  photo_urls TEXT,
  created_at TEXT
);

-- ==================== GROUP 12: SYSTEM (6) ====================
CREATE TABLE cross_links (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  source_module TEXT NOT NULL,         -- 'lesson_plan'|'home_visit'|'plc'|...
  source_id TEXT NOT NULL,
  target_module TEXT NOT NULL,
  target_id TEXT NOT NULL,
  link_type TEXT CHECK(link_type IN ('evidence','related','derived')),
  created_at TEXT
);
CREATE TABLE backups (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  backup_type TEXT CHECK(backup_type IN ('auto','manual')),
  file_url TEXT,
  file_size INTEGER,
  tables_included TEXT,                -- JSON: [table_name, ...]
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','completed','failed')),
  created_at TEXT
);
CREATE TABLE notifications (
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
CREATE TABLE drive_files (
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
CREATE TABLE student_alerts (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  alert_type TEXT CHECK(alert_type IN ('academic','attendance','behavior','combined')),
  risk_level TEXT CHECK(risk_level IN ('normal','watch','critical')),
  risk_score REAL,                     -- 0–100
  factors TEXT,                        -- JSON: {attendance_rate, avg_score, trait_trend, sdq_score}
  ai_recommendation TEXT,
  is_resolved INTEGER DEFAULT 0,
  generated_at TEXT
);
CREATE TABLE evidence_pool (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK(evidence_type IN ('teaching','support','other','research','innovation')),
  pa_category TEXT CHECK(pa_category IN ('teaching_hours','support_hours','other_hours','challenging_task')),
  title TEXT NOT NULL,
  description TEXT,
  source_module TEXT NOT NULL,         -- 'post_lesson_notes'|'home_visits'|'plc_records'|...
  source_id TEXT NOT NULL,
  file_urls TEXT,                      -- JSON: [url, ...]
  auto_collected INTEGER DEFAULT 1,
  created_at TEXT
);

-- ==================== GROUP 13: STUDENT CLASSROOM (6) ====================
-- ระบบห้องเรียนออนไลน์คล้าย Google Classroom แต่ built-in + ดีกว่า
CREATE TABLE classroom_posts (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  subject_classroom_id TEXT NOT NULL,  -- วิชา+ห้อง ของเทอมนี้
  post_type TEXT NOT NULL CHECK(post_type IN ('announcement','material','assignment','quiz','poll','discussion')),
  title TEXT NOT NULL,
  content TEXT,                        -- HTML content (sanitized)
  attachments TEXT,                    -- JSON: [{name,url,mime_type,size}]
  is_pinned INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  scheduled_at TEXT,                   -- NULL = post now, otherwise schedule
  due_date TEXT,                       -- for assignments/quizzes
  max_score REAL,                      -- for assignments
  test_id TEXT,                        -- link to tests table (for quiz post_type)
  allow_late INTEGER DEFAULT 0,
  late_penalty_percent REAL DEFAULT 0, -- e.g. 10 = -10% per day
  poll_options TEXT,                   -- JSON: [{text,votes:0}] for poll type
  sort_order INTEGER,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,               -- link to classroom_posts
  teacher_id TEXT NOT NULL,
  assignment_type TEXT CHECK(assignment_type IN ('file_upload','text_entry','url_link','audio_record','mixed')),
  rubric_id TEXT,                      -- link to assessment_tools for rubric grading
  group_assignment INTEGER DEFAULT 0,
  max_file_size_mb INTEGER DEFAULT 10,
  allowed_file_types TEXT,             -- JSON: ['pdf','docx','jpg','mp3','mp4'] or NULL=all
  instructions_detail TEXT,            -- extended instructions (Markdown)
  created_at TEXT
);
CREATE TABLE assignment_submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  submission_text TEXT,                -- for text_entry
  submission_url TEXT,                 -- for url_link
  file_urls TEXT,                      -- JSON: [{name,url,mime_type,size}]
  audio_url TEXT,                      -- for audio recording
  status TEXT DEFAULT 'submitted' CHECK(status IN ('draft','submitted','returned','graded')),
  score REAL,
  max_score REAL,
  rubric_scores TEXT,                  -- JSON: {criterion_id: score} if rubric grading
  feedback TEXT,
  feedback_audio_url TEXT,             -- voice feedback from teacher
  graded_at TEXT,
  submitted_at TEXT,
  resubmitted_at TEXT,
  attempt_count INTEGER DEFAULT 1,
  is_late INTEGER DEFAULT 0,
  late_days REAL DEFAULT 0
);
CREATE TABLE quiz_attempts (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  post_id TEXT,                        -- link to classroom_posts (NULL if standalone)
  student_id TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  answers TEXT,                        -- JSON: {question_id: {answer, is_correct, score}}
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
CREATE TABLE post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,               -- teacher or student
  user_role TEXT CHECK(user_role IN ('teacher','student')),
  parent_comment_id TEXT,              -- NULL = top-level, otherwise reply
  content TEXT NOT NULL,
  attachments TEXT,                    -- JSON: [{name,url}]
  is_private INTEGER DEFAULT 0,        -- private comment to teacher only
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE student_notifications (
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
```

---

## 4. AI Router — 22 Prompt Templates

### Router Logic (`functions/_helpers.js`)
```
async function callAI(promptTemplate, context, userInput) {
  const systemPrompt = PROMPTS[promptTemplate].system;
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildContext(context) + "\n\n" + userInput }
  ];

  try {
    return await callGemini(messages);     // Free, primary
  } catch {
    try {
      return await callGroq(messages);     // Free, fallback
    } catch {
      throw new Error("AI unavailable");
    }
  }
}
// OpenAI GPT-4o Vision: only for image analysis (separate function)
```

### Prompt Template Structure
```javascript
const PROMPTS = {
  course_structure: {
    system: "คุณเป็นผู้เชี่ยวชาญหลักสูตรดนตรี ตอบภาษาไทย ใช้ศัพท์ราชการ ใช้เฉพาะข้อมูลที่ให้ ห้ามแต่งเพิ่ม",
    contextBuilder: (data) => `ตัวชี้วัด: ${data.indicators}\nจำนวนชม.: ${data.hours}`
  },
  lesson_plan: {
    system: "คุณเป็นผู้เชี่ยวชาญแผนการสอนดนตรี...",
    contextBuilder: (data) => `ตัวชี้วัด: ...\nเนื้อหา: ...\nรูปแบบ: ...\nขั้นตอน: ...`
  },
  // ... 22 templates total
};
```

### Quick AI (8 tasks) — 1-click
| # | Module | Input → Output |
|---|--------|---------------|
| 4 | ขัดเกลาบันทึกหลังสอน | ข้อความดิบ → ภาษาราชการ |
| 8 | วิเคราะห์ข้อสอบ | คำตอบนร. → IOC+จำแนก+ความยาก |
| 9 | วิเคราะห์ผลเกรด | คะแนนห้อง → สรุป+จุดแข็ง/อ่อน |
| 10 | Early Warning | คะแนน+attendance+SDQ → สีเสี่ยง |
| 11 | วิเคราะห์ SDQ | 5 subscales → interpretation |
| 18 | ขัดเกลาเยี่ยมบ้าน | ข้อความดิบ → ภาษาราชการ |
| 19 | Quick Drop categorize | ไฟล์/ข้อความ → หมวดหมู่+module links |
| 21 | Completeness Check | ข้อมูล form → ครบ/ไม่ครบ+แนะนำ |

### Chat AI (14 tasks) — Interactive conversation
| # | Module |
|---|--------|
| 1 | ร่างโครงสร้างรายวิชา |
| 2 | ร่างแผนการสอน |
| 3 | แนะนำรูปแบบสอน |
| 5 | PDCA แนะนำปรับปรุง |
| 6 | สร้าง Rubric |
| 7 | สร้างข้อสอบ |
| 12 | ช่วยเขียนวิจัย |
| 13 | ร่าง SAR |
| 14 | ร่าง PA1 |
| 15 | จัด Evidence PA2 |
| 16 | เขียนนวัตกรรม |
| 17 | ร่างเอกสารราชการ |
| 20 | คศ.4 Readiness |
| 22 | แนะนำปก |

### AI Panel UI (`js/ai-panel.js`)
```javascript
// AI Side Panel state
const aiPanel = {
  mode: null,        // 'quick' or 'chat'
  promptTemplate: null,
  context: {},
  messages: [],      // Chat history (sent every call)

  open(template, context, mode) { ... },
  sendMessage(userInput) {
    this.messages.push({ role: 'user', content: userInput });
    const response = await api.post('/api/ai', {
      template: this.promptTemplate,
      context: this.context,
      messages: this.messages
    });
    this.messages.push({ role: 'assistant', content: response });
    this.renderResponse(response);
  },
  useResult() { ... },     // ✅ เติมลงฟอร์ม
  regenerate() { ... },    // 🔄 ร่างใหม่ (reset messages)
  requestEdit(instruction) { ... }, // 💬 ขอแก้เฉพาะจุด
  close() { this.messages = []; }   // ❌ ปิด+clear
};
```

---

## 5. Auth Flow

### Login
```
POST /api/auth/login  { username, password }
→ PBKDF2(password, user.salt, 100000, 256, 'SHA-256')
→ check status: pending → 403 "รอการอนุมัติจากแอดมิน", rejected → 403 "ถูกปฏิเสธ"
→ compare hash → create session token → return { token, role, displayName, isAdmin }
```

### Session Check (Middleware)
```
_middleware.js:
  Authorization: Bearer <token>
  → SELECT * FROM sessions JOIN users WHERE token=? AND expires_at>?
  → check teacher status !== 'active' → 403
  → attach user to env.user (id, role, displayName, sessionId, isAdmin, status)
  → continue or 401
```

### Teacher Registration & Approval
```
1. First teacher: POST /api/setup → is_admin=1, status='active' (becomes admin)
2. Subsequent teachers: POST /api/auth/register-teacher { username, password, display_name }
   → status='pending', is_admin=0 → message "รอแอดมินอนุมัติ"
3. Admin approves: POST /api/admin/approve/:id → status='active'
4. Admin rejects: POST /api/admin/reject/:id → status='rejected'
5. Admin deletes: DELETE /api/admin/teachers/:id → removes user + sessions
```

### Student Registration
```
1. POST /api/auth/register-student { student_code, classroom, student_number, first_name, last_name, nickname, password }
2. Match: SELECT FROM students WHERE student_code=? AND classroom matches AND student_number=?
3. If match → create user + link students.user_id → return token
4. If no match → 404 "ไม่พบข้อมูลนักเรียน"
```

---

## 6. Export Implementation (`js/export.js`)

```javascript
const Exporter = {
  async toPDF(title, data, options) {
    // jsPDF + AutoTable
    // Thai font: THSarabunNew (embed base64)
    // A4 portrait, margins, headers/footers
  },
  async toWord(title, data, template) {
    // docx.js — government form formatting
    // TH Sarabun New font, correct margins
  },
  async toExcel(title, data, options) {
    // SheetJS — styled cells, colors, formulas
  },
  toCSV(data) {
    // UTF-8 BOM + comma separated
  },
  async toGoogleSheets(title, data) {
    // Google Sheets API v4
  },
  async toGoogleDocs(title, data) {
    // Google Docs API v1
  },
  print(elementId) {
    // window.print() with print stylesheet
  }
};
```

---

## 7. Key Indexes (64 total)

```sql
-- Auth
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Core composite (most common queries)
CREATE INDEX idx_sc_sem ON subject_classrooms(semester_id);
CREATE INDEX idx_sc_teacher_sem ON subject_classrooms(teacher_id, semester_id);
CREATE INDEX idx_att_sem_cls_date ON attendance_records(semester_id, classroom_id, date);
CREATE INDEX idx_scores_stu_sub_sem ON scores(student_id, subject_id, semester_id);
CREATE INDEX idx_scores_sem_cls ON scores(semester_id, classroom_id);
CREATE INDEX idx_traits_stu_sem ON trait_scores(student_id, semester_id);
CREATE INDEX idx_lp_teacher_sem ON lesson_plans(teacher_id, semester_id);

-- Evidence & Cross-links
CREATE INDEX idx_evidence_teacher_sem ON evidence_pool(teacher_id, semester_id);
CREATE INDEX idx_evidence_source ON evidence_pool(source_module, source_id);
CREATE INDEX idx_evidence_pa ON evidence_pool(pa_category);
CREATE INDEX idx_crosslinks_source ON cross_links(source_module, source_id);
CREATE INDEX idx_crosslinks_target ON cross_links(target_module, target_id);

-- Teaching
CREATE INDEX idx_cs_sc ON course_structures(subject_classroom_id);
CREATE INDEX idx_lu_cs ON learning_units(course_structure_id);
CREATE INDEX idx_pln_teacher ON post_lesson_notes(teacher_id);
CREATE INDEX idx_pln_lesson ON post_lesson_notes(lesson_plan_id);

-- Students
CREATE INDEX idx_stu_teacher ON students(teacher_id);
CREATE INDEX idx_stucls_stu ON student_classrooms(student_id);
CREATE INDEX idx_stucls_cls_sem ON student_classrooms(classroom_id, semester_id);

-- Research, PA, SAR
CREATE INDEX idx_research_teacher ON researches(teacher_id, semester_id);
CREATE INDEX idx_pa_teacher_year ON pa_agreements(teacher_id, academic_year);
CREATE INDEX idx_sar_teacher ON sar_reports(teacher_id, semester_id);

-- Student Care
CREATE INDEX idx_hv_student ON home_visits(student_id);
CREATE INDEX idx_sdq_student ON sdq_screenings(student_id, semester_id);
CREATE INDEX idx_care_student ON care_records(student_id, semester_id);
CREATE INDEX idx_alerts_teacher ON student_alerts(teacher_id, semester_id);
CREATE INDEX idx_alerts_risk ON student_alerts(risk_level);

-- Portfolio, Awards, LogBook
CREATE INDEX idx_portfolio_teacher ON portfolio_items(teacher_id);
CREATE INDEX idx_awards_teacher ON awards(teacher_id, academic_year);
CREATE INDEX idx_log_teacher_sem ON log_entries(teacher_id, semester_id);
CREATE INDEX idx_log_category ON log_entries(category);
CREATE INDEX idx_plc_teacher ON plc_records(teacher_id, semester_id);

-- Notifications
CREATE INDEX idx_notif_teacher ON notifications(teacher_id, is_read);
CREATE INDEX idx_notif_expires ON notifications(expires_at);

-- Quick Drops
CREATE INDEX idx_qd_teacher ON quick_drops(teacher_id);
CREATE INDEX idx_qd_status ON quick_drops(status);

-- Drive
CREATE INDEX idx_drive_teacher ON drive_files(teacher_id);
CREATE INDEX idx_drive_module ON drive_files(module, related_id);

-- Music
CREATE INDEX idx_instr_teacher ON instruments(teacher_id);
CREATE INDEX idx_reh_activity ON rehearsals(activity_id, semester_id);
CREATE INDEX idx_perf_activity ON performances(activity_id, semester_id);

-- Work Hours
CREATE INDEX idx_wh_teacher_sem ON work_hours(teacher_id, semester_id);
CREATE INDEX idx_wh_category ON work_hours(category);

-- Student Classroom
CREATE INDEX idx_cposts_sc ON classroom_posts(subject_classroom_id);
CREATE INDEX idx_cposts_teacher ON classroom_posts(teacher_id, post_type);
CREATE INDEX idx_cposts_due ON classroom_posts(due_date);
CREATE INDEX idx_asub_assignment ON assignment_submissions(assignment_id, student_id);
CREATE INDEX idx_asub_status ON assignment_submissions(status);
CREATE INDEX idx_quiz_test_student ON quiz_attempts(test_id, student_id);
CREATE INDEX idx_pcomments_post ON post_comments(post_id);
CREATE INDEX idx_snotif_student ON student_notifications(student_id, is_read);
CREATE INDEX idx_snotif_expires ON student_notifications(expires_at);
```

---

## 8. Seed Data

```sql
-- =========================================================
-- 15 Lesson Models (is_preset = 1)
-- =========================================================
INSERT INTO lesson_models (id, name, name_en, category, steps_template, is_preset, created_by) VALUES
('lm-001','5E','Five E','active_learning','[{"step":"Engage","label":"กระตุ้นความสนใจ"},{"step":"Explore","label":"สำรวจค้นหา"},{"step":"Explain","label":"อธิบาย"},{"step":"Elaborate","label":"ขยายความรู้"},{"step":"Evaluate","label":"ประเมินผล"}]',1,NULL),
('lm-002','5 STEPs','Five Steps','active_learning','[{"step":"Stimulus","label":"กระตุ้น"},{"step":"Think","label":"คิด"},{"step":"Evaluate","label":"ประเมิน"},{"step":"Practice","label":"ปฏิบัติ"},{"step":"Summary","label":"สรุป"}]',1,NULL),
('lm-003','CIPPA','CIPPA Model','active_learning','[{"step":"Construct","label":"สร้างความรู้"},{"step":"Interaction","label":"ปฏิสัมพันธ์"},{"step":"Physical Participation","label":"มีส่วนร่วมทางกาย"},{"step":"Process Learning","label":"เรียนรู้กระบวนการ"},{"step":"Application","label":"ประยุกต์ใช้"}]',1,NULL),
('lm-004','TGT','Team-Games-Tournament','cooperative','[{"step":"สอนเนื้อหา","label":"นำเสนอ"},{"step":"ทีมศึกษา","label":"กลุ่มเรียนรู้"},{"step":"แข่งขัน","label":"เกมทัวร์นาเมนต์"},{"step":"คะแนนทีม","label":"รวมคะแนน"},{"step":"ยกย่อง","label":"ให้รางวัล"}]',1,NULL),
('lm-005','STAD','Student Teams-Achievement Divisions','cooperative','[{"step":"นำเสนอเนื้อหา","label":"สอน"},{"step":"ทีมศึกษา","label":"กลุ่มเรียนรู้"},{"step":"ทดสอบย่อย","label":"สอบรายบุคคล"},{"step":"คะแนนพัฒนาการ","label":"คำนวณ"},{"step":"ยกย่องทีม","label":"ให้รางวัล"}]',1,NULL),
('lm-006','Jigsaw','Jigsaw','cooperative','[{"step":"กลุ่มบ้าน","label":"แบ่งกลุ่ม"},{"step":"กลุ่มผู้เชี่ยวชาญ","label":"ศึกษาเนื้อหา"},{"step":"กลับกลุ่มบ้าน","label":"สอนเพื่อน"},{"step":"ทดสอบ","label":"ประเมิน"},{"step":"รวมคะแนน","label":"สรุป"}]',1,NULL),
('lm-007','PBL-Problem','Problem-Based Learning','inquiry','[{"step":"ปัญหา","label":"เผชิญปัญหา"},{"step":"วิเคราะห์","label":"วิเคราะห์ปัญหา"},{"step":"ค้นคว้า","label":"รวบรวมข้อมูล"},{"step":"สังเคราะห์","label":"สังเคราะห์คำตอบ"},{"step":"สรุป","label":"สรุปและประเมิน"}]',1,NULL),
('lm-008','PBL-Project','Project-Based Learning','inquiry','[{"step":"ระบุปัญหา","label":"คำถามนำ"},{"step":"วางแผน","label":"ออกแบบโครงงาน"},{"step":"ดำเนินการ","label":"ลงมือทำ"},{"step":"นำเสนอ","label":"เผยแพร่ผลงาน"},{"step":"ประเมิน","label":"สะท้อนผล"}]',1,NULL),
('lm-009','Inquiry','Inquiry-Based Learning','inquiry','[{"step":"สังเกต","label":"ตั้งคำถาม"},{"step":"ตั้งสมมติฐาน","label":"คาดคะเน"},{"step":"รวบรวมข้อมูล","label":"ทดลอง/ค้นคว้า"},{"step":"วิเคราะห์","label":"ตีความข้อมูล"},{"step":"สรุปผล","label":"ลงข้อสรุป"}]',1,NULL),
('lm-010','Flipped','Flipped Classroom','blended','[{"step":"ก่อนเรียน","label":"ดูวิดีโอ/อ่านเนื้อหา"},{"step":"เข้าห้องเรียน","label":"ซักถาม/อภิปราย"},{"step":"ปฏิบัติ","label":"ทำกิจกรรม"},{"step":"ขยายผล","label":"ต่อยอดความรู้"},{"step":"ประเมิน","label":"วัดผล"}]',1,NULL),
('lm-011','Direct','Direct Instruction','traditional','[{"step":"ทบทวน","label":"ทบทวนความรู้เดิม"},{"step":"นำเสนอ","label":"สอนเนื้อหาใหม่"},{"step":"ฝึกร่วม","label":"ฝึกปฏิบัติร่วมกัน"},{"step":"ฝึกเดี่ยว","label":"ฝึกปฏิบัติด้วยตนเอง"},{"step":"สรุป","label":"สรุปบทเรียน"}]',1,NULL),
('lm-012','Active','Active Learning','active_learning','[{"step":"กระตุ้น","label":"สร้างแรงจูงใจ"},{"step":"สำรวจ","label":"เรียนรู้ด้วยตนเอง"},{"step":"อภิปราย","label":"แลกเปลี่ยนเรียนรู้"},{"step":"ปฏิบัติ","label":"ลงมือทำ"},{"step":"สะท้อน","label":"สะท้อนการเรียนรู้"}]',1,NULL),
('lm-013','Kodaly','Kodály Method','music','[{"step":"เตรียม","label":"ร้องเพลง/เกม"},{"step":"นำเสนอ","label":"แนะนำแนวคิดใหม่"},{"step":"ฝึก","label":"ฝึกอ่าน/เขียนโน้ต"},{"step":"สร้าง","label":"แต่ง/ด้นสด"},{"step":"ประเมิน","label":"แสดง/ประเมิน"}]',1,NULL),
('lm-014','Orff','Orff Schulwerk','music','[{"step":"สำรวจ","label":"เสียง/จังหวะ/ร่างกาย"},{"step":"เลียนแบบ","label":"ทำตามแบบ"},{"step":"ด้นสด","label":"สร้างสรรค์"},{"step":"แต่ง","label":"ประพันธ์"},{"step":"แสดง","label":"นำเสนอผลงาน"}]',1,NULL),
('lm-015','Dalcroze','Dalcroze Eurhythmics','music','[{"step":"Eurhythmics","label":"เคลื่อนไหวตามจังหวะ"},{"step":"Solfège","label":"ร้องโน้ต"},{"step":"Improvisation","label":"ด้นสด"},{"step":"Integration","label":"บูรณาการ"},{"step":"Performance","label":"แสดง"}]',1,NULL);

-- =========================================================
-- 3 Trait Categories
-- =========================================================
INSERT INTO trait_categories (id, name, code, sort_order) VALUES
('tc-001','คุณลักษณะอันพึงประสงค์','desirable_traits',1),
('tc-002','สมรรถนะสำคัญของผู้เรียน','core_competencies',2),
('tc-003','การอ่าน คิดวิเคราะห์ และเขียน','read_think_write',3);

-- =========================================================
-- 16 Trait Items (8 + 5 + 3)
-- =========================================================
INSERT INTO trait_items (id, category_id, name, code, sort_order) VALUES
-- คุณลักษณะอันพึงประสงค์ 8 ข้อ
('ti-001','tc-001','รักชาติ ศาสน์ กษัตริย์','love_nation',1),
('ti-002','tc-001','ซื่อสัตย์สุจริต','honesty',2),
('ti-003','tc-001','มีวินัย','discipline',3),
('ti-004','tc-001','ใฝ่เรียนรู้','eager_to_learn',4),
('ti-005','tc-001','อยู่อย่างพอเพียง','sufficiency',5),
('ti-006','tc-001','มุ่งมั่นในการทำงาน','dedication',6),
('ti-007','tc-001','รักความเป็นไทย','thai_identity',7),
('ti-008','tc-001','มีจิตสาธารณะ','public_mind',8),
-- สมรรถนะสำคัญ 5 ข้อ
('ti-009','tc-002','ความสามารถในการสื่อสาร','communication',1),
('ti-010','tc-002','ความสามารถในการคิด','thinking',2),
('ti-011','tc-002','ความสามารถในการแก้ปัญหา','problem_solving',3),
('ti-012','tc-002','ความสามารถในการใช้ทักษะชีวิต','life_skills',4),
('ti-013','tc-002','ความสามารถในการใช้เทคโนโลยี','technology',5),
-- การอ่าน คิดวิเคราะห์ และเขียน 3 ข้อ
('ti-014','tc-003','การอ่าน','reading',1),
('ti-015','tc-003','การคิดวิเคราะห์','critical_thinking',2),
('ti-016','tc-003','การเขียน','writing',3);

-- =========================================================
-- Curriculum Indicators — สาระที่ 2 ดนตรี (หลักสูตรแกนกลาง 2551)
-- =========================================================
INSERT INTO curriculum_indicators (id, strand, code, grade_level, description) VALUES
-- ศ 2.1 ม.1
('ci-001','ศ 2.1','ศ 2.1 ม.1/1','ม.1','อ่าน เขียน ร้องโน้ตไทยและโน้ตสากล'),
('ci-002','ศ 2.1','ศ 2.1 ม.1/2','ม.1','เปรียบเทียบเสียงร้องและเสียงของเครื่องดนตรีที่มาจากวัฒนธรรมที่ต่างกัน'),
('ci-003','ศ 2.1','ศ 2.1 ม.1/3','ม.1','อ่าน เขียน ร้องโน้ตไทยและโน้ตสากลที่มีเครื่องหมายแปลงเสียง'),
('ci-004','ศ 2.1','ศ 2.1 ม.1/4','ม.1','ร้องเพลง เล่นดนตรีเดี่ยว และรวมวง'),
('ci-005','ศ 2.1','ศ 2.1 ม.1/5','ม.1','บรรยายอารมณ์ของเพลงที่ฟัง'),
('ci-006','ศ 2.1','ศ 2.1 ม.1/6','ม.1','ใช้เครื่องดนตรีบรรเลงประกอบการร้องเพลง ด้นสด ที่มีจังหวะและทำนองง่ายๆ'),
-- ศ 2.1 ม.2
('ci-007','ศ 2.1','ศ 2.1 ม.2/1','ม.2','เปรียบเทียบการใช้องค์ประกอบดนตรีที่มาจากวัฒนธรรมต่างกัน'),
('ci-008','ศ 2.1','ศ 2.1 ม.2/2','ม.2','อ่าน เขียน ร้องโน้ตไทยและโน้ตสากล ในอัตราจังหวะต่างๆ'),
('ci-009','ศ 2.1','ศ 2.1 ม.2/3','ม.2','ร้องเพลง เล่นดนตรีเดี่ยว และรวมวง โดยเน้นเทคนิคการแสดงออก'),
('ci-010','ศ 2.1','ศ 2.1 ม.2/4','ม.2','แต่งเพลงสั้นๆ ที่มีจังหวะและทำนองง่ายๆ'),
('ci-011','ศ 2.1','ศ 2.1 ม.2/5','ม.2','บรรยายเปรียบเทียบองค์ประกอบที่ใช้ในงานดนตรีและงานศิลปะอื่น'),
('ci-012','ศ 2.1','ศ 2.1 ม.2/6','ม.2','วิเคราะห์และอธิบายบทบาทของดนตรีในการสะท้อนแนวคิดและค่านิยมที่เปลี่ยนไปของคนในสังคม'),
-- ศ 2.2 ม.1
('ci-013','ศ 2.2','ศ 2.2 ม.1/1','ม.1','นำเสนอตัวอย่างเพลงที่ใช้ในโอกาสต่างๆ ของวัฒนธรรมไทยและสากล'),
('ci-014','ศ 2.2','ศ 2.2 ม.1/2','ม.1','บรรยายบทบาทและอิทธิพลของดนตรีในชีวิตประจำวัน'),
-- ศ 2.2 ม.2
('ci-015','ศ 2.2','ศ 2.2 ม.2/1','ม.2','อธิบายบทบาทของดนตรีในการสะท้อนแนวคิดและค่านิยมที่เปลี่ยนไปของคนในสังคม'),
('ci-016','ศ 2.2','ศ 2.2 ม.2/2','ม.2','นำเสนอตัวอย่างเพลงและดนตรีที่มาจากวัฒนธรรมต่างๆ');

-- =========================================================
-- 1 Default Grade Config (8 ระดับ)
-- =========================================================
INSERT INTO grade_configs (id, name, is_default, levels) VALUES
('gc-001','ระบบ 8 ระดับ (มัธยม)',1,'[{"grade":"4","label":"ดีเยี่ยม","min":80,"max":100},{"grade":"3.5","label":"ดีมาก","min":75,"max":79},{"grade":"3","label":"ดี","min":70,"max":74},{"grade":"2.5","label":"ค่อนข้างดี","min":65,"max":69},{"grade":"2","label":"น่าพอใจ","min":60,"max":64},{"grade":"1.5","label":"พอใช้","min":55,"max":59},{"grade":"1","label":"ผ่านเกณฑ์ขั้นต่ำ","min":50,"max":54},{"grade":"0","label":"ไม่ผ่าน","min":0,"max":49}]');

-- =========================================================
-- 12 Award Types (8 Tier1 + 3 Tier2 + 1 Tier3)
-- =========================================================
INSERT INTO award_types (id, name, tier, icon, sort_order) VALUES
('at-001','เหรียญทอง','tier1','🥇',1),
('at-002','เหรียญเงิน','tier1','🥈',2),
('at-003','เหรียญทองแดง','tier1','🥉',3),
('at-004','ชนะเลิศ','tier1','🏆',4),
('at-005','รองชนะเลิศอันดับ 1','tier1','🏅',5),
('at-006','รองชนะเลิศอันดับ 2','tier1','🏅',6),
('at-007','ชมเชย','tier1','📜',7),
('at-008','เข้าร่วม','tier1','📋',8),
('at-009','ครูผู้สอนดีเด่น','tier2','⭐',9),
('at-010','ครูต้นแบบ','tier2','🌟',10),
('at-011','รางวัลระดับภาค','tier2','🎖️',11),
('at-012','รางวัลระดับชาติ','tier3','👑',12);
```

---

## 9. Security Checklist

- [ ] PBKDF2 with 100,000 iterations + unique salt per user
- [ ] Session tokens: UUID v4, expire after 7 days
- [ ] All D1 queries: `.prepare().bind()` (no string concat)
- [ ] All user input: `DOMPurify.sanitize()` before render
- [ ] CSP headers in `_middleware.js`
- [ ] API keys (AI, Drive) stored in Cloudflare env vars (server-only)
- [ ] PDPA: consent before collecting location/photo/health data
- [ ] AI: anonymized data only (no student names/IDs sent)
- [ ] Google Drive: OAuth2 private scope only
- [ ] Rate limit: AI Router queue + response cache

---

## 10. Configurable Tables (NO HARDCODE)

| What | Table | Settings UI |
|------|-------|-------------|
| วิชา/รหัส | `subjects` | เพิ่ม/แก้/ลบ วิชา |
| ห้องเรียน | `classrooms` | เพิ่ม/แก้ ม.1/1~ม.2/10 |
| ชุมนุม/วง | `activities` + `activity_positions` | ชื่อ+ตำแหน่ง |
| รูปแบบสอน | `lesson_models` | 15 preset + custom |
| ตัวชี้วัด | `curriculum_indicators` | เพิ่ม/แก้ตาม หลักสูตร |
| ระบบเกรด | `grade_configs` | 8ระดับ / ผ-มผ / custom |
| คุณลักษณะ | `trait_categories` + `trait_items` | 8+5+3 = 16 |
| ประเภทรางวัล | `award_types` | 12 รายการ + เพิ่มได้ |
| ประเภทเอกสาร | `document_types` | template+form structure |
| ข้อมูลรน. | `app_settings` (school_*) | ชื่อ/ที่อยู่/ผอ./logo |
| ข้อมูลครู | `teacher_profiles` | ชื่อ/ตำแหน่ง/คศ. |
| โพสต์ห้องเรียน | `classroom_posts` | ประกาศ/สื่อ/งาน/quiz/poll/อภิปราย |

---

## 11. Implementation Order

### Phase Map — 25 Phases

| # | ชื่อ Phase | กลุ่ม | โมดูลหลัก |
|---|-----------|-------|-----------|
| 1 | โครงสร้างระบบ | A | Auth · teacher_profiles · app_settings · semesters · subjects · classrooms · students · seed data |
| 2 | ติดตามรางวัล | D | award_types · awards · checklist + timeline |
| 3 | Dashboard คศ.4 | C | Readiness widget · progress bars · AI summary |
| 4 | ปฏิทิน + ตารางสอน | D | calendar_events · work_hours · schedule view |
| 5 | โครงสร้างรายวิชา | A | course_structures · learning_units · AI ช่วยร่าง |
| 6 | แผนการสอน | A | lesson_plans · 15 รูปแบบ · lesson_models · AI ช่วยร่าง |
| 7 | บันทึกหลังสอน | A | post_lesson_notes · AI ขัดเกลา · Evidence auto-collect |
| 8 | Rubric + Assessment | B | assessment_tools · rubric_criteria |
| 9 | Pre/Post-Test | B | tests · test_questions · test_responses · AI สร้างข้อสอบ + IOC |
| 10 | คะแนน + เกรด + ปพ.5 | B | scores · grade_results · grade_configs · ปพ.5 export |
| 11 | Analytics + Early Warning | D | student_alerts · AI risk scoring · Charts (Chart.js) |
| 12 | วิจัยในชั้นเรียน | C | researches · research_cycles · AI ช่วยเขียน |
| 13 | SAR | D | sar_reports · AI ช่วยร่าง |
| 14 | PA | C | pa_agreements (PA1) · pa_results (PA2) · evidence_pool · AI จัด evidence |
| 15 | นวัตกรรม | E | innovations · publication tracking |
| 16 | PLC | E | plc_records · hours tracking · evidence_urls |
| 17 | Log Book | C | log_entries · ชั่วโมงสอน/สนับสนุน/อื่นๆ |
| 18 | Portfolio | E | portfolio_items · Google Drive · is_featured |
| 19 | เอกสารราชการ | E | documents · document_types · 28 templates · AI ช่วยกรอก |
| 20 | Quick Drop + วัสดุ | E | quick_drops · AI categorize · classroom_materials |
| 21 | เครื่องดนตรี | E | instruments · rehearsals · performances |
| 22 | Student Classroom | F | student.html · classroom_posts · assignments · quiz_attempts · ห้องเรียนออนไลน์ · แบบทดสอบ 9 รูปแบบ · ตรวจ+ให้คะแนน · ชุมนุม · วงสตริง |
| 23 | งานประจำชั้น | E | homeroom_assignments · sdq_screenings · home_visits · care_records · iep_plans |
| 24 | ปกเอกสาร | E | cover_templates · design_data · preview · PDF |
| 25 | ระบบ | E | attendance_zones · GPS check-in · notifications · backups · offline sync |

### ลำดับการพัฒนา

```
Group A (ทำก่อนสุด — ภาระงานสอน + evidence คศ.4):
  Phase 1 → 5 → 6 → 7

Group B (วัดและประเมินผล):
  Phase 10 → 9 → 8

Group C (PA + วิจัย + ชั่วโมง):
  Phase 14 → 12 → 17 → 3

Group D (เสริมแกร่ง):
  Phase 4 → 11 → 13 → 2

Group E (เต็มระบบ):
  Phase 15 → 16 → 18 → 23 → 19 → 20 → 24 → 25 → 21

Group F (Classroom นักเรียน):
  Phase 22
```

---

## 12. Reference Files

| Resource | Path |
|----------|------|
| Reference project | `D:\AI CURSER\Note Chord SoulCiety` |
| OpenAI API key | `D:\AI CURSER\ตรวจงาน\.env` |
| Form templates (28) | `D:\AI Vs Programe\Krumum\เอกสาร\` |
| Google Drive root | `https://drive.google.com/drive/folders/1NE_KC6zWdyaURFMmLVRw1aXXD-dWede0` |
| DB column schema | Section 3.1 ในไฟล์นี้ |
| Phase Map | Section 11 ในไฟล์นี้ |
| AI Prompts | Section 4 ในไฟล์นี้ |

---

## 13. API Endpoint Map

> Pattern: `Authorization: Bearer <token>` ทุก request (ยกเว้น /api/auth/login, /api/auth/register-student, /api/auth/register-teacher)
> Response: `{ success: true, data: {...} }` หรือ `{ success: false, error: "..." }`

| Endpoint | GET | POST | PUT | DELETE |
|----------|-----|------|-----|--------|
| `/api/auth/login` | — | `{username,password}` → `{token,role,displayName,isAdmin}` | — | — |
| `/api/auth/logout` | — | ✓ | — | — |
| `/api/auth/me` | ✓ profile (incl. is_admin, status) | — | — | — |
| `/api/auth/register-student` | — | `{student_code,classroom,student_number,first_name,last_name,password}` | — | — |
| `/api/auth/register-teacher` | — | `{username,password,display_name}` → pending approval | — | — |
| `/api/auth/change-password` | — | `{old_password,new_password}` | — | — |
| `/api/setup` | — | `{username,password,display_name}` → first teacher (admin) | — | — |
| `/api/admin/pending-teachers` | ✓ list pending | — | — | — |
| `/api/admin/teachers` | ✓ list all teachers | — | — | — |
| `/api/admin/approve/:id` | — | ✓ approve teacher | — | — |
| `/api/admin/reject/:id` | — | ✓ reject teacher | — | — |
| `/api/admin/teachers/:id` | — | — | — | ✓ remove teacher |
| `/api/settings` | ✓ all keys | — | `{key:value,...}` bulk upsert | — |
| `/api/semesters` | ✓ list | ✓ create | — | — |
| `/api/semesters/:id` | ✓ | — | ✓ | ✓ |
| `/api/semesters/:id/activate` | — | ✓ set active | — | — |
| `/api/subjects` | ✓ `?type=` | ✓ | — | — |
| `/api/subjects/:id` | ✓ | — | ✓ | ✓ |
| `/api/classrooms` | ✓ `?grade=` | ✓ | — | — |
| `/api/classrooms/:id` | ✓ | — | ✓ | ✓ |
| `/api/subject-classrooms` | ✓ `?semester_id=` | ✓ | — | ✓ |
| `/api/students` | ✓ `?classroom_id=&semester_id=` | ✓ | — | — |
| `/api/students/:id` | ✓ | — | ✓ | ✓ |
| `/api/students/import` | — | ✓ CSV bulk import | — | — |
| `/api/student-parents/:student_id` | ✓ | ✓ | ✓ | — |
| `/api/activities` | ✓ | ✓ | — | — |
| `/api/activities/:id` | ✓ | — | ✓ | ✓ |
| `/api/activity-members` | ✓ `?activity_id=` | ✓ | — | ✓ |
| `/api/course-structures` | ✓ `?subject_classroom_id=` | ✓ | — | — |
| `/api/course-structures/:id` | ✓ | — | ✓ | ✓ |
| `/api/learning-units` | ✓ `?course_structure_id=` | ✓ | — | — |
| `/api/learning-units/:id` | — | — | ✓ | ✓ |
| `/api/lesson-plans` | ✓ `?semester_id=&unit_id=` | ✓ | — | — |
| `/api/lesson-plans/:id` | ✓ | — | ✓ | ✓ |
| `/api/lesson-plans/:id/lock` | — | ✓ | — | — |
| `/api/post-lesson-notes` | ✓ `?lesson_plan_id=` | ✓ | — | — |
| `/api/post-lesson-notes/:id` | ✓ | — | ✓ | — |
| `/api/assessment-tools` | ✓ `?subject_id=` | ✓ | — | — |
| `/api/assessment-tools/:id` | ✓ | — | ✓ | ✓ |
| `/api/tests` | ✓ `?subject_id=&type=` | ✓ | — | — |
| `/api/tests/:id` | ✓ with questions | — | ✓ | ✓ |
| `/api/test-responses` | ✓ `?test_id=` | ✓ submit | — | — |
| `/api/test-responses/grade` | — | ✓ auto-grade | — | — |
| `/api/scores` | ✓ `?classroom_id=&semester_id=` | ✓ | — | — |
| `/api/scores/bulk` | — | ✓ `[{student_id,score,...}]` | — | — |
| `/api/scores/:id` | — | — | ✓ | ✓ |
| `/api/trait-scores` | ✓ `?student_id=&semester_id=` | — | ✓ bulk upsert | — |
| `/api/grade-results` | ✓ `?classroom_id=&semester_id=` | — | ✓ | — |
| `/api/grade-results/compute` | — | ✓ `{classroom_id,semester_id}` recalculate | — | — |
| `/api/attendance` | ✓ `?classroom_id=&date=` | ✓ | ✓ | — |
| `/api/attendance/bulk` | — | ✓ `[{student_id,status,...}]` | — | — |
| `/api/attendance/gps` | — | ✓ `{lat,lng,classroom_id}` → match zone | — | — |
| `/api/calendar` | ✓ `?semester_id=` | ✓ | — | — |
| `/api/calendar/:id` | — | — | ✓ | ✓ |
| `/api/work-hours` | ✓ `?semester_id=&category=` | ✓ | — | — |
| `/api/work-hours/:id` | — | — | ✓ | ✓ |
| `/api/researches` | ✓ | ✓ | — | — |
| `/api/researches/:id` | ✓ | — | ✓ | ✓ |
| `/api/research-cycles` | ✓ `?research_id=` | ✓ | ✓ | — |
| `/api/pa` | ✓ `?academic_year=` | ✓ PA1 | — | — |
| `/api/pa/:id` | ✓ | — | ✓ PA1/PA2 | — |
| `/api/pa/:id/submit` | — | ✓ | — | — |
| `/api/sar` | ✓ | ✓ | — | — |
| `/api/sar/:id` | ✓ | — | ✓ | — |
| `/api/innovations` | ✓ | ✓ | — | — |
| `/api/innovations/:id` | ✓ | — | ✓ | ✓ |
| `/api/plc` | ✓ `?semester_id=` | ✓ | — | — |
| `/api/plc/:id` | — | — | ✓ | ✓ |
| `/api/log-entries` | ✓ `?semester_id=&category=` | ✓ | — | — |
| `/api/log-entries/:id` | — | — | ✓ | ✓ |
| `/api/portfolio` | ✓ `?category=` | ✓ | — | — |
| `/api/portfolio/:id` | — | — | ✓ | ✓ |
| `/api/awards` | ✓ `?academic_year=` | ✓ | — | — |
| `/api/awards/:id` | — | — | ✓ | ✓ |
| `/api/award-types` | ✓ | ✓ | — | — |
| `/api/home-visits` | ✓ `?student_id=` | ✓ | — | — |
| `/api/home-visits/:id` | ✓ | — | ✓ | — |
| `/api/sdq` | ✓ `?student_id=&semester_id=` | ✓ | — | — |
| `/api/care-records` | ✓ `?student_id=&semester_id=` | ✓ | — | — |
| `/api/iep-plans` | ✓ `?student_id=` | ✓ | ✓ | — |
| `/api/documents` | ✓ `?type=` | ✓ | — | — |
| `/api/documents/:id` | ✓ | — | ✓ | ✓ |
| `/api/cover-templates` | ✓ | ✓ | ✓ | — |
| `/api/instruments` | ✓ `?condition=` | ✓ | — | — |
| `/api/instruments/:id` | — | — | ✓ | ✓ |
| `/api/rehearsals` | ✓ `?activity_id=` | ✓ | — | — |
| `/api/performances` | ✓ `?activity_id=` | ✓ | ✓ | — |
| `/api/quick-drops` | ✓ `?status=` | ✓ | ✓ link | ✓ |
| `/api/classroom-materials` | ✓ `?subject_id=` | ✓ | ✓ | ✓ |
| `/api/notifications` | ✓ `?unread=1` | — | ✓ `{is_read:true}` | ✓ |
| `/api/backups` | ✓ | ✓ trigger manual | — | — |
| `/api/evidence-pool` | ✓ `?semester_id=&pa_category=` | — | — | — |
| `/api/student-alerts` | ✓ `?risk_level=` | — | ✓ resolve | — |
| `/api/student-alerts/generate` | — | ✓ `{semester_id}` run AI scoring | — | — |
| `/api/ai` | — | ✓ `{template,context,messages}` → AI response | — | — |
| `/api/drive` | ✓ list files | ✓ upload | — | ✓ |
| `/api/lesson-models` | ✓ | ✓ | — | — |
| `/api/lesson-models/:id` | — | — | ✓ | ✓ |
| `/api/curriculum-indicators` | ✓ `?strand=&grade=` | ✓ | — | — |
| `/api/curriculum-indicators/:id` | — | — | ✓ | ✓ |
| `/api/grade-configs` | ✓ | ✓ | — | — |
| `/api/grade-configs/:id` | — | — | ✓ | ✓ |
| `/api/trait-categories` | ✓ | ✓ | — | — |
| `/api/trait-categories/:id` | ✓ with items | — | ✓ | ✓ |
| `/api/trait-items` | — | ✓ | ✓ | ✓ |
| `/api/document-types` | ✓ | ✓ | — | — |
| `/api/document-types/:id` | — | — | ✓ | ✓ |
| `/api/pdpa-consents` | ✓ `?student_id=` | ✓ | ✓ | — |
| `/api/homeroom-assignments` | ✓ `?semester_id=` | ✓ | — | ✓ |
| `/api/attendance-zones` | ✓ `?classroom_id=` | ✓ | ✓ | ✓ |
| `/api/student-submissions` | ✓ `?lesson_plan_id=&student_id=` | ✓ | ✓ | ✓ |
| **Student Classroom — Teacher APIs** | | | | |
| `/api/classroom-posts` | ✓ `?subject_classroom_id=&type=` | ✓ | — | — |
| `/api/classroom-posts/:id` | ✓ | — | ✓ | ✓ |
| `/api/classroom-posts/:id/publish` | — | ✓ toggle | — | — |
| `/api/assignments` | ✓ `?post_id=` | ✓ | ✓ | — |
| `/api/assignment-submissions` | ✓ `?assignment_id=&student_id=` | — | — | — |
| `/api/assignment-submissions/:id/grade` | — | ✓ `{score,feedback}` | — | — |
| `/api/assignment-submissions/:id/return` | — | ✓ return for revision | — | — |
| `/api/assignment-submissions/bulk-grade` | — | ✓ `[{id,score,feedback}]` | — | — |
| `/api/quiz-attempts` | ✓ `?test_id=&student_id=` | — | — | — |
| `/api/quiz-attempts/:id/grade` | — | ✓ manual grade essay/audio | — | — |
| `/api/post-comments` | ✓ `?post_id=` | ✓ | ✓ | ✓ |
| **Student Classroom — Student APIs** | | | | |
| `/api/student/feed` | ✓ `?subject_classroom_id=` all posts for student | — | — | — |
| `/api/student/assignments/:post_id` | ✓ assignment detail + my submission | — | — | — |
| `/api/student/assignments/:post_id/submit` | — | ✓ `{text,files,url,audio}` | — | — |
| `/api/student/assignments/:post_id/resubmit` | — | ✓ | — | — |
| `/api/student/quizzes/:post_id/start` | — | ✓ → `{attempt_id, questions}` | — | — |
| `/api/student/quizzes/:attempt_id/submit` | — | ✓ `{answers}` → auto-grade | — | — |
| `/api/student/quizzes/:attempt_id/review` | ✓ review answers + feedback | — | — | — |
| `/api/student/grades` | ✓ `?semester_id=` my scores + grades | — | — | — |
| `/api/student/notifications` | ✓ `?unread=1` | — | ✓ mark read | — |
| `/api/student/comments/:post_id` | ✓ | ✓ add | — | – |
| `/api/student/profile` | ✓ | — | ✓ avatar + contact | — |
| `/api/drive/auth` | ✓ get auth URL | ✓ exchange code | — | — |

---

## 14. Evidence Auto-Collect Logic

### ทริกเกอร์ (functions/_helpers.js)

ทุก API endpoint ที่เขียนข้อมูลสำเร็จ → เรียก `autoCollectEvidence()` ก่อนส่ง response

```javascript
// functions/_helpers.js

const EVIDENCE_MAP = {
  post_lesson_notes: {
    type: 'teaching',
    pa_category: 'teaching_hours',
    getTitle: (d) => `บันทึกหลังสอน: ${d.lesson_title} (${d.date})`,
  },
  home_visits: {
    type: 'support',
    pa_category: 'support_hours',
    getTitle: (d) => `เยี่ยมบ้าน: ${d.student_name} (${d.visit_date})`,
  },
  plc_records: {
    type: 'other',
    pa_category: 'other_hours',
    getTitle: (d) => `PLC: ${d.topic} (${d.session_date})`,
  },
  researches: {
    type: 'research',
    pa_category: 'challenging_task',
    getTitle: (d) => `วิจัย: ${d.title}`,
    triggerOn: 'status_change_to_completed',  // ไม่ trigger ตอน draft
  },
  innovations: {
    type: 'innovation',
    pa_category: 'challenging_task',
    getTitle: (d) => `นวัตกรรม: ${d.title}`,
  },
  log_entries: {
    type: (d) => d.category,
    pa_category: (d) => `${d.category}_hours`,
    getTitle: (d) => `Log Book: ${d.description}`,
  },
  attendance_records: {
    // ไม่ collect evidence อัตโนมัติ — ใช้ sum hours แทน
    skip: true,
  },
};

export async function autoCollectEvidence(db, teacherId, semesterId, sourceModule, sourceId, data) {
  const config = EVIDENCE_MAP[sourceModule];
  if (!config || config.skip) return;

  const type   = typeof config.type === 'function' ? config.type(data) : config.type;
  const paCat  = typeof config.pa_category === 'function' ? config.pa_category(data) : config.pa_category;
  const title  = config.getTitle(data);

  // INSERT OR IGNORE ป้องกัน duplicate
  await db.prepare(`
    INSERT OR IGNORE INTO evidence_pool
      (id, teacher_id, semester_id, evidence_type, pa_category, title, source_module, source_id, auto_collected, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    crypto.randomUUID(), teacherId, semesterId,
    type, paCat, title, sourceModule, sourceId, new Date().toISOString()
  ).run();
}

export async function createCrossLink(db, teacherId, sourceModule, sourceId, targetModule, targetId, linkType = 'evidence') {
  await db.prepare(`
    INSERT OR IGNORE INTO cross_links
      (id, teacher_id, source_module, source_id, target_module, target_id, link_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), teacherId,
    sourceModule, sourceId, targetModule, targetId,
    linkType, new Date().toISOString()
  ).run();
}
```

### ตัวอย่างใน API endpoint (functions/api/post-lesson-notes.js)

```javascript
// POST /api/post-lesson-notes
const note = await db.prepare(`INSERT INTO post_lesson_notes ... VALUES (...)`).bind(...).run();

// Auto-collect evidence
await autoCollectEvidence(db, user.teacher_id, body.semester_id, 'post_lesson_notes', noteId, {
  lesson_title: lessonPlan.title,
  date: body.created_at,
});

// Cross-link กลับไปที่ lesson_plan
await createCrossLink(db, user.teacher_id, 'post_lesson_notes', noteId, 'lesson_plans', body.lesson_plan_id);
```

### PA2 — ดึง evidence มาจัดหมวด

```javascript
// POST /api/ai  template: 'pa_evidence_organizer'
// ดึง evidence_pool ของ semester นั้นมาทั้งหมด จัดเข้า PA categories
const evidence = await db.prepare(`
  SELECT * FROM evidence_pool
  WHERE teacher_id=? AND semester_id=? AND auto_collected=1
  ORDER BY pa_category, created_at
`).bind(teacherId, semesterId).all();

// ส่งให้ AI Router จัดหมวด+เขียนสรุป
// ผลลัพธ์ → pa_results.evidence_summary = JSON map by pa_category
```

---

## 15. wrangler.toml (Template)

```toml
name = "harmoni"
compatibility_date = "2024-01-01"
pages_build_output_dir = "./"

[[d1_databases]]
binding = "DB"
database_name = "harmoni-db"
database_id = "65e58e3f-bd2c-4333-b60c-c3a65a5d2460"

[vars]
GEMINI_API_KEY = ""
GROQ_API_KEY = ""
OPENAI_API_KEY = ""
GOOGLE_DRIVE_CLIENT_ID = ""
GOOGLE_DRIVE_CLIENT_SECRET = ""
SESSION_SECRET = ""
```

---

## 16. Student Classroom Module (ห้องเรียนออนไลน์)

> คล้าย Google Classroom แต่ built-in + ดีกว่า — ไม่ต้องเปิดแอปอื่น

### 16.1 Student Login + Auth

- **Register**: ครูสร้าง account ให้นร. หรือ นร.ลงทะเบียนเอง (`/api/auth/register-student`)
  - Required: `student_code` + `password` + ชื่อ-นามสกุล
  - ระบบจะเทียบกับ `students` table ว่ามีอยู่จริง → link `user_id`
  - Password: PBKDF2 เหมือนครู
- **Login**: `student_code + password` → session token (role=`student`)
- **Session**: เหมือนครู แต่ middleware เช็ค role → student เข้าถึง `/api/student/*` เท่านั้น

### 16.2 Student SPA (`student.html`)

**หน้าหลักของนักเรียน:**

| แท็บ | ชื่อ | รายละเอียด |
|-----|------|----------|
| 1 | หน้าหลัก (Feed) | โพสต์ทั้งหมดจากทุกวิชา เรียงใหม่สุด + filter ตามวิชา |
| 2 | งานที่ได้รับ | รายการงาน + due date + status (pending/submitted/graded) |
| 3 | แบบทดสอบ | รายการแบบทดสอบที่เปิดให้ทำ + กำลังทำอยู่ |
| 4 | คะแนนของฉัน | คะแนนทุกวิชา + เกรด + คุณลักษณะ |
| 5 | ชุมนุม/วงดนตรี | กิจกรรมที่เข้าร่วม + ตำแหน่ง |
| 6 | แจ้งเตือน | งานใหม่ + due ใกล้ + คะแนนออก |
| 7 | โปรไฟล์ | รูป + ข้อมูลส่วนตัว |

### 16.3 Quiz Engine — 9 รูปแบบคำถาม

| # | Type | รายละเอียด | Auto-grade? |
|---|------|----------|-------------|
| 1 | `multiple_choice` | 4 ตัวเลือก เลือก 1 ข้อ | ✓ |
| 2 | `multiple_select` | เลือกได้หลายข้อ (คะแนนบางส่วน partial credit) | ✓ |
| 3 | `true_false` | ถูก/ผิด | ✓ |
| 4 | `short_answer` | ตอบสั้น (เทียบกับคำตอบที่กำหนด, case-insensitive) | ✓ |
| 5 | `essay` | เขียนยาว rich text + file แนบ | ✗ ครูตรวจ |
| 6 | `matching` | จับคู่ ซ้าย-ขวา (drag-drop) | ✓ |
| 7 | `ordering` | เรียงลำดับ (drag-drop) | ✓ |
| 8 | `fill_blank` | เติมคำในช่องว่าง (ใช้ `___` เป็น placeholder) | ✓ |
| 9 | `audio_record` | อัดเสียงตอบ (เช่น ร้องเพลง, เล่นดนตรี, อ่านโน้ต) | ✗ ครูตรวจ |

### 16.4 Auto-Grade Logic

```javascript
// ตรวจอัตโนมัติ (functions/api/quiz-attempts.js)
function autoGrade(questions, answers) {
  let total = 0;
  const results = {};

  for (const q of questions) {
    const ans = answers[q.id];
    let score = 0;
    let isCorrect = false;

    switch (q.question_type) {
      case 'multiple_choice':
      case 'true_false':
        isCorrect = ans === q.correct_answer;
        score = isCorrect ? q.score : 0;
        break;

      case 'multiple_select':
        const correct = JSON.parse(q.correct_answer);
        const selected = Array.isArray(ans) ? ans : [];
        const correctCount = selected.filter(a => correct.includes(a)).length;
        const wrongCount = selected.filter(a => !correct.includes(a)).length;
        // Partial credit: +1 per correct, -0.5 per wrong, min 0
        score = Math.max(0, (correctCount - wrongCount * 0.5) / correct.length * q.score);
        isCorrect = correctCount === correct.length && wrongCount === 0;
        break;

      case 'short_answer':
        const acceptedAnswers = JSON.parse(q.correct_answer); // array of accepted
        isCorrect = acceptedAnswers.some(a =>
          a.trim().toLowerCase() === (ans || '').trim().toLowerCase()
        );
        score = isCorrect ? q.score : 0;
        break;

      case 'matching':
        const pairs = JSON.parse(q.matching_pairs);
        const userPairs = typeof ans === 'object' ? ans : {};
        let matchCount = 0;
        pairs.forEach(p => { if (userPairs[p.left] === p.right) matchCount++; });
        score = (matchCount / pairs.length) * q.score;
        isCorrect = matchCount === pairs.length;
        break;

      case 'ordering':
        const correctOrder = JSON.parse(q.correct_order);
        const userOrder = Array.isArray(ans) ? ans : [];
        isCorrect = JSON.stringify(correctOrder) === JSON.stringify(userOrder);
        score = isCorrect ? q.score : 0;
        break;

      case 'fill_blank':
        const blanks = JSON.parse(q.correct_answer); // [{blank_index, accepted:[...]}]
        const userBlanks = typeof ans === 'object' ? ans : {};
        let blankCorrect = 0;
        blanks.forEach(b => {
          if (b.accepted.some(a => a.trim().toLowerCase() === (userBlanks[b.blank_index] || '').trim().toLowerCase()))
            blankCorrect++;
        });
        score = (blankCorrect / blanks.length) * q.score;
        isCorrect = blankCorrect === blanks.length;
        break;

      case 'essay':
      case 'audio_record':
        // ไม่ auto-grade — รอครูตรวจ
        score = null;
        isCorrect = null;
        break;
    }

    results[q.id] = { answer: ans, is_correct: isCorrect, score };
    if (score !== null) total += score;
  }

  return { results, total, hasManualGrading: Object.values(results).some(r => r.score === null) };
}
```

### 16.5 คุณสมบัติที่ดีกว่า Google Classroom

| Feature | Google Classroom | HARMONI Student Classroom |
|---------|-----------------|---------------------------|
| โพสต์/ประกาศ | ✓ | ✓ + Pin + Schedule + Poll |
| สั่งงาน | ✓ file + link | ✓ file + link + text + audio record |
| แบบทดสอบ | MC + short + essay | 9 รูปแบบรวม matching + ordering + audio |
| Auto-grade | ✓ MC only | ✓ MC + MS + TF + short + matching + ordering + fill |
| Rubric grading | ✓ | ✓ + link จาก assessment_tools ที่สร้างไว้ |
| คะแนนลงแผน | ✗ manual | ✓ อัตโนมัติลง scores table → grade_results |
| Voice feedback | ✗ | ✓ ครูอัดเสียง feedback ได้ |
| AI สร้างข้อสอบ | ✗ | ✓ AI สร้างข้อสอบ 9 รูปแบบ + Bloom + IOC |
| Resubmit | ✓ | ✓ + attempt tracking + late penalty |
| Timer quiz | ✓ | ✓ + shuffle + max attempts + schedule window |
| Comment/ซักถาม | ✓ | ✓ + private comment + thread replies |
| ดูคะแนนรวม | ✗ (แยกวิชา) | ✓ หน้าเดียวรวมทุกวิชา + เกรด + คุณลักษณะ |
| Music-specific | ✗ | ✓ อัดเสียงตอบ (ร้องเพลง/เล่นดนตรี/อ่านโน้ต) |
| Offline | ✗ | ✓ PWA + IndexedDB sync |
| Mobile-first | ✓ | ✓ mobile-first responsive |
| Poll/โหวต | ✗ | ✓ โหวตในโพสต์ |

### 16.6 Flow คะแนนลงแผนอัตโนมัติ

```
ครูให้คะแนนงาน/quiz
  → assignment_submissions.status = 'graded' OR quiz_attempts.graded_at IS NOT NULL
  → auto INSERT INTO scores (คะแนนรายข้อลง scores table)
  → เมื่อครูกด "Compute Grade"
  → /api/grade-results/compute → คำนวณจาก scores + grade_configs → grade_results
  → นร.เห็นเกรดทันที (student_notifications)
```

---

*Last updated: 13 มีนาคม 2569 — schema 74 tables, Student Classroom module added, quiz 9 types, auto-grade logic*
