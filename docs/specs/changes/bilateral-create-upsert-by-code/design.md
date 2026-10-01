# Design — Bilateral create accepts a `result_code` to update or version a result with new data

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-create-upsert-by-code` |
| Depth | Standard, re-sized at Step 2.4 (see §9) |
| Requirements | [`requirements.md`](./requirements.md) `UBC-R-1`..`R-12`, `R-20`, `A-1` |
| Defaults accepted at the Phase 1 gate | `R-5` editable = Editing, Draft, Pending Review, Rejected · `R-6` KP excluded · `R-7` status follows `keep_editing` (user "Continue", 2026-09-30) |
| Branch base | `performance-refactor` @ `35e58fd87`. Citations are read at this SHA; Fetcher citations at `onecgiar_result_functions` `origin/main` |
| Exploration | Delegated to a scout (read-only), which returned citations as run. The Leader re-read the result-code trigger and the code restore |

Path abbreviations used below (all under `onecgiar-pr-server/src/api/`):

| Abbreviation | Path |
|---|---|
| `svc` | `bilateral/bilateral.service.ts` |
| `rules` | `bilateral/versioning-rules/bilateral-versioning-rules.service.ts` |
| `bvs` | `bilateral/services/bilateral-versioning.service.ts` |
| `vs` | `versioning/versioning.service.ts` |

## 2. Executive Summary

The create loop gets one new step: a **resolution** step that runs before any write. When a result carries `result_code`, the step does three things:

1. It finds the target.
2. It checks ownership, type and status.
3. It decides whether the operation is `updated` or `versioned`.

It is not safe to reuse the create writers on an existing result, because several of them are add-only (`P-6`). That rules out "copy, then apply", so each operation takes its own path:

- **Version with data** = a **fresh create** in the open phase, with the prior `result_code` restored after the insert. This is the same restore trick `versionProcessV2` uses.
- **Update** = the header is updated in place, a **section reset** deactivates what the create writers would otherwise duplicate, and then the existing writers run.

## 3. Premise Ledger

**Count:** 16 rows. 14 verified, 1 settled by the stakeholder (`P-16`), 1 `UNVERIFIED` (`Low`).

**Blast-radius triggers:** all three fire.
- `live-path`: the design names the create call. See `P-1`.
- `shared-state`: it changes section writers that the create path shares. See `P-6`, `P-7`.
- `consumer`: it adds a DTO field, extends the response, and adds new error outcomes. See `P-14`, `P-15`.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| `P-1` | A producer's result reaches `svc.create()` through Fetcher `sendResult` → `POST /api/bilateral/create` → controller → the per-result loop. The branch point is `data.result_code`, which is new | `live-path` | Fetcher `external-api.mjs:65` (always `/create`), `:76-83` (sends `data` as-is); `bilateral.controller.ts:49-65`; `svc:307` `for (const result of incomingResults)` | `35e58fd87` / Fetcher `origin/main` | The resolution step is not on the path — **High** | verified |
| `P-2` | `CreateBilateralDto` has no `result_code`, and the route uses `whitelist: true`, so the field is dropped today | `existence` | `grep -n result_code dto/create-bilateral.dto.ts` → 0; `bilateral.controller.ts:54-58` | `35e58fd87` | No DTO change is needed — **Low** | verified |
| `P-3` | The Fetcher lets a `result_code` inside `data` through: AJV strips only where `additionalProperties: false`, and every per-type schema composes a common schema that is open at the root | `data-env` | `validator/ajv.js:4-8`; `common_fields.json:6`; `capacity_sharing.json:6-7` (same shape for inno dev, inno use, policy); `other_output.json:6`, `other_outcome.json:6`; `knowledge_product.json:6` | Fetcher `origin/main` | A Fetcher schema change is needed — **Low** | verified by a read; a live run is `D7` (T-6) |
| `P-4` | The create's transaction does not enrol its repositories, so a throw after a write leaves rows behind | `other` | `svc:350-351` (manager unused); the code's own comment at `svc:326-332` (orphan result 11984), `:3861-3863` | `35e58fd87` | Validation order would matter less — **High** for `DD-1` | verified |
| `P-5` | The first per-result write is the header insert (`svc:4285`; KP `knowledge-product.handler.ts:47`). All aborting validations sit before it, except `geo_focus` (`svc:452-458`, `:475`) and the handlers' `afterCreate` checks (e.g. `policy-change.handler.ts:41-66`) | `other` | Scout answer 1, listing each line | `35e58fd87` | `DD-1`'s placement changes — **High** | verified |
| `P-6` | These create writers are **not** replace-safe on an existing result: `handleEvidence` and `saveResultProject` are insert-only; `handleContributingCenters` and `handleTocMapping` only add; `handleSubnationals` acts only on newly inserted countries; `persistLeadCenter` does not reactivate an inactive row or demote the old lead; `handleInstitutions` with an empty list clears nothing | `shared-state` | `svc:5186-5213`, `:4032-4037`, `:4811`, `:4917-4922`, `:1496-1515`, `:1678-1755`, `:5534-5611`, `:4605-4628` + `results-centers.repository.ts:180-197`, `:5223` | `35e58fd87` | Update could reuse the writers as they are — **High** for `DD-3` | verified |
| `P-7` | These writers already replace or upsert: regions, countries, `upsertResultInitiative`, `saveLeadProgramInvestment`, the policy / capdev / innovation-dev handlers, and innovation-use (upsert; actors are removed only when sent with `is_active: false`) | `shared-state` | `svc:5392-5446`, `:5470-5515`, `:5131-5155`, `:5101-5122`; `policy-change.handler.ts:94-167`; `capacity-change.handler.ts:92-114`; `innovation-development.handler.ts:64-98`; `innovation-use.service.ts:60-481` | `35e58fd87` | More reset work is needed — **Low** | verified |
| `P-8` | An uncalled `resetTocData` exists and deactivates ToC data | `existence` | `svc:1839-1845`; grep shows no caller | `35e58fd87` | The ToC reset must be written — **Low** | verified |
| `P-9` | The `result_auto_code` trigger overwrites `result_code` on **every** insert; `versionProcessV2` restores the prior code by updating it after the insert | `existence` | `migrations/1769300000000-BilateralResultCodeAutoIncrement.ts:25-34`; `vs:300-306` | `35e58fd87` | Code override on a fresh insert is not possible this way — **High** for `DD-2` | verified |
| `P-10` | Phase versions of a result are linked only by `result_code`; no parent-id column ties them | `data-env` | `vs:300-306` restores only `result_code`; `rules:106` `findInPhase(resultCode, phaseId)`; `result.entity.ts` only carries `legacy_id` (`:349-358`) | `35e58fd87` | A fresh create would break a link — **High** for `DD-2` | verified |
| `P-11` | The versioning rules are reusable: `resolveVersionableResult` and `findInPhase` are public; `assertCallerMayVersion` is **private** and reads `external_platform_id`, with an acronym + lead-centre fallback. `resolveVersionableResult` throws a Conflict if any open-phase row exists, so `findInPhase` must be called first | `location` | `rules:64`, `:106`, `:80-87`, `:126-132` (KP); `bvs:115-163` | `35e58fd87` | A second ownership rule would be written — **Low** | verified |
| `P-12` | `ensureUniqueTitle(title, versionId)` has one caller and no exclude-id variant; the pattern exists elsewhere | `existence` | `svc:4385-4408`, caller `:404`; `results/results.service.ts:5558-5571` | `35e58fd87` | `R-9` is already met — **Low** | verified |
| `P-13` | `create()` returns only the **last** result's enriched entity; the per-result `createdResults` is built and never returned | `existence` | `svc:553-560`, `:589-593`; `createdResults` only at `:304`, `:543` | `35e58fd87` | `R-10` would need no new field — **Low** | verified |
| `P-14` | The Fetcher counts results from `data.response`: an array → its length; `response.results[]` → that array's length; otherwise 1 | `consumer` | Fetcher `external-api.mjs:139-157` | Fetcher `origin/main` | The response extension could change the Fetcher's count — **Low** | verified |
| `P-15` | The producers that read `create` responses and errors are STAR, MEL, TIP and the bulk uploader. Beyond the Fetcher, what each one reads is not in these repositories | `consumer` | `UNVERIFIED — confirm at source before relying on it` | `—` | A producer parses a field we change — **Low** (the change is additive) | the contract-doc change log (T-5); STAR confirms on `OQ-1` |
| `P-16` | STAR sends the full result, all MDS, on update and version (`A-1`) | `other` | **Settled 2026-09-30:** Manuel (STAR) confirmed that STAR sends the complete data, relayed by the user in session. A stakeholder decision, not a code fact | `—` | Replace semantics are wrong; the spec is re-sized — **High** if refuted | settled (`OQ-1` closed) |

## 4. Architecture Overview

```
Fetcher /ingest ─▶ POST /api/bilateral/create ─▶ for each result:
   data.result_code ?  ── no ─────────────────────────────▶ create (unchanged, R-1)
        │ yes
        ▼
   RESOLVE (no writes)                                    ── miss/foreign/KP/status ─▶ 4xx (R-8)
     findInPhase(code, open) ── hit ─▶ UPDATE: header in place + section reset + writers (DD-3)
        │ miss
     resolveVersionableResult(code, open) ─▶ VERSION: fresh create + restore code (DD-2)
        ▼
   outcome row {result_code, operation, status_id, external_reference} ─▶ response.outcomes[] (DD-5)
