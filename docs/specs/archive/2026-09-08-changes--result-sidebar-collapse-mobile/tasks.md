# Tasks — Result Sidebar Collapse (Compact Viewports)

## 1. Scope of this task list

- **Module / feature:** `SBAR` — Result Sidebar Collapse (Compact Viewports)
- **Linked spec:** `docs/specs/changes/result-sidebar-collapse-mobile/requirements.md` + `design.md`
- **Sprint / target phase:** —
- **Owner / driver:** AKILI Implementer (client-only)
- **Status:** implementation complete — `SBAR-T-1..T-6` all PASS on their automated DoD; `SBAR-T-6`'s manual QA checkbox (hint popover placement/legibility) remains outstanding, human-only.

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved (status: draft → approved by user Continue at Phase 1 gate).
- [x] `design.md` is approved (status: draft → approved by user Continue at Phase 2 gate).
- [x] Open questions resolved: `SBAR-OQ-1` → `SBAR-DD-4` (independent hint in `ReportingGuideService`). `SBAR-OQ-2` → deferred, recorded as Open Gap, not blocking.
- [ ] CLARISA dependencies: not applicable (client-only, no CLARISA surface touched).
- [ ] No conflicting in-flight spec: confirmed by `/akili-propose`/`/akili-specify` research — no other spec under `docs/specs/` touches `HlmSidebarService`, `ReportingNavSidebarComponent`, `ReportingGuideService`, or `result-detail`'s route-param handling.
- [ ] Migration: not applicable — no schema change.

---

## 3. Task list

### `SBAR-T-1` — Add `compactBreakpoint` config and `isCompact` signal to `HlmSidebarService` [x]

