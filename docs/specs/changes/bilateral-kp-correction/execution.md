# Execution Log — `changes/bilateral-kp-correction`

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-kp-correction` |
| Jira | P2-4065 |
| Branch | `JuanGuzman-io/fix-p2-4065-kp` (contains `origin/performance-refactor` @ `a731286af`) |
| Started | 2026-11-05 |
| Approval mode | gated |
| Leader | Claude Opus 5.5 (T1) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (opus, T3) |

### Pre-flight (tasks.md §2)

- No in-flight spec touches `bilateral-resubmission.service.ts` or `results-knowledge-products.service.ts`: only archived specs reference them (`docs/specs/archive/…`); last commits on both files are merged work (`64c5f5f06`, `06ca42ee4`).
- Server `.env` copied from the main checkout (not printed); `npm ci` run in `onecgiar-pr-server/` (worktree had no `node_modules`).
- `akili doctor --agents`: no persona drift blocking.
- Kaizen log: no Active Lessons table.

## Task Execution History

### `KPC-T-2` — Additive keep-list on `updateInstitutions`, and the MQAP-linked row read

- **Final status:** PASS · 2026-11-05
- **Attempts:** 1 (parallel with `KPC-T-1`, disjoint files)
- **Skills:** `nestjs-expert`, `tdd` (task defaults) · effort medium
- **Attempt 1**
  - Files changed: `onecgiar-pr-server/src/api/results/results_by_institutions/result_by_intitutions.repository.ts`, `…/result_by_intitutions.repository.spec.ts`
  - Signatures: `updateInstitutions(resultId, institutionsArray, userId, notApplicablePartner = false, institutionRole = [PARTNER], keepRbiIds: number[] = [])` — keep-list appends `and id not in (?)` with a 4th bound param; absent/empty → SQL and params untouched. New `getMqapLinkedPartnerRowIds(resultId): Promise<number[]>` — active PARTNER `results_by_institution` rows joined to an active `results_kp_mqap_institutions` row on `rbi.result_kp_mqap_institution_id`, params `[resultId, 2]`.
  - Red run (signature-only stubs, observed): `Tests: 3 failed, 14 passed, 17 total` — `✕ keep-list [7001]: the deactivate statement excludes 7001 through a bound param` (`Expected pattern: /and id not in \(\?\)/`); `✕ keep-list applies when the incoming list is empty` (same); `✕ returns the ids of active PARTNER rows linked to an active MQAP institution` (`expect(ids).toEqual([7001, 7002])`, received `[]`).
  - Falsifiers on post-change code (mutate → red → revert):
    1. keep-list ignored → `Tests: 2 failed, 15 passed` — `Expected pattern: /and id not in \(\?\)/`
    2. default SQL byte altered (`institution_roles_id  in (?)`) → `✕ default call: SQL and params are unchanged (no keep-list)`, `- Expected - 1 / + Received + 1`
    3. `resultId` interpolated in the read → `✕ returns the ids of active PARTNER rows…`, `Expected substring: "rbi.result_id = ?"`
  - Baseline: pre-change default SQL/params captured from the unmodified code and asserted as a literal.
  - Implementer verification: repository 17/17; consumers `--testPathPattern="result_by_intitutions|results-package-toc-result|results.service|policy-change.handler|bilateral.service"` → `Test Suites: 26 passed` / `Tests: 1128 passed`; `npx tsc --noEmit` exit 0; eslint exit 0.
  - Evidence re-run (Leader-inline, non-author): **VERIFIED** — `Test Suites: 26 passed, 26 total` / `Tests: 1128 passed, 1128 total`; tsc exit 0; eslint exit 0.
  - Reviewer: **PASS** — default call byte-identical, keep-list bound, read binds params and joins the live FK; five callers unaffected (6th positional arg, default `[]`).
  - runtime events: none
- **spawns:** implementer not reported by host (worker: 22 tool calls, ~104k tokens), ended complete; reviewer not reported by host (8 tool calls, ~82k tokens), ended complete
- **ADVISORY (4R, recorded only):**
  - RELIABILITY: a payload partner with the same `institutions_id` as a kept MQAP row → `upDateActiveRBI` reactivates every row of that institution/role (pre-existing; two active PARTNER rows possible — design §13 already notes it).
  - READABILITY: `expect(sql).not.toContain('10')` is a weak no-interpolation check; a distinctive id would be clearer.
  - RISK: `removeRelationRKPMI` still runs for KPs; a comment marking its column as stale would help readers.
- **Requirements covered:** `KPC-R-4` "partners replaced" — "AND IT MUST keep the institutions DSpace contributed" (repository half; wiring in `KPC-T-4`).
- **Decisions made / issues:**
  - Implementer flagged `removeRelationRKPMI` (runs inside `updateInstitutions` for KP results). Leader settled it: it nulls `results_kp_mqap_institutions.results_by_institutions_id`, a column left behind by migration `1718632548072` (which moved the link to `results_by_institution.result_kp_mqap_institution_id` and only dropped its index); no entity maps it. The live link is untouched, so the keep-list is sufficient. No spec change.
  - Implementer noted P-7 names the link as `result_kp_mqap_institution.result_by_institution_object`; that is the ORM inverse relation property of the same FK — not an error, no amendment.
- **Final verification:** green (re-run VERIFIED).
- **Running totals (Budget tripwire):** tasks closed 1/7 · LOC ≈ 130 (prod ~43, test ~87) of ~1060 · review rounds 2/9 (T-1 + T-2). Within budget.

### `KPC-T-1` — Split `syncAgain` into a throwing fetch and an apply

- **Final status:** PASS (was `[~]` pending HITL) (DoD: KP module owner confirms the correction may skip the in-app admin Journal Article gate, DD-3). Code uncommitted until the HITL answer.
- **Attempts:** 1
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd` (task defaults) · effort medium
- **Attempt 1**
  - Files changed: `onecgiar-pr-server/src/api/results/results-knowledge-products/results-knowledge-products.service.ts`, `…/results-knowledge-products.service.spec.ts` (block "DSpace fetch/apply split (KPC-T-1)", 6 tests)
  - Signatures: `fetchDspaceMetadata(resultId, user, preloaded?)` → `{ resultKnowledgeProduct, newMetadata }`, no admin gate, throws `DspaceReadException` (extends `HttpException`): 422 passthrough; otherwise 502 `The DSpace record of result {code} (handle {stored}) could not be read. Nothing was changed; retry later.` (code from `result_object.result_code`, fallback `resultId`); 404 when no KP and none preloaded. `applyDspaceMetadata(resultKnowledgeProduct, newMetadata, user)` → old `:184-375` write sequence, order unchanged. `syncAgain` keeps load, not-found return, admin gate and catch; the catch unwraps `DspaceReadException.cgspaceResponse` so callers get the original status/message.
  - Red run (observed): `npx jest --testPathPattern="results-knowledge-products.service" --silent --reporters=summary` → `Tests: 4 failed, 26 passed, 30 total`, each `TypeError: service.fetchDspaceMetadata is not a function`.
  - Falsifiers on post-change code (mutate → red → revert):
    1. fetch returns instead of throwing → `Expected: 502 / Received: undefined` (502 naming handle `10568/175322`, real null-MQAP stub) and `Expected: 422 / Received: undefined`
    2. admin gate re-added into fetch → `● … fetchDspaceMetadata › does not refuse a Journal Article to a non-admin user` (1 failed, 29 passed)
    3. `syncAgain` gate disabled → `● … syncAgain › still refuses a Journal Article to a non-admin user (returned, 412)`: `Expected: 412 / Received: 400`
    4. `syncAgain` catch rethrows → `● … syncAgain › returns the original MQAP error object instead of throwing` (1 failed, 29 passed)
  - Implementer verification: service 30/30; consumers `--testPathPattern="results-knowledge-products|admin-panel"` → `Test Suites: 14 passed` / `Tests: 419 passed`; tsc exit 0; eslint exit 0.
  - Evidence re-run (Leader-inline, non-author): **VERIFIED** — `Test Suites: 14 passed, 14 total` / `Tests: 419 passed, 419 total`; tsc exit 0; eslint exit 0.
  - Reviewer: **PASS** — `syncAgain` returns unchanged for both callers (`returnErrorRes` is idempotent, `error.utils.ts:7-17`); fetch writes nothing and maps 422/502 per §4.1; apply keeps the write order.
  - runtime events: none
