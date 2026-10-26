# Execution — Phase Management redesign

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/phase-management-redesign` |
| Code | `PMR` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Started | 2026-10-23 |
| Leader | Claude Code session (Opus 5.5) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (opus, T3) |

## Task Execution History

### Pre-flight check — 2026-10-23 — BLOCKED (no task started)

- **Pre-flight item failed:** "`changes/replicated-innovation-reminders` client files have no uncommitted edits". `git status` shows these client files modified (the INC-165323 mini-pivot R-5 "Send again", Review 1 PASS, not committed):
  - `internationalization/replicated-innovation-reminders.copy.ts`
  - `replicated-innovation-reminders.component.{html,ts,spec.ts}`
- **Impact:** PMR-T-6 disqualifier fires. PMR-T-1 would add a key to the same dirty copy file, so the two changes would end up mixed in one diff.
- **User decision (2026-10-23):** pause. The user commits the reminders "Send again" work first, then re-runs `/akili-execute changes/phase-management-redesign`.
- **Environment note for every task:** the client ESLint 9 can't find a flat config. Lint works with `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet` (verified 2026-10-23, exit 0 on `replicated-innovation-reminders.copy.ts`). Pass this command in every brief.

### PMR-T-1 — Add `phase-management.copy.ts` — PASS (2026-10-23)

- **Attempts:** 1. Implementer `akili-implementer` (sonnet, effort low, skill `angular-developer`). Reviewer `akili-reviewer` (opus, lens-checklist mode).
- **Files:**
  - `onecgiar-pr-client/src/app/internationalization/phase-management.copy.ts` (new). `PHASE_MANAGEMENT_COPY` holds the breadcrumb, the title and description per tab, `configuredPhases`, `totalChip(n)` / `openChip(n)`, `phaseOperations`, `targetPhase` and three card titles. It uses `as const`, like its siblings.
  - `onecgiar-pr-client/src/app/internationalization/replicated-innovation-reminders.copy.ts`: one line added (`columns.delivery: 'Delivery'`).
- **Verification:** `ESLINT_USE_FLAT_CONFIG=false npx eslint <2 files> --quiet` exited 0. `git diff` on the reminders copy shows exactly one added line. There is no test gate (n/a per the task).
- **Reviewer:** STATUS PASS. Everything in the task description and PMR-DD-7 is present. The falsifier and the disqualifier were not triggered, and the DoD is met. No ADVISORY.
- **Requirements:** PMR-R-1 (copy), R-2 (chip copy), R-4 (titles), R-5 (`delivery`), NFR i18n.
- **Decisions:** the tab descriptions are the Implementer's own wording, because R-1 fixes only the titles; the user can adjust them. The card-title keys follow the design §6.2 icon rows, since `other-functionalities` has only boolean inputs (`replicateIPSR`, `replicateInnovationUse`).
- **Commit:** not made. Per tasks.md §1, the user commits.

### PMR-T-3 — Phases card header: counters + Add CTA — attempt 1 FAIL (2026-10-23)

- **Implementer (attempt 1):** `akili-implementer` (sonnet, effort medium, skills `angular-developer`, `spartan`, `tailwind-design-system`). Ran in parallel with PMR-T-5, on disjoint files. Jest runs were serialized through a mkdir lock in the scratchpad.
- **Files:** `phase-management-table.component.{ts,html,scss,spec.ts}`, `phase-management-table.module.ts`.
  - TS: `copy`, `totalPhases` (excludes `isNew`) and `openPhases`.
  - HTML: a card `<section>` whose header holds the title, the `hlmBadge` chips (`pmt-total-chip`, `pmt-open-chip`) and Add with the same bindings, with a `role="status"` feedback line under it. `<ng-content>` sits outside the card.
  - SCSS: `.setting_title` and `.center_flex_100`/`.add_new_phase_button` removed.
- **Verification:**
  - Red: 5 failed / 17 passed. Green: 22/22.
  - `--findRelatedTests`: 21 suites, 739 tests, all green.
  - ESLint clean.
- **Reviewer (attempt 1): STATUS FAIL.** Verbatim issue:
  1. **Discovered Issue:** No spec case checks that projected content still renders through the `<ng-content>` slot. The template now wraps the header and table in a new `<section>` and leaves `<ng-content>` outside it. That is correct in the diff, but nothing tests it. The phase-operations and reminders blocks in `reporting.component.html` and `innovation-package.component.html` reach the page only through this slot. The `findRelatedTests` run (21 suites) does not cover this either: the existing table spec mounts `PhaseManagementTableComponent` with no host and projects nothing.
     **Violated Rule:** `tasks.md` §3 PMR-T-3, Consumers: "Their projected content must still render (spec asserts `<ng-content>` slot remains)."
     **Remediation Suggestion:** Add one case to `phase-management-table.component.spec.ts`. Declare a small host component whose template is `<app-phase-management-table><div data-testid="pmt-projected">x</div></app-phase-management-table>`, using the same providers. Assert that `[data-testid="pmt-projected"]` exists in the rendered output. Optionally also assert it is not inside `[data-testid="pmt-card"]`, so it stays a sibling of the card as designed. Then re-run `--findRelatedTests`.
- **Reviewer judgment on the card surface:** `bg-card border-border` (semantic `--pr-*` tokens) is acceptable instead of the literal `bg-white` in design §6.3, because the NFR asks for semantic tokens.
- **ADVISORY (recorded):**
  - `text-lg` and `text-sm` render at about 13.5 / 10.5 px with the 12 px root. Client CLAUDE.md rule 20 asks for explicit px; settle it in T-7.
  - Surface recipe mismatch with the T-5 cards (`bg-white … shadow-xs`).
  - The `role="status"` element is inserted with `*ngIf`, so screen readers may not announce it reliably.

### Budget tripwire — escalated 2026-10-23 — user approved continuing

- **Estimate:** ~575 LOC after T-1, T-3 and T-5. Budget was ~450, with the tripwire at ~650. Projected end: ~850.
- **Cause:** the new test cases and the removed legacy SCSS are bigger than estimated. T-5 alone is 400 lines: about 165 are SCSS removed and about 130 are new specs. Scope is unchanged.
- **User decision:** continue to the end, with the ceiling raised to ~900 LOC. Same scope.
- **Process note:** the T-5 diff (541 lines) went to the Reviewer as a saved file in the scratchpad (`t5.diff`), not inline, because it is too large to paste. The content is the exact `git diff`.

### PMR-T-3 — Phases card header: counters + Add CTA — PASS on attempt 2 (2026-10-23)

- **Attempt 2:** the same Implementer was resumed with effort high and the verbatim FAIL. It added only a host-component spec case: `ProjectionHostComponent` projects `[data-testid="pmt-projected"]`, and the case asserts the element renders and sits outside `[data-testid="pmt-card"]`. Template, TS, SCSS and module are unchanged since attempt 1.
- **Verification:**
  - Scoped: 23/23.
  - `--findRelatedTests` (component, spec, module): 21 suites, 740 tests, green.
  - ESLint clean.
- **Reviewer (attempt 2): STATUS PASS.** The attempt-1 issue is fixed. The Implementer did not run the falsifier, so the Reviewer traced it by reading: removing `<ng-content>` fails the first assertion, and moving the slot inside the card fails the second.
- **ADVISORY (recorded):**
  - The projection case copies the provider mocks inline, so a shared factory in the spec would be optional cleanup.
  - The attempt-1 advisories carry over to T-7: rem-based text sizes, the surface recipe compared with the T-5 cards, and the `*ngIf` live region.
- **Requirements:** PMR-R-2 (both scenarios) and R-6 (`.setting_title` and `.add_new_phase_button` removed).
- **Decisions:**
  - The chip variants are `secondary` (total) and `outline` (open).
  - The card uses semantic `bg-card border-border`, which the Reviewer accepted under the NFR "semantic tokens only".
  - The new specs re-render with `componentRef.changeDetectorRef.detectChanges()` to avoid NG0100 in the harness. Change detection is unchanged.

### PMR-T-5 — Phase operations cards + confirm dialog — attempt 1 FAIL (2026-10-23)

- **Implementer (attempt 1):** `akili-implementer` (sonnet, effort medium, skills `angular-developer`, `spartan`, `tailwind-design-system`). Ran in parallel with T-3.
- **Files (13):**
  - `reporting.component.{html,ts,spec.ts}` and `innovation-package.component.{html,ts,spec.ts}`: section, "Target phase" and grid.
  - `other-functionalities.component.{html,ts,scss,spec.ts}`: card, plus `replicateTitle()`, `icon()` and `targetPhaseName()`.
  - `massive-phase-shift.component.{html,scss,spec.ts}`: new dialog layout, testids `mps-from`, `mps-to`, `mps-cancel` and `mps-confirm`.
- **Verification:**
  - Red: 10 failed / 13 passed. Green scoped: 23/23.
  - `--findRelatedTests`: 24 suites, 740 tests, green.
  - ESLint clean. No `<br>` or `style=` left.
  - `OtherFunctionalitiesModule` is used only inside phase-management.
- **Reviewer (attempt 1): STATUS FAIL.** Verbatim issue:
  1. **Discovered Issue:** The operation card's icon tile is purely decorative (`aria-hidden="true"`), yet it is painted violet: a `bg-brand-25` tinted tile with a `text-[var(--pr-color-primary-300)]` icon (`#6b46e5`, the brand violet). File: `other-functionalities/other-functionalities.component.html`, the `<span class="bg-brand-25 flex size-10 …">` tile. No other component in the client uses this violet icon-tile pattern, and design §6.2/§6.3 do not specify a colour for the tile, so nothing in the spec overrides the rule.
     **Violated Rule:** `onecgiar-pr-client/CLAUDE.md` UI rule 12: "Color only on semantic icons. Decorative icons stay neutral; only the active nav icon is violet." Also rule 7: "Inside the content area there must be no violet border and no tinted background" (the exceptions are program band, brand chips and primary button).
     **Remediation Suggestion:** Make the tile neutral. Use a neutral surface/border token (e.g. `border border-[var(--pr-color-accents-2)]`, or the accent surface already used for grey) and a neutral icon colour (`text-[var(--pr-color-secondary-400)]`, as the dialog arrow already does). No test change is needed.
