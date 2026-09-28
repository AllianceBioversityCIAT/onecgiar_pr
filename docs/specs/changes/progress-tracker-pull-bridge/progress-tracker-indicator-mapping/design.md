# Design — Progress Tracker Indicator Mapping and Read Proxy

## 1. Summary

A new `src/api/progress-tracker/` module proxies two read-only calls to the Progress Tracker Interoperability API, mirroring `cgspace-discovery`'s hardened shape: env-read configuration, a per-call timeout, and a failure contract made only of primitives so no upstream host, URL, key, or body can reach a response or a log line. Two PRMS-owned tables land with it — one mapping a ToC indicator **and reporting version** to the upstream `indicator_id`, one holding the provenance of a result created from a proposal.

The biggest constraint this design accepts: **the ToC indicator catalogue is not ours to write** (`env.DB_TOC`), so the mapping lives in a PRMS table filled through the upstream `/resolve` endpoint rather than as a column on the row it describes. The second: a cold upstream draft takes ~20 s against a 29 s gateway ceiling, so the call is synchronous but the timeout is pinned, declared, and env-overridable.

- **Requirements:** `./requirements.md` · **Proposal:** `./proposal.md` · **Family:** `../family.md`
- **Baseline:** `docs/trd/trd.md` §5 W9 (the mirrored pattern), §7 (Integration Points), §8 (Security) · `docs/prd.md` `AC-3`, `AC-5`, `AC-8`, `AC-9`

---

## 1A. Premise Ledger

