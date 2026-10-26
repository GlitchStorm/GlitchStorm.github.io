# Mechatronics Academy — Hosted exam + grading + progress platform

This folder contains the **first deployable single-student vertical slice** of the academy toolchain. It includes a Cloudflare Worker MCP server and REST API, D1 persistence, a browser exam UI on GitHub Pages, automatic numerical answer checks, reviewer-scored working, and a competency ledger.

**This is a pilot, not an accredited LMS or a completed 41-course question bank.** Only the MTH101 placement assessment is loaded. Final grades require independent evaluation of the student's working, and exam placement never automatically certifies a course as mastered.

## Layout

- `/mechatronics-academy/index.html`: static mobile exam UI served by GitHub Pages, after merging to the publishing branch.
- `/academy/server/src/index.js`: Cloudflare Worker with `/api/*` and MCP `/mcp`.
- `/academy/server/migrations/0001_init.sql`: D1 persistent schema.
- `/academy/server/wrangler.toml`: Worker config. **Replace the database ID before publishing.**

## Deploy Cloudflare (requires your Cloudflare account)

1. On a machine with Node.js, clone this repository and change to `academy/server`. Install or run Wrangler with `npx wrangler`, authenticate with `npx wrangler login`.
2. Create the database: `npx wrangler d1 create academy-db`. Copy the generated `database_id` into `wrangler.toml`.
3. Apply migrations: `npx wrangler d1 migrations apply academy-db --remote`.
4. Create a strong random token. Run `npx wrangler secret put ACADEMY_TOKEN` and paste the token into the prompt. **Never commit or paste it in an issue or PR.** Save it securely for your MCP connector and browser login.
5. Confirm `ALLOWED_ORIGIN = "https://glitchstorm.github.io"`, then run `npx wrangler deploy`.
6. Check `https://YOUR-WORKER.workers.dev/health` for service OK.
7. Merge the PR into the GitHub Pages publishing branch (`master` here). The portal should appear at **https://glitchstorm.github.io/mechatronics-academy/** after Pages publishes.
8. Enter the Worker HTTPS URL and token in the exam portal, load questions, and submit a small test. Submissions are stored in Cloudflare D1, not GitHub.

## Connect to ChatGPT as an MCP server

Set the MCP server endpoint to `https://YOUR-WORKER.workers.dev/mcp` using HTTP Streamable MCP. The server requires the same secret **Authorization: Bearer TOKEN** on every tool call. Configure API-key/bearer authentication in the connector; do not put the token in its public description or URL.

MCP tools:
- `list_exams`
- `list_attempts`
- `get_attempt` (returns submitted answers/work)
- `get_progress`
- `review_attempt` (writes a scored rubric after reading the work)

The hosted MCP URL does not exist until you deploy the Worker. GitHub Pages itself is **not** an MCP server. This pilot MCP implementation is a stateless JSON-RPC HTTP endpoint and is not yet verified in a real ChatGPT connector session; connector compatibility may require protocol updates.

## Scoring model

Each MTH101 question is worth 4 points: 2 points for final numeric correctness using fixed answer keys and 2 for working/reasoning requiring rubric review. The review tool requires explicit per-question method points (0–2) and feedback. It records a final score **only after review** and stores competency evidence. Results never automatically award course credit or count a placement pass as retention mastery.

A reviewer must not award method points without examining submitted text or drawing. The server currently does **not** interpret handwritten drawings automatically, enforce mathematical expression equivalence, or run model-based graders; those would require an additional supervised grading component. This limitation is deliberate to avoid falsely claiming a verified grade.

## Security and operating constraints

- This is designed for **one private student**. There are no multi-account roles.
- The Worker rejects unauthenticated requests and restricts browser origins. Avoid installing third-party scripts on the portal origin; an XSS vulnerability on that origin could capture a typed token.
- Student records are stored in D1; submit only material you're comfortable storing in Cloudflare.
- Browser drafts use localStorage and can be lost. Export backups. The API's submissions are immutable by default, with a separate one-time review.
- Exam answer keys are kept in the Worker, not in the public exam payload.
- The server limits drawn-image payloads to 180 KB per question; large drawings can exceed the limit. For extensive handwritten work, type workings or save external artifacts and reference them in text until authenticated object storage is implemented.
- The pilot uses a single static exam and doesn't yet include an exam generator, question randomization, separate examiner/reviewer accounts, robust rate limiting, adaptive testing, or automated retention scheduling.
- Do not enter your Cloudflare API token into GitHub secrets unless you're configuring a trusted deployment workflow; the runtime Academy bearer token is a distinct secret.

## Future upgrades

1. Separate instructor and student authentication; server-side exam scheduling and attempt limits.
2. Full curriculum import: all 41 courses, structured objectives, prerequisites, and competency mappings.
3. Rich exam content: graph interaction, SVG circuits, mathematical keyboard, image/file uploads via R2.
4. Versioned question bank and randomized assessment forms.
5. Sandboxed symbolic grading plus constrained AI-assisted rubric suggestions with human review.
6. MCP App interactive view registration, not just a GitHub Pages link.
7. Session-resume and retention scheduler, audit logs, backup and export.

## Scope and deployment status

The source is committed to the feature branch. A PR should be reviewed and merged; Cloudflare D1, secrets, and actual hosting still require your account connection. No Cloudflare resources have been created or billed by this package.