- **ADVISORY (recorded):**
  - Raw `bg-white` versus T-3's `bg-card`: two card surfaces on one page.
  - `shadow-xs` (design §6.3) conflicts with client rule 10 ("cards separate with border, not shadow").
  - Without the old `.pr-dialog__body` padding override, the dialog may end up double-padded.
  - "Target phase" appears in the section header and again in each footer.
  - The dialog's "to" chip is violet (`bg-brand-25` plus a `primary-300` border); check it against rule 7.
  - The running-state spec checks only the disabled class.
- **Leader adjudication:** the card-surface and shadow inconsistency between T-3 and T-5 is a design conflict (design §6.3 versus client rule 10). It is deferred to the PMR-T-7 visual gate for a user decision. It is not added to the T-5 rework, which stays narrow.

### PMR-T-5 — Phase operations cards + confirm dialog — PASS on attempt 2 (2026-10-23)

- **Attempt 2:** the same Implementer was resumed with effort high. Only the decorative icon tile changed. It is now neutral: `border-[var(--pr-color-accents-2)] bg-[var(--pr-color-accents-1)] text-[var(--pr-color-secondary-400)]`.
- **Verification:** `--findRelatedTests` (other-functionalities ts and spec) passed 21 suites, 725 tests. ESLint clean.
- **Reviewer (attempt 2): STATUS PASS.** Rules 7 and 12 are now met. The attempt-1 conformance findings still hold. The `mps-to` dialog chip stays advisory: rule 12 covers icons only, the chip sits in the modal overlay (not the content area), and the old dialog already showed the phase names in violet.
- **ADVISORY (recorded, for T-7):**
  - The violet `mps-to` chip could be made neutral with a bolder font weight.
  - The card surface is `bg-white` here but `bg-card` in T-3.
  - `shadow-xs` (design §6.3) conflicts with client rule 10.
  - The dialog body may be double-padded.
  - The footer reads "Target phase:" where design §6.2 says "Target:".
