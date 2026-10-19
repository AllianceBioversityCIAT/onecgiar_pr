# Module Spec — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `results` / `result-center-auto-apply-filters`
- **Linked spec:** `docs/specs/results/result-center-auto-apply-filters/requirements.md` + `design.md`.
- **Sprint / target phase (if any):** —
- **Owner / driver:** Platform Dev Team
- **Status:** `not-started`

---

## 2. Pre-flight checklist

Block execution until every box is ticked **at execution start** (the notes below record what was true at spec-authoring time; re-confirm each before `/akili-execute` begins work).

- [ ] `requirements.md` is approved — status at spec time: **approved** (user chose **Continue** at the Phase 1 gate). Re-confirm at execution start.
- [ ] `design.md` is approved — status at spec time: **approved** (user chose **Continue** at the Phase 2 gate). Re-confirm at execution start.
- [ ] Open questions in `requirements.md`/`design.md` resolved — `RCF-OQ-1` was resolved by `RCF-DD-3` at spec time; confirm no new open question was raised since.
- [ ] No CLARISA dependency — none exists for this spec; confirm unchanged at execution start.
- [ ] No conflicting in-flight spec touching the same entities — at spec time, `grep -rl "results-list-filters\|ResultsListFilterService" docs/specs` found one sibling: `docs/specs/changes/innovation-packages-filters-parity/` (status `draft`/`not-started`). It treats `results-list-filters.component.*`/`ResultsListFilterService` purely as a **read-only reference pattern** for a new, separate IPSR component — it does not edit these files, so there was no diff conflict at spec time. Note for whichever spec executes second: that spec's `tasks.md` line ~101 describes mirroring "RC's exact … Apply/Cancel popover" for IPSR's own secondary Portfolio-only facet (`IPSR-DD-3`) — after this spec lands, Results Center's own popover no longer has Apply/Cancel, but IPSR's secondary Portfolio popover deliberately keeps its own (a different facet, unaffected by this spec). Re-run the grep at execution start in case that sibling spec has since started implementation.
- [ ] No migration — client-only change, no entities touched; confirm unchanged at execution start.

---

## 3. Task list

### [x] `RCF-T-1` — Make every Results Center filter field auto-apply; remove Apply/Cancel

