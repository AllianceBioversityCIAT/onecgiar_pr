# Execution Log — Confirm, don't block, removal of ToC-mapped contributors

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/toc-sp-removal-confirm` |
| Branch | `qa-development-2026-ss` (base `c12bb4d29`) |
| Approval Mode | gated |
| Leader | Claude Code, `opus` (T1) |
| Implementer / Reviewer wrappers | `.claude/agents/akili-implementer.md` (T2) / `akili-reviewer.md` (T3) |
| Started | 2026-11-27 |
| Budget (design §12) | 6 tasks · ≈380 LOC · 6 review rounds |

### Pre-flight (2026-11-27)

- `git status` at start: clean apart from the untracked spec folders `changes/portfolio-selection-breakdown/` and `changes/toc-sp-removal-confirm/`. `portfolio-selection-breakdown` does not reference `rd-contributors-and-partners`, so there is no conflicting in-flight spec.
- `akili doctor --agents`: the implementer, reviewer and tester personas are current. `leader.md` `primary-instructions` is reported OUTDATED (matched 2.36.0). Pending item for the apply-capable branch (`staging`): run `akili doctor --agents --fix`. Not applied on this branch (shared-file write discipline).
- `docs/specs/kaizen-log.md` does not exist, so there are no Active Lessons to carry.
- Wave 1: TRC-T-1 and TRC-T-3 ran in parallel. Their folders are disjoint; T-1 runs Jest only, and T-3 owns `npm run build` and `test:ct`.

## 2. Task Execution History

### TRC-T-1 — Science Program: confirm instead of block

| Field | Value |
|---|---|
| Final status | PASS |
| Date | 2026-11-27 |
| Attempts | 1 |
| Requirements covered | TRC-R-1 (S-1.1, S-1.2, S-1.3), TRC-NFR-2, TRC-NFR-3 |
| Skills / effort | `angular-developer`, `tdd` (task defaults) · effort medium · Implementer T2 wrapper, Reviewer T3 wrapper |

**Attempt 1**

- Files changed (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/`): `rd-contributors-and-partners.component.ts`, `rd-contributors-and-partners.component.spec.ts`, `rd-contributors-and-partners.zoneless.spec.ts`, `CLAUDE.md`.
- Implementer verification: folder Jest `Test Suites: 14 passed, 14 total / Tests: 378 passed, 378 total`; `npx ng lint --quiet` → `All files pass linting.`
- Red 1 (spec updated, component original):

  ```
  ● ... TOC-SP-AC-2 (TRC-S-1.1): the last ToC-planned Science Program opens a confirm dialog, and removes only on Yes
      Expected: "toc-science-program-remove-confirm"
      Received: "toc-science-program-min"
      > 329 |       expect(alertConfig.id).toBe('toc-science-program-remove-confirm');
  ● ... TRC-DD-3: a confirm callback firing after the item is already gone is a no-op
      TypeError: onConfirm is not a function     (not a behavioral red; the old code passes no callback)
  ● ... TOC-SP-AC-5 ...
      Expected: "toc-science-program-remove-confirm"
      Received: "toc-science-program-min"
      > 420 |       expect(alertConfig.id).toBe('toc-science-program-remove-confirm');
  ```

  The first failing assertion is the id, not `confirmText`, because the old alert has neither.
- Red 2 (zoneless case (a), with `cdr.markForCheck()` removed):

  ```
  ● ... TRC-S-1.1: the chip stays while the dialog is open, and disappears after "Yes, remove it" with no detectChanges
      - Array []
      + Array [ "SP07 - Breeding", ]
      > 999 |     expect(chipNames()).toEqual([]);
  ```

