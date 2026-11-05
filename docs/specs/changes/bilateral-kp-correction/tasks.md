# Tasks — A reporting platform corrects a Rejected or Editing Knowledge Product

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-kp-correction` |
| Depth | Full |
| Status | **approved**, user 2026-11-05 (Phase 3 gate) · in execution (`KPC-T-1..3` [x]) |
| Date | 2026-11-05 |
| Linked spec | `requirements.md` (`KPC-R-1..15`), `design.md` (`KPC-DD-1..6`, Premise Ledger `P-1..18`) — both approved by the user at their gates on 2026-11-05 |
| Owner / driver | Juan David Delgado |
| Jira | P2-4065 |
| Base branch for execution | The `performance-refactor` lineage (RSB code lives there). Never base it on `staging` |
| Red runs | Every `Red run` below is **predicted**: the tests do not exist yet and their targets are being changed. Each task's Done criteria require the red **observed and quoted verbatim** in its `execution.md` entry before the task closes (Falsifiability item 8) |

## 1. Scope

The KP mode of the `RSB` resubmission pipeline, the `syncAgain` split, the `updateInstitutions` keep-list, the contract doc, and one live run. Fetcher changes are out of scope.

## 2. Pre-flight checklist

Settled at specify time (2026-11-05):

- `requirements.md` approved.
- `design.md` approved.
- Open questions `KPC-OQ-1..4` resolved (proposal defaults; `KPC-R-8` amended at Phase 2).
- No migration (design §3).

Before `KPC-T-1`:

- [x] No in-flight spec touching `bilateral-resubmission.service.ts` or `results-knowledge-products.service.ts`: check `docs/specs/` and `git log` on the execution branch.
- [x] Local `.env` (server) present in the worktree before any jest run.

## 3. Task list

Scoped jest only, never the full suite: `npx jest --testPathPattern="<pattern>" --silent --reporters=summary --forceExit`.

### [x] `KPC-T-1` — Split `syncAgain` into a throwing fetch and an apply

- **Type:** server
- **Description:** In `ResultsKnowledgeProductsService`, extract:
  - a **fetch** that loads the KP of a result and calls `findOnCGSpace(storedHandle, user, cgspace_year, false)`. On a non-OK answer it **throws**: 422 when `findOnCGSpace` answered 422 (message passed through); otherwise 502 with the design §4.1 message naming the code and the handle. It has no admin Journal Article gate;
  - an **apply** that takes the loaded KP and the fetched metadata and runs today's write sequence of `syncAgain` (`:184-375`).

  `syncAgain` becomes: its admin gate, then fetch + apply inside its existing `try/catch`, so its two callers see the same answers as before (DD-3).
- **Implements:** `KPC-R-5` (DSpace values stored; Journal Article clause "BUT it must NOT be refused because the user is not an admin"), `KPC-R-8` (502 / 422 mapping at the source)
- **Design:** `KPC-DD-3`; Premise Ledger P-5, P-6, P-16
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-knowledge-products/results-knowledge-products.service.ts` (+ `.spec.ts`)
- **Depends on:** —
- **Blocks:** `KPC-T-3`, `KPC-T-4`
- **Estimate:** M
- **Review:** `full` — reason: shared service with two live callers (in-app re-sync button, admin panel)
- **Verification:**
  - **Falsifier:** (1) a stub MQAP that answers `null` → fetch must throw 502 naming handle `10568/175322`; if it returns an object instead, the gate is red. (2) A stub answer with `Type: 'Journal Article'` and a non-admin user, in-cycle year → fetch succeeds; re-adding the admin gate into fetch turns it red. (3) `syncAgain` with a Journal Article and a non-admin user still returns `PRECONDITION_FAILED`. (4) `syncAgain` on an MQAP failure still **returns** (not throws) the error object.
  - **Red run:** `npx jest --testPathPattern="results-knowledge-products.service" --silent --reporters=summary` — predicted: the new fetch/apply tests fail with "is not a function" before the split (greenfield methods, observed in `KPC-T-1`)
  - **Disqualifier:** the apply cannot be separated without changing `syncAgain`'s write order or its return value for the controller → stop and re-specify DD-3 (Pivot)
  - **Consumers:** `results-knowledge-products.controller.ts:124`, `admin-panel.service.ts:562`; specs `results-knowledge-products.controller.spec.ts`, `admin-panel.phase-reporting.service.spec.ts` — all run in this task's verification (`--testPathPattern="results-knowledge-products|admin-panel"`)
