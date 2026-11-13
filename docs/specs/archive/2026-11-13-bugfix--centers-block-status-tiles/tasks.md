# Tasks — Centers block status tiles sum to the block total (CBT)

## 1. Scope

Client only, `portfolio-overview/components/centers-block/` + one guide line. Budget: 2 tasks · ~110 LOC · 2 review rounds (design.md §1).

## 2. Pre-flight

- [ ] Free RAM ≥ 4 GB before Jest. Every run uses **`--maxWorkers=2`**, is scoped to touched files, and runs one at a time.
- [ ] Read `portfolio-overview/CLAUDE.md` (mock rules: `spartanBrainMock`, `CentersService` mocked in page specs).

## 3. Task list

### CBT-T-1 — Regression test, then count by status id (Bug Mode)

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S |
| Depends on | none |
| Requirements | CBT-R-1, R-2, R-3, R-4, R-5 |
| Design | §8 (all units), CBT-DD-1..DD-4 |
| Skills | `angular-developer`, `tdd`, `spartan` |

**Scope:**
1. **Red first.** In `centers-block.aggregate.spec.ts` / `centers-block.component.spec.ts`, add a `describe('CBT …')` with a fixture of distinct W3 rows in statuses 1, 2, 3, 4, 5, 6, 7, 8 and one with `status_id: null`. Run it on current code and record the failing output.
2. Make the change in `centers-block.aggregate.ts` (ordered ids 1, 2, 3, 5, 6, 7, 4; base set 1, 5, 6, 7; bucket 8 and unknown → 1; `buildCenterRow` counts by bucket; drop the `buildStatusModel` import; update the doc comment).
3. Make the change in `centers-block.component.ts`: `statusTotals` exposes the visible ids (base always; extra when count > 0 or selected) with counts in the same order; `columns()` maps those ids.

**Tests (each one owns a clause):**

| Clause | Assertion | Input that makes it FAIL |
|---|---|---|
| R-1 Scenario "PRTest reproduction" | 399 Editing + 3 Draft, 1 Submitted, 1 Discontinued, 146 Pending, 40 Approved, 13 Rejected → tiles in order `status-tile-1,3,5,6,7,4` with 402/1/146/40/13/1; sum 603 = `kpis().bilateral` (fixture sum; corrected 2026-11-05, the live page gives 405 → 606) | Current code (tiles 1,5,6,7 sum 598) |
| R-1 "Share over the same total" | `donutTable()` rows' counts sum to `statusTotals().total` | A count dropped from the segments |
| R-1 BUT "never two tiles" | sum of counts equals `rows.length` exactly (not ≥) | A bucket that adds a row to two ids |
| R-1 Scenario "origin filter" | origin `new` and `replicated` → tile sum = `byOrigin(...).length` | Counting before `byOrigin` |
| R-2 | 3 Draft + 0 Editing → `status-tile-1` shows 3; no tile with id 8 | Draft not folded |
| R-2 / DD-2 unknown | `status_id: null` row lands in Editing | Unknown dropped (sum ≠ total) |
| R-3 base-only | rows only in 1/5/6/7 → exactly 4 tiles, order 1, 5, 6, 7, same labels | Extras rendered at 0 |
| R-3 BUT no zero extras | no `status-tile-2/3/4` when their count is 0 | Extras rendered at 0 |
| R-3 AND IT MUST (selected) | select tile 4, then switch origin so 4 has 0 rows → `status-tile-4` still rendered with 0, `aria-pressed=true` | Visible ids ignore the selection |
| R-4 | click `status-tile-4` → `selectedStatus()=4`, strip "Discontinued", `resultsCenterParams()` = `{funding:'bilateral', status:4}`; Editing tile → `status:1` | Link or label keyed by index instead of id |
| R-5 | `bilateral-overview` specs stay green, with no edit to them | Any change to `buildStatusModel` |

**Verification:**
- `cd onecgiar-pr-client && npx jest --no-coverage --maxWorkers=2 --testPathPattern=centers-block` (red before step 2, green after).
- `npx jest --no-coverage --maxWorkers=2 --findRelatedTests <changed .ts files> bilateral-overview.aggregate.ts` (Center Overview included).
- `npx ng lint --quiet --lint-file-patterns <changed .ts files>`.

**Evidence that does NOT count:** a green run without a recorded red run of the CBT describe on the old code. An existing assertion deleted or loosened to go green (each changed old assertion must be listed with its reason). Fixtures without `status_id` on the new rows.

**Done:** red run recorded; all clauses above green; related suites green; lint clean; Reviewer PASS.

### CBT-T-2 — Guide line + visual check (HITL)

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | XS |
| Depends on | CBT-T-1 |
| Requirements | CBT-R-6; R-1/R-3 layout (no automated gate, requirements §8) |
| Design | §4, §8 |
| Skills | none (docs) |

**Scope:**
1. In `portfolio-overview/CLAUDE.md`, **replace** the Centers-block line that says the block uses `buildStatusModel` / four status tiles (if none exists, merge into the 🛑 "counts DISTINCT results" line, L56) with: tiles = base 1, 5, 6, 7 always + 2, 3, 4 when > 0 or selected, order 1, 2, 3, 5, 6, 7, 4, Draft and unknown → Editing, `buildStatusModel` not used (Center Overview only). The guide must not grow (now 119 lines). List every removed sentence and where its rule now lives (PFF-L-1).
2. Visual check, read-only (no write buttons, no storage cleared): on the local served page or on PRTest after deploy, confirm the bundle contains the new code, then check that the tiles sum to the block total, the 5–7 tile grid has no overflow at desktop width and at ~390 px, and the donut has one slice per tile.

**Verification:** `wc -l CLAUDE.md` ≤ 119; grep shows no stale "four status tiles" claim for the Centers block; screenshots paths recorded in `execution.md`.

**Evidence that does NOT count:** a visual check on a bundle not confirmed to contain the change. A tile sum read from the code instead of the rendered page.

**Done:** guide line replaced and accounted for; visual check recorded; user confirms.

## 4. Dependency graph

`CBT-T-1 → CBT-T-2`

## 5. Coverage (clause → task)

| Clause | Task |
|---|---|
| R-1 Scenario PRTest + Share + BUT + origin Scenario | T-1 |
| R-2 (Draft → Editing, no Draft tile) | T-1 |
| R-3 base-only, BUT no zero extras, AND IT MUST selected stays | T-1 |
| R-4 click / strip / link, AND IT MUST Editing `status=1` | T-1 |
| R-5 BUT no `buildStatusModel` change | T-1 (related suites) |
| R-6 guide | T-2 |
| Layout 5–7 tiles (no automated gate) | T-2 (HITL) |

## 6. Roll-back

Revert the T-1 commit. No data, server or migration change.
