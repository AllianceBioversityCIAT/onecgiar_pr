# Archive Summary — Requirements — Overview Replicated/New Badges

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/overview-replicated-new-badges` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 11 `[x]`, 16 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `28a4bd678 2026-09-29 ✨ feat(bilateral-overview): add replicated/new badges and W1/W2 contributing/lead breakdown to Total results card` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/changes/overview-replicated-new-badges/`

## 3. Requirements Delivered

`BOV-R-1`, `BOV-R-2`, `BOV-R-3`, `BOV-R-4`, `BOV-R-5`, `BOV-R-10`, `COV-R-13`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `3. Summary`:

All tasks (`BOV-T-1`) complete. `replicatedCount`/`newCount` added to `OverviewTotalResultsKpi`, rendered as amber/emerald badge pills on the Overview "Total results" card matching the Reporting tab's token pattern exactly (including the zero-count muted state), with `aria-label` updated and `bilateral-overview/CLAUDE.md` documenting the `BOV-DD-1` divergence. 2 rework attempts (1 FAIL on token fidelity, 1 PASS). Client Jest (70/70 passing, scoped) and lint clean. Outstanding: manual browser verification and visual side-by-side check, both pre-accepted risks per the spec's defect-class table — recommended before merge/PR.

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 0 Reviewer FAIL mentions, 0 HALT mentions, 0 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- All tasks (`BOV-T-1`) complete. `replicatedCount`/`newCount` added to `OverviewTotalResultsKpi`, rendered as amber/emerald badge pills on the Overview "Total results" card matching the Reporting tab's token pattern exactly (including the zero-count muted state), with `aria-label` updated and `bilateral-overview/CLAUDE.md` documenting the `BOV-DD-1` divergence. 2 rework attempts (1 FAIL on token fidelity, 1 PASS). Client Jest (70/70 passing, scoped) and lint clean. Outstanding: manual browser verification and visual side-by-side check, both pre-accepted risks per the spec's defect-class table — recommended before merge/PR.

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/changes--overview-replicated-new-badges.md` (no lessons distilled in batch mode).