- Falsifier (b) (removal before `show`) and falsifier (c) (sentinel exemption dropped) were both observed red. The component was restored after each.
- Evidence re-run (Leader inline, after both workers finished): folder Jest `14 passed / 378 passed` → **VERIFIED**.
- Reviewer: **PASS**. Findings:
  - The copy, ids, `confirmText` and status match TRC-R-1 and TRC-R-2 word for word.
  - The control flow matches design §8, including the DD-3 identity early return and the DD-7 `markForCheck`.
  - No `blockIfLastScience` or `toc-science-program-min` remains in `src`.
  - Disqualifier ruling: the `await fixture.whenStable()` between the chip click and the dialog click is legitimate. It lets the repaint scheduled by the chip's own `(click)` finish, because that repaint would otherwise hide a missing `markForCheck`. There is no `detectChanges` after Yes, and Red 2 proves the case.
- Runtime events: none.

`spawns: implementer 31 calls, 209882 tokens, ended complete; reviewer 10 calls, 123281 tokens, ended complete`

**Not Done / Assumptions.** Copied from the Implementer's report. These are assumptions only, with no owed item and no blocker.

- Zoneless test needs a flush before the dialog click. Without `await fixture.whenStable()` after the chip click, falsifier (a) stayed green, because the chip-click repaint masked the missing `markForCheck`. This is not a manual `detectChanges`. It is documented in the folder `CLAUDE.md`.
- `deleteScience` with an out-of-range index resolves `item` to `undefined` and is a no-op. This matches the old filter-by-index.
- Left untouched on purpose: `component.html`, the Center path (TRC-T-2), `pr-multi-select/` (TRC-T-3), and the Center text in `CLAUDE.md`.

**ADVISORY (4R, non-gating):**

- Readability: `component.spec.ts:280-284` keeps a stale TOC-SP-T-1 doc comment ("block … combined") above the wrong describe, and the describe at `:293` is still titled "guard". This was already the case before the change.
- Reliability: two quick clicks on the chip X can open two dialogs with the same DOM id. The DD-3 early return makes the second Yes do nothing.
- Readability: the zoneless S-1.3 exemption tests call the handlers directly instead of clicking.

**Decisions:** `confirmRemoval` already accepts both kinds, with the Center copy and id from TRC-R-2, so TRC-T-2 reuses it. This was a Leader addition marked `[advisory-grade]`, and the Reviewer confirmed it.

### TRC-T-3 — `pr-multi-select`: opt-in `deselectGuard` input

| Field | Value |
|---|---|
| Final status | PASS |
| Date | 2026-11-27 |
| Attempts | 1 |
| Requirements covered | TRC-R-1 S-1.4, TRC-R-2 S-2.4 (component side), "must NOT change any other instance" |
| Skills / effort | `angular-developer`, `spartan`, `tdd` (task defaults) · effort high (shared component, ~80 instances) · Implementer T2 wrapper, Reviewer T3 wrapper |

**Attempt 1**

- Files changed (`onecgiar-pr-client/src/app/custom-fields/pr-multi-select/`): `pr-multi-select.component.ts`, `pr-multi-select.component.html`, `pr-multi-select.cy.ts`, `pr-multi-select.component.spec.ts`, `CLAUDE.md`.
- Red (a): the guard was implemented without the native `cb.checked = true` write, then `npx cypress run --component --spec src/app/custom-fields/pr-multi-select/pr-multi-select.cy.ts` gave `18 passing, 5 failing`:

  ```
  1) PrMultiSelectComponent deselectGuard (CT)
       hook returns true, checkbox click, flat: keeps the DOM tick, value and no emit:
     AssertionError: Timed out retrying after 10000ms: expected '<input.pr-native-check.ng-untouched.ng-valid.ng-dirty>' to be 'checked'
     at Context.<anonymous> (webpack://angular/./src/app/custom-fields/pr-multi-select/pr-multi-select.cy.ts:340:37)
  2) ... after an intercepted untick, a later real untick still removes it (NgModel in sync), flat:   (cy.ts:362:37)
  3) ... hook returns true, checkbox click, group: ...   (cy.ts:340:37)
  4) ... after an intercepted untick, a later real untick still removes it (NgModel in sync), group:   (cy.ts:362:37)
  5) logicalDeletion re-activation of an inactive item does not call the hook:
     AssertionError: expected false to equal true   (cy.ts:399:85)
  ```

  - Reds 1–4 confirm P-10.
  - Red 5 was a defect in the test, not the guard. Re-activating through the checkbox never works: ngModel flips `selected` before the handler runs, so the handler computes `is_active = !true`. The test now re-activates through the label click.
  - The Reviewer confirmed that the label-click test still goes through the re-activation branch and still catches falsifier (c).
