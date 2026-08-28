# `changes/overview-chart-view-toggle` — Execution Log

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec** | `docs/specs/changes/overview-chart-view-toggle/` |
| **Approval mode** | gated (requirements §1) — user launched `/akili-execute … fast and efficient`: Leader proceeds through routine PASS gates and stops at the CVT-T-3 HITL (which requires the user regardless); deviation recorded here |
| **Branch** | `qa-development-2026` @ base `b4d479cb3` |
| **Triad** | Leader: session model (T1 role) · Implementer: `akili-implementer` wrapper (T2) · Reviewer: `akili-reviewer` wrapper (T3, read-only) — author ≠ auditor held |
| **Budget (design §1)** | 3 tasks · ~300 LOC · 1 review round |

## 2. Task Execution History

## CVT-T-1 — Pure builders: `stackedBarOption` + `barLinkFromClick` (+ shared morph ids)

- **Status:** PASS (attempt 1 of max 3) · **Date:** 2026-08-27
- **Implements:** CVT-R-2 (builder side), CVT-R-3 (full parity), CVT-R-5 (shared ids + universalTransition)
- **Skills assigned:** `angular-developer`, `tdd` · effort medium

### Attempt 1

- **Files changed:** `program-overview.charts.ts` (+92), `program-overview.charts.spec.ts` (+137) — diff confined to these two.
- **What:** `datasetIdsFor(model)` (`col-${c}` per column) · `stackedBarOption(model, ramp)` (yAxis=rows `inverse`+`interval: 0`+`abbreviateAxisLabel`, xAxis value, one `bar` series per column `stack: 'total'`, full column names, `ramp[c % len]`, row-aligned data with `0 → null`, tooltip `row × col: N` + "(not navigable)", no legend/bar-end totals per CVT-DD-5) · `barLinkFromClick(event, model)` (`seriesIndex→c`, `dataIndex→r`, null-safe) · only heatmap-path edit: series `id: 'heatmap-matrix'` + `universalTransition: {enabled, seriesKey: datasetIdsFor(model)}` (ECharts one-to-many split, CVT-DD-4). Specs: asymmetric 2×4 distinct-value fixture; option shape; full-matrix parity loop (all 8 cells incl. null links) `barLinkFromClick ≡ cellLinkFromClick`; ramp-index color assertions (KZ-SPO-1, `!startsWith('#')`); shared-ids equality; guard cases.
- **Implementer verification:** `npx jest --silent --reporters=summary --no-coverage` → **482 suites / 6888 tests passed** (full suite). `npx ng lint --quiet` → all files pass. No hex, no `package.json`.
- **Reviewer verdict:** **STATUS: PASS** — "`stackedBarOption`/`barLinkFromClick`/`datasetIdsFor` conform to design §2.2 items 3–5 and CVT-DD-3/4/5; all five DoD items satisfied with behavioral assertions." **Adjudication:** the DoD's literal "both builders' series ids equal" is unsatisfiable for a 1↔N morph; the implemented `seriesKey` split (heatmap `seriesKey: ['col-0'…]` ↔ bar series `id: 'col-N'`) is the documented ECharts 1↔N grouping (`findTransitionSeriesBatches`) and the identity set is shared and single-sourced — intent and letter satisfied as closely as the engine permits; the divergent-ids FAIL input still bites. Reviewer confirmed `BarChart`/`UniversalTransition` registered in the wrapper (`pr-viz-chart.component.ts:41–50`).

### ADVISORY (4R, non-gating — recorded, not tasked)

1. **RISK:** ramp is 4 colors; the bilateral matrix has 7 columns → `ramp[c % 4]` gives columns 5–7 the same fills as 1–3, and same-colored segments inside one stacked bar are not separable by eye (design-prescribed modulo; tooltip still disambiguates). **Forward pointer → CVT-T-3:** the HITL must explicitly check ramp collision on the bilateral card, not just W1/W2.
2. **READABILITY:** `% ramp.length` wrap never exercised by tests (fixture is 4×4); a 2-entry-ramp assertion would pin cycling.
3. **RELIABILITY:** CVT-R-2 *Empty model* (builder side) is in the task's Implements but in no DoD/§10 test row; behavior verified correct by code inspection (`rows: []` → empty arrays, `cols: []` → `series: []`, no throw) — traceability gap only. Component-side empty state is CVT-T-2's.

