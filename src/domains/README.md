# Domains

This directory hosts business-domain modules extracted from src/lib.

## Planned domains

1. city-discovery
2. city-intelligence
3. places
4. city-vitals
5. analytics

## Module template

Each domain should contain:

1. service.ts - business orchestration and use-cases.
2. contracts.ts - DTOs and boundary interfaces.
3. validation.ts - domain-level validation extensions.
4. tests - unit and contract tests.

During migration, keep adapters/shims near extraction points and document replacements in docs/restructuring.
