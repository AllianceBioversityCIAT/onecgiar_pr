## Why

Reporting a result inside a Science Program is the single most important flow in PRMS — it is where five years of planning turn into recorded outcomes — yet today it forces the user to guess. The Science Program overview offers two near-identical card columns (`Results planned in your ToC` vs `Report Emerging results`) that are never explained or visually differentiated; the only hint is a hover-only tooltip that disappears on tablets. From there the "planned" path lands on a 96-row, fully-expanded indicator table with no typology filter and no way to find the right indicator, and the "emerging" path opens a create modal whose pre-selected indicator category is **silently editable** (and is silently wiped when the user changes the Output/Outcome level). The result is a high-cognitive-load flow where users pick the wrong path, mis-categorize results, and create duplicates.

This change rebuilds the flow front-end as a guided, low-cognitive-load, subtly animated stepper that puts the right information at hand at every step — grounded in a validated UX concept and in a code-level audit of the real components.

**Scope:** **Frontend-only.** All existing backend endpoints are reused as-is. Backend enhancements that would make the guidance richer are identified below and **handed to the backend team** — they are not implemented here and the flow works without them (with front-side fallbacks).

> **Amendment 2026-07-21 — "Guided creation" on the new home.** The flow's entry point moves to the redesigned master–detail home (`pages/result-framework-reporting/pages/dashboard-lab/`), it opens **full-screen** instead of as a dialog, and it now starts from zero: the user is asked which Science Program and which Area of Work before any indicator/category question. Everything below still holds; the amendment adds sections marked *(A2)* and does not remove any prior requirement.

## What Changes

- **Single guided entry.** Replace the two parallel card columns with one primary `Report a result` entry that opens a **step 0 decision helper**: two plain-language, visually distinct choices (Planned in ToC vs Emerging) with an example each and a `Not sure?` mini-checklist. The two underlying paths (navigate-to-indicators vs create-emerging) are preserved — only the choice becomes explicit and explained.
- **Clear, subtle stepper for the emerging path.** Reframe the monolithic `report-result-form` modal into a low-cognitive-load stepper: **Level → Category → Search-before-create → Title**, with a progress indicator and gentle motion, reusing the existing form component internally.
- **Fix the silently-editable category (confirmed bug).** When a category is pre-selected from a card, show it as a **locked chip** with an explicit `Change category` affordance; changing the Output/Outcome level no longer wipes the chosen category without feedback.
- **Search-before-create.** Surface real "similar results" as a first-class step (reusing the existing Elastic dedup + `app-similar-results`) instead of a buried 3-state alert, with an `Open existing` / `Contribute` / `Create new` decision and a `Use anyway` escape hatch to avoid dead-ends.
- **Tame the 96-row indicator table** (planned path): collapse HLO groups by default with per-group counts, add a typology filter and sortable columns, make search + header sticky, collapse the repeated per-row action buttons, and show the repeated-indicator banner only when a duplicate actually exists.
- **Persistent context panel.** A non-blocking side panel that follows the flow and always shows the info the user needs to continue: glossary of categories/typologies (plain language + examples), wizard progress, and "already reported in this program/indicator".
- **Accessibility & robustness:** critical guidance is persistent text (not hover-only) so it works on tablet and with a keyboard; interactive icons get proper roles/focus; dialog focus management is addressed.
- **UI:** reuse PRMS design tokens (violet `#6b6dc4` + navy carbon), Tailwind for all new styles, Spartan primitives where applicable, `material-icons-round`, all copy via the terminology pipe.

- **(A2) "Guided creation" is the only create entry on the new home.** In the `dashboard-lab` bento, the `Report a result` card is renamed **Guided creation** and its two buttons collapse into **one**. The `Planned` button is removed — that path already exists at Area-of-Work level once an AoW is open — and the `Emerging` button moves to the `Report by category` card, next to the category it would create under.
- **(A2) Full-screen shell, not a dialog.** Activating `Guided creation` opens a full-screen surface on a neutral background that horizontally slides one step to the right at a time, so the user sees exactly one question with nothing else competing for attention.
- **(A2) The flow starts from zero.** Steps become: *Planned or Emerging?* → *Which Science Program?* → *Which Area of Work?* → (indicator | category) → search-before-create → title. The prior spec assumed the program was already chosen because the entry lived inside `entity-details`; from the home it cannot assume anything.
- **(A2) Earlier answers stay revisable.** Every later step keeps a compact, editable summary of the decisions already made (path, program, area of work) so a user who picked the wrong Science Program corrects it in place instead of restarting the flow.
- **(A2) Ends at creation, not at a full form.** The stepper creates the result and hands off to Result Detail for the remaining sections; it does not re-implement the 8+ Result Detail sections.

