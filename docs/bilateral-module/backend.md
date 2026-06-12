# Bilateral Module Backend Guide

This guide explains the backend side of the bilateral module: headless ingestion, typed result creation, list/detail enrichment, and review lifecycle. The current implementation spans `onecgiar-pr-server/src/api/bilateral/` and `onecgiar-pr-server/src/api/results/`.

## Backend Responsibilities

The backend has two separate responsibilities that must remain distinct in a rebuild:

- **Bilateral ingestion and sync** under `api/bilateral/`: accepts external payloads, creates PRMS results, links common associations, and returns enriched bilateral result data.
- **Bilateral management and review** under `api/results/`: exposes authenticated endpoints for dashboard lists, pending counts, detail loading, title edits, ToC/data-standard review updates, and approve/reject decisions.

## Security Posture

Current PRMS behavior:

- `/api/bilateral/*` is excluded from JWT middleware in `app.module.ts`.
- `BilateralController` is decorated with `@SkipThrottle()`.
- `ResponseInterceptor` is applied to wrap standard responses, while sync endpoints can return raw arrays.
- Perimeter security is expected outside NestJS for ingestion and sync consumers.
- `/api/results/bilateral/*` remains authenticated through normal API middleware.

Rebuild guidance:

- If the new tool exposes ingestion endpoints publicly, add API keys, HMAC signatures, mTLS, IP allowlists, or equivalent perimeter controls.
- Never log tokens, auth headers, idempotency keys, credentials, or full user payloads.
- Keep authenticated review endpoints separate from unauthenticated ingestion endpoints.

## Backend Module Map

```text
api/bilateral/
├── bilateral.controller.ts
├── bilateral.service.ts
├── bilateral.module.ts
├── dto/
│   ├── create-bilateral.dto.ts
│   └── list-results-query.dto.ts
└── handlers/
    ├── bilateral-result-type-handler.interface.ts
    ├── knowledge-product.handler.ts
    ├── capacity-change.handler.ts
    ├── innovation-development.handler.ts
    ├── innovation-use.handler.ts
    ├── policy-change.handler.ts
    └── noop.handler.ts
```

```text
api/results/
├── results.controller.ts
├── results.service.ts
├── result.repository.ts
├── summary/
├── results-toc-results/
├── results-centers/
├── results_by_inititiatives/
├── results_by_institutions/
├── result-countries/
├── result-regions/
├── evidences/
├── results_by_projects/
├── result_budget/
└── result-review-history/
```

## Ingestion Controller

Current controller: `api/bilateral/bilateral.controller.ts`.

| Endpoint | Purpose | Service method |
|---|---|---|
| `POST /api/bilateral/create` | Create one or more bilateral results from external payloads. | `BilateralService.create` |
| `GET /api/bilateral` | Get recent active bilateral results, default limit 10. | `findAll` |
| `GET /api/bilateral/list` | Paginated list across Result/API sources with filters. | `listAllResults` |
| `GET /api/bilateral/results` | Raw sync list for external synchronization. | `getResultsForSync` |
| `GET /api/bilateral/:id` | Get one bilateral result by internal result id. | `findOne` |

Validation behavior:

- `POST /create` uses `ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true })`.
- Unknown fields are stripped if not declared, but forbidden non-whitelisted errors are not raised.
- DTOs use `class-validator`, `class-transformer`, and Swagger decorators.

## Ingestion Flow

`BilateralService.create(rootResultsDto)` is the main orchestration flow.

```text
RootResultsDto
  -> unwrapIncomingResults()
  -> for each result:
       validate data object
       validate Science Program codes against CLARISA initiatives
       start DB transaction
       find admin user
       find or create created_by user
       find or create submitted_by user
       resolve active reporting phase
       resolve active year
       validate KP issue year if Knowledge Product
       validate KP duplicate or non-KP unique title
       initialize result header
       handle lead center
       handle geography for non-KP, or defer KP geography to CGSpace population
       handle ToC mapping
       handle contributing partners
       handle evidence, except KP evidence
       handle bilateral projects and budgets
       run type-specific handler
       handle contributing centers
       enrich and return result response
```

