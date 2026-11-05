# Design — Centers block status tiles sum to the block total (CBT)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/centers-block-status-tiles` |
| Depth | Lite, Bug Mode |
| Status | approved (2026-11-05) |
| Date | 2026-11-05 |
| Budget | **2 tasks · ~110 LOC (≈35 prod, ≈75 tests) · 2 review rounds** |

## 2. Executive Summary

The Centers block stops borrowing Center Overview's 4-tile model. It counts its own rows by status id in a fixed order (1, 2, 3, 5, 6, 7, 4), folds Draft and any unknown status into Editing, and shows the extra ids only when they have rows (or are selected). Everything downstream (segments, donut, sr-only table, click, strip, Results Center link) already works by status id and only receives a longer list.

## 3. Architecture Overview

Client only. One pure function changes in `centers-block.aggregate.ts`; one computed in `centers-block.component.ts` derives the visible columns from the counts instead of a constant. No server, API, data or shared-contract change.

## 4. Extended Directory Structure

All under `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/`:

| File | Change |
|---|---|
| `components/centers-block/centers-block.aggregate.ts` | Ordered id list + base set; own count by id with the Draft/unknown fold; doc comment updated; drops the `buildStatusModel` import |
| `components/centers-block/centers-block.component.ts` | `statusTotals` returns the visible ids with their counts; `columns()` maps those ids |
| `components/centers-block/centers-block.aggregate.spec.ts`, `centers-block.component.spec.ts` | Regression + interaction tests |
| `CLAUDE.md` (folder guide) | One line replaced |

## 5. Data Model / 6. API Design / 7. Backend

None. Rows already carry `status_id` from `rs.result_status_id` (`result.repository.ts`, `getResultsByBilateralCenter`).

## 8. Frontend Component Architecture

| Unit | Responsibility | Req |
|---|---|---|
| Status order | Constant ordered list 1, 2, 3, 5, 6, 7, 4 (the deck's slot order: editing, in-qa, submitted, pending, approved, rejected, discontinued); base set 1, 5, 6, 7 | CBT-R-1, R-3 |
| Status bucket | Pure mapping of a row to one id: 1–7 → itself; 8 (Draft) → 1; null / unknown → 1 (the deck's default, `resolveStatusSlot` falls back to editing) | CBT-R-1, R-2 |
| Center row count | `buildCenterRow` counts the given rows into the ordered ids; `total` unchanged (`rows.length`). Sum of counts = total by construction | CBT-R-1 |
| Visible ids | Base ids always; an extra id when its count > 0 **or** it is the selected status | CBT-R-3 |
| Segments / donut / table | Unchanged functions, fed with the visible columns and their counts in the same order (`buildSegments` pairs by index) | CBT-R-1, R-4 |
| Click / strip / link | Unchanged: `toggleStatus(id)`, `resultStatusLabel(id)`, `resultsCenterParams()` → `status=<id>` | CBT-R-4 |

Tokens: `STATUS_TILE_TOKEN` / `STATUS_CHART_TOKEN` already define 2, 3, 4 (`centers-block.charts.ts:16-38`). Note: 2 and 5 share `--pr-chart-2-muted`; they rarely co-occur in W3 data, and the label distinguishes them. Accepted, no new token.

## 9. Shared Contracts

`CENTER_STATUS_IDS` is exported but only read inside `centers-block/` (grep 2026-11-05). `buildStatusModel` stays untouched for Center Overview (CBT-R-5).

## 10. Design Decisions

| ID | Decision | Why / rejected |
|---|---|---|
| CBT-DD-1 | The block counts by status id itself instead of calling `buildStatusModel` | `buildStatusModel` is Center Overview's 4-tile model; widening it would change that page (CBT-R-5). Rejected: `resolveStatusSlot` (merges 3 and 5 into "submitted", so it would rename "Pending review", which is Option B, not approved) |
| CBT-DD-2 | Draft (8) and unknown ids fold into Editing | Same as the deck, so the two blocks agree on Draft; the fold also guarantees sum = total for any future status id |
| CBT-DD-3 | Extra tiles show when count > 0 or when selected | Avoids zero tiles (CBT-R-3) and avoids a selection that points at a vanished tile after an origin/global filter change |
| CBT-DD-4 | Order 1, 2, 3, 5, 6, 7, 4 | Base tiles keep their relative order (1, 5, 6, 7); extras slot where the deck shows them |

**Reversion challenge (Step 2.3), CBT-DD-1:** "What does no longer calling `buildStatusModel` break?" `buildCenterRow` used only its `tiles[].count`; `replicatedCount` / `newCount` are not read by the block (origin split comes from `byOrigin` / `originCounts`). Center Overview calls `buildStatusModel` directly and is unaffected. No breakage found.

**Known limitation:** the Editing tile's Results Center link sends `status=1`; Results Center reads one `?status=` number (`results-list.component.ts:402-403`), so Draft rows are counted in the tile but not listed there. Accepted (requirements §8).

**Sizing check (Step 2.4):** 2 tasks / ~110 LOC / 2 rounds fits Lite. Not cosmetic (counting logic), so not `/akili-quick`.
