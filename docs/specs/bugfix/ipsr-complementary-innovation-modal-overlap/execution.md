# Execution — IPSR modals hidden behind the sidebar and header

## Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/ipsr-complementary-innovation-modal-overlap` |
| Branch | `qa-development-2026-mc-2` (base `e094b6162`) |
| Approval mode | gated (no proposal; every gate asks the user) |
| Leader | Claude Opus 5.5 (T1) |
| Implementer / Reviewer | `akili-implementer` / `akili-reviewer` wrappers (`.claude/agents/`) |
| Budget (design §12) | 2 tasks · ~100 LOC · 1 review round |
| Started | 2026-10-01 |

### Environment pre-check (Step 2.1)

- `localhost:4200` → HTTP 200, served from this worktree (`lsof -iTCP:4200 -sTCP:LISTEN` → cwd `qa-development-2026-mc-2/onecgiar-pr-client`).
- **P-9 refuted:** `onecgiar-pr-client/cypress.env.js` is missing (`test -f`), so there is no Cypress `userToken` and `describeWithToken` would skip the suite. The user had stated the token was configured, and was told the file is absent.
- **User decision (2026-10-01): "Plan B: DevTools".** The Cypress spec is still written (for CI and future token runs). The red/green evidence comes from the DevTools probe snippet, which the user runs in their authenticated browser before and after T-2.

## Task Execution History

### ICM-T-1 — Regression test (red) · status: in progress (`[~]`) · 2026-10-01

