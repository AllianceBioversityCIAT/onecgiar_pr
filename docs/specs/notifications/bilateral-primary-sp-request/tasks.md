# Bilateral Primary Science Program Request — Tasks

## 1. Scope of this task list

- **Module / feature:** `notifications/bilateral-primary-sp-request`
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Owner / driver:** Santiago Sanchez
- **Status:** not-started (spec approved 2026-09-30)
- **Budget (from `design.md` §13):** 11 tasks · ~1,600–2,000 LOC · 2 review rounds on T-3/T-5, 1 elsewhere. Exceeding it → the Leader stops and escalates.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Continue, 2026-09-30)
- [x] `design.md` approved (Continue, 2026-09-30)
- [x] Open questions: all proposal OQs adopted as defaults; `PSR-OQ-1` (admins may decide contributor requests too) and `PSR-OQ-2` (auto-moved request uses the same sentence) default-adopted
- [x] Migration: yes (T-1). `npm run migration:check` green before T-2 starts
- [ ] No conflicting in-flight spec on the same files: `notifications/inbox-revamp` is merged (`487200d8a`). Confirm `bilateral-contributor-tagging` / `bilateral-review-decision` have no open branch touching `share-result-request.service.ts`

---

## 3. Task list

### `PSR-T-1` — Migration + entity: request kind, nullable draft owner, 3 notice types `[x]`
- **Type:** `db`, `server`
- **Description:** Add `request_type` (`contribution` | `primary`, NOT NULL, default `contribution`) to `share_result_request`; make `owner_initiative_id` nullable; insert notification types `Primary Program Request Accepted` / `Declined` / `Moved`; add the enum values server-side. Working `down`.
- **Implements:** design §3 (DD-1, DD-5, DD-7 data); NFR backwards compatibility
- **Files:** `src/migrations/<ts>-AddPrimaryProgramRequest.ts`, `share-result-request.entity.ts`, `notification/enum/notification.enum.ts`
- **Depends on:** — · **Blocks:** T-2..T-7
- **Estimate:** S · **Review:** checklist · **Skills:** `nestjs-expert`
- **Verification:** `npm run migration:check`; entity spec / a repository test that an unset `request_type` saves as `contribution`.
  - **Falsifier:** a row inserted without `request_type` reads back as anything other than `contribution` → FAIL; `down` then `up` on a local DB fails → FAIL.
  - **Disqualifier:** `migration:check` green against a DB where the migration never ran is not evidence. Run `migration:run` locally first (disposable local DB, `docs/infrastructure.md` §6).
- **DoD:** migration + entity + enum; lint clean; `migration:check` green.

### `PSR-T-2` — `PrimaryProgramRequestService`: request, cancel round, state, alignment, recipients `[x]`
- **Type:** `server`
- **Description:** New service in `api/results/share-result-request/services/`. `request(result, sp, user, manager?)` validates the SP against the lead project's alignments (P-7) and cancels the active round on a re-pick (DD-8). Idempotent for the same SP. Never throws to the caller. `stateFor(result)` returns `none | pending | sent_back | accepted` + codes. Alignment helper returns the count and "the other SP". `RoleByUserRepository.getPlatformAdminUserIds()`.
- **Implements:** `PSR-R-2` (all scenarios except swap accept), `PSR-R-3`, `PSR-R-7` (state derivation), DD-8
- **Files:** new service + spec; `share-result-request.module.ts`; `RoleByUser.repository.ts` (+spec)
- **Depends on:** T-1 · **Blocks:** T-3, T-5, T-6
- **Estimate:** M · **Review:** checklist · **Skills:** `nestjs-expert`, `tdd`
- **Verification:** `npx jest --testPathPattern="primary-program-request|RoleByUser" --silent --reporters=summary --forceExit`
  - **Falsifier:** re-pick SP09 → SP12 leaves an **active** SP09 row → FAIL; re-saving SP09 twice yields 2 pending rows → FAIL; a SP with allocation 0 or status ≠ Confirmed is accepted → FAIL; the admin query returns a user whose admin row has a non-null `initiative_id` → FAIL.
  - **Disqualifier:** alignment tests that mock the alignment helper itself prove nothing about P-7. At least one test must feed raw mapping rows (allocation 0, unconfirmed, confirmed).
