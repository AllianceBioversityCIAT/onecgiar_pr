# Archive Summary — Result Sidebar Collapse (Compact Viewports)

## 1. Document Control

| Field | Value |
|---|---|
| Module code | `SBAR` |
| Original spec path | `docs/specs/changes/result-sidebar-collapse-mobile/` |
| Type | Change · Depth: Standard |
| Archive date | 2026-09-08 |
| Branch | `qa-development-2026-ss` (spec branch — default is `master`) |
| Final status | **Shipped to working tree, uncommitted.** All 6 tasks PASS on their automated DoD; one human-only manual QA checkbox remains outstanding by design (see §9). |

## 2. Requirements Delivered

| ID | Statement | Delivered by |
|---|---|---|
| `SBAR-R-1` | Auto-collapse nav sidebar on result entry when viewport ≤1366px | `SBAR-T-1`, `SBAR-T-2` |
| `SBAR-R-2` | No forced state change >1366px | `SBAR-T-1`, `SBAR-T-2` |
| `SBAR-R-3` | Manual re-expand respected within a result (no fighting the user) | `SBAR-T-2` |
| `SBAR-R-4` | Evaluated only on result-id change, not on live resize | `SBAR-T-2` |
| `SBAR-R-10` | One-time discoverability hint for the sidebar toggle | `SBAR-T-3`, `SBAR-T-4`, `SBAR-T-5` |
| `SBAR-R-11` | Hint dismissible, non-repeating (localStorage-flagged) | `SBAR-T-4` |
| `SBAR-R-20` (MAY) | Reused `ReportingGuideService`'s existing `driver.js` infra | `SBAR-T-4` |

All MUST/SHOULD requirements delivered. `SBAR-OQ-2` (promote 1366px into the shared breakpoint scale) deliberately left open as a non-blocking follow-up — see `design.md` §13.

## 3. Files Changed Summary (from `execution.md`)

| File | Task | Nature |
|---|---|---|
| `spartan/sidebar/src/lib/hlm-sidebar.token.ts` | `SBAR-T-1` | new `compactBreakpoint` config field (default `1366px`) |
| `spartan/sidebar/src/lib/hlm-sidebar.service.ts` | `SBAR-T-1` | new `isCompact` signal + `collapseForCompactEntry()` (bypasses the cookie write, `SBAR-DD-2`) |
| `spartan/sidebar/src/lib/hlm-sidebar.service.spec.ts` | `SBAR-T-1` | new tests, incl. the cookie regression pair |
| `pages/results/.../result-detail/result-detail.component.ts` (+spec) | `SBAR-T-2`, `SBAR-T-5` | route-id-driven auto-collapse trigger + hint trigger |
| `shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.html` (+spec) | `SBAR-T-3` | `data-guide="sidebar-toggle"` anchor (collapsed-state button) |
| `shared/components/shell-topbar/shell-topbar.component.html` (+spec) | `SBAR-T-5` (user-approved scope addition) | same `data-guide="sidebar-toggle"` on the always-visible topbar toggle — fixes an anchor-visibility gap for expanded-sidebar entries |
| `pages/result-framework-reporting/.../services/reporting-guide.service.ts` (+spec) | `SBAR-T-4` | independent `startResultSidebarHint()` + completion-flag storage key |
| `cypress/e2e/result-detail/sidebar-collapse.cy.ts` (new) | `SBAR-T-6` | 5 E2E scenarios (`SBAR-AC-1..AC-5`) |

No server, no data model, no API surface touched — pure client change.

## 4. Test Evidence Summary

No separate `test-report.md` was produced for this run — test evidence is embedded directly in `execution.md` per task, which is accepted here as sufficient (Standard-depth spec, no `/akili-test` sub-run performed separately).

| Suite | Result |
|---|---|
| `hlm-sidebar.service.spec.ts` | 29 passed |
| `result-detail.component.spec.ts` | 33 passed |
| `reporting-nav-sidebar.component.spec.ts` | 70 passed |
| `reporting-guide.service.spec.ts` | 68 passed |
| `shell-topbar.component.spec.ts` | 23 passed |
| `npx ng lint --quiet` | clean, all tasks |
| Cypress `sidebar-collapse.cy.ts` (`SBAR-AC-1..AC-5`) | 5/5 passing, verified 3 consecutive runs against the real backend (~1m13s–1m28s each), not flaky |

