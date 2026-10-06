# Bilateral / list API — result payload summaries (English)

This document describes the **type-specific summary objects** attached to a **Result** when it is returned through the bilateral list flow (after enrichment). It is written for a **mixed audience**: programme staff, data consumers, and engineers.

---

## How to read this

- Each PRMS **result type** (indicator family) can expose one **summary** object on the result’s `data` object, in addition to a **large set of shared “core result” fields** (identity, status, geography, TOC, centres, evidence, DAC, links, etc.). Those commons are documented in the next section.
- Summaries are **curated views**: they favour **labels and readable structures** over internal database IDs, where the product already has that pattern.
- Field names below match the **JSON** property names returned by the API (`camelCase` unless noted).

---

## Wrapper shape (list entry)

Each item in a list response typically looks like:

| Property       | Meaning |
|----------------|---------|
| `type`         | String discriminator, e.g. `knowledge_product`, `capacity_sharing`, `innovation_development`, `innovation_use`, `innovation_package`, `policy_change`. |
| `result_id`    | Numeric id of the result row. |
| `data`         | Full enriched result document: common PRMS fields **plus** the summary for that type (when applicable). |

## Review-decision webhook

When an external platform has registered a webhook, the APPROVE/REJECT callback adds event fields around the same enriched result returned by `BilateralService.findOne`:

| Property | Meaning |
|----------|---------|
| `result_id` | Internal id of this result version. |
| `external_reference` | Platform's per-result reference, or `null`. |
| `decision` | `APPROVE` or `REJECT`. |
| `decided_at` | Timestamp when the webhook payload was assembled. |
| `reviewed_by` | `{ id, first_name, last_name, email }` of the user who made this decision, or `null` if review history cannot be resolved. The email is read from the PRMS user record; credentials are never included. |
| `justification` | Trimmed review comment, omitted when empty or unavailable. |
| `data` | Complete enriched bilateral result. It already includes `id`, `result_code`, `version_id`, `reported_year_id`, and `obj_version` (`id`, `phase_year`, `phase_name`), alongside the other result fields and type-specific summary. |

The reviewer is read from the most recent history entry matching this delivery's decision that predates the queued delivery. A later review cycle cannot change the reviewer of an earlier callback. The `data` object is reused as returned by the bilateral reader; its fields are not copied into another wrapper.

---

## Common fields on `data` (core result — all or many types)

These fields sit on the same object as the type-specific `*_summary` (when present). They describe **the result record in PRMS**: what it is, where it applies, who leads it, how it scores on cross-cutting markers, and how to open it in reporting tools. They are **not** replaced by the type summary; the summary **adds** type-specific detail.

### Identity, lifecycle, and reporting links

| Property | Technical | Plain language |
|----------|-----------|----------------|
| `created_date` | Timestamp when the result row was created. | When this record first entered PRMS. |
| `last_updated_date` | Timestamp of last structural/metadata update. | Last change to the result. |
| `last_update_at` | Often mirrors last update; used for display/sorting. | “As of” moment for freshness. |
| `result_code` | Stable public-facing numeric code for the result. | The number users see in reports and URLs. |
| `is_active` | Soft-delete / validity flag. | Whether this version of the result is current. |
| `year` | Reporting year context for the result. | Which reporting cycle it belongs to. |
| `status_id` | Numeric workflow status id. | Where the result is in the submission workflow. |
| `pdf_link` | URL to the PRMS PDF / report view for this result code. | One-click “report” view. |
| `prms_link` | URL to the PRMS web UI for general information. | Deep link into the full result editor. |

### Title, narrative, level, and indicator family

| Property | Technical | Plain language |
|----------|-----------|----------------|
| `result_title` | Short title string (bilateral-friendly name). | Headline title of the result. |
| `description` | Long text description. | What was achieved and how. |
| `result_level` | `{ code, name, description }` from result level reference. | How “high” in the results chain this is (output, outcome, etc.). |
| `indicator_category` | `{ code, name }` — maps to result type family for display. | Which indicator family this belongs to (e.g. Innovation use). |

### Theory of change and primary initiative

| Property | Technical | Plain language |
|----------|-----------|----------------|
| `toc_alignment[]` | Per contributing initiative: `entity` (official_code, name), `initiative_role` (e.g. primary submitter), `toc_results[]` with level, `sub_entity`, `result_name`. | How the result is tied to initiatives and ToC outcome statements. |
| `primary_entity` | `{ official_code, name }` of the main initiative. | Which initiative “owns” or leads this result in the UI sense. |

### Geography

| Property | Technical | Plain language |
|----------|-----------|----------------|
| `geographic_focus` | `{ code, name, description }` — geographic scope type. | Whether work is national, regional, multi-national, etc. |
| `regions[]` | Region objects (structure depends on data). | Broader geographic areas when used. |
| `countries[]` | e.g. `{ code, name }` ISO-style country entries. | Countries where the result applies. |

### Centres and partners

| Property | Technical | Plain language |
|----------|-----------|----------------|
| `contributing_centers[]` | `{ code, name, acronym, is_lead }` per centre. | CGIAR centres involved; `is_lead` marks the lead centre. |
| `contributing_partners[]` | Partner objects (structure depends on data). | Non-CGIAR or additional partners when captured. |
| `leading_result` | `{ lead_kind, id, code, name, acronym }`. If `is_lead_by_partner` is true: **partner** lead from `results_by_institution` (Clarisa institution `id`, `code` null). If false: **centre** lead from `result_center_array` (`code` = Clarisa center code, `id` = linked Clarisa institution when present). | Who leads the result (partner vs centre), with stable Clarisa identifiers. |
| `last_submission` | Present when `status_id` is **2** (Quality assessed) or **3** (Submitted): latest active `submission` row — `id`, `created_date`, `comment`, `status`, `status_id`, `submitted_by` (`user_id`, `first_name`, `last_name`). | When and by whom the result was last submitted in that workflow state. |
| `lead_contact_person` | Contact object or `null`. | Named focal point when stored. |

**May also appear (bilateral enrichment):** `result_by_institution_array` — slim partner list for bilateral contexts; `obj_results_toc_result` — raw ToC mapping rows before or alongside `toc_alignment`, depending on serializer.

### DAC cross-cutting scores

| Property | Technical | Plain language |
|----------|-----------|----------------|
| `dac_scores` | Object with keys `gender`, `climate_change`, `nutrition`, `environmental_biodiversity`, `poverty`. Each: `tag_title` (e.g. significance level text) and `impact_area_names[]` when applicable. | How the result targets SDG-aligned themes; nutrition can list impact areas such as “Food Security”. |

### Workflow status object

| Property | Technical | Plain language |
|----------|-----------|----------------|
| `obj_status` | `{ result_status_id, status_name, status_description }`. | Human-readable submission state (e.g. Submitted). |

### Evidence (main links)

| Property | Technical | Plain language |
|----------|-----------|----------------|
| `evidences[]` | `{ link, description }` per main evidence row (slim export). | Proof or references attached to the result. *Some pipelines may still expose the richer `evidence_array` from the ORM before mapping to this slim list.* |

### Bilateral projects and who created the record

| Property | Technical | Plain language |
|----------|-----------|----------------|
| `bilateral_projects[]` | Bilateral grant / project summaries tied to the result. Each item carries `short_name` (CLARISA project short name), `organization_code` (acronym of the project's owning institution) and `external_code` (the project's CLARISA external code, `null` when it has none). | Which bilateral-funded projects are linked. |
| `created_by` | `{ first_name, last_name, email }` (submitter / creator). | Who created or owns the record in PRMS. |
| `source` | Source enum string (e.g. `Result`). | Where the data came from (PRMS vs API). |
| `source_definition` | Human-readable source qualifier (e.g. W1/W2). | Funding / reporting stream label when set. |

### Reference fragment (realistic shape)

The following is an **illustrative fragment** of `data` showing how commons compose (values are examples only):

```json
{
  "created_date": "2026-03-20T07:29:33.151Z",
  "last_updated_date": "2026-03-24T13:08:43.000Z",
  "result_code": 28738,
  "status_id": 3,
  "year": 2025,
  "pdf_link": "https://reporting.cgiar.org/reports/result-details/28738?phase=6",
  "prms_link": "https://reporting.cgiar.org/result/result-detail/28738/general-information?phase=6",
  "last_update_at": "2026-03-24T13:08:43.000Z",
  "is_active": true,
  "result_title": "…",
  "description": "…",
  "result_level": { "code": 3, "name": "Outcome", "description": "…" },
  "indicator_category": { "code": 2, "name": "Innovation use" },
  "toc_alignment": [
    {
      "entity": { "official_code": "SP09", "name": "Scaling for Impact" },
      "initiative_role": "Primary submitter",
      "toc_results": [
        {
          "level": "2030 Outcome",
          "sub_entity": { "official_code": "SP09", "description": null },
          "result_name": "2030-OC 2: …"
        }
      ]
    }
  ],
  "geographic_focus": { "code": 3, "name": "Multi-national", "description": "…" },
  "regions": [],
  "countries": [{ "code": "BD", "name": "Bangladesh" }],
  "contributing_centers": [
    {
      "code": "CENTER-15",
      "name": "WorldFish",
      "acronym": "WorldFish",
      "is_lead": true
    }
  ],
  "contributing_partners": [],
  "dac_scores": {
    "gender": { "tag_title": "(1) Significant", "impact_area_names": [] },
    "climate_change": { "tag_title": "(0) Not targeted", "impact_area_names": [] },
    "nutrition": {
      "tag_title": "(2) Principal",
      "impact_area_names": ["Food Security"]
    },
    "environmental_biodiversity": {
      "tag_title": "(0) Not targeted",
      "impact_area_names": []
    },
    "poverty": { "tag_title": "(1) Significant", "impact_area_names": [] }
  },
  "obj_status": {
    "result_status_id": "3",
    "status_name": "Submitted",
    "status_description": null
  },
  "bilateral_projects": [],
  "evidences": [{ "link": "https://…", "description": null }],
  "primary_entity": { "official_code": "SP09", "name": "Scaling for Impact" },
  "created_by": {
    "first_name": "Justin",
    "last_name": "Dela Rueda",
    "email": "j.delarueda@cgiar.org"
  },
  "source": "Result",
  "source_definition": "W1/W2",
  "leading_result": {
    "lead_kind": "center",
    "id": 12345,
    "code": "CENTER-15",
    "name": "WorldFish",
    "acronym": "WorldFish"
  },
  "last_submission": {
    "id": 901,
    "created_date": "2026-03-22T10:00:00.000Z",
    "comment": null,
    "status": true,
    "status_id": 3,
    "submitted_by": {
      "user_id": 42,
      "first_name": "Jane",
      "last_name": "Doe"
    }
  },
  "lead_contact_person": null
}
```

