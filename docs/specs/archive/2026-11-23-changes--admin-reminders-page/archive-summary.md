# Archive Summary — Admin Reminders page (ARP)

> **Outcome:** Reminders moved out of Phase management into its own admin page (`/admin-module/reminders`) with a Reminders tab (cards, history, delivery bar, single scheduler) and a Center focal points tab. Since ARP-T-6 every time is shown and entered in UTC with the local equivalent. Verified on PRTest 2026-11-18 (T-5) and 2026-11-23 (T-6).

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/admin-reminders-page` (ARP) |
| Ticket | SR-167303 |
| Owner | Santiago Sanchez |
| Archived on branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |

## 2. Original Spec Path

`docs/specs/changes/admin-reminders-page/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Done — 6/6 tasks `[x]`.** Two Reviewer FAILs fixed on attempt 2 (T-1, T-2). One budget tripwire after T-2 (owner continued; budget revised). T-5 closed `REVIEW_SKIPPED` (manual check, no diff). T-6 added by owner decision 2026-11-18.

## 5. Requirements Delivered

ARP-R-1..R-10 and ARP-NFR-1..4 per `execution.md` (T-1 route/sidebar/tabs, T-2 cards/history/actions, T-3 scheduler, T-4 focal points, T-6 UTC display and input).

## 6. Files Changed Summary

Client only: `pages/admin-section/pages/reminders/**` (page, `replicated-innovation-reminders`, `center-focal-points`), `shared/routing/routing-data.ts`, `reporting-nav-sidebar`, phase-management `reporting` component/module, `internationalization/replicated-innovation-reminders.copy.ts`. T-6 in `0da2380e4`; spec records `41b83c774`; merged into `performance-refactor` `733ff4c5e`.

## 7. Test Evidence Summary

No `test-report.md`. Per-task Jest with falsifiers and non-author re-runs in `execution.md`; T-6 last re-runs 25 suites / 856 tests (qa-dev) and 870 (merged perf), `tsc` 0.

## 8. Validation Summary

No `validation-report.md`. PRTest HITL: T-5 steps 1-5 PASS (2026-11-18); T-6 UTC display, label, note and local equivalent PASS (2026-11-23).

## 9. Accepted Warnings Or Follow-Ups

- [ ] Live check of the preview drawer and `more_vert` keyboard menu on a PENDING campaign (none exists on PRTest; creating one writes to the shared DB and mailer).
- [ ] T-6 Reviewer advisories: `aria-describedby` + `aria-live` on the scheduler note/local line; anchor the `/Nov 20, 2026.*4:00/` regex; pin the UTC suffix on "Scheduled for" / Next send; remove dead `utcClock` in `reminder-time.util.ts`; tests assume en-US locale.
- [ ] T-5 visual advisories: scheduler not in the accents-1 strip; `h1` colour and active-tab underline.
- [ ] Console `ERROR undefined` at the phase-management redirect (not triaged).

## 10. Historical Notes

- T-6 came from the owner after T-5: show and enter UTC instead of local time, with the local equivalent beside it.
- The T-6 code sat uncommitted in the shared checkout until 2026-11-23, when it was committed alongside a cleanup of that checkout.

## 11. Diagrams

None.