- **Decisions:** Leader accepted the Reviewer's shared-ids adjudication (spec intent over unsatisfiable letter); no spec edit needed — recorded here instead.
- **Issues:** Reviewer's verdict initially not delivered to the Leader (idle without report); recovered via direct message — no work lost, no attempt consumed.
- **Final verification:** full suite green (482/6888), lint clean.
- **Gate:** auto-advanced to CVT-T-2 per the user's fast directive (see Document Control).

## CVT-T-2 — Toggle state, segmented control, mode-aware bindings

- **Status:** PASS (attempt 1 of max 3) · **Date:** 2026-08-27
- **Implements:** CVT-R-1 (switching, defaults, pinned headings), CVT-R-2 (empty model, component side), CVT-R-4 (a11y: tableModel identity, real buttons, single host)
- **Skills assigned:** `angular-developer`, `ui-ux-pro-max` · effort medium

### Attempt 1

- **Files changed:** `program-overview.component.ts` (+54/−17 lines w/ renames), `.html` (+75), `.spec.ts` (+125) — diff confined to these three.
- **What:** `ChartViewMode` type; independent `w12ViewMode`/`bilateralViewMode` signals (default `'heatmap'`) + setters; option computeds renamed per design §2.1 to `w12ChartOption`/`bilateralChartOption`, mode-aware (heatmap vs `stackedBarOption` over same model/ramp; rename verified complete — zero stale references); click handlers route `barLinkFromClick`/`cellLinkFromClick` by mode into unchanged null-swallowing `emitLink`; segmented control per card (2 real buttons, `aria-pressed`, status-pill tokens `--pr-color-primary-50/400`, `--pr-text-secondary`, `--pr-border`, `focus-visible:shadow-[var(--pr-focus-ring)]` — CVT-DD-6), outside the chart `@if` so it stays in the empty state; `<h2>` wrapped in flex row with margins conserved — heading text/order byte-identical, pinned 8-heading order assertion untouched in diff and green. Specs: init shape, independence, host-count + `tableModel` reference identity, empty-model both modes, aria-pressed flip, bars-mode click emit/no-emit.
- **Implementer verification:** FULL suite → **482 suites / 6898 tests passed**; `ng lint --quiet` clean; `ng build` succeeded (pre-existing warnings only). No hex, no `package.json`.
- **Reviewer verdict:** **STATUS: PASS** — all 6 DoD items confirmed against the diff; tokens resolve to existing `colors.scss` declarations (no new token); requirements/tasks "empty model" wording adjudicated consistent (no divergence *by mode*); null link structurally cannot emit (only `emitLink` emits).

### ADVISORY (4R, non-gating — recorded, not tasked)

1. **RELIABILITY:** host-count assertion is global (=3) rather than per-card (=1); catches the stated FAIL input but would pass a compensating add/remove across cards. Suggested: scope per `<section>`.
2. **RISK (a11y beyond spec):** toggle group lacks `role="group"` + accessible name tying each Heatmap/Bars pair to its card; `aria-pressed` (all §6.2 requires) present. Two-attribute improvement — **surfaced to the user at the CVT-T-3 gate for a decision; not self-tasked** (advisory-never-grows-scope).
3. **READABILITY:** `gap-0.5` renders 1.5px at the 12px root amid otherwise arbitrary-px utilities; `gap-[2px]` would match intent (style, not violation).

- **Decisions:** none beyond adjudications above.
- **Issues:** concurrent foreign session active in this shared worktree (`kp-cgspace-browse/**` quick) — CVT-T-1's commit initially swept its staged files in twice; corrected by `--only` pathspec commits; CVT-T-2 committed the same way. Convention reminder: one AKILI session per checkout.
- **Final verification:** full suite green (482/6898), lint clean, build clean.
- **Gate:** auto-advanced to CVT-T-3 per the user's fast directive; CVT-T-3's HITL stops for the user regardless.

