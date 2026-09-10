# Kaizen Entry — changes/lead-center-decouple

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/lead-center-decouple` |
| Date | 2026-08-31 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated → relaxed mid-run by explicit user instruction after `LCD-T-2` (see `execution.md` → "Approval-gate change") |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 (`LCD-T-1..5`); 4 `[x]` PASS, 1 `[~]` PARTIAL | tasks.md |
| Reviewer FAIL rework attempts | 1 (`LCD-T-4`, attempt 1 silently dropped Cypress coverage) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 formal Pivots; 2 documented spec corrections (`design.md` §12 consequence wording; the `data-testid` clause describing hooks that never existed) — both classified as spec-documentation errors, not Pivots | execution.md — "Spec Correction 1", "Spec Inaccuracy 2" |
| PRODUCT_BUGs | n/a (no `test-report.md`) | — |
| Validation FAIL / WARN | n/a (no `validation-report.md`); evidence is inline per-task Reviewer PASS verdicts | execution.md |

## Lessons

### L1 — Methodology: a full green Jest run does not prove a rework caused no regression when the loss is in Cypress-only coverage

Root cause: `LCD-T-4`'s first attempt silently dropped the new Cypress assertion's field-discovery
path. The full client Jest suite passed 7085/7085 both before and after the bad change, because
what was lost was coverage no Jest run exercises and no Jest assertion asserts. It was found only
because the Reviewer independently read `save-contract.cy.ts`'s discovery mechanism (`author ≠
auditor` held) — and only because a first Reviewer dispatch that died to a rate limit was retried
on a **different non-author model** rather than reviewed inline.
Evidence: `execution.md` → "Note for the Kaizen pass" (end of file) and the `LCD-T-4` task entry
(2 attempts).

### L2 — Methodology: a spec asserted a concrete implementation fact (existing test hooks) that was never verified against the codebase

Root cause: `design.md`/`tasks.md` described a `data-testid` hook clause for the Lead Center /
Lead Partner selects as if those hooks already existed; neither select ever carried one. This
silently would have let `save-contract.cy.ts` pass `LCD-AC-2` while never actually seeing Lead
Center, since that spec discovers fields by prefix and skips what it can't find. Caught only
because the Implementer probed the actual DOM/test-hook state before trusting the spec's claim.
Evidence: `execution.md` → "Spec Inaccuracy 2 — the `data-testid` clause describes hooks that
never existed".

## Noted, not a lesson

- Approval-gate relaxation mid-run (`gated` → effectively `pre-approved` after `LCD-T-2`) was
  explicitly instructed by the user and recorded for audit honesty rather than silently applied —
  correct handling, not a defect; see `execution.md` → "Approval-gate change".
- Reviewer ADVISORY: `component.ts:504`'s `@akili-spec` comment ends "and vice versa", which is
  inaccurate (partner/mqap flags are still force-zeroed when the toggle is `false`, by design).
  Below the lesson bar — a one-line comment inaccuracy, not a process root cause.
- Follow-up spec candidate (server, out of scope): `validation_contributor_partner_P25` never
  requires a leading center while `lead_by_partner = 1`, so the UI now hard-requires a field the
  server's completeness check does not enforce. Recorded in `archive-summary.md` §7, not a
  process lesson.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/reviewer.md` |
| Edit | Add: "When a task's Definition of Done spans both Jest and Cypress coverage, verify the Cypress spec's field-discovery/selector logic still finds every new or changed field — a full green Jest run alone is not sufficient evidence that Cypress coverage wasn't silently dropped." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (template) |
| Edit | Add a line to the design template's implementation-detail guidance: "Concrete implementation facts cited in this document (existing test hooks, selectors, DOM ids, class names) must be grep-verified against the current codebase before being written — do not assume they exist from convention alone." |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/CLAUDE.md` §21.5 |
| Edit | Update the "Lead fields (P2-2960)" row: for **P25** (`rd-contributors-and-partners`), Lead Center is now always rendered and required, independent of `is_lead_by_partner` (which now gates only Lead Partner). **P22** (`rd-partners`) is unaffected and keeps the original either/or behavior. Pointer: `docs/specs/changes/lead-center-decouple/` (archived at `docs/specs/archive/2026-08-31-changes--lead-center-decouple/`). |
| Severity | Medium |
| Status | pending |
