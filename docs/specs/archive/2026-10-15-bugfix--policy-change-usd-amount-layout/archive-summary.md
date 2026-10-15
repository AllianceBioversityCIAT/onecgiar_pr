# Archive Summary — bugfix/policy-change-usd-amount-layout

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/policy-change-usd-amount-layout/` |
| Archive Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 |
| Depth | Lite (Bug Mode) |
| Final Status | **Shipped-ready** — both tasks `[x]` PASS, not yet committed |

## 2. Original Spec Path

`docs/specs/bugfix/policy-change-usd-amount-layout/` → `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-layout/`

## 3. Archive Date

2026-10-15

## 4. Final Status

Both tasks complete and independently verified:

| Task | Status | Attempts | Reviewer rounds |
|---|---|---|---|
| `PCL-T-1` | `[x]` PASS | 1 | 1 (PASS) |
| `PCL-T-2` | `[x]` PASS | 2 | 2 (FAIL → PASS) |

No `test-report.md` or `validation-report.md` was produced as separate artifacts — Lite-depth test evidence (Jest red/green falsifiers, lint, a real-browser Cypress run) and the Reviewer's conformance audits are recorded directly in `execution.md` and serve as this spec's test and validation evidence.

## 5. Requirements Delivered

| Requirement | Delivered by | Evidence |
|---|---|---|
| `PCL-R-1` — exactly one "USD amount" rendering in Pool Funding | `PCL-T-1` | Jest falsifier (2→1 occurrences); Reviewer PASS |
| `PCL-R-2` — USD Amount/Status always-visible in Bilateral Type-Specific Detail | `PCL-T-2` | Jest + live Cypress E2E (6/6); Reviewer PASS (attempt 2) |
| `PCL-R-3` — Full Metadata disclosure holds only "Is this result related to:" | `PCL-T-2` | Scoped Jest + Cypress assertions added in rework attempt 2; Reviewer PASS |
| `PCL-R-4` — clearing-on-type-change behavior unchanged | both | Pre-existing clearing-logic tests (P2-3371, BIL-9) confirmed unmodified and green in both tasks |
| `PCL-R-10` (SHOULD) — shared grid layout utility | `PCL-T-2` | Verbatim reuse of Pool Funding's grid class; Reviewer reasoned through the CSS and found it sound |

`PCL-OQ-1` (whether the QA review drawer's `policy-change-content` deserves the same consistency fix) — **not resolved**, carried forward as an explicit open question for a future, separate bugfix ticket. Not blocking.

## 6. Files Changed Summary

From `execution.md`:

| File | Change |
|---|---|
| `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/policy-change-info.component.html` | -1 line (`description="USD amount"` removed) |
| `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/policy-change-info.component.spec.ts` | +58 lines (new regression test, isolated `TestBed`) |
| `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.html` | USD Amount/Status block moved from the "Complete full metadata" toggle to the always-visible region; `data-testid` added |
| `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts` | +3 new tests (relocation falsifier, control, scoped `PCL-AC-3` exclusivity check) |
| `onecgiar-pr-client/cypress/e2e/bilateral-policy-change-mds.cy.ts` | 2 tests rewritten to assert the new always-visible behavior, scoped to the disclosure container |
| `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md` | Re-stamped; "What it is" and the AC6 trap bullet rewritten to describe the new layout |

Total: 6 files, 202 insertions / 40 deletions (net +162), vs. the design's ~40-70 LOC estimate — see `execution.md`'s Budget Tripwire note for the cause (test/doc surface area, not scope creep).

**Not committed as of archive time.** `onecgiar-pr-client/package-lock.json` carries an unrelated, pre-existing modification (present before this session started) and must be excluded from any commit for this spec. `onecgiar-pr-client/cypress.env.js` (gitignored, holds a user-supplied JWT token used for live verification) was left in place as the project's intended local-dev artifact.

## 7. Test Evidence Summary

| Evidence | Result |
|---|---|
| `policy-change-info.component.spec.ts` (Jest) | 33/33 passing, independently reproduced by the Leader |
| `type-policy-change.component.spec.ts` (Jest) | 39/39 passing, independently reproduced by the Leader |
| `npx ng lint --quiet` | Clean, both tasks |
| `npx ng build --configuration development` | Succeeded (attempt 1 of `PCL-T-2`) |
| `cypress run --e2e --spec bilateral-policy-change-mds.cy.ts` | **6/6 passing**, run against a live `ng serve` with a real authenticated session (token supplied by the user), independently by the Leader |
| `cypress run --e2e --spec bilateral-type-specific-section.cy.ts` | Could not execute — no backend API server reachable on port 3400 in this environment (confirmed via `lsof`, pre-existing/unrelated gap). File confirmed byte-for-byte unmodified via `git diff`, satisfying its "must remain untouched" requirement without execution. Re-run once a backend is reachable, per `tasks.md` §6. |
| Visual side-by-side geometry (manual-browser check, `requirements.md` §8a) | Not eyeballed in a real session; the attempt-2 Reviewer reasoned through the actual CSS (`display:contents` wrapper + `auto-fit,minmax(190px,1fr)` grid) and judged it structurally sound. Open item for staging/manual QA. |

## 8. Validation Summary

No separate `/akili-validate` pass was run. Validation-equivalent evidence: two independent Reviewer conformance audits (one PASS first-try, one FAIL→PASS after a genuine rework), each auditing the diff against `requirements.md`/`design.md` and re-confirming prior-attempt properties rather than assuming them. Both final verdicts: `PASS`.

## 9. Accepted Warnings Or Follow-Ups

- `PCL-OQ-1` — QA review drawer (`policy-change-content`) consistency fix — deferred to a future ticket, not blocking.
- Manual browser visual-geometry check — deferred to staging/manual QA (requirements.md §8a's own accepted-risk framing).
- `bilateral-type-specific-section.cy.ts` — re-run once a backend is available; confirmed unmodified in the meantime.
- 4 Reviewer `ADVISORY` findings across both tasks (readability/reliability, non-gating) — recorded in `execution.md`, not promoted to tasks per the "Advisory Never Becomes A Task" rule.
- Pre-existing stale "Pending / Coming soon" bullet in `type-policy-change/CLAUDE.md` (claims read-only mode "not implemented," contradicted by the pre-existing `[inert]` wrapper) — flagged by the Reviewer as already-stale-before-this-spec; left for a later docs touch.

## 10. Historical Notes

- The spec path argument was originally mis-supplied to `/akili-specify` (the full bug description landed in the `<spec-path>` slot); the Leader inferred and confirmed a proper path (`bugfix/policy-change-usd-amount-layout`) with the user before proceeding.
- `PCL-T-2` was blocked mid-execution on a missing Cypress JWT token (no `cypress.env.js` in this sandboxed environment); the user supplied a token, which the Leader wrote directly to the gitignored `cypress.env.js` (never logged, printed, or committed) to unblock live-browser verification.
- A Leader-composed Reviewer brief briefly shipped with a literal `{{PASTE THE DIFF HERE}}` placeholder instead of the actual diff; caught and corrected via an immediate follow-up message before the Reviewer acted on it. See the Kaizen entry's "Noted, not a lesson" section.
- Kaizen retrospective: 0 new lessons (both signals traced to already-institutionalized rules); entry file at `docs/specs/kaizen/bugfix--policy-change-usd-amount-layout.md`.
