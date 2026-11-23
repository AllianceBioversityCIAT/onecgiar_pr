# Proposal — "Contributing to W1/W2" counts 2026 P/A results only

> **Closed 2026-11-23, not implemented.** PROD data (WCO-T-2) showed that the 147 is not inflated by 2025 innovations (only 2 projects). 138 come from SP09 result 31436 (id 34792), which is linked to all 138 SP09-mapped W3 projects in one action. The counting rule is correct. The reporter (Elizabeth Babalola) was asked to confirm or trim the links, and Nicoleta was informed. No code change.

> **In one line:** the W3/Bilateral projects block counts a project as "Contributing to W1/W2" when it is linked to any pooled result of the 2026 version. That includes 2025 innovations replicated into 2026. Nicoleta wants only results created in 2026 to count. Fix: add `is_replicated = 0` to one `EXISTS` in one repository query.

## 1. Document Control

| Field | Value |
|---|---|
| Ticket | Freshservice **INC-169059** "Contributions counting" (Nicoleta, status New) |
| Spec Path | `changes/w1w2-contributors-2026-only` |
| Slug | `w1w2-contributors-2026-only`, derived from the ticket (the command argument was only a screenshot) |
| Type | Change. It changes a counting rule set by the archived WPS spec. Nothing is broken |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | Ticket screenshot pasted into `/akili-propose`. No Jira issue |
| Visual source | None. Backend counting only; the chart and copy stay the same |
| Depends on | `changes/portfolio-graphs-clarity` (PGC). It rewrote the same query in `f965ca5f3`, so build on top of it (see Risks) |
| Parallel-safe | no. Same method as PGC |
| Date | 2026-11-23 |

## 2. Intent

The "Contributing to W1/W2" count in the W3/Bilateral projects block, for both the KPI tile and the bars, should only count contributions to pooled results reported **for 2026 by the P/As**. Contributions from 2025 innovations carried into the 2026 phase should not count.

## 3. Problem / Current Behavior

| # | Fact | Source |
|---|---|---|
| 1 | The KPI reads "Contributing to W1/W2". In the screenshot it shows 147 (14.8 % of 991 mapped) | `portfolio-overview.copy.ts:123`; ticket screenshot |
| 2 | A project counts when it has an active `results_by_projects` link to an active result with `source = 'Result'` and `version_id = <page version>`. Nothing else is checked | `clarisa-projects.repository.ts:107-116` (`has_w1w2`, local); same block at `:115-124` in `f965ca5f3` |
| 3 | The archived spec defined it that way: "linked to ≥ 1 pooled result of the page version" | `archive/2026-10-16-changes--portfolio-overview-revamp--w3-projects-section/requirements.md:29` |
| 4 | 2025 innovations replicated into the 2026 phase are rows in the 2026 version with `is_replicated = 1` | `result.entity.ts:472-478`; same use in `pending-innovation.repository.ts:91` and `result.repository.ts:4230` (`replicated_w1w2`) |
| 5 | So a W3 project linked only to a replicated 2025 innovation is counted today | follows from 2 + 4 |
| 6 | The P/A and Center totals and bars come from the same `hasW1w2` flag, so one change fixes the tile, both tabs and the table | `results-framework-reporting.service.ts:1125-1168` |
| 7 | How many of the 147 come only from replicated results | `UNVERIFIED — confirm at source before relying on it` (prod read query below; run by the user) |

## 4. Proposed Outcome

"Contributing to W1/W2" = mapped projects linked to ≥ 1 active pooled result of the page version **that was not replicated from an earlier phase** (`is_replicated` is 0 or NULL). The figure drops on the tile, in the By P/A and By Center bars, and in the table view. Mapped and With W3/Bilateral results stay the same.

## 5. Scope

- Server: `ClarisaProjectsRepository.getPortfolioProjectFacts`, the `has_w1w2` subquery only.
- Repository spec: assert the new predicate sits inside the `has_w1w2` block.
- Guide/contract line for this KPI's rule (portfolio-overview guide, if it states the rule).

## 6. Non-Goals

- `has_bilateral` ("With W3/Bilateral results"). Nicoleta did not ask, and W3 results are not replicated the same way.
- Center Overview `replicated_w1w2` counts, bilateral-center endpoints, other blocks.
- Excluding Discontinued pooled results from `has_w1w2` (today they count, unlike `has_bilateral`). This goes in OQ-2, not the scope.
- Copy, colours, chart layout (PGC P3 territory).

