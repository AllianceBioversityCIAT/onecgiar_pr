# Kaizen Entry — bugfix/global-search-prod-deploy

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/global-search-prod-deploy` |
| Date | 2026-09-16 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 0 (Deploy-only action) | proposal.md |
| Reviewer FAIL rework attempts | 0 | n/a |
| HALTs / FATAL_FAILs | 0 | n/a |
| Pivots | 0 | n/a |
| PRODUCT_BUGs | 0 | n/a |
| Judgment-day severe findings | 0 | n/a |
| Validation FAIL / WARN | 0 / 0 | proposal.md |

## Lessons

- **KZ-bugfix--global-search-prod-deploy-1 — Release cadence discrepancy between staging and production led to filing a redundant bug report.** (Product, Low)
  - Root cause: Fix `27dd8f47b` was already implemented and merged on `staging`, but production had not yet undergone the scheduled deploy cycle. The local dev environment reproduced against prod data using updated staging code, causing confusion over data vs code issues.
  - Evidence: `proposal.md` §3, §4.
  - Standardization: → P1

## Noted, not a lesson

- Clean run from engineering perspective; issue was strictly deployment synchronization.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` |
| Edit | In bug intake guidance, remind investigators to verify `git merge-base --is-ancestor <fix-commit> master` and staging vs prod commit hashes before assuming an issue is unaddressed code. |
| Severity | Low |
| Status | pending |

**Branch Context:** current branch `qa-development-2026-ss`, default branch pinned to `master`. Pending item is recorded for the default branch apply phase.
