# Design — Split "Source" column on the bilateral Results list

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/results-list-source-column-split/` |
| Module code | `BSC` · Depth **Lite** · Type **Change** |
| Requirements | `./requirements.md` |
| Delegation | None — Lite depth, single-file client change, no architecturally-significant decision. Explored inline. |

---

## 1. Summary

Split one table cell into two: `bilateral-results-list.component.html`'s `Source` column stops rendering the `W3`/`W1/W2` funding badge and keeps only the AI/manual origin indicator; a new `Funding source` column, wired through the existing `BILATERAL_COLUMNS` picker/resize/visibility mechanism, takes over the funding badge. Client-only, no server or payload change. The only real constraint is not silently hiding the new column for users with a stored column-visibility preference — solved by the storage-key version bump the table already has a mechanism for.

Resolves `BSC-OQ-1`/`BSC-OQ-2` from `requirements.md`: the `source` column is **renamed** `Origin` (title only — the column `key` stays `source` so no storage-key migration is needed for it), and the new column is titled `Funding source`, positioned immediately **after** `Origin` (i.e. between the former `Source`/now-`Origin` position and `Title`).

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| `BSC-P-1` | `BILATERAL_COLUMNS` is the single source of column order, width, and default-visibility for this table — no second hardcoded column list exists elsewhere in the component | `bilateral-results-list.component.ts:135-145` (`cols` computed at `:404` filters this array) | Read the array definition and its one consumer (`cols` getter) | `verified` | A second list would need its own edit; recheck the `.html` `@for` loop, which iterates `cols`, not a literal |
| `BSC-P-2` | The `source`/`isAiResult` cell markup at `bilateral-results-list.component.html:409-420` is the **only** place these two badges render together in this component | `Grep "brl_source_badge\|brl_ai_badge"` over the component's `.html` | One match block found (lines 409-420); the skeleton-loading `[style.width]` ternary at `:346`/`:556` references `column.attr === 'source'` but renders no badge, just a loading placeholder | `verified` | A second render site would need the same split applied there too |
| `BSC-P-3` | No existing Jest spec in this component's `.spec.ts` pins the exact column count or header set (unlike the sibling `bilateral-review` table, which does) | `Grep` for `columnWidths\|colgroup\|headerTexts\|columnCount` in `bilateral-results-list.component.spec.ts` | `assumed` — not read line-by-line in this pass; the sibling `bilateral-review-table.component.spec.ts` pins this pattern, so it is plausible this one does too | `assumed` | `BSC-T-*` (tasks) must grep-verify before editing; if pinned assertions exist, update them in the same task per `BSC-R-2` |

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/` only — `bilateral-results-list.component.ts`, `.html`, `.scss`, `.spec.ts`.
- **Server modules touched:** none.
- **External integrations touched:** none.

### 2.2 Sequence / interaction diagram

Unchanged. No new request, no new field. Existing row data (`result.source`, the AI-origin flag read by `isAiResult(result)`) already carries both facts; this is a pure presentation split of data already on the client.

```
[BilateralCenterResult row, already fetched]
  ├── result.source ('API' | other)         → rendered in NEW "Funding source" column
  └── isAiResult(result)                     → rendered in RENAMED "Origin" column (was "Source")
```

## 3. Data Model Changes

**None.** No entity, no migration, no new field. Both source values already exist on the client-side row model.

## 4. API Surface

**None.** No endpoint added or changed. `4.2 Bilateral / platform-report impact`: not applicable — this table's data comes from an existing internal client-facing endpoint, not `/api/bilateral/*` or `/api/platform-report/*` payloads governed by `bilateral-result-summaries.en.md`.

## 5. Server Workflow / Business Rules

Not applicable — no server change.

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Same component, same module.

### 6.2 Components & services

No new component. Both badges already exist as inline `<span>` markup with existing SCSS classes (`brl_source_badge--w3`, `brl_source_badge--w1w2`, `brl_ai_badge`) — reused as-is, just moved to separate `<td>`s.

**Changed:**

