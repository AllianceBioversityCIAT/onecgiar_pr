# Archive Summary — Requirements — Annual updating for replicated W3/Bilateral innovations

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/replicated-innovation-annual-updating` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 15 `[x]`, 9 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `7a27c6623 2026-09-29 ✨ feat(bilateral-annual-updating) [SPEC:bilateral/replicated-innovation-annual-updating]: annual updating block for replicated bilateral innovations` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/bilateral/replicated-innovation-annual-updating/`

## 3. Requirements Delivered

`RAU-R-1`, `RAU-R-2`, `RAU-R-3`, `RAU-R-4`, `RAU-R-5`, `RAU-R-6`, `RAU-R-7`, `RAU-R-8`, `RAU-R-9`, `RAU-R-10`, `RAU-R-11`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `Summary`:

- **Outcome:** all 10 tasks are `[x]`. The owner added T-10, a SQL injection fix, during execution. The owner also extended T-6 and T-8 with S-11.3: "Please provide a reason."
- **Review rounds:**
  - PASS on the first attempt: T-3, T-5, T-7, T-10.
  - PASS on the second attempt: T-1, T-2, T-4, T-6.
  - PASS on the third attempt: T-8.
  - No HALT, no Pivot.
  - Real defects caught by review:
    - a W1/W2 behavior change (the `?? []` in T-2);
    - tests that could never fail (T-4, T-8);
    - SQL whitespace drift (T-1);
    - a wipe of the MDS group, a stale status taken from another result, a 400 that was never shown, and a button enabled on a locked result (all T-8);
    - a pre-existing SQL injection (T-10).
- **Budget:** 9 tasks were planned; 10 ran (the tenth was added by the owner). Review rounds ran above the ~14 estimate, driven by T-8 (3 rounds) and the lens reviews on T-6 and T-10.
- **Environment incidents:**
  - API 429 limits, recovered by retries.
  - Classifier outages.
  - A `git stash` collision during T-5, after which stash was banned in briefs.
  - The owner's parallel commit `28a4bd678` reset the index. Baselines were then rebuilt from frozen diffs, and no work was lost.
- **Open follow-ups (not in scope):**
  - Reject non-integer or null discontinued-option ids: nested `@IsInt` or an `inactiveData` guard.
  - `returnErrorRes({debug: true})` logs whole driver errors.
  - A status change on discontinuation writes no `result-review-history` row. This matches W1/W2.
  - A lock notice for type 2 at status 4 (design §13).
  - Trim the over-cap `CLAUDE.md` files (shared `annual-updating`, `type-innovation-use`).
  - Kaizen candidates: ban `git stash`/`--fix` in briefs; "move as-is means token for token"; a fallback resolver needs conflicting-seed negative tests; mocks must model real service states.
- **Commits:** none yet. They are pending the owner's go-ahead, as three PRs (server / component move / bilateral).

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 0 Reviewer FAIL mentions, 3 HALT mentions, 0 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- Open follow-ups (not in scope):**
- Commits:** none yet. They are pending the owner's go-ahead, as three PRs (server / component move / bilateral).

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/bilateral--replicated-innovation-annual-updating.md` (no lessons distilled in batch mode).
