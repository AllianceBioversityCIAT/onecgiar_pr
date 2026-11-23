# Archive Summary — P2-3960 · Bilateral save alerts tell one consistent truth

> **Delivered.** All 4 requirements are shipped and covered by 9 regression tests, each shown to fail without the fix. Validation found 0 FAIL.
> **Archived with one accepted open item:** R-1, the manual prtest repro, which runs after the deploy.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/p2-3960-bilateral-save-alert-consistency` · Lite · Bug Mode · gated |
| Ticket | P2-3960 |
| Branch | `qa-development-2026-ss` (spec-branch context; the integration pin is `staging`) |
| Commits | `6cc9c75e0` (T-1) · `550737ec8` (T-2) · `132a443c7` + `94cfa62a7` (validation) · `5eb4fd8bb` (tests and test report) |

## 2. Original Spec Path

`docs/specs/bugfix/p2-3960-bilateral-save-alert-consistency/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Complete, with one open follow-up (R-1), accepted by the user at archive time.**

## 5. Requirements Delivered

| ID | Delivered behaviour | Task |
|---|---|---|
| BSA-R-1 | A section change is blocked, and "Save failed" shown, only when a field **that change** sent fails | T-1 |
| BSA-R-2 | "Draft saved" or "Success" appears only when something was sent; otherwise "Nothing to save yet" or "Up to date" | T-1 |
| BSA-R-3 | A replaced alert's timer can no longer close the alert that replaced it (3000 ms is unchanged) | T-2 |
| BSA-R-4 | Removing an already-detached alert no longer throws (Fe and Fs) | T-2 |

## 6. Files Changed Summary

| File | Change |
|---|---|
| `bilateral-result-creator.component.ts` | `selectSection()` scopes the wait, the failure check and the message to `flushTargets`, and skips the wait when that set is empty. `triggerManualSave()` gains the `flushTargets.length === 0` branch |
| `bilateral-result-creator.component.spec.ts` | Tests A, B, C, G, H, I; 4 consumer tests adapted |
| `bilateral-result-creator/CLAUDE.md` | Invariant rewritten (P2-3960, BSF-OQ-1 trade-off); trimmed to 119 lines |
| `customized-alerts-fe.service.ts` (+ spec) | `closeTimers` registry cleared in `show()`; null-parent guard; tests D, E |
| `customized-alerts-fs.service.ts` (+ spec) | Null-parent guard; test F |

## 7. Test Evidence Summary

| Item | Value |
|---|---|
| Regression tests | 9 (A–F author TDD, G–I added at `/akili-test`), each red under its falsifier |
| Affected suites | 3 suites, 216/216 passed; lint and build clean |
| Full client run | 15385/15390 passed. The 5 failures predate this spec (verified at baseline) |
| Product bugs | 0 |

## 8. Validation Summary

PASS with warnings: 0 FAIL. W-2, W-3 and W-5 were resolved at validation. W-1 and W-4 are accepted. R-1 is open.

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Owner / route |
|---|---|---|
| R-1 | Manual repro on prtest (proposal §9 steps 1-5): no false "Save failed", no false "Draft saved", no early-closing alert, no `removeChild` error in the console | QA, after the prtest deploy. **Accepted open at archive** |
| R-4a | Per-field display of save errors (P-9 trade-off, accepted under BSF-OQ-1) | follow-up ticket |
| R-4b | A 15 s stall on a rail click when a stale error and a successful save sit in the same section; an in-flight failure during navigation is silent (W-1) | follow-up ticket |
| R-6 | Client failures that predate this spec: `general-interceptor` (4), `impact-level-info` (1), flaky `quality-assurance` | separate ticket |

## 10. Historical Notes

- **P-9 settled false at T-1, step 1.** The field cards never show a save `'error'`, so after DD-1 a stale failure has no visible signal. The user accepted the gap, and design §10 and P-9 were amended in place.
- **DD-1 refinement:** an empty `flushTargets` skips the wait. This changes no outcome and removes a 15 s stall.
- T-1 needed one docs-only rework, because the folder `CLAUDE.md` was over the 120-line cap. The review-round budget went 3 against 2, accepted by the user.

## 11. Diagrams

None. The spec has no `diagrams/` folder and makes no baseline diagram stale.
