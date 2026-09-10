# Archive Summary — Shell Back no longer hops sibling Science Programs

The resolver no longer treats a sidebar hop as **Back**. HITL then removed the band control: after sibling-skip it always said **Back to Science programs** and never returned Overview ↔ Reporting. Bilateral header Back is unchanged.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/smart-back-button/` |
| Archive date | 2026-09-03 |
| Final status | **Done** — `SBB-T-1` and `SBB-T-2` `[x]` PASS; band Back removed post-HITL |
| Approval mode | gated · Lite · Bug |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Ticket | none |
| Escalated from | `/akili-quick` (triviality gate — navigation, not copy) |

## Original Spec Path

`docs/specs/bugfix/smart-back-button/`

## Archive Date

2026-09-03

## Final Status

**Shipped on `qa-development-2026`.** Both execute tasks PASS on attempt 1. Owner then removed the live band button. `test-report.md` and `validation-report.md` absent — **accepted** (Lite; evidence in `execution.md`).

## Requirements Delivered

| ID | Outcome |
|---|---|
| `SBB-R-1` | Shell resolve skips every `/entity-details/` sibling; last catalog or home. Sidebar hop is not generic **Back** to SP08 |
| `SBB-R-2` | `back()` drops the current URL; second resolve is not SP01. By-AOW drill-down specs stayed green |
| `SBB-R-3` | Center → SP still **Back to Bilateral results**. Same-program tabs exit to catalog (as specified) |
| Post-HITL | Band Back removed (expanded + collapsed). Resolver kept for the bilateral header |

## Files Changed Summary

| Area | Files |
|---|---|
| Resolver | `smart-navigation.service.ts` — shell skip-all `/entity-details/`; `back()` splice current URL |
| Resolver tests | `smart-navigation.service.spec.ts` — SBB-TEST-1/2 red→green; SBB-TEST-3 Center guard |
| Band (HITL) | `reporting-program-band` html / ts / spec — Back control and `SmartNavigationService` wiring removed |
| Spec | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md` |

No server, no migration, no route-table change. Bilateral header untouched.

## Test Evidence Summary

| Gate | Result |
|---|---|
| T-1 `smart-navigation.service.spec` | 2 failed, 14 passed, 16 total (service untouched) |
| T-2 same file | **16/16** |
| Post-HITL `reporting-program-band.component.spec` | **57/57** |
| Full client Jest | not run (repo rule) |

## Validation Summary

No `validation-report.md`. Reviewer PASS on T-1 and T-2, attempt 1 each. Painted-band HITL: owner saw always-catalog label and asked to remove the button. Login wall blocked an agent glance at `localhost:4200`.

## Accepted Warnings Or Follow-Ups

- Named labels for `/emerging` / `/planned-toc` / top-level `/overview` stay deferred (`design.md` §13).
- T-1 Reviewer ADVISORY: SBB-TEST-2 reads `navigateByUrl.mock.calls[0][0]` unguarded — not a task.
- Band heading removal that was already in the working tree landed in the same band commit as the Back deletion.
- `test-report.md` / `validation-report.md` never authored — accepted at archive.
- Do not promote SBB-DD-1/2 into `docs/trd/trd.md` from this branch (shared-file discipline).

## Historical Notes

- Live surface is `app-reporting-program-band` (`KZ-changes--kp-report-modal-auto-create-1`), not `entity-details.component`.
- SBB-DD-1 accepted losing “Back → previous SP”; sidebar remains that hop.
- SBB-R-3 already required tab switches to exit to the catalog. The always-same label was specified; the owner still dropped the control.
- Commits: `6dd526eb7` (red tests), `164817794` (resolver), `fff881de5` (remove band Back).
