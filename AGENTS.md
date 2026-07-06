# AGENTS.md — PRMS Ecosystem Router

> Agent role: **Orientation and routing layer**. Read this file first when you enter the `onecgiar_pr` monorepo. It maps the whole platform and points you to the right specialized guide.
>
> Note: This filesystem is case-insensitive, so `agents.md` and `AGENTS.md` resolve to the same file. The router lives here under the standard `AGENTS.md` name.

## 1. Purpose

PRMS (Planning, Reporting & Management System) is a monorepo for OneCGIAR. This file maps the whole platform so an AI coding agent can decide where to work next without scanning the tree from scratch.

## 2. Ecosystem map

```text
onecgiar_pr/
├── onecgiar-pr-server/      # NestJS 11 backend (TypeORM/MySQL, Lambda + Docker)
│   └── AGENTS.md            # Server-side agent guide (agents.md standard)
├── onecgiar-pr-client/      # Angular 19 frontend (PrimeNG 19, Jest, Cypress)
│   ├── AGENTS.md            # Package-level frontend guide
│   └── src/AGENTS.md        # Source-tree frontend guide
├── docs/                    # SDD baseline: prd, system-design, detailed-design
├── .cursorrules             # Hard rule: no secrets in logs, code, or docs
└── AGENTS.md                # This root router + project memory
```

## 3. Read order

1. This file (`AGENTS.md`).
2. For server work: [`onecgiar-pr-server/AGENTS.md`](./onecgiar-pr-server/AGENTS.md).
3. For frontend work: see [`onecgiar-pr-client/AGENTS.md`](./onecgiar-pr-client/AGENTS.md) and [`onecgiar-pr-client/src/AGENTS.md`](./onecgiar-pr-client/src/AGENTS.md).
4. The relevant SDD spec under [`docs/specs/<module>/`](./docs/specs/).

## 4. Agent role on this repo

You are a coding assistant for a regulated reporting platform. Your job is to:

- Preserve module boundaries and existing naming (including load-bearing typos).
- Follow the SDD methodology and cite `G#`, `US-*`, `AC-*`, and `W1..W8` where applicable.
- Make the smallest correct change.
- Never log, print, commit, or document secrets, JWTs, API keys, credentials, or webhook URLs.

## 5. Platform-wide skills

| Skill | Command / location |
|---|---|
| Install & bootstrap | `npm ci && npm run prepare` (root) |
| Server run | `cd onecgiar-pr-server && npm run start:dev` |
| Server test | `npm run test` |
| Migration check | `npm run migration:check` / `npm run migration:check:ci` |
| Client run | `cd onecgiar-pr-client && npm start` |
| Client test | `npm run test` / `npm run cypress:run` |

## 6. Cross-cutting constraints

- **Auth header**: custom `auth: <JWT>`, never `Authorization: Bearer`.
- **Secrets**: follow [`.cursorrules`](./.cursorrules). Redact tokens and credentials in every output.
- **Commits**: format `<emoji> <type>(<scope>) [ticket]: <description>`.
- **Branches**: `master` (main), `staging` (integration). PRs target `staging` or `master`.
- **Do not commit** unless the user explicitly asks.

## 7. Where to go next

| Task | Next file |
|---|---|
| Backend feature, API, migration, or bug fix | [`onecgiar-pr-server/AGENTS.md`](./onecgiar-pr-server/AGENTS.md) |
| Frontend feature, component, route, or style | [`onecgiar-pr-client/src/AGENTS.md`](./onecgiar-pr-client/src/AGENTS.md) |
| Product requirements / acceptance criteria | [`docs/prd.md`](./docs/prd.md) |
| UI/UX system design | [`docs/system-design/design.md`](./docs/system-design/design.md) |
| Technical architecture / data model | [`docs/detailed-design/detailed-design.md`](./docs/detailed-design/detailed-design.md) |
| Bilateral payload contract | [`onecgiar-pr-server/docs/bilateral-result-summaries.en.md`](./onecgiar-pr-server/docs/bilateral-result-summaries.en.md) |

## 8. Domain context for agents

This section stores the product and institutional context an agent needs to reason about PRMS features without re-researching it every task.

### 8.1 What is CGIAR / OneCGIAR?

- **CGIAR** is the world's largest publicly funded global agricultural research-for-development partnership. It is a consortium of independent Research Centers (e.g., CIMMYT, IRRI, ILRI, CIAT/Alliance, CIFOR-ICRAF, WorldFish).
- **OneCGIAR** is the unified reform of CGIAR (started 2021) that replaces the previous "CGIAR Research Programs" (CRPs) structure with a single portfolio organized around Science Programs, Accelerators, and Initiatives.
- CGIAR's 2030 Strategy targets five Impact Areas: Nutrition/health/food security; Poverty reduction/livelihoods/jobs; Gender equality/youth/social inclusion; Climate adaptation/mitigation; Environmental health/biodiversity.

### 8.2 Science Programs, Accelerators, and Initiatives

- **Science Programs** are the major thematic funding and research units of the 2025-2030 portfolio (e.g., Climate Action, Breeding for Tomorrow, Sustainable Farming, Policy Innovations, Digital Transformation).
- **Accelerators** are cross-cutting enablers (e.g., Scaling for Impact, Capacity Sharing, Gender Equality and Inclusion) designed to speed uptake and equity across Programs.
- **Initiatives** are the concrete, time-bound projects that Centers and partners execute. They are the level at which most PRMS result data is owned and reported.
- A **Center** is one of the CGIAR research institutes. A result is usually led by one Center and can be contributed to by others.

