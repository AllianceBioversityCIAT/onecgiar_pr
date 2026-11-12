# Requirements — Bilateral (W3) result PDF shows MDS data only

## 1. Document Control

| Field | Value |
|---|---|
| Module | platform-report (PDF) — code lives in `D:\PRMS\alliance-ibd-pdf-viewer` |
| Spec path | `changes/bilateral-pdf-mds-only` |
| Type | Change · Deliverable: software |
| Depth | Standard |
| Ticket | INC-168048 (Nicoleta Trifa, 10-Nov-2026) |
| Approval Mode | gated |
| Status | draft |
| Proposal | `proposal.md` (approved 2026-11-12) — aligned |

## 2. Executive Summary

The W3/bilateral PDF (`results_bilaterals_p25`) prints fields the bilateral form keeps under **"Complete full metadata"**, plus the innovation-use **use level** shown as "Current readiness". From now on the bilateral PDF prints only the **MDS layer**: the fields the bilateral form shows **above** its full-metadata toggle. The W1/W2 PDF (`results_p25`) and the IPSR PDF (`ipsr_p25`) do not change at all.

## 3. Glossary

| Term | Meaning here |
|---|---|
| Bilateral PDF | Output of template `results_bilaterals_p25` — chosen for `source='API'` results whose submitter is not SGP-02 (`platform-report.service.ts:462-468`) |
| MDS layer | The fields a bilateral form section renders **before** its `showAllFields()` / `showFullMetadata()` gate. Everything behind the gate is "full metadata" (not MDS) |
| Use level | Innovation-use scale 0–9 ("Level 0 – No use"); the PDF labels it "Current readiness of this innovation" |
| Byte-identical | The rendered HTML of a template, with the run/build tokens listed under "Masks" in `fixtures/render.sh` masked (generation timestamp, build ID, `/_next/static/` asset names, RSC module ids), is equal before and after the change |

## 4. System Context & Scope

Current behavior (cited at the moment of writing):

- The bilateral template reuses the shared W1/W2 type sections — `results_bilaterals_p25/template.tsx:17-22,58-62`.
- Innovation Use prints the use level + scale image — `shared/components/innovation-use.tsx:183-200`. Use level sits **below** the toggle in the bilateral form — `type-innovation-use.component.html:185` (gate) `:211` (field), P2-3785.
- Each bilateral form section's gate line: general-info `:97`, contributors `:303`, geography `:137`, innovation-use `:185`, innovation-dev `:93`, policy `:128`, capacity-sharing `:143` (all `*.component.html` under `onecgiar-pr-client/src/app/pages/bilateral/components/`).

### Field map — what the bilateral PDF prints today vs the MDS layer

| PDF section | Field printed today | Bilateral form position | Action |
|---|---|---|---|
| Result details | Short title (`short_title`) | ID: below gate `type-innovation-dev.html:96` | **Remove** |
| Result details | **Impact Areas targeted** (DAC scores + OECD criteria) | General-info below gate `section-general-info.html:97-108` | **Remove** |
| Result details | Description, phase, lead contact, submitter | General-info above gate / system | Keep |
| Contributors | ToC, SPs, centers, W3/bilateral projects | Above gate (`section-contributors.html:29-199`), ToC MDS (`section-toc`) | Keep |
| Contributors | **Partners** — `non_kp_partner_data` | Below gate `section-contributors.html:352` (P2-3821) | **Remove** |
| Contributors | Partners — `kp_partner_data` (KP results) | KP partners come from the repository record, not the form | Keep (see BPM-R-4) |
| Contributors | **Bundled innovations** (linked results) | Below gate `section-contributors.html:393-409` | **Remove** |
| Geographic | focus, regions, countries, subnational | Above gate `section-geography.html:26-90` | Keep |
| Evidence | link, description, file/public flags | Evidence MDS | Keep |
| Evidence | **"Impact Area related" tags per evidence** | Not asked in the bilateral evidence form (`grep -in "impact area\|_related\|tags" section-evidence.component.html` → 0 hits) | **Remove** |
| Innovation Use | Actors | Above gate `:99` | Keep |
| Innovation Use | Other quantitative measures | Above gate `:120` | Keep |
| Innovation Use | **Organizations** | Below gate `:188` | **Remove** |
| Innovation Use | **Current readiness (use level) + scale** | Below gate `:211` | **Remove** |
| Innovation Dev | Nature, developers, readiness level (+ details) | Above gate `:40,62,68` | Keep |
| Innovation Dev | **Innovation type, collaborators, readiness justification, reference materials** | Below gate `:107,148,158,169-177,221` | **Remove** |
| Innovation Dev | Scaling-study URLs | Below gate, but **not printed by any PDF component today** (T-1, 2026-11-12) | N/A — nothing to remove |
| Innovation Dev | **Investments, Anticipated innovation users (actors / orgs / measures)** | Not in the bilateral form at all — UNVERIFIED, settled by T-1 | **Remove** |
| Policy Change | Type, USD amount (type 1), stage, implementing orgs | Above gate `:58-103` | Keep (no change) |
| Capacity Sharing | People trained, length, delivery method | Above gate `:32-120` | Keep |
| Capacity Sharing | **"Were the trainees attending on behalf of an organization?"** | Below gate `:146` | **Remove** |
| Knowledge Product | KP metadata | KP form has no full-metadata gate | Keep (no change) |

### In scope
- `alliance-ibd-pdf-viewer`: the bilateral template and the shared sections it renders.
- Bilateral demo data (`results_bilaterals_p25/template.demo.json`) so every removed block can be shown absent.

