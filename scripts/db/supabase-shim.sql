-- =============================================================================
-- Minimal stand-in for the Supabase platform objects our migrations depend on,
-- so they can be applied to PGlite (in-process Postgres) without Docker.
--
-- Used ONLY by scripts/db/pglite.ts (npm run check:db). Real environments get
-- these objects from Supabase itself. Keep this file to the smallest surface
-- that mirrors platform behaviour we rely on:
--   * Data API roles, with service_role bypassing RLS
--   * auth.uid() reading the JWT `sub` claim the same way Supabase does
--   * auth.users (id, email)
--   * storage.buckets
-- =============================================================================

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

grant usage on schema public to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id text primary key,
  name text not null unique,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
