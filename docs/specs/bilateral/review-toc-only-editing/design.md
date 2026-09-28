# Design — Bilateral review: Science Program may edit only ToC

## Document Control

| Field | Value |
|---|---|
| Spec | `BIL-RTE` · `docs/specs/bilateral/review-toc-only-editing/` |
| Requirements | `requirements.md` (same folder) |
| Depth | Full |
| Status | **approved** — owner, 2026-09-22 |
| Date | 2026-09-22 |
| Baseline | `docs/trd/trd.md` §8 (backend enforces), W7 (soft delete) · `docs/prd.md` AC-3, AC-7 · `docs/ux-ui/design.md` §6, §10 |
| Delegation | Two scout passes (risks R-1…R-4; reversion challenge for DD-2/DD-4). Code reading only; nothing was run in prtest. |

## 1. Summary

One small **server access helper** decides, for every bilateral write, whether the caller may write at the result's current status. It is called at the **bilateral entry point** of each endpoint, never inside services shared with W1/W2 results.

The **ToC save** becomes program-scoped. It only deactivates rows of the program being saved. For P25-onward results, a No save also deactivates that program's child rows and ignores any detail sent with it.

The **drawer** learns the result's portfolio from the detail GET. With that it hides everything below the No, stops sending detail on No, locks the geography questions, and stops guessing the program.

**Biggest accepted trade-off:** writes are not atomic, because the repositories are not enrolled in a transaction. The design compensates by running every check before the first write (§13 G-1).

## 1A. Premise Ledger

| # | Premise | Source | How verified | Status | If false |
|---|---|---|---|---|---|
| P-1 | `_validateBilateralResultForUpdate` rejects non-admins when status ≠ 5 | `results.service.ts:4312-4346` | Read: `if (currentStatusId !== PendingReview) throw ConflictException` after the admin early-return | verified | R-4 is not a regression. T-2 still replaces the call, and its red test is dropped |
| P-2 | Center autosave reaches that validator with real edits | `bilateral-auto-save.service.ts:488` → `results.service.ts:5439, 5487, 5496` | Scout: a non-empty description counts as a change, so the early return is skipped | verified (code) · **not observed live** | T-0 does not reproduce a 409. Keep the fix, downgrade the claim in the ticket |
| P-3 | `updateTocResultPartial` has only two callers, both bilateral | grep | `results.service.ts:5228`, `bilateral-center.service.ts:1314` | verified | Scoping (DD-4) leaks into W1 ToC. Move the scope behind a flag |
| P-4 | Both deactivation helpers ignore initiative | `results-toc-results.service.ts:2351-2373, 2554-2570` | Read: `find({ where: { result_id } })` with no initiative filter | verified | R-9 has nothing to fix |
| P-5 | No spec pins the all-initiatives wipe | Scout: the `:811` spec exercises `createTocMappingV2`, not these helpers | verified | Existing tests turn red under DD-4. Rewrite them, citing R-9 |
| P-6 | Every report reader joins ToC children through an active parent | Scout list (`result.repository.ts:1091/1130/1290/2757/3316`, `aow-bilateral.repository.ts:942/1076`, …) | verified (for the readers found) | A reader lists stale children. DD-5 covers it anyway, because children are deactivated too |
| P-7 | `clarisa_portfolios.start_date` holds the portfolio start year (P25 → 2025) | `clarisa-portfolios.entity.ts:18-19` | Entity read; the value in prtest was **not** queried | **assumed** | P25 detection fails. Fall back to acronym rank. §13 G-2, checked at T-0 |
| P-8 | The drawer's only non-admin writes are `toc-metadata` and `review-decision` | Scout: `result-review-drawer.component.ts:696, 1740, 1778`; the title and data-standard saves are admin-gated | verified | DD-2 would break the reviewer. Stop and re-scope |
| P-9 | Nothing server-side calls the guarded entry points with a non-admin at status 5 | Scout: ingest writes through repositories; no AI, webhook or cron caller | verified (search) | A background flow starts failing. Exempt it explicitly |
| P-10 | `validationRolePermissions` breaks when a user has more than one role in one SP (subquery without `LIMIT`) | `RoleByUser.repository.ts:195-258` | Scout read | verified (code) | We could reuse it. We don't, per DD-3 |
| P-11 | `api/bilateral/center/*` goes through `JwtMiddleware` | `app.module.ts:141-147` excludes only `api/bilateral`, `/create`, `/list`, `/results`, `/:id` | verified (config) · runtime match **uncertain** (`publicRoutes` substring) | Identity may be forgeable. Out of scope (OQ-4). The guard still blocks by status |

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Touched |
|---|---|
| Server `api/results` | `results.service.ts` (title, general-info, toc-metadata, review-decision, v1 geo entry, bilateral GET common fields), `result.repository.ts` (`getCommonFieldsBilateralResultById`), `results-toc-results.service.ts` (scoping + P25 No) |
| Server `api/bilateral` | `bilateral-center.service.ts` (planned-result, toc-mapping, contributors entry) |
| Server geography | v2 `update/geographic` controller entry |
| Server auth | `RoleByUser.repository.ts`: two new read methods |
| Client | `result-review-drawer.component.{ts,html}`, `geoscope-management.component.html` (+ `.ts` input), `bilateral-result-creator.component.ts` (submit race) |

