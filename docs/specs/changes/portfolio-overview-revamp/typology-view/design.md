# Design — Portfolio Overview: Results by typology

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/typology-view/` |
| Requirements | [`requirements.md`](./requirements.md) (Phase 1 approved 2026-10-15; TYV-OQ-1..4 accepted at their recommended defaults) |
| Depth | Standard |
| Status | approved (2026-10-15, Phase gates 1–3) |
| Design prefix | `TYV-DD` |

## 1. Summary

A new standalone child component, `PortfolioTypologyBlockComponent`, renders the section. It takes the page's **open-phase rows** as an input. A pure aggregation module turns those rows into level cards and the two breakdown tables. The page service exposes its rows read-only. Nothing else in the service changes, and there is no HTTP call.

The main trade-off: **the level is derived from the result-type name** (TYV-OQ-1), not from `result_level_name`. The code holds a fixed name → level map. A type missing from the map surfaces as *Unclassified* and is never dropped silently.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| TYV-P-1 | `result_type`, `submitter`, `submitter_name`/`_short_name`, `lead_center` and `source_name` are in every row of `GET_AllResultsWithUseRole` | `result.repository.ts` select (`rt.name AS result_type`, `ci.official_code AS submitter`, `ci2.acronym as lead_center`, `IF(r.source='Result','W1/W2','W3/Bilaterals') as source_name`) | Read 2026-10-15 | verified (code) | Add the field to `RawResult` only; there is no server change because all are selected |
| TYV-P-2 | `RawResult` lacks `lead_center` today, so it must be added to the client interface | `services/portfolio-overview.service.ts:15-29` | Read 2026-10-15 | verified | — |
| TYV-P-3 | Type names on the wire are exactly the 9 in TYV-R-1 (no IPSR 10/11, which `excludeType=[10,11]` removes) | `CATEGORY_SHORT_NAMES` in the component (same 9 names, already matched against real data by the page); server query default | Code read. **Live check at TYV-T-4** (Unclassified = 0) | partly verified | A new name shows under Unclassified; add it to the map |
| TYV-P-4 | The page's open-phase rows are in the private signal `rows` (`service.ts:186`), after `apply()`'s phase filter | `service.ts:186,196` (`total = rows().length`, feeding the Total card) | Read | verified | — |
| TYV-P-5 | Spartan `tabs` is installed (`src/app/spartan/tabs`) | `ls src/app/spartan` | Read 2026-10-15 | verified | Fall back to the two `aria-pressed` buttons used by `centers-block` |
| TYV-P-6 | Fill contrast vs white `--pr-surface-card` (WCAG 1.4.11): `#173f5f` ≈ 11:1, `#2891be` ≈ 3.6:1, `#b30319` ≈ 6.6:1, **green `#19ae58` ≈ 2.9:1 (fails)** | `colors.scss:76,109,133,134` → relative-luminance calculation | Computed 2026-10-15. **Measured again at TYV-T-4** | computed | Pick a darker token from `colors.scss` for the failing fill |

## 2. Architecture Overview

```
PortfolioOverviewService ─ openRows (readonly signal) ──┐
                                                         ▼
portfolio-overview.component.html ── <app-portfolio-typology-block [rows]="data.openRows()">
                                                         │
                         components/typology-block/ ─────┤
                           typology.aggregate.ts   (pure: levelOf, levelCards, breakdownByProgram, breakdownByCenter)
                           typology-block.component (view state: dimension; computeds over the input)
```

- **Why a child component (TYV-DD-1):** the page template is 720 lines and the service 532. Both are already over the size rules. `centers-block/` set the precedent for a self-contained section. Taking `rows` as an **input** lets family #6 feed it filtered rows later without touching the block.
- **Why a pure aggregate module (TYV-DD-2):** every reconciliation scenario (S-1.1, S-4.1, S-5.1) can then be tested without TestBed. This mirrors `centers-block.aggregate.ts`.

## 3. Extended Directory Structure

```
portfolio-overview/
├── components/typology-block/                         (new)
│   ├── typology.aggregate.ts            + .spec.ts
│   └── typology-block.component.{ts,html} + .spec.ts
├── services/portfolio-overview.service.ts             (+ openRows, + RawResult.lead_center)
├── portfolio-overview.component.{ts,html}             (+ import, + <app-…> slot, + skeleton block)
└── CLAUDE.md                                          (+ "Results by typology" section, Verified: re-stamp)
internationalization/portfolio-overview.copy.ts        (+ typology strings)
```

## 4. Data Model (client, in memory)

