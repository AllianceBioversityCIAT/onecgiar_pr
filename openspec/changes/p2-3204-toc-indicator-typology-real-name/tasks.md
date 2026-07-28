## 1. Prerequisites (blocking — done by the user, not the AI)

- [x] 1.1 Jira created: **P2-3204** (bug) with subtasks **P2-3205** (frontend) and **P2-3206** (QA, assigned to Santiago Sanchez).
- [x] 1.2 Option A approved by Yecksin on 2026-07-28. Nicoleta/Santiago can still switch to Option B — it is one line in a single computed plus one test.
- [x] 1.3 Branch `P2-3204-indicator-typology-real-name` created from `origin/P2-2928-TOC-Improvements` (worktree at `reporting/onecgiar_pr-P2-3204`).

## 2. Frontend — Contributors & Partners (section 2)

Component folder: `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/`

- [x] 2.1 In `multiple-wps-content.component.ts`, update the comment above `indicatorTypologyValue` (lines 113–114) to state that `indicator_typology` is an alias of the ToC sentinel `type_value` and that `type_name` is the display text.
- [x] 2.2 In `multiple-wps-content.component.ts`, rewrite the `indicatorTypologyValue` computed (lines 115–118) to resolve in order: trimmed `type_name` → trimmed `type_value` → empty string. Do not sanitise or reformat the resolved text.
- [x] 2.3 In `multiple-wps-content.component.ts`, add a small computed (or reuse the existing one) that returns `'Not specified'` when the resolution yields an empty string, so the template does not carry the placeholder logic.
- [x] 2.4 In `multiple-wps-content.component.html`, change the guard at line 96 from `@if (isCP2026() && indicatorTypologyValue())` to `@if (isCP2026())`, keeping the surrounding `showIndicators()` / `activeTab.toc_result_id` / `indicatorsList().length` guards untouched so the field only appears once a KPI list is loaded.
- [x] 2.5 In `multiple-wps-content.component.html`, bind the field description to the placeholder-aware value from 2.3.
- [x] 2.6 In `multiple-wps-content.component.html`, fix the label at line 98: `Indicator Tipology` → `Indicator Typology`.
- [x] 2.7 Confirm the read-only "Unit of measurement" and "Target" block (lines 106–111) still renders unchanged — it reads `selectedIndicatorData()`, which this change does not touch.

## 3. Frontend — ToC contribution review panel (notifications)

Component folder: `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/components/notification-item/`

- [x] 3.1 In `notification-item.component.ts`, add `statement?: string;` to the `TocContributionReview` interface (lines 12–24), with a comment noting it carries the ToC `type_name` under a legacy alias.
- [x] 3.2 In `notification-item.component.html` line 87, render the typology through a new `tocTypologyOf(review)` method on the component, keeping the em dash placeholder used by every other row of the panel. *Implemented as a component method rather than an inline template expression so the resolution is unit-testable and does not live in the HTML.*
- [x] 3.3 Verify the neighbouring `outcome_statement` row (line 86) is untouched — it comes from a different column and must not be confused with `statement`.

## 4. Do NOT touch (guard rails)

- [x] 4.1 Confirm `target-indicator.component.ts:65` (`checkAlert()`, compares `type_value !== 'custom'`) is unmodified — it is functional logic, not display.
- [x] 4.2 Confirm `aow-hlo-table.component.ts:102` is unmodified — it already renders `type_name` and is the reference behaviour.
- [x] 4.3 Confirm no file under `onecgiar-pr-server/` is modified by this change.

## 5. Unit tests (Jest)

- [x] 5.1 In `multiple-wps-content.component.spec.ts`, add a case per data pattern from the census: catalogue type (both equal), custom (`custom` + real name), empty sentinel with a name, both empty, and dirty sentinel with a clean name.
- [x] 5.2 In `multiple-wps-content.component.spec.ts`, assert the field renders with `Not specified` when no typology can be resolved, and that it is not rendered when `isCP2026()` is false.
- [x] 5.3 In `notification-item.component.spec.ts`, assert the review row prefers `statement`, falls back to `indicator_typology`, and shows `—` when both are missing.
- [x] 5.4 Run `npm run test src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.spec.ts` and the notification-item spec — both green.

## 6. Gate before pushing

- [x] 6.1 Run `npm run lint:fix` in `onecgiar-pr-client` — clean, no errors.
- [ ] 6.2 Run the full client Jest suite with coverage — all green and above the thresholds (branches 50%, functions 60%, lines 60%, statements 60%).

## 7. Verification

- [ ] 7.1 API check — confirm the ToC still delivers both fields, using a program with custom KPIs:
  `TOKEN=$(grep '^USER_TOKEN=' /Users/yeck/Desktop/reporting/.env | cut -d'"' -f2)`
  `curl -s -H "auth: $TOKEN" "https://prtest-back.ciat.cgiar.org/api/results-framework-reporting/toc-results/2030-outcomes?programId=SP03"`
  Expect entries with `type_value: "custom"` and a populated `type_name`.
- [ ] 7.2 UI — run `npm start` in `onecgiar-pr-client` (points at prtest by default; do not start the server locally). Open a 2026 result → section 2 **Contributors & Partners** → ToC question set to **Yes** → select a level, an HLO/Outcome node and a KPI.
- [ ] 7.3 UI — with a **custom** KPI selected (SP03 has several), confirm the field reads the real KPI name and never the word `custom`.
- [ ] 7.4 UI — with a **catalogue** KPI selected, confirm the display is unchanged (e.g. `Innovation Use`).
- [ ] 7.5 UI — with a KPI whose sentinel is empty, confirm the field now appears (it used to be hidden). Flag this to QA explicitly, since it is a visible change beyond the reported bug.
- [ ] 7.6 UI — confirm the label reads `Indicator Typology`, and that "Unit of measurement" and "Target" still show beneath it.
- [ ] 7.7 UI — open a ToC contribution review panel from notifications and confirm its "Indicator Typology" row shows the same text as section 2 for the same KPI.
- [ ] 7.8 Save screenshots to `onecgiar_pr/.local-screenshots/` (gitignored) named `{ticket}-typology-before.png` / `{ticket}-typology-after.png`. Do not commit them.

## 8. Hand-off

- [ ] 8.1 Document the change on the Jira ticket using the repo's Jira format (What was done / Why / How to verify / Technical references), in English.
- [ ] 8.2 Notify Santiago on Slack with the QA steps, calling out task 7.5 as expected new behaviour.
- [ ] 8.3 Merge into `P2-2928-TOC-Improvements` so it ships with the epic through PR #719. If #719 has already merged to staging, rebase onto `staging` instead.
- [ ] 8.4 Log the backend follow-up for Juan David: rename the confusing `statement` alias (`results-toc-results.repository.ts:469`) to something self-describing. Not part of this change.
