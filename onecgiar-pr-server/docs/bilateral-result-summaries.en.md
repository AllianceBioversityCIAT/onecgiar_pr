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
| `type`         | String discriminator, e.g. `knowledge_product`, `capacity_sharing`, `innovation_development`, `innovation_use`, `policy_change`. |
| `result_id`    | Numeric id of the result row. |
| `data`         | Full enriched result document: common PRMS fields **plus** the summary for that type (when applicable). |

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
| `bilateral_projects[]` | Bilateral grant / project summaries tied to the result. | Which bilateral-funded projects are linked. |
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

| Field | Meaning |
|-------|---------|
| `initiative_budget[]` | Per contributing initiative: codes, names, year amounts, `kind_cash`, `is_determined`. |
| `bilateral_project_budget[]` | Per bilateral project: short name, cash/in-kind splits, `is_determined`. |
| `partner_budget[]` | Per partner institution budget line. |
| `reference_materials[]` | `{ link }` from evidence type “materials”. |
| `evidence_of_user_need_user_demand[]` | `{ link }` from evidence type user need / demand. |
| `scaling_study_urls[]` | URLs when readiness is high enough to require scaling studies. |

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
| `institutions[]` | `{ id, name, acronym, institution_type_name }` for **implementing** org rows (PRMS role 4); `id` is the Clarisa institution id. |

**Note:** Internal audit timestamps are **not** included on this summary; use core result fields elsewhere if needed.

---

## Types without a dedicated summary in this flow

Other bilateral-supported types (e.g. other output / other outcome) may **not** add a `*_summary` object; they still receive the **shared** enrichment on `data`.

---

## Change log (maintainers)

| Date (approx.) | Change |
|----------------|--------|
| 2026 | Expanded **Common fields on `data`** with tables + reference JSON fragment (identity, TOC, geography, centres, DAC, status, evidences, links, etc.). |
| 2026 | Policy change: `result_related_to` from `ResultQuestionsService`; removed duplicate engagement-only field from bilateral JSON. |
| 2026 | Policy change & capacity sharing summaries: omit `created_date` / `last_updated_date` on the **type summary** object only (core `data` still carries result-level dates). |
| 2026 | `leading_result` reflects `is_lead_by_partner` (partner vs centre); `last_submission` for status QA/Submitted; Clarisa `id` on policy type/stage, implementing orgs, innovation typology; KP summary = `handle` only; cap sharing `institutions` renamed to `on_behalf_organizations`. |

---

*Generated from server implementation in `bilateral.service.ts` (`enrichBilateralResultResponse` and related builders). If the API diverges, treat this file as documentation debt and update it alongside code changes.*
