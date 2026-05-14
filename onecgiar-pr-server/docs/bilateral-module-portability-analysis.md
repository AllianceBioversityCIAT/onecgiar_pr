# Bilateral module — portability blueprint

> Use this document when re-implementing the **PRMS bilateral module** on another platform (different framework, language, or stack).
>
> **Companion docs (must read before porting):**
>
> - [`bilateral-result-summaries.en.md`](./bilateral-result-summaries.en.md) — **the authoritative output payload contract**. The new platform MUST emit the same shapes byte-for-byte (apart from whatever the change log allows).
> - [`../src/api/bilateral/AGENTS.md`](../src/api/bilateral/AGENTS.md) — workflow guide (ingestion flow, strategy pattern, security posture).
> - [`../src/api/bilateral/CLAUDE.md`](../src/api/bilateral/CLAUDE.md) — module navigation and conventions.
> - [`../src/api/results/AGENTS.md`](../src/api/results/AGENTS.md) and [`../src/api/results/CLAUDE.md`](../src/api/results/CLAUDE.md) — the lifecycle / review workflows triggered after bilateral ingestion.
>
> This blueprint focuses on **what to preserve** (contract, behavior, invariants) and **what is portable** (implementation choices). Where the source code is the authority, paths are anchored to the PRMS repo for reference.

---

## 0. Executive summary

The bilateral module is a **headless, external-facing API** with two halves:

1. **Outbound (read)** — typed JSON payloads per result type for downstream consumers (funders, BI, platform reports). Five endpoints: `GET /`, `GET /list`, `GET /results`, `GET /:id`. Contract is owned by [`bilateral-result-summaries.en.md`](./bilateral-result-summaries.en.md).
2. **Inbound (write)** — a single ingestion endpoint `POST /create` that accepts result payloads from external syncs, validates them, resolves identities and CLARISA references, creates a single ACID transaction per result, and dispatches type-specific logic through a Strategy-pattern handler map.

The module is **JWT-off, throttler-off** by design — protection is at the perimeter (API Gateway / IP allowlist), not inside the application.

The biggest portability decisions are:

- The **payload contract** (output) is non-negotiable for downstream consumers.
- The **ingestion DTO tree** (input) is permissive on the wire (extras are dropped, IDs are accepted by name OR id) so external syncs don't need to know PRMS internals.
- The **identity / audit model** uses `created_by` / `last_updated_by` derived from payload emails; users are auto-created if not found.
- The **transactional unit** is one result at a time; bulk payloads are processed sequentially.
- The module depends on **CLARISA** (master data), **CGSpace** (knowledge products), **ToC** (theory-of-change services), **MySQL** (system of record), and **identity store** (users + AD).

---

## 1. Mission and boundaries

### What the module does

- Accepts heterogeneous **bilateral / external result payloads** from sync sources (W3 / external funders / partner systems).
- Resolves them against PRMS / CLARISA master data (institutions, initiatives, countries, regions, policy types, innovation readiness, ToC outcomes).
- Persists a `Result` row plus all related associations (ToC mapping, geography, partners, evidence, type-specific blocks, bilateral project budgets).
- Stores the result in `PENDING_REVIEW` (status_id = 5) so PMU leads can later Approve / Reject it through the **review workflow** in `api/results/` (see [`../src/api/results/AGENTS.md`](../src/api/results/AGENTS.md)).
- Exposes those results back to downstream consumers via the **typed payload contract**.

### What the module explicitly does NOT do

- It is **not** a CRUD surface for editors. The PRMS editor uses `api/results/` directly.
- It does **not** own master data — CLARISA institutions, policy types, etc. live elsewhere; the module validates against them.
- It does **not** issue knowledge product handles — those come from CGSpace; the module fetches metadata, never creates it.
- It does **not** authenticate users — perimeter does; the module trusts emails in the payload (and creates users for them when missing).
- It does **not** govern the review/approve/reject lifecycle once the result is created — that's `api/results/` `reviewBilateralResult`.

---

## 2. API surface (must replicate byte-for-byte)

Mount: `/api/bilateral/*`. All endpoints `@SkipThrottle()`. None of them go through JWT middleware.

### 2.1 `POST /create`

- **Body type:** `RootResultsDto` (multiple wrapper shapes — see §4).
- **Validation:** strip unknown fields, accept extras (`whitelist: true`, `forbidNonWhitelisted: false`, `transform: true`).
- **Response:** the standard envelope `{ response, message, status }` (here `status: 201`). `response` is the enriched bilateral payload of the last result created.
- **Behavior:** processes incoming results **sequentially**, one transaction per result. Errors abort the current result; previously committed results in the same batch remain.

### 2.2 `GET /`

- **Query:** `limit?` (number, default `10`).
- **Behavior:** returns all active bilateral results (`source = Bilateral`, `is_active = true`), enriched with typed `*_summary` blocks.
- **Response:** raw array (the response interceptor passes arrays through unchanged).

### 2.3 `GET /list`

- **Query (all optional):**
  - `page` (default 1)
  - `limit` (default 10, **max 500**)
  - `source` (`Result` | `API`) — `W1/W2` and `W3/Bilateral` aliases are accepted and normalized
  - `portfolio` (CLARISA portfolio acronym — `P22`, `P25`)
  - `phase_year` (number 1900–2100)
  - `result_type` (one of: `Policy change`, `Innovation use`, `Other outcome`, `Capacity sharing for development`, `Knowledge product`, `Innovation development`, `Other output`, `Impact contribution`, `Innovation Package`)
  - `status_id` (1–7) OR `status` (`Editing` | `Quality Assessed` | `Submitted` | `Discontinued` | `Pending Review` | `Approved` | `Rejected`)
  - `last_updated_from` / `last_updated_to` / `created_from` / `created_to` — ISO 8601 date
  - `center` (CLARISA center id-code or acronym)
  - `initiative_lead_code` (CLARISA initiative `official_code` — filter to results where this initiative is **role 1, the lead**)
  - `search` (parameterized substring match on title; **escape `%` and `_`** to avoid SQL wildcard injection)
- **Response:** `{ response: { items, meta: { total, page, limit, totalPages } }, message, status: 200 }`.

### 2.4 `GET /results`

- **Query:** `bilateral?` (`true`/`false` string), `type?` (the discriminator strings used by the list — `knowledge_product`, `capacity_sharing`, `innovation_development`, `innovation_use`, `innovation_package`, `policy_change`, `other_output`, `other_outcome`).
- **Behavior:** designed for external **synchronization** — returns the full enriched payload set with `{ type, result_id, data }` envelopes. When `bilateral=true`, restricts to results that have at least one row in `results_by_projects` (bilateral / non-pooled project linkage).
- **Response:** raw array.

