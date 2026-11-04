# Innovation Packages — Filter & Toolbar Parity — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `ipsr` — Innovation Packages list filter toolbar
- **Linked spec:** `docs/specs/changes/innovation-packages-filters-parity/requirements.md` + `design.md`
- **Sprint / target phase:** none specified
- **Owner / driver:** Frontend (client team)
- **Status:** not-started

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] Open questions resolved (`IPSR-OQ-1`, `IPSR-OQ-2` both resolved during design)
- [x] No CLARISA dependency gaps — `GET_AllCLARISACenters()` / `GET_ClarisaPortfolios()` already exist and are production-proven via Results Center
- [x] No conflicting in-flight spec found under `docs/specs/` touching `results-list-filters` or the IPSR list module
- [x] No migration — `npm run migration:check` N/A (no DB change)

---

## 3. Task list

### `IPSR-T-1` — Rewrite `IpsrListFilterService` core (Program, Phase, Status signals) — `[x]` PASS

- **Type:** `client`
- **Description:** Replace the `filters.general[0/1]` chip-array model in `ipsr-list-filter.service.ts` with `WritableSignal`-based state: `programOptions`/`selectedPrograms` (derived from `api.dataControlSE.myInitiativesListIPSRByPortfolio`), `phaseOptions`/`selectedPhases` (derived from `PhasesService.phases.ipsr` via a new `buildIpsrPhaseOptions()` helper, mirroring RC's `buildPhaseOptions()`), `statusOptions` (computed over `ipsrDataControlSE.ipsrResultList` per `IPSR-DD-2`) / `selectedStatus`. Remove `PhasesService`'s direct-write into the old `filters.general[1].options` array (`phases.service.ts` L43-52) — `PhasesService` goes back to being a pure data source.
- **Implements:** `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-DD-4` (empty-selection = unfiltered, encoded as each `selected*` signal defaulting to `[]`)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/services/ipsr-list-filter.service.ts`, `onecgiar-pr-client/src/app/shared/services/global/phases.service.ts`
- **Depends on:** —
- **Blocks:** `IPSR-T-2`, `IPSR-T-3`, `IPSR-T-4`
- **Estimate:** `M`
- **Skills:** `angular-developer` (signals, service design)
- **Definition of done:**
  - [x] `programOptions`/`phaseOptions`/`statusOptions` derive correctly from their sources (unit-tested — see verification below)
  - [x] Default (no selection) state for every facet is an empty array, and downstream consumers treat empty as "unfiltered" (asserted by a test, not just implied by code)
  - [x] `PhasesService` no longer mutates the old filter-service array directly; `phases.service.spec.ts` (if it exists) updated to match
  - [x] Lint + format clean
  - [x] Jest unit tests added: `ipsr-list-filter.service.spec.ts` — one test per option-derivation signal, one test for the empty-selection-means-unfiltered default
  - [x] Verification command: `npx jest --silent --testPathPattern="ipsr-list-filter.service" --no-coverage` — **PASS requires all new derivation tests green; a test that only asserts the signal is defined (not its derived VALUE against a known input fixture) does not satisfy this task — it is a presence-assertion, not proof the derivation logic is correct.** No input in this task can make the check fail if the fixture data never exercises the "initiative present in source but excluded from options" or "empty source list" edge cases — tests MUST include both.

### `IPSR-T-2` — Wire Portfolio secondary facet + popover temp-staging — `[x]` PASS (Center wiring added here later REMOVED per Pivot — see execution.md)

- **Type:** `client`
- **Description:** ~~Add `centerOptions`/`selectedCenters`/`tempSelectedCenters` and~~ Add `portfolioOptions`/`selectedPortfolios`/`tempSelectedPortfolios` to `IpsrListFilterService`, populated on first use via ~~`GET_AllCLARISACenters()` /~~ `GET_ClarisaPortfolios()` (same call RC already makes — no backend change). Implement `applyFilters()`/`cancelFilters()` temp→selected staging exactly per `design.md` §2.3. **Center wiring descoped post-hoc (`IPSR-DD-3` revised 2026-09-14) — `IpsrRepository.getAllInnovationPackages` has no center column; the Center signals this task originally added were removed during `IPSR-T-3`'s rework. This task's own PASS still stands for the Portfolio half and the apply/cancel staging mechanism, which are unaffected.**
- **Implements:** `IPSR-R-10`, `IPSR-DD-3` (exactly Center + Portfolio, no Submitter/Funding-source/My-activity)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/services/ipsr-list-filter.service.ts`
- **Depends on:** `IPSR-T-1`
- **Blocks:** `IPSR-T-5`
- **Estimate:** `S`
- **Skills:** `angular-developer` (signals, service design)
- **Definition of done:**
  - [x] `applyFilters()` copies every `temp*` into its `selected*` counterpart and only those two facets — no accidental leak of primary-row state into the popover staging
  - [x] `cancelFilters()` discards `temp*` edits without touching `selected*`
  - [x] Lint + format clean
  - [x] Jest unit tests added: apply commits, cancel discards, re-opening the popover after cancel reseeds `temp*` from the still-unapplied `selected*` (not from the discarded temp edits)
  - [x] Verification command: `npx jest --silent --testPathPattern="ipsr-list-filter.service" --no-coverage` — **the apply/cancel tests must call both paths with a DIFFERENT temp value than the current selected value; a test that sets temp equal to selected cannot distinguish "applied" from "cancel is a no-op" and does not prove the staging logic.**

### `IPSR-T-3` — Extend `InnovationPackageListFilterPipe` — `[x]` PASS

- **Type:** `client`
- **Description:** Add ~~`filterByStatus`, `filterByCenter`,~~ `filterByStatus`, `filterByPortfolio` methods to `innovation-package-list-filter.pipe.ts`, chained the same way `filterByInits`/`filterByPhase`/`filterByText` already are. Re-point `filterByInits`/`filterByPhase` to read the new `IpsrListFilterService` signals instead of the old `filters.general[...]` arrays. `combineRepeatedResults` stays unchanged (per `design.md` `IPSR-DD-1` — pipe kept impure, not migrated to `computed()`). **`filterByCenter` REMOVED (`IPSR-DD-3` revised 2026-09-14, Pivot approved by user) — `IpsrRepository.getAllInnovationPackages` has no center column on IPSR list rows; a Center filter has no data to match against.**
- **Implements:** `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-R-10`, `IPSR-DD-1`, `IPSR-DD-4`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/components/innovation-package-custom-table/pipes/innovation-package-list-filter.pipe.ts`
- **Depends on:** `IPSR-T-1`, `IPSR-T-2`
- **Blocks:** `IPSR-T-6`
- **Estimate:** `M`
- **Skills:** `angular-developer` (pipes, signals)
- **Definition of done:**
  - [x] Each new `filterBy*` returns the full input list unmodified when its selection is empty (asserts `IPSR-DD-4` explicitly, not just by omission)
  - [x] Each new `filterBy*` correctly narrows the list when a selection is present, tested against a fixture with rows that should and should not match
  - [x] Combined-filter case tested: Program + Status both active simultaneously narrows correctly (AND semantics across facets, matching the existing `filterByInits`+`filterByPhase` chain behavior)
  - [x] Lint + format clean
  - [x] Jest unit tests added: `innovation-package-list-filter.pipe.spec.ts` (new or extended) — one test per new filter method's empty-selection case, one per narrowing case, one combined-filter case
  - [x] Verification command: `npx jest --silent --testPathPattern="innovation-package-list-filter.pipe" --no-coverage` — **an input that would fail this check: a fixture row set where every row shares the same `status`/`center`/`portfolio` value — such a fixture cannot distinguish "filter narrows correctly" from "filter is a no-op that happens to match everything." Fixtures MUST include at least one non-matching row per facet.**

### `IPSR-T-4` — Rebuild primary filter row (search, Program, Phase, Status) — `[x]` PASS

- **Type:** `client`
- **Description:** Rebuild `ipsr-list-filters.component.html`/`.ts` primary row to match `results-list-filters.component.html`'s structure (search input, Program/Phase/Status multiselect controls), applied live per `IPSR-R-1`. Confirm whether RC's multiselect control is a shared component or `results`-module-local (`design.md` §13 Open Gaps) before reusing or duplicating it; promote to `shared/components/` in this task if it's local and promotion is low-risk, otherwise duplicate with a note. All new markup is Tailwind utilities only — no new SCSS blocks (`onecgiar-pr-client/CLAUDE.md` §5).
- **Implements:** `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-R-5` (search preserved)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/components/ipsr-list-filters/ipsr-list-filters.component.{ts,html,scss}`
- **Depends on:** `IPSR-T-1`
- **Blocks:** `IPSR-T-5`, `IPSR-T-6`
- **Estimate:** `M`
- **Skills:** `spartan` (MANDATORY per `onecgiar-pr-client/CLAUDE.md` for any frontend UI work — consult Spartan MCP before authoring the multiselect/toolbar markup), `angular-developer`
- **Definition of done:**
  - [x] Search input behavior unchanged from today (bound to `IpsrListService.text_to_search`, same as before)
  - [x] Selecting a Program/Phase/Status option updates the corresponding service signal immediately (no separate Apply step for the primary row, per `IPSR-R-1`)
  - [x] Multiple simultaneous selections per facet render and filter correctly (visually confirmed in Definition of Done for `IPSR-T-8`, unit-level narrowing already covered by `IPSR-T-3`)
  - [x] No new `.pr-*`/`.ip-*` SCSS class blocks added beyond an empty-but-for-`:host` file, unless a genuine Tailwind-inexpressible case is documented inline
  - [x] Lint + format clean
  - [x] i18n: new labels checked against `terminology.config.ts`; reused if an equivalent `TermKey` exists, else a plain string constant per existing IPSR page convention
  - [x] Verification command: `npx jest --silent --testPathPattern="ipsr-list-filters.component" --no-coverage` for the component-level rendering/selection tests written in this task, plus `npx ng lint --quiet` for the Tailwind-only styling rule — **a component test that only asserts the template compiles without checking that a selection event actually updates the service signal is a presence-assertion and does not satisfy this task.**

### `IPSR-T-5` — Build "More filters" popover + filter-chip row — `[x]` PASS

- **Type:** `client`
- **Description:** Add the "More filters" trigger button + popover (~~Center,~~ Portfolio, Apply/Cancel buttons) and the chip row below the primary filter bar (`filterChipGroups` computed, per-chip removal via `removeFilter(chip)`, "Clear all" via `clearAllNewFilters()`), mirroring `results-list-filters.component.ts`'s implementation almost verbatim (RC's exact `filterChipGroups`/`removeFilter`/`toggleMoreFilters`/`@HostListener('document:click')`/`Escape` logic, re-pointed at the IPSR signals). **Popover is Portfolio-only (`IPSR-DD-3` revised 2026-09-14) — no Center section/field.**
- **Implements:** `IPSR-R-4`, `IPSR-R-10`, `IPSR-DD-3`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/components/ipsr-list-filters/ipsr-list-filters.component.{ts,html,scss}`
- **Depends on:** `IPSR-T-2`, `IPSR-T-4`
- **Blocks:** `IPSR-T-7`
- **Estimate:** `M`
- **Skills:** `spartan` (MANDATORY per `onecgiar-pr-client/CLAUDE.md` for any frontend UI work — popover/dialog composition), `angular-developer`
- **Definition of done:**
  - [x] Removing a single chip clears only that facet's matching value — other active filters remain untouched (`IPSR-AC-4`)
  - [x] "Clear all" resets every facet including Portfolio and closes any open popover state
  - [x] Popover closes on: Apply, Cancel, outside click, `Escape` — all four paths verified
  - [x] Popover opening seeds `temp*` from current `selected*` (not stale from a prior cancelled edit)
  - [x] Lint + format clean
  - [x] Jest unit/component tests added covering each Definition-of-Done bullet above as a distinct test case (not one combined test)
  - [x] Verification command: `npx jest --silent --testPathPattern="ipsr-list-filters.component" --no-coverage` — **an input that would fail this check: opening the popover, editing temp, clicking Cancel, then asserting `selected*` is unchanged — a test that never opens/edits before cancelling cannot prove cancel discards anything, it can only prove cancel doesn't crash.**

### `IPSR-T-6` — Re-point export, admin-deselect, and phase-gating logic to new signals — `[x]` PASS

- **Type:** `client`
- **Description:** Update `onDownLoadTableAsExcel`/`onFilterSelectedInits`/`onFilterSelectedPhases` (currently reading `ipsrListFilterSE.filters.general[0/1].options`) to read the new `selectedPrograms`/`selectedPhases` signals instead. Confirm `innovation-package-list.component.ts`'s `deselectInits()`, `ngOnDestroy` restore, `everyDeselected`, and `checkIpsrReportingAccess()`/`ipsrReportingEnabled` gating logic are unaffected by the signal-model swap — these read `api.dataControlSE.myInitiativesListIPSRByPortfolio` directly, not the filter service, so they should need no change, but must be regression-tested to confirm.
- **Implements:** `IPSR-R-6`, `IPSR-R-7`, `IPSR-R-8`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/components/ipsr-list-filters/ipsr-list-filters.component.ts`, `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/innovation-package-list.component.ts`
- **Depends on:** `IPSR-T-3`, `IPSR-T-4`
- **Blocks:** `IPSR-T-8`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Excel export column set and row content unchanged from today when no filters are applied (regression baseline)
  - [x] Excel export correctly scopes to active Program/Phase selections (`IPSR-AC-8`)
  - [x] Admin role still starts with all initiatives deselected on load; `ngOnDestroy` still restores `selected = true` on all (`IPSR-AC-6`)
  - [x] `activeButtons`/`ipsrReportingEnabled` gating unchanged for a non-admin user with no role in the active portfolio (`IPSR-AC-7`)
  - [x] Lint + format clean
  - [x] Jest tests updated: existing `ipsr-list-filters.component.spec.ts` export tests re-pointed at new signals rather than deleted; `innovation-package-list.component.spec.ts` (if present) confirms gating/deselect behavior unchanged
  - [x] Verification command: `npx jest --silent --testPathPattern="innovation-package-list|ipsr-list-filters" --no-coverage` — **PASS requires the pre-existing export/gating/deselect tests to still be present and green, not merely that new tests exist; a diff that deletes the old assertions to make room for new ones does not satisfy this task.**

