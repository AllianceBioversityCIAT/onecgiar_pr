# Archive Summary — changes/sp-bilateral-review-tab

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/sp-bilateral-review-tab/` (module code `BRT`) |
| Archive date | 2026-09-08 |
| Final status | **Complete** — 8/8 tasks `[x]` with Reviewer PASS (2026-09-07). `test-report.md` / `validation-report.md` absent and accepted (gates: Jest 557/557, Cypress CT 14/14 with a proven-fallible detector, `ng build` 0 errors, four Leader live looks, judgment-day one pass). Owner sign-off: the owner reviewed the live tab on 2026-09-07/08 and commissioned three follow-up specs on it (`BRC`, `BRP`, `BRV`) — taken as the sign-off outcome. |
| Branch | `qa-development-2026` (spec branch; shared-file syncs recorded as pending in the kaizen entry) |
| Commits | `11713a356`, `ec4f7cfea`, `e8d74a433`, `5006dd0d5`, `b5a4e0266`, `1348f7ed3`, `3c626df8e`, `7f8908f71`, `31eced222`, `d8046c0d8`, `116948c88` |

## Requirements delivered

BRT-R-1..R-15 and their ACs (fifth SP tab "Bilateral review", pending badge on every tab, own toolbar, status chips, KPI cards, grouped/flat table, relocated review drawer, redirect from `/results-review`, notification deep link, Smart Back/returnTab, legacy page deletion). `BRT-DD-7` (not phase-scoped) later superseded by `BRC-DD-1` (flipped in `design.md` at the 2026-09-08 archive of `BRC`).

## Checklist items left unticked (accepted)

`tasks.md` §2 pre-flight and §9–§10 rollout boxes were never ticked as checkboxes; each pre-flight item is evidenced in `execution.md` (approvals, judgment pass, no CLARISA/migration dependency, in-flight check, dev-server probe). Rollout boxes still open as follow-ups: **PR against `qa-development-2026` not yet opened** for this spec's commits; CI/SonarCloud on the PR; manual QA on the test environment (SP02/SP13 five-tab check, approve/reject round trip, notification deep link, old `/results-review` link).

## Files changed (from `execution.md`)

New `pages/result-framework-reporting/pages/bilateral-review/` (page, table, KPIs, drawer relocation, services, copy, query-params, CT, guide); `reporting-program-band` (tab + badge, count service injection); `routing-data.ts` (route + redirect); notification producers; legacy `bilateral-results` page deleted. LOC: added source 1,775 (tripwire 1,500, +18 % reported) · tests 2,102.

## Test evidence

Jest 557/557 across touched areas; CT 14/14 (overflow detector RED-proven); `ng build --configuration development` 0 errors; live looks #1–#3b + final on SP02/SP13. Not exercised live: APPROVE/REJECT PATCH on shared data (unit-covered); notification deep link end-to-end (unit + contract-reviewed).

## Validation

No `validation-report.md`. Reviewer rounds 2/1/2/3/4/3/2/2 — six tasks over the ≤ 1 owner limit, each extra round narrower and adjudicated in `execution.md`. Three defects PASSed by Reviewers and Jest were found only live: H2-1 (Actions column off-screen), H3-1 (relocated drawer SCSS `@use` depth → unstyled overlay), H4-1 (drawer overlay mounted unconditionally).

## Accepted warnings / follow-ups

Drawer template should own its `@if (visible())` guard · Smart Back origin if "See" ever navigates to result-detail · delete the unrouted `EntityDetailsComponent` + banner (`/akili-quick`) · one-spelling sweep ("programme") · drawer state persists across in-app tab switches (legacy parity) · `pending-review` endpoint now unused server-side · parent `## Module Guides` pointer (default-branch apply) · `codegraph sync`. Phase scoping — done by `BRC`. Viewport lock — the page never engaged it (found 2026-09-08, fixed by `BRV`).

## Historical notes

Largest spec of the week (8 tasks, ~1 day). Judgment day: 9 severe findings fixed pre-execution. The template comment "same viewport-lock contract as the siblings" was false from this spec onward until `BRV`.
