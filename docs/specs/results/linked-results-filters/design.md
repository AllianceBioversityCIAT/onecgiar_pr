# Module Spec — `design.md`

## 1. Summary

This design accomplishes the addition of "Result typology", "Portfolio" and "Funding source" filters
plus a text search to the "Please select a result" dropdown in the Contributors & Partners section,
and ensures the list of results includes all QA'd and Approved results from past phases.
The solution modifies the backend repository query to widen the scope and fetch required fields, and
implements the picker as a **bespoke dropdown panel** (own markup + SCSS, not `app-pr-multi-select`)
so the search box, typology/portfolio/funding chips and the result list can live inside one
`(click)`-toggled overlay, matching the approved visual (see §6.3).

**2026-09-11 — performance pass (`RES-PERF-1..4` below):** the same UI shipped with an O(n) getter
chain that re-derived the whole (thousands-of-rows) list on every Angular change-detection tick,
which made the panel visibly freeze the app on open. This revision documents the actual shipped
markup/SCSS AND the memoization/render-cap refactor that fixed it — no visual change.

Link to requirements: `docs/specs/results/linked-results-filters/requirements.md`

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/results/result.repository.ts`, `api/results/CLAUDE.md`.
- **Client modules touched:** `pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`, `rd-contributors-and-partners.component.html`, `shared/services/global/innovation-use-results.service.ts`.

### 2.2 Sequence / interaction diagram

```text
[Submitter UI] -> [Contributors & Partners Component]
  └── Loads page, injecting InnovationUseResultsService
        └── InnovationUseResultsService calls GET_innovationUseResults()
              └── [Results Controller] -> [Results Service] -> [Result Repository]
                    ├── Executes getResultsForInnovUse()
                    ├── Returns all Results with status_id IN (2, 6) across all phases
                    ├── Includes r.source and r.result_type_id
                    └── Returns 200 OK
        └── Client stores the full array in resultsList (plain field, reassigned once)
        └── User clicks the "Please select a result" trigger → toggleLinkedResultsPanel()
        └── [Submitter UI] renders the custom-dropdown-panel: search box, Typology chips,
            Portfolio/Funding Source chip groups, result list (`.results-list.compact-list`)
        └── User interacts with search text / chips
        └── Component computes `filteredLinkedResults` (memoized, see §8) from
            `innovationUseResultsSE.resultsList`
        └── Template renders `visibleLinkedResults` — `filteredLinkedResults` capped at
            `linkedResultsRenderCap` (150) rows; a truncation note shows when more match
        └── Row click → toggleResultSelection(r.id) → partnersBody.linked_results (new array ref)
```

---

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `Result` | `api/results/entities/result.entity.ts` | No change. |

### 3.2 Migrations

- No migration is necessary as this only changes an existing `SELECT` query.

### 3.3 CLARISA / external-data implications

- No impact.

---

## 4. API Surface

### 4.1 New / changed endpoints

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results/get/innov-use-linked-results` |
| **Version** | `v2` |
| **Response DTO** | No formal DTO class exists for this endpoint's response, but the JSON schema changes to add `source` and `status_id`. |
| **Errors** | Existing 500 error mapping remains. |

**Sample Output Changes:**
```json
{
  "id": 123,
  "acronym": "INIT",
  "phase_year": 2023,
  "result_code": 456,
  "name": "Policy change",
  "title": "Example policy",
  "source": "Result", // NEW field
  "status_id": 2 // NEW field
}
```

### 4.2 Bilateral / platform-report impact

- No impact on payloads.

---

## 5. Server Workflow / Business Rules

The primary change is in `ResultRepository.getResultsForInnovUse()`:
- **Current state**: Hardcodes `v.phase_name = 'Reporting 2025'` and has no check on `r.status_id`.
- **New state**:
  - Remove `v.phase_name = 'Reporting 2025'`.
  - Add `AND r.status_id IN (2, 6)` to only return QA Assessed and Approved results.
  - Add `r.source` and `r.status_id` to the `SELECT` clause so the frontend can compute the Funding Source filter. `SourceEnum.Result` implies W1/W2, `SourceEnum.Bilateral` ('API') implies W3/Bilateral.

---

## 6. Frontend Plan

### 6.1 Routes / modules

