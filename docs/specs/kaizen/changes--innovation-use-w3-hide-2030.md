# Kaizen Entry — changes/innovation-use-w3-hide-2030

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/innovation-use-w3-hide-2030` |
| Date | 2026-11-12 |
| Branch | qa-development-2026-ss (spec branch — Integration Branch pin is `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (2 code, 1 user-run data) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 (no test-report.md) | — |
| Judgment-day severe findings | 0 | — |
| Validation FAIL / WARN | 0 / 4 | validation-report.md §11 |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 (T-3 skip-eligible, user-run, no block recorded) | execution.md |
| Escaped defects (§3) | 0 code defects; 1 falsified premise (P-10) found after the PROD write | execution.md — IWH-T-3 |
| Drift attributable | none | — |

## Lessons

- **KZ-changes--innovation-use-w3-hide-2030-1 — A "this column is the only reason the validation fails" premise was settled only after the PROD write.** (Product, Low)
  - Root cause: design P-10 was marked UNVERIFIED with "settled by re-running the validation after the UPDATE". The live function body was in the repo (`archive/2026-11-03-…/validation_innovation_use_P25.after.body-only.sql`), so a read-only per-condition check could have shown the empty budget rows before anything was written. Both PROD rows (32686, 32740) stayed red after the UPDATE.
  - Evidence: design.md §1A P-10; execution.md — IWH-T-3 "P-10 falsified for 32686" and the 2026-11-12 entry for 32740 (SP02).
  - Standardization: → P1
- **KZ-changes--innovation-use-w3-hide-2030-2 — A view-only browser check reported a merged feature as "not deployed to prod" because it sat behind a collapsed toggle.** (Product, Low)
  - Root cause: the check looked for the "2030" text on the default (MDS) view of the bilateral page. P2-3428's block renders only after "Complete full metadata". The conclusion was drawn from absence on screen, with no git ancestry check. It was corrected the same day with `git merge-base --is-ancestor`.
  - Evidence: execution.md — IWH-T-3 "Prod UI check" and "Correction (same day)".
  - Standardization: → P2

## Noted, not a lesson

- `requirements.md` §3/§7 referenced an IWH-T-0 task that never existed (the data check moved into specify as P-8, then became T-3). Fixed at archive (validation W-3).
- `tasks.md` T-1 test 3 asked for a DOM "present" assertion under IPSR that the DOM cannot satisfy: an outer `@if (isP25() && !isIpsr)` already excludes IPSR. Asserted at getter level instead. The specify consumer grep did not read enclosing gates.
- LOC budget counted deleted markup as ~0. A spec that mandates deleting a block overruns its line budget by construction (≈265 changed vs ~120). Recurrence feed.
- `projection2030Copy` left unused by scope.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Premise Ledger guidance) |
| Edit | A premise that a DB validation function fails *only* because of one column is settled before any data write, by a read-only per-condition evaluation of the live function body, never by re-running the function after the UPDATE. |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` (browser verification notes) |
| Edit | Before reporting a feature as "not in PROD/PRTest" from a browser check, confirm with `git merge-base --is-ancestor <commit> origin/master` (or `origin/performance-refactor`) and expand collapsed sections such as the bilateral "Complete full metadata" toggle. Absence on the default view is not evidence. |
| Severity | Low |
| Status | pending |