### 2.2 Write flow (every guarded endpoint)

1. The controller receives the request with the user token (unchanged).
2. The bilateral entry method loads the result (id, source, status, version) once.
3. **Access helper → decision.** It either passes or throws a 403. This happens before any write.
4. The existing write logic runs unchanged, apart from DD-4 and DD-5 in the ToC path.

## 3. Data Model Changes

### 3.1 Entities

None. No columns are added or removed.

### 3.2 Migrations

None.

### 3.3 Data effect (R-8, R-9)

| Table | Before | After |
|---|---|---|
| `results_toc_result` | Every ToC save deactivates **all** initiatives' rows missing from the payload | Only rows of the in-scope initiatives are touched (DD-4) |
| `results_toc_result_indicators`, `result_indicators_targets`, SDG / impact-area / action-area link tables | Untouched on No; stay `is_active = 1` under an inactive parent | P25+ No: set `is_active = 0` on the children of the saved program's parents (DD-5) |

Everything stays logical (`is_active = 0`, `last_updated_by`). Nothing is physically deleted.

## 4. API Surface

### 4.1 Changed endpoints

| Endpoint | Change | Status codes |
|---|---|---|
| `PATCH api/results/bilateral/:id/title` | Center-write rule (DD-2) replaces the inverted validator | 2xx · **403** non-admin at 5 |
| `PATCH api/results/bilateral/general-info/:id` | same | 2xx at 1/8 (fixes R-4) · **403** non-admin at 5 |
| `PATCH api/bilateral/center/planned-result`, `/toc-mapping`, `/contributors` | Center-write rule added (none today) | 2xx · **403** non-admin at 5 |
| `PATCH v2/…/update/geographic/:id`, v1 `update/geographic/:id` | Center-write rule, **bilateral results only**. Non-bilateral results skip it | 2xx · **403** |
| `PATCH …/review-update/toc-metadata/:id` | ToC rule (DD-3): admin, or a role on the payload's initiative when it is linked to the result. Non-admins still need status 5 | 2xx · **403** · 409 unchanged for non-admin at ≠ 5 |
| `PATCH …/bilateral/:id/review-decision` | Decision rule: admin, or a role on any SP linked to the result. Existing rules unchanged | 2xx · **403** · 400/409 unchanged |
| `GET api/results/bilateral/:id` | `commonFields` gains **`portfolio_start_year`** (number or null). Additive | — |

The 403 body is the standard error envelope. The message names the rule ("Result is under Science Program review"). It never includes tokens, and it only echoes ids.

### 4.2 Bilateral / platform-report impact

None. No `/api/bilateral/*` read payload changes, so no `bilateral-result-summaries.en.md` change-log entry.

## 5. Server Workflow / Business Rules

### 5.1 Access helper (R-2, R-3, R-5, R-6)

A single injectable exposes three decisions. Each takes the loaded result and the user:

| Decision | Allow when | Otherwise |
|---|---|---|
| **Center write** | the user is admin, **or** status ≠ 5 | 403 |
| **ToC write** | admin; **or** status = 5 **and** the user holds any active role on the payload's initiative **and** that initiative is actively linked to the result **and** every payload item that names an `initiative_id` names that same initiative (DD-7) | 409 if status ≠ 5 (kept from today); 403 otherwise |
| **Decision** | admin, **or** the user holds any active role on any SP actively linked to the result | 403 |

