# Kaizen Entry — changes/center-results-kpi-chips

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/center-results-kpi-chips` |
| Date | 2026-10-21 |
| Branch | qa-development-2026-ss (spec branch, since `Default Branch: master`; every shared-file write below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 of 6 + 1 fix task (T-4a, from the T-6 smoke) | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 2 (T-4 attempt 1, T-4a attempt 1) | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| Defects found only on PRTest | 3 layout (status line 40px, role 24px, phase tag truncated) | execution.md CRK-T-6 partial run |
| PRODUCT_BUGs | n/a (no `/akili-test`; absence accepted) | — |
| Validation FAIL / WARN | n/a (no `/akili-validate`; absence accepted) | — |
| Budget | 6 tasks as planned (+T-4a); review rounds T-4 2 (= cap), T-4a 2; LOC ≈ 886 vs ~380 | execution.md Budget check |

## Lessons

- **KZ-changes--center-results-kpi-chips-1 — Turning a flat table row into a grouped row must list every per-row control in the task's falsifier, not only the row click.** (Product, Medium)
  - Root cause: design §6.2 said "any per-row action … pass the version, not the group", but the CRK-T-4 falsifier and the §12 reversion challenge named only the row click, keyboard and focus. The "⋯" menu (Open, Update, PDF, Copy link, Delete) was not named, so the Implementer bound it to the newest version. The older version lost its actions until the Reviewer caught it.
  - Evidence: execution.md — CRK-T-4 attempt 1 FAIL (Violated Rule: design.md §6.2 L77; tasks.md CRK-T-4 Consumers).
  - Standardization: → P1
- **KZ-changes--center-results-kpi-chips-2 — A CSS fix briefed from a live smoke must carry the content widths measured on that page, not estimates.** (Product + Methodology, Medium)
  - Root cause: the T-4a brief prescribed `nowrap` for the status badge + history icon without measuring the content against the 120px column. The Reviewer estimated about 125px from font metrics and failed it (icon clipped). The Leader then measured 107 + 4 + 16 = 127px on PRTest and set 156px; 140px, the Reviewer's suggestion, would still have truncated.
  - Evidence: execution.md — CRK-T-4a attempt 1 FAIL and attempt 2 (Status 156px "based on the Leader's PRTest measurement").
  - Standardization: → P2

## Noted, not a lesson

- **Recurrence of `KZ-OAH-1` (jsdom measures no layout).** Three alignment defects passed every Jest gate and were found only by the PRTest smoke. → P3 `digest-update`.
- **Recurrence of the client scoped-lint gap.** tasks.md DoD lines said `npx eslint <files> --quiet`, which fails in the client. Every Implementer had to use `ESLINT_USE_FLAT_CONFIG=false`. → P4 `digest-update`.
- **Leader deleted a user preference.** During the smoke the Leader removed `pr.bilateralResults.columnWidths.v1` from the user's localStorage, wrongly assuming its own simulation wrote it. The user had resized the column. A browser check should ask before clearing storage it did not write; recorded as user feedback in memory, not a project rule.
- tasks.md CRK-T-1 "Consumers" named `findWorkPackagesByProgram`, which does not use `buildTocQuery`. Spec-text drift; the Reviewer caught it and no code changed.
- The rerun of an unrelated CI run (`39642986339`, `npm ci` ECONNRESET) was an infrastructure event, not a spec signal.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Reversion challenge guidance) |
| Edit | When a change regroups table rows (one row → several stacked versions), the reversion challenge lists **every** per-row control (row click, keyboard, focus, row menu items, inline triggers) and states which version each one acts on. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` (append under the project block / *Deferring a check*) |
| Edit | A layout fix briefed from a browser smoke carries the measured pixel widths of the content involved (`getBoundingClientRect` on the live page), with the target column/box width — never estimates. |
| Severity | Medium |
| Status | pending |
| Upstream | Recommend the same line for the AKILI methodology Leader persona template |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-OAH-1` |
| Edit | Add source `changes/center-results-kpi-chips`: 3 stacked-line alignment defects (status line 40px from a wrapped icon, role 24px, phase tag truncated) passed Jest and were found by the PRTest smoke (CRK-T-6); one extra fix task (T-4a). |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `docs/specs/kaizen/bilateral--replicated-innovations-2026-pa--center-overview-w3-scope.md` (P1, factual-sweep on the client Lint cell of `AGENTS.md`) |
| Edit | Another occurrence: `changes/center-results-kpi-chips` tasks.md DoD prescribed `npx eslint <files> --quiet`, which fails in the client; all 5 client tasks used `ESLINT_USE_FLAT_CONFIG=false`. Apply the existing P1 line. |
| Severity | Low |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` (L21-22 and L229) |
| Edit | After L22 add: "- `reportingGroupsForCounts()` = same builder with Category switched off (`buildReportingGroups(false)`); `reportingTypologyCounts` reads it, so chips follow Section/Type/Target and ignore their own selection; `buildQuickTypologyChips` hides 0-count chips except `all` and the active one (spec `changes/center-results-kpi-chips`, CRK-DD-1/DD-2)." In L229 replace "Chips (`reportingTypologyCounts`), cards, split line and ratio read the filtered rows" with "Cards, split line and ratio read the filtered rows; chips read `reportingGroupsForCounts()` (Target applied, Category not)". |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/CLAUDE.md` (after L7, plus a new section) |
| Edit | After L7 add: "Rows are grouped by `result_code` after filtering (`groupCenterResults`, `../../bilateral-result-grouping.ts`): each cell stacks one 28px `.rc-line` per version, newest first; every line opens its own version (click/Enter, one tab stop per version on the first column); the "⋯" menu is per version; `is_replicated` versions show "Previously reported"; `filteredResults`/export stay flat. The Filters popover has an "Indicator category" multiselect bound to the `type` URL param (spec `changes/center-results-kpi-chips`)." |
| Severity | Low |
| Status | pending |

### Constitution sync

There is no `## Constitution Impact` block in `execution.md`. A new pure util file was added inside an existing module (`pages/bilateral/`); no module boundary or public surface moved. The root-guide factual sweep found no claim falsified by this spec, so there are no own `factual-sweep` items (the client Lint cell is the pre-existing item P4 points to) and no `trd-adr` items. CodeGraph re-index recommended (`.codegraph/` exists).
