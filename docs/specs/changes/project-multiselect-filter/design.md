# Project Multiselect Filter — Design

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-multiselect-filter` |
| Module | `bilateral` — Center Results list |
| Type / Depth | Change / Lite |
| Status | approved (2026-09-18, pivot) |
| Approval Mode | gated |
| Date | 2026-09-18 |
| Requirements | [`requirements.md`](./requirements.md) — `PMF-R-1..2`, `PMF-NFR-1..5` |
| Proposal | [`proposal.md`](./proposal.md) |

## 2. Executive Summary

The Project filter's options switch from "every loaded row's displayed project" to **the center's own bilateral project catalog, phase-scoped**: the existing `GET /api/bilateral/center/projects` endpoint gains an optional `year` query parameter, and the client requests one catalog per selected phase year, unions and dedupes the results into the existing compact multiselect. Filtering, URL serialization, chips, and clearing keep the already-shipped behavior from the first implementation wave.

**Budget (revised by pivot):** 1 task; approximately 450 total changed LOC (≈238 already written in the first wave, ≈210 new across server, client, and tests); 2 review rounds. This fits Lite depth because the change remains one component contract plus one additive optional query parameter.

## 3. Architecture Overview

### 3.1 Location

Two packages change:

1. On selection of phases, the page requests the center project catalog per selected phase year through the existing endpoint, unioning the responses.
2. The multiselect options derive from that union (deduped by id), never from result rows.
3. Selection still drives the existing project signal, shared predicate, active chips, and URL serializer.
4. Results loading is untouched — selecting a project can never refetch rows.

### 3.2 Boundaries

- State remains component-local through Angular signals, consistent with `docs/trd/trd.md` §6 and ADR-005.
- The existing `filterCenterResults` predicate remains the single filtering authority.
- The existing `project` query parameter remains the shareable state contract.
- The server change is additive: an optional `year` query parameter; no response shape, route, or contract change.

## 4. Extended Directory Structure

| Path | Change |
|---|---|
| `onecgiar-pr-server/src/api/bilateral/bilateral-center.controller.ts` | Accept optional `year` query and pass it through. |
| `onecgiar-pr-server/src/api/bilateral/services/bilateral-projects.service.ts` | Filter projects by the requested year instead of only the active year. |
| `onecgiar-pr-server/src/api/bilateral/**/*.spec.ts` | Coverage for the year filter and its default. |
| `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts` | Replace row-derived options with a per-phase-year catalog fetch, union, and deep-link retention; keep the selection handler and normalization from the first wave. |
| `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html` | Unchanged from the first wave (control already in place). |
| `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts` | Replace row-derived option cases with catalog/phase-union cases; keep URL/chip/OR/AND cases. |
| `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/CLAUDE.md` | Update the contract section for the catalog source and re-stamp. |

No new file, module, route, dependency, or style sheet beyond the above.

## 5. Data Model

No persistent model changes.

The page maps catalog entries into ephemeral options:

| Input | Normalization | Option output |
|---|---|---|
| Catalog `id` | Positive integer; dedupe by id across phase years. | Numeric `value`. |
| Catalog `shortName` + `fullName` | Trimmed, joined with a space; fallback to `fullName`, then `Project <id>`. | `label`. |
| URL-selected ID absent from the union | Retain after catalog options. | Numeric `value` plus `Project <id>` label. |

Labels keep the table-column format (`A-AG10156 Accelerating Impacts…`), matching how `bilateral-overview.component.ts` already renders catalog project names.

## 6. API Design

### 6.1 Changed endpoint

| Field | Value |
|---|---|
| **Method + path** | `GET /api/bilateral/center/projects` |
| **Version** | `api` (existing endpoint — additive change, no `v2` needed). |
| **Auth** | Existing posture unchanged (endpoint already consumed by the client). |
| **Query params** | `centerId` (existing, required) · `year` (new, optional, positive integer) |
| **Request example** | `GET /api/bilateral/center/projects?centerId=123&year=2025` |
| **Response** | Existing `{ projects: [...] }` shape unchanged. |
| **Errors** | Invalid `year` (non-numeric) is ignored via optional integer parsing, falling back to the active year — never a 5xx. |
| **Telemetry** | Existing service logs already record the phase used; the log line must name the resolved target year. |

### 6.2 Compatibility

- Without `year`: byte-for-byte current behavior (active year).
- With `year`: filter becomes `p.phase === year` at the same place the active-year filter runs today.
- No change to `docs/bilateral-result-summaries.en.md` — this endpoint is not part of the bilateral payload contract.

## 7. Backend Module Design

`BilateralProjectsService.getProjectsByCenter(centerId, year?)` resolves `targetYear = year ?? activeYear.year`; when the optional year is absent or invalid it falls back to the existing active-year lookup. All downstream rules (active flag, W3 program mapping, allocation, science-program resolution) stay identical. The controller accepts the optional query through the existing param handling without a new DTO; swagger docs annotate the new `@ApiQuery`.

## 8. Frontend / UX Component Architecture

### 8.1 Catalog state

- A page-lifetime cache keyed by phase year: `Map<number, CatalogOption[]>` populated on demand.
- A computed union for the selected phase years: dedupe by project id, sort case-insensitively by label.
- Phase changes request only years not already cached; a failed year is recorded so it is not retried in a loop, and the union degrades to what other years provide (or empty).

### 8.2 Selection state and filtering

The first wave's `onProjectFilterChange` normalization and `syncUrlParams` routing stay unchanged. The existing predicate supplies OR-within-project and AND-across-dimension semantics.

### 8.3 Control composition and placement

Unchanged from the first wave: `app-pr-filter-multiselect` between Source and Created by, visible Project label, accessible group name, search enabled, plural count label. The option-label builder mirrors `bilateral-overview.component.ts` project options where useful, but stays local to this component.

### 8.4 UI states and responsive behavior

| State | Behavior |
|---|---|
| Catalog loading | Control renders with current (possibly empty) options; page states remain authoritative. |
| Catalog loaded | Phase-year union appears; selections apply immediately. |
| Catalog failure | Options degrade to other cached years or empty; no project-specific error surface. |
| Phase change | Only the new years are fetched; options update; retained deep-link ids stay selectable. |
| Empty / error (page) | Existing page states remain authoritative; no second project-specific state. |
| Desktop/tablet | Existing popover width and vertical flow retained at 1280px and 900px; no horizontal overflow. |

## 9. Shared Contracts or Package Extensions

No shared component or package extension. The design consumes the current `app-pr-filter-multiselect`, the current bilateral URL/filter contracts, and the existing catalog endpoint.

## 10. Security, Performance & Observability

| Concern | Decision |
|---|---|
| Security | No new data exposure; the endpoint's existing access posture and the `auth` interceptor are unchanged. |
| Performance | At most one catalog request per selected phase year per page lifetime; selection adds no HTTP call; option derivation is linear over catalog rows. |
| Error handling | Catalog failures degrade to the existing empty-options state; the results pipeline is untouched. |
| Observability | Server log line names the resolved target year; no new client telemetry. |

## 11. Testing Plan

- **Server:** `getProjectsByCenter` filters by the requested year; `year` absent/undefined/invalid falls back to the active year; the response shape is unchanged.
- **Client component:** phase-union options, cross-phase dedupe, label formatting and `Project <id>` fallback, retained deep-link ids, OR/AND filtering with the existing predicate, URL/chip round-trip, Clear all, no results refetch on selection, one fetch per year, fetch only uncached years on phase change.
- **Regressions:** `bilateral-result-filter.spec.ts` and `bilateral-query-params.spec.ts` stay green.
- **Browser:** the existing 1280px/900px + keyboard HITL check remains mandatory (`PMF-AC-4`).

## 12. Backwards Compatibility & Rollback

- Endpoint without `year` keeps current behavior; the first-wave client code (row-derived options) is replaced but was never released — no user-visible reversion.
- Existing project deep links and chips continue to work; a deep-linked id absent from the catalog remains selectable and removable.
- Rollback is a direct revert of the component/template/test/guide and server service/controller changes; no data or migration rollback exists.

## 13. Design Decisions

### `PMF-DD-1` (rewritten) — Center catalog, phase-scoped

- **Decision:** Options come from the center's own project catalog per selected phase year, unioned and deduped — not from loaded result rows.
- **Why:** The live data proved row-derived options surface other Centers' projects (contributing rows) and hide catalog projects with zero rows; the user confirmed the center-catalog source and its phase scoping.
- **Rejected:** Row-derived options (first wave), lead-only rows (loses contributing-project filtering and still misses zero-row projects), center-only row filtering (still requires the catalog and misses zero-row projects).
- **Requirements:** `PMF-R-1`, `PMF-NFR-1`, `PMF-NFR-4`.

### `PMF-DD-2` — Extend the existing project state contract

- **Decision:** Keep the current project signal, shared predicate, URL serializer, chips, and clear paths as the only state contract.
- **Why:** These behaviors are already tested and shipped; adding parallel state would create synchronization risk.
- **Rejected:** A new filter service or router effect duplicates page-local behavior.
- **Requirements:** `PMF-R-1`, `PMF-R-2`.

### `PMF-DD-3` — Preserve absent deep-link selections

- **Decision:** Merge selected IDs missing from the catalog union into selectable options with `Project <id>` labels.
- **Why:** A valid shared URL must remain understandable and clearable when phases or the catalog change.
- **Rejected:** Silently dropping IDs makes the visible control disagree with the URL contract.
- **Requirements:** `PMF-R-2`.

### `PMF-DD-4` — Reuse the current multiselect and visual language

- **Decision:** Keep the single instance of the existing filter multiselect with no shared-component or styling changes.
- **Why:** It matches the adjacent Created-by control and keeps this change bounded.
- **Rejected:** A new Spartan primitive or popover redesign introduces a competing interaction pattern and wider regression surface.
- **Requirements:** `PMF-R-1`, `PMF-NFR-2`, `PMF-NFR-3`.

### `PMF-DD-5` — Additive `year` query parameter on the catalog endpoint

- **Decision:** Optional positive-integer `year` on `GET /api/bilateral/center/projects`; absent or invalid falls back to the active year.
- **Why:** The catalog is inherently phase-scoped (the user's reminder); a server-side filter is the smallest correct way to ask per year without changing the response shape.
- **Rejected:** Client-side year filtering of the whole catalog (endpoint only returns one year), a new endpoint, or a response-shape change.
- **Requirements:** `PMF-R-1`, `PMF-NFR-1`, `PMF-NFR-4`.

## 14. Reversion Challenge

Triggered by the `PMF-DD-1` rewrite: the first wave's row-derived option code (in the working tree, never released) is being replaced by catalog-derived options. Challenge — what does removing row-derived options break? **Nothing user-visible:** the feature was never merged or shipped; the first wave's five component tests will be rewritten against the catalog source, and the URL/chip/OR/AND behavior they pinned is preserved unchanged. Recorded per Step 2.3.

## 15. Open Gaps & Follow-ups

- Filtering by every project relation attached to a result remains a separate potential feature because it requires a row/API semantics decision.
- The shared multiselect's broader accessibility modernization is outside this Lite spec; this usage must not weaken its current keyboard/focus behavior.
- The manual keyboard activation HITL item (Enter/Space synthesis and visible focus ring) from the first review round remains open for the user at the implementation gate.

## Required Cross-References

- [`proposal.md`](./proposal.md)
- [`requirements.md`](./requirements.md)
- [`execution.md`](./execution.md) Pivot Record
- `docs/prd.md` §5, G4/M4.2, AC-3, AC-9
- `docs/ux-ui/design.md` §6, §8, §9, §10
- `docs/trd/trd.md` §6 and §10
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/CLAUDE.md`
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.ts` (catalog label exemplar)
