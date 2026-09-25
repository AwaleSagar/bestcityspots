# ADR-001: Cost-of-Living Data Source

Status: **Superseded** by [ADR-003](adr-003-reference-data-sources.md) (2026-09-25) · Date: 2026-06-11 · Story: US-09 (audit AF-2)

> The importer and `data/cost-of-living.csv` described here were removed with the
> backend rebuild. Cost now comes from World Bank price levels, country-level.

## Context

`city_metrics.cost_index` existed in the schema but was never populated — the
live-fetch path hardcoded `null` and each refresh clobbered any value in the
cache. Cost of living is the highest-demand metric in the city-comparison
category (benchmark: Numbeo, Nomads.com).

## Options considered

1. **Numbeo Data API** (numbeo.com/common/api.jsp): broadest coverage
   (~12.7k cities), commercial usage rights, subscription priced per query
   volume. Best data; recurring cost; attribution required.
2. **Public-domain institutional datasets** (World Bank / OECD / Eurostat
   derived, e.g. the WhereNext open dataset — ~380 cities, downloadable
   CSV/JSON, free, reusable): smaller coverage, slower cadence, zero cost.
3. **Kaggle "cost of living" dumps**: rejected — they are scraped Numbeo data
   with unknown/absent licenses. Shipping them risks both accuracy and IP.

## Decision

**v1: curated static dataset, imported quarterly** via
`scripts/import-cost-index.ts` from `data/cost-of-living.csv`
(columns: `city,country,cost_index,source,as_of`). Procure the file from
option 2 (public-domain) initially; upgrade to option 1 (Numbeo license) when
coverage above ~400 matched cities is needed. The importer is source-agnostic
— switching providers is a data swap, not a code change.

Zero runtime cost, zero new request-path dependencies, and the cost guard is
untouched (imports run offline against Supabase with the service-role key).

## Consequences

- `fetchFreshMetrics()` now **preserves** durable fields (cost, connectivity,
  safety, health access) across live refreshes; only pollution/climate are
  live (src/lib/metrics.ts).
- The metric surfaces automatically in the city page panel and `/compare`
  via `selectAvailableMetrics()` (US-03), with its source + as-of date shown.
- Coverage target (≥500 cities) is bounded by the procured dataset; track the
  matched-row count the importer reports per run.
- Refresh process: replace the CSV, re-run `npm run import:cost`, done.
