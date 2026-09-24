# Tasks — Bilateral decision notification wording per recipient

## 1. Scope

- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Depth:** Lite + Bug Mode
- **Status:** executed (all 3 tasks [x]; commit pending user go-ahead)
- **Budget (from design §9):** 3 tasks, about 140 LOC, 1-2 review rounds. Exceeding it stops execution for the user.

## 2. Pre-flight

- [ ] `requirements.md` and `design.md` approved
- [ ] OQ-1..OQ-3 accepted as assumptions (requirements §7)
- [ ] No in-flight spec on the same notification code (`notifications/bilateral-review-decision` is shipped; this amends it)

## 3. Tasks

### [x] `NDCW-T-1` — Server: split emit, stored center text, matching live copy

- **Type:** server
- **Description:** In `emitBilateralReviewNotification`, separate the submitter from the other recipients and emit twice: submitter with no `text`, others with `renderedText` = `where your center was tagged, has been approved|rejected by the Science Program <SPXX>.` (no code: `… by the Science Program.`). Resolve the owner SP code at emit time; a failed lookup degrades to the no-code sentence. Make `buildBilateralReviewDescription` (and its `switch`) accept `storedText` and, when present, return `The result <code> - <title>, <text>`. Recipients, no settings filter and no email are unchanged.
- **Implements:** NDCW-R-1 (submitter emit has no text), R-2 (main, Reject, `BUT` no "Your Result"), R-3 (toast equals list), R-4 (one row per recipient, submitter who is also a Center User, no settings filter, no email), NDCW-NFR-1, NFR-2, NFR-3
- **Files (expected):** `onecgiar-pr-server/src/api/results/results.service.ts` (`:2841`, `:2890`), `onecgiar-pr-server/src/api/notification/notification.service.ts` (`:821-836`, `:871`), specs `results.service.spec.ts`, `notification.service.spec.ts`
- **Depends on:** —
- **Blocks:** `NDCW-T-3`
- **Estimate:** M
- **Review:** full (recipient split changes emit shape and the socket copy)
- **Verification:**
  - **Falsifier:** submitter S, Center User C, decision Approve on SP03. Expect: emit call 1 targets `[S]` with no `renderedText`; emit call 2 targets `[C]` with `where your center was tagged, has been approved by the Science Program SP03.`; the toast description for C is `The result <code> - <title>, where your center was tagged, has been approved by the Science Program SP03.`. Also: S who is also a Center User yields one emit, to S, without text; owner-code lookup that throws yields the no-code sentence and no thrown error.
  - **Red run:** `npx jest --silent --reporters=summary --forceExit --testPathPattern="results.service.spec|notification.service.spec"` (from `onecgiar-pr-server`); the new cases fail on current code (single emit, no text) and pass after.
  - **Disqualifier:** if the owner initiative code cannot be read at emit without a new relation or query pattern that touches more than `results.service.ts`, stop and re-specify (a change to the notification payload would widen scope).
  - **Consumers:** `getBilateralReviewRecipientIds` (private, only `emitBilateralReviewNotification`); `buildBilateralReviewDescription` (private, only the `switch`); check with grep that nothing else calls them.
  - **What a green spec cannot prove:** the real socket delivery and DB row. Covered by `NDCW-T-3`.
- **Definition of done:**
  - [ ] Committed per convention, subject without apostrophes, `$` or quotes (Jenkins rule in client `CLAUDE.md`)
  - [ ] `npx eslint` on touched files clean
  - [ ] Specs updated (existing call-count assertions) and new cases green
  - [ ] No migration, no `/api/bilateral/*` change, no bilateral change-log row
  - [ ] No token, email or PII logged

### [x] `NDCW-T-2` — Client: center wording when `text` is present, attached comma

