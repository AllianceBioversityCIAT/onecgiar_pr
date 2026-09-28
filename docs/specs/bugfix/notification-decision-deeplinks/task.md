# Tasks — Notification click destinations for bilateral decision and review-request

## 1. Scope

- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Depth:** Lite + Bug Mode
- **Status:** approved 2026-09-24, not-started
- **Budget (from design §9):** 3 tasks, about 170 LOC, 1-2 review rounds. Exceeding it stops execution for the user.

## 2. Pre-flight

- [ ] `requirements.md` and `design.md` approved
- [ ] OQ-1..OQ-3 accepted as assumptions (requirements §7)
- [ ] `bugfix/notification-decision-center-wording` already committed (it is: `29ef63f2f`), so no working-tree overlap on the notification components

## 3. Tasks

### [x] `NDDL-T-1` — Route builders and navigation service

- **Type:** client
- **Description:** In `bilateral-result-open-route.util.ts` extract two exported pure builders (center-editor route, review-drawer route) and make `resolveBilateralResultOpenRoute` call them, behavior unchanged. Add `shared/services/notification-navigation.service.ts` (root): `reviewRequestUrl(notification)` (sync, from `getProgramCode`, `result_code`, `result_id`) and `decisionUrl$(notification)` (`GET_centersByResultId` → lead center → center-editor URL; empty or error → Result Detail URL, IPSR types 10/11 keep `/ipsr/detail`). Reuse the fallback rule already in the bell's `resultDetailUrl` instead of a second copy.
- **Implements:** NDDL-R-1 (URL for Approved and Rejected), R-2 (URL with `reviewResult` + `reviewResultId`, SP code from `getProgramCode`), R-3 (fallback, no throw), NDDL-NFR-2, NFR-3
- **Files (expected):** `onecgiar-pr-client/src/app/shared/routing/bilateral-result-open-route.util.ts` (+ `.spec.ts`), `onecgiar-pr-client/src/app/shared/services/notification-navigation.service.ts` (+ `.spec.ts`)
- **Depends on:** —
- **Blocks:** `NDDL-T-2`
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** decision notification for result code 9544, id 91, phase 36, centers `[{acronym:'CIMMYT', is_leading_result:1}]` must give `/bilateral/CIMMYT/result/9544?phase=36`. Empty centers and an erroring request must give `/result/result-detail/9544/general-information?phase=36`. Type id 10 must give `/ipsr/detail/9544/...`. Review request with SP `SP01` must give `/result-framework-reporting/entity-details/SP01/bilateral-review?reviewResult=9544&reviewResultId=91`. The existing util spec (`resolveBilateralResultOpenRoute` outputs) must stay green unchanged, which proves the extraction did not move behavior.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-result-open-route.util.spec|notification-navigation.service.spec"` (from `onecgiar-pr-client`); the service cases fail before the service exists and pass after.
  - **Disqualifier:** if the lead-center rule needs a field the centers response does not carry (no `acronym`/`code`), stop and report; do not invent one.
  - **Consumers:** `resolveBilateralResultOpenRoute` is used by Results Center, Programme Results and global search; run `--testPathPattern="results-list.component.spec|programme-results.component.spec|global-search-palette.component.spec"` to confirm they stay green.
  - **What a green Jest spec cannot prove:** that the real backend returns those center fields. Covered by `NDDL-T-3`.
- **Definition of done:**
  - [ ] Committed per convention, subject without apostrophes, `$` or quotes (Jenkins rule in client `CLAUDE.md`)
  - [ ] `npx ng lint --quiet` clean
  - [ ] Util spec unchanged and green; new service spec green
  - [ ] Folder `CLAUDE.md` re-stamped only if a touched folder has one
  - [ ] No token, email or PII logged

### [x] `NDDL-T-2` — Wire the bell and the list (regression tests)