- **Type:** `client`
- **Description:** Add `compactBreakpoint: string` (default `'1366px'`) to the sidebar config token, alongside the existing `mobileBreakpoint`. In `HlmSidebarService`, register a second `matchMedia` listener for it inside the existing `afterNextRender` block, reusing the same debounced-resize handler that already updates `_isMobile`, and expose a new readonly `isCompact: Signal<boolean>`. Add `collapseForCompactEntry(): void`, which sets the internal open-state signal to `false` directly — it MUST NOT call `setOpen()` and MUST NOT write `sidebarCookieName`.
- **Implements:** `SBAR-R-1`, `SBAR-R-2`, design `SBAR-DD-1`, `SBAR-DD-2`
- **Files (expected):** `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.token.ts`, `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.service.ts`, `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.service.spec.ts`
- **Depends on:** —
- **Blocks:** `SBAR-T-2`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `isCompact()` returns `true` when a mocked `matchMedia('(max-width: 1366px)')` matches, `false` otherwise, and updates on the existing debounced resize handler (same 100ms debounce as `isMobile`).
  - [x] `collapseForCompactEntry()` sets `state()` to `'collapsed'`.
  - [x] **Disqualifying check:** a test asserts `document.cookie` is unchanged after calling `collapseForCompactEntry()` on a page with no prior sidebar cookie set, AND a separate test asserts `document.cookie` DOES change after calling the pre-existing `setOpen(false)` on the same fixture — the second assertion is what makes the first one meaningful (a check that never observes the cookie changing under any code path would pass even if the cookie-write logic were deleted entirely, so the regression pair is required, not either test alone).
  - [x] `mobileBreakpoint`/`isMobile`/`openMobile` behavior is unchanged — existing `hlm-sidebar.service.spec.ts` tests (if any) still pass unmodified.
  - [x] Verification command: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="hlm-sidebar.service.spec"` (run from `onecgiar-pr-client/`) exits 0. **Fails on:** `isCompact()` never flipping to `true` under the mocked matchMedia, or `document.cookie` changing after `collapseForCompactEntry()`.
  - [x] Lint clean (`npx ng lint --quiet`).

### `SBAR-T-2` — Trigger compact auto-collapse on result entry [x]

- **Type:** `client`
- **Description:** In `result-detail.component.ts`, subscribe to the route's `id` param with `distinctUntilChanged`. On each distinct id, if `sidebarSE.isCompact()` is true and `sidebarSE.state() === 'expanded'`, call `sidebarSE.collapseForCompactEntry()`. Do not fire on `?phase=` query-only changes or on child-route (section/tab) navigation within the same result.
- **Implements:** `SBAR-R-1`, `SBAR-R-2`, `SBAR-R-3`, `SBAR-R-4`, design `SBAR-DD-3`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.ts`, `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.spec.ts`
- **Depends on:** `SBAR-T-1`
- **Blocks:** `SBAR-T-5`
- **Estimate:** `M`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Scenario "Compact laptop entering a result — auto-collapse": mocked `ActivatedRoute.params` emits `id: 9043`, `isCompact()` mocked `true`, state mocked `'expanded'` → `collapseForCompactEntry()` called exactly once.
  - [x] Scenario "Desktop viewport unaffected": `isCompact()` mocked `false` → `collapseForCompactEntry()` never called. **BUT it must NOT** be called even transiently (assert call count `0` after the full subscription lifecycle, not just "not called yet").
  - [x] Scenario "Manual re-expand is respected": after auto-collapse fires once for `id: 9043`, emit the same `id: 9043` again (simulating an internal section navigation) → `collapseForCompactEntry()` is NOT called a second time (asserts `distinctUntilChanged` is actually wired, not just present in intent).
  - [x] Scenario "Resize after entry does not retrigger": no route-param emission, only a change in `isCompact()`'s underlying signal value → `collapseForCompactEntry()` is not called (the subscription is param-driven, not signal-effect-driven; a test that only checks "not called on mount" would pass even if a stray `effect()` were wired to `isCompact()`, so the test must actively flip `isCompact()` after mount with no new route emission and assert no call).
  - [x] **Disqualifying input:** a route-param stream that emits `id: 9043` twice in a row (no `distinctUntilChanged` filtering) is exactly the input that would make this task's core claim fail if the operator were missing or misapplied — include it explicitly, don't rely on a stream that only ever emits distinct ids.
  - [x] Verification command: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="result-detail.component.spec"` exits 0.
  - [x] Lint clean.

### `SBAR-T-3` — Add `data-guide` hook to the sidebar toggle button [x]

- **Type:** `client`
- **Description:** Add `data-guide="sidebar-toggle"` to the existing toggle `<button>` in `reporting-nav-sidebar.component.html` (~L61-64). No behavior change, no new class, no style change.
- **Implements:** `SBAR-R-10` (enabling attribute), design `SBAR-DD-4`
- **Files (expected):** `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.html`
- **Depends on:** —
- **Blocks:** `SBAR-T-4`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `[data-guide="sidebar-toggle"]` resolves to exactly one element in the rendered nav sidebar.
  - [x] **What this check cannot prove:** a test asserting the attribute exists in the DOM proves the markup hook is present, nothing about whether a popover anchored to it renders sensibly (covered instead by the manual QA step in `SBAR-T-6`) — record this explicitly in the task's test file as a comment-level note so a future reader doesn't mistake DOM presence for tour-quality coverage. *(Code Suppression note: comment content is an implementation detail for the Implementer, not specified verbatim here.)*
  - [x] Existing `reporting-nav-sidebar.component.spec.ts` (if any) still passes — toggle button's click handler and existing attributes/classes unchanged.
  - [x] Verification command: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="reporting-nav-sidebar.component.spec"` exits 0. **Fails on:** the selector `[data-guide="sidebar-toggle"]` matching zero or more than one element.
  - [x] Lint clean.

### `SBAR-T-4` — Add the independent result-sidebar discoverability hint to `ReportingGuideService` [x]

- **Type:** `client`
- **Description:** Add a new storage-key constant (parallel to `SP_TOUR_STORAGE_KEY`, e.g. `RESULT_SIDEBAR_HINT_STORAGE_KEY`), `isResultSidebarHintCompleted(): boolean`, `resetResultSidebarHintState(): void` (mirroring the existing SP-tour reset for testability), and `startResultSidebarHint(): void` — a one-`DriveStep` tour targeting `[data-guide="sidebar-toggle"]`, reusing the existing `instance?.destroy()` → fresh `driver()` lifecycle. Do **not** add this to `catalogue`/`TutorialId`. Copy text goes through `TermKey`/i18n per project rule, not hardcoded English.
- **Implements:** `SBAR-R-10`, `SBAR-R-11`, design `SBAR-DD-4`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service.ts`, `reporting-guide.service.spec.ts`, relevant `internationalization/` term file
- **Depends on:** `SBAR-T-3`
- **Blocks:** `SBAR-T-5`
- **Estimate:** `M`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `isResultSidebarHintCompleted()` returns `false` when the storage key is absent, `true` when set to `'true'` — mirrors existing `isSpTourCompleted()` test shape.
  - [x] `startResultSidebarHint()` builds exactly one `DriveStep` with `element: '[data-guide="sidebar-toggle"]'`.
  - [x] **Disqualifying check:** assert the new storage key constant's value is **not** equal to `SP_TOUR_STORAGE_KEY` (`'pr.tour.sp.completed'`) — a copy-paste of the existing key would make both flags collapse into one, silently marking the hint "seen" the moment anyone completes the unrelated SP tour, and this specific collision is invisible to a test that only checks "the flag gets set."
  - [x] `TutorialId`/`catalogue` array length and contents are unchanged (regression guard for `SBAR-DD-4`'s "not merged into the SP tour" decision).
  - [x] Verification command: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="reporting-guide.service.spec"` exits 0.
  - [x] i18n: new copy added as a `TermKey` (or justified as structural copy) — reviewer checks no raw English string was added to the template/service without going through the terminology pattern. Justified as structural copy; Reviewer confirmed conformant with `design.md` §6.3's escape hatch.
  - [x] Lint clean.

