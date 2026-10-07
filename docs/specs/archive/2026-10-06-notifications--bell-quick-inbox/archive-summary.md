# Archive Summary — notifications/bell-quick-inbox

> **Outcome:** the bell became a quick inbox.
> - Its badge counts what is waiting, across all phases.
> - Opening it no longer empties it.
> - Primary requests are accepted in two steps; contributions hand off to the inbox step.
> - Contribution declines are confirmed in two steps.
> - A link never decides anything.
> - The popover was redesigned and fits narrow viewports.
>
> Shipped to `origin/performance-refactor` at `6fbbe130d`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/bell-quick-inbox` |
| Ticket | P2-3157 (AC1, AC5) + user-requested extensions |
| Owner | Santiago Sanchez |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` → pushed to `performance-refactor` |

## 2. Original Spec Path

`docs/specs/notifications/bell-quick-inbox/`

## 3. Archive Date

2026-10-06

## 4. Final Status

**DONE.** 12/12 tasks `[x]`: T-1…T-6, plus the user-approved amendments T-7…T-12.
- No standalone `test-report.md` or `validation-report.md`.
- The user asked to archive "lo que ya esté completo".
- `execution.md` carries the test and browser evidence (accepted in place of those reports).

## 5. Requirements Delivered

| Area | Requirements |
|---|---|
| Count and freshness | `BELL-R-1`, `R-3`, `R-4`, `R-11`, `AC-1`, `AC-9` (T-2, T-4) |
| Persistence, no last-viewed | `BELL-R-2`, `R-12`, `BELL-DD-5` (T-4) |
| Inline decisions | `BELL-R-5` (amended: one-click = primary only, two-step confirm), `R-7` (amended: two-step decline), `R-8` (T-3, T-9, T-11, T-12) |
| Hand-off | `BELL-R-6` (incl. "a link never decides", "ToC-carried contribution"), `BELL-DD-4` + Guard (T-5, T-7, T-9) |
| Mark-read | `BELL-R-9`, `AC-8` (T-3 attempt 2) |
| States / layout | `BELL-R-10`, `R-13`, `R-14`, focus NFR, viewport fit (T-4, T-8) |
| Redesign | tabs, cards, "N new", Mark as read (T-10) |

## 6. Files Changed Summary

| Commit | Content |
|---|---|
| `2b46d852d` ✨ feat | 24 client files: `utils/request-decision.*` (new), `results-notifications.service.*`, `results-notifications.component.*`, `notification-item.*` + CLAUDE.md, `pop-up-notification-item/*` + `bell-accept-confirm.service.ts` (new), `shell-topbar/*` + CLAUDE.md, `app.component.*`, `internationalization/bell-quick-inbox.copy.ts` (new) |
| `1b2e1e543` ♻️ specs | Spec amendments T-7…T-12, execution log, reference image |
| `752425129` 🔀 merge | `performance-refactor` brought in before the push |

## 7. Test Evidence Summary

| Check | Result |
|---|---|
| Closing scoped regression (BELL suites) | 25 suites, **920/920** |
| Post-merge scoped regression (BELL + merge-touched) | 44 suites, **1528/1528** |
| eslint (touched files) | clean |
| Red-first per task | observed for every task except the util/row red in T-5a1 (inferred) |

## 8. Validation Summary

Every task passed an independent Reviewer. Rework rounds:

| Task | Attempts | Reason for the extra attempt |
|---|---|---|
| T-1 | 2 | — |
| T-3 | 2 | BELL-R-9 gap |
| T-5 | 2 | D-1, found in the browser |
| T-8 | 2 | Zoom-unaware width |
| T-11 | 2 | Dev-server compile error |

All other tasks passed on attempt 1. There were no HALTs and no pivots.

The browser checklist (T-6) passed items 1, 3, 4, 7 and 8. Items 2, 5 and 6 are **inconclusive (environment)**: the local stack writes the shared `prdb` and the prod mailer.

## 9. Accepted Warnings Or Follow-Ups

- [ ] Run T-6 items 2, 5-confirm and 6 on the QA environment after deploy.
- [ ] Inbox row Accept still accepts ToC-carried contributions in one click (user question).
- [ ] Topbar responsiveness below ~380 px (bell off-screen at 360 px).
- [ ] Stale `declineMode` doc comment (`request-decision.ts:116-117`); `BellAcceptConfirmService` now also covers Decline (rename).
- [ ] Review advisories:
  - [ ] tabs lack tabpanel/`aria-controls` targets;
  - [ ] `shortAge(null)` returns the epoch;
  - [ ] a failed Mark as read gives no feedback;
  - [ ] `window:resize` should call `updatePosition()`.
- [ ] design §13: delete the dead `header-panel` and the legacy pop-up members, endpoint and column.

## 10. Historical Notes

- **Incident:** request 4548 (primary, result 9740) was very likely accepted by an accidental click on a stale bundle against shared `prdb`. The user said it is test data.
- Four parallel sessions shared the checkout: FTD, DSP, eb and BELL. Jest and CT runs were serialised by message.
- `ng serve` silently kept the last good build twice: T-8a2 `viewChild` typing and T-11 `keydown.escape` `$event` typing. `ngc --noEmit` passed both times.
