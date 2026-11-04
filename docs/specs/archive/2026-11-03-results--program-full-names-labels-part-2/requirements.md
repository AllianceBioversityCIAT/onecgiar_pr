# Module Spec — `requirements.md`

## 1. Document Control

- **Module:** `results` (cross-module labels: ipsr, admin-panel completeness, contribution-to-indicators, bilateral review history, share-request notifications, bilateral-ai, shell/admin/result-detail client sites)
- **Sub-feature:** `program-full-names-labels-part-2`
- **Depth:** Standard · **Type:** Change · **Approval Mode:** gated · **Status:** `approved` (2026-10-13)
- **Source:** `proposal.md` (same folder) · request by Nicoleta Trifa (no Jira)
- **Extends:** Part 1, `docs/specs/archive/2026-10-13-results--program-full-names-labels/` (rule `scienceProgramLabel`, pipe `spLabel`, DD-5 "exports keep code")

## 2. Executive Summary

Every remaining screen that prints a Science Program / Accelerator (P/A) as a bare code SHALL print the P/A label `CODE - Name`. For server-fed sites the API adds the name as a **new, additive field**. Codes, ids, filter values, routing keys and export columns stay as they are. The IPSR package header, which renders blank today, SHALL show the submitter label.

## 3. Glossary

| Term | Meaning |
|---|---|
| P/A label | `CODE - Name`, built by Part 1's shared rule. Name fallback: `name` → `initiative_name` → `short_name`; with no name, just `CODE`; with neither, the site's existing placeholder |
| Site | One UI place listed in §4 |
| Additive field | A new response property; no existing property is renamed, retyped or removed |

## 4. Scope

| # | Site | Data | Priority |
|---|---|---|---|
| M1 | IPSR Innovation Package list: Submitter column (+ update-IPSR modal rows) | server | Must |
| M2 | Completeness status (admin + init-admin): Submitter column | server | Must |
| M3 | Outcome-indicator details table: Submitter column (API rows + rows added from the results modal) | server | Must |
| M4 | Bilateral review history (results list panel + rejection notice) | server | Must |
| M5 | IPSR package detail header: Submitter (blank today) | client | Must |
| M6 | IPSR step 2: complementary-innovations Lead column | client | Must |
| S1 | IPSR creator innovation picker Lead column; selected-core chip; step-1 core chip; step-2 selected-innovation chips | server | Should |
| S2 | IPSR request notifications (requester / approver program mentions) | server | Should |
| S3 | Bilateral AI job cards (program code under the title + fallbacks) | server, `/api/bilateral/*` contract | Should |
| S4 | Client-only leftovers: shell-topbar + header-panel role menu; result-detail contributors SP chips (P25); update-notification; manage-user-modal entity label; phase-detail open/close toast; bilateral primary-assignment banners; IPSR program filter option labels; lab-report-form ToC-branch SP select | client | Should |

- **Out:** Excel/CSV exports (code column kept, Part 1 DD-5); dropdowns already on the legacy `CODE - <b>short</b> - Name` format; sites showing `CODE short_name`; the compact header `bell-program-chip`; Center acronyms.

## 5. Stakeholders / Personas

| Persona | Sites |
|---|---|
| SP / PMU leads | M1, M3, M5, M6, S1, S2, S4 |
| Platform admins | M2, S4 (user management, phase toast) |
| Centers / bilateral reviewers | M4, S3, S4 (banners) |

## 6. Functional Requirements

### PF2-R-1 — Server returns the P/A name with the code

Every server response feeding M1–M4 and S1–S3 SHALL carry the P/A name next to the existing code.

#### Scenario: Name added additively

- GIVEN a result whose submitting P/A is `SP10` / `Gender Equality and Inclusion`
- WHEN the client calls the endpoint behind any of M1–M4, S1–S3
- THEN the row carries the existing code field unchanged, plus a name field equal to `Gender Equality and Inclusion`
- BUT it must NOT rename, retype or remove any existing field, change row count, order, filtering or paging
- AND IT MUST return the name as `null`/absent (never the string `"null"`) when the P/A has no name

#### Scenario: Shared queries keep their other callers intact (M3, S2, M4)

- GIVEN a query also used by an export, the results notifications flow or a webhook
- WHEN the name column is added
- THEN those callers' outputs keep their existing fields and values
- BUT the outcome-indicator export columns must NOT change (Part 1 DD-5)

### PF2-R-2 — Sites render the P/A label

Every site M1–M6, S1–S4 SHALL render the P/A label instead of the bare code.

