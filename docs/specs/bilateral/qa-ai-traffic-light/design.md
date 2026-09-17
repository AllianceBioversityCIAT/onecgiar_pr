# Design — QA AI traffic light on "Submit for review" (W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/qa-ai-traffic-light/` |
| Module code | `BIL-QAI` |
| Depth | **Full** |
| Approval Mode | gated |
| Status | **amended v0.2 — approved** (owner, execution gate 3, 2026-09-16). Base text approved at the Phase 2 gate (owner, 2026-09-16; Phase 3 tasks approved same day). The v0.2 amendment covers §3.1, §3.2, §4.1/§4.2, §4.5, §5, §6.2/§6.3, §10, the Budget table, new `BIL-QAI-DD-11` / `DD-12` and §13. Amendment record: `execution.md` § *Pivot Record: contract v0.2*. |
| Owner | Juan David Delgado |
| Date | 2026-09-16 |
| Requirements | `./requirements.md` (approved Phase 1 gate, owner, 2026-09-16) |
| Baseline | `docs/trd/trd.md` — W1, W6, W8, ADR-004, QAS-3/6/9/10/12, §4 conventions, §8 security · `docs/ux-ui/design.md` — §6, §7, §8, §10, DD-12 · `docs/prd.md` — AC-2, AC-4, AC-9 |
| Authoritative external docs | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (change-log row) · **AI contract v0.2** — repo copy `docs/bilateral-module/integration-contracts.md` § *Quality assessment (outbound)* (rewritten by `BIL-QAI-T-1b`), vault `CGIAR/W3/w3-bilateral-module/w3-p2-3150-ai-traffic-light-qa-on-submit.md` |
| Code anchors (scouted 2026-09-16) | Server: `bilateral-center.service.ts:1472` `submitForReview`, `:1572` `assertCenterPermission` (private), `bilateral-center.controller.ts:86`; `results.service.ts:3647` `getBilateralResultById` (what the form and the review drawer read); `bilateral.service.ts:3606` `enrichBilateralResultResponse`; `shared/constants/result-status.enum.ts` `ResultStatusData`; `result-review-history.entity.ts` (`ReviewActionEnum` APPROVED/REJECTED/UPDATE); `results_kp_metadata.source` = `'CGSpace'` vs WoS; `evidence_sharepoint.is_public_file`; `bilateral.module.ts:88` already imports `HttpModule`. Client: `bilateral-creation.service.ts:453` `submitResult` (direct `http.patch`, then `resultStatusId.set(PendingReview)`); `bilateral-result-creator.component.{ts:397,html:94-108}`; `shared/services/api/bilateral-api.service.ts`; `shared/components/pr-dialog/pr-dialog.component.ts` (inputs `visible, modal, header, showHeader, closable, closeOnEscape, dismissableMask, styleClass`; outputs `visibleChange, onHide`); `shared/directives/before-unload-warning.directive.ts`; route `result/:id` in `shared/routing/routing-data.ts:740` (no guards). |
| Delegation record | Code scout: Explore subagent (synchronous return, ~4 min). Reversion challenge (§12 `BIL-QAI-DD-9`): Explore subagent, one question. |

## 1. Summary

The feature inserts one **assessment step** between the centre form's Submit button and the existing `submitForReview` transition. A new server orchestrator builds a **definitions-only** document from the persisted result, calls the AI service synchronously (60 s window) or applies the Knowledge Product rule in code, persists the outcome as one `bilateral_quality_assessments` row keyed by a content hash, and returns it. The client renders it in one `app-pr-dialog` with a working state and a verdict state; only **Submit anyway** calls the existing submit endpoint, now with an optional decision body. The biggest accepted trade-off: a synchronous HTTP call held up to 60 s (LITE tier, no worker, no queue) in exchange for zero new infrastructure and a flow that survives a closed tab because the server persists regardless of the client.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/bilateral` (centre controller + new `services/quality-assessment/` folder, new entity + migration), `api/results` (additive `quality_assessment` block in `getBilateralResultById`), `api/bilateral` `findOne` (additive block on the external detail, ADR-004).
- **Client modules touched:** `pages/bilateral` (result creator, new dialog component, new feature service; **(v0.2)** the Innovation development type-specific section, `T-12`), `shared/services/api/bilateral-api.service.ts` (three methods; `PATCH_innovationDev` already exists and is reused unchanged).
- **External integrations touched:** new outbound HTTPS call to the AI quality-assessment endpoint (Daniela). CLARISA, ToC, SharePoint untouched (read-only via existing repositories).

Tier: **LITE** (Robust-vs-Lite gate). No scenario needs a worker, a queue or a new deployable; the meeting fixed "no agents, ~30 s" and the PO allows 60 s. Escalation trigger recorded, not taken: if p95 AI latency in TEST exceeds the window, revisit as async job (proposal Option B) via ADR.

### 2.2 Primary flow — Submit with assessment

```
[Centre user]  Submit for review
  │
  ▼
[bilateral-result-creator.component]  guards: read-only · unsaved sections · invalid fields  (unchanged)
  │  qa.run(resultId)
  ▼
[BilateralQualityAssessmentService (client)]  state=running · dialog opens (working state) · beforeunload armed
  │  POST /api/bilateral/center/quality-assessment/:resultId
  ▼
[BilateralCenterController → BilateralQualityAssessmentService (server)]
  ├─ preconditions (same as submitForReview): bilateral · active · Editing|Draft · centre permission · SP assigned
  ├─ running-row lock: if a `running` row younger than window+grace exists → 202 {status: running, id}
  ├─ payload = PayloadBuilder.build(resultId)            ← definitions only, five sections
  ├─ hash = sha256(canonical(payload))
  ├─ if latest row.status ∈ {completed, skipped_kp_rule} and row.hash == hash → return it (is_current=true)
  ├─ insert row {status: running, hash}
  ├─ if KP → KpRule.evaluate(metadata) → row.status = skipped_kp_rule, verdicts filled, no HTTP
  │  else  → AiClient.assess(payload, 60 s) → GreyRule.apply(response, payload) → row.status = completed
  │          on timeout/5xx/malformed → row.status = unavailable
  └─ 200 {assessment}
  ▼
[client]  state=ready|unavailable · dialog switches to verdict / unavailable state
  │
  ├─ Make adjustments / X / Esc / backdrop → PATCH? no. Nothing sent. Client stamps nothing; dialog closes.
  └─ Submit anyway → PATCH /api/bilateral/center/submit-for-review/:resultId  body {assessment_id, decision}
        ▼
     [submitForReview]  existing checks → validate assessment (same result · hash == current · not running · undecided)
        ├─ transaction (unchanged): status 5 · external_submitted_* · review-history row (comment += verdict + decision)
        ├─ stamp row: decision, decided_at, had_outstanding_flags (derived server-side from stored verdicts)
        └─ emitBilateralSubmittedNotification (unchanged)
```

### 2.3 Secondary flows

