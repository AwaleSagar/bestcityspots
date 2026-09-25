-- search_cities(): ranking, typo tolerance, aliases, accents and input safety.
-- Fixtures use fictional countries/cities so results don't depend on seed data.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into public.countries (iso2, iso3, name) values
  ('ZZ', 'ZZZ', 'Testland'),
  ('ZY', 'ZYY', 'Otherland');

insert into public.cities
  (id, city, city_ascii, slug, lat, lng, country, iso2, iso3, admin_name, capital, population)
values
  (990000001, 'Zyxopolis', 'Zyxopolis', 'zyxopolis-testland', 10, 10, 'Testland', 'ZZ', 'ZZZ', 'North', 'primary', 5000000),
  (990000002, 'Zyxopolis', 'Zyxopolis', 'zyxopolis-otherland', 11, 11, 'Otherland', 'ZY', 'ZYY', '', '', 20000),
  (990000003, 'Zyxburg', 'Zyxburg', 'zyxburg-testland', 12, 12, 'Testland', 'ZZ', 'ZZZ', '', '', 300000),
  (990000004, 'São Qwertá', 'Sao Qwerta', 'sao-qwerta-testland', 13, 13, 'Testland', 'ZZ', 'ZZZ', '', '', 1000000),
  (990000005, 'Qwyrtz', 'Qwyrtz', 'qwyrtz-testland', 14, 14, 'Testland', 'ZZ', 'ZZZ', '', '', 400000);

insert into public.city_aliases (city_id, alias) values
  (990000003, 'Oldzyxtown'),
  -- A nickname that starts with another city's name (cf. Warsaw, "Paris of the North").
  (990000003, 'Zyxopolis of the North');

-- Everything below runs exactly as the browser does: as `anon`.
set local role anon;

select is(
  (select id from public.search_cities('zyxopolis', 5) limit 1),
  990000001::bigint,
  'exact name: the more populous namesake ranks first'
);

select is(
  (select count(*)::int from public.search_cities('zyxopolis', 10) where city = 'Zyxopolis'),
  2,
  'same-name cities in different countries are both returned'
);

select ok(
  exists (select 1 from public.search_cities('zyxb', 10) where id = 990000003),
  'prefix query finds the city'
);

select results_eq(
  $$ select id, match_type from public.search_cities('zyxopolsi', 1) $$,
  $$ values (990000001::bigint, 'fuzzy'::text) $$,
  'a typo still finds the city through trigram similarity'
);

select results_eq(
  $$ select id, match_type from public.search_cities('qywrtz', 1) $$,
  $$ values (990000005::bigint, 'fuzzy'::text) $$,
  'a transposition that trigrams miss is caught by edit distance'
);

select ok(
  (select array_agg(id order by rank_score desc) from public.search_cities('zyxopolis', 10))[1:2]
    @> array[990000001, 990000002]::bigint[],
  'a nickname alias never outranks cities actually called that'
);

select results_eq(
  $$ select id, match_type from public.search_cities('oldzyxtown', 1) $$,
  $$ values (990000003::bigint, 'alias'::text) $$,
  'alternate names resolve through city_aliases'
);

select is(
  (select id from public.search_cities('são qwertá', 1)),
  990000004::bigint,
  'accented input matches the ASCII name'
);

select is(
  (select count(*)::int from public.search_cities('zyx', 1)),
  1,
  'result_limit is honoured'
);

select is(
  (select count(*)::int from public.search_cities('   ', 10)),
  0,
  'blank input returns nothing'
);

select is(
  (select count(*)::int from public.search_cities('%', 10)),
  0,
  'LIKE wildcards in input are treated literally'
);

select lives_ok(
  $$ select * from public.search_cities('zyx & !(:* | ''', 10) $$,
  'tsquery operators in input cannot break the query'
);

select * from finish();
rollback;
