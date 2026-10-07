# Tasks — A centre corrects and resubmits a rejected bilateral result in the Reporting Tool

## 1. Scope of this task list

| Field | Value |
|---|---|
| Spec Path | `bilateral/rejected-result-correction` (`RRC`) |
| Linked spec | `requirements.md` + `design.md`, same folder |
| Jira | P2-3895 |
| Status | `in-progress` (T-1..T-9 done; T-10 in progress (finding F1 being fixed), 2026-10-06) |
| Budget (design §13) | 10 tasks · ~1,300 LOC · 1 review round each, 2 for T-1 and T-6 |

## 2. Pre-flight checklist

- [ ] `requirements.md` and `design.md` approved.
- [ ] `RSB-T-1` present in the checkout (history `initiative_id`, `RESUBMIT`, readout `initiative_code`).
- [ ] **Do not push `RSB` to staging before `RRC-T-6`** (design `RRC-K-3`).
- [ ] Tests always scoped, `--maxWorkers=2`, one run at a time on the machine. Never the full suite.
- [ ] Lint only touched files: `npx eslint <files> --quiet`.
- [ ] Agents never touch the DB: the user applies the migration and runs the SQL checks. Queries go in chat, never as files.
- [ ] Browser checks are read-only (the local stack writes to the shared `prdb` and the prod mailer).
- [ ] **No commit without the user's explicit go-ahead.** Subjects start with emoji + type; no apostrophes, quotes or `$`.

## 3. Task list

### `RRC-T-1` — Direct transfer core extracted from `accept()`

- **Status:** `[x]`: Reviewer PASS ×2 (lenses), attempt 1, 2026-10-06 (see `execution.md`).
- **Type:** server
- **Description:** Add `PrimaryProgramRequestService.transferPrimary(resultId, newInitiativeId, user, manager, { releaseContributors })` holding the ownership writes `accept()` runs on a genuine change (design §8.2 steps 1–5), plus the retire-active-`primary`-rows + write-one-ACCEPTED-row step (`DD-3`). `accept()` calls the same write block; its lock, PENDING check, authorization and post-commit notices stay where they are. **First** verify `RRC-P-10` (what `stateFor` returns for a Rejected result today) and record it in `execution.md`.
- **Implements:** `RRC-R-10` (the "SP is primary at once" clause and "no ownership request" clause at the service level), `RRC-R-17` (shared core)
- **Files:** `onecgiar-pr-server/src/api/results/share-result-request/services/primary-program-request.service.ts` + spec
- **Depends on:** — · **Blocks:** T-2, T-6
- **Estimate:** M · **Review:** `lenses` (shared symbol behind PSR/PNS/PDR)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern="primary-program-request" --silent --reporters=summary`
  - New tests: change → old role 1 off, new role 1 on, stray contributor/contribution request to the new SP off, old ToC retired, stub seeded, exactly one active ACCEPTED `primary` row for the new SP; same SP → no writes; `releaseContributors:false` → `releaseContributors` not called; no `emitCenterNotice`, no `announceIfPendingReview`.
  - Existing `accept()` tests: unchanged and green.
- **Falsifier:** an `accept()` test asserting the "accepted" Center notice must still pass; a transfer test where two ACCEPTED `primary` rows remain active must fail.
- **Disqualifier:** if any existing `accept`/`decline`/`request` test was edited to pass, the run is not evidence: report the edit instead of PASS.
- **Done:** [x] `P-10` recorded · [x] scoped Jest green · [x] eslint/tsc clean on touched files.

### `RRC-T-2` — Primary SP change on Rejected = direct transfer

- **Status:** `[x]`: Reviewer PASS, attempt 1, 2026-10-06 (see `execution.md`).
- **Type:** server
- **Description:** `updatePrimaryAssignment` admits status 7 (message updated to name Rejected). Catalogue allocation check unchanged. At 7, a changed primary calls `transferPrimary(…, { releaseContributors: false })` inside the existing transaction after the row lock; 1/8 keep today's code path verbatim. Log line per transfer (`RRC-R-18`).
- **Implements:** `RRC-R-9`, `RRC-R-10` (direct transfer, Submit not blocked, no ToC demanded, change of mind), `RRC-R-12`, `RRC-R-18` (transfer half)
- **Files:** `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts` + spec
- **Depends on:** T-1 · **Blocks:** T-10
- **Estimate:** S · **Review:** `full`
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern="bilateral-center.service" --silent --reporters=summary`
  - Status table (8 statuses): only 1, 8, 7 pass the gate; others → today's 400.
  - At 7: SP not in the catalogue → existing "not allocated" message, `transferPrimary` not called, no writes; allocated SP → `transferPrimary` called, `request()` not called; then `assertSubmittable` does not hit the pending-primary block.
  - At 1/8: existing first-pick DRAFT, swap and same-owner re-pick tests unchanged and green (`RRC-R-12`).