Exact field set can vary slightly by **result type**, **phase**, and **serializer**; type-specific summaries are documented in the sections below.

---

## 1. Knowledge product — `knowledge_product_summary`

**When:** `type === "knowledge_product"` (result type id = Knowledge product).

**Purpose:** Exposes the stable **handle** only for bilateral / discovery consumers.

| Field | Technical | Non-technical |
|-------|-----------|----------------|
| `handle` | CGSpace / product handle. | Stable public identifier string. |

**Note:** The heavy `result_knowledge_product_array` tree is **removed** from `data` after enrichment and replaced by this summary.

---

## 2. Innovation development — `innovation_development_summary`

**When:** `type === "innovation_development"`.

**Purpose:** Innovation profile (typology, readiness, who develops it) plus **anticipated user demand** and **budget / evidence** blocks aligned with PRMS.

### Core (innovation card)

| Field | Meaning |
|-------|---------|
| `short_name` | Short title of the innovation. |
| `characterization` | `{ id, name, definition }` from Clarisa characteristic. |
| `typology` | `{ id, code, name, definition }` — Clarisa innovation type (`id` matches `code`, the table primary key). |
| `innovation_user_to_be_determined` | Boolean: totals TBD vs detailed demand captured. |
| `innovation_developers` / `innovation_collaborators` | Free text fields from PRMS. |
| `innovation_readiness_level` | `{ id, level, name, definition }` — TRL-style scale. |
| `evidences_justification` | Text justification for evidence. |
| `has_scaling_studies` | Boolean flag. |

### `anticipated_user_demand`

Structured demand **without** internal ids:

- **`actors[]`**: actor type name, optional `other_actor_type`, sex/age disaggregation flag, `addressing_demands`; if not disaggregated, boolean flags `has_women`, `has_women_youth`, `has_men`, `has_men_youth`.
- **`organizations[]`**: institution type name, `addressing_demands`, optional `other_institution` for “Other” type.
- **`measures[]`**: `unit_of_measure`, `quantity`, `addressing_demands`.

### Budgets and evidence (shared pattern with Innovation use budgets)

The three budget arrays use the **same row shape** everywhere in bilateral summaries (Innovation development, Innovation use, and IPSR `step_four`): Clarisa-facing ids and amounts only — no PRMS join PKs, audit columns, or role flags on the row.

Since 2026-09-09 (P2-3390) these arrays are **populated for results reported through the centre form too**, not only for ingested ones: the Innovation use and Innovation development full metadata now carries the same three "Investment (USD)" tables W1/W2 has. The shape is unchanged — only the likelihood of a non-empty array is. The amounts are optional and count for nothing in the MDS or the green check.

| Field | Meaning |
|-------|---------|
| `initiative_budget[]` | Each row: `current_year`, `next_year`, `kind_cash`, `is_determined`, **`initiative`** `{ id, official_code, name }` — `id` is the Clarisa initiative id. |
| `bilateral_project_budget[]` | Each row: `in_cash`, `in_kind`, `kind_cash`, `is_determined`, **`project`** `{ id, short_name, full_name }` — `id` is the Clarisa project id. |
| `partner_budget[]` | Each row: `kind_cash`, `in_cash`, `in_kind`, `is_determined`, **`institutions_id`** (Clarisa institution id), **`institution`** `{ id, name, acronym, institution_type_name }` (`id` matches Clarisa). |
| `reference_materials[]` | `{ link }` from evidence type “materials”. |
| `evidence_of_user_need_user_demand[]` | `{ link }` from evidence type user need / demand. |
| `scaling_study_urls[]` | URLs when readiness is high enough to require scaling studies. |

### `innovation_development_summary.innovation_development_questionnaire`

**When:** same as above (`type === "innovation_development"`). Nested **inside** `innovation_development_summary` (not a sibling on `data`). If the core summary is `null` (e.g. inactive dev object), the API still returns an object that contains **only** `innovation_development_questionnaire` so the key remains discoverable.

**Shape:** four arrays (one per thematic block). Each element is **`{ question, question_id, answer, selected_sub_options? }`**. Catalogue **option lines** (radio / checkbox labels) are **not** `question`; the PRMS **sub-question** or **section** prompt is `question`. **`answer`** may use `{ text }`, `{ boolean }`, and/or **`{ selections: string[] }`** (megatrends multi-select: one array element per ticked option). Macro blocks may join several labels in `answer.text` when applicable.

| Field | Meaning |
|-------|---------|
| `responsible_innovation_and_scaling[]` | One row per answered **`q1`–`q4`** block: `question` / `question_id` = level-2 prompt; `answer.text` = label(s) of **selected** options only (`answer_boolean` true / `1`, or free text); optional `selected_sub_options` under those branches. |
| `intellectual_property_rights[]` | Same pattern as responsible innovation (macro `q1`–`q4`). |
| `innovation_team_diversity[]` | One row: parent section prompt + `answer.text` = **selected** row label(s); `selected_sub_options` only under selected rows. |
| `megatrends[]` | At most **one** row: parent megatrends prompt + **`answer.selections`**: string array with **one entry per checked** megatrend (multi-select), not a single joined `text` field. |

**`selected_sub_options`:** nested catalogue rows **selected** for this result (`answer_boolean` true / `1`, or non-empty `answer_text` on sub-rows). Omitted when empty. **Unselected** options (e.g. `false` only) are omitted from the payload.

Portfolio **P25** uses the **V2** question set; otherwise legacy P22. On load failure, all four arrays are **empty** `[]`.

---

## 3. Innovation use — `innovation_use_summary`

**When:** `type === "innovation_use"`.

**Purpose:** Current vs 2030 use sections, **use level** from Clarisa, links to other results, budgets — **without** the Inno Dev–style reference / user-need evidence links (those two arrays are **omitted** here by design).

### Linkage and flags

| Field | Meaning |
|-------|---------|
| `has_innovation_link` | Whether the result is flagged as linked to another innovation. |
| `linked_results[]` | `{ result_id, title, result_type_id, result_type_name }` for linked CGIAR results. |
| `innov_use_to_be_determined` | If `true`, headline counts only; if `false`, detailed `current_section` is populated. |
| `current_core_innovation_use_supported_by_evidence` | When “to be determined” is **true**: `{ male_using, female_using }`. |
| `current_section` | When “to be determined” is **false**: actors, organisations, quantitative measures for **reporting year** (`section_id = 1`). |
| `innovation_use_level` | `{ id, level, name, definition }` — evidence-based use level. |
| `readiness_level_explanation` | Free text. |
| `has_scaling_studies` / `scaling_study_urls` | Same idea as Inno Dev when use level ≥ threshold. |
| `innov_use_2030_to_be_determined` | If **false**, `innovation_use_2030_section` holds 2030 block (`section_id = 2`). |

### `current_section` / `innovation_use_2030_section` (when present)

- **`actors[]`**: if sex/age disaggregated → `how_many`; else `women`, `women_youth`, `men`, `men_youth`, plus type and `addressing_demands`.
- **`organizations[]`**: type name, `how_many`, `graduate_students`, `addressing_demands`, optional `other_institution`.
- **`other_quantitative[]`**: `unit_of_measure`, `quantity`, `addressing_demands`.

### Budgets (same structure as Inno Dev)

`initiative_budget`, `bilateral_project_budget`, `partner_budget` only — **no** `reference_materials` or `evidence_of_user_need_user_demand` on Innovation use bilateral summary.

---

## 4. Capacity sharing for development — `capacity_development_summary`

**When:** `type === "capacity_sharing"`.

**Purpose:** Training / cap dev numbers, delivery mode, training length, and **implementing organisations** (same business rules as the summary service).

| Field | Meaning |
|-------|---------|
| `male_using`, `female_using`, `non_binary_using`, `has_unkown_using` | Participant counts (numbers or null). |
| `is_attending_for_organization` | Whether trainees attended on behalf of an organisation. |
| `delivery_method` | `{ name, description }` resolved from cap dev delivery methods (no raw FK in the payload). |
| `training_length` | `{ name, term, description }` from the cap dev **term** catalogue (length of training). |
| `on_behalf_organizations[]` | `{ id, name, acronym, institution_type_name }` for **implementing** org rows (PRMS role 3); `id` is the Clarisa institution id. |

---

## 5. Policy change — `policy_change_summary`

**When:** `type === "policy_change"`.

**Purpose:** Policy type and stage as **readable Clarisa objects**, financial amount status, links to innovation flags, **“Is this result related to”** selections from the question engine, and implementing organisations.

| Field | Meaning |
|-------|---------|
| `amount` | Policy-related USD amount when applicable (number or null). |
| `amount_status_label` | Human label: `Confirmed`, `Estimated`, or `Unknown` (from internal status code). |
| `policy_type` | `{ id, name, definition }` from Clarisa policy type. |
| `policy_stage` | `{ id, name, definition }` from Clarisa policy stage. |
| `linked_innovation_dev` / `linked_innovation_use` | Booleans: user indicated linkage to those result families. |
| `result_related_to[]` | Each `{ parent_question, option_text }` for options ticked under **“Is this result related to”** (backed by `result_questions` + `result_answers`). Empty array if none. |
| `policy_implementing_organizations[]` | `{ id, name, acronym, institution_type_name }` for **implementing** org rows (PRMS role 4); `id` is the Clarisa institution id. |

**Note:** Internal audit timestamps are **not** included on this summary; use core result fields elsewhere if needed.

---

## 6. Innovation package (IPSR) — `ipsr_pathway_summary`

**When:** `type === "innovation_package"` (PRMS result type id 10 — Innovation Package / IPSR).

**Purpose:** Exposes the **four IPSR pathway steps** in one object for bilateral list consumers. **Steps one–four** use **bilateral-specific** shapes below (steps one–three aligned with PRMS IPSR UI; step four is a slim investments/materials/scaling slice).

| Field | Meaning |
|-------|---------|
| `step_one` | See **Step one shape** below, or `null` if step one could not be loaded. |
| `step_two` | Array of complementary innovations — see **Step two shape**; or `null` if not loaded. |
| `step_three` | See **Step three shape**; or `null` if not loaded. |
| `step_four` | See **Step four shape**; or `null` if not loaded. |

### Step one shape (`ipsr_pathway_summary.step_one`)

