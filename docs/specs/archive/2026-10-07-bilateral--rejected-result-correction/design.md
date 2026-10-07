# Design — A centre corrects and resubmits a rejected bilateral result in the Reporting Tool

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/rejected-result-correction` |
| Code | `RRC` |
| Depth | **Full** |
| Approval Mode | `gated` |
| Status | **approved**, user 2026-10-06 (Phase 2 gate: Continue, no judgment-day) |
| Date | 2026-10-06 |
| Requirements | `requirements.md` (approved 2026-10-06, Phase 1 gate) |
| Reversion challenge (Step 2.3) | Run **inline** by the Leader (no subagent; specify allows it). Outcome recorded next to `DD-3`, `DD-5`, `DD-7` |

## 2. Executive Summary

Status **7 joins `{1, 8}`** in three server gates and one client computed. The only genuinely new mechanism is a **direct primary transfer**: the ownership writes `accept()` already performs, extracted into one core that both the in-app SP change (status 7) and the API resubmission (`RSB`) call, with no request round. The justification reaches the notification by **linking** the notification to its `result_review_history` row (one source of truth). The banner and the modal read the existing history endpoint.

| Piece | Change | Size |
|---|---|---|
| Server gates | `assertSubmittable` + `updatePrimaryAssignment` admit 7 | small |
| Direct transfer core | Extract from `accept()`; call on 7 and from `RSB` | **medium, riskiest** |
| Resubmission side effects | `RESUBMIT` row, `releaseContributors` at submit from 7; no release on contributor save at 7 | small |
| Notification link | Migration `notification.review_history_id` + readout join + client line | medium |
| Client unlock | `isEditableByCenterUser` admits 7 (drawer, Submit, sections follow) | tiny |
| Client UI | Reason banner, full-history modal, single-allocation note (Spartan) | medium |

## 3. Premise Ledger

| # | Premise | Source | How verified | Status | If false |
|---|---|---|---|---|---|
| `RRC-P-1` | Section writes already accept status 7 for non-admins (`assertCenterWrite` blocks only 5) | `api/results/bilateral-access/bilateral-access.service.ts` | Read | `verified` | Widen there too; T-1 grows |
| `RRC-P-2` | No section save writes `status_id`, except the header create (`status_id: Editing` at birth) and versioning | grep `status_id:` in `api/bilateral` + `results.service.ts` | grep, 2 hits, both not save paths | `verified` | `RRC-R-2` needs a guard on that path |
| `RRC-P-3` | Client edit lock for other centres = `isEditableByCenterUser() && isCenterUserOfLeadCenter()` (`bilateral-result-creator.component.ts:507`). Widening the status half keeps parity (`RRC-OQ-1` default) | Read | Read | `verified` | `RRC-OQ-1` reopens |
| `RRC-P-4` | The QA drawer's `readOnly`, the Submit rail and every section derive from `isEditableByCenterUser` (`isFormReadOnly`) | `bilateral-result-creator.component.html:47`, `:573`, `:907` | Read | `verified` | Each consumer widened separately |
| `RRC-P-5` | The stale QA guard is a server hash compare, independent of status (`bilateral-center.service.ts:~2297`) | `QSG` requirements §1 | Read | `verified` | `RRC-R-6` needs work |
| `RRC-P-6` | A rejection deactivates **every** active `share_result_request` of the result, including the accepted `primary` row (`results.service.ts:4404`) | Read | Read | `verified` | — |
| `RRC-P-7` | Contributor saves write DRAFT (4) rows and call `releaseContributors` whenever an owner exists (`bilateral-center.service.ts:~1975`), so at 7 they would be sent at once | Read | Read | `verified` | — (drives `DD-5`) |
| `RRC-P-8` | `GET results/bilateral/:id/review-history` returns every row newest first, with `comment`, `initiative_code` (after `RSB-T-1`), reviewer and date. No status/role gate | `results.controller.ts:1026`, repository `:46` | Read | `verified` | Readout change |
| `RRC-P-9` | `notification` stores only `text` (no structured detail column) | `notification.entity.ts` | Read | `verified` | — (drives `DD-6`) |
| `RRC-P-10` | What `stateFor` reports, and what the client SP chip shows, for a Rejected result **today** (its accepted `primary` row is inactive after `P-6`) | `primary-program-request.service.ts:370` | Not verified | `assumed`: "none" | T-2 verifies before writing the accepted row of `DD-3` |
| `RRC-P-11` | After a rejection, the client Contributors list no longer shows SPs whose requests were deactivated (they read active requests), so "what the centre has at that moment" is what it re-adds | Contributors GET path | Read (T-3, 2026-10-06): `_loadBilateralRelatedData` → `getDraftInit` requires `srr.is_active > 0` | `verified` | T-3 verifies; if they still show, release must rebuild from what is displayed |
| `RRC-P-13` | The Contributors list shows DRAFT (status 4) requests at status 7 on reload | `results.service.ts:~4142` `getDraftInit(resultId, [Editing, Draft, PendingReview])` | Read (T-3, 2026-10-06) | **`false`** — at 7 it reads status-1 rows, so a contributor re-added at 7 vanishes on reload and the next autosave deactivates it | **Pivot T-3 (user, 2026-10-06):** add Rejected to the draft-visible statuses (§8.4) |
| `RRC-P-12` | `result_review_history.id` PK type (for the FK in `DD-6`) | entity `result-review-history.entity.ts:17-21` + DDL `1768572302006-AuditoryTableApproveRejectBilaterals.ts:7` | Read (T-4, 2026-10-06); user `SHOW COLUMNS` on PRTest pending | `verified` **signed `bigint`** (not int) | T-4 matches the real type |

## 4. Architecture Overview

```
In-app (status 7)                                  API (RSB, status 7)
  updatePrimaryAssignment ──┐                        runResubmissionPipeline
     (SP changed)           │                           (primary changed)
                            ▼                                 │
              PrimaryProgramRequestService.transferPrimary ◄──┘   ← NEW core (DD-3)
                (writes extracted from accept(); no round, no notice)
                            ▲
                accept() ───┘   (unchanged behaviour: lock, status check, notice stay in accept)

  submitForReview (from 7) → status 5 + RESUBMIT row + releaseContributors + announcePendingReview
  reviewBilateralResult (REJECT) → history row id → emitBilateralReviewNotification(..., historyId)
                                   → notification.review_history_id  (DD-6)
  Client: creator → banner (latest REJECT) · results list modal (all REJECT/RESUBMIT) · panel row line
