# Phase 1 Report - Target Architecture and Boundaries

Date: 2026-06-06
Status: In Progress

## Objectives

1. Define and communicate the target architecture.
2. Establish early, non-breaking guardrails.
3. Prepare codebase structure for incremental extraction.

## Rationale

Current architecture has high coupling between route/UI layers and orchestration concerns. Defining boundaries first reduces future migration churn and review ambiguity.

## Completed Changes

1. Added target architecture diagram: docs/architecture/diagrams/phase-01-target-architecture.mmd.
2. Added warning-level lint guardrail in eslint.config.mjs to discourage direct provider imports in route/UI/hook layers.
3. Added structure docs for domain/platform/shared module placement under src.

## Pending Work

1. Add explicit ownership matrix per domain.
2. Define service and repository contract templates.
3. Start first extraction slice in backend (cache orchestration + repository seam).

## Risks and Mitigations

1. Risk: Warning-only guardrails are ignored.
2. Mitigation: Promote to error after initial cleanup milestone.

3. Risk: Premature directory reshuffling causes merge conflicts.
4. Mitigation: Begin with docs and seam-based extraction before moving large files.

## Operational Impact

1. No runtime behavior changes in this phase.
2. Lint output may include new warnings where direct provider imports exist.

## Architecture Guardrail Policy (Current)

1. Route/UI/hook layers should depend on domain services, not provider modules.
2. Provider modules remain platform-internal.
3. During migration, violations surface as warnings.
