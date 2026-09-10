# Kaizen — `bugfix/innovation-geo-other-areas`

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Branch context | spec branch (`qa-development-2026-ss` ≠ pin `master`) — every shared-file edit recorded as pending, nothing applied |
| Archive | `docs/specs/archive/2026-09-08-bugfix--innovation-geo-other-areas/` |

## Metrics

| Signal | Value |
|---|---|
| Reviewer FAIL rework | 1 of 1 task took a second attempt — `GEO-T-1` FAIL (attempt 1) → PASS (attempt 2); within the ≤1-round budget |
| HALT / FATAL_FAIL | 0 |
| Pivot Record | 0 |
| PRODUCT_BUG findings | 0 (this whole spec IS the product bug fix; no incidental new bug found during execution) |
| Judgment-day severe findings | not run |
| Validation FAIL/WARN | not run (`validation-report.md` not produced); 1 Reviewer FAIL captured inline in `execution.md`, both findings resolved in attempt 2 |
| `/akili-quick` escalations | 0 |
| Budget | 1 task estimated / 1 actual · ~10-15 LOC estimated / in range · ≤1 review round — held exactly |

## Lessons

- **KZ-GEO-1 — A regression test that re-declares its own copy of the logic under test, instead of calling the actual production code path, can pass even when the fix is reverted.** (Product, High)
  - Root cause: attempt 1's `[isComplete]` regression test block declared a local `isComplete = (value) => value != null` lambda inside the spec file and asserted against *that*, never touching the real `[isComplete]` template binding or any component method. The Reviewer proved this concretely: reverting the HTML fix (the actual bug fix for the completeness check) would leave all 4 of those tests green, because they exercised nothing but JavaScript's own `!=` operator restated in the test file.
  - Evidence: `execution.md` `GEO-T-1` attempt 1, Reviewer finding 1 ("re-declares its own local... lambda... Reverting the HTML fix would leave these 4 tests green").
  - Standardization → P1: a task's Definition of Done that names a template expression or predicate as the thing to test (`requirements.md`/`tasks.md`'s own "the `[isComplete]` expression (or its extracted predicate)" language) is not satisfied by a test that re-implements the same logic locally — the fix must be reachable as a bound, named symbol (a component method/getter/computed) and the test must call *that symbol*, not a copy of its logic. This is a general TDD discipline gap, not specific to this bug.

## Noted, not a lesson

- Attempt 1's second Reviewer finding (an out-of-scope `CLAUDE.md` edit on a spec branch, not listed in `tasks.md`'s Files (expected)) is the shared-file write discipline rule working exactly as designed — the rule already exists and was correctly applied by the Reviewer; no new standardization needed, just the routine pending-item capture (see below).
- The attempt-1→2 cycle closed within the single review round the Lite-depth budget allows — no methodology gap in the loop itself, just a genuine defect caught on the first pass.

## Pending Items

| # | Kind | Target | Edit (verbatim) | Severity | Status |
|---|---|---|---|---|---|
| 1 | standardization (KZ-GEO-1) | `docs/specs/general-setup/task.md` | Add to the verification/DoD guidance: "When a task's DoD names a template expression or predicate as the thing a regression test must cover, the test MUST call the actual bound symbol (a component method/getter/computed) — a test that re-declares an equivalent expression locally, disconnected from the production binding, can stay green after the fix is reverted and proves nothing." | High | pending |
| 2 | guide-sync | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/CLAUDE.md` | Update `**Verified:**` line to `2026-09-08 · branch qa-development-2026-ss · GEO-T-1 (null-coercion bug fixed)`. Replace the stale Trampas bullet — "⚠️ `fillExtraGeographicLocationBody()` hace `Boolean(response.has_extra_geo_scope)`, así que un `null` del servidor (\"sin responder\") se vuelve indistinguible de un \"No\" real: la pregunta sale precontestada y nunca cuenta como faltante. Sólo la llama la rama P25." — with: "✅ **Resuelto (GEO-T-1, 2026-09-08):** `fillExtraGeographicLocationBody()` ya no coacciona con `Boolean()`; `has_extra_geo_scope` preserva `null`/`true`/`false` tal como llega del servidor, y `[isComplete]` (vía `hasExtraGeoScopeAnswered()`) trata `null` como incompleto. Solo la llama la rama P25." | Medium | pending |
| 3 | factual-sweep | root guides | No falsified root-guide claims found this cycle. | — | n/a |
| 4 | trd-adr | — | No TRD ADR overturned — pure client read-path fix, no architecture decision to supersede. | — | n/a |
| 5 | digest-update | — | No recurrence of an existing `docs/specs/kaizen/` lesson found (a keyword hit on "tautological" in `changes--sp-shell-app-viewport.md` is an unrelated root cause — a CSS `styleUrls`/`styles` cascade-order bug, not a test re-declaring production logic locally). | — | n/a |

*(Apply phase runs on `master`; nothing above was written to shared files from this branch.)*
