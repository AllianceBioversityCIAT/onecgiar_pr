# Execution Log — Result Sidebar Collapse (Compact Viewports)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/result-sidebar-collapse-mobile/` |
| Approval Mode | gated |
| Started | 2026-09-08 |
| Leader model | T1 (session default) |

## 2. Task Execution History

### `SBAR-T-1` — Add `compactBreakpoint` config and `isCompact` signal to `HlmSidebarService`

- **Status:** PASS
- **Date:** 2026-09-08
- **Attempts:** 1

**Attempt 1**

- Files changed: `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.token.ts`, `.../hlm-sidebar.service.ts`, `.../hlm-sidebar.service.spec.ts`.
- Implementer verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="hlm-sidebar.service.spec"` → 29 passed, exit 0. `npx ng lint --quiet` → clean.
- Reviewer verdict: **PASS**. Confirmed additive-only change (`mobileBreakpoint`/`isMobile`/`setOpen`/cookie contract untouched), `collapseForCompactEntry()` correctly bypasses `setOpen()`/cookie write (`SBAR-DD-2`), disqualifying cookie regression-pair test present and correctly paired, debounce behavior genuinely exercised (not presence-only), and independently verified no other call site constructs a full `HlmSidebarConfig` (so the new required field breaks no compilation elsewhere).

**ADVISORY (non-gating, recorded for awareness during `SBAR-T-2`):**
- Reliability: on viewport ≤768px, `isMobile` is also true and the drawer is driven by `_openMobile`, not `_open` — `collapseForCompactEntry()` (which only sets `_open`) is a visual no-op on phones. `SBAR-T-2`'s trigger gates only on `isCompact()` + `state()`, so this should be an explicit decision when wiring `SBAR-T-2`, not discovered later at the `SBAR-T-6` manual QA pass.
- Readability (tests): `fakeMatchMediaByQuery` test helper hardcodes the `1366px` default into its query-matching logic — a maintenance nit if the default ever changes, not a coverage hole (the `toHaveBeenCalledWith` assertion would catch drift first).
- Resilience: no explicit test pins `isCompact()` false on the `matchMedia`-unavailable/SSR-like path (shares the existing guard already exercised by `isMobile` tests) — low value, noted only so the gap isn't assumed covered.

**Requirements covered:** `SBAR-R-1`, `SBAR-R-2` (foundation), design `SBAR-DD-1`, `SBAR-DD-2`.

---

### `SBAR-T-2` — Trigger compact auto-collapse on result entry

- **Status:** PASS
- **Date:** 2026-09-08
- **Attempts:** 1

**Attempt 1**

- Files changed: `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.ts`, `.../result-detail.component.spec.ts`.
- Implementer verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="result-detail.component.spec"` → 30 passed, exit 0. `npx ng lint --quiet` → clean.
- Implementer judgment call: task text said "wire off that existing stream" implying an existing `.subscribe()` on route params — none existed (only a one-time `activatedRoute.snapshot.paramMap.get('id')` read). Implementer wired a new subscription directly on `ActivatedRoute.params` (the stream already available on the already-injected `ActivatedRoute`), read as satisfying `SBAR-DD-3`'s actual stream-vs-lifecycle-hook contrast (rejecting a one-time `ngOnInit`-only check, not requiring a literal pre-existing subscription).
- Reviewer verdict: **PASS**. Confirmed the interpretation matches `SBAR-DD-3`'s actual intent (verified no pre-existing subscription in the file). Independently traced `PrmsRouteReuseStrategy` (`shared/components/ai-assistant/prms-route-reuse.strategy.ts:17-19`) and confirmed it already destroys/recreates the component on genuine id change — `distinctUntilChanged` is therefore defense-in-depth rather than the sole gate, but is spec-mandated regardless and doesn't weaken any requirement outcome. Confirmed constructor placement is safe for `takeUntilDestroyed()` (injection context) and field-init ordering. All five DoD scenarios (including the disqualifying same-id-twice test and the actively-flipped resize-after-entry test) verified as genuinely behavioral, not presence-only.

**ADVISORY (non-gating):**
- Reliability: the in-code comment explaining why `distinctUntilChanged` is used doesn't mention that `PrmsRouteReuseStrategy` is the primary id-change boundary — a future maintainer could mistakenly believe removing the reuse strategy is safe because the operator "handles it." Worth a comment tweak opportunistically, not required.
- Reliability: the Jest mock replaces `ActivatedRoute.params` with a bare `Subject`, proving the operator chain but not that the real Angular router declines to re-emit on a section switch — that gap is already owned by `SBAR-AC-3` in `SBAR-T-6`'s Cypress suite; flagging so T-6 doesn't drop it on the assumption T-2 already covers it.

