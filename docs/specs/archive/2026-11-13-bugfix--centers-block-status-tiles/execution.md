# Execution — Centers block status tiles sum to the block total (CBT)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/centers-block-status-tiles` |
| Approval Mode | `gated` (user asked on 2026-11-05 to continue to the end) |
| Leader | Claude Code session, Opus (T1) |
| Implementer / Reviewer | `akili-implementer` / `akili-reviewer` wrappers |
| Started | 2026-11-05 |

## Task Execution History

### CBT-T-1 — Regression test, then count by status id (Bug Mode) — PASS

| Field | Value |
|---|---|
| Date | 2026-11-05 |
| Final status | PASS (attempt 1 of 3) |
| Effort | Implementer medium · Reviewer high |
| Skills | `angular-developer`, `tdd`, `spartan` (as listed in tasks.md) |
| Requirements | CBT-R-1, R-2, R-3, R-4, R-5 |

**Environment decision:** free RAM was 3.9 GB (< 4 GB). The user chose `--runInBand` instead of `--maxWorkers=2` for every Jest run.

**Attempt 1 — files changed** (`onecgiar-pr-client/.../portfolio-overview/components/centers-block/`):
- `centers-block.aggregate.ts`: `CENTER_STATUS_IDS = [1,2,3,5,6,7,4]`, new `CENTER_BASE_STATUS_IDS = [1,5,6,7]` and `statusBucket(row)` (8, null and unknown → 1); `buildCenterRow` counts by bucket; `buildStatusModel` import removed; doc comment updated.
- `centers-block.component.ts`: new `visibleStatusIds` computed (base always; 2/3/4 when count > 0 or selected); `statusTotals()` keeps `{total, counts}` with counts aligned to the visible ids; `columns()` maps the visible ids.
- `centers-block.aggregate.spec.ts`, `centers-block.component.spec.ts`: `describe('CBT …')` blocks covering every clause row in tasks.md §3.

**Verification:**
- RED on old code (`npx jest --no-coverage --runInBand --testPathPattern=centers-block`): 2 suites failed, 10 failed / 103 passed. Failures were behavioural: tile ids 3 and 4 missing (got 1,5,6,7); Share 598 vs 603; BUT 8 vs 17; origin 6 vs 8; Draft 0 vs 3; null 0 vs 1; `status-tile-4` absent for R-3 selected and R-4. R-3 base-only and no-zero-extras passed on the old code (guard tests).
- GREEN, same command: 3 suites, 113/113 passed.
- Related (`--findRelatedTests` on both changed .ts + `bilateral-overview.aggregate.ts`): 25 suites, 1034/1034 passed. The bilateral-overview specs were not edited (R-5).
- Lint: `npx ng lint --quiet --lint-file-patterns <4 files>` → All files pass. (Plain `npx eslint` finds no flat config in the client.)

**Old assertions changed (none deleted or loosened):**
- Aggregate `buildCenterRow`: `CENTER_STATUS_IDS` `[1,5,6,7]` → `[1,2,3,5,6,7,4]`; counts `[2,1,1,1]` → `[2,0,1,1,1,1,0]`. Reason: the status-3 row now counts in id 3.
- Component "mixed fixture" and "late Center" (test 8): `[1,3,2,2]` → `[1,1,3,2,2]`. Same reason.
- Component origin Replicated: `[0,0,1,2]` → `[0,1,0,1,2]`. Same reason.

**Reviewer verdict (attempt 1): PASS.** Every clause row has a test, and the fixtures set `status_id`. The red run failed on behaviour, not on setup. `columns()` and `statusTotals().counts` both come from `visibleStatusIds`, so the segments, donut and table stay aligned. Adjudications:
1. 603 vs 606: the test is conformant. The scenario's own counts add up to 603, and the clause enforced is sum = block total. The spec text is wrong (see Issues).
2. A separate `visibleStatusIds` instead of ids inside `statusTotals` is conformant with design §8 "Visible ids". Only the shape differs from the tasks.md wording.

**ADVISORY (recorded, no rework):**
- SPEC: requirements.md §2 ("601 vs 606") and the R-1 scenario ("total 606") do not match the scenario's counts. Old tiles over those counts give 598 and the new ones give 603. Correct them or replace them with the real PRTest distribution. The T-2 PRTest check should record the real tile sum and find the 3 rows behind 606 (possibly status 2).
- READABILITY: the `CENTER_STATUS_IDS.indexOf(id as …)` cast in `statusTotals`. A `{id, count}` pair list or a `countOf(id)` helper would remove it.
- READABILITY: the comment above the private `statusRow` should say that it covers all 7 ids and that `statusTotals` carries the visible subset.
- RELIABILITY: no test checks that the donut fades the other slices when an extra tile (4) is selected. Low risk, since `buildStatusDonutOption` keys by `segment.id` and did not change.
- PROCESS: the runs used `--runInBand`, as the user decided, instead of the spec's `--maxWorkers=2`.

