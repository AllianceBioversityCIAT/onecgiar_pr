# Tasks — `changes/overview-aow-progress-hero`

## 1. Document Control

- **Status:** `pending` · Depth Standard · Judged APPROVED (fix round 1) · Approval: pre-approved (≤1 Reviewer round, targeted jest only, never the full client suite)
- **Budget:** 6 tasks · ~650 non-test LOC · ≤1 review round/task (design §8)

## 2. Tasks

### `OAH-T-1` — Host: rich rows + CTA navigation
- **Status:** `[x]` · client · **M** · Depends: — · Blocks: T-2, T-3, T-4
- **Scope:** `overviewAowProgressRich` computed (helper-`stateOf` splits; invariant; zeroTarget count; remaining-DESC/code-ASC sort; output tier); `continueReporting()` = `setOnlyPending(true)` + `router.navigate(reporting route, {queryParams:{tocView:'aows'}})`. NO new outputs/glue beyond this (DD-6). Skills: `angular-developer`, `tdd`.
- **Covers:** R-1 coherence AND-clauses + invariant (logic), R-1 CTA scenario incl. storage AND + `reportingViewMode` BUT, R-3 sort + zero-target AND + no-recompute BUT (logic), R-6 `!toc` AND (flag reuse).
- **Tests (OAH-TEST-1):** fixture with a `target=0∧achieved>0` KPI proves the partition is total (the C-2 orphan lands in `inProgress`); zero-target excluded+counted; rail sum == rows sum; sort exact incl. tie; CTA: navigate spy receives the reporting route + `tocView:'aows'` AND `setOnlyPending` (the persisting setter, not `.set`) was called; `reportingViewMode` untouched.
- **Verification:** targeted jest. **Fails if:** the orphan fixture breaks the invariant, or the CTA test passes with a bare `onlyPending.set` (assert the storage write). **Disqualifier:** a coherence test where both sides call the same function on the same array proves nothing — the fixture must pre-compute expected numbers BY HAND in the test.
- **DoD:** green; hub/thin-row consumers untouched (their specs green).

### `OAH-T-2` — Section move + pinned-test edits (deliberate)
- **Status:** `[x]` · client · **S** · Depends: T-1 · Blocks: T-3
- **Scope:** Move §8 above the W1/W2 status cards, preserving the `activeSection()` gate (R-2 AND). Update, as DELIBERATE edits with the original comments preserved, exactly these pinned assertions: `program-overview.component.spec.ts:141-158` (8-heading `toEqual` order), `:681-684` (`headings.length===8` + adjacency), and any order-index assertions the move shifts (map 8→7). Skills: `angular-developer`.
- **Covers:** R-2 scenario + `activeSection` AND + reflow BUT (order half), C-4 ownership.
- **Verification:** targeted jest on the program-overview spec. **Fails if:** the order test still lists the hero below W1/W2 status, or the `aow`-filter view loses the section. **Guard for the Implementer:** a red order test is fixed by EDITING THE TEST to the new approved order — never by reverting the move (the C-4 trap, named here on purpose).
- **DoD:** all four pinned areas updated-or-proven-unaffected, enumerated in execution.md.