### 2.5 `GET /:id`

- **Param:** `id` (number).
- **Behavior:** returns one bilateral result with `source = Bilateral`, enriched.
- **Errors:** 400 if id missing, 404 if not found.

---

## 3. Read contract (the output payload)

**Authority:** [`bilateral-result-summaries.en.md`](./bilateral-result-summaries.en.md). The new platform MUST replicate that file's contract exactly.

Headline rules:

- Each list entry is `{ type, result_id, data }`.
- `type` is one of: `knowledge_product` | `capacity_sharing` | `innovation_development` | `innovation_use` | `innovation_package` | `policy_change`.
- `data` carries the **shared "core result" fields** PLUS the **type-specific `<type>_summary`** object (where applicable).
- All identifiers on the payload are **CLARISA ids**, not PRMS join PKs.
- Field names on `data` are `camelCase` (except where the legacy contract uses `snake_case` — preserve those exactly: `result_code`, `result_title`, `pdf_link`, `prms_link`, `last_update_at`, `is_active`, `created_date`, `last_updated_date`, `status_id`, `year`, `obj_status`, `geographic_focus`, `contributing_centers`, `contributing_partners`, `dac_scores`, `toc_alignment`, `leading_result`, `last_submission`, `lead_contact_person`, `source`, `source_definition`, `evidences`, `bilateral_projects`, `primary_entity`, `regions`, `countries`).

### 3.1 Type discriminator → summary block

| `type` | Summary key on `data` | Source service in PRMS | Notes |
|---|---|---|---|
| `knowledge_product` | `knowledge_product_summary` | `ResultsKnowledgeProductsService` | **Slim** — `{ handle }` only. The heavy `result_knowledge_product_array` tree is **removed** from `data` after enrichment. |
| `innovation_development` | `innovation_development_summary` (+ nested `innovation_development_questionnaire`) | `ResultsInnovationsDevRepository` + `ResultQuestions` engine | Includes typology, readiness, developers/collaborators, scaling studies, **anticipated_user_demand** (actors/organizations/measures), budgets (initiative/bilateral/partner), evidence (reference + user-need), plus a questionnaire of 4 thematic blocks (P22 legacy or P25 V2). |
| `innovation_use` | `innovation_use_summary` | `ResultsInnovationsUseRepository` + `InnovationUseService` | Current vs 2030 use sections, **use level**, linked results, budgets — **omits** reference/user-need evidence (by design). |
| `capacity_sharing` | `capacity_development_summary` | `ResultsCapacityDevelopmentsRepository` | Participant counts, delivery method, training length (Clarisa objects), `on_behalf_organizations[]` (institution role 3). |
| `policy_change` | `policy_change_summary` | `ResultsPolicyChangesRepository` + `ResultQuestions` engine | Amount + amount-status, policy type & stage (Clarisa slim), linked innovation flags, `result_related_to[]` (question-engine), `policy_implementing_organizations[]` (institution role 4). |
| `innovation_package` | `ipsr_pathway_summary` | `PathwayService` + IPSR sub-modules | Four pathway steps `step_one`–`step_four`. **Each step has bilateral-specific shapes** (see the payload doc). |

### 3.2 Shared core fields on `data` (all types)

Read the payload doc — every field is enumerated there. Replication MUST cover:

- **Identity & lifecycle:** `created_date`, `last_updated_date`, `last_update_at`, `result_code`, `is_active`, `year`, `status_id`, `pdf_link`, `prms_link`.
- **Title / narrative / level:** `result_title`, `description`, `result_level { code, name, description }`, `indicator_category { code, name }`.
- **ToC and primary initiative:** `toc_alignment[]` (entity, initiative_role, toc_results), `primary_entity { official_code, name }`.
- **Geography:** `geographic_focus { code, name, description }`, `regions[]`, `countries[]`.
- **Centers and partners:** `contributing_centers[]` (with `is_lead`), `contributing_partners[]`, `leading_result { lead_kind, id, code, name, acronym }`, `last_submission` (only for `status_id` 2 or 3), `lead_contact_person`.
- **DAC scores:** `dac_scores { gender, climate_change, nutrition, environmental_biodiversity, poverty }` each `{ tag_title, impact_area_names[] }`.
- **Workflow status object:** `obj_status { result_status_id, status_name, status_description }`.
- **Evidence:** `evidences[]` `{ link, description }`.
- **Bilateral / creator:** `bilateral_projects[]`, `created_by { first_name, last_name, email }`, `source` (enum), `source_definition`.

### 3.3 Stability rule

Per `AC-4` of the PRD: **changes are additive**. Removals and renames require a `v2` rollout. Every change MUST land alongside an update to the change log at the bottom of [`bilateral-result-summaries.en.md`](./bilateral-result-summaries.en.md).

---

## 4. Write contract (ingestion DTO tree)

Source: [`../src/api/bilateral/dto/create-bilateral.dto.ts`](../src/api/bilateral/dto/create-bilateral.dto.ts).

### 4.1 Wrapper — `RootResultsDto`

The root accepts **four shapes** to be lenient with sync sources. Implementations MUST accept any of them and resolve to a list of `ResultBilateralDto` internally:

| Wrapper variant | Shape |
|---|---|
| Single (canonical) | `{ result: ResultBilateralDto }` |
| Bulk | `{ results: ResultBilateralDto[] }` (min 1) |
| Single under `data` (event shape) | `{ type, received_at, idempotencyKey, tenant, op, data: CreateBilateralDto }` |
| Mixed | Any combination above |

Optional metadata at the root: `type`, `received_at` (ISO date), `idempotencyKey` (string), `tenant` (string), `op` (string). These are **diagnostic** — the current implementation does NOT enforce idempotency on `idempotencyKey` (see §13 — recommended improvement for the port).

### 4.2 `ResultBilateralDto`

```ts
{
  type: string;             // e.g., "BILATERAL", informational
  data: CreateBilateralDto; // the actual payload
}
```

### 4.3 `CreateBilateralDto` — the actual ingestion contract

#### Always required

| Field | Type | Notes |
|---|---|---|
| `result_type_id` | int | Drives all conditional validation. One of `ResultTypeEnum`. |
| `result_level_id` | int | The level catalog id. |
| `created_date` | ISO date string | Used to seed the `Result.created_date` audit column. |
| `submitted_by` | `{ email, name, submitted_date, comment? }` | Submitter identity. |
| `created_by` | `{ email, name }` | Creator identity. Resolves to the `Result.created_by` user id. |
| `lead_center` | `{ name? | acronym? | institution_id? }` (at least one) | Lead CGIAR center (CLARISA institution). |
| `toc_mapping` | `{ science_program_id, aow_compose_code?, result_title?, result_indicator_description?, result_indicator_type_name? }` | Lead initiative (role 1) via CLARISA `official_code`. |
| `contributing_bilateral_projects` | `BilateralProjectDto[]` | `{ grant_title, is_lead?(0/1), usd_budget?, is_determined? }` — at least one expected. |