Transaction rule: common result, associations, and typed handler writes are created inside one transaction. A failure should roll back the result and related records.

## Root Payload Forms

`RootResultsDto` supports three ingestion shapes:

```json
{ "result": { "type": "BILATERAL", "data": { } } }
```

```json
{ "results": [{ "type": "BILATERAL", "data": { } }] }
```

```json
{ "type": "knowledge_product", "data": { }, "received_at": "...", "idempotencyKey": "..." }
```

The service normalizes these through `unwrapIncomingResults()`.

## Common Ingestion DTO

`CreateBilateralDto` contains shared fields used by all result types:

| Field | Required | Notes |
|---|---|---|
| `result_type_id` | Yes | Numeric PRMS result type id. Use `ResultTypeEnum`. |
| `result_level_id` | Yes | Result level reference. |
| `created_date` | Yes | Source creation date string. |
| `submitted_by` | Yes | Email, name, submitted date, optional comment. |
| `created_by` | Yes | Email and name. |
| `lead_center` | Yes | Name, acronym, or CLARISA institution id. |
| `title` | Non-KP only | KP gets title from CGSpace/metadata. |
| `description` | Non-KP only | KP gets description from metadata. |
| `toc_mapping` | Yes | Lead Science Program and optional ToC fields. |
| `contributing_programs` | Optional | Contributing Science Programs, stored as share requests. |
| `geo_focus` | Non-KP only | Scope plus regions/countries/subnational areas. |
| `contributing_center` | Optional | CGIAR centers. |
| `contributing_partners` | Optional | Partner institutions. |
| `evidence` | Optional | URLs and descriptions. |
| `contributing_bilateral_projects` | Yes | Grant titles, lead flag, budget metadata. |

## Type-Specific Ingestion Blocks

| Result type | `result_type_id` | Required block | Handler |
|---|---:|---|---|
| Policy change | 1 | `policy_change` | `PolicyChangeBilateralHandler` |
| Innovation use | 2 | `innovation_use` | `InnovationUseBilateralHandler` |
| Capacity sharing for development | 5 | `capacity_sharing` | `CapacityChangeBilateralHandler` |
| Knowledge product | 6 | `knowledge_product` | `KnowledgeProductBilateralHandler` |
| Innovation development | 7 | `innovation_development` | `InnovationDevelopmentBilateralHandler` |
| Other output/outcome | 8/4 | No typed block | `NoopBilateralHandler` |

## Handler Interface

Handlers implement `BilateralResultTypeHandler`:

```ts
interface BilateralResultTypeHandler {
  readonly resultType: number;
  initializeResultHeader?(context): Promise<{ resultHeader: Result; isDuplicate?: boolean } | null>;
  afterCreate?(context): Promise<void>;
}
```

Design intent:

- Keep common result creation in `BilateralService`.
- Put result-type-specific database writes in handlers.
- Use `initializeResultHeader` only when a result type needs special header creation, such as Knowledge Products.
- Use `afterCreate` for typed tables and derived associations.

## Knowledge Product Special Case

Knowledge Product ingestion differs from other result types:

- Requires `knowledge_product.handle`.
- Does not trust `title` or `description` from the payload.
- Uses `ResultsKnowledgeProductsService` to fetch or populate metadata from CGSpace/DSpace/MQAP sources.
- Validates `metadataCG.issue_year` against known `years` when provided.
- Skips normal evidence creation in the common flow to avoid duplicating or malformed KP evidence.
- May use existing KP records to detect duplicates.

Any rebuild must treat KP as metadata-sourced rather than purely payload-sourced.

## ToC Mapping Rules

`handleTocMapping()` maps the incoming lead and contributing Science Programs.

Rules:

- `toc_mapping.science_program_id` is the lead program and maps to initiative role 1.
- `contributing_programs[].science_program_id` maps to contributing role 2.
- All Science Program IDs are validated against CLARISA initiative `official_code` before transaction work continues.
- Role 1 is processed first and establishes `ownerInitiativeId`.
- Role 2 entries create `share_result_request` rows with request status 4.
- If ToC result fields are present, the service attempts to find a ToC result; if not found, it creates initiative-only mapping.
- Missing `result_title` results in initiative-only mapping without ToC result lookup.

