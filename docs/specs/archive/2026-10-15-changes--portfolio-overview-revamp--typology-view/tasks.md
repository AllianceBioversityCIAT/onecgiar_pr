# Tasks — Portfolio Overview: Results by typology

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/portfolio-overview-revamp/typology-view` |
| Linked | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) · `docs/prd.md` (US-P1, AC-3) · `docs/ux-ui/design.md` §7 (result-level palette) · `docs/trd/trd.md` (client, no API change) |
| Depth | Standard |
| Approval Mode | gated |
| Budget | 4 tasks · ≈ 450 LOC · 1–2 review rounds (`design.md` §11) |
| Status | done (all 4 tasks PASS, not committed) |

**Test rules (machine policy):**
- Every Jest run is `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern=<touched>`, run from `onecgiar-pr-client/`.
- Run one test suite at a time, and never the full suite.
- Lint only the touched files, with `npx eslint <files> --quiet`.
- Before committing, also run the existing page specs (`portfolio-overview.component.spec`), because the template changes (memory: run the affected specs).

## Dependency graph

```
TYV-T-1 (aggregate) ─► TYV-T-2 (block component) ─► TYV-T-3 (page slot + skeleton + guide) ─► TYV-T-4 (HITL live + visual)
```

Strictly serial: each task consumes the previous task's exports.

---

## TYV-T-1 — Pure typology aggregate

| Field | Value |
|---|---|
| Status | [x] done (2026-10-15, PASS attempt 1) |
| Type | client |
| Size | S |
| Implements | TYV-R-1 (S-1.1, S-1.2, S-1.3), TYV-R-2 data (S-2.1 order + zero-type exclusion, S-2.2 zero level), TYV-R-4 data (S-4.1, S-4.2, S-4.3), TYV-R-5 data (S-5.1 incl. "W1/W2 must NOT appear") |
| Design | §4, §7.2, TYV-DD-2, TYV-DD-3, TYV-DD-6, TYV-DD-7 |
| Skills | `angular-developer`, `tdd` · effort medium |
| Review | full (the reconciliation logic is the core of the spec) |

**Files:**
- `portfolio-overview/components/typology-block/typology.aggregate.ts` (+ `.spec.ts`)
- `services/portfolio-overview.service.ts`: `RawResult.lead_center?` and `readonly openRows = this.rows.asReadonly()`

**Scope:**
- Implement `levelOf`, `levelCards`, `breakdownByProgram` and `breakdownByCenter`, plus their types, as described in design §4/§7.2.
- The type map uses canonical names; matching is case- and space-insensitive.

**Tests (red first):** one `it` per scenario, each using the scenario's own numbers.
- S-1.1: 10 rows → 5/3/1/1, and the sum equals 10.
- S-1.2: `' knowledge Product '` merges into `Knowledge product`.
- S-1.3: `unclassified` is 0 when every row maps.
- S-2.1: type order is count desc, then name; a 0-count type is absent.
- S-2.2: Impact gives `{count: 0, percent: 0, types: []}`.
- S-4.1: per-row level sum equals the row total, and the row totals sum to `rows.length`.
- S-4.2: SP02 (300 rows) sorts after SP01 (10 rows).
- S-4.3: a row without `submitter` goes to the last row, keyed `''`.
- S-5.1: IITA 3 / CIMMYT 2 / no-lead 1 come out ordered CIMMYT, IITA, catch-all. A W1/W2 row that has `lead_center` is excluded, and the sum equals the W3 count.

**Verification:**
- **Falsifier:** feed S-5.1's fixture plus one `source_name: 'W1/W2', lead_center: 'IITA'` row. If IITA reads 4, the task fails.
- **Red run:** `--testPathPattern="typology.aggregate.spec"` fails before the module exists (import error, which counts as red) and passes after.
- **Disqualifier:** a reconciliation assertion written as `expect(sum).toBe(sum)`, or one computed with the same helper under test, is not evidence. Expected numbers must be literals from the scenarios. If a real type name outside the 9 is found while writing this task, stop and raise it (TYV-P-3).
- **Consumers:** `RawResult` is used only inside `portfolio-overview/` (an additive optional field). `openRows` is new and has no consumers yet.

**Done:**
- [x] All the scenario tests are green.
- [x] Lint on the 3 files is clean.

---

## TYV-T-2 — `PortfolioTypologyBlockComponent`

| Field | Value |
|---|---|
| Status | [x] done (2026-10-15, PASS attempt 2) |
| Type | client |
| Size | M |
| Depends on | TYV-T-1 |
| Implements | TYV-R-2 view (S-2.1 "50%", S-2.2 "No results at this level", card not hidden), TYV-R-3 (S-3.1, including "cards must NOT change"), TYV-R-4 view (S-4.2 "no header may offer a sort"), TYV-R-5 view (center note, S-5.2 empty state, "cards keep their values"), TYV-R-6 (S-6.1: min 4px, no segment at 0, `aria-hidden`), TYV-R-8 (no click targets), NFR copy/tokens/a11y presence |
| Design | §7.3, §7.5, §8, TYV-DD-4, TYV-DD-5 |
| Skills | `angular-developer`, `spartan` (Spartan MCP for the `hlm-tabs` contract), `tailwind-design-system`, `tdd` · effort medium |
| Review | checklist |

**Files:**
- `components/typology-block/typology-block.component.{ts,html,spec.ts}`
- `internationalization/portfolio-overview.copy.ts` (the keys listed in design §8)
- `tests/mocks/spartanBrainMock.ts`, only if Tabs needs it (design §10)

**Scope:**
- Build the template per design §7.3 and the tokens per §7.5. Use Tailwind px sizes; no hex, no rem type utilities.
- Bind `input.required` rows; `dimension` is a signal.

**Tests (Jest + DOM):**
- Card count, percent and type list come from a fixture.
- The Unclassified card or column is absent at 0 and present at 1.
- Switching the tab changes the table rows, but the card texts are identical before and after.
- With 0 W3 rows in the center dimension, the `typology-center-empty` testid shows and the cards are unchanged.
- The center note appears only in the center dimension.
- Bar segments: a level at 0 renders no segment; the bar has `aria-hidden="true"`; each segment has the `min-w-[4px]` class.
- Headers contain no `button` or `aria-sort` (S-4.2).
- No `[role=link]`, `a` or `button` exists inside the cards or rows (TYV-R-8).
- The table has a `caption`.

**Verification:**
- **Falsifier:** if a card's count changes after the tab switches to center (S-3.1), the task fails.
- **Red run:** `--testPathPattern="typology-block.component.spec"` fails before the component exists.
- **Disqualifier:** these are presence-assertions. The `min-w-[4px]` class, the token classes and `aria-hidden` prove presence only. **They cannot prove** that a 1-of-200 segment is visibly 4px, that the fills meet 3:1, or that Tabs is keyboard-operable. Those are owned by TYV-T-4 and must not be claimed here. An NG0311 from a Brain directive is a mock gap: fix the mock, not the component.
- **Consumers:** `PORTFOLIO_OVERVIEW_COPY` gains new keys only (additive); `spartanBrainMock` is shared by every spec that uses Helm, so extend it, never change existing inputs.

**Done:**
- [x] Specs are green.
- [x] Lint is clean.
- [x] No hardcoded English in the template.

---

## TYV-T-3 — Page integration, skeleton, component guide

| Field | Value |
|---|---|
| Status | [x] done (2026-10-15, PASS attempt 2) |
| Type | client + docs |
| Size | S |
| Depends on | TYV-T-2 |
| Implements | TYV-R-7 (S-7.1 skeleton; "no zero figures while loading"; inherits the hasFigures / error / empty / closed / partial states), the placement in requirements §4 ("between status and matrix"), the NFR folder docs |
| Design | §7.4, §2 |
| Skills | `angular-developer` · effort low |
| Review | checklist |

**Files:**
- `portfolio-overview.component.{ts,html,spec.ts}`
- `portfolio-overview/CLAUDE.md`

**Scope:**
- Import the block and place `<app-portfolio-typology-block [rows]="data.openRows()" />` after the status section, inside `@if (hasFigures())`.
- Add the skeleton block between the status and matrix skeletons.
- Guide: add a short "Results by typology" section covering the type → level map location, the lead-only/W3-only Center rule, the A→Z no-ranking rule and the input hook for #6. Re-stamp `Verified:`.

**Tests:**
- Page spec, loading state: a `portfolio-overview-skeleton-typology` testid is present and the block is absent.
- Page spec, `hasFigures` state: the block is present and comes after the status section and before the matrix in DOM order.
- Page spec, error and empty states: the block is absent.
- The existing page specs stay green.

**Verification:**
- **Falsifier:** if the block renders during loading, or appears in the error state, the task fails.
- **Red run:** the new page-spec cases fail before the slot exists. Pattern: `--testPathPattern="portfolio-overview.component.spec|typology"`.
- **Disqualifier:** if pre-existing page specs fail for reasons unrelated to this diff, report them verbatim and do not "fix" them silently (memory: a CT/Jest baseline may already be red). DOM-order assertions prove placement, not visual spacing; the visual check is TYV-T-4's.
- **Consumers:** `PortfolioOverviewComponent.imports` (only this page).

**Done:**
- [x] Specs are green.
- [x] Lint is clean on the touched files.
- [x] The guide is updated and re-stamped in the same change.

---

## TYV-T-4 — Live parity + visual check (HITL)

| Field | Value |
|---|---|
| Status | [x] done (2026-10-15, PASS after T-2 remediation) |
| Type | manual (browser, read-only) |
| Size | S |
| Depends on | TYV-T-3 |
| Implements | §8 defect classes with no automated gate: real type names (TYV-P-3), live reconciliation (S-1.1, S-4.1, S-5.1 on real data), contrast (TYV-P-6, NFR a11y), 375px responsive, keyboard on Tabs, S-6.1 rendered width |
| Skills | `claude-in-chrome` (read-only), T6 visual review · effort medium |
| Review | user (HITL) |

**Scope:** read-only. The local stack hits the shared prdb, so never click write buttons and confirm the served bundle is fresh.
1. On `/portfolio-overview`, record the Total and W3/Bilateral KPI cards.
   - Check Output + Outcome + Impact (+ Unclassified) against Total.
   - Check the sum of the By P/A table rows against Total.
   - Check the sum of the By Center table rows against the W3/Bilateral card.
2. Unclassified must be 0. If it is not, list each type name in it and stop for a decision.
3. Take screenshots at 1280 / 768 / 375:
   - there is no horizontal page scroll;
   - the cards stack;
   - the table scrolls inside its own container.
4. Measure each fill against the white card with DevTools contrast or a computed ratio; each must be ≥ 3:1. Find a row with a smallest non-zero segment and measure its width; it must be ≥ 4px.
5. Keyboard: Tab to the switch, change the dimension with the arrow keys or Enter, and confirm the focus ring is visible.

**Pass:** all three reconciliations are exact, Unclassified = 0, every fill is ≥ 3:1, the small segment is ≥ 4px, and there is no page overflow at 375px.

**Disqualifies evidence:**
- A count read while the closed-phase or partial banner is showing is not parity evidence, unless both sides are read from the same view.
- A screenshot from a stale bundle (check the served bundle first) is not evidence.

**Would fail if:** a real type name sits outside the map, or a W3 row has an unexpected `source_name`.

---

## Coverage closure (scenario / clause → task)

| Scenario / clause | Owner |
|---|---|
| S-1.1 values + "MUST = Total card" | T-1 (unit), T-4 (live) |
| S-1.2 merge + "must NOT create a second line / Unclassified" | T-1 |
| S-1.3 hidden at 0 | T-1 (data), T-2 (view) |
| S-2.1 values, order, "must NOT list 0-type" | T-1 (data), T-2 (50% text) |
| S-2.2 zero card + "must NOT be hidden" | T-1 (data), T-2 (view) |
| S-3.1 regroup + "cards must NOT change" | T-2 |
| S-4.1 row sum + "MUST sum to Total" | T-1, T-4 |
| S-4.2 code order + "must NOT order by count / no sort header" | T-1 (order), T-2 (headers) |
| S-4.3 "No Program" last + reconcile | T-1 |
| S-5.1 order + "MUST = W3 card" + "W1/W2 must NOT appear" | T-1, T-4 |
| S-5.2 empty state ≤160px + "cards keep values" | T-2 (presence + cards), T-4 (height, visually) |
| S-6.1 ≥4px + "no segment at 0" | T-2 (class / no segment), T-4 (rendered width) |
| S-7.1 skeleton + "no zero figures while loading" | T-3 |
| TYV-R-3 announced as selected / keyboard | T-2 (`aria-selected` presence), T-4 (keyboard) |
| TYV-R-5 lead-Center note | T-2 |
| TYV-R-7 inherits error / empty / closed / partial | T-3 |
| TYV-R-8 no click targets | T-2 |
| NFR contrast ≥3:1, responsive 375, text never coloured with a fill | T-4 (contrast, responsive), T-2 (fills only on bar/marker classes) |
| NFR copy file, tokens, px sizes | T-2 |
| NFR folder docs | T-3 |

## Rollback

This is client only. Revert the commit; there is no migration or payload to undo.
