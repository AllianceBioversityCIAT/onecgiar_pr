# Kaizen Entry — bugfix/user-password-in-responses

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/user-password-in-responses` |
| Date | 2026-10-06 |
| Branch | qa-development-2026-ss (a spec branch: `Default Branch: master`, `Integration Branch: staging`) |
| Archive Run | 1 |
| Approval Mode | gated |
| Archive | `docs/specs/archive/2026-10-06-bugfix--user-password-in-responses/` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 of 1 | tasks.md |
| Reviewer FAIL rework attempts | 0 (2 parallel lens reviewers, both PASS on attempt 1) | execution.md PWD-T-1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 (`/akili-test` not run) | — |
| Judgment-day severe findings | 0 (the reversion challenge found nothing) | design.md PWD-DD-1 |
| Validation FAIL / WARN | 0 / 2 (both accepted risks: D5, D3) | validation-report.md |
| Budget | 1 task · ~68 LOC vs ~60 estimated · 1 review round | design.md §14 |
| Drift attributable | none | — |

## Lessons

**Clean run:** zero rework, no pivots, no product bugs, no severe findings. No lesson distilled.

## Noted, not a lesson

- **`npm run migration:check` was used as a "no schema change" gate, but it cannot detect one.** `scripts/check-pending-migrations.ts` compares migration files against the migrations table. It does not diff entities against the DB schema. The task named it as the PWD-P-5 check, and only the Implementer's disclosure caught the gap. Validation then closed it statically (`MysqlDriver.findChangedColumns` ignores `select`). This is the first occurrence. If another spec relies on `migration:check` to prove an entity change is DDL-free, promote this to a lesson. The candidate edit is in `docs/infrastructure.md` §6 next to the Migrations command: "counts pending migration files only; for an entity-drift check use `migration:generate --dryrun` or a static TypeORM argument."
- **A proposal check was not carried into requirements.** The proposal said "also check Swagger response schemas and webhook payloads". Requirements and tasks did not carry it, and validation performed it (no exposure). This is a single occurrence; it is close to the scenario-level orphan class.
- **The proposal premise was wrong and was corrected at specify.** The proposal said login reads the hash through raw SQL. Requirements §3 corrected it with evidence (Cognito, 0 callers), and that saved a needless opt-in path. The Premise Ledger worked as intended.
- **Parallel lens review** on a 1-line security fix produced the same advisory twice (the (a) guard counts one join). That redundancy is expected for security-tagged tasks; not waste worth acting on yet.
- **A concurrent session in the same checkout** (client notification files appeared mid-run). Explicit pathspecs kept the commit to exactly 8 files. This recurs `KZ-MRF-3`, already recorded in `bilateral--resubmit-rejected-result.md`, and is noted here for the count.

## Pending Items

None. There are no lessons, no Constitution Impact block, no falsified claims in the root guides, and no ADR overturned.
