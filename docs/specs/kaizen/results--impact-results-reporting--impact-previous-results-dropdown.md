# Kaizen Entry — results/impact-results-reporting/impact-previous-results-dropdown

## Document Control

| Field | Value |
|---|---|
| Spec Path | `results/impact-results-reporting/impact-previous-results-dropdown` |
| Date | 2026-11-03 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-1 x1, T-3 x1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| Budget | ~1,100 LOC vs ~550 (tripwire at T-1, user re-baselined); 5 review rounds vs 2 | execution.md — Budget tripwire, Summary |
| Late defects | 1 (T-2 SCSS `@use` depth, caught by T-3 CT) | execution.md — IPD-T-3 attempt 1 |
| PRODUCT_BUGs / Validation | none (no test or validation report; absence accepted) | archive-summary.md §6 |

## Lessons

- **KZ-results--impact-results-reporting--impact-previous-results-dropdown-1 — `cypress run` captures with a viewport taller than its 720 px Electron window are scaled and show a phantom horizontal scrollbar.** (Product, Medium)
  - Root cause: T-3 set `cy.viewport(1280, 800)`. In headless `cypress run` the Electron window is 720 px tall, so the capture was scaled down. The scaled image showed a horizontal scrollbar even though no box overflowed. The Reviewer correctly refused the capture as NFR-3 evidence, which cost a rework round spent hunting an overflow that did not exist. A throwaway spec with one plain 100%-width `div` reproduced the scrollbar.
  - Evidence: execution.md — IPD-T-3 attempt 1 Reviewer FAIL issue 1; attempt 2 Implementer (`html client=1263x720 scroll=1263x987`, 0 culprits).
  - Standardization: → P1

## Noted, not a lesson

- **`test:ct:batch` on Windows.** The path filter is a plain substring and Windows spec paths use backslashes, so a `src/app/...` filter matches nothing and the run silently selects no spec. This is a second data point after `results--impact-results-reporting` (batch exits red on unrelated errors). Recorded as pending item P2 (factual sweep).
- **Budget overrun from copied SCSS.** 377 lines against ~120 estimated (IPD-DD-3). This echoes `bilateral--overview-redesign`, where 631 of ~1,373 lines were SCSS. Below the lesson bar here: the user accepted the size. If a third spec repeats it, size SCSS copies from the source file's real line count at specify time.
- **T-1 rework.** A `distinctUntilChanged` key went stale when Reset and × bypassed the stream, and outside-click focus was lost. These were implementation slips against a clear spec, so no rule change.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` §9 Component tests |
| Edit | Add: "Headless `cypress run` uses a 720 px-tall Electron window: a `cy.viewport` taller than 720 is scaled in `cy.screenshot` and shows a phantom horizontal scrollbar. For captures use `cy.viewport(w, 720)` or an element screenshot, and prove overflow by asserting `scrollWidth <= clientWidth`, never from the image." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-client/CLAUDE.md` §3 (test:ct usage) and the `scripts/run-ct-batched.js` header |
| Edit | The documented `npm run test:ct -- 'src/app/custom-fields/pr-input/**'` matches nothing on Windows, because the filter is a substring and paths use `\`. Replace the line with: "the filter is a substring of the spec path (on Windows use a bare file name, or run `npx cypress run --component --spec <file>` directly)". Optional code fix: normalise `\` to `/` before matching. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-notifications--bell-quick-inbox-1 |
| Edit | Add the source `results/impact-results-reporting/impact-previous-results-dropdown`. Recurrence: `ngc --noEmit` and Jest both passed a page `.scss` whose `@use` path resolved to a non-existent folder, because neither compiles SCSS, and only the CT mount (webpack) caught it. This widens the lesson to: "a UI task that adds or edits a `.scss` needs a gate that compiles SCSS (CT mount or `ng build`), not `ngc --noEmit`". Keep High. |
| Severity | High |
| Status | pending |
