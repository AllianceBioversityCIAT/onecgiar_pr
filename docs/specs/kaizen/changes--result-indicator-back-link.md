# Kaizen Entry — changes/result-indicator-back-link

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/result-indicator-back-link` |
| Date | 2026-09-03 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (`RIBL-T-1`, `RIBL-T-2`) | `tasks.md`, `execution.md` |
| Reviewer FAIL rework attempts | 1 (T-2 attempt 1) | `execution.md` — RIBL-T-2 Attempt 1 FAIL |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 1 (T-2 — live V2 GET has no WP code) | `execution.md` — Pivot Record: RIBL-T-2 |
| PRODUCT_BUGs | 0 (no `test-report.md`) | accepted at archive |
| Judgment-day severe findings | 0 (no judgment) | — |
| Validation FAIL / WARN | n/a (no `validation-report.md`) | accepted at archive |
| `/akili-quick` escalations | 0 | — |

One pivot and one Reviewer FAIL. Not a clean run.

## Lessons

- **KZ-changes--result-indicator-back-link-1 — Name the HTTP field that carries a painted code, not the label the UI already shows.** (Product, High)
  - Root cause: `design.md` §5 assumed `GET_ContributorsPartners` rows carry `work_package_code` because Contributors already paints **AOW01**. That label comes from `GET_tocLevelsByconfig` `wp_short_name`. Live V2 serialize emits only `toc_result_id` / `toc_level_id` / `indicators[]`, so T-2 hid the strip on result 8989 and forced Pivot P1.
  - Evidence: `execution.md` — HITL 2026-09-03 result 8989; Pivot Record: RIBL-T-2; `getTocByResultV2` serialize in `results-toc-results.service.ts`.
  - Standardization: → P1

## Noted, not a lesson

- T-2 attempt 1 Reviewer FAIL was missing clause-coverage Jest that `tasks.md` §3 already named. Process gap already gated; no new rule.
- Budget tripwire (LOC + second review) caused by that same omitted Jest, not by P1.
- Agent HITL still cannot log in at `:4200`. Same environment limit already noted on `changes--result-submitter-back-link` — not a new process gap.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` §4.1 |
| Edit | After the endpoint table, add: "If an existing UI already paints a code this spec will reuse, name the HTTP response field that carries it. A sibling GET that stores the mapping is not that field unless the serialize (or a live dump) shows it." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` — `result-header/` row |
| Edit | Change the Qué hace cell to: "Título, back-link, PDF, menú, tira de identidad (Submitter → program home; Area of Work → `entity-details/{code}?tocView=byAow&tocAow=` from Contributors GET + ToC catalog `wp_short_name` when the V2 row has only `toc_result_id`). Do not put these links in LabReportFormComponent." |
| Severity | Medium |
| Status | pending |
