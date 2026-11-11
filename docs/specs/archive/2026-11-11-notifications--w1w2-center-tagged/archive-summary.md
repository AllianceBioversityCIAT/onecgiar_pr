# Archive Summary — notifications/w1w2-center-tagged

> **Outcome:** delivered and **in production**. All code and spec commits (`66f12c3f3`, `92e1c83a7`, `4d0dcab6a`, `79cc05979`, `3a339ff3f`) are on `master`, `staging` and `performance-refactor`. 6/6 tasks are done and all 5 T6 PRTest gates passed on 2026-10-01.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | W1/W2 + IPSR "CG Center tagged" informational notification |
| Owner | Santiago Sanchez |
| Ticket | none (D-5) |
| Archived on branch | `qa-development-2026-ss` (spec branch, not apply-capable) |
| Archived by | `/akili-archive`, 2026-11-11 |

## 2. Original Spec Path

`docs/specs/notifications/w1w2-center-tagged/`

## 3. Archive Date

2026-11-11

## 4. Final Status

| Check | Result |
|---|---|
| Tasks | 6/6 `[x]` (WCT-T-1 … WCT-T-6) |
| `test-report.md` | absent. Accepted: scoped Jest suites (server 4 suites/112 tests, client 6 suites/287 tests) live in `execution.md` › Final Verification |
| `validation-report.md` | absent. Accepted: WCT-T-6 manual PRTest gates 1–5 all pass (`execution.md` › WCT-T-6) |
| Unresolved FAIL | none |
| Migrations | none (WCT-NFR-2) |

## 5. Requirements Delivered

| Req | Delivered |
|---|---|
| WCT-R-1 | W1/W2 partners save notifies every newly linked Center, **lead included** (D-1 reverted, Pivot WCT-T-2) |
| WCT-R-2 | IPSR contributors save now notifies newly saved Centers, **primary included** (A-1 reverted) |
| WCT-R-3 | SP review of a bilateral result still notifies, with the new sentence (DD-6) |
| WCT-R-4 | Dedup unchanged: a re-save does not re-notify |
| WCT-R-5 | Sentence: "**SP01** has tagged your CG Center as a contributor (ABC) to result **9398** - title", with the SP fallback `a Science Program` |
| WCT-R-6 / R-9 | Green `CG Center tagged` chip, no Accept or Decline |
| WCT-R-7 | Historical rows and BCT Pending Review rows render as before |
| WCT-R-8 | The server stores the bare Center acronym (falls back to the code) |

## 6. Files Changed Summary

| Package | Files |
|---|---|
| Server | `notification/services/result-tagged-notification.service.ts` (+spec), `notification/notification.service.ts` (+spec), `results_by_institutions.service.spec.ts` (tests only), `ipsr/results-package-toc-result/results-package-toc-result.{service,module}.ts` + new spec |
| Client | `shared/constants/notification-type.constants.ts` (+spec), `internationalization/notification-center-tagged.copy.ts` (new), `notification-item.component.{ts,html,spec}`, `update-notification.component.{html,spec}`, `pop-up-notification-item.component.{html,spec}`, `notification-item/CLAUDE.md` |

About 920 LOC, mostly tests, against a 400 LOC tripwire. The user accepted the overrun (`execution.md` › Budget Tripwire).

## 7. Test Evidence Summary

- Every task has a Red run followed by a Green run.
- T2 failability proof: breaking the service 4 ways failed all 5 new tests.
- T3: dropping the `await` on save fails test 5.
- Final: server 112 tests, client 287 tests, `tsc --noEmit` clean, lint clean.
- **Re-verified at archive, 2026-11-11** (`qa-development-2026-ss` @ `3e54aa295`, `--maxWorkers=2`). The same 4 server suites passed with 201 tests, and the same 6 client suites passed with 583 tests. The counts grew because later specs added cases to these shared files. This run, plus 6 weeks in production, stands in for the absent `test-report.md` / `validation-report.md`.

## 8. Validation Summary

| T6 gate | Result |
|---|---|
| 1. Inbox row matches the mockup | pass (prtest result 9730). The bell and toast clause was covered by the user's closure statement |
| 2. W1/W2 save notifies (lead + contributor), re-save silent | pass (result 11864 / 9730) |
| 3. IPSR save notifies, primary included; Nest DI boots | pass (IPSR 9732 / 9733) |
| 4. SP review of a bilateral result | pass (user-reported) |
| 5. Old rows keep the old sentence | pass (user-reported) |

## 9. Accepted Warnings Or Follow-Ups

- [ ] Server `emitFor`: the default lead-in `created by …` and `resolveOwnerProgramCode` are unreachable, and the docstring is stale.
- [ ] Server: share one helper for the duplicated bare/composed push-description branches.
- [ ] Server spec: the T2 rejection test spies on `console.error` instead of `_logger.error` and never asserts the log.
- [ ] Client: the Type filter facet shows "Result Center Tagged" while the chip shows "CG Center tagged".
- [ ] Client: `notification-item/CLAUDE.md` is over the 120-line cap. This debt predates the spec.
- Accepted as is: an acronym that already has parentheses renders doubled, e.g. `(Bioversity (Alliance))`. User decision: "Dejarlo así".
- Accepted as is: one notification per user, each with its own read state. The shared-notification idea was dropped.

## 10. Historical Notes

- **Pivot WCT-T-2 (2026-09-30):** the design claimed "no test asserts lead notification". An existing P2-3214 test did assert it. The user reverted D-1 and A-1, so the lead and primary Centers are notified, and DD-3 was superseded.
- **Diagnostic trap:** `result_id` ≠ `result_code`. The first "no notification" report filtered by code 9396; the real `result_id` is 11864.
- The user overrode the approval mode ("continúa siempre hasta que termines").

## 11. Diagrams

The spec has no `diagrams/` folder. The reference mockup is `mockup/center-tagged-row.png`. No baseline diagram slot is stale.
