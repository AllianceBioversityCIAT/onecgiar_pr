# Requirements — Bilateral ToC question: project default first, detail on demand

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/toc-default-linkage/` |
| Module code | `BIL-TOC` |
| Type | Change · Depth: **Full** (cross-schema read of `Integration_information`, decision derived from saved rows (no migration), additive `/api/bilateral/*` payload) |
| Approval Mode | gated (inherited from `proposal.md`) |
| Status | **approved — 2026-09-18** |
| Owner | PRMS bilateral team · Requester: Nicoleta Trifa |
| Date | 2026-09-18 |
| Baseline | `docs/prd.md` — **AC-1**, **AC-4**, **AC-6** · `docs/ux-ui/design.md` — bilateral result form, section 2 (Contributors) · `docs/trd/trd.md` — bilateral module, ToC integration read path |
| Intent source | `proposal.md` (2026-09-18) |
| Authoritative external doc | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (change log updated if any `/api/bilateral/*` payload changes) |
| Related | `docs/specs/changes/multi-hlo-result-linking/` (shares the typology rule; disjoint files — different component) |

## Executive Summary

In the bilateral result form, centers often cannot say how their result links to the Program's ToC. The ToC block will first show how the **project** is already linked to the Program's ToC (nodes, indicators, targets), then ask one question: keep that linkage, or go further. **YES** keeps it with no further input. **NO** opens the existing detail flow (level, AoW/HLO/EOI, indicator, target, contribution), where the indicator type must match the result type. Results whose project has no linkage keep today's form.

## Glossary

| Term | Meaning |
|---|---|
| Project linkage | Rows in `Integration_information.toc_result_projects` tying a CLARISA project (`project_id`) to a ToC node (`toc_result_id_toc` = `toc_results.related_node_id`), plus project-specific targets in `toc_result_indicator_target.project_id` |
| Default block | Read-only panel "This is how the project has been linked to this Program's ToC" with the linked nodes and details |
| Leave-as-is question | "Do you want to leave the ToC linkage as is or go further and select more details?" |
| Linkage mode | The answer, derived on read from the saved rows: `project_default` (only default-node rows, no indicator rows) or `custom` (anything else saved); null when nothing is saved. Never stored as its own field |
| Typology | Result type (`result_type_id`) matched against the ToC indicator type, the same rule the pooled flow uses |
| Primary SP | Program with role 1 in `results_by_inititiative`; scopes which ToC the nodes belong to |
| Lead project | The `results_by_projects` row with `is_lead = 1` |

## System Context & Scope

### Context

- **Flow touched:** bilateral result creator, section 2 (`section-contributors` embeds `section-toc`). Save path: `PATCH /api/bilateral/center/toc-mapping/:resultId`; read path: `GET /api/bilateral/center/toc-state/:resultId`.
- **Data touched:** `Integration_information` (read only), `results_toc_result` (+ `results_toc_result_indicators`, `result_indicators_targets`), `results_by_projects`, `clarisa_projects`.
- Today the whole ToC block is optional for "Submit for review" (PO decision 2026-09-09). This spec does not change that.

### In scope

- Default block from the lead project's linkage, filtered to the primary SP's ToC.
- Leave-as-is question with YES / NO; the answer is derived from the saved rows.
- NO branch = current detail flow, with server-side typology validation.
- Fallback to the current form when the project has no usable linkage.
- Reading back a result saved before this change.

### Out of scope

- Classic W1/W2 ToC screen (`rd-contributors-and-partners`, `multiple-wps`).
- Creating or editing project linkage in `Integration_information`.
- Primary SP assignment and the contributing-SP consent flow.
- Making the ToC block mandatory for submit.
- Backfilling existing bilateral results.

## Stakeholders / Personas

| Persona | What changes |
|---|---|
| Center result submitter | Sees the project's existing ToC linkage first; answers one question instead of building the link from scratch |
| Program P/A reviewer | Can tell from the saved rows (derived mode) whether the center kept the project linkage or chose a specific deliverable |
| Bilateral consumer (downstream) | Additive fields only; no removals (AC-4) |

## Functional Requirements

### Requirement BIL-TOC-R-1: Default block

The system SHALL show, for a bilateral result whose lead project has ToC linkage under the result's primary SP, a read-only default block listing each linked node with level (AoW / HLO / EOI), node name, indicator and target.

#### Scenario: Project with linkage

- GIVEN a bilateral result with a primary SP and a lead project linked to two ToC nodes of that SP
- WHEN the ToC block loads
- THEN the default block lists both nodes with their indicators and targets
- AND the leave-as-is question is shown below it
- BUT nodes of a different Program's ToC MUST NOT appear
- AND IT MUST use the project id, never the project name, to find the nodes

### Requirement BIL-TOC-R-2: Leave-as-is question, YES

When the user answers YES, the system SHALL keep the project linkage as the result's ToC linkage without asking for level, node, indicator, target, contribution or narrative, and SHALL record the result as linked to the project's default nodes (mode `project_default`, derived from those rows).

#### Scenario: Keep the default

- GIVEN the default block is visible and no answer is saved
- WHEN the user answers YES
- THEN the detail form stays hidden and the answer autosaves
- AND the result is recorded as linked to the project's default node(s), one active `results_toc_result` row per node
- AND reopening the result shows YES selected
- BUT the system MUST NOT create or change per-result indicator, target or contribution values because of YES
- AND IT MUST keep the saved rows if the project linkage later changes (the answer then reads as NO with those nodes shown, and nothing is deleted)

### Requirement BIL-TOC-R-3: Leave-as-is question, NO

When the user answers NO, the system SHALL show the existing detail flow (Level, ToC result, Indicator, Target, contribution, narrative) and SHALL save the values as today (mode `custom`, derived once an indicator or a non-default node is saved).

#### Scenario: Refine the linkage

- GIVEN the default block is visible
- WHEN the user answers NO
- THEN the Level, ToC result, Indicator, Target and contribution fields appear
- AND the values save through the existing toc-mapping endpoint
- BUT indicators whose type does not match the result's typology MUST NOT be selectable
- AND IT MUST reject a mismatched indicator on the server with a 4xx even if the client allowed it

### Requirement BIL-TOC-R-4: Fallback without project linkage

When the lead project has no linkage under the primary SP, or the result has no project, or the linkage read fails, the system SHALL show the current ToC form unchanged (including "I'm not sure, the P/A will complete the ToC mapping" and the Yes/No "Can this result be mapped to a ToC KPI?").

#### Scenario: No linkage

- GIVEN a result whose lead project has zero rows in `toc_result_projects` for the primary SP's ToC
- WHEN the ToC block loads
- THEN the current form is shown and behaves exactly as before
- BUT the default block and leave-as-is question MUST NOT render
- AND IT MUST NOT show an error to the user when the linkage read itself failed (degrade silently, log server-side)

### Requirement BIL-TOC-R-5: Primary SP prerequisite

The system SHALL keep the "waiting for primary SP" state until a primary SP is persisted, since the default depends on it.

#### Scenario: No primary SP yet

- GIVEN a draft with no saved primary SP
- WHEN the ToC block loads
- THEN the existing waiting state is shown and no default block is rendered

### Requirement BIL-TOC-R-6: Results saved before this change

The system SHALL treat a result that already has an active `results_toc_result` row (node, indicator, or a saved "why reported" text) as mode `custom`, showing the detail form pre-filled.

#### Scenario: Legacy saved mapping

- GIVEN a result with a saved ToC node and indicator and no default-node-only rows
- WHEN it is opened
- THEN the leave-as-is question shows NO and the saved values are displayed
- BUT the system MUST NOT overwrite or deactivate the saved rows on load
- AND IT MUST NOT show the default block as the chosen answer

#### Scenario: Legacy "why reported" (unplanned) row

- GIVEN a result whose only active row has `planned_result = false` and a saved "why reported" text
- WHEN it is opened
- THEN the current fallback form is shown with that text (the new question has no "not mappable" answer)
- BUT the text MUST NOT be deleted or hidden

### Requirement BIL-TOC-R-7: Switching answers

Changing YES to NO SHALL reveal the detail form empty of prior custom values; changing NO to YES SHALL keep saved custom rows untouched until the user confirms discarding them.

#### Scenario: NO to YES with saved details

- GIVEN mode `custom` with a saved indicator and contribution value
- WHEN the user switches to YES
- THEN a confirmation states that the detailed link will be removed
- AND on confirm the custom rows are deactivated (soft, `is_active = false`) and mode becomes `project_default`
- BUT on cancel nothing changes

### Requirement BIL-TOC-R-8: Multiple projects and multiple nodes

The system SHALL derive the default from the lead project only and SHALL list every node that project has under the primary SP's ToC.

### Requirement BIL-TOC-R-9: Read model

`GET toc-state` SHALL additively return the mode, the default block content (or a flag that none exists) and the existing fields, without removing or renaming any current field.

### Requirement BIL-TOC-R-10: Editable states only

The question and the default block SHALL be editable only while the result is editable today (Draft/Editing); otherwise they render read-only with the saved answer.

### Should

- **BIL-TOC-R-11** The block SHOULD show which project the default comes from (project name as label) so a user with several projects understands the source.
- **BIL-TOC-R-12** The default block SHOULD show the target relevant to the reporting year, using the same year rule as the existing target lookup, using the project-specific target when one exists and otherwise the indicator's general target.

## Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | `GET toc-state` MUST stay within +150 ms p95 of today's on a project with up to 25 linked nodes (real data reaches 23); the linkage read MUST be one query or a bounded number of queries independent of node count |
| Security | Endpoints stay JWT-gated and center-scoped as today; no secrets, tokens or connection details in logs |
| Backwards compatibility | Additive on `/api/bilateral/*` (AC-4); change log row added to `bilateral-result-summaries.en.md` if a documented payload changes |
| Data integrity | No hard deletes; deactivation via `is_active`; no schema change, `npm run migration:check` stays green |
| Accessibility | New UI meets WCAG 2.1 AA; YES/NO is keyboard operable and labelled; default block is readable by screen readers |
| Internationalization | New strings follow the existing convention of the bilateral module |
| Observability | Linkage-read failures logged server-side without payload contents |
| Visual | Built with Spartan components (team standing preference) and design tokens from `docs/ux-ui/design.md` §7 |

## Defect classes and the gate that catches each

| Defect class | Caught by |
|---|---|
| Wrong project or wrong Program's nodes shown (join by name, missing SP filter) | Server unit tests on the repository query with two projects sharing a name and nodes from two SPs; **input that fails:** a project whose name equals another's |
| YES silently writes rows or values | Server service test asserting no insert into `results_toc_result_indicators` / `result_indicators_targets` on YES |
| Legacy results flip to YES/default on load | Service test with a legacy row and no default-node-only rows expecting `custom` |
| Typology bypass through the API | Server test posting a mismatched indicator expecting 4xx |
| Fallback broken (no linkage still shows old form) | Client spec for the no-linkage state plus existing `section-toc` specs staying green |
| Cross-schema read wrong in the real DB (column/phase assumptions) | **No automated check in Jest** (mocked). Substitute: hand-off SQL sample queries run by the user against real data (OQ-1) and a manual pass on a real bilateral result at the HITL pause |
| Layout, contrast and focus order of the new block | **jsdom cannot evaluate.** Substitute: visual check in the browser at the HITL pause |

## Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| BIL-TOC-AC-1 | Lead project linked to nodes under the primary SP | Block loads | Default block + question shown (R-1) |
| BIL-TOC-AC-2 | Default visible | User answers YES | Mode `project_default` saved; no detail fields; no per-result indicator rows created (R-2) |
| BIL-TOC-AC-3 | Default visible | User answers NO | Detail flow shown; mismatched typology blocked client and server (R-3) |
| BIL-TOC-AC-4 | No linkage / no project / read error | Block loads | Current form unchanged (R-4) |
| BIL-TOC-AC-5 | No primary SP saved | Block loads | Waiting state (R-5) |
| BIL-TOC-AC-6 | Legacy saved mapping with node and indicator | Opened | Shows NO with saved values; nothing overwritten (R-6) |
| BIL-TOC-AC-7 | Mode `custom` with saved rows | User switches to YES and confirms | Custom rows deactivated, default-node rows written, mode reads `project_default` (R-7) |
| BIL-TOC-AC-8 | Two projects, lead flagged | Block loads | Default comes from the lead project only (R-8) |
| BIL-TOC-AC-9 | Any bilateral consumer | Reads toc-state | Existing fields unchanged; new fields additive (R-9) |
| BIL-TOC-AC-10 | Result not editable | Opened | Read-only answer (R-10) |

## Dependencies & Assumptions

- **Upstream:** `Integration_information` (`toc_result_projects`, `toc_results`, `toc_results_indicators`, `toc_result_indicator_target`), CLARISA project tables, existing `results-toc-results` write path.
- **Downstream:** bilateral detail readers, reports that read `results_toc_result` (see OQ-5).
- **Assumptions (to confirm):**
  - `toc_result_projects.project_id` equals `clarisa_projects.id` (confirmed by the existing join in `aow-bilateral.repository.ts`).
  - Node-to-Program filtering is possible through `toc_results` (Program official code and phase), as in `findBilateralProjectsByProgramOfficialCode`.

## Open Questions

- **BIL-TOC-OQ-1** ~~Sample checks~~ Answered on real data (2026-09-18): (a) `toc_result_indicator_target.project_id` is NULL for 60,094 of 60,303 rows; only 209 rows are project-specific, so most projects have no project-specific target and the block falls back to the indicator's general target (`project_id IS NULL`); (b) one project has several nodes under a Program in most cases: 661 project-programs with 1 node, 1,041 with 2, 341 with 3, and a tail up to 23 nodes; (c) `toc_result_projects` has rows for phase `7baf200a-c958-4ded-9894-6557a94cae18` (2026, current) and `99134294-d7a1-4966-a63e-227c9e29b9fb` (2025), plus 190 links with NULL phase (excluded by the phase filter); (d) no duplicate `(project_id, toc_result_id_toc)` pairs; (e) 3,783 `toc_result_projects` rows point to projects that are not in `clarisa_projects` (irrelevant for results, whose project comes from `results_by_projects`); (f) for the five projects with the most results (194, 192, 74, 146, 43) the 2026 node count per Program is 1 to 4 (e.g. project 194 / SP06: 4 nodes, OUTCOME and OUTPUT; project 146 / SP03: 3 nodes, EOI and OUTPUT), so the 23-node tail is rare for active projects; (g) `EXPLAIN` of the final query (project 194, SP06, phase 2026): full scan of `toc_results` (~6,052 rows, filtered to 1%), then `eq_ref` on `toc_result_projects` (`uk_trp_result_project`), `ref` on the indicator and target foreign-key indexes. Cost is negligible; no new index needed.
- **BIL-TOC-OQ-2** Lead-project-only default (R-8): confirm with Nicoleta, or should all contributing projects be shown?
- **BIL-TOC-OQ-3** ~~YES and reporting~~ Resolved in `design.md` BIL-TOC-DD-2: YES writes one node row per default node (no indicator/target rows), so readers of `results_toc_result` still see a linked node. Residual gap: indicator-level counts do not include YES results.
- **BIL-TOC-OQ-7** Projects usually carry 1 to 4 nodes per Program (real active projects), with a rare tail up to 23. Does YES link the result to **all** of them? That could inflate AoW/indicator counts. Options: link all (current design), or narrow the default by typology match (and optionally by the result's level) before showing and writing it. *(blocks design finalization; recommendation: narrow by typology, since the requester wants type match)*
- **BIL-TOC-OQ-6** Does anything read `toc_progressive_narrative` of unplanned bilateral results? (hidden when a default exists; see design reversion challenge)
- **BIL-TOC-OQ-4** Typology rule: reuse exactly what the existing level/indicator lookup applies (assumed), or a broader rule? Shared with `multi-hlo-result-linking`.
- **BIL-TOC-OQ-5** The "I'm not sure, the P/A will complete the ToC mapping" checkbox: this spec keeps it only in the fallback form (R-4) and drops it when a default exists. Confirm.

## Requirement ID Index

| ID | Title | Priority |
|---|---|---|
| BIL-TOC-R-1 | Default block | MUST |
| BIL-TOC-R-2 | YES keeps default | MUST |
| BIL-TOC-R-3 | NO opens detail flow | MUST |
| BIL-TOC-R-4 | Fallback without linkage | MUST |
| BIL-TOC-R-5 | Primary SP prerequisite | MUST |
| BIL-TOC-R-6 | Legacy results | MUST |
| BIL-TOC-R-7 | Switching answers | MUST |
| BIL-TOC-R-8 | Lead project only | MUST |
| BIL-TOC-R-9 | Additive read model | MUST |
| BIL-TOC-R-10 | Editable states only | MUST |
| BIL-TOC-R-11 | Show source project | SHOULD |
| BIL-TOC-R-12 | Reporting-year target | SHOULD |

## Required cross-references

`docs/prd.md` (AC-1, AC-4, AC-6) · `docs/ux-ui/design.md` (bilateral form, tokens §7) · `docs/trd/trd.md` (bilateral module, ToC read path) · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