**Requirements covered:** `SBAR-R-1`, `SBAR-R-2`, `SBAR-R-3`, `SBAR-R-4`, design `SBAR-DD-3`.

**Decisions made:** Wired a new subscription on `ActivatedRoute.params` rather than appending to a nonexistent prior subscription (see judgment call above; Reviewer-confirmed conformant).

**Issues encountered:** None blocking.

**Final verification:** Reviewer-confirmed PASS; no rework needed.

**Decisions made:** None beyond the approved design — implementation matched `design.md` §6.2 exactly.

**Issues encountered:** None.

**Final verification:** Reviewer-confirmed PASS; no rework needed.

---

### `SBAR-T-4` — Add the independent result-sidebar discoverability hint to `ReportingGuideService`

- **Status:** PASS
- **Date:** 2026-09-08
- **Attempts:** 1

**Attempt 1**

- Files changed: `.../services/reporting-guide.service.ts`, `.../services/reporting-guide.service.spec.ts`.
- Implementer verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="reporting-guide.service.spec"` → 68 passed, exit 0. `npx ng lint --quiet` → clean.
- Implementer judgment call: authored the hint copy as plain structural English directly in-service (not a `TermKey`), on the claim that no existing SP-tour copy in this service routes through `TermKey`/`term` either.
- Reviewer verdict: **PASS**. Independently read the *whole* service file (not just the diff) and confirmed the i18n claim is factually true — the file imports only `@angular/core` and `driver.js`, no `TerminologyService`/`TermKey` anywhere, and all existing SP-tour/tutorial copy is hardcoded English. Confirmed this is exactly the escape hatch `design.md` §6.3 and the task's own DoD explicitly permit ("or, if it does not differ P22/P25, plain structural copy... or justified as structural copy"), and the hint copy contains no P22/P25-divergent vocabulary. All other DoD items (distinct storage key with a genuine behavioral collision-guard test, single `DriveStep` on `[data-guide="sidebar-toggle"]`, `catalogue`/`TutorialId` regression-locked) independently verified.

**ADVISORY (non-gating):**
- Reliability: `startResultSidebarHint()`'s leading `this.instance?.destroy()` can tear down a different live tour and fire *that* tour's `onDestroyed` — e.g. destroying a running SP tour would mark `SP_TOUR_STORAGE_KEY` "seen" for a user who never finished it. Inherited from the pre-existing `startSpTour()` pattern, not introduced by this diff; low practical risk (different screens) but worth a shared "which flow owns `this.instance`" guard if a third hint is ever added.
- Reliability: calling `startResultSidebarHint()` twice marks the hint completed after the first call's `onDestroyed` fires during the second call's leading `destroy()`. Harmless for `SBAR-R-11`'s one-time goal; worth being aware of when `SBAR-T-5` wires the trigger (don't call it more than once per intended showing).
- Readability: `nextBtnText`/`prevBtnText` are dead config on a single-step tour (copied wholesale from `startSpTour()`).
- Risk: `overlayColor: '#1e202f'` is a third hardcoded-hex copy of the same value in one file — consistent with `design.md`'s sanctioned reuse of SP-tour styling, but a future token change would need three edits.

**Requirements covered:** `SBAR-R-10`, `SBAR-R-11`, design `SBAR-DD-4`.

**Decisions made:** Hint copy authored as justified structural copy, not a new `TermKey` (see judgment call above; Reviewer-confirmed conformant).

**Issues encountered:** None blocking.

**Final verification:** Reviewer-confirmed PASS; no rework needed.

---

### `SBAR-T-5` — Wire the hint trigger into result-detail entry (+ approved scope addition)

- **Status:** PASS
- **Date:** 2026-09-08
- **Attempts:** 1

**Attempt 1**

- Files changed: `result-detail.component.ts`, `result-detail.component.spec.ts`, PLUS (approved scope addition, see below) `shell-topbar.component.html`, `shell-topbar.component.spec.ts`.
- **Approved scope addition:** `SBAR-T-3`'s Reviewer flagged that the hint's only anchor (`[data-guide="sidebar-toggle"]` in `reporting-nav-sidebar.component.html`) only exists in the DOM when the sidebar is collapsed, but `SBAR-T-5` requires the hint to fire ungated by `isCompact()` — a real gap for the common expanded/desktop case. User was asked (`AskUserQuestion`) and chose: add the same `data-guide="sidebar-toggle"` attribute to the always-visible toggle button in `shell-topbar.component.html`. Authorized before execution, not applied unilaterally.
- Implementer verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="result-detail.component.spec"` → 33 passed, exit 0. `npx jest ... --testPathPattern="shell-topbar.component.spec"` → 23 passed, exit 0. `npx ng lint --quiet` → clean.
- Reviewer verdict: **PASS**. All three DoD scenarios confirmed genuinely disqualifying (the `isCompact()`-false test asserts both non-collapse AND hint-fired in one test, proving the branches are decoupled, not just both present). Independently re-verified the scope addition's safety claim by reading `app.component.html` (nav-sidebar renders before shell-topbar) and both toggle templates directly — confirmed the two anchors never mis-resolve: collapsed state has both present with `document.querySelector` correctly resolving the visually-correct nav-sidebar button first; expanded state has only the topbar button. Confirmed only `startResultSidebarHint()` consumes the selector anywhere in the app (exactly 2 markup occurrences, no hijack risk).

