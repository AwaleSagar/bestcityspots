-- =============================================================================
-- Fix: search_cities_elastic return type mismatch on lat/lng.
--
-- public.cities stores lat/lng as `double precision`, but every prior
-- definition of search_cities_elastic declared `RETURNS TABLE (... lat numeric,
-- lng numeric ...)`. Postgres requires the function body's output types to
-- match the declared types exactly, so the RPC failed at call time with
-- "structure of query does not match function result type" on any clean build
-- whose cities table uses double precision (the canonical repo schema).
--
-- This recreates the function with `lat double precision, lng double precision`
-- — which also matches the TypeScript `City` type (lat/lng: number); PostgREST
-- serializes double precision as JSON numbers, whereas numeric came back as
-- strings. Body is otherwise identical to the slug-aware definition in
-- migrations/202605080000_cities_slug_seo.sql.
--
-- Idempotent: DROP IF EXISTS + CREATE OR REPLACE + GRANT.
-- =============================================================================

DROP FUNCTION IF EXISTS public.search_cities_elastic(text, int);

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