**Issues:** a spec arithmetic error (606 vs 603). It is not a Pivot: the requirement and design hold, and only the scenario's example figure is wrong. It is left for the user to correct.
**Decisions:** keep `statusTotals` shaped `{total, counts}` so the old `toEqual` assertions keep their shape.
**Final verification:** green as above.

### CBT-T-2 — Guide line + visual check (HITL) — `[~]` waiting on the visual check

| Field | Value |
|---|---|
| Date | 2026-11-05 |
| Status | `[~]` (step 1 done; step 2 not done) |
| Requirements | CBT-R-6; R-1/R-3 layout |

**Step 1 (Implementer, attempt 1, effort low):** `portfolio-overview/CLAUDE.md` L58 now carries the rule. Tiles are base 1, 5, 6, 7 always, plus 2, 3, 4 when > 0 or selected, in the order 1, 2, 3, 5, 6, 7, 4. Draft (8) and unknown/null fold into Editing, so the tiles sum to the block total. They are counted by `statusBucket` / `buildCenterRow`, and `buildStatusModel` is not used (it is Center Overview only). No existing Centers line mentioned `buildStatusModel` or "four status tiles", so the rule was merged into L58, not used to replace a line. Removed sentences: none (only the word "both" was dropped, and its rule stays in the same sentence). `wc -l` = 119. Grep for "four status tiles" finds nothing; `buildStatusModel` appears only in the new "not used" statement.

**Step 2 (visual check), first try:** `/result-framework-reporting/portfolio-overview` is the wrong route. It redirected to home and the tab froze, so I stopped.

**Step 2 (visual check), done 2026-11-05 at the user's request ("hazlo tu en el localhost"):** local `ng serve`, correct route `http://localhost:4200/portfolio-overview` (in `extraRoutingApp`). Read-only: no write buttons clicked, no storage touched.
- Bundle: `ng.getComponent` on the live Centers block exposes `visibleStatusIds` (new code only) → `[1,3,5,6,7,4]`.
- Rendered tiles (DOM): Editing 405 · Submitted 1 · Pending review 146 · Approved 40 · Rejected 13 · Discontinued 1 = **606** = "W3/Bilateral results" 606 (New 490 + Replicated 116).
- sr-only Share column: 66.8 + 0.2 + 24.1 + 6.6 + 2.1 + 0.2 = 100.0%. `segments()` = 6, and the screenshot shows 6 donut slices.
- Desktop (2560 px): 2 columns × 3 rows, grid scrollWidth == clientWidth, no page overflow, no clipped tile → `evidence/t2-desktop-2560.jpg`.
- ~390 px (temporary same-origin iframe, inner width 387, removed afterwards, because the window would not resize): 1 column, no overflow, no clipping, same counts → `evidence/t2-mobile-390.png`.
- 603 vs 606: the real Editing count is 405 (399 + 6 Draft/unknown folded in by CBT-R-2), not the spec's 402. The block works as designed; only the scenario's example figures were off.

**Reviewer verdict (step 1 diff + step 2 evidence): PASS.** CBT-R-6 is met on L58. Placing the rule on L58 instead of L56 is acceptable, since it is the line that already described the tiles. The visual evidence meets the "does NOT count" clauses (bundle confirmed, sum read from the DOM).

**ADVISORY:**
- RISK: the screenshots were in the OS temp folder and are now copied to `evidence/`.
- READABILITY: the folder guide's `**Verified:**` stamp (L3) still reads 2026-11-04. The client convention (`docs/COMPONENT-DOCS.md`) re-stamps it in the same commit as the code change. Do this at commit time.

**User confirmation (2026-11-05):** the user approved the recommended close-out ("haz lo que me recomiendas"). T-2 → `[x]`.

**Spec correction (user-approved 2026-11-05, Correction Closure sweep run):** the requirements.md R-1 scenario now gives the live figures (Editing 405, total 606), and tasks.md's clause row gives the fixture's own sum (603) and the old-code sum (598). A grep for 402/603/606/601/598 across the spec folder shows no other stale site. §2's "601 vs 606" is the real pre-fix PRTest observation and stays. The folder guide's `Verified` stamp was updated to 2026-11-05.

## Summary

Both tasks PASS, each on the first attempt: 2 tasks, 2 review rounds plus a docs/visual review, within budget. Prod change: about 45 LOC in `centers-block.aggregate.ts` and `centers-block.component.ts`. Tests: 22 new or widened assertions. The Centers block tiles now sum to the block total (606 = 606 live). No server, data or Center Overview change. Open advisories: the `indexOf` cast in `statusTotals`, the `statusRow` comment, and a donut-fade test for an extra tile.
