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
