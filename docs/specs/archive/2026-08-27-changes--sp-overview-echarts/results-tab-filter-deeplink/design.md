# `changes/sp-overview-echarts/results-tab-filter-deeplink` — Design

## 1. Summary

- **Spec:** `changes/sp-overview-echarts/results-tab-filter-deeplink` · **Depth:** Lite · **Status:** approved (2026-08-27)
- **Linked:** `./requirements.md` (RFD-R-1..3) · parent `../proposal.md` §5 C1 · `../family.md` row #1
- **One-liner:** The Results tab component gains a two-way bridge between four query params and the existing pure filter service; the service gains a fifth dimension (center). No new services, no backend, no `package.json`.
- **Budget (Step 2.4):** **2 tasks · ~150 LOC (≈70 src + ≈80 spec) · 1 review round.** Matches Lite.

## 2. Architecture Overview

### 2.1 Where this lives
`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/` only:

| File | Change |
|---|---|
| `services/programme-results-filter.service.ts` | + `selectedCenter` signal, `'center'` dimension, predicate clause, chip, `clearCenter`, `clearAll`; stays **router-free** |
| `services/programme-results-query-params.ts` (NEW, ~15 LOC) | Exported constants: param names `status` · `category` · `origin` · `center` and the `dimension → param` map. **Sibling #3 imports this file** to build overview links — it is the contract |
| `services/programme-results.service.ts` | + `centerOptions` (same `optionsOf` derivation as the other three) |
| `programme-results.component.ts` | + hydration effect (URL → service), + mirror effect (service → URL), + `centerSelectOptions`, `onCenterChange` |
| `programme-results.component.html` | + one `app-pr-filter-select` (Center) after Origin |
| the three `*.spec.ts` | new cases per §10 |

### 2.2 Interaction
1. **Hydrate.** Component exposes `queryParams = toSignal(route.queryParamMap)`. An `effect` reads the four params and writes each filter signal **only when the value differs** (string compare, `null` when absent). Runs on init and on every param change (Back/Forward, external navigation while on the tab).
2. **Mirror.** A second `effect` reads the four filter signals and, inside `untracked`, compares them with the current `route.snapshot.queryParamMap`; if any differs it calls `router.navigate([], { relativeTo: route, queryParams: {…four keys, null when cleared}, queryParamsHandling: 'merge', replaceUrl: true })`. The equality guard is what breaks the hydrate ↔ mirror cycle (RFD-R-2 `AND IT MUST NOT` loop); a second guard skips mirroring while hydration is applying.
3. **Center filter** follows the exact pattern of Status/Category/Origin: derived options → `{value,label}` → `app-pr-filter-select` → `toFilterValue` → signal.

## 3. Data Model Changes
None. `ProgrammeResultRow.center` already exists (`lead_center`).

## 4. API Surface
None (client only). Contract introduced: the URL query params above, documented in `programme-results/CLAUDE.md` at archive (pending item — spec branch).

## 5. Server Workflow / Business Rules
N/A.

## 6. Frontend Plan

### 6.1 Routes
No route change; `entity-details/:entityId/results` now honors query params.

### 6.2 Components & services
See §2.1. Param names are **plain** (`status`, not `pgrStatus`): the route already carries `phase`, `reviewResult`, `reviewResultId` — no collision, and plain names read well in shared links.

### 6.3 Design system usage
`app-pr-filter-select` (never `custom-fields/pr-select` — `DataControlService.someMandatoryFieldIncomplete` DOM-scans `.pr-field.mandatory`). Width `w-[150px]`, `aria-label="Filter by center"`, placeholder "Center". Tailwind-first, no new SCSS.

## 7. Security & Authorization
None — params only narrow an already-authorized list client-side.

## 8. Performance
Two effects; one extra `computed` for options. Negligible.

## 9. Observability
None.

## 10. Testing Plan

| Spec | Cases |
|---|---|
| `programme-results-filter.service.spec.ts` | center predicate (match / no-match / empty center row); chip `Center: X`; `clearChip('center')`; `clearAll` resets center |
| `programme-results.service.spec.ts` | `centerOptions` sorted, deduped, **no blanks** |
| `programme-results.component.spec.ts` | ActivatedRoute stub with a `BehaviorSubject<ParamMap>` for `queryParamMap` + `snapshot`; Router spy. Cases: (a) 3 params → `filter.state()` populated + 3 chips rendered + `navigate` **not** called (equality guard); (b) `status=Foo` → chip present, filtered-empty state text rendered; (c) no params → no chips, `navigate` not called; (d) `onCategoryChange('X')` → `navigate` called once with `replaceUrl:true`, `queryParamsHandling:'merge'`, `category:'X'`; (e) `clearAll` → all four keys `null`; (f) param change via subject → state updates |

## 11. Backwards Compatibility
No-param behavior identical; existing outgoing `queryParams` (review drawer, `phase`, Copy link) untouched — Copy link now naturally includes filters because it serializes the current tree.

## 12. Design Decisions

| # | Decision | Rationale / rejected |
|---|---|---|
| `RFD-DD-1` | Router I/O in the **component**, filter service stays pure | Service is unit-tested as pure functions today; injecting `ActivatedRoute` there would couple every predicate test to the router. Rejected: router-aware service. |
| `RFD-DD-2` | Hydrate **immediately**, never wait for rows | Predicates are pure/case-insensitive; waiting adds a pending-state machine (dashboard-lab's `pendingFilters`) for no gain. Unknown value → chip + filtered-empty state (RFD-R-1 scenario 2) — honest and zero extra code. Supersedes proposal §4 "ignored silently". |
| `RFD-DD-3` | Plain param names in a dedicated constants file | Contract for sibling #3; plain names since no collision with `phase`/`reviewResult*`. |
| `RFD-DD-4` | `replaceUrl: true` + `merge` | Filter tweaks are not navigation steps (Back should leave the tab, not undo a dropdown) — same stance as dashboard-lab's mirror effect. |
| `RFD-DD-5` | Equality guard in both effects (no `pending*` flags) | Two guards, no state; loop-proof by construction and unit-testable via `navigate` call count. |

**Reversion challenge (Step 2.3):** none triggered — the design only adds; nothing shipped is removed or inverted.

## 13. Open Gaps & Follow-ups
- `q` (search) and `section` params: deliberately out (proposal). Add when a consumer needs them.
- `programme-results/CLAUDE.md` contract note → pending item at archive (spec branch).
