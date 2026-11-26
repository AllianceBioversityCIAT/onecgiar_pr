# Proposal — Portfolio Overview charts clarity (PMU feedback, 2026-11-18)

**Answer first:** The PMU ticket "Portfolio dashboard/overview" has four points. One is **already built but not deployed**. Two are **small client changes**. One is a **business-rule change** on the server.

| # | Point | Status |
|---|---|---|
| 1 | Why some Centers have 2 bars | **Built**, not deployed: the Submitted/Editing key is on `qa-development-2026-ss` only (`fcb7518d4`, INC-168045) |
| 2 | Footnote "Counts the lead Center; …" is unclear | Copy change |
| 3 | W3/Bilateral projects chart: three purple shades | Palette change |
| 4 | "With W3/Bilateral results" must follow the result's primary P/A + contributing P/As | **Rule change**, needs 2 decisions (§12) |

Recommended: one Lite spec for points 2–4. Point 1 ships with the next `staging → master` merge, plus a small check that the key reads clearly.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-charts-clarity` |
| Slug | `portfolio-overview-charts-clarity`, derived from the free-text argument |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | Freshservice ticket "Portfolio dashboard/overview", reporter CGIAR System Organization (PMU), 2026-11-18. Screenshot provided by the user in session |
| Visual source | Ticket screenshots (Typology "By Center (W3/Bilateral)" chart, W3/Bilateral projects block). No Figma |
| Branch | `qa-development-2026-ss` |
| Related specs | `bugfix/inc-168459-portfolio-overview-data` (POD, active, same blocks), `archive/2026-10-16-…w3-projects-section` (WPS), `archive/2026-11-10-changes--portfolio-typology-bar-chart` (TBC), `quick/typology-bar-counts-key` (INC-168045) |
| Date | 2026-11-20 |

## 2. Intent

PMU must be able to read and explain the Portfolio Overview charts without hovering, and the W3 project count per P/A must match how PMU thinks about attribution: by the P/As on the result.

## 3. Problem / Current Behavior

| # | Current behavior (cited) |
|---|---|
| P1 | Each Typology row has two bars: Submitted (solid) and Editing (striped). The key that explains it sits above the chart (`typology-block.component.html:51-71`, copy `portfolio-overview.copy.ts:43-49`). It was added in `fcb7518d4` (2026-11-17), which is only on `qa-development-2026-ss` (`git branch -a --contains fcb7518d4`). The ECharts legend at the bottom lists result types only, so in production nothing explains the two bars |
| P2 | Under the By Center tab the note reads "Counts the lead Center; the Center filter also matches contributing Centers." (`portfolio-overview.copy.ts:55`, rendered `typology-block.component.html:81`). It mixes two ideas (what the bar counts vs how the page filter matches) in jargon |
| P3 | The projects chart draws three series (Mapped, With W3/Bilateral, Contributing to W1/W2) with colors set per series (`projects-block/projects.charts.ts:41-47`). In the ticket screenshot all three are purple shades. Exact token values: `UNVERIFIED — confirm at source before relying on it` (owner: specify, read the series call sites) |
| P4 | A project counts as "with W3/Bilateral results" under a P/A when the project is **mapped** to that P/A in CLARISA (`clarisa_project_mappings`, Confirmed, allocation > 0) and has ≥ 1 W3 result of the version, not Discontinued (`clarisa-projects.repository.ts`, `getPortfolioProjectFacts`; aggregation `results-framework-reporting.service.ts:1167-1182`). The result's own P/As are not read. A W3 result's primary P/A is `results_by_inititiative` role 1; its contributing P/As are stored as `share_result_request` with `request_status_id = 4` (draft) at ingestion (`bilateral.service.ts:1699-1702`) |

## 4. Proposed Outcome

- A reader sees, without hovering, what each of the two bars per row means, in both Typology tabs.
- The By Center footnote says in plain words what is counted.
- The three projects series are clearly different colors in light and dark mode, and stay accessible.
- "With W3/Bilateral results" under a P/A counts projects whose W3 results name that P/A as primary **or** contributing P/A.

## 5. Scope

| In | Out |
|---|---|
| Typology key: confirm it reaches prod; optionally move it into the chart legend | Typology data rules (TBC-DD-2 buckets) |
| By Center footnote copy | Center filter behavior |
| Projects chart series palette (chart + KPI tiles stay consistent) | Other Portfolio Overview blocks |
| Server rule for `withBilateralResults` by P/A (and totals/by Center if the rule requires) | `mapped` and `w1w2Contributors` rules · `/api/bilateral/*` payloads |

## 6. Non-Goals

- No new endpoint or payload shape (`PortfolioBilateralProjects` keeps its fields).
- No change to how W3 results are ingested or how contribution requests are answered.
- No redesign of the Typology chart (orientation, tabs, click actions).

## 7. Affected Users, Systems, And Specs

| Area | Files |
|---|---|
| Client copy | `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts` |
| Typology block | `…/portfolio-overview/components/typology-block/` (`typology.charts.ts`, `.html`) |
| Projects block | `…/portfolio-overview/components/projects-block/projects.charts.ts` |
| Server | `clarisa-projects.repository.ts` (`getPortfolioProjectFacts`), `results-framework-reporting.service.ts` (`getPortfolioBilateralProjects`), Swagger text `results-framework-reporting.controller.ts:359` |
| Users | PMU / portfolio leads (`docs/prd.md` persona PMU) |
| Specs | POD is still open (`[~]`) on the same blocks: this spec must start after POD closes or rebase on it |

## 8. Visual Reference

- Source: None (ticket screenshots only)
- Location: ticket attachment, shared in session
- Notes: palette and footnote are small; specify picks colors from `docs/ux-ui/design.md` §7 tokens. No mockup needed.

## 9. Requirement Delta Preview

### ADDED
- The key for the two bars per row is visible in both Typology tabs and is part of what PMU sees in prod.

### MODIFIED
- By Center footnote: plain-language text (draft: "Each result is counted once, under its lead Center. Filtering by Center also shows results where that Center contributes.").
- Projects chart: three distinct, accessible series colors.
- `withBilateralResults` per P/A: a project counts under P/A X when ≥ 1 of its W3 results (version, not Discontinued) has X as primary P/A or as contributing P/A.

### REMOVED
- The rule "W3 results count under the P/As the project is **mapped** to" for the With W3/Bilateral metric.

## 10. Approach Options

| Option | What | Trade-off |
|---|---|---|
| A | Points 2–3 only (client), ask PMU again on point 4 | Fast, but ignores an explicit ask |
| **B** | Points 2–4 in one Lite spec; point 4 adds result-P/A facts to the repository query and keeps the payload shape | One release; server change is a query + aggregation, tests exist (`results-framework-reporting.service.spec.ts:1851-1898`) |
| C | Add a fourth series ("With W3 results by result P/A") next to the mapped-based one | No meaning lost, but more bars, against the "not intuitive" complaint |

## 11. Recommended Approach

**Option B.** It answers every point with the same payload and the smallest blast radius. Point 1 needs no code: it ships with the pending merge. Specify can still decide to move the key into the ECharts legend.

## 12. Risks, Dependencies, And Open Questions

| ID | Question / risk |
|---|---|
| OQ-1 | **Must the project still be mapped to the P/A?** If not, "With W3/Bilateral" can exceed "Mapped" for a P/A, and the "% of mapped" subtitle breaks. Options: (a) union, any project with a W3 result naming the P/A; (b) intersection, mapped to the P/A **and** a result naming it. Needs PMU/user decision |
| OQ-2 | **Which contributing P/As count?** W3 contributors arrive as `share_result_request` status 4 (draft). Count draft + accepted, or accepted only? |
| OQ-3 | Should the **totals** and **By Center** "With W3/Bilateral" follow the same rule? Today totals count a project once if it has any W3 result and is mapped |
| R-1 | POD (`bugfix/inc-168459-portfolio-overview-data`) is `[~]` on the same files; parallel work would conflict. `Depends on: bugfix/inc-168459-portfolio-overview-data` |
| R-2 | Changing the number PMU already reported (57 / 5.8 %) needs a short release note |

## 13. Success Criteria

- PMU can explain the two bars and the footnote without hovering (ticket closed with no follow-up on those points).
- Three series pass a contrast check in light and dark mode.
- A W3 result submitted under P/A X with contributor Y makes its project count under X and Y (per OQ-1/OQ-2 answers), covered by service tests.

## 14. Next Step

```text
/akili-specify changes/portfolio-overview-charts-clarity
```