- `BILATERAL_COLUMNS` (`bilateral-results-list.component.ts:135-145`): rename `source` column's `title` from `'Source'` to `'Origin'`; insert a new entry `{ key: 'fundingSource', title: 'Funding source', attr: 'source', width: '110px', minPx: 80, defaultOn: true }` immediately after the `source` entry. (`attr: 'source'` is reused for width-skeleton logic parity — see DD-2 — the actual funding badge markup does not read `column.attr`, it is hardcoded per column key in the template, same pattern as today.)
- `BILATERAL_COLUMN_STORAGE_KEY`: `'pr.bilateralResults.visibleColumns.v4'` → `'pr.bilateralResults.visibleColumns.v5'` (`:131`), with the version-bump comment updated to record why (`v5` — Funding source column split out of Source).
- `bilateral-results-list.component.html:409-420`: split into two `@if (column.attr === ...)` branches — one for `source`/`Origin` rendering only the `isAiResult` branch (with a neutral placeholder, e.g. `Manual`, when false — see DD-1), one for the new `fundingSource` column key rendering the existing `W3`/`W1/W2` badge markup unchanged.
- The two skeleton-loading width ternaries (`:346`, `:556`) gain a case for the new column key (reuse the existing `'38px'` badge-skeleton width, since both cells now hold one small badge each).

### 6.3 Design system usage

No new token, no new component, no new color. Reuses `brl_source_badge`/`brl_ai_badge` exactly as styled today (`bilateral-results-list.component.scss:715-741` area) — this is a pure relocation, not a restyle.

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

Unchanged. No new data crosses any boundary; both values are already rendered today, just relocated.

## 8. Performance & Capacity

No new query, no new request. One additional `<td>`/`<th>` per row — negligible DOM cost, no measurable perf impact at this table's typical row counts.

## 9. Observability

No new logging. Nothing new is logged.

## 10. Testing Plan (forward-looking)

- **Unit/component (Jest):** assert `Origin` cell renders only the AI/manual indicator and never the `W3`/`W1/W2` badge; assert the new `Funding source` cell renders the correct badge per `result.source`; assert the column picker lists both columns; assert a pre-`v5` stored preference does not hide the new column (seed `localStorage` with a `v4`-shaped value missing `fundingSource` and confirm the column still renders — the existing `defaultOn: true` + version-bump mechanism, per `BSC-R-4`).
- **No layout/visual gate exists in this repo for this table at specific viewport widths** (per `requirements.md` §10 defect-class table) — the human check at `/akili-validate`'s HITL pause substitutes for it; record this explicitly, do not silently skip it.
- Coverage uplift: none expected beyond incidental — this is a small, already-covered component area.

## 11. Backwards Compatibility & Migration Plan

- **Additive UI change**, no API contract touched.
- **Client-local migration:** the `BILATERAL_COLUMN_STORAGE_KEY` version bump is the only "migration" — it is the table's existing, proven mechanism (already bumped 3 times per the `v4` comment history) for introducing a `defaultOn: true` column without a stale preference hiding it. No user action required; old preference keys are simply superseded, matching current behavior for every prior bump.
- **Rollback:** revert the PR. No data to unwind (no server/DB change).

## 12. Design Decisions (ADRs)

### `BSC-DD-1` — `Origin` column shows an explicit "Manual" state, not just an AI badge or blank

- **Context:** Today, when `isAiResult(result)` is false, the cell renders nothing extra (only the funding badge, which is moving out). Once `Origin` is the column's only content, an empty cell for the (currently far more common) manual case reads as broken/loading, not as "manually created."
- **Decision:** `Origin` cell renders `AI Result` badge (unchanged markup) when `isAiResult(result)` is true, and a plain, low-emphasis text label (e.g. `Manual`, no badge chrome) when false — mirroring the existing text-only convention other columns in this table use for a "nothing special" state, rather than inventing a new badge style.
- **Alternatives considered:** (a) leave it blank when manual — rejected, reads as a missing/broken cell once it's the column's sole content; (b) give "Manual" its own badge/pill matching `brl_source_badge`'s visual weight — rejected, over-styles the common case and implies parity with the AI-transparency badge, which exists for a disclosure reason (`AI Result`) that "Manual" does not share.
- **Consequences:** one small new template branch and one new (or reused, if one already exists elsewhere in the table for a similar "plain state" text) CSS class for the muted label; no new component.

