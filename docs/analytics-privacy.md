# Analytics Privacy Notes

Best City Spots uses privacy-conscious analytics to understand aggregate product usage and city-guide performance. The current implementation is designed around data minimisation and operational necessity rather than advertising or cross-site profiling.

## Current Legal-Basis Decision

- General page/action analytics are treated as pseudonymous, aggregate-first operational analytics.
- Geo enrichment remains consent-based through the geo consent banner before precise browser location is requested.
- Do not expand analytics into advertising, cross-site tracking, or per-user behavioural profiling without adding an explicit consent flow.

## Data-Minimisation Rules

- Referrers should be reduced to origin only before being sent.
- Beacon payloads should use `application/json` `Blob`s for predictable server and proxy handling.
- Respect browser Do Not Track signals.
- Avoid storing raw IP addresses or precise user identifiers in application analytics tables.
- Treat persistent returning-user markers such as `bcs_visited` as consent-sensitive; keep them limited to local UX analytics unless a broader consent model is added.

## Retention Follow-Up

Analytics aggregate tables should have a documented retention window. A future Supabase maintenance migration should purge analytics aggregate rows older than the agreed window, currently recommended at 13 months.
