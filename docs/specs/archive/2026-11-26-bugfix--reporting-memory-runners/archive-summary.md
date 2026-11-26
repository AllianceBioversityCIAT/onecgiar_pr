# Archive Summary — Backend CI Jest runs out of memory

**Outcome: closed without an app change.** The platform team fixed the heap OOM in CI by raising the Node heap for the backend Jest workers. No OOM since 2026-11-20. BRM-T-1 was never applied; its patch is kept as plan B.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/reporting-memory-runners/` |
| Archive Path | `docs/specs/archive/2026-11-26-bugfix--reporting-memory-runners/` |
| Archive Date | 2026-11-26 |
| Branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |
| Final Status | **Closed — resolved in CI** (user decision, 2026-11-26) |

## Requirements Delivered

| ID | Status |
|---|---|
| BRM-R-1 (no worker heap OOM on the standard runner) | ✅ met by the CI-side change, not by this spec |
| BRM-R-2 (two consecutive green CI runs) | ✅ observed: ~55 green backend runs since 2026-11-20 |
| BRM-R-3 (type-check kept) | n/a — config unchanged |

## Files Changed

None in the app. The CI fix is in `.github/workflows/reporting-tool-{staging-ci,dev-cicd,prod-ci}.yml`: commits `fc5ae5dbd`, `8398d4edc`, `78d26807c`, `da6fb5106` (platform team).

## Test Evidence

- Last OOM: run `44436363871` (2026-11-19). Since 2026-11-20: dev-cicd 40 ✅, staging-ci 11 ✅, prod-ci 4 ✅; the 2 failures on 2026-11-20 carry no OOM line.
- Staging run `45830552345`: backend job ≈ 4 min.

## Validation

No `test-report.md` or `validation-report.md`: absence accepted by the user, since no app change shipped.

## Accepted Warnings / Follow-ups

| Item | Owner |
|---|---|
| Plan B: `brm-t-1-parked.patch` (ts-jest `isolatedModules`, ≈900 MB peak) if the OOM returns; the "Open before resuming" list in `execution.md` still applies | Backlog |
| `qa-catalog.snapshot.spec.ts` failure seen locally on 2026-11-18 — not verified on CI | Backlog |

## Historical Notes

- Parked on 2026-11-18 at the platform team's request: they were already fixing it in CI.

## Diagrams

None.
