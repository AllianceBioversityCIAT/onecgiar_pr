# Tasks — IPSR modals hidden behind the sidebar and header

> **Answer first:** 2 tasks. **T-1** adds a real-browser regression test and watches it fail on today's code. **T-2** adds the one-rule fix in `ipsr.component.scss`, turns T-1 green and runs a visual pass. Single PR, ~100 LOC.

## 1. Scope of this task list

- **Module / feature:** ipsr · Step 2.1 complementary-innovation modal and every IPSR `app-pr-dialog`
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Owner / driver:** Maria Camila Giraldo
- **Status:** approved 2026-10-01 · in-progress (T-1 done)
- **Branch:** `qa-development-2026-mc-2`

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-10-01; `ICM-OQ-1`, `ICM-OQ-2` resolved)
- [x] `design.md` approved (2026-10-01)
- [x] No server, CLARISA or migration surface
- [x] No conflicting in-flight spec on `pr-dialog` / IPSR stacking (`ls docs/specs/ipsr docs/specs/bugfix` reviewed: `ipsr/step3-evidence-modal-impact-alerts` touches modal content, not stacking)
- [ ] P-9 settled (T-1 first step)

## 3. Task list

### `ICM-T-1` — Regression test: IPSR modal must be the topmost element over the chrome (red)

- **Status:** `[x]` PASS 2026-10-01 on attempt 4 (user-authorized after the HALT; see `execution.md`)

- **Type:** tests
- **Description:**
  1. **First step: settle P-9.** Confirm a Cypress `userToken` exists (`test -f onecgiar-pr-client/cypress.env.js` plus a non-empty `userToken`, checked as a boolean and **never printed**, per `.cursorrules`). Confirm that result `9657` / phase `37` opens Step 2.1 and Step 4 on `localhost:4200`. Record the outcome in `execution.md`.
  2. Add `onecgiar-pr-client/cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts` using `cy.loginByToken(url)` and `describeWithToken`. For each of 2 viewports (1440×900, 1100×700) × 2 sidebar states (expanded; collapsed via `[data-guide="sidebar-toggle"]`, state read from `hlm-sidebar[data-state]`):
     - open Step 2.1
     - click `[data-testid="add-complementary-innovation"]` and assert `.new-complementary-innovation-dialog` and its `.pr-dialog__close` are visible (precondition, so a red cannot be a timeout)
     - read the rects of the sidebar, `.app-shell-header` and the panel, then probe `document.elementFromPoint` at (a) a panel point inside the sidebar rect, (b) a panel top-row point inside the header rect, (c) the `×` center. Each probe must resolve to an element inside the panel (`panel.contains(el)`), and (c) must resolve to the `×` or its icon. Also probe (d): a sidebar point **outside** the panel must resolve to `.pr-dialog-mask`, which proves the mask dims the chrome
     - check centering: `|panel.left − (innerWidth − panel.right)| ≤ 2`
     - click `×` and assert the dialog is gone
  3. Add `ICM-AC-5`: with the modal closed and the page scrolled, the probe at a header point resolves inside `.app-shell-header`.
  4. Add `ICM-AC-6`: Step 4 "Add partner" modal, 1100×700 (amended 2026-10-01), sidebar expanded, probes (a), (b), (d) + centering; (c) `n/a` (no header by design, `ICM-AC-6` as amended 2026-10-01).
  5. **Fallback if P-9 is refuted:** do not write a skipped suite and call it evidence. Add the same probes as a DevTools snippet in `execution.md`. The user runs it in their authenticated browser at the HITL pause, before and after T-2, and both outputs are pasted.
