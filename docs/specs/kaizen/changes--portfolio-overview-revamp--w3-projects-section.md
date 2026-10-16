# Kaizen Entry — changes/portfolio-overview-revamp/w3-projects-section

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-revamp/w3-projects-section` |
| Date | 2026-10-16 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated (user switched to "continue to the end" after T-1) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 (+1 pivot follow-up) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-1 attempt 1: spec-test window) | execution.md — WPS-T-1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (WPS-T-6 chart colours) | execution.md — ## Pivot Record: WPS-T-6 |
| PRODUCT_BUGs | 0 (no test-report) | — |
| Judgment-day severe findings | 0 (JD-1..JD-8 warnings fixed pre-approval) | judgment.md |
| Validation FAIL / WARN | n/a (no validation-report; T-6 live checks PASS) | execution.md — WPS-T-6 |
| Budget | ≈ 2,000 LOC vs ≈ 1,100 estimate; tripwire fired at T-4 | execution.md — WPS-T-4 |

## Lessons

- **KZ-changes--portfolio-overview-revamp--w3-projects-section-1 — A design fallback that names an existing artifact must be a verified premise, not an assumption.** (Product + Methodology, High)
  - Root cause: design §6.3 told WPS-T-6 to "swap the W1/W2 series to a non-violet chart token already defined in `colors.scss`". Nobody checked that the token existed, and the Premise Ledger had no row for it. `colors.scss` defines only violet chart tokens and bans status colours from charts. The remedy also targeted the wrong series. The fallback fired at HITL and became a pivot.
  - Evidence: execution.md — ## Pivot Record: WPS-T-6; design.md §6.3 (amended 2026-10-16).
  - Standardization: → P1 (local); upstream: same rule for the AKILI `design.md` template's Premise Ledger guidance.
- **KZ-changes--portfolio-overview-revamp--w3-projects-section-2 — Test LOC in this family runs about 2× the estimate; budget it from the sibling's measured ratio.** (Product, Medium)
  - Root cause: the sibling #5 already measured tests at 2× their estimate. This design only moved the tripwire to 1.4× and kept the test estimate (≈ 550), so the tripwire fired at T-4 on test volume alone (the block spec alone was ≈ 400 lines). The user had to approve an override mid-run.
  - Evidence: design.md §14 ("#5's tests ran 2× their estimate"); execution.md — WPS-T-4 "Budget tripwire".
  - Standardization: → P2

## Noted, not a lesson

- Red runs for new files are compile / module-not-found failures, not behavioural ones. The Reviewer flagged this as advisory on T-2, T-3 and T-4. The falsifier assertions were traced by reading. Recurrent; still below the lesson bar.
- T-1 green run was blocked by free RAM < 4 GB, and the blocked run hid the T-1 test bug for one round.
- Non-admin 403 again user-run (recurrence of the #5 note). The 403 body was not captured; the user reported it.
- The window could not be resized to 375 again; same-origin iframes were used (third time in this family).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | In the Premise Ledger guidance add: "A fallback or remedy that names an existing artifact (token, helper, constant, file) gets its own premise row, verified by reading that artifact before approval." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | In the Budget section add: "Estimate test LOC from the nearest archived sibling's measured prod:test ratio, not a fresh guess; cite the ratio." |
| Severity | Medium |
| Status | pending |
