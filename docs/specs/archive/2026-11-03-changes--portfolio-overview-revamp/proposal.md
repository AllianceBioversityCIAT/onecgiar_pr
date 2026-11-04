# Proposal — Portfolio Overview Revamp (stakeholder feedback items 1–8)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/` (parent of a spec family — split pending approval) |
| Slug | `portfolio-overview-revamp` — derived from free-text argument ("En porfolio overview me piden esto: [stakeholder list 2–8] podemos hacer un plan para abordar todo esto?") |
| Type | Change |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org |
| Date | 2026-10-14 |
| Module | `result-framework-reporting` › `portfolio-overview` (client) + `results` / `results-framework-reporting` (server, for 2 chunks) |
| Related child already proposed | `changes/portfolio-overview-kpi-breakdown` (item 1 — KPI cards new vs replicated) |

## 2. Intent

Turn `/portfolio-overview` from a **ranking dashboard** into a **portfolio monitoring view**. Stakeholders asked for three things. First, remove the charts that read as a competition between Programs and Centers. Second, show progress against what each Program committed to in its ToC, not raw result volume. Third, let readers slice every chart by Program, project, Center, typology and status.

## 3. Problem / Current Behavior — the 8 items mapped to the screen

| # | Stakeholder ask | Current section (`portfolio-overview.component.html`) | What the code shows today |
|---|---|---|---|
| 1 | KPI cards: new vs replicated | Top deck `:116-230` | Already proposed → `changes/portfolio-overview-kpi-breakdown` |
| 2 | Global filters: Program/Accelerator · W3/bilat project · Center · typology · status | none | Payload has `submitter` (Program), `result_type`/`result_level`, `status_id`, `lead_center` (acronym only). **No project and no contributing centers** (`result.repository.ts:706-759`) |
| 3 | Include W3/bilat in the status section; rename it to "Portfolio Results Reporting Status"; link a doc explaining statuses | "Portfolio reporting status" `:235-335` | **It already counts W3/bilat.** `statusSegments()` has no source filter (`portfolio-overview.service.ts:276-298`), and 2069 = 1790 W1/W2 + 279 W3. The subtitle "Aggregate progress across all Science Programs" is what suggests otherwise. **No status-glossary document exists in the app.** |
| 4 | Typology view (output / outcome / impact level), by P/A and by Center (bilaterals) | none (the matrix `:382` is type × Program, not level) | The data is on the wire: `result_level_name`, `result_type`, `submitter`, `lead_center` |
| 5 | Remove "Science Programs output ranking" (competition) | `:337-380` | Bar/heatmap ranking of Programs |
| 6 | Progress by P/A against ToC KPIs: "Program X has 250 KPIs; pooled results submitted/in QA cover 100 → 40%" | "Progress by science program" `:382-745` | Counts results per type. **There is no portfolio-wide endpoint for "indicators covered by ≥1 result".** `toc-results/program-progress` is one call per Program, and its `indicators_counted` means "has a target", not "has a result" |
| 7 | CGIAR Centers cards ("?"): show only W3/bilat **replicated** (obvious, filterable) and **NEW** | `centers-block` KPI cards | "W3/Bilateral results" plus "Centers reporting N/15". There is no new/replicated split. Its own data path is `GET_bilateralCenterResults` per Center |
| 8 | Remove "CGIAR Centers ranking" (competition) | `centers-block.component.html:124-155` | Ranking bars/heatmap |

## 4. Proposed Outcome

After the revamp, the page reads top to bottom as follows:

```
[ Global filter bar: Program · W3 project · Center · Typology · Status ]        ← item 2
[ KPI cards: Total · W1/W2 · W3/Bilateral — new vs replicated ]                  ← item 1
[ Portfolio Results Reporting Status (all sources) · "What do statuses mean?" ↗ ] ← item 3
[ Results by typology — level × type, by P/A | by Center ]                      ← item 4
[ Progress against ToC KPIs, by P/A — covered / total KPIs (%) ]                 ← item 6
[ CGIAR Centers — W3/Bilateral: New | Replicated (filterable), status, detail ]  ← item 7
   (no Program ranking, no Center ranking)                                       ← items 5, 8
```

