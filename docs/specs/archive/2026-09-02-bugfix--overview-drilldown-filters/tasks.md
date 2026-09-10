# Module Spec: `bugfix/overview-drilldown-filters` — Tasks

## 1. Scope of this task list

- **Module / feature:** `results` / `dashboard-lab` (Overview Tab)
- **Linked spec:** `docs/specs/bugfix/overview-drilldown-filters/requirements.md` + `design.md`
- **Owner / driver:** Antigravity
- **Status:** `done`
- **Budget:** 3 tasks, ~60–90 LOC, 1 review round

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] Confirmed root cause and reproduction documented.
- [x] No server migrations needed.
- [x] Scope strictly bounded to client Overview deep-link factories and router handler.

---

## 3. Task List

### `ODF-T-1` — Add Funding Source (`origin: 'W1/W2'`) to W1/W2 Link Factories

- **Type:** `client`
- **Description:** Update `buildOverviewStatusSegments` and `overviewW12Heatmap` in `dashboard-lab.component.ts` so that every emitted `OverviewLink` explicitly sets `origin: 'W1/W2'`. Non-clickable slots (e.g. column 3 "Other" in the heatmap or zero counts) continue to resolve to `null`.
- **Implements:** `ODF-R-1`, `ODF-R-2`, `ODF-AC-1`, `ODF-AC-2`
- **Design Reference:** `ODF-DD-1`
- **Skills:** `angular-developer`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
- **Depends on:** `—`
- **Blocks:** `ODF-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Definition of done:**
  - [x] `buildOverviewStatusSegments` produces `{ origin: 'W1/W2', status: ... }` on all segments with count > 0.
  - [x] `overviewW12Heatmap` cells for columns 0–2 produce `{ origin: 'W1/W2', category: ..., status: ... }`. Column 3 remains `null`.
  - [x] Angular templates and types compile without error.

---

### `ODF-T-2` — Propagate Effective Overview Phase in `onOverviewLink`

- **Type:** `client`
- **Description:** Augment `onOverviewLink` in `dashboard-lab.component.ts` to check if `link.phase` is present. If absent, resolve the effective Overview phase (`homeSE.overviewSelectedPhase()` or the active version/reporting phase) and map it into `queryParams.phase`.
- **Implements:** `ODF-R-3`, `ODF-R-4`, `ODF-AC-3`, `ODF-AC-4`
- **Design Reference:** `ODF-DD-2`, `ODF-DD-3`
- **Skills:** `angular-developer`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
- **Depends on:** `—`
- **Blocks:** `ODF-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Definition of done:**
  - [x] `onOverviewLink` maps `origin`, `status`, `category`, and `center` into `queryParams`.
  - [x] If `link.phase` is absent, `queryParams.phase` receives the effective Overview phase.
  - [x] If `link.phase` is present, it is preserved verbatim.

---

### `ODF-T-3` — Unit & Regression Test Suite for Overview Deep-Links

- **Type:** `tests`
- **Description:** Add unit tests to `dashboard-lab.component.spec.ts` exercising `buildOverviewStatusSegments`, `overviewW12Heatmap`, and `onOverviewLink`. Update any existing test assertions where `origin` was previously omitted, ensuring that W1/W2 and W3/Bilateral links navigate with exact query parameters.
- **Implements:** `ODF-R-1`, `ODF-R-2`, `ODF-R-3`, `ODF-R-4`, `ODF-AC-1`, `ODF-AC-2`, `ODF-AC-3`, `ODF-AC-4`
- **Design Reference:** `ODF-DD-1`, `ODF-DD-2`, `ODF-DD-3`
- **Skills:** `angular-developer`, `systematic-debugging`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`
- **Depends on:** `ODF-T-1`, `ODF-T-2`
- **Blocks:** `—`
- **Estimate:** `S` (≤ 0.5d)
- **Definition of done:**
  - [x] Regression test proves `overviewStatusSegments` emits `origin: 'W1/W2'`.
  - [x] Regression test proves `overviewW12Heatmap` emits `origin: 'W1/W2'`.
  - [x] Test proves `onOverviewLink` includes `phase` from the effective Overview state when absent from `link`.
  - [x] Full `dashboard-lab` and `programme-results` test suites pass green.

---

## 4. Dependency Graph

```text
ODF-T-1 (W1/W2 Origin in Link Factories)  ──┐
                                            ├──► ODF-T-3 (Unit & Regression Tests)
ODF-T-2 (Effective Phase in onOverviewLink) ┘
```

---

## 5. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `ODF-TEST-1` | unit | `ODF-R-1`, `ODF-AC-1` | `src/app/pages/.../dashboard-lab/dashboard-lab.component.spec.ts` |
| `ODF-TEST-2` | unit | `ODF-R-2`, `ODF-AC-2` | `src/app/pages/.../dashboard-lab/dashboard-lab.component.spec.ts` |
| `ODF-TEST-3` | unit | `ODF-R-3`, `ODF-AC-4` | `src/app/pages/.../dashboard-lab/dashboard-lab.component.spec.ts` |
| `ODF-TEST-4` | unit | `ODF-R-4`, `ODF-AC-3` | `src/app/pages/.../dashboard-lab/dashboard-lab.component.spec.ts` |