- **spawns:** implementer not reported by host (worker: 17 tool calls, ~121k tokens), ended complete; reviewer not reported by host (10 tool calls, ~92k tokens), ended complete
- **Not Done / Assumptions (Implementer, verbatim summary):**
  - Global-parameter read moved: `kp_mqap_institutions_confidence` is now read inside apply, after the DSpace fetch. Only changes which error wins when the parameter is missing AND MQAP fails at once; not a write, write order unchanged.
  - Preloaded KP: fetch takes an optional preloaded KP so `syncAgain` loads it once for its gate.
  - Existing bug left alone: `syncAgain`'s not-found branch dereferences `resultKnowledgeProduct.name` on a null KP (ends in a caught TypeError).
  - Journal Article HITL: not done — Leader's item.
- **Leader adjudication:** the moved parameter read is accepted as a deviation from "answers unchanged" — Reviewer ruled it outside the Disqualifier (both reads precede the first write; the only differing answer needs a misconfigured environment plus an MQAP failure at the same moment), and DD-3 needs apply to read it itself.
- **ADVISORY (4R, recorded only):**
  - RISK: the moved global-parameter read (above).
  - RELIABILITY: fetch maps non-OK *answers* only; a thrown `NotFoundException` or other escape from `findOnCGSpace` propagates as-is. DD-4 requires "every other non-OK answer or thrown error becomes 502" → **forward pointer to `KPC-T-3`**: the preflight must wrap the fetch so any non-422 throw becomes 502.
  - READABILITY: pre-existing null-deref in `syncAgain`'s not-found branch (`service.ts:158-160`).