| Flow | Behaviour |
|---|---|
| **Reopen after closing the tab** | On result load the client calls `GET …/quality-assessment/:resultId/latest`. If `is_current` and status ≠ running → rail chip "Quality check available"; Submit opens the stored verdict without a new POST. If status = running → dialog opens in working state and polls `latest` every 3 s until terminal (≤ window+grace). |
| **Double submit** | Second POST while a `running` row is young returns 202 with the same id; the client treats it like reopen-while-running (poll). |
| **Unavailable** | Client shows the unavailable state with the two exits; Submit anyway sends `decision: submitted_without_check`. Server validates the referenced row is `unavailable` for that decision value. |
| **Service not configured** | Server short-circuits before building the payload: row `unavailable`, `reason: not_configured`; no outbound call. |
| **Stale assessment on submit** | Server recomputes the hash; mismatch → 400 `Quality assessment is out of date. Submit again to run a new check.` No transition. |

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `BilateralQualityAssessment` (new) | `api/bilateral/entities/bilateral-quality-assessment.entity.ts` | New table `bilateral_quality_assessments` |
| `Result`, `ResultReviewHistory` | — | No schema change. Review-history `comment` text gains the verdict summary. |

`bilateral_quality_assessments` — conceptual column list (TypeORM decorators written at task time):

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK auto | |
| `result_id` | bigint, FK `result.id`, indexed | |
| `version_id` | bigint, nullable | phase the result belonged to at run time |
| `content_hash` | char(64) | sha256 hex of the canonical payload |
| `contract_version` | varchar(16) | `0.2` |
| `status` | varchar(24) | **PRMS's own** outcome: `running` · `completed` · `unavailable` · `skipped_kp_rule` |
| `ai_status` | varchar(16), nullable | **(v0.2)** the AI's own `status` verbatim: `completed` · `partial`. `null` for KP rows, `unavailable` rows that never got an answer, and every pre-v0.2 row |
| `degraded_reason` | varchar(255), nullable | **(v0.2)** the AI's plain-language sentence for `partial` or `unavailable`. Truncated to 255 on write; never contains a host or a body (the client sanitises before persisting) |
| `unavailable_reason` | varchar(32), nullable | `timeout` · `http_error` · `malformed` · `not_configured` · **`ai_unavailable` (v0.2 — the AI answered well-formed with `status: "unavailable"`)** |
| `overall_verdict` | varchar(8), nullable | `green` · `amber` · `red` · `grey` |
| `overall_score` | tinyint, nullable | 0–100 verbatim |
| `overall_summary` | text, nullable | |
| `sections` | json | five keys → `{verdict, score?, comments, issues[], strengths[]}`; `verdict` may be `grey` from v0.2 |
| `evidence` | json | array → `{index, verdict, reason}` after grey rule |
| `criteria_version` | varchar(64), nullable | echoed from the AI |
| `elapsed_ms` | int, nullable | |
| `decision` | varchar(32), nullable | `submitted_anyway` · `submitted_without_check` · `adjusted` |
| `had_outstanding_flags` | tinyint, nullable | derived server-side at decision: any section or overall ∈ {amber, red} |
| `decided_at` | datetime, nullable | |
| `created_by` | int, FK `users.id` | |
| `created_at` | datetime, default CURRENT_TIMESTAMP | **set by SQL**, never by a JS `Date` (vault rule: mysql2 serialises local time) |

Index: `(result_id, created_at DESC)`. No soft-delete: rows are audit history and never deleted (AC-7 spirit).

`decision = adjusted` is written only when the client explicitly reports Make adjustments (fire-and-forget `PATCH …/quality-assessment/:id/decision`? **No** — see `DD-6`: adjustments are *not* stamped; an undecided row means "the user did not submit from it"). Column keeps `adjusted` reserved for a future explicit stamp.

### 3.2 Migrations

- Generate: `npm run migration:generate --name=BilateralQualityAssessments` after the entity exists; **prune** the generated file to the one table (memory rule: the generator emitted 27 tables for one column once).
- Name pattern: `src/migrations/<epochMillis>-BilateralQualityAssessments.ts`. Reversible `up`/`down` (drop table).
- `npm run migration:check` green before the server task group closes. The owner runs the migration per environment.

**Second migration (v0.2, `BIL-QAI-T-2b`).** The v0.2 columns land as a **separate additive migration**, not by editing the first one: `T-2`'s migration is already generated and queued for the owner's `migration:run`, and rewriting a migration that may already have run in a dev DB is how environments diverge. `AddAiStatusToBilateralQualityAssessments` adds `ai_status varchar(16) NULL` and `degraded_reason varchar(255) NULL` to `bilateral_quality_assessments` and nothing else; `unavailable_reason` needs no DDL because it is a `varchar(32)` with the value set in application code, so `ai_unavailable` is a code-level enum addition only. Same discipline: `migration:generate`, prune to this one table, reversible `down`, owner runs it.

### 3.3 CLARISA / external-data implications

None. Label resolution reads existing CLARISA cache tables and result associations through repositories already injected in `BilateralCenterService` / `BilateralService`.

## 4. API Surface

All three under `/api/bilateral/center/*` → JWT middleware (route hangs off `/api/`); centre permission enforced in service.

### 4.1 `POST /api/bilateral/center/quality-assessment/:resultId`

| Field | Value |
|---|---|
| Version | `api` |
| Auth | JWT (middleware) + `assertCenterPermission` (lead-centre role) |
| Request | no body |
| Response 200 | `AssessmentResponseDto`: `{ id, result_id, status, ai_status, degraded_reason, is_current: true, contract_version, overall: {verdict, score, summary}, sections: {...}, evidence: [...], criteria_version, elapsed_ms, unavailable_reason, created_at }`. **(v0.2)** `ai_status: 'completed' \| 'partial' \| null` and `degraded_reason: string \| null` are always present as keys, `null` when they do not apply; `sections.<key>.verdict` may be `grey`. |
| Response 202 | `{ id, status: 'running', is_current: true }` when a young running row exists (client polls `latest`) |
| Errors | 400 result not bilateral / not Editing-Draft / no SP · 403 centre permission · 404 result. No AI host, key or body in any message. |
| Telemetry | one line `event=bilateral_quality_assessment result_id=… status=… ai_status=… overall=… elapsed_ms=… criteria_version=…`. **(v0.2)** `degraded_reason` is deliberately **absent** from the line: it is free text from an external service (AC-15). |

### 4.2 `GET /api/bilateral/center/quality-assessment/:resultId/latest`

| Field | Value |
|---|---|
| Auth | JWT + `assertCenterPermission` |
| Response 200 | same DTO as above (including `ai_status` / `degraded_reason`) **plus** `is_current: boolean` (recomputed hash == row.hash), or `{ latest: null }` |
| Errors | 403 · 404 |
| Notes | The hash recomputation reuses the builder; cost is one payload build (bounded by QAS-3). Polling cadence 3 s only while `running`. |

### 4.3 `PATCH /api/bilateral/center/submit-for-review/:resultId` (modified, additive)

| Field | Value |
|---|---|
| Request DTO (new, optional) | `SubmitForReviewDto { assessment_id?: number; decision?: 'submitted_anyway' \| 'submitted_without_check' }` — `class-validator`, both optional, `whitelist: true` |
| Behaviour without body | identical to today (compat for any other caller) |
| Behaviour with body | validate row: same `result_id`, status ≠ running, `decision` undefined, hash == current; `submitted_without_check` requires status `unavailable`; `submitted_anyway` requires `completed` or `skipped_kp_rule`. **(v0.2)** an AI `partial` run is stored as `status = completed`, so it submits as `submitted_anyway` — the decision vocabulary is unchanged and `submitted_without_check` keeps meaning "no verdict existed". Then existing transaction + stamp + review-history comment `Submitted for review by the reporting center — quality check: <overall> (<decision>)`. |
| Errors | 400 `Quality assessment is out of date…` · 400 assessment/result mismatch · 400 decision/status mismatch |

