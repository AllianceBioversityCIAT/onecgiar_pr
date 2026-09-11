# Tasks — Emerging Result: full CGIAR Center / Science Program catalogue

## 1. Scope of this task list

- **Module / feature:** `bugfix/emerging-result-contributor-catalog`
- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Depth:** Lite — 2 tasks (revised 2026-09-09 by pivot: `ERC-T-2` added after `ERC-T-1`'s target component was found to be inert for the live "Report emerging result" flow; see `execution.md` → "Pivot Record: `ERC-T-1`")
- **Status:** implemented and manually verified — both tasks (`ERC-T-1`, `ERC-T-2`) closed; pending PR/commit

## 2. Pre-flight checklist

- [x] `requirements.md` approved (pending user Continue in this session).
- [x] `design.md` approved (pending user Continue in this session).
- [x] Open questions resolved for this spec's scope (`ERC-OQ-1` closed — out of scope by explicit user instruction, see `requirements.md` §10).
- [x] No CLARISA dependency change.
- [x] "Only caller" risk resolved — user-confirmed (2026-09-09) `openReportResultModal` is the only caller opening this modal with `indicators: []` for an otherwise ToC-linked node; no grep needed for that question.
- [x] No conflicting in-flight spec touching `aow-hlo-create-modal.component.ts` — grep confirmed only archived specs and `results/intermediate-outcome-aow-visibility/aow-selector` (status `not-started`, no active work) reference this file.
- [x] Migration: n/a (no DB change).

**🛑 Hard boundary (user instruction, 2026-09-09):** `rd-contributors-and-partners/` (any file under it) MUST NOT be edited by this spec, under any circumstance — not even if the Implementer notices it shares the same ToC/Other pattern. If a change there ever seems warranted, stop and raise it to the user as a separate, explicitly-requested spec; do not fold it into `ERC-T-1`.

## 3. Task list

### `ERC-T-1` [x] — Gate ToC center/SP preselection on indicator presence + regression test

- **Type:** `client | tests`
- **Description:** In `AowHloCreateModalComponent`, change `preselectTocCenters()` and `preselectTocSciencePrograms()` so that when `entityAowService.currentResultToReport()?.indicators?.length` is `0`/undefined (the emerging/unplanned-result flow), the methods skip ToC matching entirely and set `tocCenters`/`contributingCenters` and `tocSciencePrograms`/`selectedEntities` to `[]` — instead of matching node-level `toc_partner_institution_ids` / `contributing_synergy_program_initiative_ids`, which are present on the node regardless of indicator selection. When an indicator IS present, preserve today's matching logic unchanged. No template change needed — `hasReferenceCenters()`/`hasReferenceScience()` and the existing `@else` (full-catalogue) branches already render correctly once their inputs are empty.
  Add the regression test per `design.md` §10: one case with `indicators: []` + non-empty node-level ToC id fields, asserting `tocCenters()`/`tocSciencePrograms()`/`hasReferenceCenters()`/`hasReferenceScience()` come back empty/false (fails on current code, passes after the fix); one case with `indicators` populated (existing default mock shape) asserting the ToC/Other split is unchanged (this must already pass before AND after — proves no regression on `ERC-R-3`).
- **Implements:** `ERC-R-1`, `ERC-R-2`, `ERC-R-3`, `ERC-R-10`, `ERC-AC-1`, `ERC-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.ts` (fix)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.spec.ts` (regression test, extend `describe('Component Integration Tests …')` block ~L301)
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S`
- **Bug Mode regression evidence:**
  - Before the fix: run the new emerging-case test against unmodified `aow-hlo-create-modal.component.ts` — it MUST fail (`tocCenters()`/`hasReferenceCenters()` come back non-empty/true).
  - After the fix: same test MUST pass, and the indicator-case test (and the existing `describe('preselectTocCenters logic …')` / `describe('Centers ToC/Other split logic …')` / `describe('Science Programs ToC/Other split logic …')` / `describe("OTV-AC-3/4/7…")` blocks already in the spec file) MUST still pass unmodified — this is the disqualifier for `ERC-R-3`: if any of those pre-existing tests changes outcome, the gate is not narrow enough and the fix must be revised, not the test.
- **What the passing test does NOT prove:** it proves the two computed signals (`tocCenters`/`tocSciencePrograms`) and their downstream `hasReference*` gates are correct for these two node shapes. It does not exercise the live DOM/dropdown-panel rendering (jsdom does not lay out the `pr-multi-select`/`pr-filter-multiselect` overlays — see `onecgiar-pr-client/CLAUDE.md` §9 "Verifying in a REAL browser"). A manual browser check (below) is the check that proves the actual dropdown content, not just the feeding signals.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(aow-hlo-create-modal): …` per root `CLAUDE.md`) — pending user commit/PR approval.
  - [x] `npx eslint`/`npx ng lint --quiet` clean.
  - [x] `npx jest --silent --reporters=summary --no-coverage -- --testPathPattern="aow-hlo-create-modal"` green, including the two new cases (red-before verified via throwaway pre-fix run, then green-after — see `execution.md` attempt 2).
  - [x] `npx ng build --configuration development` succeeds.
  - [x] Manual verification in a real browser — **N/A, superseded**: `ERC-T-1` targets `aow-hlo-create-modal.component.ts`, which is no longer the live "Report emerging result" entry point (see `execution.md` → "Pivot Record: `ERC-T-1`"). The actual live-flow manual verification was performed against `ERC-T-2`'s fix instead. `ERC-T-1`'s code change remains correct and harmless for the legacy `entity-aow` entry points it still serves.
  - [x] No secret or token leaked in logs or messages (`.cursorrules`) — n/a change surface, no new `console.log` introduced.
  - [x] No i18n keys needed (no new user-facing strings).

### `ERC-T-2` [x] — Add full-catalogue-direct branch to `lab-report-form.component.ts`/`.html` (the actually-live emerging entry point)

- **Type:** `client | tests`
- **Context (Pivot, 2026-09-09):** see `execution.md` → "Pivot Record: `ERC-T-1`". `ERC-T-1` fixed `aow-hlo-create-modal.component.ts`, but "Report emerging result" no longer opens that component — since `changes/emerging-result-cta-placement` (2026-09-05) it opens `dashboard-lab/components/lab-report-form/lab-report-form.component.ts` via the `indicator-drawer` aside. That component has no full-catalogue fallback at all (unlike the modal), so the emerging flow always shows a dropdown containing only the `Other(s)` sentinel.
- **Description:** Add `hasReferenceCenters = computed(() => this.tocCenters().length > 0)` and `hasReferenceScience = computed(() => this.tocSciencePrograms().length > 0)` to `LabReportFormComponent`. In `lab-report-form.component.html`, branch the Centers block (~L353-392) and the Science Programs block (~L428-456): when `hasReferenceCenters()`/`hasReferenceScience()` is `true`, keep today's `dropdown1Options()`/`dropdown1ScienceOptions()` (ToC + `Other(s)` sentinel) bound exactly as now; when `false`, bind the primary `app-pr-multi-select` directly to `otherCentersList()`/`otherScienceList()` (already-existing computeds — the full catalogue minus whatever is in `tocCenters()`/`tocSciencePrograms()`, which is empty in this branch) via the same `contributingCenters()`/`selectedScience()` signal and `onContributingCentersChange`/`onScienceChange` handlers — no new signals, no new handlers. Guard the secondary "Other(s)" reveal block with `hasReferenceCenters() && showOtherCenters()` / `hasReferenceScience() && showOtherScience()` so it cannot render in the no-ToC branch. Chip rendering (`contributingCenters()`/`selectedScience()`) is unaffected — already unconditional.
- **Implements:** `ERC-R-1`, `ERC-R-2`, `ERC-R-3` (extended to this component — see requirements.md §12 pivot note).
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts` (add the two computed signals)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html` (branch both blocks)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts` (regression tests — emerging/no-ToC case shows full catalogue directly; indicator/ToC case unchanged)
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S`
- **Bug Mode regression evidence:**
  - Before the fix: a test asserting that with `tocNode: null` (emerging), the rendered/bound options for the primary centers and science multi-selects equal the full catalogue (not `[otherCentersSentinel]`/`[{id: OTHER_SP_ID, ...}]` alone) MUST fail against unmodified code.
  - After the fix: same test passes; existing ToC-path tests (`describe('P2-3554: the centers dropdown when the CLARISA catalogue resolves LATE', ...)` and any other test relying on `dropdown1Options()`/`dropdown1ScienceOptions()`) MUST still pass unmodified.
- **What the passing test does NOT prove:** jsdom does not lay out `pr-multi-select` overlays — same caveat as `ERC-T-1`. Manual browser check required.
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] `npx jest --silent --reporters=summary --no-coverage -- --testPathPattern="lab-report-form"` green (86/86), including new emerging-branch cases and all pre-existing tests unchanged in outcome (red-before/green-after verified — see `execution.md`).
  - [x] `npx ng build --configuration development` succeeds.
  - [x] Manual verification in a real browser (user-performed, 2026-09-09): "Report emerging result" now shows the FULL catalogue directly for both Contributing CGIAR Centers and Contributing Science Programs (no lone "Other(s)" entry), with Science Program names rendering correctly (`"SP02 - Sustainable Farming - Sustainable Farming"` format).
  - [x] No secret/token leaked in logs (`.cursorrules`) — no new `console.log` introduced.
  - [x] No i18n keys needed (no new user-facing strings).

## 4. Dependency graph

```
ERC-T-1  (fix + regression test for aow-hlo-create-modal.component.ts — correct, but inert for the live emerging flow; see Pivot Record)
ERC-T-2  (the actually-live fix, for lab-report-form.component.ts — depends on nothing, independent of ERC-T-1)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `ERC-TEST-1` | unit (client, Jest) | `ERC-R-1`, `ERC-R-2`, `ERC-AC-1` | `aow-hlo-create-modal.component.spec.ts` — new emerging-flow case |
| `ERC-TEST-2` | unit (client, Jest) | `ERC-R-3`, `ERC-AC-2` | `aow-hlo-create-modal.component.spec.ts` — new indicator-flow regression case |
| `ERC-TEST-3` | manual (browser) | `ERC-R-2` rendered behavior (dropdown content, not just signals) | See Definition of Done manual check above |

Client coverage MUST stay ≥ 50/60/60/60 (unaffected — file already covered, change is additive to existing tests).

## 6. Rollout & verification

- [ ] PR opened with commit convention `🔧 fix(aow-hlo-create-modal) [ticket]: gate ToC center/SP preselection on indicator presence`.
- [ ] CI green (lint, Jest, `ng build`, SonarCloud). No migration to check.
- [ ] Manual QA on the reporting AOW page per `requirements.md` `ERC-AC-1`/`ERC-AC-2` happy paths.
- [ ] No bilateral/platform-report payload touched — no downstream-consumer notification needed.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` after merge.
- [ ] `ERC-OQ-1` closed by explicit user instruction — no follow-up spec is implied or auto-scheduled; `rd-contributors-and-partners` is not to be touched unless the user separately requests it later.

## 8. Roll-back plan

1. Revert the merge PR.
2. No migration to revert, no feature flag to disable.
3. No bilateral/platform-report payload to restore — nothing downstream to notify.

## Required cross-references

- `docs/specs/bugfix/emerging-result-contributor-catalog/requirements.md`, `design.md`, `proposal.md` (this folder).
- `docs/specs/kaizen/bugfix--lead-center-full-catalog.md`.
