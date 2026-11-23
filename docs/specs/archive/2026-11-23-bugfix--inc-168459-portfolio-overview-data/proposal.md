# Proposal — INC-168459 Portfolio Overview data feedback

**Answer first:** Ticket INC-168459 raises three points about `/portfolio-overview`. Point 1 (991 vs 989 mapped projects) is a **bug with an unconfirmed root cause**: the code shows two possible causes, and one read-only SQL run against prod will tell them apart. Points 2 (full P/A title, drop SGP-02) and 3 (say who must answer contribution requests) are **small changes** with clear code locations. Recommended: diagnose point 1 first, then specify all three as one Lite spec in Bug Mode.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/inc-168459-portfolio-overview-data` |
| Slug | `inc-168459-portfolio-overview-data`, derived from the argument (a PDF path, not a slug) |
| Type | ~~Bug~~ → **Change** (2026-11-19): P1 was diagnosed as a registry data gap, not a PRMS defect (§9). The spec scope is P2 + P3 |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | Freshservice ticket **INC-168459**, "Errors w data in PRMS" (PDF export `wee.pdf`, 2026-11-16, reporter: CGIAR System Organization) |
| Visual source | Screenshots in the ticket (KPI tile, By P/A chart, Contribution requests block). No Figma |
| Branch | `qa-development-2026-ss` |
| Related specs | `archive/2026-10-16-…w3-projects-section` (WPS), `archive/2026-11-04-…contribution-requests-by-pa` (CRP) |
| Date | 2026-11-19 |
| Proposal status | **Approved** by the user, 2026-11-19 ("si apruebo sigue"). Specify waits for Q1/Q2 (§9): this checkout has no server `.env`, so the agent cannot reach the DB |

## 2. Intent

Make the Portfolio Overview figures match the CLARISA mapping module and remove ambiguity, so PMU readers can trust the W3/Bilateral and contribution-request blocks.

## 3. Problem / Current Behavior

| # | Ticket point | Current behavior (cited) |
|---|---|---|
| P1 | The **Mapped projects** KPI shows **991**. The mapping-module dashboard shows **989** | `totals.mapped` counts a project once when it has at least one `Confirmed` mapping with `allocation > 0`, `cp.phase = <year>` and `is_active` NULL or ≠ 0 (`clarisa-projects.repository.ts`, `getPortfolioProjectFacts`). The total counts the project **whatever its program code is**: the P/A seed check applies to `byProgram` only (`results-framework-reporting.service.ts:1159-1167`). How the mapping-module dashboard counts is `UNVERIFIED — confirm at source before relying on it` (owner: CLARISA mapping module) |
| P2a | The By P/A chart shows codes only (`SP01`…) | The axis label is the code: `label: r.code` (`projects-block/projects.format.ts:37`), axis `rows.map(r => r.label)` (`projects.charts.ts:37`). `name` is already in the payload (`BilateralProjectsByProgramDto.name`) |
| P2b | `SGP-02` appears with 0/0/0 | The P/A seed is every active `portfolio_id = 3` initiative with `cgiar_entity_type_id IN (22,23,24)` (`results-framework-reporting.service.ts:1099-1105`). SGP-02 (AVISA / W3 catch-all, no AoWs) matches that rule. The same seed feeds the Contribution requests block (`:1264-1270`) and ToC coverage (`:966-970`) |
| P3 | "Pending 539" reads as if projects or Centers also owe answers | The block counts only `share_result_request` rows with `request_type = 'contribution'`, status 1/2/3, between two **initiatives** (`share-result-request.repository.ts`, `getPortfolioContributionRequestFacts`). W3 ingestion writes contributing programs as status **4** (draft), so they are excluded (`bilateral.service.ts:1699`). `results_by_projects` has no acceptance column (columns: `result_id`, `project_id`, `contribution_percentage`). **So projects and Centers never receive a request.** All 539 are owed by a P/A. The copy does not say this |

## 4. Proposed Outcome

- The KPI and the mapping module show the **same number** (989), or the page **states why they differ**.
- The By P/A chart and table show `code · full name`. SGP-02 is gone.
- The Contribution requests block says plainly that only Programs/Accelerators send and answer requests, and that W3/Bilateral projects and Centers never need to act.

## 5. Scope

| In | Out |
|---|---|
| Point 1: root cause and fix in `getPortfolioProjectFacts` and/or the totals aggregation | Changing how the CLARISA mapping module counts |
| Point 2: P/A labels (chart axis, tooltip, table) in `projects-block` | Restyling the chart |
| Point 2: exclude SGP-02 from the Portfolio Overview P/A seed (projects + contribution requests; ToC coverage decided at specify) | Other pages that list SGP-02 (Home, entity details) |
| Point 3: copy and/or a source split of Pending in `contribution-requests-block` | New request types and project-level acceptance |

## 6. Non-Goals

- No change to the request workflow or to how W3 ingestion writes requests.
- No new endpoint. The existing payloads already carry `name`.

## 7. Affected Users, Systems, And Specs

| Item | Detail |
|---|---|
| Users | PMU / portfolio leads, admin (both endpoints are admin-only) |
| Server | `clarisa-projects.repository.ts` · `results-framework-reporting.service.ts` (`getPortfolioBilateralProjects`, `getPortfolioContributionRequests`, perhaps `getPortfolioTocCoverage`) + specs |
| Client | `portfolio-overview/components/projects-block/*` · `contribution-requests-block/*` · `portfolio-overview.copy.ts` · `portfolio-overview/CLAUDE.md` |
| Specs | Changes the behavior archived in WPS and CRP. The archive stays as is; this spec records the delta |

## 8. Visual Reference

- Source: None (screenshots in the ticket only)
- Location: INC-168459 (Freshservice)
- Notes: Small label and copy changes on existing blocks. No mockup needed. Long names will need a layout choice at specify (rotated or wrapped axis labels vs a horizontal chart vs code on the axis with the full name in the tooltip and table).

## 9. Bug Diagnosis (point 1)

### Observed Symptom
The **Mapped projects** KPI shows 991 for phase 2026. The CLARISA mapping-module dashboard shows 989 accepted projects.

### Reproduction Steps
1. Log in as admin → `/portfolio-overview`, phase 2026 → W3/Bilateral projects block → KPI = 991.
2. CLARISA mapping-module dashboard, 2026 → 989.
Expected: equal. Actual: +2.

### Root Cause — **NOT yet confirmed**
The code shows three candidate causes. The database has to tell them apart:

| H | Hypothesis | Evidence in code | Check |
|---|---|---|---|
| H1 | Totals count projects whose only confirmed mappings are to codes **outside** the active P/A seed (inactive or renamed code, odd spelling) | `service.ts:1159-1164`: totals counted on `codes.size > 0`, before the seed lookup at `:1166` | SQL Q1 |
| H2 | **Status or flag definitions differ**: PRMS treats `is_active IS NULL` as active and accepts only `Confirmed` | Repository `WHERE` + `APPROVED_MAPPING_STATUSES = {'Confirmed'}` | SQL Q2 + ask the mapping-module owner for its definition |
| H3 | **The cache is stale**: `clarisa_projects` / `clarisa_project_mappings` lag behind CLARISA (2 projects changed since the last sync) | Data comes from the CLARISA cron cache, not live | Compare the 991 IDs with a mapping-module export |

Read-only SQL to run on the DB the page reads (phase year 2026):

```sql
-- Q1 (H1): counted in the total, but no confirmed mapping to an active P/A of the seed
SELECT cp.id, cp.full_name, GROUP_CONCAT(DISTINCT TRIM(cpm.program_code)) AS codes
FROM clarisa_projects cp
JOIN clarisa_project_mappings cpm ON cpm.project_id = cp.id
 AND cpm.allocation > 0 AND BINARY TRIM(cpm.status) = 'Confirmed'
 AND cpm.program_code IS NOT NULL AND TRIM(cpm.program_code) <> ''
WHERE cp.phase = 2026 AND (cp.is_active IS NULL OR cp.is_active <> 0)
GROUP BY cp.id, cp.full_name
HAVING SUM(UPPER(TRIM(cpm.program_code)) IN (
  SELECT UPPER(TRIM(ci.official_code)) FROM clarisa_initiatives ci
  WHERE ci.portfolio_id = 3 AND ci.active = 1 AND ci.cgiar_entity_type_id IN (22,23,24))) = 0;

-- Q2 (H2): how the 991 split on is_active, and duplicate project names
SELECT (cp.is_active IS NULL) AS active_is_null, COUNT(DISTINCT cp.id) AS projects
FROM clarisa_projects cp
JOIN clarisa_project_mappings cpm ON cpm.project_id = cp.id
 AND cpm.allocation > 0 AND BINARY TRIM(cpm.status) = 'Confirmed' AND TRIM(cpm.program_code) <> ''
WHERE cp.phase = 2026 AND (cp.is_active IS NULL OR cp.is_active <> 0)
GROUP BY active_is_null;
```

If Q1 returns 2 rows, H1 is confirmed. If not, H2 or H3 applies, and the fix may be a data or sync fix rather than a code fix.

**Results on PRPROD (run by the user, 2026-11-19):**

| Query | Result | Verdict |
|---|---|---|
| Q1 | 0 rows | **H1 rejected**: every counted project maps to an active P/A |
| Q2 | `active_is_null = 1` → 991 (all) | **The `is_active` filter never applies**: CLARISA never sends `is_active`. H2 cannot be about `is_active` |

**New lead, H4: the sync never removes projects** (`clarisatask.service.ts:635-734`, `syncProjects`). For each project in the CLARISA payload it updates or inserts the project and replaces its mappings (`:689-715`). A project that **is no longer in the payload** is never deleted or deactivated, and its old `Confirmed` mappings stay, because mappings are only rebuilt for projects in the payload (`:709`). So a project that CLARISA deleted, moved out of phase 2026 or re-created under a new id stays counted. Two other candidates come from columns the sync already stores: `source_status` (a cancelled or closed W3 Registry status the mapping module may exclude) and duplicates of one registry project (`external_code`).

```sql
-- Q3 (H2'): source_status among the 991
SELECT cp.source_status, COUNT(DISTINCT cp.id) AS projects
FROM clarisa_projects cp
JOIN clarisa_project_mappings cpm ON cpm.project_id = cp.id
 AND cpm.allocation > 0 AND BINARY TRIM(cpm.status) = 'Confirmed' AND TRIM(cpm.program_code) <> ''
WHERE cp.phase = 2026
GROUP BY cp.source_status;

-- Q4 (H4): the same registry project twice under different ids
SELECT cp.external_source, cp.external_code, COUNT(DISTINCT cp.id) AS n,
       GROUP_CONCAT(DISTINCT cp.id) AS ids
FROM clarisa_projects cp
JOIN clarisa_project_mappings cpm ON cpm.project_id = cp.id
 AND cpm.allocation > 0 AND BINARY TRIM(cpm.status) = 'Confirmed' AND TRIM(cpm.program_code) <> ''
WHERE cp.phase = 2026 AND cp.external_code IS NOT NULL
GROUP BY cp.external_source, cp.external_code
HAVING n > 1;
```

**Results on PRPROD (2026-11-19):** Q3 → `active` = 991 (all), so **`source_status` is rejected**. Q4 → 0 rows, so **no duplicates**. Still open: H4 (stale rows) or a different "accepted" definition in the mapping module (OQ-1). Only an id-level comparison with CLARISA can tell these apart.

```sql
-- Q5: the 991 ids, to diff against the mapping-module list
SELECT DISTINCT cp.id, cp.external_code, cp.full_name
FROM clarisa_projects cp
JOIN clarisa_project_mappings cpm ON cpm.project_id = cp.id
 AND cpm.allocation > 0 AND BINARY TRIM(cpm.status) = 'Confirmed' AND TRIM(cpm.program_code) <> ''
WHERE cp.phase = 2026
ORDER BY cp.id;
```

### Root cause — **confirmed (2026-11-19): not a PRMS defect**

The id-level comparison was run on the project-mapping registry export `prms-projects-20261119-1131.xlsx` (1 643 projects, FY26, no filters) against Q5 (`…_202611191122.csv`, 991 rows):

| Set | Count |
|---|---|
| PRMS mapped (Q5) | 991 |
| Registry projects with `Mapped Programs` | **991**: the same codes. Diff both ways = **0** |
| …Funding Source `bilateral` | 831 |
| …Funding Source `window3` | 158 |
| **bilateral + window3** | **989**: the figure on the mapping-module dashboard |
| …Funding Source empty | **2**: `T-PJ-004108` (IITA, SP06+SP11), `T-PJ-004312` (IITA, SP01+SP02). Both `Negotiation Locked = Yes - negotiation`, last updated 2026-07-17 / 07-20 |

PRMS counts exactly what the registry holds. The mapping-module dashboard leaves out the 2 projects whose **Funding Source is blank** in the registry. This is a registry data-quality gap, and possibly a dashboard filter on funding source. That the dashboard filters on funding source is inferred from the exact 989 match; owner confirmation is pending (OQ-1). Timing is ruled out: no mapped project was created on or after 2026-11-16. H1–H4 are all rejected.

**PRMS-side confirmation (PRPROD, 2026-11-19):** `clarisa_projects.source_of_funding` among the 991 is `bilateral` 831 · `window3` 158 · `NULL` 2. The sync copies CLARISA `source_of_funding` as-is (`clarisa-endpoints.enum.ts:645`), and no PRMS count reads it. The blank comes from the registry (source of truth) through CLARISA. Both projects are IITA consulting / technical-assistance contracts funded by national governments (`FME- NIGERIA`, `MIN AFFAGRIPEL.DERU`). `Nature of Funder` is also blank on both. They are the only 2 of 1 643 registry projects with no Funding Source. Open business question for the registry owner: classify them (most likely `bilateral`, which gives 991 everywhere), or, if service contracts are not W3/bilateral projects, remove their mapping (PRMS then reads 989 after the next sync, at most 8 h later).

**Outcome for P1:** no PRMS code change. Action: (a) reply to the reporter with this reconciliation, and (b) ask the mapping-module / IITA owners to fill the Funding Source of the 2 projects, after which both figures read 991. P1 leaves the spec scope. The spec carries P2 and P3 only, so the effective track becomes **Change** (the path keeps the ticket name).

H4 (the sync never removes projects) remains a latent risk: no stale row exists today (diff = 0). It is recorded as a follow-up, not fixed here.

(Superseded) Definitive H4 check: compare the 991 ids with the ids CLARISA returns now (`GET projects?phase=2026`) or with the mapping-module export. Ids present only in PRMS are the stale rows.

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all -i --grep="168459"` → no hits. `git log --all --oneline --since=2026-11-04 -- clarisa-projects.repository.ts …/portfolio-overview share-result-request.repository.ts` → 9 commits (SR-168253 filters/export, INC-168045 typology, centers tiles, CRP block). None touches the mapped count, P/A labels, the seed or the pending copy | **Not fixed** |
| **Live path?** | Client `ProjectsBlockComponent` → `GET results-framework-reporting/portfolio/bilateral-projects` (`controller.ts:352`) → `getPortfolioBilateralProjects` (`service.ts:1085`) → `getPortfolioProjectFacts` → `totals.mapped` (`service.ts:1164`) | On path. The SQL decides which hypothesis holds |
| **Siblings on the same state** | Same seed: `getPortfolioContributionRequests` (`service.ts:1264`), `getPortfolioTocCoverage` (`:966`), `results.service.ts:2105`. Same approval rule: `findApprovedProjectsByProgramCode` (repository), `BilateralProjectsService` (`APPROVED_MAPPING_STATUSES`) | An H1 fix touches totals only. The SGP-02 exclusion has to choose which seeds to change |
| **Downstream consumers** | `projects-block` (KPI, chart, table), the CRP block, `results-framework-reporting.service.spec.ts:2183` (asserts the seed `[22,23,24]`), repository spec. No bilateral or platform-report payload | Specs to update. No external contract change |

### Fix Strategy
If H4 is confirmed: make `syncProjects` reconcile, deactivating (`is_active = 0`) the projects missing from a **non-empty** payload and dropping their mappings, and guard against an empty or failed fetch (`:645-651` returns `[]` on error, which must not deactivate everything). Regression test: a project missing from the payload no longer counts in `totals.mapped`. The sibling blast radius then covers `findApprovedProjectsByProgramCode` and `BilateralProjectsService`, which read the same cache. If Q3 points to `source_status`: filter on it in `getPortfolioProjectFacts`.

Original H1 plan (now rejected), kept for the record: for H1, count a project in `totals` only when at least one approved code is in the seed (the same rule as `byProgram`), and add a regression test (a project mapped only to a non-seed code must not raise `totals.mapped`). For H2 or H3, record the mapping-module definition and either align the filter or add a one-line note under the KPI. Route: `/akili-specify` (Lite) in **Bug Mode**, with a red-then-green regression test.

## 10. Approach Options

| Option | What | Trade-off |
|---|---|---|
| A. One Lite spec, three points | Diagnose P1, then specify P1–P3 together | One review cycle, answers the ticket in one go. **Small: about 4 tasks** |
| B. Split: bugfix (P1) + quick (P2, P3 copy) | P2/P3 through `/akili-quick` | P2b changes a server seed and its tests, and P3 may add a source split. Neither is trivial, so quick would escalate |
| C. Ship P2/P3 now, park P1 | Fast visible win | The ticket stays open on its headline item |

## 11. Recommended Approach

**Option A.** The user runs Q1/Q2 first, and the result is recorded in this Bug Diagnosis. Then `/akili-specify` defines:
- P1: the confirmed fix + a regression test.
- P2: `code · name` labels (layout decided at specify) and exclusion of SGP-02 by code (both `SGP-02` and `SGP02`, see `result-framework-reporting/AGENTS.md` §11.1) from the projects and contribution-requests seeds.
- P3: copy in the block header ("Requests are sent and answered only by Programs/Accelerators. W3/Bilateral projects and Centers do not receive requests and need no action."), plus, if approved, a Pending split by result source (W1/W2 vs W3) built from the facts already returned.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| OQ-1 | How does the mapping-module dashboard count "mapped and accepted" (statuses, allocation, inactive projects)? Owner: CLARISA / mapping-module team |
| OQ-2 | Should SGP-02 also leave **ToC coverage**, or only the two blocks the ticket shows? |
| OQ-3 | P3: is copy alone enough, or does the PMU want Pending split by result source? The reporter's guess ("W3/bilat projects … accepted by default") does not match the code: the 539 are all P/A-to-P/A. The reply to the reporter should say so; the reporter also asked a named colleague to confirm |
| OQ-4 | P2a: is a full name on a 13-bar axis readable at 390 px? This may push the full name into the tooltip and table only |
| R-1 | H3 (stale cache) would mean no code fix is possible. The deliverable then shrinks to a note + sync check |
| Dep | DB access for Q1/Q2 (the user runs it, as in CRP V-1) |

### Decisions (user, 2026-11-19)

| OQ | Decision |
|---|---|
| OQ-2 | **SGP-02 must not appear anywhere in phase 2026**: it does not report in 2026. Scope widens from the two blocks to every 2026 P/A listing or seed. `/akili-specify` enumerates the call sites (siblings: `service.ts:966/1099/1264`, `results.service.ts:2105`, Home / entity lists). Boundary: listings and aggregates only. The AVISA / SGP-02 ingestion and versioning code (`versioning.service.ts:946-965`, `platform-report.service.ts:466`, `results.service.ts:3355`) is **not** touched, so older phases keep working |
| OQ-2 (refined) | The SGP-02 sweep found ~25 surfaces. **User decision:** split. This spec covers Portfolio Overview only. A separate spec hides switched-off initiatives everywhere else in 2026. **Mechanism:** the existing per-phase admin switch (`phase_initiative_reporting_access.reporting_enabled`), never a hard-coded `SGP-02` |
| OQ-4 | The reporter wants full names on the axis. **Recommendation adopted:** switch the By P/A chart to **horizontal bars**, so programs become rows on the Y axis and the label `SP01 · <short name>` reads in full without rotation at any width. The official long name goes in the tooltip and table |
| OQ-3 | **Copy only** (agent recommendation, accepted). All 539 pending are P/A-to-P/A, so a W1/W2 vs W3 split would not answer the reporter's concern. A one-line explainer under the block title says who sends and answers requests, and that W3/Bilateral projects and Centers never act |

## 13. Success Criteria

- KPI = mapping-module figure for 2026, or the documented difference is shown on the page.
- The By P/A chart and table show full P/A names. No SGP-02 row in either block.
- The Contribution requests block states who must act. The reporter confirms that INC-168459 is answered.
- Regression test for P1 is red before the fix and green after. Server and client suites and lint are clean.

## 14. Next Step

1. Run Q1/Q2 (§9) and paste the result. The root cause is then recorded here.
2. Then:

```text
/akili-specify bugfix/inc-168459-portfolio-overview-data
```

(Lite, **Bug Mode**.)
