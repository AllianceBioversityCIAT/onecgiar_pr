# Innovation Packages — Filter & Toolbar Parity — `execution.md`

## 1. Document Control

- **Spec:** `docs/specs/changes/innovation-packages-filters-parity/`
- **Approval Mode:** `gated` (per `requirements.md` §1, inherited from `proposal.md`) — continue/pause gate is NOT auto-approved; each task pauses for the user after PASS.
- **Leader model:** T1 (session default)
- **Implementer model:** sonnet (T2)
- **Reviewer model:** opus (T3) — differs from Implementer per `author ≠ auditor`

---

## 2. Task Execution History

### `IPSR-T-1` — Rewrite `IpsrListFilterService` core (Program, Phase, Status signals)

- **Status:** PASS (attempt 1/3)
- **Date:** 2026-09-14
- **Implements:** `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-DD-4`

**Attempt 1:**

- **Files changed:**
  - `onecgiar-pr-client/.../innovation-package-list/services/ipsr-list-filter.service.ts` — rewritten: `programOptions`/`selectedPrograms`, `phaseOptions`/`selectedPhases`, `statusOptions`/`selectedStatus` as signals; exported pure derivation functions `buildIpsrProgramOptions`, `buildIpsrPhaseOptions`, `buildIpsrStatusOptions`; `updateMyInitiatives()` kept as the existing call-site name; new `refreshStatusOptions(resultList)` hook (no caller yet — deferred, see Forward Pointers below)
  - `ipsr-list-filter.service.spec.ts` — full rewrite, value-asserted tests per derivation (incl. "excluded row" + "empty source" cases per `IPSR-DD-2`/`IPSR-DD-4`)
  - `onecgiar-pr-client/src/app/shared/services/global/phases.service.ts` — removed `IpsrListFilterService` injection and its direct-write block; `PhasesService` is a pure data source again
  - `phases.service.spec.ts` — re-pointed assertions from the removed mock to `service.phases.ipsr` directly
- **Implementer verification:**
  - `npx jest --silent --testPathPattern="ipsr-list-filter.service" --no-coverage` → 19 passed
  - `npx jest --silent --testPathPattern="phases.service" --no-coverage` → 8 passed
  - `npx ng lint --quiet` → All files pass linting
- **Reviewer verdict:** **PASS**
  - Both named traps in `tasks.md` (value-asserted derivation; "excluded-but-present" + "empty source" fixtures per facet) independently confirmed closed, not nominally satisfied.
  - Deviation accepted (see below).
  - Evidence plausibility check: test count (19) reconciles exactly with the diff's test cases.

**Deviation from design.md (accepted by Reviewer):** `statusOptions` implemented as `WritableSignal` + explicit `refreshStatusOptions(resultList)` rather than a `computed()`, because `IpsrDataControlService.ipsrResultList` is a plain mutable array (not a signal) — a real `computed()` over it would never re-evaluate after first read. `IPSR-DD-2`'s substantive decision (status derived client-side from loaded rows, no dedicated endpoint) is fully preserved; only the prose's assumed reactive mechanism changed.

**Known, expected, not a regression:** this task's rewrite leaves `ipsr-list-filters.component.ts`, `innovation-package-list-filter.pipe.ts`, and `innovation-package-list.component.ts` referencing the removed `filters.general[...]` shape (`tsc --noEmit` confirms). This resolves as `IPSR-T-2`/`T-3`/`T-4`/`T-6` land per the dependency graph — expected mid-spec state, not a defect of this task.

**ADVISORY (4R lens, recorded, non-gating):**
- **Reliability:** `refreshStatusOptions()` has no caller yet; no existing task's DoD names wiring it to `ipsrDataControlSE.ipsrResultList` load. **Forward pointer → `IPSR-T-4` and `IPSR-T-6` briefs:** when composing those briefs, add the explicit requirement "`refreshStatusOptions(ipsrDataControlSE.ipsrResultList)` is called on list load/refresh, asserted by a test that loads a fixture list then reads `statusOptions()`" — otherwise the Status facet can ship permanently empty while every task's own gate still passes.
- **Risk (forward-looking) → `IPSR-T-4`/`IPSR-T-6` briefs:** the DI direction flip gives `IpsrListFilterService` a transitive dependency on `ResultsApiService`/`HttpClient` (via `PhasesService`) it did not have before. `ipsr-list-filters.component.spec.ts` and `innovation-package-list.component.spec.ts` both provide the real `IpsrListFilterService` — they will need an `HttpClientTestingModule` or a `PhasesService` stub in addition to the `filters.general[...]` re-pointing already in scope. Flag to Implementer up front so it isn't misdiagnosed as a regression from T-1.
- **Reliability (minor, benign):** `getPhasesObservable()` subscription in the constructor is never torn down; both services are root singletons so no practical leak — noted only for completeness.

**Requirements covered:** `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3` (service-layer derivation only — UI wiring is later tasks), `IPSR-DD-4` (empty-selection defaults, asserted).

**Decisions made:** Deviation above accepted as spec-compliant-in-substance.

**Issues encountered:** None blocking.

**Final verification result:** PASS — all three commands green, Reviewer confirmed plausibility against the diff.

---

### `IPSR-T-2` — Wire Center/Portfolio secondary facets + popover temp-staging

- **Status:** IN PROGRESS (attempt 1/3 — FAIL)
- **Date:** 2026-09-14
- **Implements:** `IPSR-R-10`, `IPSR-DD-3`

**Attempt 1:**

