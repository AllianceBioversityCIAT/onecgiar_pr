# Proposal: P2-3085 — Show updated ToC metadata fields in the Contribution Request review

## Why

When an SP Contributor opens a Contribution Request notification to accept/reject a result contribution (`is_map_to_toc: true`), the review interface currently shows only the request sentence + Accept/Decline buttons — none of the ToC metadata the submitter configured. The user cannot see the mapped targets/indicators before deciding (P2-3003 / P2-3085).

The backend (P2-3086, Juanda — already deployed to test) now enriches `request/get/received` (and sent/popup) for `is_map_to_toc: true` requests with a `toc_contribution_review[]` array (one entry per contribution), carrying the exact fields the ToC section shows, plus useful ids (`toc_result_id`, `toc_results_indicator_id`, `planned_result`).

## What Changes

- In `notification-item.component`, when `is_map_to_toc: true`, render a read-only ToC review block from `notification.toc_contribution_review[]`, placed between the request sentence and the Accept/Decline actions.
- Display the fields in this exact order (per AC1): **Level · HLO/IO/2030 Outcome · HLO/IO/2030 Outcome Statement (read-only) · Indicator Typology (read-only) · Unit of measurement (read-only) · Target (read-only) · Contribution Target**.
- One block per entry in `toc_contribution_review[]` (a request may cover multiple contributions).
- No behavior change to Accept/Decline (P2-3106) — this is presentation only.

## Capabilities

### New Capabilities
- `notification-toc-review`: the Contribution Request review interface renders the submitter's ToC metadata (level, outcome, statement, indicator typology, unit, target, contribution target) read-only, sourced from `toc_contribution_review[]`, so the contributor reviews the mapping before accepting or rejecting.

### Modified Capabilities
<!-- none — P2-3106 covered the accept/decline labels + validation; the review fields are new presentation. -->

## Impact

- `onecgiar-pr-client/.../notification-item/notification-item.component.{html,ts,scss}` — the read-only ToC block + a typed accessor for `toc_contribution_review`.
- Jest specs for the component.
- Depends on the backend `toc_contribution_review[]` payload (P2-3086, in test).
- **Out of scope:** the Accept/Decline flow, the popup/sent surfaces beyond rendering the same block if present, any backend change.
- **Verification note:** end-to-end runtime verification needs a real Contribution Request with `is_map_to_toc: true` in the reviewer's inbox — the current test user has none; coordinate a test contribution with Juanda/QA.

## Field mapping (from Juanda's contract)

| AC field | payload key |
|---|---|
| Level | `level` |
| HLO/IO/2030 Outcome | `outcome_label` |
| HLO/IO/2030 Outcome Statement (RO) | `outcome_statement` |
| Indicator Typology (RO) | `indicator_typology` |
| Unit of measurement (RO) | `unit_of_measurement` |
| Target (RO) | `target` |
| Contribution Target | `contribution_target` |

> Open: the payload also carries `statement` (likely the indicator statement, distinct from `outcome_statement`). Confirm with Juanda whether the AC "Statement" means the outcome statement (assumed) or the indicator statement.
