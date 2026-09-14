# Archive Summary: Bilateral AI Draft Results Dashboard & Card Redesign

## 1. Document Control

| Field | Value |
|---|---|
| **Original Spec Path** | `bilateral/ai-drafts-redesign` |
| **Archived Path** | `docs/specs/archive/2026-09-14-bilateral--ai-drafts-redesign/` |
| **Archive Date** | 2026-09-14 |
| **Final Status** | `complete` |
| **Tasks Completed** | 3 of 3 tasks (`BADR-T-1`, `BADR-T-2`, `BADR-T-3`) + user feedback refinements |
| **Lead Developer** | AI Full-Stack Assistant / Pair Programming |

---

## 2. Requirements Delivered

| Requirement ID | Summary | Verification |
|---|---|---|
| `BADR-R-1` | Project filter option formatting `<shortName> — <fullName>` with fallback | PASS (58 tests) |
| `BADR-R-2` | Token-styled dropdown trigger replacing `app-pr-filter-select` | PASS (visual + unit tests) |
| `BADR-R-3` | Inline search query filter inside project dropdown when >5 options | PASS |
| `BADR-R-4` | Active filter chip with label, dismiss button, and "Showing M of N" count | PASS |
| `BADR-R-5` | Tab 3 title aligned to "AI Draft Results" with live count badge | PASS |
| `BADR-R-6` | Clear content hierarchy and validation notice | PASS |
| `BADR-R-7` | Grouped metadata strip (project, program, AI session hash & date) | PASS |
| `BADR-R-8` | AI session grouping with compact results tables per run | PASS (interactive refinement) |
| `BADR-R-9` | Action button hierarchy: Primary Promote, Secondary Review, Danger Delete | PASS |
| `BADR-R-10` | Relative date calculation hardened (`formatDate()` 0-day guard) | PASS |
| `BADR-R-11` | Responsive fluid layout across mobile, tablet, and desktop | PASS |
| `BADR-R-12` | Horizontal overflow eliminated with strict viewport bounds | PASS |
| `BADR-R-13` | Reporting cycle in top eyebrow (`• CGIAR CENTER · REPORTING CYCLE 2026 · P25`) | PASS (interactive refinement) |

---

## 3. Files Changed Summary

### Client (`onecgiar-pr-client`)
- `src/app/pages/bilateral/services/bilateral-ai.service.ts`: formatted project lookup map to include both code and full title.
- `src/app/pages/bilateral/pages/my-draft-results/services/my-draft-results-filter.service.ts`: updated `DraftProjectFilterOption` and added `formatDraftProjectOption()`.
- `src/app/pages/bilateral/pages/my-draft-results/services/my-draft-results-filter.service.spec.ts`: unit tests for option parsing and splitting.
- `src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.ts`: session grouping computed, project filter dropdown signals, overlay position.
- `src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.html`: token-styled dropdown, session card grouping, compact tables, removed redundant header.
- `src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.scss`: design-token compliant styling for dropdown, session cards, tables, responsive queries.
- `src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts`: comprehensive unit tests covering filters, cards, tables, responsive classes.
- `src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.ts`: reactive reporting cycle computed reading from `DataControlService`.
- `src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.html`: "AI Draft Results" tab label and uppercase active cycle eyebrow.
- `src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts`: unit tests for eyebrow reporting cycle formatting and tab labels.
- `src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.html`: removed redundant header in Reporting tab.
- `src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.scss`: cleaned up unused header styles.
- `src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.spec.ts`: updated assertion to verify container hierarchy.

---

## 4. Test Evidence Summary

- `npx jest src/app/pages/bilateral/pages/my-draft-results/`: **108 passed, 108 total**.
- `npx jest src/app/pages/bilateral/components/bilateral-page-header/`: **40 passed, 40 total**.
- `npx jest src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/`: **15 passed, 15 total**.
- `npx jest src/app/pages/bilateral/`: **1045 passed, 1045 total** (full bilateral module suite).
- `npx ng lint`: **0 lint errors across all modified files**.

---

## 5. Validation Summary

- **Status:** PASS
- **Defect Gates:**
  - `D1` (Truncated Project Info): Solved with `<shortName> — <fullName>` + tooltip.
  - `D2` (Search input on >5 projects): Solved.
  - `D3` (Card density & visual noise): Solved via session grouping and compact table.
  - `D4` (Relative date bug): Solved with `Today` guard for `<= 0`.
  - `D5` (Horizontal overflow): Solved via constrained max-widths and flex wrapping.
  - `D6` (Reporting cycle visibility): Solved via uppercase eyebrow matching SPs UX.

---

## 6. Accepted Warnings or Follow-Ups

None. All feedback items were addressed, implemented, and verified in this session.
