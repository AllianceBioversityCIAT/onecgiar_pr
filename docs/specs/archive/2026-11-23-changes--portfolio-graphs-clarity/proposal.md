# Proposal — Portfolio Overview graphs clarity (INC-168764)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-graphs-clarity` |
| Slug | `portfolio-graphs-clarity` — derived from free-text argument (INC-168764 brief) |
| Ticket | INC-168764 (Freshservice), "Portfolio dashboard/overview", reported by Nicoleta Trifa (CGIAR System Organization), 2026-11-18 |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | The ticket text and its two screenshots, pasted by the user in chat on 2026-11-23. No Jira ticket |
| Status | Approved by Santiago Sanchez, 2026-11-23 ("ya con esto aprobamos y seguimos con el specify"). Owner decision: no questions to Nicoleta; OQ-1..OQ-3 closed by the agent (see Risks) |
| Depends on | none (builds on what is already on `master`: INC-168045 `fcb7518d4`, INC-168459 `7cc56335a`) |
| Parallel-safe | no. It touches the same `projects-block` and the same `getPortfolioBilateralProjects` as `bugfix/inc-168459-portfolio-overview-data` (already merged) |

## Intent

Make two Portfolio Overview graphs self-explanatory, so the PMU can read them and explain them to others without hovering. Also make the "With W3/Bilateral results" figure count projects the way the PMU thinks about them: by the P/As named on the result.

## Problem / Current Behavior

Nicoleta raised four points. One is already partly fixed in production.

| # | Point (ticket) | Today | Status |
|---|---|---|---|
| P1 | Typology, "By Center (W3/Bilateral)" tab: "why do some Centers have 2 bars and others 1? It is not in the legend" | Each row has two bars: Submitted (top) and Editing (bottom, striped). A Center with results in only one group shows one bar. A key, "How to read the bars", was added in INC-168045 (`typology-block.component.html`, `data-testid="typology-bar-key"`; commit `fcb7518d4`). It reached `master` in PR #803 (`5fd590fc7`, 2026-11-18 16:07 -0500), **after** the screenshots in the ticket, which show no key | **Partly done.** The key exists, but it does not say why a row can have only one bar |
| P2 | Typology Center tab footnote, "what does it mean?" | The footnote reads *"Counts the lead Center; the Center filter also matches contributing Centers."* (`portfolio-overview.copy.ts:55`, rendered at `typology-block.component.html:81`, `typology-center-note`). It means: each result counts once, under its **lead** Center, while the global Center filter also keeps results where the Center only **contributes**. So with a Center filter on, the chart can show bars for other Centers. The guide records this as intended (`portfolio-overview/CLAUDE.md`, "Typology Center view is lead-only by design") | **Open.** Copy only |
| P3 | W3/Bilateral projects chart: "use a different colour scheme" | All three series use the purple ramp: Mapped = `--pr-chart-1` `#4a2bb8`, With W3/Bilateral results = `--pr-chart-3` `#9270f0`, Contributing to W1/W2 = `--pr-chart-2` `#6b46e5` with stripes (`projects.charts.ts`, `buildProjectsOption`; tokens `colors.scss:299-302`). INC-168459 made the chart horizontal with full names but kept the colours | **Open** |
| P4 | "With W3/Bilateral results" must count "the primary program under which the result is submitted + the contributing P/As for the same result" | On each P/A row, a project counts when (a) CLARISA maps it to that P/A (`clarisa_project_mappings`, approved status, `allocation > 0`) **and** (b) it has at least one active, non-Discontinued W3 result in the phase (`clarisa-projects.repository.ts`, `getPortfolioProjectFacts`, `approved_program_codes` + `has_bilateral`; aggregated in `results-framework-reporting.service.ts` `getPortfolioBilateralProjects`). The P/As named on the result itself are **never** read | **Open.** This changes a counting rule |

Where the result's P/As live for W3 results (first reading, to be checked at specify):

