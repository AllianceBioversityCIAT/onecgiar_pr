# Kaizen Entry — changes/admin-user-login-report

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-user-login-report` |
| Date | 2026-09-23 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 (4 by agents, 2 manual by the user) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 during execution (one approach change made at spec time, see below) | requirements.md §11 |
| PRODUCT_BUGs | 0 | no test-report.md |
| Judgment-day severe findings | none recorded | — |
| Validation FAIL / WARN | not applicable (no validation-report.md) | — |

## Result

Clean run: every task passed review on attempt 1, so there are no lessons.

## Noted, not a lesson

- Reading the auth wiring at spec time (before design) caught that the proposal's Option A would have exposed login data without authentication, and moved the endpoint under `/api/*`. Worth repeating: check where a route sits relative to `JwtMiddleware` before choosing an approach. Single occurrence, so it feeds the recurrence check only.
- The client `npm run test -- --testPathPattern` form was not used; agents ran `npx jest ... --testPathPattern` directly, and `npx eslint <file>` does not work in the client (no `eslint.config.js`; use `npx ng lint`). Friction only.

## Pending Items

None.
