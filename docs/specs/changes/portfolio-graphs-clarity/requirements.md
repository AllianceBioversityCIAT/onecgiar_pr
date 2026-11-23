# Requirements — Portfolio Overview graphs clarity (PGC)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-graphs-clarity/` |
| Module code | `PGC` |
| Depth | Lite |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Ticket | INC-168764 (Freshservice), Nicoleta Trifa, 2026-11-18 |
| Owner | Santiago Sanchez |
| Status | approved, 2026-11-23 (owner, gated: Phase 1 continue, Phase 2 continue without judgment-day, Phase 3 continue) |
| Source | `proposal.md` (approved 2026-11-23). Owner decisions: OQ-1 = option A (result-based), OQ-2 = draft contributions count, OQ-3 = the agent writes the copy. No questions to the reporter |
| Code read at | `origin/master` `e4f090b05` (same code as `origin/qa-development-2026-ss` for these files; the local checkout is behind, see R-3 in the proposal) |
| PRD | G-portfolio visibility for PMU (`docs/prd.md`, persona "PMU / portfolio lead"); extends WPS (`archive/2026-10-16-…w3-projects-section`) and TBC (`archive/2026-11-10-changes--portfolio-typology-bar-chart`) |

## 2. Executive Summary

Two graphs on `/portfolio-overview` are hard to read. This spec:

1. explains, on the Typology chart, why a row can have one bar, and rewrites the Center-tab footnote in plain words;
2. gives the three W3/Bilateral projects series three clearly different colours;
3. changes **one** figure: per Program/Accelerator (P/A), "With W3/Bilateral results" counts the projects whose W3 results **name that P/A** as primary or contributing, instead of the projects CLARISA maps to it.

Everything else on the page keeps its numbers.

## 3. Glossary

| Term | Meaning |
|---|---|
| P/A | A Science Program or Accelerator in the Portfolio Overview seed (active, not switched off for the phase) |
| W3 result | A result with `source = 'API'`, active, in the open phase version, status not Discontinued, linked to a project through an active `results_by_projects` row. Same definition as today's `has_bilateral` |
| Primary P/A | The P/A that owns the result (`results_by_inititiative`, role 1, active) |
| Contributing P/A | A P/A that contributes to the result: accepted (`results_by_inititiative` role 2, active) **or** requested and not declined (`share_result_request` active, status Pending 1, Accepted 2 or Draft 4). Declined (3) never counts |
| Block projects | The projects the W3/Bilateral block counts today: active CLARISA projects of the phase year with at least one approved P/A mapping |
| Names a P/A | A W3 result names a P/A when that P/A is its primary or a contributing P/A |

## 4. System Context & Scope

Current behaviour (each claim cited at `e4f090b05`):

- Per-P/A "With W3/Bilateral results" adds a project to every P/A it is **mapped** to when it has any W3 result (`results-framework-reporting.service.ts`, `getPortfolioBilateralProjects`, loop over `row.approvedProgramCodes` calling `addProject(counts, row.hasBilateral, …)`). The P/As named on the result are never read (`clarisa-projects.repository.ts`, `getPortfolioProjectFacts` selects only `approved_program_codes`, `has_bilateral`, `has_w1w2`).
- W3 ingestion stores the primary P/A in `results_by_inititiative` role 1 and contributing P/As as `share_result_request` rows with `request_status_id = 4` (`bilateral.service.ts:1662`, `:1700-1730`). Status ids: `PENDING = 1, ACCEPTED = 2, DECLINED = 3, DRAFT = 4` (`share-result-request/services/primary-program-request.service.ts:64-72`). An accepted contributor is `results_by_inititiative` role 2 (`bilateral-resubmission.service.ts:397-402`).
- The projects chart paints the series with `ramp[0]`, `ramp[2]`, `ramp[1]` = `--pr-chart-1/3/2`, three purples (`projects.charts.ts`, `buildProjectsOption`; `colors.scss:299-302`).
- The Typology key (`typology-bar-key`) names the top and bottom bars but not the one-bar case; the Center tab footnote is `centerNote` (`portfolio-overview.copy.ts:55`).

**In scope:** Typology key + Center footnote copy; projects series colours (both tabs); per-P/A "With W3/Bilateral results" rule; projects subtitle and caption copy; guide update.

**Out of scope:** totals, "Mapped projects", "Contributing to W1/W2", the By Center tab counts, the unmapped footnote count, bilateral ingestion, `/api/bilateral/*`, any other block.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| PMU / portfolio lead (admin, `/portfolio-overview`) | Reads both graphs without hovering; per-P/A "With W3/Bilateral results" reflects the P/As results actually name |
| Reporter of the ticket (Nicoleta) | Gets the four points answered in one release |

## 6. Functional Requirements

### PGC-R-1 — Typology key explains a one-bar row

The Typology bar key SHALL say that a row shows one bar when that row has results in only one of the two groups.

#### Scenario 1.1 — Key text

- GIVEN the Typology block is shown, on either tab
- WHEN the user reads the key
- THEN it lists the top bar (Submitted), the striped bottom bar (Editing) and a line saying a row with a single bar has results in only one of the two groups
- BUT it must NOT change the bars, the bucket rule or the counts

### PGC-R-2 — Center tab footnote in plain words

The "By Center (W3/Bilateral)" footnote SHALL state, in plain words, that each result counts once under its lead Center and that the Center filter also keeps results where the Center only contributes.

#### Scenario 2.1 — Footnote text

- GIVEN the Center tab is active
- WHEN the footnote renders
- THEN it reads: "Each result is counted once, under its lead Center. The Center filter also keeps results where that Center only contributes, so other Centers can appear in this chart while it is on."
- AND IT MUST stay hidden on the P/A tab, as today

