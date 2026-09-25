# Execution — Off-screen ToC gaps reach the section bottom bar

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3542-section-bar-toc-tabs` |
| Ticket | **P2-3542** under epic **P2-3512** — *TOC User Feedback* |
| Approval Mode | `gated` — the continue/pause gate stops for the user after every task |
| Branch | `performance-refactor` |
| Branch base | `9354317d4` |
| Budget (`design.md` §12) | 3 tasks · ~150 LOC (≈55 production, ≈95 test) · 1 review round |
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
