# Archive Summary — bugfix/policy-change-usd-amount-position

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/policy-change-usd-amount-position/` |
| Archive Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 |
| Depth | Lite (Bug Mode) |
| Final Status | **Shipped-ready** — task `[x]` PASS, committed |

## 2. Original Spec Path

`docs/specs/bugfix/policy-change-usd-amount-position/` → `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-position/`

## 3. Archive Date

2026-10-15

## 4. Final Status

| Task | Status | Attempts | Reviewer rounds |
|---|---|---|---|
| `PCP-T-1` | `[x]` PASS | 1 | 1 (PASS) |

No `test-report.md` or `validation-report.md` produced separately — same Lite-depth pattern as the prior related spec; test evidence and the Reviewer's conformance audit live in `execution.md`.

## 5. Requirements Delivered

| Requirement | Delivered by | Evidence |
|---|---|---|
| `PCP-R-1` — Policy type, USD amount, Status as three siblings in one shared grid row | `PCP-T-1` | Jest sibling-order falsifier (genuine red/green demonstrated); Reviewer PASS |
| `PCP-R-2` — Stage/Implementing organizations render after the regrouped row, unchanged | `PCP-T-1` | Reviewer confirmed byte-identical markup, later siblings |
| `PCP-R-3` — grid holds only Policy type when `policy_type_id != 1` | `PCP-T-1` | Confirmed by template logic (`@if` renders nothing extra); Reviewer advisory notes an explicit test for this case would strengthen (not required) coverage |
| `PCP-R-4` — clearing logic, MDS tracker, Full Metadata disclosure unchanged | `PCP-T-1` | Prior spec's `PCL-T-2`/`PCL-T-2 control`/`PCL-AC-3` tests confirmed present and unmodified |

## 6. Files Changed Summary

| File | Change |
|---|---|
| `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.html` | Policy type + USD amount/Status regrouped into one shared grid div, moved before Stage/Implementing organizations |
| `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts` | +35 lines: new sibling-order regression test |
| `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md` | Re-stamped; one-line addition describing the new grouping (Leader, post-PASS, per Reviewer advisory) |

Total: 3 files, 84 insertions / 46 deletions, within the design's ~15-25 LOC estimate (slightly over due to the CLAUDE.md addition and a documentation comment block, not scope creep).

Committed as `32b20c42b` (`🔧 fix(type-policy-change) [SPEC:bugfix/policy-change-usd-amount-position] P2-3962: ...`). `onecgiar-pr-client/package-lock.json` remains excluded (unrelated, pre-existing modification).

## 7. Test Evidence Summary

| Evidence | Result |
|---|---|
| `type-policy-change.component.spec.ts` (Jest) | 40/40 passing, independently reproduced by the Leader |
| `npx ng lint --quiet` | Clean |
| `npx ng build --configuration development` | Succeeded |
| `cypress run --spec bilateral-policy-change-mds.cy.ts` | 6/6 passing, live browser |
| Visual "one row" geometry (manual-browser check) | Not eyeballed in a real session this time either — same accepted-risk class as the prior spec (`requirements.md` §8a); the grid class is a verbatim reuse of an already-proven pattern. |

## 8. Validation Summary

No separate `/akili-validate` pass. Reviewer conformance audit: `PASS` on first attempt, with independent verification of binding preservation, read-only wrapper containment, and falsifier correctness (reasoned through the `DebugElement.children` logic manually, not taken on faith).

## 9. Accepted Warnings Or Follow-Ups

- Manual browser visual-geometry check — deferred to staging/manual QA (same accepted-risk framing as the prior spec).
- Reviewer advisory: an explicit `policy_type_id != 1` test case would strengthen coverage for `PCP-AC-2` — not required, behavior is correct by construction.

## 10. Historical Notes

- This spec is a direct follow-up correction to `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-layout/` — the user caught, after the first fix shipped, that the fields were correctly out of "Full Metadata" but not grouped with "Policy type" as the ticket (`P2-3962`) intended.
- Kaizen retrospective: clean run (0 rework attempts, 0 HALTs, 0 pivots) — see `docs/specs/kaizen/bugfix--policy-change-usd-amount-position.md`.
