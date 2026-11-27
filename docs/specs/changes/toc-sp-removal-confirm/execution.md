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

### TRC-T-6 — Manual browser check (HITL)

| Field | Value |
|---|---|
| Final status | **pivot** (`[~]`): one step fails, panel Yes leaves the box ticked |
| Date | 2026-11-27 |
| Run by | Leader, driving Chrome (claude-in-chrome) on the user's PRTest session; user approval "dale a las pruebas tu" |
| Environment | Own `ng serve` (localhost:4200) on HEAD `70b9ec2eb`, with the bundle confirmed current (`scienceDeselectGuard` present in the live component). API: PRTest backend (`https://prtest-back.ciat.cgiar.org/`). The local server could not be used: on Node v26 it crashes (`buffer-equal-constant-time` / `jwa`), and on Node 20 (`npx -p node@20`) the dev DB answers `connect ETIMEDOUT` |
| Results used | **9164** (id 11632, "Testing CG Centers selector", created by the user): 1 ToC Center CENTER-03 = Lead, 3 ToC SPs. **8803** (id 11271): exactly 1 ToC SP, SP05 |

**Steps and observations** (source: this session's transcript, from the TRC-T-6 browser run onwards):

| # | Step | Expected (spec) | Observed | Result |
|---|---|---|---|---|
| 1 | 9164: chip X on CIAT (the only ToC Center, also Lead) | Dialog "Contributing CGIAR Center mapped in the Theory of Change", TRC-R-2 body, Cancel / Yes, remove it; chip still visible | Exactly that | PASS |
| 2 | Cancel | `contributing_center` / Lead unchanged (S-2.2) | CENTER-03, Lead CENTER-03 | PASS |
| 3 | Panel: untick CIAT | Same dialog, the option stays ticked (S-2.4) | Dialog shown, box ticked | PASS |
| 4 | Cancel, reopen the panel | The tick is still visible | CIAT still ticked | PASS |
| 5 | Panel: untick, then **Yes** | Removed like an ordinary removal; Lead cleared, not the sentinel (S-2.1) | Model: `contributing_center = []`, Lead `null`, chip gone with no interaction. Generic message "Please select at least one Contributing CGIAR Center." (S-3.2) | PASS (model / chip / message). **The tick: see #13** |
| 6 | Tick "Other(s)" only (the sentinel) | Still incomplete | Red message stays | PASS |
| 7 | Add CIP through "Other(s)" | No red message, card not incomplete (S-3.1) | Message gone, card green, scan back to the original "1 field missing"; Lead auto-assigned CIP (not the sentinel) | PASS |
| 8 | Save draft, reload | Removal persisted; ToC prefill does not re-add (P-11) | Server/client: no ToC Center, Other = CENTER-06 (CIP), Lead CENTER-06 | PASS |
| 9 | Chip X on CIAT, then **Yes** (unsaved) | Dialog; chip disappears with no interaction (DD-7, zoneless) | Dialog shown; chip gone, Lead `null` | PASS |
| 10 | Restore 9164 (tick CIAT, Lead CIAT), save, force reload | Original state | Server: `CENTER-03 / from_toc 1 / lead 1`; client: ToC bucket, references `[45,50,49,46]`, confirm armed, no dirty badge | Restored |
| 11 | 8803: chip X on SP05, Cancel | Dialog "Science Program mapped in the Theory of Change" (TRC-R-1); SP unchanged | Exactly that | PASS |
| 12 | Panel: untick SP05, Cancel, reopen | Dialog; tick stays (S-1.4) | Dialog shown; SP05 still ticked | PASS |
| 13 | Panel: untick SP05, then **Yes**, reopen the panel | Chip and option removed ("the chip is removed exactly as an ordinary removal removes it", S-1.1; design §8 Tests "Yes via the panel removes the chip and the option") | Model `scienceSelected = []`, `pr-multi-select` value `[]`, option `selected = false`, chip gone. **But the native `input.checked` for SP05 is still `true`: the box is still ticked** | **FAIL** |
| 14 | Same as #13 on Centers (9164, unsaved, discarded) | Same | CIAT box still ticked after Yes, model `[]` | **FAIL** (same defect) |

Not done on purpose: save + reload for the **SP** removal on 8803. SP05 is a *pending* contributing initiative, so removing and re-adding it can change its acceptance state or notify that SP. Persistence is already covered by step 8 (Centers) and by the unchanged PATCH contract (NFR-1). 8803 was left untouched (forced reload; server still `SP05/from_toc 1`).

**Defect (root cause, measured in the live DOM).** Design premise **P-10** ("NgModel stays consistent: its next real change (`true`→`false`) still differs from the stored `true`") is **wrong for a model-side removal**:

1. The user's native untick sets NgModel's internal `viewModel` to `false`.
2. The guard intercepts and writes `option.selected = true` and `cb.checked = true`. The `[ngModel]` binding input is still `true`, so NgModel does not run.
3. On Yes, `remove*Item` drops the item, and `pr-multi-select` sets `option.selected = false`. NgModel's `ngOnChanges` compares the new `false` with its `viewModel` (`false`), finds no change, and never writes the DOM.
4. The box stays ticked although the item is gone.

Why the gates missed it:

- TRC-T-3's CT case "a later real untick still removes it" covers a **second user untick**, not a **model-side** removal.
- TRC-T-4's zoneless "Yes removes … the option" asserts the option's `selected` flag, not DOM `input.checked`. That is exactly the shortcut design §8 Tests forbids for the CT ("assert the DOM, never `option.selected`").

Impact: after Yes in the panel, the option still looks selected. The data is correct (chip gone, value `[]`, save sends the right body), but S-1.1 / S-1.4 / S-2.4 are not met visually, and a later click on that box flips it in the wrong direction.

**Other observations (outside this spec's changes; not gating):**

- Local-only: the gitignored `src/environments/environment.ts` stub has `elastic.baseUrl: ''`. `general-interceptor.service.ts` then matches every request with `req.url.includes('')` and **never attaches the `auth` header**, so a local client against any real API gets 401 on every authenticated call. For this run the stub was temporarily set to `http://elastic.invalid/` (restored afterwards). Worth a note in the client `CLAUDE.md` §9, or a guard in the interceptor (`baseUrl && …`).
- Intermittent, not reproduced: one reload of 9164 (right after the restore save) came up with empty ToC Center references. The client then re-bucketed CENTER-03 (`from_toc=1` on the server) into "Other" and showed "Unsaved changes" on a page nobody had touched; saving then would have stored `from_toc=false`. A forced reload loaded correctly. The bucketing / prefill effects were not changed by this spec.
- Existing behaviour: when ticking a ToC Center clears the "Other" list through the cascade, the Lead center (an "Other" Center) is not recomputed and stays pointing at a Center that is no longer a contributor.
- The "Unsaved changes" field badge appears as soon as a chip X or the panel is clicked, even when the user then cancels. The model is unchanged (verified). The badge is the field-card's touched indicator, so it is not a data side effect, but it reads as one.

## Pivot Record: TRC-T-6 (finding against TRC-T-3 / TRC-T-4)

- **Blocker:** design §11 **P-10** is false for the confirmed-removal path, and §8 Tests (TRC-T-4) did not assert the DOM. S-1.1 / S-1.4 / S-2.4 fail visually in a real browser after a panel Yes.
- **Alternatives:**
  - **(A, recommended)** `pr-multi-select` re-syncs the native box when an option's selection changes from the model side. When `value` drops an item whose row is rendered, write `cb.checked = option.selected` for the rendered rows (the same native write the veto already uses). The opt-in input is unchanged, and the ~80 other instances do not change (the write only matches the model they already show).
  - (B) The parent's confirm callback writes the native box itself. Rejected: it leaks `pr-multi-select` DOM into the page component.
  - (C) Drive NgModel (`viewToModelUpdate(true)` on veto). Rejected: it emits `ngModelChange`, which re-enters `onSelectOption`.
- **Revised direction (proposed, not yet applied):** amend design P-10 and §8 (`pr-multi-select.deselectGuard` row and Tests) and add **TRC-T-7**:
  - Fix per (A).
  - CT falsifier: guard `true` → Yes-equivalent model removal → DOM `input.checked === false`, in flat and group mode.
  - TRC-T-4 zoneless: assert DOM `input.checked`, not `option.selected`.
  - Then re-run TRC-T-6 step 13/14.
- No ADR affected (client-only, no TRD decision).
- **Status:** stopped for user approval (Pivot Protocol step 4). Nothing edited in requirements / design / tasks yet.

**Pivot approved (user, 2026-11-27):** "si la A es la recomendable y no se va a dañar nada sigamos con esta opcion". Option A applied as the narrowest variant: on veto, also reset the row's NgModel `viewModel` (runs only inside the veto branch, so instances without a guard are untouched). Spec amended: `design.md` §8 (`pr-multi-select.deselectGuard` row, CT Tests row, new zoneless Tests row), §10 TRC-DD-9, §11 P-10; `tasks.md` gains TRC-T-7, and TRC-T-6 depends on it. Two-direction sweep: the only surviving old-claim text is historical evidence in this log and TRC-T-3's disqualifier wording. The diff removes only the four amended rows.

### TRC-T-7 — Untick the box after a confirmed panel removal (Pivot rework)

| Field | Value |
|---|---|
| Final status | PASS |
| Date | 2026-11-27 |
| Attempts | 1 |
| Requirements covered | TRC-R-1 S-1.1 / S-1.4, TRC-R-2 S-2.4 (panel path, "removed exactly as an ordinary removal") |
| Skills / effort | `angular-developer`, `tdd` · effort high (shared component, Angular forms internals, rework of PASSed tasks) · Implementer T2 wrapper, Reviewer T3 wrapper |

**Attempt 1**

- Files changed (`onecgiar-pr-client/src/app/`):
  - `custom-fields/pr-multi-select/pr-multi-select.component.ts`: `onSelectOption(option, cb?, ngModel?)`, with `ngModel.viewModel = true` only in the veto branch.
  - `custom-fields/pr-multi-select/pr-multi-select.component.html`: `#m="ngModel"` on the two checkbox paths.
  - `custom-fields/pr-multi-select/pr-multi-select.cy.ts`: the new case "hook returns true, then the host removes the item (confirmed): the box unticks", in flat and group mode.
  - `custom-fields/pr-multi-select/CLAUDE.md`: the `viewModel` note, and "9 rojos" corrected to 12 with the sections listed.
  - `pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.zoneless.spec.ts`: the Yes cases click the real row input and assert `input.checked`. The `clientHeight` stub and `checkViewportSize()` make the virtual-scroll rows render in jsdom.
  - `pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`: TRC-T-7 note.
- Red (c), on code without the fix:

  ```
  TRC-S-1.4: unticking the last ToC Science Program ...
    Expected: false
    Received: true
    > 1401 | expect(rowInput(panel, 'SP07').checked).toBe(false);
  ```

  The same failure occurred for TRC-S-2.4 (Center) at `:1474`.
- Red (a)/(b), with only the `viewModel` line commented out: `AssertionError: Timed out retrying after 10000ms: expected '<input.pr-native-check.ng-untouched.ng-valid.ng-dirty>' not to be 'checked'` (`pr-multi-select.cy.ts:384`), 23 passing / 2 failing. Earlier attempts that failed during setup were discarded and are not counted as evidence.
- Green:
  - `pr-multi-select.cy.ts` 25 passing / 0 failing.
  - `pr-multi-select.selection.cy.ts` 7 passing.
  - `pr-multi-select.contract.cy.ts` 32 passing / 12 failing, exactly the known baseline.
  - Jest `rd-contributors-and-partners pr-multi-select repro-p2-3308`: 18 suites / 407 tests.
  - Lint clean; `npm run build` exit 0.
  - Each Cypress run used a single `--spec`, and no `ng serve` was started, because memory was low.
- Disqualifier: the existing CT case "a later real untick still removes it" is green in flat and group mode.
- `NgModel.viewModel` was checked in `node_modules/@angular/forms`: it is public, read only in `ngOnChanges` (`isPropertyUpdated`) and written in `viewToModelUpdate`.
- Evidence re-run (Leader inline, no worker active): Jest `18 passed / 407 passed` → **VERIFIED**. The Leader did not re-run CT or the build.
- Reviewer: **PASS**. Findings:
  - The change is a single line inside the veto branch, and the label paths are untouched (R2-2).
  - `viewToModelUpdate` is not used.
  - Tracing the mutation shows that removing the line flips the result: flat mode rebuilds `selected` from `_valueSig`, group mode syncs it in `writeValue`.
  - The CT host removal (`model = []` + `ng.applyChanges`) is a faithful stand-in, because it reaches `writeValue` exactly as the parent's removal does. The zoneless test also covers the real parent path, and it was red on HEAD.
  - The `clientHeight` stub only decides how many rows render; it cannot make the checked assertion pass.
  - Named conformance checks (the execute-time spec edits of 2026-11-27): §8 `deselectGuard` row, both amended Tests rows, §10 TRC-DD-9 and §11 P-10 all conform.
- Runtime events: none.

`spawns: implementer 55 calls, 149295 tokens, ended complete; reviewer not reported by host`

**Assumptions (Implementer):** the repo already had `stash@{0}` ("pre-pull WIP", 2026-11-23); the Implementer stashed nothing.

**Working tree note (Leader):** while TRC-T-7 ran, these appeared in the tree:

- `onecgiar-pr-server/src/api/replicated-innovation-reminders/templates/rir-template-copy{,.spec}.ts`
- `onecgiar-pr-server/src/migrations/1793800000000-RIR-CopyV5CenterClosingDate.ts`

No task in this spec accounts for them, and they are outside the TRC-T-7 diff. They are attributed to another session in this checkout, left untouched, and not staged.

**ADVISORY (4R, non-gating):**

- Reliability: the CT uses a fixed `cy.wait(50).then(repaint)`; putting `repaint()` inside a retried `.should()` would remove the timing assumption.
- Reliability: the zoneless `afterEach` restores `clientHeight` before its 80 ms settle wait.
- Readability: `cb` and `ngModel` always travel together; pass them as one argument or document the pairing.
- Risk: the fix relies on `NgModel.viewModel`, which is public but behaves like internal Angular. Re-run the "host removes the item" CT case on every Angular upgrade (the folder `CLAUDE.md` flags this).

### Running totals after TRC-T-7

Tasks 6 / 7 (T-6 pending its re-run of steps 13/14) · review rounds 7, against the 6 budgeted in design §12. The extra round is the Pivot rework, which the user approved (Pivot Protocol). LOC no longer tracked (user decision).