| Shape | Fields | Notes |
|---|---|---|
| `TypologyLevel` | `'output' \| 'outcome' \| 'impact' \| 'unclassified'` | Display order is fixed: output, outcome, impact, unclassified |
| `LevelCard` | `level`, `label`, `count`, `percent` (whole), `types: { name, count }[]` | `types` contains count > 0 only, ordered by count desc then name A→Z (S-2.1). The display name is the canonical name from the map, so case/space variants merge (S-1.2) |
| `BreakdownRow` | `key` (code / acronym, or `''` for the catch-all), `label`, `name?`, `total`, `byLevel: Record<TypologyLevel, number>` | Sorted A→Z by `key`; the catch-all row ("No Program" / "No lead Center") always comes last (S-4.2, S-4.3, S-5.1) |
| `Breakdown` | `rows: BreakdownRow[]`, `showUnclassified: boolean` | `showUnclassified` is page-wide: true when any page row is unclassified (S-1.3) |

Level map key: the type name lowercased with whitespace collapsed and trimmed. The **match** is normalised; the **displayed** name is the map's canonical spelling. An unmapped type keeps its own trimmed name for display under Unclassified. A missing type becomes "No type".

Percent: `Math.round(count / total * 100)`, and 0 when the total is 0. The cards' percentages may add up to 99–101 because of rounding. That is accepted, and only the counts must reconcile.

## 5. API Design

None. No endpoint, DTO or payload changes. `RawResult` gains the optional `lead_center?: string`, which is already on the wire (TYV-P-1).

## 6. Backend Module Design

None.

## 7. Frontend / UX Component Architecture

### 7.1 Service change (minimal)
- `readonly openRows = this.rows.asReadonly()`. This is the only new public member. `rows` stays private and writable.

### 7.2 `typology.aggregate.ts` (pure)
- `levelOf(type)` maps a type to a level using the fixed map (TYV-R-1).
- `levelCards(rows)` always returns four entries; the view hides `unclassified` at 0 (S-1.3) and always shows the other three (S-2.2).
- `breakdownByProgram(rows)` covers all sources. The key is `submitter`. The name is the first non-empty `submitter_short_name` ‖ `submitter_name` seen for that code. A row without a code goes to the catch-all.
- `breakdownByCenter(rows)` first keeps only rows with `source_name === 'W3/Bilaterals'` (S-5.1 negative clause). The key is the trimmed `lead_center`; an empty value goes to the catch-all.
- One pass per function, O(n).

### 7.3 `PortfolioTypologyBlockComponent`
- Standalone, `OnPush`, `input.required<RawResult[]>()`.
- View state is `dimension = signal<'program' | 'center'>('program')` (TYV-R-3: not persisted, not in the URL).
- Computeds: `cards`, `programBreakdown`, `centerBreakdown`, and `activeBreakdown` (picked by `dimension`).
- **Layout:** a card container that matches the status section (`rounded-[12px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)]`).
  - Header: title and subtitle.
  - Level cards: grid, `grid-cols-1 sm:grid-cols-3`. Each card has a coloured level marker, the label, a `font-mono tabular-nums` count, the percent, and a type list (`text-[12.5px]`).
  - Dimension switch: **Spartan Tabs** (`hlm-tabs`, TYV-DD-4). Its two triggers carry `aria-selected` from the Brain primitive.
  - Table: in an `overflow-x-auto` wrapper. Columns: label · Total · Output · Outcome · Impact (· Unclassified) · bar. Numbers are right-aligned `font-mono tabular-nums`. Plain non-sortable `<th>` headers (S-4.2). It has a `<caption class="sr-only">`.
  - Center note under the table, only in the center dimension (TYV-R-5).
  - Empty state when `activeBreakdown().rows.length === 0`: one line in 14/400 `--pr-text-secondary`, at most 160px (S-5.2).
- **Bar (TYV-R-6):** a flex row, `aria-hidden="true"`, `h-[8px] rounded-full overflow-hidden`. Only levels with count > 0 render a segment. Each segment gets `[style.flex-grow]` = its count and `min-w-[4px]` (S-6.1). Fills come from tokens (TYV-DD-5).
- No `(click)` on counts, rows or segments (TYV-R-8).

### 7.4 Page integration
- The `<app-portfolio-typology-block [rows]="data.openRows()" />` slot goes **inside `@if (hasFigures())`**, right after the status section `</section>` and before the matrix card. It therefore inherits the page's error, empty, closed-phase and partial states (TYV-R-7).
- Skeleton: one block between "Skeleton: status section" and "Skeleton Progress by Science Program Matrix". It has a title bar, 3 card rectangles, a tab bar and 5 row bars, built from the existing `pr-skeleton` utilities (S-7.1).

