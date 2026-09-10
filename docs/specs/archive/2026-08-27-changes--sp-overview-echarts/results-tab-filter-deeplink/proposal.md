# Proposal: Results tab — filter deep-link via query params (+ center filter)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-overview-echarts/results-tab-filter-deeplink` |
| Parent Spec | `changes/sp-overview-echarts` (`../family.md`, row #1) |
| Type | Change |
| Approval Mode | gated |
| Status | Proposed (approved as chunk of parent, 2026-08-27) |
| Date | 2026-08-27 |
| Author | j.cadavid@cgiar.org |
| Depends on | none |
| Parallel-safe | yes |
| Ticket | P2-3408 (Results tab cannot receive a category from the URL) |

## 2. Intent

Let any surface deep-link into the SP Results tab with filters pre-applied, so overview charts (sibling #3) and shared links can open a filtered list. Add the missing **center** filter dimension.

## 3. Problem / Current Behavior

- `ProgrammeResultsFilterService` is provided on the component (`programme-results.component.ts:152-155`), holds `searchText / selectedSections / selectedStatus / selectedCategory / selectedOrigin` as signals (`programme-results-filter.service.ts:22-29`), and is written **only** from the dropdowns/pills/search box.
- The component reads only the path param (`:502 entityId`); `queryParams` are outgoing only (review-drawer deep link `reviewResult`, `phase`, Copy link).
- No **center** filter although rows carry `lead_center` (`programme-results.service.ts:34`, column only).
- Prior art to copy: `dashboard-lab.component.ts:764-793` (write effect, `queryParamsHandling: 'merge'`, `replaceUrl: true`) and `:1253-1288` (`restoreFromUrl`); named-param constants in `bilateral-results.service.ts:7,14`.

## 4. Proposed Outcome

- On load (and on `queryParams` change), the filter service hydrates from `category`, `status`, `origin`, `center` (all optional, single-valued, matched case-insensitively against the option lists derived from loaded rows). Unknown values are ignored silently and dropped from the URL.
- Filter changes made in the UI are mirrored back to the URL (merge, `replaceUrl`) so Copy link carries them; `reviewResult`/`phase` params keep working.
- New **center** `app-pr-filter-select` (options from `lead_center`), with chip + clear-all like the others.
- With no params, behavior is byte-for-byte today's.

## 5. Scope

- **In:** `programme-results/` component + filter service + service option lists; named-constant param map; Jest specs (hydration, URL mirroring, center filter, unknown values).
- **Out:** overview click wiring (#3), any chart, `section` filter (inert — P2-3398/3399), multi-value params, backend.

## 6. Non-Goals

- No `custom-fields/pr-select` on this surface (`DataControlService` DOM-scans `.pr-field.mandatory`) — use `pr-filter-select`.
- No persistence of filters in `localStorage`.

## 7. Affected Users, Systems, And Specs

All PRMS users on SP Results; client only. Sibling #3 consumes this contract; `programme-results/CLAUDE.md` must document the query-param contract at archive.

## 8. Visual Reference

- Source: None needed — existing dropdown/chip UI; the center filter reuses `app-pr-filter-select`.

## 9. Requirement Delta Preview

### ADDED
- Query-param hydration (`category`, `status`, `origin`, `center`) and URL mirroring.
- `center` filter dimension (`ProgrammeResultsFilterDimension` gains `'center'`; state gains `selectedCenter`).

### MODIFIED
- `activeChips()`, `clearChip()`, `clearAll()` cover the new dimension.

### REMOVED
- None.

## 10. Approach Options

| Option | Description | Verdict |
|---|---|---|
| **A. Hydrate in the component via `toSignal(route.queryParamMap)` → service setters; mirror with an effect (dashboard-lab pattern)** | Service stays pure/testable; component owns router I/O. | ✅ Matches existing patterns |
| B. Inject `ActivatedRoute` into the filter service | Fewer lines. | ❌ Couples a pure service to the router; harder unit tests |

## 11. Recommended Approach

Option A. ~80–120 LOC + tests. Lite depth.

## 12. Risks, Dependencies, And Open Questions

| Item | Kind | Note |
|---|---|---|
| `origin` values (`source_name`) for W1/W2 vs W3/Bilateral are an assumption (P2-3400) | Open question | Verify against real rows at specify; constant map with fallback to raw value |
| Options are derived from loaded rows → hydration must wait for rows | Dependency | Apply params after `rows` resolve; re-apply if params change |
| Status names must match `status_name` exactly (e.g. "Quality assessed") | Risk | Case-insensitive match; document canonical list |

## 13. Success Criteria

1. `…/SP02/results?category=Innovation%20development&status=Submitted&center=IITA` → list filtered, three chips, identical to manual selection.
2. Changing a dropdown updates the URL; Copy link reproduces the filtered view.
3. Unknown param values are ignored and removed; no-param behavior unchanged; Jest green.

## 14. Next Step

```text
/akili-specify changes/sp-overview-echarts/results-tab-filter-deeplink
```
