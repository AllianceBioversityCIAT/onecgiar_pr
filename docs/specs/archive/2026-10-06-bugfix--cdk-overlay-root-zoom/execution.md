# Execution Log — CDK overlays stay anchored at every text size

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/cdk-overlay-root-zoom` · Bug · Lite |
| Approval Mode | `gated` |
| Branch | `qa-development-2026-ss` |
| Leader | Claude Code session (Opus 5.5) · Implementer `akili-implementer` · Reviewer `akili-reviewer` |
| Budget (design §11) | 2 tasks · ~130 LOC · ≤2 review rounds per task |

## Pre-flight (2026-10-06)

- `git status` on `onecgiar-pr-client/src/styles.scss`: clean, with no edits from another session.
- CT harness boots: the exemplar `program-overview.row-layout.cy.ts` gave 3/3 passing.
- Test-run handshake: peers `onecgiar-pr-31` (BELL) and `onecgiar-pr-eb` both answered "clear" before the run, and both got "done" after it. Free RAM was about 9.4 GB.

## Task Execution History

### COZ-T-1 — Regression CT spec (red on current code) · **PASS** · 2026-10-06

- **Attempts:** 1 (Implementer) · 1 (Reviewer)
- **Skills:** `angular-developer`, `spartan`, `tdd`, as listed in the task. Effort was `high`, raised from the `medium` default because measuring layout under CSS `zoom` is subtle.
- **Requirements covered:** COZ-R-1.S1, COZ-R-1.S2, COZ-R-2.S1, COZ-R-4.S1 (red-phase evidence) · design §8 "Regression spec harness", COZ-DD-3.

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/shared/services/cdk-overlay-root-zoom.cy.ts`, new, +122 lines. `styles.scss` is untouched.
- **Harness:**
  - **Host:** a standalone component with `hlm-popover` (`align="start"`, `sideOffset="6"`, `[attachTo]`=trigger). The trigger sits at 520/360 CSS px, and the viewport is 1600×1000.
  - **Scale check:** for each scale, the spec asserts that the effective root `zoom` equals the forced `--pr-font-scale`.
  - **Animation wait:** the spec waits for `data-state=open` and for `getAnimations().length === 0` before measuring.
  - **Measured element:** `.cdk-overlay-pane`.
- **Lint:** `npx ng lint --quiet --lint-file-patterns src/app/shared/services/cdk-overlay-root-zoom.cy.ts` printed "All files pass linting". Plain `npx eslint <file>` does not work in the client because there is no flat config; `ng lint` with a file pattern is the scoped equivalent.
- **Red run** (`npx cypress run --component --spec …/cdk-overlay-root-zoom.cy.ts`) on current code gave 1 passing and 4 failing. Values are in visual px:

| s | dx (want 0 ±1) | dy (want 6 ±1) | width (want 260·s ±2 %) | Result |
|---|---|---|---|---|
| 0.9 | −46.81 | −30.24 | 234.00 (234.00) | FAIL dx, dy |
| 1 | within ±1 | within 5..7 | within 2 % of 260 | PASS |
| 1.15 | +89.69 | +75.20 | 299.00 (299.00) | FAIL dx, dy |
| 1.3 | +202.80 | +162.22 | 338.00 (338.00) | FAIL dx, dy |
| 1.5 | +390.00 | +306.00 | 390.00 (390.00) | FAIL dx, dy |

  - **Drift:** about (s − 1) × the trigger's visual position, as the bug predicts. At 1.5 the trigger is at left 780 / bottom 594, and the pane is at left 1170 / top 900.
  - **Width:** exact at every scale. That confirms the COZ-R-2 baseline (content scales today), which T-2 must preserve.
  - **s = 1:** it passed, so Cypress printed no exact values. Only the in-tolerance result is on record (see the advisory below).
- **Reviewer verdict: PASS.**
  - **Summary:** the spec meets the T-1 scope and every disqualifier. It has a far-from-origin trigger checked in visual px, covers 5 scales, does not hard-code s = 1, and waits for the animation. The red/green pattern is the one the task demands.

#### Decisions

- **COZ-T-1-D1 · dy expectation = flat 6 visual px at every scale, not 6 × s.**
  - **Conflict:** tasks.md was internally inconsistent. It said "6 × s" but also "sideOffset is written on the box and must not be zoomed".
  - **Resolution:** requirements COZ-R-1.S1 ("designed offset … for example 6 px") and design §3 (the connected bounding box ends at zoom 1) settle it.
  - **Code check:** the Reviewer confirmed in `@spartan-ng/brain` `spartan-ng-brain-popover.mjs` L50-77 that `sideOffset` is mapped to CDK `offsetY` on a flexible connected strategy with `withPush(false)`.
  - **Falsifiable:** if T-2 lands at 6 × s, the s = 1.5 case reads 9, which fails.