- **Files changed:** `ipsr-list-filter.service.ts` (+.spec.ts) — added `centerOptions`/`selectedCenters`/`tempSelectedCenters`, `portfolioOptions`/`selectedPortfolios`/`tempSelectedPortfolios`, `applyFilters()`, `cancelFilters()`; catalog fetch wired via `ResultsApiService.GET_AllCLARISACenters()`/`GET_ClarisaPortfolios()` in the constructor.
- **Implementer verification (self-reported):** `npx jest --silent --testPathPattern="ipsr-list-filter.service" --no-coverage` → 28 passed; `npx ng lint --quiet` → clean.
- **Reviewer verdict:** **FAIL**
  1. **Discovered Issue:** Center/Portfolio catalog fetches run in the service constructor. `IpsrListFilterService` is a root singleton instantiated at app bootstrap (via `ApiService` → `app.component.ts`), so `GET clarisa/centers/get/all` / `GET clarisa/portfolios` now fire for every user on every route — including `/login` before a token exists — not just on the Innovation Packages page.
     **Violated Rule:** `design.md` §6.2 ("populated on component init… one-time fetch on `ngOnInit`") and §8 ("two new one-time fetches on page load").
     **Remediation:** Move the fetches out of the constructor into a public idempotent `loadSecondaryFacetOptions()` guarded by a loaded-flag; require `IPSR-T-5`'s `ngOnInit` to call it; add a test proving no HTTP call happens on bare construction and exactly one call pair on repeated invocation.
  2. **Discovered Issue:** The "28 passed" evidence is not reconcilable with the diff — the pre-existing `IPSR-T-1` test `refreshes when PhasesService emits on getPhasesObservable` configures its own TestBed without a `ResultsApiService`/`HttpClient` provider, which `IPSR-T-2` made a mandatory constructor dependency; this test should now throw `NullInjectorError`.
     **Violated Rule:** tasks.md verification command must correspond to a real green run.
     **Remediation:** Add an `HttpClient`/`ResultsApiService` provider (or route through the existing `configure()` helper) to that test, then re-run and report the actual pass/fail line.
  - **ADVISORY (non-gating, forward pointer → `IPSR-T-5`):** `cancelFilters()` is the only reseed path; if outside-click/`Escape` close the popover without calling it, `temp*` stays dirty on next open — route all three abort paths (Cancel, outside click, Escape) through `cancelFilters()` or an equivalent reseed, one test per path. Also: `GET_AllCLARISACenters()` rows carry an HTML-decorated `full_name` field — render it the way RC does, no new `[innerHTML]` binding.

**Effort bumped:** medium → high for attempt 2 (a failed fix is usually under-thinking).

---

### `IPSR-T-4` — Rebuild primary filter row (search, Program, Phase, Status)

- **Status:** IN PROGRESS (attempt 1/3 — FAIL)
- **Date:** 2026-09-14
- **Implements:** `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-R-5`

**Attempt 1:**

