# Kaizen Entry — results/impact-results-reporting

## Document Control

| Field | Value |
|---|---|
| Spec Path | `results/impact-results-reporting` (family: server-foundation, sp-reporting-entry, result-detail-impact) |
| Date | 2026-11-01 |
| Branch | qa-development-2026-ss (spec branch, no shared-file writes) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 10 (#1) + 6 (#2) + 8 (#3) = 24 | tasks.md of each child |
| Reviewer FAIL rework attempts | 4 reviewer FAILs: #1 IRS-T-4 attempt 1 (E1 error strings); #2 IRE-T-4 attempt 1 (vacuous regex test); #3 IRD-T-3 attempt 1 (Yes to No, aria-live, focus) and IRD-T-4 attempt 1 (phase/portfolio label, filter labels). Plus one user-found rework: #2 IRE-T-6 icon paths | execution.md of each child |
| Review budget | #3 IRD-T-4 used round 10 of 10; #2 8 of 8; #1 11 of 12 | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 recorded | execution.md |
| Findings after code PASS | #3: F-1..F-8 (F-1..F-7 fixed); #2: icon defect (white glyph assets); #1: CI failure `qa-catalog.completeness` after merge | execution.md — IRD-T-8, IRE-T-6, IRS-T-9 |
| Environment issues | RAM saturation (a CT run killed at 177 MB free; runInBand and maxWorkers=1 runs); Implementers 60 to 170 min per task; Implementer `git stash` attempt; non-painting Chrome tab; Cypress binary missing; temp-function overwrite on PRTest | execution.md |
| PRODUCT_BUGs / Validation FAIL/WARN | n/a (no test-report.md or validation-report.md; accepted by the Leader) | archive-summary.md |
| Drift report | none (`docs/specs/audits/` holds only README) | — |

## Lessons

- **KZ-results--impact-results-reporting-1 — A result-type label change was gated at each surface by hand, so two surfaces were missed and were found after code PASS.** (Product, Medium)
  - Root cause: IRD-T-7 listed the surfaces to relabel by hand (sidebar, header, Results Center rows, SP Results, change-type modal). No step grepped every place that renders the type name, so the modal's "Current result type" line and the Results Center and picker filter options (which read the DB name) kept "Impact contribution". Fixed in a later rework (`ae5940b70`) plus a Leader design decision on the combined filter label.
  - Evidence: result-detail-impact/execution.md — IRD-T-7 "Files changed" and "Gating"; IRD-T-8 findings F-1 and F-2; "IRD-T-8 rework" table.
  - Standardization: → P1
- **KZ-results--impact-results-reporting-2 — Adding a result table or entity passes `--findRelatedTests` but breaks the QA catalog completeness guard, which loads entities by glob.** (Product, Medium)
  - Root cause: the pre-push gate runs only tests reachable from changed files. `qa-catalog.completeness.spec.ts` discovers entities by glob, so no import path reaches it. The migration added 2 tables and CI went red on the merge into `performance-refactor`; the fix (`4a141416e`) came after the push.
  - Evidence: server-foundation/execution.md — IRS-T-9 "CI failure on `fb8ad8075`" (QAC-R-7, 1 failed / 6,688) and its Kaizen candidate line.
  - Standardization: → P2

## Noted, not a lesson

- Vacuous or unable-to-fail tests recurred here twice: IRE-T-4 attempt 1 (regex that can never match, FAIL) and the IRD-T-8 contributors note test (passed under `NO_ERRORS_SCHEMA`, where `app-alert-status` text never renders). This repeats an existing lesson, so it is a `digest-update` (P3), not a new lesson.
- Bottom-bar completeness (F-4): non-`pr-field` controls need hidden `appFeedbackValidation` markers, and design.md did not say so. Single instance; if it recurs in another section spec, make it a design-checklist item. Fix applied: markers for Yes/No unanswered, statement over 100 words, Yes with no links.
- Implementer `git stash` attempt in a shared checkout (IRD-T-3). No damage; later briefs forbid stash, checkout and restore. Another user session commits in the same checkout.
- Implementer duration and RAM: 60 to 170 min per task and Jest kills on a slow machine. Already covered by the global `--maxWorkers` rules.
- A temp-copy instruction for a SQL function overwrote the migrated function on PRTest (restored, verified). Such instructions should lead with the rename and warn that the original name overwrites.
- `npm run test:ct:batch` exits red even when the target spec passes (pre-existing webpack and type errors in other files).
- The `pr-textarea.contract.cy.ts` HEAD baseline could not be run (gitignored environment files missing in a detached worktree; the user declined copying them). The "3 failures are not caused by the diff" claim rests on a code proof.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/tasks.md` |
| Edit | When a task changes how a result type, status or other catalog value is displayed, its Files section must list the output of a grep for every site that renders that name (templates, filter option builders, modals, services reading `result_type_name`), not a hand-picked list. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-server/CLAUDE.md` (pre-push gate notes) |
| Edit | A change that adds or renames a TypeORM entity or result table must also run `npx jest --maxWorkers=2 --testPathPattern=qa-catalog.completeness` before push, because `--findRelatedTests` cannot reach it. Add the table to the QA catalog `scope.ts` or `EXCLUDED_TABLES` in the same change. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-bilateral--review-drawer-readonly-rendering-1` |
| Edit | Add `results/impact-results-reporting` as a source (IRE-T-4 attempt 1 regex that cannot match; IRD-T-8 contributors note test vacuous under `NO_ERRORS_SCHEMA`). Recurrence note: related entries exist in `bugfix--emerging-result-contributor-catalog`, `bugfix--innovation-geo-other-areas` and `bilateral--review-list-source-and-reporter`. Raise severity to High if the apply pass confirms 3 or more specs. A negative or absence assertion needs a positive twin or a recorded mutation run. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/CLAUDE.md` (type-specific sub-pages list near line 222; `rdResultTypesPages` row near line 295) |
| Edit | Add `impact-level-info/` — `prHide: 9`, `portfolioAcronym: 'P25'` (Impact result section, P25 only; P22 type 9 keeps the old sections). Update the `rdResultTypesPages` row: it now also holds `impact-level-info`. |
| Severity | Low |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `AGENTS.md` §8.4 table, row `9` |
| Edit | Row 9 name "Impact contribution" -> "Impact contribution (P22–P24) / Impact result (P25, with an Impact level info section)". The DB name is unchanged. |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-server/src/CLAUDE.md` (row for `results-framework-reporting/`, near line 167; ResultTypeEnum note near line 460) |
| Edit | Add `impact-level/` to the nested mounts of `results-framework-reporting/` (endpoints `study-types`, `get/result/:id`, `save/result/:id`, `previous-results/search`, `counts`). Note that type 9 on P25 uses the `impact-level` tables and skips the ToC gate. Re-check the line numbers at apply time. |
| Severity | Low |
| Status | pending |

### P7

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/trd/trd.md` (data model near lines 161 and 240; module table row for `results-framework-reporting`) |
| Edit | Add tables `impact_study_type`, `results_impact_level`, `results_impact_previous_result`; module `impact-level` and its 5 endpoints; function `validation_impact_level_info_P25`; type-9 gates in `validation_contributor_partner_P25` and `validation_geo_location_P25`; migration `1792000000000-IRS-ImpactResultsFoundation`. |
| Severity | Low |
| Status | pending |

### P8

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | none, no ADR is superseded |
| Edit | No existing ADR is overturned. Optional new ADR text for apply time: impact results are P25-only (type 9 on P22–P24 keeps its sections), are stored in dedicated tables so the contributors single-writer is untouched, and are validated by a new P25 function. |
| Severity | Low |
| Status | pending |

## Constitution Impact (collected)

None of the three `execution.md` files contains a `## Constitution Impact` block. Everything the family changed that touches shared guides is recorded as P4 to P8 above. Recommended: run `codegraph sync` (`.codegraph/` exists; not run here).

## Upstream (methodology)

No methodology lesson, so no upstream recommendation.
