# Spec Family — Intermediate Outcome / AoW Visibility

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/results/intermediate-outcome-aow-visibility/` |
| **Date created** | 2026-08-26 |
| **Last updated** | 2026-08-26 |
| **Spec-family status** | open |
| **Source proposal** | User request in chat (no Jira ticket referenced) — Reporting tab, `entity-details/SP02?tocView=aows` |

## 2. Child specs (closed set)

| # | Spec Path | Depends on | Parallel-safe | Status |
|---|---|---|---|---|
| 1 | `results/intermediate-outcome-aow-visibility/target-tooltip` | none | yes | pending |
| 2 | `results/intermediate-outcome-aow-visibility/aow-selector` | none | yes | pending |

Both children fix a single underlying fact: in this codebase, **Intermediate Outcomes are a program-level bucket, not nested per Area of Work** (`dashboard-lab.component.ts` `reportingGroups()`, comment at line ~1462 — "the design reference nests Intermediate/2030 under each AoW as HLO-level children — that is a known bug the owner rejected"). Every Intermediate Outcome target is therefore inherently cross-cutting. The two children make that fact visible (tooltip) and actionable (AoW selector at creation) — they touch disjoint files and can ship independently, in either order.

## 3. PRMS-specific ordering hints

- Neither child adds a migration.
- Neither touches a `/api/bilateral/*` or `/api/platform-report/*` payload.
- `target-tooltip` is client-only (one template). `aow-selector` is a server + client pair, but is scoped as a single child spec because the "list candidate AoWs for a ToC node" capability likely lands as one small endpoint, not a multi-step migration — split it into server/client sub-children during `/akili-specify` only if the design turns out bigger than expected.

## 4. Change log

| Date | Change | Approved by |
|---|---|---|
| 2026-08-26 | Family created from chat proposal | santiago.sanchez@cgiar.org |
