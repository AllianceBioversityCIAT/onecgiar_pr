# Archive Summary — Requirements — KPI progress as a capped average, no target aggregation

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kpi-progress-capped-average` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 7 `[x]`, 10 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `5fe7302a5 2026-10-19 ♻️ refactor(specs) [SPEC:changes/kpi-progress-capped-average]: close T-6 and record spec summary` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/changes/kpi-progress-capped-average/`

## 3. Requirements Delivered

`DKT-R-2`, `DKT-R-3`, `DKT-R-4`, `KPC-R-1`, `KPC-R-2`, `KPC-R-3`, `KPC-R-4`, `KPC-R-5`, `KPC-R-6`, `KPC-R-7`, `KPC-R-8`, `KPC-R-9`, `KTO-R-1`, `KTO-R-2`, `KTO-R-3`, `KTO-R-4`, `KPC-R-10`, `KPC-R-11`, `KPC-R-12`, `KPC-R-13`, `KPC-R-14`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `Summary`:

The Science Program shell and the server roll-up now show every KPI progress % as the mean of `min(achieved ÷ target, 1) × 100` over the KPIs with a target. The figure is flat over the leaf indicators and rounded to one decimal.

- Target aggregation is gone from every multi-indicator surface: the chip, the card header, HLO rows, ToC map, heatmap and the a11y table.
- The first chip reads `Total # of KPIs`, and the Areas of Work card reads `achieved`.
- Two Pivots were recorded:
  - T-4: the modal and guide fill their bars from the server value.
  - T-7: a HITL-approved scope amendment.
- Open follow-ups, outside the spec:
  - G-1 (duplicate 1.3 % on the Overview), for Nicoleta.
  - G-2 (`area.progress.done` is never sent).
  - The 375 px Overview overflow.
  - The `richStats` JSDoc wording.
  - The `/akili-archive` guide, TRD and kaizen sync on `staging`.

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 0 Reviewer FAIL mentions, 0 HALT mentions, 1 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- T-7: a HITL-approved scope amendment.
- Open follow-ups, outside the spec:

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/changes--kpi-progress-capped-average.md` (no lessons distilled in batch mode).