- **Definition of done:**
  - [x] Fetch and apply exist; `syncAgain` answers unchanged for both callers (tests above green).
  - [x] The four falsifiers executed against the post-change code, each red observed and quoted in `execution.md`.
  - [x] `npx tsc --noEmit` exit 0; `npx eslint` on touched files clean.
  - [x] **HITL:** the KP module owner confirms that the correction may skip the in-app admin Journal Article gate (DD-3 challenge). The answer is recorded in `execution.md`.
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd`

### [x] `KPC-T-2` — Additive keep-list on `updateInstitutions`, and the MQAP-linked row read

- **Type:** server
- **Description:** Give `ResultByIntitutionsRepository.updateInstitutions` an **optional** list of `results_by_institution` ids that its deactivate statement never touches. With the list absent or empty, the SQL is exactly today's. Add a read that returns the ids of the active PARTNER rows of a result linked through an active `result_kp_mqap_institution` (bound parameters, no interpolation).
- **Implements:** `KPC-R-4` scenario "partners replaced", clause "AND IT MUST keep the institutions DSpace contributed"
- **Design:** `KPC-DD-5`; Premise Ledger P-7, P-8
- **Files (expected):** `onecgiar-pr-server/src/api/results/results_by_institutions/result_by_intitutions.repository.ts` (+ `.spec.ts`)
- **Depends on:** —
- **Blocks:** `KPC-T-4`
- **Estimate:** S
- **Review:** `full` — reason: shared repository method with five callers
- **Verification:**
  - **Falsifier:** (1) called with a keep-list `[7001]`: the deactivate SQL and its parameters must exclude `7001`; if the keep-list is ignored the assertion on the SQL/params is red. (2) Called with no keep-list: the SQL string and parameters equal today's byte for byte (snapshot taken from the pre-change code). (3) The read: the generated query binds `resultId`, no template interpolation of it.
  - **Red run:** `npx jest --testPathPattern="result_by_intitutions.repository" --silent --reporters=summary` — predicted: falsifier (1) fails before the change (keep-list not applied; greenfield parameter, observed in `KPC-T-2`)
  - **Disqualifier:** a keep-list cannot be added without changing the SQL of the default call → stop; re-specify (the five callers must not move)
  - **Consumers:** `results-package-toc-result.service.ts:317`, `:369`; `results.service.ts:1085`; `bilateral.service.ts:6178`; `policy-change.handler.ts:195`. Their specs run in verification: `--testPathPattern="result_by_intitutions|results-package-toc-result|results.service|policy-change.handler|bilateral.service"`
- **Definition of done:**
  - [x] Default-call snapshot unchanged; keep-list honoured; read uses bound params.
  - [x] Falsifiers executed; reds quoted in `execution.md`.
  - [x] `npx tsc --noEmit` exit 0.
- **Skills:** `nestjs-expert`, `tdd`

### [x] `KPC-T-3` — KP mode: status rule, lock re-read and preflight

- **Type:** server
- **Description:**
  - One status rule (DD-2): allowed source statuses `{7}` for non-KP, `{7, 1}` for KP; KP refusal message per design §4.1; non-KP messages byte-identical.
  - The lock re-read (`assertStillRejected`) uses that rule and records the status it read, for the CAS (DD-6).
  - KP preflight (DD-4):
    - compare `extractHandleIdentifier` of the payload handle and the stored handle (409 on mismatch, 400 when absent);
    - run the `KPC-T-1` fetch (422 passes through; anything else is 502);
    - skip `validateGeoFocus` and `ensureUniqueTitle`;
    - keep primary, allocation, lead project, lead centre, contributors and users;
    - carry the fetched metadata in the preflight result.

  The resolver is **not** changed here, so KPs still get 409 in production after this task.
- **First steps (Premise Ledger hand-off):** settle **P-11** (read what `results_knowledge_product.handle` stores, through `ResultsKnowledgeProductMapper.updateEntity`) and **P-13** (confirm that users from `findOrCreateUser` are not admins). Record both outcomes in `execution.md` before writing code.
- **Implements:**
  - `KPC-R-1`: scenario "the status changes between the check and the lock", re-read half;
  - `KPC-R-6`: both scenarios, plus the 400 for a missing handle;
  - `KPC-R-8`: both scenarios, with "AND IT MUST leave no row created, modified or deactivated";
  - `KPC-R-9`: rules and the "no geo_focus" scenario;
  - `KPC-R-10`: refusals before any write.
- **Design:** `KPC-DD-2`, `KPC-DD-4`; Premise Ledger P-1, P-6, P-11, P-13
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/services/bilateral-resubmission.service.ts` (+ `.spec.ts`), `bilateral.service.ts` (`buildResubmissionPreflightPort`)
- **Depends on:** `KPC-T-1`
- **Blocks:** `KPC-T-4`
- **Estimate:** M
- **Review:** `full` — reason: refusal order under the lock (BR5)
- **Verification:**
  - **Falsifier:**
    1. KP target with payload handle `https://hdl.handle.net/10568/999999` and stored `10568/175322`: expect 409 and zero writes, counted by the closed-world helper. Removing the compare must turn it red.
    2. Fetch stub throwing 502: expect 502 and zero writes. Moving the fetch after the reset must turn the zero-write assertion red.
    3. Fetch stub with 422: 422 passes through.
    4. KP payload without `geo_focus`: the preflight passes (red if `validateGeoFocus` still runs).
    5. Non-KP result re-read in Editing: 409 with today's exact message.
    6. KP re-read in Approved: 409 with the KP message.
  - **Red run:** `npx jest --testPathPattern="bilateral-resubmission.service" --silent --reporters=summary` — predicted: falsifiers 1–4 and 6 fail before the change (observed in `KPC-T-3`)
  - **Disqualifier:** if the DSpace fetch cannot run inside the preflight without a write (P-6 false), stop: Pivot, BR5 cannot hold as designed
  - **Consumers:** `bilateral-resubmission.service.spec.ts` tests at `:140`, `:2397` (re-read message and order) stay green unchanged
