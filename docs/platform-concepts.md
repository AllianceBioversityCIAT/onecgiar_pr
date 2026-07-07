# PRMS Platform Concepts — Domain Guide

> **Status:** Living document. A conceptual companion to `docs/prd.md`. This guide explains **what the platform reports, for whom, and why**, in plain language — the mental model every developer, designer, or new user needs before touching PRMS. It exists because the platform's biggest usability gap is conceptual: users (and developers) constantly ask *"what is a Science Program?"*, *"which result type do I pick?"*, *"what does this ToC node mean?"*.

---

## 1. The 60-second story

**CGIAR** is a global research partnership ("science to transform food, land, and water systems in a climate crisis") made up of ~15 research Centers — one of which is the **Alliance of Bioversity International & CIAT** (the 2019 merger of Bioversity International and the International Center for Tropical Agriculture, CIAT, headquartered in Cali, Colombia). **The Alliance builds and operates PRMS** for the whole CGIAR system.

Every year, researchers across all Centers must **report the results of their research** — publications, innovations, policy changes, trainings — against the **plans (Theories of Change)** of the programs that funded them. PRMS (Planning, Reporting & Management System) is the single web platform where those results are **captured, typed, quality-assured, and submitted**, and from which they flow to the public [CGIAR Results Dashboard](https://results.cgiar.org), annual Technical Reports, and bilateral funder exports.

So, in one sentence: **PRMS turns messy research activity into structured, evidence-backed, quality-assured "Results" linked to the plans of CGIAR's Science Programs.**

---

## 2. Who is who (organizational concepts)

| Concept | What it is | In the code |
|---|---|---|
| **CGIAR** | The global research partnership (formerly "Consultative Group on International Agricultural Research"). Governed under the **One CGIAR** reform (2019+): one System Board, one management, one portfolio. | The "system level" everything rolls up to. |
| **Center** | One of ~15 research institutes (Alliance, CIMMYT, IRRI, IFPRI, ILRI, CIP, IITA, WorldFish, …). Centers employ the researchers who report results. | `clarisa_center`, lead/contributing centers on a result (`is_lead`). |
| **Alliance of Bioversity & CIAT** | The Center that develops PRMS, CLARISA, and related tooling. | This repository. |
| **Science Program (SP)** | The 2025–2030 delivery unit of research. Eight programs (Breeding for Tomorrow, Sustainable Farming, Climate Action, Better Diets and Nutrition, Multifunctional Landscapes, Sustainable Animal & Aquatic Foods, Policy Innovations, Food Frontiers and Security) plus Genebanks and Scaling for Impact. | Entity codes like `SP-xx` / `SGP-xx`; portfolio acronym **P25**. |
| **Accelerator** | Cross-cutting enabler in the 2025–2030 portfolio (Gender Equality & Inclusion, Capacity Sharing, Digital Transformation, Scaling for Impact). Reports results like an SP. | Same entity tables, different `entityTypeName`. |
| **Initiative** | The **2022–2024** predecessor of Science Programs (~32 Initiatives). PRMS still holds all their data. | `INIT-xx` codes; portfolio acronym **P22**. |
| **Partner / Institution** | Any external organization involved in a result (universities, NGOs, governments). Master list comes from CLARISA (6,000+ institutions). | `clarisa_institutions`, partners section of a result. |
| **PMU / portfolio lead** | Program-management staff who monitor submission progress and consolidate portfolio narratives. | Personas in `docs/prd.md`; Type-One Report module. |

> **Terminology drift is a first-class concept in PRMS.** The same "slot" is called *Initiative* (P22) or *Science Program/Accelerator* (P25); *Work Package* (P22) or *Area of Work* (P25). The client handles this with the `TerminologyService` (`src/app/internationalization/`), keyed by portfolio acronym — currently only for entity naming.

---

## 3. What gets planned (the Theory of Change side)

Before anything is reported, each Science Program **plans** its research in a **Theory of Change (ToC)** — a structured hypothesis of how research products lead to real-world change. PRMS does *not* author ToCs (that happens in an external ToC tool); it **consumes** them so results can be linked to plan nodes.

The planning hierarchy, top-down:

```
Science Program (e.g. SP-07 Climate Action)
└── Area of Work (AoW)          ← "Work Package" in P22 vocabulary
    └── Theory of Change nodes
        ├── High-Level Outputs (HLOs)
        │   └── Indicators (KPIs)  ← each with targets per Center per year
        └── Outcomes (incl. 2030 Outcomes / EOIO)
```

| Concept | What it is | Why a reporter cares |
|---|---|---|
| **Theory of Change (ToC)** | The causal map: outputs → outcomes → impact, with assumptions. Each Program and each AoW has one. | Every result must declare *which ToC node it contributes to* ("ToC alignment"). |
| **Area of Work (AoW)** | Thematic sub-division of an SP (P25 term; = Work Package in P22). Has its own nested ToC and lead/co-lead. | The drill-down unit in the Results Framework pages (`entity-aow`). |
| **High-Level Output (HLO)** | A planned output cluster inside an AoW, carrying **indicators**. | Reporters report results *against an HLO indicator*. |
| **Indicator** | A measurable KPI under an HLO/outcome, with **target values** (per Center, per year) and **actual achieved values** accumulated from reported results. | The target-vs-actual gap is the core progress metric. |
| **Result levels** | Where a result sits on the causal chain: **Output** (sphere of *control* — direct products), **Outcome** (sphere of *influence* — behavior/policy/system change), **Impact** (sphere of *interest* — long-term development effects). | Choosing Output vs Outcome is the first decision when creating a result. |
| **Planned vs Emerging results** | *Planned* results respond to indicators already in the year's ToC. *Emerging* (unplanned) results are valuable achievements that were not in the ToC. | The entity-details page splits reporting into these two pathways. |
| **PORB** | Plan of Results and Budget — the planning artifact mapping intended results + budget to KPIs. | Context for why targets exist per Center. |

---

## 4. What gets reported (the Result side)

A **Result** is the atomic unit of PRMS: *"a documented, evidence-backed research achievement, typed, dated, geolocated, attributed to centers/partners, and aligned to a Theory of Change."* Every result carries a stable `result_code`, a `result_type`, a reporting phase/year, and a `status_id` (see §6).

### 4.1 Result types

| Type | `result_type_id` | What it means | Type-specific section |
|---|---|---|---|
| **Policy change** | 1 | A change in policy, strategy, legal instrument, budget, or investment influenced by CGIAR research. | `policy-change-info` |
| **Innovation use** | 2 | Evidence that an innovation is being **used** by next users / end users (measured 0–9 on the Innovation Use scale). | `innovation-use-info` |
| **Other outcome** | 3/4 | Outcome results not fitting the named categories (incl. 2030/EOIO outcomes). | — |
| **Capacity sharing for development** | 5 | Training and capacity-building delivered (participants counted, gender-disaggregated). | `cap-dev-info` |
| **Knowledge product** | 6 | Publications, datasets, tools, models — metadata synced from **CGSpace** (handle-based repository). Title and metadata come from the repository via MQAP, not typed by hand. | `knowledge-product-info` |
| **Innovation development** | 7 | A new/improved technology, practice, or approach being developed (measured 0–9 on the Innovation Readiness scale). | `innovation-dev-info` |
| **Innovation package / IPSR** | 10 | A bundle: core innovation + complementary innovations + enabling conditions, assessed for scaling (see §5). | IPSR module (4 steps) |

*(ids per `ResultTypeEnum` in `onecgiar-pr-server/src/shared/constants/result-type.enum.ts`, mirrored in the client's `rdResultTypesPages` routing.)*

### 4.2 What every result must carry (common fields)

- **Identity**: title, description, lead Science Program/Initiative, reporting year/phase.
- **ToC alignment**: at least one ToC node/indicator it contributes to (AC-6 in the PRD).
- **Contributors**: lead Center (`is_lead=true`) + contributing Centers, partner institutions, and (P25) contributing Science Programs.
- **Geographic scope**: global / regional / national / sub-national, with CLARISA regions & countries ("location of benefit").
- **Evidence**: at least one verifiable link (publication, report, data) backing the claim.
- **Impact Area scores ("DAC/tag scores")**: for each of the **5 Impact Areas** — Nutrition & Food Security · Poverty Reduction, Livelihoods & Jobs · Gender Equality, Youth & Social Inclusion · Climate Adaptation & Mitigation · Environmental Health & Biodiversity — a 0/1/2 significance score (Not targeted / Significant / Principal). |
- **SDG alignment**: mapping to Sustainable Development Goals.

### 4.3 OICRs

**Outcome Impact Case Reports** — curated narrative stories ("evidence of adoption at scale", "policy changed because of…") built on top of quality-assured results. They feature on the public dashboard; PRMS results are their raw material.

---

## 5. IPSR — Innovation Packages & Scaling Readiness

CGIAR's method (with Wageningen University, derived from NASA's Technology Readiness Levels) for moving innovations toward scale:

- **Innovation Readiness (0–9)**: how mature the innovation is (idea → proven in real-world conditions).
- **Innovation Use (0–9)**: how widely it is used (project team → unconnected stakeholders).
- **Innovation Package**: the core innovation **plus** complementary innovations and enabling conditions needed to scale it in a specific context.

In PRMS this is the **IPSR module**, authored in 4 steps: Step 1 core innovation → Step 2 complementary innovations → Step 3 scaling-readiness assessment → Step 4 investments/materials/scaling plan. IPSR has its own phases, completeness tracking (`IpsrCompletenessStatusService`), and bilateral payload (`ipsr_pathway_summary`).

---

## 6. The reporting lifecycle

### 6.1 Phases (versioning)

All reporting is **phase-scoped**: a phase ≈ a reporting cycle for a year within a portfolio (e.g. "Reporting 2025", phase for P22 vs P25, plus separate IPSR phases). The `versioning` module owns phase open/close; phase rollover snapshots prior data without mutating it (AC-5). The client keeps phase context in the shell (`?phase=` query param on deep links).

### 6.2 Result status workflow

```
Editing (1) ──submit──▶ Quality Assessed (2) ──▶ Submitted (3)
   ▲                                                │
   └────────────── unsubmit / QA send-back ─────────┘
```

- Submission is **blocked until every required section is complete** — the "green checks" (computed server-side per section, refreshed by the HTTP interceptor after each save).
- Every transition is recorded in `result-review-history`.
- **QA**: after the cycle closes, independent assessors review each submitted result on the QA platform (integrated via the `quality-assurance` module); submitters respond to feedback; a third-party decision-maker settles disagreements.

### 6.3 Where results go afterwards

- **CGIAR Results Dashboard** (public, results.cgiar.org).
- **Type-One Report** — PMU's consolidated annual portfolio report (own module).
- **Bilateral exports** — typed JSON payloads per result type for bilateral funders (`/api/bilateral/*`, contract in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`).
- **Platform reports / BI** — `platform-report` payloads.

### 6.4 Bilateral results (W3/Bilateral projects)

CGIAR funding comes in windows: pooled W1/W2 funds the Programs; **W3/Bilateral** are direct funder-to-Center projects. Bilateral-funded results are reported in PRMS too, **mapped to the Portfolio** and validated by Center focal points in the **Results Review** flow (`bilateral-results` pages: per-Center pending queues, Approve/Reject with justification).

---

## 7. CLARISA — the master-data backbone

**CLARISA** (CGIAR Level Agricultural Results Interoperability System Architecture) is an Alliance-built REST service providing the **shared control lists** all CGIAR reporting systems use:

- Institutions/partners (6,000+), institution types.
- Countries, regions, geo locations (UN M49).
- CGIAR entities: Centers, Initiatives/Science Programs, Action Areas, Impact Areas.
- Result taxonomies, indicators, SDGs, innovation/policy type lists.

**Rule of thumb: if it's a dropdown catalog, it comes from CLARISA** (synced by cron into local `clarisa_*` tables — see `src/clarisa/` on the server). PRMS consumes; CLARISA owns. Partner requests ("my institution isn't in the list") flow back to CLARISA and take up to ~1 hour to appear.

---

## 8. How the concepts map to the codebase

| Concept | Server (NestJS) | Client (Angular) |
|---|---|---|
| Result + common fields | `src/api/results/` (entity `result`, `results.service.ts`) | `pages/results/pages/result-detail/` (sections `rd-*`) |
| Result creation | `POST /api/results/create` etc. | `pages/results/pages/result-creator/` (`report-result-form`) |
| Science Programs / entities | `results-framework-reporting` module; CLARISA global units | `pages/result-framework-reporting/` (home → entity-details → AoW) |
| ToC alignment | `src/toc/` (consumes external ToC services) | `rd-theory-of-change` (P22) / `rd-contributors-and-partners` (P25) |
| Phases / versioning | `src/api/versioning/` | Phase switcher in shell; `?phase=` params |
| Green checks / completeness | per-section completeness queries | `green-checks.service.ts` + panel-menu check icons |
| QA | `quality-assurance` module | `pages/quality-assurance/` + review drawer |
| IPSR | `src/api/ipsr/` | `pages/ipsr/` (4-step pathway) |
| Bilateral exports | `src/api/bilateral/` (public, throttle-excluded) | `bilateral-results` review pages |
| CLARISA sync | `src/clarisa/` + cron | catalog services under `shared/services/global/` |
| P22↔P25 vocabulary | portfolio/entity tables | `internationalization/` TerminologyService |

---

## 9. Glossary (quick reference)

- **AoW** — Area of Work; P25 name for a Work Package.
- **CGSpace** — CGIAR's institutional repository (handles); source of truth for Knowledge Product metadata.
- **EOIO** — End-of-Initiative Outcome (P22 ToC node type); P25 analog: 2030 Outcomes.
- **Green check** — server-computed "this section is complete" flag; all green ⇒ submit unlocked.
- **HLO** — High-Level Output; indicator-bearing planned output inside an AoW.
- **Impact Areas (5)** — Nutrition; Poverty; Gender; Climate; Environment. Scored 0/1/2 on every result.
- **IPSR** — Innovation Packages & Scaling Readiness (see §5).
- **MQAP** — the metadata quality-assurance pipeline that pulls Knowledge Product metadata from CGSpace handles.
- **OICR** — Outcome Impact Case Report.
- **P22 / P25** — portfolio acronyms: 2022–24 Initiatives portfolio vs 2025–30 Science Programs portfolio.
- **Phase** — a reporting cycle (year × portfolio × module); all reads/writes are phase-scoped.
- **PORB** — Plan of Results and Budget.
- **PRMS** — Planning, Reporting & Management System (this platform).
- **QA** — Quality Assurance/Assessment of submitted results.
- **Result** — the atomic reportable unit (see §4).
- **Scaling Readiness** — the 0–9 readiness/use framework behind IPSR.
- **SP / SGP** — Science Program (entity codes vary: `SP-xx`, `SGP-xx`).
- **ToC** — Theory of Change.
- **W1/W2, W3/Bilateral** — CGIAR funding windows: pooled vs direct bilateral funding.

---

## Sources

- CGIAR 2025–2030 Portfolio: <https://www.cgiar.org/cgiar-research-portfolio-2025-2030>
- Performance & Results Management: <https://www.cgiar.org/portfolio-narrative/performance-and-results-management>
- QA process: <https://www.cgiar.org/news-events/news/cgiars-quality-assurance-process-a-snapshot-of-what-it-is-and-what-is-does/>
- IPSR: <https://www.cgiar.org/news-events/news/birds-eye-view-of-cgiars-innovation-packages-and-scaling-readiness-ipsr>
- CLARISA: <https://clarisa.cgiar.org/>
- Results Dashboard: <https://results.cgiar.org>
- Internal: `docs/prd.md`, `docs/system-design/design.md`, `docs/detailed-design/detailed-design.md`, `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
