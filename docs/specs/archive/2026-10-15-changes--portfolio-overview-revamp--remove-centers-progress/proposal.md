# Proposal — Remove "Progress by Center" from the CGIAR Centers block (stakeholder item 9)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/remove-centers-progress/` |
| Slug | `remove-centers-progress` — derived from free-text argument ("Falta implementar desde el 9 en adelante, puedes hacer el propose del 9, 10 y 11?" + stakeholder email "RE: Reporting monitoring dashboard", 2026-10) |
| Type | Change |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org |
| Date | 2026-10-15 |
| Module | `result-framework-reporting` › `portfolio-overview` › `components/centers-block/` (client only) |
| Depends on | none (but shares `centers-block/` with family #3 — run serially, see Risks) |
| Parallel-safe | no |
| Parent Spec | `changes/portfolio-overview-revamp` (family #7) |

## 2. Intent

Remove the **"Progress by Center"** card (table view + chart view) from the CGIAR Centers block. The stakeholder's words: *"Remove this; progress can [only] be assessed against planning, or there is no planning data for w3/bilat results/KPIs."* A per-Center count of results by status is read as "progress", and there is no plan to measure it against.

## 3. Problem / Current Behavior

`centers-block.component.html:124-263` renders the **Detail: table | chart** card, titled by `copy.detailCentersTitle = 'Progress by Center'` (`internationalization/portfolio-centers-block.copy.ts:30`):

| Element | Code |
|---|---|
| Table/Chart toggle | `detailMode` signal (`centers-block.component.ts:85`) |
| Search box, count chip | `search`, `filteredDetail`, `copy.shownCount` |
| Sortable table (Total · Editing · Pending Review · Approved · Rejected) + "All" footer | `sortKey`, `sortDesc`, `sortBy()`, `columns()`, `centerTotals()` footer |
| Chart view | `shareOption`, `detailTable`, `detailHeight` (`centers-block.charts.ts`) |
| Per-Center retry button (on a failed Center) | `retryCenter(code)` — **only reachable from this table** |
| Partial-total note | `centersPartial()` → `copy.partialTotal`, rendered inside the card |

The rest of the block (title, KPI cards, status donut + tiles) stays. It still needs the per-Center calls, because `centerTotals()` feeds the donut and tiles.

## 4. Proposed Outcome

The Centers block keeps its header, KPI cards and the status donut + tiles. The "Progress by Center" card is gone. Nothing on the page ranks or lists Centers by volume any more. The partial-data warning and a way to retry failed Centers move next to the donut, so a failed Center call is still visible and recoverable.

## 5. Scope

- Delete the detail card markup and its view state: `detailMode`, `search`, `sortKey`, `sortDesc`, `filteredDetail`, `shareOption`, `detailTable`, `detailHeight`, `sortBy()`, `onSearch()`, and the `sortKey` side effect in `toggleStatus()` (`:153`).
- Delete the chart builders used only by that card (`buildShareOption`, `buildRowsTable` — used only here and in `centers-block.charts.spec.ts`), plus their copy keys and spec assertions.
- Move `centersPartial()` + a single **"Retry failed Centers"** action under the donut tiles. Today's per-row retry disappears with the table.
- Update `portfolio-overview/CLAUDE.md` (Centers block section + "Removed on purpose" list).

## 6. Non-Goals

- No change to the KPI cards. Making them New vs Replicated is family #3 `centers-new-vs-replicated`.
- No change to the data path (`GET_bilateralCenterResults` per Center).
- No change to the Center Overview page, which keeps its own per-status figures.

## 7. Affected Users, Systems, And Specs

- **Users:** Admin / PMU readers of `/portfolio-overview`.
- **Client:**
  - `components/centers-block/` (`.component.ts/.html`, `.charts.ts`, specs)
  - `internationalization/portfolio-centers-block.copy.ts`
  - `portfolio-overview/CLAUDE.md`
- **Specs:** family #3 `centers-new-vs-replicated` (same folder), archived `remove-rankings-status-copy` (same "no competition" rationale).

## 8. Visual Reference

- Source: stakeholder screenshot `image007.png` in the email "RE: Reporting monitoring dashboard". It shows the current "Progress by Center" card.
- Location: current screen `/portfolio-overview` › CGIAR Centers block.
- Notes: this is a removal, so no mockup is needed.

## 9. Requirement Delta Preview

### ADDED
- A single "Retry failed Centers" action plus the partial-data note, shown under the status tiles only when ≥1 Center call failed.

### MODIFIED
- The status tile toggle no longer re-sorts anything. It still filters the donut and the "View in Results Center" link.

### REMOVED
- The "Progress by Center" card: table view, chart view, search, sorting, and the per-row retry.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Remove the card, move retry + partial note to the status card** | As in §5 | Smallest change that keeps error recovery | Small new control |
| B. Remove the card only | Delete it, with no retry | Pure deletion | A failed Center silently lowers the donut total, with no way to recover. This breaks the `isPartial` honesty rule the page follows |
| C. Fold into family #3 | One spec for items 7 + 9 | One review of `centers-block/` | Mixes a removal with a data-split feature. #3 is still unspecified |

## 11. Recommended Approach

**Option A.** Run it **before** #3: it shrinks `centers-block.component.ts` and removes the sort/search coupling that #3 would otherwise have to keep working.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Proposed default / action |
|---|---|---|
| R-1 | #3 `centers-new-vs-replicated` edits the same files | Run serially, this one first. Mark #3 `Parallel-safe: no` in `family.md` |
| R-2 | Specs assert the removed copy and the sort behavior (memory: renaming asserted copy broke 4 specs once) | `npm run test:local -- --testPathPattern=centers-block` (`--maxWorkers=2`) before commit |
| OQ-1 | Does the stakeholder also want the status donut and tiles gone? Their screenshot only shows the table | Default: keep them. They are a reporting-status view, not "progress", and item 3 asked to keep status visible |


> **Resolved 2026-10-15:** the user delegated every open question to the recommended default ("haz lo que mejor recomiendes") and approved the proposal. Each `Proposed default` above is now the decision.

## 13. Success Criteria

- No element titled "Progress by Center" and no per-Center table or chart remains on `/portfolio-overview`.
- When one Center call fails, a partial-data note and a working "Retry failed Centers" action are shown, and the donut total updates after the retry.
- Scoped Jest for `centers-block` and `portfolio-overview` is green.

## 14. Next Step

```text
/akili-specify changes/portfolio-overview-revamp/remove-centers-progress
```

This spec is small enough for Lite depth.
