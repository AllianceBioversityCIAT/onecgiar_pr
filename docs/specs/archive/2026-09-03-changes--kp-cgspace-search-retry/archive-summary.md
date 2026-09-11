# Archive Summary — CGSpace search retries three times before Try again

**Outcome:** shipped. One client pipeline change, Reviewer PASS on attempt 2, 30 scoped Jest tests green. Formal `/akili-test` and `/akili-validate` were not run (Lite); absence accepted.

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/kp-cgspace-search-retry/` · Prefix `KCSR` |
| Archive Date | 2026-09-03 |
| Archived from branch | `qa-development-2026` (default pin `master`) |
| Depth / Approval Mode | Lite · interactive · no `proposal.md` |
| Escalated from | `/akili-quick` refused (not trivial) → `/akili-specify` |
| Extends | `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse/` (`KPB-R-10`, `KPB-R-11`, `KPB-AC-7`) |
| Final Status | **Complete** — 1/1 tasks `[x]`; no `test-report.md`, no `validation-report.md` (accepted; evidence in `execution.md`) |

## 2. Requirements Delivered

| ID | Behaviour | Delivered by | Evidence |
|---|---|---|---|
| `KCSR-R-1` | 3 HTTP attempts (1 + 2 retries) before error; empty 200 not retried; Try again is a new cycle | `initSearchPipeline` `retry({ count: 2 })` | KCSR-TEST-1, 2, 3, 6 |
| `KCSR-R-2` | Stay loading; new query cancels leftover retries; A must not paint B | retry inside existing `switchMap`; delay 600 ms | KCSR-TEST-4, 5, 5b |
| `KCSR-R-10` | Short delay between attempts | `retryDelayMs = 600` (overridable in tests) | `KCSR-DD-2` + TEST-4/5b non-zero delay |
| `KCSR-AC-1`…`6` | Recover, persist, empty, no flash, cancel, Try again | named tests KCSR-TEST-1…6 | `execution.md` PASS |
| `KCSR-DD-3` | HTTP 200 + body `status: 502` is a failed attempt | pre-retry `map` throws on `status`/`statusCode` ≥ 400 | KCSR-TEST-7 |

Out of scope honoured: facets, MQAP, Manual entry, server, error copy.

## 3. Files Changed

| File | What |
|---|---|
| `…/kp-cgspace-browse.component.ts` | `RETRY_COUNT = 2`, `retryDelayMs = 600`; `defer` + 502-body throw + `retry` inside `switchMap` |
| `…/kp-cgspace-browse.component.spec.ts` | Existing one-fail → error rewritten; KCSR-TEST-1…8 + 5b |
| `docs/specs/changes/kp-cgspace-search-retry/*` | requirements, design, tasks, execution, this summary |

Commit: `bd08cb2a2` — `[SPEC:changes/kp-cgspace-search-retry] 🔧 fix(kp-cgspace-browse): Retry CGSpace search three times before Try again`

## 4. Test Evidence

| Gate | Result |
|---|---|
| `npm run test -- --testPathPattern="kp-cgspace-browse.component.spec"` | **30/30** passed |
| Lint (`npx ng lint --quiet`) | clean |
| Reviewer | Attempt 1 **FAIL** (TEST-5 could not prove A-late-success discard). Attempt 2 **PASS** (`KCSR-TEST-5b`) |

No `/akili-test` suite. No full client Jest run.

## 5. Validation

No `/akili-validate` run (Lite). Owner confirmed before archive that Browse search error copy is fixed (not API `error.message`), states do not mix, and MQAP toasts are a separate surface.

## 6. Accepted Warnings & Follow-Ups

| # | Item | Disposition |
|---|---|---|
| F1 | No `test-report.md` / `validation-report.md` | Accepted at archive (Lite; `execution.md` + owner copy check) |
| F2 | Load more `loadingMore` mid-retry | Same inner pipe (`KCSR-DD-1`); documented, no dedicated test |
| F3 | First-success = 1 call | Pre-existing debounce/Enter specs |
| F4 | `KCSR-TEST-2` has no trailing `flush()` + repeat call-count | Reviewer ADVISORY; not a task |
| F5 | Load more failure after 3 attempts clears the list and shows the same error card | Pre-existing fail-soft; out of this spec |
| F6 | Server-side retry, facet retry, shared retry helper | Deferred (`design.md` §13) |

## 7. Historical Notes

- Budget: 1 review round expected, 2 actual. Cause: TEST-5 late-success gap. Closed on attempt 2.
- `KCSR-A-1` pinned “3 intentos” = 3 total HTTP calls, not 3 retries after the first. RxJS `retry` count **2**.
- Error UI copy unchanged: “CGSpace search is temporarily unavailable — use Manual entry.”
- Constitution: no new module, no ADR overturned. Guide/TRD writes deferred (spec branch).