### `SBAR-T-5` — Wire the hint trigger into result-detail entry [x]

- **Type:** `client`
- **Description:** In `result-detail.component.ts` (same subscription added in `SBAR-T-2`, or a sibling one on the same id-change trigger), inject `ReportingGuideService` and call `startResultSidebarHint()` once per app session/result-entry when `isResultSidebarHintCompleted()` is `false`. This trigger is independent of `isCompact()` — the hint is shown regardless of viewport width per `SBAR-R-10`.
- **Implements:** `SBAR-R-10`, `SBAR-R-11`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.ts`, `result-detail.component.spec.ts`
- **Deviation (user-approved, see `execution.md`):** also touched `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.html` + `.spec.ts` to add `data-guide="sidebar-toggle"` to the always-visible topbar toggle — fixes an anchor-visibility gap (`reporting-nav-sidebar`'s hook only exists when the sidebar is collapsed) surfaced during `SBAR-T-3` review.
- **Depends on:** `SBAR-T-2`, `SBAR-T-4`
- **Blocks:** `SBAR-T-6`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Scenario "First-time discoverability hint": `isResultSidebarHintCompleted()` mocked `false` → `startResultSidebarHint()` called once on result entry.
  - [x] **BUT it must NOT** call `startResultSidebarHint()` when `isResultSidebarHintCompleted()` is mocked `true` — explicit negative-path test, not just the absence of a positive assertion.
  - [x] The hint trigger is NOT gated on `isCompact()` — a test with `isCompact()` mocked `false` and `isResultSidebarHintCompleted()` mocked `false` still calls `startResultSidebarHint()` (guards against accidentally coupling the two triggers, which would silently narrow `SBAR-R-10`'s scope).
  - [x] Verification command: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="result-detail.component.spec"` exits 0.
  - [x] Lint clean.
  - [x] (Added) `shell-topbar.component.spec.ts` verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="shell-topbar.component.spec"` exits 0.

### `SBAR-T-6` — Cypress E2E coverage + manual QA pass [~] (automated coverage PASS — manual QA still outstanding, see `execution.md`)

- **Type:** `tests`
- **Description:** Add Cypress E2E specs covering the five scenarios end-to-end with real `cy.viewport()` calls (not mocked signals), and perform the one manual QA check the requirements explicitly flag as having no automated gate: hint popover placement/legibility.
- **Implements:** `SBAR-AC-1..AC-5` (see Test Plan §5), the accepted-gap manual check from `requirements.md` §9
- **Files (expected):** `onecgiar-pr-client/cypress/e2e/result-detail/sidebar-collapse.cy.ts`
- **Depends on:** `SBAR-T-1`, `SBAR-T-2`, `SBAR-T-3`, `SBAR-T-4`, `SBAR-T-5`
- **Blocks:** —
- **Estimate:** `M`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `cy.viewport(1350, 900)` → open a result → sidebar renders collapsed (`SBAR-AC-1`). **Verified against real backend, passing.**
  - [x] `cy.viewport(1600, 900)` → open a result → sidebar state unchanged from its pre-navigation state (`SBAR-AC-2`). **Fails on:** the sidebar being forced into any particular state at this width — the assertion must be "unchanged", not "expanded", since a prior test in the same run may have left it collapsed via the cookie. **Verified against real backend, passing.**
  - [x] At `1350px`: open result A → sidebar auto-collapses → manually expand → switch sections within result A → sidebar still expanded (`SBAR-AC-3`). **Root cause found and fixed (attempt 5): the spec was targeting `.panel_menu .sections a`, a selector belonging to a LEGACY, unrendered component (`panel-menu/` — confirmed dead code per its sibling `result-sections-sidebar/CLAUDE.md`). Fixed to `[data-guide="sidebar-toggle"]`-sibling live selector `[data-testid="result-sections-sidebar"] nav a`. Verified against real backend, passing.**
  - [x] At `1350px`, after entry: resize the Cypress viewport to `1300px` without navigating → sidebar state does not change; then navigate to a **different** result id at the same width → sidebar auto-collapses again (`SBAR-AC-4`). **Verified against real backend, passing.**
  - [x] First visit to any result with a clean `localStorage` → hint popover appears once, referencing the toggle; reload → does not reappear (`SBAR-AC-5`). **Verified against real backend, passing.**
  - [ ] **Manual QA (recorded, not automated):** open the hint at both `1350px` and `1600px` in a real browser; confirm the popover is anchored sensibly to the toggle button and the copy is legible — check this box only after actually looking, not because the Cypress run above passed (Cypress asserts the popover *exists*, not that it *looks right*; a `driver.js` step whose `element` selector resolves but whose popover renders off-screen or overlapping other chrome would still pass every assertion above). **Still outstanding — human-only step, not performed by any agent in this run.**
  - [x] Verification command: `npx cypress run --spec "cypress/e2e/result-detail/sidebar-collapse.cy.ts"` exits 0. **Inconclusive handling:** if any of the five scenarios flakes (intermittent timing on the debounced resize handler), report the specific flaking scenario and its observed spread across 3 reruns rather than treating one green run as proof — a single pass with a 100ms debounce in play is not automatically conclusive. **Ran 3 consecutive times against the real backend: 5/5 passing every time (~1m13s-1m28s each) — stable, not flaky.**

---

## 4. Dependency graph

```
SBAR-T-1 (service signal + method)
   └── SBAR-T-2 (entry trigger: auto-collapse)
         └── SBAR-T-5 (entry trigger: hint) ──┐
