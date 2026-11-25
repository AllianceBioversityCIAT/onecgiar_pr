# Requirements — Innovation Use 2026: total use per category + "Of which NEW"

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results` (Innovation Use, type 2) · `bilateral` (W3 full metadata) · `ipsr` (step 3) · `versioning` |
| Spec path | `changes/innovation-use-2026-total-and-new-users` |
| Type | Change |
| Deliverable | software |
| Depth | **Full** — data cleanup in PROD, migration, phase replication, bilateral `/version` behaviour |
| Approval Mode | gated (inherited from `proposal.md` v2, approved 2026-11-25) |
| Status | approved (2026-11-25) |
| Ticket | INC-169264 (Freshservice) |
| Sources | `proposal.md` v2 (N-1..N-17, D-1..D-20) · Claude Design mockup v2 https://claude.ai/artifact/JbnfFXKHq5GRwUyrSNTveL (version 15) |
| Delivery | **PR-1** (no migration, target Fri 2026-11-27) · **PR-2** (migration, week of 30-Nov). Each requirement is tagged `[PR-1]` or `[PR-2]` |
| ID prefix | `IU26` |
| Cross-refs | `docs/prd.md` US-S2, US-S5, G1, G2, AC-1, AC-4, AC-5 · `docs/ux-ui/design.md` result detail → Innovation use · `docs/trd/trd.md` §Versioning, W2 Phase rollover · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |

## 2. Executive Summary

From 2026, Innovation Use reports **the total use in the reporting year, supported by 2026 evidence**, instead of a cumulative "previous + new users added" figure.

- Each 2026 result shows:
  - the previous phase's figures per category, as reference;
  - a required narrative on how use changed;
  - read-only totals per category, calculated from the rows.
- Rows start empty in every new phase copy. The 217 copies already made and never edited are emptied, after a backup.
- Pooled-funding results (W1/W2) and IPSR step 3 also get an optional "Of which NEW" number per row (PR-2).
- W3/Bilateral gets the screen changes only. Nothing changes in what `/api/bilateral/*` accepts or returns.

## 3. Glossary

| Term | Meaning |
|---|---|
| **2026 result** | A result whose phase has `phase_year >= 2026` |
| **Current use rows** | Actor, organization and "other quantitative measure" rows of the current-use section (not the 2030 Use Projection) |
| **CUU** | The "Current Use Update" block: previous reported use + narrative |
| **Previous phase** | The phase the result was copied from (the result's `previous_result_id`) |
| **Category** | Actors - individuals · Households · Organizations · Other quantitative measures (one line per unit) |
| **Households row** | An actor row of type Farmers/(agro)pastoralists/herders/fishers whose "Do the reported numbers refer to households or individual actors?" answer is Households |
| **NEW** | The optional "Of which NEW users" (actors) / "Of which NEW" (organizations, measures) number on a row |
| **TBD** | The "This is yet to be determined" option (W1/W2) / "Innovation Use to be Determined = Yes" (W3) |
| **Copied result** | A 2026 result created by phase replication from a 2025 result |
| **Never-edited copied row** | A current-use row of a copied result whose values still equal its 2025 origin row |
| **Screen MDS** | The W3 form's submit checklist ("fields missing") — not the API MDS of `POST /api/bilateral/create` |

## 4. System Context & Scope

### 4.1 Today

| Today | Evidence |
|---|---|
| The CUU asks for "New users added during this reporting period" (required), shows "Total cumulative current use to date" and blocks on a mismatch | `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.html:28-82` |
| The CUU sits **below** the top question and its TBD option | `innovation-use-form.component.html:1-29` |
| The previous reported use is actors only | `onecgiar-pr-server/src/api/results/summary/summary.service.ts:499-515` |
| W3 renders the same CUU, and its screen MDS item `use-current-update` requires new users + narrative | `pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.ts:304-349, 1032-1047` |
| W3 reads the previous use from the internal `results/summary` endpoint | `summary.service.ts:463` |
| `/api/bilateral/*` neither accepts nor returns any CUU field | grep of `onecgiar-pr-server/src/api/bilateral` for `current_use_previous` → 0 hits; `create-bilateral.dto.ts` has no `new_users_added` |
| Phase replication copies current-use actor, measure and organization rows | `onecgiar-pr-server/src/api/versioning/versioning.service.ts:358-374, 743-749` (IPSR `:799-801`) · `UNVERIFIED — confirm at source before relying on it` for the exact column/section handling (Premise Ledger in `design.md`) |
| The "Depending on the innovation…" alert is the description of `[innovation-use-form]-core-innovation`. The 2030 copy carries the same sentence separately | `onecgiar-pr-client/src/app/shared/services/fields-manager.service.ts:318-324` · `internationalization/innovation-use-2030-projection.copy.ts:13` |
| PROD 2026-11-24: copied 2026 IU results with copied actor rows = W1/W2 Editing 175 (6 edited after copy), W1/W2 status 4 = 1, W3 Editing 48 (0 edited) | Santiago's read query (session screenshot). **`UNVERIFIED` as a requirement input** — re-counted by the cleanup task's dry run before anything is deleted |

### 4.2 In scope

| Surface | PR-1 | PR-2 |
|---|---|---|
| W1/W2 Innovation Use form (shared `innovation-use-form`, `isIpsr=false`) | Items 1–5, CUU move, copy | NEW |
| W3/Bilateral full metadata (`type-innovation-use`) | Items 1–5, CUU move, copy, screen MDS | — (no NEW ever, D-15) |
| Phase replication (W1/W2, W3 incl. `POST /api/bilateral/version`) | Stop copying current-use rows | — |
| IPSR step 3 "Current use of the core innovation" | — | Totals, NEW, previous use, empty start, copy |
| PROD cleanup of copied rows | Script + backup + dry run | — |
| QA field catalog, review drawer, result PDF | — | NEW shown; removed fields hidden for 2026 |

### 4.3 Out of scope

- IPSR step 1 (2030 ambition) and the 2030 Use Projection block.
- Results with `phase_year < 2026`.
- NEW on W3/Bilateral in the UI, the bulk upload or the API.
- Narrative and Households total on IPSR.
- Excel export changes.
- Deleting stored `new_users_added` / narrative data.
- Green-check SQL changes, unless a design premise shows one reads a removed field.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter (W1/W2) | Sees 2025 figures as reference, reports 2026 totals from empty rows, may add NEW (PR-2) |
| Centre W3 editor | Same screen changes without NEW; can submit with the narrative only |
| IPSR submitter | Step 3 gets totals, NEW, previous use and an empty start (PR-2) |
| QA reviewer / PMU | Totals and NEW in the drawer and PDF (PR-2) |
| Bilateral consumer / Fetcher (Juanda) | No field change; `/version` copies no current-use rows (change log) |
| Platform admin (Santiago) | Runs the cleanup in PROD with a backup |
| Product (Nicoleta Trifa, Marc Schut) | Owners of the ticket; receive the plan |

User stories (refine US-S2, US-S5):
- **IU26-US-1** As a W1/W2 or W3 submitter, I want to report 2026 use from scratch, with last year's figures beside me for reference only, so that I never re-report a cumulative number.
- **IU26-US-2** As a submitter, I want totals per category to be calculated from my rows, so that I do not type the same number twice.
- **IU26-US-3** As a pooled-funding or IPSR submitter, I want to say how many of the 2026 users are new, so that growth is visible without double counting.
- **IU26-US-4** As PMU, I want existing 2026 copies emptied of untouched 2025 rows, so that 2025 figures are not reported again as 2026 use.

## 6. Functional Requirements

### Requirement IU26-R-1: Phase and surface gate `[PR-1]`

Every behaviour in this spec SHALL apply only to results whose phase has `phase_year >= 2026`. It SHALL apply to the current-use section of W1/W2 and W3 and, from PR-2, to IPSR step 3.

#### Scenario: 2025 result unchanged
- GIVEN an Innovation Use result in a phase with `phase_year = 2025`
- WHEN the submitter opens Innovation use info
- THEN the form shows exactly today's labels and order (no CUU: the CUU was never shown before 2026, P-11 — amended 2026-11-25, approved by Santiago)
- BUT it must NOT show totals per category, NEW fields or the new labels

#### Scenario: IPSR step 1 and 2030 untouched
- GIVEN a 2026 innovation package at step 1, or the 2030 Use Projection block of a 2026 result
- WHEN it renders
- THEN it is identical to today, including the "Depending on the innovation…" sentence in the 2030 copy
- AND IT MUST NOT gain totals, NEW fields or "– total" labels

### Requirement IU26-R-2: Remove the cumulative fields `[PR-1]`

On W1/W2 and W3 2026 results, the system SHALL no longer show "New users added during this reporting period", "Total cumulative current use to date" or the cumulative mismatch error.

#### Scenario: Cumulative inputs gone
- GIVEN a 2026 copied result whose previous phase reported actors
- WHEN the CUU renders
- THEN no "New users added" input, no "Total cumulative current use to date" line and no mismatch alert are shown
- AND saving or submitting is never blocked by a cumulative mismatch
- BUT values already stored in `new_users_added` MUST be kept unchanged in the database

### Requirement IU26-R-3: CUU placement and visibility `[PR-1]`

The CUU SHALL render **above** the 2026 question ("Innovation use in 2026 supported by evidence…" on W1/W2; above "Innovation Use to be Determined" on W3). It SHALL render when the previous phase reported at least one current-use actor, organization or measure.

#### Scenario: Shown above the question
- GIVEN a 2026 copied result whose previous phase reported actors
- WHEN the form renders
- THEN the CUU appears before the 2026 question and its TBD option

#### Scenario: Previous phase had organizations only
- GIVEN a 2026 copied result whose previous phase reported organizations but no actors
- WHEN the form renders
- THEN the CUU is shown with "Organizations: N"

#### Scenario: TBD selected
- GIVEN the CUU is shown
- WHEN the submitter selects TBD
- THEN the CUU and its narrative stay visible and required
- AND the totals, guidance and rows below the question are hidden, as today

#### Scenario: First report
- GIVEN a 2026 result with no previous phase, or whose previous phase had no current-use rows
- WHEN the form renders
- THEN no CUU and no narrative are shown or required

### Requirement IU26-R-4: Previous reported use per category `[PR-1]`

The CUU SHALL list the previous phase's current-use figures as reference, under the label "Previous reported use (FY<year> · for reference only)":
- **Actors:** one total of all actor rows, households and individuals together;
- **Organizations:** total;
- **Other quantitative measures:** one line per unit with its quantity.

A category with no data is omitted.

#### Scenario: All categories
- GIVEN the previous phase had actors totalling 2,600, organizations totalling 9 and a measure "Hectares" of 4,100
- WHEN the CUU renders
- THEN it shows "Actors: 2,600", "Organizations: 9" and "Other quantitative measures: Hectares 4,100"
- BUT it must NOT split 2025 actors into individuals and households
- AND IT MUST read only current-use rows of the previous phase, never its 2030 projection rows

#### Scenario: Two units
- GIVEN previous measures "Hectares 4,100" and "Trees planted 500"
- THEN both lines appear under "Other quantitative measures" and they are never added together

### Requirement IU26-R-5: Narrative `[PR-1]`

When the CUU is shown, the narrative SHALL be labelled "Brief narrative on how use changed in 2026", be required, and be limited to 100 words. On W3, the screen-MDS item for the CUU SHALL be satisfied by the narrative alone.

#### Scenario: W3 submit checklist
- GIVEN a 2026 W3 result with a CUU and an empty narrative
- WHEN the submitter opens the submit checklist
- THEN the CUU item is listed as missing
- AND once the narrative is filled the item is complete
- BUT it must NOT require "New users added" or report a mismatch

#### Scenario: Word limit
- GIVEN the narrative has 101 words
- THEN the form shows the existing word-limit error and the field is not complete

### Requirement IU26-R-6: Top question copy `[PR-1]`

On W1/W2 2026 results, the top question SHALL read "Innovation use in 2026 supported by evidence (calculated from the categories below)". "This is yet to be determined" SHALL stay. The "Depending on the innovation, users may be groups of actors or be organizations. Multiple actors or organizations can be selected." alert SHALL NOT be shown.

The `2026` in labels SHALL be the result's phase year. In this release it is always 2026.

#### Scenario: Copy
- GIVEN a 2026 W1/W2 result
- THEN the question shows the new text and the TBD option
- BUT the "Depending on the innovation…" alert must NOT appear in the current-use section

### Requirement IU26-R-7: Totals per category `[PR-1 — cut line]`

Below the question (W1/W2) or below "Innovation Use to be Determined" (W3), the system SHALL show read-only totals calculated from the current rows. They SHALL update as rows change and SHALL never be stored:

| Category | Sum of |
|---|---|
| Actors - individuals | "How many – total" of every actor row that is not a Households row |
| Households | "How many – total" of Households rows |
| Organizations | "How many – total" of organization rows |
| Other quantitative measures | "Quantity – total" per unit, one line per unit; units are matched by trimmed, case-insensitive text |

A category without rows SHALL get no tile. The sentence "Calculated from the rows below…" SHALL NOT be shown. The totals SHALL be hidden when TBD is selected.

#### Scenario: Mixed actors
- GIVEN a Farmers row answered Households with total 1,200, a Farmers row answered Individual actors with total 1,800 and an Extension agents row with 45
- THEN "Actors - individuals" shows 1,845 and "Households" shows 1,200
- AND IT MUST NOT add households and individuals into one number

#### Scenario: Units never mixed
- GIVEN measure rows "Hectares 5,400", "hectares 100" and "Trees planted 2,000"
- THEN "Other quantitative measures" shows Hectares 5,500 and Trees planted 2,000

#### Scenario: Cut line
- GIVEN PR-1 must ship without this requirement
- THEN IU26-R-2..R-6 and R-8..R-10 still ship and this requirement moves to PR-2 unchanged

### Requirement IU26-R-8: Row labels, description and guidance `[PR-1]`

On 2026 current-use rows (W1/W2, W3; IPSR step 3 in PR-2):
- "How many" SHALL read "How many – total";
- "Quantity" SHALL read "Quantity – total";
- the actor description SHALL drop the word "expected" ("…please specify the innovation use at organizational level or other use…").

The guidance from the ticket SHALL be shown above the rows:
- on W1/W2, the sentence about entering new users into "Of which NEW users" SHALL appear only once the NEW field exists (PR-2);
- on W3 it SHALL never appear.

#### Scenario: W3 guidance
- GIVEN a 2026 W3 result
- THEN the guidance starts "Report 2026 use only." and contains no sentence about "Of which NEW users"

#### Scenario: "expected" only removed in 2026 current use
- GIVEN the 2030 Use Projection, IPSR step 1 or a 2025 result
- THEN their descriptions keep the word "expected"

### Requirement IU26-R-9: Rows start empty in a new phase `[PR-1; IPSR in PR-2]`

When a result is replicated into a new phase whose `phase_year >= 2026`, the system SHALL NOT copy its current-use actor, Innovation Use organization and measure rows. All other replicated data SHALL be copied as today, including the 2030 projection rows, the innovation-use answers and the result's partner organization rows (stored in the same table under other roles). This applies to W1/W2, to W3 including `POST /api/bilateral/version`, and (PR-2) to IPSR step 3 rows.

#### Scenario: New copy
- GIVEN a 2025 Innovation Use result with 3 actor rows, 1 organization row and 1 measure row in current use, and 2 rows in the 2030 projection
- WHEN it is replicated into 2026
- THEN the 2026 result has 0 current-use rows and the same 2 projection rows
- AND the result's partner organization rows are copied as today
- AND the CUU of the 2026 result shows the 2025 figures
- BUT the 2025 result's rows MUST stay untouched

#### Scenario: Bilateral version endpoint
- GIVEN a W3 result replicated through `POST /api/bilateral/version`
- THEN the same rule applies, and the response shape is unchanged
- AND IT MUST be recorded in the contract change log of `bilateral-result-summaries.en.md`

### Requirement IU26-R-10: Clean the existing copies `[PR-1, run by the platform admin]`

For Innovation Use results already copied into 2026 and still in Editing, the system owner SHALL remove the current-use rows that still equal their 2025 origin row. Before anything is removed:
- the rows SHALL be copied into a backup table;
- a dry run SHALL report the counts per source (W1/W2, W3) and status.

#### Scenario: Only untouched rows
- GIVEN a copied 2026 result whose actor rows all equal their 2025 origin
- WHEN the cleanup runs
- THEN its current-use rows are soft-removed and backed up
- BUT results with any edited current-use row, results not in Editing (e.g. discontinued), 2030 rows and partner organization rows MUST NOT be touched
- AND IT MUST run only after IU26-R-9 is live in PROD
- AND IT MUST print before/after counts that match the dry run

### Requirement IU26-R-11: "Of which NEW" on W1/W2 `[PR-2]`

Every 2026 W1/W2 current-use row SHALL offer one optional whole number:
- actors: "Of which NEW users (optional)";
- organizations and measures: "Of which NEW (optional)".

The number SHALL be ≥ 0 and ≤ the row total. It SHALL be stored, never copied at replication, and it SHALL have no sex or age split. Each category total SHALL show "of which new: N", the sum of the NEW given in that category, or "of which new: not available" when no row in that category gives one.

#### Scenario: NEW above total
- GIVEN an actor row with total 120
- WHEN the submitter types 150 in NEW
- THEN the field is marked invalid with "New users (150) cannot be higher than the total (120)."
- AND the result cannot be submitted while the error stands
- BUT an empty NEW is valid and never required

#### Scenario: Disaggregated row
- GIVEN an actor row with women/men/youth inputs and Total 1,800
- THEN NEW is a single input compared with 1,800
- AND IT MUST NOT ask for women, men or youth new users

### Requirement IU26-R-12: W3 and the bilateral API stay unchanged `[PR-1, PR-2]`

W3/Bilateral results SHALL have no NEW field and no "of which new" line. The input DTO, the response payloads and the API MDS of `/api/bilateral/*` SHALL stay field-for-field identical. The only documented change is IU26-R-9's `/version` behaviour.

#### Scenario: Payload unchanged
- GIVEN the same W3 result before and after the change
- WHEN it is read through `/api/bilateral/*`
- THEN the response has the same fields

### Requirement IU26-R-13: IPSR step 3 `[PR-2]`

For 2026 innovation packages, step 3 "Current use of the core innovation" SHALL:
- show "Innovation use in 2026 supported by evidence (calculated from the categories below)";
- show totals for Actors - individuals, Organizations and Other quantitative measures (per unit);
- label rows "How many – total" / "Quantity – total" and give each row one optional NEW (IU26-R-11 rules);
- drop "expected" from the actor description;
- show the previous package's step 3 figures per category as reference (IU26-R-4 rules);
- start empty in a new phase (IU26-R-9).

#### Scenario: No narrative, no households
- GIVEN a 2026 package that had a 2025 version
- THEN step 3 shows the previous figures
- BUT it must NOT show a narrative or a Households total

### Requirement IU26-R-14: Review surfaces `[PR-2]`

The QA field catalog, the result-review drawer and the result PDF SHALL show NEW per row and the category totals for 2026 W1/W2 and IPSR results. They SHALL stop showing "New users added" and "Total cumulative" for 2026 results.

#### Scenario: Drawer
- GIVEN a 2026 W1/W2 result with NEW 300 on a Households row
- WHEN a QA reviewer opens the review drawer
- THEN the row shows "Of which NEW users: 300"

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | `/api/bilateral/*` fields unchanged (AC-4). 2025 and earlier results render byte-identical copy and order (AC-5) |
| Data safety | Cleanup is reversible from the backup table; no hard delete of source rows; migration columns nullable, default NULL |
| Performance | Previous-use read adds at most one query per category per result read; no N+1 per row |
| Accessibility | New inputs have visible labels; invalid NEW sets `aria-invalid` and an error text linked to the field; totals are text, not images |
| i18n / copy | New strings live in the client copy files (`internationalization/`) or `fields-manager.service.ts`, as today |
| Security | No secrets or tokens in logs or SQL scripts (`.cursorrules`) |
| Observability | The cleanup prints dry-run and final counts per source and status |

### 7.1 Defect classes and their gates

| Defect class | Gate |
|---|---|
| Copy or order regression on 2026 forms | Scoped client Jest (`--maxWorkers=2`, related specs) asserting rendered text and order |
| Phase gate leak (2025 or IPSR step 1 changed) | Client Jest with a 2025 fixture and `isIpsr=true`; PRTest check of a 2025 result and package step 1 |
| Type contract errors (new fields on models) | `npm run build` (client) / `npx tsc` (server); the test runner is not enough (R-5) |
| Replication copies current-use rows, or drops 2030 rows | Server Jest on `versioning.service` with current-use + projection fixtures |
| Bilateral payload drift | Server Jest on the bilateral read mapper + a grep showing that the DTO and response types are unchanged |
| Cleanup touches the wrong rows | **No automated gate in PROD.** Substitute: dry-run counts reviewed by Santiago at the HITL pause before the delete, backup table, and before/after counts |
| Migration pending or wrong | `npm run migration:check` |
| Totals grid layout breaks (wrapping, starving columns) | **No automated gate** (jsdom cannot measure layout). Substitute: human visual check on PRTest at desktop and ~1024 px at the HITL pause, against mockup v2 |
| NEW validation bypass | Client Jest on the validator; server DTO validation test |

## 8. Requirement ID Index

| ID | Title | PR |
|---|---|---|
| IU26-R-1 | Phase and surface gate | 1 |
| IU26-R-2 | Remove the cumulative fields | 1 |
| IU26-R-3 | CUU placement and visibility | 1 |
| IU26-R-4 | Previous reported use per category | 1 |
| IU26-R-5 | Narrative + W3 screen MDS | 1 |
| IU26-R-6 | Top question copy | 1 |
| IU26-R-7 | Totals per category | 1 (cut line → 2) |
| IU26-R-8 | Row labels, description, guidance | 1 |
| IU26-R-9 | Rows start empty in a new phase | 1 (IPSR → 2) |
| IU26-R-10 | Clean the existing copies | 1 |
| IU26-R-11 | "Of which NEW" on W1/W2 | 2 |
| IU26-R-12 | W3 and bilateral API unchanged | 1, 2 |
| IU26-R-13 | IPSR step 3 | 2 |
| IU26-R-14 | Review surfaces | 2 |

## 9. Dependencies & Assumptions

- Upstream: versioning (phase replication), results summary read, v2 innovation-use service, legacy W3 save path, IPSR step 3 service, pdf-viewer repo (PDF).
- Downstream: Fetcher (`/version` behaviour notice to Juanda), QA reviewers, PMU reports.
- Assumption A-1: the 2025 → 2026 link of a copied result is available on the result (`previous_result_id`) — verified for Innovation Use in `summary.service.ts:503-505`. It is `UNVERIFIED` for IPSR (R-10 in the proposal, settled in `design.md`).

## 10. Open Questions

None left for product. The design premises (replication internals, IPSR previous link) are settled in the `design.md` Premise Ledger.
