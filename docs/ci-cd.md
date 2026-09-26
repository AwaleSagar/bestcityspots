# CI/CD

How code gets from a branch to bestcityspots.co, and what has to be true at
each step. Companion to [`deploy/README.md`](../deploy/README.md), which covers
the host itself (nginx, cost-protection layers, the Google Cloud checklist).

## The one command before you push

```bash
npm run verify
```

That is the same gate set CI runs — lint, format check, type check, migration
policy, the PGlite database tests, verification scripts — so a green local run
means a green pipeline (CI additionally runs the pgTAP suite on the real
Supabase stack).
Run it before opening a PR and you will rarely wait on a red build.

## Pipeline at a glance

| Workflow                                                | Trigger                               | What it protects                                                                                 |
| ------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [`ci.yml`](../.github/workflows/ci.yml)                 | PR → main, push → main                | Correctness: lint, format, types, migrations, database tests, verification scripts, build, image |
| [`db-migrate.yml`](../.github/workflows/db-migrate.yml) | Manual dispatch only                  | Production schema: pending-migration dry run, then `supabase db push`                            |
| [`security.yml`](../.github/workflows/security.yml)     | Lockfile changes, weekly cron, manual | Dependency advisories and committed credentials                                                  |
| [`deploy.yml`](../.github/workflows/deploy.yml)         | Manual dispatch only                  | The production host                                                                              |
| [`dependabot.yml`](../.github/dependabot.yml)           | Weekly (npm), monthly (actions)       | Keeping the above from rotting                                                                   |

### CI jobs

`ci.yml` runs five jobs in parallel plus a roll-up:

- **quality** (~2 min) — `lint`, `format:check`, `type-check`, `check:migrations`,
  and `check:db` (every migration + the seed applied to in-process Postgres,
  then the pgTAP suite). Deliberately first and Docker-free so a mistake fails fast.
- **database** (~5 min) — boots the real Supabase images with the CLI (applying
  migrations and `supabase/seed.sql`), runs `supabase test db`, the schema
  linter, type-checks the app against freshly generated types, and runs
  `npm run db:smoke --allow-writes` against the local Data API. No hosted
  project or credential is involved.
- **test** (~3 min) — `npm run test:ci`: every verification script under
  `scripts/` except `test:providers`.
- **build** (~5 min) — the production Next build, with `.next/cache` restored
  between runs so unchanged pages are not re-rendered.
- **docker** — builds the image the way production does and boots it, asserting
  `/api/health` answers. On PRs it only runs when an image-affecting path
  changed (`Dockerfile`, `src/`, `public/`, lockfile, `next.config.ts`, …).
- **CI passed** — a roll-up job that fails if any of the above failed. **Protect
  `main` with this single required status check**, not with the individual
  jobs: adding or renaming a job then never silently drops a gate.

#### Why `test:providers` is not in CI

It makes live calls to Open-Meteo. A pipeline that turns red when a third party
has a bad afternoon is a pipeline people learn to ignore, so provider
connectivity stays a local/manual check:

```bash
npm run test:providers    # needs outbound network
npm run db:smoke          # read-only checks against the project in .env.local
npm run test:google-places
```

#### Why the build uses placeholder credentials

The build must never reach a real project or a paid provider. `generateStaticParams`
degrades to an empty city list without Supabase, and the cost guard is cache-only
in production unless a live-fetch flag is set, so a CI build makes **zero** paid
calls. Real keys are runtime-only by design — they must not be baked into image
layers (incident action P4).

### Security workflow

- `npm audit --omit=dev --audit-level=high` **fails the build**. Production
  dependencies ship to users; the 2026-09-12 audit found a critical `next`
  advisory and high `sharp` CVEs sitting unnoticed, and this is the gate that
  stops that recurring.
- A full `npm audit` runs as advisory-only and writes to the job summary — a
  build-tool advisory should be visible without wedging every PR.
- A credential scan greps for Google API keys, OpenAI keys, and JWT-shaped
  strings. The Supabase **publishable** key is public by design; the secret key
  and provider keys never are.
- The weekly cron matters more than the PR trigger: advisories are usually
  published _after_ the lockfile that contains them was merged.

### Tooling versions are pinned on purpose

`prettier` and `prettier-plugin-tailwindcss` are exact-pinned. They used to
float (`^3.4.2`), and a routine `npm install` resolved 3.7.4, reformatted 38
files, and would have turned `format:check` red with nobody having touched the
code. Formatters must move deliberately — Dependabot proposes the bump, a human
merges it along with the reformat.

## Database migrations

Schema lives in `supabase/migrations/` and is applied with the Supabase CLI
(workflow and rules: [`supabase/README.md`](../supabase/README.md)).