**ADVISORY (non-gating):**
- **Reliability (real finding, not speculative):** the Implementer's claim that `driver.js` "silently no-ops" when neither anchor exists is **factually wrong** — Reviewer verified in `node_modules/driver.js/dist/driver.js.mjs` that it substitutes a `driver-dummy-element`, rendering the step as a centered, unanchored modal. Since `startResultSidebarHint()`'s `onDestroyed` unconditionally marks the completion flag, dismissing that anchorless popover would permanently burn the one-time hint (`SBAR-R-11`). Probability is low — the only gate that hides both anchors simultaneously is `focusMode()`/`show_qa_full_screen`, and `focusMode()` is essentially never true on `result-detail` entry (only set by `guided-creation.component.ts`, cleared well before). Suggested (not required) hardening: guard `startResultSidebarHint()`'s call site with a `document.querySelector('[data-guide="sidebar-toggle"]')` presence check.
- Reliability: no proof the anchor is in the DOM at the instant `drive()` runs (fires synchronously from the constructor) — recommend `SBAR-T-6`'s manual QA explicitly include a hard-reload / deep-link-straight-into-a-result pass, not just in-app navigation.
- Readability: `watchCompactEntry()` now owns two unrelated triggers (auto-collapse + hint) behind a name describing only the first — permitted by the task text ("same subscription... or a sibling"), a rename to `watchResultEntry()` would help the next reader.

**Requirements covered:** `SBAR-R-10`, `SBAR-R-11`; preserves `SBAR-R-1..R-4` unchanged.

**Decisions made:** Added `data-guide="sidebar-toggle"` to `shell-topbar.component.html` (user-approved scope addition, recorded above) to fix the anchor-visibility gap for expanded-sidebar entries.

**Issues encountered:** Anchor-visibility gap discovered during `SBAR-T-3` review, resolved here per user decision.

**Final verification:** Reviewer-confirmed PASS; no rework needed. One low-probability reliability gap (anchorless-popover flag-burn) recorded as advisory, not blocking.

---

### `SBAR-T-6` — Cypress E2E coverage + manual QA pass

- **Status:** in progress (rework attempt 2 running)
- **Attempts so far:** 1 FAIL, attempt 2 in flight

**Attempt 1**

