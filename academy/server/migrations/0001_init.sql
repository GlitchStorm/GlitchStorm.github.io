-- Apply with: npx wrangler d1 migrations apply academy-db --remote
CREATE TABLE IF NOT EXISTS attempts (
 id TEXT PRIMARY KEY,
 exam_id TEXT NOT NULL,
 answers_json TEXT NOT NULL,
 score REAL,
 max_score REAL NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('submitted','reviewed')),
 submitted_at TEXT NOT NULL,
 reviewed_at TEXT,
 review_json TEXT
);
CREATE TABLE IF NOT EXISTS competencies (
 id TEXT PRIMARY KEY,
 course_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('learning','assessed','mastered','retention_due')),
 best_score REAL NOT NULL DEFAULT 0,
 evidence TEXT NOT NULL DEFAULT 'A',
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_exam ON attempts(exam_id,submitted_at);