## CVT-T-3 — Morph verification + HITL decision record

- **Status:** `[~]` in progress — automated gates (a)+(b) complete and green; awaiting user HITL (CVT-AC-3) · **Date:** 2026-08-27
- **Implements:** CVT-R-5 (morph SHOULD + recorded decision), CVT-R-4 (motion parity note), CVT-AC-1/2/3 closure

### (a) Full re-run on final tree (post CVT-T-2 commit `5020e8503`)

- `npx jest --silent --reporters=summary --no-coverage` → **Test Suites: 482 passed · Tests: 6898 passed · Snapshots: 1 passed** (79.2s)
- `npx ng lint --quiet` → All files pass linting.
- `npx ng build` → succeeded (dist emitted; pre-existing warnings only).

### (b) Static gates

- Hex grep over the spec's combined diff (`400abcb2b~1..5020e8503`, client): **0 new hex literals**.
- Diff scope: spec commits touch exactly `program-overview/**` (5 files) + this spec's `execution.md`/`tasks.md`. (Other files in the branch range belong to a concurrent session's `kp-cgspace-browse` quick — not this spec.)
- `package.json`: **0 diff**.

### CVT-R-4 motion-parity note (per task description)

Reduced-motion instant swap is wrapper-owned (`pr-viz-chart` disables engine animation under `prefers-reduced-motion`), verified by the existing wrapper spec — not re-tested here by design.

### (c)+(d) HITL — PENDING USER (CVT-AC-3, SP02 @ 1280px & 1024px)

Checklist handed to the user:
1. Toggle affordance clear on both matrix cards (heading-row segmented control).
2. Bars legibility — half-width W1/W2 card AND full-width bilateral card.
3. **Forward pointer from CVT-T-1 advisory:** ramp collision on the bilateral card — 7 columns cycle 4 ramp colors, so columns 5–7 repeat the fills of 1–3 inside one stacked bar. Look specifically at whether adjacent same-color segments mislead.
4. Morph quality heatmap↔bars → decide **morph kept** vs **fallback** (drop `seriesKey`/ids, plain swap — one-line change, pre-approved by CVT-R-5).
5. Segment clicks: one navigable segment lands on the Results tab with correct chips; one `Other` segment does nothing.
6. Optional user decision (CVT-T-2 Reviewer advisory, scope growth needs approval): `role="group"` + per-card `aria-label` on the toggle groups.

### Amendment record — CVT-A-1 / CVT-A-2 (2026-08-27, owner at the CVT-T-3 HITL gate)

- **User direction (HITL gate):** open in bars and switch to heatmap ("que abra en bars y se cambie a heatmap"). Scope confirmed via structured question: default `'bars'` on **both** matrix cards (CVT-A-1); bar-end row totals shown (CVT-A-2, OQ-1 override, its text marked "overridable at the gate"); the single-series "by indicator category" card **stays** (consolidation declined — recorded as possible future proposal).
- **Docs amended (never silent rewrite):** requirements.md CVT-R-1 + in-scope + OQ-1; design.md §2.1 row, §11, new CVT-DD-5a; tasks.md rollback note + CVT-T-3 amendment work item. Historical entries (completed tasks, proposal.md) left as record.
- **Code delegation:** Implementer briefed for the amendment diff (signals default + totals + test flips); Reviewer gate applies as usual.

### Amendment CVT-A-1/A-2 — implementation loop

