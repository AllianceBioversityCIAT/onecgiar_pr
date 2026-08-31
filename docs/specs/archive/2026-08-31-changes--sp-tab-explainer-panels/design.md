# Design: Science Program Tab Explainer Panels

## 1. Document Control

- **Spec Path:** `docs/specs/changes/sp-tab-explainer-panels`
- **Design Path:** `docs/specs/changes/sp-tab-explainer-panels/design.md`
- **Status:** `in-review`
- **Type:** `Change`
- **Approval Mode:** `gated`
- **Budget:** Expected Tasks: 3 · Expected LOC: ~140 · Expected Review Rounds: 1

---

## 2. Executive Summary

This design introduces a reusable, lightweight standalone Angular 21 component (`PrTabIntroComponent` / `<app-pr-tab-intro>`) that renders an introductory, plain-language orientation banner at the top of each tab in the Science Program hub (**Overview**, **Results**, and **Reporting**). 

The component is open by default on tab entry, supports smooth interactive collapse/expansion, manages its state purely in memory without persistence, and adheres strictly to PRMS UX/UI design tokens and WCAG 2.1 AA accessibility guidelines.

---

## 3. Architecture & Directory Structure

```text
onecgiar-pr-client/src/app/
├── shared/components/
│   └── pr-tab-intro/
│       ├── pr-tab-intro.component.ts        # Standalone component with signal disclosure
│       ├── pr-tab-intro.component.html      # Accessible template with header, body & toggle
│       ├── pr-tab-intro.component.scss      # Transition animations & tokenized styles
│       └── pr-tab-intro.component.spec.ts   # Comprehensive unit test suite
└── pages/result-framework-reporting/
    ├── pages/dashboard-lab/
    │   ├── components/program-overview/
    │   │   └── program-overview.component.html   # Embeds Overview explainer
    │   └── components/reporting-program-band/
    │       └── reporting-program-band.component.html # Embeds Reporting explainer
    └── pages/programme-results/
        └── programme-results.component.html     # Embeds Results explainer
```

---

## 4. Component Architecture (`PrTabIntroComponent`)

### Inputs & Local State

- **`title`** (`input<string>`): Defaults to `'What does this tab show?'`.
- **`description`** (`input<string>`): Tab-specific plain-language explanation text.
- **`icon`** (`input<string>`): Icon name (defaults to `'info'`).
- **`defaultOpen`** (`input<boolean>`): Initial open state (defaults to `true`).
- **`isOpen`** (`signal<boolean>`): Local volatile signal initialized to `defaultOpen()`.

### Methods
- **`toggle(): void`**: Toggles `isOpen` signal (`!this.isOpen()`).

---

## 5. UI/UX Design & Token Mapping

| Element | Design Token / Tailwind utility | Rationale |
| :--- | :--- | :--- |
| **Card Container** | `rounded-[12px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)] p-[16px] shadow-xs` | Consistent with PRMS card patterns (`docs/ux-ui/design.md §7`). |
| **Header Bar** | `flex items-center justify-between cursor-pointer select-none` | Allows clicking the entire header row to toggle. |
| **Icon Badge** | `flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[var(--pr-color-primary-50)] text-[var(--pr-color-primary-600)]` | Subtle visual anchor without visual noise. |
| **Heading** | `text-[14px] font-bold text-[var(--pr-text-heading)]` | Clear, scannable title. |
| **Toggle Button** | `material-icons-round text-[18px] text-[var(--pr-text-secondary)] transition-transform duration-200` | Chevron flips smoothly 180° when collapsed/expanded. |
| **Body Content** | `text-[13.5px] leading-[1.55] text-[var(--pr-text-secondary)] pt-[10px] border-t border-[var(--pr-border-divider)] mt-[10px]` | High readability (≥ 4.5:1 contrast) with clear separation. |

---

## 6. Integration Points & Copy Allocation

### 1. Overview Tab
- **Location:** At the top of `program-overview.component.html` (inside the Overview container above the KPI metrics cards).
- **Copy:**
  - *Title:* `"What does this tab show?"`
  - *Description:* `"A summary of your Science Program: how many results you have planned and reported, which CGIAR Centers are contributing, the Areas of Work involved, and other summary figures. Use it to see the overall picture of your Science Program at a glance."`

### 2. Results Tab
- **Location:** At the top of `programme-results.component.html` (above the results search bar and filter controls).
- **Copy:**
  - *Title:* `"What does this tab show?"`
  - *Description:* `"All the results reported under your Science Program. This includes the results created directly by your Science Program, and also results reported by bilateral projects where your Science Program has been tagged as Primary Science Program or as Contributing Science Program."`

### 3. Reporting Tab
- **Location:** At the top of `reporting-program-band.component.html` (inside the content container right above the Top Page Statistics Summary Card and toolbar filters).
- **Copy:**
  - *Title:* `"What does this tab show?"`
  - *Description:* `"The Theory of Change reporting framework for your Science Program. Browse planned Indicators and High-Level Outputs by Area of Work, track progress against targets, and submit new or continuing result reports for the current cycle."`

---

## 7. Design Decisions (ADRs)

### `DD-1`: Dedicated Standalone Component vs Inline Hardcoded Markup
- **Context:** Three tabs need identical disclosure behavior and visual layout with different text.
- **Decision:** Build a standalone `PrTabIntroComponent`.
- **Rationale:** Ensures 100% visual consistency, centralized a11y testing (`aria-expanded`, keyboard focus), and zero code duplication across tabs.

### `DD-2`: Volatile Local Signal State vs LocalStorage Persistence
- **Context:** Requirement specifies the panel must be open by default on tab entry and not persist collapsed state across page reloads.
- **Decision:** Use Angular's reactive `signal<boolean>(true)` inside the component instance.
- **Rationale:** Component instance lifecycle naturally resets upon page reload or route re-creation, satisfying `STEP-R-3` without side effects.

### `DD-3`: Accessible Disclosure Pattern
- **Context:** Screen readers and keyboard users need clear indicators of expandable regions.
- **Decision:** Provide `role="region"`, `[attr.aria-expanded]="isOpen()"`, and semantic `<button>` toggle controls.
- **Rationale:** Meets WCAG 2.1 AA and SDD a11y standards.

---

## 8. Verification Strategy

- **Unit Tests:** `pr-tab-intro.component.spec.ts` testing:
  1. Default expanded rendering.
  2. Toggle click collapses and updates `aria-expanded` to `false`.
  3. Re-click expands and updates `aria-expanded` to `true`.
  4. Custom `title` and `description` projection.
- **Integration Tests:** Existing test suites in `program-overview`, `programme-results`, and `dashboard-lab` verify uninterrupted page rendering.
