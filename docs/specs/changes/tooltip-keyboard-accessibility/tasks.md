# Tooltip Unification & Keyboard Accessibility — `tasks.md`

Linked spec: `requirements.md` + `design.md` (same folder). Module code: `TIP`.

## 1. Scope of this task list

- **Module / feature:** `changes/tooltip-keyboard-accessibility` (P2-3323 Part 2)
- **Linked spec:** `docs/specs/changes/tooltip-keyboard-accessibility/requirements.md` + `design.md`
- **Owner / driver:** Santiago Sanchez Correa
- **Status:** not-started

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved (user selected Continue at Phase 1 gate).
- [x] `design.md` approved (user selected Continue at Phase 2 gate).
- [x] Open questions resolved: `TIP-OQ-1` deferred (out of scope, unchanged), `TIP-OQ-2` resolved in `design.md` DD-4 (one universal reposition strategy), `TIP-OQ-3` resolved in DD-5 (remove `prTooltipPinnable` entirely).
- [x] No conflicting in-flight spec touching `pr-tooltip.directive.ts` (searched `docs/specs/` — none).
- [ ] No migration involved — N/A, skip `migration:check`.

---

## 3. Task list

### `TIP-T-1` — Rewrite `PrTooltipDirective` for unified click-pin, keyboard, ARIA, and viewport behavior

