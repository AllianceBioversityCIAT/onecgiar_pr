## Context

The Science Program result-reporting flow spans three existing surfaces, all under `onecgiar-pr-client/src/app/pages/`:

1. **Overview** (`result-framework-reporting/pages/entity-details/`) — `EntityDetailsComponent` (standalone, OnPush) fetches AoW units, indicator-category summaries and dashboard data via `EntityAowService`, then renders Insights charts plus the two parallel card columns.
2. **Indicator table** (`result-framework-reporting/pages/entity-aow/.../aow-hlo-table/`) — a client-side search/status-filter toolbar feeding `app-pr-group-table`, grouped by HLO, every group force-expanded, actions repeated per row.
3. **Create modal** (`results/pages/result-creator/components/report-result-form/`) — Level cards → `Indicator category` radio (bound `[(ngModel)]="resultBody.result_type_id"`, no lock) → title with Elastic dedup. A near-duplicate full-page variant exists at `result-creator.component.html`, and the AoW create-modal (`aow-hlo-create-modal`) is a third create path with no dedup.

State lives in signals on `EntityAowService` and `ResultLevelService` (the pre-select mechanism `setPendingResultType` / `preselectResultType` already exists). Stack on this branch: **Angular 21 + Tailwind 4 + Spartan** (not the 19+PrimeNG in the older docs). Design tokens in `src/styles/colors.scss` (`--pr-color-*`); brand direction is violet `#6b6dc4` + navy carbon.

This is a **front-end rebuild** reusing every current endpoint. The audit that grounds it was cross-checked by an independent multi-agent review; the silently-editable category is a **confirmed** defect, not a hypothesis.

## Goals / Non-Goals

**Goals:**
- Make the "which path?" decision explicit and explained *before* the user commits (step 0), removing hover-only guidance.
- Turn the emerging-result creation into a low-cognitive-load stepper (one decision per step) with subtle motion and a persistent progress indicator.
- Eliminate the silently-editable / silently-wiped category behavior.
- Make the 96-row indicator table findable (search-first, collapsed groups, typology filter, sort).
- Give the user at-hand context (glossary, examples, already-reported) via a non-blocking side panel.
- Reuse existing endpoints and the existing `report-result-form` internals; do not fork behavior.
- Impeccable, accessible UI on PRMS tokens; Tailwind for new styles; Spartan primitives where they fit.

**Non-Goals:**
- No backend/server changes in this change (enhancements are handed off; the flow works without them via front-side fallbacks).
- Not fixing the separately-reported backend/logic defects (fail-open gate, null-crash, client-only gates) — those go to the backend owner.
- Not unifying the legacy full-page `result-creator` variant beyond what's needed to avoid new drift (tracked as a follow-up).
- No change to what a result *is* or to submission/QA downstream — only the path to creating/finding it.

## Decisions

**D1 — One entry + a decision step, not two parallel columns.**
Replace the two card columns with a single primary `Report a result` action opening a new `report-entry-dialog` (step 0). Rationale: the columns encode a real branch (navigate-to-planned-indicator vs create-emerging) but present it as two equivalent lists; making it one explicit, explained fork removes the guesswork while keeping both underlying paths intact. *Alternative considered:* keep two columns but add descriptions — rejected: it dresses up the ambiguity instead of resolving the "which one is mine?" question.

**D2 — Stepper wraps the existing form; it does not replace it.**
`report-emerging-wizard` is a thin Tailwind/Spartan stepper shell that hosts the existing `report-result-form` pieces (level cards, category, title/dedup) one concern per step, driven by the pre-selection signals already in `ResultLevelService`. Rationale: preserves validated create/dedup logic and the `blockingExactTitleFound` guard; lowers risk. *Alternative:* rewrite the form from scratch — rejected: high risk, re-implements working validation.

**D3 — Category is a locked chip when pre-selected.**
When entering from a category card, render the category as a read-only chip (`Reporting under: {name}`) + explicit `Change category`; guard the level-change handler so it no longer nulls `result_type_id` without feedback. Rationale: directly fixes the confirmed bug and matches the user's mental model ("I already chose this"). *Alternative:* just disable the radio — rejected: users sometimes legitimately need to change it, so an explicit affordance beats a dead control.

**D4 — Search-before-create as a real step.**
Promote dedup from a buried 3-state alert to a first-class step using the already-populated `depthSearchList` + `app-similar-results`, offering `Open existing` / `Contribute` / `Create new`, plus a `Use anyway` escape so a false-positive exact-match never hard-blocks the user. Rationale: prevents duplicates (a core data-quality problem) and removes the enabled/disabled Save flicker. *Alternative:* keep the inline alert — rejected: it neither shows what matched nor offers an action.

**D5 — Tame the table with data already present; no new endpoint.**
Remove force-expand (per-HLO collapse + counts from `indicators.length`), add a typology filter (distinct `type_name`), sortable target/achieved/progress, sticky toolbar/header, action overflow, and render the repeated-indicator banner only when a duplicate `indicator_id` actually exists. Rationale: every input already exists client-side; this is the highest findability gain for the lowest risk.

**D6 — Context panel is presentational and fallback-driven.**
`reporting-context-panel` reads from the same signals and a **static front-side glossary map** keyed by `result_type_id`/`type_name`; if/when the backend exposes real descriptions/examples, the panel swaps its source with no structural change. Rationale: ships value now, upgrades cleanly later.

**D7 — Accessibility is built in, not bolted on.**
All decisive guidance is persistent text (never hover-only); interactive `<i>` icons get `role="button"`/`tabindex`/keydown; the dialog/stepper manages focus trap + ESC + `aria-modal`; validation uses `aria-live`. Rationale: the current tooltip-only guidance fails on tablet and keyboard — a real user-base for this flow.

