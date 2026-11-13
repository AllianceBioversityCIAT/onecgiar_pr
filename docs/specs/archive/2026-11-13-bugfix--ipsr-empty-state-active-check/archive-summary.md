# Archive Summary — IPSR empty-state check counts unsaved rows

**Outcome:** shipped. "No … provided" now shows only when a list has no real, active row. The fix covers IPSR Step 1 Facilitators, Experts and Targeted innovation use, and Step 3 Actors, Organizations and Other measures. It is in `master` (commit `69accac48`).

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/ipsr-empty-state-active-check/` |
| Archive date | 2026-11-13 |
| Archived from branch | `qa-development-2026-ss` (spec branch; integration branch is `staging`) |
| Owner | santiago.sanchez@cgiar.org |
| Ticket | none (found in manual QA, 2026-09-28) |
| Depth · Mode | Lite · Bug |
| Final status | **Complete**: 6/6 tasks `[x]`, manual HITL check passed (user, 2026-09-28) |

## Requirements delivered

| Requirement | What it guarantees | Status |
|---|---|---|
| `IPSR-ESC-R-1` | An unsaved row with data counts as present (`is_active != false`). Deleted rows do not count. The read-only branch is unchanged. | Delivered |
| `IPSR-ESC-R-2` | The auto-added blank placeholder row does not count until its primary field is set (`significantFields`). Applies to Facilitators, Actors and Organizations. | Delivered (Pivot 1) |
| `IPSR-ESC-R-3` | The same rule in `innovation-use-form.component.ts` for Actors, Organizations and Measures. Measures uses `quantity`, not `unit_of_measure`. | Delivered (Pivot 2) |

## Files changed

| File | Change |
|---|---|
| `step-n1.component.ts` / `.html` | `hasElementsWithId(list, attr, significantFields?)`; the Facilitators call passes 4 fields |
| `step-n1-experts.component.ts` | `!= false` only (no placeholder row on this list) |
| `step-n3-current-use.component.ts` / `.html` | `significantFields` on Actors and Organizations. Other measures keeps the 2-arg call |
| `shared/components/innovation-use-form/innovation-use-form.component.ts` / `.html` | `significantFields` on the 3 "current use" call sites. The 2030-projection sites are untouched |
| 4 `*.spec.ts` files | 15 new regression cases, written red first |

## Test evidence

| Suite | Result |
|---|---|
| `step-n1`, `step-n1-experts`, `step-n3-current-use` specs | 67/67 |
| `innovation-use-form.component.spec` | 146/146 |
| `ng lint --quiet` | clean |
| Manual HITL (local dev server, fresh build) | PASS. User: "funciona perfecto" |

`test-report.md` and `validation-report.md` were never produced (Lite Bug spec). The user accepted their absence when they asked for this archive on 2026-11-13.

## Validation summary

No `/akili-validate` run. Each task had a Reviewer PASS on attempt 1, and the user's manual check covers the DOM-render half that no automated gate reaches.

## Accepted warnings / follow-ups

- No Jira ticket was ever raised. Nothing to close.
- The design keeps the auto-push of blank placeholder rows (`getSectionInformation()` / `onSectionInformation()`). Removing it was rejected as out of scope (Pivot 1, alternative 3).

## Historical notes

- **Pivot 1 (T-2):** the approved `!= false` fix made the empty state disappear forever. The cause was the blank placeholder row that gets auto-pushed after every save.
- **Pivot 2 (T-6):** the "reference implementation" (`innovation-use-form.component.ts`) that the original fix was copied from had the same gap. Live DOM inspection found it during the HITL check.
- Scope grew from 3 files and ~30 LOC to 4 files and ~110 LOC. Each pivot was approved by the user before the code changed.

## Diagrams

None. The spec has no `diagrams/` folder.
