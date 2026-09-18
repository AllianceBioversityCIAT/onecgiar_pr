# Project Multiselect Filter — Archive Summary

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `changes/project-multiselect-filter` |
| Archive Date | 2026-09-18 |
| Final Status | completed — PASS |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Approval Mode | gated |
| Target Archive Path | `docs/specs/archive/2026-09-18-changes--project-multiselect-filter/` |

## 2. Executive Outcome

Delivered the **Project Multiselect Filter** for Bilateral Results (`/bilateral/:center/results`):
- Users can filter bilateral results by one or more of their own center's bilateral projects.
- Options are sourced from the center's project catalog per selected phase year (deduplicated across phases), avoiding cross-center project noise.
- Selection applies entirely on the client without refetching results, synchronized with comma-separated `?project=101,102` URL query parameters and interactive chips.
- Backend `GET /api/bilateral/center/projects` was extended with an optional `year` query parameter, retaining 100% backwards compatibility when omitted.

## 3. Requirements Delivered

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| `PMF-R-1` | Center-catalog project options per selected phase year, deduplicated by id, fallback label `Project <id>`, zero results refetch | Delivered | `bilateral-results-list.component.ts`, unit tests |
| `PMF-R-2` | Comma-separated `project` URL parameter, active chips, full hydration and clear synchronization | Delivered | `bilateral-results-list.component.ts`, `bilateral-query-params.spec.ts` |
| `PMF-NFR-1` | At most one catalog request per phase year per page lifetime (in-memory caching) | Delivered | `bilateral-results-list.component.ts`, call count tests |
| `PMF-NFR-2` | Keyboard and popover accessibility; `:focus-visible` styling | Delivered | Browser HITL verification |
| `PMF-NFR-3` | Responsive layout with no horizontal overflow at 1280px and 900px | Delivered | Measured in browser session |
| `PMF-NFR-4` | Backend `year` parameter backwards compatibility | Delivered | `bilateral-projects.service.spec.ts`, controller specs |
| `PMF-NFR-5` | Auth posture unchanged; no new data exposure | Delivered | Static review, existing endpoint scopes |
| `PMF-AC-1..4` | Complete test suites (client + server), linter, build, and browser verification | Delivered | Passing test reports |

## 4. Files Changed Summary

### Client (`onecgiar-pr-client`)
- `src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts`: Catalog fetch per selected phase year, caching per year, union and deduplication, URL sync.
- `src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html`: Project filter placed between Source and Created by.
- `src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts`: 10 focused PMF test cases.
- `src/app/pages/bilateral/pages/bilateral-results-list/CLAUDE.md`: Project filter contract and verification stamp.
- `src/app/shared/services/api/bilateral-api.service.ts` & spec: Added optional `year?: number` to `GET_bilateralProjects`.

### Server (`onecgiar-pr-server`)
- `src/api/bilateral/bilateral-center.controller.ts` & spec: Optional `@Query('year') year?: number`.
- `src/api/bilateral/services/bilateral-center.service.ts` & spec: Forward `year` argument to project service.
- `src/api/bilateral/services/bilateral-projects.service.ts` & spec: Filter by `cp.reporting_year = :year` when provided, fallback to active phase when omitted or invalid.

## 5. Test Evidence Summary

| Suite / Gate | Result | Notes |
|---|---|---|
| Client Focused Jest | PASS (3 suites, 150/150 tests) | `bilateral-results-list.component.spec.ts`, `bilateral-result-filter.spec.ts`, `bilateral-query-params.spec.ts` |
| Client Full Bilateral Suite | PASS (47 suites, 1596/1596 tests) | Full bilateral page and component coverage |
| Client Linter (`ng lint`) | PASS (0 errors) | Verified clean on touched files |
| Client Build (`npm run build:dev`) | PASS | Bundle generated without errors |
| Server Jest (`src/api/bilateral`) | PASS (32 suites, 577/577 tests) | Controller and service tests |
| Server ESLint | PASS | 0 new violations |
| Server Full Test Suite | PASS (247 suites, 2800/2800 tests) | Clean suite run |

## 6. Validation Summary

- **Orca Live Browser Testing:** Verified at `http://qa-development-2026.orca.localhost:63760/bilateral/AfricaRice/results`:
  - Filters popover opens cleanly, Project multiselect renders with proper grouping and search.
  - Multi-project selection (`[1368, 1369]`) filters rows instantaneously without refetching results.
  - Comma-separated URL (`?project=1368,1369`) updates cleanly; individual chip removal and Clear all restore unfiltered rows.
  - Viewports at 1280px and 900px tested without overflow.
  - Escape key closes popover.

## 7. Accepted Warnings & Follow-Ups

- **Pivot Record (Wave 1 → Wave 2):** Deriving options from loaded rows surfaced foreign projects from contributing results. Pivot to center-catalog options was approved by the user and successfully implemented.
- **Rollout:** Additive backend parameter, standard deployment, no migration needed.