- **Requirements:** PMR-R-4 (all scenarios, card counts, grid) and R-6.
- **Decisions:**
  - The target phase reads the existing `dataControlSE.reportingCurrentPhase.phaseName` and `IPSRCurrentPhase.phaseName`. No API calls were added.
  - The strings stay inline per PMR-DD-7.
  - The specs recreate the fixture after a state change to avoid NG0100.

### PMR-T-6 — Reminders card: header + Delivery chips — PASS on attempt 1 (2026-10-23)

- **Implementer:** `akili-implementer` (sonnet, effort medium, skills `angular-developer`, `spartan`, `tailwind-design-system`).
- **Files:**
  - `replicated-innovation-reminders.component.html`: the four metric `<th>/<td>` become a single Delivery column. It holds four chips with labels from `copy.columns.*` and testids `rir-metric-*`. A non-zero unreachable count adds `rir-chip-warning` with a `--pr-color-yellow-300` border and `--pr-color-yellow-700` text.
  - `replicated-innovation-reminders.component.spec.ts`: only the `:134` regex was rewritten, as per-chip assertions plus the warning class.
  - `.component.ts` is unchanged.
- **Verification:**
  - Red on the old template: null `querySelector` at line 135 (1 failed / 745 passed).
  - Green: `--findRelatedTests` passed 21 suites, 746 tests.
  - ESLint clean.
