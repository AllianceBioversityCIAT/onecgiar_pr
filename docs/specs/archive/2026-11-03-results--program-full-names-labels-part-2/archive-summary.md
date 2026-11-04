# Archive Summary — Module Spec — `requirements.md`

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `results/program-full-names-labels-part-2` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 10 `[x]`, 3 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `eff296e6f 2026-10-13 ✨ feat(program-labels) [SPEC:results/program-full-names-labels-part-2]: show program full name on IPSR, completeness, indicators, review history and AI jobs` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/results/program-full-names-labels-part-2/`

## 3. Requirements Delivered

_No requirement IDs found in requirements.md — see the file itself._

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `3. Summary`:

- **Result:** 6/6 tasks PASS on 2026-10-13. Reviewer rounds: 7 (T-4 needed 2), within the budget of 6–9. No HALT, pivot or FATAL_FAIL.
- **Budget:** prod LOC ≈ 398 (+361/-56 in tracked non-spec files incl. HTML/SCSS, plus the new 37-line `bilateral-program-label.util.ts`) against an expected ~250 and a ~400 tripwire. The tripwire was reached at the edge, not exceeded. Test LOC +888 (≈2.2× prod, consistent with KZ-…-2).
- **Execution notes:**
  - T-5 was launched alongside T-6 (width 3) at the user's request for speed.
  - All Jest runs were serialized through a scratchpad `jest.lock` mutex.
  - Several runs used `--maxWorkers=1` because free RAM was 0.6–3.9 GB.
- **Open items for the user (DoD §6, not yet done):**
  1. **HITL smoke** on the local stack, read-only pages: M1, M2, M3, M4, IPSR creator/step-1/step-2, IPSR notifications inbox (S2) and the AI queue. Check for no SQL error, names visible, and one line with ellipsis. In particular check the creator picker and the step-2 Lead column (80→180px), the topbar role pill (`max-width: 65%`) and the M4 mono span.
  2. **Contract doc fix before commit (T-3 advisory):** the 2026-10-13 change-log row cites a non-existent "§4.1", and its "immediately after `program_code`" claim holds for the list item only.
  3. **Decision:** `update-notification` header stays code-only until the server `notification.service.ts` selects `obj_initiative.name` (one-line server change outside this spec).
  4. **PO wording:** the "Other(s)" sentinel reads `Other(s)` on rd-contributors and `Other(s) - Science Program(s)/Accelerator(s)` on lab-report-form.
  5. **DoD `git diff --stat`:** one extra file is outside the design §4 list (`pages/bilateral/shared/bilateral-program-label.util.ts`); the other extras are specs and folder `CLAUDE.md` files.
  6. **Commit** only on the user's go-ahead.
  7. **Cleanup:** stray `C:\Program Files\Git\tmpjest.out` (outside the repo).
- **Follow-up candidates (advisories, not tasks):**
  - `getResultsInnovation` role-2 subqueries lack `is_active`/`LIMIT 1`.
  - Wrap the AI-jobs initiative lookup in try/catch, and fold it into the `Promise.all`.
  - Replace the `.sp-label-text` SCSS ×3 with Tailwind `truncate`.
  - Reset `coreInitiativeName` on chip cancel.
  - Add tests for the phase-detail toast and the drawer announcement.

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 1 Reviewer FAIL mentions, 3 HALT mentions, 0 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- Open items for the user (DoD §6, not yet done):**
- 1. **HITL smoke** on the local stack, read-only pages: M1, M2, M3, M4, IPSR creator/step-1/step-2, IPSR notifications inbox (S2) and the AI queue. Check for no SQL error, names visible, and one line with ellipsis. In particular check the creator picker and the step-2 Lead column (80→180px), the topbar role pill (`max-width: 65%`) and the M4 mono span.
- Follow-up candidates (advisories, not tasks):**

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/results--program-full-names-labels-part-2.md` (no lessons distilled in batch mode).
