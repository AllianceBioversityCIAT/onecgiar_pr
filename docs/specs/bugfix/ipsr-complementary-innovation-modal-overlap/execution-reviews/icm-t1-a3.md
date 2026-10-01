# ICM-T-1 · attempt 3 · Reviewer report (verbatim ISSUES)

STATUS: FAIL — both prior FAILs closed (a1 item 1, a2 item 1). No case is permanently red after T-2. No `src/` change, no secrets.

ISSUES:
1. **Discovered Issue:** On current code, the Step 2.1 cases go red on the `×` visibility precondition, not on a stacking probe.
   - **Where:** `probeDialogStacking` (helpers L346-349) runs `cy.get(`${panelSelector} ${DIALOG_CLOSE}`).should('be.visible')` before any probe.
   - **Why:** Cypress treats an element inside a `position: fixed` ancestor (`.pr-dialog-mask`) as not visible when something covers it. The R-2 defect is exactly that the sidebar or header covers the `×`. So whenever the `×` is covered, the assertion retries for 10s and times out.
   - **Proof:** the Leader's non-author TRAPPED run timed out exactly that way, and the user's real-app run shows (c) failing.
   - **Consequences:**
     - Probe (a), the falsifier's first claim ("(a) returns an element inside the sidebar"), never runs in those cases.
     - The Cypress red and the snippet red (`FAIL: a, b, c, d`) point at different checks.
     - The helper's own docstring ("a red here is always the behavioral assertion, never a timeout") is false.
   - **Is this a true red?** It is red for the right reason, because the covered `×` is the defect, and it is not one of the Disqualifier's examples (login, visit timeout, missing testid). But it is a 10s-timeout red in the exact place the spec requires to be green. A plain "expected to be visible" timeout also cannot be told apart from "the dialog never rendered its header", which is the ambiguity the clause exists to prevent.
   - **Root cause in the spec:** `tasks.md` step 2 asks for the `×` to be asserted "visible", and the *Red run* clause asks for that precondition to be green on the bug state. Under Cypress's visibility rules both cannot hold. The Implementer followed step 2 literally.
   * **Violated Rule:** `tasks.md` ICM-T-1 → Verification → *Red run*: "the expected failure is the `panel.contains(el)` assertion for probe (a) or (c), with the precondition step green". Also step 2: "(precondition, so a red cannot be a timeout)".
   * **Remediation:** fix it in code, about 3 lines.
     - In the helper, replace the `×` precondition with an existence-and-layout check that ignores what covers it:
       `cy.get(`${panelSelector} ${DIALOG_CLOSE}`).should($c => { expect($c.length, 'PRECONDITION: × rendered').to.eq(1); expect($c[0].getClientRects().length, 'PRECONDITION: × laid out').to.be.gt(0); });`
     - Keep `cy.get(panelSelector).should('be.visible')`. The panel's center (x ≈ 550–720) is never under the sidebar or header, so Cypress's coverage check cannot time out there.
     - Then the red lands on probe (a), `expected false to equal true` (or on (b)/(c) at 1440 collapsed), and the precondition stays green.
     - Fix the docstring so it matches.
     - Re-run the Leader's TRAPPED harness. The expected red is the `probe (a)` message.
     - Alternative, if the Leader wants to avoid the HALT: amend *Red run* at the spec level to accept "`×` not visible, covered by `hlm-sidebar`/`.app-shell-header`" as equivalent to probe (c). I do not recommend it, because it leaves probe (a), the falsifier's first half, unexercised in Cypress.

ADVISORY:
- RELIABILITY: Record the red attribution at 1440 collapsed in `execution.md`. With (a) n/a, the red comes from (b), or from (c) if the `×` sits under the header.
- READABILITY: The helper header still points at `cypress/e2e/zz-icm-helper-selfcheck.cy.ts`, but that spec was deleted. Drop the reference.
- READABILITY: The snippet centres on `innerWidth` and Cypress centres on the mask rect. They are equivalent when there is no scrollbar gutter. Note it in one line so the two artifacts are not later "fixed" back toward each other.
- RISK: Even after the remediation, the Cypress suite gives no evidence until a token exists. The T-1 DoD red is currently met only by the fallback snippet's "before" output, which is correctly recorded.
