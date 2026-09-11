# Archive Summary — Sidebar Toggle Consolidation

**Outcome: delivered and verified. 2/2 tasks `[x]`, 0 rework rounds, 1 Pivot (resolved). Not yet committed — the entire change sits uncommitted in the working tree awaiting the user's go-ahead.**

## 1. Document Control

| Field | Value |
|---|---|
| Module / feature | `changes/sidebar-toggle-consolidation` |
| Depth | Lite |
| Origin | Escalated from `/akili-quick` (failed the triviality gate — the removal changed the anchor behaviour of `ReportingGuideService.startResultSidebarHint()`, not just visuals) |
| Owner | santiago.sanchez@cgiar.org |
| Branch | `qa-development-2026-ss` (default pin: `master`) → **spec branch**, so all shared-file syncs are recorded as pending, not applied |
| Ticket(s) | none |
| Archive date | 2026-09-09 |
| Original spec path | `docs/specs/changes/sidebar-toggle-consolidation/` |

## 2. Final Status

| Task | Status | Rework rounds |
|---|---|---|
| `STC-T-1` — move the toggle into `reporting-nav-sidebar` (both states), remove it from `shell-topbar` | ✅ `[x]` | 0 — Reviewer PASS on attempt 1 |
| `STC-T-2` — defer the hint past the compact-collapse render tick + update specs | ✅ `[x]` | 0 — Reviewer PASS on attempt 1; manual gate closed by the user 2026-09-09 |
| Pivot remediation — repoint the broken Cypress selector | ✅ done (minimal fix, user-directed) | n/a — gated by a green browser run, not a Reviewer audit |

## 3. Requirements Delivered

| ID | Requirement | Evidence |
|---|---|---|
| STC-R-1 | Remove the sidebar-toggle button from `shell-topbar` | `shell-topbar.component.html` — button + comment deleted; spec asserts **zero** `data-guide="sidebar-toggle"` matches |
| STC-R-2 | Render a toggle in the sidebar header when **expanded**, top-right beside the wordmark | `reporting-nav-sidebar.component.html:40` |
| STC-R-3 | Preserve the collapsed-state button unchanged | Reviewer verified byte-identical, not moved |
| STC-R-4 | Both buttons carry `data-guide="sidebar-toggle"`; exactly one in the DOM at any time | Mutually exclusive `@if` branches on one `computed<boolean>`; **proven at runtime** by the green Cypress run |
| STC-R-5 | The hint still anchors and displays on both viewport bands | `setTimeout(..., 0)` defer + fake-timer regression guard + user's manual pass + Cypress SBAR-AC-1/3/4/5 |
| STC-R-10 | Reuse `lucidePanelLeft` and the `aria-label` pattern | Same icon/classes as the collapsed button; `aria-label="Collapse sidebar"` mirroring `"Expand sidebar"` |

All five MUSTs and the one SHOULD delivered. No requirement dropped or deferred.

## 4. Files Changed Summary

Nine files, all client. From `execution.md`.

| File | Change |
|---|---|
| `reporting-nav-sidebar.component.html` | Expanded-state toggle added in a new right-hand cluster before the build pill; stale ownership comment replaced |
| `reporting-nav-sidebar.component.spec.ts` | Stale single-hook assertion → three assertions (2 authored branches, expanded button, collapsed button), selected by `aria-label` not index |
| `shell-topbar.component.html` | Toggle button + explanatory comment removed |
| `shell-topbar.component.ts` | `toggleSidebar()`, the `HlmSidebarService` injection, its import, and the `lucidePanelLeft` icon removed; docstring corrected |
| `shell-topbar.component.spec.ts` | `toggleSidebar delegates` test + sidebar mock scaffolding removed; hook assertion inverted to expect zero |
| `shell-topbar/CLAUDE.md` | Prose corrected (no longer claims the topbar owns the toggle); `Verified:` re-stamped twice (STC-T-1, then STC-T-2) |
| `result-detail.component.ts` | `startResultSidebarHint()` deferred via `setTimeout(..., 0)`; completion check left synchronous |
| `result-detail.component.spec.ts` | Synchronous hint assertions → five fake-timer assertions incl. a "must NOT fire synchronously" regression guard |
| `cypress/e2e/result-detail/sidebar-collapse.cy.ts` | **Pivot remediation** — `TOPBAR_TOGGLE` → `SIDEBAR_TOGGLE` scoped to `hlm-sidebar`; doc block and inline comments corrected |

Cumulative diff: `186 insertions(+), 98 deletions(-)`. Production delta is ~12 lines; the rest is test and comment volume.

## 5. Test Evidence Summary

| Gate | Result |
|---|---|
| `npx ng lint --quiet` | ✅ clean |
| Jest — 3 touched suites | ✅ **3 passed / 129 tests passed** |
| `npm run build` | ✅ `Application bundle generation complete.` — the only gate that typechecks Angular templates in this project |
| **Cypress `sidebar-collapse.cy.ts`** | ✅ **`All specs passed!` — 5 passing, 0 failing, 1m 23s.** Electron 130 headless, Leader-started server on 4501, live backend on 3400 |
| Manual browser check (STC-AC-3/AC-4) | ✅ **performed by the user**, 2026-09-09: small-screen auto-collapse correct, hint anchors correctly, no console errors |

