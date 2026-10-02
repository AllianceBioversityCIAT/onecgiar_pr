# ICM-T-1 · attempt 2 · Reviewer report (verbatim, ISSUES + ADVISORY)

STATUS: FAIL

The previous FAIL (`icm-t1-a1.md` item 1) is closed in both files. One new Cypress-only defect could still make every probe case go red for the wrong reason, both before and after T-2.

ISSUES:
1. **Discovered Issue:** The centering check in `probeDialogStacking` (diff L206-211) uses `Cypress.config('viewportWidth')`. That is the configured default, 1280 (`cypress.config.js:178`). `cy.viewport()` changes the size of the app's window but, as far as I know, not that config value. I could not run Cypress here to prove it. If I am right:
   - At 1440 the gaps are left = 216 and right = 1280 − 1224 = 56.
   - At 1100 they are left ≈ 27.5 and right ≈ 207.5.
   - Centering runs before any probe, so every Step 2.1 case and AC-6 would go red on centering, today and after T-2. That is exactly the "red for the wrong reason / can never pass" class item 1 targeted.
   - The snippet does it correctly (`window.innerWidth`), so the two files disagree. The Leader's harness runs exercised only the snippet, so they do not cover this.
   - The repo already warns about this: `login.component.cy.ts:68-93`, `my-work-board.cy.ts:412` and `viewport-page.recipe.cy.ts:90` all measure `win.innerWidth` / `clientWidth` rather than trusting the requested size.
   * **Violated Rule:** `tasks.md` ICM-T-1 → Verification → *Red run*: "the expected failure is the `panel.contains(el)` assertion for probe (a) or (c), with the precondition step green". Also `tasks.md` ICM-T-2 DoD: "T-1 green (4 combinations + AC-5 + AC-6)".
   * **Remediation:**
     - Measure the width at run time instead: centre against the `.pr-dialog-mask` rect, or `doc.documentElement.clientWidth`. That rect is what the mask's flex actually centres in, so it is also safe if a scrollbar gutter appears (the login spec measured 15px in this Cypress setup).
     - Add a guard `expect(win.innerWidth).to.eq(viewport.width)`, the same pattern as `my-work-board.cy.ts:412`.
     - Optionally move the centering assert after probes (a)–(d), so a red on today's code is always attributed to a stacking probe.

ADVISORY:
- **AC-6 probe (b), likely n/a.** Rough panel height is title ~40 + `min-height: 500` − ~10 for the buttons ≈ 530px. At 700px tall that puts its top at ≈ 85, below a 56px header (`--pr-shell-header-height`), unless the test-env banner is enabled inside `.app-shell-header`. The comment at L345 says (b) evaluates. The guard still passes on (a), and no overlap means the header cannot paint over the panel, so this is not a gate. Correct the comment to "(b) n/a unless the header is taller than ~85px".
- **1440 collapsed red attribution.** With (a) n/a and no banner, the × centre (y ≈ 45 + 15 + 14 ≈ 74) sits below the header, so the red comes from (b), not "(a) or (c)" as `tasks.md` §Red run says. Record that in `execution.md` when the red run is pasted.
- **Animation wait timeout.** `waitForSectionContainerAnimations` needs at least one `.section_container`. If there is none it times out on a precondition. That is acceptable, but log it clearly.
- **Snippet guard order.** The "still playing" check runs before the sidebar/header precondition checks. This is harmless.
- **Advisory-grade items, all present:** animation wait, `[data-slot="sidebar-container"]` rect, `.pr-dialog__header`/panel rect for (b), AC-5 `scrollY > 0` → INCONCLUSIVE. AC-5 wraps `scrollTo` in its own `cy.window().then`, so the scroll is applied before it is checked.
