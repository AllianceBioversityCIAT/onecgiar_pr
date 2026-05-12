# Bilateral Module Replication Guide

This document set explains how the PRMS bilateral module works and how to rebuild a similar module in another application or tool. It combines the frontend review workspace, the backend headless ingestion surface, the results-review lifecycle, and the integration contracts that connect them.

## Audience

- Product teams designing a bilateral or external-result review workflow.
- Frontend engineers rebuilding the Science Program / Bilateral Results Review UI in another stack.
- Backend engineers rebuilding ingestion, typed result enrichment, review decisions, and payload exports.
- Data/integration engineers consuming or replacing the bilateral list/detail API.

## Source References

| Area | Canonical source |
|---|---|
| Frontend module | `onecgiar-pr-client/src/app/pages/result-framework-reporting/` |
| Frontend assets | `onecgiar-pr-client/src/assets/result-framework-reporting/` |
| Backend ingestion | `onecgiar-pr-server/src/api/bilateral/` |
| Backend lifecycle/review | `onecgiar-pr-server/src/api/results/` |
| Payload contract | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |
| Project product baseline | `docs/prd.md` |
| Project technical baseline | `docs/detailed-design/detailed-design.md` |

Read the local `AGENTS.md` or `CLAUDE.md` files in those source folders before changing implementation. The frontend folder also contains a detailed replication guide in `CLAUDE.md`; this document set extracts the cross-stack essentials into `docs/`.

## Document Map

| Document | Purpose |
|---|---|
| `frontend.md` | Frontend route structure, state stores, components, assets, UX behavior, and review drawer mechanics. |
| `backend.md` | Backend ingestion, transaction flow, type-specific handlers, result review lifecycle, data dependencies, and operational posture. |
| `integration-contracts.md` | Endpoint catalog, request/response contracts, payload wrappers, statuses, and type-specific shapes. |
| `replication-checklist.md` | Practical build plan, readiness checklist, test strategy, risks, and anti-patterns. |

## Module Mission

The bilateral module lets CGIAR Centers submit W3/Bilateral-funded results into PRMS and lets Science Program / Accelerator leads review those results before they become accepted program results.

It has two major halves:

- **Headless ingestion**: External systems send structured result payloads to `POST /api/bilateral/create`. The backend validates CLARISA codes, creates users when needed, writes a PRMS result plus common associations, and delegates type-specific fields to handlers.
- **Program review workspace**: The frontend exposes `/result-framework-reporting/entity-details/:entityId/results-review`, where authorized Science Program users review pending bilateral results by center, edit ToC and data-standard fields, and approve or reject them with audit history.

## Product Invariants

These invariants come from `docs/prd.md` and must be preserved in any rebuild:

- Every result has stable identity: `result_code`, `result_type_id`, phase/year, `status_id`, and `is_active`.
- External payloads must expose CLARISA-facing identifiers and human-readable labels, not raw join-table primary keys.
- Review state transitions must be explicit, audited, and covered by tests.
- Bilateral payload changes must be additive unless a versioned rollout is planned.
- JWT and secret values must never be logged, printed, documented, or exposed.

## High-Level Architecture

```text
External bilateral source
  |
  | POST /api/bilateral/create  (JWT excluded, perimeter-protected externally)
  v
Backend Bilateral module
  | validates user, CLARISA, phase, year, uniqueness
  | writes Result + associations in a transaction
  | delegates typed fields to handlers
  v
PRMS Results data model
  |
  | GET/PATCH /api/results/bilateral/*
  v
Frontend Bilateral Results Review
  | center sidebar, filters, grouped table, review drawer
  | save ToC/data standards with justification
  | approve/reject pending results
  v
Accepted or rejected bilateral result with audit history
```

## Core Actors

| Actor | What they do |
|---|---|
| External bilateral source | Sends structured result data, users, ToC mapping, geography, centers, partners, evidence, projects, and typed fields. |
| Center submitter | Owns or submits the external result. May be created as an external PRMS user during ingestion. |
| Science Program / Accelerator lead | Reviews pending bilateral results linked to their program and decides whether to approve or reject. |
| Admin / PMU | Can review across programs, recover data, manage phases, and support catalog or role issues. |
| Downstream consumer | Reads typed enriched result payloads from bilateral list/detail APIs. |

## Rebuild Strategy

For another tool, preserve the contracts and behavior before preserving framework syntax:

- Keep the same route and endpoint responsibilities even if URL paths change behind an adapter.
- Normalize backend envelopes once at the API client boundary.
- Treat CLARISA, ToC, CGSpace, and phase/versioning as external dependencies that require adapters.
- Keep the review drawer as the central work unit: result detail load, editable sections, dirty tracking, save-with-justification, approve/reject.
- Do not collapse granular review endpoints into one generic update unless you also preserve separate validation, audit, and notification semantics.

## Security Notes

- The production PRMS backend excludes `/api/bilateral/*` from JWT middleware and throttling. This does not mean it is public by design; perimeter protection must exist at API Gateway, IP allowlists, API keys, or an equivalent integration boundary.
- Authenticated frontend calls use custom `auth: <JWT>`, not `Authorization: Bearer`.
- Never log `auth` headers, JWTs, user tokens, idempotency keys, webhook URLs, credentials, or sensitive environment values.

## Related Existing Contract

The most detailed payload contract remains `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`. Use it as the authoritative field-level reference for bilateral list/detail response shapes. The `integration-contracts.md` file in this folder summarizes how those contracts connect to the frontend and backend flows.
