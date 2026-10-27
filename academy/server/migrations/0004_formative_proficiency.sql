CREATE TABLE IF NOT EXISTS academy_formative_proficiency (competency_id TEXT PRIMARY KEY, proficiency_state TEXT NOT NULL DEFAULT 'not_introduced', covered_concepts_json TEXT NOT NULL DEFAULT '[]', unresolved_gaps_json TEXT NOT NULL DEFAULT '[]', last_demonstrated_at TEXT, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS academy_formative_evidence (id TEXT PRIMARY KEY, competency_id TEXT NOT NULL, course_id TEXT NOT NULL, lesson_id TEXT, learning_event_id TEXT, evidence_type TEXT NOT NULL, assistance TEXT NOT NULL, result TEXT NOT NULL, score_earned REAL, score_possible REAL, detail_json TEXT NOT NULL DEFAULT '{}', recorded_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_formative_competency ON academy_formative_evidence(competency_id,recorded_at);
CREATE INDEX IF NOT EXISTS idx_formative_course ON academy_formative_evidence(course_id,recorded_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_formative_source_event ON academy_formative_evidence(competency_id,learning_event_id) WHERE learning_event_id IS NOT NULL;
