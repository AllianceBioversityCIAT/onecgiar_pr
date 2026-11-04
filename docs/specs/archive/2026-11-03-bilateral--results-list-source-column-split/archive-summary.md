# Archive Summary — Requirements — Split "Source" column on the bilateral Results list

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/results-list-source-column-split` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 18 `[x]`, 11 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `dbd3f3b5f 2026-09-28 ✨ feat(bilateral-results-list) [SPEC:bilateral/results-list-source-column-split]: split Source column into Origin and Funding source` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/bilateral/results-list-source-column-split/`

## 3. Requirements Delivered

`BSC-R-1`, `BSC-R-2`, `BSC-R-3`, `BSC-R-4`, `BSC-R-10`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `3. Summary`:

All tasks in this spec are complete:

| Task | Status |
|---|---|
| `BSC-T-1` — Split the Source column into Origin + Funding source | ✅ PASS |
| `BSC-T-2` — Update and add component tests for the split columns | ✅ PASS |

No HALTs, no Pivots, no budget-tripwire triggers. Budget (`design.md` §12A) estimated 2 tasks / ~60 LOC / 1 review round each — actuals matched (2 tasks, 1 review round each; LOC modestly over estimate mainly due to the beyond-scope CSV export fix and thorough test coverage, not scope creep).

**Remaining per `tasks.md` §6/§7 (not part of the Leader/Implementer/Reviewer loop, for the user to action):**
- Commit the changes via the project convention and open a PR against `staging`/`master` per release cadence.
- Manual QA on staging per `tasks.md` §6 (visual/layout HITL check — no automated gate exists for this repo's table layout, per `requirements.md` §10's recorded substitution).
- Move spec status to `shipped` once merged and verified on staging (`tasks.md` §7).
- Separately scoped follow-up (already noted in `proposal.md`, not part of this spec): run `/akili-quick` for the unrelated "common W3 information" copy fix.

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 0 Reviewer FAIL mentions, 0 HALT mentions, 0 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- Manual QA on staging per `tasks.md` §6 (visual/layout HITL check — no automated gate exists for this repo's table layout, per `requirements.md` §10's recorded substitution).
- Separately scoped follow-up (already noted in `proposal.md`, not part of this spec): run `/akili-quick` for the unrelated "common W3 information" copy fix.

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/bilateral--results-list-source-column-split.md` (no lessons distilled in batch mode).
