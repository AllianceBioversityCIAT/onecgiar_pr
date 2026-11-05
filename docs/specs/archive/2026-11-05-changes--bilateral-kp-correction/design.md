# Design — A reporting platform corrects a Rejected or Editing Knowledge Product

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-kp-correction` |
| Depth | Full |
| Status | **approved**, user 2026-11-05 (Phase 2 gate, no judgment-day) |
| Date | 2026-11-05 |
| Requirements | `requirements.md` (`KPC-R-1..15`), approved by the user at the Phase 1 gate on 2026-11-05 |
| Verified at | `a731286af` (branch `JuanGuzman-io/nereid`) |
| Amendment made during design | `KPC-R-8` gains the 422 cycle-year case (P-6). Swept across `requirements.md` and `proposal.md` |
| Skills | `nestjs-expert`, `api-design-principles`, `error-handling-patterns` (Skill Map) |

## 1. Summary

A KP correction runs through the **existing** `BilateralResubmissionService` pipeline (lock → re-read → preflight → reset → writers → CAS + history → announce), switched into a **KP mode** by the stored result type. KP mode changes five things and nothing else:

| Stage | Non-KP (unchanged) | KP mode |
|---|---|---|
| Resolver guard | Rejected only; KP → 409 | Rejected or Editing; KP guard skipped in the `updated` branch only |
| Lock re-read | Rejected only | Rejected or Editing |
| Preflight | `geo_focus`, duplicate title, … | No `geo_focus`, no title check; **handle compare** and **DSpace fetch** (read-only) |
| Reset + writers | Every section from the payload | Payload-owned sections only. Evidence, geography and DSpace institutions are never touched; the header keeps title and description; then the **DSpace apply** |
| CAS | 7 → 5 | 7 → 5, or 1 → 5, or 1 → 1 (`keep_editing`) |

The DSpace work reuses `ResultsKnowledgeProductsService`. `syncAgain` is split into a fetch half and an apply half, and keeps its behaviour for its two current callers.

## 1A. Premise Ledger

Verified 15 · UNVERIFIED 3 (High 0, Low 3).
Blast-radius triggers: `live-path` (the platform's `create` call, branch point `resolveResultCodeTarget`), `shared-state` (`results_by_institution` role PARTNER and the resubmission reset), `consumer` (the guard's 409 message, the contract doc, `syncAgain`, `updateInstitutions`).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | A `create` carrying an open-phase `result_code` reaches the resubmission pipeline: `create` → `resolveResultCodeTarget` (`bilateral.service.ts:359`) → `findInPhase` hit → `updated` branch (`:4602-4624`) → `_bilateralResubmissionService.resubmit` (`:368`) → `assertStillRejected` (`bilateral-resubmission.service.ts:332`) → `runResubmissionPipeline` (`:374`) → `commitResubmission` (`:478`) | live-path | Read of the cited lines | `a731286af` | DD-1 picks another seam — High | — |
| P-2 | The `updated` branch refuses KPs at `bilateral.service.ts:4611`; the `versioned` branch refuses them separately, inside `resolveVersionableResult` (`bilateral-versioning-rules.service.ts:106`) | location | Read of the cited lines | `a731286af` | Lifting `:4611` would also open carry-forward → DD-1 changes — High | — |
| P-3 | Status 1 and 8 exist: `ResultStatusData.Editing` = 1, `Draft` = 8 | data-env | `src/shared/constants/result-status.enum.ts:15` (Draft) | `a731286af` | `KPC-R-1` refusal list changes — Low | — |
| P-4 | A KP can be in Editing: the KP handler sets `status_id: resolveInitialStatusId(dto)`, which is 1 when `keep_editing: true` | existence | `handlers/knowledge-product.handler.ts:68`; `constants/initial-status.constants.ts:21-26` | `a731286af` | The Editing half of the spec has no case — scope — Low | — |
| P-5 | `syncAgain` fetches first and writes after; it **catches its own errors and returns them** instead of throwing, and refuses Journal Articles for non-admins | existence | `results-knowledge-products.service.ts:129-382`; admin gate `:147-160`; `catch` returning `returnErrorRes` at `:378-380` | `a731286af` | DD-3 (split fetch/apply) is unnecessary — Low | — |
| P-6 | `findOnCGSpace(handle, user, year, validateExisting=false)` writes nothing. It applies the reporting-cycle year rule to non-admin users and answers **422**; an MQAP failure becomes `null` and then **400** "Please add a valid handle" | data-env | `results-knowledge-products.service.ts:622-747` (422 at `:696-720`, null → 400 at `:652-658`); `m-qap/m-qap.service.ts` `getDataFromCGSpaceHandle` `.catch(() => null)` | `a731286af` | DD-4 error mapping changes; `KPC-R-8` was amended on this premise — High | — |
| P-7 | Payload partners and DSpace (MQAP) institutions share `results_by_institution` with role **PARTNER (2)**: bilateral writes payload partners with PARTNER (`bilateral.service.ts:6178-6184`); the KP mapper writes MQAP institutions with PARTNER (`results-knowledge-products.mapper.ts:664`), linked through `result_kp_mqap_institution.result_by_institution_object` | shared-state | Read of the cited lines | `a731286af` | DD-5 is unnecessary — High | — |
| P-8 | Siblings of that shared state: (a) `updateInstitutions` deactivates **every** active row of the given roles not in the incoming list (`result_by_intitutions.repository.ts:403-435`); (b) the resubmission reset deactivates every PARTNER row when the payload sends none (`bilateral-resubmission.service.ts:874-880`); (c) `syncAgain` re-saves the MQAP-linked rows it patches (`results-knowledge-products.service.ts:300-315`, save at `:313`); (d) the `validation_*` MySQL functions count roles (2, 8) (`api/bilateral/CLAUDE.md` §7.3.1). Callers of `updateInstitutions`: `results-package-toc-result.service.ts:317`, `:369`; `results.service.ts:1085`; `bilateral.service.ts:6178`; `policy-change.handler.ts:195` | shared-state | `grep -rn "updateInstitutions(" src --include='*.ts' \| grep -v "\.spec\."` → 6 hits, 5 callers + the definition | `a731286af` | DD-5 scope — High | — |
| P-9 | The reset deactivates **all** evidence of the result (`bilateral-resubmission.service.ts:770`). The KP handle evidence is written by `populateKPFromCGSpace` (`results-knowledge-products.service.ts:1403-1420`), **not** by `syncAgain` | location | `grep -n "evidence" results-knowledge-products.service.ts` → writes at `:1176-1200` (`create`), `:1403-1420`, `:1521-1530`; none in `:129-382` | `a731286af` | DD-5 evidence exclusion is unnecessary — High | — |
| P-10 | The reset does not touch `result_country` / `result_region`; it only retires subnationals of every country (`bilateral-resubmission.service.ts:864-872`) | location | Read of the reset block `:738-930` | `a731286af` | DD-5 needs a geo exclusion — Low | — |
| P-11 | The stored KP handle and the payload handle compare equal through `extractHandleIdentifier` whatever form each was stored or sent in | data-env | UNVERIFIED — confirm at source before relying on it | — | DD-4 compares raw strings instead — Low | `KPC-T-4`, first step: read what `updateEntity` stores in `results_knowledge_product.handle` |
| P-12 | When the CAS writes the same status (Editing → Editing), TypeORM's `UpdateResult.affected` is 1 on MySQL (mysql2 sends `CLIENT_FOUND_ROWS`) | data-env | UNVERIFIED — confirm at source before relying on it | — | DD-6 must detect a lost CAS another way for the 1 → 1 case — Low | `KPC-T-5`, first step: run the 1 → 1 update against the local MySQL |
| P-13 | The platform users that bilateral creates through `findOrCreateUser` are not PRMS admins, so the non-admin gates in P-5 and P-6 apply to them | data-env | UNVERIFIED — confirm at source before relying on it | — | Only the tests that assume the 422 change; design stands — Low | `KPC-T-4` |
| P-14 | Consumers of the KP 409 in the `updated` branch: `bilateral.service.spec.ts:3172` ("a Knowledge Product target -> 409 (RSB-R-7)"), and `:2942` ("rejects a Knowledge Product code (409)", path to confirm); `versioning.service.spec.ts:301` is the in-app phase shift, not this guard | consumer | `grep -rnE "assertNotKnowledgeProduct\|is a Knowledge Product\|Only rejected results can be resubmitted\|assertStillRejected" src test --include='*.spec.ts'` → 5 hits in `bilateral.service.spec.ts`, 1 in `versioning.service.spec.ts` | `a731286af` | Tasks miss a red spec — Low | — |
| P-15 | Consumers of the documented rule: contract `docs/bilateral-result-summaries.en.md:448`, `:463`, `:465`, `:501-522`. The Fetcher docs (other repo) say "KPs always 409" (per P2-4065) | consumer | `grep -n "Knowledge Product\|409" docs/bilateral-result-summaries.en.md`; Fetcher docs not read | `a731286af` | `KPC-T-6` scope — Low | — |
| P-16 | Consumers of `syncAgain`: `results-knowledge-products.controller.ts:124`, `admin-panel.service.ts:562`; specs `results-knowledge-products.controller.spec.ts`, `admin-panel.phase-reporting.service.spec.ts` | consumer | `grep -rn "syncAgain(" src --include='*.ts' \| grep -v "\.spec\."` → 3 hits (2 callers + definition); `grep -rln "syncAgain" src --include='*.spec.ts'` → 2 files | `a731286af` | DD-3 must keep more callers green — Low | — |
| P-17 | The writers after the reset are not one transaction; only the reset and the final commit are (`RSB-P-1`; `bilateral-resubmission.service.ts:688-690`) | other | Read of the cited lines | `a731286af` | NFR "retryable after first write" needs a different mechanism — High | — |
| P-18 | No earlier work on P2-4065 exists on any branch | existence | `git log --all --oneline -i --grep="4065"` → 0 hits | `a731286af` | The spec is unnecessary — High | — |

## 2. Architecture Overview

### 2.1 Where this lives

`onecgiar-pr-server/src/api/bilateral/` (resolver, ports, resubmission service) and `src/api/results/results-knowledge-products/` (DSpace fetch/apply) plus one additive parameter in `src/api/results/results_by_institutions/result_by_intitutions.repository.ts`. No new module, no new endpoint, no migration.

### 2.2 Sequence (KP mode)

| # | Step | Writes? | Refusal |
|---|---|---|---|
| 1 | Resolver: bilateral → ownership → **KP-aware status guard** → same type | No | 403 / 409 |
| 2 | `GET_LOCK("rsb:<id>")`, re-read status: 7, or 1 for a KP | No | 409 (busy or status moved), 503 (lock fault) |
| 3 | Preflight: type payload, ToC initiatives, projects (lead), primary + allocation, lead centre, contributors, **handle compare**, **DSpace fetch**, users | Users only, as today | 400 / 409 / 422 / 502 |
| 4 | Read stored owner and the MQAP-linked institution row ids | No | — |
| 5 | Reset, KP variant (one transaction) | Yes | — |
| 6 | Writers, KP variant: header (payload columns only), lead centre, ToC, partners (keeping MQAP rows), projects, centres; then **DSpace apply** | Yes | 5xx leaves status unchanged → retryable |
| 7 | Commit (one transaction): CAS {7 or 1} → target status, transfer primary if changed, stamp card if target is 5, `RESUBMIT` history row | Yes | 409 lost CAS → rollback |
| 8 | Post-commit: log line; announce only when target is 5 | Notifications | never fails the call |

## 3. Data Model Changes

None. No entity, column or migration. `ReviewActionEnum.RESUBMIT` already exists (`result-review-history.entity.ts:17`).

## 4. API Surface

### 4.1 Endpoints

No new endpoint. `POST /api/bilateral/create` accepts what it refused before: a `result_code` of an open-phase KP in Rejected or Editing.

| Case | Status | Message (names the code) |
|---|---|---|
| KP status not 7 or 1 | 409 | `Result {code} cannot be corrected: its status is {status}. Only rejected or editing knowledge products can be corrected.` |
| Different handle | 409 | `Result {code} is linked to handle {stored}; the payload sends {sent}. The handle of a knowledge product cannot change.` |
| No handle | 400 | existing create message |
| DSpace answer 422 (cycle-year rule) | 422 | DSpace rule message, unchanged |
| Any other DSpace failure | 502 | `The DSpace record of result {code} (handle {stored}) could not be read. Nothing was changed; retry later.` |
| Success | 201 (as `create` today) | outcome row `operation: "updated"`, `status_id`, `status` |

Non-KP messages are unchanged byte for byte (`KPC-R-13`).

### 4.2 Bilateral contract impact

Additive (`AC-4`). The response shape is the `RSB` `updated` row. The contract doc gets: a KP section under "Resubmitting a rejected result", the Rejections table row at `:463` narrowed to carry-forward, the 422/502 rows, and a change-log row (`KPC-T-6`).

## 5. Server Workflow / Business Rules

### 5.1 Payload-owned vs DSpace-owned (KPC-R-4, KPC-R-5)

| Section | KP correction writes it from | Reset touches it? |
|---|---|---|
| Header: lead contact, `result_level_id`, submitter columns, external identity | Payload | — (update in place) |
| Header: title, description | DSpace apply | No |
| Lead centre, contributing centres | Payload | Yes (non-lead centres, as today) |
| ToC mapping, contributing SPs, share requests | Payload | Yes, as today |
| Bilateral projects + budget | Payload | Yes, as today |
| Partners (PARTNER rows **not** linked to an MQAP institution) | Payload | Yes, MQAP-linked rows excluded |
| MQAP institutions (PARTNER rows linked through `result_kp_mqap_institution`) | DSpace apply | No |
| Evidence (handle link) | Unchanged; the handle cannot change | No |
| Countries, regions, geographic scope | DSpace apply | No (subnationals: no KP writer) |
| KP row, authors, keywords, metadata, altmetrics, FAIR | DSpace apply | No |
| Innovation Use tables | n/a (type-gated) | No |

### 5.2 Resulting status (KPC-R-7)

`target = (stored == Rejected) ? PendingReview : (keep_editing === true ? Editing : PendingReview)`. Announce and card stamp only when `target == PendingReview`.

## 6. Frontend Plan

None.

## 7. Security & Authorization

Unchanged: ownership by `assertCallerMayVersion` (403), no auth surface touched. The DSpace fetch runs with the resolved platform user, as KP create does; no admin elevation (DD-3).

## 8. Performance & Capacity

One MQAP round-trip per KP correction, the same as KP create. It runs under the per-result lock, inside the preflight; the lock is per result, so other results are not blocked.

## 9. Observability

The `RSB-R-21` line covers it: `result_code`, `operation=updated`, platform, outcome. The DSpace failure log names the code and the handle, never the payload (`KPC-R-15`).

## 10. Testing Plan

| Level | Where | What |
|---|---|---|
| Unit | `bilateral.service.spec.ts` | Resolver: KP 7/1 accepted, 2/3/4/5/6/8 → 409, 403, wrong type 409, non-KP Editing still 409, `versioned` KP still 409 |
| Unit | `bilateral-resubmission.service.spec.ts` | Re-read, preflight KP variant (handle, 422, 502, no geo, no title), reset exclusions, writers, CAS matrix, history, announce rules, no partial write (closed-world helper) |
| Unit | `results-knowledge-products.service.spec.ts` | Split fetch/apply; `syncAgain` unchanged for its callers |
| Unit | `result_by_intitutions.repository.spec.ts` | Additive keep-list; default call unchanged |
| Type | `npx tsc --noEmit` | Port and writer signatures |
| Live | PRTest | One Rejected and one Editing KP; check DB rows (HITL) |

## 11. Backwards Compatibility & Rollout

Additive on the contract. The deploy is automatic on merge; no flag. Roll-back: revert the commit, and KPs return to 409 everywhere. No data migration either way.

## 12. Design Decisions

### `KPC-DD-1` — KP mode inside the existing pipeline

**Decision:** keep the single `resubmit` pipeline and pass a KP mode, derived from `target.result_type_id`, through the resolver guard, the lock re-read, the preflight, the reset, the writers and the CAS. **Why:** BR5 relies on the lock, the preflight-before-write order and the CAS; `RSB` proved them with two review rounds and a live run. **Rejected:** a separate `BilateralKpCorrectionService` would duplicate them (proposal Option B).

**Reversion challenge (Step 2.3):** this lifts a guard the code ships (`RSB-R-7`). *What does removing it break?* (a) Carry-forward of KPs: no, the `versioned` guard is a separate call (P-2), and `KPC-R-12` pins it with a test. (b) The writers assumed "never a KP" (`bilateral.service.ts:4840-4841`): a KP reaching them unchanged would write `geo_focus` (crash on undefined) and evidence, and overwrite the DSpace title. DD-5 addresses all three. (c) The spec at `bilateral.service.spec.ts:3172` goes red by design; `KPC-T-3` flips it. No unaddressed breakage.

### `KPC-DD-2` — Status rule by type, not by a new flag

**Decision:** the allowed source statuses are a function of the stored type: `{7}` for non-KP, `{7, 1}` for KP. The resolver guard and the lock re-read call the same function, so they cannot disagree. Non-KP messages stay byte-identical; KPs get their own message. **Why:** `KPC-R-1`, `KPC-R-13`.

### `KPC-DD-3` — Split `syncAgain` into fetch and apply

**Decision:** in `ResultsKnowledgeProductsService`, extract (a) a fetch that loads the KP, calls `findOnCGSpace(storedHandle, user, cgspace_year, false)` and **throws** a typed HTTP exception on a non-OK answer, and (b) an apply that takes the loaded KP and the fetched metadata and runs the current write sequence of `syncAgain` (KP row, authors, institutions, keywords, metadata, regions, countries, geo, FAIR, `result.title`/`description`). `syncAgain` becomes fetch + apply, keeping its admin Journal Article gate and its catch-and-return for its two callers (P-16). The correction calls fetch in the preflight and apply in the writers, **without** the admin gate. **Why:** BR5 needs every refusal before the first write (P-5 shows `syncAgain` cannot provide that); `KPC-R-5` Journal Article scenario. **Rejected:** calling `syncAgain` as is (proposal Option C), and `populateBilateralKPFromMetadata`, which inserts a new KP row.

**Reversion challenge:** the correction skips the admin gate of `syncAgain`. *What does removing it break?* The gate stops a non-admin from re-syncing a Journal Article from the in-app button. The correction never re-syncs a different KP: the handle is fixed (DD-4), and `findOnCGSpace` still applies the cycle-year rule to non-admins (P-6), which is the rule KP creation passed. The in-app button keeps its gate. The KP module owner confirms this at the HITL pause of `KPC-T-1`.

### `KPC-DD-4` — Handle compare and DSpace fetch in the preflight

**Decision:** the KP preflight compares `extractHandleIdentifier(payload handle)` with `extractHandleIdentifier(stored handle)` (409 on mismatch, 400 when absent), then runs the DSpace fetch of DD-3. Mapping: a 422 from `findOnCGSpace` passes through as 422; every other non-OK answer or thrown error becomes 502 (P-6: an MQAP outage arrives as a 400 "valid handle", which on a stored, already-validated handle means "could not read"). The fetched metadata rides in the preflight result to the writers. The KP preflight skips `validateGeoFocus` and `ensureUniqueTitle`. **Why:** `KPC-R-6`, `KPC-R-8`, `KPC-R-9`.

### `KPC-DD-5` — KP reset and writers keep DSpace-owned rows

**Decision:**
- Reset: skip evidence (P-9); in the PARTNER block, exclude the rows linked to an active `result_kp_mqap_institution` (P-7, P-8b).
- Partners writer: pass those same row ids to `updateInstitutions` as a new **optional** keep-list. With the keep-list empty or absent, the SQL is exactly today's (P-8a, five other callers).
- Header: the KP variant writes the payload columns of `updateResubmissionHeader` except `title` and `description`.
- No geo writers and no evidence writer for KPs.
- Writer order: the payload writers first, then the DSpace apply, so the apply has the last word on the rows it owns.

**Why:** `KPC-R-4` "keep the institutions DSpace contributed", `KPC-R-5`. **Rejected:** moving MQAP institutions to role 8 (a data migration outside the scope, and it changes what the `validation_*` functions count, P-8d).

### `KPC-DD-6` — CAS over the allowed source statuses

**Decision:** `UPDATE result SET status_id = target … WHERE id = ? AND status_id = <status read under the lock>`. The condition uses the status read under the lock, so a status that moved after the re-read loses the CAS (409, rollback). History `RESUBMIT` is written for both 7 and 1 sources (`KPC-OQ-4`). Primary transfer as today. Card stamp and announce only when `target` is Pending Review. **Why:** `KPC-R-7`, `KPC-R-10`, `KPC-R-11`. P-12 is settled before relying on `affected` for 1 → 1.

## 13. Open Gaps & Follow-ups

| Item | Owner |
|---|---|
| Fetcher: forward `result_code` on `knowledge_product`, docs AC 9–10 | Fetcher repo, outside this spec |
| `api/bilateral/CLAUDE.md` §4 says KP handler "ignores title/description" only on create; add the correction rule | Pending item for `staging` (shared-file discipline) |
| Payload partner equal to an MQAP institution creates two PARTNER rows for one institution: behaviour that exists today on KP create | Not changed here; noted |

## 14. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 7 (6 code/doc + 1 live run) |
| LOC | ~350 production, ~650 test, ~60 doc |
| Review rounds | 9 (one per task, two for `KPC-T-5`, one margin) |

Matches Full depth. `/akili-execute` stops and escalates when actuals exceed it.

## Required cross-references

- `requirements.md` `KPC-R-1..15`.
- `docs/trd/trd.md`: bilateral module; review workflow.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
- Archived `RSB` design: `docs/specs/archive/2026-10-06-bilateral--resubmit-rejected-result/`.
