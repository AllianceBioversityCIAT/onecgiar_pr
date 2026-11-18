# Archive Summary — Primary decline rejects the result

**Outcome:** code shipped (`ea44116932`, in `master`). The UI half was **superseded** by `notifications/primary-review-not-accept` (PRA-T-2), which removed every primary Decline entry point. Because of that, the HITL check (PDR-T-6) can no longer run and is closed as superseded.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/notifications/primary-decline-rejects-result/` |
| Archive date | 2026-11-13 |
| Archived from branch | `qa-development-2026-ss` (spec branch; integration branch is `staging`) |
| Owner | santiago.sanchez@cgiar.org |
| Final status | **Closed**: PDR-T-1..T-5 PASS; PDR-T-6 closed as superseded |

## Requirements delivered

| Item | Status |
|---|---|
| Server: `decline()` rejects an ownerless result, no auto-move; DTO, dispatcher and 400 mapping (T-1, T-2) | Delivered, in `master` |
| Client: justification dialog, wiring, rejected banner (T-3..T-5) | Delivered, then **UI entry points removed by PRA-T-2** (the dialog stays as dead code, PRA design §8.1) |
| HITL end to end (T-6), `PDR-T-5-DB` check | Superseded: no reachable decline path |

## Test evidence

Each task closed on its scoped Jest run plus lint (execution.md). No browser evidence: the flow was replaced before the HITL ran.

## Accepted warnings / follow-ups

- Dead code left on purpose by PRA (`showPrimaryDeclineDialog`, the primary branch of `onDeclineClick()`, `onPrimaryDeclineConfirm()`): a cleanup candidate for a later spec.
- Server `decline()` behaviour for primary rows is still in place, reachable only through the API.

## Diagrams

None.
