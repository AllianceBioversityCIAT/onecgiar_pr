# QA field catalog API (English)

This document is the **contract** of `GET /api/qa/catalog`: the read-only declaration of every result type, section and field that exists in a PRMS phase year. It is written for the **QA platform team** (consumer) and for PRMS engineers (maintainers). Spec: `docs/specs/quality-assurance/qa-field-catalog/`.

The catalog describes **which fields exist and how they behave** (type, control list, required, validity). It does **not** carry result values; sending values to QA is a separate, later contract.

---

## How to read this

- Property names are the **JSON** names returned by the API (`snake_case`).
- The contract is **additive-only**: a new revision may add result types, sections, fields, subfields and optional properties; it never renames or removes a key, and never changes the meaning of a property. Consumers MUST ignore properties they do not know.
- Every change to this contract is recorded in the [change log](#change-log-maintainers) at the end of this file.

---

## Endpoint

| Item | Value |
|---|---|
| Method / path | `GET /api/qa/catalog` |
| Query | `phase_year` (required, integer), for example `2026` |
| Auth | Header `x-api-key`: a CLARISA API key whose registered permissions include `/api/qa/catalog`. The PRMS user header `auth` is **not** accepted as a substitute. |
| Body of a 200 | The catalog object below, returned as-is (no `{ response, statusCode }` wrapper). |
| Caching | Content changes only on a PRMS deploy. `catalog_version` changes with it; use it to detect a new revision. It also changes when the response shape changes for the same catalog (a property added to or removed from what the endpoint returns). `generated_at` changes on every call and is not a revision signal. |

```
GET /api/qa/catalog?phase_year=2026
x-api-key: <CLARISA key registered for QA>
```

---

## Response shape

```json
{
  "portfolio": "P25",
  "phase": 2026,
  "catalog_version": "2026.13",
  "generated_at": "2026-10-06T12:00:00.000Z",
  "result_types": [
    { "key": "innovation_development", "label": "Innovation development", "level": "output" }
  ],
  "sections": [
    { "key": "general_information", "label": "General information", "order": 10, "result_types": ["*"] }
  ],
  "fields": [
    {
      "key": "innovation.readiness_level",
      "label": "Innovation readiness level",
      "description": "…",
      "type": "single_select",
      "control_list": "readiness_levels",
      "section": "innovation_development",
      "order": 1,
      "result_types": ["innovation_development"],
      "required": true,
      "valid_from": 2026,
      "valid_to": null,
      "subfields": [
        { "key": "justification", "label": "Justification", "type": "text", "required": true }
      ]
    }
  ]
}
```

(The example is illustrative of the shape; read the live response for real keys.)

### Top level

| Property | Type | Meaning |
|---|---|---|
| `portfolio` | string | Portfolio of the requested phase year (output only; QA never sends it). |
| `phase` | integer | The requested `phase_year`. |
| `catalog_version` | string | `<year>.<revision>`. The revision increases whenever that year's catalog changes. |
| `generated_at` | string | ISO-8601 UTC time the response was built. |
| `result_types` | array | Result types that have at least one field that year. |
| `sections` | array | Sections valid that year that contain at least one field, ordered by `order`. |
| `fields` | array | Top-level fields valid that year, ordered by section `order`, then field `order`. |

### `result_types[]`

| Property | Type | Meaning |
|---|---|---|
| `key` | string | Stable string key. It is **not** the PRMS database `result_type_id`. |
| `label` | string | Display name. |
| `level` | string | `output`, `outcome` or `impact`. |

Keys at revision 5: `policy_change`, `innovation_use`, `other_outcome`, `capacity_sharing`, `knowledge_product`, `innovation_development`, `other_output`, `impact_contribution`, `innovation_package` (nine, all present).

### `sections[]`

| Property | Type | Meaning |
|---|---|---|
| `key` | string | Stable key. |
| `label` | string | Display name. |
| `order` | integer | Sort position among sections. |
| `result_types` | string[] | Result types the section applies to, or `["*"]`. |

### `fields[]`

| Property | Type | Always present | Meaning |
|---|---|---|---|
| `key` | string | yes | Dotted (`section.name`) at creation. **Immutable** afterwards, even if the field later moves to another section. |
| `label` | string | yes | Display name. |
| `description` | string | no | Help text taken verbatim from the PRMS form. Omitted when the form has none. |
| `type` | string | yes | See [field types](#field-types). |
| `control_list` | string | for selects | Name of the list of allowed values (for example `countries`). Present on `single_select` and `multi_select`. The **contents** of the list are not part of this contract; only its name is. |
| `section` | string | yes | Key of the section the field belongs to. |
| `order` | integer | yes | Sort position inside the section. |
| `result_types` | string[] | yes | Result types the field applies to, or `["*"]`. |
| `required` | boolean | yes | See [what `required` means](#what-required-means). |
| `valid_from` | integer | yes | First phase year in which the field exists. |
| `valid_to` | integer or null | yes | Last phase year in which the field exists; `null` = still current. |
| `required_when` | condition | no | Condition under which the field is required (see [display rules](#display-rules)). Omitted when the field has none. |
| `visible_when` | condition | no | Condition under which the field is shown. Omitted = always shown for its `result_types`. |
| `subfields` | array | on `list` (and on composite fields) | Nested entries; a subfield may have its own `subfields` (maximum depth 2 below the field, see [nested data](#nested-data-lookups-and-the-unit-of-selection)). |

### `subfields[]`

| Property | Type | Meaning |
|---|---|---|
| `key` | string | Key, unique inside its parent field. |
| `label` | string | Display name. |
| `type` | string | Same vocabulary as fields. |
| `control_list` | string, optional | Present on select subfields. |
| `required` | boolean, optional | Whether the subfield is required inside each row of the list. |
| `required_when` | condition, optional | Row-level requirement condition (see [display rules](#display-rules)). |
| `visible_when` | condition, optional | Row-level visibility condition. |
| `subfields` | array, optional | One more level of the same shape (`list` / `object` subfields). Maximum depth 2 below the top-level field. |

A subfield inherits the validity (`valid_from` / `valid_to`) and the `result_types` of its parent.

---

## Field types

| `type` | Meaning | Present at revision 5 |
|---|---|---|
| `text` | Free text | yes |
| `number` | Numeric value | yes |
| `date` | Calendar date | no (reserved) |
| `boolean` | Yes / No | yes |
| `single_select` | One value out of a `control_list` | yes |
| `multi_select` | Several values out of a `control_list` | yes |
| `list` | Repeatable group; its columns are the `subfields` | yes |
| `object` | Composite value with `subfields` | no (reserved) |

The vocabulary is closed for a given contract version; adding a type is an additive change recorded in the change log.

### `result_types: ["*"]`

`["*"]` on a section or field means **it applies to every result type** in the response, including result types added in the future. A consumer MUST NOT expand it into a fixed list at ingest time; evaluate it per result type when needed.

### What `required` means

- `required: true` means the field is required for the listed result types **unconditionally**.
- `required: false` does **not** mean "never required". Some fields are required only when another answer has a given value (for example, a justification that is required when a related question is answered Yes). Since v1.5 those conditions are returned as `required_when` wherever the catalog states them (see [display rules](#display-rules)). A consumer MUST NOT infer that an optional field can be left empty in every case: a missing `required_when` does not prove that a field is optional until every rule has been transcribed (see [known gap 3](#known-gaps)).
- A subfield with `required: true` is required in every row of its parent list. A subfield may also carry its own `required_when`, evaluated against its sibling subfields or top-level fields.

### Display rules

`visible_when` and `required_when` state **when a field or subfield is shown and when it is required**, so a consumer can build the form and the query from the catalog alone (since v1.5, additive; fields and subfields that have no rule simply omit the property).

A condition is plain data, never evaluated by PRMS:

```json
{ "field": "linked.has_innovation_link", "operator": "eq", "value": true }
{ "all": [ { "field": "geo.scope", "operator": "in", "value": [3, 4, 5] },
           { "any": [ { "field": "result_type", "operator": "eq", "value": "policy_change" } ] } ] }
```

| Form | Meaning |
|---|---|
| `{ "field", "operator": "eq", "value" }` | The answer of `field` equals `value`. |
| `{ "field", "operator": "in", "value": [...] }` | The answer of `field` is one of the listed values. |
| `{ "field", "operator": "not_null" }` | `field` has an answer. |
| `{ "all": [condition, ...] }` / `{ "any": [condition, ...] }` | Every / at least one nested condition holds. |

- `field` is the **key of another catalog entry that exists in the same year's catalog**: a top-level field key, or, inside a subfield, a sibling subfield key or a top-level field key. One pseudo key is also used: `result_type` (the `key` of the result's type, as in `result_types[]`). Any other value a condition needs is itself a catalog field; for example the replicated-innovation flag is the field `general.is_replicated`.
- `visible_when` absent means always shown for the entry's `result_types`.
- When both a `required_when` and `required: false` are present, the entry is required only while the condition holds.

### Nested data, lookups and the unit of selection

- A `list` / `object` field may have subfields that themselves have subfields (**maximum depth 2**; for example Contributing Science Program/Accelerator, each program with its own ToC mappings). A deeper structure is never returned.
- Some values are **lookups**: Reporting does not store them but reads them from a reference source by a stored id (for example the ToC statement, indicator typology, unit and target of a mapping; a CLARISA partner type). They appear as ordinary subfields or fields; they are read-only reference values. How they are resolved is internal and not part of this contract. Values read through the submitter's ToC rows (`toc.planned_result`, `toc.narrative`, `toc.program_invested_financial_resources`) and a Science Program's planned-result answer may come back **repeated once per ToC mapping** of that element; the consumer takes the distinct value.
- **QA's unit of selection is the top-level field.** Subfields describe the shape of each element of that field; the future results endpoint returns the **whole object** of a selected field, never a single subfield.

---

## Status codes

| Request | Status | Notes |
|---|---|---|
| Valid key, `phase_year` with catalog content (e.g. `2026`) | **200** | Body as above. |
| `phase_year` missing, or not a plain integer (`abc`, empty, `2026.5`) | **400** | Validation error. |
| Valid key, `phase_year` with no catalog (e.g. `2023`, `2025`) | **404** | **Never an empty 200.** A year is either catalogued with at least one field, or it is a 404. |
| `x-api-key` missing, unknown, expired, or without permission `/api/qa/catalog` | **401** | Generic body; the reason is never disclosed. |

Notes:

- Authentication runs **before** validation: a request with a bad or missing key gets 401 even when `phase_year` is also invalid.
- Error bodies use the standard PRMS error envelope (`statusCode`, `message`, `timestamp`, ...); they are not part of the catalog shape.
- The endpoint is read-only and not rate limited by PRMS. The response for revision 5 is about 43 KB.

---

## Versioning and change rules

- `catalog_version` = `<phase_year>.<revision>`. Example: `2026.9` is the ninth revision of the 2026 catalog.
- **Keys are immutable.** A key, once published, always identifies the same field. A label, description, order, section or `required` flag may change in a later revision; the key does not.
- **Retirement is by validity, never by deletion.** A field that stops existing in year Y keeps its key, and gets `valid_to` = last year it existed. Requests for a year after `valid_to` no longer contain it; earlier years still do.
- A field valid in several years appears in each of those responses with the **same key**.
- Years are catalogued independently: **only 2026 is catalogued** at revision 5. Years 2022 to 2024 are out of scope and answer 404; 2025 may be added later from the legacy QA queries, with `valid_from` = 2025 for the fields that exist there.

---

## What QA must NOT assume

- **No table or column names.** PRMS stores the catalog and the result data internally; the storage layout is not part of the contract and is never returned. Do not infer it from keys.
- **Keys are not database ids and not column names.** A dotted key such as `section.name` is only an identifier.
- **`result_type_id` is not exposed.** Use `result_types[].key`.
- **Control-list contents are not provided here**, only their names.
- **The catalog is not exhaustive of PRMS columns.** Fields that are internal, audit-only or derived are intentionally absent; fields that are for QA but not yet described are also absent (see [known gaps](#known-gaps)). Absence from the catalog does not mean absence from PRMS.
- **No result values** flow through this endpoint.
- **Order is meaningful only as sorted by the API** (section `order`, then field `order`); do not depend on key spelling for ordering.

---

## Catalog at revision 13 (2026.13)

Counts measured on the code catalog on 2026-10-07 (the same data the endpoint returns):

| Item | Count |
|---|---|
| Result types | 9 |
| Sections | 19 |
| Catalogued fields (top level) | 118 |
| Catalogued subfields | 82 (of which 8 at the second level) |
| Fields with `required: true` (unconditional) | 40 |
| Fields with a conditional requirement (`required: false` plus `required_when`) | 44 |
| Fields by type | `single_select` 36 · `multi_select` 22 · `boolean` 19 · `text` 16 · `list` 16 · `number` 8 · `date` 1 |
| Fields applying to every type (`["*"]`) | 37 |
| Fields naming a result type explicitly (the `["*"]` fields above are not repeated here) | `innovation_development` 30 · `innovation_use` 28 · `innovation_package` 17 · `knowledge_product` 15 · `capacity_sharing` 14 · `policy_change` 10 · `other_outcome` 6 · `other_output` 6 · `impact_contribution` 6 |
| `PENDING_CATALOG` entries (columns known, for QA, not yet described) | 135 columns across 32 in-scope tables |
| `NOT_FOR_QA` entries (columns that are never for QA, each with a reason) | 355 columns |

`PENDING_CATALOG` and `NOT_FOR_QA` are internal PRMS lists enforced by an automated completeness check: a column of an in-scope table that is in neither list and bound to no field fails the build. Only their counts are public.

The first boot of this revision wrote 9 result types, 21 sections and 167 field rows (106 fields + 61 subfields) plus 1 version row (revision 5, before the `toc_alignment` merge: see the change log); a second boot changed nothing.

---

## Known gaps

These are deliberate and tracked; each one is **additive** when resolved.

1. **`PENDING_CATALOG` (135 columns).** Fields that are for QA but cannot yet be described faithfully. They arrive in later revisions as new keys. Causes:
   - **Two-hop storage (REVIEW D2; the model supports parent-to-child table paths since v1.5, the fields arrive in later revisions):** values that reach the result through a parent row (budget rows of innovation development / use / package, complementary-innovation rows, and similar; the indicator and target of each ToC mapping and the partner roles were resolved in v1.6).
   - **Nested lists (REVIEW D1):** the IPSR step 3 evidence lists need two levels of subfields; the contract allows two since v1.5, and the fields themselves arrive in later revisions.
   - **IPSR sections validated by embedded SQL (REVIEW D16):** general information, contributors and links of the innovation package are catalogued only where inventoried.
   - **IPSR step 2.2 (REVIEW D19):** administrator-only tab, deferred.
   - **Optional / legacy columns** (no validation rule in 2026, or present only in 2025 data): added as optional fields or for a 2025 load.
2. **Subfield conditions (resolved in the model, v1.5).** Subfields may carry `required_when` / `visible_when`; the catalog content that uses them arrives per field in later revisions.
3. **Conditional requirements (resolved in the model, v1.5; transcription incomplete).** `required_when` and `visible_when` are returned wherever the catalog states them (see [display rules](#display-rules)); entries whose rule has not yet been transcribed still read `required: false` without a condition, so the absence of a condition does not prove that an entry is optional.
4. **Year coverage.** 2026 only.
5. **Live verification (2026-10-06, local instance, CLARISA test key with permission `/api/qa/catalog`):** `phase_year=2026` → 200 with the 2026.5 content (body identical to the committed catalog, apart from `generated_at`); `phase_year=2023` → 404; `phase_year=abc` → 400; no key, unknown key or user `auth` header → 401. Not yet verified on a deployed environment.
6. **Control-list contents are not served** by this endpoint.
7. **`visible_when` is not persisted in `qa_catalog_field`** (migration pending; the owner runs it). The endpoint serves it from the code catalog, so the response is correct; the stored catalog tables do not yet carry the rule.
8. **`partners.not_applicable` NULL versus `eq false`.** A never-answered `no_applicable_partner` (NULL) is neither `true` nor `false`: the live function treats NULL as failing (it requires an answer), while the catalog's `visible_when` / `required_when` on `partners.not_applicable = false` do not match NULL. A consumer must treat NULL as "answer missing" (invalid for a required field), not as "not applicable = false".
9. **Indicator rows of a ToC mapping (recorded, not filtered).** The typology and unit lookups of a mapping do not prefer the active indicator row: the client still shows inactive linked indicators, so the catalog does the same.

---

## Change log (maintainers)

| Date | Change |
|---|---|
| 2026-10-06 | **v1 — `GET /api/qa/catalog?phase_year=` introduced** (spec `quality-assurance/qa-field-catalog`, QAC-T-12). Content: phase 2026 (portfolio P25), `catalog_version` `2026.5`; 9 result types, 21 sections, 106 fields, 61 subfields; 146 `PENDING_CATALOG` and 363 `NOT_FOR_QA` internal entries (counts only). Authentication by CLARISA API key (`x-api-key`) with permission `/api/qa/catalog`. Status codes 200 / 400 / 401 / 404 (no empty 200). Additive-only from here. |
| 2026-10-06 | **v1.1 — 2026-10-06: `toc_alignment` and `linked_results` merged into `contributors_partners` (pre-release); result envelope fields added to general_information: result_code, result_type, result_level, created_by, created_date, status; catalog_version 2026.6.** The 4 `toc.*` fields (and their subfields) and the 2 `linked.*` fields keep their keys and move to section `contributors_partners` (order 30), now 19 sections (the standalone "Links to results" section ended in 2024; in 2026 the question lives inside that page, and Innovation use also shows it on its own page); field `order` inside it follows the client page. Subfields unchanged (61); top-level fields 106 → 112 and `NOT_FOR_QA` 363 → 357 columns (the six envelope columns are now bound). |
| 2026-10-07 | **v1.2 — 2026-10-07: `contributors.bilateral_projects` added (W3/bilateral projects per result); catalog_version 2026.7.** New optional `multi_select` in `contributors_partners` (order 8, control list `projects`, all result types, `required: false`), stored in `results_by_projects` (`project_id`, `is_active = 1`). Following orders in that section shift by one. Top-level fields 112 → 113; `PENDING_CATALOG` 146 → 144 columns. |
| 2026-10-07 | **v1.3 — 2026-10-07: `contributors.submitter` moved to `general_information` as 'Primary Program'; general_information reordered to the form order (tags interleaved with their impact-area components); catalog_version 2026.8.** Key, binding, type, control list (`initiatives`) and required flags unchanged; only `section`, `label` ("Submitter" → "Primary Program") and `order` change. `general_information` now orders result level, result type, Primary Program, title, description, lead contact person, each impact-area tag followed by its component field, result code, created by, creation date, status, then the annual-updating block; `contributors_partners` orders renumbered 1–14. Section and field totals unchanged. |
| 2026-10-07 | **v1.4 — 2026-10-07: `contributors.submitter` back in `contributors_partners` (form 'Submitter'); new `general.primary_program` in `general_information` mirroring it; catalog_version 2026.9.** `contributors.submitter` returns to `contributors_partners` as the first field (order 1, label "Submitter"; binding, type, control list and required flags unchanged); the other fields in that section are renumbered 2–15. New key `general.primary_program` (label "Primary Program", `single_select`, control list `initiatives`, all result types, `required: false`) at order 3 of `general_information`, with the same storage binding as `contributors.submitter` (it shows the same stored value). Pure addition plus a section move of an existing key. Top-level fields 113 → 114 (`single_select` 35 → 36; fields applying to every type 33 → 34). |
| 2026-10-07 | **v1.5 — 2026-10-07: model extension; response now carries `visible_when` / `required_when`; new field `general.is_replicated`; catalog_version 2026.10.** Fields and subfields may now carry `visible_when` and `required_when` (condition vocabulary `eq` / `in` / `not_null` with `all` / `any`; keys must exist in the same year's catalog, plus the single pseudo key `result_type`), subfields may nest one more level (maximum depth 2), and lookup values are described as read-only reference values. The response gains the optional properties `required_when`, `visible_when` (fields and subfields) and `subfields` (inside subfields), all omitted when absent; every existing field keeps its shape, so the change is additive (ADR-004). Fields whose `required_when` was already recorded internally (for example `toc.*`, `partners.*`, `linked.results`) now return it, which is why the revision moves 2026.9 → 2026.10: the content hash now also covers the response-projection version, so a change in what the endpoint returns always changes `catalog_version`. New key `general.is_replicated` (label "Is this a replicated innovation?", `boolean`, `innovation_development` and `innovation_use`, `required: false`) in `general_information` at order 25: the flag the annual-updating rules of `general.is_discontinued` and `general.discontinued_reasons` depend on, now a regular field instead of an internal pseudo-key. Top-level fields 114 → 115 (`boolean` 18 → 19). Storage bindings (table paths, lookups) remain internal. The statement that QA's unit of selection is the top-level field, and that the results endpoint returns the whole object, is now part of the contract. Spec `quality-assurance/qa-field-catalog`, QAC-T-14. |
| 2026-10-07 | **v1.6 — 2026-10-07: contributors & partners fully parametrized (owner field list); catalog_version 2026.11.** `contributors_partners` is renumbered 1–17 in the owner's form order: submitter, `toc.planned_result`, `toc.entries`, `toc.program_invested_financial_resources`, `toc.narrative`, `contributors.lead_center` (now before the centers), `contributors.centers`, `contributors.other_centers`, `contributors.science_programs`, `contributors.bilateral_projects`, `partners.not_applicable`, `partners.external_partners`, `partners.is_lead_by_partner`, `partners.lead_partner`, `linked.has_innovation_link`, `linked.results`, `partners.kp_additional_partners`. New keys: `contributors.other_centers` (label "Other(s) Contributing CGIAR Centers", `multi_select`, control list `centers`) and `contributors.science_programs` (`list`, depth 2: program, `from_toc`, the program's own "Can this result be mapped to a ToC KPI?" and its own ToC mappings). Pre-release meaning/type changes authorized by the owner: `contributors.centers` now holds only the centers that came from the ToC (the others are `contributors.other_centers`), and `partners.external_partners` changes from `multi_select` to `list` with subfields `institution`, `partner_type` and `partner_role`. `toc.entries` grows from 2 to 8 subfields (`level`, `toc_result` (label "Output/Outcome"), `hlo_statement`, `kpi`, `indicator_typology`, `unit_of_measurement`, `target`, `contribution_to_target`); the same 8 describe each science program's mappings. `visible_when` is returned for `toc.entries` (planned = true), `toc.program_invested_financial_resources` and `toc.narrative` (planned = false), `partners.external_partners` and `partners.kp_additional_partners` (not applicable = false), `partners.lead_partner` (led by a partner = true) and `linked.results` (linked = true), and on the subfields that depend on a previous choice (output/outcome after level, KPI after output/outcome, typology, unit, target and contribution after KPI). Subfield `required: true` marks the rules the live validation states (output/outcome, KPI, contribution > 0) and, for the program of a science program and the partner of an external partner, the identity of the element (always present); a rule only the client enforces (the level of a ToC mapping, the role of a partner) is not marked required. Top-level fields 115 → 117 (`multi_select` 22 → 22, `list` 14 → 16, fields applying to every type 34 → 36); subfields 61 → 82; `PENDING_CATALOG` 144 → 135 columns across 32 tables. Spec `quality-assurance/qa-field-catalog`, QAC-T-15. |
| 2026-10-07 | **v1.7 — 2026-10-07: review rework of the v1.6 contributors & partners content (QAC-T-15); catalog_version 2026.12.** the Science Program ToC answer and mappings now match the program's rows of THIS result only (they previously matched that program's rows in every result); `toc.entries`, `toc.planned_result`, `toc.narrative` and `toc.program_invested_financial_resources` read the submitter's ToC rows only, so the contributors' mappings are no longer repeated in `toc.entries`; the ToC target is chosen for the reporting year (the year part of the target date, which the ToC stores both as `YYYY` and as `YYYY-MM-DD`; when several target rows remain, the latest target date is taken) and the KPI-derived values (typology, unit, target) accept either identifier the ToC stores for a KPI; `level` and `partner_role` are no longer marked `required` (client-only rules); `contributors.submitter` and `general.primary_program` read the active submitter row only. The response shape is unchanged (no new properties); the only visible differences are the missing `required` flag on those two subfields (and the same two copies under each science program) and the new `catalog_version`. Storage bindings stay internal. |
| 2026-10-07 | **v1.8 — 2026-10-07: `general.reported_year` added to `general_information`; catalog_version 2026.13.** New `number` field "Reporting year" (applies to every result type, `required: true`, set by the system; value is the year itself, e.g. 2026) right after `general.status`; the following `general_information` fields move one position (orders stay contiguous 1–26). Pure addition: no key removed or changed, response shape unchanged. |