## 7. Affected Users, Systems, And Specs

| Item | Effect |
|---|---|
| PMU / portfolio leads (Portfolio Overview) | Lower, 2026-only "Contributing to W1/W2" figure |
| `GET` portfolio bilateral projects endpoint | Same response shape, different value. The DTO does not change. Not `/api/bilateral/*`, so no contract change-log entry and no Fetcher impact |
| `changes/portfolio-graphs-clarity` | Same method. Implement on top of `f965ca5f3` |

## 8. Visual Reference

- Source: None
- Notes: backend-only counting rule; the UI does not change.

## 9. Requirement Delta Preview

### MODIFIED Requirements

- **WPS "Contributing to W1/W2 results":** from "mapped projects linked to ≥ 1 pooled result of the page version" to "… ≥ 1 pooled result of the page version **created in that phase** (`result.is_replicated` = 0 or NULL)".

## 10. Approach Options

| Option | What | Pro | Con |
|---|---|---|---|
| **A. `is_replicated` filter** (recommended) | `AND (r.is_replicated IS NULL OR r.is_replicated = 0)` in `has_w1w2` | One line. Uses the marker other replication code already relies on. Works for any phase, no hard-coded year | Depends on replication always setting the flag. The fallback check below covers this |
| B. "No earlier version" filter | `NOT EXISTS` an older row with the same `result_code` | Does not depend on the flag | Heavier SQL. It also drops results that were re-created later, which is not what the ticket asks |
| C. Type-specific filter | Drop only replicated **innovations** (types 2, 7) | Matches the ticket's literal wording | Other replicated types (if any) would still count, which goes against "only 2026 P/A results" |

## 11. Recommended Approach

**Option A.** It is the smallest correct change, and it is the same `is_replicated = 1` meaning the Center Overview already uses for replicated W1/W2. Add a bound-free literal predicate, so the bind order does not change. Add a repository-spec assertion that the predicate is inside `has_w1w2` and not in `has_bilateral`.

**Pre-check (PROD, read-only)** for the expected before/after and to confirm the flag is set:

```sql
-- PROD · READ
SELECT
  COUNT(DISTINCT CASE WHEN r.is_replicated = 1 THEN rbp.project_id END) AS projects_with_replicated,
  COUNT(DISTINCT CASE WHEN COALESCE(r.is_replicated,0) = 0 THEN rbp.project_id END) AS projects_with_2026_new,
  SUM(r.is_replicated IS NULL) AS rows_flag_null
FROM results_by_projects rbp
JOIN result r ON r.id = rbp.result_id
JOIN version v ON v.id = r.version_id
WHERE rbp.is_active = 1 AND r.is_active = 1
  AND r.source = 'Result' AND v.phase_year = 2026 AND v.app_module_id = 1;
```

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R-1 | The local `qa-development-2026-ss` does not include `f965ca5f3` (PGC), which is on origin qa-dev and perf. Pull before implementing, or the change will conflict with PGC's rewrite of the same query |
| R-2 | If replicated rows ever have `is_replicated` NULL, they would still count. The pre-check's `rows_flag_null` shows whether that happens |
| OQ-1 | Exclude every replicated pooled result, or only innovations (Option C)? Recommendation: all. The ticket says "only 2026 P/As results" |
| OQ-2 | Should Discontinued pooled results also stop counting, as they already do for W3? Not asked. Ask Nicoleta in the reply |
| OQ-3 | Should the KPI hint or subtitle say "2026 results only"? Copy is out of scope unless Nicoleta wants it |

## 13. Success Criteria

- A project linked only to replicated pooled results is no longer counted on the tile, P/A bars, Center bars, or table.
- A project linked to ≥ 1 new 2026 pooled result still counts.
- Mapped and With W3/Bilateral results stay the same.
- The PROD figure after deploy equals the pre-check's `projects_with_2026_new` restricted to mapped projects. Below 147.

## 14. Next Step

```text
/akili-specify changes/w1w2-contributors-2026-only
```

(Lite depth: one server task + spec test. A `/akili-quick` would also be acceptable, since this is one predicate, but it changes a counting rule, so a Lite spec keeps the trace.)
