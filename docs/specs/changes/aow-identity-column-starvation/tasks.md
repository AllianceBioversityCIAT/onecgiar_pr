# Tasks — AoW identity column starvation (`changes/aow-identity-column-starvation`)

**One line:** five small tasks — build the red gate first, then fix the row so it goes green, pin skeleton parity, measure the sibling table, document and verify on the real page.

## 1. Scope of this task list

- **Module / feature:** `program-overview` AoW row (skeleton + real) — client only.
- **Linked spec:** `requirements.md` + `design.md` (same folder).
- **Owner / driver:** Leader (T1) → Implementer (T2) → Reviewer (T3, different model).
- **Status:** `not-started`
- **Execution limits (inherited from Approval Mode `pre-approved`):** routine gates auto-pass and are logged; **≤ 1 Reviewer round per task** (a second FAIL escalates); verification is the targeted Jest dir + the single CT spec — **never** the full client suite; briefs are pointer briefs (file:line + task id), not anthologies. Escalations (budget trip, `FATAL_FAIL`, environment block on `AIS-T-5`) always stop for the user.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (auto-approved, pre-approved mode, 2026-09-03).
- [x] `design.md` approved (auto-approved, pre-approved mode, 2026-09-03).
- [x] Open questions resolved (`AIS-OQ-1..3` resolved; `AIS-OQ-4` is `AIS-T-4`'s deliverable, not a blocker).
- [x] No CLARISA dependency. No migration (`migration:check` not applicable — client only).
- [x] No conflicting in-flight spec touching the row: `changes/progress-by-aow-w3` is proposal-only (`ls` on 2026-09-03: `mockup/`, `proposal.md` — no `tasks.md`).
- [x] Cypress CT runs on this machine — smoke run 2026-09-03 (`CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/custom-fields/pr-checkbox/pr-checkbox.cy.ts`): webpack compiled, 3 tests ran (2 pass, 1 pre-existing behavioural fail in `pr-checkbox`, unrelated). **Known noise, not blockers:** webpack prints `Can't resolve '../node_modules/primeicons/fonts/*'` errors from `src/styles.scss` (fonts, no effect on layout) and a `TS2322` on `cypress/support/ct-utils.ts:54` (`mountComponent`'s `componentProperties` typing vs signal inputs) — runtime is fine; `AIS-T-1` may call `cy.mount(ProgramOverviewComponent, {...})` directly with typed `componentProperties` to avoid the type error rather than fixing `ct-utils.ts` (out of scope).

## 3. Task list

### `AIS-T-1` — Build the red gate: container-sweep CT spec + track measurement

- [x] **Status:** done — PASS on attempt 2, 2026-09-03 (evidence: `execution.md` §2 `AIS-T-1`)
- **Type:** `tests`
- **Description:** Add `program-overview.row-layout.cy.ts` next to the component. Mount `ProgramOverviewComponent` via `mountComponent` (`cypress/support/ct-utils.ts`) with a `richRows` fixture of ≥ 3 rows: one with a deliberately long name (≥ 60 chars), `reported/total` at `999/999`, `100%`, and an `achievement` figure; `richLoading = false`. Add `data-testid="aow-rows"` to the real list wrapper (`:620`) and `data-testid="aow-rows-skeleton"` to the skeleton wrapper (`:537`) — test hooks only, the one template touch this task makes. Set `cy.viewport(1500, 900)` so the `flex-1` column beside the 300px rail is wider than any step. Drive the wrapper's inline `width` so that its **container-query width** `Q` (= inline width − 40px of `p-[20px]`) sweeps from **336px to 1000px in 8px steps** (84 steps); report in `Q`. At each step read, for every row: `getComputedStyle(row).gridTemplateColumns`, the identity cell's and the code chip's `getBoundingClientRect()`, the **name span's** `clientWidth`, `scrollWidth` and computed `text-overflow`, `row.scrollWidth`/`clientWidth`, and which of {achievement cell, ⓘ button} is displayed. Assert the property (`AIS-AC-1/2/6`): name ≥ 80px, chip inside the cell, `ellipsis` whenever `scrollWidth > clientWidth`, no overflow, exactly one of {cell, ⓘ}. Repeat the sweep once with `richLoading = true` and assert skeleton track count = row track count per step (`AIS-AC-3`). Also log the widest measured `max-content` of the figures, actions and achievement cells — the achievement cell **both unstacked (`A_wide`, at Q = 1000) and restacked (`A_narrow`)** — these are the inputs to `AIS-T-2`'s thresholds (`design.md` `AIS-DD-3`). **Commit the spec red**: run it against the unfixed template and paste the failing steps table into `execution.md` (`AIS-AC-4`).
- **Implements:** `AIS-R-6` (all three scenario clauses), `AIS-AC-1`, `AIS-AC-2`, `AIS-AC-3`, `AIS-AC-4`, `AIS-AC-6`; measurement input for `AIS-DD-3`.
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.row-layout.cy.ts` (new, ≈120 LOC); `program-overview.component.html` (two `data-testid` attributes only); `execution.md`.
- **Depends on:** — · **Blocks:** `AIS-T-2`, `AIS-T-4`
- **Estimate:** M
- **Skills:** `tdd` (red first), `angular-developer` (signal inputs, `mountComponent`), `caveman` for the report.
- **Verification:** `cd onecgiar-pr-client && CT_DEV_SERVER_PORT=8090 npm run test:ct -- --spec "src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.row-layout.cy.ts"` → **must FAIL** on the current template, and the failure output must list the `Q` values where the name < 80px (expected: a wide band of the 5-track branch — today's viewport ladder never sheds at a CT viewport of 1500, so the row keeps five tracks down to Q = 336 and starves everywhere below ≈640).
- **Input that makes it fail (when it should):** the current template — `minmax(0,1fr)` at Q ≈ 597 (today's 1280 row) gives ≈3.7px of identity. **Input that makes it fail when it should not:** none allowed — if the spec fails for a reason other than the identity/overflow assertions (mount error, missing provider, selector miss), that is a harness defect, not evidence.
- **Disqualifiers:** a step counts only if `rows > 0` and no `animate-pulse` element is present in the non-loading sweep; if two consecutive runs disagree on any step's `gridTemplateColumns`, the harness is flaky and the numbers are not evidence — report the disagreement. A fixture whose long name **fits** at Q = 1000 without truncation disqualifies the ellipsis assertion (make it longer). A sweep whose first step is below the absolute floor (≈330) produces a false red on the overflow assertion — the floor, not 320, is the start. Reading widths from a hidden (`display:none`) row is a harness bug.
- **Presence-assertion note:** none — every assertion here is a rendered measurement.
- **Definition of done:**
  - [ ] Spec file exists, mounts the real component (fallback host recorded as a deviation if `PrVizChartComponent`/Spartan imports break CT — `design.md` §13).
  - [ ] Sweep is 336→1000 step 8 in **container-query width `Q`** on the wrapper (never the host), both loading states, 84 steps each — step count asserted.
  - [ ] Red run recorded in `execution.md` with the failing-width table and the three measured `max-content` maxima.
  - [ ] `npx ng lint --quiet` clean for the new file.

### `AIS-T-2` — Fix the row: identity floor + container-keyed ladder on both sites

- [x] **Status:** done — PASS on attempt 1, 2026-09-03 (evidence: `execution.md` §2 `AIS-T-2`)
- **Type:** `client`
- **Description:** In `program-overview.component.html`: (1) add `@container` to **both** list wrappers — skeleton `:537` and real `:620` (identical classes; the skeleton branch needs its own containment context or `AIS-AC-3` is unreachable); (2) on **both** the skeleton row (≈`:564`) and the real row (≈`:676`) replace `minmax(0,1fr)` with a floor of chip + 10 + 80 in the 5-track branches and +24 in the 4-track and 2×2 branches (estimated 140/164; **143/167 with the measured 51.1px chip** — `AIS-T-1` output governs) (the ⓘ fallback shares the identity cell there — `AIS-DD-2`); (3) replace every viewport variant on the row root and its cells with the container equivalent — inventory per site: `min-[900px]:max-[1101px]:grid-cols-…` ×1, `max-[900px]:grid-cols-…` ×1, `max-[900px]:gap-y-[8px]` ×1, `max-[900px]:[grid-column/row:…]` ×8 (skeleton) / ×10 (row), `max-[1101px]:hidden` / `:inline-flex` ×2 (row) / ×1 (skeleton), `max-[1280px]:flex-col|items-end|gap-[2px]|hidden` ×4 inside the achievement cell — mapping `1101→@max-[T_full]`, `900→@max-[T_stack]`, `1280→@max-[T_restack]` (the restack step stays a **distinct** threshold above `T_full`, preserving `OSF-DD-8`'s restack → shed → stack order). (4) Compute `T_restack`, `T_full` and `T_stack` from `AIS-T-1`'s measured maxima with `design.md` `AIS-DD-3`'s formula (**+36px row chrome**, per-column minimum for the 2×2 branch), round up to 10px, and write the arithmetic in the ladder comment (`KZ-OAH-1` standardization). (5) Rewrite **both** existing ladder comment blocks — the skeleton's (≈`:548–:563`) and the row's (≈`:635–:665`) — to describe the container ladder and the exclusive `@max-[N]` boundary; delete the sentence forbidding a raised minimum; **the comment prose must also lose the old `max-[…]` syntax** (it currently quotes `` `max-[1101px]:hidden` `` at ≈`:649`), or the verification grep below false-positives. Leave the `[prTooltip]` binding on the name span untouched (the tooltip clause of `AIS-R-1`).
- **Implements:** `AIS-R-1` (floor clause, chip-never-clipped clause), `AIS-R-2` (all four clauses), `AIS-R-3` (both clauses incl. "BUT no viewport variant on the row"), `AIS-R-4` (shed order, `Report` label, no scroll), `AIS-R-5` (structure half), `AIS-AC-1`, `AIS-AC-2`, `AIS-AC-3`, `AIS-AC-6`; `AIS-DD-1`, `AIS-DD-2`, `AIS-DD-3`.
- **Files (expected):** `program-overview.component.html` (≈50 changed lines, two sites + comment).
- **Depends on:** `AIS-T-1` · **Blocks:** `AIS-T-3`, `AIS-T-5`
- **Estimate:** M
- **Skills:** `tailwind-design-system` (v4 container variants), `angular-developer`, `tdd` (green), `caveman`.
- **Verification:** the `AIS-T-1` CT spec → **must PASS** with zero failing steps in both loading states (84 + 84); `grep -cE '(^|[^@])(min|max)-\[[0-9]+px\]:' <row block>` must be **0** for lines ≈535–870 (no viewport variant survives on the wrappers, rows or cells, in classes **or comment prose** — `AIS-R-3` BUT clause); `grep -c 'prTooltip\]="row.name"'` = 2 (tooltip binding untouched on both sites… the skeleton has none, so = 1 if only the real row carries it — record the baseline before editing); `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview --silent` green (ARIA/gesture specs untouched).
- **Input that makes it fail:** leave one `max-[900px]:[grid-column:1]` un-migrated → at a 1100px CT viewport that cell keeps its 5-track placement while the container branch stacks → the sweep's track-count or overflow assertion goes red. Put `minmax(0,1fr)` back on one site → skeleton/row track counts still match but the name < 80px → red. Add `@container` to only one wrapper → the loading sweep never sheds → `AIS-AC-3` red.
- **Disqualifiers:** a green run in which the CT dev-server served a cached bundle (check the run's compile line reflects the edited template); a green run at a sweep that silently skipped steps (assert the step count = 84 ×2). If `T_full` computed from measurement lands more than 30px away from the design's estimate (≈640) or `T_stack` more than 30px from ≈540, stop and report — the design's estimates were wrong enough to re-check the fixture and the formula, not to just bump numbers.
- **Presence-assertion note:** the `grep -c … = 0` check proves *absence of viewport variants*, not correct behaviour — the CT sweep is the behavioural proof; both are required.
- **Definition of done:**
  - [ ] Both sites token-identical (`AIS-T-3` will pin it; eyeball now).
  - [ ] Thresholds carry their arithmetic in the comment; comment block rewritten.
  - [ ] CT sweep green both states; Jest dir green; lint clean.
  - [x] Commit `[SPEC:changes/aow-identity-column-starvation] 🔧 fix(program-overview): 143/167px identity floor + container-keyed AoW row ladder` (plus a separate harness commit for the vendored icon font).

### `AIS-T-3` — Pin skeleton ↔ row parity in Jest

- [x] **Status:** done — PASS on attempt 1, 2026-09-03 (evidence: `execution.md` §2 `AIS-T-3`)
- **Type:** `tests`
- **Description:** In `program-overview.component.spec.ts` add one test that renders once with `richLoading = true` and once with rows, reads the `class` attribute of the skeleton row root and the real row root, extracts the responsive token set (regex over `grid-cols-\[…\]`, `@min-\[…\]:…`, `@max-\[…\]:…`, `\[grid-column:…\]`, `\[grid-row:…\]`, `gap-y-…`) from each root **and its direct cells**, and asserts set equality with a diff message naming any token present on one side only.
- **Implements:** `AIS-R-5` (string half), `AIS-AC-3` (jsdom half); `AIS-DD-4`.
- **Files (expected):** `program-overview.component.spec.ts` (+≈30 LOC).
- **Depends on:** `AIS-T-2` · **Blocks:** `AIS-T-5`
- **Estimate:** S
- **Skills:** `angular-developer`, `caveman`.
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview --silent` green; test count delta = **+1**, explained in the report (`KZ-OAH-3`).
- **Input that makes it fail:** change the skeleton's `@max-[T_stack]` token to `T_stack − 10` only on that site → red with that token named. Prove it once locally (mutate, run, revert) and paste the failing message.
- **Disqualifiers:** a token set that is empty on both sides (regex missed everything) is a vacuous pass — assert the set size ≥ 6 per side.
- **Presence-assertion note:** this is a **presence/equality** assertion; it cannot prove either ladder works. Its job is speed (ms) and drift detection; behaviour is `AIS-T-1`'s sweep in loading state.
- **Definition of done:** test added, mutation proof pasted, delta explained, lint clean.

### `AIS-T-4` — Measure `reporting-aow-table` under the same sweep (report only)

- [x] **Status:** done — PASS on attempt 1, 2026-09-03; verdict: does not starve (evidence: `execution.md` §2 `AIS-T-4`)
- **Type:** `tests` (report-only)
- **Description:** Copy the sweep pattern from `AIS-T-1` into `reporting-aow-table.row-layout.cy.ts`, mount `ReportingAowTableComponent` with a fixture of ≥ 3 rows (long names), sweep its row container 336→1000 step 8 (same floor-rounded start as `AIS-T-1`; corrected from 320 on 2026-09-03), and **log** (never assert) the name-column width, `scrollWidth`/`clientWidth` and `gridTemplateColumns` per step. Write the verdict to `execution.md`: *starves below Npx / does not starve*, with the table. No template change.
- **Implements:** `AIS-R-10`, `AIS-AC-7`; resolves `AIS-OQ-4`; `AIS-DD-6`.
- **Files (expected):** `…/components/reporting-aow-table/reporting-aow-table.row-layout.cy.ts` (new, ≈60 LOC); `execution.md`.
- **Depends on:** `AIS-T-1` (pattern) · **Blocks:** — (parallel-safe with `AIS-T-2`/`T-3`)
- **Estimate:** S
- **Skills:** `angular-developer`, `caveman`.
- **Verification:** the spec runs to completion (exit 0 — it asserts nothing) and `execution.md` holds the per-step table plus a one-line verdict. If it starves, the report ends with the exact `/akili-propose` slug to file.
- **Input that makes it fail:** none by design (report-only). **Therefore this task's evidence is the table, and a task report without the table is not done.**
- **Disqualifiers:** a mount that renders zero rows (fixture shape wrong) produces an empty table — not a verdict.
- **Presence-assertion note:** n/a.
- **Definition of done:** spec committed, table + verdict in `execution.md`, lint clean.

### `AIS-T-5` — Document the pattern and verify on the real page

- [x] **Status:** done — docs PASS (attempt 3) + real-page pass measured via the Orca embedded browser, 5 widths × scope off/on, 0 violations (evidence: `execution.md` §2 `AIS-T-5`, `ais-t5-real-page.jsonl`, `ais-t5-1280.png`)
- **Type:** `docs` + `tests` (manual)
- **Description:** (1) Rewrite `program-overview/CLAUDE.md`'s "AoW row responsive ladder" paragraph per `AIS-DD-7`, re-stamping its stale line refs (`:510`/`:588` → the post-fix lines of the skeleton and real rows) (floor, `@container`, derived thresholds with the formula, exclusive `@max-[N]`, skeleton lockstep, pointer to the CT spec as the gate). (2) On the running app (`localhost:4200`, `/result-framework-reporting/entity-details/SP04/overview`) at 1600 / 1280 / 1100 / 900 / 768 × scope off/on, with `skeletons === 0 && rows > 0` double-read: record every AoW row's `gridTemplateColumns`, the identity width, `document.documentElement.scrollWidth === clientWidth`, and a screenshot at 1280 — `AIS-AC-5`. If no authenticated browser is reachable (Claude-in-Chrome down, no `cypress.env.js`), **report `BLOCKED (environment)`** with the ready-to-run measurement script and hand it to the owner; do not mark the task done and do not let the archive proceed on `AIS-T-1..4` alone.
- **Implements:** `AIS-R-11`, `AIS-AC-5`; `AIS-DD-7`.
- **Files (expected):** `program-overview/CLAUDE.md` (≈30 changed lines); `execution.md`.
- **Depends on:** `AIS-T-2`, `AIS-T-3` · **Blocks:** archive
- **Estimate:** S
- **Skills:** `cognitive-doc-design` (the CLAUDE.md paragraph), `claude-in-chrome` or `playwright-cli` for the pass (T6 visual review of the 1280 screenshot).
- **Verification:** the five-width table in `execution.md` with identity ≥ 143/167px (per branch) and name ≥ 80px on every row and `OSF-AC-9` clean; screenshot attached. Docs: the old sentence "never raises the identity minimum" no longer appears (`grep -c "never raises the identity minimum" CLAUDE.md` = 0) **and** the new paragraph names the CT spec file.
- **Input that makes it fail:** a real-page row at 1280 whose name span < 80px (a shell width the CT harness did not model — e.g. the section's `p-[20px]` was not the container the ladder reads). That is the one defect only this task can see.
- **Disqualifiers:** a reading taken while a skeleton is present; a single read (must be double-read); a screenshot at any width other than 1280 standing in for 1280.
- **Presence-assertion note:** the docs `grep` is a presence check on prose; the behavioural proof of this task is the five-width table.
- **Definition of done:** paragraph rewritten; five-width table + screenshot in `execution.md`, or an explicit `BLOCKED (environment)` with the script.

## 4. Dependency graph

```
AIS-T-1 (red gate + measurement)
   ├── AIS-T-2 (fix: floor + container ladder)  ── green
   │      └── AIS-T-3 (Jest parity)
   │             └── AIS-T-5 (docs + real-page pass)  ── blocks archive
   └── AIS-T-4 (reporting-aow-table report)  ── parallel with T-2/T-3
```

## 5. Coverage — scenario / clause → owning task

| Requirement · clause | Task |
|---|---|
| `AIS-R-1` name ≥ 80px (identity ≥ 143/167 per branch, measured chip) · chip never clipped · name truncates with ellipsis · tooltip kept | `AIS-T-2` (name ≥ 80, chip, ellipsis: asserted by `AIS-T-1`'s sweep; tooltip binding: `AIS-T-2` grep on `[prTooltip]`) |
| `AIS-R-2` row `scrollWidth===clientWidth` · no list scroller · page `OSF-AC-9` | `AIS-T-2` (row + list: `AIS-T-1` sweep; page: `AIS-T-5`) |
| `AIS-R-3` same width ⇒ same structure · BUT no viewport variant on row/cells | `AIS-T-2` (`grep = 0` + sweep) |
| `AIS-R-4` achievement shed first · `Report` never icon-only · never scrolls | `AIS-T-2` (`AIS-T-1` asserts ⓘ/cell exclusivity and overflow; `Report` label asserted by existing Jest spec + `AIS-T-5` screenshot) |
| `AIS-R-5` skeleton = row structure at every step | `AIS-T-2` (build), `AIS-T-3` (string), `AIS-T-1` (behaviour, loading sweep) |
| `AIS-R-6` real-browser sweep · red before/green after · BUT not class/scrollWidth/jsdom | `AIS-T-1` (red), `AIS-T-2` (green) |
| `AIS-R-10` sibling verdict | `AIS-T-4` |
| `AIS-R-11` docs rewritten | `AIS-T-5` |
| `AIS-R-20` floor tuning MAY | `AIS-T-2` (only if `AIS-T-1`'s maxima leave ≥ 20px slack at `T_full`; otherwise stays 140 — record the decision) |
| `AIS-AC-1..4, 6` | `AIS-T-1` / `AIS-T-2` |
| `AIS-AC-5` | `AIS-T-5` |
| `AIS-AC-7` | `AIS-T-4` |

No clause is discharged by citing a different requirement.

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `AIS-TEST-1` | Cypress component (real layout) | `AIS-AC-1, 2, 3, 4, 6` | `…/program-overview/program-overview.row-layout.cy.ts` |
| `AIS-TEST-2` | Jest | `AIS-AC-3` (string half), `AIS-R-5` | `…/program-overview/program-overview.component.spec.ts` |
| `AIS-TEST-3` | Cypress component (report-only) | `AIS-AC-7` | `…/reporting-aow-table/reporting-aow-table.row-layout.cy.ts` |
| `AIS-TEST-4` | Manual / T6 | `AIS-AC-5` | `execution.md` table + screenshot |

Client coverage thresholds (50/60/60/60) are unaffected: `.cy.ts` files are outside Jest's collection; the Jest delta is +1 test.

## 7. Rollout & verification

- [ ] Single PR against `staging` (≈240 LOC, one component) — **one PR**, no split. Description: what to review first = the ladder comment with the arithmetic; out of scope = the rail fold and `reporting-aow-table`.
- [ ] CI green: lint, Jest, build. CT is not in CI — the PR description pastes the sweep's green summary.
- [ ] `AIS-T-5` five-width table attached.

## 8. Roll-back plan

1. Revert the single PR. No migration, flag or payload involved.
2. The row returns to the viewport ladder with `minmax(0,1fr)` — i.e. the known defect, not a new one.

## Required cross-references

`requirements.md` · `design.md` · `docs/prd.md` · `docs/ux-ui/design.md` §9 · `docs/trd/trd.md` §10 · `onecgiar-pr-client/CLAUDE.md` §5 · `program-overview/CLAUDE.md`.