- **Reviewer: STATUS PASS.** R-5, the BUT clause (gating unchanged) and DD-6 are met. Static `class` and `[class]` merge (Ivy). Rules 7, 12 and 20 hold.
- **ADVISORY (recorded):**
  - The Reviewer flagged the start-of-session dirty reminders files. The Leader confirmed they were committed in `cf0c1bdb4` before this run. The current diff in those files is T-1 (+1 copy key) and T-6 only.
  - The chip class string is repeated four times.
  - The warning colour is backed by the "Unreachable" label text; to be confirmed in T-7.
- **Requirements:** PMR-R-5.

### PMR-T-2 — Page header + segmented tabs — attempt 1 FAIL (2026-10-23)

- **Implementer (attempt 1):** `akili-implementer` (sonnet, effort medium, skills `angular-developer`, `spartan`, `tailwind-design-system`).
- **Files:**
  - `phase-management.component.{html,ts,scss,spec.ts}`:
    - HTML: `hlm-breadcrumb`, `h1` and description from the copy, and a `nav` with two `routerLink`/`routerLinkActive` anchors (`ariaCurrentWhenActive="page"`) styled with `aria-[current=page]:`.
    - TS: a `currentUrl` signal from `router.events`, plus computed `activeTab`, `title` and `description`.
    - SCSS: `.tabs`, `.tab` and `.active` removed.
  - `phase-management.module.ts`: adds `HlmBreadcrumbImports`.
  - **Declared out-of-list file:** `onecgiar-pr-client/package.json`, one jest `moduleNameMapper` line for `@spartan/breadcrumb`, matching the other `@spartan/*` entries. The Reviewer accepted it as test-only, with no runtime effect.
- **Verification:**
  - Red: 5 failed / 1 passed. Green: `--findRelatedTests` passed 21 suites, 723 tests.
  - ESLint clean.
  - The diff-stat shows no routing, routing-data or shell file.
- **Reviewer (attempt 1): STATUS FAIL.** Verbatim issues:
  1. **Discovered Issue:** The new nav `aria-label="Phase management modules"` is a hard-coded English literal in `phase-management.component.html`. Screen readers announce it, so it is user-facing.
     **Violated Rule:** `requirements.md` §6 NFR i18n ("All new strings go through `src/app/internationalization/` (DD-9)"). Also `docs/ux-ui/design.md` DD-9 and `onecgiar-pr-client/CLAUDE.md` L365 ("No hard-coded English in templates").
     **Remediation Suggestion:** Add a key such as `tabsNavLabel: 'Phase management modules'` to `PHASE_MANAGEMENT_COPY` and bind `[attr.aria-label]="copy.tabsNavLabel"`. The spec selector `nav[aria-label="Phase management modules"]` keeps working, or it can read the value from the copy constant. Adding one key to the T-1 file is within this task's purpose.
  2. **Discovered Issue:** The tab focus state uses `focus-visible:outline-[var(--pr-color-primary-300)]` instead of the focus-ring token.
     **Violated Rule:** `onecgiar-pr-client/CLAUDE.md` Hard UI rule 4 ("Every interactive control has a visible focus ring (`--pr-focus-ring`)"). The token is defined at `src/styles/colors.scss:321`.
     **Remediation Suggestion:** Replace the three outline utilities with `focus:outline-none focus-visible:shadow-[var(--pr-focus-ring)]`, as in `overview-controls.component.html`, on both anchors.
