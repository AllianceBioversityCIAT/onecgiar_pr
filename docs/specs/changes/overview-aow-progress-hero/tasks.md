# Tasks — `changes/overview-aow-progress-hero`

## 1. Document Control

- **Status:** `pending` · Depth Standard · Approval: pre-approved (owner mandate; ≤1 Reviewer round, targeted jest only, no full client suite)
- **Budget:** 5 tasks · ~700 non-test LOC · ≤1 review round/task (design §8)

## 2. Tasks

### `OAH-T-1` — Host: rich rows + loading + glue methods
- **Status:** `[ ]` · **Type:** client · **Estimate:** M · **Depends on:** — · **Blocks:** T-2, T-3
- **Scope:** `overviewAowProgressRich` computed (glossary splits via shared helpers; invariant complete+partial+notStarted=total; zeroTarget count; remaining-DESC/code-ASC sort), `overviewAowProgressLoading` (`!toc` aggregation), `openAowReporting(code)` and `continueReporting()` glue (tab switch + `openAowFocused` / grouped+Only-pending). Skills: `angular-developer`, `tdd`.
- **Covers:** R-1 coherence AND-clause (single home), R-3 sort + zero-target AND-clause + no-local-recompute BUT, R-4 destination scenario groundwork, R-6 loading AND-clause (`!toc`), R-1 CTA scenario (state side).
- **Tests (OAH-TEST-1):** fixtures incl. zero-target rows and an unresolved ToC; equality of rail totals with `buildRatio` on a shared fixture (R-1 AND); sort order exact; `continueReporting()` flips tab+view+Only-pending; `openAowReporting` never sets legacy `viewMode 'aow'` (R-4 BUT).
- **Verification:** `npx jest .../dashboard-lab --no-coverage --silent --reporters=summary` targeted. **Fails if:** the coherence fixture diverges from `buildRatio` by even one KPI, or sort ties break non-deterministically. A green run with the coherence test skipped is NOT evidence.
- **DoD:** computed + glue landed, tests green, no thin-row (`hub`) behavior change (hub spec still green).

### `OAH-T-2` — Section rebuild: rail + placement + footer chips + skeletons
- **Status:** `[ ]` · **Type:** client · **Estimate:** L · **Depends on:** T-1 · **Blocks:** T-4
- **Scope:** `program-overview` §8 → Option A anatomy (rail with ring/figures/splits/CTA; section moved above W1/W2 status; outcomes chips + legend footer; rail+row skeletons per `RowStates.dc.html`); widened input interface (DD-4). Skills: `angular-developer`.
- **Covers:** R-1 both scenarios (render side incl. skeleton BUT), R-2 scenario + reflow BUT, R-5 scenario + no-actions BUT, R-6 both clauses (render side).
- **Tests (OAH-TEST-2):** DOM — section order assertion (About → hero → W1/W2 status); rail renders `1% · 2 of 392` from fixture and skeletons when loading; chips carry `0/7`/`0/5` and NO buttons (R-5 BUT); no other section's markup touched (snapshot-free: assert untouched sections' anchors still present in order).
- **Verification:** targeted jest + `design-tokens.spec.ts` green. **Fails if:** any `var(--pr-*)` in the new markup is undefined (the sweep catches it), or the order assertion finds the hero below W1/W2 status. Presence-assertions here (classes) do NOT prove rendered look — that is T-5's live row, recorded as the gate per requirements §8.
- **DoD:** tests green; lint green; note in execution.md that visual fidelity is deferred to T-5.

### `OAH-T-3` — Rows: segmented bar + figures + actions
- **Status:** `[ ]` · **Type:** client · **Estimate:** M · **Depends on:** T-1 · **Blocks:** T-4
- **Scope:** row grid (identity, remaining subline, segmented bar with title disclosure, mono figures, Report/open actions wired to `openAowReporting`; complete-state variant with View results + emerald treatment). Skills: `angular-developer`.
- **Covers:** R-3 scenario (all clauses render-side incl. counts-not-percent AND + title disclosure), R-4 scenario + legacy BUT (binding side), R-6 row-skeleton clause.
- **Tests (OAH-TEST-3):** DOM — segment widths derive from counts (1/137 fixture ⇒ style width ≈0.73%, emerald first); `title` lists three counts + zero-target note when >0; complete fixture swaps Report→View results; action click calls `openAowReporting('AOW03')` (host stubbed) and never the legacy handler.
- **Verification:** targeted jest. **Fails if:** widths are computed from percentages-of-percent (fixture with zero-target rows would then disagree), or the legacy handler spy fires. A width assertion passing via string-match on the template (not computed style/binding) is a presence-assertion — not acceptable evidence for the counts clause.
- **DoD:** tests green; folder suites green.