- **Implements:** `ICM-R-1` (both scenarios), `ICM-R-2`, `ICM-R-3`, `ICM-R-5` (header clause), `ICM-AC-1..6`
- **Files (expected):** `onecgiar-pr-client/cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts`; `docs/specs/bugfix/ipsr-complementary-innovation-modal-overlap/execution.md`
- **Depends on:** —
- **Blocks:** `ICM-T-2`
- **Estimate:** M
- **Review:** `checklist` — new test file only; no shared symbol changes
- **Verification:**
  - **Falsifier:** on current code (`e094b6162`), probe (a) returns an element inside the sidebar and (c) does not return the `×`. If the test passes on current code, the probes are wrong (for example probing outside the sidebar rect, or at a viewport where the sidebar is hidden below `md`).
  - **Red run:** `cd onecgiar-pr-client && npx cypress run --e2e --spec cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts` → the expected failure is the `panel.contains(el)` assertion for probe (a) or (c), with the precondition step green.
  - **Disqualifier:** the run reports the suite **pending/skipped** (no token → `describe.skip`) or `0 passing, 0 failing`. That is no evidence: report it and switch to the step 5 fallback. A red that comes from login, a visit timeout or a missing `data-testid` is also not a red.
  - **Consumers:** none (new file; reads existing hooks `data-testid="add-complementary-innovation"`, `data-guide="sidebar-toggle"`, `.app-shell-header`, `.pr-dialog__close` without changing them)
- **Definition of done:**
  - [ ] P-9 outcome recorded in `execution.md`
  - [ ] Red observed on the behavioral assertion (output pasted in `execution.md`), or the fallback snippet's "before" output pasted
  - [ ] No secret printed or committed (`cypress.env.js` stays untracked)
  - [ ] `npx ng lint --quiet` clean
- **Skills:** `angular-developer`, `systematic-debugging`

### `ICM-T-2` — Release the retained fade on IPSR `.section_container` (green)

- **Status:** `[x]` PASS 2026-10-01 (Reviewer PASS + user HITL OK)

- **Type:** client
- **Description:** In `onecgiar-pr-client/src/app/pages/ipsr/ipsr.component.scss`, add a host-scoped deep rule that sets `animation-fill-mode: backwards` on `.section_container`, with a short comment that cites this spec and the reason (a retained opacity animation creates a stacking context that traps `app-pr-dialog`). Do not use `!important`. Change nothing else. Then:
  1. Run T-1: it must be green in all 4 combinations, plus AC-5 and AC-6.
  2. Do the HITL visual pass on `localhost:4200`, sidebar expanded and collapsed. Each page must look the same as before (fade-in on load, no overlap with the header). Pages to check: IPSR list with the filters popover, creator, Step 1 (institutions grid, innovation use), Step 3 (current use, evidence modal), contributors (the "Other contributors" label and the sticky block), and Step 4 add-bilateral/add-project modals.