### 4.4 Additive read blocks

| Read | Change |
|---|---|
| `GET /api/results/bilateral/:resultId` (`results.service.ts:3647`, what the form **and** the review drawer read) | `+ quality_assessment: AssessmentResponseDto \| null` (latest row, any status except running) |
| `GET /api/bilateral/:id` (`bilateral.service.ts` `findOne` → `enrichBilateralResultResponse`) | `+ data.quality_assessment` same shape, `null` when absent. **Change-log row** in `bilateral-result-summaries.en.md`. Additive only (ADR-004, AC-4). |

### 4.5 Outbound contract (AI service) — **v0.2** summary; the field-by-field copy lives in `docs/bilateral-module/integration-contracts.md` (`BIL-QAI-OQ-1` → resolved: integration-contracts.md)

This section is the *shape*; the contract copy is the authority and is rewritten by `BIL-QAI-T-1b`. v0.2 supersedes v0.1 in place — no PRMS code and no AI endpoint runs v0.1 after the pivot (`BIL-QAI-DD-11`).

**Request** — `POST {BILATERAL_AI_QUALITY_URL}/prms/quality-assessment`, header `X-API-Key`, JSON body:

```
contract_version: "0.2"
request_id:       uuid                       ← identifies this call, not the result
user_id:          authenticated user email   ← transport metadata; never persisted, hashed or logged
result:           { type, reporting_phase, reporting_center, primary_science_program }
sections:         { general_information, contributors_and_partners, geographic_location, evidence[], type_specific }
impact_areas:     [ { name, score, subcomponents[] } ]   ← NEW, sibling of `sections`, optional
constraints:      { timeout_seconds }
```

`impact_areas` is deliberately **not** a sixth section key: the five section keys are the five form sections and consumers already key off them. Semantics: optional; `[]` or absent means the result claims no impact area, which is **not grey and carries no penalty** — the AI must not raise an issue for it (owner decision, 2026-09-16). `score` is the visible tag label, `(0) Not Targeted` | `(1) Significant` | `(2) Principal`; `subcomponents` is non-empty only where the form populates it (Principal).

**Evidence ↔ impact areas.** The link is `evidence[].tags`, drawn from the closed vocabulary **Gender · Youth · Nutrition · Environment & biodiversity · Poverty**. There is no climate evidence tag in the form, so the Climate pillar can appear in `impact_areas` but can never be linked to an evidence item (GAP-6).

**`sections.type_specific`** — `{ type, fields }` where `fields` is a **fixed per-type set of English labels**, the visible text of the form field. Numbers live only inside typed objects; nothing numeric is ever sent as prose. `null` / `[]` under a mandatory label means "the user left it empty" — the label is never dropped.

| Result type | `fields` |
|---|---|
| Policy change | `"Policy type": str\|null` · `"Policy stage": str\|null` · `"Implementing organizations": string[]` · `"USD amount": { amount: number\|null, status: str\|null }` |
| Innovation use | `"User types": string[]` (actor type names; the free-text case is sent as `"Other: <text>"`) · `"Number of people using": { total, women, men, women_youth, men_youth }` · `"Other quantitative measures": [{ unit_of_measure: str, quantity: number\|null }]` · `"Investment (USD)": { total: number\|null }` |
| Capacity sharing | `"Number of people trained": { total, female, male, non_binary, unknown }` · `"Length of training": "Long-term"\|"Short-term"\|null` · `"Delivery method": str\|null` · `"Implementing organizations": string[]` |
| Innovation development | `"Innovation typology": str\|null` · `"Readiness level": str\|null` (existing `Level N — name` composition) · `"Innovation developers": str\|null` |
| Knowledge product | unchanged from v0.1 — **never sent to the AI** (`R-9`), still built so the content hash covers KP content |
| Other output · Other outcome | `fields: {}` |

Notes the AI side depends on:

- **`Length of training` is one value per result**, not a per-person split: the bilateral form stores a single `training_length` term (`long-term` / `short-term`) on the result.
- **`Delivery method`** also feeds the geography rule: a virtual delivery means geography is not required, so a thin Geographic location section must not be graded down when delivery is virtual.
- **Innovation use carries no non-binary or unknown counts** — those columns do not exist (GAP-7). Its object therefore splits by women/men and youth only. A row saved without age-and-sex disaggregation contributes its `how_many` to `total` and to nothing else, so the parts can legitimately sum to less than the total.
- **`Investment (USD)`** is the sum of `kind_cash` across the three budget sources the form exposes (initiative, bilateral project, partner); there is no innovation-use-specific USD column, and the value is `null` when no budget row exists.

**Labels are frozen in code.** One exported constant per result type is the single source of truth for `fields` keys; the builder, the fixtures and the contract copy all read from it, and the Reviewer greps that the spec fixtures quote the constant rather than string literals (`AC-16`). A change to a form label is a contract break: bump `contract_version`, update the constant and fixtures, notify Daniela — the AI validates mandatory labels strictly and answers with a specific error when one is missing or renamed.

**Response** — `request_id`, `criteria_version`, **`status: "completed" | "partial" | "unavailable"`**, **`degraded_reason: string | null`** (both required in v0.2), `overall {verdict, score?, summary}`, `sections {<key>: {verdict, score?, comments, strengths[], issues[]}}`, `evidence[] {index, verdict, reason}`.

- `sections.<key>.verdict` ∈ `green | amber | red | **grey**` — grey means "not evaluated", the same meaning it has on an evidence item, and never counts toward the overall.
- `overall.verdict` stays `green | amber | red`; the AI owns its derivation and PRMS does not replicate it.
- `degraded_reason` is a plain-language sentence for the user. PRMS renders it verbatim as text and stores it truncated to 255 characters; if the AI ever puts a host, URL or body in it, the client strips it before persisting (NFR *Privacy / secrets*, W8, AC-9).