- **ADVISORY (recorded):**
  - The tab labels "Results module" / "IPSR module" are still inline literals. They predate this task.
  - `startWith` and `initialValue` do the same job.
  - `hover:bg-black/5` is a raw utility.
  - The pill visuals go to T-7.

### PMR-T-4 — Phases table cells + actions restyle — attempt 1 FAIL (2026-10-23)

- **Implementer (attempt 1):** `akili-implementer` (sonnet, effort high, skills `angular-developer`, `spartan`, `tailwind-design-system`).
- **Files:** `phase-management-table.component.{html,scss,spec.ts}`.
  - Status uses `hlmBadge` "Open" (green) / "Closed" (secondary, also for `isNew` drafts). Portfolio renders as an outline chip. Dates use `tabular-nums`.
  - `<tr [ngClass]>` adds `bg-brand-25` for the open row.
  - Delete, save and cancel are now `<button type="button">` with `aria-label` and `aria-disabled`, plus testids `pmt-delete-btn`, `pmt-save-btn` and `pmt-cancel-btn`.
  - The edit div keeps both strings verbatim and adds `role="button" tabindex="0" aria-label`.
  - SCSS `.tag_container` and `.actions > .action_button` removed, along with two inline styles.
- **Verification:**
  - Red: 7 failed / 23 passed. Green: `--findRelatedTests` passed 21 suites, 747 tests.
  - ESLint clean. The CT file is unchanged.
  - **CT:** 1 passing / 1 failing. The `before()` verbatim lock and the "enabled row" test pass. The "disabled row" test fails with `expected '<div#pr-tooltip-1.pr-tooltip>' to have class 'pr-tooltip--pinned'`.
  - **HEAD baseline:** with the original `.html` restored, the CT gives the identical 1/1 result and the same assertion. The Leader checked both saved outputs (`ct.txt`, `ct_base.txt`).
- **Reviewer (attempt 1): STATUS FAIL.** Verbatim issue:
  1. **Discovered Issue:** All five new accessible names are hard-coded English in the template: "Edit phase", "Delete phase", "Create phase" / "Save phase", "Cancel editing". The component already exposes `copy = PHASE_MANAGEMENT_COPY` (`src/app/internationalization/phase-management.copy.ts`), and none of these strings is in it.
     **Violated Rule:** `requirements.md` §6 NFR i18n: "All new strings go through `src/app/internationalization/` (DD-9)". Also `onecgiar-pr-client/CLAUDE.md` §5 / §10: "No hard-coded English in templates."
     **Remediation Suggestion:** Add keys to `PHASE_MANAGEMENT_COPY`, for example `editPhaseLabel`, `deletePhaseLabel`, `createPhaseLabel`, `savePhaseLabel`, `cancelEditLabel`. Bind them with `[attr.aria-label]="copy.…"`. For the edit div this is still the `aria-label` that PMR-DD-3 allows, and the CT `before()` lock does not cover it. Add `phase-management.copy.ts` to the T-4 file list in the execution log. Re-run `--findRelatedTests` on the copy file too.
