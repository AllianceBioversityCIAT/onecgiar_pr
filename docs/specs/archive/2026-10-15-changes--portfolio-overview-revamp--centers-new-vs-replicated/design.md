# Design — Portfolio Overview: CGIAR Centers block, W3 only, New vs Replicated

## 0. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/centers-new-vs-replicated/` |
| Requirements | [`requirements.md`](./requirements.md) rev 2 (`CNR-1..7`, `CNR-N1..N5`) |
| Baseline code | The block **as #7 `remove-centers-progress` leaves it** (its `design.md`, approved 2026-10-15): `CenterRowState { code, acronym, state, row }`, `loadedCenterRows`, `centerTotals`, `kpis`, `segments`, donut, `toggleStatus` (no sort side effect), `retryFailedCenters()`, `centersPartial()`, the empty state. No table, chart, search, sort or `detailHint` |
| Depth | Standard (re-checked in §14) |
| Status | approved (2026-10-15, Phase 2 gate); rev 2 (2026-10-15) rebased on #7 |
| Kaizen applied | `KZ-result-framework-reporting--programme-results-created-by-filter-1`: §10.1 lists every spec that pins a symbol this design changes |

## 1. Summary

Everything happens on the client, inside `components/centers-block/`. The block loads `bilateral-center-results` once per Center, and each row carries `source` and `is_replicated`.

The design makes three changes:
- It keeps only the W3 rows of each response, at load time. Retries go through the same path.
- It stores those rows instead of a pre-built `row`.
- It derives the status view through `computed` signals from the stored rows and a new `origin` signal (All · New · Replicated).

The KPI card reads the unfiltered W3 rows. `buildCenterRow`, `sumRows` and the donut builders are unchanged.

**Accepted trade-off:** the block stops matching the Center Overview page, which still mixes W1/W2 and W3 (DD-1). The subtitle says so (CNR-6).

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| CNR-P-1 | W3 rows are exactly those with `source === 'API'` | `bilateral-overview.aggregate.ts` `buildTotalResultsKpi`; `BilateralCenterResult.source: 'API' \| 'Result'` | Code read. On PRTest: 712 `API` + 572 `'Result'` = 1284 | verified | Another source value would be dropped silently. The classifier would need the real value list |
| CNR-P-2 | `is_replicated` arrives as tinyint, string or boolean, and may be null | `bilateral-center-result.interface.ts` docstring (BIL-POM-T-2) | Docstring + the kpi-breakdown encoding matrix | verified | The encoding matrix spec catches a new encoding |
| CNR-P-3 | Results Center accepts `funding=bilateral` and `status=<id>` | `results-list.component.ts:393-405` | Code read | verified | The link would lose a filter; only CNR-7 is affected |
| CNR-P-4 | Results Center has no replicated filter | Same block | No `replicated` param is read | verified | If one is added later, CNR-7 can show the link under an origin filter |
| CNR-P-5 | Nothing outside `centers-block/` reads its rows or figures | `grep` of the aggregate, charts and component symbols | Only `portfolio-overview.component.ts` imports the component (as a template child). `portfolio-overview.component.spec.ts` has 0 references | verified | A consumer would see W3-only figures; review it |
| CNR-P-6 | After #7, every figure flows from `CenterRowState.row` through `loadedCenterRows` → `centerTotals` → `kpis` / `segments`, and `retryFailedCenters()` re-enters `loadCenter()` | #7 `design.md` lines 19, 57–64 | Read on 2026-10-15 (#7 design approved, not yet executed) | assumed | If #7's executed code differs, CNR-T-2's first step re-reads the component and HALTs on a mismatch |
| CNR-P-7 | Replicated W3 rows are not innovations only | PRTest 2026-10-15 | Innovation use 169, Innovation development 17, Policy change 5, Capacity sharing 2 | verified | n/a. The label stays "Replicated" |

## 2. Architecture Overview

