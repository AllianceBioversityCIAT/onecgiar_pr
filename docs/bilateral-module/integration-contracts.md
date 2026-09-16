# Bilateral Module Integration Contracts

This document summarizes the API and payload contracts that connect external bilateral sources, the backend ingestion/review services, and the frontend review workspace.

The authoritative field-by-field export contract remains `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`. This file focuses on integration responsibilities and request/response shape boundaries.

## Response Envelope

Most authenticated PRMS endpoints return:

```json
{
  "response": {},
  "statusCode": 200,
  "message": "Successful response",
  "timestamp": "2026-05-12T00:00:00.000Z",
  "path": "/api/..."
}
```

Backend services often return internal service envelopes:

```ts
{ response, message, status }
```

`ResponseInterceptor` turns those into API envelopes.

Exception: some bilateral sync endpoints return raw arrays intentionally, especially list entries shaped as `{ type, result_id, data }`.

## Auth Headers

| Surface | Auth behavior |
|---|---|
| `/api/bilateral/*` | JWT-excluded in PRMS; protect at perimeter. |
| `/api/results/bilateral/*` | Authenticated with custom `auth: <JWT>` header. |
| `/api/results-framework-reporting/*` | Authenticated with custom `auth: <JWT>` header. |
| `/clarisa/*`, `/toc/*` | Authenticated with custom `auth: <JWT>` header in PRMS. |

Do not use `Authorization: Bearer` unless the backend adapter explicitly supports it.

## Status Semantics

Known statuses used by bilateral UI and APIs:

| ID | Name | Notes |
|---:|---|---|
| 1 | Editing | Standard PRMS editing state. |
| 2 | Quality Assessed | Standard QA state. |
| 3 | Submitted | Standard submitted state. |
| 4 | Discontinued | Standard discontinued state. |
| 5 | Pending Review | Bilateral result awaiting Science Program review. |
| 6 | Approved | Bilateral result accepted by reviewer. |
| 7 | Rejected | Bilateral result rejected by reviewer. |

The frontend currently handles `status_id` as either string or number. Rebuilds should coerce to number at the API boundary.

## Result Type Mapping

| ID | API string | Display name |
|---:|---|---|
| 1 | `policy_change` | Policy change |
| 2 | `innovation_use` | Innovation use |
| 4 | `other_outcome` | Other outcome |
| 5 | `capacity_sharing` | Capacity sharing for development |
| 6 | `knowledge_product` | Knowledge product |
| 7 | `innovation_development` | Innovation development |
| 8 | `other_output` | Other output |
| 10 | `innovation_package` | Innovation Package / IPSR |

Use enum constants in code, not numeric literals.

## External Ingestion Contract

Endpoint:

```text
POST /api/bilateral/create
```

Accepted root shapes:

```json
{
  "result": {
    "type": "BILATERAL",
    "data": {}
  }
}
```

```json
{
  "results": [
    {
      "type": "BILATERAL",
      "data": {}
    }
  ]
}
```

```json
{
  "type": "knowledge_product",
  "received_at": "2026-05-12T00:00:00.000Z",
  "idempotencyKey": "external-key",
  "tenant": "external-system",
  "op": "dataset.ingest.requested",
  "data": {}
}
```

Common `data` fields:

```json
{
  "result_type_id": 6,
  "result_level_id": 4,
  "created_date": "2025-09-15",
  "submitted_by": {
    "email": "jane.doe@example.org",
    "name": "Jane Doe",
    "submitted_date": "2025-09-30",
    "comment": "Optional"
  },
  "created_by": {
    "email": "john.smith@example.org",
    "name": "John Smith"
  },
  "lead_center": {
    "name": "Alliance Bioversity - CIAT",
    "acronym": "CIAT",
    "institution_id": 501
  },
  "title": "Required for non-KP",
  "description": "Required for non-KP",
  "toc_mapping": {
    "science_program_id": "SP01",
    "aow_compose_code": "SP01-AOW1",
    "result_title": "Optional ToC result title",
    "result_indicator_description": "Optional indicator description",
    "result_indicator_type_name": "Output"
  },
  "contributing_programs": [],
  "geo_focus": {},
  "contributing_center": [],
  "contributing_partners": [],
  "evidence": [],
  "contributing_bilateral_projects": []
}
```

