# Changelog

All notable changes to the Vivasayi project will be documented in this file.

## [Unreleased] - 2026-07-07

### Added
- Created comprehensive unit and integration test suite using Vitest:
  - `src/ai/__tests__/with-retry.test.ts`: Covers exponential backoff retry classification, daily quota model fallback routing, and error path propagation.
  - `src/ai/flows/__tests__/disease-detection-flow.test.ts`: Mocks Genkit flows to verify structured output parsing and error boundaries.
  - `src/ai/flows/__tests__/crop-recommendations.test.ts`: Asserts prompt mappings and historical tool query execution.
  - `src/ai/flows/__tests__/personalized-space-flow.test.ts`: Tests cultivation plan flow generation.
  - `src/actions/__tests__/storage-actions.test.ts`: Verifies Supabase SSR server client and private signed URL extraction.
  - `src/services/__tests__/market-service.test.ts`: Tests AI pricing mapping with fallback handling, and historical records filters.
  - `src/services/__tests__/weather-service.test.ts`: Exercises OpenWeatherMap API queries and local weather fallbacks.
- Integrated GitHub Actions CI configuration in `.github/workflows/ci.yml` running linting, typecheck, and test checks automatically.
- Defined explicit commit message standards going forward (logical, isolated commits describing *what changed and why*).

### Changed
- Restructured Supabase database migrations to standard CLI format: transitioned monolithic reverse-engineered `supabase/migrations.sql` to versioned migration `supabase/migrations/20260707123653_init.sql`.
- Updated `README.md` to document the versioned migrations structure, updated automated tests health, and added a **Known Limitations** section (tested vs untested boundaries, mock databases, and platform context).

### Removed
- Permanently decommissioned legacy and ambiguous Firebase configuration files (`.firebaserc`, `.idx/` directory, and `.modified` file) to eliminate backend infrastructure confusion.
