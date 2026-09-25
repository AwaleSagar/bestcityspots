# ADR-003: Reference data sources (cities and country indicators)

Status: Accepted · Date: 2026-09-25 · Supersedes: [ADR-001](adr-001-cost-of-living-source.md)

## Context

The backend was rebuilt from scratch after the previous Supabase project was
deleted (see `supabase/README.md` → History). Every table had to be reseeded,
and the requirement was **authentic, openly licensed data**: nothing
hand-written or invented, and no scraped datasets with unclear licences.

Candidates were checked against their published licence and methodology
pages (September 2026).

### Cities

| Source                              | Licence   | Coverage                                                     | Scriptable download                     |
| ----------------------------------- | --------- | ------------------------------------------------------------ | --------------------------------------- |
| **GeoNames `cities15000`**          | CC BY 4.0 | ~34k (pop. > 15k + capitals), updated daily, alternate names | Yes (download.geonames.org)             |
| SimpleMaps World Cities Basic v1.21 | CC BY 4.0 | ~50k "prominent" cities                                      | **No** — scripted requests get HTTP 403 |

### Cost, safety and health metrics

| Source                             | Licence                                                    | Granularity | Notes                                                                      |
| ---------------------------------- | ---------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| **World Bank WDI API**             | CC BY 4.0 (third-party series keep their provider's terms) | **Country** | Primary statistical data, keyless API                                      |
| WhereNext "Best Value Cities 2026" | CC BY 4.0                                                  | City (374)  | Modelled from World Bank ICP data as percentile ranks, not measured prices |
| Numbeo API                         | Commercial licence                                         | City        | Paid                                                                       |
| Ookla open data (connectivity)     | CC BY-NC-SA                                                | Tile/city   | Non-commercial only — unusable here (the site has affiliate links)         |
| Kaggle cost-of-living dumps        | Unclear                                                    | City        | Scraped Numbeo; rejected (as in ADR-001)                                   |

No free, openly licensed **measured** city-level cost-of-living or
connectivity dataset exists.

## Decision

1. **Cities: GeoNames `cities15000`** (+ `countryInfo.txt`,
   `admin1CodesASCII.txt`), loaded by `scripts/db/seed.ts`.
   - `cities.id` = GeoNames id. Slugs keep the existing production rule
     (`city-country`, then `-iso2`, then `-id`) so most URLs survive.
   - Capital type from feature codes: PPLC → primary, PPLA → admin,
     PPLA2–4 → minor.
   - Search aliases: capitalised Latin-script alternate names, shortest 25 per
     city (exonyms such as Peking and Bombay are short). Lowercase machine
     romanisations are dropped as noise.
2. **Metrics: World Bank WDI, country-level, labelled as such** everywhere
   they appear (`source` strings, UI labels, methodology page):
   - price level index = `PA.NUS.PPP ÷ PA.NUS.FCRF × 100` for the same year
     (United States = 100). The ready-made ratio series `PA.NUS.PPPC.RF` is
     not served by the v2 API.
   - intentional homicides per 100k = `VC.IHR.PSRC.P5` (UNODC via WDI)
   - physicians per 1,000 = `SH.MED.PHYS.ZS` (WHO via WDI), shown per 100k
   - Each value keeps its own latest year (from 2015 onwards); implausible
     price levels (outside 5–500) are dropped.
3. **Connectivity is removed** from the product (mixer slider, metrics panel,
   nomad hub score) until an authentic, commercially usable source exists.
   The nomad hub now scores climate + affordability + safety, with the formula
   spelled out on the page.
4. The synthetic `safety_score` is replaced by the real homicide rate (lower
   is better). No derived "scores" are presented as data.

## Consequences

- Attribution (CC BY 4.0) is on `/methodology`, in the site footer and in the
  README. Keep it there.
- Every city in a country shares its cost/safety/health values. The mixer
  says so ("national price level", "national homicide rate"), and cities tie
  on those dimensions within a country.
- **Licence caveat:** WDI states that third-party series inside it (UNODC
  homicides, WHO physicians) carry their original provider's terms. Both are
  published for public reuse with attribution, which we give; check their
  current terms before any commercial repackaging of the raw numbers.
- Some city URLs changed where GeoNames names a city differently from the old
  dataset (e.g. `new-york-city-united-states`). The sitemap regenerates, and
  unknown slugs 404.
- Refreshing is a data job, not a code change: `npm run db:seed` (all data)
  or `npm run db:seed -- --only=indicators`. `npm run db:seed:sql` regenerates
  the committed dev fixture `supabase/seed.sql`.
- Upgrading to a licensed city-level source later (e.g. the Numbeo API) means
  adding a city-level table and preferring it in the `city_metrics` view;
  the app reads only the view.
