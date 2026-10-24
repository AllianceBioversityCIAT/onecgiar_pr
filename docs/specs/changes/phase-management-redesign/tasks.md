# Tasks — Phase Management redesign

## 1. Scope

| Field | Value |
|---|---|
| Spec Path | `changes/phase-management-redesign` (Standard, gated) |
| Linked | `requirements.md` (PMR-R-1..6) · `design.md` (PMR-DD-1..8, budget §13) |
| Refs | `docs/prd.md` US-A2 · `docs/ux-ui/design.md` §7, DD-9, DD-12 · `docs/trd/trd.md` (no server/entity impact) |
| Status | in-progress (T-1..T-6 done; T-7 visual HITL pending) |

**Common rules for every task** (copy into every Implementer/Tester brief):
- Jest always `--maxWorkers=2`, scoped with `--findRelatedTests <touched files>`. **One test run at a time on the machine.** Never the full suite.
- Lint only the touched files: `npx eslint <files> --quiet`.
- Skills: `angular-developer`, `spartan`, `tailwind-design-system` (+ `frontend-design` for layout polish).
- No TS behavior change beyond what the task names. No commit (the user commits).
- Browser checks are read-only: never click Execute / Send now / Save / Delete / Confirm (shared prdb + prod mailer).

## 2. Pre-flight

- [x] requirements.md / design.md approved (2026-10-23)
- [x] PMR-OQ-1 resolved (navy-carbon, PMR-DD-1). PMR-OQ-2/3 run on defaults (detail page out; title per tab)
- [x] No DB/migration/CLARISA dependency
- [x] `changes/replicated-innovation-reminders` client files have no uncommitted edits (committed in `cf0c1bdb4`, pushed; re-checked 2026-10-23). Re-check before T-6

## 3. Task list

### PMR-T-1 — Add `phase-management.copy.ts` [x]

- **Type:** client
- **Description:** Create the copy object (PMR-DD-7): breadcrumb labels, title/description per tab (`Reporting phases` / `IPSR phases`), "Configured phases", chip labels (`{n} total`, `{n} open`), "Phase operations", "Target phase", card titles (result innovations / innovation use / innovation packages), reminders `columns.delivery` key (added to the existing `replicated-innovation-reminders.copy.ts`).
- **Implements:** PMR-R-1 (copy), R-2 (chip copy), R-4 (titles), R-5 (`delivery`), NFR i18n
- **Files:** `onecgiar-pr-client/src/app/internationalization/phase-management.copy.ts` (new), `…/replicated-innovation-reminders.copy.ts` (+1 key)
- **Depends on:** — · **Blocks:** T-2…T-6
- **Estimate:** S · **Review:** skip-eligible
- **Verification:**
  - **Falsifier:** `tsc` / eslint error on the new file; or an existing key value in `replicated-innovation-reminders.copy.ts` changes (diff shows anything other than one added line).
  - **Red run:** n/a (no test gate). Gate = `npx eslint <2 files> --quiet` + `git diff` showing additions only.
  - **Disqualifier:** the copy would require renaming an existing asserted string → stop, PMR-DD-7 forbids it.
  - **Consumers:** none (no shared symbol changed; additive key).
- **DoD:** [x] file exported with `as const` style matching sibling copy files · [x] lint clean

### PMR-T-2 — Page header + segmented tabs [x]

- **Type:** client
- **Description:** Rewrite `phase-management.component.html`: `hlm-breadcrumb` (Admin module › Phase management), `h1` title + description chosen from the active route, and two `routerLink`/`routerLinkActive` anchors styled as a segmented pill group with `ariaCurrentWhenActive="page"`. Add a router-derived `activeTab` to the component (PMR-design §2.2). Import the breadcrumb helm in `PhaseManagementModule`. Empty out the legacy tab SCSS.
- **Implements:** PMR-R-1 (scenario "Results tab active": title, `aria-current`, click → IPSR title; BUT no route/guard/shell change), R-6 (tab SCSS)
- **Files:** `pages/admin-section/pages/phase-management/phase-management.component.{html,ts,scss,spec.ts}`, `phase-management.module.ts`
- **Depends on:** T-1 · **Blocks:** T-7
- **Estimate:** S · **Review:** checklist
- **Verification:**
  - **Falsifier:** with URL `/admin-module/phase-management/innovation-package` the `h1` reads "Reporting phases", or the Results anchor carries `aria-current="page"`.
  - **Red run:** new spec cases in `phase-management.component.spec.ts` (title per URL; `aria-current` on active anchor) fail before, pass after → `npx jest --findRelatedTests <files> --maxWorkers=2 --no-coverage`.
  - **Disqualifier:** making the title work requires editing `routing-data.ts` or the route config → stop, re-specify (BUT clause).
  - **Consumers:** none. `git diff --stat` must not list `phase-management-routing.module.ts`, `routing-data.ts`, or any `reporting-nav-sidebar`/shell file.
  - **Cannot prove:** visual pill styling → T-7.
