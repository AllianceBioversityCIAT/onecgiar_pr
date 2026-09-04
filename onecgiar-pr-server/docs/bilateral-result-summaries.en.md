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

The three budget arrays use the **same row shape** everywhere in bilateral summaries (Innovation development, Innovation use, and IPSR `step_four`): Clarisa-facing ids and amounts only — no PRMS join PKs, audit columns, or role flags on the row.

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

## Change log (maintainers)

| Date (approx.) | Change |
|----------------|--------|
| 2026-09-04 | **`POST /api/bilateral/center/ai/drafts/:id/promote` response now carries `resultCode` and `versionId`** alongside the existing `resultId` (additive). The reporting tool uses them to land on the canonical editor URL (`/bilateral/:center/result/:result_code?phase=:versionId` — the shape the results list opens) instead of the bare internal id. |
| 2026-09-04 | **`contributing_programs[]` on `PATCH /api/bilateral/center/contributors/:id` now stages `share_result_request` DRAFTS (`request_status_id = 4`) — the exact rows `POST /create` writes — instead of `results_by_inititiative` role-2 rows.** A role-2 row means the program already ACCEPTED the contribution; writing it from the centre form skipped the contributor's consent and, worse, the Science Program's approval (`_updateTocMapping → updateResultByInitiative`) deactivated any role-2 row not backed by a request, silently wiping the form-added program. With drafts, both entry paths behave identically: on approval the draft converts in place into a PENDING request (status 1) — the contributor programme gets the contribution email and the in-app request card, and its acceptance (P2-3187) is what creates the role-2 row. Removing a program from the form cancels its draft/pending request and deactivates an already-accepted role-2 row (unchanged). The bilateral detail (`GET /api/results/bilateral/:id`) now returns those drafts under `contributingInitiatives.pending_contributing_initiatives` also while the result is in Editing/Draft (before: Pending Review only), so the form re-hydrates them on reload. Payload shape of the PATCH is unchanged. |
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
