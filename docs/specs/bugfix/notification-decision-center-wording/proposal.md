# Proposal — Bilateral decision notification says "Your Result" to non-creators

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/notification-decision-center-wording` |
| Slug | `notification-decision-center-wording` — derived from free-text argument (Spanish report: "Your Result en la notificación de aprobación y rechazo…") |
| Type | Bug |
| Approval Mode | gated |
| Source | User report, 2026-09-24 (result 9561, reported by ILRI; CIMMYT user, not the creator, received it) |
| Depends on | none |
| Parallel-safe | yes (notification copy only; touches no migration, no bilateral payload) |
| Related | `notifications/bilateral-review-decision` (P2-3157, origin of the copy and of NOTIF-R-3 recipients) |
| Status | **Approved by user 2026-09-24** (open questions OQ-1..OQ-3 to be resolved in `/akili-specify`) |

## Intent

The Approved/Rejected notification must not tell a non-creator that the result is "Your Result". A Center that only received the result via tagging should read: `The result 9561 - <title>, where your center was tagged, has been approved by the Science Program SP03.`

## Problem / Current Behavior

| Item | Observed |
|---|---|
| Text shown | `✅ Your Result 9561 … has been Approved by the Science Program SP03.` |
| Who saw it | A CIMMYT Center User who is not the submitter |
| Cause of "Your" | The prefix is hard-coded and identical for every recipient |

## Proposed Outcome

| Recipient | Text |
|---|---|
| Submitter / creator | Unchanged: `✅ Your Result <code> - <title> has been Approved by the Science Program SPXX.` |
| Any other recipient (Center User) | `The result <code> - <title>, where your center was tagged, has been approved/rejected by the Science Program SPXX.` |

## Scope

- Server: give non-submitter recipients a different text (`getBilateralReviewRecipientIds` in `results.service.ts:2890`, `emitBilateralReviewNotification` at `:2841`, `buildBilateralReviewDescription` in `notification.service.ts:871` for the live socket copy).
- Client: `notification-type.constants.ts:135-147` (prefix `✅ Your Result` / `❌ Your Result`) plus its spec.
- Existing rows keep the legacy wording (no backfill).

## Non-Goals

- No change to who receives the notification unless the open question below is answered "yes".
- No new email (BR1 of P2-3157 forbids email for these transitions).
- No change to the tagged-center notification (`RESULT_CENTER_TAGGED`) or to `/api/bilateral/*`.

## Affected Users, Systems, And Specs

Center Users of the lead center, the original submitter, and Science Program reviewers who trigger the decision. Spec `notifications/bilateral-review-decision` (NOTIF-R-2 fixes the exact copy today; it will need an amendment).

## Visual Reference

- Source: None
- Location: n/a
- Notes: text-only change in the existing notification row.

## Bug Diagnosis

### Observed Symptom
A recipient who did not create the result reads "Your Result 9561 … has been Approved".

### Reproduction Steps
1. A bilateral result (submitted by an external platform, e.g. ILRI) reaches Pending Review.
2. A Science Program member approves or rejects it (`POST` review decision, `ResultsService` → `emitBilateralReviewNotification`).
3. Open the notifications list as a Center User of the result's lead centre who is not the submitter.

### Root Cause (confirmed by reading the code)
1. **Recipients** (`results.service.ts:2890-2926`): submitter (`external_submitter`, falling back to `created_by`) **plus every active Center User of the result's lead centre** (`RoleByUser.repository.ts:485`, `role = CENTER_USER`). Nothing else. Tagged contributing centres are not recipients.
2. **One type, one text for all**: the server emits a single `BILATERAL_RESULT_APPROVED/REJECTED` type with no per-recipient text; the client (`notification-type.constants.ts:135-147`) and the server socket copy (`notification.service.ts:881`) both hard-code "Your Result".
3. So any Center User who is not the submitter, exactly the group P2-3157 deliberately added, gets wording written for the submitter. This is a gap in P2-3157's design, not a regression.

### Impact & Scope
Every approve/reject for every non-submitter Center User. Wording only; no data or permission effect.

### Fix Strategy
Smallest safe path is **Option A** below. Not cosmetic (server + client + recipient split), so route to `/akili-specify` (Lite) in Bug Mode with a regression test.

## Approach Options

| Option | How | Trade-off |
|---|---|---|
| **A. Per-recipient `text` (recommended)** | Emit the submitter with today's type and no text; emit other recipients with the same type and a stored `text` suffix. Client: when `text` is present use `The result <id>` + text; otherwise legacy `Your Result`. | No migration, no new notification type, old rows unchanged. Mirrors the existing `RESULT_CENTER_TAGGED` pattern. Program code must be resolved at emit time. |
| B. New types `..._APPROVED_CENTER` / `..._REJECTED_CENTER` | New enum values and catalog rows | Needs a migration and touches settings and filters; more surface for one sentence. |
| C. Client derives "creator" | Compare `target_user` with creator id | The notification select does not carry `created_by` / `external_submitter`; needs an API shape change. |

## Recommended Approach

Option A. Two small details for the spec: the client joins `[prefix, identity, suffix]` with spaces, so the `, where your center was tagged,` comma needs a tweak to avoid `title , where`; and the emoji prefix should be kept or dropped consistently for both variants.

## Risks, Dependencies, And Open Questions

| # | Item |
|---|---|
| OQ-1 | **Should tagged (non-lead) contributing Centers receive the decision at all?** Today they do not. The requested wording says "where your center was tagged", which suggests they should. If yes, this grows from wording to recipients (data source: `results_center`, non-lead rows). Needs a product answer. |
| OQ-2 | In result 9561 the CIMMYT user received it, so CIMMYT is presumably the flagged **lead** centre. "Where your center was tagged" is then accurate for a lead, but confirm with the data (`results_center.is_leading_result`). |
| OQ-3 | Capitalisation: creator text uses `Approved`, requested centre text uses `approved`. Keep as requested? |
| Risk | Rows written before the fix keep "Your Result"; acceptable, no backfill. |
| Risk | Per-recipient emit changes the emit count/shape asserted in `notification.service.spec.ts` and `results.service.spec.ts`; update those specs. |
| Kaizen | No active lesson applied. |

## Success Criteria

- The submitter still sees `Your Result …` for Approved and Rejected.
- A non-submitter Center User sees `The result <code> - <title>, where your center was tagged, has been approved|rejected by the Science Program <SPXX>.`
- No stray space before the comma; a regression test fails on the current code and passes after.
- Live socket toast and stored list row show the same sentence.

## Next Step

Answer OQ-1 (recipients) and OQ-3 (case), then:

```text
/akili-specify bugfix/notification-decision-center-wording
```

(Bug Mode: requires a regression test, red before the fix and green after.)