### `BSC-DD-2` — Column key stays `source`, title changes to `Origin`; new column gets its own key `fundingSource`

- **Context:** `BILATERAL_COLUMNS` entries are keyed by `key` (used for the visibility map and column picker) and independently carry a `title` (the displayed header) and `attr` (used for cell/skeleton width logic in the template's `column.attr === '...'` checks).
- **Decision:** Keep `key: 'source'` unchanged (so any stored visibility preference for the existing column continues to apply to the renamed one — a user who hid "Source" keeps "Origin" hidden, which is the correct carry-over of intent), only change its `title`. Give the new column a distinct `key: 'fundingSource'` and its own `title: 'Funding source'`.
- **Alternatives considered:** reusing one `key`/`attr` pair for both cells and branching purely on a second flag — rejected, `BILATERAL_COLUMNS` is a flat list of independently toggleable columns (`BSC-R-3`); collapsing two toggleable concerns into one key would break "independently toggleable" (`BSC-AC-4`).
- **Consequences:** template `@if (column.attr === 'source')` conditions must be updated to also branch on the new key (or keep the funding badge behind a literal `column.key === 'fundingSource'` check, since `attr` is reused for width-skeleton parity only, per §6.2's parenthetical) — call this out explicitly in `tasks.md` so the two checks aren't conflated.
- **Rework note (post-PASS, found by manual testing):** the shared `attr: 'source'` also fed the table's `[prSortableColumn]`/`pr-sort-icon` bindings, which coupled the two columns' sort identity (clicking one's sort control activated both). Fixed by adding an optional `BilateralColumnDef.sortKey` that overrides `attr` for sorting only (`source` → `is_ai_generated`; `fundingSource` unset, falls back to `attr`). Any future column that shares an `attr` for width/CSS parity MUST set its own `sortKey` if it is sortable, or this bug reappears — see `execution.md`'s `BSC-T-1` rework entry and this component's local `CLAUDE.md`.

### Step 2.3 — Reversion challenge

`BSC-DD-1` and `BSC-DD-2` both **add** display (a "Manual" label, a new column) rather than remove anything users currently see — the funding-source badge is relocated, not deleted, so no user-visible information is being taken away. **No reversion challenge is required**: nothing already-delivered is being removed, disabled, or inverted. (The one thing that changes for an existing user — the `Source` header text — is a rename, not a removal of behavior, and is explicitly the point of this spec.)

## 12A. Budget (Step 2.4)

| Metric | Expected |
|---|---|
| **Tasks** | **2** — one column/template/storage-key edit, one test update |
| **LOC** | **~60** — client template/config ~30, tests ~30 |
| **Review rounds** | **1** |

This matches **Lite**: a single bounded UI split with no server surface, well under the ~250 LOC Lite ceiling. No depth mismatch to flag.

## 13. Open Gaps & Follow-ups

- **`BSC-OQ-3` (new, from this design):** if `bilateral-results-list.component.spec.ts` turns out to pin column count/order (per `BSC-P-3`, currently `assumed`), the affected task absorbs those edits — flagged here so it isn't discovered cold at execute time.
- Visual/layout verification at exact breakpoints remains a human HITL check, not an automated gate — recorded per `requirements.md`'s defect-class table, not a silent gap.

---

## Required cross-references

`./requirements.md` · `docs/prd.md` (persona: Result submitter / Center staff) · `docs/trd/trd.md` (ADR-004 additive-only — not applicable, no payload change) · sibling prior art: `docs/specs/archive/2026-09-21-bilateral--review-list-source-and-reporter/design.md` (naming lesson only, no shared code)