SBAR-T-3 (data-guide attribute)                │
   └── SBAR-T-4 (hint service method) ─────────┤
                                                 └── SBAR-T-6 (E2E + manual QA)
```

`SBAR-T-1`/`SBAR-T-2` and `SBAR-T-3`/`SBAR-T-4` are independent branches until `SBAR-T-5` joins them — parallel-safe to implement together.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `SBAR-TEST-1` | unit (client) | `SBAR-R-1`, `SBAR-R-2`, `SBAR-DD-2` | `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.service.spec.ts` |
| `SBAR-TEST-2` | unit (client) | `SBAR-R-1..R-4`, `SBAR-DD-3` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.spec.ts` |
| `SBAR-TEST-3` | unit (client) | `SBAR-R-10` (attribute hook) | `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.spec.ts` |
| `SBAR-TEST-4` | unit (client) | `SBAR-R-10`, `SBAR-R-11` | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service.spec.ts` |
| `SBAR-TEST-5` | cypress (client) | `SBAR-AC-1..AC-5` | `onecgiar-pr-client/cypress/e2e/result-detail/sidebar-collapse.cy.ts` |
| — (manual) | manual QA | hint popover visual correctness (accepted gap, `requirements.md` §9) | performed at `SBAR-T-6`, recorded in PR description |

Client coverage MUST stay above 50/60/60/60 — none of the touched files fall under the `custom-fields/`/`rd-contributors-and-partners/` exclusions.

---

## 6. Rollout & verification

- [ ] PR opened with commit convention (`<emoji> <type>(<scope>) [ticket]: <description>`).
- [ ] CI green: `npx jest --silent --reporters=summary --no-coverage`, `npx ng lint --quiet`.
- [ ] `npm run test:ct` not required — no `custom-fields/` component touched.
- [ ] Manual QA on a test/staging env: open a result at ~1350px and confirm collapse + hint; open at ~1600px and confirm no regression.
- [ ] Not applicable: no bilateral/platform-report payload change, no admin/role/phase change.
- [ ] Telemetry: none added; nothing to verify post-deploy.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` after merge.
- [ ] `SBAR-OQ-2` (whether 1366px should be promoted into `docs/ux-ui/design.md` §9's shared breakpoint scale) stays open — file as a follow-up only if a second feature needs the same "compact" concept.
- [ ] No `docs/prd.md` Open Questions resolved by this spec.

---

## 8. Roll-back plan

1. Revert the PR(s) implementing `SBAR-T-1..T-6`, in reverse dependency order if split across multiple PRs.
2. No migration to revert — client-only change.
3. No feature flag was introduced — nothing to disable.
4. No bilateral/platform-report payload involved — nothing to compare.
5. No downstream consumers to notify.

---

## Required cross-references

- `docs/specs/changes/result-sidebar-collapse-mobile/requirements.md` and `design.md` (same folder).
- `docs/prd.md` (`G1`, `US-S1`), `docs/ux-ui/design.md` §9, `docs/trd/trd.md` (no existing section).