- **Primary P/A:** `results_by_inititiative` with `initiative_role_id = 1` (`bilateral.service.ts:1121`, `:6190`).
- **Contributing P/As:** W3 ingestion stores them as `share_result_request` rows with `request_status_id = 4` (draft), **not** in `results_by_inititiative` (`bilateral.service.ts:1700-1730`). Contributions accepted later, if any, would sit in `results_by_inititiative` with role 2. `UNVERIFIED — confirm at source before relying on it` (whether accepted W3 contributions exist in prod).

## Proposed Outcome

- **Typology, Center tab:** the key explains that a row can show one bar ("only Submitted" or "only Editing results"). The footnote is rewritten in plain words, for example: *"Each result is counted once, under its lead Center. The Center filter also keeps results where that Center contributes, so other Centers can appear when it is on."* Wording to be approved by Nicoleta.
- **Projects chart:** three clearly different colours, one per series, taken from existing tokens (not three purples). The legend keeps its stripes or drops them, decided at specify.
- **"With W3/Bilateral results" per P/A:** a project counts for a P/A when at least one of its W3 results (active, not Discontinued, in the phase) names that P/A as **primary or contributing**. The portfolio total does not change (a project with any W3 result, counted once).
- The block subtitle and the KPI tooltip explain the new rule in one sentence.

## Scope

| In | Out |
|---|---|
| Typology Center tab: bar key wording + footnote copy | P/A tab of Typology (its key already works) |
| Projects chart series colours (P/A and Center views) | Redesign of every Portfolio Overview chart |
| P4 counting rule for the **By P/A** view: server SQL + service + DTO doc + specs | "Mapped projects" (still from CLARISA mapping) |
| Copy for the projects subtitle / KPI hint | "Contributing to W1/W2" series and its rule |
| `portfolio-overview/CLAUDE.md` guide update | By Center view counting (Centers have no primary/contributing P/A) |

## Non-Goals

- Changing how W3 results get their P/As (bilateral ingestion, Fetcher, `/api/bilateral/*`). Read only, so the W3 form ↔ API ↔ Fetcher rule does not apply: nothing in the payload changes.
- New charts, drill-downs or exports.
- Touching the Centers block or the ToC KPI block.

## Affected Users, Systems, And Specs

| Area | Files / specs |
|---|---|
| Users | PMU / portfolio leads (admin-only page `/portfolio-overview`) |
| Client | `components/typology-block/*` (template, specs), `components/projects-block/projects.charts.ts` (+ spec), `internationalization/portfolio-overview.copy.ts`, `portfolio-overview/CLAUDE.md` |
| Server | `clarisa/clarisa-projects/clarisa-projects.repository.ts` (`getPortfolioProjectFacts`), `api/results-framework-reporting/results-framework-reporting.service.ts` (`getPortfolioBilateralProjects`) + spec, `dto/portfolio-bilateral-projects.dto.ts` (description) |
| Related specs | `archive/…w3-projects-section` (WPS, the original rule WPS-R-*), `bugfix/inc-168459-portfolio-overview-data` (POD, horizontal chart + seed), `quick/typology-bar-counts-key` (INC-168045), `changes/portfolio-typology-bar-chart` (TBC) |

## Visual Reference

- Source: None (no Figma). Ticket screenshots of the Typology Center tab and the W3/Bilateral projects chart, both from before the 2026-11-18 / 2026-11-20 releases.
- Location: the ticket INC-168764 (Freshservice). Not saved in the repo.
- Notes: the change is copy, one colour mapping and a counting rule, all inside existing components. A mockup is optional. Offer it at the approval pause.

## Requirement Delta Preview

### ADDED Requirements

- The Typology bar key says a row can have only one bar, and why.
- The projects block states the per-P/A rule for "With W3/Bilateral results" in its subtitle or KPI hint.

### MODIFIED Requirements

- **WPS rule for "With W3/Bilateral results" per P/A:** from "mapped to the P/A in CLARISA **and** has any W3 result" to "has a W3 result whose primary or contributing P/A is this P/A". The total stays the same.
- Typology Center footnote: new wording, same meaning.
- Projects chart: one distinct hue per series instead of three purples.