**PRMS status mapping** (`ai_status` is the AI's word, `status` is ours):

| AI `status` | Row `status` | Row `ai_status` | Row `unavailable_reason` |
|---|---|---|---|
| `completed` | `completed` | `completed` | `null` |
| `partial` | `completed` | `partial` | `null` |
| `unavailable` | `unavailable` | `null` | `ai_unavailable` |
| *(no usable answer: timeout, non-2xx, malformed, not configured)* | `unavailable` | `null` | `timeout` · `http_error` · `malformed` · `not_configured` |

- Env: `BILATERAL_AI_QUALITY_URL`, `BILATERAL_AI_QUALITY_TIMEOUT_MS` (default 60000), key from `MICROSERVICE_API_KEY` (existing). Listed in server `README.md` → Environment. Unchanged by v0.2.

## 5. Server Workflow / Business Rules

**Folder:** `api/bilateral/services/quality-assessment/` — `bilateral-quality-assessment.service.ts` (orchestrator), `bilateral-quality-payload.builder.ts`, `bilateral-quality-assessment.client.ts`, `bilateral-quality-rules.ts` (pure: grey rule, KP rule, hash, outstanding flags), `dto/`, plus `entities/bilateral-quality-assessment.entity.ts` and `repositories/bilateral-quality-assessment.repository.ts` one level up.

**Controller** (`bilateral-center.controller.ts`): three thin handlers; Swagger `@ApiOperation` on each; `@UserToken()` for identity as the sibling routes do.

**Orchestrator** — `assess(user, resultId)`:
1. Preconditions: duplicate the four checks `submitForReview` runs (status, permission, SP) by extracting them into a shared private `assertSubmittable(user, resultId)` used by both methods — refactor, not new logic. `assertCenterPermission` becomes callable by the orchestrator (move both helpers to a small `BilateralCenterAccessService` or make the orchestrator a collaborator of `BilateralCenterService`; **decision `DD-5`**: collaborator — the orchestrator is injected into `BilateralCenterService`, which owns the preconditions, so the permission logic keeps one home).
2. Build payload → hash. Short-circuit on current completed row.
3. Insert `running` row inside a short transaction that first checks for a young running row (`created_at > NOW() - INTERVAL (window+grace) SECOND`, computed in SQL). Returns 202 if found.
4. Branch KP vs AI (below). Update the row to its terminal state. The update happens even if the HTTP client aborted the request (Nest keeps executing; no `req.on('close')` handling).
   *(v0.2)* The terminal state comes from the mapping table in §4.5: an AI `completed` or `partial` writes `status = completed` plus `ai_status` and `degraded_reason`; an AI `unavailable` writes `status = unavailable`, `unavailable_reason = 'ai_unavailable'` and keeps `degraded_reason`; every no-answer outcome keeps its existing reason and leaves both new columns `null`. The KP branch never sets them.
5. Log one line. Return the DTO.
   *(v0.2)* The log line gains `ai_status=…`; `degraded_reason` is **not** logged — it is free text from an external service, and the log rule is ids, status, elapsed and colours only (AC-15).

**Payload builder** — projects the **enriched detail** to labels. Source of truth `DD-2`: `BilateralService.findOne(resultId)` (already returns labels next to ids for ToC, institutions, geography, projects, KP summary, type-specific summaries per the payload contract) plus `getBilateralResultById` blocks where the external detail lacks a form field (lead contact person, evidence tags, type-specific questionnaire labels). Per-section mappers return plain objects; a final **denylist pass** strips any key matching `/_id$|^id$|_code$/` and any value that is a bare integer outside an allowlist of numeric-by-nature labels (years, counts, percentages) — the fixture test asserts the pass, the mappers do the real work. Evidence mapper: `source = is_sharepoint ? prms_repository : url`; `visibility = is_sharepoint ? (is_public_file ? public : private) : public`; private ⇒ `link: null`, no `sp_*` fields. Type-specific mapper per `ResultTypeEnum`; unknown type ⇒ `{ type, fields: {} }`.

**Payload builder — v0.2 amendments** (`BIL-QAI-T-4b`):

- **Label constants.** One exported `const` per result type (e.g. `POLICY_CHANGE_FIELD_LABELS`), `as const`, living next to the type-specific mappers. Every mapper builds `fields` by indexing its constant; the fixtures and the contract copy quote it. This replaces v0.1's flat, hand-written labelled fields (`"Number of women trained"` and friends), which had no single source of truth and no way to detect drift.
- **Typed values.** Counts and amounts become objects per §4.5. Sources: Capacity sharing `male_using / female_using / non_binary_using / has_unkown_using` with `total` **computed** (there is no total column); `training_length.term` mapped to `Long-term` / `Short-term`; `delivery_method.name`; `on_behalf_organizations[]`. Innovation use: `result_actors` rows summed for `women / men / women_youth / men_youth`, and a row saved with `sex_and_age_disaggregation = false` contributes its `how_many` to `total` only; `actor_type.name`, with the free-text variant (id 5) sent as `"Other: <text>"`; `result_ip_measures` → `[{unit_of_measure, quantity}]` (the **list**, not just the first row — v0.1's builder read `measures[0]`); `"Investment (USD)".total` = Σ `kind_cash` over `initiative_budget[] / bilateral_project_budget[] / partner_budget[]`, `null` when all three are empty. Policy change: `policy_type.name`, `policy_stage.name`, `policy_implementing_organizations[]`, `{amount, status: amount_status_label}`. Innovation development: typology, the existing `Level N — name` readiness composition, and `innovation_developers` **verbatim or `null`** — the mapper must never fall back to the lead contact person (`R-15`; the fallback lives in the form and the ingest handler and is removed by `T-12`).
- **Impact-areas mapper.** Reads the per-pillar tag levels the result already carries from Section 1: `BilateralService.findOne` → `dac_scores.<pillar>.tag_title` for the visible `(0)/(1)/(2)` label and `impact_area_names[]` for the sub-components (populated only at Principal), with `ResultsService.getBilateralResultById` → `impactAreaScores[] {impact_area, name}` as the cross-check for pillar naming. Emits one entry per pillar that has a tag level, `[]` when none. Sits at payload root next to `sections`, and **inside the content hash** — re-tagging a pillar must invalidate a stored verdict.
- **Evidence tags vocabulary.** The five booleans `gender_related · youth_related · nutrition_related · environmental_biodiversity_related · poverty_related` map to `Gender · Youth · Nutrition · Environment & biodiversity · Poverty`. There is no climate flag; the v0.1 contract example `["Gender","Climate"]` was wrong and is corrected by `T-1b` (GAP-6).
- **Denylist pass unchanged.** The typed objects are all label-keyed or plain-word-keyed (`total`, `amount`, `unit_of_measure`), so none of them trips `/_id$|^id$|_code$/`; their numeric values are counts and amounts, already inside the numeric-by-nature allowlist.

**Hash** — sha256 over `JSON.stringify` of the payload with keys sorted recursively and `request_id`/`constraints` removed.

**AI client** — `HttpService.post` with `timeout` from env, `X-API-Key`, `Content-Type: application/json`; maps: Axios timeout / `ECONNABORTED` → `timeout`; non-2xx → `http_error`; 2xx with body failing a light schema check (required keys, verdict enum) → `malformed`. Never logs bodies (`Logger` lines carry ids, status, elapsed). Missing URL/key → `not_configured` before any call.

**AI client — v0.2 schema check** (`BIL-QAI-T-5b`): `status` and `degraded_reason` join the required keys (`status` ∈ `completed | partial | unavailable`, `degraded_reason` a string or `null`); the **section** verdict enum widens to `green | amber | red | grey` — v0.1's check rejected a grey section as `malformed`, which under v0.2 would discard a perfectly good verdict; `overall.verdict` stays on the three-colour enum. The outcome the client returns carries `ai_status` and `degraded_reason` through to the orchestrator, alongside the existing `score` sanitisation (integer 0–100 or `null`). `degraded_reason` is truncated to 255 characters and stripped of anything that looks like a URL or host before it leaves the client, so a careless AI-side message cannot become a leak. Unknown response keys stay ignored (forward compatibility, unchanged from v0.1).

**Grey rule** (pure) — for each payload evidence item with `visibility: private` or `link: null`, force the matching response entry's `verdict = grey` with reason `Private repository file — not evaluated` (or keep the AI's grey reason when it already says blocked). **Matching is by the response item's `index` (the contract's join key), never by array position**; a payload item with no response entry gets a grey entry appended (`{index, verdict: grey, reason}`), and response entries whose `index` matches no payload item are dropped. Section verdicts are **not** recomputed (the AI owns them; `R-4`). *(Amended 2026-09-16 at execution gate 1 — owner approval; supersedes the literal `evidence[i]` wording; applied in `BIL-QAI-T-6` on the rule shipped by `T-3`.)*