- **Files changed:** `ipsr-list-filters.component.{ts,html,scss,spec.ts}`, `innovation-package-list.component.{ts,spec.ts}`, `innovation-package-list.module.ts`. Reused existing shared `app-pr-filter-multiselect` (confirmed already shared, no duplication). Wired `refreshStatusOptions()` into `GETAllInnovationPackages()`, closing `IPSR-T-1`'s forward pointer with a value-asserted test.
- **Implementer verification (self-reported):** `ipsr-list-filters.component` → 12 passed; `innovation-package-list.component` → 93 passed (6 suites); `npx ng lint --quiet` → clean.
- **Reviewer verdict:** **FAIL**
  1. **Discovered Issue:** Search box uses wrong design tokens — `--pr-color-neutral-300` (defined as violet `#6b5eeb`) instead of `--pr-border` (`#e3e3e8`, what RC actually uses), so the search input border renders violet; icon/placeholder use `--pr-color-secondary-200` instead of `--pr-text-subtle`. Hardcoded hex fallbacks also present (dead code, style-rule violation). Invisible to Jest by construction (jsdom doesn't resolve CSS vars).
     **Violated Rule:** `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules #7 (no violet border in content area) and #8 (no hardcoded hex, only `var(--pr-*)`); `design.md` §6.3; `requirements.md` §7 NFR Design consistency.
     **Remediation:** Replace with `var(--pr-border)`, `var(--pr-text-subtle)` (icon+placeholder), `var(--pr-text-heading)` (input text) — drop all hex fallbacks. Record for `IPSR-T-8`'s manual visual pass regardless (Jest cannot close this class).
  2. **Discovered Issue:** Download button visibility gate silently changed semantics from "hidden when the *filtered* result set is empty" (old, via now-broken pipe) to "shown whenever the *unfiltered* list has any row" (new) — a search matching zero rows now offers a Download that exports an empty workbook. Two new tests lock in the new semantics as if final; no later task's DoD names restoring the filtered gate.
     **Violated Rule:** `design.md` §6.2 ("Download/export … unchanged in logic"); `requirements.md` §7 NFR Backwards compatibility; `IPSR-R-6`.
     **Remediation:** Mark the current gate explicitly temporary in an inline comment (forward-pointer style, like the existing `IPSR-T-5` comment); reframe the two tests as asserting the temporary contract, not final visibility behavior; **Leader action** — add an explicit bullet to `IPSR-T-6` requiring the gate be re-pointed at the filtered row count once the pipe reads the new signals, with a "search matches nothing → button hidden" test.
  - **ADVISORY (non-gating):** positional control selection in specs (`multiselects[0/1/2]`) is fragile against `IPSR-T-5`'s "More filters" trigger insertion — prefer `data-testid` or placeholder-based lookup; `aria-label` placed on the multiselect host (not the focusable trigger) is inert for assistive tech — forward to the shared component, not blocking; `refreshStatusOptions` test fixture doesn't exercise the dedupe path (already covered by `IPSR-T-1`).

**Effort bumped:** medium → high for attempt 2.

**Leader action taken:** the `IPSR-T-6` forward-pointer above (Download gate re-pointing) will be carried into that task's brief when composed, per the Structured Feedback / forward-pointer carry rule.

**Attempt 2 (rework):**

- **`IPSR-T-2` files changed:** `ipsr-list-filter.service.ts` (+.spec.ts) — moved catalog fetches out of the constructor into a new public, idempotent `loadSecondaryFacetOptions()` (guard flag `optionsLoaded`); constructor now does phase-wiring only; fixed the pre-existing phase-observable test's missing `ResultsApiService` provider; added a "no HTTP call on bare construction" test and an idempotency test.
- **`IPSR-T-2` verification (fresh, actual):** `npx jest --silent --testPathPattern="ipsr-list-filter.service" --no-coverage` → 30 passed; `npx ng lint --quiet` → clean.
- **`IPSR-T-2` Reviewer verdict:** **PASS.** Repo-wide grep confirmed `loadSecondaryFacetOptions()` has zero production callers (by design — `IPSR-T-5` will call it). Both new tests verified as genuine spy-based behavioral assertions (not-called on construction; exactly-once on double invocation). `applyFilters()`/`cancelFilters()` and `IPSR-T-1`'s derivation logic confirmed unregressed.
  - **ADVISORY:** `optionsLoaded` latches permanently on fetch failure (no retry) — acceptable per design.md §9's silent-fallback rule, `centers.service.ts` has a retry precedent worth considering if `IPSR-T-8` sees an empty Center list. **Forward pointer → `IPSR-T-5` DoD:** must explicitly require calling `loadSecondaryFacetOptions()` from `ngOnInit`, or the facets ship permanently inert with every existing test still green.

- **`IPSR-T-4` files changed:** `ipsr-list-filters.component.html` (+.spec.ts) — replaced `--pr-color-neutral-300`/`--pr-color-secondary-200`/`--pr-color-secondary-400` with `--pr-border`/`--pr-text-subtle`/`--pr-text-heading`, dropped all hex fallbacks; added an inline TEMPORARY comment on the Download gate naming `IPSR-T-6` as owner; renamed the two visibility tests to read "(TEMPORARY, see IPSR-T-6)".
- **`IPSR-T-4` verification (fresh, actual):** `npx jest --silent --testPathPattern="ipsr-list-filters.component" --no-coverage` → 12 passed; `npx ng lint --quiet` → clean.
- **`IPSR-T-4` Reviewer verdict:** **PASS.** Independently confirmed correct token values against `colors.scss` (not the Implementer's claim); grep confirmed zero remaining offending tokens/hex literals in the template; matched RC's own token set and geometry verbatim. TEMPORARY comment verified accurate, correctly names `IPSR-T-6` (confirmed as the right owner via its `tasks.md` entry). Renamed tests confirmed to retain identical DOM-effect assertions. No regression in attempt-1's already-good behavioral coverage.

**Requirements covered:** `IPSR-T-2` → `IPSR-R-10`, `IPSR-DD-3`. `IPSR-T-4` → `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-R-5`.

**Decisions made:** Both Reviewer FAILs from attempt 1 resolved exactly per their remediation suggestions; no scope changes.

**Forward pointers carried to `IPSR-T-5` brief (composed at that task's dispatch time):**
1. Call `loadSecondaryFacetOptions()` from the component's `ngOnInit`, with a test proving Center/Portfolio options populate on init.
2. Route all three popover-abort paths (Cancel, outside click, Escape) through `cancelFilters()` (or equivalent reseed), one test per path.
3. Render `GET_AllCLARISACenters()`'s HTML-decorated `full_name` field the same way RC does — no new `[innerHTML]` binding.

**Forward pointer carried to `IPSR-T-6` brief:**
1. Re-point the Download-button visibility gate from unfiltered to filtered/searched row count once the pipe (`IPSR-T-3`) reads the new signals; add a "search matches nothing → button hidden" test.

**Final verification result:** Both tasks PASS on attempt 2/3.

---

### `IPSR-T-3` — Extend `InnovationPackageListFilterPipe`

- **Status:** BLOCKED — Pivot Detection triggered (attempt 1/3, not counted against ceiling — see Pivot Record below)
- **Date:** 2026-09-14
- **Implements:** `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-R-10`, `IPSR-DD-1`, `IPSR-DD-4`

**Attempt 1:**

- **Files changed:** `innovation-package-list-filter.pipe.ts` (+.spec.ts) — added `filterByStatus`/`filterByCenter`/`filterByPortfolio`; re-pointed `filterByInits`/`filterByPhase` to `selectedPrograms()`/`selectedPhases()`.
- **Implementer verification (self-reported):** 14 passed; lint clean; regression run 102 passed. **Implementer self-flagged a data-shape risk**: `filterByCenter` matches `item.lead_center`, but reported that `IpsrRepository.getAllInnovationPackages` may not return any center field on IPSR rows.
- **Reviewer verdict:** **FAIL** (not FATAL_FAIL — see Pivot Record; spec has its own descope precedent).
  1. **Discovered Issue:** Independently confirmed via direct read of `onecgiar-pr-server/src/api/ipsr/ipsr.repository.ts` — `getAllInnovationPackages`'s full SELECT list (`id, result_code, title, ..., portfolio_id, portfolio_name, acronym, role_id`) contains **zero** center-related columns, under any name (`center`, case-insensitive, 0 matches in the whole file). `item.lead_center` is `undefined` on every real row — `filterByCenter` will silently return zero results for any Center selection in production, while unit tests (which invent `lead_center` on fixture rows) stay green. This is a genuine data-shape gap, not an Implementer error.
     **Violated Rule:** `requirements.md` §3 Out of scope ("this spec accommodates it from existing payload fields only"); `design.md` `IPSR-DD-3`'s premise that Center has "real, wireable data".
  2. **Discovered Issue (ordinary, fixable in rework):** No test proves the three new filters are reachable through `transform()` — the combined-filter test calls `filterByStatus(filterByInits(list))` directly rather than `transform(list, word)`, so deleting the new methods from the `transform` chain would leave all 14 tests green.
     **Violated Rule:** tasks.md `IPSR-T-3` DoD bullet 3 (combined AND-semantics "matching the existing chain behavior").
     **Remediation:** re-express the combined case as a `transform()` call with a `full_name` fixture field.
  - **ADVISORY:** `filterByPortfolio`'s strict `===` against `item.portfolio_id` (confirmed real `int` column, `ci.portfolio_id`) is correct today but coupled to the column type; a comment or `Number()` coercion would make that explicit.

**Reviewer's own assessment of severity:** not FATAL_FAIL — `IPSR-R-10` is a SHOULD explicitly scoped to "whichever secondary facets have real IPSR data support" (requirements.md §6), and the spec already has a live precedent for exactly this situation: `IPSR-OQ-1` descoped `IPSR-R-11` (Core innovation) after an identical repository-read finding. Center should be descoped the same way — but the fix is NOT containable inside `IPSR-T-3`'s file scope: it also touches `design.md` `IPSR-DD-3` (currently "Center + Portfolio"), the already-`[x]`-PASSed `IPSR-T-2` (Center signal wiring, now dead code), and `IPSR-T-5` (in-flight, its popover currently includes a Center field).

---

## Pivot Record: `IPSR-T-3` (Center filter descope)

**Trigger:** Reviewer evidence that `design.md IPSR-DD-3`'s assumption — "Center… already has real, wireable data" — is factually wrong for Center specifically (Portfolio remains correct). This is a spec-assumption failure, not an implementation defect, per the Pivot Detection guardrail (`/akili-execute` Step 2.4).

**What's affected:**
- `design.md` `IPSR-DD-3` — currently states "exactly Center and Portfolio (both already have real, wireable data)"; the Center half is false.
- `requirements.md` `IPSR-R-10` (SHOULD, already conditionally scoped — "whichever secondary facets have real IPSR data support") — no requirements.md text change needed, it already anticipates this outcome; only the `design.md`/`tasks.md` resolution needs updating, mirroring `IPSR-OQ-1`'s precedent exactly.
- `IPSR-T-2` (`[x]` PASS, already merged into working tree) — added `centerOptions`/`selectedCenters`/`tempSelectedCenters` to `IpsrListFilterService`; becomes dead code if Center is dropped.
- `IPSR-T-3` (this task, FAIL) — `filterByCenter` becomes unnecessary if Center is dropped.
- `IPSR-T-5` (in-flight rework, separately FAILed on an unrelated outside-click bug — see below) — its popover currently includes a Center field/section.

**Alternatives considered:**
1. **Descope Center entirely** (mirrors `IPSR-OQ-1`/`IPSR-R-11` precedent exactly) — remove Center from `IpsrListFilterService`, the pipe, and the popover; popover ships Portfolio-only. Cleanest, in-spec, no backend change.
2. **Keep Center wiring dormant** (leave the signals/UI in place but non-functional) — rejected: ships a filter control that silently does nothing, which is worse UX than not offering it, and violates the "no dead/misleading UI" spirit of the design.
3. **Add the backend join now** (a `results_package_centers`/initiative→center mapping) — rejected: explicitly out of scope per `requirements.md` §3 ("Backend/API contract changes... not delivered here").

**Recommended direction:** Alternative 1 — descope Center, Portfolio-only popover, recorded in `design.md` `IPSR-DD-3` the same way `IPSR-OQ-1` recorded the Core-innovation descope. File a follow-up note in `design.md` §13 Open Gaps for a future backend-join spec if Center filtering is wanted later.

**STATUS: Awaiting explicit user approval before resuming** — per Pivot Protocol, spec documents are not modified and no further rework is dispatched until the user decides.

---

### `IPSR-T-5` — Build "More filters" popover + filter-chip row

- **Status:** IN PROGRESS (attempt 1/3 — FAIL; separate from the Pivot above, but resolution order matters — see Summary)
- **Date:** 2026-09-14
- **Implements:** `IPSR-R-4`, `IPSR-R-10`, `IPSR-DD-3`

**Attempt 1:**

- **Files changed:** `ipsr-list-filters.component.{ts,html,spec.ts}` — "More filters" trigger + popover (Center, Portfolio, Apply/Cancel), `filterChipGroups`, `removeFilter()`, `clearAllNewFilters()`, `toggleMoreFilters()`, outside-click/Escape handling, `ngOnInit` now calls `loadSecondaryFacetOptions()`.
- **Implementer verification (self-reported):** 27 passed (up from `IPSR-T-4`'s 12); lint clean.
- **Reviewer verdict:** **FAIL** (one real issue; four of five forward-pointer/DoD claims independently confirmed genuine — `loadSecondaryFacetOptions()` wiring, Center label rendering matching RC exactly, chip isolation, popover-open reseed).
  1. **Discovered Issue:** The outside-click close path does not work on the first outside click. `toggleMoreFilters($event)` calls `event?.stopPropagation()`, so the opening click never reaches the bubble-phase `@HostListener('document:click')`, so the `skipNextDocClick` guard is never consumed by the click that set it — it's instead consumed by the user's *next* document click (which was meant to close the popover), so the popover stays open on the first outside click and only closes on the second. The test that "proves" this path directly sets `(component as any).skipNextDocClick = false` before calling `onDocumentClick()`, sidestepping the actual (broken) event flow entirely — Cancel and Escape paths are genuinely proven; outside-click is not.
     **Violated Rule:** `design.md` §2.3 (one outside click closes and discards); tasks.md `IPSR-T-5` DoD ("all four paths verified").
     **Remediation:** Drop `skipNextDocClick` entirely (the trigger's own `stopPropagation()` already prevents the opening click from reaching the document handler, making the flag redundant and harmful) — the simpler, smaller fix. Replace the test with one that dispatches a real `document.body.dispatchEvent(new MouseEvent('click', {bubbles:true}))` after opening via the real trigger button, not by touching private component state.
  - **ADVISORY:** chip `@for` tracks by `label + filterType` — two centers/portfolios that both render the same label (e.g. both fall back to a literal placeholder) collide and throw NG0955; track by item reference or index instead. Escape/outside-click tests call the handler methods directly rather than dispatching real DOM/document events, so a removed `@HostListener` decorator wouldn't be caught — tie this into the outside-click test fix above.

---

## Pivot Resolution: `IPSR-T-3` (approved by user)

User approved descoping Center entirely (Option: "Descope Center"). `design.md` `IPSR-DD-3` revised to Portfolio-only (§2.3, §4, §6.2, §8, §13 all updated); `requirements.md` needed no change (`IPSR-R-10` already conditionally scoped). `tasks.md` `IPSR-T-2`/`IPSR-T-3`/`IPSR-T-5` descriptions annotated with strikethrough + note. Two-direction grep sweep completed across the spec folder (forward: design.md's forward-facing sections; backward: tasks.md dependency graph). Correction work dispatched: (1) strip dead Center wiring from `IpsrListFilterService` + fix `IPSR-T-3`'s ordinary FAIL (transform()-reachability), (2) remove Center from `IPSR-T-5`'s popover + fix its ordinary FAIL (outside-click bug).

## Mockup Alignment (user-supplied, post-Pivot)

User supplied a reference mockup and asked two clarifying decisions:
1. **Label "Program" → "Submitter"** (display text only — underlying signals `programOptions`/`selectedPrograms` unchanged). Applied directly by the Leader (trivial, single-file-class text change on an already-reviewed component): `ipsr-list-filters.component.html` (`placeholder`, `aria-label`), `.ts` (`filterChipGroups` category label + chip fallback text, one stale doc comment), `.spec.ts` (two assertions). Verified: 26/26 tests pass, lint clean.
2. **"More filters" (Portfolio) popover kept** — user's call was that the mockup likely doesn't show it due to screen width/state, not that it should be removed. `IPSR-T-5`'s popover work stands unchanged.

**Attempt 2 (Pivot-correction rework) — final verdicts:**

- **`IPSR-T-3` Reviewer verdict:** **PASS.** Independently confirmed zero Center references remain in the pipe/service (only historical comments + "Results Center" product name); the `transform()`-reachability fix genuinely closes attempt 1's issue (deleting `filterByStatus` or `filterByInits` from the chain now makes the test fail); `applyFilters()`/`cancelFilters()` correctly Portfolio-only with no dangling Center branches; `filterByStatus`/`filterByPortfolio`/`filterByInits`/`filterByPhase` unchanged in substance; `combineRepeatedResults` byte-identical (`IPSR-DD-1` intact).
  - **ADVISORY:** combined `transform()` test only pins `filterByInits`+`filterByStatus` into the chain — a second case with Phase/Portfolio would close the remaining reachability gap (not required, optional for `IPSR-T-7`). `filterByPortfolio`'s strict `===` against `item.portfolio_id` still only documented via comment, not enforced (carried from attempt 1, still open, non-blocking).

- **`IPSR-T-5` Reviewer verdict:** **PASS.** Independently traced the fixed event flow (confirmed `stopPropagation()` alone correctly prevents the opening click from self-closing, while a genuine subsequent outside click reaches `onDocumentClick()` and closes on the first try); confirmed the regression test drives real DOM events, not private-state manipulation; confirmed the Leader's label rename (C) is purely cosmetic — the `filterType: 'program'` internal discriminator, `removeFilter`, `clearAllNewFilters`, and the Excel export path (`onFilterSelectedInits()`) are all untouched; all 6 DoD bullets map to distinct behavioral tests.
  - **ADVISORY:** `removeFilter` isolation tests seed one value per facet — a two-value-same-facet case would more precisely pin the `filter(p => p !== chip.item)` behavior (cheap addition for `IPSR-T-7`). Results Center's own component has the identical `skipNextDocClick`/`stopPropagation()` bug this task fixed — out of this spec's scope, but worth a separate ticket so a future "restore RC parity" pass doesn't reintroduce it into IPSR. i18n: labels are hardcoded strings per `IPSR-T-4`'s already-established, spec-sanctioned convention (no `TermKey` exists) — confirmed deliberate, not an oversight.

**Requirements covered (both tasks, attempt 2):** `IPSR-T-3` → `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-R-10`, `IPSR-DD-1`, `IPSR-DD-4` (Center-related scope removed). `IPSR-T-5` → `IPSR-R-4`, `IPSR-R-10`, `IPSR-DD-3` (Portfolio-only).

**Decisions made:** Pivot resolved per user approval (descope Center); mockup label alignment applied and verified; both ordinary FAILs (transform-reachability, outside-click) fixed and independently confirmed.

**Final verification result:** Both tasks PASS on attempt 2/3.

---

### `IPSR-T-6` — Re-point export, admin-deselect, and phase-gating logic to new signals

- **Status:** IN PROGRESS (attempt 1/3 — FAIL)
- **Date:** 2026-09-14
- **Implements:** `IPSR-R-6`, `IPSR-R-7`, `IPSR-R-8`

**Attempt 1:**

- **Files changed:** `ipsr-list-filters.component.html` (+.spec.ts) — Download-gate re-pointed from unfiltered to filtered/searched count via the `innovationPackageListFilter` pipe (same pattern the table uses), TEMPORARY comment replaced with a permanent explanation; `innovation-package-list.component.ts` (+.spec.ts) — confirmed `onFilterSelectedInits`/`onFilterSelectedPhases`/`onDownLoadTableAsExcel` already correct (no change needed); found and fixed a genuine latent bug: `initsSelectedJoinText` still read the removed `.filters.general[1]?.options` property.
- **Implementer verification (self-reported):** 13 suites, 158 tests, all passed; lint clean.
- **Reviewer verdict:** **FAIL** (one real gap; three other claims independently confirmed genuine — Download gate is truly filtered-count-based with a real behavioral test, no pre-existing assertions were deleted, the `initsSelectedJoinText` fix is correct though the getter turns out to have zero production callers — dead code, not a live runtime bug as originally worried).
  1. **Discovered Issue:** `IPSR-AC-7` phase-gating has NO regression test — a repo-wide grep for `checkIpsrReportingAccess`/`ipsrReportingEnabled` across all `.spec.ts` returns zero matches. This DoD bullet (`activeButtons`/`ipsrReportingEnabled` gating unchanged for a non-admin user with no role in the active portfolio`) requires a test, not just "the code is untouched" as an argument — the task description itself says "must be regression-tested to confirm."
     **Violated Rule:** tasks.md `IPSR-T-6` DoD bullet 4; `requirements.md IPSR-AC-7`.
     **Remediation:** Add tests over `checkIpsrReportingAccess()` with `rolesSE.isAdmin = false` and both `reporting_enabled: false`/`true` cases from the stubbed `GET_phaseReportingInitiatives` response, asserting `component.ipsrReportingEnabled` — plus a rendered-effect assertion (after `detectChanges()`) that the Create/Update buttons are actually gated when `ipsrReportingEnabled` is false and the user has no portfolio role.
  - **ADVISORY (non-gating):** the JSDoc claiming `initsSelectedJoinText`'s semantics are "preserved exactly" overstates it slightly — `selected` used to reflect user chip-selection, now reflects phase open/closed status; harmless since the getter has no caller, but worth a comment correction. `initsSelectedJoinText` itself is dead code (no production caller) — consider flagging its removal at `IPSR-T-7`/`IPSR-T-8` rather than maintaining it further. `IPSR-AC-8` is proven via two independent unit hops but no single click-driven test proves the template composes `onFilterSelectedInits()`+`onFilterSelectedPhases()`+`text_to_search` together into the Download click handler — a natural `IPSR-T-7` addition.