- **DoD:** tests red → green; lint clean.

### `PSR-T-3` — Accept / decline cascade, swap, contributor release, ToC seed, Center notices `[x]`
- **Type:** `server`
- **Description:** `accept` and `decline` in one transaction with a row lock and status re-check (409 if not pending). Authorization per `PSR-R-8`. Accept writes or reactivates role 1; on swap, deactivates the old owner and runs the moved `updatePrimaryAssignment` cleanups (L317-381). Accept also seeds the ToC stub (moved from L4779-4797) and calls `releaseContributors`: status-4 rows → owner filled + status 1 + today's emails, touching only status-4 rows. Decline applies the 2-alignment auto-move (unless the other SP already declined this round; it also removes the other SP from contributor drafts) or sends the result back. After commit, emits Center notices *accepted* / *declined* / *moved* (never throws).
- **Implements:** `PSR-R-4` (all clauses incl. idempotency), `PSR-R-5`, `PSR-R-6`, `PSR-R-7` (single-SP + both-decline), `PSR-R-8`, `PSR-R-12` (release on accept), `PSR-R-14` (emit), `PSR-R-2` swap scenario (accept/decline half), DD-3, DD-4, DD-8, DD-9 (release half)
- **Files:** `primary-program-request.service.ts` (+spec)
- **Depends on:** T-2 · **Blocks:** T-4, T-7
- **Estimate:** L · **Review:** full · **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`
- **Verification:** same Jest pattern as T-2. Table-driven: alignments {1, 2, 3} × other-already-declined {no, yes} × swap {no, yes}.
  - **Falsifier:** 2-alignment decline where the other SP already declined still creates a request → FAIL. Second accept after the first → anything other than 409 and unchanged rows → FAIL. User with roles only on SP12 accepting an SP09 request → anything other than 403 → FAIL. Swap decline removes the old owner → FAIL. Release twice → duplicate status-1 rows or duplicate emails → FAIL. A notice-emit failure rolls back the accept → FAIL.
  - **Disqualifier:** concurrency proven only with sequential calls on a mock that ignores the lock is not evidence of the lock. Record it as a gap unless a test exercises the status re-check under the lock (the 409 path).
- **DoD:** all table rows green; lint clean; `CLAUDE.md` of the folder (if present) updated.

### `PSR-T-4` — Decide endpoint branch + request rows payload `[x]`
- **Type:** `server`
- **Description:** `updateResultRequestByUser` and `…V2` branch on `request_type = 'primary'` → T-3 service; contribution path unchanged. Received / sent / pop-up rows gain `request_type`, `creating_center {acronym, name}`, and `owner_program_code` for bilateral contributor rows, computed in the existing enrichment pass (no per-row query).
- **Implements:** DD-6; `PSR-R-9` / `PSR-R-10` data; `PSR-OQ-1` (admins decide both kinds)
- **Files:** `share-result-request.service.ts` (+spec), controller spec if signatures change
- **Depends on:** T-3 · **Blocks:** T-8, T-9
- **Estimate:** M · **Review:** checklist · **Skills:** `nestjs-expert`, `api-design-principles`
- **Verification:** `npx jest --testPathPattern="share-result-request" --silent --reporters=summary --forceExit`
  - **Falsifier:** a `contribution` request decided through the endpoint calls the primary service → FAIL; a pending primary row is missing from an SP09 member's received list or from a platform admin's → FAIL; the enrichment issues one query per row (spy count grows with row count) → FAIL.
  - **Disqualifier:** asserting only that a field exists in the payload does not prove the value is correct. Assert the Center acronym and the owner code values.
- **DoD:** V1 and V2 both covered; existing share-request tests unmodified in intent.

### `PSR-T-5` — Creation paths create requests instead of writing role 1 `[x]`
- **Type:** `server`
- **Description:** `createResultHeader` (`bilateral-center.service.ts:464-477`), `promoteDraft` → `populateInitiativeAndTocFromProgramCode` (only caller, P-3), and `updatePrimaryAssignment` call `request(...)`. `updatePrimaryAssignment` keeps the lead-project, `contribution_percentage` and review-history writes. Its response replaces `tocCleared` with `primary_request`. The ingest path is untouched. Update the specs named by the reversion challenge.
- **Implements:** `PSR-R-1` (all scenarios incl. failure → sent back; "not on AI job finish"), `PSR-R-2` (entry points), DD-2
- **Files:** `bilateral-center.service.ts` (+spec L500-812, L1832-2100), `bilateral.service.ts`, `bilateral-ai.service.ts` (+spec L88, L1365-1379), `bilateral-center.controller.spec.ts:147-148`
- **Depends on:** T-2 · **Blocks:** T-10
- **Estimate:** L · **Review:** full · **Skills:** `nestjs-expert`, `tdd`
- **Verification:** `npx jest --testPathPattern="bilateral-center|bilateral-ai.service|bilateral.service" --silent --reporters=summary --forceExit`
  - **Falsifier:** after `createResultHeader` / `promoteDraft` with SP09, an active role-1 row exists → FAIL. The AI-job completion path (the draft result in status Draft) creates a primary request → FAIL. The ingest `create` no longer writes role 1 → FAIL. A thrown `request()` fails the create → FAIL.
  - **Disqualifier:** a previously green spec made to pass by deleting its role-1 assertion without adding the "no role-1 + pending request" assertion is not evidence. Every removed assertion must be replaced.
- **DoD:** challenge-listed specs updated; lint clean.

### `PSR-T-6` — Ownerless guards `[x]`
- **Type:** `server`
- **Description:**
  - `syncContributingPrograms`: exclude the pending/owner SP, save a null owner on drafts, and call `releaseContributors` after save when an owner exists.
  - `_updateTocMapping`: null-owner guard; replace the draft conversion with `releaseContributors(resultId)` (amended 2026-09-30, Pivot PSR-T-6).
  - `assertSubmittable`: block while a `primary` row is pending (swap).
  - `getResultInitiativeId` consumer: add `primary_request` state.
  - Versioning: skip on-hold results and log.
- **Implements:** `PSR-R-12` (both scenarios incl. "save while on hold must not fail", "re-save no duplicate"), `PSR-R-13`, `PSR-R-15` (submit clause), `PSR-R-16`, `PSR-R-2` swap ("block submit"), DD-5, DD-9 (approval half)
- **Files:** `bilateral-center.service.ts`, `results.service.ts`, `versioning.service.ts` (+specs)
- **Depends on:** T-3 · **Blocks:** T-10
- **Estimate:** M · **Review:** checklist · **Skills:** `nestjs-expert`, `tdd`
- **Verification:** `npx jest --testPathPattern="bilateral-center|results.service|versioning.service" --silent --reporters=summary --forceExit`. Each guard gets a regression test that is **red on current code**.
  - **Falsifier:** saving contributors on an ownerless result throws → FAIL. Approving a review of an ownerless result throws → FAIL. Review approval after release creates any new status-1 row → FAIL. Submit succeeds with a pending swap → FAIL. Rollover with an on-hold result throws → FAIL.
  - **Disqualifier:** a guard test that is green before the fix proves nothing about that guard. Record the red run.
- **DoD:** red→green recorded per guard in `execution.md`.

### `PSR-T-7` — Center notices: ownerless read path + sentence `[x]`
- **Type:** `server`
- **Description:** Merge the 3 new types into `getAllNotifications` / `getPopUpNotifications` through a query without the role-1 condition (pattern of `findBilateralAiJobFinishedNotifications`). Compose the suffix server-side and handle them in `buildResultNotificationDescription` (socket push).
- **Implements:** `PSR-R-14` (visible, no buttons, For your information), DD-7
- **Files:** `notification.service.ts` (+spec)
- **Depends on:** T-3 · **Blocks:** T-8
- **Estimate:** S · **Review:** checklist · **Skills:** `nestjs-expert`
- **Verification:** `npx jest --testPathPattern="notification.service" --silent --reporters=summary --forceExit`
  - **Falsifier:** a *declined* notice for a result with no role-1 row is missing from the Center user's `getAllNotifications` → FAIL. The same notice appears twice (merged by both queries) → FAIL.
  - **Disqualifier:** a test with a fixture that has a role-1 row doesn't exercise the ownerless path.
- **DoD:** payload-level tests.

### `PSR-T-8` — Inbox rows: primary / bilateral contributor / Center notices `[x]`
- **Type:** `client`
- **Description:** In `notification-item` + `notification-type.constants`, add the variants from `design.md` §6.1: sentence parts, chips, buttons, flag / people icons, and the 3 notice types. Primary rows count under *Needs your decision* and the Received side. W1/W2 rows are unchanged. Copy goes in `contribution-request-drawer.copy.ts`.
- **Implements:** `PSR-R-9` (incl. missing-acronym clause), `PSR-R-10` (incl. W1/W2 BUT), `PSR-R-14` (render), DD-10
- **Files:** `notification-item.component.*`, `shared/constants/notification-type.constants.ts` (+specs), copy file, `build-unified-list.ts` if classification needs `request_type`
- **Depends on:** T-4, T-7 · **Blocks:** T-11
- **Estimate:** M · **Review:** checklist · **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:** `npx jest --testPathPattern="notification-item|notification-type|build-unified-list" --silent --reporters=summary --no-coverage`
  - **Falsifier:** a W1/W2 pending contribution renders "Contributor request" or plain "Accept" → FAIL. A primary row renders "()" or an empty Center name when the acronym is null → FAIL. A primary row isn't counted in *Needs your decision* → FAIL.
  - **Disqualifier:** a class/markup presence check cannot prove the visual match with the mockup (icon, pill colors, spacing). That is a HITL gap → T-11.
- **DoD:** tests green; `notification-item/CLAUDE.md` re-stamped.

### `PSR-T-9` — Drawer: kind-aware decide/view + stale-accept handling `[x]`
- **Type:** `client`
- **Description:** `contribution-request-drawer` header sentence and Accept label follow the kind. There is no ToC Align for primary requests. `view` mode shows the kind. A 409 shows "This request was already answered" and refreshes the list.
- **Implements:** `PSR-R-11`; `PSR-R-4` stale-tab clause (client half)
- **Files:** `contribution-request-drawer.component.*` (+spec, `CLAUDE.md`), `notification-item.component.ts` (`acceptOrReject` error branch)
- **Depends on:** T-4 · **Blocks:** T-11
- **Estimate:** S · **Review:** checklist · **Skills:** `angular-developer`, `spartan`
- **Verification:** `npx jest --testPathPattern="contribution-request-drawer|notification-item" --silent --reporters=summary --no-coverage`
  - **Falsifier:** a primary request drawer shows the Align projection → FAIL; a 409 leaves the row actionable → FAIL; existing `decide`/`confirm-decline` tests need behavior changes → stop (CRD zero-touch history).
  - **Disqualifier:** as T-8 for visuals.
- **DoD:** tests green; folder doc re-stamped.

### `PSR-T-10` — Center side: on-hold / sent-back banner, ToC notice, primary-assignment response `[x]`
- **Type:** `client`
- **Description:** `section-zero-dashboard` reads `primary_request`. **Pending:** banner, picker disabled. **Sent back:** banner, picker enabled, declined SPs marked. The ToC section shows a notice while ownerless. Adapt the client to the `primary-assignment` response change (`tocCleared` removed). Show the submit-blocked reason.
- **Implements:** `PSR-R-15`, `PSR-R-2` (Center UI), `PSR-R-17` (MAY, only if cheap)
- **Files:** `section-zero-dashboard.component.*`, ToC section host, `bilateral-api.service.ts`, bilateral copy file (+specs)
- **Depends on:** T-5, T-6 · **Blocks:** T-11
- **Estimate:** M · **Review:** checklist · **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:** `npx jest --testPathPattern="section-zero-dashboard|bilateral-api" --silent --reporters=summary --no-coverage`
  - **Falsifier:** state `sent_back` with the picker disabled → FAIL; state `pending` with the ToC form editable → FAIL; any remaining read of `tocCleared` → FAIL (grep).
  - **Disqualifier:** as T-8 for visuals.
- **DoD:** tests green.

### `PSR-T-11` — HITL visual check + staging end-to-end `[~]`
- **Type:** `rollout`
- **Description:** Compare the rows against `mockup/*.png` (T6 visual review if available, otherwise the user) and run the staging script in §6.
- **Implements:** defect classes without an automated gate (`requirements.md` §8)
- **Depends on:** T-8, T-9, T-10
- **Estimate:** S · **Review:** skip-eligible
- **Verification:** user sign-off recorded in `execution.md`.
  - **Falsifier:** any step of the §6 script diverges from the expected result.
  - **Disqualifier:** "looks fine" on a screenshot of a W1/W2 row is not evidence for the bilateral variants.

---

## 4. Dependency graph

```
T-1 ─► T-2 ─┬─► T-3 ─┬─► T-4 ─┬─► T-8 ─┐
            │        │        └─► T-9 ─┤
            │        ├─► T-6 ─┐        ├─► T-11
            │        └─► T-7 ─┼─► T-8  │
            └─► T-5 ──────────┴─► T-10 ┘
```
Parallel-safe pairs: T-5 ∥ T-3 (different files after T-2); T-8 ∥ T-10 (different components).

## 5. Coverage (scenario / clause → task)

| Requirement clause | Task |
|---|---|
| R-1 AI draft / manual / single-SP / "not on AI job finish" / failure → sent back | T-5 (T-2 for idempotent request) |
| R-2 re-pick while pending; no second request on re-save | T-2 |
| R-2 swap: old owner stays, replace on accept, keep on decline | T-3 |
| R-2 swap: block submit | T-6 |
| R-3 non-alignment rejected | T-2 |
| R-4 accept + lists/counts + Center notified + idempotent | T-3 (stale-tab UI: T-9) |
| R-5 auto-move + remove from contributors | T-3 |
| R-6 >2 → sent back | T-3 |
| R-7 single-SP / both-decline / state | T-3 (state: T-2) |
| R-8 authorization | T-3 |
| R-9 row, counts, Received, missing acronym | T-8 (data: T-4) |
| R-10 contributor row + W1/W2 BUT | T-8 (data: T-4) |
| R-11 drawer | T-9 |
| R-12 wait / release on accept | T-3 |
| R-12 save while on hold must not fail; release on save after accept; no duplicate on re-save | T-6 |
| R-13 approval releases remaining drafts via `releaseContributors` / no duplicates (amended) | T-6 |
| R-14 emit / read / render | T-3 / T-7 / T-8 |
| R-15 banner + submit unavailable | T-10 / T-6 |
| R-16 rollover skip | T-6 |
| R-17 list marker (MAY) | T-10 (optional) |

## 6. Rollout & verification

- **PRs:** PR 1 server (T-1..T-7), PR 2 client (T-8..T-10). PR 2's description links PR 1 and lists what to review first (the row variants, then the banner).
- **Staging script (T-11):**
  1. On B-A1634 (SP09 70 / SP12 30): create from an AI draft with SP09 → an SP09 member and a platform admin see the primary row. The result is not in SP09's lists.
  2. Save SP12 as contributor → SP12 sees nothing.
  3. SP09 accepts → the Center gets *accepted*; SP12 gets the contributor request.
  4. New result, SP09 declines → auto-moves to SP12 (the Center gets *moved*). SP12 declines → sent back; the Center gets *declined*. The banner offers a re-pick.
  5. A 3-SP project: decline → sent back directly.
  6. A W1/W2 contribution request row still reads "Contribution request / Accept contribution".
- CI green; `migration:check` green.

## 7. Cleanup & follow-ups
- Carry pending primary requests across phases (currently skipped, `PSR-R-16`).
- The AI-job notification cleanup (paused proposal) is not part of this spec.
- Spec status → `shipped` after both PRs merge.

## 8. Roll-back plan
1. Revert PR 2 (client only): server behavior stays; rows fall back to the generic render.
2. Revert PR 1: before running the migration `down`, list pending `primary` rows. Those results will be ownerless after rollback, so assign their owner manually or re-pick through the old flow.
3. No bilateral payload affected.

## Required cross-references
`requirements.md`, `design.md`, `proposal.md`, `mockup/` · `notifications/inbox-revamp` (`NOTIF-T-12`, `NOTIF-T-15`) · `docs/trd/trd.md` `Notification`, `results`.