- **Falsifier:** a 7-status test where `primaryProgramRequestService.request` is called must fail.
- **Disqualifier:** a pre-existing 1/8 test modified to pass invalidates the `R-12` evidence.
- **Done:** [x] scoped Jest green · [x] eslint/tsc clean.

### `RRC-T-3` — Submit from Rejected, and contributors held until then

- **Status:** `[x]`: Reviewer PASS on attempt 1 (original scope) + attempt 2 (pivot `P-13`), 2026-10-06 (see `execution.md`).
- **Type:** server
- **Description:** `assertSubmittable` submittable = `{1, 8, 7}` (message updated). In `submitForReview`, a 7 → 5 flip writes a `RESUBMIT` history row (`initiative_id` = owner) instead of the ordinary one and calls `releaseContributors` in the same transaction; post-commit `announcePendingReview` as today; log line (`R-18`). In the contributors save, skip `releaseContributors` while status is 7. **Pivot (user-approved 2026-10-06, `RRC-P-13`):** in `results.service.ts` `_loadBilateralRelatedData`, add `Rejected` to the `draftVisibleStatuses` passed to `getDraftInit`, so drafts re-added at 7 show on reload. **First** verify `RRC-P-11` (are deactivated contributors still listed by the client after a rejection?) and record it; if they are, HALT and ask before writing.
- **Implements:** `RRC-R-5`, `RRC-R-6` (server: stale guard untouched), `RRC-R-7`, `RRC-R-8`, `RRC-R-2` (the "nothing sent / no notification" clause for contributor saves), `RRC-R-18` (resubmission half)
- **Files:** `bilateral-center.service.ts` + spec · `results.service.ts` + spec (pivot `P-13`, one line)
- **Depends on:** — · **Blocks:** T-10
- **Estimate:** M · **Review:** `full`
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern="bilateral-center.service" --silent --reporters=summary`
  - Submit/assess/field-revision: 8-status table, only 1, 8, 7 pass.
  - From 7: status 5 written, `RESUBMIT` row with owner `initiative_id`, `releaseContributors` called, `announcePendingReview` called once.
  - From 1/8: ordinary history row, no `RESUBMIT` (`RRC-R-3` / AC30).
  - 7 with no primary → today's message (`R-7`). 7 with stale assessment → today's stale refusal (`R-6`).
  - Contributor save at 7 → drafts written, `releaseContributors` **not** called; at 1 with owner → called (unchanged).
  - Pivot `P-13`: `npx jest --maxWorkers=2 --testPathPattern="results.service.spec" --silent --reporters=summary` → the bilateral readout passes `getDraftInit` a list that includes Rejected (and still Editing, Draft, Pending Review).
- **Falsifier:** a contributor save at 7 that calls `releaseContributors` must fail; a submit from 7 that writes `status_id: 1` must fail.
- **Disqualifier:** `P-11` unverified → T-3 is not done, whatever Jest says.
- **Done:** [x] `P-11` recorded · [x] scoped Jest green · [x] eslint/tsc clean.

### `RRC-T-4` — Migration: `notification.review_history_id`

- **Status:** `[x]`: code PASS ×2 (lenses) + user `SHOW COLUMNS` and `up`/`down`/`up` on `prdb`, 2026-10-06 (see `execution.md`).
- **Type:** db
- **Description:** Nullable FK `notification.review_history_id` → `result_review_history.id` (`ON DELETE SET NULL`), index, existence-guarded `up`, `down` drops FK/index/column. Type matches the real PK (`RRC-P-12`, read the entity + `SHOW COLUMNS` from the user). Entity property added.
- **Implements:** `RRC-R-13` (storage)
- **Files:** `onecgiar-pr-server/src/migrations/<ts>-NotificationReviewHistoryLink.ts`, `notification.entity.ts`
- **Depends on:** — · **Blocks:** T-5
- **Estimate:** S · **Review:** `full`
- **Skills:** `nestjs-expert`
- **Verification:** `npm run migration:check` (expects exactly this one pending); the user runs `up` / `down` / `up` on PRTest and the SQL in chat.
- **Falsifier:** `migration:check` listing a second unexpected pending migration fails the task.
- **Disqualifier:** `migration:check` green proves nothing about `up`/`down`; the task stays `[~]` until the user reports them.
- **Done:** [x] migration:check · [x] user `up`/`down`/`up` on PRTest (`prdb`) · [x] eslint/tsc.

### `RRC-T-5` — The rejection notification carries its history row

- **Status:** `[x]`: Reviewer PASS, attempt 1, 2026-10-06 (see `execution.md`).
- **Type:** server
- **Description:** `reviewBilateralResult` passes the saved REJECT history row id to `emitBilateralReviewNotification`; both submitter and centre rows store `review_history_id` (Reject only). The panel readout LEFT JOINs `result_review_history` and returns `review_comment` and `has_review_entry` per row. Text builders untouched.
- **Implements:** `RRC-R-13` (server: "that rejection's reason", legacy rows), `RRC-R-16`
- **Files:** `results.service.ts`, `notification.service.ts` + specs
- **Depends on:** T-4 · **Blocks:** T-9
- **Estimate:** M · **Review:** `full`
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern="results.service|notification.service" --silent --reporters=summary`
  - Reject → both emits get the row id; Approve → none.
  - Two rejections → each notification returns its own comment.
  - `review_history_id NULL` → `has_review_entry: false`, `review_comment: null`.
  - Exact-string assertions for created/submitted/unsubmitted/quality-assessed/approved descriptions unchanged.