### PGC-R-3 — Projects series have distinct colours

The three series of the W3/Bilateral projects chart SHALL each use a different hue, on both the By P/A and By Center tabs.

#### Scenario 3.1 — Colours

- GIVEN the projects chart renders, in light or dark mode
- WHEN the three series are drawn
- THEN Mapped, With W3/Bilateral results and Contributing to W1/W2 each use a different hue from existing design tokens, and the legend swatches match the bars
- AND IT MUST keep each fill at 3:1 or more against the card background (WCAG 1.4.11, non-text)
- BUT it must NOT use three shades of the same purple ramp

### PGC-R-4 — Per-P/A "With W3/Bilateral results" follows the P/As the results name

For each P/A row, "With W3/Bilateral results" SHALL count the block projects that have at least one W3 result naming that P/A (primary or contributing). A project counts at most once per P/A.

#### Scenario 4.1 — Primary P/A

- GIVEN block project X has a W3 result whose primary P/A is SP01
- WHEN the block loads
- THEN X counts once in SP01's "With W3/Bilateral results", whatever P/As CLARISA maps X to

#### Scenario 4.2 — Contributing P/A (draft, pending or accepted)

- GIVEN block project X has a W3 result with primary SP01 and an active contribution row for SP09 in status Draft (4), Pending (1) or Accepted (2), or an active role-2 link to SP09
- WHEN the block loads
- THEN X counts in SP01 **and** in SP09
- BUT a contribution row that is Declined (3) or inactive must NOT count

#### Scenario 4.3 — Mapped but not named

- GIVEN block project X is mapped to SP05 and has W3 results, none of which names SP05
- WHEN the block loads
- THEN X does not count in SP05's "With W3/Bilateral results"
- AND X still counts in SP05's "Mapped projects" (unchanged)

#### Scenario 4.4 — Results that do not qualify

- GIVEN block project X has only results that are W1/W2, inactive, Discontinued, from another version, or linked through an inactive `results_by_projects` row
- WHEN the block loads
- THEN X counts in no P/A's "With W3/Bilateral results"

#### Scenario 4.5 — Unmapped projects stay out

- GIVEN a project with no approved P/A mapping has a W3 result naming SP01
- WHEN the block loads
- THEN it does not count in SP01's row
- AND IT MUST still count in the unmapped footnote, as today

#### Scenario 4.6 — Same P/A named by several results

- GIVEN block project X has three W3 results, all naming SP01
- WHEN the block loads
- THEN X adds 1, not 3, to SP01

### PGC-R-5 — Every other figure is unchanged

The block SHALL return the same totals, per-P/A "Mapped projects", per-P/A "Contributing to W1/W2", By Center counts and unmapped count as before.

#### Scenario 5.1 — No side effects

- GIVEN the same data before and after the change
- WHEN the block loads
- THEN `totals`, `byCenter`, `unmappedWithBilateralResults` and each row's `mapped` and `w1w2Contributors` are identical
- BUT only `byProgram[*].withBilateralResults` may differ

### PGC-R-6 — The block explains the rule

The projects block SHALL explain in its subtitle and caption how "With W3/Bilateral results" is counted per P/A.

#### Scenario 6.1 — Copy

- GIVEN the By P/A tab is shown
- WHEN the user reads the block
- THEN the subtitle says projects are mapped to a P/A in CLARISA and that, per P/A, "With W3/Bilateral results" counts projects whose W3/Bilateral results name it as primary or contributing P/A
- AND the caption says a P/A can show more projects with results than mapped projects, and that bars add up to more than the total

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| PGC-NFR-1 | The `bilateral-projects` endpoint keeps its response shape (no field added or removed) and its admin-only guard |
| PGC-NFR-2 | One SQL round trip more at most per request; every value bound (no string concatenation) |
| PGC-NFR-3 | Copy lives in `portfolio-overview.copy.ts` only; no hard-coded strings in templates |
| PGC-NFR-4 | Colours come from existing CSS tokens resolved at runtime; no hex literal in chart code |

## 8. Defect classes and gates

| Defect class | Gate |
|---|---|
| Wrong per-P/A count (status filter, role, version, distinct) | Server Jest on the service + repository specs, with fixtures that make each Scenario 4.x diverge from the old rule |
| SQL that does not run on MySQL (syntax, binding order) | **No local DB.** Substitute: read-only query on PRTest/PROD by the owner, comparing totals before vs after (PGC-R-5) — HITL step in the server task |
| Other figures drift | Jest assertion that totals, mapped, w1w2, byCenter and unmapped equal the old values on the same fixture |
| Wrong copy shown / key line missing | Client Jest on the typology and projects components (rendered text) |
| Same hue / low contrast | Jest on `buildProjectsOption` (three distinct colour inputs); contrast is not measurable in jsdom → computed ratio from the token hex values in the task, plus a T6/human look in the browser at the HITL pause |
| Type errors in the client | `npx ng build` is not run (heavy); `npx tsc -p tsconfig.app.json --noEmit` on the client is the compile gate |

## 9. Requirement ID Index

| ID | Title | Proposal point |
|---|---|---|
| PGC-R-1 | Typology key explains a one-bar row | P1 |
| PGC-R-2 | Center tab footnote in plain words | P2 |
| PGC-R-3 | Projects series distinct colours | P3 |
| PGC-R-4 | Per-P/A "With W3/Bilateral results" by named P/A | P4 |
| PGC-R-5 | Every other figure unchanged | P4 |
| PGC-R-6 | Block explains the rule | P4 |
