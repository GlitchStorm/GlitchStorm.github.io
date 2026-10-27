# v0.3.1 — Formative evidence classification reference

The MCP schemas for `record_proficiency_evidence` and `set_formative_proficiency` now declare string enums rather than free-form strings. The API returns the accepted choices in any invalid-value error. **The categories are exact strings**, not conversational labels.

| Property | Allowed values |
|---|---|
| `evidence_type` | `instruction`, `guided_practice`, `independent_practice`, `transfer`, `formative_check`, `remediation`, `observation` |
| `assistance` | `independent`, `guided`, `assisted`, `unknown` |
| `result` | `correct`, `partial`, `incorrect`, `not_scored` |
| `proficiency_state` | `not_introduced`, `developing`, `proficient_in_covered_material`, `assessment_ready` |

**Evidence tagging:** The event type `guided_practice` is a historical log label and *does not itself determine whether the student was aided*. If a log explicitly demonstrates the student solved an unseen exercise independently, use `assistance="independent"` with `evidence_type="independent_practice"`; otherwise use `guided` or `unknown`. Use `result="not_scored"` for instruction and observational evidence without a marked outcome. Never infer independent status just from an impressive score.

**Order of operations:** First `record_proficiency_evidence` for the exact competency and original learning event. Then `set_formative_proficiency` for a supported qualitative state. `proficient_in_covered_material` and `assessment_ready` both require at least one recorded correct independent exercise. Neither implies formal `mastered` status or changes the placement scores.

### Example

```json
{
  "competency_id": "MTH101-U03-C01",
  "course_id": "MTH101",
  "lesson_id": "MTH101-U03-L02",
  "evidence_type": "independent_practice",
  "assistance": "independent",
  "result": "correct",
  "score_earned": 5,
  "score_possible": 5,
  "detail": {"note": "Student computed symbolic function composition unassisted"}
}
```

When migrating historical records, also provide a `learning_event_id` from `get_learning_history`. That makes imports traceable and rejects duplicates.

**If a tool call is blocked by ChatGPT's execution safety:** That is distinct from backend validation and cannot be fixed by relaxing an enum. Don't claim a record was written unless confirmed. Keep the backlog of event IDs in a durable note or local JSON, and retry only permitted calls in a fresh chat. Do not bypass host safety controls.