| Field | Meaning |
|-------|---------|
| `result_id` | Package result id. |
| `coreResult` | Core innovation row from step-one SQL **plus** `year`: reporting year from the result’s `reported_year_id`. |
| `specify_aspired_outcomes_impact` | Former `eoiOutcomes` list from pathway step one. |
| `target_innovation_use` | Same structure as innovation use bilateral **`current_section`**: `actors[]`, `organizations[]`, `other_quantitative[]` (mapped with the same rules as innovation use). |
| `scalig_ambition` | Scaling ambition object from pathway step one (unchanged key spelling). |
| `result_ip_expert_workshop_organized` | Workshop participants; each item only `result_id`, `first_name`, `last_name`, `email`, `workshop_role`. |

### Step two shape (`ipsr_pathway_summary.step_two`)

Array of complementary innovation rows (same base data as `getStepTwoOne`), with these bilateral adjustments on **each** item:

| Change | Meaning |
|--------|---------|
| `official_code` | Clarisa initiative **official_code** (from the step-two query join, or resolved from `initiative_id` when the join code is missing). **`initiative_id` is not returned.** |
| (removed) | **`result_by_innovation_package_id`** is omitted. |
| `result_type_name` | Human-readable **`result_type.name`** from PRMS. **`result_type_id` is not returned.** |
| Other fields | Unchanged from the pathway response when present (e.g. `result_id`, `result_code`, `title`, `description`, `version_id`, `is_active`, …). |

### Step three shape (`ipsr_pathway_summary.step_three`)

Structured like PRMS **Step 3: Scaling readiness assessment** (not the raw `getStepThree` ORM dump).

| Field | Meaning |
|-------|---------|
| `result_core_innovation` | `{ core_result_code, core_title, core_result_current_phase }` (unchanged from pathway). |
| `result_innovation_package` | `is_expert_workshop_organized` only. Evidence-based readiness/use levels are on **`evidence_based_assessment`** (core + complementary rows), matching how PRMS step 3 saves data — not on the package row. |
| `expert_workshop` | `null` if no expert workshop was organized. Otherwise: `is_expert_workshop_organized`, `what_was_assessed_during_expert_workshop` `{ id, name }` from catalog `assessed_during_expert_workshop`, `assessment_mode` (`none_of_above` \| `current_only` \| `current_and_potential` \| `null`), and `workshop_level_assignments` — see below. |
| `evidence_based_assessment` | `core_innovation` and `complementary_innovations[]`: each row has **Innovation Readiness level evidence-based** and **Innovation use level evidence-based** as Clarisa slim objects, plus **`readinees_evidence_link`**, **`readiness_details_of_evidence`**, **`use_evidence_link`**, **`use_details_of_evidence`** (same concepts as step 3 in PRMS and as innovation use bilateral level blocks). |
| `target_innovation_use` | Current use block: `actors[]`, `organizations[]`, `other_quantitative[]` (same mappers as innovation use bilateral / step one `target_innovation_use`). |

**Expert workshop `workshop_level_assignments`:** `null` when `assessment_mode` is `none_of_above`, unknown, or not organized (equivalent to hiding the readiness/use table in PRMS for “None of the above”). When `current_only` (id **1** in catalog): `core_innovation` and `complementary_innovations[]` each include **`current`** only — `innovation_readiness_level` and `innovation_use_level` as Clarisa slim objects (workshop self-assessed **current** levels). When `current_and_potential` (id **2**): each row also includes **`potential`** with the same two Clarisa slim fields (12‑month potential levels).

### Step four shape (`ipsr_pathway_summary.step_four`)

Only these keys appear, in this order (same data sources as `getStepFour`, without pictures, PDF, unit times, publish flags, etc.):

| Field | Meaning |
|-------|---------|
| `initiative_budget` | Initiative budget lines from step 4, **same row shape** as Innovation development / Innovation use `initiative_budget[]` (see §2 budgets table). |
| `bilateral_project_budget` | Bilateral / Clarisa project budget lines — same shape as Inno Dev / Inno Use `bilateral_project_budget[]`. |
| `partner_budget` | Partner institution budget lines — same shape as Inno Dev / Inno Use `partner_budget[]`. |
| `ipsr_materials` | Evidence rows with type **materials** (source `evidence_type_id` 4 in PRMS); each item omits audit/typing flags (`creation_date`, `last_updated_date`, `description`, cross-cutting booleans, `is_supplementary`, `is_sharepoint`, `evidence_type_id`, etc.). |
| `has_scaling_studies` | Boolean from the innovation package record. |
| `scaling_studies_urls` | URLs linked to scaling studies for the package. |

**Note:** Steps one–four are tailored for bilateral consumers.

---

## Types without a dedicated summary in this flow

Other bilateral-supported types (e.g. other output / other outcome) may **not** add a `*_summary` object; they still receive the **shared** enrichment on `data`.

---

## `data.result_code` on `POST /create` — continuing an existing result

Send `data.result_code` — either a string of digits (`"28565"`) or a JSON integer (`28565`), both accepted — on `POST /create` to continue a result that already exists in PRMS instead of always creating a new one. Omit it and `create` behaves exactly as it always has.

### The three operations

| `result_code` says… | Operation | Status today |
|---|---|---|
| absent | `created` | Ships — unchanged behaviour |
| matches a result **Approved** in an earlier phase, with no row for it in the open phase | `versioned` | **Ships.** A brand-new row is created in the open phase from this payload, then stamped with the source's code. |
| matches a result that already has a row in the **open phase**, and that row is **Rejected** | `updated` | **Ships** (resubmission). Replaces the data on the same record and returns it to review. See "Resubmitting a rejected result" below. Any other status in the open phase is `409`. |

A `versioned` result is **not** a copy of the earlier-phase row — it is a fresh result built entirely from this payload, which then inherits the old `result_code`. See "What a version does not carry" below.

### Rejections

A `result_code` is checked against two different candidate rows depending on where it is found, and each candidate is checked on its own branch — a condition flagged **(version path)** below is checked only when the code has **no** row in the open phase; one flagged **(update path)** is checked only when it **does**. Nothing is written for the result once one of these fires:

| Status | When | Message |
|---|---|---|
| `409` | No reporting phase is currently open. Checked first, before any code lookup, whenever `result_code` is present. | `There is no open reporting phase, so no result can be carried forward right now.` |
| `404` | No active result anywhere carries this code. | `No active result found for result_code {code}.` |
| `403` | The result was reported by a different platform than the caller (checked on both paths — this is the same ownership rule `POST /version` enforces). | `Result {code} was reported by a different platform. Only the platform that reported a result can carry it forward.` |
| `403` | The API key did not resolve to any platform. | `The calling platform could not be identified from the API key.` |
| `403` | The result has no originating platform recorded, and the caller's platform has no centre scope configured to claim it. | `Result {code} has no originating platform, and {platform} has no centre scope configured to claim it.` |
| `409` | The code belongs to a **Knowledge Product** — checked on both paths. | `Result {code} is a Knowledge Product. Knowledge Products cannot be carried into a new phase; report the new knowledge product with its own CGSpace handle instead.` |
| `409` | **(version path)** Rows for this code are looked at most-recent-phase-first, and the first one found outside the open phase is not **Approved**. An Approved row sitting in an *older* phase does not help if a more recent, non-open phase holds a later, non-Approved row for the same code. | `Result {code} is not approved (status_id {n}). Only an approved result from a previous phase can be carried forward.` |
| `409` | **(update path)** The open-phase row's status is not Rejected. The full resubmission rules and errors are in "Resubmitting a rejected result" below. | `Result {code} cannot be resubmitted: its status is {status name}. Only rejected results can be resubmitted.` |
| `400` | **(version path only — this check does not run on the update path)** The most-recent non-open-phase row for this code is not a W3/Bilateral result (e.g. a pool-funded result). | `Result {code} is not a W3/Bilateral result, so it cannot be carried forward through this flow.` |

**Per-result write guarantee (amended 2026-09-30):** a rejected result never writes its own row. The guarantee is **per result** — in a request carrying several results, results processed before the rejected one stay written. But the request as a whole still fails on the first rejection: later results in the same request are never attempted, and — see below — the response for a failed request carries no `outcomes[]` at all, so a producer cannot read back the codes of the earlier, already-written results from that response.

### `response.outcomes[]`

`outcomes[]` is present **only on a successful response** — a request that rejects any one of its results returns the error envelope for that rejection instead, with no `outcomes[]` on it. On success, the array carries one row per result in the request:

| Field | Meaning |
|---|---|
| `result_code` | The result's code (numeric). |
| `operation` | `created`, `versioned`, or `updated` (a resubmission of a Rejected result, see below). |
| `status_id` / `status` | The resulting workflow status. |
| `external_reference` | Echoed from the request when the producer sent one. |

**Why `outcomes`, not `results`:** the Fetcher's ingestion client (`external-api.mjs:139-157`) special-cases a `response` that is itself an array, or that carries `response.results[]`, when counting what it sent. Naming this array `outcomes` keeps that counting logic from misreading it. Nothing already on `response` was removed or renamed.

### What a `versioned` result does not carry

A version-with-data result is created **only** from this payload — it is not a copy of the earlier-phase row plus edits. Two different things happen to what the earlier phase held and this payload does not repeat:

- **Can be resent, and will be carried if you send them:** contributing-program share requests (from `contributing_programs`) and the lead/contributing budget rows (`initiative_budget`, `bilateral_project_budget`, `partner_budget`).
- **Cannot be sent through `create` at all, for any result type, old or new:** links to other results (e.g. Innovation Use `linked_results` — the ingestion handler always writes an empty list here, regardless of payload). If the new version needs those links, add them afterwards in the reporting tool.

Only the `result_code` itself is inherited automatically; everything else must be in the payload or added later in PRMS.

### Known limitations

- Two concurrent `create` requests versioning the same code can both pass the "no row in the open phase yet" check before either one writes — the same race `POST /version` already has. A producer that cannot tolerate a duplicate open-phase row should serialize retries of the same code.
- If a request fails partway through, **after** the open-phase row has been created but before the request completes, that row is left in place. Retrying with the same `result_code` then resolves to that open-phase row. Unless the row is Rejected, it gets the status `409` of "Resubmitting a rejected result"; it does not create a duplicate, and it does not retry the version.

---

## Resubmitting a rejected result

**Answer first.** Send the same `POST /create` with `data.result_code` set to the code of a result that a Science Program **rejected**. PRMS replaces the result's data **on the same record** (same `id`, same `result_code`) and returns it to review. The outcome row says `operation: "updated"`. A result in any other status is refused with `409` and nothing changes.

### Quick path

1. Resend the corrected `create` body with `data.result_code` of the rejected result. The result must be in the open phase and reported by your platform.
2. Read `response.outcomes[]`: your row has `operation: "updated"`, `status_id: 5`, `status: "pending review"`.
3. On a `5xx` or a timeout, read "Retrying safely" below before you resend.

### What happens by status