## Geography Rules

Non-KP results require `geo_focus`.

Accepted scope codes/labels:

| Code | Label |
|---:|---|
| 1 | Global |
| 2 | Regional |
| 4 | National |
| 5 | Sub-national |
| 50 | This is yet to be determined |

Validation:

- Regional requires at least one region.
- National requires at least one country.
- Sub-national requires countries and subnational areas.
- Region lookup supports UM49 code or name.
- Country lookup supports id, name, ISO alpha-3, or ISO alpha-2.

## User Creation

`findOrCreateUser(userData, adminUser)`:

- Requires an email.
- Finds existing user by email.
- If missing, creates a user with first name from payload, last name `(external)`, and `is_cgiar` inferred from email domain.
- Uses `UserService.createFull` with AD lookup and emails skipped.
- Audits created records using admin or creator user ids.

Rebuild guidance:

- Do not block ingestion on Active Directory lookups for external submitters.
- Keep a deterministic external-user creation path.
- Avoid logging full emails in production debug logs if privacy rules require masking.

## Result Header Defaults

The header created for bilateral results includes:

- `source = SourceEnum.Bilateral`.
- Active reporting phase from `VersioningService.$_findActivePhase(AppModuleIdEnum.REPORTING)`.
- Active year from `YearRepository`.
- Creator and submitter user ids.
- Status appropriate to review workflow, typically `Pending Review` for reviewable bilateral results.
- Result type, result level, title, description, and geographic scope where applicable.

Exact field assignment lives in `initializeResultHeader` and any type-specific handler overrides.

## List And Sync Enrichment

`BilateralService` exposes three read patterns:

- `findAll(limit)` returns recent active bilateral results with relations and enrichment.
- `listAllResults(query)` returns paginated results across PRMS and API sources with filters and metadata.
- `getResultsForSync(bilateral, type)` returns raw array items `{ type, result_id, data }` for external sync.

Filters in `listAllResults`:

- `source`: `Result` maps to `SourceEnum.Result`; `API` maps to `SourceEnum.Bilateral`.
- `portfolio`: portfolio acronym through version portfolio relation.
- `phase_year`: version year.
- `result_type`: name mapped to result type id.
- `status_id` and `status`.
- `last_updated_from`, `last_updated_to`, `created_from`, `created_to`.
- `center`: lead center id/code or acronym.
- `initiative_lead_code`: lead initiative official code.
- `search`: escaped title `LIKE` search.

Pagination defaults:

- page 1
- limit 10
- max limit 500

## Results Review Backend

The frontend review workspace calls authenticated endpoints in `api/results`.

Key service methods in `ResultsService`:

| Method | Purpose |
|---|---|
| `getScienceProgramProgress` | Progress cards by Science Program. |
| `getPendingReviewCount` | Count pending bilateral results by program. |
| `getResultsByProgramAndCenters` | Grouped table rows by bilateral project and center selection. |
| `getBilateralResultById` | Full detail for review drawer. |
| `updateBilateralResultTitle` | Inline title update with uniqueness/status rules. |
| `updateBilateralResultTocMetadata` | Save ToC review edits with justification. |
| `updateBilateralResultReview` | Save data-standard review edits with justification. |
| `reviewBilateralResult` | Approve or reject with audit history. |

## Bilateral Detail Load

`getBilateralResultById(resultId, user)` loads:

- Common fields.
- ToC metadata.
- Geographic scope.
- Contributing centers.
- Contributing projects.
- Contributing initiatives, split into primary/accepted/pending where applicable.
- Contributing institutions.
- Evidence.
- Type-specific response.
- Contributor ToC result rows for display.

It must check `source = SourceEnum.Bilateral` so regular PRMS results are not handled by bilateral review endpoints.

## Review Decisions

`reviewBilateralResult(resultId, dto, user)` controls approve/reject.

Expected body:

```json
{ "decision": "APPROVE", "justification": "Approved" }
```

```json
{ "decision": "REJECT", "justification": "Reason entered by reviewer" }
```

