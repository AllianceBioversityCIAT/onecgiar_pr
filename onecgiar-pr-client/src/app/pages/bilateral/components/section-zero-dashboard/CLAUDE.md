# section-zero-dashboard (bilateral)

**Verified:** 2026-10-06 · spec `bilateral/rejected-result-correction` RRC-R-11 / RRC-T-7; prior: 2026-10-01 · spec `notifications/primary-decline-rejects-result` PDR-R-9 / PDR-DD-8

## What it is
Section 0 of the bilateral form: the read-mostly card that identifies the result (code, type,
reporting phase, funding source) and its W3/Bilateral project, single-column since 2026-09-04.
It is the only section that is not inside an accordion.
**The Actions card is GONE (2026-09-04)** — Submit for review lives in the editor's sections rail
(`bilateral-result-creator`, `.bcr-rail__submit`, same slot as the W1/W2 result-detail rail) and the
disabled Coming-soon buttons (Generate Narrative / Download PDF / AI Review) were removed with the
card; bring it back only when one of those actions actually ships.

## Contract
- Input: `readOnly` (`isFormReadOnly()` of the editor). Editing/Draft results can update their
  lead project and primary program together; reviewed results remain static.
- State: `BilateralCreationService` owns display state. The assignment is persisted only through
  `PATCH /api/bilateral/center/primary-assignment/:resultId`, never through Contributors.
- **PSR-T-10 (2026-09-30):** the chosen primary SP is a *request*, not a fact, until it accepts.
  `primary_request` (`{ state: 'none'|'pending'|'sent_back'|'accepted', program_code,
  declined_by_codes[] }`) is read from `BilateralApiService.GET_resultInitiativeId` on every
  `currentResultId()` change (a `constructor()` effect — this component has no `ngOnInit`), and is
  refreshed immediately from the `PATCH primary-assignment` response on save (replaces the old
  boolean `tocCleared` field, 2026-09-30 change log) so the banner/picker don't blink stale state
  while `loadResult` re-fetches in the background. `pending` disables the picker
  (`primaryPickerDisabled()`); `sent_back` leaves it enabled, builds its banner code(s) from
  `declined_by_codes` (the server sends `program_code: null` for that state), and marks those
  entries `(declined)` in the options list — they stay selectable (DD-8: re-picking a decliner
  starts a new round). `none` (no owner — T-5 forward pointer) shows the `noneUnpicked` warning
  banner ("Pick a primary Science Program", no codes), adds `submitBlockedReason`, and keeps the
  picker enabled. Copy lives in
  `internationalization/bilateral-primary-assignment.copy.ts`.
- **PDR-R-9 / PDR-DD-8 (2026-10-01):** `sent_back` + `readOnly()` true is a second, final variant —
  the result was **Rejected** for the Center, not merely awaiting a re-pick. `primaryAssignmentBanner()`
  then renders `BILATERAL_PRIMARY_ASSIGNMENT_COPY.banner.rejected(codes)` with `tone: 'error'` (the
  spec's "danger" tone maps to `app-alert-status`'s `'error'` — the component has no `danger` value).
  No "Pick another" wording, and the picker is gone too, because `canEditAssignment()` already gates
  on `readOnly()`. When `sent_back` is NOT read-only (older sent-back results), the original warning
  banner (`sentBack(codes)`) and the enabled picker are unchanged. ⚠️ Known caveat: `readOnly()` is
  also `true` for PendingReview/Approved results; a `sent_back` result in one of those states would
  hit this same rejected branch, but that combination is believed unreachable — a DB check to confirm
  it never occurs is pending at PDR-T-6.

- **RRC-R-1 / RRC-R-11 / RRC-T-7 (2026-10-06):** Rejected (7) is editable (`isEditableByCenterUser`), so
  `readOnly()` no longer tells a rejected result apart; `isRejected()` (`resultStatusId() === 7`) does.
  The rejected banner now shows when `readOnly() || isRejected()`. At 7 with exactly one allocated SP
  (`singleAllocationLocked()`: `isRejected && canEditAssignment && sciencePrograms.length === 1`) the
  picker is replaced by an `hlmBadge` chip with the owner plus the note
  (`BILATERAL_PRIMARY_ASSIGNMENT_COPY.singleAllocationNote`) — no empty dropdown. At 7 with an owner
  (`selectedPrimarySp()`), request state `none` is the deactivated-requests artefact after a review
  rejection: no "Pick a primary…" banner and no `submitBlockedReason`. The owner always comes from
  `selectedPrimarySp()`, never from the request state.

## Where it is used
- `pages/bilateral-result-creator/bilateral-result-creator.component.html:210` — the only host.

## Traps (⚠️ = already broke something)
- 🛑 **P2-3283: project and primary program are editable only as one server-validated assignment.**
  The client stages the project until a primary program is selected; it must not call
  `saveContributors` because that sync-replaces project rows and cannot update role 1. The server
  accepts only confirmed positive-allocation mappings from the result's immutable lead centre.
  Changing primary program clears its ToC mapping and the replacement must be mapped again.
- The Submit gate (`overallStatus() === 'complete'` + not submitting + not read-only, the last one
  being the P2-3520 lock) moved with the button: it is `canSubmitFromRail()` in
  `bilateral-result-creator`, and `submitResult()` re-checks its own guards regardless.
- Every spec assertion about the project field reads the **rendered DOM** on purpose: the client runs
  zoneless, so asserting a class property passes with the defect still on screen.
- 🛑 **P2-3760: the Contribution % is stored on the LEAD `results_by_projects` row, not on the
  project.** It rides the same `PATCH primary-assignment` save, and the endpoint requires
  `project_id` + `primary_science_program_id` even when only the percentage moved — that is why
  `saveAssignment()` still demands a primary program. `contribution_percentage` is sent **only when
  it changed**: an omitted key means "leave the stored value alone", which is what keeps an older
  client from blanking it. Stored `NULL` = never answered and renders as the 100 the story asks for.
  ⚠️ `BilateralCreationService` is a **root singleton** and the percentage hydrates only from a lead
  row that carries `obj_clarisa_project`, so it MUST stay in `loadResult`'s reset block — without it
  the previous result's number shows on the next one and gets saved onto it (caught pre-merge).
- 🛑 **P2-3759: the Lead Center field goes ABOVE the W3/Bilateral Project field and is labelled
  "Lead Center", not "Center"** — the story says "Positioned above the W3/Bilateral Project field".
  `.bp-project-fields` is a flex column with no `order`, so DOM order IS screen order; the specs
  assert the label index, and they assert `indexOf(...) >= 0` too, because a missing label indexes
  to `-1` and would otherwise satisfy "before Project" while the field is not on screen at all.

## Pending / Coming soon
- `Generate Narrative`, `Download PDF`, `AI Review` — **not rendered at all since 2026-09-04** (the
  Actions card was removed); when one ships, it needs a new home, not a resurrection of the card as-was.
