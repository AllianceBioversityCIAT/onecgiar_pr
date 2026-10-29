# Kaizen Entry — changes/portfolio-overview-revamp/remove-centers-progress

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-revamp/remove-centers-progress` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

**Branch Context:** this run is on a spec branch. The current branch is `qa-development-2026-ss`, and the default branch is pinned to `master`. Every item below is recorded as pending, and no shared file was edited.

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (1 code + 1 doc / browser check) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md, RCP-T-1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | — |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Judgment-day severe findings | n/a (no judgment run; Lite depth) | — |
| Validation FAIL / WARN | n/a (no validation-report; the user accepted the T-2 evidence) | archive-summary.md §8 |
| Budget | About +149 / −413 LOC against an estimate of about +60 / −260; 1 review round | execution.md §3 |

## Lessons

No new lesson. Execution was clean. Both friction points share a root cause with an existing lesson, so they are recorded as recurrences (P1, P2).

## Noted, not a lesson

- **Same-origin iframe as a viewport fallback.** When `resize_window` had no effect (the viewport stayed at 1280), a fixed-position 768px `<iframe src="/portfolio-overview">` gave a real 764px layout with the user's session. Only GET requests were made. It works for layout and overflow measurement; screenshots need the zoom region in parent coordinates (the iframe measured 883 px in the parent page).
- **`Page.captureScreenshot` timed out twice, then recovered** without any change on our side. It is probably the window being in the background. Retrying after a pause worked.
- **Reviewer advisory on red runs.** The double-click red case failed on `null.click()`, not on its count assertion. Asserting existence first makes the red run behavioral. Below the lesson bar (one occurrence).
- **The global topbar overflows at 768** (right edge 840). It is pre-existing and out of scope; the user plans a separate fix.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-1` |
| Edit | Add source `changes/portfolio-overview-revamp/remove-centers-progress` as a recurrence. The tasks.md Verification again named `npx eslint <files> --quiet` for the client, the client again has no `eslint.config.*` (exit 2), and the RCP-T-1 Implementer substituted `ng lint --lint-file-patterns`. This is the fifth spec. Root `AGENTS.md` already lists `npx ng lint --quiet` for the client, so the specify step is not reading it. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--clear-filters-2` |
| Edit | Add source `changes/portfolio-overview-revamp/remove-centers-progress` as a recurrence. RCP-T-2 required 1440 and 768 screenshots with no Pre-flight capability probe. At close, the viewport could not reach 1440 (DPR 1.5 caps it at 1280) and `resize_window` did not resize. The check was saved only by an improvised same-origin iframe at 768. Suggest that the lesson's probe also checks the **maximum** reachable width, and names the iframe route as the fallback for narrow widths. |
| Severity | Medium |
| Status | pending |

No guide-sync, factual-sweep or trd-adr items:

- The only constitution-relevant change, the `portfolio-overview/CLAUDE.md` update, was the spec's own deliverable (RCP-N4), approved in tasks.md.
- No root-guide claim was falsified.
- No ADR was overturned.
