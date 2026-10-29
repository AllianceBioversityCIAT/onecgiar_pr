# Kaizen Entry — changes/replicated-innovation-reminders

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/replicated-innovation-reminders` |
| Date | 2026-10-26 |
| Branch | qa-development-2026-ss (spec branch; default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 15 (T-8 superseded by T-15) | tasks.md |
| Reviewer FAIL rework attempts | ≥ 5: T-4, T-5 and T-6 (rev 1), T-12 and T-13 (rev 2) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 3 + 1 mini (R-5 Send again) | execution.md — Pivot Record blocks |
| PRODUCT_BUGs | — (no test-report) | — |
| Validation FAIL / WARN | — (no validation-report). PR #786 review: 4 comments, 0 blocking | PR #786 |
| Budget | 15 tasks after revision 2 (8 planned) | tasks.md Document Control |
| Drift attributable | none recorded | docs/specs/audits/ |

## Lessons

- **KZ-changes--replicated-innovation-reminders-1 — The recipient rules were specified from a meeting summary, before the requester saw who would actually be emailed. That caused two Pivots and a rewrite of half the tasks.** (Product, High)
  - **Root cause:**
    - R-2/R-3 fixed To = Lead Contact Person and CC = coordinators + MELIA, from the 2026-10-19 call.
    - The first time Nicoleta saw real PROD volumes (461 leads, about 13k CC copies, 435 copies for one person) and the developer-vs-lead comparison was after revision 1 had shipped.
    - Her answer replaced the whole recipient model (revision 2, T-9..T-15).
  - **Evidence:** execution.md — "Pivot Record: RIR-R-3 CC fan-out — 2026-10-19"; "Pivot Record: recipient model per Nicoleta — 2026-10-23"; memory notes of 2026-10-20/21 (the PROD simulation was sent to Nicoleta).
  - **Standardization:** → P1
- **KZ-changes--replicated-innovation-reminders-2 — The seed migrations that resolve reference rows were validated only on TEST, so the release reviewer had to ask for the PROD check.** (Product, Medium)
  - **Root cause:**
    - T-7/T-15 HITL ran the seeds on prdb, and the seed throws if a CLARISA center is unresolved.
    - No task required the same read-only resolution query on PROD before opening the release PR.
    - Cristian flagged it in PR #786, and it was then checked by hand (13/13).
  - **Evidence:** PR #786 comment "Database Migration – Production Validation"; execution.md "2026-10-26 — Production release (PR #786)".
  - **Standardization:** → P2

## Noted, not a lesson

- **UI enablement drifted from the server guard:** `canSendAgain` checked SENT only, while R-5 (amended) blocks a kind with an open campaign. Cristian caught it in review, and it was fixed in `5af580414`. This is a one-off; the review advisory was already in the log on 2026-10-23 and was not actioned before release.
- **Recurrence of KZ-changes--phase-management-redesign P3:** the hourly reminders cron runs from any local `start:dev` against the shared prdb + prod mailer. Mitigated by the non-prod redirect (R-12); no new item.
- **A Pivot without user approval of the follow-up scope** did not occur. Every Pivot was approved before execution. Kept as positive evidence for the gated mode.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` (assumptions / open questions section) |
| Edit | "Features that email or notify people: before approval, show the requester a PROD dry-run table (recipients per role, max copies per person, unreachable count) and record their sign-off on the recipient rules." |
| Severity | High |
| Status | pending |
| Upstream | Recommend to the AKILI methodology repo (generic) |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (rollout & verification checklist) |
| Edit | "Migrations that resolve reference rows (CLARISA catalogues, lookups) or depend on existing rows: run the same resolution as a read-only query on PROD and record the result before the release PR." |
| Severity | Medium |
| Status | pending |
| Upstream | — (project-specific wording; the generic form fits AKILI too) |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-server/CLAUDE.md` §2 Module map |
| Edit | Add a row: "`api/replicated-innovation-reminders/` · `/api/replicated-innovation-reminders/*` · Admin-only reminder campaigns for replicated innovations in Editing (hourly cron, RabbitMQ email, non-prod redirect via `rir_test_recipient_email`)." |
| Severity | Low |
| Status | pending |
