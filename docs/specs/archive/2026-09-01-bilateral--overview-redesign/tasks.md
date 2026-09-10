# Bilateral Center Overview & Projects UI/UX Redesign — Tasks

## 1. Scope & Metadata

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/overview-redesign/` |
| **Linked Requirements** | [`docs/specs/bilateral/overview-redesign/requirements.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/overview-redesign/requirements.md) |
| **Linked Design** | [`docs/specs/bilateral/overview-redesign/design.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/overview-redesign/design.md) |
| **Linked Audit** | [`docs/specs/bilateral/overview-redesign/judgment.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/overview-redesign/judgment.md) |
| **Visual Reference** | [`docs/specs/bilateral/overview-redesign/mockup/overview-mockup.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/overview-redesign/mockup/overview-mockup.html) |
| **Status** | done |
| **Budget Tripwire** | 3 tasks · ~220 LOC · 1 review round |

---

## 2. Pre-Flight Checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved with Judgment Day dual review (`JUDGMENT: APPROVED ✅`).
- [x] Mockup reference validated.
- [x] No backend database migration or API schema changes required.

---

## 3. Task List

### `BIL-OVW-T-1` — Implement Reactive State Signals, KPI Derivations & Session Persistence in TS [x]

- **Type:** `client`
- **Description:** Refactor `BilateralProjectsPanelComponent` TypeScript logic to establish reactive signals for KPI metrics computation, multi-attribute filtering, session persistence for `viewMode`, and center-switching reset effects.
- **Implements:** `BIL-OVW-R-1`, `BIL-OVW-R-2`, `BIL-OVW-R-5`, `BIL-OVW-R-6`, `BIL-OVW-AC-1`, `BIL-OVW-AC-2`, `BIL-OVW-AC-5`
- **Design Ref:** `design.md` §3.2, §3.3, `BIL-DD-1`, `BIL-DD-2`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.ts`
- **Depends on:** `—`
- **Blocks:** `BIL-OVW-T-2`, `BIL-OVW-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Required Skills:** `angular-developer`
- **Definition of Done:**
  - [ ] `kpiSummary = computed(...)` calculates `total`, `byProgram: Map<string, number>`, and `multiProgramCount`.
  - [ ] `filteredProjects = computed(...)` filters projects by `selectedProgramFilter`, `selectedMultiProgramOnly`, and `searchQuery` (matching `shortName`, `fullName`, `spName`, `spShortName`, `programCode`).
  - [ ] `viewMode` initialized from and persisted to `sessionStorage` (`pr.bilateral.viewMode`).
  - [ ] Effect resets search and filters upon `centerId` change.
  - [ ] Helper methods `setProgramFilter()`, `setMultiProgramOnly()`, `setViewMode()`, `resetAllFilters()` exposed.

---

### `BIL-OVW-T-2` — Implement HTML Template, Responsive Card Grid, Dense Table & Brand Styling [x]

- **Type:** `client`
- **Description:** Implement the updated template in `bilateral-projects-panel.component.html` and styles in `bilateral-projects-panel.component.scss` adhering to PRMS 2026 design tokens, creating the top KPI cards strip, toolbar with view switcher, responsive cards grid with 2-line clamped titles, dense table view, and empty state.
- **Implements:** `BIL-OVW-R-3`, `BIL-OVW-R-4`, `BIL-OVW-R-7`, `BIL-OVW-R-8`, `BIL-OVW-AC-3`, `BIL-OVW-AC-4`, `BIL-OVW-AC-6`, `BIL-OVW-AC-7`
- **Design Ref:** `design.md` §4.1, §4.2, §4.3, §4.4, §4.5, §4.6, `BIL-DD-2`, `BIL-DD-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.scss`
- **Depends on:** `BIL-OVW-T-1`
- **Blocks:** `BIL-OVW-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Required Skills:** `angular-developer`, `ui-ux-pro-max`, `tailwind-design-system`
- **Definition of Done:**
  - [ ] Top KPI summary cards rendered with active state highlight and accessible ARIA attributes (`aria-pressed`, `tabindex="0"`).
  - [ ] Toolbar with debounced search input, filter chips, and grid/list switcher buttons.
  - [ ] Card Grid rendered using responsive Tailwind classes (`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5`) with monospace code badge, 2-line clamped title, description snippet, SP chips with allocations, and `+ Create result` CTA.
  - [ ] Dense Table View rendered with dark chrome header (`bg-[var(--pr-color-secondary-500)]`) and structured rows.
  - [ ] Empty state with working "Reset Filters" action button.
  - [ ] Zero hardcoded layout bugs; full compliance with `docs/ux-ui/design.md` §7.

---

### `BIL-OVW-T-3` — Unit Test Suite & Specification Verification [x]

- **Type:** `tests`
- **Description:** Author comprehensive Jest unit tests covering all acceptance criteria, reactive signal derivations, filtering mechanics, session persistence, and template rendering.
- **Implements:** `BIL-OVW-AC-1`, `BIL-OVW-AC-2`, `BIL-OVW-AC-3`, `BIL-OVW-AC-4`, `BIL-OVW-AC-5`, `BIL-OVW-AC-6`, `BIL-OVW-AC-7`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.spec.ts`
- **Depends on:** `BIL-OVW-T-1`, `BIL-OVW-T-2`
- **Blocks:** `—`
- **Estimate:** `S` (≤ 0.5d)
- **Required Skills:** `angular-developer`
- **Definition of Done:**
  - [ ] Tests for `kpiSummary` calculation (total, per-program counts, multi-program counts).
  - [ ] Tests for interactive filtering by program and multi-program toggle.
  - [ ] Tests for multi-attribute search matching on `shortName`, `fullName`, and `sciencePrograms`.
  - [ ] Tests for session storage persistence of `viewMode`.
  - [ ] Tests for `resetAllFilters()` behavior.
  - [ ] Tests asserting `selectAndCreate(project)` triggers `BilateralCreationService.selectProject`.
  - [ ] `npx jest` passes with 100% green tests on the bilateral module.
  - [ ] `npx ng lint --quiet` passes without errors.

---

## 4. Dependency Graph

```
BIL-OVW-T-1 (Signals, State & Persistence)
   └── BIL-OVW-T-2 (HTML Template, Card Grid, Table & Styling)
         └── BIL-OVW-T-3 (Jest Unit Tests & Verification)
```

---

## 5. Traceability Matrix

| Requirement | Scenario / Acceptance Criteria | Implementing Task | Verification Test |
|---|---|---|---|
| `BIL-OVW-R-1` | `BIL-OVW-AC-1` (KPI Aggregation) | `BIL-OVW-T-1`, `BIL-OVW-T-2` | `BIL-OVW-T-3` (kpiSummary unit test) |
| `BIL-OVW-R-2` | `BIL-OVW-AC-2` (KPI Filter Interaction) | `BIL-OVW-T-1`, `BIL-OVW-T-2` | `BIL-OVW-T-3` (filter interaction test) |
| `BIL-OVW-R-3` | `BIL-OVW-AC-3` (Full Title & Card Details) | `BIL-OVW-T-2` | `BIL-OVW-T-3` (card rendering test) |
| `BIL-OVW-R-4` | `BIL-OVW-AC-4` (Dense Table View) | `BIL-OVW-T-2` | `BIL-OVW-T-3` (table rendering test) |
| `BIL-OVW-R-5` | `BIL-OVW-AC-4` (View Mode Persistence) | `BIL-OVW-T-1`, `BIL-OVW-T-2` | `BIL-OVW-T-3` (sessionStorage test) |
| `BIL-OVW-R-6` | `BIL-OVW-AC-5` (Multi-Attribute Search) | `BIL-OVW-T-1`, `BIL-OVW-T-2` | `BIL-OVW-T-3` (search matching test) |
| `BIL-OVW-R-7` | `BIL-OVW-AC-6` (Empty State & Reset) | `BIL-OVW-T-1`, `BIL-OVW-T-2` | `BIL-OVW-T-3` (empty state test) |
| `BIL-OVW-R-8` | `BIL-OVW-AC-7` (Result Creation Navigation)| `BIL-OVW-T-1`, `BIL-OVW-T-2` | `BIL-OVW-T-3` (selectAndCreate test) |

---

## 6. Next Step

```text
/akili-execute bilateral/overview-redesign
```