#### Conditionally required by `result_type_id`

| `result_type_id` | Required block | Notes |
|---|---|---|
| `KNOWLEDGE_PRODUCT` (6) | `knowledge_product { handle, knowledge_product_type?, metadataCG?, licence? }` | `title`, `description`, `geo_focus` are **NOT** required — fetched from CGSpace. |
| `CAPACITY_SHARING_FOR_DEVELOPMENT` (5) | `capacity_sharing { number_people_trained { women, men, non_binary?, unknown? }, length_training, delivery_method }` | `length_training` ∈ {`Short-term`, `Long-term`, `Master`, `PhD`}. `delivery_method` ∈ {`Virtual / Online`, `In person`, `Blended (in-person and virtual)`}. |
| `INNOVATION_DEVELOPMENT` (7) | `innovation_development { innovation_typology, innovation_developers, innovation_readiness_level }` | `innovation_typology.code` ∈ {12, 13, 14, 15} OR `name` from a known dictionary. `innovation_readiness_level` via `level` OR `name` resolved against CLARISA. |
| `INNOVATION_USE` (2) | `innovation_use { current_innovation_use_numbers { innov_use_to_be_determined, actors?, organization?, measures? }, innovation_use_level? }` | If `innov_use_to_be_determined === false`, `actors` is required. |
| `POLICY_CHANGE` (1) | `policy_change { policy_type, policy_stage, implementing_organization[] (min 1) }` | `policy_type.id === 1` → `status_amount` + `amount` are required. Policy stage IDs 1/2/3 map to CLARISA 6/7/8. |

#### Always optional (when not type-conditioned)

| Field | Type | Notes |
|---|---|---|
| `title` | string | Required for non-KP. |
| `description` | string | Required for non-KP. |
| `geo_focus` | `GeoFocusDto` | Required for non-KP — `scope_code` ∈ {1, 2, 4, 5, 50} (Global / Regional / National / Sub-national / Yet to be determined). Drives `regions[]` / `countries[]` / `subnational_areas[]` requirement. |
| `contributing_programs[]` | `ContributingProgramDto[]` | Initiative role 2; same shape as `toc_mapping` + `usd_budget?` + `is_determined?`. |
| `contributing_center[]` | `InstitutionDto[]` | Additional centers besides `lead_center`. |
| `contributing_partners[]` | `InstitutionDto[]` | Partner institutions. |
| `evidence[]` | `{ link (URL), description }` | Skipped for KP (handled by CGSpace fetch). |

#### Multi-id reference pattern

Catalog references accept **any of**: numeric `id`, `name`, `acronym`, or `code`. The service resolves to the canonical CLARISA id via:

1. Look up by `id` first.
2. Fall back to exact `name` (case-insensitive).
3. Fall back to **fuzzy `LIKE %name%`** match (used for institutions; see [`policy-change.handler.ts`](../src/api/bilateral/handlers/policy-change.handler.ts) `resolveOneInstitution`).
4. Reject only if none resolve.

This permissive resolution is **load-bearing for sync sources** — external systems rarely have CLARISA ids.

### 4.4 Validation posture

- `ValidationPipe`: `whitelist: true, forbidNonWhitelisted: false, transform: true`.
- **Strict shape**, **lenient extras** — unknown fields are dropped silently rather than 400'ing.
- Conditional validation via `@ValidateIf((o) => ...)` for cross-field rules.
- Errors return through the standard error envelope (see §11).

---

## 5. Lifecycle — `POST /create` orchestration

Authoritative implementation: [`bilateral.service.ts → create()`](../src/api/bilateral/bilateral.service.ts) (lines 245–488).

### 5.1 Step-by-step

```
1. unwrapIncomingResults(rootResultsDto)
     → list of ResultBilateralDto, regardless of which wrapper variant was sent.

2. FOR EACH result IN list:
   a. validateTocMappingInitiatives(toc_mapping, contributing_programs)
        Validates CLARISA official_codes BEFORE opening a transaction.
        Reject early to avoid orphan DB state.

   b. BEGIN ACID TRANSACTION:

      c. adminUser = lookup user WHERE email='admin@prms.pr'
           Used as the audit anchor for created_by when creating new users.

      d. createdByUser = findOrCreateUser(payload.created_by, adminUser)
           userId = createdByUser.id

      e. submittedUser = findOrCreateUser(
            payload.submitted_by OR payload.created_by,
            createdByUser
         )
           submittedUserId = submittedUser.id

      f. version = VersioningService.findActivePhase(REPORTING)
      g. year = YearRepository.findOne({ active: true })

      h. IF KP and metadataCG.issue_year present:
           Validate that issue_year exists in the year catalog.

      i. IF KP:
           validateKnowledgeProductBeforeCreate(payload, version, userId)
             → checks handle uniqueness against the active phase
         ELSE:
           ensureUniqueTitle(payload.title, version.id)

      j. resultHeader = initializeResultHeader({ payload, userId,
                                                 submittedUserId, version, year })
           → delegated to the type-specific handler
              if it implements initializeResultHeader, otherwise the default

      k. handleLeadCenter(resultId, payload.lead_center, userId)

      l. IF KP: save resultHeader without geographic_scope_id
              (geo will come from CGSpace via the KP handler).
         ELSE:
           - findScope(scope_code, scope_label)
           - validateGeoFocus(scope, regions, countries, subnational_areas)
           - handleRegions(resultHeader, scope, regions)
           - handleCountries(resultHeader, countries, subnational_areas,
                             scope.id, userId)
           - save resultHeader with resolved geographic_scope_id

      m. handleTocMapping(toc_mapping, contributing_programs, userId, resultId)
           - Role 1 (Lead) processed FIRST.
           - Role 2 (Contributing programs) saved to share_result_request
             with status 4.

      n. handleInstitutions(resultId, contributing_partners, userId,
                            result_type_id)
      o. IF not KP: handleEvidence(resultId, evidence, userId)
      p. handleNonPooledProject(resultId, userId, contributing_bilateral_projects,
                                 result_type_id)

      q. runResultTypeHandlers({ resultId, userId, payload, isDuplicateResult })
           → dispatches afterCreate(...) on the right handler

      r. handleContributingCenters(resultId, contributing_center, userId,
                                    lead_center)

      s. IF KP: capture { knowledge_product_id, knowledge_product_handle }
                for the response.

      t. Append { id, result_code, is_duplicate_kp, ...kpExtra } to createdResults.

      u. Reload result with relations, filter active relations,
         enrichBilateralResultResponse(...) — this builds the typed *_summary
         that will be returned.

   v. COMMIT TRANSACTION.

3. Return { response: lastEnrichedResult, message, status: 201 }.
```

