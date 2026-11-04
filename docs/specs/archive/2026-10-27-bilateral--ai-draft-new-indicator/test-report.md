# Test Report — Bilateral AI Draft Results: "New" Indicator

**Overall status: PASS.** All 5 requirements and 8 acceptance criteria have test evidence. No product bug was found and there are 0 failures. Layout and contrast (`ADN-D6` / `ADN-D7`) are covered by the approved HITL check. Server scoping of other users' jobs (`ADN-AC-2`) is an accepted assumption.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/ai-draft-new-indicator/` |
| Branch | `qa-development-2026-mc-2` (uncommitted working tree) |
| Date | 2026-10-27 |
| Leader | Claude Code, `opus` (T1) |
| Tester | `akili-tester` wrapper, model override to `opus`. The wrapper default `sonnet` is also the Implementer model, so the override keeps author ≠ tester |
| Implementer model(s) | `sonnet`; `execution.md` records no escalations |
| Suites | 1 (frontend unit, Jest) |

## 2. Summary

| Metric | Value |
|---|---|
| Bilateral Jest run | **65 suites / 2610 tests passed** (was 2602, +8 new) |
| Targeted run (service + component) | 3 suites / 175 tests passed |
| `ng lint --quiet` | `All files pass linting.` |
| New tests | 8 (4 service, 4 component), all green |
| Author TDD tests cited (not rewritten) | Service 1–11 · component 1–8 + 1b |
| Product bugs | 0 |
| Flakes | 0 |

- **Delegation:** 1 suite, 1 Tester spawned (single, not parallel), 0 suites run inline. The Leader re-ran the bilateral suite independently: `Test Suites: 65 passed, 65 total` / `Tests: 2610 passed, 2610 total`.
- **Skills / effort:** `angular-developer` and `tdd` at medium effort. There was no deviation from the Skill Map.
- **Tester inner loop:** 1 retry, for a test defect. The first A→B→A test changed the center and the list in the same change-detection flush, which cannot happen in the app because B's drafts arrive through an async GET. The fix split it into two flushes.
- **Mutation probes, run by the Tester and reverted, with the source verified unchanged:**
  - A `PATCH_` call injected into `consumeFreshDraftJobs` turned only the new ADN-R-5 service test red. Author test 11 stayed green, because it filters only `POST_`/`DELETE_`. This closes that advisory from `execution.md`.
  - Removing the consume-on-center-switch turned author tests 6 and 6b red, plus the new A→B→A test.

## 3. Backend Unit Tests

The scope is client-only, with no server change (`requirements.md` §6, Backwards compatibility).

## 4. Frontend Unit Tests

Commands were run from `onecgiar-pr-client/`:

| Command | Result |
|---|---|
| `npx jest src/app/pages/bilateral/services/bilateral-ai.service.spec.ts src/app/pages/bilateral/pages/my-draft-results --silent --reporters=summary --no-coverage` | `Test Suites: 3 passed, 3 total` · `Tests: 175 passed, 175 total` |
| `npx jest src/app/pages/bilateral --silent --reporters=summary --no-coverage` | `Test Suites: 65 passed, 65 total` · `Tests: 2610 passed, 2610 total` |
| `npx ng lint --quiet` | `All files pass linting.` |

The new tests were appended in their own `describe` blocks. No existing test was modified.

**`bilateral-ai.service.spec.ts`**, block `ADN-test — fresh draft jobs, tester gaps (ADN-R-1, ADN-R-3, ADN-R-5)`:
- `ADN-R-1 two own jobs completing in DIFFERENT polls: both ids are fresh, one drafts reload per poll`
- `ADN-R-3 job finished but Draft Results not visited: the id stays fresh across later polls, with no repeat reload`
- `P-11 completion with a null center: the id is still fresh, no drafts request is sent, and the next center resolve loads the drafts`
- `ADN-R-5 show + consume touch no write method of any verb (POST_/PATCH_/PUT_/DELETE_), and drafts and statuses stay unchanged`. A Proxy records every verb-prefixed member the service reads.

**`my-draft-results.component.spec.ts`**, block `ADN-test — "New" badge lifecycle, tester gaps (ADN-R-3, ADN-R-5)`:
- `ADN-R-3 leave and come back: after destroy, a re-mounted Draft Results shows no badge for the same drafts`
- `ADN-R-3 switch center A -> B -> A: A's group is no longer marked; B's fresh group, never shown on A, is still marked on B`
- `ADN-R-3 job finished while the user is on other pages: stays fresh with no consume, and the mark shows on the first visit`
- `ADN-R-5 show, center-switch clear and leave clear issue no POST/PATCH/PUT/DELETE, and drafts, statuses, is_discarded and order are unchanged`

## 5. Integration Tests

