# Archive Summary — Primary request rows show the SP decision only after the SP decides

**Outcome:** shipped. A primary Science Program request row in the Notifications inbox no longer shows a fake "Accepted by <Center submitter>" caption and chip while the result is Pending Review. It shows **Accepted** only after the SP approves the result, and the caption names the SP code, not a person. Both tasks are done and the code task passed its first review. The "SP rejected" state is unreachable in the inbox by design (see section 9).

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/primary-request-decision-state` (prefix `PRDS`) |
| Ticket | Jira P2-3157 (QA finding by Angel Jarrin, PRTest result 9864) |
| Owner | Santiago Sanchez |
| Depth / Mode | Lite, Bug Mode, client-only |
| Approval mode | `gated` |
| Branch | `qa-development-2026-ss` |

## 2. Original Spec Path

`docs/specs/bugfix/primary-request-decision-state/`

## 3. Archive Date

2026-10-21

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 2 of 2 done (PRDS-T-1 Reviewer PASS, attempt 1; PRDS-T-2 HITL PASS, step 4 N/A by design) |
| `test-report.md` | **absent, accepted by the owner** (evidence: per-task Jest runs + PRTest check) |
| `validation-report.md` | **absent, accepted by the owner** (evidence: Reviewer PASS + PRTest check) |
| Commits | `146747a0b` code · merged via `7536e0788` · on PRTest through `performance-refactor` `686445be9` |

## 5. Requirements Delivered

| Requirement | Delivered by |
|---|---|
| `PRDS-R-1` no decision caption or chip unless the result is 6 or 7 | T-1 (red then green); T-2 step 2 on row 9864 |
| `PRDS-R-2` Accepted / Rejected from result status, caption "<verb> by <SP code>", no person or date | T-1; T-2 step 3 on row 9861 ("Accepted by SP03"). The rejected branch is kept as a guard but unreachable (section 9) |
| `PRDS-R-3` "Needs your review" only at status 5, neutral kind label otherwise | T-1; T-2 steps 2 and 3 |
| `PRDS-R-4` non-primary rows unchanged | T-1 (NOTIF-T-10/15/16 untouched); T-2 step 5 on rows 9795 and 9765 |

## 6. Files Changed Summary

| Area | Files (all under `onecgiar-pr-client/src/app/`) |
|---|---|
| Copy | `internationalization/contribution-request-drawer.copy.ts` (3 strings) |
| Component | `notification-item.component.ts` (`primaryDecision` getter, status-aware `requestKindLabel`), `.html` (`@case (2)`/`@case (3)` footers) |
| Tests | `notification-item.component.spec.ts` (11 new PRDS tests, 2 fixtures given `status_id: 5`) |
| Docs | folder `CLAUDE.md` (PRDS-T-1 section, `Verified:` stamp, PRA-T-2 bullet marked amended) |
| Size | about 55 source, 111 spec, 10 docs LOC (budget ~60 / ~120 / ~15), 1 review round (budget 1) |

## 7. Test Evidence Summary

| Run | Result |
|---|---|
| Red, PRDS tests on unchanged source | 9 failed, 2 passed (the 2 are the R-4 non-primary rows) |
| Green, PRDS tests | 11 passed (441 skipped) |
| `--findRelatedTests` on touched files | 41 suites, 1830 tests passed (first run failed 2 step-5 fixtures, then fixed) |
| Lint | `npx ng lint --quiet --lint-file-patterns <touched files>`: all pass (plain `npx eslint` cannot run in the client) |

## 8. Validation Summary

- **Review:** T3 Reviewer PASS on PRDS-T-1, attempt 1, no FAIL.
- **PRDS-T-2 on PRTest** (read-only, Claude in Chrome; the user performed the approve and reject):

| Step | Result |
|---|---|
| 1 Served bundle (`chunk-Y44CKC46.js`) contains the change | PASS |
| 2 Row 9864 (pending): no caption, no chip; "Needs your review" + CTA | PASS |
| 3 Row 9861 (approved): "Accepted by SP03", chip Accepted, neutral kind label, no CTA | PASS (also closes advisory 1: SP code present on the real payload) |
| 4 Rejected primary row (9742) | N/A by design: the server hides it (PNR-DD-3/4) |
| 5 Contribution rows 9795, 9765 unchanged | PASS |

- **Inbox scan:** 757 rows, 7 primary rows; none showed a person-based caption.

## 9. Accepted Warnings Or Follow-Ups

| Follow-up | Owner |
|---|---|
| Post the Jira P2-3157 comment for QA (Angel) noting the fix | Santiago |
| "SP rejected" scenario is unreachable while `bugfix/primary-notify-on-submit-regression` PNR-DD-3/4 stands (`PRIMARY_PREPARATION_STATUS_IDS` hides a Rejected primary card). Recorded in `requirements.md` section 9; the client `rejected` branch stays as a harmless guard | accepted |
| Optional: add a `primaryDecisionWord` getter (the chip-word ternary appears twice in `#primaryDecisionFooter`) | code follow-up |
| Optional: one-line note in the folder `CLAUDE.md` that the caption uses the raw SP code, not `\| spLabel`, by design | code follow-up |
| Legacy pre-PRA primary rows where an SP user truly accepted lose "Accepted by <name>" | accepted (proposal section 9) |
| CodeGraph re-index (`codegraph sync`) | Santiago |

## 10. Historical Notes

- Root cause: since PRA, `transferPrimary` writes the primary `share_result_request` row as ACCEPTED with `approved_by` = the submitting Center user. The inbox footer, written before PRA, read that as "the SP accepted". The fix is client-only and derives the footer from `obj_result.status_id` (DD-1); the server write is kept because it lists the result in the SP inbox.
- This was the fix for a PRA-T-3 HITL finding (`notifications/primary-review-not-accept`).
- Proposal option A (status-driven footer) was chosen over B (server "system" request status) and C (hide the footer).