- **Type:** `client`
- **Description:** In `results-list-filters.component.ts`, remove the `isSidebarLayout()` gate inside `onFilterFieldChanged()` so it unconditionally calls `commitTempFilters()` (`RCF-DD-1`), replacing the stale comment above it (`RCF-DD-3`). Delete the now-callerless `applyFilters()` method (`RCF-DD-2`). In `results-list-filters.component.html`, delete the Apply/Cancel footer (`<div class="rc-more-footer">…</div>`, lines 61-64) — leave the ✕ button, "Clear all," outside-click, and `Escape` handling untouched. In `results-list-filters.component.spec.ts`: delete `describe('applyFilters', ...)`; replace the *"should wait for Apply in the menu"* test (which currently asserts the bug) with an assertion that `menu` layout now commits immediately, same as `sidebar`; add a DOM assertion that no `.rc-more-footer` / `.rc-btn--primary` / `.rc-btn--ghost` renders when the panel is open. Resolve `RCF-P-7` (the one `UNVERIFIED` Premise Ledger row) via the Consumers grep below.
- **Implements:** `RCF-R-1`, `RCF-R-2`, `RCF-R-3`, `RCF-R-4`, `RCF-R-5`; `RCF-AC-1`, `RCF-AC-2`, `RCF-AC-3`, `RCF-AC-4`, `RCF-AC-5`; `RCF-DD-1`, `RCF-DD-2`, `RCF-DD-3`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/components/results-list-filters/results-list-filters.component.ts`, `.html`, `.spec.ts`
- **Depends on:** `—`
- **Blocks:** `RCF-T-2`
- **Estimate:** `S`
- **Review:** `checklist` — single component, no shared-contract/migration/auth change; the Reviewer specifically checks (1) the regression test's red-before-fix proof (see Falsifier) and (2) that `RCF-P-7`'s Consumers grep was actually run and its result recorded, not asserted from memory.
- **Verification:**
  - **Falsifier:** Reintroduce the removed gate (`if (this.isSidebarLayout()) this.commitTempFilters();`) and observe the updated "menu layout commits immediately" test go red — the applied signal (e.g. `selectedFundingSource()`) stays at its pre-change value instead of the newly selected one, while the pre-existing `sidebar`-layout test in the same `describe` block stays green regardless. A test that passes under *both* the fixed and the reverted code is not proof the gate was removed.
  - **Red run:** `npx jest --testPathPattern="results-list-filters.component.spec" -t "filter layout"` — fails on the unmodified component (current `menu`-layout behavior: applied signal stays `[]`/unchanged), passes once the gate is removed and the test is flipped to expect the new value.
  - **Disqualifier:** If removing the gate breaks an existing, currently-green assertion in `results-list.component.spec.ts`, `results-list.viewport.spec.ts`, or `results-list.zoneless.spec.ts` because one of them encodes an assumption that applied filter signals only change after an explicit Apply click — stop and re-specify (this would mean `RCF-P-4`/`RCF-P-7`'s blast-radius read was wrong), do not patch the other suite ad hoc to force green.
  - **Consumers:** `results-list.component.ts` (reads the applied signals this task writes sooner — already verified safe via its two `effect()`s and the `resultsListFilter` pipe, `RCF-P-4`, no change expected). `applyFilters()` (deleted by this task) has no external caller — confirmed by `RCF-P-5`'s grep; no other file needs updating for that deletion. No Cypress/E2E spec references the removed buttons or `applyFilters()` — confirmed by `RCF-P-6`'s grep; no E2E suite needs updating. Resolve `RCF-P-7`: run `grep -rln "ResultsListFilterService\|resultsListFilterSE" onecgiar-pr-client/src`, open each non-test, non-`results-list.component.ts`, non-`shell-topbar.component.ts` hit, and confirm none assumes filters change only on an explicit Apply click (expected: they read unrelated fields on the `ApiService` aggregator or the service incidentally). Record the outcome in this checklist before closing the task.
- **Definition of done:**
  - [ ] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` (e.g. `✨ feat(results-list-filters): auto-apply Results Center filters, remove Apply/Cancel`) — **not yet committed**; changes are staged in the working tree pending user go-ahead to commit (project convention: never commit without explicit user ask).
  - [x] Lint clean (`ng lint` / `npm run lint`) — `npx ng lint --quiet` → "All files pass linting." (re-verified independently by the Leader).
  - [x] `onFilterFieldChanged()` unconditionally commits in both layouts; `applyFilters()` deleted; the `onFilterFieldChanged()` doc-comment no longer implies sidebar-only behavior.
  - [x] No `.rc-more-footer` / Apply / Cancel button renders in `menu` layout (verified by the new Jest DOM assertion, Reviewer-confirmed the panel itself renders first).
  - [x] `describe('applyFilters', ...)` removed; the "filter layout" describe block's tests pass per the Falsifier/Red run above; `describe('cancelFilters', ...)` and the "should hide the Filter menu button…" test are unmodified and still green (`RCF-R-4`).
  - [x] Existing `describe('clearAllNewFilters', ...)` / `removeFilter` tests (`RCF-R-3`, `RCF-AC-3`) and the layout-switch test ("should close an open menu, discarding its unapplied picks…", `RCF-R-5`) are unmodified and still green — this is the no-regression proof for chip removal, Clear all, and the layout toggle (confirmed: 190/190 in the disqualifier suites, and the full component spec at 96/96).
  - [x] `RCF-P-7` resolved — grep run (`grep -rln "ResultsListFilterService\|resultsListFilterSE" onecgiar-pr-client/src`), every non-test/non-exempt hit checked (`api.service.ts`, `phases.service.ts`, `change-result-type-modal.component.*`, `result-level.service.ts`, `portfolio-overview.component.ts`, `dashboard-lab.component.ts`, `lab-report-form.component.ts`, `aow-hlo-create-modal.component.ts`): none assumes filters change only on an explicit Apply click — outcome recorded in `execution.md` attempt-2 entry.
  - [ ] Client coverage thresholds (50/60/60/60) still met — **not independently re-verified by the Leader**: the project's `coverageThreshold.global` (package.json) is computed over the whole client test suite, which is outside Leader-inline scope to re-run here; this task's own spec file passes 96/96 with added coverage and is a net code deletion, matching design.md §10's documented low-risk expectation. Confirm via full CI run (`tasks.md` §6 Rollout & verification) before merge.
  - [x] No secret/token logged (N/A — no logging touched by this task).
  - [x] No i18n keys added or removed (the deleted "Cancel"/"Apply" button copy was structural, not a `TermKey`, per `onecgiar-pr-client/src/CLAUDE.md` §11).

### [x] `RCF-T-2` — Manual browser verification (both layouts)

