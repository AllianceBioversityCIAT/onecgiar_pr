# Design — Bilateral review: center chip strip + phase scoping

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/bilateral-review-center-strip-and-phase/` |
| **Module code** | `BRC` |
| **Depth** | Standard (compact) — re-checked §12: matches |
| **Approval Mode** | pre-approved (owner, 2026-09-07) |
| **Status** | approved — Phase 2 gate auto-approved (pre-approved mode); judgment-day one pass, fix-only (`judgment.md`, 5 severe fixed) |
| **Supersedes** | `changes/sp-bilateral-review-tab` `BRT-DD-7` ("not phase-scoped, parity with legacy") |
| **Skills** | `angular-developer`, `frontend-design`; kaizen `KZ-REH-1`, `KZ-REH-2`, `KZ-MWB-3`, parent-spec lessons (`project-hitl-looks-catch-what-diff-reviews-miss`) |
| **Budget (§12)** | 3 tasks · ~320 added source LOC · ~460 test LOC · ≤ 1 review round per task |

---

## 1. Summary

Two additive changes inside `pages/bilateral-review/`: (1) a `BilateralReviewCenterStripComponent` deriving center chips with pending counts from the already-loaded rows and driving the existing `centers` signal (hence the popover and `?center=`); (2) phase scoping — the page resolves a `selectedVersionId` (from `?phase=` or the shell's current `phaseId`), passes it to `GET_ResultToReview`, adds a Cycle select to the popover, and the badge cache becomes `code::versionId` keyed on the **current** phase. No server change; `BRT-DD-7` superseded.

---

## 2. Architecture Overview

### 2.1 Touched

- `pages/result-framework-reporting/pages/bilateral-review/bilateral-review.component.{ts,html,spec.ts}` — phase state, request, popover Cycle select, indicator, strip mount.
- `pages/bilateral-review/components/bilateral-review-center-strip/` (new).
- `pages/bilateral-review/services/bilateral-review-count.service.{ts,spec.ts}` — key `code::versionId`, `ensure(code, versionId)`, `setFromRows(code, versionId, rows)`.
- `pages/bilateral-review/bilateral-review.query-params.ts` (+ `phase`), `bilateral-review.copy.ts`.
- `dashboard-lab/components/reporting-program-band/reporting-program-band.component.{ts,spec.ts}` + `reporting-program-band.favorites.spec.ts` — the band injects `DataControlService` (it does **not** today: its injections are `NgZone`, `DestroyRef`, `Router`, `ReportingGuideService`, `BilateralReviewCountService`, `:117-123`) to read the current phase; the two band specs gain one `useValue` stub for it (`{ reportingCurrentPhase: { phaseId }, reportingPhaseVersion: signal(0) }`) and the existing `ensure('SP02')` assertion is updated to `('SP02', <number>)`; **no template change**, no toolbar change, no host edits.
- `pages/bilateral-review/bilateral-review.cy.ts` (strip cases), `pages/bilateral-review/CLAUDE.md` (guide).

### 2.2 Flow

```
band mounts (any tab) → countSE.ensure(code, currentPhaseId)           # currentPhaseId = Number(dataControlSE.reportingCurrentPhase.phaseId) (bigint STRING on the wire), tracked via reportingPhaseVersion()
   └── null/NaN phase → no request (badge stays hidden until the phase resolves)

review tab
  ├── reportingPhases = signal seeded from phasesSE.phases.reporting + subscription to getPhasesObservable(); if still empty after the shell's phases request settles → page calls GET_versioning(ALL, ALL) and filters app_module_id == 1 (what the service itself does); filtered by the program's portfolio id; catalog failure → error state
  ├── selectedVersionId = Number(?phase) ∈ knownPhases ? that : currentPhaseId   (null while current unresolved → skeleton, no fetch)
  ├── entity details: separate effect on programmeCode() only (one request per program)
  ├── loadResults(code, versionId) — the SINGLE list entry point (initial, retry, post-decision) → GET_ResultToReview(code, undefined, versionId) → tableData/tableResults
  │     └── if versionId === currentPhaseId (numbers) → countSE.setFromRows(code, versionId, rows)
  ├── deep link: fires when loading settles (loaded flag), not on rows non-empty → match by code, else { id, result_code } fallback (R-10)
  ├── centerStrip = pendingByCenter(searchFiltered)  (acronym → count, sorted)  ; All = Σ
  ├── chip click → centers.set([code]) | []  → existing URL sync writes ?center=
  └── Cycle select (emptyValue = the shown phase id → re-pick is a no-op) → ?phase= (replaceUrl) → list effect re-fetches; allExpanded=true + nonce bump; search/status/centers untouched
