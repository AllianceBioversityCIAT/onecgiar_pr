# Archive Summary — Decouple Lead Center From The External-Partner Toggle

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/lead-center-decouple` |
| Archive Date | 2026-08-31 |
| Final Status | Shipped (staged, not yet committed) — manual browser walkthrough confirmed working by the user |
| Branch | `qa-development-2026-ss` |

## 2. Final Status

4 of 5 tasks (`LCD-T-1`..`LCD-T-4`) are `[x]` PASS. `LCD-T-5` is `[~]` PARTIAL: the `CLAUDE.md`
doc update landed, but the `Verified:` hash re-stamp is owed at commit time (no commit exists yet
per the standing no-auto-commit rule) and the automated Cypress run was never executed
(`cypress.env.js` absent in this checkout — probe-confirmed environment blocker). The manual
browser walkthrough itself — the other `LCD-T-5` gate — was performed by the user outside this
tool session, who confirmed the feature works as expected; archiving proceeds on that basis.

## 3. Requirements Delivered

- `LCD-R-1`, `LCD-R-2` — Lead Center relocated out of the `is_lead_by_partner` conditional, always
  rendered directly after Contributing Centers.
- `LCD-R-3` — Lead Center is unconditionally `[required]`; alert messages split into
  `getMessageLeadCenter()` / `getMessageLeadPartner()`.
- `LCD-R-4`, `LCD-R-5`, `LCD-R-6` — save-time and toggle-time logic decoupled: centers' and
  partners' `is_leading_result` set independently; `onLeadByPartnerChange` no longer nulls
  `leadCenterCode`; `tryAutoAssignLeadCenter` runs regardless of `is_lead_by_partner`.
- `LCD-R-7` — stale "already added in this section" copy dropped from the center message, kept for
  the partner message.
- `LCD-R-10` — `LC-DD-5` auto-add-to-Contributing-Centers mechanics left unmodified (verified via
  the six forbidden-methods check).

## 4. Files Changed Summary

Based on `execution.md` §3 (Run Summary): **359 insertions / 48 deletions** across 6 client files
(production footprint ~32/31 LOC in `component.ts` / `service.ts` / `component.html`; the rest is
test code).

- `onecgiar-pr-client/.../rd-contributors-and-partners.component.html` — Lead Center relocated,
  `[required]="true"`, `#selectLeadCenter` wrapper removed, two `data-testid` hooks added
  (`cp-field-contributing_center~lead`, `cp-field-institutions~lead`).
- `onecgiar-pr-client/.../rd-contributors-and-partners.component.ts` — `getMessageLead()` replaced
  by `getMessageLeadCenter()` / `getMessageLeadPartner()`; `onSaveSection()` decoupled.
- `onecgiar-pr-client/.../rd-contributors-and-partners.service.ts` — `onLeadByPartnerChange` no
  longer clears `leadCenterCode`; `tryAutoAssignLeadCenter` guard removed.
- `onecgiar-pr-client/.../rd-contributors-and-partners.component.spec.ts`,
  `rd-contributors-and-partners.service.spec.ts` — new/retargeted coverage for all `LCD-AC-*`.
- `onecgiar-pr-client/cypress/e2e/result-detail/save-contract.cy.ts` (+ regression re-runs of
  `contributors-and-partners.cy.ts`, `save-validation.cy.ts`) — written, not executed (see §5).
- `onecgiar-pr-client/.../rd-contributors-and-partners/CLAUDE.md` — new trap entries for
  `LCD-DD-1..4`, the two `data-testid` hooks, `Verified:` line placeholder pending commit hash.

## 5. Test Evidence Summary

- `npx ng lint --quiet` — clean.
- `npx jest --silent --reporters=summary --no-coverage` — folder suite **195/195** green; full
  client suite **484 suites / 7085 tests** green.
- Cypress — three specs **written**, **not executed** (missing `cypress.env.js` in this checkout).
  Owed as a CI or credentialed local run before shipping.
- Manual browser walkthrough (`LCD-T-5`) — performed by the user, confirmed working, outside this
  tool session.

## 6. Validation Summary

No standalone `/akili-validate` pass was run. Validation-equivalent evidence is the per-task
Reviewer PASS verdicts recorded in `execution.md` (`LCD-T-1`..`LCD-T-4`, one rework round on
`LCD-T-4` for a coverage regression invisible to every green Jest signal — caught only because
`author ≠ auditor` held).

## 7. Accepted Warnings Or Follow-Ups

- Cypress e2e run (three specs, incl. the new `LCD-AC-2` combined-lead assertion) still owed —
  needs credentials + a running stack; confirm the new test actually *runs* rather than skips.
- `Verified:` hash re-stamp in the folder `CLAUDE.md` owed at commit time.
- **Pending on default branch:** `onecgiar-pr-client/src/CLAUDE.md` §21.5's "Lead fields
  (P2-2960)" row is stale for P25 (still correct for P22) — not applied here per shared-file write
  discipline; carried forward as a Step 3 pending item (see below).
- Advisory (not self-fixed): `component.ts:504`'s `@akili-spec` comment "…and vice versa" is
  inaccurate — partner/mqap flags are still force-zeroed when the toggle is `false`, by design.
- Follow-up spec candidate (server, out of this spec's frontend-only scope): server migration
  `validation_contributor_partner_P25` never requires a leading center while `lead_by_partner = 1`,
  so the UI now hard-requires a Lead Center the server's completeness check does not.
- Latent hazard recorded, not acted on: the save route works only because the server's documented
  `ValidationPipe({whitelist:true})` convention is not applied to it; applying it later would
  silently strip `institutions`/`mqap_institutions`/`contributing_center`.

## 8. Historical Notes

One rework round on `LCD-T-4`: the first pass silently dropped Cypress coverage for the new
combined-lead payload assertion, invisible to every green Jest signal (7085/7085 both before and
after). Found only by the Reviewer reading `save-contract.cy.ts`'s discovery mechanism. Two
spec-documentation corrections were made mid-run (`design.md` §12 consequence wording; the
`data-testid` clause describing hooks that never existed) — both classified as documentation
errors, not implementation defects or Pivots. Scope was explicitly widened once, by user decision,
to let `LCD-T-4` add the two missing `data-testid` hooks. No auto-commit was performed at any
point per standing project instruction.
