# Execution Log — `changes/aow-identity-column-starvation`

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `changes/aow-identity-column-starvation` |
| **Branch** | `qa-development-2026` (worktree) |
| **Approval Mode** | `pre-approved (user, 2026-09-03)` — routine gates auto-pass and are logged; HALT / Pivot / budget trip / `FATAL_FAIL` / environment blocks stop |
| **Leader** | Fable 5.1 (T1; registry `opus` entry stale, passed silently) |
| **Implementer / Reviewer** | `.claude/agents/akili-implementer.md` (`sonnet`, T2) / `.claude/agents/akili-reviewer.md` (`opus`, T3) — author ≠ auditor by wrapper |
| **Budget (design.md §14)** | 5 tasks · ≈240 LOC · ≤ 1 Reviewer round per task (2nd FAIL escalates) · verification = targeted Jest dir + one CT spec, never the full suite |
| **Started** | 2026-09-03 |
| **Skill deviations** | `tailwind-design-system` assigned to `AIS-T-2` although the registry's Skill Map says Tailwind is "not mapped" — that map entry predates the Tailwind-first redesign (`onecgiar-pr-client/CLAUDE.md` §5, Tailwind 4.3 in `package.json`); flagged for the registry sync at archive |
| **Pre-flight** | All boxes ticked in `tasks.md` §2 — CT smoke run 2026-09-03 (see there) |

## 2. Task Execution History

### `AIS-T-1` — Build the red gate: container-sweep CT spec + track measurement

**Status:** **PASS** on attempt 2 (2026-09-03) · attempts: 2 · Reviewer rounds: 2 (initial FAIL + scoped re-review) · **Files:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.row-layout.cy.ts` (new, 292 LOC) · `program-overview.component.html` (2 lines: `data-testid="aow-rows"` on the real wrapper, `data-testid="aow-rows-skeleton"` on the skeleton wrapper — no other template touch).

**Mount:** `cy.mount(ProgramOverviewComponent, { imports: [HttpClientTestingModule, NoopAnimationsModule], providers: [provideRouter([])], componentProperties: {...} })` — the real component mounted directly (no fallback host needed; `PrVizChartComponent`/Spartan popover imports compiled fine, `design.md` §13 deviation not triggered). Fixture: 3 rows, all with non-null `achievement`, one name 83 chars (≥60), one row `999/999` (100%).

**Verification command (run twice):**
```
cd onecgiar-pr-client && CT_DEV_SERVER_PORT=8090 ELECTRON_EXTRA_LAUNCH_ARGS=--js-flags=--max-old-space-size=2048 \
  npx cypress run --component --spec "src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.row-layout.cy.ts"
