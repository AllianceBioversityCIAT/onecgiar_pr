# Design — Reporting: dynamic KPI and target counts

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/reporting-dynamic-kpi-target-counts/` |
| **Depth** | Lite |
| **Requirements** | [`requirements.md`](./requirements.md) DKT-R-1..4 |
| **Status** | draft |
| **Package** | `onecgiar-pr-client` only, under `src/app/pages/result-framework-reporting/pages/dashboard-lab/` |

## 2. Executive Summary

The card header stops reading the host's `group.count` and reads the same base the split line and the ring already use (`ratioBase`). One pure target-sum helper feeds both the header and the new `Target` chip. The quick chips get a renamed first chip and a second, non-interactive chip fed by a new host `computed`. There is no API or model change: `ReportingAowGroup.count` stays as it is for its other consumers.

## 1A. Premise Ledger

| # | Premise | Status |
|---|---|---|
| P-1 | `ratioBase(group)` = the card's Section/Type/Category/Target-filtered rows minus cross-cut IO rows, unaffected by Only pending / Favorites / PT activity (they stash the pre-toggle set on `__allIndicators`) | Verified in code (`applyBurndownFilterAndSort`, `applyFavoritesFilter`, `applyPtActivityFilter`, `ratioBase`) |
| P-2 | With no filters, `ratioBase` length = today's header (live SP05: every AoW `rows = header`, e.g. AOW01 53 / 53) | Verified live 2026-10-16 |
| P-3 | Today's per-HLO `TARGET` (`hloTargetSum`) sums AOW01 HLO groups to 57, which matches the user's 2026 reference table | Verified (screenshot 24 + reference table) |
| P-4 | Reporting rows carry the indicator total, not centre sub-rows, so a sum does not double count | **Unverified.** Checked live in T-3 against 259 |

## 2. Architecture Overview

| Surface | Today | After |
|---|---|---|
| Card header count (`reporting-aow-table` html :445) | `countLabel(group.count)`: AoW-own plan size, follows Target only (KCR-R-10). Only pending / Favorites / PT shrink it | `countLabel` of `ratioBase(group).length` (DKT-R-1) |
| Card header target sum | none | `· N targets` from the target-sum helper over `ratioBase(group)` (DKT-R-2) |
| Quick chip 1 | `All` = every `reportingGroups()` row, cross-cut IO rows included | `KPI` = the same rows minus cross-cut IO rows (= Σ header counts), same click (DKT-R-3) |
| Quick chip 2 | none | `Target` = target sum over the same rows as `KPI` (DKT-R-4) |

## 3. Directory Impact

| File | Change |
|---|---|
| `reporting-burndown.ts` | Add the pure target-sum helper (numeric parse of `target_value_sum`, integer or 1-decimal string). It sits next to `hasTarget` / `buildRatio`, which already own the header's arithmetic |
| `components/reporting-aow-table/reporting-aow-table.component.ts` / `.html` | Header count and sum read `ratioBase`. `hloTargetSum` delegates to the helper (same output) |
| `components/reporting-quick-typology-filters/reporting-quick-typology.util.ts` | `All` → `KPI` label and short label |
| `components/reporting-quick-typology-filters/reporting-quick-typology-filters.component.ts` | New optional `targetSum` input. Renders a non-button `Target` pill after the first chip when the input is set |
| `dashboard-lab.component.ts` / `.html` | New `reportingTargetSum` computed over `reportingGroups()`. Passed to both quick-chip call sites (direct, html :1529, and through the band) |
| `components/reporting-program-band/reporting-program-band.component.ts` / `.html` | Pass-through `targetSum` input to the band's quick chips |

## 4. Data Model / API / Backend

No change. No new fields on `ReportingAowGroup`. `group.count` keeps its current meaning for `applyBurndownFilterAndSort` and the By-AOW search (`.filter(g => g.count > 0)`).

## 5. Frontend / UX

- **Header:** `53 KPIs · 63 targets` keeps the existing count span (subtle text, `hidden sm:inline`). The sum shares that span's visibility, so phone width is unchanged. Singular `1 target`.
- **Loading:** while `group.loading` and `ratioBase` is empty, the header falls back to `group.count` and hides the sum, so it never flashes `0 KPIs · 0 targets` (DKT-R-2 Loading).
- **Target chip:** same pill shape and tokens as an inactive chip (`--pr-border`, `--pr-surface-card`, `--pr-text-secondary`, the slate count badge), but a non-focusable `span` with `aria-label="Target sum: N"`. It has no hover border and no `cursor-pointer`. No new tokens. The compact label is `Target` too (short enough at ≤1366 px).

## 6. Design Decisions

| ID | Decision | Rejected alternative |
|---|---|---|
| DKT-DD-1 | The header count reads `ratioBase(group).length` in the table component. The host's `group.count` is left alone | Change `count` in `reportingGroups()`: it also feeds `applyBurndownFilterAndSort` and the By-AOW search filter, which is a wider blast radius |
| DKT-DD-2 | One pure target-sum helper in `reporting-burndown.ts`, reused by `hloTargetSum`, the header and the host computed | Three copies of `parseFloat(String(…))`: drift risk on the string-sum trap |
| DKT-DD-3 | The Target chip is a separate input and pill, not an entry in `QUICK_TYPOLOGIES` | Add it to the typology list: it would inherit click / `aria-pressed` and the category-match logic |
| DKT-DD-4 | `reportingTypologyCounts` skips rows flagged `__isIntermediateCrosscut` (the same exclusion `ratioBase` applies), for `all` and for each category. `reportingTargetSum` iterates the same filtered rows. Result: `KPI` = Σ header counts and `Target` = Σ header sums, by construction. Amended 2026-10-16 after the user confirmed Angel Jarrín's definition (KPI = AoWs + Intermediate + 2030) | Keep today's `all` (cross-cut rows counted once per AoW card and again in the Intermediate card): it inflates `KPI` / `Target` in programs with cross-cut IOs and breaks the agreed definition |

### Reversion challenge (Step 2.3) — DKT-DD-1 reverts KCR-R-10's "label leaves the Type/Category filter"

**What does removing it break?**

1. KCR-AC-5 (`count − zeroTarget = ratio.total` with filters at default) still holds, because count and ratio now share one base. P-2 shows the two agree live.
2. `dashboard-lab.kcr-reconciliation.spec.ts` `tableCountLabel()` builds the label from `group.count`. It stays green while no longer matching what is rendered: a false green. **Fix:** T-1 repoints it to the rendered header figure.
3. The Only pending / Favorites / PT toggles stop shrinking the header count. This is accepted and written down in DKT-R-1 (the "Toggles" scenario).

Nothing else reads the rendered label.

## 7. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 3 (2 code + 1 live check) |
| LOC | ≈ 90 production + ≈ 120 test |
| Review rounds | 2 |
