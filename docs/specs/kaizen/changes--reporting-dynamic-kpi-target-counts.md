# Kaizen Entry — changes/reporting-dynamic-kpi-target-counts

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-dynamic-kpi-target-counts` |
| Date | 2026-10-16 |
| Branch | qa-development-2026-ss (spec branch; default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| Implementer scope gaps caught by Leader | 1 (T-2 skipped two tasks.md-listed tests) | execution.md, DKT-T-2 |
| Defects reaching HITL | 0 | execution.md, DKT-T-3 |
| Budget | 3 tasks, 1 review round each; within §7 | execution.md Summary |
| Validation FAIL / WARN | n/a (Lite, no validation-report) | archive-summary.md |
| Runtime events | 1 rate limit (T-2 Implementer) | execution.md |

## Lessons

- **KZ-changes--reporting-dynamic-kpi-target-counts-1 — The documented client lint command fails on touched files: the client still uses `.eslintrc.json`, so `npx eslint <files>` needs `ESLINT_USE_FLAT_CONFIG=false`.** (Product, Medium)
  - Root cause: the global testing rules say lint only touched files with `npx eslint <files> --quiet`, while the client has no flat config; ESLint 9 then errors "couldn't find an eslint.config". The T-1 Implementer reported lint as not run; the Leader re-ran it with the env var.
  - Evidence: execution.md — DKT-T-1 attempt 1 "Implementer Not Done (1)" and "Leader adjudication".
  - Standardization: → P1

## Noted, not a lesson

- T-2 Implementer first omitted two tests named in tasks.md (host HLO sum, `buildQuickTypologyChips`), citing awkward fixtures. The Leader's `Not Done` check caught it before review; the process worked as designed.
- The final commit swept in 5 files another session had already staged. Shared-checkout staging; check `git diff --cached --name-only` before committing explicit paths.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md`, commands / lint |
| Edit | Add: "Lint touched files with `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet` — the client still uses `.eslintrc.json`; without the variable ESLint 9 fails with \"couldn't find an eslint.config\" (reporting-dynamic-kpi-target-counts, 2026-10-16)." |
| Severity | Medium |
| Status | pending |
