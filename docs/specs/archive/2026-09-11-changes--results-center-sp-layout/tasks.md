# Tasks: Results Center SP-style layout

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/results-center-sp-layout` |
| **Requirements** | [`requirements.md`](./requirements.md) |
| **Design** | [`design.md`](./design.md) |
| **Depth** | Standard |
| **Status** | shipped |
| **Date** | 2026-09-11 |

---

## 1. Scope of this task list

- **Feature:** Results Center viewport shell, hero, filters, footer
- **Owner:** Implementer (client)
- **Status:** `not-started`

---

## 2. Pre-flight checklist

- [ ] `requirements.md` approved
- [ ] `design.md` approved
- [ ] `sp-shell-app-viewport` shipped (SAV mixin available)
- [ ] No conflicting in-flight edit to `results-list-filters` filter service logic

---

## 3. Task list

### RCS-T-1 — Viewport shell + `#workArea` split

- **Type:** client
- **Description:** Add `pr-viewport-page` to `results-list.component.scss` `:host`. Restructure template: hero + filters outside `#workArea`; count, alert, table, pagination inside `#workArea`. Add `viewChild('workArea')`. Wire `#workArea` passive scroll listener to close row menu (replace or supplement `window:scroll`). Verify `results-outlet` flush wrapper geometry.
- **Implements:** RCS-R-1 (all scenarios), RCS-R-5 (all scenarios), RCS-R-7 (row menu scenario), RCS-NFR-1, RCS-NFR-2
- **Design refs:** RCS-DD-1, RCS-DD-2, §6.1, §6.4
- **Files (expected):**
  - `results-list.component.html`
  - `results-list.component.scss`
  - `results-list.component.ts`
  - `results-outlet.component.scss` (only if needed)
- **Depends on:** —
- **Blocks:** RCS-T-2, RCS-T-3, RCS-T-5
- **Estimate:** M
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] `#workArea` wraps table region only; hero/filters are siblings above it
  - [ ] `:host` includes viewport mixin in SCSS file
  - [ ] Row menu closes on `#workArea` scroll at ≥900px
- **Verification:**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="results-list.viewport.spec|results-list.component.spec"
npm run build
```

- **Disqualifiers:** Template places filters inside `#workArea` → fails RCS-R-3 static requirement; only `window:scroll` listener remains → fails RCS-R-7.
- **Falsification input:** Remove `#workArea` wrapper — viewport spec MUST fail.
- **Gap:** jsdom cannot prove `documentElement.scrollHeight === clientHeight` — manual HITL required (RCS-T-5).

---

### RCS-T-2 — Platform hero band + Update result relocation

- **Type:** client
- **Description:** Restructure `.rc-page-header` into hero band with eyebrow `PLATFORM · RESULTS CENTER`. Move **Update result** button from filters meta row into hero actions (preserve disabled state / tooltip when `!activeButtons`). Align spacing/tokens with SP band hierarchy.
- **Implements:** RCS-R-2 (all scenarios), RCS-NFR-3 (hero actions a11y)
- **Design refs:** RCS-DD-4, RCS-DD-5, §6.2
- **Files (expected):**
  - `results-list.component.html`
  - `results-list.component.scss`
  - `results-list.component.ts` (pass `activeButtons` if needed)
- **Depends on:** RCS-T-1
- **Blocks:** RCS-T-5
- **Estimate:** S
- **Skills:** `angular-developer`, `frontend-design`
- **Definition of done:**
  - [ ] Eyebrow, title, subtitle, Columns, Export, Update result in hero
  - [ ] Update result absent from filters `.rc-meta-row`
  - [ ] Disabled Update result tooltip unchanged
- **Verification:**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="results-list.component.spec|results-list.viewport.spec"
```

- **Disqualifiers:** Update result still only in filters component → RCS-R-2 violated.
- **Falsification input:** Remove eyebrow element — template assertion MUST fail.

---

### RCS-T-3 — Filter toolbar popover-first refactor

- **Type:** client
- **Description:** Refactor `results-list-filters` to Search + Filter popover + chips layout. Consolidate all filter dimensions into one grouped popover (modelled on `programme-results`). Remove five inline primary multiselects. Preserve Apply/Cancel temp state, chip groups, Clear all, phase chip removal rule. Keep `results-list-filter.service.ts` unchanged.
- **Implements:** RCS-R-3 (all scenarios), RCS-R-4 (all scenarios), RCS-NFR-3
- **Design refs:** RCS-DD-3, §6.3
- **Files (expected):**
  - `results-list-filters.component.html`
  - `results-list-filters.component.scss`
  - `results-list-filters.component.ts`
  - `results-list-filters.component.spec.ts`
- **Depends on:** RCS-T-1
- **Blocks:** RCS-T-5
- **Estimate:** M
- **Skills:** `angular-developer`, `frontend-design`
- **Definition of done:**
  - [ ] Single Filter popover exposes all 11 filter dimensions listed in RCS-R-4
  - [ ] Search remains inline; chips + Clear all below toolbar
  - [ ] Filter toolbar component renders outside `#workArea` (parent template from T-1)
  - [ ] Filter service file diff empty or comment-only
