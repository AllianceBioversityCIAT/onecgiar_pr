# Kaizen Entry — result-framework-reporting/programme-results-previously-reported

## Document Control

| Field | Value |
|---|---|
| Spec Path | `result-framework-reporting/programme-results-previously-reported` |
| Date | 2026-10-13 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

**Branch Context:** the current branch is `qa-development-2026-ss` and the default branch is pinned to `master`, so this is a spec branch. Every item below is recorded as pending, and no shared file was edited.

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 (2 approved + 2 added by the pivot) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1. Scope amendment PRP-R-5 (grouping), raised at HITL-1 | execution.md — ## Pivot Record: PRP-R-5 |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Judgment-day severe findings | 0 | — |
| Validation FAIL / WARN | n/a (no validation-report, accepted) | archive-summary.md §4 |
| Budget | 2 → 4 tasks, ~90 → ~420 LOC including tests | design.md §10, §11.5 |

## Lessons

- **KZ-result-framework-reporting--programme-results-previously-reported-1 — An open question that excludes part of the requester's own ask was parked, and came back as a pivot at the visual gate.** (Product + Methodology, High)
  - Root cause: the proposal recorded OQ-1 (stacking) as "the ticket excludes it, your request includes it; ask the BA". It then approved Option A with OQ-1 parked. The requester only saw the consequence (two unrelated-looking rows) when the feature rendered at HITL-1. They asked for the excluded option on the spot. That doubled the task count and needed a shared-component change.
  - Evidence: proposal.md §11 / OQ-1 and Document Control (approved "OQ-1 stays out unless the BA requests it"); execution.md — ## Pivot Record: PRP-R-5; design.md §11.5 (budget 2 → 4 tasks).
  - Standardization: → P1 (local). Upstream: recommend that AKILI `/akili-propose` require an OQ that excludes part of the requester's explicit ask to be resolved at the approval gate, with a rendered or mocked example of both options, rather than parked for a third party.

## Noted, not a lesson

- Free RAM was 1.1–1.8 GB, below the 4 GB pre-flight. The user authorised running anyway, and `--runInBand` worked (each scoped run took a few minutes). The pre-flight gate worked as designed.
- The execute brief told the Implementer to use `codegraph_impact`, but the `akili-implementer` wrapper session did not expose CodeGraph tools. The Reviewer covered the gap with a grep for template bindings. Recurrence candidate if it repeats.
- The user's two answers on how to draw the block conflicted (an AskUserQuestion option vs. a screenshot sent mid-turn). The screenshot was taken as the latest instruction. Worth watching: an option preview drawn from a guess can contradict the user's own reference image.
- The T-3 Reviewer found that `Map` keys group `null`/`undefined` into separate buckets and merge rows that have no key. This is irrelevant here because `code` is never empty.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` (Open Questions / scope guidance) |
| Edit | An open question that excludes part of the requester's explicit ask MUST be resolved at the approval gate with a rendered or mocked example of each option. It must not be parked "until a third party decides". |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-1` |
| Edit | Add source `result-framework-reporting/programme-results-previously-reported` as a recurrence. Plain `npx eslint <files>` failed again (no flat config); every task here had to rediscover `ESLINT_USE_FLAT_CONFIG=false` (execution.md — PRP-T-1 Decisions). Severity stays Medium. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-2` |
| Edit | Add source `result-framework-reporting/programme-results-previously-reported` as a recurrence. Tests were estimated at ≈60 LOC for T-1/T-2 and came to ≈116 (≈2×). After the amendment the estimate was ≈150 LOC of tests and the actual about 330. |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §8 PRMS Form UX Pattern (new item after 11) |
| Edit | **12. Result version blocks & Previously reported pill (`PRP-DD-2..DD-8`)**: rows that share a result code are kept together by `app-pr-table [groupBy]` (newest phase first) and drawn as one block: no inner divider, tighter padding, code repeated, no violet. Replicated versions carry the Results Center `Previously reported` pill (`--pr-color-primary-100/700`) before the title. |
| Severity | Low |
| Status | pending |