```
GET_bilateralCenterResults(code, versionId)   (per Center; also from retryFailedCenters())
        │ keepW3(rows)                                  ← NEW: in loadCenter, once
        ▼
CenterRowState { code, acronym, state, w3Rows }         ← stores rows, not a built row
        │
        ├── origin signal (all|new|replicated)
        │        ▼
        │   viewRows = computed(center → buildCenterRow(code, acronym, byOrigin(w3Rows, origin)))
        │        └─► loadedCenterRows → centerTotals → segments → donut / tiles
        │
        └── kpis = computed(over ALL W3 rows: total · new · replicated · approved% · centersReporting)
```

## 3. Data Model Changes

None.

## 4. API Surface

No change. One `GET_bilateralCenterResults(code, versionId)` per Center (CNR-N1).

## 5. Server Workflow

n/a.

## 6. Frontend Plan

### 6.1 Routes / modules
No change.

### 6.2 Components & services

**`centers-block.aggregate.ts`** gains pure functions. `buildCenterRow` and `sumRows` are unchanged.

| Function | Contract |
|---|---|
| `isW3Row(row)` | `row.source === 'API'` (CNR-P-1) |
| `isReplicatedRow(row)` | `true` for `1`, `'1'`, `true`; `false` for anything else (CNR-2) |
| `CenterOrigin` type | `'all' \| 'new' \| 'replicated'` |
| `byOrigin(rows, origin)` | `all` → rows; `new` → not replicated; `replicated` → replicated |
| `originCounts(rows)` | `{ total, new, replicated }`, with `new + replicated === total` by construction |