## Type-Specific Ingestion Blocks

### Knowledge Product

Required when `result_type_id = 6`:

```json
{
  "knowledge_product": {
    "handle": "10568/135621",
    "knowledge_product_type": "Journal Article",
    "metadataCG": {
      "source": "CGSpace",
      "accessibility": true,
      "is_isi": false,
      "is_peer_reviewed": true,
      "issue_year": 2025
    },
    "licence": "CC-BY-4.0"
  }
}
```

Title, description, geography, and evidence may be populated from CGSpace/MQAP rather than trusted from payload.

### Capacity Sharing

Required when `result_type_id = 5`:

```json
{
  "capacity_sharing": {
    "number_people_trained": {
      "women": 150,
      "men": 120,
      "non_binary": 5,
      "unknown": 10
    },
    "length_training": "Short-term",
    "delivery_method": "In person"
  }
}
```

### Innovation Development

Required when `result_type_id = 7`:

```json
{
  "innovation_development": {
    "innovation_typology": { "code": 12 },
    "innovation_developers": "Developer names or organizations",
    "innovation_readiness_level": { "level": 3 }
  }
}
```

### Innovation Use

Required when `result_type_id = 2`:

```json
{
  "innovation_use": {
    "current_innovation_use_numbers": {
      "innov_use_to_be_determined": false,
      "actors": [],
      "organization": [],
      "measures": []
    },
    "innovation_use_level": { "level": 2 }
  }
}
```

### Policy Change

Required when `result_type_id = 1`:

```json
{
  "policy_change": {
    "policy_type": {
      "id": 1,
      "status_amount": { "id": 1 },
      "amount": 500000
    },
    "policy_stage": { "id": 2 },
    "implementing_organization": [
      { "institutions_id": 123 }
    ]
  }
}
```

## Geography Contract

```json
{
  "geo_focus": {
    "scope_code": 4,
    "scope_label": "National",
    "regions": [{ "um49code": 150, "name": "Europe" }],
    "countries": [{ "id": 32, "name": "Argentina", "iso_alpha_3": "ARG", "iso_alpha_2": "AR" }],
    "subnational_areas": [{ "id": 101, "name": "Antioquia" }]
  }
}
```

Validation rules:

- Regional requires `regions`.
- National and Sub-national require `countries`.
- Sub-national requires `subnational_areas`.
- KP may omit this because metadata population differs.

## Review Workspace Endpoint Catalog

All use authenticated `auth` header in PRMS.

| Verb | Path | Purpose |
|---|---|---|
| GET | `/api/results-framework-reporting/get/science-programs/progress` | Home Science Program cards. |
| GET | `/api/notification/recent-activity` | Recent activity list. |
| GET | `/api/results-framework-reporting/clarisa-global-units?programId=<id>` | Science Program details. |
| GET | `/api/results-framework-reporting/programs/indicator-contribution-summary?program=<id>` | Result category summaries. |
| GET | `/api/results-framework-reporting/toc-results?program=<id>&areaOfWork=<aow>` | AoW ToC outputs/outcomes. |
| GET | `/api/results-framework-reporting/toc-results/2030-outcomes?programId=<id>` | 2030 outcomes. |
| GET | `/api/results-framework-reporting/bilateral-projects?tocResultId=<id>` | W3/Bilateral project options. |
| GET | `/api/results-framework-reporting/existing-result-contributors?resultTocResultId=<id>&tocResultIndicatorId=<id>` | Existing result contributors. |
| GET | `/api/results-framework-reporting/dashboard?programId=<id>` | Entity detail dashboard. |
| POST | `/api/results-framework-reporting/create` | Create a result from the reporting UI. |
| GET | `/api/results/admin-panel/phases/<phaseId>/reporting-initiatives/<initiativeId>/status` | Phase reporting access. |
| GET | `/api/results/by-program-and-centers?programId=<id>&centerIds=<csv>` | Grouped bilateral review table. |
| GET | `/api/results/pending-review?programId=<id>` | Pending review count. |
| GET | `/api/results/bilateral/<resultId>` | Review drawer detail. |
| PATCH | `/api/results/bilateral/<resultId>/title` | Inline title edit. |
| PATCH | `/api/results/bilateral/review-update/toc-metadata/<resultId>` | Save ToC edits. |
| PATCH | `/api/results/bilateral/review-update/data-standard/<resultId>` | Save data-standard edits. |
| PATCH | `/api/results/bilateral/<resultId>/review-decision` | Approve/reject. |

