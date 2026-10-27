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
