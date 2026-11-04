# Proposal — Contribution requests by Program/Accelerator (point 6)

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/contribution-requests-by-pa` |
| Parent Spec | `changes/portfolio-overview-feedback-round` |
| Type | Change |
| Approval Mode | `gated` |
| Depends on | none · Parallel-safe: yes |

Intent and behavior: parent [`proposal.md`](../proposal.md) §3 row 6, §4 item 6, OQ-4/5/6 (defaults: `share_result_request` with `request_type = contribution`; sent = requester P/A, received = P/A asked; counts + expandable list of pending requests).

**Slice boundary:** new admin-only read endpoint under `results-framework-reporting/portfolio/…` + a new block on `/portfolio-overview`. Monitoring only; no reminder sending. Mockup offered at specify.

Next: `/akili-specify changes/portfolio-overview-feedback-round/contribution-requests-by-pa`
