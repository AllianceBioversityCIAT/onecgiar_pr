# Kaizen Entry — changes/emerging-creation-hide-indicator-ui

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/emerging-creation-hide-indicator-ui` |
| Date | 2026-09-11 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 (EHU-T-1) | tasks.md |
| Reviewer FAIL rework attempts | 1 (Task EHU-T-1, attempt 1 — doc-accuracy) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 (no separate `/akili-test` run — verification embedded in Implementer/Reviewer loop) | execution.md |
| Judgment-day severe findings | 0 | n/a |
| Validation FAIL / WARN | 0 / 0 (no `validation-report.md` — accepted for this Lite spec, verification evidence lives in `execution.md`) | n/a |

## Lessons

- **KZ-changes--emerging-creation-hide-indicator-ui-1 — A literal template diff prescribed in `design.md`/`tasks.md` assumed a wrong block span.** (Methodology, Medium)
  - Root cause: `design.md` DD-1 and `tasks.md` step 1 both instructed adding `!isEmerging() &&` to a *named single existing `@if`* at a specific line, describing it as "Card 2's existing wrapper" — without first confirming, by reading the file, that this `@if` actually spanned Card 2 **and** Card 3 **and** the sticky create footer **and** owned the footer's `@else`. Applying the literal instruction would have hidden the create button entirely in emerging mode. The Implementer caught this only by reading the full block during implementation, not because the spec flagged the risk.
  - Evidence: `execution.md` — Task EHU-T-1 attempt 1, "Deviation from literal task brief"; `design.md` DD-1.
  - Standardization: → P1

- **KZ-changes--emerging-creation-hide-indicator-ui-2 — Conditionally hiding a UI element did not account for hardcoded sibling references that assumed its presence.** (Product + Methodology, Medium)
  - Root cause: `requirements.md`/`design.md` scoped this spec as pure DOM-presence visibility ("hide Card 2 entirely") but did not check for adjacent hardcoded content that numerically assumes Card 2's presence — Card 3's header was a literal `"3. Collaboration & Attribution"` string, so hiding Card 2 left a visible "1. ... 3. ..." sequence with no "2.". This was caught only by the user testing the live build after Reviewer PASS on attempt 1 (the Reviewer audits diffs, not rendered sequences), and folded into attempt 2 as an addendum.
  - Evidence: `execution.md` — Task EHU-T-1 attempt 2, addendum trigger; `requirements.md` §3 (scope only covers DOM presence, not sibling numbering).
  - Standardization: → P2

## Noted, not a lesson

- None below the lesson bar this run.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | Add to the Design Decisions guidance: "When prescribing a literal template/code diff for a conditional block (`@if`/`@else`, matching braces), verify the block's actual open/close span in the source file first — do not infer it from the visual section it appears to wrap." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` |
| Edit | Add to the scope-definition guidance: "If this spec hides/removes a UI element, check for sibling elements whose copy or numbering assumes that element's presence (step/section numbers, 'X of Y' labels) and include updating them in scope." |
| Severity | Medium |
| Status | pending |

**Upstream recommendation (P2, Methodology half of the dual lesson):** the AKILI methodology's spec-authoring templates for "hide/remove a UI element" style changes should generically prompt for an adjacent-sibling-reference check, not just DOM-presence assertions — recommend upstreaming this checklist item to the AKILI repository's `general-setup` templates.

**Branch Context:** current branch `qa-development-2026-ss`, default branch pinned to `master` (root `CLAUDE.md`) → spec branch. Both pending items above are recorded only; no shared file was edited. They await the apply phase on `master`.