- Files changed: `onecgiar-pr-client/cypress/e2e/result-detail/sidebar-collapse.cy.ts` (new).
- Implementer wrote the spec but could not execute it in its own environment (no `cypress.env.js`/`userToken` configured) — reported all 5 scenarios as "Pending", correctly flagged as inconclusive rather than fabricating a pass. Manual QA (hint popover placement/legibility) also correctly flagged as not performed (human-only step).
- **User provided a JWT token on request** (`AskUserQuestion` → "I'll provide a token now"). Leader configured a local, gitignored `onecgiar-pr-client/cypress.env.js` (token passed via `PRMS_CYPRESS_USER_TOKEN` env var, never written to a tracked file, never echoed in any output/log) and ran the suite directly against the real backend.
- **Actual execution result (2 runs):** `SBAR-AC-1` and `SBAR-AC-2` PASS; `SBAR-AC-3`, `SBAR-AC-4`, `SBAR-AC-5` FAIL identically both times — `cy.wait('@generalInformationSection')` times out after 90s, "No request ever occurred."
- **Root cause (Leader-diagnosed by reading `cypress/support/commands.ts` + `cypress/support/result-detail.ts`):** the spec's local `visitResult(href)` helper calls plain `cy.visit(href)` instead of `cy.loginByToken(href)`. Every other helper/spec in this codebase navigates via `cy.loginByToken()`, which wraps a `cy.session(...)` call that re-seeds `localStorage['token']`/`['user']` — required because Cypress's default test isolation wipes storage before every test, and a cached session is only restored when `cy.session`/`loginByToken` is explicitly re-invoked in that test. `SBAR-AC-1` passed only because it ran immediately after the `before()` hook's own `loginByToken` call (no isolation reset in between); `SBAR-AC-2` passed because it calls `visitResultsList()` (→ `loginByToken`) as its own first action; `SBAR-AC-3/4/5` call `visitResult()` directly as their first action with no re-login, so they hit `CheckLoginGuard`'s redirect to `/login` unauthenticated and the intercepted request never fires.
- **Verdict: FAIL** (via direct execution, not a separate Reviewer pass — the defect is a concrete, reproduced-twice failure, not a judgment call). Not treated as a Reviewer FAIL because the defect was found by literally running the suite; escalating straight to a rework attempt is equivalent under the loop's guardrails (structured feedback passed forward unchanged).
- Effort bumped medium → high for attempt 2 per the standing rule (a failed fix is usually under-thinking).

**Attempt 2**