- **Requirements covered:** `KPC-R-5` (DSpace values stored; Journal Article not refused for non-admin — fetch side), `KPC-R-8` (422/502 mapping at the source).
- **HITL:** asked 2026-11-05; user asked for clarification twice; question restated as yes/no ("¿un Journal Article reenviado por la API debe actualizarse con lo nuevo de CGSpace aunque quien lo envía no sea admin?"). **Answered 2026-11-05 by Juan David Delgado (owner/driver):** "Si claro, debemos actualizarlo, no sabemos si son admins o no, mayoritariamente son external users al PRMS" → DD-3 confirmed: the correction skips the admin Journal Article gate; the in-app re-sync keeps it.
- **Final status (updated):** PASS · 2026-11-05 — HITL closed, all DoD items met.

### `KPC-T-3` — KP mode: status rule, lock re-read and preflight

- **Final status:** PASS · 2026-11-05
- **Attempts:** 1
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd` (task defaults) · effort **high** (deviation from medium default: refusal order under the lock, BR5)
- **Premise Ledger hand-off (settled before code):**
  - **P-11 — holds for the standard forms.** Stored `results_knowledge_product.handle` = mapper `dto.handle` (`results-knowledge-products.mapper.ts:584`, built `:33-39`, last two path segments, e.g. `10568/175322`). `extractHandleIdentifier` (`results-knowledge-products.service.ts:688-707`) maps `https://hdl.handle.net/10568/175322`, `https://cgspace.cgiar.org/handle/10568/175322` and `10568/175322` to the same value. **Edge (UNVERIFIED):** a DSpace 7 `…/items/<uuid>` URL is returned whole (`:699-701`) → possible false 409; whether MQAP emits that form is unknown → check in `KPC-T-7`.
  - **P-13 — holds for new users.** `findOrCreateUser` → `createFull` defaults `role_platform = 2` (guest) (`user.service.ts:112-114`; `bilateral.service.ts:1457-1495`). An existing user matched by email could be admin; harmless now that the fetch has no admin gate (HITL `KPC-T-1`). Fetch runs before `resolveUsers` with a read-only lookup (id `0` for a new email).