**Effort bumped:** medium → high for attempt 2.

**Attempt 2 (rework):**

- **Files changed:** `innovation-package-list.component.spec.ts` — added 3 tests for `checkIpsrReportingAccess()`/`ipsrReportingEnabled` (2 unit tests over differing `reporting_enabled` stub responses, 1 rendered-DOM test with real `disabledButtons` class + real dispatched click on the gated Update button); `innovation-package-list.component.ts` — corrected `initsSelectedJoinText`'s JSDoc (no longer claims "preserved exactly" — now states the `selected` field's semantics changed from user-selection to phase open/closed status); `ipsr-list-filters.component.spec.ts` — added a click-driven Download test proving the template composes `onFilterSelectedInits()`+`onFilterSelectedPhases()`+`text_to_search` into the `GET_reportingList` call (`IPSR-AC-8`).
- **Verification (fresh, actual):** `innovation-package-list|ipsr-list-filters` → 13 suites, 162 passed (up from 158, +4 matches +3 gating +1 Download, nothing removed); `npx ng lint --quiet` → clean.
- **Reviewer verdict:** **PASS.** Independently confirmed `checkIpsrReportingAccess()`'s real implementation matches every claimed method/field name; the two unit tests are genuinely discriminating (the `reporting_enabled: false` case can only pass if the real matching logic executed, since the signal defaults `true`); the rendered test's `disabledButtons` class and dispatched-click assertions are real (bind to the actual template `[ngClass]`/`(click)` expressions). Both advisories confirmed applied. No pre-existing test weakened or deleted.
  - **ADVISORY (non-gating):** one assertion in the rendered test (`ng-reflect-router-link`) is structurally incapable of failing — `RouterLink` isn't in that TestBed and Angular 21 doesn't emit `ng-reflect-*` without an explicit provider — it should be removed or replaced with a real router-link check; not blocking since the surrounding class/click assertions carry the actual proof, but **must not be cited as evidence going forward.** Also: no test isolates the `&& ipsrReportingEnabled` conjunct specifically (confounded with the empty-initiatives-list case), and the click-inertness assertion has no positive control (no case proving the click *does* fire when gating is off). Both are cheap additions, forward-pointer → `IPSR-T-7`'s closure pass.

