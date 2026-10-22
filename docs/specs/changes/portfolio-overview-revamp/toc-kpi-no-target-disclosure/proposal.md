# Proposal — ToC KPI block: disclose KPIs with no target

> **In one line:** the admin Portfolio overview "Progress against ToC KPIs" block drops KPIs with no target without saying so. Add an additive `noTarget` count to the coverage endpoint and show "excludes N KPIs with no target set", the same wording the Science Program pages use. The % rule does not change.

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure/` |
| **Parent Spec** | `docs/specs/changes/portfolio-overview-revamp/` (child #11) |
| **Type** | Change |
| **Slug** | `toc-kpi-no-target-disclosure`, from the user's argument |
| **Approval Mode** | gated |
| **Date created** | 2026-10-22 |
| **Status** | approved (2026-10-22) |
| **Origin** | Follow-up of INC-165202 (Resync PRMS with ToC for BDN), raised in the session of 2026-10-22. No Jira ticket |
| **Requested by** | santiago.sanchez@cgiar.org ("arranca pues") |
| **Depends on** | `changes/portfolio-overview-revamp/toc-kpi-target-filter` (#10, done, `e5c2c775b`) |
| **Parallel-safe** | yes. No other open child touches these files |
| **Spec ID prefix** | `TND` |

## 2. Intent

When a number leaves out some KPIs, the page says how many it left out. The Science Program pages already do this. The admin ToC KPI block does not.

## 3. Problem / Current Behavior

| Surface | What it shows for KPIs with no target |
|---|---|
| Science Program page (Reporting, Overview, entry hub) | Leaves them out of the %, and says `excludes N KPIs with no target set` (KTO-R-6 / KCR-R-2.1) |
| Admin Portfolio overview › Progress against ToC KPIs | Leaves them out of both `total` and `covered` (TKF-R-1, `e5c2c775b`) **with no disclosure** |

Facts from the code on `master`:

- `AoWBilateralRepository.getPortfolioTocCoverage` uses an inner `JOIN` to the target subquery (`target_date = reportingYear`, `target_value > 0`). The KPIs with no target are dropped, and no count of them is kept.
- The response (`PortfolioTocCoverage`) only has `total` and `covered`, per program, per `outputs` / `outcomes`, and for the `portfolio`.
- The subtitle still says "...out of the KPIs in each Program's Theory of Change". It does not say "with a target".
- A program whose KPIs **all** have no target shows `No ToC KPIs in this phase`. That is false: the program has KPIs, they just have no target.

The result: an admin who compares this block with a Science Program page sees different totals and has no way to tell why. This is the same kind of confusion that started INC-165202.

## 4. Proposed Outcome

- Each program row, the portfolio summary and the outputs / outcomes split know how many KPIs were left out because they have no target.
- When that number is above 0, the block says `excludes N KPI(s) with no target set`.
- A program with only no-target KPIs says so, instead of "No ToC KPIs".
- The subtitle says the ratio covers KPIs with a target.
- `total`, `covered` and the % stay exactly as they are today.

## 5. Scope

**In scope**
- Server: `getPortfolioTocCoverage` SQL (inner `JOIN` → `LEFT JOIN` to the target subquery, with conditional counts), `PortfolioTocCoverageRow`, the service roll-up, the response DTOs, and their specs.
- Client: `portfolio-toc-coverage.interface.ts`, `toc-kpi.format.ts`, `toc-kpi-block.component.{ts,html}`, `PORTFOLIO_OVERVIEW_COPY.tocKpi`, and their specs.

**Size estimate:** about 250 LOC with tests. 2 implementation tasks (server, then client) plus 1 verification task.

## 6. Non-Goals

- No change to the % rule or to `total` / `covered` (P2-3974 / TKF-R-1 / TKF-R-2 stay).
- No "with / without target" filter on the admin page. The % only means something over KPIs with a target, so a filter would add a view with no ratio.
- No change to how many nodes the block counts (TKP-P-1 / TKP-P-2). See TND-OQ-1.
- No change to the Science Program pages.
- No change to the global filters (#6), which narrow the rows on the client and never refetch.

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| PMU / platform admin (the only users of Portfolio overview, `CheckAdminGuard`) | See the disclosure |
| `GET api/results-framework-reporting/toc-results/portfolio-coverage` | New fields are added. Nothing is renamed or removed |
| Archived specs #5 `toc-kpi-progress` and #10 `toc-kpi-target-filter` | Get a dated amendment note when this ships (TKP response shape, TKF-R-3 "response shape unchanged") |
| `docs/trd/trd.md` | No change expected. The endpoint stays admin-only and keeps its path |

## 8. Visual Reference

- **Source:** None.
- **Notes:** this is one muted text line under rows and summary lines that already exist, styled like `toc-kpi-split` (`text-[12px]`, `--pr-text-secondary`). It reuses the SP wording. A mockup would not add anything.

## 9. Requirement Delta Preview

### ADDED Requirements

- **TND-R-1:** the endpoint returns `noTarget` (a count of distinct active indicators, in the same node scope, with no target row for the reporting year whose value is above 0) for each program, for its `outputs` and `outcomes`, and for `portfolio`. The rule for "has a target" is the one TKF-R-1 already uses. `total + noTarget` = every in-scope indicator.
- **TND-R-2:** the portfolio summary and each program row show `excludes N KPI(s) with no target set` when N > 0. The singular/plural wording follows the SP pages. The `excludes …` line is not shown when N = 0.
- **TND-R-3:** a program with `total = 0` and `noTarget > 0` shows `No KPIs with a target · N with no target set` instead of `No ToC KPIs in this phase`. When both are 0, it keeps today's text.

### MODIFIED Requirements

- **TKP response shape (from #5):** gains `noTarget`, added without changing anything else.
- **Subtitle copy:** "...out of the KPIs **with a target** in each Program's Theory of Change for {year}".

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. One query with conditional counts** (recommended) | Swap the target `JOIN` for a `LEFT JOIN`. Then `total = COUNT(DISTINCT CASE WHEN tgt.indicator_id IS NOT NULL THEN tri.id END)`, `covered` keeps the same condition plus `cov`, and `noTarget = COUNT(DISTINCT CASE WHEN tgt.indicator_id IS NULL THEN tri.id END)` | One round-trip. The same scope is guaranteed. Small diff | The `LEFT JOIN` keeps more rows before grouping. p95 has to be checked again |
| B. Second query for the count without the target filter | Run today's query and the pre-`e5c2c775b` query, then subtract | Today's SQL stays untouched | 2 scans of the ToC tables. The two queries can drift apart |
| C. Client only | Get the count from another endpoint | No server change | No endpoint has this number for the admin scope. It would need a new endpoint, so it costs more than A |

## 11. Recommended Approach

**Option A.** It is the smallest change that keeps one source of truth. The `tgt` subquery is `DISTINCT` per (indicator, node), and a `tri` row has one `related_node_id`, so the `LEFT JOIN` gives at most one `tgt` row per indicator. The `DISTINCT tri.id` counts stay exact.

Task outline (to be confirmed by `/akili-specify`):
1. **Server.** Repository SQL, row type, service roll-up (`addCounts` carries `noTarget`), DTOs. Test-first repository spec cases: an indicator with a target / with no target / with a target only in another year / with no target but linked by a QA'd result (counts in `noTarget`, not in `covered`).
2. **Client.** Interface, format helpers, copy, template lines, component spec. Check the layout at 1280, 768 and 375.
3. **Verification.** The user runs a read-only parity query (given inline in chat), checked against the endpoint for 2 programs. A PRTest smoke follows.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Default if not answered |
|---|---|---|
| TND-RK-1 | The `LEFT JOIN` makes the query slower | Check p95 against the #5 baseline. If it gets worse by more than 2×, fall back to Option B |
| TND-RK-2 | The response changes shape (fields are added). The only consumer is the admin block | Accepted. Dated amendments go into #5 and #10 |
| TND-OQ-1 | `total + noTarget` will **still not equal** a SP page's "Total # of KPIs" (e.g. BDN 213). The admin block counts only OUTPUT / OUTCOME nodes in an AoW (or OUTPUT with no WP) and per indicator. The SP chip also counts Intermediate and 2030 outcomes, and counts cross-cut IOs once. Should the block say that? | Not in this spec. The disclosure explains the gap caused by targets, not the gap caused by scope. If the scope gap still causes questions, open a separate proposal |
| TND-OQ-2 | Should `excludes …` also show in the outputs / outcomes split line? | No. Show it on the row and the summary only, so the row stays short at 375 px |
| — | Shared-DB rule | Agents run no SQL against prdb. Parity numbers come from the user |

## 13. Success Criteria

- For every program, `total + noTarget` equals the count of in-scope active indicators from an independent read-only SQL, and `total` / `covered` match the values before the change.
- The portfolio summary and every row with no-target KPIs show the `excludes …` line. Rows without them show no extra line.
- A program with only no-target KPIs no longer says "No ToC KPIs".
- The repository, service and component specs are green. `--findRelatedTests` on the changed files passes.

## 14. Next Step

```text
/akili-specify changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure
```