### 5.2 Critical invariants

- **One transaction per result.** Batch payloads do not roll back previously-committed results on a later error.
- **Identity is resolved before any insert.** Users are auto-created with `is_cgiar` flag derived from email domain regex `/cgiar/`.
- **CLARISA validation happens before opening the transaction** to keep failures cheap.
- **`status_id` on insert is always `PendingReview` (5)** for bilateral. Editing → Quality Assessed → Submitted is the editor lifecycle, not the bilateral one. Approve / Reject moves `5 → 6` or `5 → 7`.
- **`source` on insert is always `SourceEnum.Bilateral`**.
- **Audit columns** (`created_by`, `last_updated_by`, `external_submitter`, `external_submitted_date`, `external_submitted_comment`) are written from payload emails.

---

## 6. Per-handler business rules (Strategy pattern)

Handler interface — [`bilateral-result-type-handler.interface.ts`](../src/api/bilateral/handlers/bilateral-result-type-handler.interface.ts):

```ts
interface BilateralResultTypeHandler {
  readonly resultType: number; // matches ResultTypeEnum value

  initializeResultHeader?(ctx: {
    bilateralDto, userId, submittedUserId, version, year
  }): Promise<{ resultHeader, isDuplicate? } | null>;

  afterCreate?(ctx: {
    resultId, userId, isDuplicateResult?, bilateralDto
  }): Promise<void>;
}
```

The orchestrator routes through `resultTypeHandlerMap: Map<number, BilateralResultTypeHandler>`. The default header creation path is used when `initializeResultHeader` is omitted or returns `null`.

### 6.1 Knowledge Product handler

Source: [`knowledge-product.handler.ts`](../src/api/bilateral/handlers/knowledge-product.handler.ts).

- **`initializeResultHeader` is implemented** (the only handler that does this).
  - Requires `knowledge_product.handle`.
  - Creates the result header with placeholder `title="Loading from CGSpace: <handle>"` and `description="Metadata will be loaded from CGSpace"` if title/description not provided.
  - Sets `status_id = PendingReview (5)`, `source = Bilateral`, `external_submitter`, `external_submitted_date`, `external_submitted_comment`.
  - Returns `{ resultHeader, isDuplicate: false }`.
- **`afterCreate`:**
  - Skips processing if `isDuplicateResult` is true.
  - Calls `extractHandleIdentifier(handle)` to normalize CGSpace URLs → short form (`10568/175322`).
  - Calls `ResultsKnowledgeProductsService.populateKPFromCGSpace(resultId, handleId, userToken)` which fetches from DSpace and persists metadata.
  - All-or-nothing: a CGSpace fetch failure throws `BadRequestException` and rolls back the transaction.

### 6.2 Capacity Change handler

Source: [`capacity-change.handler.ts`](../src/api/bilateral/handlers/capacity-change.handler.ts).

- Maps string labels to CLARISA ids via in-memory maps:

  ```
  capdev_term:
    'phd' | 'ph.d.' | 'doctorate'     → 1
    'master' | 'masters'              → 2
    'short-term' | 'short term' | 'short' → 3
    'long-term' | 'long term' | 'long'    → 4
  capdev_delivery:
    'virtual/online' | 'online' | 'virtual'         → 1
    'in person' | 'in-person'                       → 2
    'blended (in-person and virtual)' | 'blended'   → 3
  ```

- Normalizes spaces and slashes (`normalizeCapacityLabel` — collapses `' /'` and `'/ '` to `'/'`, removes double-spaces, truncates to 1000 chars).
- Writes `male_using`, `female_using`, `non_binary_using`, `has_unkown_using` (note: column name uses `unkown` — preserve typo if you must talk to the same DB).
- Upserts on `result_object.id = resultId`.

### 6.3 Innovation Development handler

Source: [`innovation-development.handler.ts`](../src/api/bilateral/handlers/innovation-development.handler.ts).

- Resolves `innovation_typology`:
  - `code` ∈ {12, 13, 14, 15} OR `name` from a dictionary including a curly-quote variant (`’` vs `'` for `Other/I'm not sure/...`).
- Resolves `innovation_readiness_level` against CLARISA `clarisa_innovation_readiness_levels` (by `level` number or normalized `name`).
- Requires non-empty `innovation_developers` (free-form string, often `'A; B; C'`).
- Writes `result_innovations_dev { result_object, innovation_nature_id, innovation_developers, innovation_readiness_level_id, short_title = payload.title }`.

### 6.4 Innovation Use handler

Source: [`innovation-use.handler.ts`](../src/api/bilateral/handlers/innovation-use.handler.ts).

- Validates `current_innovation_use_numbers`:
  - `innov_use_to_be_determined` is required.
  - If `false`, `actors[]` is required.
- Resolves `innovation_use_level` against CLARISA `clarisa_innovation_use_levels` (by `level` number or `name`).
- **Delegates persistence to `InnovationUseService.saveInnovationUse(...)`** with a baked-in DTO:

  ```
  has_innovation_link: false
  innovation_use_level_id: <resolved>
  linked_results: []
  readiness_level_explanation: null
  has_scaling_studies: false
  scaling_studies_urls: []
  innov_use_2030_to_be_determined: true
  innov_use_to_be_determined: <from payload>
  actors: <from payload>
  organization: <from payload>
  measures: <from payload>
  ```

- The shared `InnovationUseService` writes actors, organizations, measures, and the use-level reference.

### 6.5 Policy Change handler

Source: [`policy-change.handler.ts`](../src/api/bilateral/handlers/policy-change.handler.ts).

- Resolves `policy_type` against CLARISA `clarisa_policy_types` (id, exact name, or punctuation-normalized name).
- Resolves `policy_stage` against CLARISA `clarisa_policy_stages` with a **simplified-id mapping** baked into the handler:
  - 1 → 6 (Stage 1)
  - 2 → 7 (Stage 2)
  - 3 → 8 (Stage 3)
  - Any other id is looked up as-is.