```

## 5. Extended Directory Structure

```
onecgiar-pr-server/src/
  api/bilateral/services/bilateral-center.service.ts          gates, transfer on 7, submit side effects, contributor release
  api/bilateral/services/bilateral-resubmission.service.ts    requestPrimary → transferPrimary (RRC-R-17)
  api/bilateral/bilateral.service.ts                           RSB writers port wiring (:4800)
  api/results/share-result-request/services/primary-program-request.service.ts   transferPrimary core (extract)
  api/results/results.service.ts                               pass history id to the notification; Rejected joins the draft-visible statuses (T-3, P-13)
  api/notification/entities/notification.entity.ts             + review_history_id
  api/notification/notification.service.ts                     emit with id; panel readout joins the comment
  migrations/<ts>-NotificationReviewHistoryLink.ts             NEW
  docs/bilateral-result-summaries.en.md                        change-log row (RRC-R-17)
onecgiar-pr-client/src/app/
  pages/bilateral/services/bilateral-creation.service.ts       isEditableByCenterUser + 7
  pages/bilateral/components/bilateral-rejection-notice/       NEW banner (Spartan alert)
  pages/bilateral/components/bilateral-page-header/            hosts the banner under the status badge
  pages/bilateral/components/section-zero-dashboard/          single-allocation note (corrected T-7: the editor's Program picker lives here; bilateral-sp-selector only mounts in the creation wizard)
  pages/bilateral/pages/bilateral-results-list/                modal → full history
  shared/constants/notification-type.constants.ts              rejection line in the Rejected suffix
  shared/components/header-panel/.../pop-up-notification-item/ render + clamp
  internationalization/                                        copy (rejection notice, history, single SP)
```

## 6. Data Model

> Table name: the real table is **`notifications`** (plural, `@Entity('notifications')`); `notification.review_history_id` in this spec means `notifications.review_history_id` (T-4, 2026-10-06).

| Change | Detail | Why |
|---|---|---|
| `notification.review_history_id` | NEW, nullable, FK → `result_review_history.id`, `ON DELETE SET NULL`, indexed. Type matches the PK (`P-12`) | `DD-6`. `NULL` = legacy or non-review notification → no justification line |
| `result_review_history` | **No change here.** `initiative_id` + `RESUBMIT` come from `RSB-T-1` | `RRC-R-5`, `RRC-R-15` |
| `share_result_request` | No schema change. The transfer writes an **accepted** `primary` row for the new SP (`DD-3`) | Keeps `stateFor` coherent |

No backfill: legacy notifications keep `NULL` (`RRC-R-13` legacy scenario).

## 7. API Design

No new endpoint; no payload or response change.

| Endpoint | Change |
|---|---|
| `PATCH` bilateral centre primary assignment (`updatePrimaryAssignment`) | Admits 7. On 7 a change of SP = direct transfer |
| `POST bilateral/center/submit/:id`, `POST …/quality-assessment/:id`, field-revisions | Admit 7 via `assertSubmittable` |
| Notifications list (panel) | Each Rejected row gains `review_comment: string \| null` and `has_review_entry: boolean` (additive fields) |
| `GET results/bilateral/:id/review-history` | Unchanged (`P-8`) |
| `POST /api/bilateral/create` (resubmission) | Same contract; a changed primary is now a direct transfer. Contract doc change-log row |

Error messages: all reused (no primary SP, not allocated, stale QA, closed phase). The one message that names statuses is updated: *"The lead project and primary Science Program can only be changed while the result is in Editing, Draft or Rejected."* and *"Only a result in Editing, Draft or Rejected can be submitted for review (status_id: N)"*.

## 8. Backend Module Design

### 8.1 Gates (`RRC-R-1`, `R-3`, `R-5`, `R-6`, `R-7`, `R-9`)

- `assertSubmittable`: submittable = `{Editing, Draft, Rejected}`. Covers submit, assess and field-revision (they share it). Everything after the status check is unchanged: centre role/admin, owner or draft primary, pending-primary block, MDS.
- `updatePrimaryAssignment`: editable = `{Editing, Draft, Rejected}`. Catalogue allocation check unchanged (`R-9` message reused). Then branch on status: **7 → `DD-3` transfer**; 1/8 → today's code verbatim (`R-12`).
- Phase closed (`R-4`): unchanged; the existing phase checks run before these.

### 8.2 Direct transfer core (`RRC-R-10`, `R-17`)

`PrimaryProgramRequestService.transferPrimary(resultId, newInitiativeId, user, manager, { releaseContributors })`, always inside the caller's transaction, after the caller has locked the `Result` row:

1. If `newInitiativeId` equals the active role-1 owner → no-op (returns `unchanged`).
2. The ownership writes `accept()` runs on a genuine change today, in the same order: old role 1 off; stray accepted-contributor row of the new SP off; stale contribution request to the new SP off; new role 1 written/reactivated; old owner's ToC mapping retired; ToC stub seeded for the new SP.
3. Retire any active `primary` request rows; write one **ACCEPTED** `primary` row for the new SP (`requested_by` = user, decided by the same user). See `DD-3`.
4. `releaseContributors` only when the flag says so (`false` from the in-app path at 7, `DD-5`).
5. **No** notice, **no** `announceIfPendingReview`. The caller announces.

`accept()` keeps its lock, PENDING check, authorization, the call to the core's write block, and its post-commit notices. Behaviour of `accept()` is byte-for-byte the same.

### 8.3 Submit from 7 (`RRC-R-5`, `R-8`)

In `submitForReview`, when the status read is 7, inside the existing transaction: flip to 5 (same write), write `RESUBMIT` history (`initiative_id` = owner) instead of the ordinary submit row, then `releaseContributors`. Post-commit: `announcePendingReview` (owner always exists at 7 after `R-7`).

### 8.4 Contributor saves at 7 (`RRC-R-8`)

In the contributors save (`bilateral-center.service.ts:~1975`), skip `releaseContributors` when the result is at 7. Drafts are written exactly as today and released at submit (`8.3`).

**Pivot T-3 (user-approved 2026-10-06, `RRC-P-13`):** the result readout (`results.service.ts` `_loadBilateralRelatedData`) must list those drafts back to the centre at 7, otherwise the next autosave (built from the reloaded list) deactivates them. Add `Rejected` to the `draftVisibleStatuses` passed to `getDraftInit`. No other status changes.

### 8.5 Rejection notification (`RRC-R-13`, `R-16`)

`reviewBilateralResult` already saves the history row in its transaction; pass its id to `emitBilateralReviewNotification(resultId, decision, user, historyId)`, which stores it on both submitter and centre rows (Reject only; Approve unchanged). The panel readout LEFT JOINs `result_review_history` and returns `review_comment` + `has_review_entry`. The text builders are not touched, so the five other types keep their wording (`R-16`).

### 8.6 API path (`RRC-R-17`)

`RSB`'s writers port: `requestPrimary` → `transferPrimary` (wired in `bilateral.service.ts:~4800`, `releaseContributors: true` because the resubmission sends at once). `suppressPrimaryRole` stays (the core writes role 1). The "announce only when the primary did not change" branch becomes "always announce". `RSB-R-14` is amended in its own spec (Correction Closure).

**Pivot T-6 (user-approved 2026-10-06, NFR §7 data integrity):** RSB's section reset runs in its own earlier transaction and, on a changed primary, retired the old owner's role 1 and accepted `primary` row there — so a later transfer/history failure left the result Rejected and **ownerless**. On a changed primary the reset no longer retires the old owner's role 1 or its accepted `primary` row; `transferPrimary` does both inside the final transaction (CAS → transfer → `RESUBMIT` row). A failure anywhere in the final transaction leaves the previous primary and status intact, and the core reports the real `previousInitiativeId` for the `R-18` line. The ownerless case (RSB-DD-5) is unchanged.

### 8.7 Observability (`RRC-R-18`)

One `logger.log` per resubmission from 7 and per transfer: result id, old/new initiative id, user id. Nothing else.

## 9. Frontend / UX Component Architecture

| Component | Change | Spartan |
|---|---|---|
| `BilateralCreationService.isEditableByCenterUser` | `{null, 1, 8, 7}` | — |
| `BilateralRejectionNoticeComponent` (NEW) | Inputs: `statusId`, `resultId`. At 7, loads the history once, shows the newest `REJECT` comment with SP code and date; empty comment → *"No justification was recorded."*; load error → neutral "Couldn't load the rejection reason" (never blank). Read-only, `role="status"`. Long text: 3 lines + "Show more" | `hlm-alert` (destructive tone tokens), `hlm-button` link variant |
| `BilateralPageHeaderComponent` | Hosts the notice at the bottom of the detail header (corrected T-8: the editor never binds the header's status badge — the status pill lives in the creator rail, BRRA-R-3 — so the notice takes its own `noticeResultId`/`noticeStatusId` inputs) (`R-14` "next to the status", visual check in T-10) | — |
| `SectionZeroDashboardComponent` (corrected T-7, was `BilateralSpSelectorComponent`, which is never on screen at 7) | At 7 with exactly one allocated SP: read-only chip + note *"This project is allocated to a single Science Program, so there is no alternative to choose."* (`R-11`) | `hlm-badge`, muted text |
| Results list modal | List every `REJECT` and `RESUBMIT` entry in chronological order (oldest first), each: action, SP code (or none), reviewer, date, comment or the fallback. `UPDATE` rows hidden. Accept `REJECT`/`REJECTED` | `hlm-dialog`, `hlm-separator` |
| Notification row (bell `pop-up-notification-item` **and** the notifications page row `results-notifications/.../notification-item` — widened T-9, user 2026-10-06) | Rejected rows with `has_review_entry`: a second line *"Reason: …"* clamped to 2 lines; empty → the fallback; no `has_review_entry` → no line | Existing panel styles + `line-clamp` |

Design tokens: reuse the existing status-rejected tokens from `result-status-tokens` and `docs/ux-ui/design.md` §7. No new tokens.

## 10. Shared Contracts

- Notifications list item: `review_comment?`, `has_review_entry?` (client model extended, optional).
- Contract doc `bilateral-result-summaries.en.md`: change-log row "a resubmission that changes the primary SP assigns it directly; no acceptance round" (`RRC-R-17`).

## 11. Design Decisions

| ID | Decision | Rejected alternative | Covers |
|---|---|---|---|
| `RRC-DD-1` | Widen status sets by one value; no new "correction" status | A new status or reverting to Editing: violates BR2 / AC2 | R-1, R-2, R-5 |
| `RRC-DD-2` | Client: one computed change; every consumer follows (`P-3`, `P-4`) | Per-component checks: drift risk | R-1, R-6 |
| `RRC-DD-3` | **Direct transfer = `accept()`'s write block extracted**, plus an ACCEPTED `primary` row for the new SP | Auto-accept a fake round (Option C): needs a system actor and suppressed notices | R-10, R-17 |
| `RRC-DD-4` | Transfer only on 7; 1/8 untouched | Direct everywhere: breaks AC31; Juan David's "as it is today" read was checked against the code (it is the request flow) | R-12 |
| `RRC-DD-5` | No contributor release while at 7; release at submit | Release on save (today): violates R-8 | R-8 |
| `RRC-DD-6` | Notification links its history row (`review_history_id`) and the readout joins the comment | Text embedding: collides with the shape-detection already in the builders · Copy column: two sources for the same text | R-13 |
| `RRC-DD-7` | `RSB` swaps `requestPrimary` for `transferPrimary`; always announces | Keep acceptance on the API: contradicts the 2026-10-06 decision | R-17 |
| `RRC-DD-8` | Banner and modal read the existing history endpoint; no new endpoint | Dedicated "current reason" endpoint: duplicates `P-8` | R-14, R-15 |

### Reversion challenge (Step 2.3, inline) — "what does removing this break?"

| DD | What is removed | What it breaks | Addressed |
|---|---|---|---|
| `DD-3` | The acceptance round on 7 | (a) `stateFor` priority reads accepted > pending: without an accepted row the client SP chip shows the wrong state → **core writes an ACCEPTED `primary` row** · (b) `accept()` retired the old owner's accepted row on a swap → core retires active `primary` rows · (c) ToC stub seeding and contributor release lived in `accept()` → in the core (release behind a flag) · (d) the "accepted" Center notice → intentionally not emitted (AC23) | Yes |
| `DD-5` | Immediate release on contributor save | A contributor added at 7 would never be sent → `8.3` releases at submit · An accepted contributor (role 2) is untouched by rejection, so it is not resent (correct: it already accepted) | Yes |
| `DD-7` | Acceptance on the API path | The ownerless-announce deferral (`PNS-R-3`) relied on accept → after transfer an owner always exists, so announce always | Yes |

## 12. Risks, Rollout, Rollback

| # | Risk | Mitigation |
|---|---|---|
| `RRC-K-1` | `accept()` refactor regresses PSR/PNS | Extract only the write block; run the existing `primary-program-request` + `bilateral-center` specs unchanged before and after |
| `RRC-K-2` | `P-10`/`P-11` false | T-2/T-3 verify first; a false premise is a HALT, not an improvisation |
| `RRC-K-3` | `RSB` ships before `T-6` | Hold the `RSB` push until `T-6` is done (decided 2026-10-06) |
| `RRC-K-4` | Migration on a shared table | Nullable, additive, guarded; user runs `up`/`down` on PRTest (agents never touch the DB) |
| `RRC-K-5` | Server never checks centre ownership on section writes | Accepted (parity, `RRC-OQ-1` default); recorded |

**Rollout:** PR A (server + migration, T-1..T-6) → staging with `RSB`; PR B (client, T-7..T-9). Client B against an old server is safe (fields optional; 7 stays refused by the server).
**Rollback:** revert PR B (UI locks again); revert PR A (migration `down` drops the nullable column; no data loss beyond the links).

## 13. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | **10** (9 code + 1 manual PRTest run) |
| LOC | **~1,300** (~550 production, ~750 tests) |
| Review rounds | 1 per task; **2** budgeted for T-2 (transfer core) and T-6 (`RSB`) |

Depth check: matches **Full** (cross-cutting, migration, API behaviour change).
