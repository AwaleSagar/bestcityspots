# Shared

This directory is for cross-cutting, domain-agnostic code.

## Allowed content

1. Generic types and utility helpers.
2. Shared schemas used across multiple domains.
3. Constants that are not domain-specific.

## Not allowed

1. Business workflows.
2. Direct provider calls.
3. Persistence orchestration.

If logic becomes domain-specific, move it into src/domains.