## Capabilities

### New Capabilities
- `guided-result-reporting`: The single `Report a result` entry, the step-0 planned-vs-emerging decision helper, and the emerging-result stepper (Level → Category-with-lock → Search-before-create → Title), including the fix for the silently-editable pre-selected category and the search-before-create dedup step.
- `indicator-selection-experience`: The redesigned "planned" path — the indicator/HLO table reworked to be findable (search-first, collapsible HLO groups with counts, typology filter, sortable columns, sticky toolbar, conditional repeated-indicator banner, plain-language typology help).
- `reporting-context-panel`: The persistent, non-blocking side information panel (glossary + examples + already-reported) that provides at-hand context throughout the reporting flow.

### Modified Capabilities
<!-- None — no existing openspec/specs/ capability governs this flow; all behavior here is net-new front-end reporting UX. -->

## Impact

**Frontend (this change):**
- **(A2)** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/` — `Report a result` card renamed to `Guided creation` with a single button; `Emerging` action relocated into the `Report by category` card; `Planned` button removed. Column geometry already lives in CSS vars (`--rail-w`, `--panel-w`, `--full-w`) on the component host.
- **(A2)** New full-screen route/surface for the guided flow, reusing `DataControlService.focusMode` (added 2026-07-21) so the shell drops its wordmark while the flow is open.
- **(A2)** Program + Area-of-Work steps fed by `ResultFrameworkReportingHomeService` (programs, already loaded by the home) and `GET_ClarisaGlobalUnits` (areas of work, already consumed by `dashboard-lab`).
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-details/` — overview: single entry + decision helper, differentiated cards, persistent helper text, context panel host.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/` — indicator table: collapse, typology filter, sort, sticky, conditional banner, action overflow.
- `onecgiar-pr-client/src/app/pages/results/pages/result-creator/components/report-result-form/` — stepper wrapper, category lock chip, search-before-create, `aria-live` on validation.
- New components (Tailwind, Spartan where fit): `report-entry-dialog`, `report-emerging-wizard`, `reporting-context-panel`.
- Design tokens from `src/styles/colors.scss`; new styles in Tailwind per project rule.

**Backend (reused as-is — NO server changes in this change):**
- `GET /results-framework-reporting/get/science-programs/progress`, `/clarisa-global-units`, `/programs/indicator-contribution-summary`, `/toc-results`, `GET_FindResultsElastic` (dedup), and the existing `POST` create paths.

**Backend enhancements identified for the backend team (hand-off, not implemented here):**
- Plain-language description + worked example per indicator category (`resultTypeId`) and per typology — currently the category card only carries a name and a hardcoded icon; the wizard/glossary would use these when available (front falls back to a static map).
- A "similar results" endpoint scoped to indicator/AoW/program (fuzzy/semantic) — today dedup is title-prefix Elastic only and the AoW create-modal does no dedup at all.
- A recommended-category hint, and a status enum + thresholds (status is currently parsed client-side from a `progress_percentage` string, which is fragile).

**Separately observed backend/logic defects (report to backend owner — out of scope here):** reporting-enabled gate fails open on missing `phaseId`/HTTP error; `getProgress()` can crash the whole table on a null `progress_percentage`; create gates are client-side only (no server re-validation of ownership/phase).

## SDD baseline & references

- Product: `docs/prd.md` (reporting personas, `AC-*`). UI/UX: `docs/system-design/design.md` (tokens, flows, a11y — new stepper pattern to be promoted to §12 Design Decisions). Technical: `docs/detailed-design/detailed-design.md` (result-framework-reporting module).
- Jira: **P2 ticket pending** — this rides the `front-redesign-fields` redesign branch, which has no P2 id yet. To be assigned before implementation lands (confirm with Yeck).