`SBAR-T-6` took 5 attempts to reach green (see §9) — each of the first 4 fixed a real, separate bug; the E2E suite's final state is solid.

## 5. Validation Summary

No separate `validation-report.md` was produced (no `/akili-validate` sub-run performed). Reviewer verdicts recorded inline in `execution.md` for `SBAR-T-1..T-5` were all **PASS** on first attempt, with only non-gating ADVISORY notes (see `execution.md` for the full list — mainly minor reliability/readability observations, none blocking). `SBAR-T-6`'s verdicts came from direct suite execution against the real backend rather than a Reviewer sub-agent pass, per the task's environment-dependent nature (`docs/infrastructure.md` §6).

## 6. Accepted Warnings / Follow-Ups

- **Manual QA checkbox outstanding (by design):** hint popover placement/legibility at 1350px and 1600px in a real browser — genuinely human-only per `requirements.md` §9 / `design.md` §10, no automated check can substitute. Recorded as the sole remaining `tasks.md` checkbox.
- **`SBAR-OQ-2`** (whether 1366px should be promoted into `docs/ux-ui/design.md` §9's shared breakpoint scale) stays open — file as a follow-up only if a second feature needs the same "compact" concept.
- **Advisory, non-blocking, carried forward for awareness:**
  - `collapseForCompactEntry()` is a visual no-op on true phone widths (≤768px, `_openMobile`-driven drawer) — noted during `SBAR-T-1`, an explicit (not accidental) scope decision since `SBAR-T-2` gates only on `isCompact()` + `state()`.
  - `startResultSidebarHint()`'s anchorless-popover flag-burn risk (low probability — only fires if both `data-guide="sidebar-toggle"` anchors are hidden simultaneously, which requires `focusMode()`, essentially never true on result-detail entry).
  - `watchCompactEntry()` in `result-detail.component.ts` now owns two unrelated triggers (auto-collapse + hint) behind a name describing only the first — a rename to `watchResultEntry()` would help a future reader; not required.
- **Local artifact left in the working tree (not committed, not logged):** `onecgiar-pr-client/cypress.env.js` (gitignored) holds the user-provided token used for real-backend E2E verification. Left for convenience of a future run.

## 7. Historical Notes

- `SBAR-T-6` is the one task worth remembering in detail: it FAILED 4 times before PASS, each attempt fixing a genuinely different, real bug (auth-navigation helper missing `loginByToken`; a portfolio-specific section-name red herring; a discoverability-hint interference hypothesis that turned out false; an unrelated local-backend outage) — the actual root cause (a Cypress selector targeting `.panel_menu .sections a`, a structurally dead legacy component per `result-sections-sidebar/CLAUDE.md`) was found only on attempt 5, after the loop's 3-attempt ceiling had already been exceeded with explicit user approval to continue. See the Kaizen entry (`docs/specs/kaizen/changes--result-sidebar-collapse-mobile.md`) for the standardization proposal this produced.
- `execution.md`'s own `## Task Execution History` header for `SBAR-T-6` still literally reads "in progress (rework attempt 2 running)" — stale, superseded by the `## Resolution: SBAR-T-6 (HALT lifted)` section immediately below it in the same file, which is authoritative. Left as-is (out of this archive's scope to edit execution history), flagged here so a future reader isn't misled by the stale line alone.
- One user-approved scope addition mid-execution: `SBAR-T-5` added `data-guide="sidebar-toggle"` to `shell-topbar.component.html` (not originally in `tasks.md`'s file list) after `SBAR-T-3`'s Reviewer flagged that the original anchor is only in the DOM while the sidebar is collapsed — the hint must fire regardless of viewport/sidebar state, so a second, always-visible anchor was needed. Authorized via `AskUserQuestion` before execution.
