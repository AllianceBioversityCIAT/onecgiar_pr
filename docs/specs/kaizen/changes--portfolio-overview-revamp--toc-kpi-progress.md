# Kaizen Entry — changes/portfolio-overview-revamp/toc-kpi-progress

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-revamp/toc-kpi-progress` |
| Date | 2026-10-16 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated (user: "continua hasta que termines") |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 7 (1 user-run premise + 5 code + 1 HITL) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-2: BIGINT `versionId` arrives as a string, so `Number.isFinite` returned 404 on every call) | execution.md: TKP-T-2 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| Post-execution rule change | 1 (P2-3974 target-only rule superseded "no target filter"; fixed by follow-up child #10) | requirements.md / design.md amendment, family.md |
| HITL invalid run | 1 (first parity compared local PRTest v36 with prod v8) | execution.md: TKP-T-6 "Parity: NOT yet evidence" |
| Validation FAIL / WARN | n/a (no validation-report; T-6 PASS) | execution.md: TKP-T-6 |
| Budget | ≈ 950 LOC estimated → ≈ 1,885 added (+98 %); the 1,300 tripwire fired and the user accepted | execution.md: Budget Tripwire |
| Drift | No audit report in `docs/specs/audits/` | — |

## Lessons

- **KZ-changes--portfolio-overview-revamp--toc-kpi-progress-1 — A spec that another open spec is required to amend must carry that amendment as a blocker, not as a note in the other spec.** (Product, High)
  - Root cause: `kpi-progress-target-only` KTO-R-9 required #5 to record the target-only rule "before its own execution". The user resolved KTO-OQ-4 on 2026-10-15. But neither #5's family row ("Depends on") nor its tasks named that amendment. #5 was executed and shipped with the superseded rule ("No year / target filter on indicators"), so a dated amendment and a follow-up bugfix spec (#10) were needed the same day.
  - Evidence: `kpi-progress-target-only/requirements.md` KTO-R-9; `toc-kpi-progress/requirements.md` "Amendment (2026-10-16)"; `family.md` rows #5 / #10.
  - Standardization: → P3
- **KZ-changes--portfolio-overview-revamp--toc-kpi-progress-2 — A HITL parity task must name the database the local server actually uses and its active version.** (Product, Medium)
  - Root cause: T-0 ran query C on prod (version 8), and T-6 assumed the local stack used the same database. The local `.env` points to PRTest (version 36, "TEST ENVIRONMENT" banner, and `versionId=8` returned 404). The first parity run compared two different results databases and had to be discarded.
  - Evidence: execution.md TKP-T-6 "Environment finding" and "1. Parity: NOT yet evidence (version mismatch)".
  - Standardization: → P4

## Noted, not a lesson

- T-2's BIGINT-as-string bug: `version.id` arrives from mysql2 as a string, so `Number.isFinite('36')` is false. A Reviewer caught it on the first round; the fix is `Number()` coercion. Seen once in this family.
- The agent cannot run a non-admin 403 check: login sends the password to the external Cognito service. Live auth checks should be written as user-run from the start. Here it cost one round trip.
- The local window again could not be resized to 375; same-origin iframes were used, as in #3 and #4 (already noted in `changes--portfolio-overview-revamp--typology-view.md`).
- The shell topbar's horizontal scroll at 768 is pre-existing and not this spec.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-2` |
| Edit | Add `changes/portfolio-overview-revamp/toc-kpi-progress` as a recurrence: ≈ 950 LOC estimated vs ≈ 1,885 added (tests 1,107 of it). This is the third family child in a row to trip the tripwire. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-1` |
| Edit | Add `changes/portfolio-overview-revamp/toc-kpi-progress` as a recurrence: client lint again needed `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet`. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/family.md` (child table, "Depends on" column guidance) |
| Edit | "Depends on" also lists any open spec that must amend this child's requirements before execution (e.g. a cross-spec MUST like KTO-R-9). Execution is blocked until that amendment is in the child's docs. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/infrastructure.md` §6 Local Environment |
| Edit | The local server `.env` points at the PRTest database (banner "TEST ENVIRONMENT"; its active version differs from prod). Run parity or real-data queries on that same connection with its active version id, never on prod. |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-server/src/CLAUDE.md` §2.2 (`results-framework-reporting/` row) |
| Edit | Add: "`GET toc-results/portfolio-coverage`: admin-only portfolio ToC KPI coverage (KPIs with a target only, P2-3974); SQL in `AoWBilateralRepository.getPortfolioTocCoverage`." |
| Severity | Low |
| Status | pending |