- No routing changes.

### 6.2 Components & services

The filters and the list are **not** built from `app-pr-multi-select` — they are a bespoke overlay
panel local to this component, so the search box, chip groups and result rows can share one
`(click)`-toggled container (`.custom-dropdown-panel`) instead of three separate PrimeNG-style
controls. `innovation-use-results.service.ts` is unchanged (still exposes the plain `resultsList`
field, reassigned once when `GET_innovationUseResults()` resolves) — all derived state lives in the
component, since the filters only appear here.

- **`rd-contributors-and-partners.component.ts`**:
  - `selectedTypologies: string[]`, `selectedFundingSources: string[]`, `selectedPortfolios: string[]`,
    `searchLinkedResultText: string`, `isLinkedResultsPanelExpanded: boolean` — local component state.
  - `availableTypologies` — unique `name` values off `resultsList` (excludes `'Impact contribution'`).
  - `availableFundingSources` — fixed `[{name: 'W1/W2', value: 'Result'}, {name: 'W3/Bilateral', value: 'API'}]`.
  - `availablePortfolios` — fixed `[{name: 'P22', value: 'P22'}, {name: 'P25', value: 'P25'}]`; portfolio is
    derived from `phase_year` (`<= 2024` → P22, `>= 2025` → P25), there is no `portfolio` field on the row.
  - `flatLinkedResultsOptions` — flattens `resultsList` if it arrives pre-grouped (`list[0].options`), else passes it through.
  - `filteredLinkedResults` — AND-intersection of typology / funding / portfolio / text search over `flatLinkedResultsOptions`.
  - `visibleLinkedResults` / `linkedResultsRenderCap` / `linkedResultsTruncated` — **`RES-PERF-3`**, see §8.
  - `getResultById(id)` — used to render the "selected" chips below the panel from the stored id list.
  - `toggleResultSelection(id)` — flips `partnersBody.linked_results` (used for both the checkbox rows and the chips).
