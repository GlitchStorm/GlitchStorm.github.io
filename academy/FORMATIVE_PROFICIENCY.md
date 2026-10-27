# Academy v0.3 — Formative proficiency and full note retrieval

## What changed

This is an additive upgrade to the existing D1 registrar, not a replacement or reset. Existing formal placement scores, assessment results, learning-log events, course states, and academic notes remain untouched.

**New tools**
- `list_academic_notes({limit,offset})` retrieves every note key and value with total count and `next_offset` pagination. Follow every next offset until null.
- `get_competency_progress({course_id})` or `get_competency_progress({competency_id})` returns formal assessment/mastery and formative learning separately.
- `record_proficiency_evidence({competency_id,course_id,evidence_type,assistance,result,...})` appends one factual instructional observation. Optional scores must describe an actual graded exercise; use `learning_event_id` to link to existing logs and prevent duplicate import.
- `set_formative_proficiency({competency_id,proficiency_state,covered_concepts,unresolved_gaps,reason})` records a qualitative state without assigning formal grades, mastery, retention, or credits. Proficient / assessment-ready requires recorded correct **independent** practice.

**Formative states:** `not_introduced`, `developing`, `proficient_in_covered_material`, `assessment_ready`.

The read-only `academic_record` REST endpoint and `record.html` dashboard now include those records separately from formal mastery. Note enumeration is available through MCP. The old note tools and all previous MCP operations still work.

## Deployment

The new migration is `academy/server/migrations/0004_formative_proficiency.sql`. Apply it to the existing D1 database before using the tools; the configured GitHub workflow now runs remote migrations before Worker deploy when its two Cloudflare repository secrets are configured.

```bash
cd academy/server
npx wrangler d1 migrations apply academy-db --remote
npx wrangler deploy
```

Above manual steps are fallback only if GitHub Actions has not been configured. Never delete, reset, or recreate the existing D1 database.

After merging/deployment, start a new tutor chat to refresh MCP tool discovery and the v0.3 tutor plugin instruction version.

## Data reconciliation for existing MTH101 history

The existing 61+ learning events and diagnostic test remain the source of truth. The tutor should:
1. Call `get_learning_history(course_id="MTH101")`, `get_competency_progress(course_id="MTH101")`, and `list_academic_notes`.
2. Identify historical exercises relevant to each competency, with assistance level and original lesson identifier.
3. Append supported formative evidence linked to the exact `learning_event_id`; the database prevents the same source event being imported twice for one competency. A historical event without a matching competency must not be assigned arbitrarily.
4. Set a cautious qualitative proficiency state for each competency. Require independently correct examples for `proficient_in_covered_material` or `assessment_ready`. Do not invent numerical performance percentages.
5. Document reused lesson IDs as historical ambiguities in a durable note, leaving the original event unchanged.

**No automatic mastery promotion**: formative readiness does not equate to passing independent mastery checks. Retention scheduling begins after mastery, not after two days of guided practice.

## Verification

- `list_academic_notes` lists keys even if none are known in advance.
- `get_competency_progress(course_id="MTH101")` initially returns all existing formal states with empty formative records.
- Create one formative observation and re-read its competency; original formal percentages and evidence must be unchanged.
- `academic_record` returns `formative_proficiency` and `formative_evidence` fields and stays read-only.
- The record dashboard shows notes, separate formative status, unresolved gaps, and formal assessment percentages.
- A duplicate `learning_event_id` for the same competency is rejected.
