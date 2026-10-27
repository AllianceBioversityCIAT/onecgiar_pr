# Execution Log — Bilateral AI Draft Results: Spotlight the Run's Drafts

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-draft-spotlight/` |
| **Ticket** | P2-4029 |
| **Approval Mode** | gated |
| **Baseline** | `edcf190f0` |
| **Branch** | `qa-development-2026-mc-2` |
| **Leader model** | opus (T1) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (opus, T3) |
| **Budget** | 3 tasks · ≈ 530 LOC · 4 review rounds (tripwire: > 4 tasks, > 600 LOC, > 6 rounds) |
| **Persona drift** | `akili doctor --agents` 2026-10-27: no blocking drift |

---

## Task Execution History

### ADS-T-1 — Service: spotlight request, expiry, and the "navigate only if the URL changes" rule at both entry points

- **Final status:** PASS
- **Date:** 2026-10-27
- **Implementer attempts:** 1 (+1 continuation)
- **Skills / effort:** `angular-developer`, `tdd` (as listed in the task) · medium

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processes-drawer/ai-processes-drawer-host.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processes-drawer/ai-processes-drawer-host.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processes-drawer/CLAUDE.md` (continuation)
- **Implementer verification:**
  - `npx jest src/app/pages/bilateral --silent --reporters=summary --no-coverage` → 65 suites and 2620 tests passed.
  - `npx tsc -p tsconfig.app.json --noEmit` → exit 0.
  - `npx ng lint --quiet` → "All files pass linting."