- **Implements:** `ICM-R-1..5`, `ICM-DD-1`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/ipsr/ipsr.component.scss`
- **Depends on:** `ICM-T-1`
- **Blocks:** —
- **Estimate:** S
- **Review:** `full` — it changes a shared-state condition (stacking context) read by 10 modals and 16 + 9 in-page z-indexed elements (design P-6, P-7)
- **Verification:**
  - **Falsifier:** revert the rule (or set it to `both`) → T-1 goes red again at probe (a)/(c). If T-1 stays green with the rule reverted, the test is not measuring the trap. The input that would make the fix itself fail is a third trapping ancestor the rule does not reach: probe (a) still returns the sidebar after T-2.
  - **Red run:** the T-1 command, green after T-2 and red again with the rule temporarily reverted (both outputs in `execution.md`).
  - **Disqualifier:** T-1 green but the visual pass shows any element ≤ z-29 over the header, a reordered inner section, or a lost fade-in → stop and re-specify (Pivot Protocol). Also stop if a green T-1 run shows pending/skipped tests. Environment path that could make it pass for the wrong reason: a stale dev-server bundle. Confirm the served CSS contains the rule (DevTools → computed `animation-fill-mode: backwards` on both `.section_container` ancestors) before reading T-1.
  - **Consumers:** `innovation-package-creator.component.spec.ts:290` (queries `.section_container`, unaffected); `cypress/e2e/result-detail/save-validation.cy.ts` (outside IPSR, unaffected). Run the creator spec plus the `pr-dialog`, `new-complementary-innovation` and `complementary-innovation*` specs. No test pins `animation-fill-mode` (design P-8).
- **Definition of done:**
  - [ ] T-1 green (4 combinations + AC-5 + AC-6), and red with the rule reverted
  - [ ] `npx jest --silent --reporters=summary --no-coverage src/app/pages/ipsr src/app/shared/components/pr-dialog` green
  - [ ] `npx ng lint --quiet` clean
  - [ ] HITL visual pass recorded (pages listed above, both sidebar states)
  - [ ] Commit: `🔧 fix(ipsr): release retained fade so IPSR modals sit above the shell chrome` (+ Cypress spec)
- **Skills:** `angular-developer`, `tailwind-design-system` (styling-rule check only)

### `ICM-T-3` — Add a `×` to the 6 header-less IPSR modals (added 2026-10-01, Pivot)

- **Status:** `[~]` partial 2026-10-01. `ICM-R-6` (`×` on the 6 modals) is done: Reviewer PASS and user HITL for Step 4. `ICM-R-7` / `ICM-AC-8` ("Add project" buttons) are **deferred by the user** after 3 attempts; see `execution.md` → Deferral
- **Type:** client
- **Description:**
  1. In the shared `app-pr-dialog` (`shared/components/pr-dialog/`), add an **opt-in** boolean input `floatingClose`, default `false`. When it is true and `showHeader` is false, render the existing `.pr-dialog__close` button (same markup, `aria-label="Close"`, calls `hide()`) absolutely positioned in the panel's top-right corner. With the default, the output is unchanged for every consumer.
  2. Set `[floatingClose]="true"` on exactly the 6 modals: `ipsr-submission-modal`, `ipsr-unsubmit-modal`, `step-n4-add-bilateral`, `step-n4-add-partner`, `step-n4-add-project`, `step-n4-edit-bilateral`.
  3. Add a Jest spec for `PrDialogComponent`: no floating `×` by default; with `floatingClose` + `showHeader=false` there is exactly one `×`, and clicking it emits `visibleChange(false)` and `onHide`; with `showHeader=true` the header `×` stays and no floating one is added.
  5. **(Pivot 2, `ICM-R-7`)** In `step-n4-add-project.component.scss`, change `.buttons` from `position: fixed` to `position: absolute` (the panel is already `position: relative` via `::ng-deep app-pr-dialog .step-n4-add-project-dialog`). Keep `bottom: 15px; right: 20px`. Verification is the HITL check plus a DevTools rect read: both button rects inside the panel rect, at 1440×900 and 1100×700. jsdom cannot measure layout. Falsifier: with `fixed`, the button rects sit outside the panel (the user's screenshot, 2026-10-01).
  4. Extend the existing zoneless specs of the 3 Step 4 modals (`step-n4-add-partner`, `-add-bilateral`, `-add-project`) with a real-template check: the open modal contains exactly one `.pr-dialog__close`.
- **Implements:** `ICM-R-6`, `ICM-AC-7`, `ICM-AC-6` (c) after T-3, `ICM-R-7`, `ICM-AC-8`
- **Files (expected):** `shared/components/pr-dialog/pr-dialog.component.{ts,html,scss}`, new `pr-dialog.component.spec.ts`, the 6 modal templates, the 3 Step 4 zoneless specs
- **Depends on:** `ICM-T-2`
- **Estimate:** S
- **Review:** `full` — shared component (45 consumers), opt-in
- **Verification:**
  - **Falsifier:** remove `[floatingClose]="true"` from `step-n4-add-partner` → its zoneless check goes red (0 `×`). Flip the input's default to `true` → the "no floating `×` by default" Jest test goes red.
  - **Red run:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage src/app/shared/components/pr-dialog src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n4` → red before the change, on the `×` assertions; green after.
  - **Disqualifier:**
    - Jest cannot see overlap with the title or coverage by the chrome. Those are checked with the DevTools probe (c) on add-partner and the HITL visual pass on all 6. A Jest-only green is not evidence for "no overlap".
    - A `×` appearing on any modal outside the 6 means the change was not opt-in. Stop.
  - **Consumers:** `PrDialogComponent` is used by 45 templates (`grep -rln "<app-pr-dialog" --include='*.html' src/app` → 45). None passes `floatingClose`, so their output is unchanged. Jest suites that mount `app-pr-dialog`: `complementary-innovation.zoneless.spec.ts`, the 3 Step 4 zoneless specs, `retrieve-modal.zoneless.spec.ts`, `share-request-modal.zoneless.spec.ts`. Run them all.