**Requirements covered:** `IPSR-R-6`, `IPSR-R-7`, `IPSR-R-8`, `IPSR-AC-6`, `IPSR-AC-7`, `IPSR-AC-8`.

**Decisions made:** Reviewer's ADVISORY items (dead-assertion cleanup, conjunct isolation, positive control) deferred to `IPSR-T-7` rather than a third rework attempt — they're advisory, not DoD-blocking, and `IPSR-T-7` is explicitly the AC-traceability closure pass.

**Final verification result:** PASS on attempt 2/3.

---

### `IPSR-T-7` — Component-level regression & interaction test sweep

- **Status:** IN PROGRESS (attempt 1/3 — FAIL)
- **Date:** 2026-09-14
- **Implements:** `IPSR-AC-1` through `IPSR-AC-8` (closure pass)

**Attempt 1:**

- **Files changed:** `ipsr-list-filters.component.spec.ts`, `innovation-package-list.component.spec.ts` — full AC-1–AC-8 traceability audit; closed two real gaps found (AC-1/AC-2 were only tested at single-selection granularity, not the actual multi-select scenario the AC text describes); applied all three `IPSR-T-6` forward-pointer fixes (dead `ng-reflect-router-link` assertion replaced with `RouterTestingModule` + real `href` check + positive control; `&& ipsrReportingEnabled` conjunct isolated; positive control added for click-wiring).
- **Implementer verification (self-reported):** scoped coverage 77-82% across all four metrics (ipsr module) — above 50/60/60/60 floor; 667/668 ipsr-scoped tests passing; one pre-existing failure (`complementary-innovation.component.spec.ts`, `NG0205`) self-reported and investigated, claimed unrelated/pre-existing.
- **Reviewer verdict:** **FAIL** (all AC traceability mappings and all three forward-pointer fixes independently confirmed genuine — only one issue, but a significant one).
  1. **Discovered Issue:** The Implementer's "pre-existing and unrelated" claim for the `NG0205: Injector has already been destroyed` failure was under-discriminated. Reviewer traced the actual mechanism: `complementary-innovation.component.spec.ts` uses `jest.useFakeTimers()`; `ApiService`'s constructor injects `IpsrListFilterService`, whose constructor (added by `IPSR-T-1`) defers a dependency lookup into `queueMicrotask(() => { this.injector.get(PhasesService); ... })`; fake timers patch `queueMicrotask`, so the callback fires after TestBed teardown, hitting a destroyed injector. The Implementer's isolation test (stashing only `IPSR-T-7`'s two spec files) didn't discriminate "before this whole spec" from "before T-7 specifically," since the `queueMicrotask` code itself is from `IPSR-T-1`/`IPSR-T-2`, not `IPSR-T-7`.
     **Violated Rule:** tasks.md `IPSR-T-7` verification command runs exactly the pattern containing the red spec; `.agents/reviewer.md` §2 Stability & Integrity.
     **Remediation:** Run the actual discriminating test — compare against `master`'s version of `ipsr-list-filter.service.ts`.