- **COZ-T-1-D2 · width expectation = authored 260 CSS px × s,** an independent source rather than the s = 1 measurement.

#### ADVISORY (4R, non-gating, recorded only)

- **RELIABILITY · width check:** the width check uses 260 × s, but tasks.md specifies width(s=1) × s. The measured widths are exact, so in practice the two are equivalent. In theory, stacked tolerances could let up to about 4 % drift through.
- **RELIABILITY · s = 1 values:** the exact s = 1 dx/dy/width are not on record, because a passing test prints no values. If needed, they can be captured on the T-2 green run, where `cy.log` shows every case.
- **RELIABILITY · pane selector:** `Cypress.$('[data-cy="coz-content"]').closest('.cdk-overlay-pane')` would be more robust than `.cdk-overlay-pane.last()`.
- **READABILITY · NoopAnimationsModule:** it has no effect on Spartan's CSS animations. It is harmless, but a reader may misread it as what disables the animation.

#### Implementer "Not Done / Assumptions" — Leader adjudication

- **TS/primeicons errors from other specs and `ct-utils.ts` in the Cypress webpack log:** these pre-exist and are unrelated. They did not block the run, so no scope is owed.
- **No exact s = 1 values:** this is not T-1 scope. The DoD requires the failing values, which are recorded above. It is carried as an advisory.
- **Pane-level vs child-level re-zoom not yet distinguishable:** this is T-2 scope by design (§8 fallback).

#### Forward pointers → COZ-T-2

- Capture the exact s = 1 dx/dy/width from the green run's `cy.log` and record them here.
- The flat-6 dy expectation (COZ-T-1-D1) is what T-2 must turn green. If the fix yields 6 × s instead, revisit D1 rather than loosening the test.

#### Budget

1 of 2 tasks · 122 LOC so far, against ~100 budgeted for the CT spec · 1 review round. Within budget.

### COZ-T-2 — Counter-zoom the overlay container; green regression + manual matrix · **PASS (attempt 2)** · 2026-10-06

- **Skills:** `systematic-debugging` and `spartan`.
  - `tailwind-design-system` from the task list was dropped by the Leader, because the change is plain SCSS with no Tailwind tokens.
  - `spartan` was added for overlay internals.
- **Effort:** medium for attempt 1.
- **Test handshake:** both peer sessions answered "clear" before the CT runs and got "done" after them.

#### Attempt 1 — Reviewer FAIL (evidence gaps, no code defect)

- **Files changed:** `onecgiar-pr-client/src/styles.scss`, +14 lines after the `:root` block. The rules are `.cdk-overlay-container { zoom: calc(1 / var(--pr-font-scale, 1)) }` and `.cdk-overlay-pane > * { zoom: var(--pr-font-scale, 1) }`.
- **Pane-level re-zoom (COZ-DD-1) was tried first and rejected:**
  - Results: dx 0 at every scale, but dy = 6 × s. That is 7.80 at 1.3 and 9.00 at 1.5, which fails COZ-T-1-D1.
  - Cause: the pane carries the connected offset, so zooming it scales the offset.
  - The child-level fallback (COZ-DD-2) was adopted, per design §8 Fallback. The test was not loosened.
- **Green run** (child-level): 5/5 passing. Exact values, in visual px, close the T-1 forward pointer:

| s | dx | dy | width |
|---|---|---|---|
| 0.9 | 0.00 | 6.00 | 234.00 |
| 1 | 0.00 | 6.00 | 260.00 |
| 1.15 | −0.02 | 5.98 | 298.98 |
| 1.3 | 0.00 | 6.00 | 338.00 |
| 1.5 | 0.00 | 6.00 | 390.00 |

