# Sidebar Toggle Consolidation — `execution.md`

Linked spec: `requirements.md` · `design.md` · `tasks.md` (this folder).

## 1. Document Control

- **Module / feature:** `changes/sidebar-toggle-consolidation`
- **Depth:** Lite
- **Branch:** `qa-development-2026-ss` (default branch pin: `master`)
- **Approval Mode:** gated (HITL pause after every task PASS/HALT)
- **Leader model tier:** T1 · **Implementer:** T2 wrapper (`akili-implementer`) · **Reviewer:** T3 wrapper (`akili-reviewer`) — author ≠ auditor enforced by the Step 8E wrappers
- **Budget (design.md §Budget):** 2 tasks · ~40-60 LOC · 1 review round
- **Commit policy for this run:** ⚠️ **NO auto-commit.** The user holds a standing instruction that no `git commit` runs without an explicit go-ahead. Every task in this run stops after the `execution.md` + `tasks.md` writes; the commit named in each task's Definition of done is **pending user approval** and is NOT executed by the Leader.

## 2. Task Execution History

<!-- Entries appended below, one per task, oldest first. -->

### `STC-T-1` — Move the sidebar toggle into `reporting-nav-sidebar` (both states) and remove it from `shell-topbar`

- **Final status:** ✅ PASS (Reviewer PASS on attempt 1 — no rework)
- **Date:** 2026-09-08
- **Implementer attempts:** 1
- **Requirements covered:** STC-R-1, STC-R-2, STC-R-3, STC-R-4, STC-R-10
- **Acceptance criteria addressed:** STC-AC-1, STC-AC-2, STC-AC-5 (STC-AC-3/AC-4 belong to STC-T-2's manual gate)

#### Routing decisions (Leader)

| Dimension | Value | Reason |
|---|---|---|
| Implementer | T2 wrapper `akili-implementer` | Standard scoped client task |
| Reviewer | T3 wrapper `akili-reviewer` | `author ≠ auditor` enforced by the Step 8E wrappers |
| Effort | `medium` | Well-specified template relocation; `/akili-specify` had already decomposed it |
| Skills assigned | `spartan` + `angular-developer` | `spartan` is **mandatory** for any frontend work per `onecgiar-pr-client/CLAUDE.md`, and the sidebar is a Helm/Spartan surface. **Deviation from `tasks.md`:** the task file names no skills, so the Skill Map default (`angular-developer`) was augmented with `spartan` per the client guide's hard rule |
| Review lens mode | Lens checklist (single Reviewer, 4R advisory sweep) | Effort `medium`; task touches no security, migration, or data-loss surface |

#### Attempt 1

**Files changed (4, all client, all within the task's expected-file list):**

| File | Change |
|---|---|
| `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.html` | Added the expanded-state toggle button as the first element of a new right-hand cluster `<div class="flex shrink-0 items-center gap-[6px]">` that also holds the pre-existing build-number pill; replaced the stale "the collapse toggle belongs to the topbar alone" comment with one citing STC-DD-1. Collapsed-state button untouched. |
| `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.html` | Removed the `pr-topbar-icon-btn` toggle button and its explanatory comment block. |
| `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.ts` | Dropped the now-unused `lucidePanelLeft` import and `provideIcons` entry; corrected the class docstring. `toggleSidebar()` deliberately retained — see *Decisions* below. |
| `onecgiar-pr-client/src/app/shared/components/shell-topbar/CLAUDE.md` | Removed "sidebar toggle" from the summary, added a ⚠️ trap note recording the move, re-stamped `Verified: 2026-09-08 · branch qa-development-2026-ss`. 58 lines (cap 120). |

`reporting-nav-sidebar/` has no `CLAUDE.md` (verified by both workers) — none created, correctly.

**Implementer verification:**

- `cd onecgiar-pr-client && npx ng lint --quiet` → `All files pass linting.` ✅
- `npx jest --silent --no-coverage --testPathPattern="(reporting-nav-sidebar|shell-topbar)\.component\.spec"` → `Test Suites: 2 failed, 2 total; Tests: 2 failed, 91 passed, 93 total` ⚠️ **expected**, see below
- Client-wide grep for `data-guide="sidebar-toggle"` in live markup → exactly 2 sites, both in `reporting-nav-sidebar.component.html` (`:40` expanded, `:76` collapsed); **0** in `shell-topbar.component.html`
- `ng build` NOT run (the task allowed the spec-based path as the minimum)

**Reviewer verdict: `STATUS: PASS`**

> All seven of `STC-T-1`'s Definition-of-done criteria are met — one expanded-state toggle with the correct hook/label/handler, the collapsed button untouched, the topbar control and comment gone, the `[data-guide="sidebar-toggle"]` single-match invariant provably held by mutually exclusive `@if`s on one `computed<boolean>`, the folder doc re-stamped and now accurate, lint clean, no hardcoded colour and no rem type utility. The two red assertions are static template-text parses whose counts went stale, not a runtime duplicate, and both files belong to `STC-T-2`.

Reviewer adjudications the Leader had explicitly requested:

1. **STC-R-4 invariant HOLDS.** `:32` is `@if (!isCollapsed())`, `:69` is `@if (isCollapsed())`, both reading one `computed` (`state() === 'collapsed' && !isMobile()`). A `computed<boolean>` cannot be both truthy and falsy in one render pass → exactly one match, never zero, never two, mobile case included. `reporting-guide.service.ts:165` still holds the selector unchanged.
2. **STC-R-3 satisfied** — collapsed button byte-identical, not moved.
3. **The new wrapper `<div>` conforms** to design §6.1 rather than drifting from it: the header row still has exactly two flex children, so `justify-between` still pushes the cluster right; §6.1 had pre-authorised the toggle sitting left of the build badge.
4. **STC-R-10 / §7 a11y satisfied.** Dropping `mx-auto` from the copied class string was **correct, not a regression** — it is rail-centring on the collapsed button and an `auto` margin inside the new flex row would have pushed the pair apart.
5. **Retaining `toggleSidebar()` is not an STC-R-1 violation** — STC-R-1 is scoped to the *button*, and both design §6.1 and the task file make the handler removal explicitly conditional on it being dead. None of the seven done-criteria mentions the handler.
6. **Folder-doc convention met** — 58 lines, stale claim gone from both the title line and the intro, remainder of the file re-read for collateral falsehood and still accurate.

**The two red assertions — investigated, not accepted on assertion.** The Leader flagged the `reporting-nav-sidebar` failure specifically, because a *rendered-DOM* count of 2 would have been a genuine STC-R-4 break rather than a stale test. The Reviewer read both specs at source and established they are **static template-text parses**, not rendered DOM: each builds a `Document` via `readFileSync(...component.html)` + `new DOMParser().parseFromString(...)` (a documented workaround for `NG0311` from `hlmSidebarMenuButton`'s `BrnTooltip` host binding under Jest). `DOMParser` has no notion of `@if`, so it counts both authored branches. Therefore:

- `reporting-nav-sidebar.component.spec.ts:801` reading **2** = a stale count of authored branches, **not** two simultaneous runtime matches.
- The same spec's `:806-812` (`aria-label 'Expand sidebar'`, class string with `mx-auto`) now read `hooks[0]`, which is the *new* expanded button — stale text-order assumption, not a change to the collapsed button.
- `shell-topbar.component.spec.ts:297` reading **0** is the correct, desired consequence of STC-R-1 / STC-AC-1.

Both spec files are named in `STC-T-2`'s expected-files list, so the fix is assigned there and did not gate this task.

#### Decisions made

- **`toggleSidebar()` kept on `ShellTopbarComponent`** for this task. `shell-topbar.component.spec.ts:146` still calls it directly, so by the letter of design §6.1 ("if nothing else calls it") and the task's file list ("only if it becomes dead code") it was not yet dead. Both workers converged on this independently. It is now UI-unreachable and is a forward pointer to STC-T-2 (below).
- **Skill set augmented** beyond the Skill Map default — `spartan` added, per the client guide's mandatory-for-all-frontend-work rule.

#### ⏩ Forward pointers — MUST be carried into the `STC-T-2` brief

These were deferred by the Reviewer to STC-T-2. A pointer filed here is not carried by having been filed; the STC-T-2 brief must copy them.

1. Remove `toggleSidebar()` **and** the now sole-purpose `private readonly sidebarSE = inject(HlmSidebarService)` (`shell-topbar.component.ts:49`) in the same change that rewrites `shell-topbar.component.spec.ts:146` — both are UI-unreachable once that direct call goes.
2. Drop the "pending update in a follow-up task" sentence from `shell-topbar/CLAUDE.md` at that point, so the doc does not outlive its own caveat (and re-stamp `Verified:` again).
3. Fix the two stale assertions as *template-text* parses, not as rendered DOM: `reporting-nav-sidebar.component.spec.ts:801` (count 1 → 2 authored branches) and `:806-812` (which now read `hooks[0]` = the expanded button, so the `'Expand sidebar'` / `mx-auto` expectations must move to `hooks[1]` or be split per branch); `shell-topbar.component.spec.ts:289-297` (count 1 → 0).
4. Revert the whitespace-only churn at `shell-topbar.component.ts:40` — the `providers:` line appears as both a removal and an identical re-addition.
5. Run `npm run build` before the PR — per `onecgiar-pr-client/src/CLAUDE.md` §21.7, `ng build` is the **only** gate that typechecks Angular templates, and it has not been run on this change.

#### `ADVISORY` (4R lens findings — recorded only; never gated this task and must not grow the spec)

- **RISK / Reliability:** `ng build` not run; template symbols verified by hand instead (`sidebarSE` is `public readonly` at `reporting-nav-sidebar.component.ts:130`; `lucidePanelLeft` is registered in that component's `provideIcons` at `.ts:108`). Residual build risk low but unproven — see forward pointer 5.
- **Readability:** whitespace-only churn at `shell-topbar.component.ts:40` — see forward pointer 4.
- **Reliability (pre-existing, now moot):** the *deleted* topbar button rendered `<ng-icon name="lucidePanelLeft">` while `lucidePanelLeft` was imported but never passed to that component's `provideIcons` — that icon slot was likely blank in production all along. Nothing to do; recorded because it means the removal loses nothing.
- **Readability / dead code:** see forward pointers 1-2.
- **Risk (sequencing):** STC-T-1 alone leaves two suites red, so this commit is not independently green against the `master` pin. Land STC-T-1 + STC-T-2 in one PR, or accept a knowingly-red intermediate commit — do not push STC-T-1 alone to a branch CI watches.
- **Readability (convention, minor):** `docs/COMPONENT-DOCS.md` §5's stamp template is `YYYY-MM-DD · branch · sha`; the new stamp substitutes a `SPEC:` ref for the sha. Precedent exists and a sha is unknowable pre-commit, so this is acceptable; appending the sha on a follow-up touch would match exactly.

#### Issues encountered

None. No rework attempts consumed, no Pivot, no ambiguity requiring user escalation.

#### Budget check (design.md §Budget: 2 tasks · ~40-60 LOC · 1 review round)

Within budget — 4 files / ~60 LOC changed (`44 insertions(+), 36 deletions(-)`), 1 review round, 0 rework attempts. **No tripwire.**

#### 🚦 Commit status: PENDING USER APPROVAL — not executed

`tasks.md` names the commit `🎨 style(reporting-nav-sidebar) [SPEC:changes/sidebar-toggle-consolidation]: consolidate sidebar toggle into sidebar header`. Per the user's standing no-auto-commit instruction, the Leader **stopped short of Step 3's commit step**. Changes are left unstaged in the working tree; nothing was `git add`-ed. The commit must be made by the user, or by an agent after an explicit go-ahead.

#### Constitution Impact

None. No module created, no module boundary moved, no public surface changed — the change relocates one control between two existing shell components. `shell-topbar/CLAUDE.md` (the affected child guide) was updated in-task rather than deferred, per the client's folder-doc convention. **A CodeGraph re-index is pending** for the removed `shell-topbar` template button and the new sidebar button, to be picked up by `/akili-archive`.

---

### `STC-T-2` — Defer the discoverability hint past the compact-collapse render tick + update specs

- **Final status:** ✅ **`[x]` PASS** — Reviewer PASS on attempt 1 (2026-09-08), and the last outstanding criterion (the manual two-viewport browser check) confirmed by the **user, manually**, on 2026-09-09. See the *Manual Verification Record* at the end of this file.
  - **Status history, kept deliberately:** this task sat at `[~]` from 2026-09-08 to 2026-09-09. It was **not** marked `[x]` on the Reviewer PASS alone, because per `/akili-execute` Step 2.3.0 a task with an outstanding gap never reaches `[x]` *even on a Reviewer PASS* — the Reviewer audits what was written, not what was omitted. The checkbox moved only once a human actually performed the check.
- **Date:** 2026-09-08
- **Implementer attempts:** 1
- **Requirements covered:** STC-R-5 (automated portion; STC-AC-3/AC-4 pending human verification)

#### Routing decisions (Leader)

| Dimension | Value | Reason |
|---|---|---|
| Effort | `high` (up from STC-T-1's `medium`) | The one-line production change is trivial, but the fake-timer interaction with an RxJS subscription created in the constructor carries real subtlety |
| Skills assigned | `angular-developer` + **`tdd`** | **Deviation recorded:** `tasks.md` names no skills. `tdd` was assigned deliberately because the fake-timer ordering assertion *is* the deliverable — this is the task that converts part of an accepted manual-QA gap into an automated gate, so red→green earns its cost here. **`spartan` deliberately NOT assigned** (contrast STC-T-1): no Spartan/Helm component contract is authored in this task — only a `setTimeout` in a page component plus test assertions — so the client guide's mandatory-Spartan rule does not bite |
| Review lens mode | Lens checklist | Effort `high` is still checklist range; no security/migration/data-loss surface |

#### Attempt 1 — files changed (6)

| File | Change |
|---|---|
| `...pages/result-detail/result-detail.component.ts` | `startResultSidebarHint()` deferred via `setTimeout(..., 0)`; `isResultSidebarHintCompleted()` check left synchronous and outside the timeout; comment citing STC-DD-2 added. No new import. |
| `...pages/result-detail/result-detail.component.spec.ts` | Synchronous hint assertions replaced with five fake-timer assertions incl. a "must NOT fire synchronously" regression guard and an `invocationCallOrder` check. |
| `...shell-topbar/shell-topbar.component.ts` | `toggleSidebar()`, the `sidebarSE = inject(HlmSidebarService)` field, and the `HlmSidebarService` import removed (forward pointer 1). Whitespace churn resolved (pointer 4). |
| `...shell-topbar/shell-topbar.component.spec.ts` | `toggleSidebar delegates` test + `sidebarMock`/`HlmSidebarService` scaffolding removed; hook assertion inverted to expect ZERO matches (STC-R-1/STC-AC-1); stale comment rewritten. |
| `...reporting-nav-sidebar/reporting-nav-sidebar.component.spec.ts` | Stale single-hook assertion replaced by three: 2 authored branches (documented `DOMParser` artifact), the expanded button, the collapsed button — selected by `aria-label`, not by index. |
| `...shell-topbar/CLAUDE.md` | "pending update in a follow-up task" caveat dropped (pointer 2); re-stamped `2026-09-08 · qa-development-2026-ss · STC-T-2`. 58 lines. |

#### Verification — all four gates run, all green

- `npx ng lint --quiet` → `All files pass linting.` ✅
- `npx jest --silent --reporters=summary --no-coverage --testPathPattern="(reporting-nav-sidebar|shell-topbar|result-detail)\.component\.spec"` → `Test Suites: 3 passed, 3 total / Tests: 129 passed, 129 total / Time: 11.473 s` ✅ (contrast STC-T-1, which left 2 red — those are now closed)
- `npm run build` → `Application bundle generation complete. [101.349 seconds]` ✅ — **this also retroactively validates STC-T-1's template edits**, since per `onecgiar-pr-client/src/CLAUDE.md` §21.7 `ng build` is the only gate that typechecks Angular templates and it had not been run for STC-T-1. Only pre-existing unrelated warnings (NG8112/NG8113 in `dashboard-lab`, `results-list`, `update-notification`, `hlm.spec.ts`; bundle-budget; CommonJS) — the Reviewer spot-checked that none implicate the six files in this diff.
- `shell-topbar.component.ts` now has zero `toggleSidebar` occurrences; repo-wide grep leaves only the Spartan service internals, the two sidebar template call sites, and the specs' assertions.

#### Reviewer verdict: `STATUS: PASS`

> STC-T-2's automatable Definition-of-done criteria are all met — the `startResultSidebarHint()` call is deferred via `setTimeout(..., 0)` with `isResultSidebarHintCompleted()` left synchronous and outside the timeout exactly per `design.md` §6.1, no new import, the defer is provably not a no-op (`reporting-guide.service.ts:160` drives synchronously), all five of STC-T-1's forward pointers landed, and the three suites are green. The one genuinely new automated gate — "the hint must not fire synchronously" — is real and fails on a revert, which narrows the STC-AC-3/AC-4 verification gap as far as jsdom permits.

Key adjudications:

- **The defer is provably not a no-op.** `reporting-guide.service.ts:160-171` calls `drive()` **synchronously** with `element: '[data-guide="sidebar-toggle"]'` — no internal defer — so the caller-side yield is the only thing standing between the signal write and the DOM query. This is the load-bearing confirmation that STC-DD-2's mitigation is real rather than decorative.
- **All five forward pointers landed** (4 verified directly by the Reviewer; `npm run build` accepted on the Implementer's report as the Reviewer has no shell).
- **`setTimeout(0)` proved sufficient** in the fake-timer test; no `requestAnimationFrame` escalation was needed on the automated evidence.

#### 🔬 Leader probe — the manual-check deferral was TESTED, not assumed

Per `.agents/leader.md` → *Deferring a check*, the assumption behind the deferral was falsified before being recorded:

- **Assumption stated:** "the STC-AC-3/AC-4 browser check cannot be run in this session."
- **Probe run:** (a) `list_connected_browsers` → **empty list** — no Chrome extension instance connected, so there is no browser-automation surface at all; (b) checked for a JWT in-session → **none supplied**. Per `onecgiar-pr-client/CLAUDE.md` §9 an automated session needs **both** `token` and `user` in `localStorage`, or `RolesService.updateUserData` returns early and every permission-gated control silently disappears — and the token can only come from the user; (c) `netstat` → dev servers ARE live on ports **4200 and 4500**, but neither was started by this session, and the same guide warns a long-running `ng serve` can serve a stale bundle while disk is already new, which would produce a convincing false negative.
- **Result: probe-CONFIRMED blocker.** The deferral rests on a tested assumption, not a guess. Two of the three grounds (no browser, no token) are hard blocks that no amount of Leader effort can lift.
- **Partial substitute obtained instead of a blanket deferral:** the *ordering* half of the risk was converted into a real automated gate (Part C of the Implementer's brief) — the "must NOT fire synchronously" assertion fails immediately if the `setTimeout` is reverted. What remains genuinely un-automatable is the last mile: that `driver.js` resolves the anchor and paints a legible popover with no console error. `design.md` §13 already rules a headless-browser spec out of scope as disproportionate for a Lite change.

#### ⛔ OUTSTANDING — blocks `[x]`, needs a human

`tasks.md` → STC-T-2 → Definition of done, item 3 (**manual verification, STC-AC-3/STC-AC-4**):

1. Clear `localStorage['pr.tour.result-sidebar.completed']`, open a result at a viewport **>1366px** → the hint must pop over the **expanded** header button, with no console error.
2. Clear the same key, open a result at a viewport **≤1366px** → the sidebar auto-collapses and the hint must pop over the **collapsed** button, with no console error.

`tasks.md` is explicit that a missing popover or a `driver.js` "element not found" error means the check is **failing/inconclusive — do not mark the task done**; the prescribed remedy is to strengthen the defer (e.g. wrap the `setTimeout` in `requestAnimationFrame`) and re-test, never to silently accept a missing popover.

**⚠️ If that escalation is needed, it breaks three of the new assertions.** `result-detail.component.spec.ts:607`, `:632`, `:653` flush via `advanceTimersByTime(0)`, which does **not** flush a `requestAnimationFrame` under Jest fake timers (needs `jest.advanceTimersToNextFrame()` or an rAF mock). Revise those three in lockstep with any defer escalation.

**To run the check, the Leader needs from the user:** (1) a valid JWT plus the `user` object (or permission to rebuild it from the JWT payload), (2) a connected Chrome extension instance, (3) permission to start a dev server on a free port rather than reusing 4200/4500.

#### `ADVISORY` (4R findings — recorded and closed here; they did NOT gate, and per the *Advisory Never Becomes A Task* rule they must NOT be folded into this spec)

Two of these were surfaced because the Leader flagged them for explicit adjudication rather than accepting the green suite at face value. Both were confirmed as real:

1. **RELIABILITY — fake-timer comment is inverted (latent hazard).** `result-detail.component.spec.ts:581-591`'s comment claims its `afterEach(jest.useRealTimers())` prevents leakage into later siblings. It is backwards: fake timers are installed **file-wide at line 40**, so `useRealTimers()` is *itself* the deviation and the paired `beforeEach(useFakeTimers)` is redundant. Harmless **today** only because this is the last describe (`:584-660`, outer closes `:661`) with no outer `afterEach` — but the file now ends in a different timer state than it started. Any describe appended below, or a `--randomize`/reordered run, would expose the rest of the file to real timers while `result-detail.component.ts:243` schedules an unclearable **150 ms** trailing `setTimeout` outside the Angular zone. Fix: drop both hooks (`advanceTimersByTime(0)` works with the file-wide install) or restore *fake* — not real — timers, and correct the comment.
2. **RELIABILITY — one assertion is weaker than it advertises.** `reporting-nav-sidebar.component.spec.ts:830`'s `expect(html).toContain('@if (!isCollapsed())')` matches **7 occurrences** in the template (lines 20, 32, 126, 274, 296, 329, 378) and would keep passing if the toggle's own guard at line 32 were **deleted, inverted, or widened**. It does not pin the STC-R-4 mutual-exclusivity claim its comment advertises. (The Leader also suspected the sibling assertion was vacuous by substring — the Reviewer disproved that half: `@if (isCollapsed())` is *not* a substring of the negated form and matches only line 69, the collapsed toggle's real guard, so it is accidentally sound.) The rest of that block — `hooks.length`, `aria-label`-keyed lookup, `type`/`title`, click handler, exact class string with the `mx-auto` split — are real gates. Proposed stronger form: extract the nearest enclosing `@if` per `aria-label` marker rather than searching the whole file, asserting the expanded button's guard is exactly `!isCollapsed()` and the collapsed button's is exactly `isCollapsed()`.
3. **READABILITY / test value —** `result-detail.component.spec.ts:656-658`'s `invocationCallOrder` comparison is arithmetically implied by `:650-651` + `:655` in the same test, and cannot prove what its comment at `:638-641` claims (that Angular's *render* interleaves before `driver.js` queries the DOM — unobservable in jsdom). Keep it (cheap), but soften the comment so a maintainer does not read the race as automatically proven closed.
4. **RESILIENCE —** the three `advanceTimersByTime(0)` sites are pre-committed to the current defer idiom; see the ⚠️ under *Outstanding* above.
5. **RELIABILITY (production, minor) —** the new `setTimeout` is untracked and escapes the subscription's `takeUntilDestroyed()`, so a navigation within the same tick can fire the hint post-destroy. Negligible (the anchor is shell-level per STC-DD-1, the service is root-provided) and it matches the file's existing habit — `ngOnDestroy` does not clear `trailingScanId` either. If ever tightened, do both together via a `DestroyRef.onDestroy(() => clearTimeout(id))`.
6. **RISK —** `npm run build` was accepted on the Implementer's report, not independently observed by the Reviewer (no shell). The warning spot-check is consistent.

#### Issues encountered

No rework attempts consumed, no Pivot, no `FATAL_FAIL`. The only non-routine element is the probe-confirmed manual-verification blocker recorded above.

#### Budget check (design.md §Budget: 2 tasks · ~40-60 LOC · 1 review round)

⚠️ **LOC over budget, benignly.** Cumulative working tree is `186 insertions(+), 98 deletions(-)` across 8 files versus the ~40-60 LOC estimate. The overrun is **entirely test and comment volume**, not production code: the production delta is 2 lines changed in `result-detail.component.ts` plus ~10 deleted from `shell-topbar.component.ts`, well inside the estimate. `design.md` §Budget scoped "mostly HTML template moves, a few lines of TS" and did not price the three spec-file rewrites that `tasks.md` STC-T-2 itself mandates. Tasks (2/2) and review rounds (1/1) are exactly on budget. **Assessed as an estimation gap in the budget line, not scope creep — no tripwire escalation warranted**, recorded here so `/akili-archive`'s Kaizen step can correct how spec-file rewrites are priced.

#### 🚦 Commit status: PENDING USER APPROVAL — not executed

`tasks.md` names `♻️ refactor(result-detail) [SPEC:changes/sidebar-toggle-consolidation]: defer sidebar hint past compact-collapse render`. Per the user's standing no-auto-commit instruction the Leader stopped short of Step 3's commit step. Nothing staged, nothing committed.

**Sequencing note (from STC-T-1's advisory, now resolved):** STC-T-1 alone left two suites red. With STC-T-2 in the tree all three suites are green and the build passes, so the two tasks together form one coherent, CI-safe commit or PR. Landing **STC-T-1 alone would still be red** — do not split them.

#### Constitution Impact

None. No module created or reshaped, no public surface changed. `shell-topbar`'s public API did shrink (`toggleSidebar()` removed), but it is a shell-internal standalone component with no external consumer — grep confirms zero callers outside its own spec. `shell-topbar/CLAUDE.md` updated in-task. **CodeGraph re-index still pending** for `/akili-archive`.

---

## Pivot Record: `STC-T-2` (spec-level — affects `STC-T-1` retroactively)

- **Date:** 2026-09-09
- **Raised by:** Leader, during the environment probe for STC-T-2's manual browser gate
- **Status:** ✅ **CLOSED 2026-09-09** — resolved with the user's chosen MINIMAL fix (not full Option A). See *Pivot Resolution* at the end of this file.
- **Trigger:** not an implementation failure. Both tasks passed review and all automated gates are green. The probe surfaced that **the approved spec itself rests on a false premise and its file lists omit a real consumer.**

### 1. What was discovered

`onecgiar-pr-client/cypress/e2e/result-detail/sidebar-collapse.cy.ts` (240 lines) is an **existing E2E suite for this exact surface**, written by the prior spec `changes/result-sidebar-collapse-mobile` (task `SBAR-T-6`). This change **breaks it**, and it appears in **no** file list in `tasks.md`, `design.md`, or `requirements.md`.

The breakage is mechanical and certain (`cy.get()` on a zero-match selector fails):

| Line | Code | Effect after STC-T-1 |
|---|---|---|
| 44 | `const TOPBAR_TOGGLE = 'header.pr-shell-topbar [data-guide="sidebar-toggle"]';` | Resolves to **zero elements** — the topbar button was removed |
| 152 | `cy.get(TOPBAR_TOGGLE).click()` (SBAR-AC-3) | **FAILS** |
| 192 | `cy.get(TOPBAR_TOGGLE).click()` (SBAR-AC-4) | **FAILS** |
| 216 | `cy.get(TOPBAR_TOGGLE).should('have.attr', 'data-guide', 'sidebar-toggle')` (SBAR-AC-5) | **FAILS** |
| 22-27 | Doc block: "`[data-guide="sidebar-toggle"]` exists on the ALWAYS-VISIBLE topbar toggle … Clicking the toggle is therefore always scoped to the topbar's copy … so it resolves to exactly one element regardless of collapsed/expanded state" | Now **factually false** — it documents precisely the guarantee STC-DD-1 deliberately removed |

**3 of the suite's 5 `it()` blocks** depend on `TOPBAR_TOGGLE`.

### 2. Why nobody caught it

- **It is dormant.** `describeWithToken` (`cypress/support/result-detail.ts:40`) is `hasToken() ? describe : describe.skip`, and `cypress.env.js` has no `userToken` configured — so the suite currently **skips silently**. It is not in CI either (Cypress is local-only, no GitHub Actions workflow). Nothing anywhere goes red today.
- **Both Reviewers were pointed at Jest specs**, per the approved `design.md` §10, which names only `reporting-nav-sidebar.component.spec.ts` and `shell-topbar.component.spec.ts`.
- The Implementer's `data-guide` grep did surface the `.cy.ts` hits, but as comment/constant matches among 16 — nothing in the brief or the spec flagged Cypress as a consumer to check.

### 3. The deeper problem — a false premise in the approved spec

`design.md` §13 states: *"No automated coverage for `driver.js` anchor-timing races in this codebase today; this spec does not introduce one (out of scope — would require a headless-browser/Cypress spec asserting the popover element renders, which is disproportionate to a Lite change)."*

**That is wrong.** `sidebar-collapse.cy.ts` SBAR-AC-5 (lines 203-230) already does almost exactly that:

- `cy.get('.driver-popover', { timeout: 15000 }).should('be.visible')`
- `cy.get('.driver-popover-title').should('contain.text', 'Collapse the sidebar')`
- asserts the hint storage key flips to `'true'` on dismiss, and does **not** reappear after reload
- and it runs at **1600px** (SBAR-AC-5, SBAR-AC-2) **and 1350px** (SBAR-AC-1, AC-3, AC-4) — the two viewport bands STC-AC-3/AC-4 ask for

So the harness the spec called "disproportionate to build" **already exists and is already paid for.** Consequently:

- `requirements.md` §8's "accepted verification gap" row and `design.md` §13's "accepted risk" are both premised on a claim that is false.
- The STC-AC-3/AC-4 check was recorded as manual-only when it is, in fact, ~80% automatable today by repointing one constant.

### 4. Options

| Option | Cost | Assessment |
|---|---|---|
| **A. Amend the spec: add `sidebar-collapse.cy.ts` to scope, repoint `TOPBAR_TOGGLE` at the sidebar's own toggle, correct §13/§8, then RUN the suite as the STC-AC-3/AC-4 gate** | ~1 constant + 1 doc block + a run against the live local backend | **Recommended.** Fixes the defect, converts the "accepted manual gap" into a real automated gate, and retires the manual checkbox honestly instead of by assertion |
| **B. Fix only the selector, leave the spec docs' false premise standing** | Smallest diff | Rejected — leaves `requirements.md` §8 and `design.md` §13 asserting something untrue, which is how this defect was produced in the first place |
| **C. Ship as-is; file the Cypress breakage as a follow-up** | Zero now | Rejected — knowingly leaves a broken test suite on the branch. It is masked only by a missing token, so it fails for the next person who configures one, with no link back to this change |
| **D. Delete the three affected `it()` blocks** | Small | **Strongly rejected** — deletes coverage of the prior spec's approved acceptance criteria (`SBAR-AC-3/4/5`) to make our change look clean |

### 5. Why this is a Pivot and not an advisory

The *Advisory Never Becomes A Task* rule bars growing scope from lens findings. This is not a lens finding: it is a **consumer the approved `tasks.md` failed to enumerate**, plus a **factually incorrect premise** in the approved `design.md`. Per the Pivot Protocol the plan itself is wrong, so the correct move is to stop and reopen the spec for approval rather than either silently widening a task or shipping a known break.

### 6. Impact on the two completed tasks

Neither needs rework. `STC-T-1` (`[x]`) and `STC-T-2` (`[~]`) are correct against the requirements as written — the requirements were incomplete, not violated. If Option A is approved, the Cypress fix is new work (a third task), and STC-T-2's manual checkbox is then satisfied by the repointed suite rather than by a human pass.

### 7. Verification environment — probe results (2026-09-09)

Recorded because they change what is possible versus the 2026-09-08 probe:

| Element | State |
|---|---|
| Chrome extension (browser automation) | ❌ **Not connected** — `tabs_context_mcp` returns "Browser extension is not connected". Re-probed twice. The provided token does **not** lift this |
| Local backend | ✅ **Running on port 3400**, which is what `environment.ts` `apiBaseUrl` points at |
| Cypress | ✅ **14.5.1 installed, binary cached** — a working browser driver *is* available, contradicting the 2026-09-08 "no browser" conclusion |
| Playwright / Puppeteer | ❌ Not installed |
| Node | ⚠️ **v24.13.0**, but `docs/infrastructure.md` §6 pre-check requires **20.x**. Builds and tests pass regardless; flagged as a contract deviation, not acted on |
| Dev server started by this session | **None.** Its only purpose was the Chrome-driven check, which cannot run — so starting one (and then tearing it down) would have been waste. The user's own servers on 4200/4500 were left untouched |
| Token handling | Used for **nothing yet**. Never written to any file, spec, log, commit, or `execution.md`; verified by a repo-wide content grep for the signature fragment → no match on disk |

**Blocker for the Chrome route:** the extension must be installed and connected (https://claude.ai/chrome), logged into the same account as Claude Code. Nothing else is missing.

---

## Manual Verification Record — `STC-T-2` / STC-AC-3 · STC-AC-4

- **Date:** 2026-09-09
- **Performed by:** **the user (santiago.sanchez@cgiar.org), manually, in a real browser.** Not automated, not performed by an agent.
- **Method:** hands-on browser session against the local stack. No Cypress, no browser automation — the Chrome extension was never connected for this session (see the Pivot Record §7), so the two Leader probes correctly concluded the agent could not drive this check.
- **Reported result:** ✅ **PASS.** The sidebar auto-collapses correctly on small screens, the discoverability hint anchors correctly, and no console errors were observed.

### What this closes

`tasks.md` → `STC-T-2` → Definition of done item 3, the two-viewport manual gate that `requirements.md` §8 records as an accepted verification gap with no automated equivalent. This is the defect class that caused the original escalation out of `/akili-quick` (the removal changed the anchor behaviour of `ReportingGuideService.startResultSidebarHint()`), so a human pass on it is the evidence the spec asked for. **STC-T-2 → `[x]`.**

Together with the automated gates already recorded (the "must NOT fire synchronously" fake-timer regression guard, the 3 green Jest suites, and `npm run build`), STC-R-5 is now verified from both directions: the ordering is machine-checked, and the rendered outcome is human-confirmed.

### Fidelity note (recorded so the evidence is not overstated)

The report received by the Leader states the small-screen auto-collapse and the hint anchoring were confirmed with no console errors. It does **not** itemise the two viewport bands (>1366px and ≤1366px) as separate observations the way the DoD lists them. The user is the authority on his own testing and has judged the criterion met; this note exists only so a future reader knows the granularity of the evidence recorded here, and does not mistake it for a per-band written log. No agent re-verification was performed or is implied.

### Pivot Resolution — CLOSED 2026-09-09 (minimal fix, user-directed)

**User decision: the MINIMAL fix, explicitly NOT full Option A.** Recorded verbatim in effect:

| Action | Decision |
|---|---|
| Repoint the broken selector in `sidebar-collapse.cy.ts` | ✅ **DONE** |
| Amend `design.md` §13 / `requirements.md` §8 to correct the false "no automated coverage exists" premise | ❌ **DECLINED by the user.** The premise remains unamended **on purpose** — see *Known residue* below |
| Bring `sidebar-collapse.cy.ts` formally into this spec's scope / requirements | ❌ **DECLINED by the user** |

#### The fix

One file, `onecgiar-pr-client/cypress/e2e/result-detail/sidebar-collapse.cy.ts`:

- `TOPBAR_TOGGLE = 'header.pr-shell-topbar [data-guide="sidebar-toggle"]'` (zero matches after STC-T-1) → renamed and repointed at the sidebar host, composed from the file's existing `SIDEBAR` constant rather than duplicating the literal:
  ```ts
  const SIDEBAR = 'hlm-sidebar';
  const SIDEBAR_TOGGLE = `${SIDEBAR} [data-guide="sidebar-toggle"]`;
  ```
  This resolves to exactly one element in **either** sidebar state, which is the guarantee the original comment wanted and previously obtained via the topbar's always-present copy.
- Lines changed: **22-27** (doc block rewritten to describe the current STC-DD-1 contract), **44** (constant), **151** (stale inline comment), **152**, **192**, **216** (usages).
- `TOPBAR_TOGGLE` → **0 hits** afterwards. The two surviving `topbar` mentions (lines 23, 153) are deliberate and factually true — they state the topbar's copy *was removed*.
- No test title, viewport, timeout, `cy.intercept` glob, or assertion semantic was changed; no test added or deleted; `cypress/support/**` untouched; `cypress.env.js` never created or modified.

#### Verification — a real browser run, not an inspection

| Gate | Result |
|---|---|
| `npx ng lint --quiet` | ✅ `All files pass linting.` |
| `npx tsc --noEmit -p cypress/tsconfig.json` | ⚠️ ~100 **pre-existing** errors across `cypress/support/**`, `custom-fields/**` and `shared/services/api/**` (module-resolution config + Cypress/Mocha global typing conflicts). **Zero in `sidebar-collapse.cy.ts`.** That tsconfig is broadly broken independent of this change and is evidently not meant to be run standalone; recorded, not acted on |
| **`npx cypress run --spec cypress/e2e/result-detail/sidebar-collapse.cy.ts`** | ✅ **`All specs passed!` — 5 passing, 0 failing, 1m 23s.** Cypress 14.5.1, Electron 130 headless, against a Leader-started dev server on **port 4501** and the live local backend on **3400** |

Run environment, chosen deliberately:

- The dev server was **started by this session** on a free port (4501) and confirmed `HTTP 200` before the run, per `onecgiar-pr-client/CLAUDE.md` §9 trap 2 — *never trust a dev server you did not start*, because a long-lived `ng serve` can keep serving a stale bundle while disk is already new. The user's own servers on 4200/4500 were **not** touched, restarted, or verified against.
- The server was **torn down** after the run (port 4501 confirmed free); the user's 3400/4200/4500 confirmed still listening and untouched.
- Auth used `CYPRESS_userToken` as a **process env var for that single run only**. It was never written to `cypress.env.js` or any other file. `cy.loginByToken` seeds both `token` **and** `user` (rebuilding the user from the JWT payload via `userFromToken`), which is what avoids §9 trap 1 — the half-built session where every permission-gated control silently disappears.
- All command output was passed through a redaction filter. A post-run repo-wide content grep for the JWT signature fragment found **no match anywhere on disk**; the run produced 0 screenshots and no video.

#### Why this run matters more than the fix

The five tests it re-greens are not incidental — three of them exercise **exactly** the behaviour this spec's manual gate was created for, in a real browser:

- **SBAR-AC-1 / AC-3 / AC-4** run at **1350px** (the ≤1366px compact band) and assert the sidebar auto-collapses on entry, that a manual re-expand via the sidebar's own toggle survives a section switch, and that a fresh entry to a different result id re-triggers the collapse.
- **SBAR-AC-5** runs at **1600px** (the >1366px band) and asserts `.driver-popover` **is visible**, that its title reads "Collapse the sidebar", that the hint's storage key flips to `'true'` on dismiss, and that it does **not** reappear after reload.

So the popover genuinely renders and the anchor genuinely resolves, at **both** viewport bands, under the post-change DOM — independently corroborating the user's manual STC-AC-3/AC-4 pass with an executable gate. The `[data-guide="sidebar-toggle"]` selector resolving is a precondition of `cy.get(SIDEBAR_TOGGLE)` succeeding at line 216 and of the popover appearing at all, which means **STC-R-4's single-anchor invariant is now proven at runtime**, not merely by the template-text parse the Jest specs are limited to.

#### Process note — how this was gated

This remediation was **not** an approved `tasks.md` task, so it did not run the normal Implementer → Reviewer loop. The edit was delegated to an Implementer (Leader writes no repo code), but the gate was the **executable suite** rather than a read-only Reviewer audit: for a selector repoint, a green browser run is strictly stronger evidence than an inspection, and the Leader could not hand the credential to a subagent. `author ≠ auditor` is preserved in substance — the author did not certify its own work; a machine did. Recorded here so the deviation is visible rather than implied.

#### ⚠️ Known residue (accepted by explicit user choice — do not "fix" silently)

1. **`design.md` §13 and `requirements.md` §8 still assert that no automated `driver.js` anchor-timing coverage exists in this codebase, and that building it would be "disproportionate to a Lite change." Both statements are false** — `sidebar-collapse.cy.ts` already provided that coverage before this spec began, and this run has now demonstrated it working. The user chose to leave them unamended. **Consequence:** the next spec touching this surface will read the same false premise that produced this defect, and may again fail to enumerate the Cypress suite as a consumer. This is the single highest-value follow-up out of this spec and is carried into the Kaizen entry.
2. **`sidebar-collapse.cy.ts` remains outside this spec's declared scope** while having been modified by it. The commit message should therefore mention it explicitly so the change is traceable, since no `tasks.md` entry accounts for it.
3. **The suite is dormant by default** (`describeWithToken` → `describe.skip` without a configured `userToken`, and Cypress is not in CI). It went green here only because a token was supplied for this run. It will silently skip again on any machine without one — which is precisely why the breakage went unnoticed in the first place.
4. **Node is v24.13.0**, but `docs/infrastructure.md` §6's pre-check requires **20.x**. Everything (build, Jest, lint, Cypress) passed regardless. Flagged, not acted on.

#### 🚦 Commit status

The Cypress fix is **uncommitted**, like everything else in this run. It should land in the **same commit/PR** as STC-T-1 and STC-T-2 — those two are already inseparable (STC-T-1 alone leaves two Jest suites red), and this fix repairs a suite that only STC-T-1 broke. Splitting any of the three produces a knowingly-broken intermediate commit.
