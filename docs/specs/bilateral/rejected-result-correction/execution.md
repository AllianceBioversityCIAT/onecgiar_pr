# Execution Log — A centre corrects and resubmits a rejected bilateral result (`RRC`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/rejected-result-correction` |
| Code | `RRC` |
| Approval Mode | `gated` (continue/pause gate after every task) |
| Branch | `qa-development-2026-ss` |
| Leader model | Opus 5.5 (T1) · Implementer wrapper `akili-implementer` (T2) · Reviewer wrapper `akili-reviewer` (T3) |
| Started | 2026-10-06 |
| Budget (design §13) | 10 tasks · ~1,300 LOC · 1 review round each, 2 for T-1/T-2 and T-6 |

### Pre-flight

- `RSB-T-1` present in the checkout: `ResultReviewHistory.initiative_id`, `RESUBMIT` action, migration `1790500000000-ReviewHistoryInitiativeAndResubmit.ts` (verified 2026-10-06).
- Hold: do not push `RSB` to staging before `RRC-T-6` (`RRC-K-3`).

## 2. Task Execution History

### `RRC-T-1` — Direct transfer core extracted from `accept()`

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-06 |
| Attempts | 1 Implementer (`akili-implementer`, effort `xhigh`) · 2 parallel lens Reviewers (`akili-reviewer`) |
| Skills | `nestjs-expert`, `tdd` (as listed in the task; no deviation) |
| Requirements covered | `RRC-R-10` (service level: SP primary at once, no ownership request), `RRC-R-17` (shared core) |
| Review mode | Parallel lens reviewers (task Review `lenses`, effort `xhigh`): A = spec + reliability + risk · B = spec + readability + resilience |

#### `RRC-P-10` finding (recorded per the task's Done list)

- **Confirmed: `none`** for a result rejected by review. `results.service.ts:4402-4407` (REJECT branch of `reviewBilateralResult`) deactivates every active `share_result_request` of the result, including the accepted `primary` row (`P-6` re-read, still true). `stateFor` (`primary-program-request.service.ts:382`) reads only `is_active: true` primary rows → `emptyState()` = `{ state: 'none', program_code: null, declined_by_codes: [] }`.
- The rejection does **not** touch `results_by_inititiatives`: role 1 of the old SP stays active, so `transferPrimary` sees it as the previous owner.
- Second path not in the premise: a Rejected result reached through an ownerless `decline()` keeps its DECLINED primary row active (PDR DD-2) → `stateFor` = `sent_back`. The core's "retire every active primary row" step handles it (test covers it).
- Evidence level: code reading + in-memory model test (`RRC-P-10: for a result rejected by review...`). Real-row proof belongs to `RRC-T-10`.

#### Attempt 1

- **Files changed:** `onecgiar-pr-server/src/api/results/share-result-request/services/primary-program-request.service.ts` (+ new exported type `PrimaryTransferResult { outcome: 'unchanged' | 'transferred'; previousInitiativeId: number | null }`, new `transferPrimary` at :793, private helpers `loadActiveOwner` / `writeOwnershipChange` / `seedTocStub` extracted verbatim from `accept()`, which now calls them at the same positions) · `primary-program-request.service.spec.ts` (additions only: 536 added, 0 removed).
- **Tests added:** 3 golden-master tests `RRC-K-1 — the write sequence of accept() is unchanged by the extraction` (swap, first accept, re-accept; run green on the unmodified code first) · 15 `transferPrimary() — RRC-T-1` tests (P-10 reproduction, role-1 swap, stray contributor/contribution request off, ToC retired + stub seeded, exactly one ACCEPTED primary row, declined/pending rows retired, ownerless result, change of mind, same SP = zero writes, release flag false/true, no notice/announce, failed insert rolls back).
- **Verification:** baseline `Tests: 62 passed, 62 total` → `npx jest --maxWorkers=2 --testPathPattern="primary-program-request" --silent --reporters=summary` → `Test Suites: 2 passed, 2 total` · `Tests: 80 passed, 80 total`. Red first: 15 failed with a throwing stub. Mutation (remove retire step + unconditional release) → 5 failed, reverted. Extra K-1 regression `bilateral-resubmission.service|share-result-request.service.spec|bilateral-center.service` → `Tests: 330 passed, 330 total`. `npx eslint <2 files> --quiet` exit 0 · `npx tsc --noEmit -p tsconfig.json` exit 0.
- **Disqualifier:** not triggered — no existing `accept`/`decline`/`request` test edited; `primary-program-request.load-order.spec.ts` untouched (both Reviewers confirmed).
- **Reviewer A (spec + reliability + risk): PASS** — "The extraction is verbatim and in the same order, golden-master tests pin `accept()`'s write sequence, and existing tests are unedited. `transferPrimary` follows design §8.2 steps 1–5 and DD-3 (manager-only writes, no notice, announce or lock, exactly one active ACCEPTED primary row) with red-first and mutation evidence."
- **Reviewer B (spec + readability + resilience): PASS** — "`transferPrimary` follows design §8.2 steps 1–5 and RRC-DD-3, and `accept()` keeps the same call sequence, pinned by golden-master tests and with no existing test edited. The result object around `outcome: 'unchanged'` is an acceptable superset of the design."

#### ADVISORY (4R, non-gating)

- RISK (A): `transferPrimary` compares `currentPrimaryId === newInitiativeId` strictly while the owner id is `Number()`-coerced. A string id from a caller would look like a change → the SP's real ToC mapping retired and replaced by an empty stub (silent ToC loss).
- RELIABILITY (A): same-SP path writes nothing (step 1 as specified), so on a review-rejected result where the centre re-picks the current SP, `stateFor` stays `none` though role 1 exists (same as today).
- RELIABILITY (A) / RESILIENCE (B): inherited from `accept()`: `loadActiveOwner` decides from the first role-1 row; with corrupt data (two active owners) the duplicate survives. Not a regression.
- RELIABILITY (A): golden masters do not pin `accept()`'s order on the reactivate-former-role-1-row branch (verbatim by inspection; covered by the change-of-mind transfer test).
- RESILIENCE (B): the core relies on the caller's `Result` row lock but does not enforce it; `accept()` locks the `share_result_request` row instead. `loadActiveOwner` is an unlocked read.
- READABILITY (B): no `@akili-spec bilateral/rejected-result-correction` tag on `transferPrimary` (the file uses the tag elsewhere); the moved comment in `writeOwnershipChange` ("the very `primary` row being accepted right here") only reads right for `accept()`.
- READABILITY (B): design §8.2 says the core "returns `unchanged`"; the real return is `PrimaryTransferResult`. Sync at archive.

#### Forward pointers (to be copied into later briefs)

- **→ T-2 and T-6:** take the `Result` row lock as the first statement in the transaction before calling `transferPrimary`; pass `newInitiativeId` as a **number** (coerce at the call site); use `PrimaryTransferResult.outcome` / `previousInitiativeId` for the `RRC-R-18` log line; treat `outcome: 'unchanged'` as "no transfer" (no log, no write).
- **→ T-2:** confirm `assertSubmittable` and the pending-primary block accept status 7 with `stateFor` = `none` and an existing role-1 owner (re-pick of the current SP).
- **→ T-7:** the client SP chip at 7 may receive `none` from `stateFor` while a role-1 owner exists (P-10); the chip must still show the owner.
- **→ archive:** design §8.2 return shape; add the `@akili-spec` tag + reword the moved comment if the file is touched again.

#### Decisions

- Diff handed to the Reviewers as a verbatim `git diff` file in the session scratchpad (`rrc-t1.diff`, 958 lines) instead of inline in the prompt, to avoid re-emitting ~1k lines twice; the Reviewers read it in full.
- Return-shape superset (`PrimaryTransferResult`) accepted by both Reviewers as conformant.

**Final verification:** scoped Jest 80/80 green · eslint/tsc clean · P-10 recorded.

### `RRC-T-2` — Primary SP change on Rejected = direct transfer

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-06 |
| Attempts | 1 Implementer (`akili-implementer`, effort `high`) · 1 Reviewer (`akili-reviewer`, lens checklist) |
| Skills | `nestjs-expert`, `tdd` (as listed; no deviation) |
| Requirements covered | `RRC-R-9`, `RRC-R-10` (direct transfer, no request, change of mind), `RRC-R-12`, `RRC-R-18` (transfer half) |
| Forward pointers carried in the brief | All T-1 → T-2 pointers (Result lock first, numeric id, log only on `transferred`, pending-primary block incl. P-10 re-pick) |

#### Attempt 1

