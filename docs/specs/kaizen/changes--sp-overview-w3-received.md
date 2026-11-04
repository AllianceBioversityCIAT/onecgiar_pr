# Kaizen Entry — changes/sp-overview-w3-received

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-overview-w3-received` |
| Date | 2026-10-26 |
| Branch | qa-development-2026-ss (spec branch; default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated (user lifted the gates mid-run: "continúa hasta que la finalices") |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 / 3 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (SWR-T-3 parity rule) | execution.md — Pivot Record: SWR-T-3 |
| PRODUCT_BUGs | — (no test-report) | — |
| Validation FAIL / WARN | — (no validation-report) | — |
| Budget | 3 tasks, 1 round each as planned. Spec LOC ~170 vs ~90 estimated, because existing STD/STG literals had to be updated | execution.md Summary |
| Drift attributable | none recorded | docs/specs/audits/ |

## Lessons

- **KZ-changes--sp-overview-w3-received-1 — The spec asserted, without checking, what an existing card counts. The parity check built on that assertion then failed live.** (Product, Medium)
  - **Root cause:**
    - The requirements §3 glossary and S-2.1 stated that the W3/Bilateral Reporting Status donut "already counts 5 + 6 + 7".
    - Nobody checked this against the donut's code or against live data while specifying.
    - The donut also counts Discontinued (4) and Submitted (3), so SP01 shows 52 vs 50.
    - T-3's "Fails if: row ≠ donut total" therefore failed against a correct implementation, which forced a Pivot at the HITL step.
  - **Evidence:** execution.md — "SWR-T-3 … parity" table row and "Pivot Record: SWR-T-3".
  - **Standardization:** → P1

## Noted, not a lesson

- **A spec built on an existing card's figure without checking it** is close to `feedback_verify_sql_fixes_against_real_data` (memory): verify against real rows. This spec hit it in the UI domain, not SQL. Recorded once as KZ-1; no further item.
- **A cross-task file overlap**: T-1 needed the type change in T-2's file. The Leader authorized it inline and recorded it. This is a one-off; the design's file table could have named it.
- **Large related-test radius**: `--findRelatedTests` on two files ran 37 suites (~2 min each at 1–2 workers). This is accepted cost; no item.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` (glossary / assumptions guidance) |
| Edit | "When a requirement or check asserts what an existing screen element counts or shows, cite the code line or a live read that proves it; an unverified claim about existing UI is an Open Question, not a glossary fact." |
| Severity | Medium |
| Status | pending |
| Upstream | Recommend to the AKILI methodology repo (generic) |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` § "Añadido 2026-10-15 (spec `changes/sp-overview-total-drilldown`)" — `onTotalSegment` bullet |
| Edit | Append: "`received` (sp-overview-w3-received, SWR-DD-3) does not navigate: it calls `overviewSection.set('bilateral')` — a set, never the child's toggle — and the query-param sync writes `section=bilateral`." |
| Severity | Low |
| Status | pending |