*(v0.2)* A **section** verdict of `grey` passes through untouched: the grey rule operates on evidence items only, and `QualityVerdict` already includes `grey`, so `T-3`'s shipped rule needs no change for this. `hasOutstandingFlags` is likewise unchanged — it counts `amber` and `red` at section and overall level, so a grey section neither raises nor clears a flag.

**KP rule** (pure, table-driven) — input: `{ is_melia, knowledge_product_type, cgspace: {year, is_isi, is_peer_reviewed, accesibility} | null, wos: {...} | null }`.
- `!is_melia && type !== 'Journal Article'` → `green`, rationale "Auto-validated: repository product that is neither MELIA nor a journal article".
- `type === 'Journal Article'` and both rows present and `year`, `is_isi === true`, `is_peer_reviewed === true`, `accesibility` all agree → `green`, rationale lists the four matched fields.
- otherwise → `grey`, rationale names the missing row or each mismatching field.
Sections: all five set to the overall verdict with the same rationale; evidence: KP evidences listed `grey` "not assessed for knowledge products". `status = skipped_kp_rule`. **No outbound call** (test asserts `HttpService.post` not invoked).

**Outstanding flags** (pure) — `had_outstanding_flags = overall ∈ {amber, red} || any section ∈ {amber, red}`; computed at submit time from the stored row, never from the client.

**Submit** — `submitForReview(user, resultId, body?)`: existing flow; when `body.assessment_id` present, `validateForSubmit(row, resultId, currentHash, decision)` before the transaction; stamp inside the same transaction as the status change (one commit → either both or neither); comment enriched. Cites W1 (server-side pre-submit validation) and AC-2.

## 6. Frontend Plan

### 6.1 Routes / modules

- Route `result/:id` unchanged (`routing-data.ts:740`). No `canDeactivate` added (`DD-8`).
- Everything lives under `pages/bilateral/`.

### 6.2 Components & services

