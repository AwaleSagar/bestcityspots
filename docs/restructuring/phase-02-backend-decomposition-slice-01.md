# Phase 2 Report - Backend Decomposition (Slice 01)

Date: 2026-06-06
Status: In Progress

## Objectives

1. Reduce direct persistence coupling in core service modules.
2. Standardize cache-first stale-while-revalidate orchestration.
3. Preserve runtime behavior while introducing extraction seams.

## Rationale

Weather, metrics, and intelligence services repeated cache-read/fallback/write patterns and tightly coupled table I/O with orchestration logic. This slice creates shared infrastructure and migrates three services with minimal behavioral risk.

## Completed Changes

1. Added shared cache orchestration utility:
   1. src/platform/cache/swr.ts
2. Added repository seams:
   1. src/platform/data-access/weather-cache-repository.ts
   2. src/platform/data-access/metrics-cache-repository.ts
   3. src/platform/data-access/city-insights-repository.ts
   4. src/platform/data-access/analytics-repository.ts
   5. src/platform/data-access/places-cache-repository.ts
3. Migrated services to shared seam-based flow:
   1. src/lib/weather.ts now uses shared SWR orchestration and weather repository.
   2. src/lib/metrics.ts now uses shared SWR orchestration and metrics repository.
   3. src/lib/intelligence.ts now uses city insights repository for cache read/write.
   4. src/lib/analytics.ts now delegates DB RPC persistence to analytics repository.
   5. src/lib/places.ts now delegates cache read/write and cache-event persistence to places repository.

## Pending Work

1. Move remaining places-specific concerns (image enrichment, ranking orchestration) into dedicated domain modules.
2. Consolidate shared error taxonomy and structured event naming across all services.
3. Introduce retry/backoff policy for selected analytics and cache writes where safe.

## Risks and Mitigations

1. Risk: Behavior drift in fallback semantics.
2. Mitigation: Preserve existing fetch/parse logic and only extract read/write and orchestration glue.

3. Risk: Additional abstraction overhead in hot paths.
4. Mitigation: Keep orchestration utility lightweight and side-effect minimal.

## Operational Impact

1. No expected contract changes for API routes.
2. Lower maintenance risk through shared cache flow and fewer duplicated I/O paths.
3. Improved traceability for future instrumentation and retries at repository boundaries.

## Migration Notes

1. This slice is compatibility-first and non-breaking.
2. Additional slices will move places and analytics to the same pattern.
3. Once all major services migrate, warning-level guardrails can be tightened.