- **Files changed:** `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts` (whitespace-insensitive +39/−3) · `bilateral-center.service.spec.ts` (+490; only removed line = the `RequestTypeEnum` import widened to also import `ShareResultRequest`).
- **Change:** `updatePrimaryAssignment` editable set = {Editing, Draft, Rejected} with the design §7 message; catalogue allocation check unchanged and first. At 7, after the existing `Result` row lock and the lead-project writes, `transferPrimary(resultId, Number(primaryInitiative.id), user, manager, { releaseContributors: false })`; one `logger.log` on `outcome === 'transferred'` (result id, previous/new initiative id, user id); `unchanged` = no write, no log; a core throw rolls the transaction back (no history row). 1/8: old code verbatim inside `else {}` (one prettier reflow).
- **Tests added:** `describe('RRC-T-2: a Rejected result changes its primary SP by direct transfer')`, 21 cases: 8-status gate table; falsifier (`request` never called at 7); numeric id; lock before the core; lead project + history row saved; not-allocated refusal with no writes; re-pick of the current SP sends nothing; log / no log; failing transfer rolls back; 1/8 still use the request flow (new tests, existing R-12 tests untouched); 2 pending-primary-block tests wiring the real `PrimaryProgramRequestService` over the in-memory db (after a transfer; after a re-pick with `stateFor` = `none` and a role-1 owner) calling private `assertSubmittable` with the row presented as Editing.
- **Verification:** red first 17/21 failed · `npx jest --maxWorkers=2 --testPathPattern="bilateral-center.service" --silent --reporters=summary` → `Test Suites: 1 passed, 1 total` · `Tests: 180 passed, 180 total`. Mutations: string id → 4 failed; 7 branch disabled → 7 failed (restored). eslint `--quiet` exit 0 · tsc exit 0.
- **Disqualifier:** not triggered (no pre-existing 1/8 test edited; no existing test asserted the old `updatePrimaryAssignment` message).
- **Implementer `Not Done / Assumptions` (verbatim, adjudicated as explanation, not owed scope):**
  - "At 7, a re-pick of the current SP does not run the Editing/Draft "cancel open rounds" branch, because the core answers `unchanged`. At 7 no PENDING primary row can exist: a review rejection deactivates all requests, an ownerless decline leaves only DECLINED rows, and nothing in this path writes a PENDING row. I tested the cancel-round behaviour for 7 as "no cancel"; the Editing/Draft re-pick tests above are unchanged."
  - "The pending-block proof drives `assertSubmittable` with the row's status presented as Editing, as explained above. It does not drive it at status 7."
  - Leader adjudication: both confirmed in-spec by the Reviewer (R-12 limits the new-round re-pick to Editing/Draft; the status gate at 7 is T-3's scope). Real-status-7 re-check forwarded to T-3 and T-10.
- **Reviewer: PASS** — "The 7 branch does a direct `transferPrimary` (numeric id, after the row lock, in the same transaction, `releaseContributors: false`, log only on `transferred`) and never sends a request, as R-9, R-10, R-18, DD-3 and DD-4 require. The 1/8 path is the old code re-indented, with no pre-existing test changed, so the R-12 evidence stands."

#### ADVISORY (4R, non-gating)

- READABILITY: the moved 1/8 comment still says "the whole method already requires Editing/Draft status (guard above)" — stale now that 7 passes the guard; kept verbatim on purpose. Reword at archive.
- RELIABILITY: the `RRC-R-18` log line is emitted inside the transaction, before the history save and commit; a later failure would leave a log of a rolled-back transfer. Consider logging post-commit.
- RISK: the pending-block proof mocks `getOwnerInitiativeByResult` and presents the result as Editing.

#### Forward pointers (to be copied into later briefs)

- **→ T-3:** once 7 is submittable, add a test that drives `assertSubmittable` at a **real status 7** after a transfer and after a re-pick (P-10: `stateFor` = `none` with a role-1 owner) — pending-primary block must not fire. Consider post-commit placement for the resubmission log line (`R-18`).
- **→ T-10:** check `assertSubmittable` behaviour on real rows after an SP move and after a re-pick at 7.
- **→ archive:** reword the stale "requires Editing/Draft status" comment in `updatePrimaryAssignment`.

**Final verification:** scoped Jest 180/180 green · eslint/tsc clean.

### `RRC-T-3` — Submit from Rejected, and contributors held until then

| Field | Value |
|---|---|
| Status | **in progress** — attempt 1 PASS on the original scope; scope widened by a user-approved pivot (`P-13`), see below |
| Date | 2026-10-06 |
| Skills | `nestjs-expert`, `tdd` (as listed; no deviation) |
| Requirements covered | `RRC-R-2` (contributor-save clause), `R-5`, `R-6` (server), `R-7`, `R-8`, `R-18` (resubmission half) |

#### `RRC-P-11` finding (recorded per the task's Done list)

- **Verified (premise holds).** A REJECT deactivates every active share request (`results.service.ts:4403-4407`). The client Contributors section hydrates from `GET /api/results/bilateral/:id` → `_loadBilateralRelatedData` (`results.service.ts:4134-4157`): role-2 rows (`getContributorInitiativeByResult`) + `getDraftInit` (`resultByInitiatives.repository.ts:268-304`), which requires `srr.is_active > 0`. Deactivated requests are not listed; accepted role-2 contributors stay listed (DD-5). So what the centre has at resubmission is what it re-adds.

#### Attempt 1 (original scope)

- **Files changed:** `bilateral-center.service.ts` (`assertSubmittable` {1,8,7} + design §7 message; `submitForReview` at 7: same status write to 5, `RESUBMIT` row `{comment: null, initiative_id: owner, created_by: user}` instead of the ordinary UPDATE row, `releaseContributors(resultId, manager)` last in the transaction, post-commit ids-only log then `announcePendingReview`; `syncContributingPrograms(..., holdRelease = false)` with `saveContributors` passing `status_id === Rejected`) · `bilateral-center.service.spec.ts`.
- **Tests added:** `describe('RRC-T-3: Submit from Rejected')` (8-status tables for submit/assess/field-revision; 5-never-1 falsifier; one RESUBMIT row naming the owner; release in-transaction with the same manager; announce once post-commit; no ownerless branch; post-commit ids-only log; failing release rolls back; R-7 no primary; R-6 stale; pending round still blocks at 7; 1/8 ordinary row, no RESUBMIT/release/log) · `RRC-T-3: at Rejected the contributors are held until Submit` (draft written, not released — falsifier; dormant-draft reactivation; nothing announced; 1/8 with owner still released) · two **real status-7** pending-block tests inside the T-2 describe (closes the T-2 forward pointer).
- **Existing tests edited (message string only):** `submitForReview > 'rejects a result that is already under review'`, `submitForReview > 'an admin still gets BadRequestException on a result already under review ...'`, `assess > 'gate parity: ...'` — each `/Editing or Draft/` → `/Editing, Draft or Rejected/`. Reviewer confirmed one-regex changes only.
- **Verification:** red `Tests: 36 failed, 188 passed, 224 total` → `npx jest --maxWorkers=2 --testPathPattern="bilateral-center.service" --silent --reporters=summary` → `Test Suites: 1 passed, 1 total` · `Tests: 224 passed, 224 total`. eslint `--quiet` 0 · tsc 0.
- **Implementer `Not Done / Assumptions` (verbatim, adjudicated as explanation, not owed scope):**
  - "The result row's `status_id` read in `assertSubmittable` is trusted for the whole `submitForReview` (same write as 1/8, per design §8.3, no compare-and-swap as in the API path). A concurrent second submit is not guarded. Not in the spec."
  - "At 7 the existing ownerless-with-draft-primary exemption in `assertSubmittable` still applies. I judged it effectively unreachable at 7 (rejection deactivates drafts; a re-pick at 7 transfers directly), so I did not tighten it. If it were reached, the `RESUBMIT` row would carry `initiative_id: null` and `sendDraft` would run."
  - "`releaseContributors` sends emails before the transaction commits (existing behaviour of that method, reached with the transaction's manager as the brief required)."
  - "Finding 1b is the open item. T-3 is complete as specified." → handled by the pivot below.
- **Reviewer: PASS** — "The T-3 changes do what design §8.3, §8.4 and DD-5 and `RRC-R-2`, R-5 to R-8 and R-18 require. The 1/8 paths are untouched, the RESUBMIT row matches RSB's writer and the entity, the release happens inside the transaction, and the announcement and log run once after the commit. Both falsifiers are pinned by tests, `P-11` has evidence, and Jest (224/224), eslint and tsc are clean."

#### ADVISORY (4R, non-gating)

- RISK: `getDraftInit` returns drafts only for [1, 8, 5] → see pivot `P-13`.
- RELIABILITY: `releaseContributors` sends emails before commit (existing); only a failed commit would leave an email for rolled-back requests. Post-commit dispatch would be a separate change.
- RESILIENCE: submit from 7 reads the status without compare-and-swap (RSB uses one); two concurrent submits could each write a RESUBMIT row (requests not sent twice — release only touches status-4 rows). `UPDATE … WHERE status_id = 7` + affected-rows check would close it.
- READABILITY: the ownerless case at 7 (judged unreachable) would write RESUBMIT with `initiative_id: null`; a one-line comment at the ternary would help.

## Pivot Record: `RRC-T-3`

- **Trigger:** while verifying `P-11`, the Implementer found (and the Leader confirmed by reading `results.service.ts:4134-4150` and `resultByInitiatives.repository.ts:268-304`) that `_loadBilateralRelatedData` calls `getDraftInit(resultId, [Editing, Draft, PendingReview])`. At status 7 `getDraftInit` reads status-1 rows, not DRAFT (4) rows. A contributor re-added at 7 is saved as a DRAFT and held (correct per `R-8`), but it does not show on reload; the next autosave, built from the reloaded list, deactivates it through `syncContributingPrograms`, and nothing is released at resubmission. `RRC-R-8` would fail end to end. New premise `RRC-P-13` = **false**.
- **Alternatives offered:** (a) widen T-3 with the one-line fix + test (recommended) · (b) separate task T-3b · (c) out of this spec, record as pending.
- **Decision:** user chose **(a) widen T-3**, 2026-10-06.
- **Spec amended:** `design.md` §3 (P-11 → `verified`; new row `RRC-P-13` `false`), §5 directory line for `results.service.ts`, §8.4 pivot paragraph; `tasks.md` `RRC-T-3` description, Files, Verification. Correction Closure sweep: grepped `P-11`, `getDraftInit`, `8.4`, `results.service.ts` across the spec folder — no other site asserts the old behaviour (`R-8` and Coverage Closure already assign R-8 to T-3). No ADR affected.
- **Next:** attempt 2 implements only the `P-13` change; Reviewer audits it; then T-3 closes.

#### `RRC-T-3` attempt 2 (pivot `P-13` only) — **PASS**, task closed

- **Implementer:** `akili-implementer`, effort `medium`, skill `nestjs-expert` (`tdd` dropped: one-line list change; red-first on the single test instead).
- **Files changed:** `onecgiar-pr-server/src/api/results/results.service.ts` (+2: `ResultStatusData.Rejected.value` appended to the `getDraftInit` list in `_loadBilateralRelatedData`, one comment line) · `results.service.spec.ts` (+34: `ResultsService — _loadBilateralRelatedData draft-visible statuses (RRC-T-3, RRC-P-13)` → `passes getDraftInit a status list containing Rejected plus Editing, Draft and Pending Review`).
- **Verification:** red `Tests: 1 failed, 69 passed, 70 total` → `npx jest --maxWorkers=2 --testPathPattern="results.service.spec" --silent --reporters=summary` → `Test Suites: 3 passed, 3 total` · `Tests: 70 passed, 70 total`. eslint `--quiet` 0 · tsc 0. No existing test edited.
- **Implementer `Not Done / Assumptions` (verbatim, adjudicated as no owed scope):** "The first eslint run flagged the spec with "Insert `␍`" prettier errors. I ran `sed -i` to fix them, and it initially stripped CRs from the whole file. I re-applied CRLF, and eslint now passes. `git diff --stat` shows only +34 lines on the spec ..." · "The other modified files in `git diff --stat -- src/api/results/` (`result.repository.ts` and its spec, ...) belong to other work and were not touched by me."
- **Reviewer: PASS** — "The diff adds Rejected to the statuses passed to `getDraftInit`, with no other status changes, exactly as `design.md` §8.4 / `RRC-P-13` asks, and the new test proves the argument the spec asks for. Given P-6 (a reject deactivates every request), showing draft (status 4) rows at status 7 hides nothing, because no active status-1 rows are left at that point."

**T-3 final verification:** `bilateral-center.service` 224/224 · `results.service.spec` 70/70 · eslint/tsc clean · `P-11` recorded · `P-13` pivot closed.

#### Forward pointers

- **→ T-5:** `results.service.ts` + `results.service.spec.ts` now carry the `P-13` change (working tree wins over CodeGraph).
- **→ T-10:** contributor re-added at 7 → reload shows it → resubmit releases it (`R-8` end to end on real rows).

## Concurrency note (2026-10-06)

Another session is working in this checkout (uncommitted, not RRC): RSB spec archived to `docs/specs/archive/2026-10-06-bilateral--resubmit-rejected-result/`, `resubmit-followups/`, edits to `bilateral-result-summaries.en.md`, `bilateral.service.spec.ts`, `result.repository.ts`, `pop-up-notification-item.*`, notification pipes. **User decision:** run the non-colliding tasks first (T-4, T-7, T-8); hold **T-6** (contract doc, `bilateral.service.spec.ts`, RSB docs now under `archive/`) and **T-9** (`pop-up-notification-item.*`) until the user confirms the other session is done or committed.

### `RRC-T-4` — Migration: `notifications.review_history_id`

| Field | Value |
|---|---|
| Status | **`[~]`** — code PASS (2 lens Reviewers), waiting on the user: `SHOW COLUMNS` + `up`/`down`/`up` on PRTest (task disqualifier) |
| Date | 2026-10-06 |
| Attempts | 1 Implementer (`akili-implementer`, effort `high`, skill `nestjs-expert`) · 2 parallel lens Reviewers (migration surface) |
| Requirements covered | `RRC-R-13` (storage) |

#### `RRC-P-12` finding

- **Signed `bigint`, not int.** `result-review-history.entity.ts:17-21` `@PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })`; DDL `1768572302006-AuditoryTableApproveRejectBilaterals.ts:7` `id bigint NOT NULL AUTO_INCREMENT`. Column created as `bigint NULL` (signed). User `SHOW COLUMNS FROM result_review_history LIKE 'id'` on PRTest still owed.
- Real table is `notifications` (plural). Design §3 P-12 and §6 corrected (Correction Closure: grep `notification.review_history_id` → design §2, §4, §6, tasks T-4 title use the loose singular; §6 note now defines it).

#### Attempt 1

- **Files:** new `onecgiar-pr-server/src/migrations/1790700000000-NotificationReviewHistoryLink.ts` (class `NotificationReviewHistoryLink1790700000000`; `up`: column `bigint NULL`, index `IDX_notifications_review_history`, FK `FK_notifications_review_history` → `result_review_history(id)` `ON DELETE SET NULL ON UPDATE NO ACTION`, each guarded via `information_schema` scoped to `DATABASE()`; `down`: FK → index → column, each guarded) · `onecgiar-pr-server/src/api/notification/entities/notification.entity.ts` (+18: nullable bigint `review_history_id`, `ManyToOne(() => ResultReviewHistory, { nullable, onDelete: 'SET NULL' })` + `JoinColumn` with matching FK name; no eager/cascade).
- **Verification:** `migration:check` **not run** — `scripts/check-pending-migrations.ts` opens a live `mysql2` connection to the configured DB (shared). Substitute: glob discovery (`orm.config.ts:24`), class/`name` match the check script's pattern. `npx tsc --noEmit -p tsconfig.json` 0 · eslint `--quiet` 0. No Jest (not required).
- **Reviewer A (spec + reliability + risk): PASS** — "The column, index and FK match the spec (DD-6, §6, K-4). They are nullable, additive, guarded, and the FK is `ON DELETE SET NULL` to the real signed-bigint PK. `down` reverses in the correct dependency order, and the entity relation adds no eager loading, cascade or insert risk. Two things are still open and are not code defects: the user's `SHOW COLUMNS` and the up/down/up run."
- **Reviewer B (spec + readability + resilience): PASS** — "The migration and entity change do what RRC-T-4, design §6 and RRC-DD-6 ask ... Re-running `up` after a partial run, running it twice, and running `down` with no prior `up` are all safe. This PASS covers the code only; the task stays `[~]` until the user runs `up`/`down`/`up` on PRTest."

#### ADVISORY (4R, non-gating)

- RISK (A): the entity now declares the column, so **every** `Notification` find/save selects it. Against a DB without the column (local stack on a DB where `up` has not run; PRTest between `down` and the second `up`), all notification reads/writes fail. Jenkins applies migrations on deploy, so deploys are safe. The migration docblock line "the previous code does neither" is inaccurate for this diff. → user told to run up/down/up with this branch's server not serving that DB.
- RISK (A): MySQL 8 `ADD FOREIGN KEY` with `foreign_key_checks=1` = ALGORITHM=COPY → rebuilds `notifications`, blocking writes for the copy.
- RELIABILITY (A): `migration:generate` would see `IDX_notifications_review_history` as drift (no `@Index` in metadata); same pattern as exemplar 1790500000000. Optional `@Index`.
- RELIABILITY (A) / READABILITY (B): mysql driver returns `bigint` as string though typed `number`.
- RESILIENCE (B): `columnExists` checks existence, not type (same as exemplar).
- Falsifier note (A): if `1790500000000` / `1790600000000` are unapplied on the target DB, `migration:check` lists them too — not this diff's fault.

#### Forward pointers

- **→ T-5:** normalise `review_history_id` with `Number(...)` (or compare in SQL via the LEFT JOIN); the two-rejection test must not depend on `===` between a loaded bigint and a numeric literal. Table is `notifications`.
- **→ user (PRTest):** `SHOW COLUMNS FROM result_review_history LIKE 'id'`; `migration:check`; `up` / `down` / `up` with SQL checks; then T-4 → `[x]`, unblocking T-5 and T-9.

### `RRC-T-7` — Client: Rejected unlocks the editor; single-allocation note

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-06 |
| Attempts | 1 Implementer (`akili-implementer`, effort `medium`; resumed once for the owed folder-doc + lint items) · 1 Reviewer (lens checklist) |
| Skills | `angular-developer`, `spartan` (`tailwind-design-system` dropped: no classes beyond existing tokens) |
| Requirements covered | `RRC-R-1` (both scenarios, client), `R-2` (client keeps 7), `R-3` (client), `R-6` (drawer at 7 / 5), `R-11` |

#### Spec correction at execution (component location)

- The task named `bilateral-sp-selector`; it only mounts inside `@if (isCreating())` (`bilateral-result-creator.component.html:10-19`) and the manual-create drawer, so it is never on screen at 7. The editor's Program picker is `section-zero-dashboard` (`creator.html:268`). Chip + note implemented there; `design.md` §5 and §9 and `tasks.md` T-7 Files amended. Requirement `R-11` unchanged. Reviewer confirmed the correction against both templates.

#### Attempt 1

- **Files changed:** `pages/bilateral/services/bilateral-creation.service.ts` (`isEditableByCenterUser` + `BILATERAL_STATUS.Rejected`) · `components/section-zero-dashboard/section-zero-dashboard.component.{ts,html,spec.ts}` + folder `CLAUDE.md` (Verified 2026-10-06) · `internationalization/bilateral-primary-assignment.copy.ts` (`singleAllocationNote`, design §9 copy) · `pages/bilateral-result-creator/bilateral-result-creator.component.spec.ts` · `services/bilateral-creation.service.spec.ts`.
- **Behaviour:** at 7 with exactly one allocated SP → `hlmBadge` chip (owner) + `role="note"` text, no dropdown; owner always from `selectedPrimarySp()` (T-1 pointer: request state may be `none`); at 7 with owner, state `none` → no "Pick a primary…" banner, no `submitBlockedReason` (R-10); rejected banner when `readOnly() || isRejected()` (prevents the regression where an editable 7 lost its rejected banner).
- **Tests added:** editability table (null/1/8/7 true; 2..6 false — falsifier); creator R-1 lead-centre editable at 7; R-1 AC4 non-member non-admin at 7 → `rolesSE.readOnly` true; R-6 QA dialog readOnly false at 7, true at 5; dashboard ×5 (single-SP chip+note; `none` at 7 with owner; two SPs keep picker; status 1 unchanged; `sent_back` at 7 shows rejected banner).
- **Existing tests edited (Reviewer: legitimate consequences of R-1, coverage kept):** `bilateral-creation.service.spec.ts` "is read-only once the result left Editing": `[PendingReview, Approved, Rejected]` → `[PendingReview, Approved]`. `bilateral-result-creator.component.spec.ts` `setResultStatus` mock: `id == null || id === 1 || id === 8` → `+ || id === 7`.
- **Verification:** `npx jest --maxWorkers=2 --no-coverage --testPathPattern="bilateral-creation.service|bilateral-sp-selector|bilateral-quality-assessment-dialog|bilateral-result-creator|section-zero-dashboard"` → `Test Suites: 5 passed, 5 total` · `Tests: 376 passed, 376 total`. The task's `npm run test:local -- --testPathPattern="a|b"` printed nothing / exit 1 (wrapper mishandles `|`, pre-existing) — direct Jest used. `npx ng lint --quiet --lint-file-patterns <touched ts/html/specs/copy>` → "All files pass linting."
- **Implementer `Not Done / Assumptions` (verbatim, adjudicated: no owed scope after the resume):** "Layout is unverified. Whether the chip and note read well is left to the T-10 visual check." · ""Exactly one allocated SP" is read as `project.sciencePrograms.length === 1`, the same list the picker uses." · "The chip is only for editable users. A user who is not in the lead centre and not an admin at 7 gets the read-only text (`canEditAssignment()` is false), with no note." · "The banner and submit-blocked changes at 7 go beyond the literal task text. They follow the T-1 pointer and avoid a regression" · folder `CLAUDE.md` → done on resume.
- **Reviewer: PASS** — "Rejected (7) is made editable in the one place DD-2 names, and the 7 → true / 5 → false table proves it. The single-allocation chip and note sit in the component that is actually on screen at 7 (the Files correction checks out against both templates), and the two edited existing tests follow from R-1 and keep their coverage. The banner and submit-blocked changes are a consequence of the T-1 pointer and R-10, not scope creep."

#### ADVISORY (4R, non-gating)

- RELIABILITY: at 7 with request state `sent_back` (ownerless PDR decline), `submitBlockedReason` still blocks Submit. Leader note: with no owner, the server refuses anyway (R-7); a pick at 7 transfers and retires the DECLINED row (T-1 test "declined and pending primary rows are retired"), moving the state to `accepted`. Confirm in T-10.
- READABILITY: `singleAllocationLocked` reads `availablePrimaryPrograms()` (prefers `pendingProject()`); a one-line comment would help.
- RISK (visual): `hlmBadge` nowrap may overflow with a long SP name; check `gap-1` spacing vs design §7 → T-10.
- READABILITY (a11y): consider `aria-describedby` chip → note.

#### Forward pointers

- **→ T-8:** `section-zero-dashboard` shows a rejected banner at 7 — avoid duplicating the reason (brief already says so).
- **→ T-10:** chip overflow/spacing; `sent_back` at 7 → pick → Submit available.
- **→ archive:** `npm run test:local` wrapper fails on `|` patterns (task verification commands use it).

**Final verification:** scoped Jest 376/376 · lint clean.

### `RRC-T-8` — Client: rejection notice on the result + full history modal

| Field | Value |
|---|---|
| Status | in progress (attempt 1 FAIL → attempt 2) |
| Date | 2026-10-06 |
| Skills | `angular-developer`, `spartan` (`tailwind-design-system` not loaded: existing tokens only) |
| Requirements | `RRC-R-14`, `RRC-R-15` (display side) |

#### Attempt 1 — FAIL

- **Implementer** (`akili-implementer`, effort `medium`): new `bilateral-rejection-notice/*`, `services/bilateral-review-history.interface.ts` (`ReviewHistoryEntry` + `initiative_code`, `isRejectAction`, `sortReviewHistoryNewestFirst`), `internationalization/bilateral-rejection-notice.copy.ts`; `bilateral-page-header/*` (inputs `noticeResultId`, `noticeStatusId`; notice at the bottom of the detail header); `bilateral-result-creator.component.html` (binds them); `bilateral-results-list/*` (`rejectionEntry` → `historyEntries`, all REJECT/REJECTED + RESUBMIT oldest first) + folder `CLAUDE.md`. Reused `BilateralApiService.GET_bilateralReviewHistory`. 13 tests added, none edited. `npx jest --maxWorkers=2 --no-coverage --testPathPattern="bilateral-rejection-notice|bilateral-page-header|bilateral-results-list"` → `Test Suites: 3 passed, 3 total` (counts not captured); rerun + `bilateral-result-creator` → `Test Suites: 4 passed, 4 total` · `Tests: 316 passed, 316 total`. `ng lint --quiet` clean on ts/html.
- **Declared deviations (Implementer `Not Done / Assumptions`, summarized):** (1) notice not under the header status badge (never bound in the editor; status pill lives in the creator rail per BRRA-R-3) → separate inputs, notice at the bottom of the detail header; (2) `hlm-alert` not installed → `role="status"` div with `--pr-status-rejected-fg/bg` + `hlmBtn variant="link"`; (3) modal keeps `app-pr-dialog`; (4) `hlmSeparator` NG0311 in Jest → `<hr>` with `--pr-border`; (5) Show-more when >180 chars or newline; (6) loading state "Loading the rejection reason…"; (7) client sort by `created_at`, `id`.
- **Reviewer: FAIL** (verbatim issues):
  1. **Discovered Issue:** The history modal can still only be reached for status-7 rows. The trigger in `bilateral-results-list.component.html:451` is wrapped in `@if (isRejected(result))`, and `isRejected` is `Number(result?.status_id) === 7` (component.ts:1533–1534). Once a result is resubmitted (status 5) or approved, the warning button disappears, so the full history this task builds cannot be reached. The diff does not touch this gate, and no test covers reachability. **Violated Rule:** `requirements.md` RRC-R-14 Scenario "After resubmission": "AND the rejection history is still reachable from the results list" (:259). RRC-R-15: "The history MUST remain readable after the result is approved", and Scenario "After approval": "THEN the history is still reachable and shows all three rejections" (:263, :273). `tasks.md:240` traces "R-14 · After resubmission, notice gone, history reachable" to T-8. **Remediation Suggestion:** Show the trigger whenever the result has rejection history, not only at status 7. Either use a server flag if the list payload carries one, or show it for any result that has ever been rejected. If the list payload has no such field, show it at status 7 and after it (Pending Review, Approved), and let the modal's empty state handle the rest. Do not add a history request per row: the performance NFR allows at most one history request. Add list tests: a status-5 row and an approved row each expose the trigger and open the full history, and the rows it must not show on still hide it. If showing it needs a new payload field, raise that to the Leader as a server change; do not widen the list query unilaterally.
  2. **Discovered Issue:** The new user-facing string "Loading the rejection reason…" is hard-coded in `bilateral-rejection-notice.component.html` instead of living in `bilateral-rejection-notice.copy.ts`. **Violated Rule:** `requirements.md` §7 NFR (copy lives with the bilateral copy). `onecgiar-pr-client/CLAUDE.md` §10: "Strings: Always via `src/app/internationalization/`. No hard-coded English." **Remediation Suggestion:** Add `loading: 'Loading the rejection reason…'` to `BILATERAL_REJECTION_NOTICE_COPY` and bind `{{ copy.loading }}`.
- **Reviewer judgement on deviations:** (2), (4), (5), (7) acceptable, record. (1) code adaptation acceptable; design §9 premise false → correct the row; T-10 confirms R-14 "next to the status" visually. (3) `app-pr-dialog` has Escape + `role="dialog"` but no focus trap/autofocus/restore (`src/CLAUDE.md` §21.7) → Leader to accept+record with a T-10 keyboard check, or swap to `hlm-dialog`.
- **ADVISORY:** RELIABILITY: `loadedFor` never reset when the notice hides; 7 → 5 → 7 for the same result in one instance shows the old reason. READABILITY: `...filter(...).reverse()` builds oldest-first indirectly. RISK: per-suite counts of the first run not captured. RESILIENCE: `whitespace-pre-wrap` + `line-clamp-3` unproven in jsdom → T-10.

#### Leader adjudication (attempt 1 → 2)

- Issues 1 and 2: in scope, sent verbatim to attempt 2 (effort bumped `medium` → `high`).
- Deviation (1): accepted; `design.md` §9 `BilateralPageHeaderComponent` row corrected (the editor's status pill lives in the creator rail; the notice sits at the bottom of the detail header). T-10 visual check of "next to the status".
- Deviation (3): **accepted and recorded** — the existing modal framework stays (swapping the list's dialog framework is outside T-8's approved scope); `app-pr-dialog` is keyboard-closable (Escape) with `role="dialog"`. Forward to T-10: keyboard/focus check of the history modal.
- Advisory `loadedFor` reset: recorded, not added to scope (advisory rule); forward to T-10 (reject → resubmit → reject in one editor session).

#### Attempt 2 — FAIL

- **Implementer** (same agent resumed, effort bumped to `high`): list payload (`BilateralCenterResult`) has no prior-rejection field → no server change; trigger gated on `hasReviewHistory(result)` for statuses {5, 6, 7} (`REVIEW_HISTORY_STATUS_IDS`, ids checked in `result-status-tokens.ts`); at 7 `warning_amber` + "View rejection justification", at 5/6 `history` + "Review history" (copy `trigger.rejected`/`trigger.history`); modal empty text → "No rejections have been recorded for this result."; `copy.loading` bound in the notice; list folder `CLAUDE.md` updated. Tests: describe "reachability after the rejection" (4). Edited 1 assertion it added in attempt 1 (empty-text string). `npx jest --maxWorkers=2 --no-coverage --testPathPattern="bilateral-rejection-notice|bilateral-page-header|bilateral-results-list"` → `Test Suites: 3 passed, 3 total` · `Tests: 176 passed, 176 total`. Lint clean. Assumption: trigger shows at 5/6 for never-rejected results (empty state); exact targeting needs a server flag.
- **Reviewer: FAIL** — attempt-1 issues 1 and 2 fixed. New issue (verbatim): **Discovered Issue:** The new trigger at 5/6 is meant to be neutral ("history" icon, "Review history" label), but it still renders in the danger colour. The button keeps `class="brl_justification_trigger"`, and `bilateral-results-list.component.scss:793–800` sets `color: var(--pr-color-red-300)` on that class for every status. So **every Pending review and Approved row** in the main centre table now carries a red icon next to its status, telling users that healthy results have a problem. The tests assert only the label and icon name; jsdom never checks the colour. **Violated Rule:** `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules #12 ("Color only on semantic icons. Decorative icons stay neutral") and #9 (status colour semantics fixed). The Implementer's own declared behaviour (neutral at 5/6, warning only at 7). `design.md` §9 tokens note :168 (rejected/danger tones reserved for the Rejected status). **Remediation Suggestion:** Keep the red only at 7. In the template, bind the colour per state with Tailwind, for example `[class.text-[var(--pr-text-secondary)]]="!isRejected(result)"`, or add a modifier class whose colour is a neutral `--pr-*` token. Use an existing token such as `--pr-text-secondary` or `--pr-color-secondary-400`, not a hex value. Add one Jest assertion that the 5/6 trigger does not carry the red/warning modifier and the 7 trigger does. The real colour check also goes to the T-10 visual list.
- **ADVISORY:** RELIABILITY: a status-5 result unsubmitted back to 1/8 loses the trigger though history exists (same root cause as the declared assumption). READABILITY: pre-existing hard-coded modal loading/error strings in the list template. RELIABILITY: `loadedFor` reset (already recorded).
- **Leader:** in scope; attempt 3 (final) with effort `xhigh`.

#### Attempt 3 — **PASS**, task closed

- **Implementer** (same agent, effort `xhigh`): `bilateral-results-list.component.scss` — `.brl_justification_trigger` neutral by default (`var(--pr-text-secondary)`, `colors.scss:207`; hover `var(--pr-color-primary-400)`, `colors.scss:21`); new `&--rejected` modifier keeps `--pr-color-red-300` / hover `--pr-color-red-400`. Template binds `[class.brl_justification_trigger--rejected]="isRejected(result)"`. 1 test added (5/6 lack `--rejected`, 7 has it); no existing test edited. `npx jest --maxWorkers=2 --no-coverage --testPathPattern="bilateral-results-list|bilateral-rejection-notice|bilateral-page-header"` → `Test Suites: 3 passed, 3 total` · `Tests: 177 passed, 177 total`. `ng lint --quiet` clean; no stylelint config in the project.
- **Reviewer: PASS** — "All of RRC-R-14 and RRC-R-15 that Jest can verify is in place: the notice picks the newest rejection, it disappears at status 5, the history stays reachable at 5, 6 and 7, it is listed oldest first with RESUBMIT rows and without UPDATE rows, legacy rows show no SP, and the neutral and danger trigger colours are separated using tokens. The remaining checks need a real browser and belong to T-10."
- **ADVISORY:** RELIABILITY: reset `loadedFor` when the notice hides; retarget the trigger once a server "has history" flag exists (incl. a result unsubmitted back to 1/8). READABILITY: pre-existing hard-coded modal loading/error strings in the list template.
- **Budget:** T-8 used 3 review rounds against a budget of 1 (design §13). Cause: the status-7 trigger gate was not named in the task (reachability after resubmission), and the fix introduced a colour regression. Reported to the user.

#### Forward pointers

- **→ T-10 (visual, real browser):** trigger colour neutral at 5/6, red at 7; `line-clamp-3` + Show more on a long reason; notice placement reads as "next to the status" with the rail pill; history modal keyboard/focus (`app-pr-dialog`: Escape works, no focus trap); reject → resubmit → reject in one editor session (stale `loadedFor`).
- **→ follow-up (out of spec):** server flag "has review history" on the bilateral list payload, to show the trigger only for results that have one.

**Final verification:** scoped Jest 177/177 · lint clean.

#### `RRC-T-4` — user checks on PRTest (2026-10-06)

- `SHOW COLUMNS FROM result_review_history LIKE 'id'` → `id` · `bigint` · NO · PRI · auto_increment (signed) → **`RRC-P-12` confirmed on real DB**.
- `SHOW COLUMNS FROM notifications LIKE 'review_history_id'` → empty (pre-`up`).
- `npm run migration:check` → "Pending: 1 — NotificationReviewHistoryLink1790700000000" (falsifier not triggered).
- Pending: `up` / `down` / `up` with SQL checks.
- `npm run migration:run` (`up` #1) → schema `prdb`; "1 migrations are new"; guarded checks → `ALTER TABLE notifications ADD review_history_id bigint NULL` → `CREATE INDEX IDX_notifications_review_history` → `ADD CONSTRAINT FK_notifications_review_history ... REFERENCES result_review_history(id) ON DELETE SET NULL ON UPDATE NO ACTION` → "executed successfully" → `COMMIT`.
- `SHOW CREATE TABLE notifications` → `review_history_id bigint DEFAULT NULL`, `KEY IDX_notifications_review_history`, `CONSTRAINT FK_notifications_review_history ... ON DELETE SET NULL` ✅. `SELECT COUNT(*) ... IS NOT NULL` → 0 ✅.
- Pending: `down` + `up` #2.
- `npm run migration:revert` (`down`) → guarded checks → `DROP FOREIGN KEY FK_notifications_review_history` → `DROP INDEX IDX_notifications_review_history` → `DROP COLUMN review_history_id` → migrations row deleted → "reverted successfully" → `COMMIT`. User: the three post-`down` checks (column, index, FK) all returned empty ✅. (The "executed on Sep 29" line is TypeORM rendering the name timestamp, not the run time.)
- `npm run migration:run` (`up` #2) → "1 migrations are new" → same guarded statements as `up` #1 (column, index, FK `ON DELETE SET NULL`) → "executed successfully" → `COMMIT` ✅. Final `SHOW CREATE TABLE` not re-captured; the DDL log is the evidence (identical to `up` #1, whose `SHOW CREATE TABLE` was verified).
- **`RRC-T-4` closed: PASS** — code PASS ×2 + `up`/`down`/`up` on `prdb` (shared test DB) 2026-10-06. Unblocks T-5.

### `RRC-T-5` — The rejection notification carries its history row

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-06 |
| Attempts | 1 Implementer (`akili-implementer`, effort `high`) · 1 Reviewer (lens checklist) |
| Skills | `nestjs-expert`, `tdd` (as listed) |
| Requirements covered | `RRC-R-13` (server: that rejection's reason, legacy rows), `RRC-R-16` |

#### Attempt 1

- **Files changed:** `onecgiar-pr-server/src/api/results/results.service.ts` (+ spec, additions only) · `onecgiar-pr-server/src/api/notification/notification.service.ts` (+ spec, additions only). Readout query lives in `notification.service.ts` (TypeORM `find({ relations })` → LEFT JOIN on the FK); no repository touched.
- **Change:** `reviewBilateralResult` captures the id returned by `manager.save(ResultReviewHistory, …)` inside the transaction (`Number(...)`, bigint-as-string pointer), passes it post-commit to `emitBilateralReviewNotification(resultId, decision, user, reviewHistoryId?)` on REJECT only (forced `undefined` on Approve); both submitter and centre `emitResultNotification(..., reviewHistoryId?)` rows store `review_history_id`. Readout: `getNotificationReadoutSelect()` / `getNotificationReadoutRelations()` add `obj_review_history { id, comment }` to panel viewed, panel pending and bell (`getPopUpNotifications`); `withReviewEntryFields` adds `has_review_entry` / `review_comment` to `BILATERAL_RESULT_REJECTED` rows only and drops the joined object. Text builders untouched.
- **Tests added:** results.service +6 (both emits carry the id; centre text unchanged; Approve never links; Reject without id unchanged; REJECT emit gets the saved id as a number post-commit; APPROVE no id) · notification.service describe `RRC-T-5` 17 cases (write path ×2; query shape; two-rejection falsifier A/B; string-bigint FK; legacy NULL → false/null; linked null comment → true/null; no leak, non-rejected unchanged; bell readout; R-16 descriptions ×7, literals from builder source). No existing test edited.
- **Verification:** red first (results 2 failed; notification TS2554 → 6 failed) · mutation: removing `obj_review_history: true` → 5 failed (restored) · `npx jest --maxWorkers=2 --testPathPattern="results.service|notification.service" --silent --reporters=summary` → `Test Suites: 7 passed, 7 total` · `Tests: 242 passed, 242 total`. eslint `--quiet` 0. `tsc --noEmit`: 0 errors in touched files; 6 errors in `src/api/bilateral/bilateral.service.spec.ts` (`contributorInitiativeIds` missing from `ResubmissionResetOptions`) — from commit `bc42f5554` (`bilateral/resubmit-followups`), not RRC.
- **Implementer `Not Done / Assumptions` (verbatim excerpts, adjudicated: no owed scope):** "The JOIN itself was not executed, because there is no DB access." · "The "latest REJECT of the result" falsifier is only partly exercised. A mocked repository cannot run that wrong query." · "Assumption: the fields also go on the bell endpoint (`getPopUpNotifications`), because `pop-up-notification-item` (the T-9 target) renders both the panel and the bell." · "Rows that are Rejected but have a history row with an empty comment return `has_review_entry:true`, `review_comment:null`. The client (T-9) should show the fallback in that case." · "Approve submitter calls now pass two explicit trailing `undefined` arguments".
- **Reviewer: PASS** — "The rejected notification stores the id of the history row saved inside the transaction, on both the submitter and centre rows and only for Reject. The panel and bell readouts read it back through a LEFT JOIN on that row, so each notification gets its own comment and legacy rows return false/null; the text builders are untouched and the R-16 strings come from builder code that didn't change. The partial select only adds to the existing selection and drops nothing the readout or client needs."

#### ADVISORY (4R, non-gating)

- RELIABILITY: `review_comment: linkedEntry?.comment ?? null` keeps `''` as `''`; only `null` is tested. T-9 must treat `''` and `null` alike (fallback).
- RISK: JOIN not run against MySQL — one read-only panel/bell check on a real REJECT (T-10).
- READABILITY: Approve submitter call ends with `undefined, undefined`.

#### Forward pointers

- **→ T-9:** fields `has_review_entry` / `review_comment` are on both the panel and the bell payloads, Rejected rows only; show the fallback for `review_comment` `null` **or empty/blank**; no line when `has_review_entry` is false/absent.
- **→ T-10:** reject a result on `prdb` → check `notifications.review_history_id` on both rows and the panel/bell payload (read-only browser check).

**Final verification:** scoped Jest 242/242 · eslint clean · tsc clean in touched files.

### `RRC-T-6` — API resubmission uses the direct transfer

| Field | Value |
|---|---|
| Status | in progress (attempt 1 FAIL ×2 lenses; waiting on a user decision before attempt 2) |
| Date | 2026-10-06 |
| Skills | `nestjs-expert`, `tdd`, `api-design-principles` (as listed) |
| Requirements | `RRC-R-17`, `RRC-R-18` (resubmission/transfer log) |
| Scope addition | user-approved 2026-10-06: fix the 6 `tsc` errors in `bilateral.service.spec.ts` (stale vs commit `bc42f5554`, `bilateral/resubmit-followups`) |

#### Attempt 1 — FAIL (both lens Reviewers)

- **Implementer** (`akili-implementer`, effort `high`): writers port `requestPrimary` → `transferPrimary` (wired in `bilateral.service.ts` with `Number(initiativeId)`, `{ releaseContributors: true }`); `commitResubmission`: CAS 7→5 first (reused as the `Result` row lock), then `transferPrimary` when the primary changed, then the `RESUBMIT` row; non-HTTP core throw → 503 `primaryTransferFailure`; `primaryRequestFailure` / 500 `not_aligned` removed; post-commit `RSB-R-21` line, `RRC-R-18` line on `transferred` (uses `storedOwnerId` read before the reset), announce always. Role 1 written once (reset retires old owner, writers suppress, core writes). Existing RSB tests that encoded the superseded `RSB-R-14` rewritten (list in the Implementer report: passingWriters, (a), (b) ×2, (c) it.each + 2 ORDER + failed-writer, (d) ×4, (h), RSB-R-21 failure trigger); 5 `R-18` log tests + role-1 test added; tsc fix: 6 calls gain `contributorInitiativeIds: []`. RSB docs amended under `docs/specs/archive/2026-10-06-bilateral--resubmit-rejected-result/` + `resubmit-followups/requirements.md:35`; contract change-log row + body + error table amended. Falsifier: forcing announce skip → 4 failed. `npx jest --maxWorkers=2 --testPathPattern="bilateral-resubmission|bilateral.service.spec" --silent --reporters=summary` → `Test Suites: 2 passed, 2 total` · `Tests: 339 passed, 339 total`. eslint 0 · `tsc --noEmit` exit 0 (whole project).
- **Reviewer A (spec + reliability + risk): FAIL** (verbatim issue): "The authoritative contract doc now promises a state the code does not produce. `bilateral-result-summaries.en.md` (new bullet under "Primary and contributing Science Programs"): "If the assignment fails, the result stays Rejected **with its previous primary** (`503` above) and you can resend." On a changed primary, `resetSectionsForResubmission` deactivates the old owner's role 1 and its accepted `primary` row in an earlier, separate transaction. A failed transfer or history insert therefore leaves the result Rejected and ownerless. The diff's own test asserts it (`expect(t.activeOwner()).toBeNull(); expect(activePrimaryRows(t.db)).toEqual([])`). The new code comment above `commitResubmission` ("leaves the result Rejected with its previous data") is wrong in the same way. **Violated Rule:** RRC `requirements.md` §7 NFR "Data integrity: A direct transfer and a resubmission are all-or-nothing: a failure leaves the previous primary and status intact". Root/server `CLAUDE.md`: the contract doc is authoritative. **Remediation:** Preferred: satisfy the NFR — when the primary changes, stop retiring the old owner's role 1 and accepted primary row in the reset (keep writers' suppression); `transferPrimary` already does both inside the final transaction; drop the `storedOwnerId` workaround; update failure/CAS-409 tests to assert the previous owner survives. Minimum alternative: correct the doc and comment to the real behaviour and record the NFR §7 gap (inherited from `RSB-P-1`/`RSB-DD-2`) for the HITL."
  - Reviewer A on the questions: CAS-first safe inside the final tx; 500/503 change is not an R-17 breach (success response unchanged, change-log covers it); edited RSB tests legitimate (no tampering); single role-1 write holds; emails-before-commit real but low.
- **Reviewer B (spec + readability + resilience + docs closure): FAIL** (verbatim issues, condensed to their headings + rules; full text in the Reviewer report):
  1. Contract doc "Retrying safely" still describes removed behaviour (`:559` 500 row, `:550` "with the primary request", `:558` "503 (lock or primary request)") vs the new change-log row and errors table. Rule: RRC-T-6 Correction Closure + design §10; contract doc authoritative. Remediation: delete the 500 row, reword `:550` / `:558`, re-grep "primary request", "500", "not_aligned".
  2. Backward closure: contract `:598` and RSB `requirements.md:188` say "stays Rejected with its previous primary" — the Implementer's own test disproves it (ownerless after a failed transfer, RSB-DD-5 reset order). Conflicts with RRC NFR §7. Leader to record an accepted deviation or open a design decision; do not paper over it.
  3. Live RSB text still contradicts the amendments: `design.md:23`; `tasks.md:158` (b), `:159` (c), `:164` (h), `:166` red run. Remediation: fix `design.md:23`; one amendment note above the T-5 Verification block naming (b), (c), (h) and the red run as superseded by RRC-T-6, with the new falsifiers; keep originals as history.
  4. Struck-through history reworded (RSB `proposal.md:61` scope bullet; `:157` OQ-1, a recorded user decision) so the grep returns 0 — changes the record. Remediation: restore the original wording verbatim inside `~~…~~`, keep the "Superseded RRC-R-17" notes, re-report the grep as "N hits, all in struck/superseded history; 0 in live text".
- **ADVISORY (both):** READABILITY: duplicated `suppressPrimaryRole` docblock; comment "the platform keeps the message it always got" is false (503 text changed); `Number()` applied twice. RESILIENCE: resend after 503 is safe (rollback covers CAS + transfer + history; lock released in `finally`); HTTP-exception passthrough from the core is unused today but would mislead the retry table if the core ever threw 409. RISK: `releaseContributors` emails inside the final tx while the CAS lock is held; the `not_aligned` allocation re-check at write time is gone (tiny window); race between an in-app SP change at 7 (T-2) and an API resubmission (`GET_LOCK` only serializes the API) → T-10. RELIABILITY: (h) test title asserts something it doesn't check; `primaryTransferFailure` logs the raw DB error message. SCOPE: the 6 `contributorInitiativeIds: []` additions belong with the RSF-T-6 fix in the commit.

#### Leader adjudication

- Both Reviewers converge on one substantive finding: on a **changed primary**, a failure after the reset leaves the result Rejected and **ownerless**, which contradicts RRC NFR §7 (inherited from RSB's reset running in its own earlier transaction). Fixing the code is a change to RSB's reset order → **escalated to the user** (spec decision) before attempt 2. Docs issues B1, B3, B4 are in scope for attempt 2 regardless.

## Pivot Record: `RRC-T-6` (and T-9 scope)

- **T-6 trigger:** both lens Reviewers: on a changed primary, RSB's reset (own earlier transaction) retires the old owner, so a later failure leaves the result Rejected and ownerless — violates RRC NFR §7 "a failure leaves the previous primary and status intact". Inherited from RSB, not introduced by T-6.
- **Alternatives offered:** (a) satisfy the NFR — the reset stops retiring the old owner on a changed primary; `transferPrimary` does it inside the final transaction (recommended) · (b) keep the code, correct docs/comments to the real behaviour, record the NFR deviation.
- **Decision:** user chose **(a)**, 2026-10-06. `design.md` §8.6 pivot paragraph; `tasks.md` T-6 Files line amended (RSB folder path corrected to `archive/`).
- **T-9 scope:** the Implementer flagged that the notifications page row (`results-notifications/.../notification-item`) shows the same rows and receives the T-5 fields. **User chose to widen T-9** to that row, 2026-10-06. `design.md` §9 Notification row + `tasks.md` T-9 Files amended.
- Correction Closure: grepped `requestPrimary`, `resubmit-rejected-result/`, `pop-up-notification-item` across the RRC folder — the T-6 Files path and §9 row were the only sites asserting the old scope/location.
- **Budget:** T-6 enters attempt 2 (budget 2 rounds); T-9 re-review after widening.

#### `RRC-T-6` attempt 2 — **PASS** (both lenses), task closed

- **Implementer** (same agent, effort `xhigh`), pivot applied: `resetSectionsForResubmission` no longer retires the old owner on a changed primary (accepted-`primary` exemption always applies; role-1 deactivate block and `PRIMARY_INITIATIVE_ROLE` removed; `primaryChanged` stays on the options type, unused by the reset); `transferPrimary` retires owner, `primary` rows and old-owner ToC inside the final transaction; R-18 line uses the core's `previousInitiativeId` (`storedOwnerId` workaround dropped); `Number()` only at the port; false "keeps the message" comment removed; `suppressPrimaryRole` docblock merged; `bilateral.service.ts` comments updated. Tests edited (superseded behaviour + pivot): reset "accepted primary row follows the owner" (CHANGED → kept), reset role-1 (→ not deactivated), (c) core throws → SP01 still owner + `[{SP01,2}]`, (d) CAS 409 → same, (d) history insert fails → retired in-tx then restored, failed writer → previous primary intact, (h) title, harness `ownerAt` + `ResultsTocResult`. Added: owner active through reset/writers/transfer start (core reports SP01); old-owner ToC retired, new-SP ToC kept, no duplicate stub; log uses core id (99). Mutation (restore old role-1 deactivation) → 7 failed. Contract: "Retrying safely" rows reworded, 500 row deleted, change-log row gains the rollback sentence. RSB docs: `requirements.md:188`, `design.md:23` + diagram/reset row/DD-5/reversion row, `tasks.md` T-4 struck+amended + amendment note above T-5 red run, `execution.md` T-5 note, `proposal.md` struck text restored verbatim. Grep: "acceptance flow" 2 + "pending acceptance" 1 + `requestPrimary` 5 + 1, all in struck/superseded history or forward-looking rows; 0 in live text.
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern="bilateral-resubmission|bilateral.service.spec" --silent --reporters=summary` → `Test Suites: 2 passed, 2 total` · `Tests: 342 passed, 342 total`. eslint `--quiet` 0 · `npx tsc --noEmit -p tsconfig.json` exit 0.
- **Implementer `Not Done / Assumptions` (verbatim excerpts, adjudicated: no owed scope):** "No real-DB proof" · "Between the reset and the final transaction the result is Rejected with partial data (reset and writers are not transactional, `RSB-DD-3`) but keeps its owner and accepted row. The contract doc and `requirements.md` say this." · "Contributor-release emails inside the transaction still go out before the commit (inherited from `accept()`)".
- **Reviewer A (spec + reliability + risk): PASS** — "The CAS, the direct transfer and the RESUBMIT row are one transaction, and the reset and writers no longer touch ownership, so a lost CAS, a throwing core or a failed history insert leaves the result Rejected with SP01 still its owner and its accepted row. Real-core tests prove each case, a mutation test backs them, and the contract doc and R-18 line now match the code."
- **Reviewer B (spec + readability + resilience + Correction Closure): PASS** — "The attempt-2 diff matches RRC-R-17, R-18, DD-7, design §8.6 and its user-approved "Pivot T-6". Tests on the real core prove the previous primary survives every failure in the final transaction. The contract doc and the RSB amendments now match the code, with no residual hits in live text, and the struck-through history is the original wording again."

#### ADVISORY (4R, non-gating)

- RISK: `releaseContributors` emails inside the final tx while the CAS lock is held (inherited from `accept()`); a later history-insert failure cannot recall them.
- RISK: write-time allocation re-check (`not_aligned`) gone — an allocation removed between preflight and commit is assigned anyway (tiny window).
- RISK / RESILIENCE: in-app SP change at 7 (T-2) vs API resubmission — `GET_LOCK('rsb:…')` serializes only the API; same-primary resubmission after a centre move could leave two owners; changed-primary is last-write-wins (accepted, RSB R-4).
- RELIABILITY / RESILIENCE: after a 503 the result keeps SP01 but SP01's ToC was already retired by the reset (and an SP06 ToC row exists) until the retry.
- RESILIENCE: HTTP exceptions from the core pass through with their status (unused today).
- READABILITY: `ResubmissionResetOptions.primaryChanged` now dead input; `resubmit-followups/requirements.md:35` "in the same transaction" → "in the final transaction".
- SCOPE: the 6 `contributorInitiativeIds: []` additions in `bilateral.service.spec.ts` belong with the RSF-T-6 fix — commit them separately.

#### Forward pointers

- **→ T-10:** API resubmission with a changed primary on `prdb` (SP moves, Pending Review in the new SP's queue, ordinary notice, no ownership request); a forced failure is not reproducible manually — rely on tests; in-app SP change at 7 vs API resend race; after a failed resend, SP01 without ToC until retry.
- **→ commit plan:** keep `contributorInitiativeIds: []` (tsc fix for RSF-T-6) in its own commit; RSB doc amendments live in the archived folder staged by the other session.
- **→ archive:** drop `primaryChanged` from `ResubmissionResetOptions`; reword `resubmit-followups/requirements.md:35`.

**Final verification:** scoped Jest 342/342 · eslint clean · tsc exit 0.

### `RRC-T-9` — Client: reason line in the rejection notification

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3; scope widened mid-attempt by the user) |
| Date | 2026-10-06 |
| Attempts | 1 Implementer (`akili-implementer`, effort `medium`; resumed once for the widened scope) · 1 Reviewer (lens checklist) |
| Skills | `angular-developer`, `spartan` (as listed) |
| Requirements covered | `RRC-R-13` (client: bell + notifications page, fallback, legacy, long text), `RRC-R-16` (client) |

#### Attempt 1

- **Files changed:** `shared/constants/notification-type.constants{,.spec}.ts` (`getRejectionReasonLine`: null unless `BILATERAL_RESULT_REJECTED` and `has_review_entry === true`; trimmed comment, or `BILATERAL_REJECTION_NOTICE_COPY.noJustification` for null/''/blank) · `shared/components/header-panel/components/pop-up-notification-item/*` (`rejectionReasonOf()`, `<p data-testid="bell-rejection-reason">`, `line-clamp-2 break-words`, `--pr-text-secondary`, bold "Reason:"; commit `fe9f0eedd` untouched) · widened: `pages/results/pages/results-outlet/pages/results-notifications/components/notification-item/*` (getter `rejectionReasonLine` on `isUpdateSource` rows, `<p data-testid="notification-rejection-reason">`, same classes) + folder `CLAUDE.md` · `internationalization/bilateral-rejection-notice.copy.ts` (+ `notificationReasonLabel: 'Reason:'`; fallback reused from T-8). Model is `any` — no interface to extend.
- **Tests added:** constants (trim; null/''/'   '/undefined → fallback; legacy false/undefined → null even with a comment = falsifier; Approved → null; Rejected sentence unchanged) · bell ×4 · page row ×4. No existing test edited.
- **Verification:** `npx jest --maxWorkers=2 --no-coverage --testPathPattern="notification-type.constants|pop-up-notification-item"` → `Test Suites: 2 passed, 2 total` · `Tests: 201 passed, 201 total` (bell round) → after widening `--testPathPattern="notification-type.constants|pop-up-notification-item|notification-item"` → `Test Suites: 5 passed, 5 total` · `Tests: 502 passed, 502 total`. `npx ng lint --lint-file-patterns=…` → "All files pass linting." (`--quiet --lint-file-patterns <files>` form rejected by this CLI.)
- **Implementer `Not Done / Assumptions` (verbatim excerpts, adjudicated):** "Notifications page row not changed ... confirm with the Leader." → escalated, user widened scope, done on resume. · "Clamp not proven. jsdom cannot show the 2-line clamp; the test only checks the class. That is left to T-10 visual." · "The notifications page line applies only to `source:'update'` rows (`isUpdateSource`), where rejection notifications live."
- **Reviewer: PASS** — "The reason line shows only on Rejected rows that have a review entry, in both the bell and the notifications page. It shows the trimmed comment, or the shared fallback when the comment is blank, and legacy rows provably never show the fallback. Other notification types and the sentence from fe9f0eedd are byte-for-byte unchanged. Proof that the 2-line clamp works on long text is a recorded gap that T-10 must close in a real browser."

#### ADVISORY (4R, non-gating)

- RELIABILITY: strict `has_review_entry === true`; a raw-SQL `1` would hide the line — pin the boolean contract or cast.
- READABILITY: copy import placed above `@angular/core` in `notification-item.component.ts`; page spec loses its trailing newline.
- RISK: T-10 must check an unbroken long token (URL) in the bell (`break-words` + `line-clamp-2` in a `min-w-0 flex-1` column).

#### Forward pointers

- **→ T-10:** long reason + unbroken URL in the bell and the page row (clamp, wrap, layout); legacy rejection notification shows no reason line; a new rejection shows its own reason in both views.

**Final verification:** scoped Jest 502/502 · lint clean.

### `RRC-T-10` — Real run on PRTest (manual, user) — in progress

- **Test data (2026-10-07, from the user's catalogue query on `prdb`):** A = result `9640` (id 12108, "W3U TEST DEMO … C2-INNODEV", lead project 2134, allocated SP02/SP09/SP10, primary SP02); A2 (API path) = `9642` (id 12110, project 2131, SP01/SP07/SP11, primary SP01); B (single SP) = pending selection.
- **Baseline 9640:** `status_id 1`; Q1 history empty; Q2 role 1 SP02 active; Q3 no share requests; Q4 no notifications.
- **Block 1 (9640), user-run on `prdb`, 2026-10-07:**
  - Contributor SP06 added in Editing with owner → `share_result_request` 4576 `contribution`, status 1, active (unchanged behaviour ✅). A teammate declined it from the notifications (status 3, inactive) — a contribution-request decline, not a review rejection; no justification asked, result status unchanged (expected).
  - Submit → `status_id 5` ✅; history 803 `UPDATE` "Submitted for review by the reporting center" (ordinary row, not RESUBMIT) ✅; submit notifications type 12, `review_history_id` NULL ✅.
  - Review rejection by SP02 from the QA review module, justification "Motivo A" → `status_id 7` ✅; history 805 `REJECT` "Motivo A" SP02 ✅; 3 rejection notifications (type 7, targets 606/1131/575) all with `review_history_id = 805` ✅ (`RRC-R-13` storage); SP02 still role 1 active ✅.
  - Open question: history 804 `UPDATE` "accepted" (user 829, 20 s before the REJECT) — to confirm it comes from the existing review flow, not RRC.
- **Block 1 cont. / Block 2 (9640), 2026-10-07:**
  - Edit + save at 7 → `status_id` stays 7, no new notification (MAX 49659) ✅ (`R-2`). Notice on the result: "Rejected by the Science Program · SP02 · 07 Oct 2026 · Motivo A", no controls; rail badge REJECTED ✅ (`R-14`). Stale QA message shown ✅.
  - Resubmit: Submit re-ran the AI check on the current version; the AI service was unavailable → existing BIL-QAI rule allows `submitted_without_check` on a current run (stale guard not relaxed ✅ `R-6`). Status → Pending Review ✅; history 806 `RESUBMIT` SP02 ✅ (`R-5`).
  - Second rejection 807 `REJECT` "Motivo A" (same text re-entered) → notice shows the latest reason ✅.
  - Contributor SP09 added at 7 → `share_result_request` 4577 `contribution`, status 4 (draft), active — held, not sent ✅ (`R-8`, `P-13` storage). Notification baseline MAX = 49686.
- **Block 3 (9640), 2026-10-07 — direct transfer + resubmission to the new SP:**
  - Selector at 7 offers only SP02/SP09/SP10 (allocated; rejecting SP02 still pickable) ✅ (`R-9`).
  - Save SP10 → role 1 SP10 active, SP02 inactive; one active `primary` row SP10 (4578) status 2; SP09 draft stays 4; no notification (MAX 49686) ✅ (`R-10`, T-1/T-2 on real rows; no pending banner, no ToC asked).
  - Change of mind SP02 → SP10: one active role 1 after each save; no notifications ✅ (`R-10` change of mind).
  - Submit → status 5; history 811 `RESUBMIT` SP10 ✅; SP09 contribution 4577 → status 1 (released only at resubmission) ✅ (`R-8`); new notifications only type 12 (submit), `review_history_id` NULL, no ownership request ✅ (`R-10` submit after the move). History 808–810 `UPDATE` "Updated lead project and primary Science Program" = existing per-save audit rows.

## Finding `RRC-T-10-F1` (2026-10-07) — rejection notifications name the CURRENT primary, not the rejecting SP

- **Observed on PRTest (9640):** after the direct transfer SP02 → SP10, both rejection notifications (history 805 and 807, rejected by **SP02**) read "has been Rejected by the Science Program **SP10**" on the notifications page (and the bell uses the same builder).
- **Cause:** the client builds the program in the sentence with `getProgramCode(notification)` (`onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts:134`), which reads the result's **current** role-1 initiative at render time. Before RRC a rejected result could not change primary, so the sentence was always right; `RRC-R-10` (direct transfer at 7) makes it wrong for every earlier rejection.
- **Violates:** `RRC-R-13` ("in addition to saying the result was rejected and **by which SP**").
- **Fix (user-approved "corrígelo ahora mismo", 2026-10-07):** server readout also returns the rejecting SP's code from the linked `result_review_history` row (`initiative_id`) for Rejected rows (`review_program_code`, additive); client uses it for Rejected rows with a linked entry, falls back to today's `getProgramCode` otherwise (legacy rows unchanged). Reopens T-5 (server readout) and T-9 (client sentence) under this finding; tracked as `RRC-T-10-F1` in `tasks.md`.
- **Block 4 (9640), 2026-10-07:** third rejection by **SP10** from the review module with a long justification (starts with `www.google.com` + lorem ipsum) → history 812 `REJECT` SP10 ✅; rejection notifications linked per row: 805 ×3, 807 ×3, 812 ×3 ✅ (`R-13` "older rejection keeps its own reason"); notifications page renders "Reason: …" clamped to 2 lines with ellipsis, no overflow ✅ (`R-13` long text, page row). Bell / result notice / history modal checks pending. Unbroken long-token case not yet exercised (URL was space-separated).
- **Block 4 cont. (9640), 2026-10-07:** bell — "Declined" chip SP10 + "Reason: www.google.com …" clamped to 2 lines, no overflow ✅; result notice — "Rejected by the Science Program · SP10 · 07 Oct 2026", long text clamped with "Show more" ✅ (`R-14`); results list — Rejected + red warning icon ✅; history modal — oldest first: Rejected SP02 (Angel Jarrin) "Motivo A" → Resubmitted SP02 → Rejected SP02 (Admin PRMS) "Motivo A" → Resubmitted SP10 → Rejected SP10 long text, each with SP, reviewer, date; no UPDATE rows; full text unclamped; closes with Escape ✅ (`R-15`).
- **Finding `RRC-T-10-F2` (minor, UX):** in the history modal, **Resubmitted** rows render the fallback "No justification was recorded." in the same pink box as a rejection — misleading (a resubmission carries no justification). Proposed: RESUBMIT rows show no comment box (or a neutral line). Pending user decision.
- **`RRC-T-10-F2` decision:** user chose to **leave it as is** (2026-10-07) — recorded as a minor UX follow-up, out of this spec.

### `RRC-T-10-F1` — Rejection notification names the SP that rejected

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) — code; real-row confirmation pending on PRTest after deploy |
| Date | 2026-10-07 |
| Attempts | 1 Implementer (`akili-implementer`, effort `high`) · 1 Reviewer (lens checklist) |
| Skills | `nestjs-expert`, `angular-developer`, `tdd` |
| Requirements | `RRC-R-13` ("by which SP"), `RRC-R-16` |

- **Files changed:** `onecgiar-pr-server/src/api/notification/notification.service.ts` (+ spec): readout relations `obj_review_history: { obj_initiative: true }`, select adds `obj_initiative { id, official_code }`; `withReviewEntryFields` adds `review_program_code` (official code or `null`) to Rejected rows only; joined object stripped; socket push untouched. Existing `ResultReviewHistory.obj_initiative` (nullable ManyToOne) reused — no entity/schema change. · `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` (+ spec): `getReviewProgramCode(n)` (Rejected + `has_review_entry === true` + non-blank string) and `buildBilateralReviewSuffix` uses `getReviewProgramCode(n) ?? getProgramCode(n)`. · **Declared scope addition (Reviewer: needed for R-13 consistency):** `pop-up-notification-item.component.ts` bell chip getter `programCode` uses `getReviewProgramCode(n) ?? <old>` so the chip does not contradict the sentence (+ 2 bell spec cases).
- **Existing assertion edited (Reviewer: legitimate, relation shape changed):** `notification.service.spec.ts` "asks the repository for the linked history row (relation + comment selected)": `objectContaining({ obj_review_history: true })` → `objectContaining({ obj_review_history: expect.anything() })`; a new test pins the exact nested relation + select.
- **Verification:** server red first (5 failed) → `npx jest --maxWorkers=2 --testPathPattern="notification.service" --silent --reporters=summary` → `Test Suites: 2 passed, 2 total` · `Tests: 154 passed, 154 total`; client falsifier proven by manual revert (1 failed) → `npx jest --maxWorkers=2 --no-coverage --testPathPattern="notification-type.constants|pop-up-notification-item|notification-item"` → `Test Suites: 5 passed, 5 total` · `Tests: 514 passed, 514 total`. eslint / `ng lint` clean; tsc server + client app exit 0.
- **Reviewer: PASS** — "Rejected notifications now name the SP from the linked result_review_history row (initiative_id → official_code). If the row has no linked entry or no SP, they fall back to today's current-primary code, so legacy rows are unchanged and R-16 holds for Approved and other types. The nested relation is a nullable ManyToOne resolved with a LEFT JOIN and no where filter on it, so no notification row is dropped; the one edited assertion follows from the relation shape change, and a new test pins the exact nested shape."
- **ADVISORY:** record the bell-chip addition in the task Files line (done below); confirm on PRTest that rows 805/807/812 render SP02/SP02/SP10 in the bell and the page.
- **Cycle close (9640), 2026-10-07:** resubmitted to SP10 (Pending Review; Program selector read-only at 5 ✅ `R-3`); SP10 approved from its "Bilateral review" tab (the earlier "SAVE CHANGES" dialog is the reviewer's edit-save with reason, which writes an `UPDATE` history row — explains row 804 "accepted"). Results list: **Approved** + history icon in **neutral** colour ✅ (T-8 attempt 3, `R-15` reachable after approval).