- **Falsifier:** the container rule was removed, giving 4/5 red. The values matched the T-1 red run exactly (1.5: dx 390, dy 306), and s = 1 stayed green. The rule was then restored.
- **Lint:** no stylelint is configured in the client.
- **Manual matrix (localhost:4200, viewport 960×444, DPR 2):**
  - **Stale-bundle check:** container computed zoom was 0.8696 at 1.15 and 0.6667 at 1.5.
  - **Topbar Help, Notifications and User menus at 1 and 1.5:** anchored. dy is 8 at both scales. Escape returns focus.
  - **Type filter at 1 and 1.5:** dx 0, dy 6.
  - **Funding and Result-type filters:** dx 0, dy 6 at 1.5 only.
  - **Notification sheet at 1.5:** right-docked and full height, but the left side is clipped by about 128 px. There was no no-fix comparison.
  - **AI-processes dialog** (right-docked, `h-dvh`): clipped vertically at 1.5. A no-fix emulation gave an identical rect.
  - **Tooltip:** not verified.
- **Reviewer: FAIL.** Verbatim issues:
  1. **No centred dialog in the matrix.** The claim that none is reachable is wrong: the global search palette (Ctrl+K, `hlm-dialog`, `w-[640px] max-w-[calc(100vw-32px)]`) and `unsaved-changes-dialog` are centred dialogs.
     - **Violated rules:** tasks.md T-2 matrix; design §8 Fallback ("re-run the COZ-R-3 matrix for R-1"); COZ-R-3.S1.
     - **Remediation:** measure the palette at 1 and 1.5 against a no-fix emulation, recording centre offset, width, fit, backdrop and Escape.
  2. **Sheet clipping at 1.5 has no no-fix comparison.**
     - **Violated rules:** COZ-R-3.S1 ("no clipping that does not happen at the same scale today"); DoD "no row worse than today".
     - **Remediation:** run the `!important` zoom-1 emulation at 1.5 and compare the rects.
  3. **Missing rows:** the tooltip at both scales, and the Funding and Result-type filters at s = 1.
     - **Violated rules:** tasks.md T-2 matrix; COZ-R-4; DoD "Manual matrix recorded at 1 and 1.5".
     - **Remediation:** use a taller viewport or scroll the host into view, then hover with a real pointer. Alternatively the Leader records an explicit waiver.
- **ADVISORY (READABILITY):** the comment says "re-zoom each pane", but the rule targets the pane's child, so a maintainer could revert it to the 6×s bug. The comment should say that the content is re-zoomed, not the pane, and why.
- **Leader adjudication:**
  - All three issues are in scope (T-2 matrix and DoD), so they consume attempt 2.
  - The comment fix is folded into attempt 2. It is the task's own diff, so this is no scope widening.
  - The choice of the COZ-DD-2 fallback over revisiting D1 is endorsed. A flat 6 visual px is the designed offset (COZ-R-1.S1), and the child-level rule passes all 5 scales.

#### Attempt 2 — Reviewer PASS

- **Effort:** bumped to high. No Cypress run was needed, so there was no handshake.
- **Files changed:** `onecgiar-pr-client/src/styles.scss`. Only the comment was reworded; it now says the pane's content is re-zoomed and the pane itself is not, because the pane carries the connected offset. The CSS rules are byte-identical to attempt 1. Final diff is +15.
- **Matrix additions:** rects are `[l, t, w, h]` in visual px. "No-fix" means `.cdk-overlay-container{zoom:1!important}.cdk-overlay-pane>*{zoom:1!important}` was injected, then removed.

| Row | Scale | With fix | No-fix | Verdict |
|---|---|---|---|---|
| Search palette (centred `hlm-dialog`), viewport 960×444 | 1 | [160, 167.5, 640×109.6], centre offset (0, 0.3) | n/a | centred, fits |
| Search palette | 1.5 | [0, 140.1, 952.5×164.4], centre offset (0.3, 0.3) | identical | centred, fits (`max-w` clamps the width); backdrop is full viewport and closes on click; Escape returns focus to Search |
| Contribution sheet, viewport 1280×652 (`isWide` patched in-page to open the drawer) | 1 | [552.5, 0, 720×652.5] | n/a | docked; Escape returns focus to the row |
| Contribution sheet | 1.5 | [192.5, 0, 1080×652.5] | identical | docked, full height, no clipping. The 960-px clipping in attempt 1 is from the sheet's width and is the same today |
| Sidebar `hlmTooltip` ("Results Center"), real pointer | 1 | gapX 8, centreDy 0 | n/a | anchored |
| Sidebar `hlmTooltip` | 1.5 | gapX 8, centreDy 0, content 1.5× | gapX 47.9, centreDy 299.2 | the fix corrects the drift |
| Funding filter | 1 | dx 0, dy 6 | n/a | COZ-R-4 holds |
| Result-type filter | 1 | dx 0, dy 6 | n/a | COZ-R-4 holds |