- **CT DoD ruling (Reviewer):** this is not a T-4 FAIL. The T-4-relevant lock (`before()`) is green. The failing test mounts its own inline harness, and its HEAD baseline fails the same way. It is recorded as a **pre-existing gap**: the "click on a tooltip child pins the bubble" contract is currently unverified. Follow-up: investigate `pr-tooltip.directive.ts` (fe32d7bd3 / 719bd78bf) for a possible regression. That is outside this spec.
- **ADVISORY:**
  - **Spec conflict:** the edit div with `role="button" tabindex="0"` can take focus but cannot be activated from the keyboard. PMR-DD-3 forbids `(keydown)`. The tooltip directive also gives the child `<i>` `role="button" tabindex="0"` when `getFeedback()` is truthy, which nests interactive controls.
  - The edit div has no `aria-disabled`.
  - Helm badge classes are not merged with tailwind-merge, so the green override depends on CSS order; check in T-7.
  - `gap-1` / `size-8` are rem-based (3 px / 24 px).
  - The `bg-brand-25` row tint conflicts with rule 7, although design §6.3 mandates it; T-7 HITL to decide.
  - No Jest case covers "delete tooltip while editing".
- **Leader adjudication (spec conflict DD-3 vs the WCAG NFR):**
  - Adding `role="button" tabindex="0"` without a keyboard handler adds a focus stop that does nothing. That is worse than the pre-redesign markup, which was not focusable at all.
  - **Decision: narrow, don't widen.** The attempt-2 rework removes `role`, `tabindex` and `aria-label` from the edit div. DD-3 lists them as *may* be added, so removing them is allowed. The edit action keeps exactly its pre-redesign semantics.
  - Keyboard activation of the edit action needs a DD-3 amendment that allows `(keydown.enter)` / `(keydown.space)` with the same guard. It is recorded as a follow-up for the user and not done in this spec.
- **Sequencing:** the attempt-2 rework waits for the PMR-T-2 attempt-2 rework to finish, because both add keys to `phase-management.copy.ts`.

### PMR-T-2 — Page header + segmented tabs — PASS on attempt 2 (2026-10-23)

- **Attempt 2:** the same Implementer was resumed with effort high.
  - Added `tabsNavLabel` to `phase-management.copy.ts`. The nav now binds `[attr.aria-label]="copy.tabsNavLabel"`.
  - Both anchors use `focus:outline-none focus-visible:shadow-[var(--pr-focus-ring)]`.
  - The spec builds its selector from the copy constant.
- **Verification:** `--findRelatedTests` (component ts, spec, copy file) passed 25 suites, 772 tests. ESLint clean. No Jest process was left running (the Leader checked the node process list).
- **Reviewer (attempt 2): STATUS PASS.** Both attempt-1 issues are fixed (i18n NFR / DD-9, hard UI rule 4). The other T-2 files are unchanged.
- **ADVISORY (recorded):**
  - The tab labels "Results module" / "IPSR module" are still inline literals. They predate this task.
  - `startWith` and `initialValue` duplicate each other.
  - `hover:bg-black/5` is a raw utility.
- **Requirements:** PMR-R-1 (including its BUT clause: no routing, guard or shell diff) and R-6.
- **Files:** `phase-management.component.{html,ts,scss,spec.ts}`, `phase-management.module.ts`, `phase-management.copy.ts` (+1 key), and the declared out-of-list file `onecgiar-pr-client/package.json` (jest mapper for `@spartan/breadcrumb`).

### PMR-T-4 — Phases table cells + actions restyle — PASS on attempt 2 (2026-10-23)

- **Attempt 2:** the same Implementer was resumed with effort xhigh.
  - **Copy:** four keys added to `phase-management.copy.ts` (`deletePhaseLabel`, `createPhaseLabel`, `savePhaseLabel`, `cancelEditLabel`).
  - **Button labels:** delete, save and cancel bind `[attr.aria-label]` to those keys. Save switches to the create label for `isNew` rows.
  - **Edit div:** `role`, `tabindex` and `aria-label` removed, per the Leader decision. Its strings, structure and classes are unchanged.
  - **Spec:** assertions compare against the copy values. New cases cover "Create phase" on a draft and confirm the edit div has no role, tabindex or aria-label.
- **Verification:**
  - Jest `--findRelatedTests` (spec, component ts, copy file): 25 suites, 774 tests green.
  - ESLint clean.
  - CT: 1 passing / 1 failing. `before()` lock green. The failure is the pre-existing disabled-row case. The CT file is unchanged.
