> **Status audit 2026-07-21.** The six tasks below marked `[x]` (2.1, 2.2, 3.1–3.4) describe components — `report-entry-dialog`, the locked "Reporting under:" chip — that **do not exist in any branch or worktree on this machine** (`git ls-tree` across `performance-refactor`, `front-redesign-fields`, `front-redesign`; grep across the whole `reporting/` tree). The implementation was lost, most likely with a removed worktree. They are re-marked `[ ]` with `(re-do)` so the plan does not skip real work. The *analysis* behind them still stands and is reused.

## 0. (A2) Guided creation entry on the new home

- [ ] 0.1 In `pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`, rename the `Report a result` card to `Guided creation` and collapse its two anchors into a single primary button. Remove the `Planned / Against an indicator` anchor (that path already exists once an Area of Work is open); relocate the `Emerging / Not in the ToC` action into the `Report by category` card, per category row.
- [ ] 0.2 Add the full-screen guided surface (neutral background) opened by that button, setting `DataControlService.focusMode` while open and clearing it on destroy (the signal and its reset pattern already exist from the 2026-07-21 dashboard-lab work).
- [ ] 0.3 Horizontal slide between steps with `animate.enter` / `animate.leave` + keyframes in the component SCSS, mirroring `result-framework-reporting-card-item.component.scss`; collapse durations to 1ms under `prefers-reduced-motion` (design D12).
- [ ] 0.4 Step "Which Science Program?" fed by `ResultFrameworkReportingHomeService` signals `mySPsList` / `otherSPsList` / `otherProjectsList` (loaded by `getScienceProgramsProgress()`, already triggered by the module shell). The program currently selected in the sidebar is the **highlighted suggestion**, never a silent skip (design D10).
- [ ] 0.5 Step "Which Area of Work?" via `GET_ClarisaGlobalUnits(programCode)`, reusing the per-program cache already implemented in `dashboard-lab.component.ts` (`loadAows`). Include the fixed `2030-outcomes` entry only if the chosen path makes it reportable — otherwise omit it and say why.
- [ ] 0.6 Editable summary chip row (path · program · area of work) on every step after the first; activating a chip returns to that step keeping the other answers. Downstream answers invalidated by an upstream edit are cleared **with visible feedback**, never silently (design D11).
- [ ] 0.7 Unit tests: program/AoW steps render from the real signals; editing the program upstream clears a now-invalid AoW and surfaces the message; reduced-motion disables the slide.

## 1. Foundation & shared pieces

- [ ] 1.1 Add a maintained front-side glossary map (category `result_type_id` + typology `type_name` → plain-language description + example), isolated behind a single provider so a future backend source can replace it (design D6).
- [ ] 1.2 Confirm reusable Spartan primitives for dialog + stepper via the Spartan MCP; establish Tailwind token aliases for violet `#6b6dc4` + navy carbon from `src/styles/colors.scss` (no new SCSS classes).
- [ ] 1.3 Route all new user-facing copy through the terminology pipe; use `material-icons-round` for icons.

## 2. Fix the confirmed category bug (highest priority, standalone)

- [ ] 2.1 (re-do) In `report-result-form`, render a pre-selected indicator category as a locked chip ("Reporting under: {name}") with an explicit "Change category" affordance instead of an open `[(ngModel)]` radio.
- [ ] 2.2 (re-do) Guard the Output/Outcome level-change handler so it never clears `result_type_id` without user-visible feedback: while locked, the level cards + radio are hidden behind the chip (level cannot be re-picked to wipe the category); "Change category" restores open selection with the current choice intact.
- [ ] 2.3 Add/adjust unit tests covering: pre-selected category stays locked, "Change category" reveals options, level change does not silently wipe the category. (pending — heavy DoCheck/timer component; browser verification pending too)

## 3. Guided entry + decision helper (capability: guided-result-reporting)