- Green:
  - `pr-multi-select.cy.ts`: 23 passing.
  - `pr-multi-select.selection.cy.ts`: 7 passing.
  - `pr-multi-select.contract.cy.ts`: 32 passing, 12 failing.
  - Baseline with the HEAD `.ts` and `.html` swapped in: also 32 passing, 12 failing, and the same 12 tests (sections 2.2 ×4, 2.3 ×3, 2.6, 2.8 ×2, 2.10, isStatic).
  - Jest `pr-multi-select repro-p2-3308`: 4 suites and 16 tests passed.
  - `npm run build`: exit 0. Lint clean.
- Disqualifier checked: NgModel stays in sync. A later real untick still removes the item in flat and group mode.
- Evidence re-run (Leader inline, after both workers finished): Jest `pr-multi-select repro-p2-3308` → `4 passed / 16 passed` → **VERIFIED**. The Leader did not re-run CT or the build.
- Reviewer: **PASS**. Findings:
  - With the input unset, the code takes provably the same path as before (`null?.()` counts as "not vetoed").
  - The guard is consulted only when an active item is removed.
  - On `true` it re-ticks the option in both the model and the DOM, leaves `value` unchanged and emits nothing.
  - `#cb` is passed only on the two checkbox paths.
  - The folder `CLAUDE.md` covers flat and group mode and the select-all and chip-X bypass.
- Runtime events: none. After its hand-back the worker still held a background job, presumably the full `test:ct`. The Leader stopped it with TaskStop and confirmed that no Cypress or `ng` process was left running.

`spawns: implementer 82 calls, 181151 tokens, ended complete; reviewer 4 calls, 43134 tokens, ended complete`

**Not Done / Assumptions.** Copied from the Implementer's report. No owed item, no blocker.

- The Implementer ran the pr-multi-select CT specs, not the full `npm run test:ct`. The full run did not finish within the 590s timeout and printed no results. The contract spec alone takes about 15 minutes.
- The 12 reds in the contract file are a baseline that already differs from the "9 known" in the brief. The extra 3 may relate to the `focusin` listener added for P2-3678. This was not verified.

**Leader decision:** the scoped CT run meets the intent of the Definition of Done. HEAD shows the same 12 failures, so the change caused no new failures, and no other `custom-fields/` file was touched. The full `npm run test:ct` is still owed once before TRC-T-4 merges. It is raised at the gate.

**ADVISORY (4R, non-gating):**

- Risk: run the full `npm run test:ct` once while no worker is active, before T-4.
- Reliability (existing behavior, out of scope): re-activating a logically deleted item does nothing when done through the flat checkbox or a group label. Candidate for a separate ticket.
- Readability: the folder `CLAUDE.md` (around line 46) still says "9 rojos conocidos" for `contract.cy.ts`. The verified baseline is 12.
- Readability: the guard receives the panel `option`, not the `value` item. Worth saying in the JSDoc.
- Risk: select-all and the chip X skip the guard. T-4 must keep them disabled on the guarded dropdowns.

### Running totals after wave 1 (budget tripwire)

| Metric | Actual | Budget (design §12) |
|---|---|---|
| Tasks | 2 / 6 | 6 |
| LOC | +498 / −41 (production +65/−30, test +411/−9, docs +22/−2) | ≈380 (≈110 production, ≈270 test) |
| Review rounds | 2 | 6 |

