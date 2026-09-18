# Kaizen Entry — changes/emerging-result-chip

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/emerging-result-chip` |
| Date | 2026-09-18 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 code tasks PASS (`EMG-T-1`..`T-3`); `EMG-T-0` escalated; `EMG-T-4` pending | `tasks.md`, `execution.md` |
| Reviewer FAIL rework attempts | 0 on implement; 1 validation FAIL remediated pre-archive | `validation-report.md` |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` |
| PRODUCT_BUGs | 1 (D-3 `Number(null)===0`) — fixed 2026-09-18 | `validation-report.md`, `results-list.component.ts` |
| Validation FAIL / WARN | 1 FAIL → remediated; EMG-T-4 WARN accepted | `validation-report.md` |
| `/akili-quick` escalation | 0 | n/a |

## Lessons

- **KZ-changes--emerging-result-chip-1 — Tri-state numeric fields need an explicit null guard before `Number()`.** (Product + Methodology, High)
  - Root cause: `isEmerging()` used `Number(result?.planned_result) === 0`; in JavaScript `Number(null) === 0` is true, falsely chiping ~52% of no-row results.
  - Evidence: `validation-report.md` §7 D-3; `design.md` §4 tri-state contract; fixed in `results-list.component.ts` with null/undefined/'' guard + spec.
  - Standardization: → P1.

- **KZ-changes--emerging-result-chip-2 — Validation FAIL on missing tests must block archive until the named spec clauses have co-located tests.** (Methodology, Medium)
  - Root cause: EMG-T-2/T-3 shipped without the clause tables' unit tests; validation caught it; archive was correctly blocked.
  - Evidence: `validation-report.md` §9; added `programme-results-section-labels.spec.ts` + EMG blocks in list/service/component specs.
  - Standardization: → P2 (upstream AKILI validate/archive gate).

## Noted, not a lesson

- 15% relabel rate from EMG-T-0 — product decision to ship Option B anyway; Option C tracked as F-1.
- EMG-T-4 manual checks deferred — acceptable with explicit archive follow-up.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` — tri-state / nullable numeric fields |
| Edit | Add: "When a DTO field is `0 | 1 | null`, client guards must reject `null`/`undefined` before `Number(x) === 0`; cite `Number(null) === 0` as the canonical trap." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/reviewer.md` or validate checklist |
| Edit | "Archive blocked when validation-report FAIL is unresolved; remediation must include tests for every `tasks.md` clause table row marked implemented." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | codegraph |
| Target | `.codegraph/` |
| Edit | Re-index after merge for `isEmerging`, `sectionLabel`, `planned_result` subquery. |
| Severity | Low |
| Status | pending |
