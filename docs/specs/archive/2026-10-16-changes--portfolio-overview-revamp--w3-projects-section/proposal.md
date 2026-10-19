# Proposal — W3/Bilateral Projects section: mapped, reporting and contributing projects, by P/A and by Center (stakeholder item 10)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/w3-projects-section/` |
| Slug | `w3-projects-section` — derived from free-text argument ("Falta implementar desde el 9 en adelante, puedes hacer el propose del 9, 10 y 11?" + stakeholder email "RE: Reporting monitoring dashboard", 2026-10) |
| Type | Change |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org |
| Date | 2026-10-15 |
| Module | server `api/bilateral` (new portfolio aggregate) + client `result-framework-reporting` › `portfolio-overview` (new section) |
| Depends on | server half: none · client half: family #5 `toc-kpi-progress` (same template; serial order) |
| Parallel-safe | server half yes · client half no |
| Parent Spec | `changes/portfolio-overview-revamp` (family #8) |

## 2. Intent

Add a **W3/Bilateral projects** section that answers *"how many bilateral projects exist per P/A and per Center, how many of them are reporting, and how many feed pooled results?"* The stakeholder asked for *"a section on w3/bilat which has this level of details"* and attached two charts:

| Figure | Definition (proposed) |
|---|---|
| **# of Mapped Projects** | Active CLARISA projects of the open phase year with ≥1 **approved** P/A mapping (`status='Confirmed'`, `allocation>0`, `program_code` set; rule P2-3313) |
| **# of Projects with reported W3/Bilat results** (+ % of mapped) | Mapped projects with ≥1 active `results_by_projects` link to a result where `source='API'` in the open version |
| **# of Projects tagged as contributors to W1/2 results** (+ % of mapped) | Mapped projects with ≥1 active `results_by_projects` link to a result where `source='Result'` in the open version |

Each figure is shown as a portfolio total and as grouped bars **by P/A** and **by Center**.

## 3. Problem / Current Behavior

- Nothing on `/portfolio-overview` mentions projects. The page's result rows carry no project ids (`result.repository.ts:686-786`).
- The data exists, split across three tables:

  | Table | What it holds |
  |---|---|
  | `clarisa_projects` | Center via `organization_code`, with the alias fallback `source_center_acronym` → `W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE` for the ~146 Alliance projects that have a NULL org; `phase` = year |
  | `clarisa_project_mappings` | Project → P/A |
  | `results_by_projects` | Result ↔ project, for both W1/W2 and W3 links |

- The closest existing logic is per Center only: `GET api/bilateral/center/projects` → `BilateralProjectsService.getProjectsByCenter` (`bilateral-projects.service.ts:147-375`) plus `getW1w2ContributorCounts` (`:443-479`). Calling it per Center from the portfolio page would mean 15 calls and would still lack metric (b). **No portfolio-wide aggregate exists.**

## 4. Proposed Outcome

```
W3/Bilateral projects                                          Phase 2026
┌────────────────┐ ┌──────────────────────────────┐ ┌───────────────────────────────┐
│ 1211           │ │ 640  with W3/Bilat results   │ │ 85  contributing to W1/W2     │
│ Mapped projects│ │ 52.8 % of mapped             │ │ 7.0 % of mapped               │
└────────────────┘ └──────────────────────────────┘ └───────────────────────────────┘
[ By P/A | By Center ]   grouped bars: mapped · with W3 results · W1/W2 contributors
                         (chart ⇄ table toggle, like the other pr-viz charts)
```

(Numbers are illustrative.)

## 5. Scope

**Server:**
- One new admin-only endpoint, for example `GET api/bilateral/portfolio/projects-summary?versionId=`. It returns `{ totals, byProgram[], byCenter[] }`, where each entry carries `mapped`, `withBilateralResults`, `w1w2Contributors`.
- One SQL aggregate per breakdown. It reuses the approved-mapping rule and the center-alias fallback from `BilateralProjectsService`, and is not a copy of them: extract a shared query builder if needed.
- Jest: a service spec built from fixture rows, plus a prdb verification query for ≥2 P/As and ≥2 Centers (memory: verify SQL against real data).

**Client:**
- A new `components/projects-block/` with its own data path, the same pattern as `centers-block` (own loading, error and empty states; rendered outside `hasFigures()`).
- New `results-api` / `bilateral-api` method named per `HTTP_METHOD_descriptiveName`.
- Copy file, scoped specs, and a `CLAUDE.md` section.

## 6. Non-Goals

- No project list or drill-down to individual projects. The exportable list is family #9.
- No new CLARISA sync and no change to how projects are mapped.
- No "progress" or target figures for projects (same rationale as item 9: there is no planning data).
- Global filters (#6) are not wired here. #6 decides how they apply to this block (see OQ-4).

## 7. Affected Users, Systems, And Specs

- **Users:** Admin / PMU readers of `/portfolio-overview`.
- **Server:**
  - `api/bilateral/` (controller, `bilateral-projects.service.ts`, new DTO)
  - `w3-center-alias.constants.ts` (read only)
  - Guard: admin
- **Client:**
  - `portfolio-overview.component.html` (mount point)
  - New `components/projects-block/`
  - `shared/services/api/bilateral-api.service.ts`
- **Specs:**
  - `docs/specs/**/kp-project-strict-filter` (archived): project matching rules
  - P2-3313: approved-mapping rule
  - Family #6 `global-filters`: project filter
  - Payload contract doc `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (only if the endpoint lives under `/api/bilateral/*`, in which case its change log MUST be updated)

## 8. Visual Reference

- Source: stakeholder screenshots `image008.png` (KPI trio + "Projects by P/A") and `image009.png` ("Projects by Center") in the email "RE: Reporting monitoring dashboard". They look like a Power BI mockup filtered to IRRI.
- Location: the email attachments, plus the ASCII outline in §4.
- Notes: an optional HTML mockup under `mockup/` before `/akili-specify`, using the page's existing `pr-viz-chart` grouped-bar style and the chart tokens (not the screenshot's green, yellow and blue).

## 9. Requirement Delta Preview

### ADDED
- Portfolio projects-summary endpoint (admin-only, one call).
- "W3/Bilateral projects" section: 3 KPI cards (two with % of mapped), plus grouped bars by P/A and by Center with a table view.

### MODIFIED
- `/portfolio-overview` gains one block after the Centers block.

### REMOVED
- none

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. New server aggregate + own client block** | §5 | 1 call; numbers defined once on the server; matches the centers-block pattern | New endpoint to own |
| B. Client loops `GET api/bilateral/center/projects` per Center | Reuse what exists | No server work | 15 calls; no metric (b); the P/A breakdown must be rebuilt client-side; a project mapped to 2 P/As is easy to double-count wrongly |
| C. Add project ids to the results payload (#6) and count client-side | One payload | Shared with filters | Cannot count **mapped projects with zero results** (metric a), which by definition have no result rows |

## 11. Recommended Approach

**Option A.** Metric (a) needs the project catalogue, not result rows, so it can only be answered server-side. Start the server half right away (it is parallel-safe). Mount the client block after #5, so the template edits stay serial.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Proposed default / action |
|---|---|---|
| OQ-1 | "Mapped" = approved mapping only (Confirmed + allocation>0), or any mapping row? | Default: approved only (P2-3313 rule, already used by the Center Overview). Confirm with Nicoleta |
| OQ-2 | Does metric (b) count every status, or exclude Rejected (7) / Discontinued (4)? | Default: every status except Discontinued, to match "regardless of status" in item 1. Confirm |
| OQ-3 | Projects with W3 results but **no** approved mapping: count them in (b)? | Default: no, because (b) and (c) are subsets of (a), which keeps the % ≤ 100. Show the excluded count in a footnote if > 0 |
| OQ-4 | Which global filters (#6) apply here? Typology and status are result attributes, not project attributes | Default: P/A, Center and project apply; typology and status filter only metrics (b)/(c). #6 specifies this |
| R-1 | A project mapped to N P/As appears in N P/A bars, so the P/A bars sum to more than the total (the screenshot does too: 30 vs 65) | Caption: "A project mapped to several P/As counts in each". Center bars do sum to the total, because there is one lead Center |
| R-2 | 146 Alliance projects have a NULL `organization_code` | Reuse the alias fallback. Test with a fixture that has a NULL org |
| R-3 | `results_by_projects` also holds W1/W2 rows (memory: always filter by source) | (b) and (c) filter `r.source` explicitly and keep `rbp.is_active = 1` and `r.is_active = 1` |
| R-4 | `clarisa_projects.phase` is a **year**; results use `version_id` | Resolve the open version → year once on the server |


> **Resolved 2026-10-15:** the user delegated every open question to the recommended default ("haz lo que mejor recomiendes") and approved the proposal. Each `Proposed default` above is now the decision.

## 13. Success Criteria

- For the open phase, the 3 totals equal a prdb verification query.
- For ≥2 P/As and ≥2 Centers, the bars equal that query.
- (b) ≤ (a) and (c) ≤ (a) everywhere, and the percentages match.
- The page makes exactly one call for this block. The block has its own loading, error and empty states and never blocks the rest of the page.
- Scoped server and client Jest are green.

## 14. Next Step

```text
/akili-specify changes/portfolio-overview-revamp/w3-projects-section
```

Standard depth: the server endpoint plus a new block.
