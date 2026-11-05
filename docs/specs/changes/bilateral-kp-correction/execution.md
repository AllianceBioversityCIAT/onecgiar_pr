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

## Forward pointers

| To task | Item | From |
|---|---|---|
| `KPC-T-3` | Wrap the fetch in the preflight: any non-422 thrown error (incl. `NotFoundException`) becomes 502 (DD-4) | `KPC-T-1` Reviewer advisory |
| `KPC-T-3` | Fetch signature is `fetchDspaceMetadata(resultId, user, preloaded?)`; result carries `{ resultKnowledgeProduct, newMetadata }` | `KPC-T-1` |
| `KPC-T-4` | Apply is `applyDspaceMetadata(resultKnowledgeProduct, newMetadata, user)`; MQAP-linked read is `getMqapLinkedPartnerRowIds(resultId)`; keep-list is the 6th arg of `updateInstitutions` | `KPC-T-1`, `KPC-T-2` |
| `KPC-T-4` | One assertion for a payload partner equal to a kept MQAP institution (reactivation of both rows) `[advisory-grade]` | `KPC-T-2` Reviewer advisory |
