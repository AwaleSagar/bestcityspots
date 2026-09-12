-- =============================================================================
-- Security audit remediation (docs/security-audit-2026-09-12.md): H-1, L-2,
-- M-1, L-4.
--
-- H-1 (High) — the six analytics upsert functions are SECURITY DEFINER but
--   only ever GRANTed to service_role. PostgreSQL grants EXECUTE on a new
--   function to PUBLIC by default, and granting to another role does not
--   remove it; `anon` inherits PUBLIC, PostgREST exposes every public-schema
--   function at /rest/v1/rpc/<name>, and SECURITY DEFINER runs as the owner —
--   so the browser-visible anon key could write to every analytics table,
--   bypassing the service_role-only RLS policies entirely. Poisoned
--   city_views_daily rows also drive the homepage Living Index
--   (src/app/actions.ts).
--
-- L-2 (Low) — the same functions resolve unqualified names through the
--   caller's search_path. Pin it, as claim_provider_use / record_place_save
--   already do.
--
-- M-1 (Medium) — the public-read place_images bucket accepted INSERTs from
--   any `authenticated` role. The app writes it only with the service-role
--   client (src/lib/places.ts), so the grant was unused — and with Supabase
--   sign-ups enabled, anyone could self-register and upload arbitrary objects
--   to a public bucket on the project domain.
--
-- L-4 (Low) — search_cities_elastic is (intentionally) anon-executable, but
--   an uncapped `query` runs FTS plus three trigram similarity computations
--   per row. The call goes browser → PostgREST, so it is not behind the nginx
--   rate limit. Cap the normalized query length inside the function.
--
-- Idempotent: revoke/grant/alter and CREATE OR REPLACE throughout.
-- =============================================================================

-- ───────────────── H-1 + L-2: analytics RPC grants & search_path ─────────────
--
-- Signatures are spelled in full because each name must be resolved
-- unambiguously. All six are called only through
-- src/platform/data-access/analytics-repository.ts, which uses the
-- service-role client — nothing in the app loses access.

do $$
declare
  fn text;
  signatures text[] := array[
    'upsert_daily_visitor_stats(date,integer,integer,integer,integer,integer,integer,integer)',
    'upsert_traffic_source(date,text,text,integer,integer)',
    'upsert_device_stats(date,text,text,text)',
    'upsert_geo_stats(date,text,text,text)',
    'upsert_city_views(date,integer)',
    'upsert_user_action(date,text)'
  ];