- **Definition of done:**
  - [x] P-11 and P-13 settled and recorded.
  - [x] Every falsifier executed against the post-change code; reds quoted.
  - [x] All existing RSB tests in `bilateral-resubmission.service.spec.ts` green unchanged.
  - [x] `npx tsc --noEmit` exit 0.
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd`

### `KPC-T-4` — KP mode: reset, writers, DSpace apply, CAS and history

- **Type:** server
- **Description:**
  - Reset, KP variant (DD-5): skip evidence; in the PARTNER block, exclude the MQAP-linked rows (`KPC-T-2` read).
  - Writers, KP variant:
    - the header without `title` and `description`;
    - lead centre, ToC, partners (`handleInstitutions` with the `KPC-T-2` keep-list), projects, centres;
    - no geo writers and no evidence writer;
    - then the `KPC-T-1` apply with the preflight metadata.
  - Commit (DD-6): CAS `status_id = <status read under the lock>` → target (§5.2 of the design); primary transfer as today; card stamp only when the target is 5; `RESUBMIT` row for sources 7 and 1.
  - Post-commit: announce only when the target is 5.
  - Response: `operation: "updated"` with the resulting status.
- **First step (Premise Ledger hand-off):** settle **P-12**: run an `UPDATE result SET status_id = 1 … WHERE status_id = 1` through TypeORM against the local MySQL and record `affected`. If it is 0, the 1 → 1 CAS must also write a column that always changes, and `execution.md` records that adjustment.
- **Implements:**
  - `KPC-R-2`: scenario, plus the clause "BUT it must NOT create a second result";
  - `KPC-R-4`: table and the "partners replaced" scenario, including the BUT and AND IT MUST clauses;
  - `KPC-R-5`: "payload title ignored" (BUT clause) and "metadata changed in DSpace";
  - `KPC-R-7`: the whole table, the "rejected KP back to review" scenario, and "A KP that stays in Editing MUST NOT be announced";
  - `KPC-R-10`: after the first write, a failure leaves the previous status (NFR atomicity);
  - `KPC-R-11`: the "rejection kept" scenario, for sources 7 and 1.
- **Design:** `KPC-DD-5`, `KPC-DD-6`, §5.1, §5.2; Premise Ledger P-7–P-10, P-12, P-17
- **Files (expected):** `bilateral-resubmission.service.ts` (+ `.spec.ts`), `bilateral.service.ts` (`buildResubmissionWritersPort`, `writeResubmittedResult`, `updateResubmissionHeader`)
- **Depends on:** `KPC-T-2`, `KPC-T-3`
- **Blocks:** `KPC-T-5`
- **Estimate:** L
- **Review:** `lenses` — reason: all-or-nothing write and status transition on a regulated record
- **Verification:**
  - **Falsifier (KP target, in-memory helper):**
    1. Payload `title: "Edited title"` and `geo_focus` Peru: the stored title equals the fetched DSpace title and no country/region writer is called. Red if the header writes the title.
    2. Stored partners A, B plus MQAP-linked row M; payload partner C: the active PARTNER rows are {C, M}. Red without the keep-list (M deactivated).
    3. Evidence row E (the handle link) is still active after the correction. Red if the reset deactivates evidence.
    4. The source-status × `keep_editing` table:

       | Source | `keep_editing` | Status | `RESUBMIT` | Announce |
       |---|---|---|---|---|
       | 7 | `true` | 5 | 1 | yes |
       | 1 | `true` | 1 | 1 | no |
       | 1 | absent | 5 | 1 | yes |

    5. The status is moved to 5 between the re-read and the CAS: 409, no history row, no announce.
    6. The DSpace apply throws: the status stays 7 (or 1), no history row, lock released.
    7. Non-KP resubmission: the existing RSB tests stay green unchanged.
  - **Red run:** `npx jest --testPathPattern="bilateral-resubmission.service|bilateral.service" --silent --reporters=summary` — predicted: falsifiers 1–4 fail before the change (observed in `KPC-T-4`)
  - **Disqualifier:** if the DSpace apply cannot run after the payload writers without re-deactivating payload rows, or P-12 forces a change to the non-KP CAS, stop: Pivot
  - **Consumers:** `writeResubmittedResult` and `updateResubmissionHeader` are private; `ResubmissionWritersPort` / `ResubmissionPreflightPort` are consumed by `bilateral.service.ts` and both specs (`bilateral.service.spec.ts:199` mocks the rules service; the port builders' tests). Union with the Premise Ledger consumers: none outside `api/bilateral`
- **Definition of done:**
  - [ ] P-12 settled and recorded.
  - [ ] Every falsifier executed; reds quoted.
  - [ ] Existing RSB / RRC / RSF tests green unchanged.
  - [ ] `npx tsc --noEmit` exit 0; eslint clean on touched files.
- **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`