- **`rd-contributors-and-partners.component.html`**:
  - The "Please select a result" field is an `<a class="field" (click)="toggleLinkedResultsPanel()">` trigger
    (custom-fields' `.field`/`.custom_select`/`.select_placeholder`/`.icon_dropdown` classes — same visual
    contract as `app-pr-select`'s trigger, see `custom-fields.scss`), not a real select element.
  - `*ngIf="isLinkedResultsPanelExpanded"` reveals `.custom-dropdown-panel`: a search input, the
    typology chip row, the Portfolio (segmented) and Funding Source (spaced) chip groups, a
    "Showing N results" / "Reset filters" row, the scrollable `.results-list.compact-list`, and a
    footer with the selection count / "Clear selection" / "Close".
  - Selected results render as removable chips (`.pr_chip_selected`) below the panel, via
    `getResultById(id)` + `formatResultLabel(...)`.

### 6.3 Design system usage

- Custom SCSS (`rd-contributors-and-partners.component.scss`, `.custom-linked-results-container` block)
  consuming the app's real design tokens — **not** ad-hoc hex. Colors/typography come from
  `src/styles/colors.scss` (`--pr-color-primary-300`/`-400`, `--pr-color-neutral-1000`,
  `--pr-color-green-*`) and the semantic layer (`--pr-text-*`, `--pr-border-divider`,
  `--pr-surface-subtle`, `--pr-surface-raised-soft`, `--pr-shadow-2`), plus the `fonts.pr-typography()`
  mixin for text. **2026-09-11 fix:** the panel previously used `var(--pr-color-primary, #hex)` (that
  variable doesn't exist — `--pr-color-primary` has no bare/unnumbered stop, so every such rule always
  fell through to its hardcoded hex fallback) and `var(--pr-color-neutral-N, #hex)` (that ramp IS
  defined, but as a violet-tinted scale — `colors.scss:58-67` — not gray, so it never matched the
  intended neutral look either). Fixed by consuming the real tokens instead of fallback hexes.
- The dropdown trigger reuses the global `.field`/`.custom_select` classes from
  `custom-fields.scss`, so it already matches `app-pr-select`'s look without any bespoke CSS.

### 6.4 Real-time / notification UX

- No changes.

---

## 7. Security & Authorization

- The `GET` endpoint remains under JWT authentication.
- No PII is exposed.
- No secret handling changes.

---

## 8. Performance & Capacity

- Widening the query to all phases increases the result set size. Given that we filter by `status_id IN (2, 6)`, the number of results is bounded by the total historical submissions — observed at ~3,900 rows in prtest before this feature even shipped its own widening.
- The `UNION ALL` query in `getResultsForInnovUse` fetches a specific subset. Both branches apply the `status_id` filter so the `UNION` structure stays valid.

### 8.1 `RES-PERF-1..4` — 2026-09-11 performance incident and fix

**Symptom:** opening the "Please select a result" panel made the whole app visibly freeze — reported
directly against this feature, not a general regression.

**Root cause — four compounding problems, all in `rd-contributors-and-partners.component.ts`/`.html`:**

- **`RES-PERF-1` — unmemoized getters on the change-detection hot path.** `flatLinkedResultsOptions`,
  `filteredLinkedResults`, `availableTypologies` and `getResultById()` were plain getters that
  re-derived their result from scratch on every call. Angular's default (non-`OnPush`) change
  detection calls template-bound getters on every CD tick — not only when their inputs change — so a
  single mouse move or sibling signal update re-ran an O(n) `reduce`/`filter`/`find` over the full
  (thousands-of-rows) list multiple times per interaction. `filteredLinkedResults` additionally called
  `flatLinkedResultsOptions` internally, and `getResultById()` called it AGAIN per invocation, so
  selecting/rendering N chips cost N full list flattens on top of the base cost.
- **`RES-PERF-2` — O(n) work per row, per tick.** The checkbox binding
  `[checked]="linked_results?.includes(r.id)"` ran an O(n) array scan for **every visible row on every
  tick** — O(rows × selections) in aggregate.
- **`RES-PERF-3` — unbounded DOM.** The `*ngFor` over `filteredLinkedResults` had no cap, so opening
  the panel with no filter applied (or a typology that still matches hundreds/thousands of rows) made
  Angular create that many `.result-list-item` DOM nodes in one synchronous pass — the single largest
  contributor to the freeze, independent of the getter cost above.
- **`RES-PERF-4` — no `trackBy` anywhere.** Every `filteredLinkedResults`/chip/filter-chip `*ngFor` had
  no `trackBy`, and `filteredLinkedResults`/`availableTypologies` returned a **new array instance on
  every call** (even when the contents were identical), so Angular's default identity-based diffing
  tore down and rebuilt the entire row DOM on every CD tick instead of reusing nodes.

**Fix (component-local, no shared-service or template-visual change):**

- Reference-equality memoization caches for `flatLinkedResultsOptions`, `availableTypologies`, a new
  `resultsById` `Map` (O(1) id lookup, replaces the `Array.find` inside `getResultById()`), and a new
  `selectedLinkedResultIds` `Set` (O(1) membership, replaces the `.includes()` in the checkbox
  binding). Each cache is keyed on `===` against its source array, valid because
  `innovationUseResultsSE.resultsList` is reassigned wholesale exactly once (service constructor
  subscribe) and never mutated in place.
- `filteredLinkedResults` gained a cache keyed on `JSON.stringify([...the filter inputs])` — cheap
  relative to re-filtering thousands of rows, and means hover/unrelated-signal CD ticks return the
  **same array instance**, which is what makes `trackBy` (below) actually skip DOM work.
- `toggleResultSelection()` now **reassigns** `partnersBody.linked_results` to a new array (filter/spread)
  instead of `push`/`splice`-ing the existing one in place — required for the `selectedLinkedResultIds`
  cache above to detect the change via `!==`, and consistent with the reassignment convention this file
  already used elsewhere (`deleteContributingCenter`, `deleteScience`, …) for the same ngModel-refresh reason.
- `trackBy` added to every `*ngFor` in the panel (`trackByResultId`, `trackByLinkedId`, `trackByName`,
  `trackByValue`), so once the memoized arrays above return stable references, Angular reuses existing
  DOM nodes instead of destroying/recreating them.
- **`linkedResultsRenderCap = 150`**: the template now iterates `visibleLinkedResults`
  (`filteredLinkedResults.slice(0, 150)`), not the full filtered array. The "Showing N results" text
  still reports the true match count, and a `.truncation-note` row ("Showing the first 150 of N
  matches — refine your search or filters…") appears only when the cap is hit. This is what actually
  bounds DOM size for the unfiltered/broad-typology case — the memoization above makes the
  *computation* cheap, this makes the *render* cheap. Same as the `RES-DD-LRF-1` decision (client-side
  filtering, not a lazy/paginated control) but with an explicit render ceiling instead of an implicit
  "however many happen to match."

No behavior or visual change: same filters, same list contents, same selection payload. Verified via
the existing `rd-contributors-and-partners.component.spec.ts` / `.innovation-link.spec.ts` /
`.zoneless.spec.ts` suites (284 tests, unchanged pass count) plus `ng lint` and a full `ng build`.

### 8.2 Follow-up not done here

- No `OnPush` change detection strategy change — this component is large and heavily coupled (dirty
  tracker, ToC effects, multiple child components mutating bound state — see the parent `CLAUDE.md`'s
  "Unsaved-changes guard" section); switching its CD strategy is out of scope for a targeted perf fix
  and would need its own spec.
- No move to signals for `resultsList`/filter state — `innovationUseResultsSE.resultsList` is a plain
  field consumed directly by other components (`bilateral/section-contributors`,
  `bilateral/type-innovation-use`, `ipsr-contributors`); converting it to a signal is a cross-cutting
  change outside this component's scope. The reference-equality memoization above gets the same
  practical win (skip recompute when nothing changed) without touching the shared service's public shape.

---

## 9. Observability

- No changes needed beyond existing error logs.

---

## 10. Testing Plan (forward-looking)

- **Unit tests (server)**: `result.spec.ts` (if any tests mock `getResultsForInnovUse()`, they may need to assert the new `status_id` behavior or return shape).
- **Unit tests (client)**: `rd-contributors-and-partners.component.spec.ts` needs tests to verify the computed `filteredLinkedResults` filters correctly based on the selected criteria.
- **Coverage**: The component and repository coverage must be maintained — this folder is excluded
  from `collectCoverageFrom` (`package.json`), so tests run but don't count toward the threshold; don't
  read the global percentage as proof of coverage here.
- **`RES-PERF-*` regression coverage (not yet written, flagged as a follow-up):** none of the existing
  specs assert cache invalidation (e.g. selecting a result reflects in `selectedLinkedResultIds`
  immediately) or the render cap (`visibleLinkedResults.length <= linkedResultsRenderCap` with a
  larger `filteredLinkedResults`). The 284 existing tests passed unchanged because they don't exercise
  large lists or repeated CD ticks — they wouldn't have caught the original slowness, so they don't
  prove the fix either. Add targeted specs before the next change to this panel.

---

## 11. Backwards Compatibility & Migration Plan

- The API is strictly additive in the fields returned.
- Frontend components relying on `GET_innovationUseResults()` (e.g., Bilateral creation surfaces if any) will now see results from past phases. This is intended by the business.

---

## 12. Design Decisions (ADRs)

### `RES-DD-LRF-1` — Client-side filtering vs Server-side filtering

- **Context:** The dropdown lists all QA'd/Approved results.
- **Decision:** Use client-side filtering.
- **Alternatives considered:** Server-side pagination with query params. Rejected because the existing UX uses a PrimeNG dropdown with a built-in local search, and rewriting it to use an autocomplete/lazy-load paradigm would be disproportionate effort for the expected payload size.
- **Consequences:** The initial payload size is larger, but UX is faster once loaded.

---

## 13. Open Gaps & Follow-ups

- Add the `RES-PERF-*` regression specs called out in §10 (cache invalidation on selection, render-cap
  behavior with a large filtered list).
- `RES-OQ-1`/`RES-OQ-2` below are still genuinely open — not resolved by the perf work.
- If the QA'd/Approved list keeps growing, revisit `linkedResultsRenderCap` (150) — server-side
  search/pagination (the alternative `RES-DD-LRF-1` rejected) becomes the right call once client-side
  filtering, even memoized, can't keep the initial payload/parse cost acceptable.

---

## Required cross-references

- `docs/specs/results/linked-results-filters/requirements.md`
- `docs/prd.md`
- `docs/ux-ui/design.md`
- `docs/trd/trd.md`