- **Reviewer (attempt 2): STATUS PASS.** Issue 1 is fixed; there is no hard-coded English left in cells or actions. The DD-3 narrowing is accepted.
- **ADVISORY (recorded):**
  - Edit has only its ligature text as an accessible name, and it is not keyboard-reachable. This is the DD-3 amendment follow-up.
  - The edit div keeps dead focus-visible classes.
  - Still open from attempt 1, for T-7: badge outline colours vs the green overrides, rem-based `gap-1` / `size-8`, and the `bg-brand-25` row tint vs rule 7.
- **Requirements:** PMR-R-3 (both scenarios, including `can_be_deleted` and the editing tooltip) and R-6.
- **Files:** `phase-management-table.component.{html,scss,spec.ts}` and `phase-management.copy.ts` (+4 keys).
- **Known gaps (pre-existing, outside this spec):**
  - CT "disabled row: tooltip pins" fails at HEAD too, so the click-on-child-pins contract is currently unverified. Follow-up: `pr-tooltip.directive.ts` (fe32d7bd3 / 719bd78bf).
  - Keyboard activation of the edit action needs a PMR-DD-3 amendment.

### Final code gate after PMR-T-1..T-6 — 2026-10-23

- **Jest:** `npx jest --findRelatedTests <16 touched client .ts files> --maxWorkers=2 --silent --reporters=summary --no-coverage` passed **27 suites, 807 tests**.
- **ESLint:** `ESLINT_USE_FLAT_CONFIG=false npx eslint <same 16 files> --quiet` exited 0.
- **Compile:** the `ng serve` dev build of the final tree compiled with 0 errors.
- **Budget (second tripwire, informational):** the final diff is 28 modified files plus 1 new file, +715/−390 (about 1,100 lines). That is over the user-raised ceiling of ~900. The overage is mostly new spec cases (about 400 lines across 7 spec files) and removed legacy SCSS (about 260 lines). Scope did not grow: all six code tasks are as approved. Reported to the user at the closing gate.
- **PMR-T-7 environment probe:** the local stack was started on the primary route. The client was served at 4200 and the server on port 3400.
  - The server was **stopped after about 4 minutes, before any hourly tick**. `ReplicatedInnovationRemindersCron` is an ungated `@Cron(EVERY_HOUR)`, and the local server points at the shared dev DB, which has a PENDING FINAL_REMINDER campaign (see the replicated-innovation-reminders execution log). A local tick could dispatch it.
  - The visual check therefore needs either a safe backend (cron disabled) or PRTest after deploy. Decision pending with the user.

### Integration — 2026-10-23

- **Commit and push:** `e6c37e009` was committed and pushed to `qa-development-2026-ss`, per the user's explicit request. It contains PMR-T-1..T-6 and the spec docs. The other session's dirty `replicated-innovation-reminders/execution.md` was excluded.
- **performance-refactor:** fetched. It has **no commits missing from `qa-development-2026-ss`**: `origin/performance-refactor` is `cf0c1bdb4`, an ancestor of HEAD. So there was nothing to merge in, and `qa-dev → performance-refactor` is a clean **fast-forward of 1 commit** (`e6c37e009`).
- **Not pushed to performance-refactor yet.** That push triggers the PRTest deploy, so it waits for explicit user confirmation.

### PMR-T-7 — Visual + responsive + a11y check on PRTest — evidence collected, awaiting user approval (2026-10-24)

