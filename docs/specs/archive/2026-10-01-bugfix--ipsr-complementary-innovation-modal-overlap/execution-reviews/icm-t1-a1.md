# ICM-T-1 · attempt 1 · Reviewer report (verbatim)

STATUS: FAIL

ISSUES:
1. **Discovered Issue:** Two cases in the Cypress suite can never pass. After T-2 they will stay red, and on today's code they go red on a precondition, not on the behavioral assertion. `probeDialogStacking` hard-asserts `expect(pointA).to.not.equal(null)` and `expect(pointB).to.not.equal(null)`. The geometry rules that out in two places, measured from source:
   - **1440×900, sidebar collapsed (Step 2.1):** the panel is `70vw` = 1008px wide (`new-complementary-innovation.component.scss:12`), centered by the mask's flex (`pr-dialog.component.scss:7-9`). So `left` = 216px. The rail is 64px (`app.component.html:11`, `sidebarWidthIcon="64px"`). The two rects never meet, so probe (a) is always null.
   - **ICM-AC-6, Step 4 "Add partner", 1440×900:** the panel is about 700px wide (`step-n4-add-partner.component.scss:25-26`, `max-width: 700px`), so `left` ≈ 370px, which is past the 260px expanded sidebar. Probe (a) is always null. The panel is also short (`min-height: 500px` + title + buttons ≈ 540–560px) and vertically centered, so its top ≈ 170px. That is below the header's bottom edge, so probe (b) is almost certainly null too.

   The snippet handles this correctly (it reports `n/a`). The Cypress file does not, so the two artifacts disagree.
   * **Violated Rule:** `tasks.md` ICM-T-1 → Verification → *Red run* ("the expected failure is the `panel.contains(el)` assertion for probe (a) or (c), with the precondition step green"). `tasks.md` ICM-T-2 → DoD ("T-1 green (4 combinations + AC-5 + AC-6)"): T-2 cannot meet it. Brief item 2 (empty intersection → n/a).
   * **Remediation:**
     - In Cypress, treat an empty intersection the way the snippet does: `cy.log('probe (x): n/a — no overlap')`, never pass and never fail.
     - Add a guard so a test fails as INCONCLUSIVE when none of (a), (b) or (c) was evaluated. Then a run cannot go green on (d) plus centering alone.
     - Escalate to the Leader/user. As written, AC-2 at 1440 ("same three checks over the icon rail") and AC-6 at 1440 ("probes over the sidebar and header resolve to the panel") cannot be satisfied with these panel sizes. Either amend them, or move the AC-6 run to 1100×700, where the ~700px panel (left ≈ 200) does overlap the 260px sidebar, and record which probes are n/a for each case.

ADVISORY:
- RELIABILITY: The probes run right after the click. `.section_container` keeps animating for 1s after it mounts, and the trap still applies while it runs (design §13). So after T-2 a fast run can go red for the wrong reason. Wait for `document.getAnimations()` on the `.section_container` ancestors to finish before probing.
- RELIABILITY: Snippet: when every row except centering is `n/a`, the overall result is `ICM-PROBE PASS`. That is a pass resting on zero stacking probes. Add the same INCONCLUSIVE guard as above.
- READABILITY / RELIABILITY: `HEADER_ROW_HEIGHT = 56` is a hard-coded pixel. It does not make the probe point wrong (the point stays inside panel∩header), but it bypasses "rects only". Use the `.pr-dialog__header` rect when it exists, or just panel∩header.
- RELIABILITY: The rects come from the `hlm-sidebar` host, which is in-flow and stretches to page height, not from the painted fixed box `[data-slot="sidebar-container"]` (`hlm-sidebar.ts:47,81`). The two match only while the page is unscrolled. Use the container.
- RISK (coverage): The R-1 clause "mask dims … the header too" is only probed on the sidebar. A header point outside the panel → mask probe would close it. Not required by `tasks.md` step 2.
- RISK (scope): The snippet ships as `ipsr-modal-probe.js`, while `tasks.md` step 5 says to put it in `execution.md`. That is acceptable if `execution.md` points to the file and holds the pasted before/after outputs.
- AC-5 does not check that the page actually scrolled (`scrollY > 0`). On a short page it passes without testing anything.

Verified at source:
- **Hooks:** `data-testid="add-complementary-innovation"` (`new-complementary-innovation.component.html:3`), `data-guide="sidebar-toggle"` (`reporting-nav-sidebar.component.html:46,82`, both inside `hlm-sidebar`), `hlm-sidebar[data-state]` (`hlm-sidebar.ts:15`), `.app-shell-header` (`app.component.html:17`), `.pr-dialog`, `__close` and `-mask` (`pr-dialog.component.html:2-13`), the "Add partner" `pr_button`, and `[showHeader]="false"` on Step 4 (`step-n4-add-partner.component.html:2,30`).
- **Header fold:** `appChromeFold` is driven only from result-detail, so the IPSR header does not fold (AC-5 is safe).
- **Clean diff:** no tokens or secrets, and no `src/` change.
- **Snippet contract:** generic over the last open `.pr-dialog-mask`, one `console.table`, one verdict line, plus an extra `ICM-PROBE context:` line, which is acceptable.

The geometry claims above come from the CSS, not from a browser run. One authenticated run of the snippet at 1440 collapsed would confirm them.
