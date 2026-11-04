# Archive Summary — Requirements — Discard several AI draft results at once (`ABD`)

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-04 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/ai-drafts-bulk-discard` |
| Archive Date | 2026-11-04 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 4 `[x]`, 3 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `2059bdafd 2026-10-27 🎨 style(bilateral) [SPEC:bilateral/ai-drafts-bulk-discard]: keep bulk discard bar visible and raise checkbox contrast` |
| Archive mode | Lightweight batch (user-approved 2026-11-04): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/bilateral/ai-drafts-bulk-discard/`

## 3. Requirements Delivered

`ABD-R-1`, `ABD-R-2`, `ABD-R-3`, `ABD-R-4`, `ABD-R-5`, `ABD-R-6`, `ABD-R-7`, `ABD-R-8`, `ADE-R-9`, `AIQ-R-9`, `ASC-R-15`, `ABD-NFR-1`, `ABD-NFR-2`, `ABD-NFR-3`, `ABD-NFR-4`, `ABD-NFR-5`, `ABD-NFR-6`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `3. Summary (automated tasks complete; T-4 awaiting HITL)`:

| Task | Status | Attempts | Notes |
|---|---|---|---|
| ABD-T-1 server endpoint + atomic single discard | `[x]` | 1 | 2 parallel lens reviewers, both PASS |
| ABD-T-2 client API + service | `[x]` | 2 | FAIL: missing "kept" `currentDraft` test |
| ABD-T-3 selection UI | `[x]` | 2 | FAIL: select-all placement → moved to card header |
| ABD-T-4 docs + HITL | `[~]` | 2 (docs) | FAIL: 120-line cap → 116; manual check pending |

**Budget (design §1: 4 tasks · ~520 LOC · ≤ 2 review rounds/task):** tasks 4 ✓; review rounds max 2 ✓; **LOC exceeded** — ≈ 520 (T-1) + ≈ 115 (T-2) + ≈ 225 (T-3) + docs ≈ net −4 → ≈ 860 vs ~520. Cause: clause-level tests (T-1 DTO matrix + supertest). Escalated to the owner at the T-1 gate; owner chose to continue ("sigue hasta que termines").

**Open items for the owner:** (1) HITL check above; (2) commit with explicit ABD paths only (foreign changes from another session in the tree); (3) decide whether "all ids failed with `error`" should show a hard error toast instead of the `warn` partial toast (not in spec); (4) ~~ABD-OQ-3 max-drafts-per-job SQL check~~ **closed 2026-10-27**: owner ran it on prod — max 36 drafts/job, avg 9.6, 8 jobs (the 36-draft job has all 36 still active) → cap 100 kept, no change to `BULK_DISCARD_MAX_DRAFTS`; (5) R-7 reading: list reload with the same ids keeps the selection (design §8.1 reading) — confirm; (6) advisories above (destructive tint on "Discard selected", S-6.3 test strength, `catchError`/`tap` order, stale snapshot restore, `BrnCheckbox` mock).

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 7 Reviewer FAIL mentions, 1 HALT mentions, 0 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-04 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- **ABD-T-4 manual HITL check (1280px layout / keyboard): verified by the user, reported 2026-11-04.** The `[~]` below is closed by that confirmation.
- | ABD-T-4 docs + HITL | `[~]` | 2 (docs) | FAIL: 120-line cap → 116; manual check pending |
- Open items for the owner:** (1) HITL check above; (2) commit with explicit ABD paths only (foreign changes from another session in the tree); (3) decide whether "all ids failed with `error`" should show a hard error toast instead of the `warn` partial toast (not in spec); (4) ~~ABD-OQ-3 max-drafts-per-job SQL check~~ **closed 2026-10-27**: owner ran it on prod — max 36 drafts/job, avg 9.6, 8 jobs (the 36-draft job has all 36 still active) → cap 100 kept, no change to `BULK_DISCARD_MAX_DRAFTS`; (5) R-7 reading: list reload with the same ids keeps the selection (design §8.1 reading) — confirm; (6) advisories above (destructive tint on "Discard selected", S-6.3 test strength, `catchError`/`tap` order, stale snapshot restore, `BrnCheckbox` mock).

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/bilateral--ai-drafts-bulk-discard.md` (no lessons distilled in batch mode).