## Table Data Contract

`GET /api/results/by-program-and-centers` returns grouped results:

```json
[
  {
    "project_id": "123",
    "project_name": "Bilateral Project Name",
    "results": [
      {
        "id": "456",
        "project_id": "123",
        "project_name": "Bilateral Project Name",
        "result_code": "28738",
        "result_title": "Result title",
        "indicator_category": "Knowledge product",
        "status_name": "Pending Review",
        "status_id": 5,
        "acronym": "SP01",
        "toc_title": "ToC result title",
        "indicator": "Indicator text",
        "submission_date": "2026-03-22T10:00:00.000Z",
        "lead_center": "CIAT",
        "initiative_role_name": "Contributor"
      }
    ]
  }
]
```

## Detail Data Contract

`GET /api/results/bilateral/<resultId>` returns a detail object conceptually shaped as:

```json
{
  "commonFields": {},
  "tocMetadata": {},
  "geographicScope": {},
  "contributingCenters": [],
  "contributingProjects": [],
  "contributingInitiatives": {},
  "contributingInstitutions": [],
  "evidence": [],
  "resultTypeResponse": [],
  "contributors_result_toc_result": []
}
```

`contributingInitiatives` can be either a legacy array or an object:

```json
{
  "contributing_and_primary_initiative": [],
  "accepted_contributing_initiatives": [],
  "pending_contributing_initiatives": []
}
```

Frontend rebuilds must support both until the backend standardizes the shape.

## ToC Metadata Update

Endpoint:

```text
PATCH /api/results/bilateral/review-update/toc-metadata/<resultId>
```

Body:

```json
{
  "tocMetadata": {
    "planned_result": true,
    "initiative_id": 123,
    "result_toc_results": [
      {
        "result_toc_result_id": 456,
        "toc_result_id": 789,
        "toc_progressive_narrative": "Narrative",
        "toc_level_id": 1,
        "indicators": [
          {
            "toc_results_indicator_id": 100,
            "indicator_contributing": 5,
            "status_id": 1,
            "related_node_id": 100,
            "result_toc_result_indicator_id": 200,
            "targets": [
              {
                "indicators_targets": 300,
                "number_target": 10,
                "contributing_indicator": 5,
                "target_date": "2026-12-31",
                "target_progress_narrative": "Progress",
                "indicator_question": "Question"
              }
            ]
          }
        ]
      }
    ]
  },
  "updateExplanation": "Why the reviewer changed the ToC data"
}
```

## Data-Standard Update

Endpoint:

```text
PATCH /api/results/bilateral/review-update/data-standard/<resultId>
```

Body summary:

```json
{
  "commonFields": {
    "id": 123,
    "result_description": "Description",
    "result_type_id": 6
  },
  "geographicScope": {},
  "contributingCenters": [],
  "contributingProjects": [],
  "contributingInitiatives": {
    "accepted_contributing_initiatives": [],
    "pending_contributing_initiatives": []
  },
  "contributingInstitutions": [],
  "evidence": [],
  "resultTypeResponse": {},
  "updateExplanation": "Why the reviewer changed the data standards"
}
```

## Type-Specific Review Update Shapes

For `resultTypeResponse`, preserve backend-compatible typos.

| Type ID | PATCH shape |
|---:|---|
| 1 | Object with `result_policy_change_id`, `policy_type_id`, `policy_stage_id`, `policy_stage_name`, `policy_type_name`, `implementing_organization[]`. |
| 2 | Array of one object with `actors`, `organizations`, `measures`, `investment_partners`, `investment_projects[]`. |
| 5 | Object with `result_capacity_development_id`, `male_using`, `female_using`, `non_binary_using`, `has_unkown_using`, `capdev_delivery_method_id`, `capdev_term_id`. |
| 6 | Object with `result_knowledge_product_id`, `knowledge_product_type`, `licence`, `metadata`, `keywords`. |
| 7 | Object with `result_innovation_dev_id`, `innovation_nature_id`, `innovation_type_id`, `innovation_type_name`, `innovation_developers`, `innovation_readiness_level_id`, `readinness_level_id`, `level`, `name`. |

