# Ansible — bestcityspots production deploy

Automates **Layers 1–3** of the cost-defense model in `deploy/README.md`
(edge nginx, app kill-switch env, durable budget envelopes). **Layer 4**
(GCP quota caps, key restriction, budget kill) is console-only — already
done; verify quarterly.

## What it provisions (idempotent, on fresh Ubuntu 22.04/24.04)

- Hardened host: non-root `deploy` user, UFW (deny incoming, allow 22/80/443,
  **deny 3000**), fail2ban, unattended-upgrades.
- Docker Engine + compose plugin.
- App: pin-checked git checkout → `.env.production` (0600) → `docker compose
  build && up -d`, with the previous image kept for rollback.
- nginx reverse proxy using the repo's `deploy/nginx/bestcityspots.conf`
  (rate limits + bot blocks), validated with `nginx -t` before every reload.
- Optional certbot TLS.
- Nightly cache-warm cron — runs on the host via Node (installs Node 20 +
  `npm ci`), because the standalone runtime image intentionally omits
  `scripts/`. This is the only intended paid-spend path, and it claims from the
  same durable budget so a misconfigured cron can't exceed the daily envelope.

## Prerequisites

```bash
ansible-galaxy collection install community.general
```

A reachable host with SSH key access and passwordless sudo (or `--ask-become-pass`).

## Setup

```bash
cd deploy/ansible
cp inventory.example.ini inventory.ini            # set your server IP/user
cp group_vars/vault.example.yml group_vars/vault.yml
# edit vault.yml with real secrets, then:
ansible-vault encrypt group_vars/vault.yml
# set app_repo (and optionally enable_tls/email) in group_vars/all.yml
```

## Deploy

Always dry-run first:

```bash
ansible-playbook playbook.yml --ask-vault-pass \
  -e app_version=v1.4.2 -e confirm=bestcityspots-prod --check --diff
```

Then for real:

```bash
ansible-playbook playbook.yml --ask-vault-pass \
  -e app_version=v1.4.2 -e confirm=bestcityspots-prod
```

Useful tags: `--tags hardening,firewall` · `--tags app` · `--tags nginx` · `--tags verify`.

## Guardrails (why a fat-fingered run can't hurt you)

| Guardrail | Behaviour |
|---|---|
| Confirmation token | Refuses to run without `-e confirm=bestcityspots-prod`. |
| Pinned ref only | Refuses `main`/`master`/`HEAD` unless `-e allow_unpinned=true`. |
| Live-fetch lock | Keeps `GOOGLE_*_LIVE_FETCH_ENABLED=false`; enabling needs `-e allow_live_fetch=true`. |
| Secret presence | Fails pre-flight if any required secret is empty (no half-deploys). |
| Health gate + rollback | After `up -d`, polls `/api/health`; on failure restores the previous image and fails the play. |
| Edge-only origin | Sets UFW deny 3000 and asserts it in `post_tasks`. |
| Safe nginx reload | `nginx -t` validates before reload — a bad config never loads. |
| Secret hygiene | `.env.production` is 0600; secret tasks use `no_log`. |
| One host at a time | `serial: 1` + `any_errors_fatal: true`. |

## Rollback

The health gate rolls back automatically. To roll back manually:

```bash
ssh <host>
cd /opt/bestcityspots
docker image tag bestcityspots:previous bestcityspots:latest
docker compose --env-file .env.production -p bestcityspots up -d
```

## Notes

- **Supabase migrations are not run by this playbook** (managed DB; running DDL
  from a deploy is itself a footgun). Apply migrations via the Supabase SQL
  editor / `supabase db push` *before* deploying new code, per `deploy/README.md`.
- Add `inventory.ini` and `group_vars/vault.yml` to `.gitignore` (the example
  files are safe to commit).