- **DoD:** [x] specs green · [x] lint clean · [x] no inline styles

### PMR-T-3 — Phases card header: counters + Add CTA [x]

- **Type:** client
- **Description:** Add getters `totalPhases` (excludes `isNew`) and `openPhases` (`status === true`) to `PhaseManagementTableComponent` (PMR-DD-2). Wrap the table in a card. The header holds the title, two `hlmBadge` chips and the **Add new phase** `app-pr-button` moved from the bottom with **identical bindings**, with the `getFeedback()` text under it (PMR-DD-4). Remove `.setting_title` and `.add_new_phase_button` SCSS.
- **Implements:** PMR-R-2 (scenario "Counters": 5/1, updates without reload, "0 open" shown; scenario "Add blocked": disabled + feedback visible, BUT no draft on click), R-6 (those SCSS blocks)
- **Files:** `shared/components/phase-management-table/phase-management-table.component.{ts,html,scss,spec.ts}`, `phase-management-table.module.ts`
- **Depends on:** T-1 · **Blocks:** T-4
- **Estimate:** M · **Review:** full (shared component)
- **Verification:**
  - **Falsifier:** `phaseList` = 5 persisted rows (1 open) + 1 `isNew` draft → `totalPhases` ≠ 5; or all closed → open chip missing / not "0 open"; or after `phaseList` is reassigned with one more open phase the rendered chip doesn't change after `detectChanges()`; or with `isNew` present, clicking Add increases `phaseList.length`.
  - **Red run:** new cases in `phase-management-table.component.spec.ts` (getters; rendered chip text after reassignment; disabled-click keeps length) fail before, pass after.
  - **Disqualifier:** counters require changing CD strategy or converting `phaseList` to a signal → stop (contradicts PMR-P-6/DD-2).
  - **Consumers:** `reporting.component.html`, `innovation-package.component.html` (only consumers, PMR-P-1). Their projected content must still render (spec asserts `<ng-content>` slot remains).
- **DoD:** [x] specs green · [x] lint clean · [x] existing table spec cases untouched and green

### PMR-T-4 — Phases table cells + actions restyle [x]

- **Type:** client
- **Description:** Restyle the cells per PMR-R-3: status `hlmBadge` with text (Open/Closed, incl. the `isNew` "Closed"), portfolio chip, `tabular-nums` dates, the open row highlighted via `[ngClass]` on `<tr>`, delete/save/cancel as `<button type="button" aria-label>`. **Edit action: keep the two binding strings verbatim** (PMR-DD-3); only class values plus `role="button"`, `tabindex="0"`, `aria-label` may be added. Remove `.action_button` / `.tag_container` SCSS (PMR-DD-8; keep empty SCSS files in place). Columns, sort, paginator and inline editors stay unchanged.
- **Implements:** PMR-R-3 (scenario "Open row highlight", AND IT MUST pill text; scenario "Behavior preserved": same calls/alerts, BUT delete stays blocked with its tooltip when `can_be_deleted` false, AND IT MUST keep the disabled tooltip while editing), R-6
- **Files:** `phase-management-table.component.{html,scss,spec.ts}`
- **Depends on:** T-3 (same files) · **Blocks:** T-7
- **Estimate:** M · **Review:** full
- **Verification:**
  - **Falsifier:** a row with `can_be_deleted: false` → clicking delete calls `deletePhase` (spy), or its button has no tooltip text "The phase has active results therefore cannot be eliminated"; an open phase row lacks the highlight class or its pill text ≠ "Open"; the CT's `before()` string check fails.
  - **Red run:** new spec cases (open row class + pill text; blocked delete not called; delete button `aria-label`) fail before, pass after. Plus CT: `npx cypress run --component --spec src/app/shared/components/phase-management-table/phase-management-table.edit-action-tooltip.cy.ts` **green and unmodified** (not run concurrently with Jest).
  - **Disqualifier:** keeping the edit binding strings verbatim proves impossible for the layout → stop and escalate; do not edit the CT.
  - **Consumers:** same as T-3.
  - **Cannot prove:** highlight contrast and pill colors in jsdom → T-7.