## 5. Scope — proposed split (6 bounded chunks)

Ordered by MoSCoW, then by effort and risk. Every client chunk except C3 edits `portfolio-overview.component.html`, so they run **serially**.

| # | Child spec | Items | Size | Layer | Depends on | Parallel-safe |
|---|---|---|---|---|---|---|
| C1 | `changes/portfolio-overview-revamp/remove-rankings-status-copy` | 3, 5, 8 | S | client | none | no (same template as C2) |
| C2 | `changes/portfolio-overview-kpi-breakdown` *(exists, keep path)* | 1 | S | client | C1 | no |
| C3 | `changes/portfolio-overview-revamp/centers-new-vs-replicated` | 7 | S–M | client (+ server if the Center payload lacks `is_replicated`) | none | **yes** (only `centers-block/`) |
| C4 | `changes/portfolio-overview-revamp/typology-view` | 4 | M | client | C2 | no |
| C5 | `changes/portfolio-overview-revamp/toc-kpi-progress` | 6 | L | **server** (new portfolio endpoint) + client (replaces the matrix) | server part none; client part C4 | server half yes |
| C6 | `changes/portfolio-overview-revamp/global-filters` | 2 | L | **server** (add project + contributing centers to payload) + client (filter bar → every computed) | C1–C5 | no |

> ⚠️ Superseded 2026-10-14: the actual order lives in `family.md` (`kpi-breakdown` runs first because it is already being implemented). C-ids below are this proposal's original labels.

**Why this order:** C1 is mostly deletion and answers the "competition" concern right away. C2 is already written. C6 comes last because "filters applicable to all charts" can only be wired once the set of charts is final; otherwise each new section must be retrofitted.

## 6. Non-Goals

- No change to which results count as W1/W2 vs W3/Bilateral (`source_name`).
- No drill-down destinations for counters (still pending on P2-3304).
- No change to Program Overview / Center Overview pages, apart from reusing their badges and labels.
- No authoring of the status-explanation document. PRMS links to it; the content comes from the stakeholder or PMU.

## 7. Affected Users, Systems, And Specs

- **Users:** Admin / PMU readers of `/portfolio-overview` (`CheckAdminGuard`).
- **Client:** `portfolio-overview/` (component, service, `components/centers-block/`, CLAUDE.md), `internationalization/portfolio-centers-block.copy.ts`.
- **Server (C5, C6):** `results-framework-reporting` (new ToC-coverage aggregate), `results/result.repository.ts` (`AllResultsByRoleUserAndInitiativeFiltered` select: projects + contributing centers).
- **Related specs:** `archive/2026-08-28-changes--portfolio-overview-echarts`, `bugfix/portfolio-overview-partial-counts`, `changes/overview-replicated-new-badges` (reuse its New/Replicated labels for C2/C3), `archive/2026-09-01-changes--overview-aow-progress-hero` (ToC rollup logic for C5).

## 8. Visual Reference

- Source: stakeholder screenshot with items 2–8 (attached to the request) + ASCII outline in §4.
- Location: current screen `/portfolio-overview`; no Figma.
- Notes: each child may add an HTML mockup under its own `mockup/` before `/akili-specify`. This is optional and most useful for C4 and C5, which are new visualisations.

## 9. Requirement Delta Preview

### ADDED
- Global filter bar (Program, W3/bilat project, Center, result typology, result status); every section recomputes from the filtered rows.
- Typology view: results by level (output / outcome / impact) × type, switchable by P/A and by Center (bilateral).
- ToC KPI progress per P/A: `covered KPIs / total ToC KPIs (%)`, where covered = ≥1 contributing **pooled (W1/W2)** result in **Submitted or QA** status.
- Link "What do these statuses mean?" next to the status section.
- Centers block: W3/Bilateral **New** vs **Replicated** counts, with replicated visibly tagged and filterable.

