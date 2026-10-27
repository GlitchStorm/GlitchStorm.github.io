# One-time Cloudflare Actions setup

The Academy uses GitHub Pages for its web UI, Cloudflare Workers for its MCP and REST API, and Cloudflare D1 for academic records.

The automated deployment workflow runs whenever `academy/server/**` changes on `master` (or when manually dispatched). It applies **pending remote D1 migrations** before deploying the Worker. The deployment stops immediately if migration fails.

## Required one-time GitHub Actions secrets

Create both secrets at:

`https://github.com/GlitchStorm/GlitchStorm.github.io/settings/secrets/actions`

- **CLOUDFLARE_API_TOKEN** — a fresh Cloudflare account API token scoped to the Academy's Cloudflare account. Grant Workers Scripts editing/deployment access and D1 editing access sufficient to apply migrations. The token is **not** the old `ACADEMY_TOKEN` browser/MCP bearer secret (this Academy instance currently uses no authentication).
- **CLOUDFLARE_ACCOUNT_ID** — the Cloudflare account ID of the account hosting the Worker and the D1 database, copied from the Cloudflare dashboard.

To obtain the token, open Cloudflare Dashboard → My Profile / Account API Tokens → Create Token; use a Worker-editing template or a custom token. Scope it to the account containing the Academy Worker and D1 database. Do not commit the token to Git. Do not place it in a publicly visible GitHub variable.

## Deployment

1. Review and merge the workflow change to `master` after the two secrets have been saved.
2. Open the repository Actions tab → **Deploy Mechatronics Academy Worker** → **Run workflow** (or let the push trigger it).
3. Verify successful steps: **Verify Cloudflare credentials and D1 config**, **Install Wrangler**, **Apply pending remote D1 migrations**, **Deploy Cloudflare Worker**.
4. Open your existing Worker `/health`, then open the Academy Academic Record and Assignment Center to confirm they're still working.

The migration command uses the configured `academy-db` D1 binding and `--remote`. Wrangler records applied migrations in D1 and only executes pending migration files on later deployments. Applying a migration does not wipe previously saved records. If a future migration is destructive, review it before merging; CI cannot automatically make a destructive migration safe.

## Notes

- Manual local `npx wrangler deploy` does not invoke D1 migrations. CI now does both in the correct sequence.
- The GitHub Pages UI deploys through the repository's Pages publishing configuration independently of the Worker.
- The `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets are **only** for deployments; they are not given to the MCP client.
- If the deploy fails with HTTP 403 after adding secrets, inspect the Cloudflare token's account scope and Workers/D1 privileges.
- For local troubleshooting, `cd academy/server && npx wrangler d1 migrations list academy-db --remote` shows outstanding D1 changes.