Rules:

- Result must exist and have `source = Bilateral`.
- Reject requires justification.
- Status changes must go through the review method, not direct repository updates.
- Review history must record actor, decision, timestamp, and justification.
- Approval may trigger ToC mapping updates and contributor workflows.

## Data-Standard Updates

`updateBilateralResultReview` accepts the drawer's data-standard body:

- Common description/type fields.
- Geography and extra geography.
- Contributing centers and lead center marker.
- Contributing bilateral projects.
- Accepted and pending contributing initiatives.
- Contributing institutions.
- Evidence.
- Type-specific response.
- Update explanation.

Rebuild rules:

- Validate update explanation.
- Update only fields present in the payload, except explicit empty arrays should clear relationships.
- Preserve audit columns and soft-delete inactive relations instead of hard-deleting where possible.
- Use type-specific services/repositories for typed fields.

## Type-Specific Review Data

Backend detail and update logic uses these typed response families:

| Result type | Detail method/source | Update concerns |
|---|---|---|
| Policy change | `getPolicyChangeBilateralResultById` | Policy type/stage and implementing organizations. |
| Innovation use | `getBilateralInnovationUseData` and repository fallback | Actors, organizations, measures, investment partners/projects. |
| Capacity sharing | `getCapacitySharingBilateralResultById` | Gender disaggregated participants, term, delivery method. |
| Knowledge product | `getKnowledgeProductBilateralResultById` | Metadata, licence, keywords, handle-derived fields. |
| Innovation development | `getInnovationDevBilateralResultById` | Typology, developers, readiness level, questionnaire/investment data. |

The `summary/summary.service.ts` and related repositories provide reusable save/get patterns for capacity sharing, innovation development/use, and policy change.

## Data Model Dependencies

Core entities and joins used by bilateral flows:

- `Result` with `source`, `result_code`, `result_type_id`, `result_level_id`, `status_id`, phase/version, year, audit fields.
- `User` for creator/submitter/reviewer.
- `ResultReviewHistory` for decisions and update audit.
- `ResultsByInititiatives` for lead initiative/Science Program mapping.
- `ShareResultRequest` for contributing Science Program requests.
- `ResultsTocResult`, `ResultsTocResultIndicators`, `ResultsTocTargetIndicator` for ToC alignment.
- `ResultsCenter` for contributing and lead centers.
- `ResultsByInstitution` and `ResultsByInstitutionType` for partners, implementing organizations, and innovation-use organizations.
- `ResultCountry`, `ResultRegion`, `ResultCountrySubnational` for geography.
- `Evidence` and evidence SharePoint joins.
- `ResultsByProjects` and non-pooled project budget repositories for bilateral projects and investments.
- Typed result tables for KP, capacity sharing, innovation development, innovation use, and policy change.

External catalogs:

- CLARISA initiatives, centers, institutions, countries, regions, subnational areas, projects, policy types/stages, innovation typology/readiness/use levels.
- ToC services and ToC level/result catalogs.
- CGSpace/MQAP for Knowledge Product metadata.

## Tests To Preserve

Backend tests should cover:

- DTO validation for required type-specific blocks.
- `unwrapIncomingResults` behavior for single, bulk, and direct-data payloads.
- CLARISA initiative validation failures.
- User creation fallback for external submitters.
- KP duplicate/metadata behavior.
- Each type-specific handler.
- List filters and pagination boundaries.
- Bilateral detail shape by result type.
- Review decision transitions and rejection justification.
- Data-standard update body mapping, including empty arrays.
- Payload shape tests against `bilateral-result-summaries.en.md`.

## Backend Risks To Avoid

- Do not add new public paths to `JwtMiddleware.publicRoutes`; use middleware exclusion and perimeter protection intentionally.
- Do not bypass CLARISA validation for external codes.
- Do not hardcode result type ids outside enum maps.
- Do not update `status_id` directly; use review workflows.
- Do not return PRMS join ids in external payloads when CLARISA ids or labels are expected.
- Do not modify landed migrations; create new migrations for schema changes.
- Do not log idempotency keys, tokens, headers, secrets, or sensitive payload fields.
