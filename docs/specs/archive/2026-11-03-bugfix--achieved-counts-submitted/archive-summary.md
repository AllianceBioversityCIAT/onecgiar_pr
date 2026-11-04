# Archive Summary — `bugfix/achieved-counts-submitted` — Requirements

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/achieved-counts-submitted` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 8 `[x]`, 0 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `b7044e122 2026-10-02 ✨ feat(specs) [SPEC:bugfix/achieved-counts-submitted]: close T-5 with local evidence and S-5 waiver` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/bugfix/achieved-counts-submitted/`

## 3. Requirements Delivered

`ACS-R-1`, `ACS-R-2`, `ACS-R-3`, `ACS-R-4`, `ACS-R-5`, `KCR-R-2`, `ACS-NFR-1`, `ACS-NFR-2`, `ACS-NFR-3`, `ACS-NFR-4`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `Summary`:

All 5 tasks are complete.

| Task | Attempts | Verdict |
|---|---|---|
| T-1 | 1 | PASS |
| T-2 | 1 | PASS |
| T-3 | 1 | PASS |
| T-4 | 2 | PASS (first attempt FAIL: a missed AoW header surface and a component doc) |
| T-5 | — | PASS, with a waiver on S-5 |

**Shipped:**
- Server: an additive union "Achieved" figure on indicator rows and on every roll-up.
- Client: a display-basis normaliser at the API choke point, plus the QA/Prel split hidden behind `SHOW_QA_PREL_SPLIT`.

**Integration fixes found after execution:**
- The client app build failed type checking on the normaliser (`6d60a5bd4`), which Jest missed.
- A pre-existing submit crash on users who hold several roles (`01ccea9e8`, outside this spec).

**Budget:** about 1,200 LOC against an estimate of about 350, and 6 review rounds against 2. Most of the difference is test depth.

**For `/akili-archive` (kaizen):**
1. A client task's verify step should include `tsc -p tsconfig.app.json --noEmit` or a build.
2. The surface list in design should be derived from a grep across the whole module, not from the proposal.
3. The machine-load rule: Jest runs with `--maxWorkers=2`, one run at a time.

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 2 Reviewer FAIL mentions, 0 HALT mentions, 0 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- None recorded in the execution summary.

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/bugfix--achieved-counts-submitted.md` (no lessons distilled in batch mode).
