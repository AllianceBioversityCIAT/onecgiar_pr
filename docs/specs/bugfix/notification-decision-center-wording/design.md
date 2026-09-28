# Design — Bilateral decision notification wording per recipient

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/notification-decision-center-wording` |
| Depth | Lite + Bug Mode |
| Implements | `requirements.md` NDCW-R-1..R-5, NFR-1..3 |
| Status | approved 2026-09-24 |

## 2. Executive Summary

Reuse the `notification.text` column, exactly as `RESULT_CENTER_TAGGED` does. The server emits twice per decision: once to the submitter (no `text`, legacy wording) and once to the other recipients (with `text` holding the center sentence). The client and the server's socket copy switch to the center wording **when `text` is present**. No migration, no new type (NDCW-NFR-1).

## 3. Architecture Overview

| Layer | Change | Requirement |
|---|---|---|
| `ResultsService.emitBilateralReviewNotification` (`results.service.ts:2841`) | Split recipients into submitter vs. others; emit twice; the second call passes `renderedText` | R-1, R-2, R-4 |
| `ResultsService.getBilateralReviewRecipientIds` (`:2890`) | Return the submitter id and the other ids separately (still one de-duplicated set overall, emitter removed) | R-4 |
| `NotificationService.buildBilateralReviewDescription` (`notification.service.ts:871`) and its `switch` (`:821-836`) | Accept `storedText`; with text, build `The result <code> - <title>, <text>` | R-3 |
| Client `getResultNotificationTextParts` (`notification-type.constants.ts:135-147`) | Approved/Rejected: with `notification.text`, return center parts; without, keep today's | R-2, R-5 |
| Client `NotificationTextParts` + `buildResultNotificationText` | New optional `linkTrailer` (`','`) so the comma attaches to the link | R-2 |
| Client templates `pop-up-notification-item.component.html`, `update-notification.component.html` | Render `{{ parts.linkTrailer }}` directly after the result link, no whitespace between | R-2 |

## 4. Data Model

None. `notification.text` already exists and is selected in the list query (`notification.service.ts:629`).

Stored value for center recipients (the part after `<code> - <title>,`):
`where your center was tagged, has been approved by the Science Program SP03.` (`rejected` on Reject; without a program code: `… by the Science Program.`).

## 5. API Design

No endpoint or payload-shape change. The list response already carries `text`. `/api/bilateral/*` is untouched, so no change-log row.

## 6. Backend Module Design

- **Program code at emit time.** The stored sentence needs the deciding SP's code, which today is only resolved at read time. Resolve it at emit from the owner initiative (`initiative_role_id = 1`, active), the same rule already used in `results.service.ts:3470-3477` and by `resolveOwnerProgramCode`. The implementer picks the existing repository helper (`getResultByInitiativeOwnerFull` is a candidate at `:2319`; verify it returns `official_code`). A failed lookup degrades to the no-code sentence, never throws.
- **Split rule.** `submitterId` = `external_submitter ?? created_by`. Others = lead-center Center Users minus the submitter minus the emitter. If the submitter is also a Center User they get the submitter wording (R-4 scenario).
- **Emit order and socket.** Two `emitResultNotification` calls. Each builds its own live toast from its own `renderedText`, so toast and list agree (R-3). Emitter exclusion is still applied inside `emitResultNotification`.
- **Never throws** (NFR-2): the existing try/catch stays around both calls.

## 7. Frontend Component Architecture

- Center parts: `{ prefix: 'The result', linkTrailer: ',', suffix: <text>, emphasizePrefix: false }`. The link keeps its role; the trailing `,` sits outside the underlined link.
- Flattened form (`buildResultNotificationText`, used by search): `The result 9561 - <title>, where your center was tagged, …` — identity and trailer are concatenated with no space.
- Legacy: no `text` → today's `✅|❌ Your Result` parts, so old rows and the submitter render as before (R-1, R-5).
- No new tokens, no i18n keys (the sentence is server-composed, like the other `text`-carrying types).

## 8. Design Decisions

| DD | Decision | Why / rejected alternative |
|---|---|---|
| DD-1 | Reuse `text` as the per-recipient discriminator | No migration, no new type, mirrors `RESULT_CENTER_TAGGED`. Rejected: new `..._CENTER` types (migration, catalog rows, filters), and deriving "creator" on the client (the payload lacks `created_by`) |
| DD-2 | Server composes the full center sentence including the SP code | The client cannot tell which SP decided for a stored row beyond the owner code, and the toast needs the same words. Same split as `RESULT_CENTER_TAGGED` |
| DD-3 | `linkTrailer` instead of a comma-leading suffix | Both templates render whitespace between the link and the suffix, so `suffix: ', where…'` shows `title ,`. R-2 forbids that |
| DD-4 | No backfill | Old rows keep `Your Result`; a bulk update would rewrite history and cannot tell submitter rows from center rows without more data |

### Reversion challenge (Step 2.3)

DD-1 stops showing "Your Result" to non-submitters, which is delivered behavior. Question: **what does removing it break?**

| Concern | Answer |
|---|---|
| Existing rows | Untouched: no `text` → legacy branch (R-5) |
| Submitter who is also a Center User | Stays on the submitter path, keeps "Your Result" (R-4 scenario) |
| Existing specs asserting the shared text | `notification.service.spec.ts` (5 hits) and `notification-type.constants.spec.ts` (10 hits) must be updated; not a product break |
| Search by text in the notifications list | Flattened text now differs for center rows; still searchable by code/title |

No unaddressed breakage.

## 9. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 3 (server, client, tests split across both) |
| LOC | about 140 including specs (about 50 source, 90 tests) |
| Review rounds | 1, at most 2 |

Depth check: the estimate matches Lite plus Bug Mode. Exceeding these numbers stops execution for the user.

## 10. Risks, Rollback

| Risk | Handling |
|---|---|
| Two emits instead of one change spec call-count assertions in `results.service.spec.ts` | Update those specs in the server task |
| Owner code lookup adds one query per decision | Negligible; degrades to the no-code sentence on failure |
| Rollback | Revert the commit; rows written meanwhile carry a `text` that the old client ignores for these types, so they would render `Your Result` (wording only, no data loss) |