```

---

## 3. Data Model — none.

## 4. API Surface — unchanged. `GET api/results/by-program-and-centers?programId=&versionId=` now always carries `versionId` (number) from this tab and from the badge. `pending-review` remains unused. Phase catalog: `PhasesService.phases.reporting` (plain array, loaded by the shell via `GET_versioning(ALL, ALL)` filtered `app_module_id == 1`, `phases.service.ts:29-32`; `getPhasesObservable()` `:62` is a non-replaying Subject) — the page seeds a signal from the array and subscribes, with the same `GET_versioning(ALL, ALL)` + filter as fallback when empty.

## 5. Server — no change.

---

## 6. Frontend Plan

### 6.1 State (page)

- `reportingPhases` **signal** seeded from `phasesSE.phases.reporting` and updated by `getPhasesObservable()` (mirror `dashboard-lab.component.ts:2839-2841`); fallback request when empty after the shell's load; `knownPhases` computed = phases whose `obj_portfolio.id` equals the program's portfolio (as `dashboard-lab.phaseSelectorOptions`, `:1503-1511`), current first, then `phase_year` desc; each with `id: Number(id)`, `phase_name`.
- `currentPhaseId` computed: reads `dataControlSE.reportingPhaseVersion()` then `Number(reportingCurrentPhase.phaseId)`; `null` when NaN (same tracking trick as `dashboard-lab.effectiveVersionId`, `:1477-1486`; bigint-string normalization as `:1509-1516`).
- `phaseParam` from the URL (`phase` key in `bilateral-review.query-params.ts`, parsed with `Number`); `selectedVersionId` = valid param ∈ `knownPhases` → param, else `currentPhaseId`; invalid/unknown param → rewrite URL to the current id (`replaceUrl`). All phase comparisons are numeric.
- Entity-details effect: `programmeCode()` only. List effect: `programmeCode()` + `selectedVersionId()`; skips while either is null; clears rows before fetching; calls `loadResults(code, versionId)`; on a phase change sets `allExpanded` true and bumps `expandAllNonce`. `retry()` and `onDecisionMade()` call the same `loadResults(code, selectedVersionId())`. A `loaded`/settled flag drives the deep-link effect (R-10) and the error state when the catalog or phase never resolves (R-5).
- `centerStrip` computed over `searchFiltered`: `{ code, acronym, pending }` per distinct `lead_center` (acronym → code via existing `acronymToCode`, falling back to the acronym when the catalog lacks it — same as the popover option), sorted pending desc, acronym asc, plus a trailing **Not specified** bucket for blank `lead_center`; `allPending` = Σ (equals KPI Pending by construction). Pressed logic per BRC-R-2 from `centers()`.
- `phaseIndicator` computed: `selectedVersionId !== currentPhaseId` → phase name string.

### 6.2 Components

**`BilateralReviewCenterStripComponent`** (standalone, OnPush): inputs `items: {code, acronym, pending}[]`, `allPending`, `selectedCodes: string[]`, `maxVisible = 12`; output `select(code | null)`. Renders `role="group"` with the same chip classes as the status chips (copy them from `bilateral-review.component.html:235-296`), `aria-pressed` per BRC-R-2, accessible name "IITA, 100 pending"; tail beyond `maxVisible` behind a "+N more" chip toggling an `expanded` signal (BRC-R-21). No native `disabled`.

**Popover Cycle select**: `app-pr-filter-select` (single; `options`, `optionLabel`, `optionValue`, `emptyValue`, `(changed)` — `shared/components/pr-filter-select/pr-filter-select.component.ts:33-48`) — same component the band uses for AoW (`reporting-program-band.component.html:427-433`) — options from `knownPhases` (label = `phase_name`), value = selected id; **`emptyValue` bound to the selected id** so re-picking the shown phase emits the same value (no-op, R-7/AC-8b); `(changed)` writes `?phase=` only when the value differs.

**Indicator**: a small muted pill next to the match count ("Showing Reporting 2025"), rendered only when `phaseIndicator()` is set; copy in `bilateral-review.copy.ts`.

**Badge (band + count service)**: `BilateralReviewCountService` cache `Map<'CODE::<number>', number>` (key built with `Number(versionId)` so `"36"` and `36` share an entry); `count(code, versionId)`, `ensure(code, versionId)` (no-op when `versionId` is null/NaN), `setFromRows(code, versionId, rows)`, `refresh(code, versionId)`; the service knows nothing about "current" — the page decides when to call `setFromRows`. Band: injects `DataControlService` (new; stubbed in both band specs) and computes `currentPhaseId` as the page does; `bilateralReviewCount = computed(() => count(programCode(), currentPhaseId())())`; the existing effect calls `ensure(code, currentPhaseId)` only when both are set. `cycleYear`/`cyclePhase` stay inputs from the hosts (unchanged).

### 6.3 Design system

Tailwind-first; chips reuse the status-chip classes (`bilateral-review.component.html:235-296`); `material-icons-round` for the "+N more" caret; tokens per design.md §7. Strip wraps (`flex-wrap`) and lives inside `#workArea` under the status chips; CT asserts no body overflow.

### 6.4 Tests

