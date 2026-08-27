# `changes/sp-overview-echarts/results-tab-filter-deeplink` — Requirements

## 1. Module / Feature

- **Module:** `result-framework-reporting` → `programme-results` (SP Results tab, client only)
- **Sub-feature:** Filter deep-link via query params + new **center** filter
- **Owner:** j.cadavid@cgiar.org
- **Status:** approved (2026-08-27)
- **Depth:** Lite · **Type:** Change · **Approval Mode:** gated
- **Parent Spec:** `changes/sp-overview-echarts` (`../family.md` row #1 · `Depends on: none` · `Parallel-safe: yes`)
- **Linked proposal:** `./proposal.md` · **Ticket:** P2-3408

## 2. Context

The Results tab filters (`status`, `category`, `origin`, search, inert `section`) live in a component-provided signal service and are set only from the toolbar dropdowns — nothing external can open the tab pre-filtered. The Overview cards therefore ship `disabled` with "COMING SOON" chips (sibling #3 removes them once this lands). Rows already carry `lead_center`, but no center filter exists.

**Discovery vs proposal:** the filter predicates are pure and case-insensitive, so hydration does not need to wait for rows; a value that matches no row yields the existing filtered-empty state with its chip and "Clear all" — chosen over the proposal's "ignore silently" (more honest, fewer moving parts). Origin values are confirmed: `W1/W2` · `W3/Bilaterals` (row model doc, closes P2-3400 for this spec).

## 3. In Scope / Out of Scope

### In scope
- Hydrate `status`, `category`, `origin`, `center` from the URL; mirror UI filter changes back to the URL.
- New single-select **Center** filter (options from loaded rows' `center`), with chip, clear, and clear-all.
- Jest coverage for the above.

### Out of scope
- Search (`q`) and section params; multi-value params; `localStorage` persistence.
- Overview click wiring (sibling #3); any chart; backend.
- `package.json` (reserved to sibling #2 — family §3).

## 4. Personas Affected

| Persona | What changes |
|---|---|
| All PRMS users on SP pages | Can land on a pre-filtered Results tab from a link/click; Copy link reproduces the filtered view; can filter by center. |

## 5. User Stories

- **`RFD-US-1`** As a PRMS user, I want a link to open the Results tab already filtered, so that overview charts and shared links take me straight to the rows they describe.
- **`RFD-US-2`** As a PRMS user, I want to filter results by lead center, so that I can review one center's contribution.

## 6. Functional Requirements

### Required (MUST)

- **`RFD-R-1` URL → filters.** On load and whenever the query params change, the Results tab MUST apply the query params `status`, `category`, `origin`, `center` (each optional, single string) to the corresponding filter dimension.

#### Scenario: Deep link with several filters
- GIVEN `…/entity-details/SP02/results?category=Innovation%20development&status=Submitted&center=IITA`
- WHEN the tab renders and rows load
- THEN the list shows only rows matching all three, three chips appear ("Category: …", "Status: …", "Center: …"), and each dropdown displays its value
- AND the result is identical to selecting the same three values manually
- BUT it must NOT alter `reviewResult`, `reviewResultId`, or `phase` params (they keep working alongside)
- AND IT MUST match values case-insensitively (as the dropdowns already do)

#### Scenario: Value matches nothing
- GIVEN `…/results?status=Foo`
- WHEN rows load
- THEN the chip "Status: Foo" shows with the "No results match these filters." empty state and "Clear all"
- BUT it must NOT throw, hide the toolbar, or silently drop the param

#### Scenario: No params
- GIVEN `…/results` with no query string
- WHEN the tab renders
- THEN behavior is byte-for-byte today's (no chips, no filters, no URL rewrite)

- **`RFD-R-2` Filters → URL.** Changing any of the four dimensions from the UI (dropdown, status pill, chip ×, Clear all) MUST update the URL query params to reflect the current state.

#### Scenario: Copy link reproduces the view
- GIVEN the user picked Category "Knowledge product" and clicked the "Submitted" status pill
- WHEN they read the address bar (or use Copy link)
- THEN it contains `category=Knowledge%20product&status=Submitted`
- AND clearing a chip removes only that param; Clear all removes all four
- BUT it must NOT push history entries (URL is replaced, not pushed) nor drop unrelated params (merge)
- AND IT MUST NOT enter a hydrate ↔ mirror loop (writing the same state twice is a no-op)

- **`RFD-R-3` Center filter.** The toolbar MUST offer a single-select Center filter whose options are the distinct non-empty `center` values of the loaded rows, matched against `row.center`, with a "Center: X" chip, `clearChip`, and `clearAll` support.

#### Scenario: Filter by center
- GIVEN rows from IITA, IWMI, and rows with empty center
- WHEN the user selects "IITA"
- THEN only IITA rows remain, the chip "Center: IITA" appears, the status pills recount over the center-filtered rows
- BUT it must NOT offer an empty/blank option
- AND IT MUST use `app-pr-filter-select` (never `custom-fields/pr-select`, which `DataControlService` misreads as a mandatory field)

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | No-param behavior unchanged; existing `reviewResult`/`phase` deep links unchanged. |
| Purity | Filter service stays router-free (pure state); router I/O lives in the component. |

## 8. Acceptance Criteria

- **`RFD-AC-1`** Jest: hydration (multi-param, unknown value, no params), mirroring (set/clear/clear-all, `replaceUrl` + `merge`), center filter (predicate, options, chip) — all green in the full client suite (`npx jest --silent --reporters=summary --no-coverage`).
- **`RFD-AC-2`** Lint clean (`npx ng lint --quiet`); coverage thresholds held.
- **`RFD-AC-3`** Manual: on the running app, open a deep link (RFD-R-1 main scenario), then change a dropdown and confirm the address bar updates without a history entry (Back leaves the tab).
- **`RFD-AC-4`** `git diff --stat` touches only `programme-results/**` (no `package.json`).

## 9. Defect Classes → Gates

| Defect class | Gate | Input that makes the gate FAIL |
|---|---|---|
| Param read but not applied (or applied to wrong dimension) | RFD-AC-1 hydration spec asserting `filter.state()` and rendered chips | Swapping `category`↔`status` keys in the hydration map turns the spec red |
| Mirror writes wrong shape (push instead of replace, drops `phase`) | RFD-AC-1 spec spying `router.navigate` args (`replaceUrl: true`, `queryParamsHandling: 'merge'`, `null` for cleared) | Removing `replaceUrl` fails the assertion |
| Hydrate/mirror feedback loop | RFD-AC-1 spec counting `navigate` calls after a hydration (expects 0 extra) + RFD-AC-3 manual (no Back-button trap) | A mirror effect without an equality guard makes the count > 0 |
| Center option list contains blanks | RFD-AC-1 options spec with empty-center rows | Removing the `!!value` filter fails it |
| Wrong filter component (mandatory-field false positive) | No automated gate — **human diff check at HITL** (template uses `app-pr-filter-select`) | — (explicit blind spot, cheap to eyeball) |
| Visual regression of the toolbar (5th select overflows) | Not measurable in jsdom — **manual check RFD-AC-3** at 1280px | — (accepted; toolbar already wraps) |

## 10. Requirement ID Index

| ID | Summary | Scenario(s) | Covered by task |
|---|---|---|---|
| RFD-R-1 | URL → filters | Deep link · Value matches nothing · No params | RFD-T-1 |
| RFD-R-2 | Filters → URL | Copy link reproduces the view | RFD-T-1 |
| RFD-R-3 | Center filter | Filter by center | RFD-T-2 |

## Required cross-references
- `docs/prd.md` (SP Results Center user stories) · `docs/ux-ui/design.md §8` (filters: `pr-filter-select`) · `docs/trd/trd.md §frontend state` · parent `../proposal.md` §5 C1.
