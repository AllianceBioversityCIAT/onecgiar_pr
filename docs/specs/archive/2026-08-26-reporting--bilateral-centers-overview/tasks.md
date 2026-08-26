# Module Spec — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `bilateral` / `results-framework-reporting` — Centers with reported W3/bilateral results overview
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Owner / driver:** Antigravity AI
- **Status:** done
- **Approval Mode:** auto-approved (pre-approved mode: user instructed "quiero que tu tomes la desicion de diseño")
- **Budget:** 2 tasks, ~60 LOC, 1 review round.

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions resolved (design decision delegated by user).
- [x] Endpoints verified (`GET /api/results/by-program-and-centers?programId=<code>` already returns `lead_center`).
- [x] No server migrations or schema changes needed.

---

## 3. Task list

### `BIL-T-CEN-1` [x] — Implement `overviewBilateralCenters` aggregation in `DashboardLabComponent`

- **Type:** `client`
- **Description:** Replace `overviewBilateralRoles` in `DashboardLabComponent` with `overviewBilateralCenters`, which aggregates `this.bilateralRows()` by `lead_center` into `OverviewCenterBar[]` and sorts descending by count. Bind `[bilateralCenters]="overviewBilateralCenters()"` to `<app-program-overview>` in `dashboard-lab.component.html`.
- **Implements:** `BIL-R-CEN-2`
- **Design Ref:** `design.md` §3.3
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`
- **Depends on:** `—`
- **Blocks:** `BIL-T-CEN-2`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] `overviewBilateralCenters` computed signal implemented and exported.
  - [ ] Bound to `<app-program-overview>` template.
  - [ ] `ng lint` clean.

---

### `BIL-T-CEN-2` [x] — Update `ProgramOverviewComponent` template, inputs & unit test assertions

- **Type:** `client | tests`
- **Description:** In `program-overview.component.ts`, replace `bilateralRoles` input with `bilateralCenters = input<OverviewCenterBar[]>([])` and add `bilateralCentersMax` and `centerWidth()`. In `program-overview.component.html`, replace Card 5 with the new "Centers with reported W3/bilateral results" horizontal bar distribution and empty state. In `program-overview.component.spec.ts`, update the 6-card heading assertion and add tests for Card 5 bar rendering, width scaling, and empty fallback.
- **Implements:** `BIL-R-CEN-1`, `BIL-R-CEN-3`, `BIL-R-CEN-4`, `BIL-R-CEN-DEL-1`
- **Design Ref:** `design.md` §3.1, §3.2, §4 (`BIL-DD-1`, `BIL-DD-2`, `BIL-DD-3`)
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.spec.ts`
- **Depends on:** `BIL-T-CEN-1`
- **Blocks:** `—`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] Card 5 renders title `"Centers with reported W3/bilateral results"`.
  - [ ] Horizontal bars render with `--pr-chart-2` fill and correct percentages.
  - [ ] Legacy 3-row counts and "COMING SOON" stub are removed.
  - [ ] `program-overview.component.spec.ts` passes 100%.
  - [ ] `ng lint` clean.
