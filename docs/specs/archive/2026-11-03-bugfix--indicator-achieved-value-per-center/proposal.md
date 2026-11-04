# Proposal: Indicator achieved/preliminary value must be scoped per ToC node (Center row), not pooled by shared catalog indicator

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/indicator-achieved-value-per-center` |
| Slug | `indicator-achieved-value-per-center` — derived from free-text argument (report about AOW05 preliminary value leaking across centers) |
| Type | **Bug** |
| Approval Mode | `gated` (default — no end-to-end mandate given) |
| Requested by | santiago.sanchez@cgiar.org, relaying a report from Nicoleta Trifa (Trifa, Nicoleta — CGIAR System Organization) |
| Date | 2026-09-18 |
| Related indicator | `Number of knowledge products on FAIR data and modeling tools` (AoW05-family; shared/template indicator reused across multiple ToC result nodes, each tagged with a different Center or Center-combination) |
| Related screen | Sustainable Farming (SP02) → **Reporting** tab → AoW/outcome list, `QA %` / `Prel %` bars + the numeric "Achieved" figure next to Target |

## 2. Intent

When several ToC result rows share the same catalog-level indicator text (e.g. six separate "Number of knowledge products on FAIR data and modeling tools" rows, each tagged to a different Center or Center-combination and each with its own Target), each row's **Achieved value and Preliminary %** must reflect only the results reported **against that specific row/node**, not a figure pooled across every row that happens to share the same indicator text.

## 3. Problem / Current Behavior — confirmed root cause

### Observed Symptom (confirmed with screenshots, Images #47/#48 — Nicoleta Trifa's email, 2026-09-18)
On the Reporting screen for Sustainable Farming (SP02), the indicator "Number of knowledge products on FAIR data and modeling tools" appears as **six separate rows**, one per Center/Center-combination, each with its own Target (1, 1, 2, 1, 1, 5):

| Row (Center tag) | Target | Achieved (shown) | QA % | Prel % |
|---|---|---|---|---|
| CIMMYT + IITA | 1 | 0 | 0% | 10% |
| Bioversity(Alliance) + IITA | 2 | 0 | 0% | 10% |
| CIP + IITA | 1 | 0 | 0% | 10% |
| IITA | 1 | 0 | 0% | 10% |
| **CIMMYT (only)** | **5** | **0** | 0% | **10%** |

Every row shows the **identical** `Prel % = 10%` regardless of its own Target — even though only one KP has actually been submitted, and it was submitted against the CIMMYT-only row (Target 5). Per Nicoleta: *"The preliminary % should be 20%, and the achieved value (the column next to Target) should have 1 (since 1 KP has been submitted so far). Achieved is always calculated based on submitted, until the QA process ends."* 1/5 = 20%, confirming the CIMMYT-only row is the one that should show the progress, and no other row should show any progress at all (their own Achieved should stay 0 since nothing was reported against them).

### Root Cause (confirmed in code)
`AoWBilateralRepository.getIndicatorContributions()` — `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts:812-946`.

Two different columns exist on `toc_results_indicators` (aliased `tri`) and the query conflates them:

- `tri.id` — the **node-specific** indicator row id (`indicator_id` in the code), unique per ToC result node (i.e. per Center/Center-combo row shown in the screenshot).
- `tri.toc_result_indicator_id` — the **shared catalog/template** indicator id, identical across every node that reuses the same indicator text (this is why all six rows in the screenshot are "the same indicator").

The `tgt` subquery (lines 850-871, one row per node) correctly keeps both: `tri.id AS indicator_id` (per-node) and `tri.toc_result_indicator_id` (catalog), grouped `BY tri.id, tri.toc_result_indicator_id, wp.acronym` — so each of the six rows gets its own correct `target_value_sum`.

The `act` subquery (lines 872-914), which sums `rit.contributing_indicator` from actually-reported results, resolves the exact node a result was reported against via `results_toc_result.toc_result_id = tr.id` → `tri.toc_results_id = tr.id` (so `tri.id` — the node-specific id — **is available and correct** inside this subquery too), but then:

```sql
GROUP BY tri.toc_result_indicator_id          -- catalog key, not tri.id
```

and the outer join attaches it back with:

```sql
LEFT JOIN (...) AS act ON act.toc_result_indicator_id = tgt.toc_result_indicator_id   -- catalog key, not tgt.indicator_id
```

Because the join key is the **shared catalog id** instead of the **node-specific id**, the one KP submitted against the CIMMYT-only node gets summed once in `act`, then that single pooled row is joined onto **all six** `tgt` rows (every node sharing that catalog indicator), so every row displays the same `preliminary_achieved_value_sum` regardless of which node the result was actually reported against. This is precisely why `Prel %` is identical (10%) across rows with different Targets (1, 2, 5): the numerator is pooled and shared, only the denominator (`target_value_sum`, correctly per-node) differs, giving `1/10ish` per row coincidentally landing near 10%.

`contributionsMap` is keyed by `row.indicator_id` (`tri.id`, correctly per-node — line 932), so the **map itself is not the problem**; the corruption happens earlier, inside the `act` subquery's own `GROUP BY`/JOIN key, before the per-node key is ever used.

This also fully explains the original "per Center" framing from Santiago's report: each node in the screenshot **is** a specific Center/Center-combo instantiation of the shared indicator, so "pooled across Centers" and "pooled across catalog-sharing ToC nodes" are the same bug seen from two angles.

### Impact & Scope
- Affects every indicator whose text/catalog id is reused across more than one ToC result node — i.e. any indicator shared by multiple Centers or Center-combinations, not just this AoW05-family knowledge-product indicator.
- Both figures are wrong the same way: `actual_achieved_value_sum` (QA'd/Approved basis) and `preliminary_achieved_value_sum` (Submitted/Approved basis) are both grouped/joined on the catalog key — QA % has the identical defect, it's just not visible yet in the screenshot because nothing has reached QA'd status.
- Downstream consumers inherit the pooled figure: `getGlobalUnitsByProgram` (`results-framework-reporting.service.ts:98-184`, which sums `contribution.actual_achieved_value_sum`/`target_value_sum` per work package) and `getWorkPackagesByProgramAndArea`'s indicator enrichment (`findByCompositeCode` path, ~line 375) both read the same corrupted `contributionsMap` values, so unit/AoW-level roll-ups are inflated too, not just the single-indicator row view.
- No data-integrity risk — `rit.contributing_indicator` is stored correctly per result; this is a **read-side aggregation** bug (wrong GROUP BY / JOIN key). No migration needed.
- The aggregation **basis** (SUM of `rit.contributing_indicator`, the value the user enters in "contributing to indicator target") is already correct per Santiago's framing and is not changed by this fix — see Non-Goals.

### Confirmed business rule (Nicoleta, needed alongside the join fix)
*"Achieved is always calculated based on submitted, until the QA process ends."* Today, `actual_achieved_value_sum` (the number shown as "Achieved" next to Target, and the `QA %` bar) is computed **only** from status `2` (QualityAssessed) / `6` (Approved) — so it sits at `0` for every result that has merely been submitted, even after the join-key bug above is fixed. Per Nicoleta's explicit, reasoned request: while a reported contribution has not yet completed QA, the "Achieved" figure shown to the user should reflect the **submitted-basis** number (today computed separately as `preliminary_achieved_value_sum`), only falling back to the strict QA'd-only figure once QA concludes for that contribution. This is a confirmed product requirement from the report's author, not a guess — it must be part of the fix, not deferred.

### Fix Strategy
Not cosmetic — a shared aggregation query used by two service-level callers, plus a display-basis rule. Route: `/akili-specify` (Lite) in **Bug Mode**, with a mandatory regression test (red before / green after) proving:
1. Two ToC nodes sharing one catalog indicator, each with its own reported result, get **independent** achieved/preliminary sums (no cross-node pooling).
2. A node with nothing reported against it stays at `0` / `0%`, unaffected by a sibling node's activity.
3. A submitted-but-not-yet-QA'd contribution surfaces in the "Achieved" figure per Nicoleta's rule, and stops once QA'd status supersedes it (no double count).

Smallest safe correction:
1. In the `act` subquery, `GROUP BY tri.id` (add the node-specific column) instead of (or in addition to, for the catalog value if still needed elsewhere) `tri.toc_result_indicator_id`.
2. Change the outer join to `act.indicator_id = tgt.indicator_id` (node-specific), so pooled/catalog-level joining stops.
3. Resolve the "Achieved" display-basis rule with the reporter/PO before finalizing `design.md`: does "Achieved" become a computed fallback (`submitted-basis until QA'd, then QA'd-basis`) at the query level, or is this a client-side display choice fed by the two figures the query already returns? (See Open Questions.)
4. Verify `getGlobalUnitsByProgram` and `getWorkPackagesByProgramAndArea` still read `contributionsMap` correctly once the underlying sums are corrected (their keys were already per-node/`indicator_id`, so no shape change needed there — only the values become correct).

## 4. Proposed Outcome
Each ToC result node/row shows an Achieved value and Preliminary % based only on results reported against that specific node. A node with no reports of its own never inherits activity from a sibling node that happens to share the same indicator text/Center-combination pattern. The "Achieved" figure reflects submitted progress before QA completes, per the confirmed business rule.

## 5. Scope
- `AoWBilateralRepository.getIndicatorContributions()` — the `act` subquery's `GROUP BY` / outer join key.
- The "Achieved" display-basis rule (submitted-until-QA'd).
- Callers: `ResultsFrameworkReportingService.getGlobalUnitsByProgram` and `getWorkPackagesByProgramAndArea` (indicator enrichment path) — verification only, no expected shape change.
- Regression tests proving per-node isolation and the submitted-until-QA'd display rule.

## 6. Non-Goals
- Not changing the aggregation basis from SUM(`contributing_indicator`) to a count of results.
- Not touching indicator **targets** (`toc_result_indicator_target`, `trit`) — the `tgt` subquery already groups correctly per node; only `act` is broken.
- Not a data migration — no stored values are wrong, only the read-side aggregation join key.
- Not redesigning how ToC nodes are split by Center/Center-combination in the ToC master data — that structure (multiple nodes sharing one catalog indicator id) is accepted as-is; the fix works within it.

## 7. Affected Users, Systems, And Specs
- **Systems:** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (`getIndicatorContributions`, `mapIndicatorContributionRow`), `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts` (`getGlobalUnitsByProgram`, `getWorkPackagesByProgramAndArea`).
- **Users:** Any Center user viewing the Reporting screen's AoW/indicator list for a Science Program whose indicators are shared across more than one Center or Center-combination (confirmed live for Sustainable Farming / SP02, AoW05-family knowledge-product indicator).
- **Related specs:** none found under `docs/specs/` for this exact area; `aow-bilateral.repository.spec.ts` and `toc-progress-rollup.spec.ts` are the nearest existing test coverage and will need new cases for the node-vs-catalog-id distinction.

## 8. Visual Reference

- Source: Screenshots (Images #47, #48) — Nicoleta Trifa's email reply (Fri 18 Sep, 08:18) plus a full-resolution capture of the same Reporting screen.
- Location: Provided inline in the conversation (not persisted as files under `docs/specs/.../mockup/` — these are evidence screenshots of a live bug, not a design mockup; no mockup is needed for a backend aggregation fix).
- Notes: Screen = Sustainable Farming (SP02) → Reporting tab → AoW/outcome list. Shows six rows for the same indicator text, each tagged with a different Center/Center-combo and its own Target (1/1/2/1/1/5), all showing identical `Prel % = 10%` despite only the Target-5 (CIMMYT-only) row having a submitted result. Nicoleta's annotation (red circle/underline) marks the CIMMYT-only row's Achieved (`0`, should be `1`) and Prel % (`10%`, should be `20%`).

## 9. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Join/group `act` on the node-specific `tri.id` (recommended)** | Fix the `GROUP BY` and outer join key in `getIndicatorContributions` from the catalog id to the node id; layer the submitted-until-QA'd display rule on top. | Smallest safe change, directly fixes the confirmed root cause, keeps the SUM(`contributing_indicator`) basis intact. |
| B — Keep catalog-level pooling, add a Center filter parameter | Pass a `centerId`/`resultId` filter into the query and let callers request "my Center's slice" explicitly. | Doesn't fix the underlying query defect for callers that don't pass a filter (e.g. an admin/global view would still see the wrong pooled number); more caller-side plumbing than Option A. |
| C — Compute per-node/per-Center at the client instead of the server | Return all raw per-result contributions and let the client filter/aggregate by node. | Moves business logic to the client, duplicates aggregation logic across screens, and leaks other Centers'/nodes' individual result data over the wire — rejected. |

**Recommended:** Option A — smallest safe path, fixes exactly the confirmed root cause (wrong JOIN key), and requires no new parameters or caller-side filtering since `contributionsMap` is already keyed per-node.

## 10. Risks, Dependencies, And Open Questions

- **Open question:** where exactly should the "submitted-until-QA'd" fallback live — computed in the `act` subquery itself (e.g. `COALESCE` QA'd-basis with preliminary-basis while QA'd is `0`), or is "Achieved" simply a client-side choice of which of the two already-returned figures (`actual_achieved_value_sum` vs `preliminary_achieved_value_sum`) to display? This determines whether the fix is server-only or touches a client component too — resolve with Nicoleta/PO before `design.md`.
- **Open question:** once a contribution is QA'd, does the "Achieved" figure switch fully to the QA'd-only basis (per "until the QA process ends"), or does it keep including still-pending submissions from other results against the same node? Needs an explicit example from the PO (e.g. 2 results against one node, one QA'd + one still submitted) to pin the formula precisely.
- **Risk:** the same catalog-vs-node id confusion may exist elsewhere in this repository file (e.g. `findByCompositeCode`, line ~375, and any other query joining on `toc_result_indicator_id`) — worth a grep sweep during `/akili-specify`/implementation to confirm no sibling query has the identical defect.
- **No migration needed** — read-only fix.

## 11. Success Criteria
- Six sibling nodes sharing one catalog indicator each show Achieved/Prel values reflecting only their own reported results (per the table in §3: only the CIMMYT-only, Target-5 row shows progress — Achieved 1, Prel 20% — the other five stay at 0/0%).
- "Achieved" reflects submitted progress before QA completes, per Nicoleta's confirmed rule, and does not double-count once QA'd.
- New regression tests (red before / green after) cover: (a) node-level isolation for a shared catalog indicator, (b) the submitted-until-QA'd display rule.

## 12. Next Step

```text
/akili-specify bugfix/indicator-achieved-value-per-center
```
Bug Mode — convert the confirmed root cause above into a fix plan and a mandatory regression test.
