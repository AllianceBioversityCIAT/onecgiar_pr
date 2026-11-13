# Design — SP approval notice for everyone on the center

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/sp-approval-center-notice` |
| Depth | Standard |
| Type | Change |
| Approval Mode | gated |
| Status | approved 2026-10-02 |
| Requirements | `requirements.md` (SACN-R-1..R-9, SACN-NFR-1..5) |
| Proposal approach | Option A (new any-role query + recognisable stored text) — kept |

## 2. Executive Summary

Three small edits, no schema change:

1. **Server — recipients:** a new any-role center lookup is used only in the Approve branch of the bilateral review notice.
2. **Server — text:** the center branch of Approve stores a new lead sentence (`"SP06, as primary Science Program, has approved your center's result"`); the socket toast appends the result identity to it.
3. **Client — render:** the shared text-parts builder recognises that sentence and renders it as segments (bold SP code) before the result link; the update row gets a check icon and a "Decision update" chip for Approved/Rejected.

## 3. Architecture Overview

| Step | Where | Change |
|---|---|---|
| Approve committed | `ResultsService.reviewBilateralResult` | none |
| Resolve recipients | `ResultsService.getBilateralReviewRecipientIds` | gains a decision input; Approve uses the any-role lookup, Reject keeps `getUserIdsByCenter` |
| Compose center text | `ResultsService.emitBilateralReviewNotification` | Approve center branch stores the new lead sentence; Reject branch unchanged |
| Persist + socket | `NotificationService.emitResultNotification` → `buildBilateralReviewDescription` | new branch: stored text in the new shape → `"<text> <code> - <title>"` |
| Render (list, header pop-up, update tab, search) | `getResultNotificationTextParts` / `buildResultNotificationText` | new shape detected → segments; legacy shapes untouched |
| Row chrome | `notification-item` update branch | check icon + "Decision update" chip for decision types |

Every client surface already funnels through `getResultNotificationTextParts`, so one parser change covers list, pop-up, update tab and search (SACN-R-4).

## 4. Extended Directory Structure

```
onecgiar-pr-server/src/
├── auth/modules/role-by-user/RoleByUser.repository.ts        # + getUserIdsByCenterAnyRole
├── api/results/results.service.ts                            # Approve branch: recipients + text
├── api/notification/notification.service.ts                  # socket description branch
└── api/notification/constants/  (or enum/)                   # shared lead-sentence pieces (server side)
onecgiar-pr-client/src/app/
├── internationalization/bilateral-decision-notice.copy.ts    # NEW: sentence pieces + "Decision update"
├── shared/constants/notification-type.constants.ts           # parser branch
└── pages/.../notification-item/notification-item.component.{ts,html}  # icon + chip
```

## 5. Data Model

No change. `notification.text` (existing nullable column) carries one of three shapes for `Bilateral Result Approved`:

| Shape | Written by | Rendered as |
|---|---|---|
| empty | submitter (P2-3157) | "✅ Your Result … Approved by …" |
| `where your center was tagged, has been approved by the Science Program SPXX.` | center recipients before this change (NDCW) | legacy center sentence |
| `SPXX, as primary Science Program, has approved your center's result` **or** `The primary Science Program has approved your center's result` | center recipients after this change | SACN-R-3 sentence |

The new shape is recognised by its fixed tail `has approved your center's result` (exact match at end of the trimmed text). The SP code is the token before the first `, as primary Science Program,`.

## 6. API Design

No endpoint, DTO or payload change. `/api/bilateral/*` untouched (SACN-NFR-1).

## 7. Backend Module Design

### 7.1 `RoleByUserRepository.getUserIdsByCenterAnyRole(centerCode)`

- Same shape as `getUserIdsByInitiative`: `DISTINCT user` from `role_by_user` where `center_id = ?`, `active > 0`, `user IS NOT NULL`; no role predicate.
- Same id sanitisation as `getUserIdsByCenter` (drop null / 0 / non-numeric).
- `getUserIdsByCenter` is **not** touched (SACN-R-9).

### 7.2 `ResultsService`

- `getBilateralReviewRecipientIds` receives the decision. Approve → any-role lookup; Reject → existing lookup. De-dup, submitter separation and emitter removal unchanged (SACN-R-2).
- `emitBilateralReviewNotification`, Approve center branch: build the lead sentence from `resolveOwnerProgramCodeForResult` — with code `"<SPXX>, as primary Science Program, has approved your center's result"`, without `"The primary Science Program has approved your center's result"`. Reject center branch unchanged.
- Existing try/catch posture kept: any lookup failure logs a warning (ids only) and the approval stands (SACN-R-8, NFR-3). The center lookup already has its own try/catch, so a failure there still lets the submitter row go out.

### 7.3 `NotificationService.buildBilateralReviewDescription`

