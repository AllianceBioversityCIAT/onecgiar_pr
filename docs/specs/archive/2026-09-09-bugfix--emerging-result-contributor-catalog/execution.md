# Execution Log — Emerging Result: full CGIAR Center / Science Program catalogue

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/emerging-result-contributor-catalog/` |
| Approval mode | gated (default — no `pre-approved` marker found in requirements/design/tasks) |
| Created | 2026-09-09 |

## 2. Task Execution History

### `ERC-T-1` — Gate ToC center/SP preselection on indicator presence + regression test

**Status:** PASS (attempt 2)

#### Attempt 1 — 2026-09-09

- **Files changed:**
  - `onecgiar-pr-client/.../aow-hlo-create-modal.component.ts` — added indicator-presence guard to `preselectTocCenters()` (L245) and `preselectTocSciencePrograms()` (L291), setting `tocCenters`/`contributingCenters` and `tocSciencePrograms`/`selectedEntities` to `[]` and returning early when `(node?.indicators?.length ?? 0) > 0` is false.
  - `onecgiar-pr-client/.../aow-hlo-create-modal.component.spec.ts` — added `describe('preselectToc* gating on indicators.length (ERC-AC-1, ERC-AC-2)')` with two cases.
- **Implementer verification (claimed):**
  1. `npx ng lint --quiet` — clean.
  2. `npx jest --silent --reporters=summary --no-coverage --testPathPattern="aow-hlo-create-modal"` — 59/59 passed.
  3. `npx ng build --configuration development` — succeeded.
- **Reviewer verdict:** `STATUS: FAIL`
  - **Discovered Issue:** `ERC-AC-1`'s centers-half assertions (`tocCenters()`/`hasReferenceCenters()`) are vacuous — the test is synchronous but `preselectTocCenters()` runs inside `centersSE.getData().then(...)` (a real Promise), so `fixture.detectChanges()` only queues the callback; the assertions read the signal's untouched initial value (`[]`) on both pre-fix and post-fix code. Only the Science-Programs half of `ERC-AC-1` is a genuine assertion (synchronous `of(...)` subscription). `ERC-AC-2` is correct by contrast (`await fixture.whenStable()`).
  - **Violated Rule:** `tasks.md` `ERC-T-1` "Bug Mode regression evidence" (red-before must fail on `tocCenters()`/`hasReferenceCenters()`); `requirements.md` §8 `ERC-AC-1`.
  - **Remediation Suggestion:** make `ERC-AC-1` `async`, add `await fixture.whenStable(); fixture.detectChanges();` before assertions (mirroring `ERC-AC-2`); re-verify red-before (guard temporarily removed) fails on the centers assertions too, then green-after with guard restored; report both runs.
  - **ADVISORY (non-gating):** readability — the guard `if (!((node?.indicators?.length ?? 0) > 0))` is a double negative in both methods; `design.md` §5 prescribes a named `hasIndicator` intermediate. Optional cleanup, not required for PASS.
  - **Confirmed non-issues:** hard boundary upheld (no `rd-contributors-and-partners/` file touched); `ERC-R-1`/`ERC-R-3`/`ERC-R-10` production logic conforms to `design.md` §5; `ERC-R-2` satisfied structurally via existing `computed()` gates.
- **Attempt History note for next Implementer spawn:** attempt 1's fix code is correct; only the `ERC-AC-1` test needs to await the centers-preselection microtask. Do not re-derive the production-code gate — that part already passed review.

#### Attempt 2 — 2026-09-09

- **Changes vs. attempt 1:**
  - `aow-hlo-create-modal.component.spec.ts` — `ERC-AC-1` made `async`; added `await fixture.whenStable(); fixture.detectChanges();` before assertions (mirroring `ERC-AC-2`), draining the `centersSE.getData().then(...)` microtask so the `tocCenters()`/`hasReferenceCenters()` assertions read post-resolution state.
  - `aow-hlo-create-modal.component.ts` — applied the optional readability advisory: named `const hasIndicator = (node?.indicators?.length ?? 0) > 0;` in both `preselectTocCenters()` and `preselectTocSciencePrograms()`, replacing the double-negative inline check. Behaviorally identical (Reviewer-confirmed truth table match, including `indicators: undefined`).
- **Implementer verification:**
  1. `npx ng lint --quiet` — clean.
  2. `npx jest --silent --reporters=summary --no-coverage --testPathPattern="aow-hlo-create-modal"` — 59/59 passed.
  3. `npx ng build --configuration development` — succeeded.
  4. Red-before re-check (guard in `preselectTocCenters()` temporarily disabled): `ERC-AC-1` failed specifically on `tocCenters()` (`Expected [] , Received [{acronym: "ABC", ...}]`), confirming the centers half is now genuinely load-bearing. Guard restored → green (59/59).
- **Reviewer verdict:** `STATUS: PASS`
  - Attempt-1 FAIL specifically resolved — the red-before re-check is behavioral proof the `ERC-AC-1` centers assertion now discriminates pre-fix from post-fix code.
  - `ERC-R-1`/`ERC-R-2`/`ERC-R-3`/`ERC-R-10` all conform to `design.md` §5 verbatim; `ERC-AC-2` pins the exact prior outputs unchanged.
  - Named-const refactor confirmed behaviorally identical to the prior inline guard.
  - Scope re-verified: repo-wide grep for spec markers hits only the two diffed files (plus an unrelated spec's own independent `ERC-` prefix in `reporting-program-band.component.*`, not touched here); `rd-contributors-and-partners/` untouched — `ERC-OQ-1` upheld.
  - **ADVISORY (non-gating):**
    - Readability: the `ERC-` id prefix is shared with an unrelated spec (`changes/emerging-result-cta-placement`); keep disambiguating in-code comments by folder name on future markers.
    - Reliability: `preselectTocSciencePrograms()`'s emerging branch clears `entityAowService.selectedEntities` (service-level state) — init-time only today, matches pre-fix effective behavior, no regression; worth remembering if a second caller ever invokes this method post-init.

**Requirements covered:** `ERC-R-1`, `ERC-R-2`, `ERC-R-3`, `ERC-R-10`, `ERC-AC-1`, `ERC-AC-2`.

**Decisions made:** kept `ERC-DD-1` (gate on `indicators.length > 0`) exactly as designed; applied the reviewer's optional readability advisory (named `hasIndicator`) since it was trivial and safe.

**Issues encountered:** attempt 1's `ERC-AC-1` test had a vacuous centers-half assertion due to an unawaited Promise microtask inside `preselectTocCenters()` — fixed in attempt 2 by awaiting `fixture.whenStable()`, matching `ERC-AC-2`'s existing pattern.

**Final verification result:** lint clean, 59/59 Jest tests passing (including both new gating cases and all pre-existing describe blocks unchanged in outcome), `ng build --configuration development` succeeds. Manual browser verification (`ERC-TEST-3`) remains a Definition-of-Done item outside this automated loop — see task summary to user.

## Pivot Record: `ERC-T-1` (post-PASS, manual browser verification)

**Date:** 2026-09-09. **Trigger:** user manually verified `ERC-T-1` in the browser and the bug still reproduced — "Report emerging result" still shows only "Other(s) CGIAR Centers"/"Other(s)" for the Contributing CGIAR Centers and Science Programs dropdowns.

**Root cause of the miss:** `requirements.md` §9's user-confirmed assumption ("`openReportResultModal` is the only caller that opens this modal with `indicators: []` for an otherwise ToC-linked node") was **stale, not wrong at the time it was written** — but became wrong before this spec executed. Since `changes/emerging-result-cta-placement` (2026-09-05), **"Report emerging result" no longer opens `aow-hlo-create-modal.component.ts` at all.** It opens a different aside component, `dashboard-lab/components/lab-report-form/lab-report-form.component.ts` (via `dashboard-lab.component.ts` → `openEmergingReport()` → `indicator-drawer` in `emerging` mode). This is documented in `dashboard-lab/CLAUDE.md`: *"Report emerging result ... abre el aside en modo emerging ... Los puntos de entrada legacy de entity-aow siguen con el modal ... no confundir con emerging."*

`ERC-T-1`'s fix to `aow-hlo-create-modal.component.ts` is **correct but inert for the live "Report emerging result" flow** — that modal is only reachable today from legacy `entity-aow` entry points, not from the button the user tested.

**Deeper finding:** the bug in `lab-report-form.component.ts` is not a preselection-gating bug like `ERC-T-1` — `tocCenters()`/`tocSciencePrograms()` are already correctly empty for `tocNode: null` (emerging). The defect is structural: **this component's template has no full-catalogue-direct branch at all.** `dropdown1Options()` / `dropdown1ScienceOptions()` unconditionally include the `Other(s)` sentinel, and the template always renders that dropdown — there is no `hasReferenceCenters()`/`hasReferenceScience()`-style `@else` (the pattern `aow-hlo-create-modal.component.html` already has). So for emerging results the user always sees a dropdown containing only "Other(s)" and must click it to reveal the real catalogue — exactly the reported symptom.

**Alternatives considered:** none — this is the same defect class as `ERC-DD-1` (skip the ToC path when there is no ToC), applied to the one place it was actually missing a fallback branch. No architecture decision is being overturned; no `ADR-NNN` affected.

**Revised technical direction (user-approved 2026-09-09 to proceed immediately):**
- New task `ERC-T-2` (this folder) — add `hasReferenceCenters` / `hasReferenceScience` computed signals to `lab-report-form.component.ts` (mirroring `aow-hlo-create-modal.component.ts`'s existing pattern) and branch the Centers/Science Programs template blocks in `lab-report-form.component.html`: when `hasReference*()` is `false` (no ToC data — includes but is not limited to the emerging case), bind the primary `app-pr-multi-select` directly to `otherCentersList()` / `otherScienceList()` (the full catalogue) into `contributingCenters()` / `selectedScience()`, instead of `dropdown1Options()` / `dropdown1ScienceOptions()` with the `Other(s)` sentinel. When `hasReference*()` is `true`, behavior is unchanged (today's ToC+Other split).
- `requirements.md`/`design.md`/`tasks.md` updated below to add `ERC-T-2` and record the corrected scope. `ERC-T-1` stays as delivered (harmless, correct for its actual reachable callers) — not reverted.

**Correction-closure sweep (two-direction, per Pivot Protocol):**
- Forward: grepped `docs/specs/bugfix/emerging-result-contributor-catalog/` for `aow-hlo-create-modal` and `lab-report-form` — only this execution.md and the new task entries below reference `lab-report-form`; no other spec doc needed updating.
- Backward: grepped the wider `docs/specs/` tree for references *to* this spec's `ERC-R-1`/`ERC-DD-1` — none found outside this folder, so no other document asserts a now-false claim about this fix's coverage.

### `ERC-T-2` — Add full-catalogue-direct branch to `lab-report-form.component.ts`/`.html`

**Status:** PASS (attempt 1)

#### Attempt 1 — 2026-09-09

- **Files changed:**
  - `lab-report-form.component.ts` — added `hasReferenceCenters = computed(() => this.tocCenters().length > 0)` and `hasReferenceScience = computed(() => this.tocSciencePrograms().length > 0)` next to the existing `tocCenters`/`tocSciencePrograms` signals.
  - `lab-report-form.component.html` — branched the Centers block: `hasReferenceCenters()` true keeps `dropdown1Options()` (ToC + `Other(s)`) unchanged; false binds the primary `app-pr-multi-select` to `otherCentersList()` (full catalogue) via the same `contributingCenters()`/`onContributingCentersChange`. Mirrored for Science Programs (`dropdown1ScienceOptions()` → `otherScienceList()`, same `selectedScience()`/`onScienceChange`). The secondary "Other(s)" reveal blocks are double-gated (`hasReferenceCenters() && showOtherCenters()` / `hasReferenceScience() && showOtherScience()`) so they cannot render in the no-ToC branch.
  - `lab-report-form.component.spec.ts` — new `describe('ERC-T-2: full-catalogue-direct fallback when there is no ToC data')` with 3 cases: signal-level no-ToC assertion, ToC-path regression assertion, and a real-template DOM assertion (`By.css('app-pr-multi-select')`, reading the mounted control's `options()` input) proving the primary controls bind to the full catalogue, not the lone sentinel.
  - `lab-report-form/CLAUDE.md` — re-stamped `Verified:` and added a trap entry documenting the bug and the fix (component-doc convention).
- **Implementer verification:**
  1. `npx ng lint --quiet` — "All files pass linting."
  2. `npx jest --silent --reporters=summary --no-coverage --testPathPattern="lab-report-form"` — 86/86 passed.
  3. `npx ng build --configuration development` — exit code 0 (only pre-existing unrelated warnings).
  4. Red-before/green-after: reverted just the `.ts`/`.html` diff (`git apply -R`), re-ran the suite → 3 failures, all `TypeError: component.hasReferenceCenters is not a function` (and the DOM test's `comp.` variant) — proving the new tests fail against unmodified code. Reapplied the diff → 86/86 green again.
- **Manual browser verification (user-performed, 2026-09-09):** user opened the live "Report emerging result" aside and confirmed both Contributing CGIAR Centers and Contributing Science Programs now render the full catalogue directly, with Science Program names shown in the `"SP02 - **Sustainable Farming** - Sustainable Farming"` format (already correct via `GET_AllInitiatives()`'s `full_name` composition + `optionLabel="full_name"` on both branches — no additional code change needed for the name display, confirmed already working as-is).
- **Requirements covered:** `ERC-R-1`, `ERC-R-2`, `ERC-R-3` (extended scope, per pivot).
- **Decisions made:** none beyond the pivot's revised direction (`tasks.md` `ERC-T-2` entry) — implemented exactly as scoped, no new signals/handlers.
- **Issues encountered:** none — single attempt, no rework.
- **Final verification result:** lint clean, 86/86 Jest tests passing (including all 3 new `ERC-T-2` cases and every pre-existing test unchanged in outcome), `ng build --configuration development` succeeds, manual browser check confirmed by the user.

