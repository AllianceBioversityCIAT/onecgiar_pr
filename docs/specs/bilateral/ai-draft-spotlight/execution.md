# Execution Log — Bilateral AI Draft Results: Spotlight the Run's Drafts

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-draft-spotlight/` |
| **Ticket** | P2-4029 |
| **Approval Mode** | gated |
| **Baseline** | `edcf190f0` |
| **Branch** | `qa-development-2026-mc-2` |
| **Leader model** | opus (T1) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (opus, T3) |
| **Budget** | 3 tasks · ≈ 530 LOC · 4 review rounds (tripwire: > 4 tasks, > 600 LOC, > 6 rounds) |
| **Persona drift** | `akili doctor --agents` 2026-10-27: no blocking drift |

---

## Task Execution History

### ADS-T-1 — Service: spotlight request, expiry, and the "navigate only if the URL changes" rule at both entry points

- **Final status:** PASS
- **Date:** 2026-10-27
- **Implementer attempts:** 1 (+1 continuation)
- **Skills / effort:** `angular-developer`, `tdd` (as listed in the task) · medium

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processes-drawer/ai-processes-drawer-host.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processes-drawer/ai-processes-drawer-host.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processes-drawer/CLAUDE.md` (continuation)
- **Implementer verification:**
  - `npx jest src/app/pages/bilateral --silent --reporters=summary --no-coverage` → 65 suites and 2620 tests passed.
  - `npx tsc -p tsconfig.app.json --noEmit` → exit 0.
  - `npx ng lint --quiet` → "All files pass linting."