- **Status:** PASS (attempt 1) · 2026-08-27 · Implementer: `impl-cvt-t2` (context reused) · Reviewer: `rev-cvt-t2`
- **Files:** `program-overview.charts.ts` (+50 src), `component.ts` (+10), both spec files (+9 net tests).
- **What:** signals default `'bars'` (both cards); `stackedBarOption(model, ramp, totalLabelColor)` — bar-end totals via an appended zero-value `bar` series on the same stack (`silent`, transparent, no `id`, no `universalTransition`, label `position: 'right'` with real `rowTotal(r)` formatter, `''` on malformed payload; grid right 24→40); `totalLabelColor` computed threads `resolveChartTokens().textSecondary` (token-only, purity fence kept). Tests flipped symmetrically for the bars default; five new totals cases; resolver-guard cases (artifact `seriesIndex = cols.length` → null at both levels); heatmap-navigability block now forces `'heatmap'` via `beforeEach` (Reviewer: strengthens — removes implicit-default dependency); old "no totals" case correctly superseded by CVT-DD-5a with net coverage up.
- **Verification:** FULL suite → **482 suites / 6907 tests** green (+9); lint clean; no hex ('transparent' keyword only); no package.json; pinned `<h2>` assertion untouched (no template in diff).
- **Reviewer:** **STATUS: PASS** — totals provably outside the CVT-DD-4 morph set, provably unresolvable by `barLinkFromClick` (three independent layers), provably absent for empty models; all 3 `stackedBarOption` call sites updated; jsdom-safe identity assertions (KZ-SPO-1).
- **Gate condition (Reviewer):** CVT-T-3 must NOT close on the pre-amendment HITL — the totals' rendered position/legibility is jsdom-unprovable; **re-run CVT-AC-3 on the amended build**.

#### ADVISORY (non-gating, recorded)
1. **RISK:** `barWidth: 0` is inert (ECharts honors only truthy barWidth); invisibility rests on zero data + transparent. If a future ECharts honored it, per-stack-group semantics could collapse the visible bars. Suggested: drop it or comment it inert-by-design.
2. **RELIABILITY:** component-level totals-click test hardcodes `seriesIndex: 4` instead of deriving `cols.length` — "emits nothing" passes for any out-of-range index.
3. **READABILITY (spec doc):** scenario body still narrates the heatmap default — **addressed now**: clarifying line added to the CVT-A-1 amendment block.

### Amendment record — CVT-A-3 / CVT-A-4 (2026-08-27, owner at the CVT-T-3 HITL gate)

- **User direction:** (A-3) "esta ya no es necesaria" — remove the "W1/W2 results by indicator category" card, redundant now that the W1/W2 matrix defaults to bars with row totals (its rows ARE the categories). Bilateral "by indicator category" card kept — its matrix rows are centers, different dimension. (A-4) "podríamos adicionar separadores Ejemplo W1/W2 y W3" — section separators; grouping confirmed via structured question: About (top, global) → ── W1/W2 ── [matrix, Reporting status] → ── W3/Bilateral ── [3 bilateral cards] → Progress by AoW (bottom, global); no reordering needed.
- **Docs amended:** requirements.md CVT-A-3/A-4 blocks; design.md CVT-DD-7/DD-8. Scope extension to `dashboard-lab` (dead `categories` chain cleanup) explicitly authorized in CVT-A-3.

#### Implementation loop (combined, chained on one Implementer; single combined Reviewer audit)