- **Environment:** PRTest (`https://prtest.ciat.cgiar.org`). It deploys `performance-refactor` at `e6c37e009`; the user confirmed the deploy. Claude in Chrome, logged in as the user.
- **Read-only:** no Execute, Send, Save, Delete or Confirm was clicked. Only navigation, screenshots, DOM reads and programmatic focus.
- **Screenshots:** `mockup/after/reporting-light-desktop.jpg` and `mockup/after/ipsr-light-desktop.jpg`.
- **Falsifier results:**
  - **Passed:**
    - Served bundle has the new code: breadcrumb, chips, cards and Delivery chips all render.
    - `scrollWidth > clientWidth`: false (no horizontal scroll).
    - Indigo `#4f46e5`: 0 elements. Inter font: 0 elements.
    - `aria-current="page"` is on the active tab only (Results module, then IPSR module).
    - The open-row pill is green (`#166f36` text, `#19ae58` border, `#eafff0` background) with the text "Open".
    - Open row background is `rgb(250,249,254)` (`brand-25`).
    - IPSR tab: title "IPSR phases", the Results phase column is present, and there is 1 operation card.
    - No console errors.
    - Focus: tabs and delete buttons show the `--pr-focus-ring` shadow on focus.
  - **Finding, minor:** 1 inline SVG. It is the Spartan breadcrumb separator (`ng-icon lucideChevronRight`), the helm default, and it breaks the "material-icons-round only" rule.
  - **Finding:** chip text renders at **9 px** (`hlmBadge` uses rem `text-xs` on a 12 px root). Section headings ("Phase operations", card titles, "Replicated innovation reminders") render at 12 px and the card title at 13.5 px, so the hierarchy is weak. Client rule 20 asks for explicit px.
  - **Inconclusive:** 768 px and below `sm`. `resize_window` did not change the viewport (it stayed at 2133 CSS px, DPR 0.9). Needs a manual check.
  - **Inconclusive:** dark mode. The app has no dark mode (`docs/ux-ui/design.md` OG-2), so it is n/a.
- **Open visual decisions carried from review advisories (user to decide):**
  - Card surface: `bg-card` in T-3 vs `bg-white` + `shadow-xs` in T-5, and client rule 10 (border, not shadow).
  - The `bg-brand-25` open-row tint vs rule 7.
  - The violet "to" chip in the confirm dialog. Not opened, because opening it needs an Execute click.
  - Dialog body padding.
  - "Target phase" shown twice.
  - Text sizes (above).
- **Status:** PMR-T-7 stays `[ ]` until the user approves or asks for fixes.
- **User approval (2026-10-24):** the user approved PMR-T-7 as is ("si apruebo"). The minor findings (9 px chip text and 12 px section headings, the breadcrumb SVG separator) and the open visual decisions (card surface, row tint, dialog chip and padding, repeated "Target phase") are accepted for now. They are follow-ups, not blockers. The 768 px check and the dialog visual remain unverified by the agent.
- **Final status: PASS (HITL).**

## Summary

| Task | Result | Attempts |
|---|---|---|
| PMR-T-1 Copy file | PASS | 1 |
| PMR-T-2 Header + tabs | PASS | 2 (i18n aria-label, focus-ring token) |
| PMR-T-3 Card header + counters | PASS | 2 (projection test) |
| PMR-T-4 Cells + actions | PASS | 2 (i18n aria-labels; edit div narrowed per the DD-3 conflict) |
| PMR-T-5 Operation cards + dialog | PASS | 2 (neutral decorative icon) |
| PMR-T-6 Reminders Delivery chips | PASS | 1 |
| PMR-T-7 Visual HITL (PRTest) | PASS (user approved) | — |

- **Shipped:** `e6c37e009` on `qa-development-2026-ss` and `performance-refactor` (PRTest).
- **Final gate:** 27 suites / 807 tests passed, ESLint clean.
- **Budget:** about 1,100 changed lines against an estimate of about 450 (the ceiling was raised to about 900). The extra comes from specs and SCSS removal. Scope did not change.
- **Follow-ups (outside this spec):**
  1. Explicit px sizes for the chips and section headings, and a `material-icons-round` breadcrumb separator.
  2. Unify the card surfaces (design §6.3 vs client rule 10). Decide the `bg-brand-25` row tint vs rule 7. Decide the violet dialog chip.
  3. Amend PMR-DD-3 to allow keyboard activation of the edit action.
  4. The CT "disabled row: tooltip pins" test fails at HEAD; investigate `pr-tooltip.directive.ts`.
  5. Verify the page manually at 768 px.
  6. Redesign the phase detail page (PMR-OQ-2). Convert the NgModules to standalone.
  7. Run a CodeGraph sync.
