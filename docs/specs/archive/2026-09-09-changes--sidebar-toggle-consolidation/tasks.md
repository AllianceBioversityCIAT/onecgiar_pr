# Sidebar Toggle Consolidation — `tasks.md`

Linked spec: `requirements.md` + `design.md` (this folder).

## 1. Scope

- **Module / feature:** `changes/sidebar-toggle-consolidation`
- **Depth:** Lite
- **Status:** in-progress

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] No open questions blocking (STC-OQ-1 resolved inline)
- [x] No conflicting in-flight spec touching `reporting-nav-sidebar` or `shell-topbar` (only prior spec touching this area is `changes/realtime-section-completion`, unrelated surface — bottom bar)

## 3. Task list

### `STC-T-1` — Move the sidebar toggle into `reporting-nav-sidebar` (both states) and remove it from `shell-topbar`

- **Type:** client
- **Description:** Add an expanded-state toggle button to `reporting-nav-sidebar`'s header (top-right, beside "PRMS reporting", mockup img 9), reusing the existing collapsed button's icon/class/aria pattern. Remove the toggle button and its stale ownership comment from `shell-topbar`. Re-stamp `shell-topbar/CLAUDE.md`'s `Verified:` line to reflect the button's removal.
- **Implements:** STC-R-1, STC-R-2, STC-R-3, STC-R-4, STC-R-10
- **Files (expected):**
  - `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.html`
  - `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.html`
  - `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.ts` (only if `toggleSidebar()` becomes dead code)
  - `onecgiar-pr-client/src/app/shared/components/shell-topbar/CLAUDE.md` (re-stamp)
- **Depends on:** —
- **Blocks:** STC-T-2
- **Estimate:** S
- **Definition of done:**
  - [x] Expanded sidebar shows exactly one toggle button, top-right of header, `data-guide="sidebar-toggle"`, `aria-label="Collapse sidebar"`, calls `sidebarSE.toggleSidebar()`.
  - [x] Collapsed sidebar's existing button unchanged (position, `data-guide`, behavior).
  - [x] Topbar no longer renders any collapse/expand control; `pr-topbar-icon-btn` toggle block and its comment removed.
  - [x] At any given moment exactly one element in the DOM matches `[data-guide="sidebar-toggle"]` (manually verified in both states — no duplicate).
  - [x] `shell-topbar/CLAUDE.md` `Verified:` line updated (edit made; lands in the pending commit).
  - [x] Lint clean (`npx ng lint --quiet`).
  - [ ] Commit message: `🎨 style(reporting-nav-sidebar) [SPEC:changes/sidebar-toggle-consolidation]: consolidate sidebar toggle into sidebar header` — ⏸️ **NOT COMMITTED. Pending explicit user go-ahead** (standing no-auto-commit instruction). Changes are unstaged in the working tree; see `execution.md` → STC-T-1 → *Commit status*.

### `STC-T-2` — Defer the discoverability hint past the compact-collapse render tick + update specs

- **Description:** In `result-detail.component.ts` → `watchCompactEntry()`, wrap the `startResultSidebarHint()` call in `setTimeout(() => this.reportingGuideSE.startResultSidebarHint(), 0)` so it fires after Angular renders the post-collapse DOM. Update `reporting-nav-sidebar.component.spec.ts` and `shell-topbar.component.spec.ts` for the moved/removed button.
- **Type:** client, tests
- **Implements:** STC-R-5
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.spec.ts` (if the timing change needs a fake-timer tick)
  - `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.spec.ts`
  - `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.spec.ts`
- **Depends on:** STC-T-1
- **Blocks:** —
- **Estimate:** S
- **Status:** `[x]` **DONE** — code complete, Reviewer PASS, and the manual browser gate confirmed by the user on 2026-09-09. See `execution.md` → STC-T-2 + *Manual Verification Record*.
- **Definition of done:**
  - [x] `startResultSidebarHint()` call is deferred via `setTimeout(..., 0)`; `isResultSidebarHintCompleted()` check stays synchronous (unchanged).
  - [x] Unit specs updated and green for both components (`npx jest --silent --reporters=summary --no-coverage` scoped to the 3 touched spec files) — `3 passed, 3 total / 129 tests passed`. `npm run build` also green.
  - [x] ✅ **Manual verification DONE — performed by the user (santiago.sanchez@cgiar.org) manually in a real browser on 2026-09-09**, not by automation: small-screen auto-collapse correct, hint anchors correctly, no console errors. Covers STC-AC-3/STC-AC-4, the accepted verification gap in `requirements.md` §8. Evidence: `execution.md` → *Manual Verification Record*.
    - Clear `localStorage['pr.tour.result-sidebar.completed']`, open a result at a viewport >1366px → hint pops over the **expanded** header button, no console error.
    - Clear the same key, open a result at a viewport ≤1366px → sidebar auto-collapses, hint pops over the **collapsed** button, no console error.
    - If either check fails (no popover, or a `driver.js` "element not found" console error), the check is inconclusive/failing — do not mark this task done; increase the defer (e.g. `requestAnimationFrame` wrapping the `setTimeout`) and re-test, do not silently accept a missing popover.
  - [x] Lint clean (`npx ng lint --quiet` — all files pass).
  - [ ] Commit message: `♻️ refactor(result-detail) [SPEC:changes/sidebar-toggle-consolidation]: defer sidebar hint past compact-collapse render` — ⏸️ **NOT COMMITTED. Pending explicit user go-ahead** (standing no-auto-commit instruction). ⚠️ Land together with STC-T-1: STC-T-1 alone leaves two suites red.

## 4. Dependency graph

```
STC-T-1 (move button)
   └── STC-T-2 (defer hint + spec updates)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| STC-TEST-1 | unit (client) | STC-R-2, STC-R-3, STC-R-4 | `reporting-nav-sidebar.component.spec.ts` |
| STC-TEST-2 | unit (client) | STC-R-1 | `shell-topbar.component.spec.ts` |
| STC-TEST-3 | manual | STC-R-5 (STC-AC-3, STC-AC-4) | browser, both viewport widths — see STC-T-2 done criteria |

Client coverage must stay ≥ 50/60/60/60 (unaffected — this is a same-size relocation, no net new untested branches).

## 6. Rollout & verification

- [ ] PR opened with commit convention.
- [ ] CI green (lint, Jest, build).
- [ ] Manual QA per STC-T-2's two viewport checks.
- [ ] No feature flag involved — ships directly on merge.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` after merge.
- [ ] Append one line to `docs/specs/quick/quick-log.md`? — **No**, this is a full spec (`SPEC:changes/...`), not a `/akili-quick` change; traceability lives in this folder + the commit messages.
- [ ] If a future spec ever adds a second discoverability hint element, revisit STC-DD-1 (single-anchor assumption).

## 8. Roll-back plan

1. Revert the two commits (`STC-T-1`, `STC-T-2`) in order, or the single PR if squash-merged.
2. No migration, no flag, no data to restore — a plain `git revert` fully restores prior behavior.

## Required cross-references

- `docs/specs/changes/sidebar-toggle-consolidation/requirements.md`
- `docs/specs/changes/sidebar-toggle-consolidation/design.md`
- `onecgiar-pr-client/src/app/shared/components/shell-topbar/CLAUDE.md`