- **Screenshots:** in `%TEMP%\claude-chrome-screenshots-6R0N6r\`.
  - Attempt 1:
    - menus at 1.5: `screenshot-1791288914392-0`, `-1791288914394-1`, `-1791288914395-2`;
    - filter at 1.5: `screenshot-1791289068088-3`;
    - sheet: `screenshot-1791289134770-4` (s 1) and `screenshot-1791289172675-6` (s 1.5);
    - dialog at 1.5: `screenshot-1791289305051-9`.
  - Attempt 2:
    - palette at 1.5: `screenshot-1791289717523-12`;
    - sheet at 1.5: `screenshot-1791290138768-13`;
    - tooltip at 1.5: `screenshot-1791290349841-15`.
- **Reviewer: PASS.**
  - **Summary:** the child-level fallback is the sanctioned COZ-DD-2 path, and the T-1 spec failing is what triggered it. The regression spec is green at all 5 scales and goes red again when the fix is removed. The manual matrix is complete at 1 and 1.5, with no-fix comparisons for the dialog, sheet and tooltip. No row is worse than today.
  - **Advisory:** resolved by the comment reword.
- **Implementer "Not Done / Assumptions": Leader adjudication.** None of these is outstanding scope:
  - **960-px sheet not re-run with no-fix:** covered by the identical 1080 width in the 1280 run.
  - **s = 1 pre-fix baseline:** both rules compute to zoom 1 at s = 1, which is an identity, and the T-1 s = 1 pass confirms it.
  - **DD-11 amendment:** recorded below.

#### Requirements covered

COZ-R-1.S1/S2, COZ-R-2.S1, COZ-R-3.S1, COZ-R-4.S1, COZ-NFR-1 (one global stylesheet) and COZ-NFR-2 (Escape and focus restore checked on the menus, palette, sheet and dialog).

#### Decisions

- **COZ-T-2-D1 · Child-level re-zoom (`.cdk-overlay-pane > *`) replaces the designed pane-level rule (COZ-DD-1 → COZ-DD-2 fallback).**
  - **Evidence:** pane-level zoom gave dy = 6 × s.
  - **Risk R-1 is closed** two ways:
    - by code inspection: no `panelClass` or CDK width/maxWidth consumers exist, and `HlmDialogService.contentClass` lands on the pane child;
    - empirically: the centred palette, the sheet and the dialog are identical to no-fix.

## DD-11 amendment — PENDING (apply on `staging`, per COZ-DD-4 / shared-file write discipline)

Target: `docs/ux-ui/design.md` DD-11 (text-size control, root `zoom`). Add after the existing rationale:

> **CDK overlays (bugfix/cdk-overlay-root-zoom, 2026-10-06):** root `zoom` must not apply to the CDK overlay positioning space. The CDK measures triggers in visual px and writes positions inside the zoomed tree, so they would be applied twice and overlays would drift by (s − 1) × the trigger's distance from the origin. `styles.scss` therefore sets `.cdk-overlay-container { zoom: 1 / s }` and re-applies `zoom: s` to `.cdk-overlay-pane > *`. It targets the content, not the pane, because the pane carries the connected offset. Overlay content still scales with the text size; positions and the `sideOffset` stay in visual px. Any new global overlay rule must preserve this pair.

## Constitution Impact

None. No module was created or reshaped and no public surface changed. The two global CSS rules sit next to DD-11, and the client `styles.scss` comment documents them.

## Summary — all tasks complete (2026-10-06)

| Task | Result | Attempts | Review rounds |
|---|---|---|---|
| COZ-T-1 Regression CT spec | PASS | 1 | 1 |
| COZ-T-2 Counter-zoom fix + matrix | PASS | 2 (attempt 1 FAIL on matrix evidence gaps, no code defect) | 2 |

- **Budget:** 2 of 2 tasks. About 137 code LOC (CT spec 122 + CSS 15), against ~130 budgeted. Review rounds were within ≤2 per task. Within budget.
- **Still open, outside execute (tasks.md §6 and §7):**
  - commit on the user's go-ahead;
  - tell the `bell-quick-inbox` session;
  - manual QA on the test env at text size Large;
  - apply the DD-11 amendment on `staging`;
  - `program-overview` missing `attachTo` as a separate quick fix.
- **Out-of-scope observation, recorded only:** the AI-processes dialog (`position: fixed`, `h-dvh`) is clipped vertically at 1.5 on a short viewport. The clipping is the same with no fix, so it pre-dates this spec.
