# Tasks — Reporting: dynamic KPI and target counts

## 1. Scope

- **Feature:** dynamic card header count + target sum, `KPI` / `Target` quick chips
- **Linked spec:** [`requirements.md`](./requirements.md) (DKT-R-1..4) + [`design.md`](./design.md)
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** done (2026-10-16)

## 2. Pre-flight

- [ ] On `qa-development-2026-ss`. The unrelated working-tree changes (`portfolio-overview.service.ts`, `filtered-detail-export/`, `src/a.py`) are left untouched and never staged
- [ ] Every Jest run uses `--maxWorkers=2` and `--testPathPattern` on the touched specs only. One test run at a time on the machine

## 3. Task list

### [x] DKT-T-1 — Header count and target sum read the card's filtered base

- **Type:** client
- **Description:** Add the pure target-sum helper to `reporting-burndown.ts` (DKT-DD-2) and make `hloTargetSum` delegate to it (output unchanged). The card header renders `countLabel(ratioBase.length) · N target(s)`, with the loading fallback to `group.count` and a hidden sum (design §5). Repoint `tableCountLabel()` in `dashboard-lab.kcr-reconciliation.spec.ts` to the rendered header figure (reversion challenge, point 2).
- **Implements:** DKT-R-1 (all three scenarios), DKT-R-2 (Matches the groups, Filter changes the sum, Loading)
- **Files:** `dashboard-lab/reporting-burndown.ts` (+ spec), `components/reporting-aow-table/reporting-aow-table.component.ts` / `.html` / `.spec.ts`, `dashboard-lab.kcr-reconciliation.spec.ts`
- **Depends on:** — · **Blocks:** DKT-T-3
- **Estimate:** S · **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Tests to add / adjust:**
  - Helper: `["9","100"]` → `"109"`. `[null, "", "abc"]` → `"0"`. `["1.25","1"]` → `"2.3"` (1 decimal, same as today's `toFixed(1)`)
  - Header with fixture rows of both tiers: Type all → `N KPIs · S targets`. HLO rows only → the smaller count and sum
  - A group with `__allIndicators` (Only pending / Favorites on) → header uses the pre-toggle set, not `indicators.length`
  - Cross-cut IO rows → excluded from both the count and the sum
  - `group.loading` with no rows → shows `group.count` and no `· targets`
  - Singular: sum exactly 1 → `1 target`
  - KCR spec: card A still reads `4 KPIs` and `count − zeroTarget = ratio.total` for cards A and B
- **Verification:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(reporting-burndown|reporting-aow-table.component|kcr-reconciliation)"` plus `npx eslint <touched files> --quiet`
- **Would fail if:** the header still read `group.count` (the HLO-only test expects the smaller count), the sum concatenated strings (`"9100"`), or `__allIndicators` were ignored (the Only-pending test expects the pre-toggle size)
- **Not evidence:** a green KCR spec whose helper still builds the label from `group.count`. That check cannot fail on the rendered header. It must read the rendered figure
- **Done when:** all of the above are green and `hloTargetSum` existing assertions are unchanged

### [x] DKT-T-2 — `KPI` chip label and informational `Target` chip

- **Type:** client
- **Description:** In `QUICK_TYPOLOGIES` rename `All` → `KPI` (label and short label). Add an optional `targetSum` input to the quick-typology component that renders a non-focusable `Target` pill right after the first chip (DKT-DD-3, design §5 tokens). Make `reportingTypologyCounts` skip `__isIntermediateCrosscut` rows (for `all` and per category), and add the host computed `reportingTargetSum` over those same rows (DKT-DD-4), formatted with the T-1 helper. Wire it to both call sites (direct in `dashboard-lab.component.html` and through `reporting-program-band` as a pass-through input).
- **Implements:** DKT-R-3, DKT-R-4 (Informational only)
- **Files:** `components/reporting-quick-typology-filters/*`, `components/reporting-program-band/reporting-program-band.component.ts` / `.html`, `dashboard-lab.component.ts` / `.html`, plus specs that assert `'All'` on these chips (grep before editing)
- **Depends on:** DKT-T-1 (helper) · **Blocks:** DKT-T-3
- **Estimate:** S · **Review:** checklist
- **Skills:** `angular-developer`, `spartan` (pill styling consistent with the existing chips), `tdd`
- **Tests to add / adjust:**
  - `buildQuickTypologyChips` → first chip label `KPI`, short label `KPI`, still reads `counts['all']` as its count, still active with no category selected
  - Component: the `Target` pill renders `targetSum`, is not a `button`, has no `aria-pressed`, and has `aria-label="Target sum: N"`. Clicking it emits no `typologyChange`. With no `targetSum` set, no pill renders
  - Host: `reportingTargetSum` with Type = HLO on a fixture = sum of HLO rows only. Changing Category narrows it
  - Host, KCR fixture (has cross-cut IOs #901 / #902): `reportingTypologyCounts().all` = Σ card header counts, and `reportingTargetSum` = Σ header sums. The cross-cut rows are counted once (in the Intermediate card), not again per AoW
- **Verification:** the Jest command above with `--testPathPattern="(reporting-quick-typology|reporting-program-band|dashboard-lab.component)"` plus eslint on touched files
- **Would fail if:** the Target pill were a `button` (role assertion), clicking it emitted (spy assertion), the host sum ignored the Type filter (HLO fixture expects the smaller total), or cross-cut rows were still counted per AoW (the KCR fixture Σ-identity test)
- **Done when:** green, and no remaining spec asserts the old `All` label on the quick chips

### [x] DKT-T-3 — Live check against the SP05 2026 reference (HITL)

- **Type:** tests (manual, read-only browser)
- **Description:** On local `http://localhost:4200/result-framework-reporting/entity-details/SP05?tocView=aows`, confirm the served bundle has the change, set Type = High level output, and compare the figures. Then check the layout at 1366, 1280 and 375 px. Never click write buttons (shared prdb).
- **Implements:** DKT-R-2 (2026 reference scenario), DKT-R-1 (Type = HLO scenario), the layout NFR, premise P-4
- **Depends on:** DKT-T-1, DKT-T-2
- **Estimate:** S · **Review:** user at the HITL pause
- **Expected:** `KPI 182` · `Target 259` · AOW01 `49 KPIs · 57 targets` · AOW02 42 · AOW03 78 · AOW04 47 · AOW05 0 · AOW06 35. With no filter, AOW01 reads `53 KPIs · 63 targets` and the `KPI` chip reads 213
- **Would fail if:** the totals differ from the reference table. A gap shows P-4 is false (centre sub-rows double counted, or a reclassified KPI such as the AOW02 note), so stop and report it rather than adjusting the numbers
- **Not evidence:** a match taken on a different reporting year or phase than 2026 / P25, or a bundle that predates the change
- **Done when:** every figure matches, or each difference is explained and accepted by the user. No overflow at the three widths

## 4. Dependency graph

DKT-T-1 → DKT-T-2 → DKT-T-3 (serial: T-2 reuses the T-1 helper, and both edit dashboard-lab specs)

## 5. Coverage closure

| Clause | Owner |
|---|---|
| R-1 HLO → 49, equals split line; BUT not 53 | T-1 (HLO test), T-3 |
| R-1 default filters = today; AND IT MUST count − no-target = ring | T-1 (KCR spec) |
| R-1 toggles do not move it; deliberate change | T-1 (`__allIndicators` test) |
| R-2 63 matches groups; AND IT MUST parse numbers; 1 decimal | T-1 (helper tests), T-3 (63) |
| R-2 filter narrows the sum | T-1, T-3 (57) |
| R-2 loading: no provisional 0 | T-1 |
| R-2 2026 reference 259 / per AoW; AND IT MUST be checked live | T-3 |
| R-3 `KPI` label; active / click unchanged | T-2 |
| R-3 no filters = AoWs + Intermediate + 2030 (213); BUT no cross-cut double count | T-2 (KCR Σ test), T-3 (213) |
| R-3 Type = HLO → 182 | T-3 |
| R-4 = Σ header sums; informational; BUT no emit, no `aria-pressed` | T-2 |
| NFR layout 1366 / 1280 / 375 | T-3 (no automated gate) |

## 6. Out of scope — follow-ups from the call with Angel (2026-10-16)

| Item | Why it is not here |
|---|---|
| Minutes 3:35–4:27: show the target sum (and with / without target) on the "All areas of work … completed … 0 of N KPIs" surface | It is unclear which surface was shared (AoW ring or the program summary). Confirm with Angel, then make a separate spec |
| Minute 4:33: "en esa parte también hay que quitarla" | The element to remove is not identified. Confirm with Angel |

## 7. Rollout / roll-back

Client-only, single PR. Roll back by reverting the commit. There is no data or API to undo.
