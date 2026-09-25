-- =============================================================================
-- City search RPC (typeahead + /search page). Called from the browser with the
-- publishable key, so it is SECURITY INVOKER and reads only public tables.
--
-- Candidate tiers, each capped so a short query can't fan out:
--   prefix  lower(city_ascii) LIKE 'q%'            (trigram GIN supports LIKE)
--   fts     search_document @@ 'w1:* & w2:*'       (GIN on the generated tsvector)
--   fuzzy   lower(city_ascii) % q                  (trigram similarity)
--   edit    levenshtein(lower(city_ascii), q) <= 2 (transpositions trigrams miss: lodnon)
--   alias   lower(alias) exact / prefix / % q      (Bombay → Mumbai); a prefix scores by
--           how much of the alias it covers, so nicknames like "Paris of the
--           North" (Warsaw) can't outrank real names
-- The best tier per city wins, plus a population boost of ln(population)/40.
-- =============================================================================

create or replace function public.search_cities(query text, result_limit integer default 10)
returns table (
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
)
language plpgsql
stable
parallel safe
set search_path = ''
as $$
-- OUT column names (id, city, rank_score, ...) would otherwise shadow the
-- query's column references.
#variable_conflict use_column
declare
  q text := lower(private.immutable_unaccent(btrim(left(coalesce(query, ''), 100))));
  q_like text;
  lim integer := least(greatest(coalesce(result_limit, 10), 1), 50);
  words text[];
  tsq tsquery;
begin
  if q = '' then
    return;
  end if;

  -- Escape LIKE metacharacters so user input is always a literal prefix.
  q_like := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  -- Word tokens are restricted to [a-z0-9], so the tsquery text is always
  -- well-formed and can't inject tsquery operators.
  words := array(
    select w
    from unnest(regexp_split_to_array(regexp_replace(q, '[^a-z0-9]+', ' ', 'g'), ' ')) as w
    where w <> ''
    limit 8
  );
  if cardinality(words) > 0 then
    tsq := to_tsquery('simple'::regconfig, array_to_string(
      array(select w || ':*' from unnest(words) as w), ' & '
    ));
  end if;

  return query
  with
  prefix_hits as (
    select c.id as city_id,
      (case when lower(c.city_ascii) = q then 1.3 else 1.0 end)::real as score,
      'fts'::text as tier
    from public.cities c
    where lower(c.city_ascii) like q_like
    order by c.population desc
    limit 200
  ),
  fts_hits as (
    select c.id, (0.7 + ts_rank(c.search_document, tsq))::real, 'fts'::text
    from public.cities c
    where tsq is not null and c.search_document @@ tsq
    order by c.population desc
    limit 200
  ),
  fuzzy_hits as (
    select c.id, (extensions.similarity(lower(c.city_ascii), q) * 0.9)::real, 'fuzzy'::text
    from public.cities c
    where char_length(q) >= 3
      and lower(c.city_ascii) operator(extensions.%) q
    order by extensions.similarity(lower(c.city_ascii), q) desc
    limit 100
  ),
  edit_hits as (
    select c.id,
      (0.9 - 0.15 * extensions.levenshtein_less_equal(lower(c.city_ascii), q, 2))::real,
      'fuzzy'::text
    from public.cities c
    where char_length(q) >= 4
      and lower(c.city_ascii) like left(q, 1) || '%'
      and abs(char_length(c.city_ascii) - char_length(q)) <= 2
      and extensions.levenshtein_less_equal(lower(c.city_ascii), q, 2) <= 2
    order by c.population desc
    limit 50
  ),
  alias_hits as (
    select a.city_id,
      (case
        when lower(a.alias) = q then 1.1
        when lower(a.alias) like q_like then 0.9 * char_length(q) / char_length(a.alias)
        else extensions.similarity(lower(a.alias), q) * 0.8
      end)::real,
      'alias'::text
    from public.city_aliases a
    where char_length(q) >= 3
      and (lower(a.alias) like q_like or lower(a.alias) operator(extensions.%) q)
    limit 200
  ),
  best as (
    select distinct on (h.city_id) h.city_id, h.score, h.tier
    from (
      select * from prefix_hits
      union all select * from fts_hits
      union all select * from fuzzy_hits
      union all select * from edit_hits
      union all select * from alias_hits
    ) h
    order by h.city_id, h.score desc
  )
  select
    c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country, c.iso2, c.iso3,
    c.admin_name, c.capital, c.population,
    (b.score + ln(greatest(c.population, 1)::double precision) / 40)::real as rank_score,
    b.tier as match_type
  from best b
  join public.cities c on c.id = b.city_id
  order by rank_score desc, c.population desc, c.id
  limit lim;
end;
$$;

comment on function public.search_cities(text, integer) is
  'City typeahead search. Returns at most 50 rows; query is truncated to 100 characters.';

revoke all on function public.search_cities(text, integer) from public;
grant execute on function public.search_cities(text, integer) to anon, authenticated, service_role;