```

## 5. Data Model

No schema change and no migration. The design uses the existing columns: `result_code`, `version_id`, `status_id`, `external_platform_id`, `external_reference`, and the `is_active` flags on the child tables.

## 6. API Design

- **Request:** add an optional `data.result_code` to each result, typed as a string of digits. The rest is unchanged. It is additive (`R-1`).
- **Response:**
  - `response` stays the last enriched entity, as today.
  - Add `response.outcomes[]`, with one row per result in the request: `{ result_code, operation, status_id, status, external_reference }`.
  - The key is named `outcomes`, not `results`, so the Fetcher's count (`P-14`) does not change.
- **Errors:** they reuse `/version`'s vocabulary and messages (`rules`, `bvs`), plus two new 409s: a non-editable status (`R-5`) and a result-type mismatch (`DD-4`).

## 7. Backend Module Design

Everything lives in `api/bilateral`:

- `svc` gains the resolution step, the update path and the version-with-data path.
- The ownership rule moves out of `bvs` into `rules` so both callers share it.
- The section reset is a new method on `svc`, next to the writers.
- There is no new module and no new DI edge: `rules` is already imported by the module (`bilateral.module.ts:121`).

## 8. Design Decisions

- **`UBC-DD-1` — resolve before any write.**
  - For a result with `result_code`, the resolution runs right after the per-result shape checks (`svc:310`), before users, contacts or the header are touched (`P-4`, `P-5`).
  - It runs `findInPhase(open)` first. On a miss, it runs `resolveVersionableResult` (`P-11` ordering).
  - It then applies ownership, the KP guard and the `R-5` status guard, and chooses the operation.
  - For the code path, the post-header checks (`geo_focus` and the handlers' `afterCreate` checks, `P-5`) are **hoisted into a preflight**, so an update never half-applies.
  - Handler checks that cannot be hoisted without the saved row are listed, and their outcome is an accepted risk recorded in T-3.
- **`UBC-DD-2` — version with data = fresh create + code restore.**
  - The result is created through the normal create path in the open phase. Right after the header insert, `result_code` is set back to the source's code, the same way `vs:300-306` does it (`P-9`, `P-10`).
  - This keeps the earlier row untouched (`R-3`) and uses the payload as the whole truth, which holds under `A-1`.
  - *Rejected:* `versionProcessV2` followed by an update. It would stack the payload onto the copied rows, because the writers are add-only (`P-6`). It also needs admin or lead-centre membership on a system token (`vs:1089-1101`), and it does not carry contributing projects in any case.
  - *Consequence:* anything the payload does not carry (share requests, budgets, linked results from the old phase) is not carried forward. That is correct under `A-1`, and it is recorded in the contract doc.
- **`UBC-DD-3` — update = header in place + section reset + existing writers.** ⛔ *Descoped 2026-09-30 (Pivot at T-3): there is no update; a code in the open phase is a 409.*
  - The header fields the create sets from the payload are updated on the existing row. The row keeps its `id` and `result_code`, and its status follows `keep_editing` (`R-7`).
  - A **section reset** then deactivates the child rows of the add-only sections (`P-6`):
    - evidence
    - contributing projects
    - contributing centres (non-lead)
    - ToC (reuse `resetTocData`, `P-8`)
    - subnationals of existing countries
    - institutions of the partner role, including when the incoming list is empty
  - After the reset, the unchanged writers run.
  - `persistLeadCenter` is corrected to reactivate an existing row and demote the previous lead. This does not change behaviour for new results, which have no prior rows (`P-6`, `shared-state`).
  - Sections that already replace (`P-7`) are left alone.
- **`UBC-DD-4` — the result type is immutable on update.** ⛔ *Descoped 2026-09-30 (Pivot at T-3): there is no update; a code in the open phase is a 409.* A payload whose `result_type_id` differs from the target row's is a 409. Changing the type is a new result.
- **`UBC-DD-5` — per-result outcomes.** `createdResults` (`P-13`) grows an `operation` and a status, and it is returned as `response.outcomes[]`. It is additive, and it is not named `results` (`P-14`).
- **`UBC-DD-6` — one ownership rule.** `assertCallerMayVersion` is extracted from `bvs` into `rules`, so `/version` and `create` enforce the same owner rule (`P-11`). Its behaviour for `/version` is unchanged, and its existing specs must stay green.
- **`UBC-DD-7` — the duplicate-title check excludes the target.** ⛔ *Descoped 2026-09-30 (Pivot at T-3): there is no update; a code in the open phase is a 409.* `ensureUniqueTitle` gains an optional id to exclude, following the pattern in `results.service.ts:5558-5571` (`P-12`). The update passes the target id. The version path needs none, because the source row is not in the open phase.
- **`UBC-DD-8` — honest docs.**
  - The contract doc (`onecgiar-pr-server/docs/bilateral-result-summaries.en.md`) gets a `result_code`/operations section and a change-log row.
  - The Fetcher's `op` enum description is changed to say that `update` and `delete` are not implemented. That edit belongs to the Fetcher repo, and is owned by T-6's PR there.

**Reversion challenge (Step 2.3):**
- **`DD-3`'s `persistLeadCenter` correction** changes delivered behaviour. What does it break? For new results, nothing, since there are no prior rows to reactivate or demote. `versionProcessV2` replication does not go through it. It is covered by a regression case on the create path (T-4).
- No other decision removes delivered behaviour.

## 9. Budget (Step 2.4)

| Tasks | LOC | Review rounds |
|---|---|---|
| 6 | ~1,000 (≈400 production, ≈600 test) | 1–2 per task (T-3 and T-4 are the risky ones) |

The declared depth is Standard. The data-integrity and cross-repo surface is closer to **Full**, and the rollout, risks and observability are already covered in `requirements.md` §8–9.

Recommended split into **two PRs**:
- **PR 1:** version with data (T-1, T-2, T-5). This answers STAR's second question on its own.
- **PR 2:** update in place (T-3, T-4). ⛔ *Cancelled 2026-09-30 (Pivot at T-3).*

T-6 (Fetcher + live run) can land after either PR.