- **Type:** client
- **Description:** Bell (`pop-up-notification-item.component.ts` `onNotificationClick`): review-request branch navigates to `reviewRequestUrl`; decision branch navigates to `decisionUrl$` instead of `home?result=`; mark-as-read and `itemSelected` unchanged. List (`update-notification.component.{ts,html}`): review-request `href` is the full drawer URL; decision rows get a click handler that prevents default, opens a blank tab synchronously, sets its location when `decisionUrl$` resolves, and falls back to the current tab if the tab was blocked; on error or timeout the tab is set to the fallback URL, never left blank. The decision `href` stays Result Detail for context-menu opens. No mark-as-read in the list.
- **Implements:** NDDL-R-1 (both surfaces, main + Reject, bell not `home?result=`), R-2 (both surfaces, drawer params), R-3 (click never dead, never throws), R-4 (bell mark-read + close, list new tab, list does not mark read), R-5
- **Files (expected):** `onecgiar-pr-client/src/app/shared/components/header-panel/components/pop-up-notification-item/pop-up-notification-item.component.ts` (+ `.spec.ts`), `.../results-notifications/components/update-notification/update-notification.component.{ts,html}` (+ `.spec.ts`)
- **Depends on:** `NDDL-T-1`
- **Blocks:** `NDDL-T-3`
- **Estimate:** M
- **Review:** full (changes click navigation on two surfaces and rewrites two delivered bell assertions)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier (Bug Mode, regression):** with result 9544 and CIMMYT as lead center: the bell click on a decision notification calls `router.navigateByUrl('/bilateral/CIMMYT/result/9544?phase=36')` (today it calls `navigate(['/bilateral','CIMMYT','home'], …)`); the list decision click ends in the same URL (today its `href` is Result Detail and no handler exists); the review-request click in both surfaces reaches the URL with `reviewResult=9544&reviewResultId=91` (today: no query params). Centers lookup empty or erroring: Result Detail opens on both, no throw. A list click on an "Approved" row marks nothing read. A row of another type (tagged, contribution, requests) navigates exactly as before.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="pop-up-notification-item|update-notification"` (from `onecgiar-pr-client`); the new decision and review-request cases fail on current code and pass after. Update the existing bell assertions that expect `['/bilateral','CIAT','home']` (two cases) and the review-request assertion without params (one case).
  - **Disqualifier:** if the bell's mark-as-read or `itemSelected.emit()` no longer fires on any of the three clicks, the task is not done even if the URLs are right. If the blank-tab pre-open cannot be asserted without a real `window`, mock `window.open` and record that the popup-blocker behavior itself is unproven (it goes to `NDDL-T-3`).
  - **Consumers:** the bell item (`app.component`, header panel) and the list item are the only callers; other notification types share their click branches, so run the full two specs above, not a subset.
  - **What a green Jest spec cannot prove:** that the drawer opens, that the new tab opens after the async call, and that a popup blocker does not stop it (jsdom has no real tabs or drawer). Covered by `NDDL-T-3`.
- **Definition of done:**
  - [ ] Committed per convention, subject without apostrophes, `$` or quotes
  - [ ] `npx ng lint --quiet` clean
  - [ ] Both spec files green; the three old assertions rewritten, not deleted
  - [ ] No hard-coded English, no new i18n key, no new styles
  - [ ] Folder `CLAUDE.md` re-stamped only if a touched folder has one

### [~] `NDDL-T-3` — Manual look in the browser, amend the parent spec

- **Type:** docs / manual verification
- **Description:** On a local stack with result 9544 style data (CIMMYT lead, SP01 primary), click the three notification types from the bell and from the Notifications list. Include an Approved and a **Rejected** result. Amend `notifications/bilateral-review-decision` (NOTIF-R-4) to point at this spec for the click destination.
- **Implements:** NDDL-R-1, R-2 (drawer really opens), R-3, R-4 (new tab, popup blocker), requirements §8 substitute for the render gap; design §10 Rejected-editor risk
- **Files (expected):** `docs/specs/notifications/bilateral-review-decision/requirements.md` (one-line amendment)
- **Depends on:** `NDDL-T-2`
- **Blocks:** —
- **Estimate:** S
- **Review:** skip-eligible (docs), manual check reported at the HITL pause
- **Verification:**
  - **Falsifier:** any of: the list decision click lands on Result Detail; the bell lands on `home`; "submitted for your review" opens the queue with no drawer; the list decision click opens no tab or an empty tab; a Rejected result lands on a broken or empty page (then Rejected keeps `home?result=` per design §10).
  - **Red run:** n/a (manual, local stack, never a shared server)
  - **Disqualifier:** if a decision or a Rejected result cannot be produced locally without DB steps the user must run, hand those steps to the user and record the check as not done rather than claiming it. A popup-blocked run must be recorded as blocked, not as pass.
  - **Consumers:** none (no shared symbol changed here)
- **Definition of done:**
  - [ ] Bell and list observed for Approved, Rejected and review-request, or the gap recorded
  - [ ] Rejected-editor question answered
  - [ ] NOTIF-R-4 amended
  - [ ] No commit until the user says so

## 4. Dependency graph

```
NDDL-T-1 (builders + service) ──► NDDL-T-2 (bell + list + regression tests) ──► NDDL-T-3 (manual + amendment)
```

Sequential: T-2 needs the service, T-3 needs both surfaces.

## 5. Test plan and coverage closure

| Test ID | Type | Covers | Location |
|---|---|---|---|
| NDDL-TEST-1 | unit | R-1 URL (Approved, Rejected), R-2 URL and SP code, R-3 fallback (empty, error, IPSR), extraction leaves the util unchanged | `bilateral-result-open-route.util.spec.ts`, `notification-navigation.service.spec.ts` |
| NDDL-TEST-2 | unit (bell) | R-1 bell destination, R-2 bell drawer URL, R-3 no throw, R-4 mark-read + close, R-5 other types | `pop-up-notification-item.component.spec.ts` |
| NDDL-TEST-3 | unit (list) | R-1 list destination, R-2 `href`, R-3 blank-tab fallback, R-4 no mark-read, R-5 | `update-notification.component.spec.ts` |
| NDDL-MANUAL-1 | manual | R-2 drawer opens, R-4 new tab and blocker, Rejected editor | `NDDL-T-3` |

| Clause | Owner |
|---|---|
| R-1 main scenario (list `9544` → `/bilateral/CIMMYT/result/9544?phase=36`) | T-1 (URL), T-2 (list wiring), T-3 (real) |
| R-1 `BUT` not Result Detail | T-2 (list assertion), T-3 |
| R-1 `AND IT MUST` same from the bell (not `home?result=`) | T-2 (bell), T-3 |
| R-1 Reject scenario | T-1, T-2, T-3 (Rejected editor) |
| R-2 scenario (drawer opens from list and bell) | T-1 (URL), T-2 (both surfaces), T-3 (drawer really opens) |
| R-2 `BUT` not stop at the queue | T-2 (params asserted), T-3 |
| R-2 `AND IT MUST` SP code from `getProgramCode` | T-1 |
| R-3 scenario + `BUT` no dead click / no throw | T-1 (service), T-2 (surfaces) |
| R-4 | T-2 (bell mark-read/close, list new tab, list no mark-read), T-3 (real new tab, blocker) |
| R-5 | T-2 (existing cases stay green) |
| NFR-1, NFR-2, NFR-3 | T-1, T-2 (diff has no server file, single rule, no logging) |

## 6. Estimated LOC and PR strategy

About 170 LOC (source about 70, tests about 100). Under the 400 LOC threshold: **one PR**. It can ride in the same PR as `bugfix/notification-decision-center-wording`, which is already committed on `qa-development-2026-ss`. Suggested review order: util and service, then bell, then list, then the spec amendment.
