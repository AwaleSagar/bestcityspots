# Supabase migrations

Going forward, new schema changes live here as ordered, timestamped SQL files:

```
supabase/migrations/<YYYYMMDDHHMM>_<short_description>.sql
```

Conventions:

- **Idempotent**: every statement uses `IF NOT EXISTS`, `CREATE OR REPLACE`,
  or an equivalent guard so the file can be re-applied safely.
- **Ordered**: filenames sort lexicographically by creation time.
- **Small**: one concern per file — easier to review and roll back.
- **No destructive default**: schema drops land in their own file, never
  mixed with additive changes.

Files in `supabase/*.sql` (outside this folder) predate this convention and
represent the already-applied baseline. New work should go here.

To apply all pending migrations in order, run (from repo root):

```bash
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

The Supabase CLI (`supabase db push`) can also be wired up once a workspace
link file is committed.