**Production:** Actions → **Database migrate** → run with `dry_run` checked to
list pending migrations, then run again unchecked to apply. It needs, on the
`production` environment: `secrets.SUPABASE_ACCESS_TOKEN`,
`secrets.SUPABASE_DB_PASSWORD` and `vars.SUPABASE_PROJECT_REF`. Deploys never
migrate implicitly; migrate first when a release depends on a schema change.

`npm run check:migrations` ([`scripts/check-migrations.ts`](../scripts/check-migrations.ts))
enforces, in CI and before every production migration:

1. Filename is `<YYYYMMDDHHMMSS>_<snake_case>.sql` (`npx supabase migration new`).
2. Every `create table` enables RLS and GRANTs explicitly in the same file —
   new Supabase projects no longer expose tables to the Data API by default.
3. No `SECURITY DEFINER`. It bypasses RLS; the old backend's audit finding H-1
   (browser-callable analytics writers) came from exactly this.
4. Every function pins `search_path` and revokes PUBLIC's default EXECUTE.
5. Every view is `security_invoker`.
6. The retired key names and objects of the deleted project never reappear.

`supabase/tests/database/00_security_posture.test.sql` asserts the same posture
against a live database, so a rule the regexes miss still fails CI.

## Deploying

Deploys are **manual**: Actions → Deploy → _Run workflow_, choose a ref.

Auto-deploy on merge is deliberately off. The app's daily provider budget and
cache warmers make an unattended mid-day restart a cost and latency event, not
a no-op. To enable it later, add a `push: tags: ["v*"]` trigger to
`deploy.yml` and keep required reviewers on the `production` environment.

What the workflow does:

1. Verifies the deployment secrets exist — a deploy that cannot run never
   reports success.
2. SSHes to the host with a pinned `known_hosts` (no blind host-key trust, no
   third-party actions) and runs `scripts/deploy.sh`, which fetches the ref,
   rebuilds the image, health-checks the container, and **rolls back to the
   previous image** if the check fails.
3. Polls the public `/api/health` from the runner, proving nginx/TLS/DNS serve
   the new release too — `deploy.sh` only sees the container.

Inputs: `ref` (what to deploy), `dry_run` (prints the plan, changes nothing),
`skip_health_check` (emergency use).

### One-time setup

Settings → Environments → **production**. Add required reviewers there if
deploys should need approval, then set:

| Secret                   | Holds                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `DEPLOY_HOST`            | Hostname or IP of the production VM                                                                |
| `DEPLOY_USER`            | SSH user (the `deploy` user from the ansible playbook)                                             |
| `DEPLOY_SSH_KEY`         | Private key whose public half is in that user's `authorized_keys`. Dedicated to CI, no passphrase. |
| `DEPLOY_SSH_KNOWN_HOSTS` | Output of `ssh-keyscan -H <host>` — pin it, do not disable host-key checking                       |

Optional repository **variables** (not secrets):

| Variable            | Default                               |
| ------------------- | ------------------------------------- |
| `DEPLOY_PORT`       | `22`                                  |
| `DEPLOY_REPO_DIR`   | `/opt/bestcityspots`                  |
| `PUBLIC_HEALTH_URL` | `https://bestcityspots.co/api/health` |

Give the CI key the narrowest access that still works: it needs to run
`scripts/deploy.sh` in the repo directory and talk to Docker, nothing more.

## When something goes red

| Symptom                                    | First move                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `format:check` fails                       | `npm run format` — never hand-edit to match the formatter                                         |
| `check:migrations` fails                   | Read the message; it names the file and the rule (usually missing RLS/GRANT or search_path)       |
| `check:db` / `database` job fails          | The failing pgTAP assertion is printed with have/want; reproduce with `npm run check:db`          |
| `audit` fails on a production dep          | `npm audit fix`, or bump the direct dependency; do not lower `--audit-level`                      |
| `docker` job fails but `build` passed      | The app compiles but the image does not boot — check the container logs the job prints            |
| Deploy fails at the health check           | `deploy.sh` already rolled back; the host is on the previous image. Investigate before re-running |
| Deploy fails at "Check deployment secrets" | The `production` environment is not configured yet — see the table above                          |

## Deliberate non-goals

- **No auto-deploy on merge** — see above.
- **No third-party actions.** Everything uses `actions/checkout`, `setup-node`,
  and `cache` plus plain shell. Fewer supply-chain surfaces than pinning SHAs
  for convenience wrappers around `ssh` and `docker build`.
- **No test coverage gate.** There is no unit-test framework here yet; a
  coverage number over script-based verification would be theatre.
- **No preview environments.** A single VM and a Supabase project with real
  cache tables make ephemeral environments more cost than value today. The CI
  `database` job covers schema changes without one.