### 8.3 Theory of Change (ToC)

- A **Theory of Change** is a causal pathway model: "If we do X, then Y will happen, leading to impact Z." It links activities → outputs → outcomes → impact.
- In CGIAR, each Program/Accelerator/Initiative has an approved ToC. PRMS does not author ToCs; it consumes them from an external ToC service and lets users align a result to specific ToC nodes (work packages, outcomes, outputs).
- When a submitter reports a result, they map it to ToC elements so portfolio leads can show how individual results contribute to higher-level objectives.

### 8.4 What is a "result" in PRMS?

A result is a discrete, verifiable research-for-development output or outcome reported by an Initiative/Center. PRMS supports typed results:

| `ResultTypeEnum` value | Type | Rough meaning |
|---|---|---|
| 1 | Policy change | Policy/institutional change informed by CGIAR science |
| 2 | Innovation use | Adoption/use of an innovation by partners/beneficiaries |
| 3 | Capacity change | Individuals/organizations trained or capacitated |
| 4 | Other outcome | Other outcome not captured above |
| 5 | Capacity sharing for development | Training/capacity development for partners |
| 6 | Knowledge product | Peer-reviewed paper, dataset, report, etc. (linked via repository handle) |
| 7 | Innovation development | New technology, tool, variety, practice under development |
| 8 | Other output | Other output |
| 9 | Impact contribution | Contribution to long-term impact claims |
| 10 | Innovation use (IPSR) | Use tracked inside an Innovation Package |
| 11 | Complementary innovation | Supporting innovation within an IPSR pathway |

Every result shares common fields: title, reporting phase/year, result level, ToC alignment, geography, contributing centers/partners, evidence, DAC cross-cutting scores, and review status.

### 8.5 The result reporting flow

The frontend flow is:

1. **Create** — `pages/results/pages/result-creator/`. User picks an Initiative, result level, and result type, then creates the result shell.
2. **Fill detail sections** — `pages/results/pages/result-detail/`. A multi-section editor covers:
   - General information
   - Theory of Change alignment (`rd-theory-of-change`)
   - Contributors and partners (`rd-contributors-and-partners`)
   - Geographic location (`rd-geographic-location`)
   - Evidence (`rd-evidences`)
   - Links to other results (`rd-links-to-results`)
   - Type-specific page (`rd-result-types-pages/<type>-info`) depending on `ResultTypeEnum`
3. **Green checks / completeness** — `GreenChecksService` tracks which required sections are complete per result type.
4. **Share / request access** — Collaborators from other Initiatives can be invited via the share-request modal.
5. **Submit for QA** — Submitter moves the result from `Editing` (1) to `Quality Assessed` (2) and then `Submitted` (3). Transitions are recorded in `result-review-history`.
6. **QA review** — `pages/quality-assurance/`. QA reviewers open a result-review drawer, add structured comments, and approve or reject.
7. **Portfolio consolidation** — PMU/portfolio leads use `pages/type-one-report/`, `pages/ipsr-framework/`, and `pages/global-narratives/` to compile the final portfolio narrative per phase.

Status values from `onecgiar-pr-server/src/shared/constants/result-status.enum.ts`:

| Status | ID | Meaning |
|---|---|---|
| Editing | 1 | Draft, being filled by submitter |
| Quality Assessed | 2 | Passed internal QA check |
| Submitted | 3 | Submitted to portfolio/PMU |
| Discontinued | 4 | No longer reported |
| Pending Review | 5 | Bilateral/external result awaiting review |
| Approved | 6 | Bilateral/external result approved |
| Rejected | 7 | Bilateral/external result rejected |

### 8.6 Who reports and why?

| Persona | Role | Why they report |
|---|---|---|
| **Result submitter** | Initiative/Center staff | To document what the Initiative produced, attach evidence, and meet the reporting deadline. |
| **QA reviewer** | Internal quality reviewer | To validate completeness, evidence, and ToC alignment before the result is locked. |
| **PMU / portfolio lead** | Program Management Unit | To aggregate results, run Type-One Reports, and report upwards to donors and the CGIAR System. |
| **Platform admin** | System administrator | To manage phases, users, roles, CLARISA syncs, and recover deleted data. |
| **Bilateral / platform consumers** | Downstream systems/funders | To read stable typed payloads (`/api/bilateral/*`, `/api/platform-report/*`) for dashboards and reports. |

### 8.7 How the pieces connect

```text
CGIAR 2030 Strategy
       │
       ▼
Science Programs + Accelerators (thematic/cross-cutting)
       │
       ▼
Initiatives (time-bound projects executed by Centers & partners)
       │
       ▼
Results (typed outputs/outcomes reported in PRMS per phase)
       │
       ├──► ToC alignment ──► Shows contribution to Program outcomes
       ├──► Evidence ───────► Links to publications, datasets, handles
       ├──► Partners/Geo ───► Attribution and reach
       └──► DAC scores ─────► Cross-cutting scoring (gender, youth, climate, etc.)
       │
       ▼
QA review ──► Submission ──► Type-One Report / bilateral export / platform report
```

PRMS sits in the middle: it structures the results, enforces quality gates, and emits stable payloads for downstream reporting and accountability to funders.