- [ ] 3.1 (re-do) Create `report-entry-dialog` (Tailwind, `app-pr-dialog` wrapper): two visually distinct, plain-language choices (Planned / Emerging) with a description + example each, and a "Not sure?" mini-checklist that recommends a path.
- [ ] 3.2 (re-do) Add a single primary "Report a result" action that opens `report-entry-dialog`; emerging → existing create modal (generic, no pre-lock), planned → scroll+highlight the AoW column. Underlying columns kept intact (migration step 1).
- [ ] 3.3 (re-do) Show a disabled entry with an explanation when reporting is not permitted (instead of hiding it with no reason).
- [ ] 3.4 (re-do) Persistent helper text (not hover-only) under both column headers describing planned vs emerging. (Entry is a real `<button>` with focus-visible; breadcrumb semantic upgrade deferred — not load-bearing for Slice 1.)
- [ ] 3.5 Unit tests: decision step renders both choices with examples; "Not sure?" routes correctly; disabled state shows the reason. (pending — with 2.3, after build+browser verification)

## 4. Emerging-result stepper (capability: guided-result-reporting)

- [ ] 4.1 Create `report-emerging-wizard` shell (progress indicator, back navigation, subtle motion honoring `prefers-reduced-motion`) hosting the existing `report-result-form` pieces one concern per step: Level → Category → Search-before-create → Title.
- [ ] 4.2 Wire the wizard to the existing pre-selection signals in `ResultLevelService` so entering from a category card lands on the locked category (task 2).
- [ ] 4.3 Search-before-create step: reuse `depthSearchList` + `app-similar-results` to list matches (title, owner, status) with "Open existing" / "Contribute" / "Create new" and a "Use anyway" escape for false-positive exact matches; add `aria-live` to validation.
- [ ] 4.4 Empty state for no matches that lets the user continue to create.
- [ ] 4.5 Unit tests: step progression + back preserves data; motion disabled under reduced-motion; "Use anyway" unblocks save; similar-results actions behave.

## 5. Tame the indicator table (capability: indicator-selection-experience)

- [ ] 5.1 Remove force-expand in `aow-hlo-table`; collapse HLO groups by default with per-group counts and an expand/collapse-all control.
- [ ] 5.2 Add a typology filter (distinct `type_name`) combinable with existing search + status filter; enable sorting on target/achieved/progress.
- [ ] 5.3 Make the search/filter toolbar and table header sticky; show "Showing X of Y" + clear-filters; highlight the search term in matches.
- [ ] 5.4 Collapse the per-row action buttons into an overflow/kebab; make interactive icons keyboard-accessible (role/tabindex/keydown).
- [ ] 5.5 Turn the typology label into a keyboard-accessible help affordance sourced from the glossary (task 1.1).
- [ ] 5.6 Render the repeated-indicator banner only when a duplicate `indicator_id` actually exists.
- [ ] 5.7 Unit tests: collapse/counts, typology filter + sort, conditional banner, filtered-count display.

## 6. Context panel (capability: reporting-context-panel)

- [ ] 6.1 Create `reporting-context-panel` (non-blocking, collapsible) that updates content per current step and never blocks the main flow or loses progress on dismiss.
- [ ] 6.2 Category/typology glossary block with definition + example for the current context (glossary source from task 1.1).
- [ ] 6.3 "Already reported in this context" block listing existing results (with status) from existing data.
- [ ] 6.4 Keyboard operability + visible focus states; guidance as persistent text.
- [ ] 6.5 Unit tests: panel updates per step, non-blocking behavior, glossary/already-reported render, keyboard focus.

## 7. Verify, document, hand-off

- [ ] 7.1 Run `npm start` against the prtest backend and exercise both paths with real data (e.g. SP12): entry → decision → stepper (emerging) and entry → indicator table (planned); verify the category-lock fix and search-before-create end-to-end in the browser.
- [ ] 7.2 Keep Jest + Cypress-CT green; coverage ≥ 50/60/60/60 (`npm run test`, `npm run test:ct`).
- [ ] 7.3 Promote the new stepper/decision pattern to `docs/system-design/design.md` §12 Design Decisions; note the reporting-flow rebuild in `docs/detailed-design/detailed-design.md`.
- [ ] 7.4 File the backend hand-off (category/typology descriptions + examples, scoped similar-results endpoint, recommended-category hint, status enum) and the separately-observed backend defects (fail-open gate, null-crash in `getProgress`, client-only gates) to the backend owner with evidence.
- [ ] 7.5 Assign the P2 ticket and align commit messages to the PRMS convention before the PR.