- **Type:** `tests`
- **Description:** With `RCF-T-1` merged, run `npm start` and exercise Results Center in **both** `menu` (default) and `sidebar` ("Filters in a side column") layouts: confirm each of the 7 dropdowns + 2 "My activity" checkboxes updates the results list immediately with no Apply click; confirm no Apply/Cancel buttons render anywhere; confirm the ✕ button, outside-click, and `Escape` each close the panel without reverting any already-selected filter; confirm no visual regression in the popover or the side column now that the footer is gone (the one defect class `requirements.md` §9 names as having no automated gate).
- **Implements:** `RCF-AC-1`–`RCF-AC-5` (manual confirmation layer); the visual-layout defect class in `requirements.md` §9.
- **Files (expected):** none — manual verification only; this file's checklist below is the record.
- **Depends on:** `RCF-T-1`
- **Blocks:** `—` (final gate before merge/PR)
- **Estimate:** `S`
- **Review:** `skip-eligible` — claim to prove at execute time: this task has no code diff of its own to audit; its output *is* the verification record (the checklist below), not a diff. If the Implementer instead finds and fixes a bug during manual testing, that work reopens `RCF-T-1` and is reviewed under `RCF-T-1`'s `checklist` depth, not here.
- **Verification:**
  - **Falsifier:** n/a (no automated test — this task is the named human-check substitute for the one defect class `requirements.md` §9 marks as having no automated gate).
  - **Red run:** `n/a (no test gate)`.
  - **Disqualifier:** Any visual regression, or any case where closing the panel reverts an already-made selection → do not patch here; reopen `RCF-T-1`.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [x] `menu` layout verified: every field auto-applies, no Apply/Cancel buttons, close affordances don't revert selections.
  - [x] `sidebar` layout verified: same, confirming no regression (it already worked this way before this spec).
  - [x] No visual regression observed from the removed footer, in either layout.
  - [x] Outcome recorded here: **pass** — confirmed by the user (camilagiraldo11) directly in a real logged-in browser session on 2026-10-15, no notes/issues raised.

---

## 4. Dependency graph

```
RCF-T-1 (code + test change)
   └── RCF-T-2 (manual browser verification)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RCF-TEST-1` | unit (client) | `RCF-R-1`, `RCF-AC-1` | `results-list-filters.component.spec.ts` ("filter layout (menu / side column)" describe block) |
| `RCF-TEST-2` | unit (client) | `RCF-R-2`, `RCF-AC-2` | `results-list-filters.component.spec.ts` (new DOM assertion: footer/Apply/Cancel absent) |
| `RCF-TEST-3` | unit (client, regression) | `RCF-R-3`, `RCF-AC-3` | `results-list-filters.component.spec.ts` (existing `clearAllNewFilters`/`removeFilter` tests, unmodified, must stay green) |
| `RCF-TEST-4` | unit (client, regression) | `RCF-R-4`, `RCF-AC-4` | `results-list-filters.component.spec.ts` (existing `describe('cancelFilters', ...)`, unmodified, must stay green) |
| `RCF-TEST-5` | manual (client) | `RCF-AC-1`–`RCF-AC-5`, visual-layout defect class | `RCF-T-2` (real browser, both layouts) |

Server coverage thresholds are unaffected (no server file touched). Client coverage MUST stay above 50/60/60/60 — this task is a net code deletion and should not lower it.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, Jest, build, SonarCloud). No `migration:check:ci` impact (no migration).
- [ ] Manual QA per `RCF-T-2` recorded before merge.
- [ ] No downstream-consumer notification needed (no bilateral/platform-report/API change).
- [ ] Telemetry: N/A — no new logging, no change to `api.updateResultsList(...)`'s own error handling.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once `RCF-T-2` passes and the PR merges.
- [ ] No new cross-cutting UX pattern to promote into `docs/ux-ui/design.md` — this removes UI, it doesn't establish a new pattern.
- [ ] Follow-up candidate (not undertaken here, per `design.md` §13): removing the `temp*`/applied indirection entirely in favor of direct signal binding (the IPSR primary-facet pattern) — file as a separate, optional cleanup spec if ever prioritized.

---

## 8. Roll-back plan

1. Revert the `RCF-T-1` PR (single PR covers both the component/template change and its tests).
2. No migration to revert (none exists).
3. No feature flag to disable (none introduced — the fix is unconditional).
4. No bilateral/platform-report payload to check (untouched).
5. No downstream consumer to notify (none exists for this client-only UI change).

---

## Required cross-references

- `docs/specs/results/result-center-auto-apply-filters/requirements.md` and `design.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