- Page Jest: strip counts/order with a fixture where every center differs, one has 0 pending and one row has a blank center; chip click → `centers()` + `router.navigate` args (`center` csv, `replaceUrl`); pressed states incl. multi-select none; counts independent of status chip; phase: no request before phase resolves (FAIL input: resolve rows first), every list request (initial, retry, post-decision) carries `versionId=<number>`, one entity-details request per program, `?phase=` hydration, unknown → rewrite, phase change preserves search/status/center and sets `allExpanded` + nonce, re-pick is a no-op; indicator shows/hides; `setFromRows` only when selected === current (mixed `"36"`/`36` case); deep link with an empty phase list opens the fallback (AC-13); catalog failure → error state (AC-14).
- Count-service Jest: key isolation across phases, `"36"`/`36` share a key, `ensure(code, null)` no-op, `refresh`.
- Band Jest: `DataControlService` stub; `ensure` called with `(code, <number>)`; badge hidden while phase null; the pre-existing `ensure('SP02')` assertion updated; everything else untouched.
- CT (`bilateral-review.cy.ts`): 9-center fixture, strip wraps at 840, no body overflow, FAIL input (`min-width: 3000px` on the strip) detected; chip click collapses rows to that center.
- HITL (Leader, Orca): strip look vs status chips, contrast, real counts on SP02 (expect `All centers 12` on phase 36, `131` on phase 34).

---

## 7. Security — unchanged. ## 8. Performance — one request per phase switch; strip is O(n) over loaded rows. ## 9. Observability — none new.

## 10. Backwards compatibility

`?center=` semantics unchanged; `?phase=` optional; parent-spec suites must stay green except the assertions this spec updates: `GET_ResultToReview` now called with a third argument; count-service API gains a `versionId` parameter (its spec); band specs gain the `DataControlService` stub and the updated `ensure` assertion (the existing count-service `useValue` stubs ignore extra arguments, so no signature change is needed there).

---

## 11. Design Decisions

### `BRC-DD-1` — Phase-scope the review list (supersedes `BRT-DD-7`)
- **Context:** owner asked for parity with the other sections; the endpoint already filters by `version_id`.
- **Decision:** default to the shell's current `phaseId`; allow `?phase=` + a Cycle select like Results.
- **Alternatives:** current phase only, no selector (rejected: reviewers need to close last cycle's queue; SP02 has 131 pending in 2025); phase selector in the band (rejected: band toolbar is off for this tab, BRT-DD-1).
- **Reversion challenge ("what does removing the unscoped list break?"):** (1) notification deep links to a result of another phase → today's effect returns early when the list is **empty** (`bilateral-review.component.ts:373-384`) and only falls back when rows exist — with a phase-scoped list the target phase may have zero rows, so the fallback would never fire → **fixed by R-10 / AC-13** (fire on load settle); (2) legacy bookmarks `?center=` → unaffected; (3) badge total drops (e.g. 143 → the current-phase count on SP02) — intended; (4) `dashboard-lab` overview already calls with `versionId` → consistent; (5) `retry()` / `onDecisionMade()` share `loadResults` → threaded with the phase (R-5). No remaining unaddressed breakage.
- **Consequences:** badge cache keyed by phase; DD-7 flipped in the parent spec's archive sync.

### `BRC-DD-2` — Badge follows the current phase, not the tab's selection
- **Context:** the badge is visible on tabs that know nothing about the review tab's selector; My results keys its badge by the current phase label.
- **Decision:** `ensure(code, currentPhaseId)`; `setFromRows` only when the tab's selected phase equals the current one.
- **Alternatives:** badge follows the selection (rejected: a stale selection would mislabel the other tabs).

### `BRC-DD-3` — Center strip derived client-side from loaded rows
- **Context:** legacy counted per center from the all-centers list; `pending-review` returns primary-role counts only (judgment-day L-1 of the parent spec).
- **Decision:** derive from `searchFiltered`, pending only; drive the existing `centers` signal so popover and URL stay one state.
- **Alternatives:** call `pending-review` per center (rejected: different population, extra request); a sidebar rail like legacy (rejected: the shell reserves the left column for the app sidebar).
- **Reversion challenge:** n/a (additive).

### `BRC-DD-4` — Chip counts are selection-independent
- **Decision:** counts over `searchFiltered` only (like status chips), so the strip reads as an overview even when a center is pressed; `All centers` equals KPI Pending when no center is selected (BRC-R-4).

---

## 12. Budget (Step 2.4)

| Number | Estimate | Basis |
|---|---|---|
| Tasks | 3 | T-1 phase scoping (page + count service + band call) · T-2 center strip (component + page wiring + popover select/indicator) · T-3 CT + guide + HITL |
| Source LOC | ~320 added | strip component ts 60 + html 60; page ts 110 (phase catalog signal, loaded flag, single loader) + html 45; count service 20; band 10; query-params/copy 15 = 320 |
| Test LOC | ~460 | Jest page +230, count service +60, band +30, CT +140 (KZ-REH-1: ≈ 1.4× source) |
| Review rounds | ≤ 1 per task | owner limit; a second FAIL escalates |

Matches Standard (compact). Tripwire: added source > 450 or any third attempt → stop and escalate.

---

## 13. Follow-ups

- Move the `@if (visible())` guard into the drawer template (parent-spec follow-up, unchanged).
- If product wants the badge to follow the selected phase, revisit BRC-DD-2.
- Parent-spec archive: flip `BRT-DD-7` to superseded, citing `BRC-DD-1`.