The Cypress run independently corroborates the manual pass: SBAR-AC-1/3/4 exercise the **1350px** band and SBAR-AC-5 the **1600px** band, with SBAR-AC-5 asserting `.driver-popover` is visible, its title text, the storage-key flip, and non-reappearance after reload.

**`test-report.md` — absent, absence explicitly accepted.** `/akili-test` was not run as a separate phase; test authoring was folded into `STC-T-2`, whose Definition of done required the spec updates and whose gate was the green suites above. For a Lite-depth change with 129 green unit tests plus a green E2E suite, a separate test phase would have added ceremony, not signal.

## 6. Validation Summary

**`validation-report.md` — absent, absence explicitly accepted.** `/akili-validate` was not run. Mitigation: every requirement in §3 carries named evidence, two independent Reviewer audits returned PASS with the invariant adjudicated explicitly, and the acceptance criteria were checked from both directions (machine-checked ordering + human-confirmed rendering).

⚠️ **Residual risk, stated plainly:** no formal validation gate ran on this spec. The evidence above is strong but it was assembled by the execution loop rather than audited by an independent validation pass. If this change is treated as precedent for skipping `/akili-validate`, that is the wrong lesson — it was skipped here because the spec is Lite, client-only, and unusually well covered by executable gates.

No unresolved FAIL findings. No WARN findings (none produced — no validation run).

## 7. Accepted Warnings Or Follow-Ups

| # | Item | Status |
|---|---|---|
| 1 | **`design.md` §13 and `requirements.md` §8 still assert that no automated `driver.js` anchor coverage exists, and that building it would be "disproportionate."** Both are false — `sidebar-collapse.cy.ts` already provided it, and this cycle proved it works | ⚠️ **Left unamended by explicit user decision.** Highest-value follow-up; carried into the kaizen entry. The next spec on this surface will read the same false premise that produced this cycle's Pivot |
| 2 | `sidebar-collapse.cy.ts` was modified by this spec but never entered its declared scope | Accepted (user chose the minimal fix). The commit message should name it explicitly, since no `tasks.md` row accounts for it |
| 3 | Weak assertion: `expect(html).toContain('@if (!isCollapsed())')` matches 7 places in the template and would keep passing if the toggle's own guard were deleted or inverted | Open advisory, deliberately **not** folded in (advisories may not widen an approved spec). A stronger guard-extraction form is proposed in `execution.md` |
| 4 | Fake-timer comment in `result-detail.component.spec.ts` is inverted (claims it prevents leakage; fake timers are installed file-wide, so restoring *real* timers is the deviation) | Open advisory. Latent only — that block is currently last in the file |
| 5 | The E2E suite is dormant by default (`describeWithToken` → skip without a token; Cypress not in CI) | Accepted, pre-existing. This is precisely why the breakage went unnoticed |
| 6 | Node is v24.13.0; `docs/infrastructure.md` §6 pre-check requires 20.x | Flagged, not acted on. Build, Jest, lint and Cypress all pass regardless |
| 7 | Post-merge housekeeping: PR opened, CI green, spec status → `shipped` | Unchecked in `tasks.md` §6/§7 — genuinely post-merge, not this cycle's work |

## 8. Historical Notes

- **The escalation was correct.** `/akili-quick` rejected this as non-trivial because removing the topbar button changed the hint's anchor behaviour. That is exactly the defect class that consumed the cycle — first as the compact-viewport render race (`STC-DD-2`), then as the broken Cypress selector nobody had inventoried.
- **One Pivot, and it was not an implementation failure.** Both tasks passed review and every automated gate was green when the Pivot fired. The trigger was that the *approved spec* rested on a false premise about existing coverage and omitted a real consumer — the plan was wrong, not the code.
- **The `[~]` discipline held.** `STC-T-2` sat at `[~]` for a day rather than being marked `[x]` on its Reviewer PASS, because the manual criterion was genuinely outstanding. The checkbox moved only once a human performed the check. A `[x]` there would have asserted verification nobody did.
- **A deferral was recorded as probe-confirmed and was nonetheless incomplete.** The 2026-09-08 probe checked Claude-in-Chrome and the token and concluded "blocked." Cypress — installed, binary cached, and ultimately the thing that verified the change — was not enumerated. It surfaced only incidentally a day later. This repeats an existing lesson from `changes--aow-identity-column-starvation`; see the kaizen entry.
- **A pending item in the backlog is now false.** `changes--result-sidebar-collapse-mobile.md` pending item #2 instructs adding to `shell-topbar/CLAUDE.md` that its toggle carries `data-guide="sidebar-toggle"` as "the always-visible anchor." This spec deleted that button. Applying that item unchanged would inject a falsehood into a guide — recorded as the cycle's Methodology lesson.
- **Nothing was committed.** Per a standing user instruction, no `git commit` or `git add` ran at any point. All nine files remain in the working tree. STC-T-1, STC-T-2 and the Cypress fix **must land together** — STC-T-1 alone leaves two Jest suites red, and the Cypress fix repairs a suite only STC-T-1 broke.