### `IPSR-T-7` — Component-level regression & interaction test sweep — `[x]` PASS

- **Type:** `tests`
- **Description:** Close any remaining scenario-level gaps not already covered by the Definition-of-Done tests in `IPSR-T-1` through `IPSR-T-6` — specifically the full acceptance-criteria table in `requirements.md` §8, run end-to-end at the component level (mounted `ipsr-list-filters` + `innovation-package-list` together where feasible).
- **Implements:** `IPSR-AC-1` through `IPSR-AC-8` (closure pass — confirms each AC has a passing test, not just that related code exists)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/components/ipsr-list-filters/ipsr-list-filters.component.spec.ts`, `innovation-package-list.component.spec.ts`
- **Depends on:** `IPSR-T-4`, `IPSR-T-5`, `IPSR-T-6`
- **Blocks:** `IPSR-T-8`
- **Estimate:** `S`
- **Skills:** `angular-developer`, `tdd` (coverage-closure discipline)
- **Definition of done:**
  - [x] A traceability check confirms every `IPSR-AC-*` row in `requirements.md` §8 maps to at least one named, passing test — record the mapping in the PR description, not just in this file
  - [x] Client coverage thresholds (50/60/60/60) still met or improved for the touched module
  - [x] Verification command: `npx jest --silent --testPathPattern="ipsr" --coverage` — **if any `IPSR-AC-*` cannot be mapped to a specific test, that is a FAIL for this task even if the overall suite is green; do not close this task by citing a different AC's test as coverage for the unmapped one.**

### `IPSR-T-8` — Manual browser verification (visual parity + accessibility)

- **Type:** `tests`
- **Description:** Run the app locally (`npm start`), sign in with both an admin and a non-admin token+user (per `onecgiar-pr-client/CLAUDE.md` §9 — both `token` AND `user` localStorage keys required), and manually compare the rebuilt Innovation Packages toolbar side-by-side against the live Results Center toolbar for visual/spacing/breakpoint parity. Separately, do a keyboard-only pass (Tab through every control, confirm focus rings visible, confirm `Escape` closes the popover, confirm chip removal buttons are reachable and labelled) since no automated a11y gate exists in this repo's toolchain (`requirements.md` Defect Coverage table).
- **Implements:** NFR — Accessibility, NFR — Design consistency (both explicitly flagged in `requirements.md` as having no automated gate)
- **Files (expected):** none (verification-only task; any bug found gets filed back against the relevant `IPSR-T-*` task, not fixed silently here)
- **Depends on:** `IPSR-T-7`
- **Blocks:** — (final task)
- **Estimate:** `S`
- **Skills:** none required (manual QA task, no code authored)
- **Definition of done:**
  - [ ] Screenshot or short recording comparing RC and IPSR toolbars at desktop and tablet width, attached to the PR
  - [ ] Keyboard-only pass completed with no dead-end focus traps and all interactive elements reachable
  - [ ] Confirmed served bundle is not stale before concluding anything (`window.ng.getComponent(...)` check per `onecgiar-pr-client/CLAUDE.md` §9 trap #2) if anything looks unexpectedly unchanged
  - [ ] **This check cannot fail silently as a pass:** if the manual reviewer cannot actually complete the keyboard pass (e.g., environment blocks focus testing), the task must be reported as **inconclusive**, not marked done — an inconclusive manual check is a legitimate outcome per the methodology's verification rules, never collapsed into a pass because time ran out.

---

## 4. Dependency graph

```
IPSR-T-1 (service core: Program/Phase/Status)
   ├── IPSR-T-2 (Portfolio + popover staging)
   │     └── IPSR-T-5 (popover UI + chips) ──┐
   ├── IPSR-T-3 (pipe extension) ────────────┼──┐
   │     └── IPSR-T-6 (export/admin/gating repoint)
   └── IPSR-T-4 (primary row UI) ────────────┘  │
         ├── IPSR-T-5 (also depends here)       │
         └── IPSR-T-6 (also depends here) ───────┘
               └── IPSR-T-7 (regression + AC closure sweep)
                     └── IPSR-T-8 (manual browser verification)
