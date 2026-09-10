# Archive Summary — `changes/result-detail-footer-overlap`

Result Detail no longer mounts the floating CGIAR footer. Back / Next / Sync / Save draft stay on the action strip at tablet and narrowed desktop.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/result-detail-footer-overlap/` |
| Archive date | 2026-09-02 |
| Final status | **Done** — `FOVL-T-1` and `FOVL-T-2` `[x]` PASS |
| Approval mode | gated (`proposal.md`); Lite Bug Mode |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Ticket | none |

## Original Spec Path

`docs/specs/changes/result-detail-footer-overlap/`

## Archive Date

2026-09-02

## Final Status

**Shipped on `qa-development-2026`.** Both required tasks complete. `test-report.md` and `validation-report.md` absent — **accepted**: Lite Bug Mode; scoped Jest and HITL live in `execution.md`; `/akili-test` and `/akili-validate` were never run.

## Requirements Delivered

| ID | Outcome |
|---|---|
| `FOVL-R-1` / AC-1 | Any URL containing `/result/result-detail/` does not mount `.footer` or `.footer-blocker` |
| `FOVL-R-2` / AC-2 | At 900px and ~1100px, the action strip matches `visual/wide-action-bar-correct.jpg`; hover does not slide a second bar over the controls (user HITL 2026-09-02) |
| `FOVL-R-3` / AC-3 | Results list still mounts the footer; Type-One Report still sets `isFloating` |

## Files Changed Summary

From `execution.md` (T-1, T-2):

| Area | Files |
|---|---|
| Production | `onecgiar-pr-client/src/app/shared/components/footer/footer.component.ts` — deleted `{ path: '/result/result-detail/', floating: true }` (no `floating: false` leftover) |
| Tests | `footer.component.spec.ts` — FOVL-AC-1 Result Detail absence; FOVL-AC-3 Results list mount; Type-One Report still `isFloating` |
| Spec visuals | `visual/wide-action-bar-correct.jpg` (target); `visual/narrow-footer-overlap.png` (defect) |

No server, no migration, no action-strip or Tawk change.

## Test Evidence Summary

- Scoped Jest: `cd onecgiar-pr-client && npm run test -- --testPathPattern="footer.component.spec"`
  - T-1: new FOVL-AC-1 case **red** (`Expected: false / Received: true`); 7 existing cases green
  - T-2: **10/10 PASS**, including FOVL-AC-1 now green
- Full client Jest **not** run (repo rule).

## Validation Summary

No `validation-report.md`. No unresolved FAIL findings. Conformance evidence: two Reviewer **PASS** verdicts in `execution.md` (author ≠ auditor). HITL for FOVL-AC-2 closed by the user, not by the agent.

## Accepted Warnings Or Follow-Ups

- Agent could not open Result Detail (`:4200` / login). User confirmed 900px and ~1100px; Back / Next / Sync / Save draft unobstructed.
- No Tawk / `section-bottom-bar` retune — HITL did not name a remaining clip.
- Option B (legal-link handle on this page) stays locked out.
- `test-report.md` / `validation-report.md` never authored — accepted at archive.

## Historical Notes

- Escalated from `/akili-quick`: overlay + allow-list change is not a cosmetic one-liner (`proposal.md` §141).
- Locked Option A: delete the allow-list entry. Do **not** set `floating: false` (in-flow footer under a viewport-locked page is a second bug).
- Commits on this branch: `e58b38053` (red test), `b57fa32f8` (allow-list delete), `3acc23a6c` (HITL close-out).
- `proposal.md` is historical; `requirements.md` + `design.md` supersede it.