**Leader-performed discriminating test (before rework dispatch):** Swapped in `master`'s `ipsr-list-filter.service.ts` (confirmed zero `queueMicrotask` occurrences on `master`) and re-ran `complementary-innovation.component.spec.ts` in isolation → **41/41 passed, fully green.** This confirms the `NG0205` failure is a **genuine regression introduced by `IPSR-T-1`/`IPSR-T-2`** (both already `[x]` PASSed and merged), not a pre-existing defect. The branch's service file was restored immediately after the test (confirmed via `git diff --stat` matching the pre-test diff size).

**Decision:** Per this spec's own precedent (`IPSR-T-6` fixed a live `IPSR-T-1`-era bug — `initsSelectedJoinText` — within its own scope rather than reopening a closed task), this regression fix is dispatched as part of `IPSR-T-7`'s rework — `IPSR-T-7` is explicitly the "regression & interaction test sweep" task, and this is exactly the class of regression it exists to catch. `IPSR-T-1`/`IPSR-T-2` remain `[x]` PASSed; this is forward-fix, not a re-litigation of their audit trail.

**Effort bumped:** medium → high for attempt 2 (root-cause fix, not just a test).

**Attempt 2 (rework — root-cause fix):**

- **Fix applied:** injected `DestroyRef` (public Angular API, no `HttpClient` dependency chain — confirmed safe against the `NG0200` cycle this service's defer pattern exists to avoid) into `IpsrListFilterService`'s constructor; set a `destroyed` flag via `destroyRef.onDestroy(...)`; added `if (this.destroyed) return;` as the first statement in the `queueMicrotask` callback, before `this.injector.get(PhasesService)`. The deferred-resolution pattern itself (needed to avoid `NG0200`) is untouched.
- **Regression test:** `jest.useFakeTimers()` before construction (holds the microtask pending) → `TestBed.resetTestingModule()` (destroys the injector, fires `onDestroy` synchronously while the microtask is still queued) → `jest.advanceTimersByTime(0)` (flushes it) → asserts no throw AND `phaseOptions()` stays `[]` (proves the guard returned early, not that something else no-oped).
- **Verification (fresh, actual):** `complementary-innovation.component.spec` → 41/41 (was 40/41); `ipsr-list-filter.service` → 28/28 (27 pre-existing + 1 new); full `ipsr` sweep → **79 suites, 669/669 passed, no red**; lint clean.
- **Reviewer verdict:** **PASS.** Independently verified against Angular's own source (`_effect-chunk2.mjs`) that `DestroyRef` has no provider record/dependency graph — confirmed cannot reopen the `HTTP_INTERCEPTORS` cycle. Confirmed guard placement is correct (first statement, before the throwing call). Verified the regression test's discriminating power two ways: checked `@sinonjs/fake-timers`' actual source to confirm `queueMicrotask` is genuinely faked and drained on `tick(0)`, and confirmed `TestBed.resetTestingModule()` genuinely destroys the module injector under this project's Jest setup (default `teardown.destroyAfterEach`) — so the test would fail without the fix (real `NG0205`) and would also fail if the injector were never actually destroyed (stale `phaseOptions` from the fixture). Confirmed the normal (non-destroyed) path is a pure no-op in production (root injector never destroyed during app life) and in the pre-existing tests (real-timer + `await Promise.resolve()` pattern unaffected). No `IPSR-T-1`/`IPSR-T-2` test touched or weakened.
  - **ADVISORY (non-gating, inherited `IPSR-T-1` content, not this fix):** `phasesService.getPhasesObservable().subscribe(...)` in the constructor is still never unsubscribed; now that a `DestroyRef` is available, `takeUntilDestroyed(destroyRef)` would close that on a future pass. Not gating.

**Requirements covered:** `IPSR-AC-1` through `IPSR-AC-8` (traceability closure) + an unplanned but necessary regression fix to `IPSR-T-1`/`IPSR-T-2`'s deferred-DI pattern.

**Decisions made:** Root-cause fix dispatched and verified rather than a test-only workaround; confirmed via Leader's own discriminating test (swap to `master`'s file) before dispatching, and independently re-confirmed by the Reviewer against Angular/sinon source.

