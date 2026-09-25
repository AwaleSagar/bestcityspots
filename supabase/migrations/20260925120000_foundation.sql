-- =============================================================================
-- Foundation: schemas, extensions, shared helpers and the privilege posture.
--
-- Every later migration relies on the rules established here:
--   * Nothing in `public` is reachable by the Data API roles unless a migration
--     GRANTs it explicitly (this mirrors the 2026 platform default and makes
--     local stacks behave the same way).
--   * Every function revokes PUBLIC's default EXECUTE and grants it to
--     exactly the roles that need it.
--   * Helpers that must never be called over PostgREST live in `private`,
--     which is not an exposed API schema.
-- =============================================================================

create schema if not exists extensions;
create schema if not exists private;

revoke all on schema private from public;
-- Roles need USAGE to evaluate helpers referenced by RLS policies, index
-- expressions and invoker functions. USAGE alone exposes nothing: `private`
-- is not in the API's exposed schemas, and each function grants EXECUTE.
grant usage on schema private to anon, authenticated, service_role;

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;

-- Explicit-grant posture for objects created by the migration role.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
-- PostgreSQL grants EXECUTE to PUBLIC globally and that default can't be
-- narrowed per schema (a global revoke would also break extensions installed
-- later). Instead every function in these migrations revokes PUBLIC
-- explicitly; scripts/check-migrations.ts enforces it.

-- `unaccent()` is only STABLE (it depends on a dictionary lookup), so it can't
-- be used in generated columns or index expressions. Pinning the dictionary
-- makes the result deterministic, which is what IMMUTABLE promises.
create or replace function private.immutable_unaccent(value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value)
$$;

revoke all on function private.immutable_unaccent(text) from public;
grant execute on function private.immutable_unaccent(text) to anon, authenticated, service_role;

-- Shared BEFORE UPDATE trigger for `updated_at` bookkeeping.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
