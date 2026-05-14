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

## Contract Stability Rules

- Additive fields are allowed when documented and tested.
- Renames/removals require versioned rollout and downstream communication.
- Response payloads should prefer CLARISA ids, official codes, acronyms, names, and labels over PRMS join-table ids.
- Payload-shape tests are required for every contract change.
- Documentation change logs must be updated with contract changes.