### Out of scope
- `results_p25`, `ipsr_p25` output; the server; the DB function that builds the payload; the bilateral form.
- **Adding** MDS fields the PDF does not print today (e.g. innovation-use "Investment by W3/bilateral projects", current-use update) — OQ-1.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| PMU (Nicoleta) / donors reading W3 PDFs | See MDS only |
| W3 submitters | Their full-metadata answers no longer print in the PDF (still stored, still on screen) |
| W1/W2 and IPSR readers | Nothing |
| Deploy owner (Cristian Gamboa) | Deploys the PDF service |

## 6. Functional Requirements

### BPM-R-1 — Innovation Use in the bilateral PDF shows MDS only

The bilateral PDF SHALL print, under Innovation Use, only Actors and Other quantitative measures.

#### Scenario: Result 27926 (ticket case)
- GIVEN bilateral result 27926 (phase 6) with actors and use level "Level 0 - No use"
- WHEN its PDF is generated
- THEN Innovation Use shows the Actors table
- BUT it must NOT show "Current readiness of this innovation" nor the readiness scale image
- AND IT MUST NOT show the Organizations table even when organizations exist

#### Scenario: Only non-MDS innovation-use data
- GIVEN a bilateral innovation-use result with organizations and a use level but no actors and no measures
- WHEN its PDF is generated
- THEN the Innovation Use section is not rendered at all (no empty title)

### BPM-R-2 — Innovation Development in the bilateral PDF shows MDS only

The bilateral PDF SHALL print, under Innovation Development, only nature (typology), innovation developers and readiness level (with its details text).

#### Scenario: Full ID data
- GIVEN a bilateral ID result whose payload carries every ID field
- WHEN its PDF is generated
- THEN nature, developers and readiness level print
- BUT it must NOT print innovation type, collaborators, readiness justification, reference materials, investments, nor the Anticipated innovation users block (scaling-study URLs are not printed today — N/A)

### BPM-R-3 — Capacity Sharing in the bilateral PDF shows MDS only

#### Scenario: Organizations answered
- GIVEN a bilateral CapSharing result with `capdev_organizations`
- WHEN its PDF is generated
- THEN people trained, length of training and delivery method print
- BUT it must NOT print "Were the trainees attending on behalf of an organization?"

### BPM-R-4 — Common sections in the bilateral PDF show MDS only

#### Scenario: Non-KP result with partners, linked results, short title and impact areas
- GIVEN a bilateral non-KP result with `non_kp_partner_data`, `bundled_innovations`, `short_title`, impact-area scores and evidence tags
- WHEN its PDF is generated
- THEN Result details (description, phase, lead contact, submitter), Contributors (ToC, SPs, centers, projects), Geographic and Evidence (link, description) print as today
- BUT it must NOT print the Partners table, the Bundled innovations table, the Short title line, the "Impact Areas targeted" block (nor the OECD criteria note), nor any evidence "Impact Area related" tags

#### Scenario: KP result partners
- GIVEN a bilateral KP result with `kp_partner_data`
- WHEN its PDF is generated
- THEN the Partners table prints those KP partners only
- AND IT MUST NOT include `non_kp_partner_data` rows

### BPM-R-5 — Other PDFs are untouched

The change SHALL NOT alter `results_p25` nor `ipsr_p25` output.

#### Scenario: W1/W2 and IPSR regression
- GIVEN the demo payloads of `results_p25` and `ipsr_p25`
- WHEN each is rendered before and after the change
- THEN the HTML is byte-identical with the run/build tokens listed under "Masks" in `fixtures/render.sh` masked (generation timestamp, build ID, `/_next/static/` asset names, RSC module ids)
- AND IT MUST hold for an Innovation Use demo that carries a use level (the block still shows in W1/W2)

### BPM-R-6 — Policy Change and KP in the bilateral PDF are unchanged

#### Scenario: Policy and KP bilateral
- GIVEN bilateral Policy Change and KP results
- WHEN their PDFs are generated
- THEN their type sections print exactly as before

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| BPM-NFR-1 | No change to the payload contract or the server; data stays in the JSON, the template filters |
| BPM-NFR-2 | TypeScript build (`npx tsc --noEmit`) and `next build` stay green; lint clean on touched files |
| BPM-NFR-3 | Pagination blocks (`data-paginator-block`) of remaining sections keep working (no orphan titles) |

### Defect classes → gate

| Defect class | Gate |
|---|---|
| W1/W2 or IPSR output changes (shared component default leaks) | HTML diff of `results_p25` / `ipsr_p25` demos before vs after on `next build` + `next start` (render.sh masks; P-8) — automated |
| A non-MDS block still renders in the bilateral PDF | Bilateral demo with **every** removed field populated, rendered and grepped for each removed label → 0 hits — automated |
| An MDS block disappears by mistake | Same render grepped for each kept label → hit — automated |
| Type error on new props | `npx tsc --noEmit` — automated |
| Empty section title / broken pagination in the real PDF | **No automated check** — substitute: human (or T6) look at a local browser print-to-PDF of the bilateral fixtures before the PR, then at the production PDF of result 27926 after the `main` deploy (no test environment) |

## 8. Requirement ID Index

| ID | Title |
|---|---|
| BPM-R-1 | Innovation Use MDS only |
| BPM-R-2 | Innovation Development MDS only |
| BPM-R-3 | Capacity Sharing MDS only |
| BPM-R-4 | Common sections MDS only |
| BPM-R-5 | W1/W2 and IPSR untouched |
| BPM-R-6 | Policy Change and KP unchanged |
| BPM-NFR-1..3 | Non-functional |

### Open questions
- **OQ-1** — Some MDS fields are not printed today (innovation-use investment by W3/bilateral projects, current-use update). Out of scope here; ask Nicoleta if she wants them added.
- **OQ-2** — KP partners kept (from the repository record). Confirm with Nicoleta if she flags them.