- **Type:** client
- **Description:** For `BILATERAL_RESULT_APPROVED` and `BILATERAL_RESULT_REJECTED`, `getResultNotificationTextParts` returns `{ prefix: 'The result', linkTrailer: ',', suffix: notification.text.trim(), emphasizePrefix: false }` when `text` is non-empty, and today's `✅|❌ Your Result` parts otherwise. Add optional `linkTrailer` to `NotificationTextParts`; `buildResultNotificationText` concatenates identity and trailer with no space. Render `{{ parts.linkTrailer }}` immediately after the result link in both templates.
- **Implements:** NDCW-R-1 (no `text` keeps "Your Result", `BUT` no center wording), R-2 (main, Reject, `AND IT MUST` no space before the comma, `BUT` no "Your Result"), R-3 (list side), R-5
- **Files (expected):** `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` (+ `.spec.ts`), `.../header-panel/components/pop-up-notification-item/pop-up-notification-item.component.html`, `.../results-notifications/components/update-notification/update-notification.component.html`
- **Depends on:** —
- **Blocks:** `NDCW-T-3`
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** notification `{ type: 'Bilateral Result Approved', text: 'where your center was tagged, has been approved by the Science Program SP03.', result 9561 }` must flatten to exactly `The result 9561 - <title>, where your center was tagged, has been approved by the Science Program SP03.`. The same notification with `text: null` must give `✅ Your Result 9561 - <title> has been Approved by the Science Program SP03.`. Rejected variants likewise. A flatten of `<title> , where` fails the test.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="notification-type.constants.spec|pop-up-notification-item|update-notification"` (from `onecgiar-pr-client`); the new center-case assertions fail on current code.
  - **Disqualifier:** if either template's whitespace rules make `{{ trailer }}` render a space before the comma even when adjacent to the link, stop and re-specify (DD-3); do not fall back to a comma-leading suffix.
  - **Consumers:** `getResultNotificationTextParts` (pop-up item, update-notification), `buildResultNotificationText` (pop-up item, `filter-notification-by-search.pipe.ts`); run their specs.
  - **What a green Jest spec cannot prove:** the rendered spacing in the real DOM (jsdom does not lay out text). Covered by `NDCW-T-3`.
- **Definition of done:**
  - [ ] Committed per convention, subject without apostrophes, `$` or quotes
  - [ ] `npx ng lint --quiet` clean for touched files
  - [ ] Jest specs green for the three patterns above
  - [ ] No new i18n key (sentence is server-composed, design §7); no hard-coded English added beyond the lead-in `The result` already used by sibling types
  - [ ] Folder `CLAUDE.md` re-stamped only if a touched folder has one

### [x] `NDCW-T-3` — Manual look at both variants, amend the parent spec

- **Type:** docs / manual verification
- **Description:** Trigger (or seed) a decision on a bilateral result as SP member, then read the submitter row and a lead-center Center User row, in the bell pop-up and in the notifications list, plus the live toast for an online user. Amend `notifications/bilateral-review-decision` (NOTIF-R-2) to point at this spec for the per-recipient wording.
- **Implements:** NDCW-R-3 (toast equals list, real DOM), R-2 `AND IT MUST` spacing in the browser, requirements §8 substitute for the render gap
- **Files (expected):** `docs/specs/notifications/bilateral-review-decision/requirements.md` (one-line amendment)
- **Depends on:** `NDCW-T-1`, `NDCW-T-2`
- **Blocks:** —
- **Estimate:** S
- **Review:** skip-eligible (docs) with the manual check reported at the HITL pause
- **Verification:**
  - **Falsifier:** any of: submitter sees "where your center was tagged"; a Center User sees "Your Result"; a visible space before the comma; toast text differs from the list text.
  - **Red run:** n/a (no test gate; manual, run against a locally started stack, not against a shared server)
  - **Disqualifier:** if a decision cannot be triggered locally without DB-connected steps the user must run, hand those steps to the user and record the check as not done rather than claiming it.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] Both variants observed in pop-up and list (and toast if a socket session is available), or the gap recorded
  - [ ] NOTIF-R-2 amended
  - [ ] No commit until the user says so

## 4. Dependency graph

```
NDCW-T-1 (server)  ──┐
                     ├── NDCW-T-3 (manual check + parent-spec amendment)
NDCW-T-2 (client)  ──┘
```

T-1 and T-2 are independent and Parallel-safe (different packages, no shared symbol).

## 5. Test plan and coverage closure

| Test ID | Type | Covers | Location |
|---|---|---|---|
| NDCW-TEST-1 | unit (server) | R-1 submitter emit without text; R-2 center emit with text, approve and reject; R-4 one row per recipient, submitter-also-center, no settings filter, no email; NFR-2 lookup failure | `results.service.spec.ts` |
| NDCW-TEST-2 | unit (server) | R-3 toast description equals center sentence; legacy branch without text | `notification.service.spec.ts` |
| NDCW-TEST-3 | unit (client) | R-1 legacy parts; R-2 center parts, flattened string, no `title ,`; R-5 no-text fallback | `notification-type.constants.spec.ts` |
| NDCW-MANUAL-1 | manual | R-2 spacing and R-3 in the real DOM/socket | `NDCW-T-3` |

| Clause | Owner |
|---|---|
| R-1 scenario + `BUT` not "where tagged" | T-1 (no text on submitter emit), T-2 (client legacy render) |
| R-2 main scenario, `BUT` no "Your Result", `AND IT MUST` no space | T-1 (stored/desc text), T-2 (parts, flatten, templates), T-3 (real DOM) |
| R-2 Reject scenario | T-1, T-2 |
| R-3 | T-1 (description), T-2 (list), T-3 (real) |
| R-4 + submitter-also-Center-User scenario | T-1 |
| R-5 | T-2 |
| NFR-1, NFR-2, NFR-3 | T-1 |

## 6. Estimated LOC and PR strategy

About 140 LOC (source about 50, tests about 90). Under the 400 LOC threshold: **one PR**, to `staging` or `master` per release cadence. Suggested review order: server emit split, then client parts and templates, then the spec amendment.