- **Falsifier:** a readout that joins "latest REJECT of the result" instead of the linked row returns B for the first notification → the two-rejection test must fail.
- **Disqualifier:** if the exact-string tests were regenerated from the new output, they are not regression evidence.
- **Done:** [x] scoped Jest green · [x] eslint/tsc clean.

### `RRC-T-6` — API resubmission uses the direct transfer

- **Status:** `[x]`: Reviewer PASS ×2 (lenses) on attempt 2 after a user-approved pivot (NFR §7), 2026-10-06 (see `execution.md`).
- **Type:** server + docs
- **Description:** In `RSB`, swap the writers port's `requestPrimary` for `transferPrimary(…, { releaseContributors: true })` (wired at `bilateral.service.ts:~4800`) and announce the pending review always. Amend `RSB-R-14` and the affected `RSB` design/tasks/execution text (Correction Closure: grep "acceptance flow", "requestPrimary", "pending acceptance" across the `RSB` folder). Add the change-log row to `bilateral-result-summaries.en.md`.
- **Implements:** `RRC-R-17`
- **Files:** `bilateral-resubmission.service.ts` + spec, `bilateral.service.ts` (+ spec), `docs/specs/archive/2026-10-06-bilateral--resubmit-rejected-result/*` (RSB folder, archived), `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` · **Pivot (user 2026-10-06, NFR §7):** on a changed primary the RSB reset no longer retires the old owner; the transfer does it inside the final transaction, so a failure leaves the previous primary intact (design §8.6)
- **Depends on:** T-1 · **Blocks:** T-10
- **Estimate:** M · **Review:** `full`
- **Skills:** `nestjs-expert`, `tdd`, `api-design-principles`
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern="bilateral-resubmission|bilateral.service.spec" --silent --reporters=summary`
  - Changed primary → `transferPrimary` called in the commit transaction, `request` not called, announce called once.
  - Unchanged primary → no transfer, announce called (as today).
  - Every other `RSB` test green unchanged.
- **Falsifier:** a changed-primary test where announce is skipped must fail.
- **Disqualifier:** grep for "acceptance flow" still hitting a live `RSB` requirement after the edit → Correction Closure not done.
- **Done:** [x] scoped Jest green · [x] `RSB` docs amended · [x] change-log row · [x] eslint/tsc.

### `RRC-T-7` — Client: Rejected unlocks the editor; single-allocation note

- **Status:** `[x]`: Reviewer PASS, attempt 1, 2026-10-06 (see `execution.md`).
- **Type:** client
- **Description:** `isEditableByCenterUser` returns true for 7. The SP selector, at 7 with exactly one allocated SP, shows a read-only chip and the single-allocation note (copy in `internationalization/`). Nothing else changes status on the client (save keeps 7).
- **Implements:** `RRC-R-1` (both scenarios, client side), `RRC-R-2` (badge stays Rejected after save), `RRC-R-3` (client), `RRC-R-6` (drawer interactive at 7, read-only at 5), `RRC-R-11`
- **Files:** `pages/bilateral/services/bilateral-creation.service.ts`, `components/section-zero-dashboard/*` (corrected at execution: was `bilateral-sp-selector`, which only mounts in the creation wizard), `internationalization/*` + specs
- **Depends on:** — · **Blocks:** T-10
- **Estimate:** S · **Review:** `checklist`
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:** `npm run test:local -- --testPathPattern="bilateral-creation.service|bilateral-sp-selector|bilateral-quality-assessment-dialog|bilateral-result-creator"`
  - Editability table: null/1/8/7 → true; 2/3/4/5/6 → false.
  - Creator: 7 + not a member of the lead centre + not admin → `rolesSE.readOnly` true (`R-1` AC4).
  - Drawer: 7 → Submit offered when current; 5 → read-only (`QSG-R-5` intact).
  - Selector: one allocated SP at 7 → note rendered, no empty dropdown.
- **Falsifier:** status 5 returning editable must fail the table.
- **Disqualifier:** presence of the note's text in the DOM does not prove it is understandable or laid out right → covered by the T-10 visual check.
- **Done:** [x] scoped Jest green · [x] lint clean (`ng lint --lint-file-patterns`).

### `RRC-T-8` — Client: rejection notice on the result + full history modal

- **Status:** `[x]`: Reviewer PASS on attempt 3, 2026-10-06 (see `execution.md`).
- **Type:** client
- **Description:** New `BilateralRejectionNoticeComponent` hosted under the header's status badge (design §9): at 7 loads the history once, shows the newest `REJECT` comment with SP code and date, the fallback for an empty comment, a neutral error message on load failure, 3-line clamp + "Show more"; hidden at any other status. Results list modal: every `REJECT` and `RESUBMIT` entry oldest first, with action, SP code (none for legacy rows), reviewer, date, comment or fallback; `UPDATE` hidden; `REJECT`/`REJECTED` accepted.
- **Implements:** `RRC-R-14` (all scenarios), `RRC-R-15` (all scenarios, display side)
- **Files:** `components/bilateral-rejection-notice/*` (new), `components/bilateral-page-header/*`, `pages/bilateral-results-list/*`, `internationalization/*` + specs
- **Depends on:** — (needs `RSB-T-1` readout) · **Blocks:** T-10
- **Estimate:** M · **Review:** `checklist`
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:** `npm run test:local -- --testPathPattern="bilateral-rejection-notice|bilateral-page-header|bilateral-results-list"`
  - Notice: 7 + rows [REJECT C, RESUBMIT, REJECT B, REJECT A] (newest first) → shows C; empty comment → fallback; 5 → not rendered; no edit/dismiss control in the DOM.
  - Modal: same rows → A, B, C in order with SP codes; legacy row without `initiative_code` shows no SP; UPDATE rows absent.
- **Falsifier:** the notice picking the oldest REJECT (A) must fail.
- **Disqualifier:** clamp classes present ≠ clamp working (jsdom cannot measure) → T-10 visual check.
- **Done:** [x] scoped Jest green · [x] lint clean.

### `RRC-T-9` — Client: reason line in the rejection notification

- **Status:** `[x]`: Reviewer PASS, attempt 1 (scope widened by the user to the notifications page), 2026-10-06 (see `execution.md`).
- **Type:** client
- **Description:** Extend the notification model with optional `review_comment` / `has_review_entry`. For Rejected rows with `has_review_entry`, render "Reason: …" clamped to 2 lines, or the fallback when empty; no line when `has_review_entry` is false/absent.
- **Implements:** `RRC-R-13` (client: panel, fallback, legacy, long text), `RRC-R-16` (client copy for other types unchanged)
- **Files:** `shared/constants/notification-type.constants.ts`, `shared/components/header-panel/components/pop-up-notification-item/*` + specs · **widened (user 2026-10-06):** `pages/results/pages/results-outlet/pages/results-notifications/components/notification-item/*` + spec (same reason line on the notifications page)
- **Depends on:** T-5 · **Blocks:** T-10
- **Estimate:** S · **Review:** `checklist`
- **Skills:** `angular-developer`, `spartan`
- **Verification:** `npm run test:local -- --testPathPattern="notification-type.constants|pop-up-notification-item"`
  - With comment → line shown; empty + entry → fallback; no entry → no line, existing text exact.
  - Existing tests for the other types unchanged and green.
- **Falsifier:** a legacy row (no entry) showing the fallback must fail.
- **Done:** [x] scoped Jest green · [x] lint clean.

### `RRC-T-10` — Real run on PRTest + visual check (manual, user)

- **Status:** `[ ]`
- **Type:** rollout
- **Description:** The ticket's *How to test*, on PRTest after PR A and PR B are deployed: main cycle; stale check; no justification; three rejections + approval; SP move on a 2+ SP project (lands in the new SP's queue, ordinary notice, no ToC asked); single-SP project; another centre vs admin; status regression (5, 6, 4 admin exemption, 1/8 submit); notification regression; already resubmitted; contributor kept vs removed (`R-8`); API resubmission with a changed primary (`R-17`). Visual: the notice, long-text clamp, the modal, the single-SP note, the panel line (layout + contrast), read-only in the browser.
- **Implements:** every requirement's end-to-end evidence; the visual defect class in requirements §9
- **Depends on:** T-1..T-9
- **Verification:** SQL given in chat (history rows, role-1 rows, `share_result_request` rows, notification links); results recorded in `execution.md`.
- **Disqualifier:** a check run on the local stack instead of PRTest is not evidence for this task.
- **Done:** [ ] every scenario above recorded with its outcome.

### `RRC-T-10-F1` — Rejection notification names the SP that rejected (finding from T-10)

- **Status:** `[x]`: Reviewer PASS, attempt 1, 2026-10-07 (code); PRTest confirmation folded into T-10 (see `execution.md`).
- **Type:** server + client (fix, user-approved 2026-10-07)
- **Description:** Rejected notifications must name the SP that recorded **that** rejection, not the result's current primary. Server: the panel and bell readouts add `review_program_code` (official code of the linked `result_review_history.initiative_id`, or `null`) to Rejected rows, next to `review_comment` / `has_review_entry`. Client: the Rejected sentence (bell + notifications page) uses `review_program_code` when the row has a linked entry and a code; otherwise today's `getProgramCode` (legacy rows and history rows without SP unchanged).
- **Implements:** `RRC-R-13` ("by which SP"), `RRC-R-16` (other types unchanged)
- **Files:** `onecgiar-pr-server/src/api/notification/notification.service.ts` + spec (and the `ResultReviewHistory` relation only if needed); `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` + spec + `shared/components/header-panel/components/pop-up-notification-item/pop-up-notification-item.component.ts` + spec (bell chip, declared addition)
- **Depends on:** T-5, T-9 · **Blocks:** T-10
- **Review:** `full`
- **Verification:** server `npx jest --maxWorkers=2 --testPathPattern="notification.service" --silent --reporters=summary`; client `npx jest --maxWorkers=2 --no-coverage --testPathPattern="notification-type.constants|pop-up-notification-item|notification-item"`.
  - Two rejections by SP02, then primary moved to SP10 → both sentences say SP02.
  - Linked history row without SP (pre-`RSB-T-1`) → falls back to today's code, never a wrong SP.
  - Legacy row (no entry) → sentence exactly as today. Other types' sentences unchanged.
- **Falsifier:** a test where the current primary is SP10 and the linked rejection is SP02 must fail if the sentence says SP10.
- **Done:** [x] scoped Jest green (server + client) · [x] lint/tsc clean.

## 4. Dependency Graph

```
T-1 ──► T-2 ──┐
  └───► T-6 ──┤
T-3 ──────────┤
T-4 ──► T-5 ──┼──► T-9 ──┐
T-7 ──────────┤          ├──► T-10
T-8 ──────────┘──────────┘
```

Independent starts (one test run at a time still applies): T-1, T-3, T-4, T-7, T-8 touch different files. T-2 and T-3 share `bilateral-center.service.ts`, so run them one after the other. T-5 and T-3 never share a file.

## 5. Coverage Closure (by scenario and clause)

| Requirement · scenario / clause | Owner |
|---|---|
| R-1 · Centre user opens a rejected result (editable, badge Rejected) | T-7 (client), T-10 |
| R-1 · Another centre or plain user, "must NOT be more permissive than Editing" | T-7 (creator membership test), T-10 |
| R-2 · Save keeps Rejected | T-7 (client), T-10 (server rows); `P-2` (no save writes status) |
| R-2 · "nothing is sent … no notification" | T-3 (contributor release skipped), T-10 |
| R-2 · Corrected but never submitted | T-3 (no release, no announce without submit) |
| R-3 · Pending Review / Approved locked, "AND IT MUST be refused by the server" | T-2, T-3 (8-status tables), T-7 |
| R-3 · Discontinued admin exemption untouched | T-7 (no change to `bilateral-annual-updating`), T-10 |
| R-4 · Closed phase wins | T-10 (existing phase checks run before; no code path added) |
| R-5 · Resubmission (5, queue, ordinary notice, history entry), "must NOT go back to Editing" | T-3, T-10 |
| R-6 · Stale check, "guard must NOT be relaxed" | T-3 (stale refusal at 7), T-10 |
| R-6 · Drawer at Rejected, "AND IT MUST stay read-only for Pending Review" | T-7 |
| R-7 · No primary, same refusal | T-3 |
| R-8 · Contributor kept, "no request reaches SP06 before the resubmission" | T-3, T-10 |
| R-8 · Contributor removed | T-3 (release only drafts present), T-10 |
| R-9 · Two or more allocated SPs (only allocated offered; rejecting SP still pickable) | T-2 (server refusal), T-10 (selector offers) |
| R-10 · Direct transfer, "must NOT receive an ownership request", "AND IT MUST NOT ask for a ToC mapping" | T-1, T-2 |
| R-10 · Submit after the move (new SP's queue, ordinary notice) | T-2, T-3, T-10 |
| R-10 · Change of mind | T-2 (second transfer back; nothing emitted) |
| R-11 · Single allocation explained | T-7, T-10 |
| R-12 · Editing/Draft SP flow unchanged | T-2 |
| R-13 · Justification in the panel | T-5, T-9 |
| R-13 · Older rejection keeps its own reason | T-5 |
| R-13 · Legacy notifications, "must NOT claim No justification" | T-5, T-9 |
| R-13 · "No justification was recorded." | T-9 |
| R-13 · Long justification does not break layout | T-9 (clamp), T-10 (visual) |
| R-14 · Reason next to the status, no edit/dismiss control | T-8, T-10 |
| R-14 · After resubmission, notice gone, history reachable | T-8 |
| R-14 · Fallback text | T-8 |
| R-15 · Three rejections in order with SP, reviewer, date | T-8 |
| R-15 · After approval | T-8 (status-independent modal), T-10 |
| R-15 · Rows before `RSB-T-1`, "must NOT show a wrong SP" | T-8 |
| R-15 · Never overwritten or deleted | `RSB-T-1` (append-only), T-3 (RESUBMIT is an insert) |
| R-16 · Other notifications keep their wording | T-5, T-9 |
| R-17 · STAR moves the result, "must NOT receive an ownership request" | T-6 |
| R-17 · Endpoint, payload, response unchanged | T-6 (existing `RSB` tests green) |
| R-18 · Observability | T-2 (transfer), T-3 (resubmission) |

## 6. Rollout & Verification

- [ ] **PR A** (server + migration: T-1..T-6) → `staging`, together with `RSB`. Jenkins applies both migrations. Notify STAR/MEL/TIP with the change-log row.
- [ ] **PR B** (client: T-7..T-9) → `staging` after PR A (safe in either order: new fields optional, 7 refused by an old server).
- [ ] T-10 on PRTest before promotion. Promotion to `master` belongs to its owner; not offered by the agent.

## 7. Roll-back Plan

Revert PR B → editor locks Rejected again. Revert PR A → migration `down` drops the nullable link column; history and results untouched.