- **Center write deliberately checks only status 5** (DD-2, scope). It does not turn into "only 1/8". It never checks Center ownership, because that is not asked for and would be a new rule.
- **Membership is two new read methods** on the role repository: "user has a role on initiative X" and "user has a role on any initiative linked to result R". Each is one query and never throws on multiple rows (P-10).
- **Placement: bilateral entry points only.** `ResultsTocResultsService.updatePlannedResult` and v1 `saveGeoScope` also serve W1/W2, so the check sits in the bilateral caller, or in the controller entry for geography, never in the shared method. The admin-only data-standard path calls `saveGeoScopeV2` internally, and it is unaffected because the check is not inside that method.

### 5.2 ToC save (R-8, R-9, R-11)

1. **Scope set:** the primary initiative, plus every `initiative_id` in the payload items. `null` is added when the primary is in scope, so legacy rows with a null initiative are still cleaned for the owner.
2. **The `initSubmitter` lookup filters `is_active: true`.** Without it, a stale primary could define the scope after a primary change (reversion challenge).
3. `_deactivateMissingRecords` and `_deactivateAllActiveRecords` act **only on rows in the scope set**.
4. **P25-onward No:**
   - payload items are ignored, so no level/HLO is re-inserted even if a client sends it;
   - the in-scope parents are deactivated;
   - their children are deactivated;
   - the existing special-case insert then writes one row (null level/result, `planned_result = false`) for the program;
   - `_handleIndicators` is not run for this branch.
5. **Pre-P25 No:** today's path, with scoping (3) applied.
6. **Yes:** today's path, with scoping (3) applied. A reactivated parent does not reactivate children deactivated by step 4 (R-8.b). This must be verified by test, not assumed.
7. **R-11:** opening a result performs no write. That is already true, and the test pins it.

### 5.3 "P25 onward"

- **Server:** result → version → portfolio → `start_date ≥ 2025`. `null` (a version without a portfolio) counts as **not** P25-onward, so behaviour stays as it is today.
- **Client:** the same rule, applied to `commonFields.portfolio_start_year`.
- **Never** a portfolio id, a phase id, or the phase year (X-3; phase ids differ between environments).

## 6. Frontend Plan

### 6.1 Routes

Unchanged.

### 6.2 Components

| Component | Change | Req |
|---|---|---|
| `result-review-drawer` (ts) | A computed `isP25Onward` from `portfolio_start_year`. It replaces the hard-coded `portfolio: 'P25'` in the context it builds | R-7.c |
| `result-review-drawer` (html) | When `isP25Onward` and the answer is not Yes, the `app-cp-multiple-wps` block is not rendered. Yes renders as today | R-7.a/b, R-11 |
| `result-review-drawer` (ts) | The save body on P25+ No sends `result_toc_results: []` | R-8 (defence in depth; the server ignores it anyway) |
| `result-review-drawer` (ts) | `initiative_id` comes only from the shown ToC (`tocInitiative`). The fallback to `response[0].id` of the global initiatives list is removed. If the initiative is missing, Save is blocked with an inline message | R-5.c |
| `result-review-drawer` (html + ts) | The No helper text and `getTocAlertDescription` drop the "choose the HLO" sentence for P25+ | R-10 |
| `geoscope-management` | Honors a `readOnly`/`editable` input for its two Yes/No questions. The drawer passes `!canEditDataStandards()` | R-1.a/b |
| `bilateral-result-creator` | "Save draft" and the section-navigation flush do nothing while `isSubmitting()` is true, so no Center write races the submit into a 403 (reversion-challenge mitigation) | R-2.b side effect |
| `section-toc` (Center) | **No change.** It already hides detail on No for every phase. One test pins R-7 for the Center | R-7 |

### 6.3 Design system

No new components or tokens. Read-only rendering reuses what `review-drawer-readonly-rendering` delivered.

### 6.4 Real-time

n/a.

## 7. Security & Authorization

- The server is the enforcement point (TRD §8, AC-3). The client changes are UX and defence in depth only.
- **Three decisions, one helper, a table-driven test** (§10). Admin is short-circuited first everywhere (D-1).
- Out of scope, recorded: possible unsigned-token acceptance on `api/bilateral/*` (P-11, OQ-4). The Center-write status check still holds regardless of identity, because it needs identity only to grant the admin exemption.

## 8. Performance & Capacity

- At most two indexed reads per guarded write: the result, which is often already loaded, and the membership check.
- DD-5 adds one bulk update per child table on a No save, bounded by that program's rows (single digits).

## 9. Observability

- A 403 from the helper logs result id, endpoint, rule name and user id at `warn`, with no body and no token.
- No new metrics.

