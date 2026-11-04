# Kaizen Entry — bilateral/project-picker-sp-chips

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/project-picker-sp-chips` |
| Date | 2026-10-26 |
| Branch | qa-development-2026-ss (spec branch; default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 / 1 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | — (no test-report) | — |
| Validation FAIL / WARN | 0 / 3 | validation-report.md §2 |
| Budget | 1 task, 1 round as planned. LOC 290 vs ~150 (prod 104 vs ~60, spec 186 vs ~90); user accepted | execution.md "Budget tripwire" |
| Drift attributable | 1 figure (execution.md "13 chips" → 12), fixed in validation | validation-report.md §8 |

## Lessons

- **KZ-bilateral--project-picker-sp-chips-1 — The task's verification lint command could not run in the client package.** (Product, Low)
  - **Root cause:**
    - tasks.md *Verification* used `npx eslint <dir> --quiet`.
    - The client has only `.eslintrc.json` and no flat config, so ESLint 9 exits 2.
    - The client guides document only `npm run lint` (whole project), so they give no scoped lint form to copy.
  - **Evidence:** execution.md PSC-T-1 "Implementer verification" (ESLint bullet); Reviewer advisory 6.
  - **Standardization:** → P1

## Noted, not a lesson

- **Falsifier asserted without checking the DOM** (tasks.md falsifier #4 assumed an ancestor overlay listener; the overlay is a sibling): this is the same root cause as **KZ-changes--sp-overview-w3-received-1**, an unverified claim about existing UI. Recurrence → P3 (digest-update), not a new lesson.
- **LOC budget about 2× under** for the second spec in a row (sp-overview-w3-received: ~170 vs ~90). The causes differ: there it was existing literals, here it was one test per clause-ownership row (16 cases ≈ 12 LOC each). The data is too thin for a rule. Watch the next Lite spec that has a clause-ownership table.
- **S-3.2 fixture too weak** (validation WARN-2): a test-design slip, already covered by the tdd skill's guidance on tests that pass for the wrong reason. No item.
- **Execution figure typo** (13 vs 12 chips): caught by the validation cross-document check, so the gate worked as designed. No item.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` § commands (next to `npm run lint`) |
| Edit | "Scoped lint (touched files only): `ESLINT_USE_FLAT_CONFIG=false npx eslint --ext .ts,.html <paths> --quiet` — the package has `.eslintrc.json` only, so plain `npx eslint` (ESLint 9 flat-config default) exits 2." |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/components/section-zero-dashboard/CLAUDE.md` (PAA-T-1 / project selector notes) |
| Edit | Append: "Replicated results (`isReplicated()`): the inline `app-bilateral-project-selector` shows Science Program chips (spec `bilateral/project-picker-sp-chips`). The default chip is `selectedPrimarySp().programCode`, matched by code. The selector reads the service directly, so Section 0 passes no new input." |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `docs/specs/kaizen/changes--sp-overview-w3-received.md` KZ-1 / its future digest row |
| Edit | Recurrence +1 (bilateral/project-picker-sp-chips: tasks.md falsifier #4 assumed an ancestor overlay click handler; the DOM has a sibling). Extend the scope from "what an existing element counts" to "any claim about existing UI behavior or structure that a check depends on". Raise the severity to Medium-High if it recurs a third time. |
| Severity | Medium |
| Status | pending |