- **Status:** PASS (attempt 1) · Implementer: `impl-cvt-t2` · Reviewer: `rev-cvt-t2`
- **Files:** `program-overview.component.html/.ts/.spec.ts`, `dashboard-lab.component.html/.ts` (+111/−153).
- **What (A-3):** card 2 `<section>` deleted; W1/W2 matrix `col-span-6`→`col-span-12` (responsive override dropped); `categories` input + `categoriesMax` + `categoryWidth()` removed; parent `overviewCategories` computed + `[categories]` binding removed (repo-grep: sole consumer); `CategoryBar`/`OverviewCategoryBar` kept (bilateral chain uses them); `overviewW12Heatmap` doc comment re-written (no dangling reference); pinned heading assertion 8→7, renamed + CVT-A-3 cited, tombstone comment for the 6 removed tests; row-count formula fixed.
- **What (A-4):** two `col-span-12` separator rows (`div aria-hidden="true"`: uppercase label `--pr-text-secondary` + `h-px` rule `--pr-border`), placed before the W1/W2 matrix and before the bilateral group; 4 new tests (count/labels/aria-hidden/positions + heading-contract negative).
- **Verification:** after A-3: FULL suite 482/6901 (−6, exactly the dead card's tests), `ng build` succeeded (proves no other template binds `[categories]` — the decisive gate for input removal). After A-4: FULL suite **482 suites / 6905 tests** green (+4), lint clean. No hex, no new tokens, no package.json.
- **Reviewer:** **STATUS: PASS** — removal complete with no survivors/orphans; bilateral chain untouched; heading assertion deliberate + cited; separators exactly per CVT-DD-8, no reordering, h2 contract pinned negatively.

#### ADVISORY (non-gating, recorded)
1. **RELIABILITY:** separator count test queries `div[aria-hidden="true"]` tree-wide; `pr-viz-chart`'s loading container matches when loading — scope to grid children if it ever flakes.
2. **RISK (a11y, within spec):** "Reporting status"'s h2 names no funding source, so SR users don't get its W1/W2 grouping (separators are aria-hidden by design). Cheapest future fix: extend that heading text, not un-hiding the separator.

### Amendment record — CVT-A-5 (2026-08-27, owner at the CVT-T-3 HITL gate)

- **User direction:** "cambia estas graficas por las de la nueva libreria" — convert the two bilateral single-series DOM-bars cards ("W3/Bilateral results by indicator category", "Centers with reported W3/bilateral results") to ECharts via `app-pr-viz-chart`. Recorded as CVT-A-5 / CVT-DD-9 (supersedes the spec's out-of-scope line and, for these two cards, the family's "DOM bars for single-series rows" pattern).

#### Implementation loop

- **Status:** PASS (attempt 1) · Implementer: `impl-cvt-t2` · Reviewer: `rev-cvt-t2`
- **Files:** `program-overview.charts.ts` (+90), `charts.spec.ts` (+104), `component.ts` (+65/−), `.html` (−55/+10), `component.spec.ts` (±168).
- **What:** pure `singleBarOption(bars, color, labelColor)` (structural `SingleBarRow`; yAxis `inverse`+`interval: 0`+`abbreviateAxisLabel`; value label at bar end; no `id`/`universalTransition` — pinned negatively so these can never enter the matrix morph set) + `singleBarTable` + null-safe `singleBarLinkFromClick`; one host per card (`options`/`tableModel`/`chartTitle`/`height`/`chartClick`→`emitLink`); `barCardHeight = max(160, rows*36)px`; dead width/max members removed (usage-grepped first); token fidelity exact — categories `--pr-chart-2-muted`, centers `--pr-chart-2` via UNREVERSED `resolveChartTokens().ramp[1]` (Reviewer: reusing the component's reversed `heatmapRamp` would have silently shipped `--pr-chart-3`; avoided and documented).
- **Verification:** FULL suite **482 suites / 6914 tests** green; lint clean; `ng build` exit 0; no hex; no package.json; `dashboard-lab` zero changes; heading contract 7 untouched; separators/matrix/toggle/donut untouched.
- **Reviewer:** **STATUS: PASS** — builders pure and KZ-SPO-1-behavioral (formatter called, not presence-checked); click parity exercised against a REAL null-link fixture row (not out-of-range); coverage displacement adjudicated test-by-test (replacements stronger where it matters); host counts updated in both assertion sites.
- **Gate condition (Reviewer):** CVT-AC-3 HITL must cover these two cards specifically (abbreviation legibility at half-width, bar-end labels vs padding, the 160px floor on the 2-row card) — earlier HITL passes predate them as charts.

#### ADVISORY (non-gating, recorded)
1. **RISK (a11y, cumulative — decision for the owner, not this task):** with CVT-A-3 + CVT-A-5 the Overview now has NO keyboard-reachable drill-down: all navigation is chart-mark clicks (SVG marks non-focusable by family precedent; the hidden table reaches the data, not the action). Candidate follow-up: hidden-table cells as links. Surfaced at the next gate.
2. **RELIABILITY:** no assertion that the hidden table's CONTENT renders into these two cards (caption/non-null only); one rendered-text line would restore the deleted DOM test's true subject.
