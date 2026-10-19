# Proposal — "Updated 2025 innovations with no 2026 project" line in the Center Overview

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/replicated-innovations-2026-pa/center-overview-no-project-line/` |
| Parent Spec | `docs/specs/bilateral/replicated-innovations-2026-pa/` (`family.md`, child #2) |
| Slug | `center-overview-no-project-line`, derived from the free-text argument |
| Type | **Change** |
| Status | **draft**, awaiting owner approval |
| Approval Mode | `gated` |
| Owner | Santiago Sanchez |
| Date | 2026-10-16 |
| Ticket | Freshdesk INC-164073; no Jira yet |
| Depends on | none (it reads live data; child #1 only changes the count) |
| Parallel-safe | yes |
| Requirement prefix (proposed) | `CNP` |

## 2. Intent

Nicoleta, in red on 15-Oct-2026:

> *"We need to be realistic and, since many of the 2025 projects have ended, many of these innovations without a 2026 project will feature as an extra line in the Overview section of the Center to illustrate 'updated 2025 innovations with no 2026 project title'."*

She wants the Center Overview to make those innovations visible as a **group of their own**, so they do not go unnoticed and are not confused with results that are simply missing data.

## 3. Problem / Current Behavior

The **Overview** tab of the Center (`/bilateral/:acronym/overview`, archived spec `2026-09-14-bilateral--center-overview-tab`, COV-R-9) has a **"Results by bilateral project"** card with one bar per project. All results without a project already go into a single **"no project"** row/chip (`noProjectRow` in `bilateral-overview.aggregate.ts`, label `NO_PROJECT_CATEGORY_LABEL`).

The problem is that this row **mixes** three things:

- replicated 2025 innovations whose project has no 2026 record (the 63);
- W1/W2 results (`allW1W2`);
- any other result without a project.

So it does not say what Nicoleta wants it to say. Each row already carries `is_replicated`, `result_type_id`, `source` and `project_id` (`bilateral-center-result.interface.ts`), so **no new server data is needed**.

## 4. Proposed Outcome

In the "Results by bilateral project" card, a line/chip of its own, **"Updated 2025 innovations with no 2026 project"**, that:

- counts results in scope that are **replicated + innovation (7 or 2) + W3 (`source='API'`) + no lead project**;
- **is computed live**: when a Center links a project (child #1), the result leaves this line and moves to its project's bar;
- links to the Results tab filtered to those results (deep link, COV-R-13);
- is **subtracted** from the generic "no project" row so nothing is counted twice;
- respects the Overview filters and the selected phase (in 2025 it is naturally 0, since nothing was replicated into 2025 from this flow).

## 5. Scope

- Client: `bilateral-overview.aggregate.ts` (new bucket + subtraction), `bilateral-overview.charts.ts` (extra bar/row), `bilateral-overview.component.html` (chip/link), copy in `internationalization/`, folder `CLAUDE.md`.
- Deep link: `bilateral-query-params.ts` has no `replicated` filter. Specify decides between (a) adding a `replicated` param, read by Results, or (b) linking with `project=[]` + `type=[7,2]` + `source=w3`, which is equivalent if no non-replicated W3 innovation lacks a project (`CNP-P-1`).
- Tests: Jest for aggregate/charts/component with `--maxWorkers=2`, scoped to `bilateral-overview`.

## 6. Non-Goals

- No new endpoint and no server change.
- No change to the KPI cards or other Overview cards.
- Not a frozen 13-Oct snapshot (the count is live).
- Does not touch the Portfolio Overview (PMU) or the per-project cards on the Bilateral Home (`project-overview-metrics`).

## 7. Affected Users, Systems, And Specs

| Type | Item |
|---|---|
| Users | Center Users / Center leads checking their Overview; Nicoleta (P/A) when reviewing Centers |
| Client | `pages/bilateral/pages/bilateral-overview/` (+ `bilateral-query-params.ts` if option a) |
| Related specs | archive `2026-09-14-bilateral--center-overview-tab` (COV-R-9, COV-R-13), `bilateral/project-overview-metrics` (BIL-POM), child #1 of this family |

## 8. Visual Reference

- Source: **None.** It reuses the existing bar + chip pattern from the "Results by bilateral project" card (the dashed chip of the no-project row).
- Notes: a new bar/chip next to the no-project row, using the same visual pattern.

## 9. Requirement Delta Preview

### ADDED Requirements
- `CNP-R-1`: Bucket "Updated 2025 innovations with no 2026 project" = replicated ∧ type ∈ {7, 2} ∧ W3 ∧ no lead project, within the Overview scope (phase + filters).
- `CNP-R-2`: Bar + chip with count and a deep link to Results that shows exactly those results (the count equals the destination, the COV contract).
- `CNP-R-3`: Hidden when the count is 0.

### MODIFIED Requirements
- The generic "no project" row excludes the results counted in `CNP-R-1`.

### REMOVED Requirements
- None.

## 10. Approach Options

| Option | Pros | Cons |
|---|---|---|
| **A. Extra bucket in the "by project" card (recommended)** | It is where Nicoleta expects it ("extra line"); data already on the client; same visual pattern | Touches the bar order and the chips |
| B. New KPI card | Very visible | Changes the KPI grid (5/3/2/1, COV-R-19); more design work for one number |
| C. Rename the current "no project" row | Trivial | Wrong: that row also includes W1/W2 and other results |

## 11. Recommended Approach

**Option A**, client-only, live count, subtracted from the generic row.

## 12. Risks, Dependencies, And Open Questions

| ID | Type | Description | Recommendation |
|---|---|---|---|
| `CNP-OQ-1` | Copy | Exact label. Nicoleta wrote *'updated 2025 innovations with no 2026 project title'* | "Updated 2025 innovations with no 2026 project" |
| `CNP-OQ-2` | Scope | Innovations only (7/2) or every replicated W3 type? | Innovations only (7/2), as she asked |
| `CNP-P-1` | Premise | No non-replicated W3 innovation lacks a lead project (manual creation and API ingestion always create one, per LPC) | Verify with a query in specify; decides deep-link option (a) or (b) |
| `CNP-RISK-1` | Consistency | Lead vs contributor: a result with only a contributing project counts as "no lead project" | Define "no 2026 project" by the **lead** row, the same as `family.md` |

## 13. Success Criteria

- AfricaRice / ILRI / Alliance, phase 2026: the line shows the same number of results as the "Without 2026 project" sheet for that Center (e.g. ILRI ≥ 24 from L-CIA023), minus those already linked through child #1.
- Clicking the line opens Results with exactly that number of rows.
- The generic "no project" row stops counting those results.
- Jest `bilateral-overview` green with `--maxWorkers=2`; lint clean on the touched files.

## 14. Next Step

```text
/akili-specify bilateral/replicated-innovations-2026-pa/center-overview-no-project-line
```