- **Verification:**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="results-list-filters.component.spec"
```

- **Disqualifiers:** Any filter dimension only in dead code path; inline multiselect row remains primary UI.
- **Falsification input:** Remove Program filter from popover — spec test MUST fail.
- **Gap:** Popover visual grouping vs SP screenshot — manual HITL in RCS-T-5.

---

### RCS-T-4 — Footer removal on Results Center

- **Type:** client
- **Description:** Remove `/result/results-outlet/results-list` from `footer.component.ts` routes. Update `footer.component.spec.ts`: invert FOVL-AC-3 to assert footer **absent** on RC; add assertion footer still shows on a remaining allow-listed route.
- **Implements:** RCS-R-6 (all scenarios)
- **Design refs:** RCS-DD-6, §6.5
- **Files (expected):**
  - `footer.component.ts`
  - `footer.component.spec.ts`
- **Depends on:** —
- **Blocks:** RCS-T-5
- **Estimate:** S
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] RC path removed from footer allow-list
  - [ ] Footer spec updated and green
- **Verification:**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="footer.component.spec"
```

- **Disqualifiers:** Test still expects footer on RC (old FOVL-AC-3).
- **Falsification input:** Re-add RC to allow-list — inverted test MUST fail.

---

### RCS-T-5 — Viewport wiring tests + manual HITL

- **Type:** tests + docs
- **Description:** Add `results-list.viewport.spec.ts` (pattern: `dashboard-lab.viewport.spec.ts`) asserting SCSS mixin, `#workArea` authorship, hero/filters outside scroller. Expand filter/hero tests from T-2/T-3. Execute manual HITL checklist at ≥900px and <900px against user reference screenshots.
- **Implements:** RCS-R-1 HITL clause, RCS-R-2 visual clause, RCS-R-3 static clause, defect-class table §7
- **Design refs:** §9 Testing Plan
- **Files (expected):**
  - `results-list.viewport.spec.ts` (new)
  - Updates to existing specs from T-2/T-3
- **Depends on:** RCS-T-1, RCS-T-2, RCS-T-3, RCS-T-4
- **Blocks:** —
- **Estimate:** M
- **Skills:** `angular-developer`, `tdd`
- **Definition of done:**
  - [ ] Scoped test command green (all four spec patterns)
  - [ ] `npx ng lint --quiet` clean
  - [ ] `npm run build` clean
  - [ ] Manual HITL signed off: document no vertical scroll ≥900px; hero/filters fixed; footer absent; filters match SP clarity intent
- **Verification:**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="results-list.viewport.spec|results-list-filters.component.spec|results-list.component.spec|footer.component.spec"
npx ng lint --quiet
npm run build
```

- **Disqualifiers:** Only template string tests with no falsification inputs; HITL skipped for ≥900px scroll proof.
- **Falsification input:** Move hero inside `#workArea` in template — viewport spec MUST fail.

---

## 4. Dependency graph

```
RCS-T-1 ──┬── RCS-T-2 ──┐
          └── RCS-T-3 ──┼── RCS-T-5
RCS-T-4 ────────────────┘
```

`RCS-T-4` may run in parallel with `RCS-T-1` (no file overlap).

---

## 5. Scenario → task coverage

| Requirement / clause | Task |
|---|---|
| RCS-R-1 desktop locked frame | RCS-T-1, RCS-T-5 (HITL) |
| RCS-R-1 narrow fallback | RCS-T-5 (HITL) |
| RCS-R-2 hero fixed + content | RCS-T-2, RCS-T-5 |
| RCS-R-3 toolbar structure + static | RCS-T-3, RCS-T-1, RCS-T-5 |
| RCS-R-4 all dimensions + Apply/Cancel | RCS-T-3 |
| RCS-R-5 work area contents | RCS-T-1 |
| RCS-R-6 footer absent + glossary elsewhere | RCS-T-4 |
| RCS-R-7 row menu scroll | RCS-T-1 |
| RCS-NFR-1..2 | RCS-T-1 |
| RCS-NFR-3 | RCS-T-2, RCS-T-3 |

---

## 6. PR strategy

**Single PR recommended** (~280–380 LOC, one user-facing surface). Optional split if review bandwidth tight:

| PR | Tasks | Rationale |
|---|---|---|
| PR 1 | RCS-T-4 + RCS-T-1 | Shell + footer (behavioral scroll) |
| PR 2 | RCS-T-2 + RCS-T-3 + RCS-T-5 | Visual/filter UX + tests |

Chained PRs should note PR1 must land first (viewport structure).

**Suggested commit:** `✨ feat(results-list): SP-style viewport layout for Results Center`

---

## 7. Recommended first task

**RCS-T-1** (or **RCS-T-4** in parallel) — viewport shell is the structural foundation; footer is independent.