Do not rename `has_unkown_using`, `readinness_level_id`, or `non_pooled_projetct_budget_id` unless the backend contract is versioned.

## Review Decision

Endpoint:

```text
PATCH /api/results/bilateral/<resultId>/review-decision
```

Approve:

```json
{ "decision": "APPROVE", "justification": "Approved" }
```

Reject:

```json
{ "decision": "REJECT", "justification": "Data is incomplete" }
```

Reject justification is required.

## Bilateral Export Wrapper

The sync/list export wrapper uses:

```json
{
  "type": "knowledge_product",
  "result_id": 28738,
  "data": {}
}
```

`data` contains common result fields plus one type-specific summary, such as:

- `knowledge_product_summary`
- `capacity_sharing_summary`
- `innovation_development_summary`
- `innovation_use_summary`
- `innovation_package_summary`
- `policy_change_summary`

See `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` for all fields.

## Quality assessment (outbound)

PRMS calls an AI quality-assessment service when a Centre user presses **Submit for review** on a bilateral result (`BIL-QAI-R-1`). This is the only outbound call in the flow; the AI never receives a Knowledge Product result (`BIL-QAI-R-9` — KP verdicts come from a deterministic rule in code, not this contract).

**Contract version:** `0.2` (amended 2026-09-16 with the AI service team; supersedes `0.1` in place — no PRMS code and no AI endpoint runs `0.1` after this pivot). Source of truth for scope/behavior is `docs/specs/bilateral/qa-ai-traffic-light/` (`requirements.md`, `design.md` §4.5); this section is the field-by-field payload copy.

### Definitions-only rule

Every value PRMS sends is the label the form displays — the same text a Centre user reads on screen. Numbers live only inside the typed objects that `type_specific.fields` defines per type (see *Type-specific fields* below); nothing numeric is ever sent as prose. The request MUST NOT contain:

- Any key ending in `_id` (or `id`) or `_code`.
- Any CLARISA identifier or catalogue code.
- `result_code` or PRMS's internal `result.id`.