**BUDGET TRIPWIRE FIRED.** After 2 of 6 tasks, test code is already at 411 lines, against about 270 budgeted for the whole spec, and 4 tasks remain. Production code is within budget. The cause is the per-task test matrices:

- T-3 adds 140 lines of CT for the 4 guard combinations, NgModel sync and logicalDeletion.
- T-1 adds a 6-case zoneless describe that mounts the real alert service.

Execution stopped for the user. Not auto-approved.

**Tripwire decision (user, 2026-11-27):** "Continue, raise budget". The test LOC budget is raised to about 800, and the production budget (≈110) and review rounds (6) are unchanged. Execution resumes with TRC-T-2.

### TRC-T-2 — Center: confirm instead of block, lead side effects, auto-assign guard

| Field | Value |
|---|---|
| Final status | PASS |
| Date | 2026-11-27 |
| Attempts | 1 |
| Requirements covered | TRC-R-2 (S-2.1, S-2.2, S-2.3) |
| Skills / effort | `angular-developer`, `tdd` (task defaults) · effort high (service method shared with IPSR, template side effect moved) · Implementer T2 wrapper, Reviewer T3 wrapper |

**Attempt 1**

- Files changed (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/`): `rd-contributors-and-partners.component.ts`, `.component.html`, `.service.ts`, `.component.spec.ts`, `.service.spec.ts`, `.zoneless.spec.ts`, `CLAUDE.md`.
- Implementer verification: folder Jest 14 suites / 385 tests passed; `npx jest ipsr-contributors` 6 suites / 118 tests passed (the disqualifier did not fire); `npm run build` succeeded (only the existing `pdfjs-dist` CommonJS warning); lint clean.
- Red (b), on the unmodified service:
  - `TRC-DD-8: ...[sentinel] never auto-assigns the sentinel as Lead` failed with `Expected: not "__OTHER_CENTERS__"`.
  - `TRC-DD-8 / P-12 ... [C1, sentinel] ... auto-assigns C1` failed with `Expected: "C1"`, `Received: null`.
- Red (a): with the second statement put back on `html:185`, the zoneless TRC-S-2.2 Cancel case failed. It received `"C1"` against `expect(rdPartnersSE.leadCenterCode).toBeNull()`. The first (a) attempt was green because the fixture had `otherCentersSelected = [C2]`, and a union of two Centers hid the effect. With an empty Other list, as the brief specifies, it went red. The fixture requirement is recorded in the folder `CLAUDE.md`.
- Red (c): with `setPossibleLeadCenters` removed from `removeCenterItem`, `TOC-C-AC-2` failed with `Expected: true, Number of calls: 0`.
- Evidence re-run (Leader inline, no worker active): folder Jest `14 passed / 385 passed`; `ipsr-contributors` `6 passed / 118 passed` → **VERIFIED**. The Leader did not re-run the build.
- Reviewer: **PASS**. Findings:
  - S-2.1, S-2.2, S-2.3 and DD-1..4, DD-7, DD-8 conform.
  - The copy and id match requirements.md:98 word for word.
  - The sentinel filter applies to auto-assign only; `getContributingCentersUnion` is unchanged.
  - No `blockIfLast*` or `toc-center-min` remains in code.
  - P-1 holds: the template is the only non-spec caller.
  - Order is preserved: the same body runs, then `setPossibleLeadCenters(true)`, then `markForCheck`. The recompute that the old template ran after a blocked delete is gone, which is what DD-4 intends.
  - The out-of-range index no-op is acceptable under DD-3.
- Runtime events: none.

`spawns: implementer 43 calls, 166611 tokens, ended complete; reviewer 7 calls, 70139 tokens, ended complete`

**Assumptions (Implementer, no owed item):**

- In TRC-S-2.3, removing the Lead `C1` while `[C2]` remains leaves the lead as `'C2'`: the recompute auto-assigns the only remaining Center, as it did before. The test asserts this.
- `deleteContributingCenter` with an out-of-range index is now a no-op. Before, it ran side effects with an empty filter.

**ADVISORY (4R, non-gating):**

- Both `[advisory-grade]` items were met: the early return comes before `updatingLeadData`, and the SUPERSEDED banner for `TOC-C-DD-*` plus a § TRC-R-2 section are in the folder `CLAUDE.md`.
- Reliability: a programmatic call with an out-of-range index on a ToC-planned result with one ToC-origin Center opens a dialog for an `undefined` item; Yes does nothing. Suggestion: return at the top of `deleteContributingCenter` when `item` is undefined.
- Readability: with `updateComponent = true`, `updatingLeadData` has two timers (50ms in `removeCenterItem`, 25ms in `setPossibleLeadCenters`). It works because the 50ms timer fires last; a one-line comment would help.

### Running totals after TRC-T-2 (budget tripwire)

| Metric | Actual (since `c12bb4d29`) | Budget |
|---|---|---|
| Tasks | 3 / 6 | 6 |
| LOC production | +119 / −76 | ≈110 |
| LOC test | +675 / −24 | ≈800 (raised by the user after wave 1) |
| Review rounds | 3 | 6 |

**BUDGET TRIPWIRE FIRED (production).** Production insertions (+119) now exceed the ≈110 estimate, and T-4 (guard wiring) is still to come. T-5 mostly deletes code (`requiresTocCenter`, a note, a marker branch), so net production is +43. The test budget (≈800) is not exceeded yet, but T-4 and T-5 will likely exceed it. The cause: each new `remove*Item` method is a full copy of an existing body, plus the side-effect-free predicates and the shared dialog. Stopped for the user; not auto-approved.

**Tripwire decision (user, 2026-11-27):** "Continue, drop LOC limits". From now on the spec does not track LOC; review rounds (6) are still tracked. Execution resumes with TRC-T-4.

### TRC-T-4 — Wire the panel deselect guards

| Field | Value |
|---|---|
| Final status | PASS |
| Date | 2026-11-27 |
| Attempts | 1 |
| Requirements covered | TRC-R-1 S-1.4, TRC-R-2 S-2.4 |
| Skills / effort | `angular-developer`, `tdd` (task defaults) · effort medium · Implementer T2 wrapper, Reviewer T3 wrapper |

**Attempt 1**

- Files changed (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/`): `rd-contributors-and-partners.component.ts`, `.component.html`, `.zoneless.spec.ts`, `CLAUDE.md`. `component.spec.ts` was not touched; all the new coverage is in the zoneless spec, as the DoD requires.
- Implementer verification: folder Jest 14 suites / 390 tests passed; lint clean; `npm run build` exit 0.
- Red (a): with `[deselectGuard]="scienceDeselectGuard"` removed from the SP dropdown:

  ```
  ● ... panel untick of the last ToC Science Program / Center (TRC-DD-9) › TRC-S-1.4: unticking the last ToC Science Program in the panel opens the dialog; Yes removes the chip and the option, no detectChanges
      expect(received).toBeTruthy()
      Received: null
      > expect(dialog(SP_DIALOG)).toBeTruthy();
  ● ... › TRC-S-1.4: Cancel on the panel dialog keeps the Science Program and its ticked option
      TypeError: Cannot read properties of null (reading 'click')   (no dialog was opened)
  ```