The open-phase row for the code decides. In the message, the status name is lower case, with spaces instead of hyphens.

| Status of the result | Outcome |
|---|---|
| **Rejected** (7) | Resubmitted. Ends in **Pending Review** (5), whatever `keep_editing` says. |
| Editing (1), Quality assessed (2), Submitted (3), Discontinued (4), Pending review (5), Approved (6), Draft (8) | `409` naming the code and the status. Nothing is written. |

Other rules, all checked before anything is written:

- **Same platform.** A result reported by another platform is refused (`403`, see the Rejections table above).
- **Not a Knowledge Product.** Refused with the `409` of the Rejections table above.
- **Same type.** `result_type_id` in the payload must equal the stored type (`409`, below). A different type means a new result.
- **Open phase only.** A Rejected result whose only row is in an earlier phase is not an update target. It follows the `versioned` path and gets that path's `409` ("is not approved").
- **`keep_editing` is ignored.** A resubmission always ends in Pending Review.
- **A title equal to the result's own title is accepted.** A title equal to **another** result's title in the phase is still refused.

### Errors specific to a resubmission

Every other refusal reuses the Rejections table above (`404` code not found, `403` platform, `409` Knowledge Product, `409` no open phase) and the payload messages of a regular `create` (geography, evidence, Science Program codes, projects, type-specific blocks). Every `4xx` below is raised **before the first write** to the result: the stored result stays as it was.

| Status | When | Message |
|---|---|---|
| `409` | The result is not Rejected. | `Result {code} cannot be resubmitted: its status is {status name}. Only rejected results can be resubmitted.` |
| `409` | The payload's type differs from the stored type. | `Result {code} is a {stored type}; the payload is a {payload type}.` Type names are lower case with spaces, for example `policy change`, `other output`. |
| `400` | No primary Science Program: `toc_mapping.science_program_id` is missing or blank. | `Result {code} cannot be resubmitted without a primary Science Program (toc_mapping.science_program_id).` |
| `400` | The payload names no lead project: no project, or several with none flagged `is_lead`. A single project is the lead without the flag. | `Result {code} cannot be resubmitted without a lead bilateral project (one project, or one flagged is_lead).` |
| `400` | The primary Science Program is not allocated to the payload's lead project, or CLARISA does not know it. | `{SP code} is not allocated to the lead project of result {code}.` |
| `409` | Another resubmission of the same result holds the lock. | `Result {code} is already being resubmitted.` |
| `409` | The result left Rejected between the check and the final write. | `Result {code} cannot be resubmitted: its status changed while the resubmission was being processed.` |
| `404` | The result disappeared between the check and the lock. | `Result {code} was not found.` |
| `503` | The lock could not be taken because of a fault (not a concurrent attempt). | `Result {code} could not be locked for resubmission. Retry the request.` |
| `503` | The primary request step failed with an internal error. | `Result {code} could not be resubmitted: the primary Science Program request failed. The result stays rejected; resend the same request to retry.` |
| `500` | The primary request step answered `not_aligned` after the preflight had passed (the allocation changed underneath the request). | The same message as the `503` row above. |

The allocation rule is the one the Reporting Tool applies: the Science Program needs a confirmed mapping with allocation above zero on the lead project. A Science Program that exists only in CLARISA is refused.

### Retrying safely

The data writes are not one database transaction. The **status flips last**, in one transaction with the history entry (and with the primary request, when there is one). A failure therefore leaves the result in a known state.

| What you see | What it means | What to do |
|---|---|---|
| `400`, `403`, `404`, or `409` (not Rejected, type, Knowledge Product) | Refused before any write. | Fix the payload or the target. Do not resend unchanged. |
| `5xx`, or a timeout, and no later `409` | Failed before the commit. The result is still **Rejected**, may hold partial data, and is **retryable**. | **Resend the same request.** The reset cleans up the partial data and the writers rewrite it. |
| `409` with `its status is pending review`, after a timeout | Your earlier attempt **committed**. | **Do not resend.** The resubmission is done. Any other status in the message means someone moved the result afterwards. |
| `409` with `is already being resubmitted` | A concurrent attempt holds the lock. | Wait, then send again. If that attempt succeeded you get the `pending review` `409`. If it failed, the resend goes through. |
| `503` (lock or primary request) | A transient fault. The result stays Rejected. | Resend after a short wait. |
| `500` with `the primary Science Program request failed` | The allocation moved under the request. The result stays Rejected. | Check the allocation of the lead project, then resend. |

**The outcome row is authoritative.** After the commit, the usual result body is read back from the database. If that read fails, the request still returns `201` with a valid `outcomes[]`, and `response` can be `{}`. Do not treat an empty `response` as a failure and do not resend.

**Two status spellings exist, as they do today.** `updated` rows carry `status: "pending review"` (with a space). `created` and `versioned` rows carry `status: "pending-review"` (with a hyphen). Match on `status_id` (`5`) when you need a stable value.

### What a resubmission replaces

The payload is the new truth. A section you send replaces the previous one. A section you leave out is **not kept**.

| Part of the result | When sent | When omitted |
|---|---|---|
| `title`, `result_level_id` | Replaced. | Not specified here. |
| `description` | Replaced. | **Cleared** (`NULL`). |
| `submitted_by.submitted_date`, `submitted_by.comment` | Replaced. | **Cleared** (`NULL`). |
| `external_reference` | Replaced. | Not specified here. |
| `lead_contact_person` | Resolved as in a regular create. | **Stored value kept.** The columns are not sent. |
| Evidence, contributing bilateral projects with their budgets, non-lead contributing centres, Theory of Change mapping with its indicators and targets, subnational areas | Previous rows deactivated, then the payload's rows written. | Previous rows stay deactivated: **none remains active**. |
| Contributing partners | Replaced by the partners that resolve in CLARISA (`{A, B}` then `{C}` leaves exactly `{C}`). | **None remain active.** The same holds when you send partners but none resolves. |
| Innovation Use actors, organisation types and measures (Innovation Use only) | Previous rows deactivated, then rewritten. | **None remain active.** |
| Lead centre | The previous lead is demoted and the payload's lead is written. | The stored lead row is not reset. |
| Lead program investment (`toc_mapping.usd_budget`, Innovation types) | Written on the lead program's row. | Innovation Use: recorded as **to be determined**. |
| Contributing programs (`contributing_programs`) | Written as draft contribution requests (`request_status_id = 4`), exactly as `create` does. | Earlier draft, pending and declined requests are deactivated. Accepted contributors are not removed. |

Never changed by a resubmission: the result's `id`, `result_code`, `created_by`, creation date, phase, `source`, `creation_method`, result type, and the review history. Earlier history entries are never edited or deleted.

### Primary and contributing Science Programs

The primary named in `toc_mapping.science_program_id` is the one that persists, **once it accepts**. It never becomes owner without accepting.

| Payload's primary | What PRMS does |
|---|---|
| **The current owner** | It stays owner. The result goes straight back into **its** queue, and the "result submitted" announcement is sent once, after the commit. |
| **A different allocated Science Program**, or the result has **no owner** (for example after an ownerless decline) | The result goes to Pending Review **with no owner**. The old owner's role and its accepted primary request are retired. A primary request is **sent** (pending) to the payload's Science Program. Nobody is announced yet. |

For the second row:

- The result is **hidden from review queues** until the requested Science Program accepts. Approve and reject decisions are refused with `This result is awaiting the primary Science Program's acceptance.`
- **Accept:** that Science Program becomes owner, the result enters its queue, and the lead program investment you sent becomes visible (it was kept on an inactive row of that Science Program until then).
- **Decline:** the result is **Rejected again**, the decline is recorded in the history with that Science Program, and you can resubmit it once more.
- The request, the status change and the history entry commit together. If the request fails, the result stays Rejected (`503` or `500` above).

Contributing programs are written as draft contribution requests owned by the requested primary. The existing flow releases them (primary accept or Science Program approval), as for any API-created result.

### History

A successful resubmission adds one `RESUBMIT` entry to the result's review history. Its Science Program is the **requested primary** and its user is the external submitter. The earlier rejection stays, so three cycles read `REJECT`, `RESUBMIT`, `REJECT`, `RESUBMIT`, `REJECT`, `RESUBMIT` in order.

### Known limitations of a resubmission

- A fault in the middle of the data writes (not a validation) leaves the result **Rejected with partial data**. It is retryable, but anyone who opens it in PRMS before the retry sees that partial data.

---

## Change log (maintainers)