The **only** identifier in the request is `request_id`, a UUID generated per call; it identifies the call, not the result. PRMS assembles the payload from the **persisted** result (not the client's in-memory form state), so the assessment always reflects saved content.

### Request

```text
POST {BILATERAL_AI_QUALITY_URL}/prms/quality-assessment
```

| Header | Value |
|---|---|
| `X-API-Key` | reuses the existing `MICROSERVICE_API_KEY` (see server `README.md` → Environment) |
| `Content-Type` | `application/json` |

```json
{
  "contract_version": "0.2",
  "request_id": "uuid",
  "result": {
    "type": "Innovation development",
    "reporting_phase": "Reporting 2026",
    "reporting_center": "AfricaRice",
    "primary_science_program": "Sustainable Farming"
  },
  "sections": {
    "general_information": {
      "title": "…",
      "description": "…",
      "result_level": "Output",
      "lead_contact_person": "…"
    },
    "contributors_and_partners": {
      "lead_center": "AfricaRice",
      "contributing_centers": ["…"],
      "lead_project": { "title": "…", "funder": "…" },
      "contributing_projects": [{ "title": "…" }],
      "external_partners": [{ "name": "…", "type": "…", "role": "…" }],
      "no_external_partners": false,
      "theory_of_change": {
        "planned": true,
        "level": "Output",
        "result": "…text of the ToC node…",
        "indicator": "…",
        "contribution": "…",
        "why_reported": null
      }
    },
    "geographic_location": {
      "scope": "National",
      "regions": [],
      "countries": ["Côte d'Ivoire"],
      "sub_national": []
    },
    "evidence": [
      { "description": "…", "link": "https://…", "source": "url", "visibility": "public", "tags": ["Gender", "Poverty"] },
      { "description": "…", "link": null, "source": "prms_repository", "visibility": "private", "tags": [] }
    ],
    "type_specific": {
      "type": "innovation_development",
      "fields": {
        "Innovation typology": "Technological",
        "Readiness level": "Level 6 — Proof of concept",
        "Innovation developers": null
      }
    }
  },
  "impact_areas": [
    { "name": "Gender equality, youth and social inclusion", "score": "(2) Principal", "subcomponents": ["Gender equality", "Youth"] },
    { "name": "Climate adaptation and mitigation", "score": "(1) Significant", "subcomponents": [] }
  ],
  "constraints": { "timeout_seconds": 60 }
}
```

`sections` always carries these five keys for every result type; a section with nothing to report is present as an empty object or array rather than omitted. `impact_areas` sits at the payload **root, as a sibling of `sections`** — it is deliberately **not** a sixth section key, so the five section keys stay the five form sections that existing consumers already key off:

| Section key | Form section |
|---|---|
| `general_information` | General information |
| `contributors_and_partners` | Contributors & partners |
| `geographic_location` | Geographic location |
| `evidence` | Evidence |
| `type_specific` | Type-specific details (shape varies per result type) |

### Impact areas (`impact_areas`) — new in v0.2

`impact_areas` is an **optional** top-level array, one entry per PRMS impact-area pillar the result tags in Section 1 (General information):

```json
{ "name": "Gender equality, youth and social inclusion", "score": "(2) Principal", "subcomponents": ["Gender equality", "Youth"] }
```

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | The pillar label the form paints. There are exactly **five** values — see *Impact-area pillars* below. `Climate adaptation and mitigation` may appear here even though it has no evidence tag (see *Evidence rules*, GAP-6). The mirror is also true: `Youth` is an **evidence tag** with no pillar of its own — it is seeded as a sub-component of the `Gender equality, youth and social inclusion` pillar and must never appear as an `impact_areas[].name` |
| `score` | `string` | The visible tag label: `(0) Not Targeted` \| `(1) Significant` \| `(2) Principal` |
| `subcomponents` | `string[]` | **Plural** — populated only where the form populates it (Principal); `[]` otherwise |

- `[]` or an absent `impact_areas` key means the result tags no pillar. This is **not applicable** — it is **not grey** and carries **no penalty** in any section. The AI must not raise an issue for it (owner decision, 2026-09-16).
- `impact_areas` is included in `content_hash`: re-tagging a pillar invalidates a stored verdict.
- The key is `subcomponents`, **plural** — call this out explicitly to the AI team; an earlier draft used the singular `subcomponent`, and the frozen name is plural.

**Impact-area pillars.** PRMS has exactly five pillars, never six — do not confuse a pillar `name` with an evidence tag (see *Evidence rules*), even though four of the five short names look alike:

| Pillar label (`name`) | Internal short name (`DAC_PILLAR_CONFIG` key — not a payload value) |
|---|---|
| Gender equality, youth and social inclusion | Gender |
| Climate adaptation and mitigation | Climate |
| Nutrition, health and food security | Nutrition |
| Environmental health and biodiversity | Environmental |
| Poverty reduction, livelihoods and jobs | Poverty |

Verified against `DAC_PILLAR_CONFIG` (`onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:164-190`, five entries: `gender · climate_change · nutrition · environmental_biodiversity · poverty`) for the short names, and the form's own section tooltips (`onecgiar-pr-client/src/app/pages/bilateral/components/section-general-info/section-general-info.component.ts:28-80`) for the pillar labels the form paints.

**Sub-component catalogue.** `subcomponents[]` values come from the seeded catalogue `impact_areas_scores_components`, never free text; capitalisation below is the database's, copied verbatim from its only `INSERT` (`onecgiar-pr-server/src/migrations/1760113104098-ImpactAreasScoresComponents.ts:21-41` — no later migration inserts or updates this table):

| Pillar (short name) | Sub-components (`subcomponents[]` values) |
|---|---|
| Gender | `Gender equality` · `Youth` · `Social Inclusion` |
| Climate | `Adaptation` · `Mitigation` |
| Nutrition | `Nutrition` · `Health` · `Food Security` |
| Environmental | `Environmental health` · `Biodiversity` |
| Poverty | `Poverty Reduction` · `Livelihoods` · `Jobs` |

### Type-specific fields (`sections.type_specific`)

`type_specific` is `{ type, fields }`, where `type` is the API string from *Result Type Mapping* above and `fields` is a **fixed per-type set of English labels** — the exact visible text of the form field. `null` / `[]` under a mandatory label means "the user left it empty"; the label is never dropped, translated, or invented. Every label is read from **one exported constant per result type** (`as const`), so the payload builder, the fixture tests, and this contract copy cannot drift apart (`BIL-QAI-R-2`).

| Result type | `fields` |
|---|---|
| Policy change | `"Policy type": string\|null` · `"Policy stage": string\|null` · `"Implementing organizations": string[]` · `"USD amount": { amount: number\|null, status: string\|null }` |
| Innovation use | `"User types": string[]` (actor type names; the free-text case is sent as `"Other: <text>"`) · `"Number of people using": { total, women, men, women_youth, men_youth }` · `"Other quantitative measures": [{ unit_of_measure: string, quantity: number\|null }]` · `"Investment (USD)": { total: number\|null }` |
| Capacity sharing | `"Number of people trained": { total, female, male, non_binary, unknown }` · `"Length of training": "Long-term"\|"Short-term"\|null` · `"Delivery method": string\|null` · `"Implementing organizations": string[]` |
| Innovation development | `"Innovation typology": string\|null` · `"Readiness level": string\|null` (the `Level N — name` composition) · `"Innovation developers": string\|null` |
| Knowledge product | unchanged from v0.1 — **never sent to the AI** (`BIL-QAI-R-9`); still built server-side so the content hash covers KP content |
| Other output · Other outcome | `fields: {}` |

**Policy change**

```json
{ "type": "policy_change", "fields": {
  "Policy type": "Regulation",
  "Policy stage": "Adopted",
  "Implementing organizations": ["Ministry of Agriculture"],
  "USD amount": { "amount": 250000, "status": "Committed" }
} }
```

**Innovation use**

```json
{ "type": "innovation_use", "fields": {
  "User types": ["Farmers", "Other: Cooperative extension agents"],
  "Number of people using": { "total": 340, "women": 100, "men": 150, "women_youth": 20, "men_youth": 15 },
  "Other quantitative measures": [{ "unit_of_measure": "Hectares", "quantity": 500 }],
  "Investment (USD)": { "total": 12000 }
} }
```

**Capacity sharing**

```json
{ "type": "capacity_sharing", "fields": {
  "Number of people trained": { "total": 12, "female": 7, "male": 4, "non_binary": 1, "unknown": 0 },
  "Length of training": "Long-term",
  "Delivery method": "Virtual / Online",
  "Implementing organizations": ["AfricaRice"]
} }
```

**Innovation development**

```json
{ "type": "innovation_development", "fields": {
  "Innovation typology": "Technological",
  "Readiness level": "Level 6 — Proof of concept",
  "Innovation developers": null
} }
```

**Knowledge product** — unchanged from v0.1's shape; never sent to the AI, so no example is reproduced here.

**Other output / Other outcome**

```json
{ "type": "other_output", "fields": {} }
```

Notes the AI side depends on:

- **`Length of training` is one value per result**, not a per-person split: the bilateral form stores a single `training_length` term (`Long-term` / `Short-term`) on the result, not a breakdown per trainee.
- **`Delivery method` also feeds the geography rule**: the catalogue has exactly three labels — `"Virtual / Online"`, `"In person"`, `"Blended (in-person and virtual)"`. When the delivery method is virtual (`Delivery method` = `"Virtual / Online"`, and only that value), geography is not required for that result, so a thin *Geographic location* section must not be graded down. `"Blended (in-person and virtual)"` still has an in-person component, so geography stays required for it — do not treat "blended" as exempt.
- **Innovation use carries no non-binary or unknown counts** (GAP-7) — those columns do not exist on `result_actors`. `"Number of people using"` therefore splits by women/men and youth only, and a row saved without age-and-sex disaggregation contributes its count to `total` only, so `women + men + women_youth + men_youth` can legitimately sum to less than `total`. This is not under-reporting. `women_youth` and `men_youth` are **subsets** of `women` and `men` respectively, never a fifth and sixth bucket added on top of them — the form enforces "Youth cannot be greater than total Women/Men", so do not expect the four breakdown fields to sum to `total` even when every row is fully disaggregated.
- **`Investment (USD)`** is the sum of `kind_cash` across the three budget sources the form exposes (initiative, bilateral project, and partner budgets); it is `null` when all three are empty — there is no innovation-use-specific USD column.

### Evidence rules

Each `evidence` item carries `source` (`url` \| `prms_repository`), `visibility` (`public` \| `private`), and `tags[]`:

- `source: url` → always `visibility: public`; `link` is the external URL.
- `source: prms_repository` (PRMS/SharePoint-backed file) with `visibility: public` → `link` present.
- `source: prms_repository` with `visibility: private` → `link: null` and **no** SharePoint field (no document id, folder path, or file name) leaves PRMS.

A private item is graded **grey** by PRMS regardless of what the AI answers for that item — the AI's own verdict for a private item is not used (`BIL-QAI-R-3`, grey rule in `design.md` §5).

`tags` is drawn from the **closed vocabulary** Gender · Youth · Nutrition · Environment & biodiversity · Poverty — the five boolean flags the evidence form offers. Send `[]` for an untagged item rather than omitting the key, so the AI can tell "no impact area claimed" from "field missing". `tags` is the **only** link between an evidence item and an impact area, and there is no Climate tag: the evidence form has no climate flag, so the Climate pillar can appear in `impact_areas` but can never be linked to an evidence item (GAP-6). Do not emit Climate as an evidence tag under any circumstance.

### Frozen labels

Every `type_specific.fields` key documented above is **frozen** and validated strictly on the AI side: a mandatory label that is missing or renamed gets a specific validation error back, not a best-effort parse. On the PRMS side each label is read from the one exported constant for its result type — the payload builder, the fixture tests, and this contract copy all read from the same constant, so none of the three can drift from the other two. **A form label change is a contract break**: bump `contract_version`, update the constant and the fixtures, and notify Daniela before either side stops accepting the previous label.

### Response

```json
{
  "request_id": "uuid",
  "criteria_version": "QA-2026-v1",
  "status": "completed",
  "degraded_reason": null,
  "overall": { "verdict": "amber", "score": 68, "summary": "…" },
  "sections": {
    "general_information":       { "verdict": "green", "score": 91, "comments": "…", "strengths": ["…"], "issues": [] },
    "contributors_and_partners": { "verdict": "amber", "score": 62, "comments": "…", "strengths": [],    "issues": ["…"] },
    "geographic_location":       { "verdict": "green", "comments": "…", "strengths": ["…"], "issues": [] },
    "evidence":                  { "verdict": "red",   "comments": "…", "strengths": [],    "issues": ["…"] },
    "type_specific":             { "verdict": "grey",  "comments": "no type-specific details were reported", "strengths": [], "issues": [] }
  },
  "evidence": [
    { "index": 0, "verdict": "green", "reason": "…" },
    { "index": 1, "verdict": "grey",  "reason": "Private repository file — not evaluated" }
  ]
}
```

`status` (`completed` \| `partial` \| `unavailable`) and `degraded_reason` (`string` \| `null`) are **required** response fields in v0.2 — a response missing either one fails the schema check as `malformed`.

- `sections.<key>.verdict` ∈ `green` \| `amber` \| `red` \| **`grey`** — grey means "not evaluated", the same meaning it has on an evidence item. A grey section is **excluded from the overall**: PRMS never derives or alters a section colour from a grey verdict, and a grey section neither raises nor clears `had_outstanding_flags` (only `amber`/`red`, at section or overall level, do that).
- `overall.verdict` stays `green` \| `amber` \| `red` — three colours only; the AI owns its derivation and PRMS does not replicate it.
- `degraded_reason` is a plain-language sentence for the user. PRMS renders it **verbatim as text** (never HTML/markdown), stores it **truncated to 255 characters**, and **strips any URL or host** from it before persisting. It is **never logged**, whatever it contains (`.cursorrules`; `docs/trd/trd.md` W8, AC-9).

### PRMS status mapping

`ai_status` is the AI's own word, stored as-is; `status` is PRMS's row status. This is the full mapping from an AI answer — or its absence — to the stored `bilateral_quality_assessments` row:

| AI `status` | Row `status` | Row `ai_status` | Row `unavailable_reason` |
|---|---|---|---|
| `completed` | `completed` | `completed` | `null` |
| `partial` | `completed` | `partial` | `null` |
| `unavailable` | `unavailable` | `null` | `ai_unavailable` |
| *(no usable answer: timeout, non-2xx, malformed, not configured)* | `unavailable` | `null` | one of `timeout` \| `http_error` \| `malformed` \| `not_configured` — see *Error / timeout semantics* below |

A `partial` run is stored as a **completed** assessment and is treated as one for every decision rule: the user submitting from it records `decision = submitted_anyway`, never `submitted_without_check`, which stays reserved for a run that produced no verdict at all. Every pre-v0.2 row and every KP row (`status = skipped_kp_rule`) defaults both `ai_status` and `degraded_reason` to `null`.

### Optional `score`

`overall.score` and each section's `score` are **optional** integers `0–100`. When present, PRMS stores them verbatim (nullable) for traceability and future threshold calibration. `score` **never** colors the traffic light — the light is always driven by `verdict` (`BIL-QAI-R-12`).

### Error / timeout semantics

PRMS bounds the call with `BILATERAL_AI_QUALITY_TIMEOUT_MS` (default `60000`). Any failure to get a well-formed response maps to an assessment `status = unavailable` with one of these reasons, and the AI **never blocks** submission — the user still gets **Submit anyway** / **Make adjustments** (`BIL-QAI-R-7`):

| Reason | Cause |
|---|---|
| `timeout` | No response within the configured window |
| `http_error` | Non-2xx response |
| `malformed` | 2xx response that fails the required-keys/verdict-enum check — in v0.2 this includes a missing `status` or `degraded_reason`, or a section verdict outside `green\|amber\|red\|grey` |
| `not_configured` | `BILATERAL_AI_QUALITY_URL` or the API key is not set in the environment |

No response body, API key, or host name is ever surfaced to the user or logged (`.cursorrules`; `docs/trd/trd.md` W8, QAS-10).

### Contract version bump procedure (`BIL-QAI-GAP-5`)

- Bump `contract_version` (e.g. `0.1` → `0.2`) whenever a request or response key is added, renamed, or removed in a way either side cannot silently ignore.
- A purely additive field on either side (new optional key both parties already ignore when absent) may ship without a bump.
- Whoever proposes the change confirms the new version with the other side (PRMS ↔ AI service team) before either stops accepting the previous one; PRMS logs `criteria_version` and `contract_version` per assessment (`design.md` §9), so a mismatch is visible in the data.
- v0.2 is the first exercise of this procedure: `impact_areas`, the typed per-type `fields` shapes, and the required `status`/`degraded_reason` response fields are additions neither side could silently ignore, so the version bumped from `0.1` to `0.2` rather than shipping as additive-only.

**Change log**
- **2026-09-16** — copied contract v0.1 (request/response shapes, section keys, evidence rules, optional `score`, error/timeout semantics) from the frozen vault note into this section (`BIL-QAI-T-1`).
- **2026-09-16** — amended to contract **v0.2** (`BIL-QAI-T-1b`): request now carries `contract_version: "0.2"` and an optional top-level `impact_areas` (sibling of `sections`, `{name, score, subcomponents[]}` — plural `subcomponents` — absent/empty ⇒ not applicable, not grey, no penalty); replaced the flat hand-written `type_specific.fields` example with a frozen per-type label table plus typed value objects (count/amount objects, single `Length of training`, `Innovation developers` never substituted) and one JSON example per type; corrected the evidence-tag vocabulary to the closed set Gender · Youth · Nutrition · Environment & biodiversity · Poverty and removed the wrong evidence-tag example that paired Gender with a non-existent Climate tag (GAP-6, no evidence tag for Climate); documented GAP-7 (Innovation use has no non-binary/unknown counts); response now requires `status` (`completed\|partial\|unavailable`) and `degraded_reason`, and `sections.<key>.verdict` widens to include `grey` (excluded from the overall); added the PRMS status-mapping table including `unavailable_reason = ai_unavailable`; dropped the ordering guarantee over the five section keys (never part of the frozen contract, was an advisory only); added the sub-component catalogue table (13 seeded values across the five pillars, from `impact_areas_scores_components`) and replaced the invented `"Women's empowerment"` example value with the real seeded values `["Gender equality", "Youth"]` in both JSON examples (`BIL-QAI-T-1b`).

## Contract Stability Rules

- Additive fields are allowed when documented and tested.
- Renames/removals require versioned rollout and downstream communication.
- Response payloads should prefer CLARISA ids, official codes, acronyms, names, and labels over PRMS join-table ids.
- Payload-shape tests are required for every contract change.
- Documentation change logs must be updated with contract changes.