- Red (b): with the sentinel no longer excluded, "Other(s) sentinel untick: no dialog" received `<div class="custom_modal_container active" id="toc-science-program-remove-confirm">`.
- Red (c): the first attempt stayed green. An Other SP never matches a `scienceSelected` item, so a guard bound by mistake returns `false` and no dialog opens. The Implementer added `expect(panel.deselectGuard()).toBeNull()` to the Other(s) test, which then failed with `Received: [Function anonymous]`. The Reviewer accepted it: design §8 states this obligation structurally ("The Other(s) dropdowns get no `deselectGuard`").
- Evidence re-run (Leader inline, no worker active): folder Jest `14 passed / 390 passed` → **VERIFIED**.
- Reviewer: **PASS**. Findings:
  - The guards are stable arrow properties and conform to TRC-DD-9.
  - "The option stays ticked" holds, through `pr-multi-select.onSelectOption:497-501`.
  - No other instance is affected: the input defaults to `null`, and only the three named dropdowns are bound.
  - Yes clears the model, the chip and the panel flag with no `detectChanges`.
  - The extra `if (!match) return false` is within the design: with no match there is nothing to remove, and a veto would trap the user.
  - The disqualifier was cleared: the panel clone carries `id` / `code`.
- Runtime events: none. After its hand-back the worker still held a background job. The Leader stopped it with TaskStop and confirmed that no test or build process was left running.

