# Tasks — SP Overview "Total General" card

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/sp-overview-total-general-card/` |
| Depth | Lite |
| Approval Mode | gated (requirements + design approved 2026-10-08) |
| Budget | 3 tasks · ~140 LOC · 1 review round (`design.md` §11) |

Test rule for every task (machine rule): Jest **always** `--maxWorkers=2` and scoped with `--testPathPattern`; one test run at a time; ESLint only on touched files.

## Clause ownership

| Clause | Owner |
|---|---|
| S-1.1 figures + tooltips | T-1 (host values), T-2 (render + tooltips) |
| S-1.2 zero row renders, BUT must NOT disappear | T-2 |
| S-2.1 headline = replicated + new; AND IT MUST equal KPI 2 unscoped; BUT must NOT add bilateral | T-2 (unit), T-3 (live) |
| S-3.1 W3 line gone; BUT KPI 3 must NOT change | T-2 |
| S-4.1 phase switch; BUT no stale figure | T-1 |
| S-4.2 scope does not narrow; AND program-wide explicit; BUT other cards keep scope | T-1 (unscoped source), T-2 (tooltip), T-3 (live) |
| S-5.1 skeleton; BUT no transient `0` | T-2 |
| S-5.2 click unchanged | T-2 |
| NFR-1 no new request | T-1 |
| NFR-2/3/4 mono, a11y, truncation | T-2 (classes), T-3 (visual, human) |

---

## [x] T-1 — Host computed `overviewTotalBreakdown`

| Field | Value |
|---|---|
| Status | [x] done (PASS 2026-10-08) |
| Size | S (~45 LOC) |
| Depends on | — |
| Requirements | STG-R-2, STG-R-4 (S-4.1, S-4.2), STG-NFR-1 |
| Design | §3, §8 Host, STG-DD-1, STG-DD-2 |
| Skills | `angular-developer`, `tdd` |

**Scope:** `dashboard-lab.component.ts`: export the type `OverviewTotalBreakdown` from `program-overview.component.ts` and import it in the host. Add the computed: replicated/new from `latestVersion(selected())` (missing → `0`), pendingReview = unscoped `bilateralRows()` with resolved status 5. Bind `[totalBreakdown]` in `dashboard-lab.component.html`. No new HTTP call.

**Tests (`dashboard-lab.component.spec.ts`):**
- The version carries 62/7 and the bilateral rows have statuses `['5','5','6','1']` → `{62, 7, 2}`.
- With `overviewScope` set to a key that matches none of the bilateral rows, pendingReview stays `2` (unscoped).
- The version lacks the fields → `{0, 0, n}`.
- Switching phase (a different `effectiveVersionId` key/overlay) yields the new phase's figures.

**Verify:** `npx jest --testPathPattern=dashboard-lab.component.spec --maxWorkers=2 --silent --reporters=summary --no-coverage`, then `npx eslint <touched files> --quiet`.

**Fail input:** reading `scopedBilateralRows()` instead of `bilateralRows()` makes the scope test fail. Reading `status_id` with `=== 5` instead of the resolver makes the `'5'` string rows fail.

**Disqualifier:** a test that sets the computed's output directly instead of its sources proves nothing. It must drive `selected`/overlay and the bilateral cache.

**Done:** the tests are green, lint is clean and no request was added (no new `api.` call in the diff).

---

## [x] T-2 — Card markup + child input

| Field | Value |
|---|---|
| Status | [x] done (PASS 2026-10-08, attempt 2) |
| Size | S (~70 LOC) |
| Depends on | T-1 (type) |
| Requirements | STG-R-1, R-2, R-3, R-4 (tooltip), R-5, NFR-2/3/4 |
| Design | §8 Child + Card markup, STG-DD-3/4/5, reversion challenge |
| Skills | `angular-developer`, `tailwind-design-system`, `spartan` (consult only, no Helm component needed) |

**Scope:** In `program-overview.component.ts`, add `totalBreakdown` input (default zeros) and re-point `programResultsTotal` to replicated + new. In `.html`, KPI 1: remove the `W1/W2 · W3/Bilateral` line, add the divider + 3 rows (labels, chips, tooltips, test ids per design §8), add a headline tooltip ("Program-wide…") and a third skeleton bar. Keep the header, pill, gradient, `(click)` and `min-h`.

**Tests (`program-overview.component.spec.ts`):**
- Update `:885`: `programResultsTotal()` = replicated + new from the input. Bilateral segments with counts must NOT change it.
- Render `{62, 7, 0}`: three rows in order with chips `62`, `7`, `0` (the zero row present), headline `69`.
- KPI 1 text contains no `W3/Bilateral` other than the "awaiting review" label. KPI 3 (`overview-kpi-bilateral`) still renders its figure.
- Skeleton test still green: no `.pr-figure` and no chip while loading.
- Clicking KPI 1 still sets the active section to `all`.

**Verify:** `npx jest --testPathPattern=program-overview --maxWorkers=2 --silent --reporters=summary --no-coverage`, then `npx eslint <touched .ts> --quiet`.

**Fail input:** leaving the old sub-line makes the "no W3" assertion fail. Hiding the row with `@if (count > 0)` makes the zero-row assertion fail. Summing `bilateralStatusTotal` makes the `:885` update fail.

**Cannot prove:** layout, truncation, chip alignment and colour coherence. jsdom does not lay out, and the class presence asserted here is presence, not effect. That gap is owned by T-3.

**Done:** green specs, lint clean, `program-overview.row-layout.cy.ts` untouched (AoW rows are not in scope).

---

## [x] T-3 — Folder doc + live verification (HITL)

| Field | Value |
|---|---|
| Status | [x] done (Reviewer PASS + user validation 2026-10-08) |
| Size | XS (~25 LOC doc) |
| Depends on | T-1, T-2 |
| Requirements | STG-R-2 (live reconcile), R-4 S-4.2, R-5, NFR-4 |
| Design | §8, §10 |
| Skills | `claude-in-chrome` (read-only) |

**Scope:**
- Update `program-overview/CLAUDE.md`: re-stamp `Verified:`, add a note that "Total General = replicated + new from the meter Version, program-wide, plus pendingReview from unscoped bilateral rows". Mirror one line in `dashboard-lab/CLAUDE.md`.
- Live check on `localhost:4200/result-framework-reporting/entity-details/SP01/overview`. **Read-only**: no write buttons, because the local stack hits the shared DB. Confirm the served bundle is fresh first.

**Manual checks:**
1. KPI 1 headline equals the KPI 2 figure with no scope set.
2. The "awaiting review" chip equals the "Pending Review" segment of the W3/Bilateral Reporting Status card.
3. Selecting a scope changes KPI 2 but not KPI 1.
4. Side by side with the center card: same divider/chip look. At a narrow card width (~360px), labels truncate and chips don't wrap.

**Fail input:** a headline that differs from KPI 2 when unscoped means the figures are wrong. Stop and report; do not adjust them.

**Disqualifier:** checking against a stale bundle. Verify with `window.ng.getComponent(...)` per client `CLAUDE.md` §9 first; otherwise the check is not evidence.

**Done:** the user confirms the visual at the HITL pause, and the doc is re-stamped in the same commit as the code. **No commit without explicit user go-ahead.**

---

## Order

T-1 → T-2 → T-3. Linear, single PR (~140 LOC).
