# Proposal — Centers block status tiles sum to the block total (CBT)

**Answer first:** the CGIAR Centers block on `/portfolio-overview` builds its status tiles from 4 hard-coded status ids (1, 5, 6, 7), but its total counts every row. Results in Draft (8), Submitted (3), Quality Assessed (2) or Discontinued (4) are therefore counted and never shown. **Recommended fix (Option A):** add tiles for 2, 3 and 4 when > 0, and count Draft (8) under Editing, as the deck does. Client only, `centers-block` files only. `buildStatusModel` and Center Overview stay as they are.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/centers-block-status-tiles` |
| Slug | `centers-block-status-tiles`, derived from the free-text argument |
| Type | **Bug** |
| Approval Mode | `gated` |
| Ticket | None. Found in the PRTest smoke of 2026-11-05 after the `portfolio-overview-feedback-round` family closed |
| Depends on | none |
| Parallel-safe | yes (only `centers-block/` files, plus one line in the folder guide) |
| Date | 2026-11-05 |

## 2. Intent

The Centers block's status tiles (and its donut and sr-only table) must add up to the block's own W3 total, so an admin who adds them by hand gets 606, not 601.

## 3. Problem / Current Behavior

| What | Today |
|---|---|
| Block total ("W3/Bilateral results 606") | Counts every distinct W3 row (`originCounts(distinctRows)`) |
| Tiles / donut / "Share" table | `buildCenterRow` → `buildStatusModel(rows).tiles` → `CENTER_STATUS_IDS = [1, 5, 6, 7]` only |
| Result | Rows in status 2, 3, 4 or 8 are in the total but in no tile. PRTest: 402 + 146 + 40 + 13 = **601 vs 606**, and the "Share" column sums to 99.1% |
| Deck (same page) | `resolveStatusSlot` gives every row a slot: Draft → Editing, 3/5 → Submitted, 4 → Discontinued, 2 → Quality Assessed |

## 4. Proposed Outcome

- Each distinct W3 row in the block is in exactly one tile, so the tiles sum to the total for every origin (All / New / Replicated).
- Draft (8) counts as **Editing**, the same as the deck.
- Tiles for Quality Assessed (2), Submitted (3) and Discontinued (4) appear **only when > 0**. Editing, Pending review, Approved and Rejected stay as today.
- Clicking a tile, the donut, the strip label and "View in Results Center" keep working by status id.

## 5. Scope

- `components/centers-block/centers-block.aggregate.ts`: status ids, count per id, Draft folded into Editing.
- `components/centers-block/centers-block.component.ts`: `columns()` shows only the ids with count > 0 among the optional ones (2, 3, 4).
- `centers-block.*.spec.ts`: regression test (red before, green after).
- `portfolio-overview/CLAUDE.md`: one line (the guide is already over its cap, so a line is replaced, not added).

## 6. Non-Goals

- No change to `buildStatusModel` / `bilateral-overview.aggregate.ts`. Center Overview keeps its 4 tiles.
- No relabelling of "Pending review" to "Submitted" (Option B, below). The block keeps the bilateral status names.
- No change to the deck, the page status section, Results Center or the server.
- No data fix for the 3 replicated rows in Draft (see Open Questions).

## 7. Affected Users, Systems, And Specs

- **Users:** PMU / portfolio admins.
- **Code:** `portfolio-overview/components/centers-block/` only.
- **Archived specs whose rules this touches:** `changes/portfolio-overview-feedback-round/cleanup-and-approved` (PCA-R-4: the tiles must count distinct rows; its tests assumed 4 tiles) and the earlier Centers-block specs (P2-3858 / CNR: the "four status tiles" comment).

## 8. Visual Reference

- Source: None.
- Notes: same tile component and tokens. `STATUS_TILE_TOKEN` / `STATUS_CHART_TOKEN` already define 2, 3 and 4 (`centers-block.charts.ts:16-38`), so no new token is needed.

## 9. Bug Diagnosis

### Observed Symptom

PRTest, Reporting 2026, no filter, all Centers loaded (2026-11-05): block total **606**, tiles Editing 402 · Pending review 146 · Approved 40 · Rejected 13 = **601**. The sr-only "Share" column sums to 99.1%.

### Reproduction Steps

1. Open `/portfolio-overview` on PRTest (phase Reporting 2026, v36) with no filter.
2. Wait for every Center to load.
3. Add up the Centers block tiles and compare the sum with "W3/Bilateral results N".
4. Expected: equal. Actual: 5 short.

### Root Cause (confirmed)

- `centers-block.aggregate.ts:11`: `CENTER_STATUS_IDS = [1, 5, 6, 7]`. `buildCenterRow` (L22-31) counts only those ids, through `buildStatusModel`, whose `STATUS_TILE_DEFS` (`bilateral-overview.aggregate.ts:377-382`) covers ids 1, 5, 6 and 7 only.
- The total comes from `originCounts(distinctRows)` (`centers-block.component.ts:144-147`), which counts every row.
- User SQL on the PRTest DB (2026-11-05) returned exactly the 5 missing rows:

| Result id | Code | Status | Replicated | Centers |
|---|---|---|---|---|
| 11813 | 9345 | 3 Submitted | 0 | CENTER-03, CENTER-06 |
| 11804 | 8395 | 4 Discontinued | 1 | CENTER-06 |
| 12026 | 9073 | 8 Draft | 1 | CENTER-02 |
| 12051 | 7665 | 8 Draft | 1 | CENTER-02 |
| 12065 | 7663 | 8 Draft | 1 | CENTER-02 |

### Impact & Scope

- Display only: no figure is wrong, but 5 results have no tile, and the donut's percentages are based on 601 although the total says 606.
- It also affects the global **Status** filter. That filter keeps Draft rows as Editing (`resolveStatusSlot`), but the block has no tile to show them in.
- Center Overview (`bilateral-overview`) has the same 4 tiles. That page is out of scope here (the bilateral review flow probably never produces 2/3/4/8). Noted as an open question.
- Status 8 (`ResultStatus.Draft`, `result-status.enum.ts:15`) is missing from the AGENTS.md status table, which stops at 7.

### Fix Strategy

The fix changes logic (classification and which tiles show), so it goes to **`/akili-specify` (Lite) in Bug Mode**, with a regression test: a fixture with rows in 1, 2, 3, 4, 5, 6, 7 and 8 must give tiles that sum to the total. Not `/akili-quick`.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Extend the ids (recommended)** | Tiles for ids 1, 5, 6, 7 always; 2, 3, 4 when > 0; 8 counted under 1. Still keyed by status id | Smallest change. Click, donut, strip and `?status=<id>` link work unchanged. Tokens exist. Keeps the bilateral names ("Pending review") | Tiles still differ from the deck's 6 slots (deck merges 3 + 5 as "Submitted"). Results Center link for Editing (`status=1`) will not list the Draft rows |
| B. Switch to the deck slots | Use `resolveStatusSlot` and the 6 deck slots (keys, not ids) | Exactly the deck's vocabulary and counts | Rewires tile click, donut click, strip label and the Results Center link (slot → ids). Renames "Pending review" to "Submitted". About 3× the diff |
| C. Note only | Keep 4 tiles and add "N results in other statuses" | Tiny | Draft still not shown as Editing. The tiles still do not sum to the total |

## 11. Recommended Approach

**Option A.** It fixes the symptom (tiles = total) with the smallest diff, keeps every id-keyed interaction, and needs no new token or copy beyond the existing status labels. Option B is a product choice of vocabulary; take it only if the stakeholder wants the block to read like the deck.

## 12. Risks, Dependencies, And Open Questions

| # | Item |
|---|---|
| R-1 | Existing Centers-block specs assert 4 tiles / `status-tile-1,5,6,7`. They keep passing as long as fixtures have no 2/3/4/8 rows. New tests add those |
| R-2 | Results Center link for the Editing tile (`status=1`) will not include the Draft rows counted in it. Accept (3 rows), or send `status=1,8` if Results Center supports a list. Check in specify |
| R-3 | Tile grid: up to 7 tiles in a 2-column grid leaves an odd last tile. Visual check at the HITL pause |
| R-4 | The folder guide is over its 120-line cap. Replace a line instead of adding one (lesson PFF-L-1 / PCA P3: account for every removed rule) |
| OQ-1 | Are the 3 replicated rows in **Draft (8)** expected? One is titled "P2-3515 QA test…", so they may be test data on PRTest, or replication may be leaving Draft instead of Editing. This is a data question, not part of this fix |
| OQ-2 | Should Center Overview get the same fix later? Out of scope here |

## 13. Success Criteria

- On PRTest with no filter: the Centers tile sum equals "W3/Bilateral results" (606), and the "Share" column sums to 100% (rounding aside).
- The same holds for origin New and Replicated.
- Regression test fails before the fix and passes after.
- Center Overview page is unchanged.

## 14. Next Step

```text
/akili-specify bugfix/centers-block-status-tiles
```

Lite depth, Bug Mode (regression test required).
