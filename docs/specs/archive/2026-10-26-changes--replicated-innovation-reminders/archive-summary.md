# Archive Summary — Replicated innovation reminders

**Outcome:** shipped to PROD on 2026-10-26 (PR #786). PMU admins schedule two reminder campaigns per Reporting phase (Q4 notice and Final reminder). PRMS emails the people responsible for replicated innovations still in Editing.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/replicated-innovation-reminders/` |
| Ticket | INC-165323 (Nicoleta Trifa; Marc Schut in CC) |
| Archive date | 2026-10-26 |
| Final status | done — all 15 tasks PASS; T-8 superseded by T-15 |
| Branch at archive | `qa-development-2026-ss` (spec branch; default is `master`) |

## Requirements delivered

| Area | Delivered |
|---|---|
| Scope (R-1) | Replicated Innovation Development and Use results, in the active Reporting phase, still in Editing. W1/W2 and W3 included |
| Recipients (R-2, R-3, R-4, R-16, R-17, R-18) | A digest per reachable developer (active PRMS user), with the SP MELIA focal points in CC. One MELIA summary per SP when no developer is reachable. One Center MEL email per lead center for W3. No coordinators. Unreachable results listed in the preview |
| Campaigns (R-5, R-6, R-7) | Schedule in local time, edit, cancel, preview, Send now, and Send again. One open campaign per kind. Hourly cron |
| Safety (R-8, R-9, R-10, R-12, R-14) | Exactly once per message (`message_key`), with an atomic claim for the 2 PROD servers. Dry-run preview. Admin-only (403). Non-prod redirect to a test address. Batches of 25 with a 2 s pause |
| Content (R-11) | Nicoleta's copy for 3 templates. `[PRMS Testing]` label outside prod. Result ID and title both link to the result page of the active phase |

## Files changed (summary)

| Package | What |
|---|---|
| Server `api/replicated-innovation-reminders/` | Module, controller, service, cron, dispatcher, developer parser, message builder, repositories, entities, DTOs + specs |
| Server `migrations/` | `1791500000000` tables, templates and parameters · `1791600000000` MELIA seed · `1791700000000` recipient model v2 · `1791800000000` Center MEL seed · `1791900000000` Result ID hyperlink |
| Client | The reminders section in Phase management → Reporting, the preview drawer, the interface, and the copy file (`internationalization/`) + specs |

Commits: 3015c3bcd, 1e18b62f0, 24329937e, 383071075, cf0c1bdb4, 7bde5c3d9, 5af580414 (follow-up, not yet released).

## Test evidence

| Evidence | Result |
|---|---|
| Unit / component specs | Green per task (see `execution.md`); client component spec 30/30 |
| prdb migrations | Run, revert and run for every migration; template baseline unchanged outside RIR rows |
| PRTest | v1 403 + redirect (2026-10-20). Q4 Send now 15/15. Cron Final reminder 16/16. Send again campaign 10 16/16. ID links open phase 36 |
| PROD pre-checks | 13 seed centers resolve, Alliance codes distinct; 0 open campaigns |
| PROD post-deploy | `center_mel_focal_point` = 17; Preview about 496 messages |

## Validation

No separate `test-report.md` / `validation-report.md`. Accepted by the user: per-task Reviewer PASS, the HITL evidence above, and Cristian's PR #786 review (4 comments, all answered, approved).

## Accepted follow-ups

| # | Follow-up | Owner |
|---|---|---|
| F-1 | Release `5af580414` (Send again disabled while the kind is open) | Next staging → master |
| F-2 | SMTP sending limits (Infra ticket) | Infra |
| F-3 | Refresh the Center MEL and MELIA lists before each campaign | PMU / Santiago |
| F-4 | A FAILED campaign that keeps failing blocks its kind (the 409 text says "cancel", but FAILED cannot be cancelled) | Backlog |
| F-5 | Innovation packages replication, and the automatic "Inactive – not updated" closure (Jan 2027) | Separate specs after the phase closes |
| F-6 | The client eslint config is broken (it could not lint the touched file) | Backlog |

## Historical notes

- **Three Pivots:**
  - 2026-10-19: data reality vs R-1/R-4.
  - 2026-10-19: CC fan-out, withdrawn by the user.
  - 2026-10-23: recipient model per Nicoleta (revision 2: developers, MELIA and Center MEL instead of Lead Contact plus coordinators).
- **One mini-Pivot (R-5 Send again):** in testing, SENT used to be terminal.
- The Center MEL list came from Nicoleta's Feb 2026 deck and the MELIAF stocktake. Three people had no resolvable email and were left out.
