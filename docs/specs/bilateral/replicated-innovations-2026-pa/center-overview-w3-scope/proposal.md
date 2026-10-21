# Proposal — Center Overview counts W3/bilateral reporting only

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/replicated-innovations-2026-pa/center-overview-w3-scope/` |
| Parent Spec | `docs/specs/bilateral/replicated-innovations-2026-pa/` (`family.md`, child #3) |
| Slug | `center-overview-w3-scope`, suggested by the user in the free-text argument |
| Type | **Change** (it reverses part of a shipped fix, `1dd94a46c`, at the owner's request; it is not a defect in that fix) |
| Status | approved 2026-10-21 (owner) |
| Approval Mode | `gated` |
| Owner | Santiago Sanchez |
| Date | 2026-10-21 |
| Ticket | Freshdesk **INC-165171** (Nicoleta Trifa, replies in red on 21-Oct-2026; earlier on 15-Oct-2026) |
| Depends on | none (`1dd94a46c` is already in `staging` and `master`) |
| Blocks | child #2 `center-overview-no-project-line`: its "no project" row becomes W3-only after this change |
| Parallel-safe | **no** with child #2 (same aggregate, same card). Yes with child #1 |
| Branch | from `staging`, not from `qa-development-2026-ss` |
| Requirement prefix (proposed) | `CWS` (Center overview W3 Scope) |

## 2. Intent

The Center Overview reports **a Center's W3/bilateral work**. It must stop counting a Center's contributions to pooled (W1/W2) results that are not linked to one of its bilateral projects.

Nicoleta, 21-Oct-2026:

> *"Please do not mix bilateral reporting with Center being tagged to pooled results. they are not related. The main overview box should only include: replicated w3/bilat innovations belonging to Center projects; NEW bilateral results; w1/w2 results tagging a Center bilateral project. Please remove the other two variables."*
>
> *"This module is about Center reporting on w3/bilateral projects, do not bring Center contribution to a w1/w2 result (outside of a w3/bilateral) into this equation."*

On coverage, 15-Oct-2026: *"pls only monitor NEW results reported by w3/bilat projects + w1/w2 results where the CIP bilateral projects have been tagged as contributors."*

## 3. Problem / Current Behavior

Since `1dd94a46c` (19-Oct, in production), `bilateral-center-results?includeProjectTagging=true` returns one row per result, and each row has an `overview_category`. All Overview cards are built from that one row set.

| `overview_category` (SQL `CASE`, first match wins) | Rule | CIP, Reporting 2026 (prod, 19-Oct) | Nicoleta |
|---|---|---|---|
| `replicated_w3` | `is_replicated = 1` ∧ `source = 'API'` ∧ center in `results_center` | 63 | **keep** ("belonging to Center projects", see `CWS-OQ-1`) |
| `replicated_w1w2` | `is_replicated = 1` ∧ `source = 'Result'` | 200 | **remove** |
| `new_w3` | `source = 'API'`, not replicated | 0 | **keep** |
| `w1w2_tagging` | `source = 'Result'`, tags a bilateral project owned by the center | 0 | **keep** |
| `w1w2_center_only` | `source = 'Result'`, center on the result, no center project | 6 | **remove** |
| **Total card** | | **269** (the user remembered ~268) | expected **~63** |

What the code does today:

- **The filter is in the server.** `ResultRepository.getResultsByBilateralCenter` (`onecgiar-pr-server/src/api/results/result.repository.ts`, around line 4184) computes `overview_category`. The `WHERE` keeps every row whose center is in `results_center`, plus tagging rows when `includeProjectTagging` is on. The client (`bilateral-overview.aggregate.ts`) only counts by category. Nothing is filtered out.
- **`replicated_w3` is checked by center, not by project.** It only requires the center in `results_center`. The `project_id` it carries can be a center project, another center's project, or `null`. On 19-Oct in CIP, 5 replicated API rows had no project. 4 rows sat on projects outside CIP's list (`unmatchedProjectRows`). That count may include W1/W2 rows.
- **Precedence hides replicated W1/W2 that tag a center project.** The `CASE` checks `is_replicated` before tagging. So a replicated W1/W2 result that tags a CIP project is filed as `replicated_w1w2`. If we drop that category, the result disappears, even though it matches Nicoleta's third category (`CWS-OQ-2`).
- **The endpoint has three consumers.** The Overview (`bilateral-overview.service.ts:176`, flag on), the Results tab (`bilateral-results-list.component.ts:729/735`, flag off) and the Portfolio Overview Centers block (`centers-block.component.ts:262`, flag off). Changing the default would change the other two.
- **The Results tab cannot show the Overview's row set.** It fetches without `includeProjectTagging` and has no category filter (the CRK "category" filter is the result type). Every Overview deep link uses `explicitDefaults` (`role=all&source=all`). So today a click on Total results shows the 200 + 6 rows we are about to remove, and does not show the tagging rows. This is the `INC-165171` gap already listed in `bilateral-overview/CLAUDE.md`, and it breaks `COV-R-13`.
- **Projects covered counts replicated rows.** `buildProjectsCoveredKpi` counts a project when it has any row (`coveredCount`). CIP shows "5 of 57", and all 5 are covered only by replicated results (`coveredWithNewCount = 0`). Nicoleta asked to count only NEW results and W1/W2 results that tag a project.

## 4. Proposed Outcome

On `/bilateral/:acronym/overview`, **every** figure comes from a row set limited to the three categories Nicoleta kept:

| # | Category | Total card label (proposed) |
|---|---|---|
| 1 | `replicated_w3` | Replicated W3/bilateral innovations |
| 2 | `new_w3` | New W3/bilateral results in this phase |
| 3 | `w1w2_tagging` | W1/W2 results tagging a Center project |

- `replicated_w1w2` and `w1w2_center_only` are **not sent** to the Overview. They leave the Total card and its breakdown, the status tiles (`replicated · new` split), Needs attention, Results by project, Projects covered, Science Program contribution, Results by result type and Reporting pace.
- **Total = sum of the status tiles + Discontinued + QA/Submitted.** This identity already holds by construction (`COV-R-7`). The change keeps it.
- **Projects covered** "X of N": X = projects in the center's list with at least one `new_w3` or `w1w2_tagging` row. Replicated rows no longer cover a project. Whether to keep the secondary "n only replicated" line is `CWS-OQ-3`.
- **Results by project:** the line under the chart ("results with no bilateral project") **stays, but holds only W3 rows.** `w1w2_tagging` always has a center project, so the removed W1/W2 rows were the only W1/W2 rows on that line. What is left is the replicated innovations with no 2026 project (5 in CIP) plus any new W3 result with no project. That is exactly the group child #2 labels "Updated 2025 innovations with no 2026 project". The per-category breakdown on that line becomes at most 2 entries.
- **Deep links reconcile.** A click on any Overview figure opens the Results tab with the same three-category row set, so the visible count equals the figure (`COV-R-13`). This also closes the known `includeProjectTagging` gap.
- The **Results tab, opened without that scope**, behaves as today. The **Portfolio Overview Centers block** behaves as today.

Expected CIP, Reporting 2026 (prod check 2026-10-21: 63 replicated W3 = 54 on a CIP project + 5 no project + 4 on another center's project; 200 replicated W1/W2, all with no project): Total **63** (63 + 0 + 0), Projects covered **0 of 57**. If `CWS-OQ-1` resolves to strict project ownership: Total **54**.

## 5. Scope

| Layer | Item |
|---|---|
| Server | `result.repository.ts` `getResultsByBilateralCenter`: one new opt-in scope (e.g. `scope=bilateral`). It implies the tagging rows and keeps only the three categories, in SQL. Re-check the `CASE` precedence per `CWS-OQ-2`. Pass-through in `results.controller.ts` (`@ApiQuery`) and `results.service.ts`. Specs in `result.repository.spec.ts` |
| Client API | `bilateral-api.service.ts` `GET_bilateralCenterResults`: the new scope param. `includeProjectTagging` stays for backwards compatibility, or is folded into the scope; specify decides |
| Overview | `bilateral-overview.service.ts` asks for the scope. `bilateral-overview.aggregate.ts`: `OVERVIEW_CATEGORIES` drops to 3, `resolveOverviewCategory` fallback, `buildProjectsCoveredKpi` counts only non-replicated rows, `noProject.allW1W2` becomes dead. `bilateral-overview.charts.ts` and `bilateral-overview.component.html`: copy and `data-testid`s for the 3 lines. Fixtures |
| Results tab | `bilateral-query-params.ts`: one new contract key (e.g. `scope=bilateral`, added to `COV-R-13`). `bilateral-results-list.component.ts` fetches with that scope when the key is present. A visible, removable chip, so the scope is never hidden (`COV-R-13` "must NOT be satisfied by hiding rows") |
| Overview deep links | `deepLinkParams()` always adds the scope key, next to `phase` and `explicitDefaults` (`COV-DD-3`) |
| Docs | `bilateral-overview/CLAUDE.md` (invariant + known gap closed), `bilateral-results-list` guide if it has one, `family.md` change log |
| Tests | Jest scoped with `--findRelatedTests` on the changed files, `--maxWorkers=2`. Server repository spec. One live reconciliation check on PRTest (`KZ-EVM-1`: a fixture cannot prove reconciliation) |

## 6. Non-Goals

- The Results tab default view (W3 + Lead, no scope) and its row set. Center users still see their W1/W2 contributions there.
- The Portfolio Overview Centers block (`centers-block`) and the Bilateral Home project cards (`project-overview-metrics`).
- The replicated data itself: no `UPDATE` on replicated W1/W2 or Discontinued-origin innovations. The 19-Oct decision to leave those rows as they are still holds.
- Removing the unused `bilateral-center-overview-totals` endpoint. This is a known follow-up, not part of this change.
- Child #2's new line and its label. This change only makes the no-project line W3-only. Child #2 relabels it later.
- The 279 vs 259 discrepancy on replicated API innovations (an open INC-164073 follow-up).

## 7. Affected Users, Systems, And Specs

| Type | Item |
|---|---|
| Users | Center Users / Center leads (CIP first). Nicoleta (CGIAR SO) when she reviews Center Overviews |
| Server | `api/results` (`result.repository.ts`, `results.controller.ts`, `results.service.ts`), additive query param |
| Client | `pages/bilateral/pages/bilateral-overview/`, `pages/bilateral/services/bilateral-overview.service.ts`, `pages/bilateral/bilateral-query-params.ts`, `pages/bilateral/pages/bilateral-results-list/`, `shared/services/api/bilateral-api.service.ts` |
| Specs modified | archive `2026-09-14-bilateral--center-overview-tab`: `COV-R-6` (Total sub-lines), `COV-R-9` Scenario C (no-project row: the `source=w1w2` link branch goes away), `COV-R-13` (new `scope` key), `COV-R-16` (row set). Commit `1dd94a46c` invariants in `bilateral-overview/CLAUDE.md` |
| Specs affected | family child #2 `center-overview-no-project-line` (its §3 premise "mixes W1/W2" stops being true; it rebases on this change). `changes/center-results-kpi-chips` (CRK, Results tab chips) shares `bilateral-results-list.component.ts` |

## 8. Visual Reference

- Source: **None.**
- Notes: no new layout. Same cards; the Total card breakdown shrinks from 5 lines to 3, the no-project line loses its W1/W2 entries. Copy only.

## 9. Requirement Delta Preview

### ADDED Requirements

- `CWS-R-1`: `bilateral-center-results` accepts an opt-in scope. With it, the response contains only `replicated_w3`, `new_w3` and `w1w2_tagging` rows, filtered in SQL. Without it, the response is byte-for-byte the current one.
- `CWS-R-2`: The query-param contract gets a `scope` key. The Results tab fetches the scoped row set when the key is present and shows it as a removable chip.
- `CWS-R-3`: Every Overview deep link carries the scope, so each figure equals the destination's visible count (`COV-R-13` reconciliation, now including tagging rows).

### MODIFIED Requirements

- `COV-R-6` (Total results): headline = scoped row count. Breakdown = 3 categories that add up to it (replaces the 5 lines from `1dd94a46c`).
- `COV-R-6` (Projects covered): X counts projects with ≥ 1 `new_w3` or `w1w2_tagging` row. Replicated rows do not cover a project.
- `COV-R-7` / `COV-R-8`: same rules, applied to the scoped rows. The `replicated · new` split on the tiles is now `replicated W3 · new`.
- `COV-R-9` Scenario C: the no-project line holds W3 rows only. Its `source=w1w2` link branch is removed.
- `COV-R-16`: the Overview row set is defined by the scope, not by "the center participates as lead or contributor".

### REMOVED Requirements

- The `replicated_w1w2` and `w1w2_center_only` lines, and every figure that counts them, on the Overview.

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Server scope param + shared contract key (recommended)** | SQL keeps the 3 categories when `scope=bilateral`. The Overview and the scoped Results tab both request it | The Overview never receives the 206 unused rows (CIP). The reconciliation holds because both tabs receive the same rows. It closes the tagging gap. The other consumers are unchanged | Touches server + 2 client pages + the query contract |
| B. Client filter only | The Overview drops 2 categories before `buildOverviewModel`. The Results tab gets the same client predicate | No server change | The server still sends ~76% unused rows for CIP. The Results tab still lacks the tagging rows, so the reconciliation stays broken unless it also requests them |
| C. Change the endpoint default | The SQL always drops the 2 categories | Smallest diff | It silently changes the Results tab and the Portfolio Centers block, which Nicoleta did not ask for. Out of scope |

## 11. Recommended Approach

**Option A.** It is the smallest change that keeps `COV-R-13` true by construction. Both tabs apply the same filter to the same rows. The user already prefers not to send rows the module does not use. The new param is additive, so the Results tab and the Centers block keep their current responses (`CWS-R-1`).

## 12. Risks, Dependencies, And Open Questions

| ID | Type | Description | Recommendation |
|---|---|---|---|
| `CWS-OQ-1` | Scope (owner) | "Replicated W3/bilat innovations **belonging to Center projects**": today `replicated_w3` requires the center on the result, not a center project. **Measured in prod 2026-10-21 (CIP, Reporting 2026): of the 63, 54 are on a CIP project, 5 have no project, 4 are on another center's project.** Taken literally, the Total would be 54. Dropping the 5 contradicts child #2, which Nicoleta also asked for, to keep exactly those innovations visible | **Default for specify: 63** (center on the result). The 5 show on the W3-only no-project line, the 4 on the existing "on other centers' projects" line, so every figure stays explicit. Confirm with Nicoleta in the INC-165171 reply. Going strict later only adds a project-ownership condition to the SQL `CASE` |
| `CWS-OQ-2` | Rule | A **replicated W1/W2** result that tags a center project is filed as `replicated_w1w2` and would be removed, but it matches category 3 | **Closed 2026-10-21 for CIP:** all 200 replicated W1/W2 rows have no project, so 0 rows are affected. Keep the precedence. Specify re-runs the count for all centers (one query) before freezing the rule |
| `CWS-OQ-3` | Copy (owner) | Projects covered: keep the secondary line "n only replicated", or drop it? | Keep it as an informative line under "X of N", with copy that makes clear it does not count toward X. CIP would read "0 of 57 · 5 with only replicated updates", which explains the 0 |
| `CWS-OQ-4` | Contract | Merge `includeProjectTagging` into the new scope, or keep both? | Keep `includeProjectTagging` for compatibility; the scope implies it. Specify decides |
| `CWS-RISK-1` | Perception | CIP drops from 269 to ~63, and Projects covered from 5 to 0. Center users may think data was lost | Explain it in the INC-165171 reply before deploying. The Results tab still lists their W1/W2 contributions |
| `CWS-RISK-2` | Regression | `bilateral-results-list.component.ts` is also edited by CRK (in progress, T-6 pending) | Branch from `staging` after CRK lands there, or rebase. `--findRelatedTests` on every changed file before pushing (memory: a folder-scoped Jest run missed a consumer spec) |
| `CWS-RISK-3` | Reconciliation | A Jest fixture can pass while the real tab shows a different count | Live HITL check on PRTest: each card's figure vs the Results tab count, CIP + one center with tagging rows (IITA had 6) (`KZ-EVM-1`) |
| `CWS-DEP-1` | Family | Child #2 has to be rebased after this change: its §3 and its subtraction rule assume W1/W2 rows on the no-project line | `family.md`: child #2 now `Depends on` child #3 |

## 13. Success Criteria

- CIP, Reporting 2026, prod data: Total = `replicated_w3 + new_w3 + w1w2_tagging`. We expect ~63 if nothing moved since 19-Oct. Zero `replicated_w1w2` or `w1w2_center_only` rows in the Overview payload.
- On the Overview: Total = Editing + Pending + Approved + Rejected + QA/Submitted + Discontinued. The Total breakdown has 3 lines that add up to the headline.
- Projects covered for CIP counts only projects with new W3 or tagging rows (expected 0 of 57 today).
- Every Overview deep link opens the Results tab with a visible count equal to the figure, including on a center with tagging rows.
- The Results tab without `scope` and the Portfolio Centers block return the same rows as before (a server spec asserts the unscoped query is unchanged).
- Jest green with `--findRelatedTests` on the changed files and `--maxWorkers=2`. Lint clean on the touched files.

## 14. Next Step

```text
/akili-specify bilateral/replicated-innovations-2026-pa/center-overview-w3-scope
```