### REMOVED Requirements

- None. If option A below is chosen, the "% of mapped" hint on the **per-P/A** rows may no longer make sense (see Risks).

## Approach Options

| Option | Per-P/A "With W3/Bilateral results" | Pros | Cons |
|---|---|---|---|
| **A. Result-based** (recommended) | Distinct projects with ≥ 1 W3 result where the P/A is primary or contributing. CLARISA mapping is not needed | Matches what Nicoleta asked for, word for word. Counts work the P/A really reported | A P/A can show more "with results" projects than "mapped" ones (results name P/As the mapping does not list). Bars can no longer be read as a share of Mapped |
| B. Intersection | Mapped to the P/A **and** has a W3 result naming that P/A | Never above Mapped. "% of mapped" still holds | Stricter than today. Hides real contributions when the mapping is incomplete. Not what was asked |
| C. Keep today's rule, add a fourth series | Today's bar + new "Results name this P/A" bar | No figure changes | Adds a bar to a chart already called hard to read. Goes against the ticket |

## Recommended Approach

**One Lite spec with option A**, in three small tasks:

1. **Server (P4):** add the result's P/A codes to `getPortfolioProjectFacts` (primary from `results_by_inititiative` role 1 + contributing from `share_result_request` status 4, and role 2 if it exists). Count per-P/A "with results" from those codes, not from the mapping. Totals unchanged. Unit tests with a project whose result names an unmapped P/A.
2. **Client colours + copy (P3, P4 copy):** three distinct existing tokens for the projects series (the Typology block already uses `--pr-color-*` hues, precedent in `typology-block.component.ts:14`). New subtitle/hint copy.
3. **Client Typology (P1, P2):** key wording for single-bar rows + new footnote. Guide update.

Points P1–P3 alone are copy and token changes that could go through `/akili-quick`. They stay in this spec because the projects copy depends on the P4 rule and one release is easier to explain to Nicoleta.

## Risks, Dependencies, And Open Questions

| # | Item | Owner |
|---|---|---|
| OQ-1 | **Closed 2026-11-23 → option A.** The ticket asks for primary + contributing P/As, word for word. A P/A may show more "with results" projects than "mapped" ones; the copy says so instead of hiding it | Santiago (no question to Nicoleta) |
| OQ-2 | **Closed → yes.** Contributing P/As count whatever their request status (W3 draft status 4 included, rejected excluded), because that is how W3 ingestion records them | Santiago |
| OQ-3 | **Closed → the agent writes the final wording** in plain language at specify; no external approval round | Santiago |
| R-1 | The per-P/A figures change in production. Prepare a before/after table from a read-only prod query for the reply | Santiago |
| R-2 | Colour choice must meet WCAG 1.4.11 (3:1 non-text) against the card background in light and dark mode (`docs/ux-ui/design.md`, chart rules) | specify |
| R-3 | The local checkout is behind `origin/qa-development-2026-ss` (it lacks `cfc18d03e`, INC-168459). Pull before specify, or the plan is built on the old vertical chart | Santiago |
| R-4 | `share_result_request` rows for W3 may hold codes as initiative ids, so the SQL needs a join to `clarisa_initiatives` for `official_code`. Check at specify | specify |

## Success Criteria

- Nicoleta can explain the Typology Center tab without hovering: the key covers one-bar rows and the footnote is understood (her confirmation).
- The projects chart's three series are clearly different colours in light and dark mode.
- For a sample P/A, "With W3/Bilateral results" equals a read-only SQL count of distinct projects whose W3 results name that P/A as primary or contributing.
- The "With W3/Bilateral results" total is unchanged before vs after.
- Scoped Jest suites for the touched files pass (`--maxWorkers=2`, `--findRelatedTests`).

## Next Step

```text
/akili-specify changes/portfolio-graphs-clarity
```

Lite depth. Settle OQ-1 first, because it decides option A or B.
