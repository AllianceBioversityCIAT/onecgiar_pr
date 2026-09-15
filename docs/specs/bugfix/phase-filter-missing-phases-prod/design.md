# Design — Programme Results: default phase must not lock onto a data-free phase before rows load

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/phase-filter-missing-phases-prod` |
| Depth | Lite |
| Based on | `requirements.md` (REQ-1, REQ-2) |

## 2. Executive Summary

One surgical change, no architecture change: gate the existing **"URL → filters" effect** in `ProgrammeResultsComponent` so that, on the auto-derived path only (no explicit `?phase=` URL param), it does not commit a value into `selectedPhase` while `ProgrammeResultsService.loading()` is still `true`. The explicit-URL-param path is untouched — it keeps applying immediately, exactly as today. Once the load settles, the effect re-evaluates (see §7 for why this is guaranteed even if `defaultPhase()`'s recomputed value happens to equal its pre-load guess) and commits the now-correctly-derived default. Because the "Filters → URL" mirror effect only fires in reaction to `selectedPhase()` actually changing, never writing the wrong value in the first place also prevents it from ever reaching the URL — closing the "lock-in" mechanism at its source instead of trying to un-write it after the fact.

## 3. Architecture Overview

No new components, services, signals-as-public-API, or data flows. This is a guard added inside one existing `effect()` block in one existing component. The request path (`ProgrammeResultsService.load()` → `GET_AllResultsWithUseRole`) is unchanged; `phaseOptions()`'s derivation (`programme-results.service.ts:356-363`) is unchanged and confirmed correct in `proposal.md`.

## 4. Extended Directory Structure

No new files.

```
onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/
└── programme-results.component.ts   # MODIFIED: guard in the "URL → filters" effect (~:1072-1104)
    └── programme-results.component.spec.ts   # MODIFIED: regression tests (deferred-load timing)
