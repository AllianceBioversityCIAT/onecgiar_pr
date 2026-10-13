# Kaizen Entry — results/program-full-names-labels

## Document Control

| Field | Value |
|---|---|
| Spec Path | `results/program-full-names-labels` |
| Date | 2026-10-13 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated (continue gate waived by the user mid-run) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (T-2 and T-3 in parallel under a Jest lock) | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-2 ×1, T-3 ×1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Validation FAIL / WARN | n/a (HITL screenshot check passed) | archive-summary.md §5 |
| Budget | 3 tasks vs 3; ~170 prod vs ~120; ~290 test vs ~90; 4 review rounds vs 1–2 | execution.md — Summary |

## Lessons

- **KZ-results--program-full-names-labels-1 — The scoped lint command recorded for the client is wrong, and a false pass was reported.** (Product, Medium)
  - Root cause: the client has only `.eslintrc.json` while ESLint is v9. `npx eslint <files>` therefore finds no flat config. The workaround in two earlier entries, `ng lint --lint-file-patterns`, is rejected by this CLI ("Unknown arguments"). No guide states a file-scoped command that works, so every task improvises one. In this spec T-1 recorded a lint pass that never ran.
  - Evidence: execution.md — PFN-T-2 Attempt 1 (Verification line) and Summary → Tooling note; prior occurrences in `bugfix--cdk-overlay-root-zoom.md` and `changes--admin-user-login-report.md` (Noted).
  - Standardization: → P1
- **KZ-results--program-full-names-labels-2 — Test LOC estimates are systematically ~3× low.** (Product, Low)
  - Root cause: the design budget sizes test LOC from production LOC, as if the ratio were 1:1. In this codebase, Reviewer-driven falsifier and fallback cases push test lines to 2–3× production. This is the third spec in a row: here ~290 vs ~90, and before that `bugfix--primary-notify-on-submit-regression` and `changes--sp-overview-total-general-card`.
  - Evidence: execution.md — Summary → Budget; `bugfix--primary-notify-on-submit-regression.md` → Noted.
  - Standardization: → P2
- **KZ-results--program-full-names-labels-3 — A chip falsifier was satisfied by a model value the real control never emits.** (Product, Medium)
  - Root cause: the T-3 S7 falsifier ("chip reads `CODE - Name`") did not say how the selection enters the model. The Implementer called `selectedEntities.set([5])` with numeric ids. In reality `app-pr-filter-multiselect` without `optionValue` stores whole objects, so the user saw `[object Object]` while the test was green.
  - Evidence: execution.md — PFN-T-3 Attempt 1, Reviewer issue 1.
  - Standardization: → P3

## Noted, not a lesson

- T-2 attempt 1 implemented a narrower fallback chain than design §8 spelled out. This happened once and the Reviewer caught it, so the gate worked.
- An Implementer report assumed a column-width bug that turned out to be a localStorage-persisted user width. That check is a useful HITL habit, but not a rule yet.
- Two sessions shared one checkout. The other session's uncommitted files stayed out of this commit only because staging used explicit paths. This is a single occurrence.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `CLAUDE.md` (root) → Agent-lean verification table, `onecgiar-pr-client` Lint cell (mirror in `AGENTS.md`) |
| Edit | Replace `npx ng lint --quiet` with: `npx ng lint --quiet` (whole project) · file-scoped: `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet` (`.eslintrc.json` + ESLint 9; `ng lint --lint-file-patterns` is rejected) |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` → budget / sizing guidance |
| Edit | Size expected **test** LOC at 2–3× production LOC for client UI specs, since falsifier and fallback cases dominate. Do not reuse the production estimate. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` → Falsifier bullet (line ~71) |
| Edit | Append: "For filter chips / dropdown selections, drive the selection through the real control's emit path (e.g. `toggle(option)`), never by setting the model with a hand-built value." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/CLAUDE.md` §15 Pipes table |
| Edit | Add row: `sp-label.pipe.ts` — Standalone pure `spLabel`: P/A object → `CODE - Name` (code alone when no name); rule lives in `shared/utils/science-program-label.util.ts` (`scienceProgramLabel`, `withScienceProgramLabel` for option lists → `optionLabel="sp_label"`). |
| Severity | Low |
| Status | pending |

Constitution sync: no `## Constitution Impact` blocks. The factual sweep of the root guides found no claim this cycle falsified; the stale lint guidance is P1. No TRD/ADR change. A CodeGraph re-index (`codegraph sync`) is recommended for the new `shared/utils` and `shared/pipes` files.