`spawns: implementer 48 calls, 215431 tokens, ended complete; reviewer 5 calls, 45892 tokens, ended complete`

**Select-all / chip X state (`[advisory-grade]`, state only):** `showSelectAll` is not set on any guarded dropdown (default `false`, `pr-multi-select.component.ts:41`). All three dropdowns project their own chips, which T-1 and T-2 already guard, so the pr-multi-select chip X is not shown. The folder `CLAUDE.md` records that turning `showSelectAll` on would bypass the guard.

**ADVISORY (4R, non-gating):**

- Reliability / coverage: nothing tests a panel untick of the Centers "Other(s)" sentinel, and the binding on the flat `contributing_center` dropdown is never exercised. Only the ToC-split Centers dropdown is.
- Readability: the SP sentinel check uses `===` and the match uses `==`.

### Full `npm run test:ct` (owed since TRC-T-3), run 2026-11-27 with no worker active

- Result: the runner reported `x 76 spec(s) failed`. That is every spec in all 10 batches, including `pr-multi-select.cy.ts`, which passed 23/23 when run directly in TRC-T-3. Log: the session scratchpad `test-ct-full.log`.
- Probe (`leader.md` → *Deferring a check*). Assumption tested: "the failures are in the product". Running `npx cypress run --component --spec src/app/custom-fields/add-button/add-button.cy.ts` directly gave 3 passing, 0 failing.
- Cause: `scripts/run-ct-batched.js:93` calls `spawnSync('npx', ['cypress', ...])` without `shell: true`. On Windows `npx` is `npx.cmd`, so every batch fails to start. This is an existing tooling defect, last touched by `a50364243`, and it is outside this spec.
- Gate decision: the `custom-fields/` CT gate for this spec stays as satisfied by TRC-T-3's direct runs (`pr-multi-select.cy.ts` 23 passing, `selection.cy.ts` 7 passing, `contract.cy.ts` 32 passing / 12 failing, the same as on HEAD). TRC-T-4 does not touch `custom-fields/`. The runner defect is reported to the user as a separate ticket candidate.

### Running totals after TRC-T-4

Tasks 4 / 6 · review rounds 4 / 6 · LOC no longer tracked (user decision).

### TRC-T-5 — Relax P2-3249: any Contributing Center counts

| Field | Value |
|---|---|
| Final status | PASS |
| Date | 2026-11-27 |
| Attempts | 1 |
| Requirements covered | TRC-R-3 (S-3.1, S-3.2) |
| Skills / effort | `angular-developer`, `tdd` (task defaults) · effort medium · Implementer T2 wrapper, Reviewer T3 wrapper |

**Attempt 1**

