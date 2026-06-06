# Restructuring Decision Log

This file tracks architecture decisions, trade-offs, and rationale during migration.

## ADR-001 - Use Incremental Migration Over Big-Bang Rewrite

- Date: 2026-06-06
- Status: Accepted
- Context: The codebase has active feature and data dependencies (providers, Supabase caches, route handlers). A full rewrite would introduce high product and operational risk.
- Decision: Use phased, compatibility-first migration with non-breaking guardrails, then extract shared abstractions progressively.
- Consequences:
  1. Slower short-term refactor velocity.
  2. Lower regression risk and easier rollback.
  3. Temporary dual-path code may exist during transition.

## ADR-002 - Domain-Oriented Structure with Platform Modules

- Date: 2026-06-06
- Status: Proposed
- Context: Current service modules mix orchestration, persistence, provider calls, and UI-facing shaping.
- Decision: Organize around business domains plus platform layers:
  1. Domains: city-discovery, city-intelligence, places, city-vitals, analytics.
  2. Platform: provider-gateway, data-access, cache, observability.
- Consequences:
  1. Clearer ownership and test seams.
  2. Requires incremental path mapping from existing modules.

## ADR-003 - Introduce Guardrails as Warnings First

- Date: 2026-06-06
- Status: Accepted
- Context: Immediate hard enforcement may block ongoing work due existing violations.
- Decision: Add architecture guardrails as warning-level lint rules first, then ratchet to error after cleanup.
- Consequences:
  1. Early visibility with minimal disruption.
  2. Requires discipline to convert warnings to errors on schedule.

## ADR-004 - Extract Shared Cache Orchestration and Repository Seams First

- Date: 2026-06-06
- Status: Accepted
- Context: Multiple service modules duplicate stale-while-revalidate logic and own direct table-level persistence, creating tight coupling and drift.
- Decision: Introduce a shared SWR orchestration utility and repository modules for weather, metrics, and city insights before further domain extraction.
- Consequences:
  1. Immediate reduction of duplicated cache flow logic.
  2. Service modules retain behavior while persistence concern is isolated.
  3. Establishes migration template for places and analytics modules.
