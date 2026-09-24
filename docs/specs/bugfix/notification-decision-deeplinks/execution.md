# Execution — Notification click destinations for bilateral decision and review-request

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/notification-decision-deeplinks` |
| Started | 2026-09-24 |
| Approval Mode | gated (user asked to run all tasks to the end on 2026-09-24) |
| Note | Task file is `task.md` (not `tasks.md`) |

## Task Execution History

### PASS — 2026-09-24 — NDDL-T-1 Route builders and navigation service

- **Attempts:** 1 Implementer, 1 Reviewer
- **Attempt 1 files:** `shared/routing/bilateral-result-open-route.util.ts` (builders `buildCenterEditorRoute`, `buildReviewDrawerRoute`, serializer `bilateralRouteToUrl`; resolver calls builders), new `shared/services/notification-navigation.service.ts` (+ `.spec.ts`, 7 tests)
- **Implementer verification:** util + service specs 2 suites / 17 tests green; consumers (results-list, programme-results, global-search-palette) 4 suites / 307 green; `ng lint --quiet` clean; falsifier URLs all match. Red run not observed (service and spec written together).
- **Reviewer verdict:** PASS (checklist mode). Behavior-identical extraction, R-1/R-2/R-3/NFR-2/NFR-3 hold.
- **Requirements covered:** NDDL-R-1 (URL), R-2 (URL), R-3 (fallback), NFR-2, NFR-3
- **Decisions:** `reviewRequestUrl` returns null without SP code; `decisionUrl$` can emit null when no center and no result code.
- **Implementer Not Done / Assumptions (carried, owned by T-2):** the bell's private `resultDetailUrl` still duplicates `NotificationNavigationService.resultDetailUrl`; T-2 must delete it and delegate.
- **ADVISORY (recorded, no rework):**
  - Readability/NFR-2: the duplicate above is transient only if T-2 removes it.
  - Reliability: no `timeout()` in `decisionUrl$` (design §10 says error or timeout must not leave a blank tab); tab-side timeout belongs to T-2.
  - Reliability (minor, inherited): missing `obj_version.id` yields `?phase=undefined`.

### Forward pointers for NDDL-T-2 (must be in its brief)

1. Delete bell's private `resultDetailUrl`, call `NotificationNavigationService.resultDetailUrl`.
2. List blank-tab flow must handle timeout (hung request) by setting the tab to the fallback URL.

### PASS — 2026-09-24 — NDDL-T-2 Wire the bell and the list (regression tests)

- **Attempts:** 1 Implementer, 1 Reviewer (full review)
- **Attempt 1 files (client):** `pop-up-notification-item.component.ts` (+spec), `update-notification.component.{ts,html}` (+spec), `notification-navigation.service.ts` (added `DECISION_URL_TIMEOUT_MS = 8000`)
- **Implementer verification:** 4 suites / 56 tests green (bell, list, service, util); `ng lint --quiet` clean. No red run observed (impl and specs written together).
- **Reviewer verdict:** PASS. Falsifier URLs met on both surfaces; fallbacks (empty, error, hung) land on Result Detail; bell mark-read + close hold on all paths; other types unchanged.
- **Requirements covered:** NDDL-R-1, R-2, R-3, R-4 (mocked tab only), R-5
- **Forward pointers from T-1:** both closed (bell private `resultDetailUrl` deleted; timeout handled on both surfaces).
- **Decisions:** timeout 8000 ms chosen by Implementer (spec fixes no value). List keeps private `legacyResultUrl` for non-bilateral rows so R-5 holds (IPSR bases unchanged). Two extra bell tests rewritten from notifications-list fallback to Result Detail per R-3, still asserting exact URLs.
- **Not Done / Assumptions:** popup-blocker and real tab/drawer behavior unproven (window.open mocked) -> NDDL-T-3.
- **ADVISORY (recorded, no rework, no new task):**
  - Reliability: bell closes only when the lookup resolves (up to 8 s on a hung request); check lag at T-3.
  - Resilience: list decision row with no `result_code` closes the pre-opened tab and does nothing; bell uses `generateUrlLink`. Outside R-3.
  - Readability: list keeps two URL sources; reason lives only in review.
  - Risk: middle/ctrl-click on a decision row lands on Result Detail via href (accepted by design §7); note in T-3.

### PARTIAL — 2026-09-24 — NDDL-T-3 Manual look in the browser, amend the parent spec

- **Done:** NOTIF-R-4 in `notifications/bilateral-review-decision/requirements.md` amended with a pointer to this spec. Docs only, review skip-eligible.
- **Not done (blocked, recorded, not claimed):** manual check of bell and list for Approved, Rejected and review-request on a local stack. It needs a running client + server + DB with a bilateral result (CIMMYT lead, SP01) in Approved and Rejected states and a real popup blocker; producing those needs DB steps and a browser session that the agent must not run against shared data. Left for the user.
- **Checklist for the user (falsifiers from task.md):**
  1. Bell + list: Approved decision lands on `/bilateral/<center>/result/<code>?phase=<n>` (not Result Detail, not `home`).
  2. Rejected decision: does the center editor render it? If broken/empty, Rejected keeps `home?result=` (design §10) — small design change.
  3. "Submitted for your review": opens the queue with the review drawer open (`reviewResult` + `reviewResultId`).
  4. List decision click: new tab opens, not empty, not blocked (test with the popup blocker on); hung/slow lookup ends on Result Detail.
  5. Bell: no perceptible lag before the pop-up closes (advisory); middle/ctrl-click on a list decision row lands on Result Detail by design.
- **Task status:** `[~]` until the user reports the manual result. No commit made.
