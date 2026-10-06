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
| Caching | Content changes only on a PRMS deploy. `catalog_version` changes with it; use it to detect a new revision. `generated_at` changes on every call and is not a revision signal. |

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
  "catalog_version": "2026.5",
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
| `subfields` | array | on `list` (and on composite fields) | Nested entries, one level deep. |

### `subfields[]`

| Property | Type | Meaning |
|---|---|---|
| `key` | string | Key, unique inside its parent field. |
| `label` | string | Display name. |
| `type` | string | Same vocabulary as fields. |
| `control_list` | string, optional | Present on select subfields. |
| `required` | boolean, optional | Whether the subfield is required inside each row of the list. |

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
- `required: false` does **not** mean "never required". Some fields are required only when another answer has a given value (for example, a justification that is required when a related question is answered Yes). Those conditions are recorded inside PRMS but are **not exposed in this contract version**. A consumer MUST NOT infer that an optional field can be left empty in every case.
- A subfield with `required: true` is required in every row of its parent list. Row-level conditions are not modelled.

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

- `catalog_version` = `<phase_year>.<revision>`. Example: `2026.5` is the fifth revision of the 2026 catalog.
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

## Catalog at revision 5 (2026.5)

Counts measured on the code catalog on 2026-10-06 (the same data the endpoint returns):

| Item | Count |
|---|---|
| Result types | 9 |
| Sections | 21 |
| Catalogued fields (top level) | 106 |
| Catalogued subfields | 61 |
| Fields with `required: true` (unconditional) | 33 |
| Fields with a conditional requirement (not exposed, `required: false`) | 44 |
| Fields by type | `single_select` 31 · `multi_select` 21 · `boolean` 18 · `text` 16 · `list` 14 · `number` 6 |
| Fields applying to every type (`["*"]`) | 26 |
| Fields naming a result type explicitly (the `["*"]` fields above are not repeated here) | `innovation_development` 29 · `innovation_use` 27 · `innovation_package` 17 · `knowledge_product` 15 · `capacity_sharing` 14 · `policy_change` 10 · `other_outcome` 6 · `other_output` 6 · `impact_contribution` 6 |
| `PENDING_CATALOG` entries (columns known, for QA, not yet described) | 146 columns across 36 in-scope tables |
| `NOT_FOR_QA` entries (columns that are never for QA, each with a reason) | 363 columns |

`PENDING_CATALOG` and `NOT_FOR_QA` are internal PRMS lists enforced by an automated completeness check: a column of an in-scope table that is in neither list and bound to no field fails the build. Only their counts are public.

The first boot of this revision wrote 9 result types, 21 sections and 167 field rows (106 fields + 61 subfields) plus 1 version row; a second boot changed nothing.

---

## Known gaps

These are deliberate and tracked; each one is **additive** when resolved.

1. **`PENDING_CATALOG` (146 columns).** Fields that are for QA but cannot yet be described faithfully. They arrive in later revisions as new keys. Causes:
   - **Two-hop storage (REVIEW D2):** values that reach the result through a parent row (budget rows of innovation development / use / package, indicator and target per ToC mapping, complementary-innovation rows, and similar).
   - **Nested lists (REVIEW D1):** the IPSR step 3 evidence lists need two levels of subfields; the contract allows one.
   - **IPSR sections validated by embedded SQL (REVIEW D16):** general information, contributors and links of the innovation package are catalogued only where inventoried.
   - **IPSR step 2.2 (REVIEW D19):** administrator-only tab, deferred.
   - **Optional / legacy columns** (no validation rule in 2026, or present only in 2025 data): added as optional fields or for a 2025 load.
2. **Subfield conditions are not in the model.** Subfields have `required` but no conditional rule; row-level conditions stay in the inventory.
3. **Conditional requirements are not exposed** (see [what `required` means](#what-required-means)).
4. **Year coverage.** 2026 only.
5. **The 200 path has not been exercised by a real QA key.** No CLARISA key registered for QA exists yet, so a real authenticated 200 against a running instance is unverified; the 200 body is covered by unit and controller tests and a committed snapshot of the 2026.5 content. The 401 paths (no key, unknown key, user `auth` header) were exercised live on 2026-10-06.
6. **Control-list contents are not served** by this endpoint.

---

## Change log (maintainers)

| Date | Change |
|---|---|
| 2026-10-06 | **v1 — `GET /api/qa/catalog?phase_year=` introduced** (spec `quality-assurance/qa-field-catalog`, QAC-T-12). Content: phase 2026 (portfolio P25), `catalog_version` `2026.5`; 9 result types, 21 sections, 106 fields, 61 subfields; 146 `PENDING_CATALOG` and 363 `NOT_FOR_QA` internal entries (counts only). Authentication by CLARISA API key (`x-api-key`) with permission `/api/qa/catalog`. Status codes 200 / 400 / 401 / 404 (no empty 200). Additive-only from here. |
