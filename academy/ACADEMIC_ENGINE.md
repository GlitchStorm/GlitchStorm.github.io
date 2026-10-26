# Mechatronics Academy — Academic Engine v0.2

Extends the deployed, unauthenticated Cloudflare Worker + GitHub Pages exam portal into a persistent, tutor-controlled learning system.

## Deployment

1. Merge this pull request after review. The existing GitHub Actions workflow deploys Worker changes from `master`.
2. **Before relying on new tools, apply the D1 migrations** from `academy/server`:

   ```bash
   npx wrangler d1 migrations apply academy-db --remote
   ```

   This applies `0002_academic_engine.sql` and `0003_seed_courses.sql`, preserving legacy MTH101 attempts.
3. In Cloudflare, confirm the Worker deployment is green. If necessary, manually run `npx wrangler deploy` from `academy/server`.
4. Open `https://glitchstorm.github.io/mechatronics-academy/assignments.html` and enter the deployed Worker URL. No token needed.
5. Refresh/reconnect the ChatGPT MCP connector so it discovers the expanded tool list.

**Deployment order:** Apply migrations before asking the agent to invoke new tools; it is acceptable for the new tables to exist before the Worker code is deployed.

## Academic capabilities

The tutor can:
- Retrieve 41 modeled courses, 128 credits, course dependencies and current eligibility.
- Define instructional units and concrete measurable competencies.
- Create a **draft test** with private answers, scoring criteria, diagrams and competency tags.
- Publish and assign an immutable test form.
- Retrieve student submissions including written work and handwritten drawings.
- Retrieve frozen answer key and grading criteria separately, then submit per-question evaluated feedback.
- Track grades as competency evidence without treating one score as permanent mastery.
- Explicitly verify competency mastery and retention with dated evidence.
- Advance course status only after prerequisite courses and all defined competencies are mastered.
- Save and retrieve academic notes, checkpoints, error patterns and study preferences.
- Retrieve a recent event history and progress summary.

### Question structure

```json
{
  "id": "MTH101-U02-Q01",
  "title": "Linear relationship",
  "prompt": "Given y = 3x + 2, calculate y for x = -2. Show your working.",
  "points": 4,
  "competency_ids": ["MTH101:functions"],
  "format": "worked",
  "grading": {
    "mode": "rubric",
    "criteria": [
      {"description": "Substitutes x correctly", "max_points": 2},
      {"description": "Performs arithmetic and states answer", "max_points": 2}
    ]
  },
  "answer": "-4",
  "model_solution": "y=3(-2)+2=-4",
  "diagram": {
    "type": "cartesian",
    "bounds": {"xmin": -5, "xmax": 5, "ymin": -12, "ymax": 16},
    "series": [{"points": [[-4,-10],[0,2],[4,14]]}]
  }
}
```

Use `grading.mode = "numeric"` for numeric-only questions graded deterministically on the server with `absolute_tolerance` and `relative_tolerance`. For `rubric` questions, the tutor examines the student's actual working through `get_grading_reference` and supplies earned points and feedback. The server validates all question IDs and points against the frozen form.

## Standard tutor workflow

1. `academic_overview` and `list_courses`: pick the next eligible course.
2. `upsert_unit` and `upsert_competency`: define objectives and prerequisites before instruction.
3. `record_learning`: log completed lessons, exercise performance, misconceptions and evidence.
4. `create_assessment`: create an original test aligned to taught competencies and mark scheme.
5. `publish_assessment` then `assign_assessment`. Give the learner the assignment center link.
6. Student opens the assessment, writes answers and calculations, and submits through the browser.
7. `list_submissions`, `get_grading_reference`: locate and inspect submitted work.
8. `grade_submission`: submit all question evaluations; numeric-only questions are independently checked against the key.
9. `set_competency_state`: when assessment and explanation justify it, record explicit mastery evidence; otherwise remediate. Never mark mastered from a single lucky quiz.
10. `set_course_state`: record completion when the registrar's prerequisite and competency gates permit it.
11. `get_learning_history` and `set_academic_note`: maintain longitudinal tutoring context and misconceptions.

## Student portal

The new `assignments.html` page includes dynamically assigned tests, diagram rendering for Cartesian line/point graphs, typed responses, multi-line working, optional artifact references, handwritten canvas, local drafts, question navigation, and final submission. The original `index.html` mathematics pilot remains available.

## Scope and limitations

- Tests are dynamically authored by the tutor; the portal does **not** automatically generate comprehensive questions by itself.
- Free-response grading is **AI-assisted, rubric-based**, not mathematically verified. The tutor must check method and reasoning, give supported feedback, and flag uncertainty. Objective numeric questions are checked independently by the Worker.
- The new master curriculum is seeded from your syllabus. Unit objectives, detailed lessons and competency definitions are created progressively by the tutor.
- **Old MTH101 pilot submissions stay in the original database tables** and can still be accessed through the original MCP tools. They are not automatically merged into the new academic record.
- Course credits are modeled academic units, not accredited credits.
- This remains a single-student **public, no-auth** instance as requested. Anyone knowing the endpoint can read/edit/grade records. Don't put private personal details in submissions.
- No deployment or live browser execution is claimed by source changes alone.
- Legacy `/api/exams` and existing MCP tools remain available for backward compatibility.

## Acceptance test

1. `list_courses` returns 41 courses and totals 128 credits.
2. `upsert_unit`, `upsert_competency` create one objective.
3. `create_assessment` creates a 2-question form; publish and assign it.
4. Verify student-facing `get_assessment` does NOT include answer keys.
5. Submit the form at `assignments.html`, including written work and a drawing.
6. `list_submissions` returns the submission, and `get_grading_reference` includes frozen rubric and work.
7. `grade_submission` records per-question points and feedback, with server-side numeric checking.
8. `academic_overview` reports updated grades/competency data and learning history.
9. Verify `set_course_state` rejects premature mastery if prerequisites or competencies are incomplete.

## Next possible improvements

If needed: mathematical symbolic equivalence via a safe parser, question versioning and randomization, signed assessments, R2 large drawing/image storage, actual MCP App embedded UI, background retention reminders, and a richer graph editor.