- New first branch: stored text in the new shape → `"<text> <identity>"` (identity = `<code> - <truncated title>`; when missing, the text alone). Legacy center branch and submitter branch unchanged. This keeps toast = list (SACN-R-4).

### 7.4 Shared sentence pieces

The server keeps the lead-sentence pieces in one constant (used by 7.2 and 7.3); the client keeps the same strings in its copy file. Two copies of a 3-string contract is accepted (no shared package between server and client) — each side's spec pins the exact string, so drift fails a test.

## 8. Frontend / UX Component Architecture

### 8.1 Copy — `internationalization/bilateral-decision-notice.copy.ts`

| Key | Value |
|---|---|
| verb | `, as primary Science Program, has approved your center's result` |
| fallbackLead | `The primary Science Program has approved your center's result` |
| tail (detector) | `has approved your center's result` |
| chipLabel | `Decision update` |

### 8.2 Parser — `notification-type.constants.ts`

- Before `buildCenterDecisionParts`, a new `buildApprovedCenterNoticeParts(notification)`: if `text` ends with the tail → return `segments` `[{SPXX, emphasize}, {verb}]` (or `[{fallbackLead}]`), no prefix/suffix, no linkTrailer. The template already renders `segments` and then the link (WPT pattern), giving "**SP06**, as primary … result **9330 - title**".
- Applies to `BILATERAL_RESULT_APPROVED` only. Otherwise falls through to today's logic (SACN-R-7).
- `buildResultNotificationText` (search + plain text) must flatten `segments`; verify it already does (WPT) — if not, extend it in the same task.

### 8.3 Row — `notification-item` update branch

| Element | Change | Token / component |
|---|---|---|
| Avatar | `pi pi-check-circle` icon instead of initials when type is Approved (mirrors the `aiJob` icon branch) | existing avatar box, `--pr-color-*` |
| Type chip | `rowTypeChipLabel` returns `Decision update` for Approved **and** Rejected (same pattern as WCT/WPT overrides) | Spartan `hlmBadge variant="secondary"` + neutral pair `!bg-[var(--pr-surface-sunken)] !text-[var(--pr-text)]` (grey, matches reference). *Amended 2026-10-02 (Pivot): the theme maps `--secondary` to `--pr-color-primary-25` (#faf9fe, near-white), which does not read grey; the global `--secondary` mapping is NOT changed.* |
| Funding chip | unchanged — already "W3/Bilateral" | `hlmBadge variant="outline"` |
| Meta line | unchanged — already `<level> · <type> · <time ago>` | — |
| Actions | none (update rows have none today) | — |

Result-link styling stays as the current update rows (mono, underlined). The reference image shows a coloured title; matching it would change every update row and is out of scope — recorded as an assumption for the HITL visual check.

### 8.4 UI states

Informational row only: no loading/empty/error state of its own; it inherits the inbox's. Unread dot and mark-as-read on click are existing behaviour.

## 9. Shared Contracts or Package Extensions

- Contract: the three `text` shapes in §5. Server and client specs each assert the exact strings.
- `bilateral-result-summaries.en.md` — no change (no bilateral payload touched).

## 10. Design Decisions

| ID | Decision | Rejected alternative | Why |
|---|---|---|---|
| SACN-DD-1 | New `getUserIdsByCenterAnyRole`, used only for Approve | Drop `role = 9` from `getUserIdsByCenter` | 6 other callers would widen silently (SACN-R-9) |
| SACN-DD-2 | Store the lead sentence; client detects it by fixed tail | Store only the SP code; or a new notification type | SP-code-only is indistinguishable from other short texts; new type needs a catalog seed per environment (NFR-4 of NOTIF) |
| SACN-DD-3 | Render via existing `segments` | New prefix/suffix fields | Segments already render bold mid-sentence tokens before the link |
| SACN-DD-4 | "Decision update" chip for Approved **and** Rejected | Approved only | Same family of row should look the same (OQ-4 default) |
| SACN-DD-5 | Keep current link styling | Coloured title as in the image | Would restyle every update row |

### Reversion challenge (Step 2.3)

| Reverted behaviour | "What does removing it break?" | Addressed by |
|---|---|---|
| NDCW-R-2 approve wording for center recipients (new rows only) | Existing assertions on `where your center was tagged … approved` in `results.service.spec.ts`, `notification.service.spec.ts`, `notification-type.constants.spec.ts`, `update-notification.component.spec.ts`; legacy rows in DB | Approve-center assertions updated in the same tasks; legacy-shape cases kept as SACN-R-7 regression cases; Reject assertions stay |
| Chip text "Bilateral Result Approved/Rejected" | Type filter and search use `resolveNotificationType`, not the chip label → unaffected; specs asserting the chip text | Update those chip assertions in T4 |

## 11. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | 4 |
| LOC (code + tests) | ~200 (≈70 code, ≈130 tests) |
| Review rounds | 1 (2 = acceptable, 3 = escalate) |