- **DoD:** [x] Jest green + CT `before()` lock green (disabled-row case red at HEAD too, pre-existing) · [x] CT file unchanged in `git diff` · [x] lint clean

### PMR-T-5 — Phase operations cards + confirm dialog [x]

- **Type:** client
- **Description:** In `reporting.component.html` / `innovation-package.component.html` wrap the operations in a "Phase operations" section with "Target phase: {current phase}" and a `grid md:grid-cols-2 gap-4`, keeping the existing `*ngIf previous…Phase.phaseName` guard. Rewrite `other-functionalities` as a card (icon tile, `replicateTitle()` (new), `replicateBannerText()` as description, footer with target + the same Execute `app-pr-button` bindings). Rewrite the `massive-phase-shift` dialog content (title = `replicateDescription()`, from → `arrow_forward` → to, metadata sentence, Cancel/Confirm) inside the same `app-pr-dialog` (PMR-DD-5). Remove the legacy SCSS and inline styles.
- **Implements:** PMR-R-4 (scenario "Execute": dialog shows from→to + same count sentence, Confirm = same PATCH, Cancel = no request; scenario "Running state": all Execute disabled + spinner + running text; scenario "No previous phase": section hidden; 2 cards Results / 1 card IPSR; 2-col ≥ md), R-6
- **Files:** `pages/reporting/reporting.component.{html,spec.ts}`, `pages/innovation-package/innovation-package.component.{html,spec.ts}`, `other-functionalities/other-functionalities.component.{html,ts,scss,spec.ts}`, `other-functionalities.module.ts`, `massive-phase-shift/massive-phase-shift.component.{html,scss,spec.ts}`
- **Depends on:** T-1 · **Blocks:** T-7 · **Parallel with:** T-2, T-3/T-4, T-6 (code only; tests serialized)
- **Estimate:** M · **Review:** checklist
- **Verification:**
  - **Falsifier:** `replicateTitle()` returns the same string for two different inputs; with `previousReportingPhase.phaseName = ''` the section renders; clicking Cancel calls `PATCH_versioningAnnually` (spy); with `massivePhaseShiftIsRunning = true` an Execute button is enabled; the Results tab renders ≠ 2 cards or the IPSR tab ≠ 1.
  - **Red run:** new cases in `other-functionalities.component.spec.ts` (`replicateTitle` per input), `massive-phase-shift.component.spec.ts` (Cancel → no PATCH; Confirm → PATCH once) and `reporting/innovation-package` specs (card count; hidden without previous phase) fail before, pass after.
  - **Disqualifier:** the card needs a changed `accept()` or request flow → stop (non-goal).
  - **Consumers:** none outside phase-management (`OtherFunctionalitiesModule` imported only here, verify by grep in the task).
  - **Cannot prove:** grid breakpoint and card look → T-7.
- **DoD:** [x] specs green · [x] lint clean · [x] no `<br>`/inline styles left in the 3 templates

### PMR-T-6 — Reminders card: header + Delivery chips [x]

- **Type:** client
- **Description:** In `replicated-innovation-reminders.component.html`, replace the four metric `<th>/<td>` with one **Delivery** column of four labelled chips (`data-testid="rir-metric-sent|skipped|failed|unreachable"`). Unreachable > 0 uses the warning style. Keep the header title and `subtitle()`. Update spec `:134` from the regex to per-chip assertions (PMR-DD-6). No TS change.
- **Implements:** PMR-R-5 (scenario "Delivery chips": 1/0/0/13 shown with labels; BUT per-status enabled actions unchanged; states loading/error/empty/outcome kept)
- **Files:** `components/replicated-innovation-reminders/replicated-innovation-reminders.component.{html,spec.ts}`
- **Depends on:** T-1 · **Blocks:** T-7
- **Estimate:** S · **Review:** checklist
- **Verification:**
  - **Falsifier:** a campaign `{sent 9, skipped 2, failed 1, unreachable 3}` → any chip's value differs, or the unreachable chip lacks the warning class; any existing case on `rir-preview-btn` / `rir-edit-btn` / `rir-cancel-btn` / `rir-send-btn` / `rir-send-again-btn` disabled state changes outcome.
  - **Red run:** the rewritten `:134` case fails on the old template (no `rir-metric-*` testids), passes after. All other cases in the file stay unmodified and green.
  - **Disqualifier:** the reminders client files have new uncommitted edits from the INC-165323 work → stop and rebase first (pre-flight).
  - **Consumers:** none (template only).