- **Definition of done:**
  - [ ] Jest red → green (output in `execution.md`)
  - [ ] All consumer suites above green; `npx ng lint --quiet` clean
  - [ ] DevTools probe on add-partner after T-2 + T-3: (c) evaluated and passing
  - [ ] HITL visual on all 6 modals: `×` visible, no overlap with the title, closes the modal
  - [ ] "Add project": both buttons inside the panel at 1440×900 and 1100×700 (`ICM-AC-8`)
- **Skills:** `angular-developer`, `tailwind-design-system`

## 4. Dependency graph

```
ICM-T-1 (regression test, red)
   └── ICM-T-2 (fix → green, visual pass)
         └── ICM-T-3 (× on the 6 header-less modals — Pivot 2026-10-01)
```

No parallel branches.

## 5. Test plan & coverage closure

| Clause | Owner | Test / check |
|---|---|---|
| R-1 · Scenario *Sidebar expanded*: panel over sidebar · over header · mask dims chrome · BUT no part under chrome | T-1 / T-2 | probes (a), (b) at 1440 + 1100; "mask dims chrome" = the probe at a sidebar point **outside** the panel resolves to `.pr-dialog-mask` |
| R-1 · Scenario *Sidebar collapsed* | T-1 / T-2 | same probes, collapsed state |
| R-2 · `×` closes and resets · AND IT MUST be the `×` that receives the click | T-1 | probe (c) + click `×` → dialog gone; reset covered by the existing `new-complementary-innovation` Jest spec (`onHide → resetAll`) |
| R-3 · centered, gaps ≤ 2px, whole panel unobstructed | T-1 | centering check + probes (a)–(c) |
| R-4 · Escape / mask click close | T-2 | existing `pr-dialog` Jest specs (unchanged component) |
| R-4 · size / scroll unchanged · BUT DOM not moved out of `app-pr-dialog` | T-2 | diff touches only `ipsr.component.scss` (Reviewer checks); HITL visual |
| R-5 · fade-in unchanged | T-2 | HITL visual (human check; not automatable here, `requirements.md` §9) |
| R-5 · z ≤ 29 content under the header | T-1 (AC-5) | header probe while scrolled |
| R-5 · z ≥ 30 overlays MAY overlap the header | T-2 | HITL visual (expected behavior, recorded) |
| R-5 · inner z-index order kept | T-2 | HITL visual on the P-7 pages |
| AC-6 sibling modal (`×` n/a, amended 2026-10-01) | T-1 / T-2 | Step 4 "Add partner" probes (a), (b), (d) + centering |

## 6. Rollout & verification

- [ ] One PR against `staging` with the commit convention
- [ ] CI green (lint, Jest, build). The Cypress suite is token-gated in CI, so local evidence is in `execution.md`
- [ ] Manual QA on prtest after deploy: the reported URL with the sidebar open and closed

## 7. Cleanup & follow-ups

- [ ] Spec status → `shipped`
- [ ] File a follow-up for the same trap outside IPSR (`design.md` §13: `transitions.scss`, 32 templates)

## 8. Roll-back plan

1. Revert the T-2 commit (one SCSS rule). No data, API or migration impact.

## Required cross-references

- `requirements.md`, `design.md` (same folder) · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md`
