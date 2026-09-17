# Kaizen Entry — results/expand-split-innovation-picker

## Document Control

| Field | Value |
|---|---|
| Spec Path | `results/expand-split-innovation-picker` |
| Date | 2026-09-16 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 7 (SIP-T-1 through SIP-T-7) | tasks.md |
| Reviewer FAIL rework attempts | 3 (SIP-T-1 JSDoc staleness, SIP-T-4 unwired CT wait, SIP-T-7 padding sizing) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (SIP-T-6 manual check surfaced visual styling gap, added SIP-T-7) | execution.md |
| PRODUCT_BUGs | 0 | execution.md |
| Judgment-day severe findings | 0 | judgment.md |
| Validation FAIL / WARN | 0 / 0 | execution.md |

## Lessons

- **KZ-results--expand-split-innovation-picker-1 — Over-narrowing scope during design can conflict with original visual intent.** (Methodology, Medium)
  - Root cause: The original proposal intended the picker to mirror the linked-result picker's visual language while omitting irrelevant filter chips. During design, this was over-narrowed to purely functional changes, leading to a manual QA rejection that required adding SIP-T-7 as an in-flight pivot.
  - Evidence: `execution.md` Pivot Record §2.
  - Standardization: → P1

- **KZ-results--expand-split-innovation-picker-2 — Shared primitive modifications must strictly isolate changes via opt-in flags.** (Product, High)
  - Root cause: `pr-multi-select` has ~78 call sites. Implementing server search and custom styling via optional inputs prevented regressions across dozens of modules.
  - Evidence: `execution.md` SIP-T-3, SIP-T-7.
  - Standardization: → P2

## Noted, not a lesson

- An undisclosed change to core `optionsIntance()` logic in attempt 1 of SIP-T-7 was caught by the Leader before reviewer dispatch. Reading the raw diff line-by-line is essential when touching shared primitives.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | When a proposal references an existing UI element as a visual model, explicitly distinguish between functional scoping (which filters/fields are needed) and visual language (borders, padding, icons, elevation) so styling intent is not lost in design. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` |
| Edit | When modifying shared primitives in `custom-fields/`, require an explicit non-regression test asserting that unwired call sites maintain byte-for-byte behavioral and visual parity. |
| Severity | Medium |
| Status | pending |

**Branch Context:** current branch `qa-development-2026-ss`, default branch pinned to `master`.
