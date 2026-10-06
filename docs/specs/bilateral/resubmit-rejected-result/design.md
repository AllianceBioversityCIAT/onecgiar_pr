# Design — Reporting platforms resubmit a rejected bilateral result through `create`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-rejected-result` |
| Depth | **Full** |
| Status | **approved**, user 2026-10-06 |
| Date | 2026-10-06 |
| Inputs | `requirements.md` (`RSB-R-1..R-22`), `proposal.md`, scout report 2026-10-06 (`create()` map), `changes/bilateral-create-upsert-by-code` design + execution (attempt-1 FAILs of `UBC-T-3`) |
| Abbreviations | `bs` = `api/bilateral/bilateral.service.ts` · `rules` = `api/bilateral/versioning-rules/bilateral-versioning-rules.service.ts` · `ppr` = `api/results/share-result-request/services/primary-program-request.service.ts` · `rs` = `api/results/results.service.ts` |

## 2. Executive Summary

The resubmission is a **separate branch** inside `create()`. It does not share the create's write sequence blindly. It runs in five stages:

```
resolve (no writes) ─▶ lock ─▶ preflight (no writes) ─▶ reset + writers ─▶ primary/contributors ─▶ status flip + RESUBMIT (last)
```

- **No-code** create: not one line of its path changes (`RSB-R-1`). All the hoisting is gated on the resubmission branch.
- **Status flip last.** If anything fails after the writers, the result **stays Rejected**, with partial data, and the platform can **retry**. It never ends up in Pending Review half-written or without a request (`DD-3`).
- **History:** `initiative_id` + `RESUBMIT` in one migration, which also formalises the real enum and fixes the `PDR` decline.

## 3. Premise Ledger

**Blast-radius triggers:** `live-path` (create), `shared-state` (create writers, review history, PSR), `consumer` (contract + history readout).