| Date (approx.) | Change |
|----------------|--------|
| 2026-10-06 | **`POST /create` resubmits a Rejected result when `data.result_code` matches a Rejected open-phase result (spec `bilateral/resubmit-rejected-result`, RSB-T-2..T-6, PR 2 of 2; supersedes the placeholder `409` of 2026-09-30).** The data is replaced **on the same record** (same `id` and `result_code`) and the result returns to Pending Review, whatever `keep_editing` says. `response.outcomes[]` gains `operation: "updated"` with `status_id: 5` and `status: "pending review"` (with a space; `created` and `versioned` rows keep `"pending-review"` with a hyphen). **Only Rejected is accepted:** Editing, Quality assessed, Submitted, Discontinued, Pending review, Approved and Draft get `409 "Result {code} cannot be resubmitted: its status is {status name}. Only rejected results can be resubmitted."` (this narrows the editable statuses of the 2026-09-30 row to Rejected only). **New refusals, all before the first write:** `409` type differs from the stored type; `400` no primary Science Program (`toc_mapping.science_program_id`); `400` no lead bilateral project in the payload (one project, or one flagged `is_lead`); `400` primary not allocated to the payload's lead project; `409` already being resubmitted; `409` status changed during processing; `503` lock fault or primary-request internal error; `500` primary request answered `not_aligned`. **Replace semantics:** a section the payload sends replaces the previous one, and a section it omits is not kept (a missing `description`, `submitted_by.submitted_date` or `submitted_by.comment` is cleared; a missing `lead_contact_person` keeps the stored value). **Primary:** the current owner stays owner and the result returns to its queue; a different allocated Science Program (or no owner) receives a pending primary request and the result is Pending Review with no owner, hidden from queues until that Science Program accepts; a decline rejects it again and it can be resubmitted. **Retry:** a `5xx` or timeout before the commit leaves the result Rejected and retryable (resend); a `409` "status is pending review" after a timeout means the earlier attempt committed (do not resend); the outcome row is authoritative and `response` can be `{}` if the read-back fails after the commit. Review history gains a `RESUBMIT` entry with the requested primary. Additive: no field removed or renamed; the no-code `create` and `versioned` paths are unchanged. See "Resubmitting a rejected result" above. |
| 2026-10-06 | **`bilateral_projects[]` items now carry `external_code`** (spec `docs/specs/bugfix/bilateral-project-codes/`, ticket #INC-164536). Each item is `{ short_name, organization_code, external_code }`; `organization_code` remains the owning institution acronym. `external_code` is the linked CLARISA project external code and is `null` when the project has none. Additive; `short_name` and `organization_code` are unchanged; applies to every phase. |
| 2026-10-01 | **`data.result_code` on `POST /create` accepts a JSON integer as well as a string of digits** (spec `changes/bilateral-create-upsert-by-code`, UBC-R-11). `28565` and `"28565"` (surrounding whitespace trimmed) are normalised to the same code before resolution, so a producer is not rejected for sending the code as a number. A decimal, a negative, a boolean, an object or a non-digit string still fails validation with `400`. Input-only and additive; nothing else changes. |
| 2026-09-30 | **`PATCH /api/bilateral/center/primary-assignment/:resultId` response: `tocCleared` (boolean) replaced by `primary_request` (object) — `PSR-T-5`, spec `notifications/bilateral-primary-sp-request`, DD-2/DD-4.** The chosen primary Science Program is no longer written as the result's owner (role 1) by this endpoint, or by `POST /center/create-header` / `POST /center/ai/drafts/:id/promote` — all three now send that SP a pending **primary request** instead (`share_result_request`, `request_type='primary'`); role 1 is written only when that SP accepts (a later task). On a result that already has an owner (swap), the current owner is left untouched here and stays the primary SP until the new SP accepts. Response shape: `primary_request: { state: 'none' \| 'pending' \| 'sent_back' \| 'accepted', program_code: string \| null, declined_by_codes: string[] }` — `state` combines the request lifecycle with a pre-existing (legacy) role-1 owner, so a result owned before this feature shipped still reports `accepted`, never `none`. A primary Science Program not aligned to the selected project still gets **400** with the same message as before. `POST /center/create-header` and `POST /center/ai/drafts/:id/promote` response shapes are **unchanged** — neither ever returned a primary-ownership field, so there is nothing to replace on those two; a failed primary request there is logged and swallowed, and result creation still succeeds (ownerless, retryable). |
| 2026-09-30 | **`POST /create` accepts optional `data.result_code` to continue an existing result instead of always creating a new one (UBC-T-1/T-2, spec `changes/bilateral-create-upsert-by-code`, PR 1 of 2).** Resolution runs before any user, contact or header write: a row for the code **in the open phase** makes it an **update** candidate; otherwise, the most recent row for the code outside the open phase (if any) makes it a **version** candidate. Rejections differ by candidate — see the new "`data.result_code` on `POST /create`" section above for the full `400`/`403`/`404`/`409` table, including which checks run only on one path (the non-Bilateral-result 400, for one, is never reached on the update path). Nothing is written for a rejected result. **Live in this PR:** `versioned` — an eligible earlier-phase code runs the normal create path in the open phase and is stamped with the source's code right after the header insert; the earlier-phase row is never touched; status follows `keep_editing`; links to other results (e.g. Innovation Use `linked_results`) are not carried and cannot be sent through `create` at all. **Superseded 2026-10-06:** an eligible **update** target (code already in the open phase) was rejected with a placeholder `409` in this PR; the 2026-10-06 row below replaces it with the resubmission of Rejected results. **Additive — `response.outcomes[]`**, present only on a successful response, one row per result in the request: `{ result_code, operation, status_id, status, external_reference }`, named `outcomes` (not `results`) so the Fetcher's own response-counting logic (`external-api.mjs:139-157`) is unaffected. A request that rejects any one result fails as a whole and carries no `outcomes[]`; the no-write guarantee on the rejected result itself is **per result** (earlier results in the same request stay written), but their codes are not reported back in that failed response. Ownership (`assertCallerMayVersion`) is now a single shared rule used by both `POST /version` and this resolution step; its behaviour and existing specs are unchanged. |
| 2026-09-29 | **New endpoint — `GET /api/bilateral/center/ai/jobs` (list), and `GET .../jobs/:jobId` gains `jobs_ahead`/`wait_reason`, with `queue_position` redefined (`AIQ-T-4`, spec `bilateral/ai-processing-queue`, `AIQ-D-15`).** **List:** the caller's active AI jobs (`PENDING`/`PROCESSING`) plus jobs finished in the last 24 h (max 10, newest first), scoped to `user_id = caller` — never another user's job. Each item: `job_id`, `status`, `stage`, `stage_updated_date`, `project_id`, `project_name` (joined from `clarisa_projects`), `program_code`, `center_id`, `center_acronym` (joined from `clarisa_institutions`), `document_count`, `audio_count`, `has_text`, `queue_entry_date`, `started_date`, `completed_date`, `result_count`, `error_code`, `attempts`, `max_attempts`, `retrying`, `jobs_ahead` and `wait_reason` (`PENDING` only, else `null`). Deliberately excluded from every item: `bucket_name`, `document_keys`, `audio_keys`, `text_context`, `response_snapshot`, `error_message`, `user_id`. Also carries a `summary`: `lanes_total` (global concurrency cap), `lanes_busy` (count of jobs `PROCESSING` across all users), `others_waiting` (count of `PENDING` jobs owned by users other than the caller). **`GET jobs/:jobId`, additive:** `jobs_ahead` (count of `PENDING` jobs — only `PENDING`, never `PROCESSING` — whose queue-entry clock is older than this job's) and `wait_reason` (`own_job_running` when the caller is already at the per-user concurrency cap, `no_free_lane` when the global cap is full, else `starting`), both `PENDING`-only, `null` otherwise. **`queue_position` is redefined** (kept, unchanged key) to equal `jobs_ahead` — it previously also counted older `PROCESSING` rows, which are never "ahead" in the two-lane dispatch model, so a `PENDING` job whose count used to include running jobs may now report a lower `queue_position` than before. One shared server-side computation feeds both the list and the single-job read, so they cannot disagree. The 24 h list cutoff is computed in SQL (`DATE_SUB(NOW(), INTERVAL 24 HOUR)`), never in Node, per the existing mysql2 timezone-skew rule for this table. |
| 2026-09-28 | **Additive — `toc_mappings[].indicators[]` on the webhook, `POST /create` response, and `GET` detail; new optional input `toc_mapping.target_contribution` (`BTC-T-1`/`BTC-T-2`, spec `bilateral/toc-indicator-target-contribution`).** Each ToC mapping now carries `indicators[]`, one element per active indicator × active target row of that mapping: `toc_results_indicator_id`, `indicator_description`, `indicator_type`, `number_target`, `target_date`, `target_contribution` (each absent as `null`; no active indicator on the mapping → `indicators: []`). Built by a correlated sub-select, so `toc_mappings[]` row count and its existing keys are untouched; `indicators[]` element order is not guaranteed (the aggregation has no `ORDER BY`). On the push, `toc_mapping.target_contribution` is optional, non-negative, at most 2 decimals: when the ToC match resolves an indicator with a target it is stored as that target's `contributing_indicator` (**default `1`**, unchanged, when the field is absent); when sent but the match has no indicator or the matched indicator has no target, the value is dropped — logged as a warning (result id only, never the payload) — without failing the push. A value that fails validation (negative, non-numeric, or more than 2 decimals) now gets **400**, where it was previously silently stripped by the whitelist. `contributing_programs[]` is unaffected — it never resolves a ToC indicator. **Fetcher note:** its `toc_mapping` schema already declares `target_contribution` as `integer`, so a producer sending through the Fetcher can only ever deliver a whole number here; sending directly to `POST /create` allows up to 2 decimals. |
| 2026-09-24 | **P2-3819 — Innovation Use budgets are optional on bilateral create, update, and submit.** Lead-program, bilateral-project, and partner amounts omitted or sent as zero are persisted as null with `is_determined: true`; positive values are retained. The MDS still requires at least one identified bilateral project, but no longer blocks submission for a missing project budget. This applies only to the bilateral API's Innovation Use flow; other result types and Reporting budget endpoints retain their existing behavior. |
| 2026-09-23 | **`POST /api/bilateral/version` now leaves the new version in Editing (`status_id = 1`).** The shared replication path already creates it in Editing; the API-specific update to Draft (`8`) was removed. The centre user completes the version and explicitly selects Submit for Review. The response reports Editing, matching the persisted row and the reporting tool path. |
| 2026-09-23 | **Additive review-decision webhook field:** `reviewed_by` identifies the deciding PRMS user by id, name, and email. The webhook still carries the complete enriched result in `data`, including its version object and reporting year. |
| 2026-09-23 | **Access rules on the bilateral review-time write surface (P2-3794, spec `bilateral/review-toc-only-editing`).** No `/api/bilateral/*` **read** payload shape changed — this row exists because it changes who can call these write endpoints and when. **(a) Center-write endpoints — seven in total: `PATCH api/results/bilateral/:id/title`, `/api/results/bilateral/general-info/:id`, `/api/bilateral/center/planned-result/:id`, `/center/toc-mapping/:id`, `/center/contributors/:id`, and both geography entries (`v1 update/geographic/:id`, `v2 update/geographic/:id`, bilateral results only).** A non-admin now gets **403** while the result is at status 5 (Pending Review) on each of these seven; previously only title/general-info were gated, and inverted — a **regression fix**: a non-admin Center user at status **1 (Editing) or 8 (Draft) now gets 2xx** on title/general-info, where it previously and incorrectly returned **409** ("Current status is not PENDING_REVIEW"). `center/planned-result`, `center/toc-mapping` and **`center/contributors`** now all return **404** ("Bilateral result not found") for an inactive or non-bilateral (W1/W2) result id — `contributors` previously matched on `source` alone and let an inactive-but-bilateral result through. Admins are unaffected at every status. **(b) ToC and Decision endpoints — `PATCH …/bilateral/review-update/toc-metadata/:id` and `PATCH …/bilateral/:id/review-decision` (`BIL-RTE-T-3`).** `toc-metadata`: a non-member of the payload's Science Program now gets **403** (previously any authenticated user could write); a non-admin item that names another program's `initiative_id`, points `result_toc_result_id` at a row owned by a different program, or points `results_id` at a different result now also gets **403** before any write. The existing 409 for a non-admin at a status other than 5 is unchanged. `review-decision`: a non-member now gets **403**. Previously a non-member could **approve or reject a status-5 result** (200, and the status actually changed) — only a failed status or justification check stopped them; membership is now checked first, and those existing checks are otherwise unchanged (reject still needs `justification`). |
| 2026-09-23 | **Innovation Use — current-use rows written by the centre form are now included (night sweep BIL-2).** The centre/W3 form stores current-use actors, organizations and measures with `section_id = NULL` (only the 2030 projection is stamped `2`), while `POST /create` writes `1`. `innovation_use_summary.current_section` and the PRMS bilateral detail (`GET /api/results/bilateral/:id` → `resultTypeResponse[0]`) used to read `section_id = 1` only, so form-added rows were missing. Both now read `NULL` or `1` as current use; `2` stays 2030-only. No shape change. |
| 2026-09-22 | **`POST /create` and the centre form derive owner Centers as contributing Centers (P2-3793, US P2-3792).** After the contributing bilateral projects are persisted, the owning Center of each active non-lead project (`organization_code` → CLARISA Center, else the W3 acronym alias) is stored as a contributing Center of the result, unless it is the reporting (lead) Center. The centre form's `PATCH /center/contributors/:resultId` does the same on every save that carries `contributing_bilateral_projects`. The derivation only adds or reactivates rows; it never deactivates one and never touches the lead row, and a failure in it never fails the save or the ingest. **No field added, removed or renamed** — `contributing_center` lists on reads may simply be longer. Spec: `docs/specs/notifications/bilateral-contributor-tagging/`. |
| 2026-09-21 | **`POST /create` — Innovation Use no longer requires the use LEVEL (P2-3785 AC1).** The MDS gate for `innovation_use` drops from four standards to three: Actors, quantitative measures and W3/bilateral-project investment. A payload whose `innovation_use.innovation_use_level` is absent or null is now **accepted** where it used to be refused with *"Innovation Use cannot be submitted until its minimum data standards are complete: Innovation Use level: select a level."* **Relaxation, not a shape change** — the field is still read, still stored and still returned; only the refusal is gone, so no producer has to change what it sends and none can start failing because of this. The same gate answers the centre form's `submit-for-review`, so results already stored without a level become submittable; nothing stored becomes invalid, because this validator only ever refused, it never wrote. Requested by Nicoleta Trifa after a round of manual W3/bilateral testing (Freshservice `#INC-163204`, point 4a: *"the use levels are not part of the MDS – pls remove"*), which reverses the rule P2-3428 introduced on 10-Sep-2026. |
| 2026-09-24 | **Innovation Use quantitative measures are optional in bilateral MDS.** `measures` may be omitted or empty on external create and when submitting a saved result for review. The centre form and MDS tracker show the field as optional; when current use is known (`innov_use_to_be_determined = false`), a non-empty measures list must contain at least one row with both unit and quantity. Measures do not block the gate while current use is marked yet to be determined. Actors (or the explicit yet-to-be-determined answer) and at least one identified bilateral project remain required. |
| 2026-09-21 | **Additive — the PRMS review list `GET /api/results/by-program-and-centers` gains `creation_method`, `external_platform_code` and `reporter_name`; `POST /create` now stamps `creation_method = 'EXTERNAL'` on ingestion (spec `bilateral/review-list-source-and-reporter`, `BSR-T-1/T-2`).** **No `/api/bilateral/*` output shape changed** — `GET /list`, the type summaries and every field documented above are untouched; this entry exists because `AC-4` requires any change to what a bilateral result exposes to be logged here. **(a) Three new keys on each review-list row**, all read from the same `result` row the list already returns: `creation_method` (`'MANUAL' \| 'AI' \| 'EXTERNAL' \| 'BULK' \| 'UNKNOWN'`, the enum migration `1784921547596` introduced), `external_platform_code` (the CLARISA MIS acronym the ingestion API key resolved to — `STAR`, `W3RU`, `FETCHER`, … — or `null`), and `reporter_name` — the **display name only** (`first_name last_name` of `external_submitter`, falling back to `created_by`; never the email or user id). The two `users` lookups are `LEFT JOIN`s under the query's existing `GROUP BY r.id`, verified on the TEST database over eight `(program, phase)` pairs: identical row counts with and without the joins, at both the aggregated and pre-aggregation level. The Science Program review tab derives the *Source* label client-side (`UNKNOWN` + a platform code still reads `Via API · <code>`; `UNKNOWN` alone is a placeholder). **(b) Stamped at both header-creation sites of the external ingestion, not one:** the default header save inside `BilateralService.initializeResultHeader` (`bilateral.service.ts`) and the knowledge-product handler's own `initializeResultHeader` (`handlers/knowledge-product.handler.ts`), which builds and saves its own header and is returned before the default save ever runs — without its own stamp, API-ingested Knowledge Products would keep falling through to the column's `UNKNOWN` default. **The other creation paths are untouched** (`BSR-R-3`): the AI-draft promotion (`bilateral-ai.service.ts`) still writes `AI` and the centre manual create still writes `MANUAL`, so an AI-promoted result keeps its AI badge in the review list rather than reading `Via API`. Rows ingested before this change keep `UNKNOWN` — **no backfill** (`BSR-DD-5`); consumers must keep treating `external_platform_code` as the provenance signal for those. Producers send nothing new; `CreateBilateralDto` is unchanged. |
| 2026-09-21 | **`POST /create` — contributing-project matching is scoped to the reporting phase, and the lead program and contributing partners now persist their USD investment.** Input-side only; **no output shape changes.** **(a) `contributing_bilateral_projects[].grant_title`.** The lookup matched `short_name`/`full_name` across all of `clarisa_projects`, which holds two generations of rows: pre-registry ones that migration `1786980549228` stamped `phase = 2025` wholesale and which store the code and title **concatenated** (`T-PJ-003772-TAAT Clearinghouse: …`) in BOTH name columns, and the W3 Registry catalogue carrying the current phase. A producer sending that concatenated string matched the stale row, so the result and its `non_pooled_projetct_budget` bound to a project `BilateralProjectsService` filters out of every catalogue by phase — stored correctly, invisible everywhere, and indistinguishable from "nothing was saved". Resolution is now scoped to the active reporting year and ordered `external_code` → `short_name` → `full_name`, with multi-row ties broken on the lowest id. **Producers should send the registry code, not the full title.** A `grant_title` that resolves to no project of the phase is now **rejected with 400** instead of silently skipped; the rejection is raised from a new pre-transaction preflight, because `dataSource.transaction` in `create` does not enrol these repositories (its manager parameter is unused) and a late throw left an orphan result. `hasProgramMapping` is deliberately **not** enforced here, unlike the read path: until both registry syncs re-run, registry-fed projects sit at `Pending`, and enforcing it would reject every ingest rather than hide a picker entry. **(b) New optional inputs `toc_mapping.usd_budget` and `toc_mapping.is_determined`** — the lead Science Program had no investment field at all. Written to `result_initiative_budget` against the role-1 `results_by_inititiative` row, updated in place rather than duplicated. **(c) `contributing_partners[].usd_budget` / `is_determined` are now persisted.** They were accepted by the DTO and dropped: `handleInstitutions` wrote its `result_institutions_budget` row with identifiers only and never read the amount. (b) and (c) are gated to Innovation Development / Innovation Use, follow the `is_determined: true` ⇒ null-amount rule the project block already used, and write **no row at all** when the payload states no investment, so a silent payload does not seed empty lines in the form. 🛑 **Contributing programs remain unwired on purpose.** They persist as `share_result_request` drafts and never as `results_by_inititiative` rows, so `result_initiative_budget.result_initiative_id` has nothing to point at until the contributing program accepts; creating that anchor would mean a role-2 row, which means "already accepted" and is deactivated by the approval flow when no request backs it. Where that amount lives before acceptance is a product decision. ⚠️ **Fetcher note for producers:** its `toc_mapping` schema declares `additionalProperties: false` and AJV runs with `removeAdditional: true`, so until `usd_budget`/`is_determined` are declared there, the Fetcher **silently strips them** and this endpoint never sees them. Sending directly to `POST /create` is unaffected. |
| 2026-09-18 | **Additive internal editor contract — `GET /api/bilateral/center/toc-state/:resultId` and `PATCH /api/bilateral/center/toc-mapping/:resultId` (`BIL-TOC-T-3`, `BIL-TOC-T-4`).** `getTocState` returns `toc_linkage_mode` (`'project_default'` \| `'custom'` \| `null`) and `project_default` (`{ project_id, project_name, nodes: [{ toc_result_id, category, title, toc_level_id, level_name, related_node_id, indicators: [{ id, description, type, targets: [{ year, value }] }] }] }`) dynamically derived from `Integration_information.toc_result_projects` for the lead project under the primary Science Program and phase; `saveTocMapping` accepts optional request-only intent flag `toc_linkage_mode`. In YES mode (`project_default`), default nodes are re-derived server-side and materialized with no indicator rows, while existing custom rows are softly deactivated; in custom/NO mode, candidate nodes are checked against `getTocResultTypologyVerdicts` and rejected with 400 on typology mismatch. Public bilateral result list payload shape (`GET /api/bilateral/results`) is unchanged. |
| 2026-09-15 | **`GET /api/bilateral/center/ai/jobs/:jobId` gains `retried_date` and `queue_entry_date` (additive), and two new endpoints ship alongside it — `APF-T-4`.** Combined with the additive fields `GET jobs/:jobId` already carried (`stage`, `stage_updated_date`, `retrying`, `queue_position`, `max_attempts`), the full additive set on that response is now: `stage`, `stage_updated_date`, `retrying`, `retried_date`, `queue_entry_date`, `queue_position`, `max_attempts`. `queue_entry_date = COALESCE(retried_date, created_date)` — the moment the job entered the queue in its current life. **New — `POST /api/bilateral/center/ai/jobs/:jobId/retry`** ("Try again"): re-enqueues the same stored S3 keys (no re-upload) for a `FAILED` job, owner-only. `2026 { jobId, jobStatus: 'PENDING' }` on success, resetting `attempts=0`, `retrying=false`, `error_code`/`error_message`=null, `started_date`/`completed_date`=null, `retried_date=now` (`created_date` untouched); `409 { code: 'JOB_ALIVE' }` while PENDING/PROCESSING or if another actor moved the job first; `409 { code: 'JOB_COMPLETED' }` for a completed job; `403` for a non-owner; `410 { code: 'SOURCES_GONE' }` when a stored S3 key no longer exists; `503` when the AI processing queue is not configured. **New — `GET /api/bilateral/center/ai/expectations?mix=documents\|audio`**: `{ mix, sampleSize, p25Minutes, p75Minutes }` — P25/P75 (whole minutes) of `completed_date - started_date` over `COMPLETED` jobs of the same source-mix class in the last 90 days, `p25Minutes`/`p75Minutes` `null` when `sampleSize < 5`; 10-minute in-memory cache per mix; `400` on an unrecognised `mix`. Declared under `center/ai/` (not `center/ai/jobs/`) so it is never shadowed by the `jobs/:jobId` parameter route. Both new routes are additive to the `/api/bilateral/*` surface; no existing shape changes. |
| 2026-09-15 | **New endpoints — `POST /api/bilateral/center/handoff` and `POST /api/bilateral/handoff/exchange` (Bulk Uploader handoff).** The centre form (session-authenticated) mints a short-lived code; the partner API (CLARISA API key) redeems it for claims. Payload contract maintained externally. |
| 2026-09-14 | **`POST /api/bilateral/center/create-header` accepts optional `title` (string).** When the centre reporting tool supplies it at manual create time, the server stores that title on insert and skips the `Bilateral Draft #<id>` rename. When omitted, behaviour is unchanged. Input-only — **no change to any bilateral list or type summary output shape**. |
| 2026-09-10 | **`POST /create`, new optional input `keep_editing` (boolean, default `false`) — P2-3428.** `true` creates the result in **Editing** (`status_id = 1`) instead of Pending Review (`5`), so the reporting user completes the non-MDS fields in PRMS and submits from the centre form; absent or `false` keeps today's behaviour. Input-only — **no change to any output shape**. **Send it per result, inside `data`**: the Fetcher's ingest handler rebuilds the envelope as `{tenant, op, jobId, results}` (`services/fetcher/src/server.mjs:154`) and drops top-level extras, and `ExternalApiClient.sendResult` forwards only `{type, data, idempotencyKey, tenant, op, received_at}`, so a batch-level flag never reaches this endpoint. It was previously accepted and **silently discarded** — not by the Fetcher, whose schemas declare `additionalProperties: true` and passed it through untouched, but here, by this endpoint's `whitelist: true` dropping a field the DTO did not declare. Declared now in both places, so a non-boolean is refused at the Fetcher with the row's `external_reference` rather than forwarded. Mapped in **two** places, not one: `bilateral.service.ts` and `handlers/knowledge-product.handler.ts`, which returns its own header and never reaches the generic one — a single-site mapping would have left Knowledge Products ignoring the flag. **The decision webhook is unaffected:** it is gated on `external_platform_id`, stamped at creation and untouched by `submitForReview`, so a result created in Editing still fires APPROVE/REJECT once the centre submits it and a Science Program decides. Two consequences for producers reconciling these results: `submitForReview` **overwrites** `external_submitter` and `external_submitted_date` with the PRMS user and the submit timestamp, so the payload's original `submitted_by` does not survive; and the result stays unsubmittable until someone holding the **Center User** role on its lead centre opens it (`assertCenterPermission`) and it has a Science Program assigned. The "submitted for review" notification to the SP correctly fires at submit time rather than at ingest (`emitBilateralSubmittedNotification` self-guards on Pending Review). |
| 2026-09-10 | **New centre-form endpoint — `PATCH /api/bilateral/center/change-type/:resultId` (P2-3233).** A W3 result that originated as an AI draft and has been promoted to **Editing** can be reclassified using `{ result_level_id, result_type_id, justification, handle? }`. The caller must have lead-centre permission, and the level/type pair must be valid. Type-specific data (including Innovation Use actors, measures and bilateral-project budgets) is reset; the result identity and common W3 associations — centres, projects, Science Programs, geography, ToC and existing evidence — remain intact. A Knowledge Product target requires a CGSpace handle and uses the same duplicate, MQAP and reporting-cycle validation as W1/W2; CGSpace metadata replaces the result title and description without invoking the destructive pooled-result conversion flow. This is a centre-authoring action, not an external `POST /create` input or an output-payload shape change. |
| 2026-09-09 | **`initiative_budget` / `bilateral_project_budget` / `partner_budget` are now written from the centre form** (P2-3390), for Innovation use and Innovation development alike. They were declared and read but only ever populated by ingestion, because the reporting tool rendered a read-only "Not available yet" panel — QA verified against the legacy PRMS that the three tables are editable there (P2-3361), so the gap was a regression, not scope. The full metadata of both sections now renders the same `app-estimates-cgiar` tables W1/W2 uses: one row per entity already linked to the result (its Science Programs, its W3/bilateral projects, its partner institutions), each taking an amount or "yet to be determined". **No payload shape change** — the arrays keep the row shape documented in §2, and an array that used to be empty may now carry rows. Investment is **optional** and deliberately outside the MDS and the green check (PO decision, Juan David Delgado, 2026-09-09), which departs from P2-3126 AC1 (it listed W3 investment among the mandatory fields) and from QA's "editable, mandatory" recommendation. Server-side the writer is a new leaf service (`ResultInvestmentService` in `api/results/result_budget`) reached by the legacy `summary/*` endpoints the form saves through; project rows are keyed by `results_by_projects` (`result_project_id`) with `non_pooled_projetct_id` forced to null, so the legacy `non_pooled_project`-catalogue writer — which silently drops a bilateral row — is never involved. Pooled-funding W1/W2 and IPSR behaviour is untouched: they keep sending the legacy `*_expected_investment` keys, handled by their own writer on the same endpoint. |
| 2026-09-04 | **`POST /api/bilateral/center/ai/drafts/:id/promote` response now carries `resultCode` and `versionId`** alongside the existing `resultId` (additive). The reporting tool uses them to land on the canonical editor URL (`/bilateral/:center/result/:result_code?phase=:versionId` — the shape the results list opens) instead of the bare internal id. |
| 2026-09-04 | **`contributing_programs[]` on `PATCH /api/bilateral/center/contributors/:id` now stages `share_result_request` DRAFTS (`request_status_id = 4`) — the exact rows `POST /create` writes — instead of `results_by_inititiative` role-2 rows.** A role-2 row means the program already ACCEPTED the contribution; writing it from the centre form skipped the contributor's consent and, worse, the Science Program's approval (`_updateTocMapping → updateResultByInitiative`) deactivated any role-2 row not backed by a request, silently wiping the form-added program. With drafts, both entry paths behave identically: on approval the draft converts in place into a PENDING request (status 1) — the contributor programme gets the contribution email and the in-app request card, and its acceptance (P2-3187) is what creates the role-2 row. Removing a program from the form cancels its draft/pending request and deactivates an already-accepted role-2 row (unchanged). The bilateral detail (`GET /api/results/bilateral/:id`) now returns those drafts under `contributingInitiatives.pending_contributing_initiatives` also while the result is in Editing/Draft (before: Pending Review only), so the form re-hydrates them on reload. Payload shape of the PATCH is unchanged. |
| 2026-09-11 | **`PATCH /api/bilateral/center/primary-assignment/:resultId` reassigns an editable centre-authored bilateral result atomically.** Body: `{ "project_id": number, "primary_science_program_id": number }`, where `primary_science_program_id` is the W3 project-mapping ID returned by the project catalogue. The project must belong to the result's lead centre and the program must be a confirmed, positive-allocation mapping of that project. Before writing, PRMS resolves that mapping's `programCode` to the internal active `clarisa_initiatives.id` required by `results_by_inititiative`; an unresolved code fails before the transaction, preserving the existing result. The endpoint replaces the lead project and role-1 primary program, preserves unrelated contributors, and never silently turns the former primary into a contributor. A primary-program change deactivates that program's active ToC mapping; the reporter must map the replacement program again. It is unavailable after submission/review. |
| 2026-09-03 | **`PATCH /api/bilateral/center/contributors/:id` accepts `contributing_programs[]`** (`{ science_program_id }`, official codes, same key as `POST /create`). The reporting tool's Contributors section can now list any P25 Science Program / Accelerator as contributing, whatever the project's mapping, and the choice persists (Nicoleta Trifa via Ángel Jarrín, 2026-09-03; it used to live in the browser only). Stored as `results_by_inititiative` role-2 rows — what the detail endpoint already returns under `contributing_and_primary_initiative` — so W1/W2 and bilateral leave the same data behind. Omitting the key leaves stored programs untouched; sending it replaces the set. The primary program is never touched from here. No change to `POST /create`. |
| 2026-09-03 | **`POST /create`, `innovation_development.innovation_developers` is now optional.** The Innovation Developer of a bilateral innovation is its Lead contact person (Nicoleta Trifa via Ángel Jarrín, 2026-09-03): the reporting tool no longer shows the field, and this surface no longer requires it. A payload may still send it and it is stored as sent; when omitted, the `lead_contact_person.name` is stored in its place so `innovation_development_summary.innovation_developers` keeps a value. Previously a missing or empty field failed the type-specific step with `innovation_developers is required`. |
| 2026-09-03 | **`innovation_development_summary.short_name` may now be `null`.** The Innovation Development handler no longer seeds `short_title` with the result title on create — neither on `POST /create` nor when an AI draft is promoted. Short title is full metadata, not MDS (P2-3122 AC1/AC2, P2-3391 AC8): the ingest DTO never carried it, and a result title (up to 30 words, usually naming the centre) is never a valid 10-word short name — the copy produced records that looked complete and failed the ceiling at Submit (NOST-456 QA, result 9005). The field stays empty until a user writes it in the reporting tool. No change to the MDS or to the green check: `short_name` never counted. No change to the input shape. |
| 2026-08-26 | **New endpoint — `POST /api/bilateral/version` (P2-3228).** Carries an approved W3/Bilateral result from a previous phase into the open reporting phase, so a centre reporting through STAR/MEL/TIP can continue a 2025 result in 2026 instead of submitting a new one and breaking the trace between phases. Body is `{ result_code, external_reference? }` — the code is the stable, business-facing identifier; the per-version internal id is never part of the contract, and the target Science Program is derived from the result's own role-1 initiative, so the caller sends nothing else. Replication reuses `VersioningService.versionProcessV2` (V2, not V1: V1 refuses any result whose primary submitter is P25, and every 2026 bilateral maps to a Science Program). Refused with a descriptive error when the result does not exist, exists only in the current phase, already has a version in the current phase, is not `source = API`, is a **Knowledge Product** (that block is platform-wide and stays — CGSpace owns their metadata), is not **Approved**, has no primary Science Program, or belongs to another platform. Ownership is `external_platform_id === mis.id`, falling back to the result's lead centre against the platform's declared centre scope when the result carries no originating platform. **Deviations from the story's ACs, deliberate:** the new version lands in **Draft**, not Pending review — this operation continues a result, it does not report on it; and Knowledge Products are excluded from "all result types". |
| 2026-08-26 | **Fix — phase replication keeps the result's origin.** `replicate()` now carries `source`, `creation_method`, `external_submitter`, `external_platform_id`, `external_platform_code` and `external_reference` into the new phase. It carried none of them before, and the consequences were silent: webhook dispatch decides by `external_platform_id`, so a phase-changed result logged "no webhook queued" and the Science Program's decision never reached the platform that reported it; without `source` the copy stopped reading as W3/bilateral in the reporting tool and in `GET /list`; and `external_reference` is the id reporting platforms correlate by. Affects the reporting tool's manual phase change too, not just the API. `status_id` is deliberately untouched — the copy still starts at Editing and each flow sets its own status afterwards. |
| 2026-08-26 | **Fix — `POST /create`, `lead_center` and `contributing_center`:** the two Alliance-descended centres now resolve to their own CLARISA centre. `CIAT` / `CIAT (Alliance)` → **CENTER-03**, `BIOVERSITY` / `Bioversity (Alliance)` → **CENTER-02**, matched case-insensitively and tolerant of extra whitespace, via `CENTER_ALIAS_TO_CLARISA_CENTER_CODE`. Resolution was wrong in both directions: every Alliance spelling — the canonical `CIAT (Alliance)` included — was normalised onto the single Headquarter institution and collapsed to CENTER-02, while the plain acronyms fell through to a `LIKE '%BIOVERSITY%'` that matches **both** institutions (both names contain "Bioversity") and then took whichever row the database returned first. Verified 2026-08-26: `lead_center.acronym = "BIOVERSITY"` was stored as CENTER-03, CIAT; CENTER-03 leads no results at all while CENTER-02 leads 5966. The alias table resolves straight to a centre code, so institution matching is skipped for these two and neither failure mode can recur. Legacy pre-split spellings (`ABC`, `CIAT-BIOVERSITY`) are ambiguous by nature and keep pointing at CENTER-02, where their existing data sits. Non-Alliance centres are untouched. |
| 2026-08-26 | **Breaking — `POST /create`, `evidence[].link`:** the link must now carry an `http(s)` scheme, and links hosted on file storage platforms (SharePoint, OneDrive, Google Drive, Dropbox) are rejected. Both rules already applied in the reporting tool; this surface accepted what the form refused. With class-validator's defaults a bare file name passed `@IsUrl()` (`.pdf` satisfies its TLD check), so `result-28808-Document-202607042143-8310.pdf` was stored as an evidence link. PRMS stores the URL and never copies the document, so a link behind a Centre's tenant permissions renders nothing on the Results Dashboard and cannot be reviewed. Confidential evidence has no route through this API — it accepts links only; use the reporting tool's "Upload file" with public = No. External producers sending such links will now get a 400. |
| 2026-08-26 | **`POST /create`, `innovation_use` actors:** `actor_type_name` is now resolved against the `actor_type` catalogue (case-insensitive, tolerant of spacing around slashes) instead of being ignored. Previously only `actor_type_id` was read, so an actor identified by name alone was **silently dropped** — the request still returned 200. An unresolvable name or id is now a 400 naming the valid options. |
| 2026-08-26 | **`POST /create`, `innovation_use` actors:** `women_youth` / `men_youth` are now validated against their sex total and rejected with a 400 when greater. Youth is a subset of each sex and non-youth is derived as the difference, so an inflated youth figure was previously stored and clamped to a non-youth of 0. Skipped when `sex_and_age_disaggregation` is `true` (that flag means the disaggregation does not apply and only `how_many` is reported). No change to the stored shape — youth stays split by sex; there is no total-youth field. |
| 2026-08-26 | **`PATCH /api/versioning/*` now accepts W3/Bilateral results, under the same rules as `POST /api/bilateral/version` (P2-3229).** The reporting tool's "Update result" action was hidden for bilaterals, so a centre user could only continue an approved 2025 result by creating a new one — duplicating the record and losing the link between phases. The eligibility rules that were written for the API path (previous phase, `source = API`, Approved, not a Knowledge Product, not already versioned in the open phase, has a primary Science Program) were **extracted to a leaf service** (`BilateralVersioningRulesService`, in a module that imports nothing) and are now the single source for both paths — `BilateralModule` imports `VersioningModule`, so sharing them any other way closes a cycle. `versionProcessV2` refuses a bilateral result unless the caller belongs to its **lead centre** (admins pass); `versionProcess` (V1) hands bilaterals to V2 with the entity derived from the result, since V1 refuses P25 primary submitters. **Deliberate divergence from the story's AC9:** the two paths produce the same structure but not the same initial status — Draft by API, **Editing** through the reporting tool (`replicate()` fixes `1 as status_id`, shared with W1/W2). That is what keeps a UI-continued result visible in Result Center while API-created Drafts stay confined to the centre's own list. |
| 2026-08-26 | **Fix — `POST /create`, `lead_contact_person` was never stored.** The contact was written by an `update()` that ran *after* `initializeResultHeader` had already re-read the row, so the later `save({ ...resultHeader, geographic_scope_id })` spread the stale nulls back over it and wiped both `lead_contact_person` and `lead_contact_person_id`. Verified live: results created with a contact in the payload came back with both columns null, and the reporting tool's Lead contact person field opened empty. The contact is now resolved before the header is created and written as part of it, so no later save can clobber it — the same fix covers the Knowledge Product branch, which had the identical pattern. Two behaviour changes come with it: when the directory matches the email, the stored name is now the directory's own `display_name` rather than the payload's `name` (producers routinely send the email in that field, so results showed `n.trifa@cgiar.org` where a person's name belongs); and when the directory has **no** match, the payload name is kept as free text with a null `lead_contact_person_id` instead of a directory row being invented from the payload. That invented row was indistinguishable from a real person — the user search is cache-first and filters only on `is_active` — so it surfaced in the reporting tool's contact picker as if it came from the directory. A null id costs nothing: no notification uses it and every reader is null-guarded. Contacts who legitimately sit outside CGIAR AD (consultants, partner staff) are therefore stored, not refused, and the reporting tool now counts a name-only contact as a complete MDS field. |
| 2026-08-25 | **New endpoints:** `POST /api/bilateral/webhook` and `GET /api/bilateral/webhook` — a platform registers the HTTPS URL PRMS calls back when a Science Program approves or rejects one of its results (P2-3166). Body is `{ url }` only: the recipient is taken from the `mis` CLARISA resolves from the API key, so a platform can only ever register its own destination. One destination per platform; POSTing again replaces the URL. No change to any existing payload. Registering is not a prerequisite for submitting results — what matters is that a destination exists before a decision is taken, since a decision taken with none registered is not delivered later. |
| 2026-07 | AI workflow spec ([bilateral-ai-workflow-spec.md](../../docs/specs/bilateral-ai-workflow/bilateral-ai-workflow-spec.md)) introduces: **secondary/contributing SPs** (multi-select from W3 Registry, expected field `contributing_programs[]`), **Draft (8) status** for AI-assisted results (internal — not in bilateral payload), and **`source` values** for W3/bilateral. Payload will be updated additively as implementation (P2-3100, P2-3101, P2-3122–3127, In Progress) lands. |
| 2026 | Policy change: `result_related_to` from `ResultQuestionsService`; removed duplicate engagement-only field from bilateral JSON. |
| 2026 | Policy change & capacity sharing summaries: omit `created_date` / `last_updated_date` on the **type summary** object only (core `data` still carries result-level dates). |
| 2026 | `leading_result` reflects `is_lead_by_partner` (partner vs centre); `last_submission` for status QA/Submitted; Clarisa `id` on policy type/stage, implementing orgs, innovation typology; KP summary = `handle` only; cap sharing `institutions` renamed to `on_behalf_organizations`; policy change implementing orgs as `policy_implementing_organizations`. |
| 2026 | Innovation package (IPSR): list `type` `innovation_package`; `ipsr_pathway_summary` with `step_one`–`step_four` from pathway services. |
| 2026 | IPSR bilateral `step_two`: `official_code`, `result_type_name`; drop `result_by_innovation_package_id`, `initiative_id`, `result_type_id`, `initiative_official_code`. |
| 2026 | IPSR bilateral `step_three`: expert workshop selection + conditional workshop levels; evidence-based readiness/use + links + details; `target_innovation_use`. |
| 2026 | IPSR bilateral `step_three`: `result_innovation_package` flags only (evidence-based levels under `evidence_based_assessment`); no `result_ip_expert_workshop_organized` on step 3. |
| 2026 | IPSR bilateral `step_four`: only initiative/bilateral/institution investments, `ipsr_materials`, `has_scaling_studies`, `scaling_studies_urls`. |
| 2026 | Bilateral budget rows unified: `initiative_budget` / `bilateral_project_budget` / `partner_budget` share one slim shape (Clarisa `initiative` / `project` / `institution` objects + amounts); IPSR `step_four` uses these **same keys and row shape** (replacing raw `initiative_expected_investment` / `bilateral_expected_investment` / `institutions_expected_investment` on the bilateral payload only). |
| 2026-08 | `POST /create` accepts an optional `lead_contact_person` object (`{ email, name }`, see `LeadContactPersonDto`). When present, the server matches or creates the AD/PRMS user record and stores it as the result's lead contact (same resolution used by the self-service reporting tool). Input-only — no change to the `data.lead_contact_person` **output** shape documented above. |
| 2026-08 | **Breaking:** `lead_contact_person` on `POST /create` is now **mandatory** (per P2-3227 — Lead Contact Person is an MDS field and must be requested/enforced transversally across all indicator types). `email` and `name` inside it were already required whenever the object was present; only the outer object itself changed from optional to required. External producers that previously omitted this field will now get a validation error and must start sending it. |
| 2026-08 | `GET /api/bilateral/list` now returns **all** results — active **and** inactive (soft-deleted, `is_active: false`) — so consumers (e.g. the sync/OpenSearch pipeline) can detect deletions. Items additionally include `version_id` (entity column, always present) and structured `pdf_link` / `prms_link` (previously documented but not populated by this endpoint). Links follow the `result.repository.ts` / fetcher convention: `${pdfBase}/${result_code}?phase=${version_id}` and `${frontendBase}/result/result-detail/${result_code}/general-information?phase=${version_id}`. |

---

*Generated from server implementation in `bilateral.service.ts` (`enrichBilateralResultResponse` and related builders). If the API diverges, treat this file as documentation debt and update it alongside code changes.*

# Innovation Use minimum data standard

For `POST /api/bilateral/create` Innovation Use results, the request must provide the bilateral MDS before
the result is created in `Pending Review`: actors (or `innov_use_to_be_determined: true`), one quantitative
measure with unit and quantity, and at least one identified contributing W3/bilateral project. Investment
amounts are optional for the lead program (`toc_mapping`), every bilateral project, and contributing partners.
For Innovation Use only, an omitted or zero `usd_budget` is stored as `kind_cash: null` with
`is_determined: true`; a positive amount is retained and is not marked as yet to be determined. The MDS
gate also applies to `submit-for-review`, where it requires the project link but does not require its budget.