#### Scenario: Table column (M1, M2, M3, M6, S1 picker)

- GIVEN a row with code `SP10` and name `Gender Equality and Inclusion`
- WHEN the table renders
- THEN the cell shows `SP10 - Gender Equality and Inclusion`
- AND IT MUST stay on one line with an ellipsis and expose the full label as `title` when it overflows
- BUT sorting, filtering and search must NOT change behavior; search additionally matches the name

#### Scenario: Chip / header / inline mention (M4, M5, S1 chips, S2, S3, S4)

- GIVEN a chip, header field, banner or sentence that prints only the code today
- WHEN it renders
- THEN it prints the P/A label
- BUT routing keys, ids, query params and selected filter values must NOT change

#### Scenario: Dropdown option labels (S4: IPSR program filter, lab-report-form ToC select, manage-user-modal)

- GIVEN a P/A dropdown whose label is the code, `CODE Name`, `CODE short_name` or the legacy HTML `full_name`
- WHEN the user opens it or sees the applied chip
- THEN options and chips read `CODE - Name`
- AND typing the code or part of the name finds the option
- BUT the option **value** must NOT change

#### Scenario: IPSR package header no longer blank (M5)

- GIVEN an innovation package whose detail returns `initiative_official_code = SP05` and `initiative_name = Better Diets and Nutrition`
- WHEN the package detail page renders
- THEN the Submitter header reads `SP05 - Better Diets and Nutrition`
- BUT it must NOT render an empty value when the code is present

### PF2-R-3 — Fallback and single rule

All sites SHALL build the label through Part 1's shared rule (`scienceProgramLabel` / `spLabel`), separator `" - "`.

#### Scenario: Name missing

- GIVEN a row with code `SP10` and no name (e.g. a locally created IPSR row `INIT-012`, or an AI job whose code matches no P/A)
- WHEN the site renders
- THEN it shows only the code
- AND IT MUST never show `SP10 - `, `undefined` or `null`
- AND with neither code nor name the site keeps its current placeholder

### PF2-R-4 — Bilateral contract documented (S3)

The AI-jobs payload change SHALL be recorded in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.

#### Scenario: Contract change-log

- GIVEN the AI-job list/item gains a program-name field
- WHEN the change ships
- THEN the contract doc lists the field and has a dated change-log row
- BUT the existing job fields and their types must NOT change

## 7. Non-Functional Requirements

| NFR | Rule |
|---|---|
| Additive only | No schema, migration, endpoint or route change. New response fields only (PF2-R-1) |
| Performance | No per-row query: names come from the existing join/subquery, or from one batched lookup per response (S3) |
| Security | No change to auth or filtering. The pre-existing interpolated SQL in `admin-panel.repository.ts` must not gain new interpolated inputs |
| UI | Existing table/chip styles; ellipsis + `title` reuse Part 1's pattern; no new design token |
| Logs | Never log tokens or payload bodies (`.cursorrules`) |

## 8. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Name missing from a response / wrong column | Server Jest: repository/service spec per touched query asserts the new field (scoped `--testPathPattern`) |
| Existing field renamed/removed, other callers broken (exports, notifications, webhook) | Server Jest: existing specs on those callers stay green; review checks the diff is SELECT-additive |
| Site still shows bare code (missed wiring) | Client Jest: one assertion per touched component spec; plus a grep of §4 sites at review |
| `undefined`/`null`/trailing `" - "` leaking | Client Jest via the shared rule (already covered by Part 1) plus one fallback case per new mapper |
| Filter value / routing key / id changed | Client Jest: existing value assertions stay green; selection tests drive the real control (`KZ-results--program-full-names-labels-3`) |
| SQL syntax/runtime error in raw queries (mocks don't execute SQL) | **No automated check** — Jest mocks the DataSource. Substitute: HITL smoke on the local stack against the shared DB (read-only pages) for M1–M3, M4, S1, S2 |
| Bilateral contract drift | Review: contract doc diff + fixture test (S3) |
| Column overflow / wrapping | **No automated check** (jsdom). Substitute: HITL visual check of M1, M2, M3 tables |
| Real data lacking names for some rows | **No automated check.** Accepted; fallback shows the code (PF2-R-3) |

## 9. Requirement ID Index

| ID | Sites |
|---|---|
| PF2-R-1 | M1–M4, S1–S3 |
| PF2-R-2 | M1–M6, S1–S4 |
| PF2-R-3 | all |
| PF2-R-4 | S3 |