- **DoD:** [x] spec green · [x] `.component.ts` unchanged in diff · [x] lint clean

### PMR-T-7 — Visual + responsive + a11y check (HITL, T6)

- **Type:** tests
- **Description:** With the local stack (`docs/infrastructure.md` §6), open both tabs and take screenshots: light and dark, 1280 px and 768 px (8 shots), saved under `docs/specs/changes/phase-management-redesign/mockup/after/`. Compare against the mockup and the brand-token table (design §6.3), then Tab through header tabs → Add → row actions → Execute to confirm visible focus. Present them to the user at the HITL pause.
- **Implements:** PMR-R-1..5 visual clauses; NFR Responsive (no horizontal page scroll at 1280, stacking below `sm`), Accessibility (focus, not color-only), Dark mode, Brand
- **Files:** screenshots only
- **Depends on:** T-2, T-4, T-5, T-6
- **Estimate:** S · **Review:** checklist (user is the reviewer)
- **Verification:**
  - **Falsifier:** `document.documentElement.scrollWidth > clientWidth` at 1280 px; any focus stop without a visible ring; indigo `#4f46e5`, Inter, or inline SVG icons found in the rendered DOM; the served bundle predates the changes (check the bundle timestamp first, memory lesson).
  - **Red run:** n/a (no test gate; human/T6 gate).
  - **Disqualifier:** any write button clicked during the check → abort and report. If the screenshots can't be taken (stack down), report *inconclusive*, never pass.
  - **Consumers:** none.
- **DoD:** [ ] 8 screenshots attached · [ ] user approval recorded in `execution.md`

## 4. Dependency graph

```
T-1 (copy)
 ├── T-2 (header/tabs) ─────────────┐
 ├── T-3 (card+counters) → T-4 (cells) ┤
 ├── T-5 (operations/dialog) ───────┤
 └── T-6 (reminders chips) ─────────┴── T-7 (visual HITL)
```

T-2, T-3→T-4, T-5 and T-6 can be implemented in parallel (separate files). Their **test runs are serialized**.

## 5. Coverage (scenario/clause → task)

| Clause | Task |
|---|---|
| R-1 title per tab, `aria-current`, IPSR click | T-2 |
| R-1 BUT no route/guard/shell change | T-2 (diff-stat check) · T-7 |
| R-2 counters 5/1 · updates without reload · AND "0 open" | T-3 |
| R-2 Add disabled + feedback · BUT no draft | T-3 |
| R-3 open highlight · AND pill text | T-4 · T-7 (color) |
| R-3 behavior preserved · BUT `can_be_deleted` · AND editing tooltip | T-4 (+ CT) |
| R-4 Execute dialog · Confirm/Cancel | T-5 |
| R-4 running state · no previous phase · card counts · grid | T-5 · T-7 (breakpoint) |
| R-5 chips · BUT action gating · states kept | T-6 |
| R-6 legacy SCSS removal | T-2, T-3, T-4, T-5 |
| NFR responsive / a11y / dark / brand | T-7 (+ `aria-label`s in T-4) |
| NFR i18n | T-1 |

## 6. Test plan

| Test | Type | Covers | Location |
|---|---|---|---|
| PMR-TEST-1 | unit | R-1 | `phase-management.component.spec.ts` |
| PMR-TEST-2 | unit | R-2 | `phase-management-table.component.spec.ts` |
| PMR-TEST-3 | unit + CT (unmodified) | R-3 | same spec + `phase-management-table.edit-action-tooltip.cy.ts` |
| PMR-TEST-4 | unit | R-4 | `other-functionalities`, `massive-phase-shift`, `reporting`, `innovation-package` specs |
| PMR-TEST-5 | unit | R-5 | `replicated-innovation-reminders.component.spec.ts` |
| PMR-TEST-6 | visual HITL | NFRs | T-7 screenshots |

Final pre-push: `npx jest --findRelatedTests <all touched files> --maxWorkers=2 --silent --reporters=summary --no-coverage` (memory: findRelatedTests before push).

## 7. Rollout & roll-back

- Single PR / commit to `qa-development-2026-ss`, then on to `performance-refactor` for a PRTest look. The user commits (`🎨 style(phase-management): …`, no apostrophes in the subject).
- Roll-back: revert the commit. No data, flags or migrations involved.

## 8. Follow-ups

Phase detail page redesign (PMR-OQ-2) · standalone conversion of phase-management NgModules.
