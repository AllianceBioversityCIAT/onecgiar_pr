# Kaizen Entry — changes/toc-kpi-option-readability

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/toc-kpi-option-readability` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-2 x1) | execution.md — TKR-T-2 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | 0 / 5 (WARN-1 PRTest closed 2026-11-23) | validation-report.md; execution.md — PRTest check |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 0 | execution.md |
| Budget tripwire | 1 (LOC ≈480 vs ~180, 2.7x, all tests; rounds 4/4) | execution.md — Budget Tripwire |

## Lessons

None new. The only recurring signal (test LOC far above estimate) already has a lesson; recorded as a `digest-update` (P1).

## Noted, not a lesson

- T-2 FAIL: a Cypress falsifier asserted height with a one-shot `.then` before the text laid out, so removing the clamp did not turn it red. Fixed with a retrying `.should` after waiting for the text. First occurrence in this form (close to KZ-bugfix--sidebar-scroll-zoom-overflow-2, different cause).
- Scratchpad `mkdir` test lock was not owner-safe: released by another holder twice (T-1, T-3); results unaffected.
- `npm run test:ct -- <filter>` matches nothing on Windows backslash paths; ESLint 9 has no flat config in the client (`ESLINT_USE_FLAT_CONFIG=false` used).
- Cosmetic "Unsaved changes" pill on opening a `pr-select` list, found at the PRTest check.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` |
| Edit | Add `changes/toc-kpi-option-readability` as a source: LOC ≈480 vs ~180 (2.7x), production ≈25 + new component vs tests ≈400; same day `changes/rir-center-focal-routing` 3.2x. Recurrence note: estimate tests at roughly 3x production. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/CLAUDE.md` |
| Edit | `- Shared `app-clamped-text` (`src/app/shared/components/clamped-text/`): N-line clamp with Show more/less, copy in `internationalization/clamped-text.copy.ts`; `app-pr-select` has opt-in `[wrapOptions]` (2-line options, 50 px rows).` |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | — |
| Edit | None: no root-guide claim falsified by this spec (client-only, no payload, no module change). |
| Severity | Low |
| Status | applied (2026-11-23, nothing to write) |

### P4

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | — |
| Edit | None: no TRD decision overturned. |
| Severity | Low |
| Status | applied (2026-11-23, nothing to write) |