## 10. Testing Plan

| Level | What | Where |
|---|---|---|
| Server unit | Access helper matrix: {admin, program user (read-only role), non-member, Center user} × {status 1, 5, 8} × {center, toc, decision} | new helper `.spec.ts` |
| Server unit | Wiring: each guarded endpoint calls the helper before any repository write; R-4.a is red on current code | `result.spec.ts`, `bilateral-center.service.spec.ts`, geography spec |
| Server unit | R-9: rows of SP Y survive SP X's Yes and No saves (red on current code); null-initiative rows cleaned for the owner; the `initSubmitter` active filter | `results-toc-results.service.spec.ts` |
| Server unit | R-8.a/b: P25+ No deactivates parents and children and ignores payload items; a later Yes doesn't revive children; pre-P25 No keeps today's path | same |
| Client unit | Drawer: `isP25Onward` from the payload; No hides the block; Yes shows it; the payload on No; the initiative fallback removed; copy | drawer `.spec.ts` |
| Client CT | R-1.a: geography locked and Approve enabled for a non-admin; R-1.b admin edits | Cypress CT, drawer |
| HITL (prtest) | T-0 pre-flight observations; after deploy, the SQL check of `is_active` on a P25 result, and a Center description autosave at status 1 | tasks T-0, T-9 |

## 11. Backwards Compatibility & Rollout

- Additive GET field. No migration.
- **Behaviour changes users can notice:**
  - non-admins get 403 where they previously wrote silently at status 5;
  - Center autosave starts succeeding at 1/8;
  - other programs' ToC rows stop disappearing.
- **Rollback:** revert the commits. No data migration needs undoing. Rows deactivated by DD-5 in the meantime stay deactivated, which is the intended D-4 behaviour. They can be restored via `is_active` if ever needed (W7).

## 12. Design Decisions

### BIL-RTE-DD-1 — One access helper, called at bilateral entry points
- **Context:** Six endpoints in two modules need the same rule. The existing validator is inverted and review-only.
- **Decision:** One injectable with three named decisions (§5.1), called at each bilateral entry point before any write.
- **Alternatives:**
  - NestJS guard on controllers: rejected, because it would load the result twice and needs route-specific payload knowledge (the initiative for ToC).
  - Patch the existing validator: rejected, because its "review-only" meaning is used by `toc-metadata` and would stay confusing.
- **Consequences:** Every new bilateral write endpoint must call the helper. This goes in `result-review-drawer/AGENTS.md`.

### BIL-RTE-DD-2 — Center writes: block status 5 for non-admins only *(reversion — challenged)*
- **Context:** R-2 needs to stop writes at status 5, and R-4 needs writes at 1/8. Today's validator does the opposite on `general-info`/`title`.
- **Decision:** The rule is "admin or status ≠ 5". It is not "only 1/8".
- **Alternatives:**
  - Mirror the client's `isEditableByCenterUser` (1/8 only): rejected, because it also blocks 6/7 and other statuses the ticket doesn't cover, and needs its own analysis.
  - Keep the validator and add a second check: rejected, because R-4 stays broken.
- **Challenge ("what does removing the old validator break?"):**
  - The drawer's non-admin writes are only `toc-metadata`/`review-decision` (P-8).
  - Ingest doesn't use these entry points (P-9).
  - One visible effect: a Center "Save draft" that races a submit now shows "Save failed" (403) instead of writing silently at status 5. **Addressed** by the creator no-op while `isSubmitting()` (§6.2).
  - Must stay out of shared W1/W2 methods. **Addressed** by entry-point placement (§5.1).

### BIL-RTE-DD-3 — New membership reads instead of `validationRolePermissions`
- **Context:** The existing helper errors when a user has more than one role in one SP (P-10), and it checks only the primary SP.
- **Decision:** Two new single-query reads (§5.1). Any active role counts, read-only roles included (D-2).
- **Alternatives:**
  - Fix the subquery in place: rejected, because it has other callers and would widen the blast radius.
  - Trust the client's `isProgramMember`: rejected (TRD §8).

### BIL-RTE-DD-4 — ToC deactivation scoped to the saved program *(reversion — challenged)*
- **Context:** X-2. Both helpers wipe every initiative's rows.
- **Decision:** Scope set = primary ∪ payload initiatives ∪ {null when primary is in scope}. The `initSubmitter` lookup filters active rows.
- **Alternatives:**
  - Scope only to the primary: rejected, because a toc-metadata save of a contributor SP would then touch the owner.
  - Leave it as is: rejected, because it violates R-9.
