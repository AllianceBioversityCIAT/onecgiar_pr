# Archive Summary: Bilateral Center Shell & Hero SP Alignment

## 1. Document Control

| Field | Value |
|---|---|
| **Original Spec Path** | `bilateral/shell-sp-alignment` |
| **Archived Path** | `docs/specs/archive/2026-09-14-bilateral--shell-sp-alignment/` |
| **Archive Date** | 2026-09-14 |
| **Final Status** | `complete` |
| **Tasks Completed** | 4 of 4 tasks (`BSA-T-1`, `BSA-T-2`, `BSA-T-3`, `BSA-T-4`) |
| **Lead Developer** | AI Full-Stack Assistant / Pair Programming |

---

## 2. Requirements Delivered

| Requirement ID | Summary | Verification |
|---|---|---|
| `BSA-R-1` | Standard desktop hero presentation, 64px condensed height, title typography | PASS (`BSA-T-1`) |
| `BSA-R-2` | Tabbed center navigation without back button; detail variant back link preserved | PASS (`BSA-T-1`) |
| `BSA-R-3` | Tab strip composition with icons, Reporting default active, Drafts badge | PASS (`BSA-T-1`) |
| `BSA-R-4` | Desktop independent vertical scroll (#workArea ≥900px) and sub-900px fallback | PASS (`BSA-T-2`, `BSA-T-3`) |
| `BSA-R-5` | Filter docking directly beneath tabs across Reporting, Results, and Drafts tabs | PASS (`BSA-T-2`, `BSA-T-3`) |
| `BSA-R-6` | Mobile horizontal tab scroll (`no-scrollbar`), button label collapse | PASS (`BSA-T-1`, `BSA-T-4`) |
| `BSA-R-7` | Design token hygiene: 0 hex colors, 0 new PrimeIcons, `:host` in `.scss` | PASS (`BSA-T-4`) |
| `BSA-R-8` | Shimmering skeleton placeholders replacing legacy spinner on loading | PASS (`BSA-T-2`, `BSA-T-3`) |

---

## 3. Files Changed Summary

### Client (`onecgiar-pr-client`)
- `src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.html`: Hero height 64px, title styling, removal of back button in tabbed variant, tab icons and active border.
- `src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.ts`: Reporting tab route mapping and active state handling.
- `src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.scss`: Sticky band styling and tab strip layout.
- `src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts`: Unit tests for hero presentation, tab icons, and back button visibility rules.
- `src/app/pages/bilateral/pages/bilateral-home/bilateral-home.component.html`: Viewport-locking layout and docked toolbar integration.
- `src/app/pages/bilateral/pages/bilateral-home/bilateral-home.component.scss`: Viewport styling with `:host` encapsulation.
- `src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.html`: Docked toolbar, `#workArea` inner scroller, and skeleton loading cards.
- `src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.scss`: Work area scroll styling and skeleton animations.
- `src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.spec.ts`: Unit tests for scroller containment and skeleton states.
- `src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html`: Docked filter bar and `#workArea` scroller.
- `src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.scss`: Viewport page styling.
- `src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts`: Unit tests for scroller and filters docking.
- `src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.html`: Docked filter bar and `#workArea` scroller.
- `src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.scss`: Viewport page styling.
- `src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts`: Unit tests for scroller and filters docking.

---

## 4. Test Evidence Summary

- `npx jest src/app/pages/bilateral/components/bilateral-page-header/`: Passed.
- `npx jest src/app/pages/bilateral/pages/bilateral-home/`: Passed.
- `npx jest src/app/pages/bilateral/pages/bilateral-results-list/`: Passed.
- `npx jest src/app/pages/bilateral/pages/my-draft-results/`: Passed.
- Full module suite: `npx jest src/app/pages/bilateral/` passed with 0 failures.
- `npx ng lint`: 0 lint errors across all touched files.

---

## 5. Validation Summary

- **Status:** PASS
- **Visual Alignment:** All 3 bilateral tabs (Reporting, Results, Drafts) adhere to the Science Programs (SP) viewport-locked scroller pattern with sticky top bands and docked filter bars.
- **Accessibility:** Keyboard navigable tabs, semantic HTML, and correct ARIA roles preserved.

---

## 6. Accepted Warnings or Follow-Ups

None. All 4 tasks were executed, audited, and verified.