| Item | Path | Responsibility |
|---|---|---|
| `BilateralApiService` (+3 methods) | `shared/services/api/bilateral-api.service.ts` | `POST_bilateralQualityAssessment(resultId)`, `GET_bilateralQualityAssessmentLatest(resultId)`, `PATCH_bilateralSubmitForReview(resultId, body?)` — naming per `HTTP_METHOD_descriptiveName` |
| `BilateralCreationService.submitResult(resultId, body?)` | `pages/bilateral/services/bilateral-creation.service.ts:453` | Delegates to the API service method instead of a raw `http.patch`; keeps `resultStatusId.set(PendingReview)` in `tap` |
| `BilateralQualityAssessmentService` (new, `providedIn: 'root'`) | `pages/bilateral/services/bilateral-quality-assessment.service.ts` | Signals: `state: idle\|running\|ready\|unavailable\|error`, `assessment`, `isCurrent`, `startedAt`, `elapsedSeconds` (interval while running), `pollHandle`. Methods: `run(resultId)`, `loadLatest(resultId)`, `openStored()`, `reset()`. Handles 202 → poll `latest` every 3 s until terminal or window+grace; client-side `timeout(window + 10 s)` maps to `unavailable` with `reason: client_timeout` (row may still land server-side; next `loadLatest` reconciles). Never navigates, never toasts (same rule as `BilateralAiService`). |
| `BilateralResultCreatorComponent` | `pages/bilateral/pages/bilateral-result-creator/` | `isSubmitting` boolean → `submitPhase` signal (`idle \| assessing \| deciding \| submitting`); `canSubmitFromRail` requires `idle`; rail label per phase (*Checking quality…* / *Review the check* / *Submitting…*). `submitResult()` keeps the three guards, then `qa.run(rid)` or `qa.openStored()` when `isCurrent`. New `onQualityDecision(decision)` → `creationService.submitResult(rid, {assessment_id, decision})` with the existing success/error alerts. `ngOnInit` → `qa.loadLatest(rid)` after load. Rail: chip "Quality check available" when `isCurrent` (R-11). Host `<app-bilateral-quality-review-dialog>` in the template (page-scoped, not app-level: the dialog belongs to this result). `[appBeforeUnloadWarning]="qa.isRunning"` on the host element. |
| `app-bilateral-quality-review-dialog` (new, standalone, OnPush) | `pages/bilateral/components/bilateral-quality-review-dialog/` | Inputs from the service signals; outputs `submitAnyway`, `adjust`. Phases: **working** (spinner, elapsed, rotating tips, after 20 s adaptive copy — R-13), **verdict** (overall badge, five section rows, evidence list; **(v0.2)** a section row whose verdict is `grey` renders the grey badge with the text *Not evaluated* followed by the AI's reason, and a `partial` run shows a one-line notice above the section list), **unavailable** (message + same CTAs; **(v0.2)** shows `degraded_reason` when the AI supplied one), **running-elsewhere** (poll notice). `app-pr-dialog` with `showHeader=false`, hand-rolled header like the AI completion dialog, `closable=true`, `closeOnEscape=true`, `dismissableMask=true`, `(onHide) → adjust`. |
| `app-bilateral-verdict-badge` (new, tiny) | same folder | Colour + `material-icons-round` icon + text label per verdict (`check_circle` green · `error_outline` amber · `cancel` red · `remove_circle_outline` grey). Used by overall, section rows and evidence items so colour is never the only carrier (§10). |

State boundary: assessment state in the feature service (survives component re-creation within the SPA session); no `localStorage` (server is the source of truth via `latest`).

### 6.3 Design system usage — same essence as today (owner, 2026-09-16)

- **Identity:** the dialog copies the AI completion dialog's shell (`styleClass 'pr-dialog bilateral-quality-review-dialog'`, `.pr-dialog-header` with `pr-dialog-header-icon--promote` variant, footer with `hlmBtn`). Primary CTA **Submit anyway** uses the brand gradient (`from-[var(--pr-color-primary-300)] to-[var(--pr-color-primary-400)]`); **Make adjustments** is the ghost/secondary variant used by "Continue working".
- **Verdict colours:** `--pr-color-green-500`, `--pr-color-yellow-300`, `--pr-color-red-300`, grey from `--pr-color-accents-4/5`; light tints via Tailwind arbitrary values on the same vars. No new tokens.
- **Typography:** Poppins scale §7 (`h3 16/600` dialog title, `h4 14/500` section names, `body-2 12/400` comments).
- **Icons:** `material-icons-round` only.
- **Layout:** Tailwind-first; SCSS only for `@keyframes` of the tip rotation and `:host`. Dialog max width 720 px, full-width under 640 px, internal scroll for the section list; 16 px gutters (§9).
- **Copy:** American English, plain language; tips: *Green — meets the QA criteria · Amber — acceptable, not its best version · Red — does not meet the criteria · Grey — could not be evaluated (private file, blocked link, or nothing to assess in that section) · You decide: the check never blocks your submission.* **(v0.2)** the grey tip now covers sections as well as evidence items.
- **(v0.2) Grey section row:** same row layout as the other four, grey badge (`remove_circle_outline` + the word **Not evaluated**), the AI's reason as the comment, no *what to fix* / *what is good* lists. It reads as an absence, not as a failure — the row must not borrow amber's or red's treatment.
- **(v0.2) `partial` notice:** one line above the section list, neutral (accents tint, `info_outline`, no colour from the traffic-light palette so it cannot be read as a verdict): **"Part of this result could not be assessed. <degraded_reason>"** — the reason rendered as plain text through interpolation only, never as HTML, and never showing a host, URL or body. No notice when `ai_status` is `completed` or `null`.
- **A11y:** `role="dialog"` `aria-modal` `aria-labelledby`; working state `aria-live="polite"` region announcing start, 20 s notice and completion; focus trap from `app-pr-dialog`; Esc = adjust; badges carry text.
- **i18n:** strings inline in the component like the rest of `pages/bilateral` (module convention; `src/app/internationalization/` not used by bilateral components today).

### 6.4 Real-time / notification UX

None new. The existing submitted notification fires after the actual transition, unchanged.

## 7. Security & Authorization

- JWT middleware covers `/api/bilateral/center/*`. Centre permission: `assertCenterPermission` reused for the two new routes (lead-centre role). Reviewers read the block through `GET /api/results/bilateral/:id`, whose authorization is unchanged.
- `SubmitForReviewDto` validated with `class-validator`; `assessment_id` ownership checked against `result_id`.
- Secrets: API key read from env inside the client only; never in DTOs, logs or error messages. Error messages to the user are fixed strings. `.cursorrules` grep gate in review.
- Throttling: routes inherit the global throttler (they are not on the `@SkipThrottle` controllers). One assessment per submit is far under 100 req/60 s.

## 8. Performance & Capacity

- Expected volume: tens of assessments per day per centre near deadlines; negligible QPS.
- Payload build ≈ one enriched detail read (already served to the drawer under QAS-3). Measure per type in `/akili-test`; budget p95 ≤ 2 s.
- The 60 s held request occupies one Node request slot; no connection pooling change. Proxy/ALB ceiling ≥ 65 s **must be verified in TEST** before the client group (`BIL-QAI-OQ-2`, human gate).
- JSON columns sized for ≤ 32 KB per row; no pagination concerns.

## 9. Observability

- Structured log `event=bilateral_quality_assessment` (fields §4.1) at terminal state; `event=bilateral_quality_assessment_decision result_id=… decision=… overall=… had_outstanding_flags=…` at submit.
- Moves `docs/prd.md` M2.1 indirectly (first-pass QA rate on bilateral) — dashboards later can read `bilateral_quality_assessments`.
- Error budget: AI failures are absorbed into `unavailable`, so no 5xx increase attributable to the flow; a spike in `unavailable_reason=timeout` is the operational signal. **(v0.2)** two more signals, both free now that the fields are logged or stored: a rising `ai_status=partial` rate means the AI is degrading quietly while still answering — invisible before v0.2 — and `unavailable_reason=ai_unavailable` separates "the AI declined" from "the network failed", which `timeout`/`http_error` used to conflate.

## 10. Testing Plan (forward-looking)

- **Unit (server):** rules (grey, KP matrix, hash determinism, outstanding flags); builder per result type with fixtures asserting the denylist pass and evidence visibility; client with stubbed `HttpService` (timeout via fake timers, 5xx, malformed, not configured) and a `Logger` spy asserting no body/key/host; orchestrator (short-circuit on current hash, running-row 202, terminal update after abort); `submitForReview` with body (stale hash, foreign id, decision/status mismatch, stamp in same transaction).
- **(v0.2) Unit (server):** label-constant parity per type (`Object.keys(fields)` equals the constant, both directions); typed-value shapes (counts and USD are objects, `Length of training` is a single value, `Innovation developers` is `null` not the lead contact person); `how_many`-without-disaggregation adds to `total` only; impact-areas mapper (Principal ⇒ sub-components, Significant ⇒ `[]`, no tag ⇒ `[]`, block inside the hash); evidence tags emit only the five vocabulary values and never `Climate`; client schema check accepts a grey **section** and rejects a grey **overall**, requires `status`/`degraded_reason`, truncates and sanitises the reason; orchestrator status mapping (`partial` ⇒ row `completed` + `ai_status`; AI `unavailable` ⇒ row `unavailable` + `ai_unavailable`; KP ⇒ both columns `null`); `Logger` spy asserts no line contains `degraded_reason`; `hasOutstandingFlags` with a grey section stays false.
- **(v0.2) Unit (client):** grey section row renders badge + *Not evaluated* + reason and no fix/strength lists; `partial` notice appears only when `ai_status === 'partial'` and renders the reason as text; Innovation developers field — prefilled only when the stored value is empty, an edited value survives save + reload, a cleared value stays cleared and is not overwritten by the lead contact person.
- **Payload fixture (bilateral):** pre-change fixture of `findOne` and `getBilateralResultById` compared field-by-field; only `quality_assessment` added.
- **Unit (client):** service state machine (200/202/poll/timeout), creator wiring (no submit before CTA; three dismiss paths ⇒ `adjust` and zero PATCH; `openStored` when current), dialog rendering per phase (badge text present, five rows, grey items listed).
- **Human gates:** proxy ceiling in TEST; T6 visual review of working + verdict states (desktop + 375 px) at the client HITL pause; owner reads the tip copy.
- Scoped runs only: `npx jest --testPathPattern="bilateral"` (server) and `npx jest src/app/pages/bilateral src/app/shared/services/api` (client) — never the whole server suite (memory rule).

## 11. Backwards Compatibility & Migration Plan

- Two additive migrations: `T-2` creates the table (`down` drops it), `T-2b` adds the two v0.2 columns (`down` drops the columns). Both reversible and independent.
- `submit-for-review` body optional ⇒ existing callers unaffected.
- Two additive nullable blocks on reads; change-log row in `bilateral-result-summaries.en.md`.
- Rollout: inert until `BILATERAL_AI_QUALITY_URL` is set; with it unset, Submit shows the unavailable state and proceeds. No feature flag.
- Rollback: revert the client PR first (restores direct submit), then the server PR; `migration:revert` if the table must go. Rows already written are harmless orphans.

## Budget (Step 2.4)

**Re-baselined at the v0.2 pivot (2026-09-16), approved by the owner at execution gate 3.** The original budget (11 tasks · ~1 500 production LOC + ~1 300 test LOC · 3 review rounds; tripwire > 14 tasks / > 2 200 LOC / > 5 rounds) was tripped by the pivot: contract v0.2 mints `T-1b`, `T-2b`, `T-4b`, `T-5b` and `T-12`, taking the list to **16 tasks** — above the 14 tripwire — which is why the numbers below replace it rather than sit beside it.

| Signal | Estimate | vs. Full depth |
|---|---|---|
| Tasks | **16** (8 server, 2 db, 5 client, 1 contract/docs) | above the original 11; still one spec, not a family |
| LOC | ~1 900 production (server ~950 · client ~800 · docs/migration ~150) + ~1 600 tests | matches Full |
| Review rounds | 5 (server core · v0.2 server rework · client · innovation-developers field · integration) | matches |

`/akili-execute` trips on: **> 19 tasks, > 2 600 production LOC, or > 7 review rounds** → stop and escalate (likely split into the proposal's three-child family). Three of the five rounds are already consumed (`T-1`, `T-5`, `T-4`), so the v0.2 work has headroom for four more before the new line.

Why not split into the three-child family now: the five new tasks are edits to code the spec already owns (`T-1b`/`T-4b`/`T-5b` rework `T-1`/`T-4`/`T-5` in place, `T-2b` is a two-column migration), and `T-12` is the only genuinely new surface. A family split would cost more coordination than it saves.

## 12. Design Decisions (ADRs)

### `BIL-QAI-DD-1` — Synchronous assessment call, LITE tier
- **Context:** meeting fixed "no agents, ~30 s"; PO allows a 60 s window; QAS-12 forbids new always-on compute.
- **Decision:** one held HTTP request with a server timeout; row persisted regardless of client presence.
- **Alternatives:** async job + polling (Option B — more parts, holes already seen in `bilateral_ai_jobs`, benefit moot under 60 s); client-direct call (rejected: key exposure, no traceability, unsaved state).
- **Consequences:** proxy ceiling must allow ≥ 65 s (human check); revisit as ADR if p95 AI latency approaches the window.

### `BIL-QAI-DD-2` — Payload projected from the persisted, enriched detail; ids stripped by a denylist pass
- **Context:** owner rule "definitions only"; AC5 needs a verdict over saved content.
- **Decision:** builder reads `BilateralService.findOne` + `getBilateralResultById`, maps labels per section, then a denylist pass removes id-like keys/values; fixture tests assert the pass.
- **Alternatives:** client sends its form state (rejected: unsaved buffers, no hash guarantee); bespoke SQL per section (rejected: duplicates the enrichment already maintained under the payload contract).
- **Consequences:** a label missing from the enriched detail needs a mapper fallback to a repository; DI graph must allow `BilateralCenterService` → orchestrator → `BilateralService` and `ResultsService` (check for cycles in T-2; fallback: inject repositories directly).

### `BIL-QAI-DD-3` — Content hash decides reuse; server owns "is current"
- **Context:** R-6 reopen requirement vs. AC5 no-stale-verdict.
- **Decision:** sha256 of the canonical payload stored per row; `latest` recomputes and returns `is_current`.
- **Alternatives:** `last_updated_date` comparison (rejected: autosave touches timestamps without content change; sections live in many tables); client-side dirty flag (rejected: lost on reload).
- **Consequences:** `latest` costs one payload build; acceptable under QAS-3.

### `BIL-QAI-DD-4` — Grey and the KP rule are pure functions around the AI call
- **Context:** meeting: grey computed in code; KP excluded from AI.
- **Decision:** `bilateral-quality-rules.ts` with table-driven tests; the AI service stays generic.
- **Alternatives:** ask the AI to grade private files grey (rejected: the file cannot leave PRMS anyway); send KP to the AI with a "skip" instruction (rejected: spends capacity the meeting refused).
- **Consequences:** KP criteria change ⇒ edit a table + tests, no contract change.

### `BIL-QAI-DD-5` — Orchestrator as a collaborator of `BilateralCenterService`
- **Context:** preconditions and `assertCenterPermission` are private to the centre service.
- **Decision:** the centre service exposes `assess`/`getLatest` that run `assertSubmittable` then delegate to the orchestrator; permission logic keeps one home.
- **Alternatives:** duplicate the checks (rejected: drift); new access service (rejected: larger refactor for no new behaviour).
- **Consequences:** `BilateralCenterService` grows two thin methods; the orchestrator stays unit-testable in isolation.

### `BIL-QAI-DD-6` — "Make adjustments" is not stamped
- **Context:** AC7 lists what must be recorded: decision to submit anyway, submitted without check. Adjustments are implied by an undecided row followed by a newer row.
- **Decision:** no extra request on dismiss; `decision` stays null. `adjusted` value reserved.
- **Alternatives:** fire-and-forget PATCH on close (rejected: a request on every Esc for no consumer).
- **Consequences:** analytics count adjustments as "rows never decided"; explicit later if a consumer appears.

### `BIL-QAI-DD-7` — Decision stamped inside the submit transaction; flags derived server-side
- **Context:** AC-2 (transition audited) and trust boundary.
- **Decision:** `submitForReview` validates the row, stamps it and transitions in one transaction; `had_outstanding_flags` computed from stored verdicts.
- **Alternatives:** separate decision endpoint before submit (rejected: two-phase without benefit; partial states).
- **Consequences:** submit gains ~40 lines of validation; single commit keeps history consistent.

### `BIL-QAI-DD-8` — Leave-page warning via `beforeunload` only; no route guard
- **Context:** R-6 "close or navigate away". Bilateral routes carry no `canDeactivate`; the existing guard has save/discard semantics.
- **Decision:** `appBeforeUnloadWarning` bound to `isRunning` for reload/close; the working dialog is modal so in-page navigation is covered; browser Back during the run is accepted as "leave anyway" (server finishes; reopen shows the result).
- **Alternatives:** new `canDeactivate` with custom copy (deferred: more surface for a case the reopen flow already recovers).
- **Consequences:** documented gap GAP-1; revisit if users report confusion.

### `BIL-QAI-DD-9` — Reversion: Submit no longer transitions immediately (Step 2.3 challenge)
- **Context:** delivered behaviour "Submit ⇒ status 5 now" is replaced by "Submit ⇒ assessment ⇒ decision ⇒ status 5".
- **Challenge question:** what does removing the direct transition break? (Explore subagent, 2026-09-16, one question.)
- **Answer — concrete breakages and the design response:**

| What breaks | Where | Design response |
|---|---|---|
| `isSubmitting` spans one HTTP call; with assess → dialog → submit the rail button re-enables under the open dialog | `bilateral-result-creator.component.ts:393-395, 435-445` | Replace the boolean with `submitPhase: idle \| assessing \| deciding \| submitting`; `canSubmitFromRail` requires `idle`; label/icon per phase (§6.2) |
| Form and autosave stay writable while the dialog is open (lock is driven by `resultStatusId`, which now flips only at Submit anyway) | `bilateral-result-creator.component.ts:216-226`, `bilateral-auto-save.service.ts:106-114`, section `readOnly` computeds | Accepted: the dialog is modal so no edits can happen; the content hash on submit protects against any flush in between (DD-3). No change to the lock effect |
| Hidden second effect: the `tap` that sets `resultStatusId = PendingReview` fires at PATCH time | `bilateral-creation.service.ts:453-461` | Kept inside `submitResult`; it now fires at Submit anyway, which is the correct moment |
| Server `submitForReview(user, resultId)` is 2-arg; controller has no `@Body()` and no DTO; Swagger description states the transition unconditionally | `bilateral-center.controller.ts:86-98`, `bilateral-center.service.ts:1472` | Third optional param `dto?: SubmitForReviewDto`; `@Body()` + `@ApiBody({ required: false })`; description updated |
| Assessment endpoint must honour the same gates as submit, incl. the Innovation Use MDS validator whose header comment says no path may bypass it | `innovation-use-mds-validator.service.ts:9`, `bilateral-center.service.ts:1496-1520` | `assertSubmittable` extracted and shared (DD-5) — the MDS gate is part of it. The assessment path must **not** call `emitBilateralSubmittedNotification` |
| Specs asserting "PATCH on click" / body `{}` / 2-arg calls | Client: `bilateral-creation.service.spec.ts:158-193, 217`; `bilateral-result-creator.component.spec.ts:115, 250, 268, 281, 407`. Server: `bilateral-center.controller.spec.ts:131-133`; `bilateral-center.service.spec.ts:1289-1450` (11 cases call `submitForReview(user, 77)`) | Rewritten in the client/server tasks: "PATCH on Submit anyway", body optional, 3-arg tolerant expectations. Alert ids `bilateralSubmitSuccess/Error/UnsavedSections/InvalidFields` are unasserted today and are kept verbatim |
| Lists (`bilateral-results-list`, `my-draft-results`) never refreshed after submit | — | Unchanged; not a regression |
| Prose that becomes stale | `pages/bilateral-result-creator/CLAUDE.md:23-25,44,79` · `section-zero-dashboard/CLAUDE.md:9,30-31` · `type-innovation-use/CLAUDE.md:67` · server `api/bilateral/CLAUDE.md:114` · `bilateral.module.ts:154` route comment · `innovation-use-mds-validator.service.ts:9` · `bilateral-result-summaries.en.md:470` · `docs/specs/notifications/bilateral-review-decision/*` (describes submit as one immediate transition) | Docs task updates module guides and the payload doc; the notifications spec gets a one-line "superseded by qa-ai-traffic-light for the submit moment" note, not a rewrite |
| Cypress | none touch the rail Submit | No E2E to update; none added (Jest covers the flow, visual gate is human) |

- **Decision:** keep the three guards, the alert ids and the `resultStatusId` tap exactly as they are; move only the moment the PATCH fires behind the CTA; introduce `submitPhase`; share `assertSubmittable` server-side.

### `BIL-QAI-DD-10` — Same visual essence as the existing bilateral dialogs
- **Context:** owner instruction 2026-09-16: "seguir la misma esencia que tenemos actualmente".
- **Decision:** clone the AI completion dialog shell and CTA pattern; reuse tokens; no new components beyond the badge.
- **Alternatives:** PrimeNG `p-dialog` directly (rejected: bypasses the project shell); bespoke overlay (rejected: new visual language).
- **Consequences:** visual review is a diff against a known dialog, not a fresh design.

### `BIL-QAI-DD-11` — Contract v0.2 adopted at execution gate 2
- **Context:** Daniela Gómez reviewed the frozen v0.1 copy against the QA criteria document (2026-09-16, before `T-6`). v0.1 left `type_specific.fields` as free label→value pairs, allowed grey only on evidence items, and had no `impact_areas`, `status` or `degraded_reason`. Her service validates mandatory labels strictly and answers with a specific error when one is missing or renamed, and it must not decide a colour by parsing a number out of a sentence. `T-4` had already shipped v0.1 faithfully (flat labels such as "Number of women trained") and `T-5` rejects a grey section as `malformed` — continuing into `T-6`/`T-7` would have persisted a shape v0.2 changes.
- **Decision:** adopt v0.2 now, in place: per-type enumerated `fields` with labels frozen in one exported constant per type, typed count/amount objects, optional `impact_areas` as a sibling of `sections`, response `status` + `degraded_reason`, section-level grey. `T-1b`/`T-2b`/`T-4b`/`T-5b` rework the shipped tasks; nothing ships on v0.1.
- **Alternatives:**
  - *Keep v0.1 and let the AI parse the labelled strings on its side* — **rejected:** it makes a RED verdict depend on string parsing of text PRMS is free to reword, which is exactly the class of silent breakage a versioned contract exists to prevent. The failure mode is invisible: a reworded label degrades a score instead of raising an error.
  - *Defer `impact_areas` to a follow-up* — **rejected by the owner:** the data is already on the result (Section 1 tag levels), the mapper is one small function, and shipping the block optional-and-unpenalised costs the AI side nothing while it waits for the rest. Deferring would have meant a third contract version within the same feature.
  - *Treat `partial` as `unavailable`* — **rejected:** it throws away a usable verdict and mislabels the user's decision as `submitted_without_check`.
- **Consequences:** budget re-baselined to 16 tasks (above the original tripwire; approved by the owner at gate 3); a second additive migration; the form's visible labels become contract surface, so a copy edit to a field label now requires a version bump and a message to Daniela; `DD-2` extends (the builder now also reads the Section-1 tag levels); `DD-1`…`DD-10` stand unchanged and no TRD ADR is overturned.

### `BIL-QAI-DD-12` — Innovation developers restored as a real field in the bilateral form
- **Context:** the bilateral creator removed the *Innovation Developer* textarea (`type-innovation-dev.component.html:44-46`) and writes `results_innovations_dev.innovation_developers` silently from the Section-1 *Lead contact person* (`type-innovation-dev.component.ts:277`; the ingest handler falls back the same way, `handlers/innovation-development.handler.ts:56-75,95`). Daniela asked for the field as its own contract field and specifically asked that it not be substituted by the lead contact.
- **Decision:** send the column verbatim **and** restore the field in the bilateral form (`T-12`, `R-15`): optional textarea matching the standard PRMS result form (`pages/results/.../innovation-dev-info.component.html:140-147`), prefilled from the lead contact **only when the stored value is empty on first load**, user-editable, a cleared value persisting as null, saved through the existing `PATCH_innovationDev` path.
- **Alternatives:** *send the column as-is and change nothing in the form* — **rejected:** the QA check would then grade a value no user ever wrote and that is never empty, so the criterion can never fail; the check would look like it passes while measuring nothing. *Stop populating the column and send `null` until someone builds the field* — **rejected:** it would regress the reviewer drawer and the ingest path, which already read it.
- **Consequences:** one client-only task on a section the spec did not previously touch; the owner's stated reason is that Program reviewers need the real answer, so the value is not only for the AI. Server needs no change unless the legacy summary endpoint drops nulls — `T-12` verifies that before closing. The `pages/bilateral/.../CLAUDE.md` note that documented the removal is corrected in the same task.

## 13. Open Gaps & Follow-ups

- **GAP-1** Browser Back during a running assessment leaves without warning (DD-8). Recoverable via reopen.
- **GAP-2** KP criteria pending confirmation with Mariagiulia (`BIL-QAI-OQ-3`); table-driven tests make the change cheap.
- **GAP-3** Proxy/ALB ceiling unverified (`BIL-QAI-OQ-2`); human check before the client group.
- **GAP-4** Reviewer-side rendering of `quality_assessment` — separate story; the block is already served.
- **GAP-5** `contract_version` bump procedure with the AI team — documented in `integration-contracts.md`; v0.2 is the first exercise of it (`T-1b` carries the change-log line).
- **GAP-6** **The Climate pillar cannot be linked to evidence.** The evidence form offers five boolean flags (`gender_related`, `youth_related`, `nutrition_related`, `environmental_biodiversity_related`, `poverty_related`) and no climate flag, while `impact_areas` carries a Climate pillar from the Section-1 tag levels. So the AI can see "this result targets Climate" and can never see an evidence item claiming it. Not fixable inside this spec (it is an evidence-form schema change owned elsewhere); documented in the contract so the AI does not read the absence as a defect.
- **GAP-7** **Innovation use has no non-binary or unknown counts.** The `result_actors` columns are `women`, `women_youth`, `men`, `men_youth`, `how_many` — there is no non-binary or unknown column, unlike Capacity sharing. `"Number of people using"` therefore reports `{total, women, men, women_youth, men_youth}` only, and a row saved without age-and-sex disaggregation contributes its `how_many` to `total` alone, so the parts can legitimately sum to less than the total. The AI must not treat that gap as under-reporting. Related: the innovation-use guide treats `how_many` as authoritative for totals, which the owner reviews with the fixtures at `T-11`.
- **Risk:** the enriched detail may lack a label the form paints (e.g. sub-national names); mapper fallbacks per section; fixture tests per type expose it early.

## Required cross-references

- `docs/specs/bilateral/qa-ai-traffic-light/requirements.md`, `proposal.md`.
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`, `docs/bilateral-module/integration-contracts.md`.