- **First reds** (quoted from the Implementer's report). These were run against the baseline plus no-op stubs of the three new members, so each fails on an assertion, not on a missing member:
  - Test 1 (service): `> 425 | expect(router.navigate).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'drafts'], { queryParams: { job: 'job-1' } });`
  - Test 2 (service): `Expected number of calls: 0 / Received number of calls: 1` at `expect(router.navigate).not.toHaveBeenCalled();`
  - Test 5 (service): `Expected: "a" / Received: undefined` at `expect(service.draftSpotlightRequest()?.jobId).toBe('a');`
  - Test 6 (service): `Expected: not 0` at `expect(newNonce).not.toBe(oldNonce);`
  - Test 8 (host): `Expected: {... "jobId": "j9" ...}` at `expect(serviceStub.requestDraftSpotlight).toHaveBeenCalledWith(job);`
  - Test 9 (host): the same assertion.
  - Extra host test (navigation resolves `false`): `Expected: 7` at `expect(serviceStub.consumeDraftSpotlight).toHaveBeenCalledWith(7);`
  - Tests 3, 4 and 7 had no first red:
    - Test 3: the baseline always navigates; covered by F3.
    - Test 4: the request is null under the no-op stub.
    - Test 7: negative assertion.
- **Falsifiers** (each applied once against the post-change code, observed red, then reverted):
  - F1, drop `queryParams` → test 1 red at `:425`.
  - F2, always navigate → test 2 red at `:439`.
  - F3, `startsWith` → test 3 red at `:449`. The first try used the wrong direction and stayed green; it was redone.
  - F4, clear by job id → test 6 red at `:486`.
  - F5, `label: number` → `bilateral-ai.service.ts(163,7): error TS2322: Type 'string' is not assignable to type 'number'.` The Jest spec stayed 66/66 green.
- **Evidence re-run** (Leader-inline, non-author): **VERIFIED**
  - Targeted command → 4 suites and 98 tests passed.
  - Bilateral suite → 65 suites and 2620 tests passed.
  - `tsc` → exit 0.
  - Lint → clean.
- **Reviewer verdict:** **PASS**. Both entry points follow the design:
  - The request uses a nonce-matched consume and a 10 s expiry, and clears the previous request's timer.
  - The label rule is identical to the toast summary (`:163` vs `:477`).
  - The URL is compared exactly. A same-URL click keeps the request; a different-URL `false` consumes it.
  - No write call is added.
  - Only stubs changed, no existing expectations, so no Pivot was needed.
  - The Reviewer traced F2 and F4 through the fixtures.
- **runtime events:** none
- **continuations:** 1. The drawer-folder `CLAUDE.md` update and re-stamp. It is owed by the binding convention `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs" ("same commit") and was flagged by the Reviewer. It is a doc-only change describing the reviewed code.
- **spawns:**
  - Implementer: 16 calls, 103 608 tokens, ended complete.
  - Reviewer: 10 calls, 88 912 tokens, ended complete.
  - Implementer (continuation, resumed): 2 calls, 108 028 tokens cumulative, ended complete.

#### ADVISORY (4R, from the Reviewer; non-gating)

- **Spec wording:** the AC-1d "Implements" bullet says "the drawer closes, then the request is created", but the Description says "request a spotlight first". The code follows the Description. Both steps are synchronous, so the order is not observable. Fix the wording in `tasks.md` at archive.
- **Reliability:** `navigate(...).then(...)` has no rejection handler. If navigation throws, the request lingers until the 10 s expiry. This matches the baseline's own navigate calls.
- **Test scope:** test 7 checks write calls on the `bilateralApi` stub only, not the `ResultsApiService` stub.
- **Readability:** the URL rule is duplicated in both entry points. The Implementer's reason: the host spec stubs the service, so a shared helper would not be reachable there.

#### Not Done / Assumptions (verbatim from the Implementer)

- `requestDraftSpotlight` returns the nonce as a `number`. The host needs it to consume on a `false` navigation, and the host-spec stub returns 7. The task did not specify a return value.
- The URL rule is written inline in both `openDraftsForJob` and `onViewDrafts` rather than as a shared service helper. The host spec stubs the service, so a shared helper would not be reachable there.
- I added a third host test (navigation resolves `false`, so the nonce is consumed) beyond tests 8 and 9. In the service, an empty `centerAcronym` returns before requesting a spotlight, as it did before.
- A stray unquoted `$CMD` expansion failed once in my shell, with no effect on the code.

(These are assumptions only. No item is owed and no blocker is named.)

#### Summary

- **Requirements covered:**
  - ADS-R-1: AC-1a (navigation half and the same-URL path), AC-1b, AC-1c, AC-1d.
  - ADS-R-4: AC-4b.
  - ADS-R-8: service side.
- **Decisions made:**
  - The nonce is returned to callers so the host can consume it.
  - The drawer-folder `CLAUDE.md` was updated under the §10 convention.
- **Issues encountered:** none blocking.
- **Final verification:** green (Leader re-run VERIFIED).
- **Running totals vs budget:** tasks 1 / 3 · LOC ≈ 240 (229 code + ~11 doc) / 530 (tripwire 600) · review rounds 1 / 4 (tripwire 6). Within budget.

---

### ADS-T-2 — `DraftSpotlightService` and Draft Results integration

- **Final status:** PASS. Two parallel lens Reviewers both passed.
- **Date:** 2026-10-27
- **Implementer attempts:** 1
- **Skills / effort:** `angular-developer`, `tdd`, `tailwind-design-system` (as listed in the task) · **high**. The default is medium; it was raised because the task touches a shared effect, has signal traps (P-18), integrates a third-party library and adds an XSS guard.
- **Review mode:** parallel lens reviewers, because the task touches security (XSS). Lens A covered spec conformance and readability. Lens B covered reliability, resilience and risk, including security.

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/draft-spotlight.service.ts` (new)
  - `onecgiar-pr-client/src/app/pages/bilateral/services/draft-spotlight.service.spec.ts` (new)
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-tour.service.ts` and `.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.ts`, `.html` and `.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/CLAUDE.md`. It went from 119 to 109 lines and its `Verified:` line was re-stamped.
  - `onecgiar-pr-client/src/app/internationalization/bilateral-ai-processes.copy.ts`
- **Implementer verification:**
  - `npx jest src/app/pages/bilateral --silent --reporters=summary --no-coverage`: 66 suites and 2657 tests passed.
  - `npx tsc -p tsconfig.app.json --noEmit`: exit 0.
  - `npx ng lint --quiet`: "All files pass linting."
- **First reds** (quoted from the Implementer's report). They were taken against naive stubs, so each red is an assertion failure. For tests 1, 2 and 6 the first try hit a TypeError and was redone.
  - Test 1: `expect(instances[0].config).toEqual(expect.objectContaining({ animate: false, popoverClass: 'pr-guide', allowClose: true }))` fails; the received config holds none of these keys.
  - Test 2: `expect(instances[0].destroy).toHaveBeenCalledTimes(1)`, expected 1 and received 0.
  - Test 6: `expect(title).toContain('&lt;img')` received `"1 new draft from <img src=x onerror=alert(1)>"`.
  - Test 7: `expect(spotlight.show).toHaveBeenCalledTimes(1)`, expected 1 and received 0. The `scrollTo` counts were already green.
  - Tests 8, 9, 10 and 11: each fails at its final `expect(spotlight.show)…`, expected 1 and received 0. Test 10 gained a positive-control step so that it has a red.
  - Test 21: `expect(driverMock).not.toHaveBeenCalled()`, expected 0 and received 1.
- **Falsifiers.** Each was applied once and then reverted, and the tree was diffed against the green backup afterwards.

  | Mutation | Red |
  |---|---|
  | `showButtons` moved to the `driver()` config | test 1: `Expected: ["next"]`, `Received: undefined` |
  | Dismiss through `onDestroyed` | test 2: `expect(onDismiss).toHaveBeenCalledTimes(1)`, received 0 |
  | Re-arm by re-setting `pendingHighlightJobId` | test 8: `show` expected 1, received 0 |
  | The request effect also scrolls | test 9: `scrollTo` expected 2, received 4. The first try was inert and was redone through `afterNextRender` |
  | Re-arm before the URL lands | test 10: `highlightedSessionId` expected `3ce3462d-…`, received `aaaaaaaa-…` |
  | Drop the subscription reset | test 11: `show` expected 0 calls, received 1 |
  | `===` center gate | test 15: `show` expected 1, received 0 |
  | Focus moved on a programmatic close | test 18: `expect(document.activeElement).not.toBe(card())` fails |
  | Raw label | test 6: `Expected substring: "&lt;img"` |
  | `close('cancel')` | `tsc` TS2345: `"cancel"` not assignable to `DraftSpotlightCloseReason` |

- **Evidence re-run** (Leader-inline, non-author): **VERIFIED**.
  - Bilateral suite: 66 suites and 2657 tests passed.
  - `tsc`: exit 0.
  - Lint: clean.
  - The only lines removed from the existing component spec are 2 import lines, each replaced by a superset. No existing `?job=` or ADN expectation was edited.
- **Reviewer verdicts:**
  - **Lens A, PASS.**
    - The gate order and the "read every signal first" rule match §2.2.
    - Attach vs re-arm matches FC-1, FC-3 and FC-4.
    - The second-pass guard is at `component.ts:304`.
    - The center reset satisfies FX-2: a center switch passes through `null`, and that X→null step runs the reset.
    - The copy matches §6.3 exactly.
    - The test fixtures honour their disqualifiers: test 8 asserts `draftList` is the same reference, and every scroll count follows `settle()`.
    - The `CLAUDE.md` traps are listed.
  - **Lens B, PASS.**
    - The driver.js 1.8.0 premises P-9 and P-17 were re-verified in `dist/driver.js.mjs`.
    - XSS: the whole title and the button text are escaped, and the description is static copy.
    - `close()` nulls its state before `destroy()`, so it cannot re-enter, and `onDismiss` fires at most once.
    - One-shot: the request is consumed before `show`, and no path shows twice.
    - The tour guard cannot get stuck, because `isActive()` reads `isInitialized` and `resetState()` clears it.
    - No timer or listener leaks, no effect loops, and no write calls or logging.
  - **Leader follow-up on lens A's question** about a null `centerAcronym`: `BilateralContextService.centerAcronym = signal('')` is a `string`, never null, so `.toLowerCase()` is safe.
- **runtime events:** none
- **spawns:**
  - Implementer: 38 calls, 260 670 tokens, ended complete.
  - Reviewer lens A: 6 calls, 136 682 tokens, ended complete.
  - Reviewer lens B: 15 calls, 120 665 tokens, ended complete.

#### ADVISORY (4R, from both lenses; non-gating)

- **A, readability:** `layerOpen` uses `||` short-circuiting, so when `selectedDraft` is set the other layer signals are not read in that run. Behavior is correct, because Angular tracks dependencies per run. But it reads against the "read every signal first" comment.
- **A, readability, deliberate test deviation:** test 11 reuses a request held by an open layer instead of a *new* request. With a new nonce the re-arm path resets settled anyway, so the literal fixture would leave the falsifier inert. **Do not "fix" it back.**
- **A, readability:** test 18's "programmatic close does not move focus" half is weak because the stubbed `close` is a no-op. Service test 3 is the real proof.
- **A, readability:** the `CLAUDE.md` condensation dropped three small facts: the ring colour token `ring-[var(--pr-color-primary-300)]`, that `PrmsRouteReuseStrategy` special-cases only `result-detail/:id`, and that `queryParamMap` re-emits on both reuse and first load.
- **A, readability:** the `escapeHtml` comment says "label and count" while the code escapes the whole composed title. The two are equivalent.
- **B, risk:** §7's "no `img` element exists" is proven by the escaped string only. It is not proven by a jsdom `querySelector('img')` check.
- **B, reliability:** if `driver()` or `highlight()` throws after the request is consumed, nothing shows and `driver-active` may stay on `body`. A try/catch that calls `close('programmatic')` is suggested.
- **B, resilience:** R-6 is enforced only at show time. A programmatic `drawerOpen` set while the spotlight is active would not close it. **Carry this into the ADS-T-3 HITL observation.**
- **B, resilience:** one Esc press may also reach a page-level Esc handler. **Watch for this in the H-4 keyboard pass of ADS-T-3.**
- **B, readability:** `escapeHtml` is exported from the service file. It could move to `shared/` if it gets reused.

#### Not Done / Assumptions (verbatim from the Implementer)

1. **Escaping happens inside the service.** `show()` takes plain-text `title` and `buttonText` and escapes them. `description` is static trusted markup from the copy file (the `<strong>`) and is passed through. This keeps the `show` signature you gave while satisfying DD-7 and test 6. Dynamic values only ever enter the title.
2. **Tour detection.** The page checks `BilateralTourService.getDriverInstance()` and treats it as active when `isActive?.() ?? true`.
3. **Center-change reset and close.** These run in the existing ADN effect, only for transitions away from a non-null `centerInstitutionId` (same `previous != null` rule), so a cold `null`→X mount never resets mid-run.
4. **Card lookup.** `show` is skipped, without consuming the request, if the card is not in the DOM yet. The effect re-runs on the next change, or the 10 s timer drops the request.
5. **`CLAUDE.md` condensation.** I condensed the payload table into prose and shortened the scroll traps. The old "ring clears after 4 s" wording was already stale, since the code keeps the ring while `?job=` is in the URL, so I replaced it with the actual behavior.
6. **HITL.** The real driver.js rendering is not covered here, as the task states (ADS-T-3).

These are assumptions only. No item is owed and no blocker is named. Lens A checked assumptions 3 and 5, and lens B checked 1, 2 and 4.

#### Copy consumers

`grep -rln BILATERAL_AI_PROCESSES_COPY onecgiar-pr-client/src` returns:
- `internationalization/bilateral-ai-processes.copy.ts`
- `ai-processes-trigger.component.ts`
- `ai-job-card.component.ts`
- `ai-processes-drawer.component.ts`
- `bilateral-ai-upload.component.ts`
- `my-draft-results.component.ts`
- `my-draft-results.component.spec.ts`
- `my-draft-results/CLAUDE.md`

The change is additive under `drafts`.

#### Summary

- **Requirements covered** (unit parts):
  - ADS-R-1: AC-1a, AC-1b, AC-1c, AC-1d
  - ADS-R-2: AC-2a, AC-2b, AC-2c
  - ADS-R-3: AC-3a, AC-3b
  - ADS-R-4: AC-4a, AC-4b
  - ADS-R-5: AC-5a, AC-5b
  - ADS-R-6: AC-6a, AC-6b
  - ADS-R-7: AC-7b
  - ADS-R-8
  - NFR-2, NFR-3, NFR-4, NFR-5
- **Decisions made:**
  - Effort was raised to high (see above).
  - Parallel lens review was used.
  - **The budget tripwire tripped at this task's finalize.** The task diff is +963 / −56 lines. The spec is now at about 1 200 lines against the 600 tripwire; most of the overrun is tests (about 650 test lines vs about 200 planned) and production code is about 270 lines vs about 175 planned. **The user accepted the overrun on 2026-10-27 ("accept the overrun and continue").** This is logged as a user decision, not `auto-approved`.
- **Issues encountered:**
  - The first scroll falsifier was inert and was redone.
  - The first reds for tests 1, 2 and 6 were TypeErrors and were redone as assertion reds.
- **Final verification:** green (Leader re-run VERIFIED).
- **Running totals vs budget:**
  - Tasks: 2 of 3.
  - LOC: about 1 200 (240 + 963), against a budget of 530 and a tripwire of 600. **Exceeded and accepted by the user.**
  - Review rounds: 2 verdict rounds (3 Reviewer verdicts) of 4, with a tripwire of 6.

## Constitution Impact: ADS-T-2

- **Module reshaped:** `pages/bilateral/services` gains a new root service, `DraftSpotlightService`, a driver.js wrapper. Its public surface is `show`, `close`, `refresh`, `isActive` and `active`. `BilateralTourService.startBilateralTour` gains a guard.
- **Child guides:** `my-draft-results/CLAUDE.md` is updated in this commit. `pages/bilateral/services/` has no folder guide, and none is needed for one thin wrapper.
- **Parent `## Module Guides`:** no change.
- **CodeGraph:** re-index pending (`codegraph sync` at archive).

---

### ADS-T-3 — HITL: real-browser visual, keyboard and geometry check

- **Status:** `[~]` — evidence collected; **one requirement fails at 375 px and one spec gap was found**. Both await the user's decision.
- **Date:** 2026-10-27
- **Run by:** the Leader, at the user's request ("start the stack and drive the browser with Playwright"). No Implementer was spawned, because this task has no code diff.

**Built from:** the session transcript of 2026-10-27. Its sources are the raw JSON of the `playwright-cli run-code` scripts (`m1280.json`, `m375.json`, `h7-*.js` in the session scratchpad) and the pixel samples taken with Python/PIL.

#### Setup

- **Server:** the user's own NestJS on `:3400`, already running from this worktree (`GET /api` → 200). Not touched.
- **Client:** the Leader's own `ng serve --port 4500`. The user's `:4200` was left alone, following client `CLAUDE.md` §9 trap 2 ("never trust a dev server you did not start").
- **Bundle freshness:** confirmed. `'highlightRearmSeq' in ng.getComponent(app-my-draft-results)` returned `true` on every center.
- **Browser:** Chromium, headed, persistent profile, zoom 100 %. The viewport was set to exactly 1280 × 900 and 375 × 812 CSS px.
- **Login:** done by the user in the opened window. The Leader handled no credentials.
- **Data:**
  - CIP job `4e0beadc…` has 2 drafts (project `P-1502-CHI0-Educational Programs`).
  - IFPRI job `9effa644…` has 12 drafts and is the tall card.
  - SO job `358a155d…` came from the AI processes drawer.
- **Simulation (disclosed):** the "job just completed" poll event depends on the external AI service. It was replaced by calling the service's own `announceTerminalJob({ jobId, centerAcronym, projectName, status: 'COMPLETED', resultCount })`. That renders the **real** toast, and every step after it was real UI: the click on **Open drafts**, the navigation, and the spotlight.
  - The IFPRI toast label `"IFPRI 12-draft run"` is a test label.
- **Screenshots:** `docs/specs/bilateral/ai-draft-spotlight/hitl/*-{1280,375}.png`.

#### Visual-read correction (recorded for honesty)

- **Wrong early report:** the Leader first reported "the page is not dimmed" from viewing a screenshot. That was a misread.
- **Evidence:** pixel sampling shows the overlay is painted. The light header reads (245) undimmed and (86,85,88) under the spotlight, which is exactly 245 × 0.35, the 0.65 black overlay. The DOM agrees: `svg.driver-overlay`, fixed, `z-index` 10000, fill `rgb(0,0,0)`, opacity 0.65, and a cut-out path around the card.
- **From then on**, dimming was judged by pixel samples, not by eye.

#### Matrix results

| # | Check | 1280 px | 375 px | Evidence |
|---|---|---|---|---|
| H-1 | Toast **Open drafts** on Draft Results → dim, only J's card lit, title with N and label | **PASS**. Visible in 879 ms (NFR-1 ≈ 1 s). `lit = mdr-session-4e0beadc…`. Title "2 new drafts from P-1502-CHI0-Educational Programs" | **PASS**, 842 ms | `H-1-*.png` |
| H-2 | From the Overview tab → lands on Draft Results, then the spotlight | **PASS**. `/bilateral/CIP/overview` → `/bilateral/CIP/drafts?job=…`, 828 ms | **PASS**, 813 ms | `H-2-from-overview-*.png` |
| H-3 | Same URL again, and the drawer's "View N drafts" | **PASS**. A same-URL toast re-click re-spotlights (845 ms). Drawer "View 2 drafts" → `/bilateral/SO/drafts?job=358a155d…`, the drawer closed and the SO card is lit (this also exercises a center switch) | **PASS**, same results | `H-3-same-url-*.png`, `H-3-drawer-*.png` |
| H-4 | Got it visible and focused; Tab; Esc; then focus on the card | **PASS**. The only visible button is `Got it` (`×` and `Previous` are `display:none`) and it is focused on open. Tab goes Review → Create → Delete → Review (driver's trap through the lit card, as designed in §6.4). Esc closes it, `body` classes are cleared, and focus is on `mdr-session-4e0beadc…` | **PASS**, same results | `H-4-after-esc-*.png` |
| H-5 | Overlay click closes; no leftovers | **PASS**. Popover and overlay are gone, `body.className` is `""` (no `driver-active` / `driver-no-scroll`), and focus is on the card | **PASS** | `H-5-after-overlay-click-*.png` |
| H-6 | Tall card (12 drafts): header visible, popover on screen, no horizontal scroll | **PASS**. Card top at 116 px, under the app bar. Popover at 712–890, inside the viewport | **FAIL (AC-2c)**. driver.js scrolls the card with `block:'start'` (P-10), so the card top lands at y = 0, **under the app's fixed top bar**. The card header (job id, project, "12 drafts") is hidden, and only the table rows show. The popover is inside the viewport | `H-6-tall-*.png` |
| H-7 | Scroll while open → cut-out follows; resize → follows | **PASS**. The list container scrolled 1682 → 1832: card top 489 → 339, hole top 483 → 333 (delta 6 = `stagePadding` both times). Resize to 1240 × 840 → hole still at card top − 6 | **PASS**. At 375 the window scrolls, not the container: card 237 → 87, hole 231 → 81. Resize → it follows (147 / 141) | `H-7-*.png` |
| H-8 | Review inside the lit card → spotlight closes, panel opens | **PASS**. Overlay gone, `selectedDraft()` set, Draft Preview panel open with focus on a button inside it | **PASS** | `H-8-review-*.png` |
| H-9 | Reload with `?job=J` → ring only, no spotlight | **PASS**. No popover and no overlay, ring present | **PASS** for the spotlight half (none shown, ring present). *Observation:* at 375 the card stayed at y = 3378, so the existing `?job=` scroll did not bring it into view | `H-9-reload-*.png` |
| H-10 | A search filter hides J, then Open drafts → filters cleared, spotlight shows | **PASS**. Search `zzzz-no-match` hid the card (`hiddenBefore: true`). After the click the search box is `""` and the card is lit (857 ms) | **PASS** (854 ms) | `H-10-filters-cleared-*.png` |

**Watch items carried from the ADS-T-2 lens B review:**
- **Esc reaching an underlying layer:** not observed. Esc closed only the spotlight, and no other layer was open.
- **Drawer opened by code while the spotlight is active:** **two dimming layers stacked.** `window.__ai.openDrawer()` was called with the spotlight open; afterwards `pop: true` and `dialog: true`, and the screenshot shows the drawer's blur backdrop over the spotlight (`WATCH-drawer-while-active-*.png`). This breaks the AC-6a BUT ("two dimming layers MUST NOT be shown at the same time"). The design enforces the guard only when the spotlight starts (§6.4 "Clash guard"), so this is a **spec gap**, not a T-2 implementation defect.
  - A user can still reach this, because the toast host sits outside the overlay. For example, a "View" action on a failed-job or grouped toast calls `openDrawer()`. The page's own **AI processes** button is behind the overlay, so it cannot be clicked.

#### Findings for the user

| ID | Kind | Finding | Requirement |
|---|---|---|---|
| HITL-F1 | **Requirement fails** | At 375 px a tall card's header is hidden under the app's fixed top bar after driver's `block:'start'` scroll | ADS-AC-2c (at 375 px), ADS-R-7 |
| HITL-F2 | **Spec gap** | A programmatic drawer open (from a toast action) while the spotlight is active stacks two dimming layers | ADS-AC-6a BUT |
| HITL-F3 | Minor | The overlay colour is driver's default black. The tour uses `overlayColor: '#1e202f'`. §6.2 did not list `overlayColor`, so the code follows the design, but NFR-3 asks for "same overlay … as the bilateral guided tour" | ADS-NFR-3 |
| HITL-O1 | Pre-existing (not caused by the spotlight) | At 375 px the page has a horizontal scroll with **and without** the spotlight (`hscroll: true` after close and on a plain reload) | AC-7a ("no horizontal page scroll"). Unchanged by this spec |
| HITL-O2 | Pre-existing, `UNVERIFIED` against `edcf190f0` | At 375 px a `?job=` reload rings the card but does not scroll it into view | C-2 / AIQ-R-9 D, out of scope |

**Review intensity (Step 2.3), checked against the claim in `tasks.md`:**
- The `skip-eligible` claim was "no file changes outside `execution.md`". It is **not met as written**: the screenshots were added under `hitl/`. They are evidence files, not code.
- Under the HITL nature of the task, the human approval is the gate.

## Pivot Record: ADS-T-3

- **Date:** 2026-10-27
- **Trigger:** the ADS-T-3 HITL run (above). Implementation follows the approved design, but the design does not meet two approved requirements at runtime, and a third behaviour falls short of an NFR.
  - **HITL-F1, AC-2c at 375 px:** driver.js's `block:'start'` scroll (P-10, which the design relied on in §6.4 "Tall card") lands the card header under the app's fixed top bar.
  - **HITL-F2, the AC-6a BUT:** the §6.4 clash guard only gates the **start** of the spotlight, so a layer opened afterwards stacks over it.
  - **HITL-F3, NFR-3:** §6.2's driver config omits the tour's `overlayColor`.
- **User decision (AskUserQuestion, 2026-10-27):** fix all three through a spec amendment. All three recommended options were chosen.
- **Alternatives considered:**
  - Accept each as a known issue and close T-3. Rejected by the user.
  - For F1, scroll the card from the service before `highlight()`. Rejected: it would be a second scroller (DD-3).
- **Revised direction:**
  - `design.md` rev. 4: §6.2 `show` row (`overlayColor`), §6.4 "Tall card" and "Clash guard" rows, new **DD-10** (scroll-margin-top below the app's top chrome) and **DD-11** (close on a layer opening), §13 Open Gaps, and a §Budget note.
  - `tasks.md`:
    - New **ADS-T-4**.
    - ADS-T-3 now re-runs H-6 and the new W-1 after T-4.
    - The budget row and coverage map are updated.
    - The dependency graph gains a rev. 4 note.
  - `requirements.md`: unchanged. No requirement changes meaning; the amendment brings the design up to the approved ACs.
- **ADR impact:** none. No TRD decision is overturned.
- **Correction-closure sweep:**
  - **Forward:** grepped for `overlayOpacity`, `block: 'start'`, `Reverse:` and `3 tasks` across the spec folder.
    - `design.md` §6.2 and §6.4 were amended.
    - `tasks.md` ADS-T-2 lines 110 and 145 still carry the rev. 3 config and the "driver handles `block: 'start'`" note. They are left on purpose, because T-2 is a closed, executed task and its text records what was approved and built. T-4 supersedes both.
    - `requirements.md:271` ("the tour's existing `overlayOpacity`") stays true.
  - **Backward:** references to §6.4 and DD-8 were checked. DD-8's focus rule ("focus stays with the new layer") is reused by DD-11 unchanged.
- **Budget:** 4 tasks, which is the tripwire limit and not over it. The LOC overrun was already accepted by the user.
- **Status:** approved by the user on 2026-10-27 ("approve, run ADS-T-4"). ADS-T-4 execution started.

---

### ADS-T-4 — Pivot fixes from the HITL run (tall-card header margin, close on a layer opening, the tour's overlay colour)

- **Final status:** PASS
- **Date:** 2026-10-27
- **Implementer attempts:** 1
- **Skills / effort:** `angular-developer`, `tdd` · medium

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/draft-spotlight.service.ts` and `.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.ts` and `.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/CLAUDE.md` (111 lines, re-stamped)
- **Diff size:** +134 / −2.
- **Implementer verification:**
  - Bilateral Jest: 66 suites and 2671 tests passed.
  - `tsc`: exit 0.
  - Lint: clean.
- **First reds** (quoted from the Implementer's report):
  - T1: `Expected: "#1e202f"` / `Received: undefined`
  - T2: `Expected: "128px"` / `Received: ""`. This is asserted inside the `highlight` mock.
  - T3: `Expected: "128px"` / `Received: ""`
  - T4: `spotlight.close` expected 1 call and received 0 (the `selectedDraft` case)
- **Falsifiers.** Each was applied, observed red, then reverted:

  | Change | Red |
  |---|---|
  | Drop `overlayColor` | T4-1 |
  | Set the margin after `highlight()` | T4-2 |
  | Do not restore the margin on close | T4-3 and T4-3b (4 cases) |
  | Remove the DD-11 effect | test 21 "closes … once", for all 4 layers |
  | Drop the `isActive()` gate | test 21 "does not close when not active", for all 4 layers |

- **Top-chrome element (DD-10):** `.app-shell-header` (`app.component.html` L17, `appChromeFold="up"`). In `app.component.scss` L39–42 it is `position: sticky; top: 0; z-index: 30`. The Reviewer confirmed this at the source, which settles the DD-10 `UNVERIFIED` marker.
- **Evidence re-run** (Leader-inline, non-author): **VERIFIED**.
  - Jest: 66 suites and 2671 tests passed.
  - `tsc`: 0.
  - `ng lint`: exit 0.
  - No lines were removed from either spec file.
- **Reviewer verdict:** **PASS.** The diff conforms to `design.md` rev. 4 (§6.2, §6.4, DD-10 and DD-11, as amended on 2026-10-27).
  - The margin is set before `driver()` and `highlight()`.
  - The restore runs behind the `if (!instance) return` guard, so a second close is a no-op. A show-while-active restores the earlier card first.
  - The DD-11 effect reads all five signals first. It closes inside `untracked` and cannot loop.
  - It does not re-enter on the spotlight's own show path, because show requires every layer to be clear. A double close with `onReview`, `onPromoteClick` or `onDiscardClick` is a no-op.
  - `overlayColor` equals the tour's value.
  - No existing expectation was edited.
- **runtime events:** none.
- **spawns:**
  - Implementer: 16 calls, 96 881 tokens, ended complete.
  - Reviewer: 14 calls, 90 932 tokens, ended complete.

#### ADVISORY (4R, from the Reviewer; non-gating)

- **Reliability, fold state.** The margin is measured at show time while the header can fold away. The Reviewer asked for H-6 to be checked in both scroll directions. The Leader did so in the ADS-T-3 re-run below, and both pass.
- **Reliability, throw after the margin is set.** The margin is set before `driver()` is created. If `driver()` or `highlight()` throws, the margin stays on the card, because `close()` returns early when no instance exists. The risk is low.
- **Readability.** Test "21" sits before test "20" in the spec file.

#### Not Done / Assumptions (verbatim from the Implementer)

- The DD-11 effect reads all five signals first (the four layers plus `isActive()`) and calls `close('programmatic')` inside `untracked`. `// @akili-spec` tags are at the new code.
- The tall-card fix is unit-tested only. No browser run at 375 × 812 was done, so the HITL re-check is still the Leader's.
- No Pivot condition arose.

These are assumptions only, with no owed item. The browser re-check was done by the Leader under ADS-T-3, below.

#### Summary

- **Requirements covered:**
  - ADS-AC-2c (375 px)
  - ADS-AC-6a BUT (a layer that opens after the spotlight)
  - ADS-NFR-3
- **Decisions made:** none beyond design rev. 4.
- **Running totals vs budget:**
  - Tasks: 4 of 4. That is at the tripwire, not over it.
  - LOC: about 1 340, against a budget of 530 and a tripwire of 600. The overrun was accepted by the user.
  - Review rounds: 4 verdict rounds (5 Reviewer verdicts), against a budget of 4 and a tripwire of 6.

### ADS-T-3 — HITL re-run after ADS-T-4 (H-6 and W-1)

- **Date:** 2026-10-27
- **Run by:** the Leader, after the ADS-T-4 Reviewer PASS (the user asked for "re-run H-6 and W-1 when it passes").
- **Setup:** the same client on `:4500`. Its bundle was confirmed fresh: the component has `spotlight.show` and the page has `.app-shell-header`.
- **Built from:** the transcript output of `rerun-375.js` and `rerun-1280.js`.

| Check | 375 × 812 | 1280 × 900 |
|---|---|---|
| **H-6 down** (CIP → IFPRI 12-draft card) | **PASS.** Card top 181 px, below the app header's bottom edge at 173 px (inline margin `181px`). A hit-test at the card header returns the card's own header row. The popover is inside the viewport | **PASS.** Card top 225, header bottom 108 (margin `116px`). Header visible, popover in view |
| **H-6 up** (list scrolled past the card, card top at −2149, then requested again) | **PASS.** Card top 181, header visible, popover in view | **PASS.** Same geometry. The start position was 108, so this case is weaker at this width |
| Margin restored on close | `""` | `""` |
| **W-1** (drawer opened by code while the spotlight is active) | **PASS.** Spotlight closed first: `pop: false`, `overlay: false`, `body.className` `""`. Only the drawer is shown | **PASS**, same result |

- **Screenshots:** `hitl/H-6-rerun-{down,up}-{375,1280}.png` and `hitl/W-1-{375,1280}.png`.
- **Overlay colour (F3):** now `#1e202f`. It is asserted by T4-1. No pixel re-check was done, because the unit assertion covers the config value.
- **HITL-F1, F2 and F3 are closed.** HITL-O1 (horizontal scroll at 375 px) and HITL-O2 (`?job=` reload does not scroll at 375 px) are pre-existing, out of scope, and left for a separate ticket.
- **ADS-T-3 now awaits the user's approval at the HITL pause** (done criterion: "The user approves at the HITL pause").

## REVIEW_WAIVED: ADS-T-3

| Field | Content |
|---|---|
| `flag` | `inline` — the HITL evidence was produced by the Leader, which supervised the work. No independent conformance Reviewer was spawned for this no-code task |
| cause | The task is a human-in-the-loop check with no code diff. The `skip-eligible` claim ("no file changes outside `execution.md`") was **not** earned, because screenshots were added under `hitl/`, and that was reported at the gate. Override (c) also applies, since the walkthrough is derived evidence. A Reviewer was owed and was replaced by the two checks in the next row |
| approved by | The user, 2026-10-27: "approve ADS-T-3" (after the H-6 and W-1 re-run results were presented) |
| verification that stood in | 1) The user's HITL approval. 2) The independent `/akili-validate` T3 auditor (opus, fresh context, not the Leader) cross-checked the HITL evidence against the requirements and code. It judged the simulated poll adequate for AC-1a/1b and raised O1 as WARN-1 (`validation-report.md`). 3) The full client Jest suite was green: 677 suites and 14 584 tests, run by the Leader |
| models | Implementer: n/a (no code). Evidence produced by the Leader (opus). Auditor: the validation agent (opus, separate context) |

### ADS-T-3 — closure

- **Final status:** WAIVED (inline). Closed on the user's HITL approval.
- **Date:** 2026-10-27
- **Requirements covered (rendered parts):**
  - ADS-R-2, R-3, R-6 and R-7 (ADS-D5, D7)
  - P-13 and P-17
  - After the re-run: AC-2c at 375 px and the AC-6a BUT (W-1)
- **Open items carried to follow-up (not owed by this spec):**
  - HITL-O1: horizontal scroll at 375 px. It is pre-existing and maps to validation WARN-1, AC-7a.
  - HITL-O2: a `?job=` reload at 375 px does not scroll to the card. It is pre-existing and `UNVERIFIED` against the baseline.
