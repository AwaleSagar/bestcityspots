# Platform

This directory hosts cross-domain infrastructure modules.

## Planned modules

1. provider-gateway - wrappers around third-party APIs.
2. data-access - repositories and persistence adapters.
3. cache - SWR orchestration, TTL/version policy.
4. observability - logging, correlation, telemetry.

## Rules

1. Domain modules may depend on platform modules.
2. UI and route layers should not directly depend on provider-gateway internals.
3. Keep platform APIs stable and minimal; expose typed contracts.