### MODIFIED
- "Portfolio reporting status" → **"Portfolio Results Reporting Status"**; the subtitle states that it covers W1/W2 + W3/Bilateral.
- "Progress by science program" stops counting results per type and shows KPI coverage instead.
- Centers block KPI cards are replaced by New / Replicated.

### REMOVED
- "Science Programs output ranking" (item 5).
- "CGIAR Centers ranking" (item 8).

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Family of 6 chunks, serial client, server halves in parallel** | As in §5 | Each chunk is reviewable and shippable; quick wins (C1, C2) reach stakeholders this week | 6 spec cycles |
| B. One big spec | All 8 items together | One review | Mixes S deletions with L server work; nothing ships until everything does; filters retrofit risk |
| C. Two phases (client-only now, server later) | C1–C4 now, C5+C6 later | Simple framing | Same as A, but with less granular tracking |

## 11. Recommended Approach

**Option A.** Ship C1 and C2 first: both are client-only and mostly reuse data already on the wire. Run C3 in parallel. Start the C5 server endpoint early because it is the longest lead. Keep C6 last.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Proposed default / action |
|---|---|---|
| OQ-1 | **Status document URL** (item 3): which document? Does one exist? | Ask the stakeholder for the link. If none exists, PMU writes it; PRMS ships the link slot hidden until a URL exists. |
| OQ-2 | **What is a "ToC KPI"** (item 6): every ToC indicator of the Program (outputs + outcomes + EOIs)? Only those with a target in the open year? | Default: indicators of the Program's ToC for the open phase year, excluding Intermediate Outcomes without an AoW (same scope as `program-progress`). Confirm with the stakeholder. |
| OQ-3 | "Only **pooled** and only **submitted/in QA**" | Pooled = `source = 'Result'` (W1/W2). Statuses = Submitted (3), Quality Assessed (2), Approved (6)?, Pending review (5)? → confirm the exact set. |
| OQ-4 | Item 7 wording: "pls only include W3/bilateral only replicated results … and NEW results" | Read as: the Centers block shows W3/Bilateral **New** + **Replicated**, with replicated clearly tagged and filterable. Confirm that the block should not also drop other figures (status donut, detail table). |
| OQ-5 | Center filter: lead only, or lead **or** contributing? | Default: lead **or** contributing, the same rule as the Center Overview. Needs the payload change in C6. |
| OQ-6 | Should the global filters also drive the Centers block, which has its own data path? | Default: yes for Center / project / status / typology. This requires the block to filter its rows client-side; spec this in C6. |
| R-1 | C6 adds `GROUP_CONCAT` of projects/centers to a query that returns up to 20 000 rows → latency | Measure on prdb before/after. Fallback: a separate lightweight `result_id → projects/centers` map endpoint. |
| R-2 | C5 portfolio-wide ToC coverage is a heavy query (all Programs × indicators × contributions) | Server-side aggregate with one call. Do not loop `program-progress` per Program in the client. |
| R-3 | Removing the rankings (C1) deletes `onRankingChartClick`, ranking computeds and their specs | Run the scoped Jest suite (`--testPathPattern=portfolio-overview --maxWorkers=2`). Per memory, fix asserted copy in specs before commit. |
| R-4 | The Centers block total ≠ page W3 tile (lead or contributing vs source) — already documented | Keep it. C3 copy must say "results led or contributed by Centers" so the two numbers are not compared. |

## 13. Success Criteria

- No ranking chart remains on `/portfolio-overview` (items 5, 8).
- The status section is titled "Portfolio Results Reporting Status", states that it includes W3/Bilateral, and links the status document once a URL exists.
- Every KPI and Centers figure reconciles: new + replicated = total.
- Per P/A, `covered / total` ToC KPIs is shown and matches a prdb verification query for at least 2 Programs.
- One filter selection changes every section consistently. The filtered status total equals the filtered KPI total.

## 14. Next Step

Approve the split (or adjust it). On approval: write `family.md` in this folder, add `Parent Spec` to `changes/portfolio-overview-kpi-breakdown`, then create the child proposals. The first spec to run is:

```text
/akili-specify changes/portfolio-overview-revamp/remove-rankings-status-copy
```