| # | Premise | Citation (as read 2026-10-06, `2587e28b0`) | Status | If false |
|---|---|---|---|---|
| `RSB-P-1` | The create's transaction is not real: the manager is unused, every write autocommits | `bs:363-369` (the code's own comment), `bs:387`; scout Q1 | verified | A real transaction would make the preflight optional. Simplifies `DD-2` |
| `RSB-P-2` | Order in `create()`: resolver (`bs:350`) → `runResultTypePreflight` (`bs:355`) → `validateTocMappingInitiatives` (`bs:358`) → `resolveContributingProjects` (`bs:375`) → users (`bs:393`) → title (`bs:415-445`) → header (`bs:4367`) → lead centre → geo → ToC → institutions → evidence → projects → `afterCreate` → contributing centres | scout Q1 table | verified | Hoist order changes |
| `RSB-P-3` | Checks that abort **after** the header and are hoistable (they don't need the row): `geo_focus`; region/country/subnational lookups (400/404); duplicate evidence links; `afterCreate` of policy / capdev / innovation-dev / **innovation-use** (`resolveInnovationUseLevel`, `prepareActors`) | `UBC` execution.md, attempt-1 R-A #1 and R-B #1 (verbatim) | verified (by two Reviewers) | Some other check slips through → partial write. `T-3` lists accepted risk |
| `RSB-P-4` | Writers that are **not** replace-safe: evidence (plain insert), `results_by_projects` + `non_pooled_project_budget` (plain insert), contributing centres (additive), ToC/`results_by_inititiative`/contributor drafts (upsert, never deactivate), subnationals (only for new countries), innovation-use actors/orgs/measures (stale), `persistLeadCenter` (doesn't demote the previous lead) | scout Q1 rows f, h, j, k, m, n; Q2 | verified | Less reset |
| `RSB-P-5` | Already replace: regions, countries (`updateRegions`/`updateCountries`), PARTNER institutions (`updateInstitutions`), policy/capdev/innodev handlers (upsert) | scout Q1 g, i; Q2 | verified | More reset |
| `RSB-P-6` | The payload's primary is `toc_mapping.science_program_id`. Today `create` writes role 1 **directly** (`upsertResultInitiative`, `bs:1701`). It does not use `ppr.request` | scout Q3 | verified | — |
| `RSB-P-7` | `not_aligned` only exists inside `ppr.request` (`ppr:246-260`). It needs the lead row in `results_by_projects`, which `create` writes **after** the header. `ppr.getAlignments(leadProjectId)` / `isAligned` are public and work with just the project id | scout Q3; `ppr:541-600` | verified | The preflight would need to write the project first |
| `RSB-P-8` | `resolveContributingProjects` resolves the payload's lead project **before** any write | `bs:375`, `bs:3952`, `determineIsLead` `bs:4102` | verified | The alignment check moves |
| `RSB-P-9` | Contributors: `contributing_programs[]` → `share_result_request` CONTRIBUTION with status 4 (draft), **only if role 1 exists** (`bs:1564`). Released by SP approval (`rs:~4836`), primary accept (`ppr:802`) or centre sync | scout Q4 | verified | Contributors on the ownerless branch would need another path |
| `RSB-P-10` | Rejection deactivates **all** of the result's share requests (`rs:~4407`). The `PDR-R-4` decline drops contributors | `rs:4405-4409`; `PDR` §4 | verified | The reset must deactivate requests itself |
| `RSB-P-11` | `ppr.request()` never throws (it returns an `outcome`). A different SP cancels open rounds. Ownerless + `asDraft:false` → PENDING | `ppr:279`, `:313-328`, `:352-360` | verified | Failure handling in `DD-3` |
| `RSB-P-12` | `ppr.accept()` on an ownerless result writes role 1, seeds the ToC stub, and releases contributor drafts | `ppr` accept doc (`:600-625`), `:802` | verified (doc + call) | — |
| `RSB-P-13` | `accept()`'s ToC stub seed does not duplicate the ToC the payload already wrote for that SP | — | **assumed** | `T-5` checks it. If it duplicates, the ToC write is postponed until accept (`§13`) |
| `RSB-P-14` | `announcePendingReview` requires Pending Review + an owner, and never throws | `bs:685-715`, `:747-765` | verified | — |
| `RSB-P-15` | `ensureUniqueTitle(title, versionId)` has no exclude-id. The pattern exists in `rs:5558-5571` | scout Q7 | verified | — |
| `RSB-P-16` | The response already carries `outcomes[]` with `operation` (`bs:593-611`, `:654-662`) | scout Q10 | verified | `RSB-R-17` would need a new field |
| `RSB-P-17` | Real `action` enum = `('APPROVE','REJECT','UPDATE')`. Rows: UPDATE 1,741 / APPROVE 1,205 / REJECT 172 | user's query, 2026-10-06 | verified | — |
| `RSB-P-18` | Webhooks match `entry.action === delivery.decision` with `ReviewDecisionEnum` (`'APPROVE'/'REJECT'`) | `webhook-dispatch.service.ts:202-206`; `rs:3123` | verified | Correcting the entity's values would break the webhook |
| `RSB-P-19` | `clarisa_initiatives.id` is `int` | `clarisa-initiative.entity.ts:12-16` | verified | The FK type changes |
| `RSB-P-20` | The history readout is consumed as-is (`rs:2874-2883`) and by the webhook by name. One more column breaks neither, as long as the grain stays 1:1 | scout Q9 | verified | — |
| `RSB-P-21` | `DeleteRecoverDataService.deleteResult` is the most complete list of per-table `logicalDelete` calls. It is not reusable directly | scout Q12 | verified | — |

## 4. Architecture Overview

```
POST /api/bilateral/create ─▶ per result:
  no result_code ───────────────────────────────▶ create (unchanged, RSB-R-1)
  result_code ─▶ resolveResultCodeTarget
       open-phase hit ─▶ RESUBMIT branch (new)
       │  1 guards: bilateral → ownership → KP → status==Rejected → same type     (409/403, no writes)
       │  2 lock: GET_LOCK('rsb:<id>') + re-read status==Rejected                 (409 if it changed)
       │  3 preflight: handler validate+resolve, geo/region/country/subnational,
       │     evidence dup, toc_mapping primary present, isAligned(payload lead project),
       │     title excluding self, contributing projects                          (4xx, no writes)
       │  4 header in place + section reset + writers (role 1 only if primary == owner)
       │  5 primary: same owner ─▶ nothing | changed/no owner ─▶ retire old owner + ppr.request
       │  6 contributors: share CONTRIBUTION drafts (status 4) with owner = requested primary
       │  7 final atomic write: status 7→5 + RESUBMIT history (+initiative_id)
       │  8 post-commit: announcePendingReview (owner only), log RSB-R-21, release lock
       miss ─▶ versioned (unchanged, UBC) / 4xx
```

## 5. Data Model

| Change | Detail |
|---|---|
| `result_review_history.initiative_id` | `int NULL`, FK → `clarisa_initiatives(id)` (`P-19`), index. Entity: `initiative_id` + `ManyToOne` `obj_initiative` |
| `result_review_history.action` | `enum('APPROVE','REJECT','UPDATE','RESUBMIT') NOT NULL`. This formalises the real state (`P-17`) and adds `RESUBMIT` |
| `ReviewActionEnum` (entity) | `APPROVE='APPROVE'`, `REJECT='REJECT'`, `UPDATE='UPDATE'`, `RESUBMIT='RESUBMIT'`. This fixes the drift that breaks `PDR` (`RSB-R-20`) and lines up with the webhook (`P-18`) |
| Migration `down` | Converts `RESUBMIT` rows to `UPDATE`, sets the enum back to the 3 real values, and drops the FK, index and column. It does not go back to the original migration's `('APPROVE','REJECT')`, because that state never matched production |
| Backfill | None. Historical rows keep `initiative_id NULL` |

## 6. API Design

- **Route:** the same `POST /api/bilateral/create`. No new DTO fields: `result_code` already exists (`UBC-R-11`).
- **Success:** `outcomes[]` row with `operation: "updated"`, `result_code`, `status_id: 5`, `status: "pending review"` (`P-16`). `response` keeps its shape.
- **New errors** (the rest reuse the `rules` vocabulary):

| Case | HTTP | Message (base) |
|---|---|---|
| Not Rejected (`RSB-R-2`) | 409 | `Result {code} cannot be resubmitted: its status is {status name}. Only rejected results can be resubmitted.` |
| Different type (`RSB-R-22`) | 409 | `Result {code} is a {stored type}; the payload is a {payload type}.` |
| No primary (`RSB-R-13`) | 400 | `Result {code} cannot be resubmitted without a primary Science Program (toc_mapping.science_program_id).` |
| Primary not allocated (`RSB-R-12`) | 400 | `{SP code} is not allocated to the lead project of result {code}.` (same wording as `ppr` `not_aligned` when it fits) |
| Concurrent resubmission (`DD-4`) | 409 | `Result {code} is already being resubmitted.` |
| No lead project in the payload (`RSB-R-23`) | 400 | `Result {code} cannot be resubmitted without a lead bilateral project (one project, or one flagged is_lead).` |

- The history readout (`getReviewHistoryByResultId`) adds `initiative_id` and `initiative_code` (`LEFT JOIN clarisa_initiatives` on PK, so the grain stays 1:1, `P-20`).

## 7. Backend Module Design

| Unit | Change |
|---|---|
| `bs.resolveResultCodeTarget` | The `updated` branch stops throwing. It returns `{operation:'updated', target}` after the guards. `assertResultCodeStatusIsEditable` → **Rejected only**. New `assertSameResultType` |
| `bs.create()` | When `operation === 'updated'`, it delegates to the new `resubmitRejectedResult(...)` for that result, skipping the normal write sequence. The no-code and `versioned` paths do not change |
| New `api/bilateral/services/bilateral-resubmission.service.ts` | Orchestrates lock → preflight → reset → writers → primary/contributors → final write. It reuses `bs`'s writers, which are made accessible (package-level or extracted) without changing their behaviour on the create path |
| Handlers (`policy-change`, `capacity-change`, `innovation-development`, `innovation-use`) | Extract `resolveAndValidate(ctx)` (pure, no row) from `afterCreate`. `afterCreate` consumes it. The resubmission calls it in preflight. **No-code create: same order and messages** (`DD-1`) |
| `bs.ensureUniqueTitle` | Optional `excludeResultId` (`P-15`) |
| `bs.persistLeadCenter` | Reactivates an existing row and demotes the previous lead, only when there are prior rows (no-op for a new result) |
| Section reset (`resetSectionsForResubmission`) | Deactivates the add-only sections (`P-4`): evidence, `results_by_projects` + `non_pooled_project_budget`, contributing centres (non-lead), ToC (`results_toc_result`, indicators, targets), contributor share requests, subnationals, innovation-use actors/orgs/measures, PARTNER institutions when the payload is empty. Old owner's role 1: only if the primary changes (`DD-5`). Reference list: `DeleteRecoverDataService.deleteResult` (`P-21`) |
| `rs` review decision | Writes `initiative_id` = owner that decides (`getOwnerInitiativeByResult`, already read at `rs:~4318`) |
| `ppr` ownerless decline (`ppr:~986`) | Writes `initiative_id` = SP that declines. With the entity fixed, `REJECT` becomes `'REJECT'` |
| `result-review-history.repository` | `initiative_id`, `initiative_code` in the SELECT |
| Contract doc | Section "Resubmitting a rejected result" + change-log row |

## 8. Frontend / UX

None in this spec. The new `initiative_code` field in the history is additive. Showing it in the centre's modal belongs to the companion story.

## 9. Design Decisions

- **`RSB-DD-1` — preflight only on the resubmission branch.** `UBC-T-3` attempt 1 hoisted for every create and broke `UBC-R-1` (it changed error precedence). Here the hoist is gated by `operation === 'updated'`. The no-code create keeps its order, messages and pre-existing orphans. *Trade-off:* the handlers' extracted `resolveAndValidate` runs twice in the resubmission (preflight + `afterCreate`). Cost: CLARISA lookups ×2, negligible. Explicit list of what gets hoisted: `P-3` + primary present + `isAligned` + title + contributing projects. **Accepted risk:** DB faults (not validations) in the middle of the writers, for example the `handleTocMapping` rethrows. Mitigated by `DD-3`.
- **`RSB-DD-2` — no real transaction over the writers.** Enrolling every repository in a manager means refactoring ~15 writers and their specs, and the create path, which is out of scope (`P-1`). *Rejected:* "shadow create + swap of child rows" (moving FKs across ~15 tables) and "deactivate + new create" (violates `RSB-R-3`).
- **`RSB-DD-3` — the status flips last.** Steps 4-6 leave the result in **Rejected**. Only step 7 — one real `manager.transaction` that does `UPDATE result SET status_id=5 WHERE id=? AND status_id=7` (0 rows affected → 409) plus `INSERT` `RESUBMIT` — moves it to Pending Review. If 4-6 fail through a DB fault, the result stays Rejected and **retryable**: the platform resends, the reset cleans up, and the writers rewrite. It never stays in Pending Review half-written or without a primary request. *Consequence:* `RSB-R-8` holds for every **validation**. For DB faults, the guarantee is "it stays retryable". This is recorded in `requirements.md` §9.
- **`RSB-DD-4` — lock per result.** `GET_LOCK('rsb:<resultId>', 0)` on a dedicated `QueryRunner` for the whole branch, released in `finally`. If it is not obtained → 409. After obtaining it, status is re-read. The CAS in `DD-3` is the second barrier. *Rejected:* a `pessimistic_write` lock, because the writers don't run in that transaction (`P-1`).
- **`RSB-DD-5` — a changed primary goes through PSR, ownerless.** If `toc_mapping.science_program_id` ≠ the current owner, or there is no owner:
  - the old owner's role 1 is deactivated, along with the ToC mapping belonging to it;
  - the writers do **not** write role 1 (`P-6` suppressed on this branch);
  - after the writers (the lead row already exists, `P-7`), `ppr.request(resultId, newSp, user, manager, {asDraft:false})` → PENDING.
  - `outcome.ok === false` → the status is **not** flipped. The result stays Rejected and gets 503/500, so it is retryable (`DD-3`).
  - The `PNS-R-2` rules take over: hidden from queues, decisions refused until accept. Decline → `PDR-R-4` (Rejected again).
  - **Same owner:** role 1 is kept (upsert), and after the flip `announcePendingReview` runs (`P-14`).
  - **Amended 2026-10-06 (T-5 review, decided by Juan David Delgado):** on the changed/ownerless branch, the writers find-or-create an **inactive** role-1 row for the requested SP so the payload's lead-program investment has somewhere to live. The **budget rows themselves are saved active**. An inactive role-1 row is not ownership (queues, review decisions and `PNS-R-2` all read active role 1). `ppr.accept` looks up the SP's row without an `is_active` filter and reactivates it (`ppr:~718-731`), so the investment surfaces on accept. An existing active role-2 row of that SP is never converted; a separate inactive role-1 row is written. On decline, the inactive row and its budget must not surface anywhere (lists, queues, readouts, payloads).
  - **Atomicity (NFR §7):** `ppr.request(…, manager, {asDraft:false})` runs inside the final transaction, before the CAS; `ok:false` throws, so the request rolls back with the flip.
- **`RSB-DD-6` — contributors as drafts.** The payload's `contributing_programs[]` are written as CONTRIBUTION status 4. On the ownerless branch, `owner_initiative_id` = the requested primary, because the `bs:1564` guard expects role 1 and is skipped. They are released by the existing flow: accept (`ppr:802`) or SP approval (`rs:~4836`), exactly like an API-ingest create (`P-9`). The previous ones were already inactive (`P-10`), and the reset makes sure of it.
- **`RSB-DD-7` — allocation from the payload's lead project.** `isAligned(payloadLeadProjectId, newSp)` in preflight (`P-7`, `P-8`). ~~If the payload has no lead project, fall back to the stored `is_lead`.~~ **Amended 2026-10-06 (T-3 Pivot Record, user):** no fallback. The T-4 reset deactivates the stored projects and `ppr.request()` re-reads the lead after the writers, so a fallback check would validate a project that no longer exists. The payload lead is computed with the writer's own rule (`determineIsLead`: single project, or the one flagged); if there is none, refuse 400 before any write (`RSB-R-23`).
- **`RSB-DD-8` — immutable type.** A payload whose `result_type_id` ≠ the target's → 409 (`RSB-R-22`; carried over from `UBC-DD-4`).
- **`RSB-DD-9` — the entity's enum matches the DB.** See §5. It fixes the `PDR` decline as a side effect.
- **`RSB-DD-10` — `keep_editing` is ignored** on the resubmission branch (`RSB-R-5`). The response states the status that was reached.

### Reversion challenge (Step 2.3)

| DD that reverts something delivered | What does it break? | Outcome |
|---|---|---|
| `DD-9`: `ReviewActionEnum.APPROVE` stops being `'APPROVED'` | grep: nobody writes `ReviewActionEnum.APPROVE`. The review decision writes `decision as any` (`'APPROVE'`). The webhook compares against `'APPROVE'` (`P-18`). The frontend already receives `'APPROVE'` from the DB. **Breaks nothing.** It fixes `PDR` | Kept |
| `UBC-R-5` narrowed (Editing/Draft/Pending Review no longer "editable") | Today those statuses get the 409 placeholder anyway (`bs:526`), so only the message text changes. Existing tests that check the message must be updated | Kept; `T-2` updates them |
| `persistLeadCenter` corrected | A new result has no prior rows → no-op. Versioning doesn't go through it | Kept, with a regression test on create |
| `DD-5` deactivates the old owner's role 1 **before** accept (different from the `PSR-R-2` swap) | Only on this branch, and with the result coming from Rejected. Risk: if the new SP declines, the result ends up Rejected **without an owner**, which is the `PDR-R-4` state that is already supported. The decline's ToC cleanup assumes an old owner exists? `PDR` handles the ownerless case explicitly. **No concrete breakage found** | Kept; `T-5` covers the decline after a resubmission |

## 10. Testing Plan

| Level | What |
|---|---|
| Jest `bilateral-resubmission.service.spec.ts` | 8 statuses; ownership; KP; type; lock; each preflight refusal → **zero** calls to writers/repositories (spies on all of them); same owner vs changed; `request` fails → no flip; 3 cycles |
| Jest handlers | `resolveAndValidate` per handler (invalid level, unknown actor type, policy type) |
| Jest create | No-code create: same order, messages and calls (snapshot of the call sequence) — `RSB-R-1` |
| Jest `rs` / `ppr` | `initiative_id` in decision and decline; decline no longer writes `'REJECTED'` |
| `migration:check` | Entity ↔ migration aligned |
| Manual (user, test environment) | Real cycle: create → reject → resubmit with changed partners/evidence/countries → compare active rows. Refusal after a valid payload → identical counts. `up`/`down` of the migration |

## 11. Security, Observability, Rollback

- **Security:** no new surface. Ownership by `external_platform_id` (`rules.assertCallerMayVersion`). Logs never include the payload or the key.
- **Observability:** one line per attempt `result_code=… operation=updated platform=… outcome=accepted|rejected(<status>)` (`RSB-R-21`). `bs`'s "Successfully created" log does not fire on this branch.
- **Rollback:** revert the PR + `migration:revert` (the `down` in §5). Rows with `RESUBMIT` are converted to `UPDATE` without loss of the event.

## 12. Budget (Step 2.4)

| Tasks | LOC | Review rounds |
|---|---|---|
| 7 (6 code + 1 manual run) | ~1,500 (≈600 production, ≈900 tests) | 1 for T-1/T-6; **2** expected for T-3/T-4/T-5 (data integrity) |

It matches **Full**. More than 400 LOC → **2 PRs**: PR 1 = history + migration + `PDR` fix (`T-1`, it delivers value on its own); PR 2 = resubmission (`T-2..T-6`).

## 13. Open Gaps & Follow-ups

| # | Gap | Owner |
|---|---|---|
| `RSB-P-13` | Does `accept()`'s ToC stub duplicate the ToC the payload already wrote? If it does, the payload's ToC on the ownerless branch is persisted only after accept, or `accept` reuses the existing ToC | `T-5` (read `ppr.accept` + test) |
| `RSB-OQ-1` | BR8 holds (default) | User |
| Innovation-use tables | The exact tables for actors/orgs/measures to reset are `UNVERIFIED` in detail | `T-4` enumerates them from `innovation-use.service.ts:399-486` |
| `api/bilateral/CLAUDE.md` §4 | It claims a "single ACID transaction" (false, `P-1`) | Pending for `/akili-archive` on `staging` (shared-file discipline) |
| Production `sql_mode` | Confirms whether today's `PDR` decline actually fails | **Resolved 2026-10-06:** PRTest is `STRICT_TRANS_TABLES`, so the decline failed; fixed by T-1 |
| `DD-5` inactive role-1 row vs notifications | `DD-5` (amended) says the inactive row "must not surface anywhere". The amount never does, but these notification readers read `results_by_inititiative` without an `is_active` filter and could show the requested SP's code as owner: `notification.service.ts:460`, `:743`, `:910`, `:1412`; `result-tagged-notification.service.ts:322`, `:430`. The same exposure already exists today with retired former-owner rows. These files are out of this spec (owned by `notifications/bell-read-state` at the time) | Follow-up spec or the notifications owner (T-5 review, 2026-10-06) |
