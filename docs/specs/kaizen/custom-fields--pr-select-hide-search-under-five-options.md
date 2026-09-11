# Kaizen Entry — custom-fields/pr-select-hide-search-under-five-options

## Document Control

| Field | Value |
|---|---|
| Spec Path | `custom-fields/pr-select-hide-search-under-five-options` |
| Date | 2026-09-11 |
| Branch | qa-development-2026-ss (spec branch — default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (`PSEL-T-1`..`PSEL-T-3`); `PSEL-T-4` accepted via user manual testing, not run as a task | task.md, execution.md |
| Reviewer FAIL rework attempts | 0 gating (the loop stalled on an attribution question, resolved by the Leader directly, not a FAIL cycle) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| `/akili-quick` escalations into this spec | 1 (this spec's own origin — correctly escalated from `/akili-quick emerging-result-dropdown` as a shared-component behavior change) | requirements.md |
| PRODUCT_BUGs | 0 | execution.md |
| Validation FAIL / WARN | 0 (no `validation-report.md`) | execution.md |
| Out-of-scope agent excursion | 1 (a dispatched Implementer began editing unrelated `entity-aow/` files; stopped via `TaskStop`) | execution.md — `PSEL-T-3` entry |

## Lessons

- **KZ-custom-fields--pr-select-hide-search-under-five-options-1 — A shared test-runner script (`npm run test:ct`) silently exits 0 on Windows/cmd.exe without executing any tests, because it uses a POSIX env-var prefix `cmd.exe` doesn't support — a whole test category can read as green when it never ran.** (Product, Medium)
  - Root cause: `package.json`'s `test:ct` script is `ELECTRON_EXTRA_LAUNCH_ARGS=... cypress run --component`. On Windows/cmd.exe this syntax isn't valid shell, and npm still reports exit code 0 — a false-positive green result for anyone checking only the exit code on that platform.
  - Evidence: `execution.md` — "Windows `npm run test:ct` silent-failure finding (recorded for the project, not caused by this spec)".
  - Standardization: → P1

## Noted, not a lesson

- The out-of-scope agent excursion into `entity-aow/` was caught and stopped (`TaskStop`) before any damage, with the spec's own files verified intact — the safety mechanism worked as designed, not a process gap.
- The untracked concurrent peer-session folder (`docs/specs/bugfix/emerging-result-contributor-catalog/`) appearing mid-run was correctly identified as not-this-spec's and left untouched — process working as designed.
- `PSEL-T-3`'s one skipped Cypress test is a documented Cypress-CT + Angular 21 harness limitation (reference-swap change detection), not a defect — 5 different fixes were tried and ruled out before skipping with inline reasoning. No lesson; this is the harness working within its documented limits.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `package.json` (`test:ct` script) |
| Edit | Fix the script to use `cross-env` for `ELECTRON_EXTRA_LAUNCH_ARGS`, or document in `onecgiar-pr-client/CLAUDE.md` §9 that `test:ct` must be run from bash, not cmd.exe/PowerShell, on Windows. |
| Severity | Medium |
| Status | pending |
