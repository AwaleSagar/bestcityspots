# Platform

Cross-domain infrastructure modules. Currently implemented:

1. **data-access** — repositories and persistence adapters (cache row reads/writes for insights, weather, metrics, places).
2. **cache** — SWR orchestration, TTL/version policy.

Not yet implemented (aspirational): `provider-gateway` (third-party API wrappers — currently live in `src/lib/providers/*`) and `observability` (structured logging currently in `src/lib/logger.ts`).

## Rules

1. Domain/service modules may depend on platform modules.
2. UI and route layers should not directly depend on data-access internals.
3. Keep platform APIs stable and minimal; expose typed contracts.
