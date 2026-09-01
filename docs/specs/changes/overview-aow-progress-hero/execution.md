# Execution Log — `changes/overview-aow-progress-hero`

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/overview-aow-progress-hero` · judged APPROVED (fix round 1) |
| Mode | pre-approved (owner mandate): ≤1 Reviewer round/task, targeted jest only, never the full client suite; continue gates auto-approved and logged |
| Triad | Leader claude-fable-5 · Implementer T2 wrapper (sonnet) · Reviewer T3 wrapper (opus) — author ≠ auditor |
| Budget | 6 tasks · ~650 non-test LOC · ≤1 review round/task |

## Task Execution History

### OAH-T-1 — Host: rich rows + CTA navigation — **PASS** (2026-08-31, attempt 1/1)

- **Files:** `dashboard-lab.component.ts` (+80: `OverviewAowProgressRowRich`, `overviewAowProgressRich` computed, `continueReporting()`), `reporting-burndown.ts` (1 word: `export stateOf`), `dashboard-lab.oah-rows.spec.ts` (new, 5 tests, hand-computed fixtures).
- **Adjudicated deviation (Leader):** exporting `stateOf` touches a file outside the stated scope but is REQUIRED by the design's delegation mandate (the function was private; recomputing locally would trip R-3's BUT). Approved; docstring amendment remains T-5's.
- **Implementer verification:** folder 20 suites / 623 tests green; `tsc -p tsconfig.app.json` clean.
- **Reviewer verdict: PASS.** Verified: partition delegates fully (orphan `target=0∧achieved>0` → in-progress; `reported ≡ buildRatio` numerator by construction); sort per spec; CTA uses the persisting setter (sessionStorage `'1'` asserted — bare `.set` would fail it) + `onOpenAow`'s route shape; `tocView=aows` restores `plannedBrowseView` in both restore paths; route carries `rfrView:'planned'` (lands on Reporting); thin rows byte-identical (card 4/badge/hub cannot move); tests falsifiable.
- **ADVISORY (recorded, non-gating):** (1) Reliability — the sort tie-break assertion is not independently falsified (tied fixtures seeded in code order; stable sort masks a deleted tie-break). Recorded; per the advisory rule this does not grow the spec. (2) Readability — `reporting-burndown.ts` scope docstring now stale for the hero; already owned by T-5 (coverage row "R-3 docstring amendment").
- **Requirements covered:** R-1 coherence/CTA (logic), R-3 sort+zero-target+no-recompute, R-6 `!toc` reuse.
- Gate auto-approved (pre-approved mode) → continue to OAH-T-2.

### OAH-T-2 — Section move + pinned-test edits — **PASS** (2026-09-01, attempt 1/1; one transient worker network drop, resumed in place)

- **Files:** `program-overview.component.html` (move-only relocation §8→§2; ToC map renumbered →§8 with DD-2 supersession note; gate duplicated correctly at both sites), `program-overview.component.spec.ts` (ONE hunk: the 8-heading order test edited as a deliberate change citing OAH-R-2, original comments preserved).
- **Reviewer verdict: PASS.** Token-for-token move fidelity (single adjudicated whitespace delta); `activeSection()` gate preserved; protected tests (single-emission, `canReportW1W2`) untouched — one hunk total in the spec file; comment numbering honest (promoted card fills the pre-existing hole at 2, no renumber cascade).
- **Proven-unaffected (DoD enumeration, per Reviewer):** `headings.length===8` (spec:687-692), separator-adjacency tests, and the `aow`-filter order assertion (spec:882 — the filtered view still shows the map directly below AoW, so its comment stays accurate). DD-2's "map index shifts 8→7" prediction was moot (map was already last) — recorded, no invented edit.
- **ADVISORY (recorded, non-gating):** file-header prose says "W1/W2 heatmap/bars 3/4" — card 3 is the status card; one-word imprecision, per-card comments correct.
- **Adjudicated:** KPI summary cards + filter tabs (chrome, not sections) stay above the hero — R-2's "first section after About" satisfied; the requirements' "hub" is `app-reporting-entry-hub` in the parent, untouched.
- **Verification:** program-overview 2/142 green; folder 20/629 green.
- Gate auto-approved (pre-approved mode) → continue to OAH-T-3.

### OAH-T-3 — Section rebuild: rail + chips + skeletons + empty — **PASS** (2026-09-01, attempt 1/1 + one Leader-adjudicated remainder closed pre-review)

- **Files:** `program-overview.component.{ts,html}` (rail with single `richStats` computed, chips + legend, skeletons, empty kept; `richRows`/`richLoading` inputs + `continueReporting` output; `import type` from the host — no runtime cycle), `program-overview.component.spec.ts` (2 pinned Report-button tests re-fixtured to richRows, assertions byte-identical, documented), `program-overview.oah-hero.spec.ts` (new, 9 tests, hand-written literals), `dashboard-lab.component.html` (3 bindings).
- **Remainder adjudicated pre-review (scope owed, not review round):** Implementer's coarse `richLoading=loadingAows()` violated R-6's no-jumping BUT (list loads before ToCs stream). Fixed to `plannedReportingStatsLoading()` (ToC-aware, host:1997) + a pinning test citing the source. Closed before the Reviewer spawn — the single-review-round mandate stayed intact.
- **Reviewer verdict: PASS.** R-1 sum-of-rows in one computed with literal expectations; title disclosure + N=0 omission exact; R-5 chips keep thin `xcutProgress` + `openAow` bucket click-through, no Report label; R-6 gates rail AND rows incl. populated-but-loading; tokens all defined, no hex, no cross-component class (grep test pins both); DD-4 thin sources byte-untouched with card-4 pinned at fixture values.
- **ADVISORY (recorded):** (1) all-rows skeleton during partial load satisfies the stronger BUT (no per-row flag exists by design B-16) — check at T-6's cold-load trace; (2) **forward pointer to T-4:** the two re-fixtured pinned tests must stay UNTOUCHED in the row rebuild (a second rewrite erodes the pin); (3) **forward pointer to T-5:** `percentOf()` now dead — owned there already; (4) `OverviewAowProgressRowRich` may deserve a sibling model file if a third consumer appears — future decision, not a defect.
- **Verification:** folder 21/638 green; design-tokens sweep green; tsc clean; full dev `ng build` clean (template typecheck).
- Gate auto-approved (pre-approved mode) → continue to OAH-T-4.

### OAH-T-4 — Rows: segmented bar + figures + actions — **PASS** (2026-09-01, attempt 1/1)

- **Files:** `program-overview.component.{ts,html}` (mockup grid tracks; TS-computed segment widths bound `[style.width.%]`; `rowBarTitle` three-counts + conditional zero-target; complete swap `total>0 && remaining===0`; three action paths → the ONE existing `openAow`; permission gate byte-equivalent), `program-overview.oah-hero.spec.ts` (+OAH-TEST-4 block).
- **Adjudicated:** complete row renders only "View results" (mockup-exact); open-icon/View-results ungated by `canReportW1W2` (the gate fences reporting rights, not navigation — REH semantics); Report stays gated.
- **Reviewer verdict: PASS.** Width test reads the BOUND style (`parseFloat(style.width)` vs hand-computed `(1/137)*100` — percent-of-percent would yield 1 and fail; `percentOfRich` pinned to the different rounded value at its different site, proving independence); title selectors non-vacuous (only the bar's title contains the count words); tokens clean (no hex, no cross-component class; 14px recipe deliberately supersedes the mockup's 13px per design precedent); pinned tests: the main spec file absent from the diff entirely.
- **ADVISORY (recorded):** (1) **forward pointer to T-5:** bar `aria-label` sits on a roleless span — most screen readers ignore it; add `role="img"` when doing N-1's text-alternative clause; (2) **forward pointer to T-6:** all-zero-target row (`total===0`) renders "0 KPIs remaining" + active Report on an empty track — confirm live whether such rows reach the hero; (3) "1 KPIs remaining" pluralization — faithful to the spec string, awkward in field; recorded, dies here; (4) minor: structural param type narrower than call sites — consistent with sibling, recorded.
- **Verification:** program-overview 3/157 green (pinned incl.); folder 21/644 green; tsc + dev build + lint clean.
- Gate auto-approved (pre-approved mode) → continue to OAH-T-5.