**Final verification result:** PASS on attempt 2/3. Full `ipsr` test sweep is now clean (79/79 suites, 669/669 tests) — no known-red specs remain anywhere in the module.

---

## Out-of-band fix: chevron/purple-box visual bug (user-reported)

User supplied screenshots showing the Innovation Packages filter dropdowns render with a violet/purple box around the chevron, not matching Results Center's plain muted-chevron style. Confirmed within scope (design.md §6.3 visual parity, requirements.md NFR Design consistency) after clarifying with the user that the header/button layout and table-column redesign visible in the same screenshots are OUT of scope (never promised by this spec — `design.md` explicitly says "no structural change" to the list component) and belong in a future spec.

- **Status:** IN PROGRESS (attempt 1/2 — FAIL)
- **Root cause:** shared `app-pr-filter-multiselect` ships no default `.custom_select`/`.field`/`.icon_dropdown` styling — every consumer must override or inherit some global default with the unwanted violet chevron box.

**Attempt 1:**

- **Files changed:** `ipsr-list-filters.component.scss` — ported RC's `::ng-deep .custom_select, ::ng-deep .pr-filter-ms` override block.
- **Implementer verification (self-reported):** lint clean; component spec 31/31 passed (unchanged count — CSS-only, as expected); explicitly flagged that jsdom cannot verify actual rendered appearance — real browser check still needed (`IPSR-T-8`).
- **Reviewer verdict:** **FAIL** — one serious issue; all other checks (token fidelity, `.options` panel porting, no new hardcoded hex, test-count consistency) independently confirmed correct.
  1. **Discovered Issue:** The `::ng-deep` block was authored WITHOUT a `:host` prefix, so it compiles to a **global** CSS rule, not one scoped to this component. RC's identical block is nested inside a `.rc-select-wrap` wrapper class that provides the scoping; IPSR's version dropped the wrapper without replacing the scoping mechanism. `.custom_select` is the root class of the shared `app-pr-select`/`app-pr-multi-select` components, used **420 times across 85 templates** app-wide (bilateral, Result Detail, admin, result-creator, type-one-report, etc.). This would force fixed height/padding/border, `!important`-flagged `display: none` on `.icon_container`, and repositioned dropdown panels onto all of them — and because Angular injects emulated-encapsulation styles into `<head>` and never removes them, the leak persists app-wide for the rest of the SPA session after any user visits the Innovation Packages page. This defect class would NOT be caught by a browser spot-check of the IPSR page itself (`IPSR-T-8` wouldn't catch it).
     **Violated Rule:** Angular's own `::ng-deep` guidance (must be prefixed with `:host` to stay scoped); `onecgiar-pr-client/CLAUDE.md` §5 (shared `custom-fields` primitives are the design-system surface, not to be silently restyled from a feature stylesheet); design.md §6.3 (this task's declared boundary is IPSR toolbar parity, not a global control restyle).
     **Remediation:** Nest the block under the existing `:host` selector (`:host { ::ng-deep .custom_select, ::ng-deep .pr-filter-ms { ... } }`) — sufficient since both the primary row's multiselects and the popover's Portfolio control render inline within this component's own template (not via a portal), so all remain matched under `:host`.
  - **ADVISORY (non-gating):** the ported `.options` panel width (`max-width: 320px`) can overhang the popover's 260px container by up to 60px (RC's own popover is 320px wide, so RC never hits this) — worth a `max-width: 100%` inside the scoped block, or an explicit check during `IPSR-T-8`.