### `KPC-T-5` — Lift the KP guard in the `updated` branch

- **Type:** server
- **Description:** In `resolveResultCodeTarget`, for a KP target, skip `assertNotKnowledgeProduct` and apply the `KPC-T-3` status rule. The guard order stays: bilateral → ownership → status → same type. The `versioned` branch is untouched. Flip the test at `bilateral.service.spec.ts:3172` ("a Knowledge Product target -> 409 (RSB-R-7)") so it expects `resubmit` to be called. Confirm what path the test at `:2942` covers, and keep it if it is the carry-forward path.
- **Implements:**
  - `KPC-R-1`: "an approved KP", "a KP under review", "Editing stays refused for other types", and the full refusal list (2, 3, 4, 5, 6, 8);
  - `KPC-R-3`: the "another platform" scenario (403) and the wrong type (409);
  - `KPC-R-12`: the "approved KP from 2025" scenario;
  - `KPC-R-13`;
  - `KPC-R-15`: the log line for a KP correction, with no payload.
- **Design:** `KPC-DD-1`, `KPC-DD-2`; Premise Ledger P-1, P-2, P-14
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (+ `.spec.ts`)
- **Depends on:** `KPC-T-4`
- **Blocks:** `KPC-T-6`, `KPC-T-7`
- **Estimate:** S
- **Review:** `full` — reason: removes a shipped guard (DD-1 reversion)
- **Verification:**
  - **Falsifier:**
    1. KP target in 7 and in 1 → `resubmit` called once.
    2. KP target in each of 2, 3, 4, 5, 6, 8 → 409 whose message contains the code and the status; `resubmit` not called.
    3. KP of another platform → 403.
    4. KP only in an earlier phase → 409 Knowledge Product. Red if the `versioned` guard is also lifted.
    5. Policy change in 1 → 409 with today's message.
    6. The log line contains `operation=updated` and no payload field.
  - **Red run:** `npx jest --testPathPattern="bilateral.service" --silent --reporters=summary` — predicted: falsifier 1 fails before the change with "Result 28565 is a Knowledge Product." (observed in `KPC-T-5`)
  - **Disqualifier:** a non-KP test in `bilateral.service.spec.ts` changes outcome → stop (`KPC-R-13` broken)
  - **Consumers:** `bilateral.service.spec.ts:199`, `:2942`, `:2979`, `:3172`, `:3180` (P-14)