- **First reds** (quoted from the Implementer's report). These were run against the baseline plus no-op stubs of the three new members, so each fails on an assertion, not on a missing member:
  - Test 1 (service): `> 425 | expect(router.navigate).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'drafts'], { queryParams: { job: 'job-1' } });`
  - Test 2 (service): `Expected number of calls: 0 / Received number of calls: 1` at `expect(router.navigate).not.toHaveBeenCalled();`
  - Test 5 (service): `Expected: "a" / Received: undefined` at `expect(service.draftSpotlightRequest()?.jobId).toBe('a');`
  - Test 6 (service): `Expected: not 0` at `expect(newNonce).not.toBe(oldNonce);`
  - Test 8 (host): `Expected: {... "jobId": "j9" ...}` at `expect(serviceStub.requestDraftSpotlight).toHaveBeenCalledWith(job);`
  - Test 9 (host): the same assertion.
  - Extra host test (navigation resolves `false`): `Expected: 7` at `expect(serviceStub.consumeDraftSpotlight).toHaveBeenCalledWith(7);`
  - Tests 3, 4 and 7 had no first red:
    - Test 3: the baseline always navigates; covered by F3.
    - Test 4: the request is null under the no-op stub.
    - Test 7: negative assertion.
- **Falsifiers** (each applied once against the post-change code, observed red, then reverted):
  - F1, drop `queryParams` → test 1 red at `:425`.
  - F2, always navigate → test 2 red at `:439`.
  - F3, `startsWith` → test 3 red at `:449`. The first try used the wrong direction and stayed green; it was redone.
  - F4, clear by job id → test 6 red at `:486`.
  - F5, `label: number` → `bilateral-ai.service.ts(163,7): error TS2322: Type 'string' is not assignable to type 'number'.` The Jest spec stayed 66/66 green.
- **Evidence re-run** (Leader-inline, non-author): **VERIFIED**
  - Targeted command → 4 suites and 98 tests passed.
  - Bilateral suite → 65 suites and 2620 tests passed.
  - `tsc` → exit 0.
  - Lint → clean.
- **Reviewer verdict:** **PASS**. Both entry points follow the design:
  - The request uses a nonce-matched consume and a 10 s expiry, and clears the previous request's timer.
  - The label rule is identical to the toast summary (`:163` vs `:477`).
  - The URL is compared exactly. A same-URL click keeps the request; a different-URL `false` consumes it.
  - No write call is added.
  - Only stubs changed, no existing expectations, so no Pivot was needed.
  - The Reviewer traced F2 and F4 through the fixtures.
- **runtime events:** none
- **continuations:** 1. The drawer-folder `CLAUDE.md` update and re-stamp. It is owed by the binding convention `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs" ("same commit") and was flagged by the Reviewer. It is a doc-only change describing the reviewed code.
- **spawns:**
  - Implementer: 16 calls, 103 608 tokens, ended complete.
  - Reviewer: 10 calls, 88 912 tokens, ended complete.
  - Implementer (continuation, resumed): 2 calls, 108 028 tokens cumulative, ended complete.

#### ADVISORY (4R, from the Reviewer; non-gating)

- **Spec wording:** the AC-1d "Implements" bullet says "the drawer closes, then the request is created", but the Description says "request a spotlight first". The code follows the Description. Both steps are synchronous, so the order is not observable. Fix the wording in `tasks.md` at archive.
- **Reliability:** `navigate(...).then(...)` has no rejection handler. If navigation throws, the request lingers until the 10 s expiry. This matches the baseline's own navigate calls.
- **Test scope:** test 7 checks write calls on the `bilateralApi` stub only, not the `ResultsApiService` stub.
- **Readability:** the URL rule is duplicated in both entry points. The Implementer's reason: the host spec stubs the service, so a shared helper would not be reachable there.

#### Not Done / Assumptions (verbatim from the Implementer)

- `requestDraftSpotlight` returns the nonce as a `number`. The host needs it to consume on a `false` navigation, and the host-spec stub returns 7. The task did not specify a return value.
- The URL rule is written inline in both `openDraftsForJob` and `onViewDrafts` rather than as a shared service helper. The host spec stubs the service, so a shared helper would not be reachable there.
- I added a third host test (navigation resolves `false`, so the nonce is consumed) beyond tests 8 and 9. In the service, an empty `centerAcronym` returns before requesting a spotlight, as it did before.
- A stray unquoted `$CMD` expansion failed once in my shell, with no effect on the code.

(These are assumptions only. No item is owed and no blocker is named.)

#### Summary

- **Requirements covered:**
  - ADS-R-1: AC-1a (navigation half and the same-URL path), AC-1b, AC-1c, AC-1d.
  - ADS-R-4: AC-4b.
  - ADS-R-8: service side.
- **Decisions made:**
  - The nonce is returned to callers so the host can consume it.
  - The drawer-folder `CLAUDE.md` was updated under the §10 convention.
- **Issues encountered:** none blocking.
- **Final verification:** green (Leader re-run VERIFIED).
- **Running totals vs budget:** tasks 1 / 3 · LOC ≈ 240 (229 code + ~11 doc) / 530 (tripwire 600) · review rounds 1 / 4 (tripwire 6). Within budget.

---

### ADS-T-2 — `DraftSpotlightService` and Draft Results integration

- **Final status:** PASS. Two parallel lens Reviewers both passed.
- **Date:** 2026-10-27
- **Implementer attempts:** 1
- **Skills / effort:** `angular-developer`, `tdd`, `tailwind-design-system` (as listed in the task) · **high**. The default is medium; it was raised because the task touches a shared effect, has signal traps (P-18), integrates a third-party library and adds an XSS guard.
- **Review mode:** parallel lens reviewers, because the task touches security (XSS). Lens A covered spec conformance and readability. Lens B covered reliability, resilience and risk, including security.

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/draft-spotlight.service.ts` (new)
  - `onecgiar-pr-client/src/app/pages/bilateral/services/draft-spotlight.service.spec.ts` (new)
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-tour.service.ts` and `.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.ts`, `.html` and `.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/CLAUDE.md`. It went from 119 to 109 lines and its `Verified:` line was re-stamped.
  - `onecgiar-pr-client/src/app/internationalization/bilateral-ai-processes.copy.ts`
- **Implementer verification:**
  - `npx jest src/app/pages/bilateral --silent --reporters=summary --no-coverage`: 66 suites and 2657 tests passed.
  - `npx tsc -p tsconfig.app.json --noEmit`: exit 0.
  - `npx ng lint --quiet`: "All files pass linting."
- **First reds** (quoted from the Implementer's report). They were taken against naive stubs, so each red is an assertion failure. For tests 1, 2 and 6 the first try hit a TypeError and was redone.
  - Test 1: `expect(instances[0].config).toEqual(expect.objectContaining({ animate: false, popoverClass: 'pr-guide', allowClose: true }))` fails; the received config holds none of these keys.
  - Test 2: `expect(instances[0].destroy).toHaveBeenCalledTimes(1)`, expected 1 and received 0.
  - Test 6: `expect(title).toContain('&lt;img')` received `"1 new draft from <img src=x onerror=alert(1)>"`.
  - Test 7: `expect(spotlight.show).toHaveBeenCalledTimes(1)`, expected 1 and received 0. The `scrollTo` counts were already green.
  - Tests 8, 9, 10 and 11: each fails at its final `expect(spotlight.show)…`, expected 1 and received 0. Test 10 gained a positive-control step so that it has a red.
  - Test 21: `expect(driverMock).not.toHaveBeenCalled()`, expected 0 and received 1.
- **Falsifiers.** Each was applied once and then reverted, and the tree was diffed against the green backup afterwards.

  | Mutation | Red |
  |---|---|
  | `showButtons` moved to the `driver()` config | test 1: `Expected: ["next"]`, `Received: undefined` |
  | Dismiss through `onDestroyed` | test 2: `expect(onDismiss).toHaveBeenCalledTimes(1)`, received 0 |
  | Re-arm by re-setting `pendingHighlightJobId` | test 8: `show` expected 1, received 0 |
  | The request effect also scrolls | test 9: `scrollTo` expected 2, received 4. The first try was inert and was redone through `afterNextRender` |
  | Re-arm before the URL lands | test 10: `highlightedSessionId` expected `3ce3462d-…`, received `aaaaaaaa-…` |
  | Drop the subscription reset | test 11: `show` expected 0 calls, received 1 |
  | `===` center gate | test 15: `show` expected 1, received 0 |
  | Focus moved on a programmatic close | test 18: `expect(document.activeElement).not.toBe(card())` fails |
  | Raw label | test 6: `Expected substring: "&lt;img"` |
  | `close('cancel')` | `tsc` TS2345: `"cancel"` not assignable to `DraftSpotlightCloseReason` |

- **Evidence re-run** (Leader-inline, non-author): **VERIFIED**.
  - Bilateral suite: 66 suites and 2657 tests passed.
  - `tsc`: exit 0.
  - Lint: clean.
  - The only lines removed from the existing component spec are 2 import lines, each replaced by a superset. No existing `?job=` or ADN expectation was edited.
- **Reviewer verdicts:**
  - **Lens A, PASS.**
    - The gate order and the "read every signal first" rule match §2.2.
    - Attach vs re-arm matches FC-1, FC-3 and FC-4.
    - The second-pass guard is at `component.ts:304`.
    - The center reset satisfies FX-2: a center switch passes through `null`, and that X→null step runs the reset.
    - The copy matches §6.3 exactly.
    - The test fixtures honour their disqualifiers: test 8 asserts `draftList` is the same reference, and every scroll count follows `settle()`.
    - The `CLAUDE.md` traps are listed.
  - **Lens B, PASS.**
    - The driver.js 1.8.0 premises P-9 and P-17 were re-verified in `dist/driver.js.mjs`.
    - XSS: the whole title and the button text are escaped, and the description is static copy.
    - `close()` nulls its state before `destroy()`, so it cannot re-enter, and `onDismiss` fires at most once.
    - One-shot: the request is consumed before `show`, and no path shows twice.
    - The tour guard cannot get stuck, because `isActive()` reads `isInitialized` and `resetState()` clears it.
    - No timer or listener leaks, no effect loops, and no write calls or logging.
  - **Leader follow-up on lens A's question** about a null `centerAcronym`: `BilateralContextService.centerAcronym = signal('')` is a `string`, never null, so `.toLowerCase()` is safe.
- **runtime events:** none
- **spawns:**
  - Implementer: 38 calls, 260 670 tokens, ended complete.
  - Reviewer lens A: 6 calls, 136 682 tokens, ended complete.
  - Reviewer lens B: 15 calls, 120 665 tokens, ended complete.

#### ADVISORY (4R, from both lenses; non-gating)

- **A, readability:** `layerOpen` uses `||` short-circuiting, so when `selectedDraft` is set the other layer signals are not read in that run. Behavior is correct, because Angular tracks dependencies per run. But it reads against the "read every signal first" comment.
- **A, readability, deliberate test deviation:** test 11 reuses a request held by an open layer instead of a *new* request. With a new nonce the re-arm path resets settled anyway, so the literal fixture would leave the falsifier inert. **Do not "fix" it back.**
- **A, readability:** test 18's "programmatic close does not move focus" half is weak because the stubbed `close` is a no-op. Service test 3 is the real proof.
- **A, readability:** the `CLAUDE.md` condensation dropped three small facts: the ring colour token `ring-[var(--pr-color-primary-300)]`, that `PrmsRouteReuseStrategy` special-cases only `result-detail/:id`, and that `queryParamMap` re-emits on both reuse and first load.
- **A, readability:** the `escapeHtml` comment says "label and count" while the code escapes the whole composed title. The two are equivalent.
- **B, risk:** §7's "no `img` element exists" is proven by the escaped string only. It is not proven by a jsdom `querySelector('img')` check.
- **B, reliability:** if `driver()` or `highlight()` throws after the request is consumed, nothing shows and `driver-active` may stay on `body`. A try/catch that calls `close('programmatic')` is suggested.
- **B, resilience:** R-6 is enforced only at show time. A programmatic `drawerOpen` set while the spotlight is active would not close it. **Carry this into the ADS-T-3 HITL observation.**
- **B, resilience:** one Esc press may also reach a page-level Esc handler. **Watch for this in the H-4 keyboard pass of ADS-T-3.**
- **B, readability:** `escapeHtml` is exported from the service file. It could move to `shared/` if it gets reused.

#### Not Done / Assumptions (verbatim from the Implementer)

1. **Escaping happens inside the service.** `show()` takes plain-text `title` and `buttonText` and escapes them. `description` is static trusted markup from the copy file (the `<strong>`) and is passed through. This keeps the `show` signature you gave while satisfying DD-7 and test 6. Dynamic values only ever enter the title.
2. **Tour detection.** The page checks `BilateralTourService.getDriverInstance()` and treats it as active when `isActive?.() ?? true`.
3. **Center-change reset and close.** These run in the existing ADN effect, only for transitions away from a non-null `centerInstitutionId` (same `previous != null` rule), so a cold `null`→X mount never resets mid-run.
4. **Card lookup.** `show` is skipped, without consuming the request, if the card is not in the DOM yet. The effect re-runs on the next change, or the 10 s timer drops the request.
5. **`CLAUDE.md` condensation.** I condensed the payload table into prose and shortened the scroll traps. The old "ring clears after 4 s" wording was already stale, since the code keeps the ring while `?job=` is in the URL, so I replaced it with the actual behavior.
6. **HITL.** The real driver.js rendering is not covered here, as the task states (ADS-T-3).

These are assumptions only. No item is owed and no blocker is named. Lens A checked assumptions 3 and 5, and lens B checked 1, 2 and 4.

#### Copy consumers

`grep -rln BILATERAL_AI_PROCESSES_COPY onecgiar-pr-client/src` returns:
- `internationalization/bilateral-ai-processes.copy.ts`
- `ai-processes-trigger.component.ts`
- `ai-job-card.component.ts`
- `ai-processes-drawer.component.ts`
- `bilateral-ai-upload.component.ts`
- `my-draft-results.component.ts`
- `my-draft-results.component.spec.ts`
- `my-draft-results/CLAUDE.md`

The change is additive under `drafts`.

#### Summary

- **Requirements covered** (unit parts):
  - ADS-R-1: AC-1a, AC-1b, AC-1c, AC-1d
  - ADS-R-2: AC-2a, AC-2b, AC-2c
  - ADS-R-3: AC-3a, AC-3b
  - ADS-R-4: AC-4a, AC-4b
  - ADS-R-5: AC-5a, AC-5b
  - ADS-R-6: AC-6a, AC-6b
  - ADS-R-7: AC-7b
  - ADS-R-8
  - NFR-2, NFR-3, NFR-4, NFR-5
- **Decisions made:**
  - Effort was raised to high (see above).
  - Parallel lens review was used.
  - **The budget tripwire tripped at this task's finalize.** The task diff is +963 / −56 lines. The spec is now at about 1 200 lines against the 600 tripwire; most of the overrun is tests (about 650 test lines vs about 200 planned) and production code is about 270 lines vs about 175 planned. **The user accepted the overrun on 2026-10-27 ("accept the overrun and continue").** This is logged as a user decision, not `auto-approved`.
- **Issues encountered:**
  - The first scroll falsifier was inert and was redone.
  - The first reds for tests 1, 2 and 6 were TypeErrors and were redone as assertion reds.
- **Final verification:** green (Leader re-run VERIFIED).
- **Running totals vs budget:**
  - Tasks: 2 of 3.
  - LOC: about 1 200 (240 + 963), against a budget of 530 and a tripwire of 600. **Exceeded and accepted by the user.**
  - Review rounds: 2 verdict rounds (3 Reviewer verdicts) of 4, with a tripwire of 6.

## Constitution Impact: ADS-T-2

- **Module reshaped:** `pages/bilateral/services` gains a new root service, `DraftSpotlightService`, a driver.js wrapper. Its public surface is `show`, `close`, `refresh`, `isActive` and `active`. `BilateralTourService.startBilateralTour` gains a guard.
- **Child guides:** `my-draft-results/CLAUDE.md` is updated in this commit. `pages/bilateral/services/` has no folder guide, and none is needed for one thin wrapper.
- **Parent `## Module Guides`:** no change.
- **CodeGraph:** re-index pending (`codegraph sync` at archive).
