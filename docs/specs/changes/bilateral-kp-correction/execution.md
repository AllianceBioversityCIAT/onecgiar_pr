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

## Forward pointers

| To task | Item | From |
|---|---|---|
| `KPC-T-3` | Wrap the fetch in the preflight: any non-422 thrown error (incl. `NotFoundException`) becomes 502 (DD-4) | `KPC-T-1` Reviewer advisory |
| `KPC-T-3` | Fetch signature is `fetchDspaceMetadata(resultId, user, preloaded?)`; result carries `{ resultKnowledgeProduct, newMetadata }` | `KPC-T-1` |
| `KPC-T-4` | Apply is `applyDspaceMetadata(resultKnowledgeProduct, newMetadata, user)`; MQAP-linked read is `getMqapLinkedPartnerRowIds(resultId)`; keep-list is the 6th arg of `updateInstitutions` | `KPC-T-1`, `KPC-T-2` |
| `KPC-T-4` | One assertion for a payload partner equal to a kept MQAP institution (reactivation of both rows) `[advisory-grade]` | `KPC-T-2` Reviewer advisory |
| `KPC-T-4` | KP reads live in the optional `ResubmissionKnowledgeProductPort` (`buildResubmissionKnowledgeProductPort`, `bilateral.service.ts`), not in `ResubmissionPreflightPort`; preflight result carries `kpMetadata`; CAS source is `params.sourceStatusId` | `KPC-T-3` |
| `KPC-T-7` | P-11 edge: confirm MQAP never stores/returns a DSpace 7 `items/<uuid>` handle for the corrected KPs | `KPC-T-3` |