- **Definition of done:**
  - [ ] Falsifiers executed; reds quoted.
  - [ ] Scoped run `--testPathPattern="bilateral"` green; `npx tsc --noEmit` exit 0.
- **Skills:** `nestjs-expert`, `tdd`

### `KPC-T-6` — Contract doc

- **Type:** docs
- **Description:** In `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`:
  - add a "Correcting a Knowledge Product" subsection under "Resubmitting a rejected result", covering the statuses, payload-owned vs DSpace-owned fields, the handle rule, 409, 422, 502, `keep_editing`, and the preflight rules that still apply;
  - narrow the `:463` row to carry-forward;
  - adjust `:448`, `:465` and `:516-521` for KPs;
  - add a change-log row (P2-4065).
- **Implements:** `KPC-R-14`
- **Design:** §4.2; Premise Ledger P-15
- **Files (expected):** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** `KPC-T-5`
- **Blocks:** —
- **Estimate:** S
- **Review:** `checklist` — reason: text only, but the Reviewer cross-checks each new contract sentence against a test name (`RSB-T-6` practice)
- **Verification:**
  - **Falsifier:** `grep -n "Knowledge Product" docs/bilateral-result-summaries.en.md` → every hit either describes carry-forward only or the correction; a surviving "checked on both paths" phrase fails the task. Every status code in the new subsection maps to a test name in `KPC-T-3..5`.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** a contract sentence with no matching test → the behaviour is unverified; add the test or drop the sentence
  - **Consumers:** the Fetcher docs (other repo) — listed in design §13, not edited here
- **Definition of done:**
  - [ ] Doc updated; change-log row present; cross-check table in `execution.md`.
- **Skills:** `api-design-principles`, `cognitive-doc-design`

### `KPC-T-7` — Live run on PRTest

- **Type:** rollout
- **Description:** Once the code is deployed to PRTest, which happens only after the user merges it, run two corrections through a direct `create` call, with the platform key handled by the user and never echoed:
  - (a) a Rejected KP, with a different title and `geo_focus` in the payload, and partners changed;
  - (b) an Editing KP with `keep_editing: true`.

  Then send one refusal of each kind: another handle, an Approved KP, and another platform. Check with SQL: status, `RESUBMIT` rows, the payload partners against the MQAP institutions, evidence, title equal to DSpace's, row counts unchanged after each refusal.
- **Implements:** every `KPC-R-*` against real DSpace/MQAP: the defect class "DSpace / MQAP real behaviour", which has no automated gate (`requirements.md` §7)
- **Depends on:** `KPC-T-5`, deploy
- **Blocks:** —
- **Estimate:** S
- **Review:** `checklist` — reason: evidence review of the run log
- **Verification:**
  - **Falsifier:** a refusal that changes any row count, or a corrected KP whose title is the payload's → fail
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** PRTest pipeline not pointing at the branch with the commit (memory: confirm the branch first) → the run is not evidence; report and stop
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] Run log with result codes and SQL counts in `execution.md`; test data listed for purge.
- **Skills:** `systematic-debugging` (only if a check fails)