### 7.5 Design tokens

| Use | Token | Contrast vs `--pr-surface-card` (white) |
|---|---|---|
| Output fill / marker | `--pr-color-result-level-2` (`#173f5f`) | ≈ 11:1 |
| Outcome fill / marker | `--pr-color-result-level-4` (`#2891be`) | ≈ 3.6:1 |
| Impact fill / marker | `--pr-color-result-level-3` (`#b30319`) | ≈ 6.6:1 |
| Unclassified fill / marker | `--pr-color-neutral-*` mid grey, chosen at implementation, ≥ 3:1 | measured at TYV-T-4 |

Level fills are used only on the bar and the small marker dot, **never on text** (requirements §7).

## 8. Shared Contracts or Package Extensions

- `RawResult.lead_center?: string` (additive, optional).
- New copy keys in `PORTFOLIO_OVERVIEW_COPY`: `typologyTitle`, `typologySubtitle`, `typologyTableCaption`, `levelOutput`, `levelOutcome`, `levelImpact`, `levelUnclassified`, `levelEmpty` ("No results at this level"), `dimensionProgram` ("By Program / Accelerator"), `dimensionCenter` ("By Center (W3/Bilateral)"), `colProgram`, `colCenter`, `colTotal`, `noProgram`, `noLeadCenter`, `noType`, `centerNote` ("Each W3/Bilateral result counts once, under its lead Center."), `centerEmpty` ("No W3/Bilateral results in this phase").

## 9. Design Decisions

| ID | Decision | Alternatives rejected | Why |
|---|---|---|---|
| TYV-DD-1 | A child component with a `rows` input | Adding to the page template and service | Both files are already oversized. The input is the hook for family #6 global filters |
| TYV-DD-2 | Aggregation in a pure module | Computeds in the service | Testable without TestBed; mirrors `centers-block.aggregate.ts` |
| TYV-DD-3 | Level derived from the type name via a fixed map; unknown → Unclassified (visible) | `result_level_name` / `result_level_id` | The type names are already proven against real data by `CATEGORY_SHORT_NAMES`. Level names vary ("Initiative output" vs "Output") and have no coverage here. Unclassified keeps the totals reconciling (S-1.1) |
| TYV-DD-4 | Spartan Tabs for the dimension switch | Two `aria-pressed` buttons (the `centers-block` pattern) | The switch swaps the **content** of one region, which is tab semantics. The project rule (memory) is to use Spartan for UI. Fallback per TYV-P-5 |
| TYV-DD-5 | Fills: level-2 / level-4 / level-3 tokens; **the green level-1 token is not used** | Mapping the palette 1:1 by `result_level_id` (Impact = green) | Green `#19ae58` is ≈ 2.9:1 on white and fails WCAG 1.4.11 (TYV-P-6). The `design.md` §7 palette is semantic for result levels, so reusing it here is in-purpose. Record this in `docs/DESIGN-DEVIATIONS.md` only if a reviewer asks for green |
| TYV-DD-6 | Rows A→Z by code, catch-all last; headers not sortable | Volume order; sortable headers like the matrix | Family items 5/8 removed rankings as "competition". A volume order rebuilds one (S-4.2) |
| TYV-DD-7 | The Center dimension counts by lead Center only, W3 only | Lead or contributing (centers-block rule) | Contributors are not on this payload (family #6). Lead-only counts each result once, so it reconciles to the W3 card. The note says so, to avoid comparing it with the Centers block (parent R-4) |

**Reversion challenge (Step 2.3):** no DD removes, disables or inverts shipped behaviour. The service gains one read-only member, and the template gains one slot and one skeleton block. No challenge is needed.

## 10. Risks

| Risk | Mitigation |
|---|---|
| A real type name falls outside the map, so Unclassified grows silently | Unclassified is visible by design. TYV-T-4 requires Unclassified = 0 on real data, or names it |
| The Spartan Tabs Brain host directive needs new inputs declared in `tests/mocks/spartanBrainMock.ts` (NG0311, known gotcha in the component guide) | TYV-T-2 checks the mock first and extends it if needed |
| `lead_center` shows the institution acronym quirk (e.g. "Bioversity") | Accepted (A-2). It is shown as-is |

## 11. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | 4 (aggregate · block component · page integration + copy + guide · HITL live check) |
| LOC | ≈ 450 (≈ 200 production, ≈ 250 tests) |
| Review rounds | 1–2 per task |

The estimate fits Standard depth. Execution stops and escalates if it exceeds 6 tasks or ≈ 650 LOC.