```

## 5. Data Model

No change. No entity, DTO, or persisted state is touched — this is purely client-side reactive-signal timing.

## 6. API Design

No change. No request/response contract is touched.

## 7. Backend Module Design

Not applicable — this bug has no server-side component (confirmed in `proposal.md`: SP08's raw server response already correctly contains only its real phase; the defect is entirely in how the client resolves and commits a *default* phase before that data has arrived).

## 8. Frontend / UX Component Architecture

**`programme-results.component.ts`, the "URL → filters" effect (currently `:1072-1104`):**

- **Today:** `const phase = urlPhase !== null ? this.toFilterValue(urlPhase) : defPhase;` — on the auto-derived path (`urlPhase === null`), `defPhase` (`this.defaultPhase()`) is committed unconditionally, even when it was computed against an empty `phaseOptions()` because `ProgrammeResultsService.load()` is still in flight.
- **Fix:** on the auto-derived path only, check `this.data.loading()`. While `true`, do not call `this.filter.selectedPhase.set(...)` at all for the auto-derived branch — leave `selectedPhase()` at its current value (its own initial default is `null`, per `ProgrammeResultsFilterService`). Once `loading()` becomes `false`, commit `defPhase` (by then computed against the real, settled `phaseOptions()`).
- **The explicit-URL-param branch (`urlPhase !== null`) is completely unguarded and unchanged** — deep links, the Overview hand-off (`RFD-*`), and back/forward navigation continue to apply immediately regardless of load state. This is what REQ-1-S2 protects.

**Design Decision D-1: read `this.data.loading()` in the effect's TRACKED scope, not only inside the existing `untracked(...)` block.**

The effect already reads `defaultPhase()` in its tracked (outer) scope (`:1074`, before `untracked`), which is what makes it re-run whenever `defaultPhase()`'s *value* changes. But `defaultPhase()` uses `Object.is`-style change detection like any Angular `computed()` — if a programme's real data happens to sit in the SAME phase the global-fallback guess already landed on (a coincidence, not the reported bug's shape, but possible), `defaultPhase()` could recompute to an *identical string* before and after load, and Angular would then **not** re-notify this effect, because nothing about the effect's own tracked dependencies looks different from its point of view. If the guard's *check* (`loading()`) lived only inside `untracked`, that transition would never trigger a re-run at all, and the deferred write would never happen — a silent stall, not merely a slow correction.

Reading `this.data.loading()` in the tracked scope guarantees the effect is scheduled to re-run on the `true → false` transition unconditionally, independent of whether `defaultPhase()`'s output string happens to match its pre-load guess. This is the one piece of this fix that is not obvious from reading the bug report alone — it is a correctness requirement of the fix itself, not an optional refinement.

**Design Decision D-2: preserve the existing effect registration order in the constructor.**

`ProgrammeResultsService.load(code)` is triggered by a separate, earlier-registered effect (`constructor():1024-1028`), which synchronously calls `this.loading.set(true)` (inside the service's `load()`, `programme-results.service.ts:393`) before the async HTTP call is even subscribed. Because Angular flushes effects created in the same constructor in their registration order on the first pass, by the time the "URL → filters" effect (registered later, at `:1072`) first evaluates, `loading()` is already `true` for the ordinary case (programme code resolved from the route, not itself async). **Do not reorder the constructor's effects** — moving the URL-sync effects ahead of the load-triggering one would reopen a narrower version of the exact race this spec fixes (the guard would read `loading() === false` on the very first tick because the load hadn't been triggered yet).

**No reversion challenge triggered (Step 2.3):** this fix does not remove, disable, or invert any already-shipped behavior. The eager, unconditional write on the auto-derived path *is the bug itself* — deferring it corrects a defect, it does not withdraw a feature. The explicit-URL-param path (the one behavior actually worth protecting here) is left completely untouched, which is exactly what REQ-1-S2's scenario locks in via test.

## 9. Shared Contracts Or Package Extensions

None. `ProgrammeResultsService`'s public surface (`loading()`, `phaseOptions()`) is read, not changed. `ProgrammeResultsFilterService`'s public surface is unchanged.

## 10. Design Decisions

| ID | Decision | Rationale | Alternative rejected |
|---|---|---|---|
| D-1 | Track `this.data.loading()` in the effect's tracked scope (not only inside `untracked`) | Guarantees the deferred commit actually fires on the `loading` `true → false` transition, even in the edge case where `defaultPhase()`'s recomputed value happens to equal its pre-load guess | Relying solely on `defaultPhase()` changing value to trigger re-evaluation — silently fails to ever commit in the coincidental-match edge case |
| D-2 | Guard only the auto-derived branch of the "URL → filters" effect; leave the explicit-URL-param branch and the "Filters → URL" mirror effect untouched | Smallest possible change; the mirror effect only fires in response to `selectedPhase()` changing, so preventing the wrong initial write is sufficient to prevent the lock-in — no need to touch two effects when fixing one closes the loop | Guarding the "Filters → URL" mirror effect instead (Option B from the proposal) — would still let the wrong value briefly live in `selectedPhase` and be visible in the toolbar before being caught, and requires tracking "was this auto-set or user-set," more state for no benefit |

### Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Expected tasks | 2 (code fix + automated regression tests in one file; manual prod re-verification) |
| Expected LOC | ~15–25 production (one effect body) + ~70–100 test code (three new scenarios needing a deferred/delayed mock observable, since every existing test in this spec file resolves synchronously via `of(...)` and would not exercise this race) |
| Expected review rounds | 1 |

Depth check: `Lite` matches — a guard inside one existing effect, in one file, with no new public API, no server change, and no UI redesign. Well under the threshold where `Standard` would be warranted.

## 11. Design Approval

Present to user: the guard mechanism (defer the auto-derived write while `loading()`, leave the explicit-URL-param path untouched), the two Design Decisions (D-1's non-obvious edge case, D-2's ordering dependency), and the budget above.
