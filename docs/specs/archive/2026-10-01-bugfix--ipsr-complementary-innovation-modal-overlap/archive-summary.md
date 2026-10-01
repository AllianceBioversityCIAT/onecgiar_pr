# Archive Summary — IPSR modals hidden behind the sidebar and header

> **Outcome:** the reported bug is fixed. IPSR modals now paint above the sidebar and header, centered, with the `×` visible. This was verified on the user's real app (probe FAIL → PASS, HITL OK). The 6 header-less IPSR modals gained a `×`. **One follow-up is open:** the Step 4 "Add project" buttons still render at the screen corner on the live dev server (`ICM-R-7`, deferred by the user).

## Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/ipsr-complementary-innovation-modal-overlap` |
| Depth / mode | Lite · Bug Mode |
| Branch | `qa-development-2026-mc-2` (spec branch; integration branch is `staging`) |
| Commits | `bcf2a8062` (T-1), `7bc36b21f` (T-2), `b687443ee` (T-3), not pushed |
| Archived by | `/akili-archive`, 2026-10-01 |

## Original Spec Path

`docs/specs/bugfix/ipsr-complementary-innovation-modal-overlap/`

## Archive Date

2026-10-01

## Final Status

**Archived with an accepted follow-up.** The user accepted three gaps: archiving without `test-report.md` / `validation-report.md`, and with T-3 partial.

| Task | Status |
|---|---|
| ICM-T-1 — regression probes (Cypress + DevTools snippet) | `[x]` PASS on attempt 4 (user-authorized after a HALT) |
| ICM-T-2 — release the retained fade (the fix) | `[x]` PASS on attempt 1 + HITL OK |
| ICM-T-3 — floating `×` on the 6 modals + "Add project" buttons | `[~]` `ICM-R-6` done; `ICM-R-7` deferred |

## Requirements Delivered

| ID | Delivered | Evidence |
|---|---|---|
| ICM-R-1 · R-2 · R-3 (above the chrome, `×` works, centered) | ✅ | User real app: `ICM-PROBE FAIL: a, b, c, d` → `ICM-PROBE PASS`; HITL OK |
| ICM-R-4 (modal behavior unchanged) | ✅ | Jest 910 green; diff limited to `ipsr.component.scss` |
| ICM-R-5 (no page regression) | ✅ | HITL "resto OK"; Reviewer P-7 analysis |
| ICM-R-6 (`×` on the header-less modals) | ✅ | Reviewer PASS (a2); user "Step 4 OK". Submission/unsubmit visual not confirmed by the user |
| ICM-R-7 ("Add project" buttons inside the panel) | ❌ deferred | Live panel computes `position: static` (user DevTools); not reproducible in CT |

## Files Changed Summary

| Area | Files |
|---|---|
| Fix | `onecgiar-pr-client/src/app/pages/ipsr/ipsr.component.scss` |
| Shared component (opt-in) | `shared/components/pr-dialog/pr-dialog.component.{ts,html,scss}`, new `pr-dialog.component.spec.ts` |
| IPSR modals | 6 templates (`[floatingClose]`), `ipsr-submission-modal` / `ipsr-unsubmit-modal` scss (white `×`), `step-n4-add-project.component.scss` (`fixed` → `absolute`) |
| Tests | `cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts`, `cypress/support/ipsr-modal-stacking-helpers.ts`, 3 Step 4 zoneless specs |
| Evidence tool | `ipsr-modal-probe.js` (DevTools probe, in this folder) |

## Test Evidence Summary

- **Real app (authenticated, user):** probe red → green across the T-2 fix.
- **Real-browser harnesses (Leader, non-author):** headless Chrome with the shipped snippet; Cypress with the shipped helpers. TRAPPED → `probe (a)` / `probe (b)` red, FIXED → green.
- **Jest:** `src/app/pages/ipsr` + `pr-dialog` + consumers → 91 suites / 962 tests green (peak run). Lint clean.
- **Gap:** the Cypress suite is token-gated, and no `cypress.env.js` exists (P-9 refuted), so it reports pending and is not evidence. No `test-report.md` (accepted).

## Validation Summary

No `/akili-validate` run (accepted by the user). Reviewer verdicts:

| Task | Reviewer verdicts |
|---|---|
| T-1 | FAIL ×3 → PASS |
| T-2 | PASS |
| T-3 | FAIL → PASS, then two HITL failures on `ICM-AC-8` |

## Accepted Warnings Or Follow-Ups

1. **ICM-R-7 — "Add project" buttons.** In source, the panel has two `position: relative` rules that win in the webpack CT harness. In the live `ng serve` (`@angular/build:dev-server`, esbuild/Vite) the panel computes `static`. Root cause unconfirmed. Next step: inspect `.step-n4-add-project-dialog` in an authenticated browser (Elements → Styles).
2. **Same trap outside IPSR:** 28 other `.section_container` / `.detail_container` templates (e.g. Result Detail). Candidate: the same declaration in `transitions.scss`, in its own spec.
3. **Cypress token:** configure `cypress.env.js` so `ipsr-modal-stacking.cy.ts` becomes real evidence.
4. **Submission/unsubmit white `×`:** user visual confirmation pending. Reviewer advisory: check the bottom edge of the focus ring.

## Historical Notes

- Root cause confirmed at specify time with a headless-Chrome repro: an `opacity` animation retained by `fill-mode: both` keeps a stacking context.
- **Pivots:** 2, both user-requested (`×` on header-less modals; "Add project" buttons).
- **Budget tripwire:** fired 3× (~100 → ~920 LOC), and the user accepted each re-baseline.
- **HALT:** T-1 halted after 3 attempts. The user authorized a 4th; no rollback was needed.
- **T-3 rollback:** attempt 3's speculative `!important` and its non-discriminating CT spec were removed.
