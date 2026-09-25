# Execution — Off-screen ToC gaps reach the section bottom bar

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3542-section-bar-toc-tabs` |
| Ticket | **P2-3542** under epic **P2-3512** — *TOC User Feedback* |
| Approval Mode | `gated` — the continue/pause gate stops for the user after every task |
| Branch | `bugfix/p2-3542-section-bar-toc-tabs` — cut from `performance-refactor` @ `9354317d4` after `SBT-T-1` closed (user decision, 2026-09-25). `performance-refactor` was reset back to `9354317d4` and is untouched; nothing has been pushed. PR back to `performance-refactor` when `SBT-T-3` closes |
| Branch base | `9354317d4` |
| Budget (`design.md` §12) | 3 tasks · ~150 LOC (≈55 production, ≈95 test) · 1 review round. **Tripwire raised at the `SBT-T-1` gate and resolved by the user (2026-09-25): the estimate undercounted the regression suite; continue and record actual LOC without stopping again on budget.** The gated continue/pause gate still applies per task |
| Leader model | Opus 5 (T1 — registry pins `opus`, no downgrade needed) |
| Implementer model | Sonnet (T2, via `.claude/agents/akili-implementer.md`) |
| Reviewer model | Opus (T3, via `.claude/agents/akili-reviewer.md`) — differs from the Implementer, `author ≠ auditor` holds |
| Started | 2026-09-25 |

---

## 2. Task Execution History

### `SBT-T-1` — Fold a section's off-screen gaps into the mandatory-field scan

| Field | Value |
|---|---|
| **Final status** | **PASS** |
| Date | 2026-09-25 |
| Implementer attempts | 1 |
| Reviewer verdict | `PASS` (attempt 1) |
| Effort assigned | `high` (T2 default is `medium`; raised because the task widens the semantics of a signal seven production readers and one un-CI'd E2E suite depend on) |
| Skills assigned | `angular-developer`, `tdd` — the task's own list, kept unchanged (the fold is logic-heavy with real edge cases, so red→green earns its cost) |

#### Attempt 1

- **runtime events:** none
- **Files changed:**
  - `onecgiar-pr-client/src/app/shared/services/data-control.service.ts` (+51 / −1)
  - `onecgiar-pr-client/src/app/shared/services/data-control.service.spec.ts` (+77)
- **What was built:** `registerOffscreenFeedback` / `unregisterOffscreenFeedback` over a private `Set<() => string[]>`; a private `offscreenFeedback()` that runs each source in its own `try`/`catch`; the fold placed after the DOM pass and outside its `try`/`catch`, appending to `feedback` and adding `offscreen.length` to `mandatoryTotal`; the return value widened with `|| offscreen.length > 0`.
- **Falsifier — executed against the post-change code, observed RED:**
  - Fixture: one complete `.pr-field.mandatory` **plus one registered source** returning `['Outcome N~2: Level']` (the registered source is what makes the mutation non-inert).
  - Mutation: `feedback.push(...offscreen);` replaced with a no-op comment.
  - Red output (verbatim, decisive lines):

    ```
    ● ... folds a registered off-screen source into fieldFeedbackList and reports incomplete ...
        expect(received).toEqual(expected)
        - Array ["Outcome N~2: Level"]
        + Array []
          > 536 | expect(service.fieldFeedbackList()).toEqual(['Outcome N~2: Level']);
    Tests: 1 failed, 39 skipped, 3 passed, 43 total
    ```

  - The red is the behavioral assertion, not a setup `TypeError`: both registry methods existed throughout the mutation. Line restored → green, 43/43.
- **Implementer verification:** `npx jest --no-coverage --testPathPattern="data-control.service"` → 2 suites / 43 tests pass · consumer suites `(section-bottom-bar|rd-contributors-and-partners|cap-dev-info)` → 12 suites / 390 tests pass · `npx tsc --noEmit` → 0 errors in the changed files · `npx ng lint --quiet` → "All files pass linting."
- **Evidence re-run (non-author):** **VERIFIED** — mode: Leader-inline (each command is a single puntual verification, under the *Delegation Thresholds* inline bar). All four commands re-executed on the quiet tree and reproduced: 43/43, 390/390, lint clean, `0` `tsc` errors in the two changed files.
  - One number differed and was run to ground rather than waved through: the Implementer reported "1454 pre-existing `tsc` errors", the re-run counted 1342. `npx tsc --noEmit | wc -l` = 1454 and `grep -c "error TS"` = 1342 — the same tree state counted two ways (total output lines vs. error-header lines). **Not a MISMATCH:** the gate the task asserts is *zero errors in the changed files*, and both runs agree at `0`.
- **Reviewer verdict:** `PASS`.
  > The registry, the fold and the return-value widening satisfy all three §8.1 guarantees, `SBT-R-1`/`SBT-R-4` (service half), `SBT-AC-10` and `SBT-AC-11`; the falsifier fixture genuinely carries a registered source, so the named mutation is falsifying and the committed red run is credible.

  All nine named conformance checks passed: writable signal (no `computed` anywhere), fold placement in both directions, denominator paired with numerator, unregister by reference, off-screen-only → incomplete, one `Set` iteration per scan with no new timer or signal write, no secret logged, a non-inert falsifier, and behavioral (not tautological) tests. The Reviewer independently re-read `multiple-wps.component.html:5` and confirmed both Leader claims.

#### `ADVISORY` findings (4R lenses — recorded, never gating, never minted into a task)

1. **Reliability** — `requirements.md` §7 *Observability* opens "No logging added", and `offscreenFeedback()` adds a `console.error`. Reviewer read the operative MUST as the second sentence and did not gate. **Leader adjudication: not a violation.** The row's binding clause is *a source that throws must not take the scan down with it*; the added line is error handling inside a `catch`, matching the identical `console.error` three lines above it in the same method, not new observability instrumentation. No rework.
2. **Resilience** — that `console.error` fires on every scan tick (150 ms throttled rAF), so one permanently-throwing publisher would flood the console at ~6/s. A one-shot guard would keep the diagnostic without the flood. Recorded; out of this spec's approved scope.
3. **Readability** — `tasks.md`'s `SBT-T-1` *Red run* bullet claims all four new cases fail on `9354317d4` "on their behavioral assertion". Three of them cannot: two would `TypeError` on the missing API and the `.set` gate passes today by construction. **The gate the Definition of done actually rests on — the named mutation falsifier — was executed and is accurate.** Recorded rather than edited: the task is closed, the governing gate held, and rewriting a completed task's verification prose after the fact degrades the audit trail more than the inaccuracy costs. `SBT-T-2`'s own *Red run* bullet does not carry the same error — it already anticipates the `ApiService` mock `TypeError` — so nothing needs to be carried forward.
4. **Reliability** — direction A of §8.1 guarantee 2 (a DOM error must not swallow off-screen labels) rests on code placement with no test; direction B is tested. Cheap to add if `SBT-T-2` reopens this suite.

#### Requirements covered

`SBT-R-1` (service half) · `SBT-R-4` (service half — unregister) · `SBT-AC-10` · `SBT-AC-11`; NFRs *Correctness*, *Backwards compatibility*, *Observability*, *Performance*.

#### Decisions made

- **Effort raised to `high`** from the T2 `medium` default — the task widens a shared signal's semantics across seven production readers and an un-CI'd Cypress suite.
- **Skills kept as the task listed them** (`angular-developer`, `tdd`) — no deviation.
- **Leader pre-check, inline, one file:** `.section_container` is declared at `multiple-wps.component.html:5`, **outside** the `@if (!hidden)` guard, and `showMultipleWPsContent` appears only as an input binding at `:47`. So the early return at the top of `someMandatoryFieldIncompleteResultDetail` (which clears `fieldFeedbackList`) **cannot** fire during the `SBT-AC-4` remount window. This retires the Implementer's open assumption about that branch and removes a false lead before it reached the Reviewer, which independently confirmed it.
- **No execute-time spec edit was made.** `requirements.md` and `design.md` are unchanged by this task.
- **Disqualifier never arose:** `fieldFeedbackList` remains a writable `signal`, so the *stop and re-specify* branch of the task was not entered.

#### Issues encountered

None. First-attempt PASS, no runtime events, no rework.

#### Final verification result

`npx jest --no-coverage --testPathPattern="data-control.service"` → **2 suites / 43 tests pass** · consumer suites → **12 suites / 390 tests pass** · `npx tsc --noEmit` → **0 errors in the changed files** · `npx ng lint --quiet` → **All files pass linting.**

#### Budget note (not yet a tripwire)

`SBT-T-1` consumed **128 LOC** of the spec's ~150 (51 production of ≈55, 77 test of ≈95) and **1 review round of 1**. The budget is not exceeded, so execution continues — but `SBT-T-2` is an `M` task carrying the mandatory regression suite and will almost certainly cross both lines. Raised with the user at this task's continue gate rather than after the fact, while a re-size is still cheap.

---

### `SBT-T-2` — Publish the gaps of the ToC tabs that are not rendered (regression test)

| Field | Value |
|---|---|
| **Final status** | **PASS** |
| Date | 2026-09-25 |
| Implementer attempts | 1 |
| Reviewer verdict | `PASS` (attempt 1) |
| Effort assigned | `high` — the task carries real lifecycle and fixture difficulty, but `SBT-DD-2` had already resolved the hard ambiguity (all six mount-site bindings enumerated and verified at specify time), so `xhigh` would have been paying for a decision already made |
| Skills assigned | `angular-developer`, `tdd`, `systematic-debugging` — the task's own list, kept unchanged. `systematic-debugging` was retained rather than dropped because the task's Disqualifier (a `completnessStatusValidation` that disagrees with the tab check icon) is a diagnosis call, not an implementation one |

#### Attempt 1

- **runtime events:** none
- **Files changed:**
  - `…/rd-contributors-and-partners/components/multiple-wps/multiple-wps.component.ts` (+80 / −1)
  - `…/rd-contributors-and-partners/components/multiple-wps/cpmultiple-wps.component.spec.ts` (+174 / −1)
- **What was built:** `CPMultipleWPsComponent` now implements `OnInit`/`OnDestroy`. One bound arrow property (`offscreenFeedbackSource`) is registered in `ngOnInit` and removed in `ngOnDestroy` — the same reference both times, which is what makes the `Set`-keyed registry pair correctly. `collectOffscreenTabGaps()` applies `SBT-DD-2`'s gate, skips the rendered tab unless `showMultipleWPsContent` is `false`, delegates per-tab truth to `completnessStatusValidation` unchanged, and emits one label per incomplete tab. `firstIncompleteTabField()` names the first missing field in form order.
- **Falsifier — both named mutations executed against the post-change code, both observed RED:**
  - (a) registration dropped from `ngOnInit` → `SBT-AC-1` red:

    ```
    expect(jest.fn()).toHaveBeenCalledTimes(expected)
    Expected number of calls: 1
    Received number of calls: 0
    > 260 | expect(registerOffscreenFeedback).toHaveBeenCalledTimes(1);
    ```

  - (b) `index !== activeTabIndex` skip removed → `SBT-AC-2` red on the double-count:

    ```
    - Array []
    + Array [
    +   "Outcome N~2: Contribution to indicator target",
    + ]
    > 270 | expect(registeredSource!()).toEqual([]);
    ```

  - Both restored → 47/47 green. The fixture holds two tabs of **differing** completeness (tab 1 `contributing_indicator: 5`, tab 2 `null`), which is what keeps both mutations non-inert; the Reviewer independently confirmed this.
- **Evidence re-run (non-author):** **VERIFIED** — mode: Leader-inline. `npx jest --no-coverage --testPathPattern="cpmultiple-wps"` → 2 suites / 47 tests pass · `(cpmultiple-wps|data-control.service|rd-contributors-and-partners)` → 12 suites / 337 tests pass · `npx tsc --noEmit` → zero hits for `multiple-wps` · `npx ng lint --quiet` → "All files pass linting." All four reproduce the Implementer's report exactly.
- **Reviewer verdict:** `PASS`, all ten named checks.
  > The publisher matches `SBT-DD-2`/`DD-3`/`DD-4` exactly — I re-read all six mount-site bindings at the source and the gate silences precisely the five non-submitter instances while both editable instances speak, so `SBT-R-6` holds and `isIpsr` is correctly absent.

  The check that mattered most — check 2, whether the new `firstIncompleteTabField` constitutes a second completeness rule in violation of `SBT-DD-3` — was resolved more sharply than the Leader's own trace: **the mirror cannot drop a gap, because its `null` return is only reachable when `completnessStatusValidation` has already returned `true`, which makes `if (!missingField) return;` unreachable for an incomplete tab.** The Reviewer also confirmed the rendered tab really is covered by the DOM scan (`multiple-wps-content.component.html:152-157` emits `appFeedbackValidation labelText="Contribution to indicator target"`), so the skip creates no blind spot.

#### `ADVISORY` findings (4R lenses — recorded, never gating, never minted into a task)

1. **Reliability** — the `undefined`-vs-`null` asymmetry between `completnessStatusValidation` (`!== null` only, so an absent key reads as *present*) and `firstIncompleteTabField` (treats `undefined` as *missing*) is a **mislabel** risk, not a dropped-gap risk: a row arriving with no `toc_level_id` key at all, whose real gap is the 2026 contribution, would read `Outcome N~2: Level`. Unreachable through today's payloads — `onAddTab` writes `toc_level_id: null` explicitly and the GET returns the column. `tab?.toc_level_id == null` in both functions would remove the divergence if either is ever touched.
2. **Reliability (tests)** — `SBT-AC-7` and `SBT-AC-8` are pure-negative (`toEqual([])`) and would also pass against a rig that never publishes at all. `SBT-AC-1` in the same `describe` is the positive control keeping them honest; flipping the flag back off and re-asserting the gap inside those two cases would make them self-contained.
3. **Risk** — `ngOnInit` registers unconditionally, **before** the gate, so a future spec declaring the real `CPMultipleWPsComponent` against an `ApiService` stub lacking the two registry methods would `TypeError` in setup. None exists today (`result-review-drawer.*.spec.ts` overrides the template to `''`; `share-request-modal.zoneless.spec.ts` uses `NO_ERRORS_SCHEMA`). **Carried to `SBT-T-3` as `[advisory-grade]` content for the folder-guide re-stamp** — that guide is already `SBT-T-3`'s named deliverable, so this adds no scope; it is not a new task and must not become one.

#### Requirements covered

`SBT-R-1`, `SBT-R-2`, `SBT-R-3`, `SBT-R-4`, `SBT-R-5`, `SBT-R-6`, `SBT-R-7`, `SBT-R-20`; `SBT-AC-1`..`SBT-AC-9`.

#### Decisions made

- **Premise Ledger citations re-confirmed, no edit made.** The Reviewer cited `share-request-modal.component.html:69`, `notification-item.component.html:363`, `result-review-drawer.component.html:275,548` where `design.md` `P-5`/`DD-2` cite `:64`, `:353`, `:265,539`. Checked at source: **both are correct and neither is stale** — `design.md` cites the `<app-cp-multiple-wps` element start lines, the Reviewer cited the `[hidden]` / `[isNotifications]` binding lines *inside* those same elements. The ledger was left untouched. (Recorded because an apparent citation conflict in a `High`-impact premise row is exactly what a later `/akili-audit` would re-open; it is now answered.)
- **No execute-time spec edit was made** by this task. `requirements.md` and `design.md` are unchanged.
- **Disqualifier never fired:** `completnessStatusValidation(tab)` was used unchanged as the sole per-tab truth; the new helper mirrors its branches to *name* the field and never overrides them.
- `firstIncompleteTabField` is new code not named in the task's *Files (expected)* list, but it lives inside an expected file and is required by `SBT-R-2` ("name both the tab and the field"). No new file was created. Not treated as scope creep.

#### Issues encountered

None. First-attempt PASS, no runtime events, no rework.

#### Final verification result

`npx jest --no-coverage --testPathPattern="cpmultiple-wps"` → **47/47** · combined `(cpmultiple-wps|data-control.service|rd-contributors-and-partners)` → **12 suites / 337 tests** · `npx tsc --noEmit` → **0 errors in the changed files** · `npx ng lint --quiet` → **All files pass linting.**

#### Budget actuals (recorded, not escalated — user decision at the `SBT-T-1` gate)

`SBT-T-2` added **254 LOC** (80 production, 174 test). Spec running total: **382 LOC of a ~150 budget (255%)**, across 2 of 3 tasks, with **2 review rounds of a budgeted 1** (one per task, no rework in either). The budget under-counted the regression suite, which is the ticket's actual deliverable in Bug Mode. Per the user's decision this is logged rather than escalated; `design.md` §12 is left as the historical estimate rather than rewritten after the fact.