### `OAH-T-3` — Section rebuild: rail + chips + skeletons + empty
- **Status:** `[x]` · client · **L** · Depends: T-2 · Blocks: T-5
- **Scope:** Rail (ring/figures/splits/CTA), outcomes chips + legend (keeping the old rows' `openAow` click-through, R-5), rail+row skeletons, existing empty treatment kept, new `richRows` input (DD-4). Skills: `angular-developer`.
- **Covers:** R-1 render scenarios incl. skeleton BUT + title disclosure, R-5 both clauses, R-6 all clauses (render side incl. empty program), R-1 focus/no-reload AND (assert the CTA is a router navigation, not location.href).
- **Tests (OAH-TEST-3):** rail figures from a HAND-computed fixture; skeletons when loading; chips carry figures, no Report label, and emit `openAow` with bucket codes; empty-program fixture renders the existing empty block; thin-input consumers (card 4 fixture numbers) unchanged.
- **Verification:** targeted jest + `design-tokens.spec.ts`. **Fails if:** any undefined `var(--pr-*)` or any `.pr-row-action`/cross-component class reference appears (grep assertion in the test), or card 4's number moved. **Presence caveat:** anchor-order assertions prove order only — restyle/reflow is T-6's live row (recorded).
- **DoD:** green; lint green; visual fidelity explicitly deferred to T-6.

### `OAH-T-4` — Rows: segmented bar + figures + actions
- **Status:** `[x]` · client · **M** · Depends: T-1 · Blocks: T-5
- **Scope:** Row grid (mockup tracks — NOT the table's, A-13), identity + remaining subline, segmented bar (TS-computed widths; tokens only), mono figures, Report + open icon + View-results swap, all emitting the EXISTING `openAow`; `canReportW1W2` gate preserved verbatim. Skills: `angular-developer`.
- **Covers:** R-3 render clauses (counts-not-percent AND, disclosure title, subline), R-4 all clauses (single-output BUT, permission AND, complete-swap), N-1 rows-stay-clickable.
- **Tests (OAH-TEST-4):** width binding computed from counts (fixture with zero-target rows disagrees under percent-of-percent — that IS the failing input); title lists three counts + zero-target; complete fixture swaps the button; `openAow` spy receives the code from row, button and icon; disabled state matches the pinned `canReportW1W2` test (kept green, not rewritten).
- **Verification:** targeted jest. **Fails if:** widths come from template arithmetic/percents, a second output appears, or the permission test breaks.
- **DoD:** green; folder suites green.

### `OAH-T-5` — A11y + docstring + docs
- **Status:** `[ ]` · client · **S** · Depends: T-3, T-4
- **Scope:** Accessible names/focus rings on all new controls; bar text alternative; `reporting-burndown.ts` scope docstring amended (Overview hero now a sanctioned caller — B-14); folder `CLAUDE.md`s re-stamped same-commit; dead code from old §8 rows removed. Skills: `angular-developer`.
- **Covers:** N-1 attribute side, N-2 (no new HTTP — reviewer note), R-3 docstring BUT-half.
- **Verification:** targeted jest (enumerate new buttons → each has an accessible name) + lint. **Fails if:** any new control lacks a name. Contrast NOT provable here — T-6's row.
- **DoD:** attrs asserted; docs stamped.

### `OAH-T-6` — Verification: live pass + record
- **Status:** `[ ]` · tests · **S** · Depends: T-1..T-5
- **Scope:** On dev (embedded browser): cold-load skeleton trace spanning the load window (no partial sums); rail == sum of rows on SP01; remaining-first order; bar visible at 1% data (tolerance: computed widths, NOT the mockup's rounded ints — A-18); row/button/chip navigation lands on `?tocView=byAow&tocAow=` (buckets → `?tocView=aows`); CTA lands on Reporting with Only-pending restored ON; R-2 visual reflow check of neighbouring cards (the presence-assertion gap, B-10); contrast sanity (T6-class); complete-state: FIRST check dev for a fully-reported AoW — if none exists, record NOT-RUN (unit OAH-TEST-4 owns the behavior; no signal simulation — B-11). Record every row PASS/FAIL/NOT-RUN in `execution.md`.
- **Covers:** every jsdom-blind clause routed here (requirements §8), R-1/R-3/R-4 end-to-end, R-1 focus/no-reload live half.
- **Verification:** the recorded checklist. **Fails if:** any polled tick shows a sum that later changes, or the bar is invisible at SP01 data. **Disqualifier:** a single-tick observation is not a trace; a rebuild race invalidates the run — rerun; unreproducible = inconclusive, never PASS.
- **DoD:** checklist recorded; FAILs → fixes or accepted gaps.

## 3. Coverage closure (clause level)

| Clause | Owner |
|---|---|
| R-1 rail render + skeleton BUT + disclosure | T-3 (+T-6 live) |
| R-1 internal-coherence ANDs + invariant | T-1 (+T-6 live sum) |
| R-1 CTA: storage AND, `tocView=aows`, `reportingViewMode` BUT | T-1 (+T-6 live) |
| R-1 focus/no-reload AND | T-3 (router assertion) + T-6 (live) |
| R-2 order + `activeSection` AND + pinned-test ownership | T-2 |
| R-2 reflow/restyle BUT | T-3 (data untouched) + T-6 (visual half) |
| R-3 sort, zero-target AND, no-recompute BUT | T-1 |
| R-3 counts-not-percent AND, title, subline | T-4 |
| R-3 docstring amendment | T-5 |
| R-4 all clauses (single output, permission gate, swap) | T-4 (+T-6 live destination) |
| R-5 chips + click-through + no-Report | T-3 |
| R-6 skeletons/`!toc`/no-jumping/empty | T-1 (flag) + T-3 (render+empty) + T-6 (trace) |
| N-1 (rows clickable, names, bar alt / contrast) | T-4 + T-5 / T-6 |
| N-2 · N-3 | T-1/T-5 · trivially satisfied |

## 4. Dependency graph

T-1 ──► T-2 ──► T-3 ──► T-5 ──► T-6
  └────────────► T-4 ──┘

## 5. PR strategy

~650 LOC, one surface → single PR on `qa-development-2026`, commits per task `[SPEC:changes/overview-aow-progress-hero]`.

## 6. Accepted risks

Full suite stays CI's gate. Contrast/rendered layout gated only by T-6. Complete-state live row may land NOT-RUN (unit owns it). Concurrency (KZ-MRF-3): `git diff HEAD` glance before every commit on shared files.