```

`IPSR-T-2` and `IPSR-T-3` can run in parallel once `IPSR-T-1` lands. `IPSR-T-4` can start in parallel with `IPSR-T-2`/`IPSR-T-3` (also only depends on `IPSR-T-1`).

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `IPSR-TEST-1` | unit (client) | `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-DD-4` | `ipsr-list-filter.service.spec.ts` |
| `IPSR-TEST-2` | unit (client) | `IPSR-R-10`, `IPSR-DD-3` | `ipsr-list-filter.service.spec.ts` (apply/cancel staging) |
| `IPSR-TEST-3` | unit (client) | `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-DD-4` | `innovation-package-list-filter.pipe.spec.ts` |
| `IPSR-TEST-4` | component (client) | `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-R-5` | `ipsr-list-filters.component.spec.ts` |
| `IPSR-TEST-5` | component (client) | `IPSR-R-4`, `IPSR-AC-4`, `IPSR-AC-5` | `ipsr-list-filters.component.spec.ts` |
| `IPSR-TEST-6` | component (client) | `IPSR-R-6`, `IPSR-R-7`, `IPSR-R-8`, `IPSR-AC-6`, `IPSR-AC-7`, `IPSR-AC-8` | `innovation-package-list.component.spec.ts` |
| `IPSR-TEST-7` | manual (browser) | Accessibility NFR, Design-consistency NFR | N/A — recorded in PR description |

Client coverage MUST stay above 50/60/60/60 (`onecgiar-pr-client/CLAUDE.md` §3).

---

## 6. Rollout & verification

- [ ] PR(s) opened with the commit convention (`<emoji> <type>(<scope>) [ticket]: <description>`)
- [ ] CI green (lint, Jest, build)
- [ ] Manual QA per `IPSR-T-8` completed and attached to the PR
- [ ] No bilateral/platform-report change — no downstream notification needed
- [ ] No admin/role/phase change — no operational runbook update needed
- [ ] No new telemetry to verify post-deploy (pure client UI feature)

### PR Strategy Recommendation

Estimated total ~500–650 LOC exceeds the ~400 LOC single-PR guideline — **split into two PRs**:

- **PR 1 — State & filtering logic** (`IPSR-T-1`, `IPSR-T-2`, `IPSR-T-3`): the service rewrite and pipe extension. Reviewable in isolation since it changes no template/markup — pure logic + unit tests. Review focus: signal derivation correctness, empty-selection semantics (`IPSR-DD-4`), apply/cancel staging.
- **PR 2 — Toolbar UI & regression closure** (`IPSR-T-4` through `IPSR-T-8`): the rebuilt component, popover, chip row, re-pointed export/admin logic, and the full test/verification sweep. Depends on PR 1 being merged first. Review focus: visual parity with RC, Tailwind-only styling compliance, AC traceability table from `IPSR-T-7`.

PR 2's description should link PR 1, state "out of scope: any change to Results Center itself, any backend/API change" up front, and include the `IPSR-T-8` screenshot/recording for reviewers who won't run the app locally.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once both PRs merge
- [ ] File a follow-up spec for the server-side `getAllInnovationPackagesFiltered()` migration if list performance ever becomes a concern (`design.md` §13)
- [ ] File a follow-up for the `computed()` signal migration of the filter pipe if a broader IPSR signals modernization pass is scheduled (`design.md` `IPSR-DD-1`)
- [ ] No `docs/prd.md` Open Question resolved by this spec — nothing to update there

---

## 8. Roll-back plan

1. Revert PR 2 first (toolbar/UI), then PR 1 (service/pipe) if both are merged — reverse merge order, since PR 2 depends on PR 1.
2. No migration to revert (no DB change).
3. No feature flag to disable (direct replacement, no flag).
4. Confirm the Innovation Packages page renders with the old toolbar and old filter behavior after revert — no other page/module is affected, since `results-list-filters` and `ResultsListFilterService` are never touched by this spec.
5. No downstream consumers to notify.

---

## Required cross-references

- `docs/specs/changes/innovation-packages-filters-parity/requirements.md`, `design.md` (same folder)
- `docs/prd.md`, `docs/ux-ui/design.md`, `onecgiar-pr-client/CLAUDE.md`