No integration tests: there is no new endpoint and no contract change. The defect gates in `requirements.md` §8 are all Jest or HITL.

## 6. E2E Tests

No E2E tests are automated. The visual and layout gate (`ADN-D6` / `ADN-D7`) was closed by the HITL Cypress CT probe recorded in `execution.md` (375 / 900 / 1000 / 1280 px), approved by the user on 2026-10-27.

## 7. Coverage & Traceability

S = `bilateral-ai.service.spec.ts`, C = `my-draft-results.component.spec.ts`. Every row passed.

| Requirement | Scenario / clause | Test type | Test | Result | Gap or notes |
|---|---|---|---|---|---|
| ADN-R-1 / AC-1 | Run finishes while elsewhere → only that group marked | Unit | S author 1 · C author 1 | PASS | — |
| ADN-R-1 / AC-3 (BUT) | Already terminal at first poll → not marked | Unit | S author 4 | PASS | — |
| ADN-R-1 (P-13) | Reload while running → marked | Unit | S author 5 | PASS | — |
| ADN-R-1 / AC-2 (AND IT MUST) | Another user's job not marked | Unit + assumption | C author 1 (teammate group unmarked) | PASS | Depends on the jobs API returning only the caller's jobs (§9 C-2, P-1) |
| ADN-R-1 | Failed or empty job | Unit | S author 2, 3 | PASS | — |
| ADN-R-1 | Two jobs, same poll | Unit | S author 6 · C author 2 | PASS | — |
| ADN-R-1 + NFR perf | Two jobs, different polls; one reload per poll | Unit | S **new** "two own jobs … DIFFERENT polls" | PASS | — |
| ADN-R-2 / AC-4 | Auto-refresh on completion | Unit | S author 1 | PASS | — |
| ADN-R-2 / AC-4 | Filters and Review aside kept | Unit | C author 3 | PASS | — |
| ADN-R-2 (D2) | Out-of-order, error, and null-center loads | Unit | S author 8, 9, 10 | PASS | — |
| ADN-R-3 / AC-5 | Leave and come back | Unit | C author 5 + C **new** "leave and come back" | PASS | — |
| ADN-R-3 / AC-5 | Create Result on any draft | Unit | C author 7 | PASS | — |
| ADN-R-3 / AC-5 | Switch center A → B → A | Unit | C author 6, 6b + C **new** "A -> B -> A" | PASS | — |
| ADN-R-3 / AC-6 | Review, filter or delete keeps the mark | Unit | C author 4 | PASS | — |
| ADN-R-3 | Not visited yet → stays fresh, shows on first visit | Unit | S **new** "not visited" + C **new** "other pages" | PASS | — |
| ADN-R-3 (AND IT MUST) | Lost on reload after finish | Unit | S author 4 | PASS | A real browser reload is not simulated (accepted gap) |
| P-11 | Completion with a null center | Unit | S **new** "P-11" | PASS | Closes an ADN-T-1 resilience advisory |
| ADN-R-4 / AC-7 | Visible "New", icon `aria-hidden`, sr-only text from the copy file | Unit (DOM) | C author 1 | PASS | — |
| ADN-R-4 / AC-7 (D6/D7) | Layout at 4 widths, AA contrast | HITL | `execution.md` HITL probe | PASS (approved) | jsdom cannot evaluate layout |
| ADN-R-5 / AC-8 | No write of any verb; data unchanged (service) | Unit | S author 11 + S **new** "ADN-R-5 … any verb" | PASS | — |
| ADN-R-5 / AC-8 | No write; drafts, status, `is_discarded` and order unchanged (component) | Unit | C author 8 + C **new** "ADN-R-5 …" | PASS | — |
| — | Fallback `draft-<id>` group never marked | Unit | C author 1b | PASS | — |

## 8. Remediation

No failures, so nothing to remediate.

Observation, not a defect: the A→B→A defect in the Tester's first attempt shows that if a center switch and a list swap ever landed in the same change-detection flush, the component would consume B's fresh ids while still on A. The app's async GET ordering prevents this. It is the same family as the open X→null gap advisory in `execution.md` (ADN-T-2 Resilience), so it belongs with that advisory for `/akili-archive`.

## 9. Accepted Gaps

| Gap | Reason | Mitigation |
|---|---|---|
| `ADN-D6` / `ADN-D7` layout and contrast are not covered by Jest | jsdom has no layout engine | HITL Cypress CT probe at 4 widths, approved 2026-10-27 (`execution.md`) |
| `ADN-AC-2` server-side scoping of other users' jobs | A client test cannot prove server scoping | Assumption C-2 / P-1 in `requirements.md` §9. Add a client user check if the jobs API ever returns teammates' jobs |
| A real browser reload after the job finished is not simulated | Jest cannot reload the page | Proven by the first-poll-terminal path (S author 4), which is what a reload produces |