Verified: 14 · UNVERIFIED: 0 · High Impact: 0 · Low Impact: 0  _(`P-5` re-verified firsthand by the Leader at execute time, 2026-09-22; `P-14` verified firsthand by `PTM-T-8` against live PT staging, 2026-09-22 — **the ledger is now fully closed, no open premises**)_
Blast-radius triggers: **live-path, shared-state, consumer** — the design adds a step to the framework create path, which is reached by a named user action and whose request DTO is read by other files.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| `P-1` | The ToC indicator catalogue is read cross-schema from the ToC Integration database, not from a PRMS table. | `location` | `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts:777-788` — `FROM ${env.DB_TOC}.toc_results_indicators tri` | `24a91da0e` | `DD-2` collapses: the mapping becomes a column on the ToC row and the migration is discarded. Impact: **High** | — |
| `P-2` | PRMS issues **no** write statement against the ToC Integration schema today. | `existence` | `grep -rniE '(INSERT INTO\|UPDATE\|DELETE FROM\|CREATE TABLE\|ALTER TABLE)[^;]*\$\{env\.DB_TOC\}' --include='*.ts' src` → **0 hits**; `grep -rn 'env\.DB_TOC' --include='*.ts' src \| grep -v spec` → **115 hits** across 10+ repositories, all reads. Scope: `onecgiar-pr-server/src`. Alternates tried: `DB_TOC` unqualified, `toc_results_indicators`. ⚠️ **Limitation of this citation, found at execute time (`PTM-T-9`):** the pattern matches **per line**, so a write whose keyword and `${env.DB_TOC}` reference are split across a multi-line template literal would not appear in the 0-hit count. No such statement exists today and every current access is single-line; recorded as accepted risk `D-12` in `requirements.md` §9 | `24a91da0e` | `PTM-R-12` is not a new invariant but a restoration; `T-9`'s grep gate would start red instead of green. Impact: Low | — |
| `P-3` | The framework create DTO already accepts `toc_progressive_narrative`; `CreateResultDto` carries no `description` and no provenance field. | `location` | `onecgiar-pr-server/src/api/results-framework-reporting/dto/create-results-framework.dto.ts:145-150` · `onecgiar-pr-server/src/api/results/dto/create-result.dto.ts:3-45` | `24a91da0e` | `DD-5` changes: provenance would need a different carrier. Impact: Low | — |
| `P-4` | The reporting phase is identified by `version.id` (bigint), **not** by `phase_year` — two version rows can share a `phase_year` while carrying different ToC phase ids. | `data-env` | `onecgiar-pr-server/src/api/versioning/entities/version.entity.ts:56-61` (`phase_year`), `:14-18` (`id`) · `onecgiar-pr-server/src/api/results-framework-reporting/reporting-toc-context/reporting-toc-context.service.ts:86-91` (the non-uniqueness statement) · `onecgiar-pr-server/src/api/results/entities/result.entity.ts:266-271` (`result` keys on `version_id` bigint) | `24a91da0e` | `DD-2`'s key changes from `version_id` to a year int, and `PTM-AC-11`'s idempotency test keys on the wrong column. Impact: **High** | — |
| `P-5` | The deployed staging budget is a 30 s Lambda behind a 29 s API Gateway, while `serverless.yaml` declares no `timeout:` at all. | `data-env` | `onecgiar-pr-server/serverless.yaml` — full file read, `functions.main` carries `handler` + `events` only. **Re-run by the Leader at execute time, 2026-09-22** (not second-hand): `aws sts get-caller-identity` → account `569113802249`, `arn:aws:iam::569113802249:user/Prms-test`. `aws lambda get-function-configuration --function-name prstaging-dev-main --region us-east-1` → **`Timeout: 30`**, `MemorySize: 1024`, `LastModified: 2026-02-06T13:02:28.000+0000`. `aws apigateway get-rest-apis` → `dev-prtesting` = `dlhmzxl1zc`; `get-resources` → `{any+}` = `l19ilt`; `aws apigateway get-integration --http-method ANY` → **`timeoutInMillis: 29000`**, `type: AWS_PROXY`. ⚠️ **Region is `us-east-1`** — the function does **not** exist in `eu-central-1` (`ResourceNotFoundException`); `eu-central-1` is the Progress Tracker's region, not PRMS's | `24a91da0e` | `DD-4`'s 25 s call timeout exceeds the real ceiling and every cold draft is cut by the gateway; the design would have to go asynchronous. Impact: **High** | — (verified firsthand; `PTM-T-2` no longer owes the read) |
| `P-6` | `ResponseInterceptor` derives the HTTP status from the service's returned envelope, and `cgspace-discovery` deliberately returns **502** when every source fails. | `other` | `onecgiar-pr-server/src/shared/Interceptors/Return-data.interceptor.ts:30` (`response.status(modifiedData.statusCode)`) · `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.service.ts:541` (`status: allFailed ? 502 : 200`) | `24a91da0e` | `DD-1` is unnecessary — returning the classified status would already yield HTTP 200. Impact: Low | — |
| `P-7` | Every `/api/*` route inherits `JwtMiddleware` and the global throttler unless explicitly excluded, and `progress-tracker` is not in the exclusion list. | `other` | `onecgiar-pr-server/src/app.module.ts:140-152` (`.apply(JwtMiddleware…).exclude(platform-report, bilateral…).forRoutes({ path: 'api/*path' })`) · `:68-71` (`ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])`) · `:127-128` (`APP_GUARD`) | `24a91da0e` | The module needs its own guard wiring and `PTM-R` auth coverage grows a task. Impact: Low | — |
| `P-8` | The user action "Create and continue" reaches the provenance hook point through a single unbranched chain. | `live-path` | `POST /api/results-framework-reporting/create` → `results-framework-reporting.controller.ts:344` `@Post('create')` → `:352` `createResultFromFramework(@Body() payload, @UserToken() user)` → `results-framework-reporting.service.ts:637-644` → `create-result-from-framework.handler.ts:18` `execute(command)` → `:42-46` associations step → `:48` return. **No branch point, no portfolio or version fork on this chain.** | `24a91da0e` | `DD-5`'s hook lands off the live path and provenance is never written. Impact: **High** | — |
| `P-9` | `CreateResultFromFrameworkCommand` has exactly **one** production caller, so adding a handler step changes one lifecycle, not several. | `shared-state` | `grep -rn "CreateResultFromFrameworkCommand" --include='*.ts' src \| grep -v '\.spec\.'` → 5 hits, of which the only construction site is `results-framework-reporting.service.ts:643`; the rest are the import (`:17`), the handler's import (`handler.ts:3`), its signature (`handler.ts:18`) and the class definition (`command.ts:4`) | `24a91da0e` | A second caller exists and would silently gain provenance writes; `DD-5` needs a guard on the payload instead of an unconditional step. Impact: Low | — |
| `P-10` | `CreateResultsFrameworkResultDto` is read by 7 files, all inside `results-framework-reporting`. | `consumer` | `grep -rn "CreateResultsFrameworkResultDto" --include='*.ts' src test` → **23 hits / 7 files**: `dto/create-results-framework.dto.ts`, `results-framework-reporting.controller.ts`, `results-framework-reporting.service.ts`, `application/commands/create-result-from-framework/{create-result-from-framework.command,link-framework-result-toc.service,apply-framework-result-associations.service,create-framework-result-entity.service}.ts`. Scope: `onecgiar-pr-server/src` **and** `onecgiar-pr-server/test` | `24a91da0e` | An out-of-module consumer exists and the additive DTO change is not as contained as `PTM-R-14` assumes. Impact: Low | Copied into `PTM-T-7`'s `Consumers` field |
| `P-11` | PRMS has **no** custom `env` helper — `env` is Node's `process.env`, imported as a named binding — and there is an existing precedent for an env-overridable axios timeout. | `data-env` | `onecgiar-pr-server/src/toc/toc-results/toc-results.repository.ts:2` (`import { env } from 'node:process'`) · `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-text-mining.service.ts:43` (`timeout: Number(env.BILATERAL_AI_TEXT_MINING_TIMEOUT_MS \|\| 600_000)`) · `grep -rl "from 'node:process'" src --include='*.ts'` → 28 files; `grep -rl "from 'process'" src --include='*.ts'` → 35 files | `24a91da0e` | `DD-4`'s env-overridable timeout has no precedent and becomes a novel pattern to justify. Impact: Low | — |
| `P-12` | A shared `BaseEntity` supplies the five audit columns PRMS tables conventionally carry, and 50 entities extend it. | `existence` | `onecgiar-pr-server/src/shared/entities/base-entity.ts:3-38` (`is_active`, `created_date`, `last_updated_date`, `created_by`, `last_updated_by`) · `grep -rn "extends BaseEntity" src --include='*.ts' \| grep -v spec` → **50 hits** | `24a91da0e` | The new entities must declare all five columns inline, as `result_scaling_study_url.entity.ts` does. Impact: Low | — |
| `P-13` | `ScheduleModule` is registered globally and a cron precedent exists, **and** the existing admin-triggered sync controller carries **no auth guard**. | `existence` | `onecgiar-pr-server/src/app.module.ts:90` (`ScheduleModule.forRoot()`) · `onecgiar-pr-server/src/clarisa/clarisaCron.service.ts:12` (`@Cron(CronExpression.EVERY_8_HOURS, { disabled: EnvironmentExtractor.isLocal() })`) · `onecgiar-pr-server/src/clarisa/clarisa-connections/clarisa-connections.controller.ts:17-18` — only `@Controller()` + `@UseInterceptors(ResponseInterceptor)`, **no guard**, and `:37` `@Get('execute-task')` | `24a91da0e` | `DD-3` loses its "do not copy the Clarisa controller's auth posture" warning, which is the only thing keeping the fill trigger JWT-gated. Impact: **High** — but the mitigation is already in `DD-3` | — |
| `P-14` | On PT **staging** the documented contract holds (cold `mode=auto` draft ~23.1 s, `mode=auto` warm ~6.2 s, `mode=template&refresh=true` ~2.8 s — all `200`), while PT **DEV** returns `422` on `mode=template` and `refresh=true`; that specific combination does **not** reproduce on staging. | `data-env` | **`PTM-T-8` live capture, 2026-09-22** — `curl -m 40` against `https://seyxtu7vha.execute-api.eu-central-1.amazonaws.com/staging/api/prms/indicators/8006329bfd49/results` with `refresh=true&mode=auto` (200, 23.1 s), `mode=template&refresh=true` (200, 2.8 s — the exact DEV 422 trigger, staging does not 422 on it), and `mode=bogus` (422, 5.2 s, a genuine staging-native validation error used for the fixture since DEV is disqualified as a source). Full provenance: `onecgiar-pr-server/src/api/progress-tracker/fixtures/README.md` | `PTM-T-8` | `DD-6`'s target environment change is confirmed correct, and `PTM-AC-4`'s 422 case is confirmed as "the contract" (any 422, from any trigger, classifies `unavailable`) rather than a DEV-only drift. No decision overturned. Impact: Low | Fixtures committed: `onecgiar-pr-server/src/api/progress-tracker/fixtures/{pt-results.staging.json,pt-results-422.json}`, asserted by `fixtures-keys.spec.ts`. Owner: `PTM-T-8` — **closed** |

