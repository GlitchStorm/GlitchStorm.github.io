-- Existing 0001 tables remain untouched; idempotent additive migration.
CREATE TABLE IF NOT EXISTS academy_courses (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, credits INTEGER NOT NULL DEFAULT 0,
 term INTEGER NOT NULL DEFAULT 1, prerequisites_json TEXT NOT NULL DEFAULT '[]',
 objectives_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'locked',
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS academy_units (
 id TEXT PRIMARY KEY, course_id TEXT NOT NULL, title TEXT NOT NULL, seq INTEGER NOT NULL,
 prerequisites_json TEXT NOT NULL DEFAULT '[]', objectives_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS academy_units_course ON academy_units(course_id, seq);
CREATE TABLE IF NOT EXISTS academy_competencies (
 id TEXT PRIMARY KEY, course_id TEXT NOT NULL, unit_id TEXT, title TEXT NOT NULL,
 prerequisites_json TEXT NOT NULL DEFAULT '[]',
 mastery_state TEXT NOT NULL DEFAULT 'unassessed',
 best_percent REAL NOT NULL DEFAULT 0, latest_percent REAL,
 retention_due TEXT, evidence_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS academy_competencies_course ON academy_competencies(course_id);
CREATE TABLE IF NOT EXISTS academy_assessments (
 id TEXT PRIMARY KEY, course_id TEXT NOT NULL, unit_id TEXT, title TEXT NOT NULL,
 kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
 questions_json TEXT NOT NULL, answer_key_json TEXT NOT NULL,
 passing_percent REAL NOT NULL DEFAULT 85, created_at TEXT NOT NULL, published_at TEXT
);
CREATE INDEX IF NOT EXISTS academy_assessments_course ON academy_assessments(course_id,status);
CREATE TABLE IF NOT EXISTS academy_assignments (
 id TEXT PRIMARY KEY, assessment_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'assigned',
 due_at TEXT, assigned_at TEXT NOT NULL, notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS academy_submissions (
 id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL, assessment_id TEXT NOT NULL,
 answers_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'submitted',
 submitted_at TEXT NOT NULL, grade_percent REAL, grade_json TEXT, graded_at TEXT,
 UNIQUE(assignment_id,id)
);
CREATE INDEX IF NOT EXISTS academy_submissions_assignment ON academy_submissions(assignment_id,submitted_at);
CREATE TABLE IF NOT EXISTS academy_learning_log (
 id TEXT PRIMARY KEY, course_id TEXT, unit_id TEXT, competency_id TEXT,
 event_type TEXT NOT NULL, detail_json TEXT NOT NULL, recorded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS academy_kv (
 key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