- **Status:** [x] complete — PASS on attempt 2/3, see `execution.md`
- **Skills:** `angular-developer` (Angular 21 directive, `inject()`, `Renderer2`, CDK a11y)
- **Type:** `client`
- **Description:** Core directive rewrite implementing every MUST requirement in one pass (they share state — pin/focus/ARIA/positioning are not independently shippable):
  1. Make pin-on-click unconditional (remove the `prTooltipPinnable`-gated branch in `onClick()`); outside-click and `Escape` close paths stay as today's proven logic.
  2. In `ngOnInit`, detect whether the host is natively interactive (`tagName === 'BUTTON' || 'A'`, or it already carries its own `role`/`tabindex`/keydown handling — explicitly skip `dynamic-panel-menu`'s `<a routerLink>`, `result-framework-reporting-recent-item`'s existing `keydown.space`/`keydown.enter`, and `reporting-entry-hub`'s own `aria-expanded` button, per `design.md` §2.3/DD-3). For every other host, set `role="button"` + `tabindex="0"` via `Renderer2`, and add a `keydown.enter`/`keydown.space` handler that calls the same open path (with `preventDefault()` on Space to stop page scroll).
  3. Generate a unique `tooltipId` (module-level counter) at construction; on `show()`, set it as the tooltip element's `id`; on the host, set `aria-controls` = that id and `aria-describedby` = that id (toggletip pattern, DD-2 — no `role="tooltip"`).
  4. On `pin()`, set `aria-expanded="true"` on the host; on `hide()`, set `aria-expanded="false"`.
  5. Inject `FocusTrapFactory` (`@angular/cdk/a11y`); on `pin()`, create a `FocusTrap` on `tooltipEl` and call `focusFirstTabbableElement()`; store `document.activeElement` beforehand; on `hide()`, destroy the trap and restore focus to the stored element.
  6. In `position()`, add a vertical clamp mirroring the existing horizontal one (`top = Math.max(gap, Math.min(top, window.innerHeight - tip.height - gap))`).
  7. While pinned, register `window` `scroll` (capture: true, so ancestor-scrollable containers — tables, the review drawer, dashboard panels — are caught) and `resize` listeners that re-run `position()`; tear them down alongside the existing document click/keydown listeners in the same `pinnedListeners` array.
  8. SHOULD (`TIP-R-20`): on `pin()`, call `@angular/cdk/a11y`'s `LiveAnnouncer.announce(this.text)` once. If this conflicts with focus-trap timing (double announcement) during manual testing, defer it and record the deferral in this task's completion notes — it is a SHOULD, not a MUST.
  9. Remove the `@Input() prTooltipPinnable` declaration entirely (DD-5).
- **Implements:** `TIP-R-1`, `TIP-R-2`, `TIP-R-3`, `TIP-R-4`, `TIP-R-5`, `TIP-R-6`, `TIP-R-7`, `TIP-R-8`, `TIP-R-9` (mechanism only — full closure needs `TIP-T-6`), `TIP-R-10`, `TIP-R-20` (best-effort), `TIP-AC-1` through `TIP-AC-8` (implementation half — test half in `TIP-T-3`/`TIP-T-4`)
- **Design refs:** `design.md` §2.2, §2.3, DD-1, DD-2, DD-3, DD-4, DD-5
- **Files (expected):** `onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts`
- **Depends on:** —
- **Blocks:** `TIP-T-2`, `TIP-T-3`, `TIP-T-4`, `TIP-T-5`
- **Estimate:** `L`
- **Definition of done:**
  - [ ] `npx tsc`-clean and `npm run build` succeeds (per `src/CLAUDE.md` §21.7, `tsc --noEmit` alone does not typecheck templates — this task has none, but the build is still the real gate for the directive's own TS).
  - [ ] `ng lint` clean on the touched file.
  - [ ] Manual smoke check in a running `npm start` session: open a tooltip by mouse click (stays open), by keyboard Tab+Enter (opens), Tab into a tooltip containing a link (focus moves in, link is `Enter`-activatable), Escape closes and focus returns to the trigger, click outside closes.
  - [ ] Idle-page check: with no tooltip open, confirm no `scroll`/`resize` listeners are attached (`getEventListeners(window)` in DevTools, or code-review the teardown path) — performance NFR from `design.md` §8.
  - [ ] No secret/token logged (`.cursorrules` — not applicable here but checked per convention).

---

### `TIP-T-2` — Remove the now-redundant `[prTooltipPinnable]="true"` attribute from its call sites

- **Status:** [x] complete — PASS, see `execution.md`
- **Skills:** `angular-developer`
- **Type:** `client`
- **Description:** Cosmetic cleanup only, zero behavior change (pinning is unconditional after `TIP-T-1`). Remove the attribute from each of the 6 files (a 6th site, `program-overview.component.html`, was found during `TIP-T-1`'s grep and is not in the original 5 — same cleanup, same reasoning; recorded as a deviation in `execution.md`).
- **Implements:** `TIP-R-10`, `TIP-AC-9` (partial — these 6 of 39 files)
- **Design refs:** `design.md` DD-5
- **Files (expected):**
  - `onecgiar-pr-client/src/app/custom-fields/pr-field-header/pr-field-header.component.html`
  - `onecgiar-pr-client/src/app/custom-fields/field-card/field-card.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-general-info/section-general-info.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.html`
- **Depends on:** `TIP-T-1`
- **Blocks:** `TIP-T-6`
- **Estimate:** `S`
- **Definition of done:**
  - [x] `grep -rn "prTooltipPinnable" onecgiar-pr-client/src --include=*.html` returns zero hits. (Corrected from an unqualified repo-wide grep — the 3 `.spec.ts` files that still reference `prTooltipPinnable` as a TypeScript property are `TIP-T-3`'s ownership per `design.md` DD-5 Consequences, not this task's; an unqualified grep here was unsatisfiable until `TIP-T-3` lands. Reviewer-flagged correction, 2026-09-04.)
  - [x] `ng lint` clean.
  - [x] Manual check: the 6 sites' tooltips still open/pin exactly as before (no visual regression) — deferred to the user's own manual browser pass (see `execution.md`); code-level diff confirms zero behavior change (attribute removal only, no other line touched).

---

### `TIP-T-3` — Retarget and extend `pr-tooltip.directive.spec.ts` (Jest)

- **Status:** not-started
- **Skills:** `angular-developer`, `tdd` (logic-heavy: open/close/keyboard state machine)
- **Type:** `tests`
- **Description:** Replace every assertion against the dead `.pr_label_tooltip` selector with the real rendered DOM (`.pr-tooltip`, `.pr-tooltip--pinned`, the host element via `fixture.debugElement`). Add unit coverage for: click opens+pins (`TIP-AC-1`), outside-click closes (`TIP-AC-2`) while a click **inside** the tooltip content (e.g. on a link) does NOT close it (`TIP-AC-2`/`TIP-AC-3` negative constraint), Escape closes (`TIP-AC-3`), `keydown.enter`/`keydown.space` opens on a non-native host and does NOT double-fire on a native `<button>` host (`TIP-AC-4`), `aria-expanded`/`aria-controls`/`aria-describedby` attribute **presence** on open/close (`TIP-AC-6` — presence half only, per `design.md` §10's explicit note that this does not prove screen-reader correctness), and listener teardown (no lingering `scroll`/`resize`/document listeners after `hide()` or `ngOnDestroy()`).
- **Implements:** `TIP-R-21`, `TIP-AC-1`, `TIP-AC-2`, `TIP-AC-3`, `TIP-AC-4`, `TIP-AC-6` (presence only), `TIP-AC-10`
- **Design refs:** `design.md` §10 (defect-class table, row 1 and row 2)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.spec.ts`
  - `onecgiar-pr-client/src/app/custom-fields/pr-field-header/pr-field-header.component.spec.ts` (added — asserts `prTooltipPinnable` at `:69`, breaks compilation after `TIP-T-1`'s removal; Reviewer-flagged, 2026-09-04)
  - `onecgiar-pr-client/src/app/custom-fields/field-card/field-card.component.spec.ts` (added — asserts `prTooltipPinnable` at `:79`, same reason)
- **Depends on:** `TIP-T-1`
- **Blocks:** —
- **Estimate:** `M`
- **Definition of done:**
  - [ ] `npx jest --testPathPattern="pr-tooltip.directive.spec"` green.
  - [ ] `npx jest --testPathPattern="pr-field-header.component.spec|field-card.component.spec"` green (do not close this task on the directive spec alone — both `custom-fields` specs are currently red from the same `TIP-T-1` removal and are owned by no other task).
  - [ ] Zero references to `.pr_label_tooltip` remain in the file.
  - [ ] Client coverage thresholds (50/60/60/60) still met or improved for `shared/directives/`.
  - [ ] **No-pass condition recorded in the test file's own comments:** a passing `aria-expanded` assertion does NOT certify screen-reader behavior — that gap is closed by `TIP-T-6`'s manual pass, not by this task.

---

### `TIP-T-4` — New Cypress component tests: focus order, vertical clamp, scroll/resize reposition

- **Status:** not-started
- **Skills:** `angular-developer` (Cypress CT is an Angular/CDK-specific real-browser harness, covered under the same skill per this project's Skill Map — no dedicated Cypress skill is registered)
- **Type:** `tests`
- **Description:** Real-browser assertions jsdom cannot make (`design.md` §10, rows 3-4). Use an existing pinned-tooltip host (`pr-field-header` or `field-card`, already Cypress-CT-covered per `onecgiar-pr-client/CLAUDE.md` §9) as the test bed, plus one synthetic fixture with a tooltip taller than the available viewport space (required — a fixture that already fits cannot exercise the clamp, per `design.md` §10's named disqualifier).
  - `TIP-AC-5`: mount with a tooltip containing a link; assert the exact focus sequence after repeated `Tab` (trigger → first tooltip element → ... → link, activatable with `Enter`) — not just "something got focus."
  - `TIP-AC-7`: mount near the simulated top of a scrolled viewport with an oversized tooltip; assert its bounding rect stays within `[0, window.innerHeight]`.
  - `TIP-AC-8`: with the tooltip pinned open, scroll the container and resize the viewport; assert the tooltip's position updates to stay anchored to the trigger (or the deliberate detach threshold, if any is found necessary during implementation — `design.md` found none required, but record if one emerges).
- **Implements:** `TIP-R-3`, `TIP-R-7`, `TIP-R-8`, `TIP-AC-5`, `TIP-AC-7`, `TIP-AC-8`
- **Design refs:** `design.md` §10 (rows 3-4), §10's named no-pass conditions
- **Files (expected):** new `*.cy.ts` colocated with the chosen test-bed component (e.g. `pr-field-header.component.cy.ts` addition, or a new file if the existing spec is already at a natural size boundary)
- **Depends on:** `TIP-T-1`
- **Blocks:** —
- **Estimate:** `M`
- **Definition of done:**
  - [ ] `npm run test:ct` green, including the new spec(s).
  - [ ] The oversized-tooltip fixture is confirmed to fail against the pre-`TIP-T-1` directive (spot-checked once, not left in CI) — proves the test can actually fail, per the "name the input that would make the check fail" rule.

---

### `TIP-T-5` — Cypress regression coverage for the 5 flagged compound-click sites

- **Status:** not-started
- **Skills:** `angular-developer`
- **Type:** `tests`
- **Description:** Per `design.md` §10.1 and `TIP-DD-1`, verify that on each flagged site the existing action still fires exactly once AND the tooltip pins, with no double-fire or swallowed click:
  1. `result-review-drawer.component.html` — Approve button (inside a scrolling drawer — also exercises scroll-reposition under the compound-click condition).
  2. `phase-management-table.component.html` — tooltip on child `<i>`, edit/delete `(click)` on parent `<div>`; assert the parent action fires exactly once.
  3. `innovation-package-custom-table.component.html` / `results-list.component.html` — dropdown menu item (`item.command(); closeMenu()`); assert the command executes.
  4. `user-management.component.html` — `onToggleUserStatus`; assert the toggle still flips.
  5. `reporting-aow-table.component.html` — assert its pre-existing `emitAndStop()`/`stopPropagation()` workaround (a *different*, row-navigation bubbling fix) still functions with the directive's own click handling layered on top.
- **Implements:** `TIP-DD-1` (verification), `TIP-AC-1`, `TIP-AC-9` (5 of the riskiest 39 files)
- **Design refs:** `design.md` §10.1
- **Files (expected):** new or extended `*.cy.ts` for each of the 5 components listed above (or one E2E-style Cypress spec if component mounting is impractical for the drawer/table context — decide per component during implementation, note the choice in the PR description)
- **Depends on:** `TIP-T-1`
- **Blocks:** —
- **Estimate:** `L`
- **Definition of done:**
  - [ ] `npm run test:ct` (or the chosen Cypress runner) green for all 5 sites.
  - [ ] Each test explicitly asserts the action fired (not just that it didn't throw) — e.g. a spy on the component method, not just "no error."

---

### `TIP-T-6` — Full 39-file manual sweep + rollout verification (including the accepted screen-reader gap)

- **Status:** not-started
- **Skills:** `angular-developer` (any fix surfaced by the sweep stays in the directive)
- **Type:** `docs` + manual verification (no code expected beyond fixes surfaced by the sweep)
- **Description:** Walk the requirements §5 / design.md audit table (39 files, 72 occurrences) and confirm every site now exhibits the unified behavior — the ~34 files not already covered by `TIP-T-2` (5 cleanup sites) or `TIP-T-5` (5 deep-tested riskiest sites) get at least a manual click/keyboard/Escape check in a running `npm start` session, per the specific risk flags the audit recorded for each (repeated-row `*ngFor`/`@for` sites, scroll-container sites). Record findings as a short checklist artifact (can be a comment on the PR or a short markdown scratch note — not a new permanent doc). Also perform the **one manual screen-reader pass** that `design.md` §10 records as an accepted, unautomatable gap: exercise at least one native-`<button>` trigger and one directive-upgraded `<div>`/`<span>` trigger (per §10's named disqualifier — a native-button-only pass does not prove the `role="button"` upgrade path works) with a real screen reader (NVDA, VoiceOver, or JAWS — whichever is available) and record the outcome.
- **Implements:** `TIP-R-9` (full closure), `TIP-AC-6` (screen-reader half), `TIP-AC-9` (full closure)
- **Design refs:** `design.md` §10 (accepted gap row), §13 Open Gaps
- **Files (expected):** none required; any regression the sweep finds becomes a fix in `pr-tooltip.directive.ts` (amend `TIP-T-1`'s commit or a small follow-up commit under this task) — do not silently patch without recording what broke and why.
- **Depends on:** `TIP-T-2`, `TIP-T-3`, `TIP-T-4`, `TIP-T-5`
- **Blocks:** —
- **Estimate:** `M`
- **Definition of done:**
  - [ ] All 39 files checked against the audit table; any deviation recorded and fixed or explicitly accepted with reasoning.
  - [ ] Screen-reader manual pass performed on both a native-button and a directive-upgraded trigger; outcome (pass / issues found) recorded in the PR description.
  - [ ] If the manual pass finds a blocking issue, it is fixed before merge, not deferred silently.

---

## 4. Dependency graph

```
TIP-T-1 (directive rewrite — everything else depends on this)
   ├── TIP-T-2 (5-file cleanup)
   │     └── TIP-T-6 (full sweep, needs cleanup done first)
   ├── TIP-T-3 (Jest retarget)
   │     └── TIP-T-6
   ├── TIP-T-4 (Cypress: focus/clamp/reposition)
   │     └── TIP-T-6
   └── TIP-T-5 (Cypress: 5 compound-click sites)
         └── TIP-T-6
```

`TIP-T-2` through `TIP-T-5` are parallel-friendly once `TIP-T-1` lands (no shared files between them). `TIP-T-6` is the closing gate and must run last.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `TIP-TEST-1` | unit (Jest) | `TIP-R-21`, `TIP-AC-1/2/3/4/6(presence)/10` | `onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.spec.ts` |
| `TIP-TEST-2` | Cypress CT | `TIP-R-3/7/8`, `TIP-AC-5/7/8` | new `*.cy.ts` per `TIP-T-4` |
| `TIP-TEST-3` | Cypress CT/E2E | `TIP-DD-1` verification, `TIP-AC-1/9` (5 sites) | new specs per `TIP-T-5` |
| `TIP-TEST-4` | manual | `TIP-R-9`, `TIP-AC-6` (screen-reader half), `TIP-AC-9` (full) | `TIP-T-6` checklist, recorded in PR description |

Client coverage MUST stay above 50/60/60/60 (unchanged threshold; `shared/directives/` is not in the excluded-paths list, so it counts toward coverage).

---

## 6. Rollout & verification

- [ ] PR opened with commit convention `<emoji> <type>(<scope>) [ticket]: <description>` — e.g. `♻️ refactor(pr-tooltip) P2-3323: Unify click-pin behavior with keyboard and screen-reader access`.
- [ ] CI green: lint, Jest (`TIP-TEST-1`), build. Cypress (`TIP-TEST-2`, `TIP-TEST-3`) is local-only per `onecgiar-pr-client/CLAUDE.md` §9 — run and confirm green locally before merge, note in the PR description that Cypress was run locally (not CI-enforced).
- [ ] Manual QA per `TIP-T-6` (39-file sweep + screen-reader pass) completed and recorded before merge.
- [ ] No bilateral/platform-report payload touched — no change-log entry needed.
- [ ] No admin/role/phase change — no runbook update needed.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and the manual verification (`TIP-T-6`) is recorded.
- [ ] Promote `TIP-DD-2` (toggletip pattern over `role="tooltip"`) into `docs/ux-ui/design.md` §12 (Design Decisions) as the canonical pattern for any future tooltip-with-interactive-content — this is exactly the kind of reusable pattern that section exists to capture.
- [ ] File a follow-up for `docs/ux-ui/design.md` `OG-5` (no axe/Lighthouse a11y audit baseline) if the team wants to close that gap beyond this spec's one manual pass.
- [ ] `TIP-R-30` (optional `prTooltipCloseOnScroll` escape hatch) stays unimplemented — no site needed it during this spec's audit; revisit only if a future site's design requires close-on-scroll instead of follow-on-scroll.
- [ ] `TIP-OQ-1` (grey-box → info-icon conversion) stays open; would need its own proposal.

---

## 8. Roll-back plan

1. Revert the `TIP-T-1` directive commit (and any dependent commits from `TIP-T-2`–`TIP-T-6` merged in the same PR, in reverse order).
2. No migration to revert — pure client change.
3. No feature flag was introduced (matches how Part 1 shipped) — revert is the only rollback mechanism.
4. No bilateral/platform-report payload to verify post-revert.
5. No downstream consumer notification needed — front-end only, confirmed in `requirements.md` §9.

---

## Required cross-references

- `docs/specs/changes/tooltip-keyboard-accessibility/requirements.md`, `design.md` (same folder).
- `docs/ux-ui/design.md` §10, §12 (promotion target for `TIP-DD-2`).
- `onecgiar-pr-client/CLAUDE.md` §9 (Cypress CT is local-only; testing conventions this task list follows).
