-- =============================================================================
-- SEO Phase 1: slug-based city URLs (audit ref: T1).
--
-- Adds a stable, unique `slug` column to public.cities so that the application
-- can serve URLs like `/cities/lisbon-portugal` instead of `/cities/123`.
--
-- The column is also returned from the search_cities_elastic RPC (replaced in
-- place below) so that on-site search can navigate directly to canonical URLs
-- without an intermediate id->slug round trip.
--
-- Idempotent: re-running this migration on a database that already has the
-- column / index / function is a no-op.
-- =============================================================================

-- 1) Column ---------------------------------------------------------------
ALTER TABLE IF EXISTS public.cities
  ADD COLUMN IF NOT EXISTS slug text;

-- 2) Slugify helper -------------------------------------------------------
-- Deterministic, accent-stripped, lowercase, dash-separated slug.
-- Depends on public.f_unaccent() defined in supabase/elastic_search.sql.
CREATE OR REPLACE FUNCTION public.slugify_city(p_city text, p_country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      lower(public.f_unaccent(coalesce(p_city, '') || '-' || coalesce(p_country, ''))),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
$$;

-- 3) Backfill -------------------------------------------------------------
-- Fill any NULL slug with the base form, then resolve collisions in two
-- passes: first appending iso2, then appending the row id. This produces a
-- stable, human-readable slug for the common case while guaranteeing
-- uniqueness across edge cases (e.g. multiple "Springfield, USA").
UPDATE public.cities
SET slug = public.slugify_city(city, country)
WHERE slug IS NULL OR slug = '';

WITH ranked AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (
      PARTITION BY slug
      ORDER BY population DESC NULLS LAST, id
    ) AS rn
  FROM public.cities
  WHERE slug IS NOT NULL
)
UPDATE public.cities c
SET slug = c.slug || '-' || lower(coalesce(c.iso2, c.id::text))
FROM ranked r
WHERE r.id = c.id
  AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (
      PARTITION BY slug
      ORDER BY population DESC NULLS LAST, id
    ) AS rn
  FROM public.cities
  WHERE slug IS NOT NULL
)
UPDATE public.cities c
SET slug = c.slug || '-' || c.id::text
FROM ranked r
WHERE r.id = c.id
  AND r.rn > 1;

-- 4) Uniqueness -----------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_key ON public.cities (slug);

-- 5) Auto-populate trigger ------------------------------------------------
-- Ensures any future INSERT/UPDATE that omits slug gets a deterministic one
-- before it lands. Collision resolution for inserts is handled by the
-- backfill query above for existing rows; new rows that collide will trip
-- the unique index and surface as a constraint error to the writer (which
-- should rerun this migration's collision-resolution step or pass an
-- explicit slug).
CREATE OR REPLACE FUNCTION public.cities_set_slug_trigger()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify_city(NEW.city, NEW.country);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cities_set_slug ON public.cities;
CREATE TRIGGER trg_cities_set_slug
  BEFORE INSERT OR UPDATE OF city, country, slug ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.cities_set_slug_trigger();

-- 6) RPC: include slug in elastic search results --------------------------
-- Replaces public.search_cities_elastic so callers can navigate directly to
-- the canonical /cities/{slug} URL. Body is the same as the canonical
-- definition in supabase/elastic_search.sql, with `slug` threaded through.
CREATE OR REPLACE FUNCTION public.search_cities_elastic(
  query text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  city text,
  city_ascii text,
  slug text,
  lat numeric,
  lng numeric,
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
BEGIN
  safe_limit := LEAST(GREATEST(result_limit, 1), 50);
  clean_query := lower(trim(public.f_unaccent(query)));

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
