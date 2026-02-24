-- =============================================================================
-- Elastic Search Engine for BestCitySpots
-- PostgreSQL full-text search + trigram fuzzy matching + alias lookup
-- =============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- 2. Immutable unaccent wrapper (required for use in index expressions / triggers)
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- 3. Add tsvector column
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS search_document tsvector;

-- 4. Trigger: rebuild search_document on cities INSERT/UPDATE (includes AI insights)
CREATE OR REPLACE FUNCTION public.cities_search_document_trigger()
RETURNS trigger AS $$
DECLARE
  ai_intro text;
  ai_attractions text;
BEGIN
  SELECT
    coalesce(i.intro, ''),
    coalesce((SELECT string_agg(elem->>'name', ' ') FROM jsonb_array_elements(i.attractions) AS elem), '')
  INTO ai_intro, ai_attractions
  FROM public.city_ai_insights i
  WHERE i.city_id = NEW.id;

  IF ai_intro IS NULL THEN ai_intro := ''; END IF;
  IF ai_attractions IS NULL THEN ai_attractions := ''; END IF;

  NEW.search_document :=
    setweight(to_tsvector('english', coalesce(public.f_unaccent(NEW.city), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(public.f_unaccent(NEW.city_ascii), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(public.f_unaccent(NEW.country), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(public.f_unaccent(NEW.admin_name), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.capital, '')), 'B') ||
    setweight(to_tsvector('english', public.f_unaccent(ai_intro)), 'C') ||
    setweight(to_tsvector('english', public.f_unaccent(ai_attractions)), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cities_search_document ON public.cities;
CREATE TRIGGER trg_cities_search_document
  BEFORE INSERT OR UPDATE ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.cities_search_document_trigger();

-- 5. Sync trigger: when AI insights change, refresh the parent city's search_document
CREATE OR REPLACE FUNCTION public.city_ai_insights_search_sync()
RETURNS trigger AS $$
BEGIN
  UPDATE public.cities SET city = city WHERE id = NEW.city_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_insights_search_sync ON public.city_ai_insights;
CREATE TRIGGER trg_ai_insights_search_sync
  AFTER INSERT OR UPDATE ON public.city_ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.city_ai_insights_search_sync();

-- 6. Aliases table for abbreviations, alt names, and common misspellings
CREATE TABLE IF NOT EXISTS public.city_search_aliases (
  alias text NOT NULL,
  city_id bigint NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  PRIMARY KEY (alias, city_id)
);

ALTER TABLE public.city_search_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on city_search_aliases"
  ON public.city_search_aliases FOR SELECT
  TO anon, authenticated
  USING (true);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS cities_search_document_idx
  ON public.cities USING gin (search_document);

CREATE INDEX IF NOT EXISTS cities_country_trgm_idx
  ON public.cities USING gin (country gin_trgm_ops);

CREATE INDEX IF NOT EXISTS city_search_aliases_alias_trgm_idx
  ON public.city_search_aliases USING gin (alias gin_trgm_ops);

CREATE INDEX IF NOT EXISTS city_search_aliases_alias_idx
  ON public.city_search_aliases (alias);

-- 8. The elastic search RPC function (3-tier: FTS + fuzzy + alias)
CREATE OR REPLACE FUNCTION public.search_cities_elastic(
  query text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  city text,
  city_ascii text,
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
  -- Tier 1: Full-text search on search_document
  fts AS (
    SELECT
      c.id, c.city, c.city_ascii, c.lat, c.lng, c.country,
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

  -- Tier 2: Trigram fuzzy match on city_ascii and country
  fuzzy AS (
    SELECT
      c.id, c.city, c.city_ascii, c.lat, c.lng, c.country,
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

  -- Tier 3: Alias lookup
  alias_matches AS (
    SELECT
      c.id, c.city, c.city_ascii, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      similarity(a.alias, clean_query) AS alias_score,
      'alias'::text AS mt
    FROM public.city_search_aliases a
    JOIN public.cities c ON c.id = a.city_id
    WHERE a.alias % clean_query
       OR a.alias ILIKE clean_query || '%'
       OR clean_query ILIKE a.alias || '%'
  ),

  -- Combine all tiers with unified scoring
  combined AS (
    SELECT *, fts_rank AS raw_score FROM fts
    UNION ALL
    SELECT *, trgm_score AS raw_score FROM fuzzy
    UNION ALL
    SELECT *, alias_score AS raw_score FROM alias_matches
  ),

  -- Deduplicate: keep the best match_type per city
  deduped AS (
    SELECT DISTINCT ON (cb.id)
      cb.id, cb.city, cb.city_ascii, cb.lat, cb.lng, cb.country,
      cb.iso2, cb.iso3, cb.admin_name, cb.capital, cb.population,
      cb.mt,
      (cb.raw_score::real + (ln(GREATEST(cb.population, 1)) / 40.0)::real) AS final_score
    FROM combined cb
    ORDER BY cb.id, cb.raw_score DESC
  )

  SELECT
    d.id, d.city, d.city_ascii, d.lat, d.lng, d.country,
    d.iso2, d.iso3, d.admin_name, d.capital, d.population,
    d.final_score AS rank_score,
    d.mt AS match_type
  FROM deduped d
  ORDER BY d.final_score DESC, d.population DESC NULLS LAST
  LIMIT safe_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_cities_elastic(text, int) TO anon, authenticated;

-- 9. Backfill: touch all cities to populate search_document via trigger
-- UPDATE public.cities SET city = city;
-- ANALYZE public.cities;