**D8 — Tokens & styling.**
New styles in Tailwind using PRMS token values (violet `#6b6dc4`, navy carbon); Spartan for primitives (dialog, stepper scaffolding) consulted via the Spartan MCP; `material-icons-round`; copy via the terminology pipe. No new SCSS classes; existing `.scss` touched only to remove hacks (force-expand, fixed max-heights).

**D9 — (A2) Full-screen surface, not a dialog.**
`Guided creation` takes over the viewport on a neutral background instead of opening `app-pr-dialog` inside the page. Rationale: the flow now spans 5–6 decisions including program and area of work; a dialog on top of a dense bento forces the user to parse two competing layouts at once, and on tablet the dialog would scroll internally. Full-screen also lets the horizontal slide read as *progress through a flow* rather than *content inside a box*. It reuses `DataControlService.focusMode` so the shell sheds chrome for the duration. *Alternative considered:* keep the dialog from D1 — rejected: it was sized for a 1-question decision helper, not the full flow. The decision helper itself remains the first step, now rendered inside the shell.

**D10 — (A2) The flow owns program and area-of-work selection.**
Steps 2 and 3 ask for Science Program and Area of Work using data the home already holds (`ResultFrameworkReportingHomeService` program signals; `GET_ClarisaGlobalUnits` per program, already cached by `dashboard-lab`). Rationale: entering from the home means no program context exists; asking is honest and removes the old assumption baked into D1. *Alternative:* pre-fill from the currently selected program in the sidebar and skip the step — rejected as a *silent* default: the user may open the flow with an unrelated program selected, and a wrong program is expensive to undo after creation. The current selection is used as the **highlighted suggestion**, not as a skip.

**D11 — (A2) Decisions stay editable in place.**
Every step after the first renders a compact summary chip row of prior answers (path · program · area of work); activating a chip returns to that step with the rest of the answers intact. Rationale: Yeck's explicit requirement — a user who picks the wrong Science Program must not have to restart. This generalizes D3's "locked but changeable" principle to the whole flow: nothing is silently fixed, nothing is silently discarded. Steps that become invalid after an upstream edit (e.g. an area of work that does not exist in the newly chosen program) are cleared **with visible feedback**, per D3.

**D12 — (A2) Motion is the native Angular animation layer.**
Step transitions use `animate.enter` / `animate.leave` (Angular 20+, no `BrowserAnimationsModule`), following the pattern already shipped in `result-framework-reporting-card-item.component.scss` and reused on 2026-07-21 by the `dashboard-lab` rail morph. Keyframes are the sanctioned SCSS exception; everything else stays Tailwind. `prefers-reduced-motion` collapses durations to 1ms. Rationale: one animation idiom across the module instead of a second mechanism.

**D13 — (A2) Creation asks no per-type fields; only Knowledge Product branches.**
A code-level audit of both create paths (2026-07-21) corrected an assumption: the "control lists" (`innovation-control-list.service.ts`, `policy-control-list.service.ts`) are **not injected anywhere under `result-creator/`**. At creation the emerging form asks only *initiative → level → category → title*, plus a **Knowledge Product** branch (`result_type_id == 6`) that asks for a repository handle and runs MQAP sync. Everything type-specific lives in Result Detail (`rd-result-types-pages/`, routed by `prHide` = `ResultTypeEnum`). The stepper therefore has **one conditional step**, not one per result type. *Consequence:* the "different forms per type" the flow was expected to absorb do not exist at creation, and the planned path's rich modal (`aow-hlo-create-modal`: contributing centers, Science Programs, bilateral projects, target, narrative) is the one that actually carries extra fields — it is the heavier stepper to absorb later, not the emerging one.

## Risks / Trade-offs

- **[Three create paths diverge further]** → this change routes the overview/emerging entry through the wizard around `report-result-form`; the legacy full-page `result-creator` and `aow-hlo-create-modal` are left functional and flagged for a follow-up unification, not touched blindly.
- **[Glossary text lives in the front until backend exposes it]** → accept a maintained static map now; isolate it behind the panel's data source so the swap is trivial (D6).
- **[Stepper adds clicks vs one long modal]** → mitigate with a "one clear decision per step", visible progress, back navigation, and sensible pre-fill so the happy path feels shorter, not longer.
- **[Table rework touches a dense shared component]** → land behind incremental, independently-testable changes (collapse, then filter, then sort), each with unit coverage, keeping `npm run test:ct`/Jest green.
- **[Motion could feel gimmicky]** → keep animation subtle, honor `prefers-reduced-motion`, and reserve it for step transitions and state changes, not decoration.
- **[No P2 ticket yet]** → assign before merge; until then the change is spec-tracked here.

## Migration Plan

1. Ship additive components (`report-entry-dialog`, `report-emerging-wizard`, `reporting-context-panel`) and the category-lock fix behind the existing overview without removing the old columns' code until the new entry is verified in the browser.
2. Table improvements land incrementally (collapse → filter → sort → sticky → banner-condition), each shippable alone.
3. Verify each surface with `npm start` on the prtest backend (real data, e.g. SP12) plus Jest/Cypress-CT; keep coverage ≥ 50/60/60/60.
4. Rollback: revert to checkpoint commit `fef17bcea` (pushed before this work) on `front-redesign-fields`.

## Open Questions

- **P2 ticket** for this rebuild? (needed for commits/PR).
- Do we retire the two-column overview entirely in this change, or keep it available behind a flag for one cycle?
- Priority order between the emerging stepper and the planned-path table taming — ship together or sequence (recommend: category-lock + entry/decision first, table second)?
- Should `Contribute` in search-before-create reuse the existing "existing contributors" flow, or is a lighter "map to this result" action enough for v1?
