# Archive Summary — IPSR GI Impact Area scores parity

**Outcome:** delivered. The Impact Area scores block in IPSR General information now uses the Results layout: a group header with the scored counter, segmented `0/1/2` rows with the guidance in the ⓘ, and the P25 checkboxes inside a field card. Validation and behaviour are unchanged.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/ipsr/gi-impact-area-scores-parity/` |
| Archive Date | 2026-09-28 |
| Branch | `qa-development-2026-ss` (spec branch) |
| Final Status | **Done**. 1/1 task `[x]` |
| Depth | Lite (escalated from `/akili-quick`) |

## Requirements Delivered

| Req | Status | Proof |
|---|---|---|
| R-1 group header + presence counter (P25), guidance ⓘ vs inline box | ✅ | Jest (getter + flag on/off) |
| R-2 5 segmented rows, 0 per-tag boxes, P25 labels = Results, P22 unchanged | ✅ | Jest DOM + label cases |
| R-3 P25 checkboxes in `app-field-card`, done ⇔ `isImpactAreaComplete` | ✅ | Jest |
| R-4 hooks / anchors / payload identical; no `mandatory` on inner `.pr-field` | ✅ | Jest + Reviewer diff audit |
| Visual parity with Results | ✅ | HITL browser check by the user (P25 + P22) |

## Files Changed

`onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.component.{html,ts,scss,spec.ts}`. Diff: +340 / −40 (production ~67 net, tests ~195 net). Commit `014f94668`.

## Test Evidence

- Red run: the new cases were run against the old code first, and 15 of them failed.
- Green run: 88/88 in `ipsr-general-information.component.spec`.
- Build green, lint clean.
- After the merge of `origin/performance-refactor` (merge commit `6d477a168`), the tests for all merged files were run: client 553/553 in 26 suites, server 34/34 in 4 suites. The build was green.

## Validation

No `test-report.md` or `validation-report.md`: `/akili-test` and `/akili-validate` were not run. **The user accepted archiving without them (2026-09-28).** The evidence of record is `execution.md`: Reviewer PASS on attempt 1, plus the HITL check.

## Accepted Warnings / Follow-ups

- Budget tripwire: net +300 LOC against a ~160 tripwire. The user accepted it, since the overrun is the test LOC; the production code is under budget.
- Four Reviewer ADVISORY items are recorded in `execution.md` and not scheduled: the P22 loop in the orphan-box test; an explicit `toBe(1)` in the header DOM case; `:host` scoping of the `::ng-deep` testid rule (applies to Results as well); the `sectionGuidanceTooltip` parity nit.
- Green checks (DB procedures) were out of scope by design.

## Historical Notes

- OQ-1 was resolved as assumed: the group header is P25-only (DD-3).
- DD-1 uses a conditional `[label]` instead of `fieldRef`, which keeps the P22 labels byte-identical.