- For `policy_type.id === 1` (funding instrument): persists `status_amount` and `amount`. For other policy types: stored as `null`.
- Always writes `linked_innovation_dev: false`, `linked_innovation_use: false` on insert.
- Resolves `implementing_organization[]` against CLARISA institutions:
  - First by `institutions_id` if present.
  - Falls back to `LIKE %name%` AND `LIKE %acronym%` fuzzy matching.
  - Falls back further to the **last word of the name** if the full fuzzy match returned nothing.
- Persists matched institutions in `results_by_institution` with `institution_roles_id = 4` (POLICY_OWNER), keeping the existing soft-delete pattern.

### 6.6 Noop handler (Other Output / Other Outcome)

Source: [`noop.handler.ts`](../src/api/bilateral/handlers/noop.handler.ts).

- Implements both `initializeResultHeader` (returns `null` — fall through to default) and `afterCreate` (does nothing).
- Registered for both `OTHER_OUTPUT` and `OTHER_OUTCOME` (the same provider instance is used for both keys).
- Use as the template when adding a new ingestion-capable result type that needs no extra processing.

### 6.7 Result type enumeration (source of truth)

```ts
// onecgiar-pr-server/src/shared/constants/result-type.enum.ts
POLICY_CHANGE                        = 1
INNOVATION_USE                       = 2
CAPACITY_CHANGE                      = 3
OTHER_OUTCOME                        = 4
CAPACITY_SHARING_FOR_DEVELOPMENT     = 5
KNOWLEDGE_PRODUCT                    = 6
INNOVATION_DEVELOPMENT               = 7
OTHER_OUTPUT                         = 8
IMPACT_CONTRIBUTION                  = 9
INNOVATION_USE_IPSR                  = 10
COMPLEMENTARY_INNOVATION             = 11
```

```ts
// onecgiar-pr-server/src/shared/constants/result-status.enum.ts
Editing         = 1
QualityAssessed = 2
Submitted       = 3
Discontinued    = 4
PendingReview   = 5   // ← bilateral entry state
Approved        = 6
Rejected        = 7
```

---

## 7. External system dependencies (MUST exist on the target platform)

| System | Used for | Notes |
|---|---|---|
| **CLARISA** | Master data: institutions, centers, countries, regions, geographic scopes, subnational scopes, policy types, policy stages, innovation readiness levels, innovation use levels, initiatives (`official_code`), projects, portfolios, ToC phases. | Read-only consumer. The new platform either re-uses CLARISA via HTTP or replicates the cache locally. **Do not attempt to mirror CLARISA semantics from scratch** — the codes are externally meaningful. |
| **CGSpace (DSpace)** | Knowledge product metadata fetch (title, description, geographic focus, authors, etc.). | The KP handler **does NOT** trust title/description from the payload — they're overwritten by CGSpace data. Replicate `extractHandleIdentifier` and `populateKPFromCGSpace` semantics. |
| **Theory of Change services** | ToC trees and outcome ids, used to resolve `science_program_id + aow_compose_code + result_title + result_indicator_description` to a single ToC outcome row. | Read-only consumer. |
| **AWS Cognito + Active Directory (LDAP)** | Identity provisioning for editors (NOT for bilateral). | Bilateral skips AD lookups (`skipCgiarAdLookup: true`) and skips all emails (`skipAllEmails: true`) when auto-creating users. New platform can use any identity store but MUST honor the auto-create / no-notification semantics. |
| **MQAP** | Knowledge product attribute lookup (used by the duplicate-handle check). | Optional but the PRMS implementation calls it during `validateKnowledgeProductBeforeCreate`. |
| **AWS S3 / SharePoint** | Evidence file storage. Only metadata (`link`, `description`) is stored in PRMS DB. | Evidence URLs typically point to S3 / SharePoint / external DOIs. |

---

## 8. PRMS internal dependencies (must have local equivalents)

`bilateral.module.ts` imports ~30 sibling modules. On the target platform you need equivalent capabilities:

- **Result + status + level + type catalogs** — your equivalent of `Result`, `ResultStatus`, `ResultLevel`, `ResultType` and a `Submission` table for the lifecycle.
- **Result associations:** `ResultsCenters`, `ResultsByInstitutions` (with role discriminators — 3 = capdev on-behalf, 4 = policy implementing org), `ResultsByInititiatives` (with role 1=lead, role 2=contributing), `ResultsByProjects` (bilateral / non-pooled project linkage), `ResultsTocResults`, `ResultRegions`, `ResultCountries`, `ResultCountriesSubNational`, `ResultActors`, `Evidences`, `EvidenceTypes`.
- **Type-specific tables:** `ResultsKnowledgeProducts` (and FAIR baseline), `ResultsInnovationsDev`, `ResultsInnovationsUse`, `ResultsCapacityDevelopments`, `ResultsPolicyChanges`, `ResultQuestions` (for the question engine), `ResultIpMeasures`, `LinkedResults`.
- **Audit / review:** `ResultReviewHistory`, `ResultDeletionAudit`, `ShareResultRequest`.
- **Phase / version:** `Versioning` (active phase per app module), `Years` (active year).
- **Budgets:** `Result_*_budget` tables — initiative budget, bilateral project budget, partner institution budget.
- **CLARISA cache tables** (or a CLARISA HTTP client): institutions, initiatives, centers, countries, regions, geographic scopes, subnational scopes, policy types, policy stages, innovation readiness levels, innovation use levels, ToC phases, portfolios, projects.

If the target platform doesn't yet have these, they must be modeled first. **Skipping any will break downstream consumers** that consume the typed payloads.

---

## 9. Security & access posture

### 9.1 What's NOT enforced inside the module

- **No JWT verification.** Bilateral routes are excluded from JWT middleware (`app.module.ts` `.exclude(...)`) AND listed in `JwtMiddleware.publicRoutes`. The module does not check tokens.
- **No throttling.** `@SkipThrottle()` on the controller AND a global `ThrottlerExcludeBilateralGuard`. Large sync batches MUST NOT be rate-limited at the app layer.

### 9.2 What IS enforced

- **Helmet** (XSS filter, CSP) is on at the app level for all endpoints.
- **CORS** is open at the app level (`cors: true`) — restrict at the gateway per environment.
- **DTO validation** via class-validator, with `whitelist: true` stripping unknown fields.
- **Audit-by-payload-email** — every row carries `created_by` / `last_updated_by` resolved from the payload.
- **`status_id = PendingReview`** on insert — results CANNOT be Approved by the ingestion endpoint; only `api/results/reviewBilateralResult` (admin/PMU) can.

### 9.3 Perimeter responsibilities (MUST exist before exposing the API)

The target platform's gateway is responsible for:

- IP allowlist (sync sources, internal networks).
- Pre-shared key, mTLS, or signed query params for each consumer.
- WAF for SQL injection / payload size attacks.
- Per-consumer logging and rate limits (NOT in the app — at the gateway).
- TLS termination.

The `idempotencyKey` carried on `RootResultsDto` is informational today but the new platform SHOULD use it for true idempotency (see §13.4).

### 9.4 Secrets discipline (hard rule, project-wide)

Never log:

- The `auth` header (when present elsewhere — bilateral itself doesn't use one).
- Webhook URLs, API keys, AD/Cognito credentials, DB credentials.
- The `idempotencyKey` (rotates per sync — treat as semi-sensitive).
- Full payload bodies (may contain PII through user emails).

See [`/.cursorrules`](../../.cursorrules) for the full rule.

---

## 10. Transaction model

- **One DB transaction per result** in the batch (NestJS `dataSource.transaction(async (manager) => { ... })`).
- All sub-entity helpers (`handleLeadCenter`, `handleTocMapping`, `handleRegions`, `handleCountries`, `handleInstitutions`, `handleEvidence`, `handleNonPooledProject`, `handleContributingCenters`) and the handler's `afterCreate` run inside the same transaction.
- **CLARISA / CGSpace lookups happen INSIDE the transaction** — failures abort the transaction. The CGSpace fetch is part of `populateKPFromCGSpace`, called from the KP handler's `afterCreate`.
- **Pre-transaction validation:** `validateTocMappingInitiatives` runs first to fail-fast before opening a DB transaction.

### Implication for the port

If your target platform doesn't use TypeORM, the same single-result-transaction semantics must be preserved with the framework's native transaction primitive. **Do not commit partial results.** A result is either fully persisted with all its associations and type-specific blocks, or not at all.

For long-running CGSpace calls inside the transaction, the new platform should set a sane statement timeout (the PRMS service handles errors but does not currently cap the wall-clock).

---

## 11. Error handling & validation

### 11.1 Validation errors

- DTO validation produces a 400 with the standard NestJS validation error format. The response goes through `HttpExceptionFilter` and produces:

  ```json
  {
    "response": "...class-validator details...",
    "statusCode": 400,
    "message": "Bad Request",
    "timestamp": "...",
    "path": "/api/bilateral/create"
  }
  ```

- Handler-thrown `BadRequestException` carries actionable messages (e.g., `Invalid policy_type id: 42. Please provide a valid policy type ID.`).
- `NotFoundException` for missing master-data references.

### 11.2 Stack trace handling

- `HttpExceptionFilter` logs `exception.stack` server-side but **never** includes it in the response body.
- The new platform MUST follow this rule: stacks server-side only, structured client errors at the wire.

### 11.3 Idempotency on partial-batch failures

Current behavior: a 4xx/5xx mid-batch aborts the current result's transaction but previously-committed results stay. Callers SHOULD re-send only the failed result (use `idempotencyKey` if you implement it).

---

## 12. Observability

### 12.1 Logging

- NestJS `Logger` named after each class (`BilateralService`, `KnowledgeProductBilateralHandler`, `CapacityChangeBilateralHandler`, ...).
- Log on success: result id + `result_code` after each commit.
- Log on failure: error message + stack.
- **Never log:** payload bodies, emails (use just the count), tokens, `idempotencyKey`, webhook URLs.

### 12.2 What to log on the new platform

- Per-request: a correlation id (use the `idempotencyKey` if present, or generate one).
- Per-result: `result_id`, `result_code`, `result_type_id`, source/event type, success/failure boolean.
- Sync runs: count of successes vs failures.
- CGSpace fetch outcomes (handle, result_id, success/duration).
- CLARISA validation outcomes (count, fail reasons).

### 12.3 Metrics worth collecting

- Time per result (median, p95).
- CGSpace fetch latency.
- DB transaction duration.
- Validation failure rates by field.
- Auto-created-user rate (high rate = sync source is fragmenting users).

---

## 13. Idempotency model

### 13.1 Current PRMS behavior

- **The module does NOT enforce idempotency on `idempotencyKey`** — the field is accepted, logged optionally, and stored on the root payload only.
- **De-duplication is partial:**
  - **KP** — duplicate handle within the active phase is rejected by `validateKnowledgeProductBeforeCreate` before any insert.
  - **Non-KP** — `ensureUniqueTitle(title, version.id)` rejects duplicate titles in the active phase.
- **Same payload sent twice:** the second call creates a duplicate result with a new id, unless one of the uniqueness rules triggers first.

### 13.2 Implications for downstream consumers

Sync sources that retry on network errors WILL create duplicates today. The current mitigation is human review (PMU Approve / Reject).

### 13.3 Recommended improvements for the port

Strongly recommended if the new platform handles higher sync volume:

- **Persist `idempotencyKey`** on the result row (or in a side table) and reject duplicates with a 200 + the previously-created result id.
- **Per-tenant rate budget** at the gateway.
- **Dead-letter / replay** for the rare hard-fail (DB unavailable, CGSpace timeout).

### 13.4 Backwards-compat note

If you add idempotency persistence, it can be **additive** — sync sources without `idempotencyKey` keep the old behavior; sync sources with one get the dedupe guarantee.

---

## 14. Backwards compatibility & versioning

### 14.1 Read contract

- Additive changes only on `data` and `*_summary` blocks.
- Removals or renames require a `v2` rollout under `/v2/api/bilateral/*` (preserving `/api/bilateral/*`).
- Every change MUST update [`bilateral-result-summaries.en.md`](./bilateral-result-summaries.en.md) (the affected section + the change log table at the bottom).

### 14.2 Write contract

- Adding optional fields is fine.
- Removing required fields needs coordination with every sync source.
- Adding a new required field is a **breaking change** for existing sync sources — bundle it with a deprecation window and a `v2` rollout.

### 14.3 Schema migrations

- New columns / tables go through standard migrations on the target platform.
- Migrations MUST be reversible.
- Don't edit a migration after it lands.

---

## 15. Performance & capacity

### 15.1 Hard limits

- **Body size:** 50 MB (`json({ limit: '50mb' })`). Bulk sync sources can push large payloads.
- **`POST /create` is NOT throttled.** A single sync run can send many requests in burst.
- **`GET /list`:** `limit` capped at 500 per page, default 10.

### 15.2 Hot paths

- `enrichBilateralResultResponse` is called on every read endpoint. It loads many relations and builds the typed summary — this is the dominant CPU/IO cost on `GET /list`.
- The KP handler does an HTTP call to CGSpace inside the transaction — that latency dominates KP ingestion.
- The Policy Change handler does fuzzy `LIKE %name%` queries against CLARISA institutions — index `clarisa_institution.name` and `clarisa_institution.acronym` on the new platform.

### 15.3 Recommendations for the new platform

- Cache CLARISA catalog tables in-process (the PRMS server already does this via cron syncs).
- Add a connection-pool size matched to peak parallel sync requests.
- Consider streaming the `GET /results` response for very large datasets (it's currently buffered).
- If the new platform supports it, push `enrichBilateralResultResponse` into a read-model / materialised view per result.

---

## 16. Data integrity invariants

These MUST hold on the new platform regardless of language / framework.

1. **`source` of a bilateral-ingested result is `Bilateral`.**
2. **`status_id` of a bilateral-ingested result is `PendingReview` (5) on insert.** It moves to `Approved` (6) or `Rejected` (7) only through the review surface in `api/results/`.
3. **`Result.created_by` is a real user id.** If the payload email is unknown, the user is auto-created first.
4. **ToC role 1 (Lead) MUST be saved before role 2 (Contributing).** The lead defines the result owner.
5. **CLARISA `official_code` validation on initiatives** happens before the transaction begins.
6. **KP handle uniqueness is per active phase**, not global.
7. **Non-KP titles are unique per active phase.**
8. **Audit columns** (`created_by`, `last_updated_by`, `external_submitter`, `external_submitted_date`, `external_submitted_comment`) are populated from the payload.
9. **Identifiers in the read payload are CLARISA ids**, not PRMS join PKs.
10. **`*_summary` blocks omit the heavy ORM trees** they replace — e.g., `result_knowledge_product_array` is removed when the KP summary is emitted.

Test these in the new platform as **contract tests** against fixtures derived from real PRMS payloads.

---

## 17. What's portable vs PRMS-specific

| Concern | Portable? | Notes |
|---|---|---|
| Endpoint paths + query params | **Must be identical** (consumers rely on them). | — |
| Response payload shapes | **Must be identical** apart from additive changes. | — |
| `RootResultsDto` shape (input) | **Should be identical** to avoid breaking sync sources. | — |
| DTO validator library (`class-validator`) | **Replace** with the target platform's equivalent. | Behavior must match (whitelist + transform + conditional). |
| Strategy-pattern handler map | **Pattern is portable.** | Replace `@Injectable()` with the target DI mechanism. |
| TypeORM / MySQL | Replace with the target ORM + DB. | Constraints: transactions, unique-per-phase, fuzzy `LIKE` on institutions. |
| NestJS `Module`/`Controller`/`Service` decorators | Replace with the target framework's primitives. | — |
| `ResponseInterceptor` / `HttpExceptionFilter` envelope | **Behavior is portable.** | Arrays pass through unchanged; objects wrapped with `{ response, statusCode, message, timestamp, path }`. |
| `JwtMiddleware` exclusion | Implement perimeter-only auth on target. | The module must not require an auth token. |
| `@SkipThrottle()` | Skip throttling on target. | — |
| `findOrCreateUser` semantics (CGIAR email regex, skip-AD, skip-emails) | **Behavior is portable.** | Implementation depends on the target identity store. |
| CLARISA / CGSpace / ToC integrations | **External — must integrate.** | Cache strategy is a target-side decision. |
| Validation error format | Match the standard envelope. | Helps consumers parse errors uniformly. |
| `idempotencyKey` field | **Add real idempotency** (recommended). | Today it's informational. |
| Swagger annotations | Use the target framework's API doc tooling. | The Swagger surface IS the consumer-facing docs — keep it complete. |

---

## 18. Recommended target architecture

Framework-agnostic skeleton:

```
bilateral/
├── api/
│   ├── BilateralController              # 5 endpoints, validation pipe, response envelope
│   └── BilateralRouter                  # /api/bilateral/* mount
├── domain/
│   ├── CreateBilateralCommand           # input DTO tree
│   ├── ListResultsQuery                 # query DTO
│   └── BilateralResult / Summary        # output payload types
├── orchestration/
│   ├── BilateralService                 # create / list / find / findAll / getResultsForSync
│   ├── HandlerRegistry                  # resultType → handler map
│   ├── UnwrapIncomingResults            # accept all RootResultsDto variants
│   ├── ValidateTocMappingInitiatives    # pre-transaction CLARISA check
│   └── EnrichBilateralResponse          # build typed *_summary
├── handlers/                            # one per result type
│   ├── KnowledgeProductHandler          # initializeResultHeader + afterCreate (CGSpace)
│   ├── CapacityChangeHandler            # afterCreate (capdev term / delivery method)
│   ├── InnovationDevelopmentHandler     # afterCreate (typology / readiness)
│   ├── InnovationUseHandler             # afterCreate (use level + actors/orgs/measures)
│   ├── PolicyChangeHandler              # afterCreate (type/stage + implementing orgs)
│   └── NoopHandler                      # other_output / other_outcome
├── persistence/
│   ├── ResultRepository                 # query + save + uniqueness checks
│   ├── associations/                    # ToC, geo, partners, evidence, projects, centers
│   ├── typeSpecific/                    # KP, IDev, IUse, capdev, policy
│   └── budgets/                         # initiative / bilateral / partner
├── external/
│   ├── CGSpaceClient                    # populateKPFromCGSpace
│   ├── ClarisaCache                     # institutions, types, stages, levels, ...
│   └── TocClient
├── identity/
│   └── FindOrCreateUser                 # email → user, auto-create with is_cgiar flag
└── infrastructure/
    ├── transactions/                    # one transaction per result
    ├── errors/                          # HttpExceptionFilter equivalent
    ├── responses/                       # ResponseInterceptor equivalent
    └── logging/                         # named loggers, no-secrets rule
```

### Layering rules

1. `api/` calls `orchestration/` only.
2. `orchestration/` calls `handlers/`, `persistence/`, `external/`, `identity/` via interfaces.
3. `handlers/` consume `persistence/` and `external/`; they MUST NOT call other handlers.
4. `persistence/` knows the DB; nothing else should.
5. `external/` knows the external system; nothing else should.

### Why this structure

- The PRMS service is large (~4 600 lines) because orchestration sits next to enrichment. Splitting `EnrichBilateralResponse` out makes the read path independently testable.
- The Strategy registry is the single change-point for adding a new result type — mirror this on the new platform.
- Identity resolution is isolated so the new platform can switch from PRMS users to its own user store with no ripple.

---

## 19. Open questions for the target platform

Resolve these BEFORE writing code:

1. **Target language and framework?**
2. **Target database?** Bilateral uses MySQL with TypeORM. If the new platform uses Postgres / SQL Server / Mongo, plan the schema migration.
3. **Existing CLARISA cache?** If yes, reuse the connector. If no, the new platform must implement both the CLARISA HTTP client AND a scheduled sync job.
4. **Existing user store?** Bilateral auto-creates users with `is_cgiar` derived from email domain. If the target identity store has different rules (e.g., AD-only), the auto-create path needs adjusting.
5. **Perimeter strategy?** Bilateral relies on the perimeter for authn. Confirm gateway / IP allowlist / pre-shared key approach on the target platform.
6. **CGSpace access?** Confirm network reachability and any auth required to fetch handles.
7. **ToC service version?** P22 vs P25 catalogs are different — the platform must respect `portfolioAcronym` when resolving ToC trees.
8. **Idempotency policy?** Strongly recommend implementing real `idempotencyKey` enforcement on the new platform — costs little, prevents duplicates.
9. **Bulk POST policy?** Sync sources may send batches. Confirm max batch size and per-result vs per-batch error semantics.
10. **Downstream consumers' current state?** Catalog every external system that reads `/api/bilateral/*` today and notify them before/during rollout.
11. **Migration path?** Will the new platform run in parallel, or replace PRMS entirely? Parallel runs require both platforms to emit identical shapes (and reconcile duplicates).
12. **Versioning posture?** Will the target adopt `/v2/api/bilateral/*` immediately, or maintain shape parity with `/api/bilateral/*`?

---

## 20. Testing strategy on the target platform

### 20.1 Contract tests (highest priority)

- For each result type (`knowledge_product`, `capacity_sharing`, `innovation_development`, `innovation_use`, `policy_change`, `innovation_package`):
  - Capture a real PRMS payload fixture (from `/api/bilateral/list` against test environment).
  - Assert the target's response matches the fixture (modulo additive fields).
- Run these tests in CI against every PR that touches enrichment.

### 20.2 Ingestion tests

- One per `result_type_id`: send a canonical payload, assert the result row, associations, type-specific block, and audit columns.
- Edge cases: missing required field, unknown CLARISA name (fuzzy match), duplicate handle (KP), duplicate title (non-KP), nested validation (`policy_type.id === 1 with status_amount`).
- Batch test: 3 results, second one fails — assert first commits, second rolls back, third commits.

### 20.3 Identity tests

- New email → user auto-created with `is_cgiar = true` for `@cgiar.org` emails, `false` otherwise.
- Existing email → reuse user, no notification.

### 20.4 Security tests

- Verify endpoints are reachable without a JWT.
- Verify SQL-injection vector on `search` is escaped.
- Verify the perimeter (NOT the app) rejects requests outside the allowlist — this is an integration test, not a unit test.

### 20.5 Performance tests

- Sustained ingestion at 100 results / minute.
- p95 latency on `GET /list` with `limit=100`.
- CGSpace fetch timeout handling (mock CGSpace to be slow / fail).

---

## 21. Quick-reference checklist for the port

- [ ] Replicate the 5 endpoints with identical paths, query params, body shapes, and response shapes.
- [ ] Strip JWT and throttling from the bilateral routes; protect at the perimeter.
- [ ] Implement `whitelist + transform + conditional` DTO validation.
- [ ] Replicate the response envelope: arrays pass through; objects wrapped as `{ response, statusCode, message, timestamp, path }`.
- [ ] One transaction per result; pre-transaction CLARISA validation; commit-or-rollback semantics.
- [ ] Implement the 6 handlers (KP, CapDev, IDev, IUse, Policy, Noop) with the Strategy registry.
- [ ] Persist users by `findOrCreateUser` semantics (`is_cgiar` from email regex, skip AD lookup, no notifications).
- [ ] Set `status_id = PendingReview` and `source = Bilateral` on every insert.
- [ ] Replicate per-type summary builders against the payload contract.
- [ ] Add real idempotency on `idempotencyKey` (recommended).
- [ ] Mirror the change-log discipline in [`bilateral-result-summaries.en.md`](./bilateral-result-summaries.en.md) — every shape change updates the doc.
- [ ] Contract tests against captured PRMS payloads.
- [ ] Notify every downstream consumer before flipping over.

---

## 22. Useful PRMS source pointers

When you need to look up specifics during the port, anchor against these files in this repo:

- Controller (Swagger surface): [`../src/api/bilateral/bilateral.controller.ts`](../src/api/bilateral/bilateral.controller.ts)
- Service (orchestration + enrichment): [`../src/api/bilateral/bilateral.service.ts`](../src/api/bilateral/bilateral.service.ts)
- Module wiring (the ~30 sibling imports): [`../src/api/bilateral/bilateral.module.ts`](../src/api/bilateral/bilateral.module.ts)
- Ingestion DTO tree: [`../src/api/bilateral/dto/create-bilateral.dto.ts`](../src/api/bilateral/dto/create-bilateral.dto.ts)
- List query DTO: [`../src/api/bilateral/dto/list-results-query.dto.ts`](../src/api/bilateral/dto/list-results-query.dto.ts)
- Handler interface: [`../src/api/bilateral/handlers/bilateral-result-type-handler.interface.ts`](../src/api/bilateral/handlers/bilateral-result-type-handler.interface.ts)
- Handler implementations: [`../src/api/bilateral/handlers/`](../src/api/bilateral/handlers/)
- Result type enum: [`../src/shared/constants/result-type.enum.ts`](../src/shared/constants/result-type.enum.ts)
- Result status enum: [`../src/shared/constants/result-status.enum.ts`](../src/shared/constants/result-status.enum.ts)
- CLARISA endpoint registry: [`../src/clarisa/clarisa-endpoints.enum.ts`](../src/clarisa/clarisa-endpoints.enum.ts)
- JWT middleware (and bilateral exclusion): [`../src/auth/Middlewares/jwt.middleware.ts`](../src/auth/Middlewares/jwt.middleware.ts)
- Throttler exclusion: [`../src/shared/guards/throttler-exclude-bilateral.guard.ts`](../src/shared/guards/throttler-exclude-bilateral.guard.ts)
- Global filter: [`../src/shared/handlers/error.exception.ts`](../src/shared/handlers/error.exception.ts)
- Response interceptor: [`../src/shared/Interceptors/Return-data.interceptor.ts`](../src/shared/Interceptors/Return-data.interceptor.ts)
- Lifecycle workflows (Approve/Reject after creation): [`../src/api/results/results.service.ts`](../src/api/results/results.service.ts) + [`../src/api/results/AGENTS.md`](../src/api/results/AGENTS.md)

---

*Document generated as a portability blueprint. Treat it as a living document — when you replicate this module elsewhere, update both the new platform's documentation AND this blueprint to capture deviations.*
