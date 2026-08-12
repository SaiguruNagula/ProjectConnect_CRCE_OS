# OPERATIONS.md — On-Premise Runbook

Operational procedures for one college deployment. Architecture context:
`BACKEND_ARCHITECTURE.md` §35 (fail-safe), §36 (backup), §37 (deployment),
§38 (scalability). Deployment model: `DECISIONS.md` ADR-9.

One college = one deployment = one PostgreSQL database = one institution.
Nothing here contacts a ProjectConnect-operated service; the deployment is
self-contained and stays fully functional if the vendor is unreachable.

---

## 1. What is implemented vs. what the pilot still needs

| Component | State |
|---|---|
| `api` + `db` compose services, healthchecks, restart policy | implemented |
| Fail-fast production config guard (`JWT_SECRET`, `DEPLOYMENT_ID`) | implemented |
| Alembic migrations, verified upgrade → downgrade → upgrade | implemented |
| JSON logs to stdout, audit table | implemented |
| `nginx` service — TLS, static SPA, security headers, rate limiting | **NOT YET BUILT** |
| `backup` cron sidecar | **NOT YET BUILT** — §5 below is the manual procedure |
| Per-IP rate limiting | **NOT YET BUILT** (belongs to nginx) |

Do not describe the pilot as production-hardened until the three "not yet
built" rows are done.

---

## 2. First install

Prerequisites: Ubuntu LTS, Docker Engine + compose plugin, a DNS name or a
fixed LAN address, 4 vCPU / 8 GB RAM / 100 GB SSD.

```bash
git clone <repo> projectconnect && cd projectconnect
cp .env.example .env
```

Fill `.env`. Every value is required; there are no safe defaults for these:

```bash
# a strong random password for the database role
POSTGRES_PASSWORD=$(python3 -c "import secrets;print(secrets.token_urlsafe(32))")
# >= 32 bytes; the API refuses to start in production with anything shorter
JWT_SECRET=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))")
# names this installation, e.g. crce-prod-01. Never transmitted anywhere.
DEPLOYMENT_ID=crce-prod-01
ENV=production
CORS_ORIGINS=https://projectconnect.crce.edu.in
```

`chmod 600 .env`. It is gitignored and must never be committed.

```bash
docker compose up -d db          # wait for healthy
docker compose run --rm api alembic upgrade head
docker compose up -d api
docker compose ps                # both services healthy
```

Bootstrap the institution and its first administrator. The password is typed at
a prompt, never passed as an argument (it would land in shell history and `ps`):

```bash
docker compose run --rm -it api python -m scripts.create_admin \
  --institution CRCE \
  --institution-name "Fr. Conceicao Rodrigues College of Engineering" \
  --email admin@crce.edu.in
```

Smoke test:

```bash
curl -fsS localhost:8000/api/v1/health      # liveness, never touches the DB
curl -fsS localhost:8000/api/v1/health/db   # readiness, 503 if the DB is down
```

---

## 3. Upgrade

Migrations are a deliberate, separate step. They are **not** run automatically
at container start: an automatic migration on boot turns a bad deploy into a
schema change nobody approved, and it races when more than one replica starts.

```bash
docker compose exec db pg_isready -U projectconnect   # DB up?
# take a backup first — always, §5. Never migrate without one.
git pull && docker compose build api
docker compose run --rm api alembic upgrade head
docker compose up -d api
curl -fsS localhost:8000/api/v1/health/db
```

Rollback (previous image is still on the box):

```bash
docker compose down api
docker image tag projectconnect-api:previous projectconnect-api:latest
docker compose up -d api
```

If the failed release included a migration, roll the schema back **before**
starting the old image: `docker compose run --rm api alembic downgrade -1`.
Only migrations whose `downgrade()` has been exercised may be rolled back this
way; verify on a restored copy first, never on live data.

---

## 4. Suspending and reactivating a deployment

Institution status is the local lifecycle gate (ADR-9). Setting it to
`suspended` blocks login immediately and kills live sessions within one
access-token lifetime (~15 minutes), because `/auth/refresh` re-reads it.

```bash
docker compose exec db psql -U projectconnect -d projectconnect \
  -c "UPDATE institutions SET status = 'suspended' WHERE code = 'CRCE';"
```

