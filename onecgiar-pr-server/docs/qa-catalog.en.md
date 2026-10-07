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
  "catalog_version": "2026.21",
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

Since v1.13 `required` follows **the 2026 form together with the live validation**: an entry is required when the form the reporter fills in marks it as required (including a conditional requirement), or when the live P25 validation also states a rule for it. QA therefore sees what the user had to fill in, not only what the green check reads. Where the two differ, the union is returned and the rule is recorded as stated by only one of them.

- `required: true` means the entry is required for the listed result types **unconditionally** (in every row of its parent list, for a subfield).
- `required_when` is the condition under which the entry is required; with `required: false` the entry is required only while the condition holds. A conditional rule the form states and the live validation does not is still returned.
- `required: false` without `required_when` means neither the form nor the live validation requires the entry. It does **not** mean the entry can be left empty in every case where a rule has not been transcribed (see [known gap 3](#known-gaps)).
- `required_confirmed` (internal, not returned by the endpoint) is `true` only when the live validation function **also** states the rule; `false` means the rule comes from the form alone (or the function states only part of it). It never changes what `required` / `required_when` say.
- A subfield may carry its own `required` or `required_when`, evaluated against its sibling subfields or top-level fields. Subfields have no `required_confirmed`.
- A requirement the model cannot express stays in the form (for example a rule that depends on reference data such as the centers a ToC returns). The catalog then errs in one of two directions, and each case is listed in the change log and in the known gaps: **over-required** (the entry is returned as required although the form moves the requirement elsewhere in some cases, for example `contributors.centers`) or **under-required** (the entry is returned as optional although the form requires it in some cases, for example `contributors.other_centers`).

### Display rules

`visible_when` and `required_when` state **when a field or subfield is shown and when it is required**, so a consumer can build the form and the query from the catalog alone (since v1.5, additive; fields and subfields that have no rule simply omit the property).

A condition is plain data, never evaluated by PRMS:

```json
{ "field": "linked.has_innovation_link", "operator": "eq", "value": true }
{ "all": [ { "field": "geo.scope", "operator": "in", "value": [3, 4, 5] },
           { "any": [ { "field": "$result_type", "operator": "eq", "value": "policy_change" } ] } ] }
```

| Form | Meaning |
|---|---|
| `{ "field", "operator": "eq", "value" }` | The answer of `field` equals `value`. |
| `{ "field", "operator": "in", "value": [...] }` | The answer of `field` is one of the listed values. |
| `{ "field", "operator": "not_null" }` | `field` has an answer. |
| `{ "all": [condition, ...] }` / `{ "any": [condition, ...] }` | Every / at least one nested condition holds. |

- `field` is the **key of another catalog entry that exists in the same year's catalog**, or a **result-header key** (see below). **Scope:** inside a `subfield`, `field` names a **sibling subfield of the same list element** (for example `kpi` inside `toc.entries`); a sibling wins over a top-level key of the same name, and a top-level key is also accepted there. Outside subfields, `field` is a top-level key. Any other value a condition needs is itself a catalog field; for example the replicated-innovation flag is the field `general.is_replicated`.
- **Scope limit:** a depth-2 subfield (e.g. inside a Science Program's ToC mapping) can reference its siblings or a top-level key, but not its parent element's subfields (e.g. the program's `from_toc`). No current condition needs it.
- **`$` = result header data, not a field.** The `$` prefix is reserved for data of the result's header. Today there is one: `$result_type`, the `key` of the result's type, as in `result_types[].key`. Future header keys (for example `$phase`) follow the same syntax. A condition naming any other `$...` key is invalid. (Before v1.9 this key was spelled `result_type`.)

**How a condition compares, by the type of the referenced field** (v1.9):

| Referenced field | `eq` | `in` (`value` is an array) |
|---|---|---|
| `boolean`, `number`, `text`, `date` | the stored value equals `value` (compared as is) | the stored value is one of the listed values |
| `single_select` | the selected option **id** equals `value` (a number) | the selected option id is one of the listed ids (numbers) |
| `multi_select` | **not allowed** (invalid; a future explicit `contains` operator may cover it) | true when **at least one** selected id is in `value` (numbers) |
| `$result_type` | the type key equals `value` (a string) | the type key is one of the listed keys (each must exist in `result_types[]`) |

- `not_null` (any type) is true when the field has an answer. An empty string `""` counts as **null**; an empty list `[]` (a `multi_select` or a `list`) counts as **null**; `false` and `0` are **not** null.
- When a `single_select` / `multi_select` is over a **closed control list** (a fixed set of ids defined by PRMS: `tag_levels` 1 Not Targeted, 2 Significant, 3 Principal; `result_types`; `assessed_workshop_options`; the innovation team diversity lists `question_options_team_diversity` 113 to 115 and `question_options_team_diversity_actions` 116 to 121; `capdev_terms` 1 PhD, 2 Master, 3 Short-term, 4 Long-term; `geographic_scopes` 1 Global, 2 Regional, 3 Country, 4 single-country package (legacy, read as Country), 5 Sub-national, 50 To be determined; `evidence_sources` 0 Link, 1 Upload file), every id in `value` must exist in that list. Reference lists (results, projects, directory users, institutions, initiatives, centers, countries, regions, CLARISA lists, ...) change at runtime and are not checked.
- `visible_when` absent means always shown for the entry's `result_types`.
- **Selecting a field includes the fields named in its `visible_when` (transitively); subfields always travel with their parent.** (Owner decision 2026-10-07; no new field. The rule governs what a consumer takes when it selects a field: the fields its display condition depends on come along, and so do theirs.)
- When both a `required_when` and `required: false` are present, the entry is required only while the condition holds.

### Stored values and shared values

- **`general.is_discontinued` describes the STORED value**, which is the **inverse** of the 2026 form question "Is this innovation active and receiving investment?": answering *Yes* stores `is_discontinued = false`, answering *No* stores `true`. The catalog label is therefore "Is this innovation discontinued?", and conditions that depend on it (for example `general.discontinued_reasons`) compare against the stored value (`eq true` = discontinued / inactive).
- **`general.primary_program` and `contributors.submitter` are the same stored value** (`results_by_inititiative`, role 1, active). It is edited only in Contributors & partners; in General information it is a read-only identity.
- **`innovation_use.linked_result.has_innovation_link` and `innovation_use.linked_result.linked_result` mirror `linked.has_innovation_link` and `linked.results`** (the question "Are you reporting the use of an innovation that has already been reported and quality assessed?" and its result picker). The linked rows are **shared storage**: both keys read the same rows, so the picker is a `multi_select` and several rows can exist (the Innovation Use page edits only the first one). The yes/no answer is stored in **two columns**: one on the Innovation Use row of the result (saved by the Innovation Use page) and a result-level copy (saved by Contributors & partners). For an Innovation use result **the authoritative answer is `innovation_use.linked_result.has_innovation_link`**: the Innovation Use page does not update the result-level copy, so for that type `linked.has_innovation_link`, and the `visible_when` of `linked.results` that depends on it, may be stale. Read the mirror keys for Innovation use; do not combine them with the `linked.*` keys.

### Knowledge product notes

- **Knowledge product author affiliations (`partners.kp_author_affiliations`) and M-QAP.** For a knowledge product, M-QAP (the matching service behind the CGSpace sync) reads each author affiliation CGSpace holds and suggests a CLARISA partner with a confidence percentage. One element of the list is one affiliation. `cgspace_affiliation` is the text CGSpace holds and `confidence` is M-QAP's confidence in its suggestion, as a percentage; `confidence` is shown only for a predicted match. **The suggested partner is copied into `clarisa_partner` only when the confidence reaches a global threshold** (a platform setting, not a catalog value); below it `clarisa_partner` starts empty and the reporter picks the partner by hand, or leaves it empty (it is optional). `is_predicted` is the **match type** and is **recomputed on every save**: it is `true` ("Predicted by M-QAP AI") only when the saved partner is exactly the one M-QAP suggested **and** its confidence reaches the threshold at the time of the save; any other partner, including the suggested one after a manual re-pick below the threshold, makes it `false` ("Manual match"). A QA reader should therefore treat `is_predicted = false` with a partner as a human decision, and a high `confidence` with `is_predicted = false` as a partner the reporter changed. `partner_type` is the CLARISA type of the chosen partner, and `roles` the delivery roles (Scaling, Demand, Innovation, Other) the reporter toggled for that partner; unlike the external partners block, the knowledge product block does not require them. A knowledge product that has no author affiliation matched has an empty list.
- **Knowledge product additional partners (`partners.kp_additional_partners`).** The picker shows, for each CLARISA partner chosen, its institution type and its partner roles, and the form marks the roles mandatory (at least one per partner), exactly as the external partners block does. The field is therefore a `list` with the same subfields as `partners.external_partners` (`institution`, `partner_type`, `partner_role`); the live validation counts the partners but does not check the roles, so the role requirement is form-stated. Its type changed from `multi_select` to `list` in this revision (pre-release, no consumer yet; same authorization as the owner's 2026-10-07 change of `partners.external_partners`); the key is unchanged.
- **Knowledge product metadata is shown as stored by the repository sync.** `knowledge_product.repository` is the name of the repository the record comes from (the form prints it in the labels but has no label of its own for it, so the label is "Repository"). `knowledge_product.*_cg` fields carry the repository (CGSpace) value and `*_wos` the Web of Science value (`accessibility_wos` is labelled Unpaywall in the form; `accessibility_cg` is an object with the two stored values the form chooses between, `open_access` and `accessibility`, while the Web of Science one is a single value); the form paints a Web of Science value only when one exists, and the repository value of a type other than a journal article only when the record belongs to the reported phase. The numeric Altmetric score is not printed by the form (it is drawn in the badge) and is catalogued under `knowledge_product.altmetric`. `knowledge_product.fair` lists every current FAIR score row, the four dimension scores (F, A, I, R) and their checks; the overall `total` row is stored too but the form does not show it. "Reference to other knowledge products" has no stored value and is not catalogued.

### Nested data, lookups and the unit of selection

- **A stored row with no value is not an element.** Every `multi_select`, `single_select` and `list` field has one value per element, and a stored row whose value is empty is not part of the answer. For example, `partners.kp_author_affiliations` holds one element per author affiliation M-QAP matched, so a partner row of the result that has no M-QAP match is not an element of that list.
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

## Catalog at revision 21 (2026.21)

Counts measured on the code catalog on 2026-10-07 (the same data the endpoint returns):

| Item | Count |
|---|---|
| Result types | 9 |
| Sections | 21 |
| Catalogued fields (top level) | 146 |
| Catalogued subfields | 147 (of which 8 at the second level) |
| Fields with `required: true` (unconditional) | 47 |
| Fields with a conditional requirement (`required: false` plus `required_when`) | 45 |
| Subfields with `required: true` / with a conditional requirement | 30 / 31 |
| Fields by type | `single_select` 37 · `multi_select` 20 · `boolean` 24 · `text` 19 · `list` 30 · `number` 13 · `object` 2 · `date` 1 |
| Fields applying to every type (`["*"]`) | 37 |
| Fields naming a result type explicitly (the `["*"]` fields above are not repeated here) | `innovation_development` 33 · `innovation_use` 33 · `innovation_package` 17 · `knowledge_product` 32 · `capacity_sharing` 14 · `policy_change` 13 · `other_outcome` 6 · `other_output` 6 · `impact_contribution` 6 |
| `PENDING_CATALOG` entries (columns known, for QA, not yet described) | 85 columns across 22 in-scope tables |
| `NOT_FOR_QA` entries (columns that are never for QA, each with a reason) | 368 columns |

`PENDING_CATALOG` and `NOT_FOR_QA` are internal PRMS lists enforced by an automated completeness check: a column of an in-scope table that is in neither list and bound to no field fails the build. Only their counts are public.

The first boot of this revision wrote 9 result types, 21 sections and 167 field rows (106 fields + 61 subfields) plus 1 version row (revision 5, before the `toc_alignment` merge: see the change log); a second boot changed nothing.

---

## Known gaps

These are deliberate and tracked; each one is **additive** when resolved.

1. **`PENDING_CATALOG` (85 columns).** Fields that are for QA but cannot yet be described faithfully. They arrive in later revisions as new keys. Causes:
   - **Two-hop storage (REVIEW D2; the model supports parent-to-child table paths since v1.5, the fields arrive in later revisions):** values that reach the result through a parent row (budget rows of the innovation package; those of innovation use were resolved in v1.14, complementary-innovation rows, and similar; the indicator and target of each ToC mapping and the partner roles were resolved in v1.6).
   - **Nested lists (REVIEW D1):** the IPSR step 3 evidence lists need two levels of subfields; the contract allows two since v1.5, and the fields themselves arrive in later revisions.
   - **IPSR sections validated by embedded SQL (REVIEW D16):** general information, contributors and links of the innovation package are catalogued only where inventoried.
   - **IPSR step 2.2 (REVIEW D19):** administrator-only tab, deferred.
   - **Optional / legacy columns** (no validation rule in 2026, or present only in 2025 data): added as optional fields or for a 2025 load.
2. **Subfield conditions (resolved in the model, v1.5).** Subfields may carry `required_when` / `visible_when`; the catalog content that uses them arrives per field in later revisions.
3. **Conditional requirements (resolved in the model, v1.5; transcription incomplete).** `required_when` and `visible_when` are returned wherever the catalog states them (see [display rules](#display-rules)); entries whose rule has not yet been transcribed still read `required: false` without a condition, so the absence of a condition does not prove that an entry is optional.
4. **Year coverage.** 2026 only.
   - **Question fields (innovation development).** `innovation_dev.gesi_stage`, `innovation_dev.risk_stage`, `innovation_dev.ipr_consideration` and `innovation_dev.team_diversity` bind to the answered rows of the result's answers (one row per option marked, active). A row belongs to a question through the field's control list: by id for the closed team diversity lists, and by option text for the three lists that are not closed (their option ids are not the same in every environment).
5. **Live verification (2026-10-06, local instance, CLARISA test key with permission `/api/qa/catalog`):** `phase_year=2026` → 200 with the 2026.5 content (body identical to the committed catalog, apart from `generated_at`); `phase_year=2023` → 404; `phase_year=abc` → 400; no key, unknown key or user `auth` header → 401. Not yet verified on a deployed environment.
6. **Control-list contents are not served** by this endpoint.
7. **`visible_when` is not persisted in `qa_catalog_field`** (migration pending; the owner runs it). The endpoint serves it from the code catalog, so the response is correct; the stored catalog tables do not yet carry the rule.
8. **`partners.not_applicable` NULL versus `eq false`.** A never-answered `no_applicable_partner` (NULL) is neither `true` nor `false`: the live function treats NULL as failing (it requires an answer), while the catalog's `visible_when` / `required_when` on `partners.not_applicable = false` do not match NULL. A consumer must treat NULL as "answer missing" (invalid for a required field), not as "not applicable = false".
9. **Indicator rows of a ToC mapping (recorded, not filtered).** The typology and unit lookups of a mapping do not prefer the active indicator row: the client still shows inactive linked indicators, so the catalog does the same.

10. **`contributors.centers` over-required, `contributors.other_centers` under-required.** The form requires at least one contributing center; when the ToC returned no centers it asks for at least one entry in `contributors.other_centers` instead. The catalog returns `contributors.centers` as required and `contributors.other_centers` as optional, because "the ToC returned no centers" is reference data, not a catalog field. When the ToC returned no centers, at least one entry in `contributors.other_centers` satisfies the requirement, so an empty `contributors.centers` is not missing in that case.
11. **`innovation_use.current_use.yet_to_be_determined` and `innovation_use.projection_2030.yet_to_be_determined` stored as NULL.** A NULL means "not ticked" (the form loads NULL as false; the live validation reads it as 0), not a missing answer, although the entry is returned as `required: true`.
14. **`innovation_use.investment.*.is_determined` NULL.** In the investment rows a NULL `is_determined` means "not marked yet to be determined" and must be read as false when evaluating `kind_cash`'s `required_when` (`is_determined` eq false); the live validation treats NULL and 0 alike (VIU:429-479). The condition vocabulary cannot negate `eq`, so the either-or (a value or "yet to be determined") is carried by `kind_cash` alone.
12. **Requirements the form gates on data the catalog does not carry.** `general.merge_targets` / `general.split_targets` (a merge or split discontinuation reason is ticked; the reasons are matched by text and their ids are not a closed list), `innovation_use.current_use_update.new_users_added`, `innovation_use.current_use_update.use_expansion_narrative` and `innovation_use.projection_2030.justification` (shown only when the previous phase reported actors or the 2030 projection changed) are returned as optional.
13. **`general.discontinued_reasons.description` applies to one row only.** It is required only on the row whose `reason` is 6 (the legacy 'Other'; live validation). The 2026 'Other (please specify)' reason has a different id; the form shows its text box but marks it optional and the live validation does not read it, so no rule applies to it. In 2026 a reason-6 row appears only on rows carried over from an earlier phase.
15. **`policy_change.actors_influenced` has no `visible_when`.** The form shows it only when the answer to `policy_change.related_to` is the option "The capacity development of key actors in a policy process" (the client compares the answer with question id 51). That id is environment-specific (test 51; prod options 49 and 50, no 51) and the options of `related_to` are matched by label, not by id, so the condition vocabulary cannot name it without inventing an id. With prod's `related_to` option ids (49 and 50, no 51) the form would never show "Number of key actors influenced" in prod; UNVERIFIED in prod (from inventory 2026-B:86). The field is returned always visible and optional; QA should treat it as applicable only for that option. **`policy_change.amount_status` option ids** (Confirmed 1, Estimated 2, Unknown 3) are hard-coded in the form; the column is free text, so the stored value is not guaranteed to be one of them.
16. **`knowledge_product.is_isi_cg` and `knowledge_product.accessibility_cg` are returned `required: false` although the live validation requires them.** For a knowledge product whose type is a journal article the live validation (function-stated) requires a non-blank ISI status and a non-blank accessibility (the stored value behind the `accessibility` subfield of `accessibility_cg`; the form shows the `open_access` text when there is one and otherwise derives it from `accessibility`). The type test is a text pattern match on the free-text knowledge product type, which `required_when` (equality and list membership only) cannot express, and the type is not a closed list; the form marks both fields not required. The live validation also reads only the metadata row whose source name contains `cgspace`, while the catalog's repository (CGSpace) variants read the first active metadata row, whatever repository it names (CGSpace, MELSpace, WorldFish DSpace); for a record of another repository the validation and the catalog can therefore disagree. A consumer should treat a missing value of either field as invalid for a journal article.

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
| 2026-10-07 | **v1.9 — 2026-10-07: condition semantics (owner amendment); catalog_version 2026.14.** The result-header condition key `result_type` is renamed `$result_type` (the `$` prefix is reserved for result header data; any other `$...` key is invalid); every condition `field` is documented by scope (sibling subfield inside subfields, top-level key outside); comparison is defined by the referenced field's type (`single_select` against the option id, `multi_select` only with `in`, `$result_type` against the type key) and `not_null` by type (`""` and `[]` are null, `false` and `0` are not); ids compared against a closed control list must exist in it; `general.is_discontinued` is relabelled to describe the stored value ("Is this innovation discontinued?", the inverse of the form question) and `general.primary_program` is documented as the same stored value as `contributors.submitter`. **Breaking for consumers that read `result_type` conditions:** the key is now `$result_type`. Pre-release change authorized by the owner (2026-10-07): the catalog has not been deployed or consumed by QA yet. Response shape unchanged; no field added or removed. |
| 2026-10-07 | **v1.10 — 2026-10-07: geographic location (Results) fully parametrized (QAC-T-16); catalog_version 2026.15.** `geo.countries` and `geo.extra_countries` change type `multi_select` to `list` (pre-release type change authorized by the owner; the keys, the stored rows and the control list of the country are unchanged): each element is a country (`country`, `single_select`, control list `countries`) with its sub-national areas (`subnational`, `multi_select`, control list `subnational_areas`, shown and required when the scope, or for `geo.extra_countries` the extra scope, is 5). The sub-national areas are a subfield; no `geo.subnational` / `geo.extra_subnational` key exists or is added. Every `geo.*` field now carries `visible_when` and `required_when` transcribed from the 2026 form, and the control list `geographic_scopes` is a closed list (1 Global, 2 Regional, 3 Country, 5 Sub-national, 50 To be determined, and the stored legacy id 4, which the live validation treats like 3). Corrections to earlier rules: `geo.regions_specified` is required only for scope 1 (scope 2 never leaves it unanswered); `geo.countries` is no longer required for scope 5 (the live validation accepts scope 5 with no country; its sub-national areas are checked per country); the extra-scope rows (`geo.extra_scope` and below) are nested in the extra block (main scope 2, 3, 4 or 5 and "other geographic areas" = Yes) and `geo.extra_regions` / `geo.extra_countries` count only active rows, as the main ones do. A consumer applying `subnational` as required must skip a country for which CLARISA lists no sub-national areas (reference data, not in the catalog). `geo.has_extra_scope` and below keep their order contiguous (1–11). IPSR geography is unchanged. Top-level fields 118 (unchanged); subfields 82 → 86; `list` 16 → 18, `multi_select` 22 → 20. |
| 2026-10-07 | **v1.11 — 2026-10-07: evidence (Results) fully parametrized (QAC-T-17); catalog_version 2026.16.** QA now receives all the data of each evidence item, not only what the green check requires. `evidence.items` keeps its key and gains subfields, each with `visible_when` / `required_when` transcribed from the 2026 form: `source` ("Source of the evidence", `single_select`, control list `evidence_sources`: 0 Link, 1 Upload file; not shown for knowledge products), `link` (shown and required when the source is 0), `is_public_file` (`boolean`, "Can this evidence be shared publicly?", upload only), `file_name` (`text`, the uploaded file's name, upload only), `file_url` (`text`, the uploaded file's repository link, upload only and required; it is delivered even when the file is private, and `is_public_file` tells the consumer how to treat it), `description` (`text`, optional) and the flags that say what the item supports: the five impact-area flags `gender_related`, `climate_related`, `nutrition_related`, `environment_related`, `poverty_related` (each shown when the matching General information tag, `general.gender_tag` ... `general.poverty_tag`, is 3, Principal) and the result-type flags `innovation_readiness_related` (innovation development), `innovation_use_related`, `policy_change_related`, `capacity_sharing_related`, `knowledge_product_related_flag`, `other_output_related`, `other_outcome_related` (each shown only for its own result type, `$result_type`). `link` and `file_url` hold the same stored value (for an upload the link IS the repository URL): read the one that matches `source`. Rules the model cannot express per item stay in the form and the live validation: each impact-area flag set to Principal needs at least one item carrying the flag, and an innovation development result with a readiness level above 0 needs one item flagged `innovation_readiness_related`; the readiness-level-0 exemption of the link is not expressed. List-level rules of the live validation that the per-item model cannot express: for an innovation development result at readiness level 0 with no tag set to 3, the whole evidence check (list and link) is skipped, and for capacity sharing the evidence is required whenever any tag is 3 (the list is otherwise optional for that type). A consumer must not read `evidence.items` being empty as a failure in those cases without applying them. A hidden field keeps its stored value and that value still counts when a condition is evaluated: for a knowledge product the `source` radio is not shown, but its stored value (0, Link) is what the conditions on `link` and `file_url` read. `is_public_file` and `file_name` come from the uploaded file's newest active row (one value per item). The IPSR step 3 evidence lists are not covered. Top-level fields 118 (unchanged); subfields 86 → 97; subfield types: `boolean` +7, `text` +3, `single_select` +1. `PENDING_CATALOG` 135 → 122 columns; `NOT_FOR_QA` 355 → 357 columns (SharePoint storage internals `document_id` and `folder_path`, which are not on the form and are not delivered). |
| 2026-10-07 | **v1.12 — 2026-10-07: innovation development (Results) fully parametrized (QAC-T-18); catalog_version 2026.17.** Every field of the 2026 innovation development form is described with `visible_when` / `required_when` taken from the form; `required` now follows what the form marks as required (a control the form shows as required is `required: true` even when the green check does not read it). New control lists: `question_options_team_diversity` (ids 113, 114, 115) and `question_options_team_diversity_actions` (ids 116 to 121) are closed lists, so a condition on them is checked against those ids; `question_options_gesi_stage`, `question_options_risk_stage` and `question_options_ipr` stay reference lists (their option ids are not the same in every environment: match options by label). Existing keys are unchanged. Changed rules: `innovation_dev.is_new_variety` is shown and required only when `innovation_dev.nature` is 12 (variety or breed); `innovation_dev.number_of_varieties` is shown when the nature is 12 and `is_new_variety` is true, and required when `is_new_variety` is true (a rule stated by the live validation, which requires a value above 0; the form marks it optional); on `innovation_dev.gesi_stage` and `innovation_dev.risk_stage` the existing subfield `not_applicable_reason` ("Why?") is shown and required only when the chosen option is "Not applicable", which a consumer decides from the new read-only subfield `option_label` (the label of the chosen option); on `innovation_dev.team_diversity` the subfield `actions` is shown and required when the answer is 113, and `other_text` is shown and required when action 121 (Other) is ticked; the requirement of `actions` is stated by the live validation and not marked by the form (for now `required` is the form's requirement together with the live validation's). New top-level fields (type `list`, optional, one element per active row): `innovation_dev.estimates_pooled` (Science Program/Accelerator pooled investment; subfields `program`, `kind_cash`, `is_determined`), `innovation_dev.estimates_non_pooled` (W3 or bilateral projects; subfields `project`, `kind_cash`, `is_determined`) and `innovation_dev.estimates_partners` (partners; subfields `institution`, `partner_type`, `kind_cash`, `is_determined`). `kind_cash` is the total value (in-cash + in-kind) and `is_determined` is true when the reporter marked it "yet to be determined"; neither is required by the live validation (a missing value counts as 0). Rules the model cannot express stay in the form: the form flags each investment row unless it has a value or "yet to be determined" (a row needs a value or "yet to be determined"), and the condition vocabulary cannot write it (`is_determined` is nullable and a condition cannot negate `eq`), so neither subfield carries a requirement; a consumer must not read an empty row as complete. The 2026 form has no follow-up questions to the intellectual property answer, so none are catalogued, and the fields removed from the 2026 form (anticipated users, user-need evidence, megatrends, scaling studies, reference materials) and the readiness-diminished notice (derived, not stored) are not catalogued. Contract rule (no new field): selecting a field includes the fields named in its `visible_when` (transitively), and subfields always travel with their parent. Top-level fields 118 → 121; subfields 97 → 109; field types: `list` +3; subfield types: `single_select` +4, `text` +2, `number` +3, `boolean` +3. `PENDING_CATALOG` 122 → 116 columns (the `kind_cash` / `is_determined` columns of the three budget tables are now bound); `NOT_FOR_QA` unchanged. |
| 2026-10-07 | **v1.13 — 2026-10-07: `required` follows the form in all Results sections already catalogued (QAC-T-19, owner decision, option B); catalog_version 2026.18.** `required` / `required_when` now state what the 2026 form requires together with what the live validation states (see [what `required` means](#what-required-means)). No key is renamed or removed. Fields whose requirement changed. General information: `general.primary_program` optional → required; new identity subfield `general.discontinued_reasons.reason` (the reason of each row, required, control list `discontinued_reasons`), and the subfield `general.discontinued_reasons.description` is required when `reason` is 6, i.e. only on the row of reason 6 (a rule stated by the live validation; the form marks the text optional). Contributors and partners: `contributors.submitter`, `contributors.lead_center` and `contributors.centers` optional → required (over-required: when the ToC returned no centers the form asks for at least one entry in `contributors.other_centers` instead, so an empty `contributors.centers` is not missing in that case); `partners.is_lead_by_partner` is required when `partners.not_applicable` is false or the result type is `knowledge_product`; `linked.has_innovation_link` was required only for `innovation_development` and is now required for every type except `innovation_use` and `innovation_package`; the subfield `partners.external_partners.partner_role` optional → required; the subfield `level` of `toc.entries` and of `contributors.science_programs.toc_entries` is required for every result type except `impact_contribution`. Geographic location: `geo.countries` and `geo.extra_countries` are now also required when the scope is Sub-national (5), as the form asks for at least one country there. Evidence: the `evidence.items` subfield `source` is required for every type except `knowledge_product`; `is_public_file` and `file_name` are required when `source` is 1 (Upload file). Innovation use: `innovation_use.current_use.yet_to_be_determined`, `innovation_use.projection_2030.yet_to_be_determined` and `innovation_use.use_level.innovation_use_level` optional → required; `innovation_use.use_level.readiness_level_explanation` is required when the use level is 5 to 9 (was 6 to 9); in the actors, organizations and measures lists of `current_use` and `projection_2030`: `actor_type` required, `other_actor_type` required when `actor_type` is 5, `women`, `women_youth`, `men` and `men_youth` required when `sex_and_age_disaggregation` is false, `how_many` (actors) required when it is true, `institution_type` required, `other_institution` required when `institution_type` is 78, `how_many` (organizations), `unit_of_measure` and `quantity` required. Rules only the live validation states are kept as they were (for example `linked.results` and the "at least one actor, organization or measure" rules). Display rules added in capacity sharing: the subfield `capacity_sharing.length_of_training.degree` is shown only when the length of training is 1, 2 or 4 (the closed list `capdev_terms`: 1 PhD, 2 Master, 3 Short-term, 4 Long-term, is now checked for conditions that name it), and `capacity_sharing.organizations` is shown only when `capacity_sharing.is_attending_for_organization` is true (its requirement is unchanged). Requirements the form states that a condition cannot express are left optional: `contributors.other_centers` (under-required: required only when the ToC returned no centers), `general.merge_targets` and `general.split_targets` (required only when a merge or split discontinuation reason is ticked), `innovation_use.current_use_update.new_users_added`, `use_expansion_narrative` and `innovation_use.projection_2030.justification` (required only when the form shows them). Policy change and knowledge product already matched the form. Subfields 109 → 110 (the new `reason`). `investment` rows of innovation development: the v1.12 note on `kind_cash` / `is_determined` now reads as the plain rule (a row needs a value or "yet to be determined"). |
| 2026-10-07 | **v1.14 — 2026-10-07: innovation use (Results) completed (QAC-T-20); catalog_version 2026.19.** New sections `iu_linked_result` (before the current use) and `iu_investment` (after the 2030 projection). Existing keys are unchanged. New top-level fields, all `innovation_use` only: `innovation_use.linked_result.has_innovation_link` (boolean, the question of the Innovation Use page) and `innovation_use.linked_result.linked_result` (multi select, control list `qa_innovation_dev_results`, shown when the answer is Yes and required then, as the live validation requires at least one linked result; several linked rows can exist and the page edits only the first), the question optional, mirroring `linked.has_innovation_link` / `linked.results` (see [stored values and shared values](#stored-values-and-shared-values)); and the three investment lists `innovation_use.investment.programs` (subfields `program`, `kind_cash`, `is_determined`), `innovation_use.investment.bilateral` (`project`, `kind_cash`, `is_determined`) and `innovation_use.investment.partners` (`institution`, `partner_type`, `kind_cash`, `is_determined`), optional lists with one element per active program, W3 or bilateral project and partner of the result, the same rows and values as the innovation development investment lists. `kind_cash` is required when `is_determined` is false; a NULL `is_determined` means "not marked yet to be determined" and is read as false (see known gap 14) (a rule stated by the live validation, which requires a value for every investment row that is not marked "yet to be determined"; the form shows the value as optional and flags a row with neither). New subfields, all optional: in the actors of `current_use` only (the 2030 block has no such control) `age_disaggregation_not_available` (shown while `sex_and_age_disaggregation` is false) and `youth_split_applied_by_system` (a flag the system sets when the youth figures are split 50/50, never typed by the reporter; shown only when `age_disaggregation_not_available` is true); and `graduate_students` in the organizations of both `current_use` and `projection_2030` (shown only when `institution_type` is 50). Pure addition. Top-level fields 121 → 126, subfields 110 → 124; sections 19 → 21; `PENDING_CATALOG` 116 → 112. |
| 2026-10-07 | **v1.15 — 2026-10-07: policy change (Results) completed (QAC-T-21); catalog_version 2026.20.** Existing keys are unchanged. Three new optional top-level fields, `policy_change` only, in the order of the form: `policy_change.usd_amount` (number, order 2) and `policy_change.amount_status` (single select, control list `policy_amount_statuses`, order 3), both shown only when `policy_change.policy_type` is 1 ("Program, budget or investment"; the form hides and clears them otherwise); and `policy_change.actors_influenced` (number, order 5, "Number of key actors influenced"). All three are optional (`required: false`, not confirmed): the form marks them not required and the live validation does not read them. `policy_change.policy_type` now carries the form's policy type guidance as its `description` (2026 wording), and `usd_amount` and `actors_influenced` their help text. The ids of the policy type list are CLARISA data; the status options are hard-coded in the form (the column is free text, so a stored value is not guaranteed to be one of them), so only `policy_types` is an open list; the status ids 1, 2 and 3 are a closed list (the form's own options). See known gap 15. Pure addition. Top-level fields 126 → 129; `PENDING_CATALOG` 112 → 109 (tables 28 → 27). |
| 2026-10-07 | **v1.16 — 2026-10-07: knowledge product completed (QAC-T-22); catalog_version 2026.21.** Existing keys are unchanged. One new top-level field in `contributors_partners`, `knowledge_product` only: `partners.kp_author_affiliations` (list, order 18, optional and not confirmed; one element per author affiliation matched by M-QAP; subfields `cgspace_affiliation`, `is_predicted` (the match type, label "Predicted by M-QAP AI"), `clarisa_partner` (control list `institutions`, optional), `partner_type`, `confidence` (shown only when `is_predicted` is true) and `roles` (control list `partner_delivery_types`, optional), see [knowledge product notes](#knowledge-product-notes)). Sixteen new optional, not confirmed, read-only fields in section `knowledge_product`, in the order of the page: `online_date`, `issue_date_cg`, `issue_date_wos`, `authors`, `peer_reviewed_cg`, `peer_reviewed_wos`, `is_isi_cg`, `is_isi_wos`, `doi`, `accessibility_cg` (object, subfields `open_access` and `accessibility`: the form shows the first when stored and otherwise derives the value from the second), `accessibility_wos`, `keywords`, `agrovoc_keywords`, `altmetric` (object, subfields `details_id`, `score`, `badge_image`; the form's help text as `description`) and `repository` (text, the repository the record comes from; the form has no label for it, so "Repository") and `fair` (list, subfields `fair_field_id`, `name`, `description`, `score`; the form's FAIR guidance as `description`; a `list`, not the `object` the inventory sketched, because the scores are stored one row per FAIR field and the form draws one ring or check per row). The centers fields `contributors.centers` and `contributors.other_centers` gain the optional boolean subfield `from_cgspace` (label "From CGSpace", the form has no label for it; shown only for a knowledge product): the lock the form puts on a center brought in by CGSpace. "Reference to other knowledge products" has no stored value and is not catalogued. `partners.kp_additional_partners` changes type from `multi_select` to `list` (key unchanged, subfields `institution` required, `partner_type`, `partner_role` required: the KP picker shows each partner's type and roles and requires the roles, normal selector lines 105-179); pre-release change with the same authorization as the owner's 2026-10-07 `partners.external_partners` change, no consumer yet. No key renamed or removed. Top-level fields 129 → 146, subfields 124 → 147; `PENDING_CATALOG` 109 → 85 (tables 27 → 22); `NOT_FOR_QA` 357 → 368. See known gap 16. |
