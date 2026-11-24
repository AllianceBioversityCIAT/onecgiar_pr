# Kaizen Entry — changes/rir-center-focal-routing

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-center-focal-routing` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated, "continua hasta que termines" 2026-11-13 |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 (+ T-4 rework) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | n/a (PRTest HITL in execution.md) | execution.md — RCF-T-5 |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 2 (T-4 rework, T-5 manual) | execution.md |
| Escaped defects (§3) | 1 minor: the 1280 px action-column overflow found at T-5 visual check, after T-4 PASS | execution.md — T-4 rework |
| Budget tripwire | 1 (≈2,115 vs ≈650 lines, 3.3x; rounds 4/6) | execution.md — Budget Tripwire |

## Lessons

None new. The estimation overrun already has a lesson; recorded as a `digest-update` (P1). The overflow is a one-off layout miss, below the lesson bar.

## Noted, not a lesson

- Overflow at 1280 px: Spartan `hlmTd` applies `whitespace-nowrap`, so long Center names never wrap; T-4 PASSed without a narrow-viewport check. First occurrence.
- A PRTest preview with no W1/W2 rows in the target Center proves nothing; the disqualifier in tasks.md caught it (ICARDA W3-only).
- The user's DBeaver HITL first failed on procedure (a shell command pasted into DBeaver).
- Estimate undercounted the Center listing, routing upsert, 409 mapping and one spec per falsifier (T-3 service 233 prod + 385 test).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` |
| Edit | Add `changes/rir-center-focal-routing` as a source: ≈2,115 vs ≈650 lines (3.3x), T-3 admin API the dominant miss (listing joins, upsert, 409 mapping, one spec per falsifier). Recurrence note: estimates for CRUD-style API plus UI should budget tests at about 3x production. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | — |
| Edit | None: no new module; the feature extends `replicated-innovation-reminders`. Consider one line in `onecgiar-pr-server/src/CLAUDE.md` that Center opt-in routing lives in `center_reminder_routing`, only if that guide lists the module's tables. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | — |
| Edit | None: no root-guide claim falsified by this spec. |
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