- **Challenge ("what does removing the all-initiatives wipe break?"):**
  - Primary change already cleans the old primary itself (`bilateral-center.service.ts:337-345`).
  - Contributor rows surviving is the goal.
  - `project_default` never reaches this path.
  - No spec pins the old behaviour (P-5).
  - Two concrete breakages were found and **addressed** in this DD: the inactive `initSubmitter`, and null-initiative rows left behind.

### BIL-RTE-DD-5 — P25+ No is enforced on the server and cascades to children
- **Context:** D-4 wants the detail gone. Today the client re-sends it and children survive, so it can come back when the parent is reactivated.
- **Decision:** The server ignores detail on a P25+ No and deactivates children of the scoped parents. The client also sends an empty list.
- **Alternatives:**
  - Client-only (send an empty list): rejected, because any other client (the Center `toc-mapping`) could still re-insert.
  - Hard delete: rejected (D-4, AC-7).

### BIL-RTE-DD-6 — "P25 onward" by portfolio start year
- **Context:** X-3. `isCP2026` is a phase-year rule, and ids differ between environments.
- **Decision:** `clarisa_portfolios.start_date ≥ 2025`, exposed to the client as `portfolio_start_year`.
- **Alternatives:**
  - Acronym list (`'P25'`): rejected, because each future portfolio would need a code change.
  - `portfolio_id ≥ 3`: rejected, because it depends on ids.
- **Consequences:** Depends on P-7 (assumed until T-0).

### BIL-RTE-DD-7 — ToC items must name the saved program
- **Context:** T-4 Reviewer advisory. The ToC rule checked only the top-level `initiative_id`, and DD-4 scopes deactivation to the payload items' initiatives too. So a contributor could list the owner's program in an item and deactivate the owner's rows.
- **Decision (owner, 2026-09-22 — the simplest check that closes it):** for a non-admin, every payload item that sets `initiative_id` must equal the top-level `initiative_id`; otherwise 403 before any write. Admins are not restricted.
- **Amendment (2026-09-22, T-3 review):** `_updatePlannedTocResult` updates by `result_toc_result_id` alone, so an item could carry another program's (or another result's) row id with no `initiative_id`. For a non-admin, every item that sets `result_toc_result_id` must also point at an active row of **this result** whose `initiative_ids` is the saved program (or null only when the saved program is the owner, per DD-4); otherwise 403. The check is one read of the payload's row ids and is skipped when no item carries an id. Likewise, an item that sets `results_id` to anything other than this result is a 403: `saveIndicatorsPrimarySubmitter` resolves its row by the client's `results_id` (in memory, no query). The DD-7 403 goes through the helper's deny path, so it logs like every other 403 (§9).
- **Alternatives:** check membership per item (rejected: more queries, same outcome for the reviewer flow); ignore the gap (rejected: breaks R-9).
- **Consequences:** Legitimate reviewer saves are unaffected, since they only edit their own program. An in-memory loop, plus one read only when items carry row ids. The admin read is not repeated.

## 13. Open Gaps & Follow-ups

| # | Gap | Handling |
|---|---|---|
| G-1 | ToC save is not atomic (repositories not enrolled in the transaction; see memory on the bilateral fake transaction) | Checks run before writes. True atomicity is a follow-up |
| G-2 | P-7 assumed | T-0 queries `clarisa_portfolios` in prtest. If `start_date` is null for P25, switch DD-6 to acronym rank before T-5 |
| G-3 | Unsigned-token question on `api/bilateral/*` (OQ-4) | Comment in P2-3794 + DM to the module owner. Not fixed here |
| G-4 | Statuses other than 5 (e.g. writes at 6 Approved) are not guarded | Follow-up item |
| G-5 | ToC rows other programs already lost before this change | Not repaired (OQ-3). Mention in the ticket |
| G-6 | `review-decision` doesn't check ToC completeness on the server | Unchanged (out of scope) |

## 14. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | **10** (T-0 pre-flight HITL + 8 code tasks + T-9 docs/HITL) |
| LOC | **≈ 650** total: ≈ 250 server code, ≈ 250 server tests, ≈ 150 client code + tests |
| Review rounds | **2** per auth task (T-1…T-3), **1** elsewhere |

Depth check: the numbers match **Full** (auth + data, two modules). No change of depth.