### `OAH-T-4` — A11y + docs + integration polish
- **Status:** `[ ]` · **Type:** client · **Estimate:** S · **Depends on:** T-2, T-3
- **Scope:** aria-labels/focus rings on all controls, bar text alternative, `program-overview`/`dashboard-lab` CLAUDE.md updates (same-commit rule), kill dead code from the old §8 rows. Skills: `angular-developer`.
- **Covers:** N-1 (attribute side), N-2 (no new HTTP — assert via code review note), R-2 reflow BUT (final check).
- **Tests:** DOM assertions for aria attrs. **Verification:** targeted jest + lint. **Fails if:** any new interactive control lacks an accessible name (test enumerates buttons). Contrast is NOT provable here (jsdom) — explicitly deferred to T-5.
- **DoD:** attrs asserted; folder docs re-stamped in the same commit.

### `OAH-T-5` — Verification: live pass + record
- **Status:** `[ ]` · **Type:** tests · **Estimate:** S · **Depends on:** T-1..T-4
- **Scope:** On dev via the embedded browser: cold-load skeleton trace (no jumping sums — poll during load), rail vs Reporting-tab grouped totals equality on SP01, remaining-first order, segmented bar renders visibly at 1% data, Report/open land on the focused By-AOW view, CTA lands on grouped+Only-pending, complete-state row (simulate via signal if no complete AoW on dev), visual/contrast sanity (T6-class check), reduced-motion note. Record PASS/FAIL/NOT-RUN per row in `execution.md` — NOT-RUN is never a PASS.
- **Covers:** every jsdom-blind clause routed here by requirements §8 (rendered layout, skeleton visibility, contrast), R-1/R-3/R-4 scenarios end-to-end.
- **Verification:** the recorded checklist itself. **Fails if:** any polled load tick shows a partial sum that later changes, or the bar is invisible at SP01 data. **Disqualifier:** a single-tick observation proves nothing about jumping sums — the trace must span the load window; if the dev server rebuild races the trace, rerun; an unreproducible tick is reported as inconclusive, not PASS.
- **DoD:** checklist recorded; FAILs become fixes or accepted gaps.

## 3. Coverage closure (clause level)

| Clause | Owner |
|---|---|
| R-1 figures+ring+splits+CTA render / skeleton BUT | T-2 |
| R-1 coherence AND (single home) | T-1 (logic) + T-5 (live equality) |
| R-1 CTA destination scenario | T-1 (state) + T-5 (live) |
| R-2 order scenario / reflow BUT | T-2 (+T-4 final check) |
| R-3 sort, zero-target AND, no-recompute BUT | T-1 |
| R-3 counts-not-percent AND, title disclosure, remaining subline | T-3 |
| R-4 destination scenario / legacy BUT | T-1 (glue) + T-3 (binding) + T-5 (live) |
| R-4 complete-state swap | T-3 |
| R-5 chips scenario / no-actions BUT | T-2 |
| R-6 skeletons, `!toc` AND, no-jumping BUT | T-1 (flag) + T-2/T-3 (render) + T-5 (live trace) |
| N-1 | T-4 (attrs) + T-5 (contrast) |
| N-2 | T-1/T-4 |
| N-3 | trivially satisfied (hard-coded EN, consistent) |

## 4. Dependency graph

T-1 ──► T-2 ──► T-4 ──► T-5
  └───► T-3 ──┘

## 5. PR strategy

~700 LOC, one surface, sequential tasks → **single PR** against `qa-development-2026` (this branch), commits per task with `[SPEC:changes/overview-aow-progress-hero]`.

## 6. Accepted risks

Full-suite coverage stays CI's gate (owner rule). Contrast/rendered-layout classes gated only by T-5's live/T6 pass. Concurrency with the parallel session (KZ-MRF-3): every commit preceded by a `git diff HEAD` regression glance on shared files.