- **Attempt 1**
  - Files changed: `onecgiar-pr-server/src/api/bilateral/services/bilateral-resubmission.service.ts`, `…/bilateral-resubmission.service.spec.ts`, `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts`, `…/bilateral.service.spec.ts`
  - Shape: `allowedResubmissionStatuses` (`{7}` non-KP, `{7,1}` KP) + `resubmissionStatusRefusal` (one rule, DD-2); lock re-read renamed `assertSourceStatusStillAllowed`, returns the status read → `params.sourceStatusId` (for the `KPC-T-4` CAS); `runPreflight` KP mode skips `validateGeoFocus`/`ensureUniqueTitle`, then after contributors runs `checkKnowledgeProductHandleAndFetch` (400 missing payload handle, 409 mismatch, 422 passthrough, any other throw → 502 §4.1), then users; metadata in `kpMetadata`. New optional `ResubmissionKnowledgeProductPort` on `ResubmissionParams`, built by `bilateral.service.ts` `buildResubmissionKnowledgeProductPort()` and passed only for a KP target.
  - Red run (observed): `jest -t KPC-T-3` → `Tests: 18 failed, 108 skipped, 2 passed` (passes = the non-KP cases). E.g. F6 expected `"Result 31500 cannot be corrected: its status is approved. Only rejected or editing knowledge products can be corrected."`, received `"Result 31500 cannot be resubmitted: its status is approved. Only rejected results can be resubmitted."`; CAS: `Expected: ObjectContaining {"sourceStatusId": 7}` absent. F1–F4 initially masked by `"geo_focus is required", "status": 400` (the geo falsifier's red).
  - Mutations on post-change code (mutate → red → revert):
    - M1 remove handle compare → expected `"Result 31500 is linked to handle 10568/175322; …"`, received `"KPC-T-3 spec: the preflight passed"`
    - M2 fetch moved after the reset → `[Error: closed world: dataSource.transaction() is not a declared read]` instead of 502 (spec helper gained `pipelineContinues` so a late refusal reaches the reset)
    - M3 drop 422 passthrough → expected `422 "Only journal articles published in 2026 are eligible."`, received `502 "The DSpace record of result 31500 … could not be read…"`
    - M4 `validateGeoFocus` re-enabled for KP → received `"geo_focus is required"` (+11 failures)
    - M5 `ensureUniqueTitle` re-enabled for KP → `Expected number of calls: 0, Received number of calls: 1`
    - M6 KP allows only `{7}` → `ConflictException: Result 31500 cannot be corrected: its status is editing…`
    - M7 non-KP allows `{7,1}` → expected 409 `…its status is editing. Only rejected results…`, received `400 "geo_focus is required"`
    - M8 drop `sourceStatusId` → 3 failed
    - M9 fetch after users → 4 failed (502 and handle-409 cases)
  - Implementer verification: `bilateral-resubmission.service` 128/128 (existing RSB tests incl. `:140`, `:2397` unchanged); `--testPathPattern="bilateral"` 49 suites / 1711 tests; tsc 0; eslint 0.
  - Evidence re-run (Leader-inline, non-author): **VERIFIED** — `Test Suites: 49 passed, 49 total` / `Tests: 1711 passed, 1711 total`; tsc exit 0; eslint exit 0.
  - Reviewer: **PASS** — one status function; non-KP messages byte-identical; every KP refusal precedes `resolveUsers` and any write; 422 passthrough / any other throw → 502; separate optional port accepted (DD-4 fixes behaviour, not port shape; keeps non-KP params unchanged).
  - runtime events: none
- **spawns:** implementer not reported by host (worker: 51 tool calls, ~245k tokens), ended partial (assumptions only); reviewer not reported by host (12 tool calls, ~107k tokens), ended complete
- **Not Done / Assumptions (Implementer, carried verbatim in substance; no owed items, no blocker → no continuation):**
  - A missing stored handle (KP row absent or empty) is treated as a mismatch → 409 with an empty `{stored}`. Spec silent.
  - `fetchDspaceMetadata` is called with `{ id, email }` only (it uses just the id).
  - The 502 path logs the error message at error level, never the payload; the handle appears as the §4.1 text requires.
- **ADVISORY (4R, recorded only):**
  - RELIABILITY: the missing-stored-handle 409 renders `"is linked to handle ; the payload sends …"` (malformed), and makes the NotFoundException → 502 path unreachable for a missing KP row; reads more naturally as R-8 (502). Raised to the user at the T-3 gate as a one-line amendment question.
  - RISK (`.cursorrules`): the 502 log line carries the raw `error.message` of the fetch chain; consider logging status + error class only.
  - RESILIENCE: P-11 `items/<uuid>` edge → carried to `KPC-T-7`.
  - READABILITY: tasks.md names `buildResubmissionPreflightPort`; the builder is `buildResubmissionKnowledgeProductPort` (forward pointer below).
- **Requirements covered:** `KPC-R-1` (re-read half), `KPC-R-6` (both scenarios + 400 missing payload handle), `KPC-R-8` (both scenarios + no row written), `KPC-R-9` (rules + "no geo_focus"), `KPC-R-10` (preflight refusals before any write).
- **Final verification:** green (re-run VERIFIED).
- **Running totals (Budget tripwire):** tasks closed 3/7 · LOC ≈ 1 360 diff lines incl. tests (prod ≈ 230+43+~200, test ≈ 87+160+524) vs ~1 060 budget (~350 prod / ~650 test / ~60 doc) — **production ≈ 470 vs ~350; tests ≈ 770 vs ~650** · review rounds 3/9.

### `KPC-T-4` — KP mode: reset, writers, DSpace apply, CAS and history

- **Final status:** PASS · 2026-11-05
- **Attempts:** 1
- **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns` · effort **high** (all-or-nothing write + status transition)
- **Premise Ledger hand-off — P-12 holds.** Static: mysql2 default flags include `FOUND_ROWS` (`node_modules/mysql2/lib/connection_config.js:218`); `orm.config.ts` sets no `flags`. Empirical (Implementer, shared dev DB, session-scoped `CREATE TEMPORARY TABLE` only, dropped after): 1→1 `UPDATE … WHERE id=1 AND status_id=1` → `affected = 1` (`affectedRows 1`, `changedRows 0`); lost CAS (`WHERE status_id=5` on a status-1 row) → `affected = 0`. No always-changing column needed; non-KP CAS unchanged.
- **Attempt 1**
  - **Implementer:** STATUS COMPLETE. Files: `bilateral-resubmission.service.ts` (+115/−30), `bilateral.service.ts` (+77/−36), `bilateral-resubmission.service.spec.ts` (+196/−4), `bilateral.service.spec.ts` (+343/−0). 20 new tests (12 RSB, 8 bilateral).
    - Reset KP variant skips evidence and subnational retire; MQAP-linked PARTNER rows (new port member `readMqapLinkedPartnerRowIds`, read under the lock before the reset) stay active.
    - Writers KP variant (`ResubmissionWriteArgs.kp = { metadata, keepPartnerRowIds }`): header without title/description; no geo, evidence or KP type handler (would `populateKPFromCGSpace` a second KP row); keep-list as 6th arg of `updateInstitutions` only when non-empty; `applyDspaceMetadata` last.
    - Commit: `resubmissionTargetStatus(type, source, keep_editing)` per §5.2; CAS `status_id = params.sourceStatusId`; stamp + announce only when target is 5; `RESUBMIT` row for sources 7 and 1; response carries resulting status.
  - **Falsifiers (each red observed by temporarily breaking the guarded line, then restored):**

    | # | Mutation | Red |
    |---|---|---|
    | 1 | Header writes title | `Expected path: not "title"` / `Received value: "Edited title"` |
    | 1 | Apply moved right after header | `Expected: "Stored title"` / `Received: "Title from DSpace"` |
    | 1 | Geo writers run for KP | order array `Expected -0 / Received +4` |
    | 1 | KP type handler runs | order array `Received +1` |
    | 2 | Keep-list dropped in `handleInstitutions` | active partners `Expected -1` (M missing from {C, M}) |
    | 2 | Reset without MQAP exclusion | `Expected: true` / `Received: false` for M |
    | 3 | Reset deactivates KP evidence | `Expected: true` / `Received: false` |
    | 3 | Evidence writer runs for KP | order array `Received +1` |
    | 4 | `keep_editing` ignored | source 1 + true: `Expected -2 / Received +2` |
    | 4 | Announce always | `Expected number of calls: 0 / Received number of calls: 1` |
    | 4 | Stamp always | `Expected number of calls: 0 / Received number of calls: 1` |
    | 4 | No history row when staying in Editing | `Expected length: 1 / Received length: 0` |
    | 4 | CAS fixed to status 7 | 3 failures (source-1 rows) |
    | 5 | CAS without status condition | `Received promise resolved instead of rejected` (7→5 and 1→1) |
    | 6 | Writer failure swallowed | `Received promise resolved instead of rejected` (sources 7 and 1) |
    | extra | Reset retires KP subnationals | `Expected: true` / `Received: false` |

    Falsifier 7: no existing test case modified; only the RSB-T-5 `arrange` helper gained an optional `kp` setup with old-behaviour defaults. Advisory-grade forward pointer from `KPC-T-2` done (payload partner = kept MQAP institution → both rows active).
  - **Evidence re-run (Leader, non-author):** `npx jest --testPathPattern="bilateral-resubmission.service|bilateral.service" --silent --reporters=summary --forceExit` → `Test Suites: 16 passed, 16 total` / `Tests: 1008 passed, 1008 total`; `npx tsc --noEmit` exit 0; `npx eslint` on the 4 touched files `--quiet` exit 0 → **VERIFIED**.
  - **Reviewer (lenses: spec conformance, atomicity/concurrency, non-KP regression, test validity):** **PASS**, no blocking issue. Deviations adjudicated: subnational retire skip conformant (§5.1 geo row "no KP writer"; subnationals not payload-owned in R-4); keep-list only when non-empty conformant (DD-5); type-handler skip required by R-2 / DD-1(b); `transferPrimary` "as today" per task text; lost-CAS wording unspecified for KP (§4.1); new port read conformant (§2.2 step 4).
  - **Advisories (non-gating):**
    - RISK: `transferPrimary` hard-wires `releaseContributors: true` — a KP kept in Editing with a changed primary releases contributor drafts → check at `KPC-T-7` HITL.
    - READABILITY: lost-CAS message (`bilateral-resubmission.service.ts:644`) says "cannot be resubmitted" for KPs too.
    - RISK: `separateCentersFromCgspacePartners` (apply) can add `from_cgspace` contributing centres beyond the payload `contributing_center` — DSpace-derived (R-5) vs strict R-4 → confirm at `KPC-T-7`.
    - RELIABILITY: payload partner equal to a kept MQAP institution leaves two active PARTNER rows with the same `institutions_id`; `validation_*` functions count roles → check against live data at `KPC-T-7`.
    - RESILIENCE: CAS falls back to `params.sourceStatusId ?? Rejected`; unreachable today, an assertion would be stricter.
- **Requirements covered:** `KPC-R-2`, `KPC-R-4`, `KPC-R-5`, `KPC-R-7`, `KPC-R-10` (post-write atomicity), `KPC-R-11`.
- **Final verification:** green (re-run VERIFIED).
- **Running totals (Budget, re-baselined ~750 prod / ~1 400 test):** tasks closed 4/7 · prod ≈ +729 / −263 · test ≈ +1 310 · review rounds 4/9.

### `KPC-T-5` — Lift the KP guard in the `updated` branch

- **Final status:** PASS · 2026-11-05
- **Attempts:** 1
- **Skills:** `nestjs-expert`, `tdd` · effort medium
- **Attempt 1**
  - **Implementer:** STATUS DONE. `bilateral.service.ts` (+19/−10), `bilateral.service.spec.ts` (+140/−17). In `resolveResultCodeTarget` (`updated` branch) a stored KP skips `assertNotKnowledgeProduct`; `assertResultCodeStatusIsEditable` now throws 409 with `resubmissionStatusRefusal(code, status_id, result_type_id)` (KP passes in 1 and 7; non-KP wording unchanged). Guard order bilateral → ownership → status → same type; `versioned` branch untouched. Unused `describeResultStatus` import removed. RSB-R-7 test replaced by a `Knowledge Product correction (KPC-R-1)` describe; `:2942` ("rejects a Knowledge Product code (409)") kept — it mocks `resolveVersionableResult` rejecting, i.e. the carry-forward path. Extra test: KP target with a payload of another type → 409.
  - **Falsifier reds (guarded line broken, restored, diffed against backup):**
    - F1 (KP guard always runs): `● KPC › a KP in status 1 reaches resubmit() once, with the KP port, and the KP guard is skipped`, `● KPC › a KP in status 7 …` → `Tests: 2 failed, 1017 passed, 1019 total`.
    - F2 (status rule Rejected-only): `● KPC › a KP in status 1 reaches resubmit() once …` → `Tests: 1 failed`.
    - F3 (ownership skipped): `● RSB › another platform -> 403 (RSB-R-6); resubmit never called`, `● KPC › a KP of another platform -> 403; resubmit never called`, `● … rejects an open-phase code that is not in an editable status (409) and writes nothing` → `Tests: 3 failed`.
    - F5 (KP rule applied to all types): `● KPC › a policy change in Editing stays refused with the shipped message (KPC-R-13)`, `● RSB › status 1 (editing) -> 409 naming the code and the status; resubmit never called` → `Tests: 2 failed`.
    - F6 (log call removed): the six `● KPC › a KP in status {2,3,4,5,6,8} … one log line with operation=updated and no payload` tests fail.
    - F4: cannot go red from this service — the carry-forward KP refusal lives in `BilateralVersioningRulesService` (`bilateral-versioning-rules.service.ts:129-136`), pinned by its own unchanged spec (`bilateral-versioning-rules.service.spec.ts:124`); the new test pins pass-through.
    - Predicted red "Result 28565 is a Knowledge Product." cannot appear (guard mocked as `jest.fn()`); F1 pins the guard is not called instead.
  - **Evidence re-run (Leader, non-author):** `npx jest --testPathPattern="bilateral" --silent --reporters=summary --forceExit --maxWorkers=2` → `Test Suites: 49 passed, 49 total` / `Tests: 1742 passed, 1742 total`; `npx tsc --noEmit` exit 0; `npx eslint` on both files `--quiet` exit 0 → **VERIFIED**.
  - **Reviewer (full):** **PASS**, no blocking issue; all five deviations accepted (red run, F4 location, no new logging — accepted corrections already logged by `logAccepted` with `operation=updated … outcome=accepted`, non-KP keeps the KP guard, `:2942` kept).
  - **Advisories (non-gating):** READABILITY — stale comments at `bilateral.service.ts:4610` (RSB-DD-1 order) and `:4694-4697` ("overwritten only from Rejected"); RELIABILITY — `KPC-R-15` (SHOULD) "refusal status": the log carries the HTTP code (`rejected(409)`), not the result status name (inherited RSB-R-21 format).
- **Requirements covered:** `KPC-R-1`, `KPC-R-3`, `KPC-R-12` (via the versioning-rules spec + pass-through test), `KPC-R-13`, `KPC-R-15`.
- **Final verification:** green (re-run VERIFIED).
- **Running totals (Budget, re-baselined ~750 prod / ~1 400 test):** tasks closed 5/7 · prod ≈ +748 / −273 · test ≈ +1 450 · review rounds 5/9.

### `KPC-T-6` — Contract doc

- **Final status:** PASS · 2026-11-05
- **Attempts:** 1
- **Skills:** `api-design-principles`, `cognitive-doc-design` · effort medium
- **Attempt 1**
  - **Implementer:** STATUS DONE. `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (+54/−9): operations row `:448` (KP also corrected from Editing); rejections table — `:463` narrowed to the version path, new update-path "cannot be corrected" 409 row, 403 row reworded ("the version path and the update path, Knowledge Products included"); "What happens by status" KP row + `keep_editing` / title bullets; errors intro, retry table and History line; new "Correcting a Knowledge Product" subsection (status table, payload-owned vs DSpace-owned, handle rule, 422/502, errors); change-log row P2-4065. User-approved extra: two stale comments in `bilateral.service.ts` (`:4610`, `:4694`) now state the KPC-DD-1/DD-2 rule — comments only (+4/−2).
  - **Evidence re-run (Leader, non-author):** `grep -c "checked on both paths"` → `0`; `grep -c "Knowledge Product"` → `25`; `git diff -U0 onecgiar-pr-server/src` shows comment lines only; `npx eslint src/api/bilateral/bilateral.service.ts --quiet` exit 0 → **VERIFIED**.
  - **Reviewer (checklist):** **PASS**. Falsifier: every "Knowledge Product" hit is carry-forward (`:463`, `:531`, `:647`) or correction (`:448`, `:466`, `:518`, `:523`, `:526-527`, `:556`, `:605`, `:607-647`). Flagged items: 403 rewording kept; "other resubmission checks apply unchanged" kept — KP test exists (BRS:3523 `a KP correction keeps the RSB refusal for %s, before any DSpace call`); three handle forms acceptable (BRS:3350 runs the real normaliser, cgspace vs bare).
  - **Cross-check (contract sentence → test, verified by the Reviewer by grep).** BRS = `bilateral-resubmission.service.spec.ts`, BS = `bilateral.service.spec.ts`, RKP = `results-knowledge-products.service.spec.ts`:

    | Contract sentence / code | Test |
    |---|---|
    | 7→5; 1 + `keep_editing: true`→1 (no announce); 1 otherwise→5; one `RESUBMIT` row; `updated` | BRS:2575 `source %s, keep_editing %s -> status %s, one RESUBMIT row, announce=%s…` |
    | 409 for 2/3/4/5/6/8, exact message | BS:3233, BRS:3275 |
    | 403 another platform | BS:3253 |
    | 409 different type | BS:3269 |
    | 409 different handle | BRS:3334 |
    | 400 no handle | BRS:3369 |
    | Handle forms equivalent | BRS:3350 (real normaliser), RKP:65 |
    | 422 passthrough | BRS:3425, RKP:686 |
    | 502, nothing changed | BRS:3385, BRS:3407, RKP:673 |
    | 409 status changed meanwhile | BRS:2611 |
    | `geo_focus` not required; title not compared | BRS:3444 |
    | Payload-owned writers; apply last; payload title/description never written | BS:6354, BS:6336 |
    | DSpace-contributed partners kept | BS:5268, BS:5292, BS:5313 |
    | Other resubmission checks apply unchanged | BRS:3523, BRS:3453, BRS:169 |
    | Earlier-phase-only KP stays 409 | BS:3299 |
    | Refusals before any write | `expectNothingWritten` in each refusal test above |
  - **Advisories (non-gating):** RELIABILITY — no test sends the `hdl.handle.net` or bare form as payload through the real normaliser (BS:6184 uses a mock); suggest `it.each` over the three forms in BRS:3350. READABILITY — doc `:626` lists "The handle link (evidence)" under "Re-read from CGSpace" while the implementation keeps it as stored; change-log date `2026-11` vs full dates elsewhere.
- **Requirements covered:** `KPC-R-14`.
- **Final verification:** green (re-run VERIFIED).
- **Running totals (Budget, re-baselined ~750 prod / ~1 400 test / ~60 doc):** tasks closed 6/7 · prod ≈ +752 / −275 (incl. 4 comment lines) · test ≈ +1 450 · doc +54/−9 · review rounds 6/9.

## Budget tripwire — `KPC-T-3` gate

- **Fired:** 2026-11-05, after `KPC-T-3`. Measured `git diff --numstat a731286af..HEAD -- onecgiar-pr-server/src`: prod +537 / −197, test +771, vs §14 ~350 prod / ~650 test. Review rounds 3/9; tasks 3/7.
- **Cause:** ~190 lines of `syncAgain` body moved verbatim (counted as both removal and addition); per-falsifier tests written against post-change code (`KPC-T-3` alone ~520 test lines).
- **Re-baseline proposed:** ~750 prod net / ~1 400 test for the whole spec.
- **Decision:** user answered "Continue T-4" (2026-11-05) → re-baseline accepted; execution continues.
- **Missing stored handle (409 vs 502):** re-raised at the `KPC-T-4` gate. **Answered 2026-11-05 by the user:** "Un KP como no va a tener handle en PRMS? Si no tiene no se crea..." → a KP cannot exist without a stored handle; the branch is unreachable. No change; advisory closed.

## Forward pointers

| To task | Item | From |
|---|---|---|
| `KPC-T-3` | Wrap the fetch in the preflight: any non-422 thrown error (incl. `NotFoundException`) becomes 502 (DD-4) | `KPC-T-1` Reviewer advisory |
| `KPC-T-3` | Fetch signature is `fetchDspaceMetadata(resultId, user, preloaded?)`; result carries `{ resultKnowledgeProduct, newMetadata }` | `KPC-T-1` |
| `KPC-T-4` | Apply is `applyDspaceMetadata(resultKnowledgeProduct, newMetadata, user)`; MQAP-linked read is `getMqapLinkedPartnerRowIds(resultId)`; keep-list is the 6th arg of `updateInstitutions` | `KPC-T-1`, `KPC-T-2` |
| `KPC-T-4` | One assertion for a payload partner equal to a kept MQAP institution (reactivation of both rows) `[advisory-grade]` | `KPC-T-2` Reviewer advisory |
| `KPC-T-4` | KP reads live in the optional `ResubmissionKnowledgeProductPort` (`buildResubmissionKnowledgeProductPort`, `bilateral.service.ts`), not in `ResubmissionPreflightPort`; preflight result carries `kpMetadata`; CAS source is `params.sourceStatusId` | `KPC-T-3` |
| `KPC-T-7` | P-11 edge: confirm MQAP never stores/returns a DSpace 7 `items/<uuid>` handle for the corrected KPs | `KPC-T-3` |
| `KPC-T-7` | HITL on PRTest: (a) KP kept in Editing with a changed primary releases contributor drafts (`releaseContributors: true`); (b) apply may add `from_cgspace` contributing centres beyond the payload; (c) duplicate active PARTNER rows when a payload partner equals a kept MQAP institution vs `validation_*` role counts | `KPC-T-4` Reviewer advisories |