**Attempt 2 (Leader-applied fix, no fresh triad round — see rationale below):**

- **Fix applied:** nested the entire `::ng-deep` block under the existing `:host {}` selector, so it compiles to `:host { ::ng-deep .custom_select, ... }` — scoped to this component's subtree only, per Angular's documented `::ng-deep` requirement. Added an inline comment on the block explaining why the `:host` nesting is load-bearing (420+ shared-component usages app-wide would otherwise be affected).
- **ADVISORY considered but NOT applied as suggested:** tried narrowing `.options`' `max-width` from `320px` to `100%` to fix the popover-overhang advisory, but caught it myself before finalizing — with `min-width: 100%` already set, `max-width: 100%` would force the options panel to exactly the field's width, which for the primary row's narrow (140-220px) Submitter/Phase/Status controls would truncate longer option labels. Reverted to `320px` (matching RC exactly) and left an inline comment recommending a popover-specific override (not a shared one) if the overhang proves to be a real problem during `IPSR-T-8`'s visual pass.
- **Verification (fresh, actual):** `npx ng lint --quiet` → clean; `ipsr-list-filters.component` → 31/31 passed (unchanged, CSS-only); manual grep confirmed both `::ng-deep` occurrences are indented inside the `:host {}` block (no stray unscoped rule).
- **Rationale for Leader-applied fix (not a fresh Implementer→Reviewer round):** the defect, its exact cause, and its exact remediation were already fully diagnosed by the prior Reviewer's FAIL report — a one-line structural change (add a `:host` wrapper) with the correct approach already specified. Per `.agents/leader.md` → Delegation Thresholds, this is a 1-file, mechanical, already-specified correction (closer to "apply a known fix" than "implement/design a solution"), and re-running a full triad round would spend two more delegations to verify a change whose correctness is already established by Angular's own documented behavior (cited by the Reviewer) plus a direct grep-confirmable structural check. The advisory-scoping self-catch above demonstrates the correction was not applied blindly.

**Final verification result:** Fix applied and structurally verified. Full visual confirmation (that the purple box is actually gone, and that the popover-width advisory doesn't manifest) still requires `IPSR-T-8`'s real-browser pass — this is explicitly not Jest/jsdom-verifiable.

---

## 3. Summary

`IPSR-T-1` through `IPSR-T-7` all `[x]` complete. The chevron/purple-box visual fix is applied and structurally verified (scoping corrected, lint clean, tests unchanged). Next and final task: `IPSR-T-8` (manual browser verification) — must confirm (a) the chevron no longer shows a purple/violet box across all three primary-row controls and the popover's Portfolio control, (b) no visual regression leaked onto any OTHER page using `app-pr-select`/`app-pr-multi-select` (the exact risk this fix's rework was about), (c) the popover-width advisory doesn't cause a visible overhang in practice.