> **`P-5` was settled at the Phase 2 gate** (2026-09-22): the requester supplied the AWS account, profile, function and resource behind the 30 s / 29 000 ms readings, which is the primary-source detail citation rule (d) was waiting for. `PTM-T-2` still re-reads both values at implement time as a sanity check — that is now a guard, not a gate.
>
> **`P-14` is now `VERIFIED`** (2026-09-22, `PTM-T-8`): a live `curl` against PT staging reached the documented endpoint directly from this repository's runtime — no longer user-reported. Cold `mode=auto` returned `200` in 23.1 s with the full documented field set (`onecgiar-pr-server/src/api/progress-tracker/fixtures/pt-results.staging.json`); `mode=template&refresh=true` (PT DEV's exact `422` trigger) returned `200` on staging, confirming the DEV `422` is DEV-only drift and not the general contract. A staging-native `422` (via `mode=bogus`, upstream's own validation) was captured instead for the fixture (`pt-results-422.json`), since a PT DEV capture is disqualified outright. No design decision is overturned, because `422` classifies as `unavailable` under both readings.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/progress-tracker/` (new) · `api/results-framework-reporting/application/commands/create-result-from-framework/` (one added step) · `api/modules.routes.ts` · `app.module.ts` · `src/migrations/` · `serverless.yaml`
- **Client modules touched:** **none** (sibling child 2)
- **External integrations touched:** Progress Tracker Interoperability API (new, read-only) · ToC Integration DB `env.DB_TOC` (**read-only, unchanged** — `P-1`, `P-2`)

### 2.2 Sequence — proposals for one KPI

```
[child 2 UI, later]
  └── GET /api/progress-tracker/indicators/{tocIndicatorId}/results?max_results=3
        └── [JwtMiddleware + ThrottlerGuard]            (inherited, P-7)
              └── [ProgressTrackerController]
                    ├── ValidationPipe(whitelist, forbidNonWhitelisted)   -> 400 on unknown param
                    └── [ProgressTrackerService]
                          ├── mappingRepo.findOne({ tocIndicator, versionId })
                          │     └── miss OR match='none'  -> { status: 'not_found' }   (NO upstream call)
                          ├── HttpService.get(`${PT_INTEROP_BASE_URL}/api/prms/indicators/{ptId}/results`,
                          │                   { timeout: PT_TIMEOUT_MS, headers: X-API-Key? })
                          │     ├── 200        -> { status: 'ok', ...whitelisted payload }
                          │     ├── 404        -> { status: 'not_found' }
                          │     ├── 422 | 5xx | timeout | network -> { status: 'unavailable' }
                          │     └── (caught error never leaves the catch block)
                          └── returns envelope with statusCode 200 ALWAYS      (DD-1)
                                └── [ResponseInterceptor] -> HTTP 200
```

### 2.3 Sequence — provenance on create

```
[user presses "Create and continue"]
  └── POST /api/results-framework-reporting/create        (P-8: single unbranched chain)
        └── controller:344 -> service:637 -> handler:18
              ├── **[NEW] progressTrackerProvenance.validate()**  <- only when the block is present;
              │       400 before any row exists (route has no ValidationPipe)  (PTM-T-7)
              ├── createFrameworkResultEntity  -> createdResultId
              ├── linkFrameworkResultToc
              ├── frameworkResultTocIndicators
              ├── applyFrameworkResultAssociations           handler:42-46
              ├── **[NEW] progressTrackerProvenance.write()**  <- hook, handler:46
              │       no-op when payload carries no provenance  (PTM-R-14)
              └── return                                       handler:48
```

---

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `ProgressTrackerIndicatorMap` | `api/progress-tracker/entities/progress-tracker-indicator-map.entity.ts` | **New.** Extends `BaseEntity` (`P-12`) |
| `ProgressTrackerResultProvenance` | `api/progress-tracker/entities/progress-tracker-result-provenance.entity.ts` | **New.** Extends `BaseEntity` |

**`progress_tracker_indicator_map`** — one row per (ToC indicator, reporting version).

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` PK auto | |
| `toc_results_indicator_id` | `text` not null | The Integration `related_node_id` string, as `results_toc_result_indicators` already stores it |
| `toc_indicator_integration_id` | `bigint` null | The Integration primary key, when known — carried for re-resolution, not for lookup |
| `version_id` | `bigint` not null, FK → `version.id` | **Keyed on `version_id`, never `phase_year`** (`P-4`) |
| `pt_indicator_id` | `varchar(32)` null | Null when unmapped |
| `pt_program_id` | `varchar(32)` null | |
| `match_quality` | `varchar(16)` not null | `exact` \| `fuzzy` \| `none` |
| `match_score` | `decimal(5,4)` null | |
| `resolved_at` | `timestamp(6)` null | |
| + `BaseEntity` five | | `is_active`, `created_date`, `last_updated_date`, `created_by`, `last_updated_by` |

Unique key on (`toc_results_indicator_id`(255), `version_id`) — this is what makes the fill idempotent (`PTM-R-21`, `PTM-AC-11`).

**`progress_tracker_result_provenance`** — one row per result created from a proposal.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` PK auto | |
| `result_id` | `bigint` not null, FK → `result.id` | |
| `pt_result_key` | `varchar(64)` not null | The upstream `result_key` |
| `pt_evidence_fingerprint` | `varchar(128)` null | The cache key the duplicate rule will use |
| `pt_indicator_id` | `varchar(32)` null | Denormalized so provenance is queryable **by indicator** without joining the map (`PTM-R-13`) |
| `pt_environment` | `varchar(16)` null | `dev` \| `staging` \| `prod` |
| `pt_model` | `varchar(64)` null | |
| `pt_generated_at` | `timestamp(6)` null | |
| + `BaseEntity` five | | |

Index on (`pt_indicator_id`, `pt_result_key`) — the read pattern the grey-out follow-up needs.

### 3.2 Migrations

Two migrations, following the house pattern verified at `P-12` and in `1788445000000-CreateInnovationMergeSplitTable.ts`: `<13-digit-ms-timestamp>-<PascalName>.ts`, raw `queryRunner.query()` (480/481 files), `CREATE TABLE IF NOT EXISTS`, FKs added through a guarded helper that checks `information_schema.TABLE_CONSTRAINTS` first, and a `down` that **refuses to drop a table holding rows** before `DROP TABLE IF EXISTS`.

`npm run migration:check:ci` must be green; both migrations reversible.

### 3.3 CLARISA / external-data implications

None. No CLARISA cache table or endpoint is involved.

---

## 4. API Surface

### 4.1 New endpoints

| Field | `GET /api/progress-tracker/indicators/:tocIndicatorId/results` |
|---|---|
| **Version** | `api` |
| **Auth** | JWT — inherited, no new wiring (`P-7`) |
| **Role** | Any authenticated reporting user; no additional role gate |
| **Request** | Path `tocIndicatorId` (PRMS/Integration id). Query DTO: `max_results` (int 1–10, default 5), `refresh` (bool), `mode` (`auto` \| `template`). `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })` — the shape `cgspace/search` uses |
| **Response** | `{ status: 'ok' \| 'not_found' \| 'unavailable', indicator?, results?[], evidence_count?, generated_by?, source?, **`generated_at`?, `evidence_fingerprint`?** }` — upstream fields **re-projected through a whitelist DTO**, never spread verbatim. ⚠️ **Amended 2026-09-22:** the original six-key list dropped upstream top-level `generated_at` and `cache.evidence_fingerprint`, which `PTM-R-13` requires persisted — making that requirement unsatisfiable (same defect class as the `PTM-R-3` Pivot). `evidence_fingerprint` is **projected out of** upstream `cache`; `cache.hit` and `cache.cached_at` are **not** passed through, keeping the surface minimal |
| **HTTP status** | **Always 200** (`DD-1`) |
| **Errors** | `400` on validation only. No 4xx/5xx is produced from an upstream condition |
| **Telemetry** | Classified status, duration, numeric upstream status. **Never** host, URL, key, or body (`PTM-R-22`, `AC-9`) |

| Field | `GET /api/progress-tracker/programs/:programId/ready-counts` |
|---|---|
| Same auth, same envelope discipline, same always-200 rule. Query: `min_evidence` (int ≥ 0, default 1) |

| Field | `POST /api/progress-tracker/indicator-map/resolve` (fill trigger) |
|---|---|
| **Auth** | JWT — inherited (`DD-3`) |
| **Request** | `{ versionId?: number, programId?: string }` — defaults to the active reporting version |
| **Response** | `{ status, processed, exact, fuzzy, unmapped, skipped }` |

**`:programId` semantics — resolved 2026-09-22 (Leader), after `PTM-T-4` raised it:**

`:programId` is the **PRMS program identifier** (name or official code) that PRMS already holds, forwarded to the upstream unchanged. No mapping lookup, and none is needed:

- Guide §4.3 states the upstream path "accepts the program id **or its name**".
- The PT program id is `md5("PROGRAM|{name}")[:12]` (Guide §5) — **derived from the name**, so the name is the PRMS-native form and the hash is the PT-native one. Sending the name keeps the client on PRMS values, satisfying `PTM-R-3b`.

⚠️ **`progress_tracker_indicator_map.pt_program_id` is deliberately NOT read by this route.** It is **fill-time provenance** — a record of what `/resolve` returned alongside the indicator id (Guide §4.2) — kept for audit. It is **not dead code and not a missing wire-up**; `PTM-T-4` reasonably flagged it as a possible decomposition gap, and this note exists so the question is not re-opened. Were the ready-counts route ever to need the PT id (it does not, since the upstream accepts names), that column is where it would come from.
| **Notes** | Deliberately **not** modelled on `clarisa-connections.controller.ts:37`, which is unauthenticated (`P-13`) |

### 4.2 Bilateral / platform-report impact

**None.** No `/api/bilateral/*` or `/api/platform-report/*` payload is touched, so `AC-4` and the bilateral change log do not apply.

---

## 5. Server Workflow / Business Rules

1. **Mapping lookup precedes the upstream call.** An unmapped indicator, or one whose row is `match_quality='none'`, returns `not_found` **without** an HTTP call (`PTM-AC-2`). This is the cheapest correct answer and it keeps the throttle budget for real traffic.
2. **Status classification is total.** Every outcome maps to exactly one of three values; there is no fall-through. `422` joins `5xx`/timeout/network under `unavailable` (`PTM-AC-4`) because the upstream has already demonstrated it can return 422 for a documented call (`P-14`).
3. **Failures are primitives.** The caught Axios error never leaves its catch block; what escapes is `{ status, upstreamStatus?, durationMs }` — the `SourceFailure` contract at `cgspace-discovery.service.ts:48-60`, adopted verbatim.
4. **The fill routine walks the ToC indicator rows for one version**, sends the PORB texts to `/resolve`, and upserts on (`toc_results_indicator_id`, `version_id`). `match: none` writes a row with `pt_indicator_id = NULL` and `match_quality='none'` — an explicit unmapped record, never a candidate promoted to a resolution (`PTM-R-11`, `PTM-AC-10`).

   ⚠️ **`/resolve` contract correction — verified live 2026-09-22 (`PTM-T-5`, re-confirmed by the Leader).** There is **no top-level `score`** in the response. Observed top-level keys: `candidates`, `computed_indicator_id`, `indicator_id`, `match`, `program`, `program_id`. The score lives in **`candidates[].score`**, so `match_score` must be read as `candidates.find(c => c.indicator_id === data.indicator_id)?.score` — **never `candidates[0].score`**. On a live `match: fuzzy` the response carried **5 candidates**, so `candidates[0]` is "often right", which is precisely the silent-wrongness class `PTM-R-11` exists to prevent. `match_score` is `null` whenever `match === 'none'`, and `match: none` returns `indicator_id: null` **with a non-empty `candidates[]`** — confirmed live, which is why the falsifier fixture must carry candidates.
5. **The provenance step is a no-op without provenance.** It reads the optional payload block; absent, it returns immediately and the create path is byte-identical to today (`PTM-R-14`, `PTM-AC-13`).

---

## 6. Frontend Plan

**None.** This child ships no client artifact. `docs/ux-ui/design.md` is untouched. See sibling child 2.

---

## 7. Security & Authorization

| Concern | Position |
|---|---|
| Authentication | Inherited `JwtMiddleware` on `api/*path`; `progress-tracker` is **not** in the exclusion list (`P-7`). No new wiring, and none should be added |
| Rate limiting | Inherited global throttler, 100 req / 60 s (`P-7`) — this is also the answer to the parent's OQ-6 (who may press Refresh, how often) for the MVP |
| Secrets | `PT_INTEROP_BASE_URL` / `PT_INTEROP_API_KEY` read from `process.env` at call time (`P-11`); `X-API-Key` sent only when non-empty; neither ever logged (`AC-9`, `.cursorrules`) |
| Upstream identity | The **base URL and API key** never appear in a response (`PTM-R-3a`). The client addresses **PRMS ids only** (`PTM-R-3b`). The PT `indicator_id` **is permitted** inside `result_key` and `source.pt_url` (`PTM-R-3c`) — it is not a secret, and `PTM-R-13` requires `result_key` to be stored *(amended 2026-09-22, Pivot Record)* |
| Outbound PII | `X-Actor-Email` is **not** sent (`family.md` §4 OQ-5) |
| Cross-schema writes | Forbidden and gated by a grep (`PTM-R-12`, `P-2`) |

---

## 8. Performance & Capacity

Baselines were the measurements in `../family.md` §5.1 (`P-14`). **Re-measured live 2026-09-22** now that PT staging is reachable from this machine:

| Path | Recorded baseline | Observed live |
|---|---|---|
| cold `mode=auto` | 20.2 s | **23.1 s** (`PTM-T-8`, `refresh=true`) |
| cache hit, warm | 1.1 s | **0.67–0.89 s** (3 samples) |
| `mode=template` | 1.4 s | **0.66 s** |
| **first call after idle** | *not recorded* | **~3.5 s** — PT-side Lambda cold start |

The warm paths are **better** than recorded. Two refinements matter: the cold draft is ~3 s slower than baseline (see the margin note under `PTM-DD-4`), and the previously unrecorded **PT-side cold start** means the first call after an idle period costs ~3.5 s even on a cached path — which child 2's `PTB-R-20` (1.5 s first paint) does not currently allow for.

The call timeout is set **strictly below** the 29 s gateway ceiling with headroom for PRMS's own overhead — **25 s** proposed (`DD-4`), leaving ~4 s for the gateway and ~5 s of margin over the measured cold draft. It is env-overridable so the value can be tuned without a code change, following the `BILATERAL_AI_TEXT_MINING_TIMEOUT_MS` precedent (`P-11`).

Upstream caching is per evidence fingerprint and lives on the Progress Tracker side; PRMS adds no cache of its own in this child.

---

## 9. Observability

- The fill routine logs structured start/finish with per-outcome counts (`processed`, `exact`, `fuzzy`, `unmapped`, `skipped`) — `AC-8`.
- Proxy failures log classified status, duration and numeric upstream status only (`PTM-R-22`).
- No log line may contain the upstream host, URL, API key or response body (`AC-9`).

---

## 10. Testing Plan (forward-looking)

Server Jest throughout; no client or Cypress surface in this child. The full defect-class-to-gate mapping lives in `requirements.md` §9, including the two classes with **no** automated gate (`D-10` fuzzy mis-resolution → human spot-check; `D-11` TEST-VPC egress → accepted risk until D1 closes). Gates: server coverage ≥ 5/20/35/40, `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`, `npm run migration:check:ci`.

---

## 11. Backwards Compatibility & Migration Plan

Additive throughout. Two new tables, two new routes, one optional DTO block, one no-op-by-default handler step. The only change to existing behavior is the `serverless.yaml` `timeout:` declaration, which **aligns the repository with the already-deployed configuration** rather than changing it (`P-5`).

---

## 12. Design Decisions

### `PTM-DD-1` — Always HTTP 200; the classification lives in the payload

`ResponseInterceptor` sets the HTTP status from the service envelope, and `cgspace-discovery` uses that to return **502** when every source fails (`P-6`). This module deliberately **diverges**: it returns `statusCode: 200` in all three cases and carries `ok` / `not_found` / `unavailable` inside the response.

**Why the divergence is right here:** cgspace is a multi-source search where total failure is a genuine error; this is a single optional source whose absence is an expected, renderable state. Child 2's contract is a state machine, not an error handler, and a 502 would have to be un-thrown on the client to reach the same place. It also satisfies the constraint that PRMS return a clean `unavailable` rather than let the gateway cut the connection.

**Rejected:** mirroring the 502. It would make the failure indistinguishable from a PRMS fault in monitoring and would push error handling into the client.

### `PTM-DD-2` — The mapping is a PRMS table keyed on `version_id`

`toc_results_indicators` lives in `env.DB_TOC` and PRMS never authors ToC (`P-1`, `docs/trd/trd.md` §7), so the guide's §5 recommendation of a column on the ToC row is unavailable. The mapping is a PRMS table keyed on (`toc_results_indicator_id`, `version_id`).

**`version_id`, not `phase_year`** — `P-4`: two version rows can share a `phase_year` with different ToC phase ids, and `result` itself keys on `version_id`. A year-keyed table would silently collide across those rows.

**Rejected:** computing the id locally as `md5(...)[:12]`. ≈16 PORB rows collide on the five hashed fields and the upstream re-keys those siblings through a disambiguation table PRMS cannot see (Guide §5) — a local hash can point at the wrong KPI, which is the worst failure mode available here.

### `PTM-DD-3` — The fill is an authenticated admin-triggered endpoint, not a cron

`ScheduleModule` is registered and a cron precedent exists (`P-13`), but the **re-resolution trigger is an open question owned outside this spec** (`PTM-OQ-3`, Guide §8.2 P3) — a cron would have to invent a cadence nobody has agreed. An on-demand endpoint matches the actual cadence (once per reporting year, plus after an upstream re-seed) and leaves the cron as a later addition.

🛑 **It is explicitly not modelled on the existing precedent's auth posture.** `clarisa-connections.controller.ts:17-18` carries no guard at all. Ours sits under `/api`, inherits `JwtMiddleware` (`P-7`), and must stay there. This is the whole reason `P-13` is in the ledger.

### `PTM-DD-4` — A 25 s env-overridable call timeout, and an explicit `serverless.yaml` declaration

Strictly below the 29 s gateway ceiling (`PTM-R-7`), above the 20.2 s measured cold draft, env-overridable via `PT_INTEROP_TIMEOUT_MS` following `bilateral-ai-text-mining.service.ts:43` (`P-11`). `serverless.yaml` gains `timeout: 30` to match the deployed function, closing the drift in `P-5`.

**Dependency:** this decision rests on `P-5`, **verified firsthand by the Leader at execute time** (2026-09-22) — 30 s Lambda, 29 000 ms gateway, read directly from AWS. No longer a dependency on an open premise.

⚠️ **Margin note added 2026-09-22 after `PTM-T-8`'s live capture:** the observed cold `mode=auto` draft was **23.1 s**, not the 20.2 s originally recorded — leaving only **1.9 s** under this 25 s default. The upstream caps itself inside its own 29 s gateway and falls back to a template, so a 26–28 s upstream call would return *valid* content that PRMS would cut at 25 s and report `unavailable`. Raising the default toward **27 s** (still strictly below the ceiling, so `PTM-R-7` holds) would let PRMS receive that fallback. `PT_INTEROP_TIMEOUT_MS` is env-overridable, so this is tunable at deploy without a code change — **surfaced to the requester, not decided by the Leader**, since it revisits an approved value.

**Rejected:** the `cgspace-discovery` 8 s constant (far below a normal cold draft), and leaving `serverless.yaml` untouched (a deploy would revert to the framework default and break the feature silently).

### `PTM-DD-5` — Provenance is a dedicated table written at the end of the create handler

A dedicated table, not a column on `result` and not a parsed narrative tail: the grey-out and the duplicate rule need to query by indicator and `result_key`, and parsing prose is not a foundation for that (`PTM-R-13`). The write hooks at `create-result-from-framework.handler.ts:46`, after associations and before the return, where `createdResultId` and `user` are both in scope and the result row is confirmed to exist — the single unbranched path a user's Create actually travels (`P-8`), with one production caller (`P-9`).

### `PTM-DD-6` — `PT_INTEROP_BASE_URL` targets PT **staging** for PRMS TEST

Locked at family level (OQ-3) and independently confirmed by `P-14`: PT DEV returns 422 on documented calls while staging matches the contract.

### Reversion challenge (Step 2.3)

**No design decision in this spec reverts, removes, disables, or inverts already-delivered behavior.** Every change is additive: two new tables, a new module, two new routes, an optional DTO block, a no-op-by-default handler step, and a `serverless.yaml` line that aligns the repo with what is already deployed. `PTM-DD-1`'s divergence from `cgspace-discovery` is a *different choice in new code*, not a change to the shipped cgspace behavior. **Trigger does not fire; no challenge run.**

---

## 13. Budget (Step 2.4) and depth re-check

| Metric | Estimate |
|---|---|
| Expected tasks | **9** |
| Expected LOC | **≈ 2,350** (≈ 950 implementation, ≈ 1,400 tests — the ~60 % test share this repo consistently shows) |
| Expected review rounds | **2** |

🛑 **Depth escalation recommended: `Standard` → `Full`.** `requirements.md` was drafted at Standard before the design existed. The finished design carries **two migrations, a new external integration, a secret-bearing configuration surface, and a change to the create path** — four of the five conditions the depth table names for Full. The documents already contain what Full asks for (alternatives and rejections per DD, rollout and rollback, observability, risk register), so this is a label correction plus the `requirements.md` header, not a rewrite. **Flagged for your decision at the Phase 2 gate.**

These three numbers are a **tripwire, not a cap**: `/akili-execute` compares actuals and escalates rather than silently continuing.

---

## 14. Open Gaps & Follow-ups

| # | Gap | Owner |
|---|---|---|
| `PTM-OQ-3` | Who triggers re-resolution after an upstream PORB re-seed | Jose + PRMS (Guide §8.2 P3). Does not block — `DD-3` makes the routine re-runnable on demand |
| **Watch item for execute** | 🛑 `tocIndicatorId` (path param) vs `related_node_id` (map key): `PTM-T-3` must resolve **unambiguously** which identifier the client sends and how the lookup joins it — the Integration primary key `toc_results_indicators.id`, or the `related_node_id` string that `results_toc_result_indicators` stores. `design.md` §3.1 carries both columns on purpose; the resolution belongs to `T-3`, **not** to a re-opened specify | `PTM-T-3` |
| ~~`P-14`~~ | ~~Upstream staging contract is user-reported~~ — **closed 2026-09-22**, `PTM-T-8` live-captured staging directly; deployed confirmation still waits on gate D1 | `PTM-T-8` |
| `D-10` | A `fuzzy` mapping can resolve to the wrong sibling KPI with no automated detection | Human spot-check at the HITL pause (`requirements.md` §9) |
| `D-11` | TEST-VPC egress unverifiable from CI | Accepted risk until family gate D1 closes |
| — | Greying out used proposals; the ready-counts badge | Parent `S-out-2`, `S-out-3` |

---

## Required cross-references

- `./requirements.md` · `./proposal.md` · `../family.md` · `../proposal.md`
- `docs/prd.md` (`US-S1`, `US-A4`; `AC-3`, `AC-5`, `AC-8`, `AC-9`) · `docs/trd/trd.md` (§5 W9, §7, §8) · `docs/infrastructure.md`
- `../source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.docx` (Guide §4, §5, §7)
- `.cursorrules`