- Files changed (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/`): `pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`, `.component.html`, `.component.spec.ts`, `.zoneless.spec.ts`, `CLAUDE.md`; `components/section-bottom-bar/section-bottom-bar.component.ts` (comment only). `result-detail/CLAUDE.md` has no P2-3249 or two-marker mention, so it was left untouched.
- Disqualifier: the grep before editing found only this folder plus the section-bottom-bar comment. P-7 holds.
- Red run (specs updated, code unchanged). Every failure is on a behavioral assertion:
  - zoneless `drops the field when every ToC centre is replaced by an "Other(s)" centre`: `expect(markerFieldEl().classList.contains('complete')).toBe(true)`, Expected: true, Received: false.
  - zoneless `lists the field as missing, without naming the ToC…`: Expected value "Contributing CGIAR Centers", Received array `["Contributing CGIAR Centers (at least one from the ToC)"]`.
  - zoneless `paints the centres card green only once a real centre exists…`: Expected "ok", Received "todo" (zoneless.spec.ts:632).
  - component spec `is COMPLETE when every ToC centre is removed and only "Other(s)"…`: Expected true, Received false.
  - component spec `uses the generic message…`: Expected "Please select at least one Contributing CGIAR Center.", Received "At least one Contributing CGIAR Center coming from the Theory of Change must remain selected. Centers added through \"Other(s)\" do not satisfy this on their own."
  - component spec `reports a legacy result … as complete`: Expected true, Received false.
- Falsifiers: (a) reinstating the ToC-only branch → 2 red; (b) deleting the marker → 8 red; (c) counting the sentinel → 2 red. Each was reverted.
- Implementer verification:
  - `result-detail` Jest: 103/104 suites, 2039/2040 tests. The one failure, `impact-level-info.component.spec.ts` "a successful PATCH to the E4 URL … reloads the green checks" (expected 1 call, received 0), fails the same way with the changes stashed, so it predates this task and is out of scope.
  - Folder Jest: 14/391.
  - Lint clean. The grep finds 0 hits in code.
- Evidence re-run (Leader inline, no worker active):
  - Jest over the folder plus `section-bottom-bar`: `16 passed / 440 passed`.
  - `npm run build`: exit 0, output `dist/onecgiar-pr-client`, no error lines.
  - Grep `requiresTocCenter|at least one from the ToC|contributingCentersRequiredNote` over `src` `*.ts` / `*.html`: 0 hits.
  - Result: **VERIFIED**. This also closes the Implementer's truncated build output.
- Reviewer: **PASS**. Findings:
  - TRC-R-3, S-3.1 and S-3.2 conform: there is one marker with a static label, the testid is kept, and the exact generic message is asserted with `toBe`.
  - The sentinel alone is still incomplete.
  - Flipping the legacy `from_toc=0` case to complete follows from TRC-R-3, and the PATCH is still not blocked (NFR-1).
  - The asterisk tests and bindings are untouched.
  - The remaining grep hits are only in `CLAUDE.md`, where they record the removal.
- Runtime events: none. The worker reported that no background jobs were left running.

`spawns: implementer 27 calls, 192066 tokens, ended complete; reviewer 8 calls, 54309 tokens, ended complete`

**Assumptions (Implementer):** prettier flags style issues in the template. Not checked whether these predate the edit, and not reformatted, to avoid unrelated churn.

**ADVISORY (4R, non-gating):**

- Readability: the new marker (`component.html` around line 252) is a single long line, unlike the one-attribute-per-line template around it.
- Readability: two renamed component-spec cases ("has no ToC reference centres", "is the flat path even when the ToC has centres") now only assert setup facts.
- Risk: the folder `CLAUDE.md` `Verified:` line keeps growing as one line. This is pre-existing; candidate for a kaizen cleanup on `staging`.
- Separate ticket candidate (pre-existing): the `impact-level-info.component.spec.ts` E4 PATCH green-check reload test fails on HEAD.

### Running totals after TRC-T-5

Tasks 5 / 6 · review rounds 5 / 6 · LOC no longer tracked (user decision).
