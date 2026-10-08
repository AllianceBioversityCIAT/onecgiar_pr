# Archive Summary — Paginator Rows-Per-Page Dropdown Shows The Wrong Value

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/pr-table-paginator-dropdown-select` |
| Archive Date | 2026-10-08 |
| Branch (at archive time) | `qa-development-2026-mc` (spec branch — neither `Default Branch: master` nor `Integration Branch: staging`) |
| Depth | Lite (Bug Mode) |
| Approval Mode | gated (each phase gate confirmed with the user) |

## 2. Final Status

**Shipped.** Single task (`PTD-T-1`) PASSed on first Implementer attempt, Reviewer `PASS` on first review, committed, pushed, and merged forward into `performance-refactor` (commit `92faed3c0`) at the user's explicit direction — the same direct-merge integration path this project's redesign line already uses (recorded historically in `changes/table-pagination-default-100-rows`'s own archive, below).

## 3. Requirements Delivered

| ID | Description | Status |
|---|---|---|
| `PTD-R-1` | Paginator `<select>` visually reflects `effectiveRows()` regardless of its position in `rowsPerPageOptions` | ✅ Delivered |
| `PTD-R-2` | No change to `effectiveRows()`, row count, or other paginator behavior | ✅ Delivered |
| `PTD-R-3` | Fix contained to the two shared components — no consumer-file changes | ✅ Delivered |
| `PTD-AC-1` | Non-first-option default (bilateral case, `rows=100`) shows `"100"` | ✅ Delivered, pinned by new Jest DOM assertion |
| `PTD-AC-2` | First-option default (the common case) still shows correctly — no regression | ✅ Delivered, pinned by new Jest DOM assertion |
| `PTD-AC-3` | Changing the dropdown still fires `setPageSize(...)` | ✅ Delivered (the "DOM reflects the new selection" half flagged by the Reviewer as untested — see §7) |

## 4. Files Changed Summary

(From `execution.md`, Attempt 1 of `PTD-T-1`.)

- `onecgiar-pr-client/src/app/shared/components/pr-table/pr-table.component.html` — removed `[value]="effectiveRows()"` from the paginator `<select>`, added `[selected]="opt === effectiveRows()"` to each `@for`-generated `<option>`.
- `onecgiar-pr-client/src/app/shared/components/pr-table/pr-group-table.component.html` — identical edit.
- `onecgiar-pr-client/src/app/shared/components/pr-table/pr-table.component.spec.ts` — 2 new DOM-reading tests (non-first-option, first-option no-regression).
- `onecgiar-pr-client/src/app/shared/components/pr-table/pr-group-table.component.spec.ts` — same.

No `.ts` logic changes, no consumer-file changes — matches `PTD-R-2`/`PTD-R-3` exactly.

## 5. Test Evidence Summary

No standalone `test-report.md` was produced — **absence accepted**. TDD red→green was run inline by the Implementer per the `tdd` skill: both new DOM-reading tests observed failing on the real behavioral assertion (`Expected: "100", Received: "10"`) against the pre-fix template, then passing after the `[selected]` edit.

- `npx jest --silent --reporters=summary --no-coverage --testPathPattern="pr-table.component.spec|pr-group-table.component.spec|bilateral-results-list.component.spec"` — 137/137 pass (all pre-existing `effectiveRows()`-signal assertions held).
- `npx ng lint --quiet` — clean.
- Non-author evidence re-run (Leader-inline `git diff`) — confirmed the diff matched the Implementer's report exactly, no mismatch.

## 6. Validation Summary

No standalone `validation-report.md` was produced — **absence accepted**. Equivalent evidence: a conformance Reviewer `PASS` (task was `Review: checklist`, not skip-eligible, since the shared component has 26 consumer tables) plus the TDD red→green run itself, which is direct behavioral proof the DOM now shows the correct value.

## 7. Accepted Warnings Or Follow-Ups

Reviewer's `ADVISORY` findings (all non-blocking, none promoted to a FAIL):

- **Reliability** — `PTD-AC-3`'s "dropdown reflects the newly chosen option" clause has no DOM-level test (existing `(change)`-handler tests call `setPageSize()` directly, without dispatching a real `change` event or reading the DOM back). Gap is in the task's own test-plan claim, not Implementer drift. Cheap follow-up, not filed as a task per the Kaizen rule against growing scope from an advisory.
- **Reliability** — `opt === effectiveRows()` is strict-typed; safe under current typing, but a consumer passing string option values through `any` would reproduce the original symptom. Optional hardening (`+opt === effectiveRows()`) noted, not applied.
- **Reliability** — when `effectiveRows()` is not a member of `rowsPerPageOptions` at all (no table in production today does this), the dropdown silently falls back to the first option — identical to pre-fix behavior for that configuration, not a regression. Folded into the existing native-`<select>` migration tech debt below.
- **Readability** — minor assertion asymmetry between the two new test cases. Harmless.

**Known, pre-existing tech debt (not this spec's job, explicitly out of scope):** the paginator remains a bare native `<select>` — a documented violation of `onecgiar-pr-client/CLAUDE.md` §5's "never a bare native control" rule. Migrating to `app-pr-select`/Spartan is tracked as a separate future change (`proposal.md` §6 Non-Goals).

## 8. Historical Notes

- This spec was reached via an **automatic `/akili-quick` escalation**: the user's original request ("ajusta el dropdown... en todas las tablas existentes en el sistema") explicitly named cross-cutting, system-wide scope, which `/akili-quick`'s own Automatic Escalation gate correctly caught before any code was touched, routing to `/akili-propose` (Bug Track) instead. This is the escalation mechanism working exactly as designed, not a process failure — noted for the Kaizen Measure step, which records it as a clean signal.
- Root cause (confirmed): a native `<select>`'s `[value]` binding cannot reliably select a dynamically `@for`-generated `<option>` when the bound value is not the first option in the list — invisible everywhere except bilateral, whose `rows=100` default (set earlier in `quick/bilateral-results-default-100-rows`) was the only one not matching its own `rowsPerPageOptions[0]`.
- This spec directly motivated the follow-on `changes/table-pagination-default-100-rows` spec (archived in the same pass as this one), which relies on this fix to guarantee every table's dropdown displays its new default correctly.
- Branch state at archive time (`qa-development-2026-mc`, a spec branch) is not this project's designated apply-capable branch (`staging`, per the `Integration Branch:` pin). The user explicitly directed a direct-merge integration path instead of a PR: `qa-development-2026-mc` was merged forward into `performance-refactor` and pushed (commit `92faed3c0`) — `performance-refactor`, not `staging`, continues to be the actual integration branch for this redesign line of work, consistent with the same factual note already recorded in the `changes--topbar-release-notes-bell-position` archive summary. Recorded here for the constitution factual-claims sweep, not acted on from this branch.