## 4. Dependency graph

```
KPC-T-1 ──┐
          ├── KPC-T-3 ── KPC-T-4 ── KPC-T-5 ──┬── KPC-T-6
KPC-T-2 ──┴────────────────┘                  └── KPC-T-7 (after deploy)
```

`KPC-T-1` and `KPC-T-2` are parallel-safe (different files). The guard is lifted last (`KPC-T-5`), so no intermediate commit lets a KP reach writers that do not know it.

## 5. Coverage — scenarios and clauses to tasks

| Requirement · scenario / clause | Task |
|---|---|
| R-1 refusal list (2, 3, 4, 5, 6, 8) · "an approved KP" · "a KP under review" | T-5 |
| R-1 "status changes between the check and the lock" (re-read) | T-3; the CAS half is in T-4 falsifier 5 |
| R-1 "Editing stays refused for other types" | T-5 falsifier 5; T-3 falsifier 5 (re-read) |
| R-2 scenario · "BUT must NOT create a second result" | T-4 |
| R-3 403 · wrong type 409 | T-5 |
| R-4 table · "partners replaced" · "BUT must NOT keep A or B" · "AND IT MUST keep DSpace institutions" | T-4 (with T-2) |
| R-5 "payload title ignored" + BUT · "metadata changed in DSpace" | T-4; real DSpace in T-7 |
| R-5 "journal article" + BUT (not refused for non-admin) | T-1 falsifier 2; T-7 |
| R-6 "different handle" · "same handle in another form" · missing handle 400 | T-3 |
| R-7 table · "rejected KP back to review" · Editing not announced | T-4 falsifier 4 |
| R-8 422 scenario · "DSpace down" · "AND IT MUST leave no row…" | T-1 (mapping), T-3 (no write) |
| R-9 rules · "no geo_focus" | T-3 |
| R-10 refusal list | T-3 (preflight refusals), T-5 (resolver refusals), T-4 (lost CAS, failed apply) |
| R-11 "rejection kept", sources 7 and 1 | T-4 |
| R-12 "approved KP from 2025" | T-5 falsifier 4 |
| R-13 | T-3 falsifier 5, T-4 falsifier 7, T-5 falsifier 5 |
| R-14 | T-6 |
| R-15 | T-5 falsifier 6 |

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `KPC-TEST-1` | unit | R-5, R-8 | `results-knowledge-products.service.spec.ts` |
| `KPC-TEST-2` | unit | R-4 (keep-list) | `result_by_intitutions.repository.spec.ts` |
| `KPC-TEST-3` | unit | R-1, R-6, R-8, R-9, R-10 | `bilateral-resubmission.service.spec.ts` |
| `KPC-TEST-4` | unit | R-2, R-4, R-5, R-7, R-10, R-11 | `bilateral-resubmission.service.spec.ts` |
| `KPC-TEST-5` | unit | R-1, R-3, R-12, R-13, R-15 | `bilateral.service.spec.ts` |
| `KPC-TEST-6` | live | all, real DSpace | PRTest, `execution.md` |

## 7. Rollout & verification

- [ ] Commits `<emoji> <type>(<scope>) [P2-4065]: <description>`; commit is free, push and merge only on the user's order.
- [ ] CI green (lint, tests, build, `migration:check:ci`, SonarCloud).
- [ ] `KPC-T-7` live run.
- [ ] Tell the Fetcher owner the server side is live (AC 1–2, 9–10 are theirs).
- [ ] Pending item for `staging`: `api/bilateral/CLAUDE.md` §4 KP rule.

## 8. Roll-back plan

1. Revert the PR(s) in reverse order. No migration, no flag.
2. KPs return to 409 in both branches; RSB unchanged.
3. Revert the contract doc row with the code.

## Required cross-references

`requirements.md`, `design.md` (same folder); `docs/prd.md` US-D1, `AC-4`; `docs/trd/trd.md` bilateral module; `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