- Fix: `visitResult()` changed from plain `cy.visit(href)` to `cy.loginByToken(href)`, matching every other navigation helper in the codebase.
- Implementer's own environment couldn't reach the token (env var doesn't propagate to a fresh subagent shell) — correctly reported "inconclusive," did not fabricate a pass.
- **Leader ran verification directly** (own shell, token available): `SBAR-AC-1`, `SBAR-AC-2`, `SBAR-AC-4`, `SBAR-AC-5` PASS. `SBAR-AC-3` FAILS — different error than attempt 1: `cy.contains('.panel_menu .sections a', 'Contributors & partners')` times out, element never found.
- **Verdict: FAIL** (1/5 scenarios). Auth bug fixed; new bug surfaced (masked by the auth bug in attempt 1).

**Attempt 3**

- Root cause hypothesis (Leader): `resultUrlA` (picked with no portfolio filtering) resolved to a P22 result; `rd-contributors-and-partners`/"Contributors & partners" is P25-only per `src/CLAUDE.md` §3.3 — P22 shows "Partners" instead.
- Fix: switched `SBAR-AC-3`'s section-switch target to "Geographic location" (verified against source: no `portfolioAcronym` restriction in `routing-data.ts`, confirmed link text, confirmed root component selector `app-rd-geographic-location`, confirmed both P22/P25 API endpoint variants share the `get/geographic/<id>` path segment so one intercept glob covers both).
- Implementer's shell again couldn't reach the token — correctly reported inconclusive.
- **Leader ran verification directly**: `SBAR-AC-1`, `SBAR-AC-2`, `SBAR-AC-4`, `SBAR-AC-5` PASS (again). `SBAR-AC-3` **still FAILS** — `cy.contains('.panel_menu .sections a', 'Geographic location')` times out, element never found. Screenshot inspection shows "Geographic location" **is** visibly present and rendered in the panel-menu at the moment of the failure screenshot, AND "Contributors & partne..." is *also* present in the same list — contradicting the attempt-2 P22/P25-exclusivity hypothesis for this specific result. The screenshot also shows the `SBAR-T-5` discoverability hint's popover ("Collapse the sidebar for more space") still open/on-screen at failure time — plausible because Cypress's default test isolation wipes localStorage before every `it()`, so the hint's completion flag is absent again in this fresh test and it fires again on `visitResult(resultUrlA)`, and the test's manual-toggle-click (line 128) and section-switch click never explicitly dismiss it first.
- **Verdict: FAIL** (1/5 scenarios, same scenario as attempt 2, different/inconclusive root cause). **This is the 3rd consecutive attempt with `SBAR-AC-3` failing — the loop's 3-attempt ceiling is reached.**

## Resolution: `SBAR-T-6` (HALT lifted)

**Attempt 4 (user-approved, beyond the 3-attempt ceiling):**

- User explicit approval: "Si es algo que pueda hacer yo para probar dime y lo hago yo, sino vuelve a intentar usa la opción 1" (nothing for the user to do; proceed with one more automated attempt).
- Implementer added a `dismissSidebarHint()` helper (mirroring `SBAR-AC-5`'s existing `.driver-popover-close-btn` pattern) and called it in `SBAR-AC-3`/`SBAR-AC-4` before the manual-toggle/section-switch steps. Confirmed via source trace that the hint genuinely fires on every entry (ungated by `isCompact()`, flag cleared by test isolation each `it()`), so the fix was well-founded — but re-verification hit an unrelated environment outage (see below) before it could be judged.
- **Leader verification blocked by infrastructure, not the fix:** the local backend (`onecgiar-pr-server`, port 3400) was found unresponsive (hung process, `CLOSE_WAIT` connections, likely a casualty of the earlier low-memory event noted mid-session). User approved restarting it; Leader killed the stale process (PID 38384, confirmed as this project's own `dist/src/main.js`, not another session's live work) and started a fresh instance, confirmed healthy via `curl`.
- Re-ran: **4/5 passing** (`SBAR-AC-1`, `SBAR-AC-2`, `SBAR-AC-4`, `SBAR-AC-5`). `SBAR-AC-3` **still failed** — same symptom as attempts 2-3 (`cy.contains('.panel_menu .sections a', 'Geographic location')` never finds the element), even though the hint-dismissal fix was correctly applied. This ruled out the hint-interference hypothesis as the (sole) cause.

**Attempt 5 (final) — actual root cause found and fixed:**

- Leader read `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/CLAUDE.md`, which states outright: `…/result-detail/panel-menu/` is **legacy dead code** — "declarada en `result-detail.module.ts` pero sin template que la use. Es la referencia de comportamiento, no código vivo." The Cypress spec had been targeting `.panel_menu .sections a` through all 4 prior attempts — a selector that **structurally cannot match anything**, because that template is never rendered. The live component (`result-sections-sidebar.component.html`) uses a completely different structure: `<aside data-testid="result-sections-sidebar"><nav aria-label="Result sections"><a>...</a></nav></aside>`, no `.panel_menu`/`.sections` classes anywhere.
- This single finding explains the entire failure history: attempts 2-4 were all legitimate fixes to *real, separate* bugs (auth navigation, portfolio-specific section text, hint interference) that got surfaced and fixed in sequence, but the test could never pass regardless, because its core selector was dead from the start.
- Fix: `.panel_menu .sections a` → `[data-testid="result-sections-sidebar"] nav a` (verified against source, both selector and rendered link text). Confirmed via grep: zero remaining `panel_menu`/`.sections a` references anywhere in the spec file.
- **Leader ran final verification 3 times in a row** (fresh backend, real token): **5/5 passing, all 3 runs, ~1m13s-1m28s each.** Stable, not flaky.

**Final status: PASS.** `SBAR-T-6`'s automated DoD (`SBAR-AC-1..AC-5`) is fully satisfied and verified against the real backend, three consecutive green runs. The `## HALT` block above is superseded by this resolution — task is complete except for the one item that was never in the Implementer's power to do:

**Outstanding (by design, not a gap in this task):** the manual QA check (hint popover placement/legibility at 1350px and 1600px, in a real browser) remains genuinely human-only per `requirements.md` §9 and `design.md` §10 — no automated check can substitute for it. Recorded as the one remaining checkbox in `tasks.md`.

**Local artifact:** `onecgiar-pr-client/cypress.env.js` (gitignored, holds the user-provided token) is still present in the working tree for convenience of a future run — not committed, not logged.

---

## (Superseded) Original HALT block — kept for audit trail

## HALT: `SBAR-T-6`

- **Reviewer/loop status:** not sent to a Reviewer sub-agent — all three attempts' verdicts were determined by the Leader directly executing the suite against the real backend (the task is environment-dependent per `docs/infrastructure.md` §6, and no Reviewer pass adds value over an actual failing/passing test run).
- **What's solid:** `SBAR-AC-1`, `SBAR-AC-2`, `SBAR-AC-4`, `SBAR-AC-5` — all 4 have now passed twice in a row, unchanged across attempts 2 and 3. The auth-navigation bug (attempt 1→2) is confirmed fixed.
- **What's stuck:** `SBAR-AC-3` alone, across two different "fix" attempts that each targeted a plausible-but-wrong root cause. The screenshot evidence from attempt 3's failure contradicts attempt 2's own diagnosis (both "Contributors & partners" AND "Geographic location" are visible in the same panel-menu for `resultUrlA`), so portfolio-based section availability was never the real cause.
- **Leader's hypothesis (untested — not yet spent a 4th automated attempt against the 3-attempt ceiling):** the `SBAR-T-5` discoverability hint fires on every fresh `it()` (test isolation clears its completion flag between tests), and `SBAR-AC-3`'s flow — manual toggle click at line 128, immediately followed by a panel-menu section-switch click — never dismisses that hint popover first. The failure is plausibly a hint/overlay interaction (timing, an intercepted click, or a transient DOM state during the tour's open/close animation) rather than the panel-menu genuinely lacking the link.
- **Not done:** manual QA (hint popover placement/legibility at 1350px/1600px, human-only) remains entirely outstanding regardless of this Cypress issue.
- **Automatic rollback:** intentionally **NOT** performed. The protocol's default (`git restore . && git clean -fd`) would discard all of `SBAR-T-1..T-5`'s already-PASSed, uncommitted work sitting in the same working tree — that is a repo-wide destructive action far outside this one task's blast radius, and it contradicts this session's standing git-safety rules. Nothing has been reverted; `sidebar-collapse.cy.ts` is left at attempt 3's state (4/5 passing).
- **Local-only artifact left in the working tree:** `onecgiar-pr-client/cypress.env.js` (gitignored, contains the token you provided) — left in place for a possible next run; tell me to delete it if you'd rather it not persist on disk.

---

### `SBAR-T-3` — Add `data-guide` hook to the sidebar toggle button

- **Status:** PASS
- **Date:** 2026-09-08
- **Attempts:** 1

**Attempt 1**

- Files changed: `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.html`, `.../reporting-nav-sidebar.component.spec.ts`.
- Implementer verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="reporting-nav-sidebar.component.spec"` → 70 passed, exit 0. `npx ng lint --quiet` → clean.
- Implementer note: test is a parsed-markup (`DOMParser` over the on-disk `.html`) check, not a `TestBed`-rendered one, because every existing test in this spec file overrides the template to `''` to dodge a pre-existing, unrelated `NG0311`/`BrnTooltip` Jest/Spartan version-resolution error — documented in the diff, out of this task's scope to fix.
- Reviewer verdict: **PASS**. Confirmed the attribute lands on exactly the button `design.md`/`tasks.md` name, is unique across the whole client (grepped against the 20+ existing `data-guide` anchors in `reporting-guide.service.ts`), and that the DoD's own required comment-level caveat (DOM presence ≠ tour-quality coverage) is present. Independently confirmed the `.overrideComponent(..., { set: { template: '' } })` line predates this diff, so "existing tests still pass" is not a laundered claim.

**ADVISORY (non-gating):**
- Reliability: the new check parses the `.html` as plain markup, so Angular's `@if (isCollapsed())` wrapper is invisible to it — it cannot fail if the hook is later moved into a never-rendered branch. `SBAR-AC-5` (Cypress, `SBAR-T-6`) is the real regression net and should query the live DOM.
- **RISK — carry forward into `SBAR-T-4`/`SBAR-T-5` briefs, not a T-3 defect:** the anchored button (`reporting-nav-sidebar.component.html:58-67`) is wrapped in `@if (isCollapsed())` — absent from the DOM whenever the sidebar is expanded. `SBAR-T-5`'s DoD requires the hint to fire **ungated by `isCompact()`**, so at a wide/expanded viewport `startResultSidebarHint()` will target a selector matching nothing and `driver.js` will have no element to attach to. `shell-topbar.component.html`'s always-visible toggle button (`(click)="toggleSidebar()"`, same `HlmSidebarService`) is the anchor that would survive both states. The Implementer correctly followed the spec's explicit file+line pointer (`design.md` named this exact button) — this is a design-level question for whoever executes/reviews `SBAR-T-4`/`SBAR-T-5`, not a rework trigger here.

**Requirements covered:** `SBAR-R-10` (enabling attribute only), design `SBAR-DD-4`.

**Decisions made:** None beyond the approved design — implementation matched `design.md` exactly, including its choice of anchor button.

**Issues encountered:** Pre-existing Jest/Spartan `NG0311` incompatibility blocks `TestBed`-rendering the real template in this spec file (unrelated to this task); worked around with a parsed-markup assertion, documented in-file.

**Final verification:** Reviewer-confirmed PASS; no rework needed.