**Attempt 1** — Implementer `akili-implementer` (T2, effort medium). Skills: `angular-developer` (the task's `systematic-debugging` was dropped: the root cause was already confirmed at specify time).

- **Files:** `onecgiar-pr-client/cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts` (new, 252 lines) · `docs/specs/bugfix/ipsr-complementary-innovation-modal-overlap/ipsr-modal-probe.js` (new, 155 lines).
- **Implementer verification:**
  - `npx ng lint --quiet` → `All files pass linting.`
  - `npx cypress run --e2e --spec cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts` → `Tests: 6 Passing: 0 Pending: 6`. This is pending, so it is **not evidence** (disqualifier).
  - `npx tsc -p cypress/tsconfig.json --noEmit` → 435 errors, all pre-existing in kind. The exemplar `sidebar-collapse.cy.ts` shows the same global-type errors under bare `tsc`. No new error class.
  - Headless self-check (fragment, logic only): trapped → `ICM-PROBE FAIL: a, b, c, d`; fixed → `ICM-PROBE PASS`.
- **Evidence re-run (Leader inline, non-author): VERIFIED.** The Implementer's harness ran an inlined *copy* of the snippet, not the shipped file (`repo snippet verbatim in harness: False`). The Leader re-ran both harnesses loading the **shipped** `ipsr-modal-probe.js` via `<script src>`:
  - trapped → `ICM-PROBE context: viewport=1440x813 sidebarState=expanded panel=div#panel.pr-dialog | ICM-PROBE FAIL: a, b, c, d`
  - fixed → `ICM-PROBE PASS`
  - `npx ng lint --quiet` → `All files pass linting.`
- **Implementer finding (Not Done / Assumptions):** Step 4 modals render `[showHeader]="false"`, so they have no `×` at all. The Leader confirmed this: 8 of 10 IPSR `app-pr-dialog` set `showHeader=false` (`grep -rn "showHeader" --include='*.html' src/app/pages/ipsr`), and only the creator and `new-complementary-innovation` show a header. The Implementer therefore ran AC-6 with probe (c) logged `n/a`. Leader adjudication: this is pre-existing design, not this bug. The `×` clause of `ICM-AC-6` is inapplicable as written. **Pending user decision:** amend AC-6 to "(a), (b), (d) + centering; (c) n/a — modal has no header by design".
- **Budget tripwire:** actual 407 LOC for T-1 alone vs design budget ~100 LOC total (tripwire 200). Causes: (1) the Plan B snippet is a deliverable the budget did not include (+155); (2) the Cypress spec covers 4 combinations + AC-5 + AC-6 with rect-derived probes (252 vs ~95 estimated). **Stopped and escalated to the user** before the Reviewer spawn.
- **Red run (user's browser, current code):** pending — the user runs `ipsr-modal-probe.js` on Step 2.1 with the modal open.
- Reviewer: not yet spawned (blocked on the escalation above). Runtime events: none.
- **User decisions (2026-10-01):** (1) budget: "Aceptar y seguir". `design.md` §12 is re-baselined to ~415 LOC, with a new tripwire of 500 LOC. (2) AC-6: "Sí, ajustar AC-6".
- **Execute-time spec edits (Correction Closure sweep run: `grep -n "AC-6\|same three checks\|~100\|200 LOC\|budget"` over the spec folder):**
  - `requirements.md` §8 `ICM-AC-6`: the `×` check is n/a for header-less modals. This clarifies an inapplicable clause; the meaning of R-1..R-3 is unchanged.
  - `tasks.md` T-1 step 4 and §5 coverage row: same amendment.
  - `design.md` §10 (where the `×` probe applies) and §12 budget.
  - `requirements.md:78` ("same three checks… icon rail") refers to the Step 2.1 modal, which has an `×`, so it is intentionally kept.
- **Reviewer (attempt 1): `STATUS: FAIL`.** The report is recorded verbatim in `execution-reviews/icm-t1-a1.md`. Summary: the Cypress `probeDialogStacking` hard-asserts that probe points (a)/(b) are non-null. At 1440×900 with the sidebar collapsed, the 1008px panel (`left` 216) never meets the 64px rail. In AC-6 at 1440, the ~700px Step 4 panel does not meet the 260px sidebar, and its top probably sits below the header. Those cases can never pass. Advisories cover: the 1s `.section_container` animation window, the snippet PASS on zero stacking probes, the hard-coded `HEADER_ROW_HEIGHT = 56`, rects taken from the `hlm-sidebar` host instead of `[data-slot="sidebar-container"]`, "mask dims header" not probed, and AC-5 not checking `scrollY > 0`.
- **Leader adjudication:** in-scope implementation defect, not a spec defect. When the panel and the chrome do not overlap, the chrome cannot cover the panel, so that probe is `n/a` (never a pass). A run that evaluated none of (a)/(b)/(c) is INCONCLUSIVE. Execute-time edit: `ICM-AC-6` (`requirements.md` §8) and `tasks.md` T-1 step 4 now run AC-6 at 1100×700, where the overlap exists. The meaning of R-1 is unchanged. The user is informed at the next gate.
- Attempt 1 consumed (Reviewer FAIL). → **Attempt 2**, effort bumped medium → high.

**Attempt 2** — Implementer `akili-implementer` (T2, effort high). Skills: `angular-developer`. It fixed the Reviewer issue verbatim (`execution-reviews/icm-t1-a1.md` item 1) plus the `[advisory-grade]` items (animation wait, sidebar container rect, header rect, AC-5 `scrollY > 0`).

- **Files:** `cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts` (now 351 lines) · `ipsr-modal-probe.js` (now 191 lines).
- **Implementer verification:**
  - `npx ng lint --quiet` → clean.
  - `npx cypress run --e2e --spec cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts` → `6 pending` (no token, so not evidence).
- **Evidence re-run (Leader inline): VERIFIED.** The 4 harness pages load the shipped file via `<script src>` (1 match each):
  - case 1 (trapped, 1440 expanded) → `ICM-PROBE FAIL: a, b, c, d`
  - case 2 (fixed, 1440 expanded) → `ICM-PROBE PASS`
  - case 3 (fixed, 64px rail, 1440) → `ICM-PROBE PASS`, with (a) n/a per the Implementer's debug table
  - case 4 (no overlap, no `×`) → `ICM-PROBE INCONCLUSIVE: no stacking probe — (a), (b) and (c) were all n/a`
  - `npx ng lint --quiet` → clean.
- **Implementer judgment call (recorded):** precedence is FAIL > INCONCLUSIVE > PASS.
- **Budget tripwire fired again:** 542 LOC (T-1) + ≈5 (T-2) vs the re-baselined tripwire of 500. **Stopped and escalated to the user** before the attempt-2 Reviewer spawn (override (e) rework makes that review mandatory).
- **User decision (2026-10-01):** budget "Aceptar (~550)". Tripwire raised to 600 LOC / 3 review rounds (`design.md` §12).
- **Reviewer (attempt 2): `STATUS: FAIL`** — verbatim in `execution-reviews/icm-t1-a2.md`. The prior FAIL is closed in both files. New issue: Cypress centering uses `Cypress.config('viewportWidth')`, which stays at the 1280 default after `cy.viewport()`.
- **Leader probe (deferring-a-check rule, before spending the last attempt):** a throwaway spec (`cypress/e2e/zz-leader-viewport-probe.cy.ts`, created and deleted) ran `cy.viewport(1440, 900)` then asserted on the values. Output: `AssertionError: expected 'config=1280 inner=1440' to equal 'SHOW'`. **The issue is confirmed real**: every centering assert would go red for the wrong reason.
- Attempt 2 consumed. → **Attempt 3 (final)**, effort high → xhigh.
- **Red run — user's authenticated browser, current code (no T-2), 2026-10-01:** the user pasted the shipped `ipsr-modal-probe.js` on `localhost:4200/ipsr/detail/9657/ipsr-innovation-use-pathway/step-2/complementary-innovation?phase=37` with the modal open. Output: `ICM-PROBE FAIL: a, b, c, d`. The red is on the behavioral probes, which matches the falsifier (sidebar over the panel, `×` not topmost). The sidebar state was not stated in the paste; all four probes evaluated, which implies the sidebar was **expanded** (with it collapsed, (a) would read n/a at 1440). The collapsed-state run is still requested.

**Attempt 3 (final)** — Implementer `akili-implementer` (T2, effort xhigh). Skills: `angular-developer`.

- **Files:**
  - `cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts` (214 lines)
  - `cypress/support/ipsr-modal-stacking-helpers.ts` (new, 224 lines; the helpers were extracted so the self-check runs the shipped code)
  - `ipsr-modal-probe.js` (unchanged, 191 lines)
- **Changes:** centering is measured against the `.pr-dialog-mask` rect, with no `Cypress.config(` used in geometry (sweep: only prose comments match). An `assertViewport()` guard runs after every `cy.viewport`, and centering is checked after probes (a)–(d).
- **Implementer verification:**
  - `npx ng lint --quiet` → clean.
  - `cypress run` on the spec → `6 pending` (no token).
  - Self-check in real Cypress (spec now deleted): trapped → `AssertionError: probe (a): topmost element at panel∩sidebar must be inside the panel: expected false to equal true`; fixed → pass.
- **Evidence re-run (Leader, non-author):** the author's self-check spec was deleted, so the Leader wrote an independent throwaway spec (`cypress/e2e/zz-leader-icm-recheck.cy.ts`, deleted after the run). It imports the shipped helpers and runs a shell-mirror page at 1440×900 with the `×` in the panel's top-right corner, under the sticky header. Results:
  - FIXED expanded → `✓`
  - FIXED with a 64px collapsed rail → `✓`
  - TRAPPED expanded → **failed on the precondition, not on a stacking probe:** `AssertionError: Timed out retrying after 10000ms: expected '<button.pr-dialog__close>' to be 'visible'`. Cypress's visibility check treats a covered `position: fixed` descendant as not visible, so the `×` precondition times out whenever the chrome covers it. That is exactly the bug state, and it matches the user's real-app red (probe (c) failed).
  - **Leader reading:** the gate still discriminates (red before the fix, green after), but the red comes from the precondition timeout. That conflicts with the T-1 *Red run* clause ("the `panel.contains(el)` assertion for probe (a) or (c), with the precondition step green"). This is a conformance judgment, forwarded to the Reviewer, so the Leader does not record it as a MISMATCH.
- **Reviewer (attempt 3): `STATUS: FAIL`.** Verbatim in `execution-reviews/icm-t1-a3.md`. Both prior FAILs are closed. Remaining issue: the `×` precondition uses `should('be.visible')`, so on the bug state the red is a 10s precondition timeout instead of a probe (a)/(c) assertion. The Reviewer also identified a spec-level root cause: step 2's "visible" and *Red run*'s "precondition green" cannot both hold under Cypress visibility rules. Remediation: ~3 lines (existence + layout check).

## HALT: ICM-T-1

- **Attempts:** 3 of 3 consumed. All three were Reviewer FAILs, each on a different defect in the Cypress spec: (1) hard non-null asserts on intersections; (2) `Cypress.config('viewportWidth')` stays at 1280 after `cy.viewport` (Leader-confirmed); (3) the `×` `be.visible` precondition times out on the bug state (Leader re-run plus Reviewer). FAIL reports: `execution-reviews/icm-t1-a1.md`, `-a2.md`, `-a3.md`. Implementer summaries: the Attempt 1/2/3 records above.
- **Final verification output:**
  - Leader re-run: FIXED expanded ✓; FIXED 64px rail ✓; TRAPPED → `Timed out retrying after 10000ms: expected '<button.pr-dialog__close>' to be 'visible'`.
  - Lint clean.
  - The shipped DevTools snippet passed review in every attempt. User real-app red: `ICM-PROBE FAIL: a, b, c, d`.
- **Leader root-cause hypothesis:**
  - The specified precondition is internally inconsistent: `tasks.md` step 2 says "visible", but *Red run* requires the precondition to be green on a bug state where the `×` is covered.
  - The Cypress harness also could not be validated against the real app (no token, P-9). Each defect was found by review or by a Leader probe, not by a run.
  - This is a spec/environment problem more than an implementation one.
- **Rollback — deviation from Step 4, pending the user:** the tree holds only this task's untracked files (`cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts`, `cypress/support/ipsr-modal-stacking-helpers.ts`, `ipsr-modal-probe.js`) plus unattributed `onecgiar-pr-client/package-lock.json`, which is never restored. Deleting untracked files is irreversible, and `ipsr-modal-probe.js` is reviewed evidence still in use for the plan B green run. So the Leader **backed the three files up** to the scratchpad (`icm-t1-halt-backup/`) and is **asking the user before running `git clean -f -- <paths>`**.
- Task stays `[~]`. No advance to T-2.
- **User decision on the HALT (2026-10-01): "4.º intento (Recomendado)".** The user explicitly authorizes one attempt beyond the 3-attempt ceiling, scoped to the Reviewer's a3 remediation only. No rollback (the backup is kept). Effort stays xhigh: a T2 tier is never run at `max`.

**Attempt 4 (user-authorized, beyond ceiling)** — Implementer `akili-implementer` (T2, xhigh).
- **Files:** `cypress/support/ipsr-modal-stacking-helpers.ts` only. The `×` precondition is now existence + layout (`getClientRects`); the panel keeps `be.visible`; the docstring is corrected; the stale self-check reference is dropped. `be.visible` sweep: 2 uses, the panel is kept and the `×` is fixed.
- **Implementer verification:** temp harness spec (deleted) TRAPPED expanded → `probe (a)` assertion; FIXED ×2 ✓. Lint clean. Spec → 6 pending (no token).
- **Evidence re-run (Leader, independent spec importing the shipped helpers, deleted after):** VERIFIED, plus one extra case:
  - TRAPPED expanded → `AssertionError: probe (a): topmost element at panel∩sidebar must be inside the panel: expected false to equal true`
  - TRAPPED collapsed → `AssertionError: probe (b): topmost element at panel-top-row∩header must be inside the panel: expected false to equal true`
  - FIXED expanded ✓
  - FIXED collapsed ✓
  - No precondition or timeout reds.

## Pivot Record: scope extension — `×` on header-less IPSR modals (2026-10-01)

- **Trigger:** user message during execute: "Aunque sigo notando que arriba sigue chocando, se ve extraño y si falta la x, agregala". The Leader explained that the chrome overlap is expected until T-2. User answer: "Agregar X a todos".
- **Finding:** 8 IPSR modals have `showHeader=false`; 6 have no close control, and 2 already have their own (P-10). The Leader's earlier statement "8 of 10 have no ×" was corrected to 6 in chat.
- **Revised direction:** new `ICM-R-6` + `ICM-AC-7`, `ICM-AC-6` (c) applies after T-3, new design decision `ICM-DD-2` (opt-in `floatingClose` in `app-pr-dialog`), premises P-10/P-11, new task `ICM-T-3` (depends on T-2), budget +~90 LOC.
- **ADR impact:** none (no TRD ADR touched).
- **Correction Closure sweep:** `grep -n "AC-6\|showHeader\|n/a\|×" requirements.md tasks.md design.md`. Every referrer of "Step 4 has no ×" now reads "until T-3". The T-1 Cypress spec keeps `expectClose:false` for AC-6 because it describes pre-T-3 reality; T-3 owns flipping it (see T-3 step 4 / AC-6 note).
- **Status:** T-3 is `[ ]` pending user approval. T-1/T-2 are unaffected.

### ICM-T-1 — final result · **PASS** (attempt 4, user-authorized beyond the ceiling) · 2026-10-01

- **Reviewer (attempt 4): `STATUS: PASS`.** a3 item 1 is closed. The `×` precondition is existence + layout and cannot time out on chrome coverage. TRAPPED expanded goes red on `probe (a)`, TRAPPED collapsed on `probe (b)`, and the preconditions stay green. A missing or `display:none` `×` fails the labelled precondition; a `visibility:hidden` one still fails probe (c). No regression. ADVISORY omitted (diff < 50 lines).
- **Attempts:** 4. Three Reviewer FAILs (a1–a3), then PASS. The 4th attempt was explicitly authorized by the user after the HALT, and no rollback was run (the backup is kept in the scratchpad).
- **Final deliverables:**
  - `onecgiar-pr-client/cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts` (214 lines)
  - `onecgiar-pr-client/cypress/support/ipsr-modal-stacking-helpers.ts` (233 lines)
  - `docs/specs/bugfix/ipsr-complementary-innovation-modal-overlap/ipsr-modal-probe.js` (191 lines)
- **Requirements covered:** `ICM-R-1` (both scenarios), `ICM-R-2`, `ICM-R-3`, `ICM-R-5` (header clause), `ICM-AC-1..6`.
- **Red evidence:**
  - User real app, current code, sidebar expanded: `ICM-PROBE FAIL: a, b, c, d`. The collapsed-state run is still requested but not blocking.
  - Leader non-author Cypress harness: TRAPPED → `probe (a)` / `probe (b)`; FIXED → green.
- **Final verification:** `npx ng lint --quiet` → All files pass linting. Real spec → 6 pending (token-gated, P-9; not evidence).
- **Skills deviation:** `systematic-debugging` was dropped (root cause already confirmed at specify time).
- **Issues encountered:**
  - P-9 refuted: no token.
  - Budget tripwire fired twice; the user accepted both.
  - The Implementer's self-checks twice exercised copies instead of the shipped code, and the Leader re-ran against the shipped files each time.
- **Constitution Impact:** none (test-only files; no module boundary).