**`centers-block.component.ts`** (on top of #7):

- **`CenterRowState`.** `row: EntityOverviewRow | null` is replaced by `w3Rows: BilateralCenterResult[] | null` (`null` while loading or failed). `loadCenter` stores `(envelope?.response ?? []).filter(isW3Row)`. The `versionId === null` branch stores `[]`. `retryFailedCenters()` needs no change, because it calls `loadCenter()`.
- **New signal:** `origin = signal<CenterOrigin>('all')`.
- **`viewRows`** (computed): per center with `w3Rows`, `buildCenterRow(code, acronym, byOrigin(w3Rows, origin()))`. `loadedCenterRows` reads it, so `centerTotals`, `segments` and the donut follow the origin (CNR-3).
- **`kpis`** (computed) reads **unfiltered** W3 rows (DD-4):
  - `bilateral` = total;
  - the new fields `bilateralNew` and `bilateralReplicated`;
  - `bilateralApproved` = the approved % over all W3;
  - `centersReporting` = Centers with ≥ 1 W3 row;
  - `centersCount` is unchanged.
- **`toggleOrigin(o)`** sets `o`, or `'all'` when `o` is already selected. It never touches `selectedStatus`. `toggleStatus` (as #7 leaves it) never touches `origin` (CNR-4).
- **`clearFilters()`** resets both. "Clear filter" calls it.
- **`activeFilterLabel`** (computed) joins the origin label and the status label with `copy.filterSeparator`. It is `null` when both are unset, and the strip shows only when it is non-null.
- **`resultsCenterParams()`** returns `{ funding: 'bilateral', status }`.
- **`showResultsCenterLink`** (computed) is true only when a status is selected **and** `origin() === 'all'` (CNR-7).

**`centers-block.component.html`:**

| Element | Detail |
|---|---|
| W3/Bilateral KPI card | Title, total and approved chip are unchanged |
| Separator | `hlm-separator`, as in the top KPI deck |
| Origin buttons | Two rows, **New** and **Replicated**, each a `<button type="button">` with label + `tabular-nums` count, `aria-pressed`, `data-testid="origin-new"` / `origin-replicated` |
| Button styling | The status tiles' selected / unselected classes (DD-3) |
| Loading | `pr-skeleton` on the counts while loading (CNR-N3) |
| Active-filter strip | Binds `activeFilterLabel()`. The link is wrapped in `@if (showResultsCenterLink())`. "Clear filter" calls `clearFilters()` |
| Unchanged | #7's partial note + "Retry failed Centers" and the empty state |

**`portfolio-centers-block.copy.ts`** (CNR-6, CNR-N4):
- `subtitle` is rewritten: W3/Bilateral results per Center; a shared result counts for each Center; no Center-Overview claim.
- New keys: `originNew` 'New', `originReplicated` 'Replicated', `filterSeparator` ' · '.

### 6.3 Design system usage
- Tokens only and px type sizes.
- `hlm-separator` is installed and mocked (`BrnSeparator` inputs in `spartanBrainMock.ts`).
- Focus ring: `focus-visible:ring-2 ring-[var(--pr-color-primary-300)]` (CNR-5).

### 6.4 Real-time
n/a.

## 7. Security & Authorization
Unchanged: `CheckAdminGuard`, read-only GETs.

## 8. Performance & Capacity
- About 1.3k rows across 16 Centers.
- An origin change re-runs `byOrigin` + `buildCenterRow` per Center: O(rows), well under a frame.
- Stored W3 rows are about 700 small objects, dropped with the component.

## 9. Observability
n/a.

## 10. Testing Plan

### 10.1 Specs that pin changed symbols (kaizen lesson applied)

The baseline is the spec file **as #7 leaves it**. CNR-T-2's first step re-reads it.

| Spec | What breaks | Why |
|---|---|---|
| `centers-block.component.spec.ts` `beforeEach` fixture (`[{ status_id: '5' }, …]`) | **Every** figure test drops to 0 | The fixture rows have no `source`, so W3-only drops them. Add `source: 'API'` to every fixture row, including every in-test `centerResults = jest.fn(...)` override (KPI, failure / retry-failed, acronym-fallback) |
| The status-filter test | `resultsCenterParams()` `toEqual({ status: 5 })` | It becomes `{ funding: 'bilateral', status: 5 }` (CNR-7) |
| The KPI test | `toMatchObject` on `kpis()` | It passes once the fixture has `source`. Extend it with `bilateralNew` / `bilateralReplicated` |
| Any read of `centerRows()[i].row` (state-level tests #7 rewrote) | Property replaced | Read `viewRows()` / `loadedCenterRows()` instead |
| `centers-block.aggregate.spec.ts` | Nothing | `buildCenterRow` / `sumRows` are unchanged; only new tests are added |
| `centers-block.charts.spec.ts`, `portfolio-overview.component.spec.ts` | Nothing | No changed symbol is referenced |

### 10.2 New specs

| Spec | Proves | Falsifier (the input that makes it fail) |
|---|---|---|
| Aggregate: `isReplicatedRow` matrix | CNR-2 encodings | `'1'` or `true` classified as new |
| Aggregate: `isW3Row` | CNR-1 | A `source: 'Result'` row kept |
| Aggregate: `originCounts` invariant | new + replicated = total | Any fixture where they differ |
| Component: a mixed fixture (W3 new, W3 replicated, W1/W2, a W3 status-3 row; 2 Centers) | CNR-1 across `kpis()`, `centerTotals()` and `segments()`; status-3 counts in the total | One output still counting W1/W2 |
| Component: origin = Replicated | CNR-3 on `segments()` / `centerTotals()`; `kpis()` **identical** to origin = All | `kpis()` built from filtered rows; segments unfiltered |
| Component: compose and clear | CNR-4 | Setting one filter resets the other |
| Component: retry under a filter | CNR-N2: a failed Center recovers via `retryFailedCenters()` with mixed rows, while origin = New; W1/W2 dropped and the origin applied | The retry path stores raw rows |
| Component: the link | CNR-7 | Link rendered while origin ≠ all |
| Component: a W1/W2-only Center | CNR-1 Centers reporting: not in N, still in M | Counted as reporting |
| Component: zero | CNR-2: 0 / 0 / 0, approved % is a number | `NaN` |
| DOM: origin buttons | CNR-5: `<button>` + `aria-pressed` flips; a click changes the tile counts | A `div` with a click handler |
| DOM: active-filter strip | CNR-4 / CNR-7: "New · Pending review", no link, Clear removes the strip | Link outside the `@if` |
| DOM: copy | CNR-6: no "Center Overview shows" / "same numbers" | Old subtitle left |

**What these cannot prove:** layout, wrapping at 375 px, the visible focus ring, and real-data reconciliation. These go to T-H.

## 11. Backwards Compatibility & Migration
- No data migration.
- **Visible change:** the block's figures drop (1284 → 712 on PRTest). The subtitle and the CLAUDE.md note (CNR-N5) explain why.

## 12. Design Decisions

### CNR-DD-1 — Filter to W3 at load time, for the whole block *(reverts delivered behaviour)*
- **Context:** P2-3858 / P2-3928 built the block to repeat each Center Overview's numbers. The stakeholder asked for W3 only; the user chose the whole block (2026-10-15).
- **Decision:** `loadCenter` keeps `isW3Row` rows only. Every load, the retry included, goes through it.
- **Alternatives:**
  - Filter at each consumer: more places to forget one.
  - Keep W1/W2 with a source filter: rejected by the user.
- **Reversion challenge — "what does removing this break?"**
  1. Spec fixtures without `source` → every figure test fails. Addressed in §10.1.
  2. The subtitle and CLAUDE.md "same numbers" promise becomes false. Addressed by CNR-6 and CNR-N5.
  3. The Center Overview totals now differ. Accepted and explained by the subtitle.
  4. No other consumer exists (CNR-P-5).
  - Nothing is left open.

### CNR-DD-2 — Store W3 rows, derive the per-Center row
- **Context:** a pre-built `row` cannot be re-filtered by origin.
- **Decision:** store `w3Rows`, and derive the rows in a `computed` keyed on `origin()` (CNR-N2).
- **Alternatives:**
  - Pre-build three rows per Center: three times the state.
  - Re-fetch per origin: violates CNR-N1.

### CNR-DD-3 — Origin buttons reuse the status-tile button pattern
- **Context:** the installed Spartan set (`ls src/app/spartan`) has no toggle or toggle-group. The status tiles in this component are `<button aria-pressed>` with Tailwind states.
- **Decision:** native `<button aria-pressed>` with the tiles' classes; `hlm-separator` for the divider.
- **Alternatives:**
  - Generate Spartan `toggle-group`: a new component and mock surface for two buttons, and a different look from the neighbouring tiles.
  - `hlmBtn` variants: a different visual language inside one card.

### CNR-DD-4 — The KPI card, "% approved" and "Centers reporting" ignore the origin
- **Context:** the card is the control. If it shrank, the unselected count would vanish.
- **Decision:** `kpis()` reads unfiltered W3 rows. The donut and tiles follow the origin.
- **Alternatives:** filter the card too. It would read "New 0" under Replicated.

### CNR-DD-5 — Hide the Results Center link under an origin filter *(reverts delivered behaviour)*
- **Context:** the link showed whenever a status was selected (kept by #7 RCP-3). Results Center cannot filter by replicated (CNR-P-4).
- **Decision:** show it only when `origin === 'all'`, and add `funding=bilateral`.
- **Reversion challenge:** #7's status-filter spec still passes with origin = All, after the `toEqual` update (§10.1). No other caller exists. Nothing is left open.

## 13. Open Gaps & Follow-ups
- CNR-P-6 is `assumed` until #7 is executed. CNR-T-2 starts by re-reading the executed component and HALTs on a mismatch.
- OQ-1: a replicated filter in Results Center.
- Real-data reconciliation is a human check (T-H).

## 14. Budget (tripwire for `/akili-execute`)

| Measure | Estimate |
|---|---|
| Tasks | 3 code tasks + 1 human browser check |
| LOC | ≈ 240 changed (≈ 60 aggregate + spec, ≈ 120 component + spec, ≈ 60 template + copy + CLAUDE.md). Tripwire 320 |
| Review rounds | 1 per task |

Depth check: Standard still fits. Rev 2 shrank the design by about 80 LOC, because the table and chart paths are gone. It is not near Lite (one task under ~50 LOC).