begin
  foreach fn in array signatures loop
    -- Skip cleanly if a deployment predates one of these functions.
    if to_regprocedure('public.' || fn) is null then
      raise notice 'skipping missing function public.%', fn;
      continue;
    end if;

    execute format('revoke all on function public.%s from public', fn);
    execute format('revoke all on function public.%s from anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
    execute format('alter function public.%s set search_path = public', fn);
  end loop;
end $$;

-- Same treatment for the remaining callable helpers that are service-role-only
-- in practice. record_cache_event is not SECURITY DEFINER (RLS already blocks
-- anon writes to cache_hit_stats), but there is no reason for anon to hold
-- EXECUTE on it; slugify_city is a pure helper used by the cities trigger.
do $$
declare
  fn text;
  signatures text[] := array[
    'record_cache_event(text,boolean)',
    'slugify_city(text,text)'
  ];
begin
  foreach fn in array signatures loop
    if to_regprocedure('public.' || fn) is null then
      raise notice 'skipping missing function public.%', fn;
      continue;
    end if;
    execute format('revoke all on function public.%s from public', fn);
    execute format('revoke all on function public.%s from anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end $$;

-- Verification query for operators (run manually after applying):
--
--   select p.proname,
--          p.prosecdef                              as security_definer,
--          p.proconfig                              as settings,
--          pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
--          p.proacl                                 as grants
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--   order by p.proname;
--
-- Expect: no `=X/` (PUBLIC execute) entry in proacl for any SECURITY DEFINER
-- function, and `search_path=public` in settings for each of them.

-- ───────────────────── M-1: place_images uploads ─────────────────────────────

drop policy if exists "place_images_upload" on storage.objects;
create policy "place_images_upload"
on storage.objects for insert
to service_role
with check (bucket_id = 'place_images');

-- Public read is intentional (cached place imagery is served straight from
-- storage and whitelisted in next.config.ts remotePatterns) and is unchanged.

-- ─────────────────── L-4: bound the anon-executable search ───────────────────
--
-- Body is identical to migrations/202606141200_fix_search_cities_elastic_coord_types.sql
-- except for the added length cap. CREATE OR REPLACE (no DROP) keeps the
-- existing grants intact; the signature and return type are unchanged.

CREATE OR REPLACE FUNCTION public.search_cities_elastic(
  query text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  city text,
  city_ascii text,
  slug text,
  lat double precision,
  lng double precision,
  country text,
  iso2 text,
  iso3 text,
  admin_name text,
  capital text,
  population bigint,
  rank_score real,
  match_type text
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  clean_query text;
  tsq tsquery;
  safe_limit int;
  -- Longest city+country string in the dataset is well under this; the cap
  -- exists so an anon caller cannot hand the trigram operators an arbitrarily
  -- long needle to compare against every row.
  max_query_length constant int := 100;
BEGIN
  safe_limit := LEAST(GREATEST(result_limit, 1), 50);
  clean_query := left(lower(trim(public.f_unaccent(query))), max_query_length);

  IF length(clean_query) < 1 THEN
    RETURN;
  END IF;

  BEGIN
    tsq := phraseto_tsquery('english', clean_query);
    IF tsq IS NULL OR tsq = ''::tsquery THEN
      tsq := plainto_tsquery('english', clean_query);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tsq := plainto_tsquery('english', clean_query);
  END;

  RETURN QUERY
  WITH
  fts AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      ts_rank_cd(c.search_document, tsq, 32) AS fts_rank,
      'fts'::text AS mt
    FROM public.cities c
    WHERE c.search_document @@ tsq
      AND tsq IS NOT NULL AND tsq != ''::tsquery
    ORDER BY ts_rank_cd(c.search_document, tsq, 32) DESC,
             c.population DESC NULLS LAST
    LIMIT safe_limit
  ),
  fuzzy AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      GREATEST(
        similarity(lower(c.city_ascii), clean_query),
        similarity(lower(c.country), clean_query),
        word_similarity(clean_query, lower(c.city_ascii))
      ) AS trgm_score,
      'fuzzy'::text AS mt
    FROM public.cities c
    WHERE c.id NOT IN (SELECT f.id FROM fts f)
      AND (
        lower(c.city_ascii) % clean_query
        OR lower(c.country) % clean_query
        OR clean_query <% lower(c.city_ascii)
      )
    ORDER BY GREATEST(
      similarity(lower(c.city_ascii), clean_query),
      similarity(lower(c.country), clean_query),
      word_similarity(clean_query, lower(c.city_ascii))
    ) DESC,
    c.population DESC NULLS LAST
    LIMIT safe_limit
  ),
  alias_matches AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      similarity(a.alias, clean_query) AS alias_score,
      'alias'::text AS mt
    FROM public.city_search_aliases a
    JOIN public.cities c ON c.id = a.city_id
    WHERE a.alias % clean_query
       OR a.alias ILIKE clean_query || '%'
       OR clean_query ILIKE a.alias || '%'
  ),
  combined AS (
    SELECT *, fts_rank AS raw_score FROM fts
    UNION ALL
    SELECT *, trgm_score AS raw_score FROM fuzzy
    UNION ALL
    SELECT *, alias_score AS raw_score FROM alias_matches
  ),
  deduped AS (
    SELECT DISTINCT ON (cb.id)
      cb.id, cb.city, cb.city_ascii, cb.slug, cb.lat, cb.lng, cb.country,
      cb.iso2, cb.iso3, cb.admin_name, cb.capital, cb.population,
      cb.mt,
      (cb.raw_score::real + (ln(GREATEST(cb.population, 1)) / 40.0)::real) AS final_score
    FROM combined cb
    ORDER BY cb.id, cb.raw_score DESC
  )
  SELECT
    d.id, d.city, d.city_ascii, d.slug, d.lat, d.lng, d.country,
    d.iso2, d.iso3, d.admin_name, d.capital, d.population,
    d.final_score AS rank_score,
    d.mt AS match_type
  FROM deduped d
  ORDER BY d.final_score DESC, d.population DESC NULLS LAST
  LIMIT safe_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_cities_elastic(text, int) TO anon, authenticated;