Reactivate with `status = 'active'`. No vendor call is involved in either
direction. The data is untouched; only authentication is gated.

---

## 5. Backup

Nightly `pg_dump` in custom format, to a **different physical disk or NAS path**
than the Docker volume. A backup on the same disk is not a backup.

```bash
#!/usr/bin/env bash
# Create this on the host as /opt/projectconnect/ops/backup.sh (it is not
# shipped in the repo — the paths are site-specific) and run it from cron:
#   0 2 * * * /opt/projectconnect/ops/backup.sh
set -euo pipefail
BACKUP_DIR=/mnt/backup/projectconnect
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
docker compose -f /opt/projectconnect/docker-compose.yml exec -T db \
  pg_dump -U projectconnect -Fc projectconnect > "$BACKUP_DIR/pc-$STAMP.dump"
# retention: 14 daily, 8 weekly
find "$BACKUP_DIR" -name 'pc-*.dump' -mtime +14 -delete
```

- `set -euo pipefail` matters: a silent partial dump is worse than no dump,
  because it looks like a backup.
- The job must exit non-zero on failure so cron mail / the ops checklist sees it.
- Also back up `.env` separately and offline. A database dump without
  `JWT_SECRET` still restores; without `POSTGRES_PASSWORD` you are locked out.
- `# ponytail: pg_dump now; WAL archiving when an RPO under 24h matters.`

---

## 6. Restore

Rehearse this quarterly on a scratch host. An untested restore is a hope.

```bash
docker compose stop api                  # no writers during a restore
docker compose exec -T db psql -U projectconnect -d postgres \
  -c "DROP DATABASE projectconnect;" -c "CREATE DATABASE projectconnect;"
cat /mnt/backup/projectconnect/pc-YYYYMMDD-HHMMSS.dump | \
  docker compose exec -T db pg_restore -U projectconnect -d projectconnect
docker compose run --rm api alembic current   # must report a known revision
docker compose up -d api
curl -fsS localhost:8000/api/v1/health/db
```

Then log in once as a real user. "The container started" is not a verified
restore.

If `alembic current` reports a revision **older** than the code, run
`alembic upgrade head`. If it reports one **newer** (restoring an old dump under
new code), deploy the matching older image instead — do not downgrade live data.

---

## 7. Failure playbook

| Symptom | First check | Action |
|---|---|---|
| `/health` fails | `docker compose ps`, `docker compose logs api` | restart policy should have handled it; check for a crash loop |
| `/health` OK, `/health/db` 503 | `docker compose logs db`, disk space | database down or out of disk; API stays up and returns 503 by design |
| Login fails for everyone | `institutions.status`, then `docker compose logs api` | a suspended institution blocks all logins (§4) |
| Login fails for one user | `users.status`, `users.locked_until` | 5 failed attempts locks an account for 15 minutes; it clears itself |
| API will not start in production | startup log line | `JWT_SECRET` missing/short or `DEPLOYMENT_ID` unset — deliberate fail-fast |
| Migration fails | `alembic current` | DDL is transactional; the schema is unchanged. Fix forward, restore only if data changed |
| Disk full | `df -h`, Docker log sizes | rotate Docker logs; prune old images; never delete the pgdata volume |

---

## 8. Monitoring checklist (v1)

No metrics stack in the pilot — a checklist an operator actually runs beats a
Grafana nobody opens.

Daily: `docker compose ps` both healthy · last night's dump exists and is
non-trivial in size · `df -h` under 80%.
Weekly: skim `docker compose logs api | grep '"level":"ERROR"'` · confirm the
audit table is still being written.
Quarterly: full restore rehearsal (§6) · rotate `JWT_SECRET` (this logs
everyone out, which is the point) · review admin accounts.

Prometheus/Grafana is PLANNED, not pilot (§39).

---

## 9. Data ownership and exit

All academic data lives in this deployment's PostgreSQL database and nowhere
else. There is no export-to-vendor path, by design (ADR-9).

Handover or pilot termination: the `pg_dump` from §5 *is* the export. Hand over
the dump plus the schema documentation (`DATABASE_SCHEMA.md`), and destroy the
volume afterwards if the agreement requires it.