```

**Result — both runs identical:** `Tests: 3, Passing: 2, Failing: 1`. Exit code 1 (red, as required by `AIS-AC-4`). Known non-blocking noise present exactly as `tasks.md` §2 pre-flight predicted: webpack `primeicons/fonts/*` resolve errors (fonts only, no layout effect) and the `TS2322` on `ct-utils.ts:54` — irrelevant here since the spec mounts `ProgramOverviewComponent` directly with `cy.mount`, bypassing `mountComponent`'s typing entirely.

- **`it` 1 — AIS-AC-1/2/6 (richLoading=false): FAILED**, as required.
  `Error: 491 failing measurements across 84/84 steps (first Q=336, last Q=1000).`
  By assertion (both runs, byte-identical — **no run-to-run spread**):
  | Assertion | Failing count | First failing Q | Last failing Q |
  |---|---|---|---|
  | name `clientWidth` ≥ 80px | 167 | 336 (`0px`) | 800 (row1, `79px`) |
  | chip right edge ≤ identity cell right edge (chip spills) | 132 | 336 (`422.1 > 371.0`) | 704 (row1, `422.1 > 415.1`) |
  | row `scrollWidth === clientWidth` (no overflow) | 192 | 336 (`521 vs 332`) | 1000 (row2, `1012 vs 996`) |
  | exactly one of {achievement cell, ⓘ} displayed | 0 | — | — |

  All 84 steps fail on at least one assertion — the 5-track branch (`grid-cols-[minmax(0,1fr)_minmax(120px,240px)_max-content_max-content_max-content]`) never sheds at the fixed CT viewport (1500×900; the row's viewport media queries — `min-[900px]`, `max-[900px]`, `max-[1101px]` — never fire), so `minmax(0,1fr)` collapses to 0 at the narrow end and the row overflows once the rigid siblings' combined floor exceeds `Q` (~Q<720ish). Exclusivity never fails: the achievement cell's `max-[1101px]:hidden` and the ⓘ's `max-[1101px]:inline-flex` are both viewport-gated and never flip at viewport 1500 — cell always shown, ⓘ never shown; this is expected and does not disqualify the run (`AIS-AC-6` is satisfied trivially pre-fix, its real gate is post-`AIS-T-2` once the branches become container-keyed).
  **Input-that-makes-it-fail confirmed:** matches `tasks.md`'s stated cause (`minmax(0,1fr)` at Q≈597–640 gives near-zero identity) — observed directly.

- **`it` 2 — AIS-AC-3 (richLoading=true): PASSED** both runs (84/84 steps, skeleton track count = real row track count). Expected: neither wrapper has `@container` yet, and both sites share the same static, viewport-gated class list, so track *count* (not px) trivially matches pre-fix. This assertion becomes meaningful once `AIS-T-2` migrates both sites to `@container` in lockstep.

- **`it` 3 — log only: PASSED** both runs, never a failure surface.

**Measured `max-content` maxima at Q=1000 (AIS-DD-3 threshold inputs, extracted via a one-time diagnostic throw, reverted before commit — `cy.log` output does not surface in `cypress run` headless terminal output):**

| Quantity | Measured |
|---|---|
| figures cell (`999/999` · `100%`) | **75.87px** |
| actions cell (`Report` + arrow, not-complete branch) | **110.02px** |
| achievement cell, unstacked (`A_wide`) | **138.76px** |
| achievement cell, restacked (`A_narrow`) | **not measurable pre-fix** — the restack rule (`max-[1280px]:flex-col`) is a *viewport* variant; the CT viewport is pinned at 1500×900 for the whole sweep (deliberately, so the *container*-shaped defect is isolated from viewport-shaped shedding) and never crosses that breakpoint. `AIS-T-2` will re-measure once the rule is container-keyed. |

Recomputing `design.md` `AIS-DD-3`'s formula with these: `T_full = 140+120+75.87+138.76+110.02+64+36 ≈ 684.65 → 690` (design estimated 640 — within the task's own ±30px "stop and report" tolerance? **690 − 640 = 50px, over the 30px tolerance** — flagged for `AIS-T-2` to re-check the fixture/formula before finalizing thresholds, per the disqualifier in `tasks.md` `AIS-T-2`). `T_restack = T_full − 138.76 + A_wide` reduces to `T_full` itself since `A_wide` is the same figure used for both terms in this fixture (no restacked measurement to subtract against) — `AIS-T-2` needs a genuine restacked measurement to compute `T_restack` distinctly; recorded as an open input, not a blocker for this task (`AIS-R-20`/`AIS-DD-3` explicitly defer exact tuning to `AIS-T-2`).

**Lint:** `npx ng lint --quiet` → `All files pass linting.` (exit 0; whole-project command, only this task's new file is in scope of its findings — none).

**Not Done / Assumptions:**
- Direct `cy.mount(ProgramOverviewComponent, …)` used instead of `ct-utils.ts`'s `mountComponent` helper, per the Leader's brief and `tasks.md` §2's own guidance (avoids the known `TS2322` fight; `ct-utils.ts` left untouched, out of scope).
- `A_narrow` (restacked achievement cell) is recorded as **not measurable pre-fix** rather than forced via `cy.invoke('addClass', …)` — chosen over the class-forcing alternative the brief also allowed, to keep the log-only test simple and avoid asserting on a DOM state the template doesn't naturally reach at this viewport. `AIS-T-2` must obtain this figure once the restack rule is container-keyed (or by temporarily forcing classes then, with the fix in place to sanity-check against).
- The `T_full` recomputation above lands 50px outside `design.md`'s own ±30px re-check tolerance (measured against the *unfixed* row's natural content, not a final post-fix layout) — reported for `AIS-T-2` to resolve, not silently corrected here (scope discipline: this task measures and reports, it does not fix).


**Attempt 1 — Reviewer verdict (opus, lens checklist): `STATUS: FAIL`** — audit points 1–4 confirmed (real-layout measurements, 84 steps asserted, `Q = width − 40` correct under preflight `border-box`, positional selectors verified against `:681/:764/:774/:795/:821`, DOM order survives the future 2×2 placement, failures collected not first-fail, no disqualifier tripped, scope clean).

ISSUES (verbatim):
1. **Discovered Issue:** `A_narrow` — the achievement cell's **restacked** `max-content` — was not measured. `T_full` was therefore recomputed with `A_wide` (138.76) in the slot `AIS-DD-3` reserves for the restacked value, landing ~690 vs the design's ≈640 and tripping `AIS-T-2`'s "> 30px ⇒ stop and report" disqualifier. Substituting the estimate (107) gives ≈660 — inside tolerance. The 50px trip is an artefact of the missing measurement, not a real design error.
   * **Violated Rule:** `tasks.md` `### AIS-T-1` Description — "log the widest measured `max-content` of the figures, actions and achievement cells — the achievement cell **both unstacked (`A_wide`, at Q = 1000) and restacked (`A_narrow`)** — these are the inputs to `AIS-T-2`'s thresholds"; `design.md` `AIS-DD-3` ("never by eye… they are estimates until measured"). This is `AIS-T-1`'s deliverable, not `AIS-T-2`'s — `AIS-T-2` only consumes it.
   * **Remediation Suggestion:** It *is* reachable: the restack is viewport-keyed, so at `cy.viewport(1200, 900)` the cell is restacked (`max-[1280px]` matches) and still rendered (`max-[1101px]` does not). Add ~5 lines to the log-only `it` — set viewport 1200, `Q=1000`, read `rows[i].children[3]` width — log `A_narrow`, then recompute `T_full` in `execution.md`. If the delta then stays > 30px, escalate per the disqualifier.

ADVISORY (recorded, never gates):
- RELIABILITY: overflow failures are reported up to `Q=1000`, but `AIS-DD-3`'s arithmetic (120+76+139+110+64+36 ≈ 545) predicts no overflow above ≈545. Either a sub-pixel `scrollWidth`/`clientWidth` rounding artefact or an unaccounted rigid contributor. Strict equality is exactly what `AIS-AC-2` mandates, so it is not a violation — but `AIS-T-2` cannot go green until the cause is identified; loosening the tolerance would be a spec amendment, not an edit.
- READABILITY: `measureRow`'s positional indices are correct today but brittle; a per-cell `data-testid` (or template line refs in the comment) would survive a future cell insertion.
- PROCESS: `tasks.md` `AIS-T-2` disqualifier said "step count = 86 ×2" while `AIS-T-1`/`AIS-DD-5` say 84 — **Leader corrected `tasks.md` to 84 on 2026-09-03** (spec typo, not a code change).

**Leader adjudication:** the Leader's brief had offered "record not measurable pre-fix honestly" as an option; the task text does not — the Reviewer is right and the option was a briefing error, not an Implementer error. Rework attempt 2 at effort `xhigh`: measure `A_narrow` at viewport 1200; and, as a **log-only** extension of the same `it`, identify which row child exceeds the row's content box at `Q = 1000` (the RELIABILITY advisory — a real 16px overflow at `Q = 1000` on the `999/999` row is either a pre-existing latent overflow clipped by the card's `overflow-hidden` or a measurement artefact, and `AIS-T-2` needs to know which). Both stay inside `AIS-T-1`'s measurement scope.

### Attempt 2 (rework — Reviewer remediation)

**Files/LOC delta:** `program-overview.row-layout.cy.ts` only, 292 → 346 LOC (+54). No other file touched (`.component.html`'s 2 lines and this `execution.md` unchanged in shape). `reporting-program-band/*` not opened, not touched — confirmed by inspection, not modified in this session.

**Change:** the third (`log only`) `it` now (1) also remounts at `cy.viewport(1200, 900)` — chosen because `max-[1101px]:hidden` needs viewport < 1101 (must stay ≥ 1101 to keep the achievement cell visible) while `max-[1280px]:flex-col` needs viewport < 1280 (to force the restack) — 1101 ≤ 1200 < 1280 satisfies both, and reads the achievement cell's width there as `A_narrow`, guarded by an assertion that the cell's first child actually computed `flex-direction: column` (else the run throws — "not measurable" would no longer be silently wrong); (2) adds an overflow-locator block at Q=1000/viewport 1500 that reads every direct child's `getBoundingClientRect()` and compares to the row's own content-box right edge, plus `gridTemplateColumns`, `columnGap`, `paddingRight`, `borderRightWidth`.

**Verification (run twice, `Tests:` line and failing-Q table unchanged from attempt 1 — the two new `it 3` measurement blocks add no assertions to `it 1`/`it 2`):**
```
cd onecgiar-pr-client && CT_DEV_SERVER_PORT=8090 ELECTRON_EXTRA_LAUNCH_ARGS=--js-flags=--max-old-space-size=2048 \
  npx cypress run --component --spec "src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.row-layout.cy.ts"
```
`Tests: 3, Passing: 2, Failing: 1.` Exit 1. `it 1`: `491 failing measurements across 84/84 steps (first Q=336, last Q=1000)` — **byte-identical to attempt 1 and to itself run-to-run** (`diff` of the failing-Q line lists across both new runs: empty). `it 2`: passed both runs. `it 3`: passed both runs (the new restack guard never threw — `flex-direction: column` was confirmed at viewport 1200 both times).

**A_narrow (measured, not estimated):** the achievement cell's own `getBoundingClientRect().width` at viewport 1200×900, `Q=1000`, max over the 3 fixture rows = **73.53px**. Confirmed genuinely restacked (guard assertion passed, both runs) — not silently `A_wide` again.

**Run-to-run spread — disclosed, not glossed over:** the *pass/fail outcome and failing-Q table* of `it 1`/`it 2` are exactly stable (see above). The *sub-pixel* `max-content` measurements (figures/actions/achievement widths, taken via a temporary diagnostic `throw` — `cy.log` does not surface in headless `cypress run` output, reverted before every commit) show two effects worth naming honestly:
- **Sub-pixel jitter (~0.2px, immaterial):** `gridTemplateColumns`'s identity/figures values differ by ~0.19px between consecutive diagnostic runs (e.g. `365.211px` vs `365.023px`) — ordinary font-hinting/subpixel rounding, three orders of magnitude below the 30px tolerance that matters.
- **A larger, real difference between attempt 1's cold-start numbers and attempt 2's warm-run numbers:** attempt 1 (very first CT invocation of the session, webpack compiling fresh) measured `actionsMax=110.02px`, `achievementWideMax=138.76px`; three consecutive attempt-2 runs (webpack/Chrome already warm) measured `actionsMax=112.83px` (3/3 identical) and `achievementWideMax=143.77px` (3/3 identical) — `figuresMax` settled at `75.61px` (2/3) vs `75.87px` (1/3). This reads as a font-load-timing artefact of the very first paint on a cold dev-server compile, not harness flakiness — the **warm, 3-for-3-stable** figures below are used as the authoritative inputs; attempt 1's cold-start figures are superseded, not silently discarded (both are shown).

**Recomputed `T_full` / `T_restack` (`design.md` `AIS-DD-3`: `threshold = Σ(branch track minimums) + gaps(64) + chrome(36)`, rounded up to the next 10px):**

| Term | Value |
|---|---|
| identity floor (design-fixed) | 140 |
| bar min (design-fixed) | 120 |
| figures max-content (measured, warm) | 75.87 |
| achievement `A_narrow` (measured) | 73.53 |
| achievement `A_wide` (measured, warm) | 143.77 |
| actions max-content, **container-measured** (`getBoundingClientRect`, warm) | 112.83 |
| actions max-content, **content-measured** (`scrollWidth` — see overflow-locator below) | 148 |
| gaps (4 × 16) | 64 |
| row chrome (`px-[16px]`×2 + `border-2`×2) | 36 |

- `T_full = 140+120+75.87+73.53+112.83+64+36 = 622.23 → 630`. **Δ vs design's ≈640 estimate = −10px — inside the ±30px tolerance.** (Attempt 1's false 50px trip was entirely the missing-`A_narrow` artefact the Reviewer identified — confirmed.)
- `T_restack = 140+120+75.87+143.77+112.83+64+36 = 692.47 → 700` (same formula, `A_wide` in the achievement slot). Cross-check via `design.md`'s algebraic form `T_restack = T_full − A_narrow + A_wide = 630 − 73.53 + 143.77 ≈ 700.24 → 700` — consistent.
- **Sensitivity flag (see overflow-locator finding below):** if `actionsMax` is instead taken as its **content-measured** value (148, `scrollWidth`) rather than the container-measured 112.83, `T_full = 140+120+75.87+73.53+148+64+36 = 657.4 → 660` (Δ vs 640 = **+20px, still inside tolerance**) and `T_restack → 730`. Either way the delta stays inside ±30px — this sensitivity does not change the "no re-check needed" verdict, but `AIS-T-2` should pick one methodology deliberately (see finding below), not silently.

**Overflow-locator finding (Q=1000, viewport 1500, row `AOW01` — the row matching the exact `scrollWidth=1015/clientWidth=996`-shaped pair; `AOW02`/999-999 does **not** overflow at `Q=1000`, correcting the brief's row label — it renders the `isRowComplete` single-button "View results" branch, narrower actions, no overflow there):**

- Every direct child's own `getBoundingClientRect().right` sits **at or inside** the row's content-box right edge (`overshoot` = child.right − contentBoxRight): `identity=−598.79px, bar=−342.79px, figures=−272.78px, achievement=−128.83px, actions=0.00px`. **No child's own box extends past the row.** `gridTemplateColumns` sums exactly to the content box (`365.211+240+54.008+127.953+112.828 = 900`, `+4×16 gaps = 964 = clientWidth(996) − padding(32)`) — the *grid itself* has zero slack and zero overshoot.
- Yet `row.scrollWidth (1015) − row.clientWidth (996) = 19px`. Per-child `scrollWidth` vs `clientWidth` isolates it: `identity[365/365] bar[240/240] figures[54/54] achievement[128/128] actions[148/113]` — **only the `actions` cell shows internal overflow**, and it is large (35px), not sub-pixel.
- **Root cause, confirmed structurally, not guessed:** the `actions` cell (`Report` button + arrow button, both `shrink-0`, `gap-[6px]`, `justify-end`, **no `overflow-hidden` on this cell**) is a flex row whose two children refuse to shrink. The CSS Grid `max-content` keyword sized the *track* to `112.83px`, but the flex row's own rendered content genuinely needs `148px` — a **real rigid contributor CSS Grid under-sized**, not a rounding artefact (35px ≫ the ~0.2px jitter measured elsewhere in this same run). Because the cell has no `overflow-hidden`, the shortfall is **not clipped** — with `justify-content: flex-end` packing from the row's right edge (where the arrow button sits flush, `overshoot=0.00px` confirmed above), the `Report` button's un-shrinkable content is pushed left of where the track's own box starts, i.e. it visually encroaches on the achievement column's space rather than clipping invisibly.
- **Implication for `AIS-T-2`:** `actionsMax` measured via `getBoundingClientRect()` (the method this task used everywhere else) **understates** the actions cell's true max-content demand by ~35px at `Q=1000` — the grid did not give it what `max-content` promises even with abundant surrounding space. `AIS-T-2` should measure `actionsMax` via `scrollWidth` (or verify why CSS Grid under-sized a `max-content` track here) before finalizing the actions contribution to `T_full`/`T_restack` — flagged, not fixed (measurement task, not a fix task; no assertion or tolerance changed here per the Reviewer's ask).

**Lint:** `npx ng lint --quiet` → `All files pass linting.` (exit 0).

**Not Done / Assumptions (attempt 2, additive to attempt 1's):**
- The overflow-locator's root-cause explanation (CSS Grid under-sizing a `max-content` flex-row track relative to its own un-shrinkable content) is inferred from consistent, repeated, structural measurements (per-child `scrollWidth`/`clientWidth`, `gridTemplateColumns` summing exactly to the content box with zero slack) — not confirmed against a browser-engine spec citation. Reported as the most defensible reading of the numbers, not as a verified browser-bug citation.
- Did not decide `AIS-T-2`'s `actionsMax` methodology (container-measured 112.83 vs content-measured 148) — both are reported with the sensitivity computed; either keeps `T_full`'s delta inside the ±30px tolerance, so this is a methodology choice for `AIS-T-2`, not a blocker for `AIS-T-1`.
- Did not touch `reporting-program-band/*` or any file outside the two named plus this log — confirmed via `git diff --stat` before finishing.

**Attempt 2 — Reviewer verdict (scoped re-review, opus): `STATUS: PASS`.** "`A_narrow` is now measured with a guard, `T_full` recomputed from the formula and back inside tolerance; the added lines introduce no viewport leak and no failable content assertion; the red gate is unchanged and still red for the right reason." Audit: (a) ISSUE 1 remediated — `A_narrow` measured at viewport 1200×900 with a `flex-direction: column` guard; arithmetic `140+120+75.87+73.53+112.83+64+36 = 622.23 → 630`, Δ −10 vs 640. (b) No fix-caused defect. (c) Overflow locator: the 148-vs-113 actions figure is plausible, but the causal claim for the row's residual 16px is unproven — every child sits inside the content box and the residual equals `columnGap`.

ADVISORY (recorded, never gates):
- RELIABILITY: the overflow diagnosis is not yet closed — `scrollWidth − clientWidth = 16 = columnGap` with every child inside the content box. `AIS-T-2` must find the true source before claiming green; switching `actionsMax` to `scrollWidth` (T_full → 660) sizes the track but may not remove the 16px.
- PROCESS: `it` 3's title still says "never fails" while it now carries two harness-integrity throws — retitle to "log only, fails only on harness assumptions".

**Leader notes carried forward to `AIS-T-2` (forward pointers):**
1. **Harness font gap (Leader finding, 2026-09-03):** `src/index.html:9` loads `Material Icons Round` from Google Fonts; `cypress/support/component-index.html` does not, so in CT the `arrow_forward` ligature in the 32px arrow button (`:850–:858`) renders as text and spills. This is the prime suspect for the actions cell's `scrollWidth 148 vs clientWidth 113` and possibly the residual 16px. `AIS-T-2` first adds the two icon-font `<link>`s to `component-index.html` (harness correction, its own commit), re-runs the T-1 spec, and re-reads the maxima and the residual before touching the ladder. If the residual survives with the font loaded, find the true source (trailing gap / rounding) — never loosen `AIS-AC-2`.
2. Thresholds are computed from the **warm** maxima; re-measure `actionsMax` with the font loaded and use `scrollWidth` if it still exceeds the rect.
3. Retitle `it` 3 per the PROCESS advisory (one-line edit, inside T-2's template/spec touch).

**Requirements covered:** `AIS-R-6` (all three clauses), `AIS-AC-1/2/3/4/6` (gate exists and is red for the starvation), measurement inputs for `AIS-DD-3`. **Decisions:** direct `cy.mount` over `mountComponent`; `A_narrow` via viewport 1200. **Issues:** Leader brief wrongly allowed "not measurable" (cost one rework round); cold-vs-warm font-timing drift on the first CT invocation (warm numbers authoritative). **Final verification:** the T-1 spec exits 1 with `491 failing measurements across 84/84 steps` (two runs identical); `npx ng lint --quiet` clean. **Gate:** auto-approved (pre-approved mode) — continue to `AIS-T-2`.
