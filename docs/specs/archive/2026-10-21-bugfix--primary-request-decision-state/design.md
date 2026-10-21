# Primary request decision state — Design

## 1. Document Control

| Field | Value |
|---|---|
| **Spec** | `bugfix/primary-request-decision-state` (`PRDS`) |
| **Requirements** | `requirements.md` (`PRDS-R-1..4`) |
| **Depth / Mode** | Lite · Bug Mode |
| **Status** | approved (Santiago Sanchez, 2026-10-21) |
| **Date** | 2026-10-21 |
| **Reversion challenge (Step 2.3)** | Run inline, outcome in §10 (DD-1, DD-3) |

## 2. Executive Summary

Client-only. One new derived getter on `notification-item` turns the result status into the primary row's decision (`accepted` / `rejected` / none). The decided-state footers of `@case (2)` and `@case (3)` render the existing person-based footer only for non-primary rows; primary rows render a status-driven footer instead. `requestKindLabel` becomes status-aware for primary rows. No server, payload or token change.

## 3. Architecture Overview

```
obj_result.status_id ──► primaryDecision getter ──► 6 → 'accepted' │ 7 → 'rejected' │ else → null
                                   │
     @case(2) / @case(3) footer ◄──┤  isPrimaryRequest ? (primaryDecision ? SP footer : nothing)
                                   │                   : today's "Accepted/Declined by <person>" footer
requestKindLabel (row chip + detailTitle) ◄── isPrimaryRequest ? (status 5 ? "Needs your review" : neutral) : unchanged
```

`request_status_id` keeps driving which `@case` block renders (sentence, avatar, buttons) — only the footer and the kind label stop trusting it for primary rows.

## 4. Extended Directory Structure (touched files only)

```
onecgiar-pr-client/src/app/
  internationalization/contribution-request-drawer.copy.ts        # 3 new strings
  pages/results/pages/results-outlet/pages/results-notifications/components/notification-item/
    notification-item.component.ts                                # primaryDecision getter, requestKindLabel
    notification-item.component.html                              # @case(2)/@case(3) footers
    notification-item.component.spec.ts                          # regression + PRDS scenarios
    CLAUDE.md                                                     # new section + Verified stamp (folder-doc rule)
docs/specs/notifications/primary-review-not-accept/tasks.md       # follow-up note (already added at propose)
```

## 5. Data Model

None. Reads `notification.obj_result.status_id` (already in the inbox payload — used today by `primaryReviewTarget()`) and the primary SP code via `responderCode` (`obj_shared_inititiative.official_code` on a primary row, already used by the row sentence).

## 6. API Design

None.

## 7. Backend Module Design

None. `transferPrimary` keeps writing the ACCEPTED row (PRA §5) — it is what lists the result in the SP inbox.

## 8. Frontend / UX Component Architecture

### 8.1 `primaryDecision` (new getter) — `PRDS-R-1`, `PRDS-R-2`
- `null` unless `isPrimaryRequest`.
- `status_id == 6` → `'accepted'`; `status_id == 7` → `'rejected'`; anything else (incl. missing) → `null`. Loose `==` like `primaryReviewTarget()` (status may arrive as string).

### 8.2 Decided-state footer — `PRDS-R-1`, `PRDS-R-2`, `PRDS-R-4`
In both `@case (2)` and `@case (3)`:
- `@if (!isPrimaryRequest)` → today's footer, byte-for-byte (person + date + Accepted/Declined chip).
- `@else if (primaryDecision)` → footer row with caption `<verb> by <b>{responderCode}</b>` and chip:
  - `accepted` → copy `primaryDecisionAccepted` ("Accepted"), class `notification_decision_chip_accepted`, `data-notif-decision-chip="accepted"`.
  - `rejected` → copy `primaryDecisionRejected` ("Rejected"), class `notification_decision_chip_declined`, `data-notif-decision-chip="rejected"`.
  - No person, no `aprovaed_date`.
- else → no footer row at all (not an empty row).
- Primary pending rows (`@case (1)`, legacy only) already have no footer — unchanged.

### 8.3 `requestKindLabel` — `PRDS-R-3`
Primary branch: `primaryReviewTarget(row) === 'review-drawer'` (status 5) → `primaryRequestChip` ("Needs your review"); else → new `primaryRequestKindChip` ("Primary Science Program request"). Feeds the row chip and `detailTitle()` together (single source, PSR-R-11 preserved). Chip colour class unchanged. The validate CTA already gates on `primaryReviewUrl` (status 5) — no change.

### 8.4 Copy (`contribution-request-drawer.copy.ts`, `notificationItem`)
`primaryRequestKindChip`, `primaryDecisionAccepted`, `primaryDecisionRejected`. Caption verb = the chip word + " by" (same word, no second string to drift).

### 8.5 Styling
Reuses `.notification_content_footer_row`, `.notification_content_caption`, `.notification_decision_chip_accepted/_declined` and `hlmBadge` — no new SCSS, no new tokens.

## 9. Shared Contracts

None.

## 10. Design Decisions

| ID | Decision | Why | Rejected |
|---|---|---|---|
| DD-1 | Primary footer derives from `obj_result.status_id`, never from `request_status_id`/`approved_by` | Since PRA the request row is a system write (approver = Center submitter); the result status is the only trace of the SP's decision in the payload | Server "system" request status (proposal option B: touches PRA write path, counts, migration) |
| DD-2 | Caption names the SP code, not a person, no date | Payload has no reviewer/decision date for the result review; inventing one from the request row reintroduces the bug | Chip only (less clear who decided) |
| DD-3 | "Needs your review" only at status 5; neutral kind label otherwise | Same false-state class as the bug: a decided result must not ask for review | Leave chip static (proposal scope note) |
| DD-4 | `request_status_id` still picks the `@case` block | Keeps sentence/avatar/link/buttons logic untouched; smallest diff | Re-switch primary rows on status_id (rewrites 3 blocks) |

**Reversion challenge (one question: "what does removing this break?")**
- *DD-1 removes "Accepted by <person>" on primary rows.* Breaks: (a) legacy pre-PRA rows where an SP user truly accepted lose the name — accepted, "accept as primary" no longer exists as an action (proposal §9 Impact); (b) any spec asserting the caption on a **primary** fixture — current specs at `notification-item.component.spec.ts` L946/L1038 use non-primary fixtures (verified), so none expected; the task greps to confirm. No fix needed.
- *DD-3 changes the static "Needs your review" chip.* Breaks: PRA-T-2 specs asserting `detailTitle()`/chip = "Needs your review" on a primary fixture **without** `status_id = 5`. Fix folded into T-1: such fixtures get `status_id: 5` (their intent is the pending case) — never the assertion relaxed.

## 11. Budget (Step 2.4 tripwire)

| Metric | Estimate |
|---|---|
| Tasks | 1 code task + 1 HITL |
| LOC | ~60 source + ~120 spec + ~15 docs |
| Review rounds | 1 |

Matches Lite. Not `/akili-quick`: status-driven logic + regression test.
