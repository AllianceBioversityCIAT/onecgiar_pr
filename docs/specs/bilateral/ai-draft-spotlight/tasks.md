# Tasks — Bilateral AI Draft Results: Spotlight the Run's Drafts

## 1. Scope of this task list

| Field | Value |
|---|---|
| **Module / feature** | `bilateral` / `ai-draft-spotlight` |
| **Linked spec** | `requirements.md` + `design.md` (rev. 3, `JUDGMENT: APPROVED ✅` in `judgment.md`) |
| **Ticket** | P2-4029 |
| **Owner / driver** | Maria Camila Giraldo |
| **Status** | approved (gated, 2026-10-27); not started |
| **Budget (from design)** | 3 tasks · ≈ 530 LOC (≈ 220 production plus ≈ 310 tests) · 4 review rounds. The tripwire trips at more than 4 tasks, 600 LOC or 6 rounds |
| **PR strategy** | One PR, client-only, to `staging`. 530 LOC is above the ~400 guideline, but ~60 % is tests, and the three tasks are one behavior that only makes sense together. Splitting T-1 alone would ship `?job=` on the toast with no spotlight |

## 2. Pre-flight checklist

- [x] `requirements.md` approved (gated, 2026-10-27)
- [x] `design.md` approved after Judgment Day (round 3, both judges APPROVE)
- [x] Premise Ledger 18/18 verified, 0 `UNVERIFIED`
- [x] No server, migration or CLARISA dependency
- [x] In-flight overlap. I ran `grep -rln "my-draft-results\|ai-processes-drawer-host\|bilateral-tour.service\|onecgiar-pr-client.*bilateral-ai.service" docs/specs --include=tasks.md`, excluding `archive/` and this spec. It returned `bilateral/ai-queue-report-manually` and `bilateral/ai-processing-queue`. Both have an `execution.md` with a summary, and their code (`?job=` highlight, toasts, drawer) is already in the baseline `edcf190f0`. There is no concurrent edit.
- [x] The working tree is clean apart from this spec folder (`git status --short` → `?? docs/specs/bilateral/ai-draft-spotlight/`).

**Harness traps (carried from `ADN`, apply to every task):**
- `BilateralAiService` effects run lazily under fake timers. Flush with `TestBed.tick()` before any count assertion.
- The existing Router stubs are partial. The service spec has `{ navigate, url }` (`bilateral-ai.service.spec.ts:93`), and the drawer-host spec has `{ navigate }` only (`ai-processes-drawer-host.component.spec.ts:56`). Adding `createUrlTree` and `serializeUrl` to a stub is a **setup** change and is allowed. Changing an existing **expectation** is a Pivot: stop and report it.

---

## 3. Task list

### `ADS-T-1` — Service: spotlight request, expiry, and the "navigate only if the URL changes" rule at both entry points

- **Status:** [x] done (2026-10-27, Reviewer PASS — see `execution.md`)
- **Type:** client
- **Size:** S–M (≈ 45 production LOC, ≈ 110 test LOC)
- **Description:**
  - In `BilateralAiService`:
    - Add `draftSpotlightRequest` (a signal of `{ jobId, centerAcronym, label, nonce } | null`).
    - Add `requestDraftSpotlight(job)`. It sets a fresh nonce, replaces any pending request, clears that request's timer, and starts a 10 s `setTimeout` that calls `consumeDraftSpotlight(nonce)`.
    - Add `consumeDraftSpotlight(nonce)`. It clears the request and its timer only on a nonce match.
  - Change `openDraftsForJob`:
    1. Keep `loadAllDrafts()`.
    2. Request a spotlight, using the same label rule as the toast summary (`projectName || programCode || jobId`).
    3. Compute the target with `router.serializeUrl(router.createUrlTree(['/bilateral', acronym, 'drafts'], { queryParams: { job } }))`.
    4. Navigate only if the target differs from `router.url`.
    5. If the navigation resolves `false`, consume the nonce.
  - In `AiProcessesDrawerHostComponent.onViewDrafts`, request a spotlight first, then apply the same URL rule. Keep the existing `loadAllDrafts()` and `drawerOpen.set(false)`.
- **Implements:**
  - ADS-R-1:
    - AC-1a: the navigation half ("lands on the job"), and the BUT "no reload or second click" for the same-URL path.
    - AC-1b: the navigation from another page.
    - AC-1c: the AND IT MUST "not ignored because the URL names J". The request is created and kept even when no navigation happens.
    - AC-1d: the drawer closes, then the request is created.
  - ADS-R-4: AC-4b ("request dropped", "MUST NOT fire later"), through the 10 s timer and the different-URL `false` consume.
  - ADS-R-8, service side: no write method is called.
- **Design refs:** §2.2 (first block), §6.2 rows `requestDraftSpotlight`, `consumeDraftSpotlight`, `openDraftsForJob / onViewDrafts`; DD-1, DD-2, DD-6; P-1, P-2, P-12, P-16
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts` (+ `.spec.ts`)
  - `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processes-drawer/ai-processes-drawer-host.component.ts` (+ `.spec.ts`)
- **Depends on:** —
- **Blocks:** `ADS-T-2`
- **Review:** `checklist`. It is a small service delta with a clear contract. The URL rule is the only logic, and it is pinned by tests 2–4.
- **Skills:** `angular-developer`, `tdd`
- **Tests:**
  - Service spec, new `describe('draft spotlight request (ADS)')`:
    1. Toast `action.run()` with `router.url` = `/bilateral/ALLIANCE/create` → `navigate(['/bilateral','ALLIANCE','drafts'], { queryParams: { job: 'job-1' } })`, and the request holds `job-1` with label `Alpha`.
    2. `router.url` already equal to the serialized target (the stub's `navigate` resolves `false` for that URL) → `navigate` **not** called, and the request is kept.
    3. Current URL `/bilateral/ALLIANCE/drafts?job=job-1&project=7` → it navigates (the URL differs).
    4. `navigate` resolves `false` for a different URL → the request is cleared.
    5. The 10 s timer elapses (fake timers) → the request is cleared. A newer request made at 9 s survives the old timer.
    6. `consumeDraftSpotlight(oldNonce)` leaves a newer request intact.
    7. No `POST_*`, `PATCH_*`, `PUT_*` or `DELETE_*` call on any path.
  - Drawer-host spec:
    8. `onViewDrafts` requests a spotlight for `j9`, closes the drawer, and navigates as today (the existing expectation at `:164` is unchanged; only the stub gains `createUrlTree`, `serializeUrl` and `url`).
    9. Same URL → no `navigate`, and the request is kept.
- **Verification:**
  - **Command:** `cd onecgiar-pr-client && npx jest src/app/pages/bilateral/services/bilateral-ai.service.spec.ts src/app/pages/bilateral/components/ai-processes-drawer --silent --reporters=summary --no-coverage`, then `npx tsc -p tsconfig.app.json --noEmit`
  - **Falsifier:**
    - Remove `queryParams` from `openDraftsForJob` → test 1 goes red. The diverging fixture is `router.url` = `/bilateral/ALLIANCE/create`.
    - Drop the URL comparison, so it always navigates and consumes on any `false`. Test 2 then goes red on both assertions. Test 2's stub makes `navigate` resolve `false` when called with the current URL, mirroring `NavigationSkipped` (P-12), so the mutated code calls `navigate` and clears the request.
    - Compare with `startsWith` or ignore query params → test 3 goes red.
    - Clear by job id instead of nonce → test 6 goes red.
    - Type `label` as `number` → `tsc` goes red while Jest (isolated modules) stays green.
  - **Red run:**
    - Test 1, observed at baseline `edcf190f0` on 2026-10-27 with a temporary probe spec (since deleted):
      - Expected: `["/bilateral", Any<String>, "drafts"], {"queryParams": {"job": "job-1"}}`
      - Received: `["/bilateral", "ALLIANCE", "drafts"]`
      - Number of calls: 1
    - Tests 2–9 target `draftSpotlightRequest`, `requestDraftSpotlight` and `consumeDraftSpotlight`, which do not exist yet: `predicted — greenfield artifact (observed in ADS-T-1)`. Quote their first red verbatim in `execution.md`.
  - **Disqualifier:**
    - A timer assertion taken without advancing fake timers past 10 000 ms is not evidence.
    - If any existing service or drawer-host expectation must change (not just its stub), stop and report it as a Pivot.
  - **Consumers:** `bilateral-ai.service.spec.ts` (the toast tests at `:400-417`), `ai-processes-drawer-host.component.spec.ts` (`:162-166`, `onViewDrafts`), `ai-processes-drawer.component.{ts,html}` and `ai-job-card.component.{ts,html}` (emit `viewDrafts`, behavior unchanged), `my-draft-results.component.spec.ts` (`?job=` tests, unchanged). Run `npx jest src/app/pages/bilateral --silent --reporters=summary --no-coverage`.
- **Done criteria:**
  - [ ] Tests 1–9 green. Each greenfield first red is quoted in `execution.md`.
  - [ ] Each falsifier above was applied once against the post-change code and observed red, then reverted.
  - [ ] The whole `src/app/pages/bilateral` Jest suite is green, and `npx ng lint --quiet` is clean.
  - [ ] `npx tsc -p tsconfig.app.json --noEmit` exits 0.
  - [ ] No secrets logged (`.cursorrules`).

### `ADS-T-2` — `DraftSpotlightService` and Draft Results integration (attach / re-arm, settle, show, close, refresh, guards, copy, guide)

- **Status:** [ ] not started
- **Type:** client
- **Size:** L (≈ 175 production LOC, ≈ 200 test LOC). It is expected to take two review rounds.
- **Description:**
  - **New `DraftSpotlightService`** (`pages/bilateral/services/draft-spotlight.service.ts`, root):
    - `active` signal, `isActive()`, `show(card, container, { title, description, buttonText, onDismiss })`, `close(reason: 'dismiss' | 'programmatic')`, `refresh()`.
    - `show` closes any active instance first. It builds `driver({ popoverClass: 'pr-guide', overlayOpacity: 0.65, stagePadding: 6, animate: false, allowClose: true, onDestroyStarted: → close('dismiss') })`.
    - It then calls `highlight({ element: card, popover: { title, description, showButtons: ['next'], nextBtnText, onNextClick: → close('dismiss') } })`. Buttons go in the **step popover** (P-17).
    - It adds a passive `scroll` listener on `container` that calls `refresh()`.
    - It HTML-escapes every dynamic value (`& < > " '`) before composing title and body (DD-7).
    - `close` is idempotent: it removes the listener, calls `destroy()`, clears `active`, and calls `onDismiss` only for `'dismiss'`. It never uses `onDestroyed` (P-15).
  - **`MyDraftResultsComponent`:**
    - Add `highlightRearmSeq` and `highlightSettledJobId` signals.
    - The existing `?job=` effect reads `highlightRearmSeq()` first. Its second pass sets `highlightSettledJobId(id)` only while `pendingHighlightJobId() === id`.
    - The subscription resets `highlightSettledJobId` on every id change.
    - The center-change effect resets it, sets `highlightApplied = false`, and calls `spotlight.close('programmatic')`.
    - Add the request effect exactly as in `design.md` §2.2. It reads every signal first, then applies these gates in order:
      1. Center: case-insensitive match.
      2. URL landed: `pendingHighlightJobId() === jobId`.
      3. Filters: cancel the search debounce, then call `clearFilters()` once.
      4. Absent group: wait.
      5. Attach vs re-arm.
      6. Settled.
      7. Layers: `selectedDraft`, `promoteTarget`, `discardTarget`, `drawerOpen`, and the tour (polled every 1 s while pending).
      8. Consume, then `show`.
    - Add an effect that calls `spotlight.refresh()` on `sessionGroups()` change while the spotlight is active.
    - `onReview`, `onPromoteClick` and `onDiscardClick` call `close('programmatic')` first. So does `ngOnDestroy`.
    - `onDismiss` focuses the card.
    - Template: `tabindex="-1"` and `outline-none` on the session card.
  - **`BilateralTourService.startBilateralTour`:** return early while `DraftSpotlightService.isActive()`.
  - **Copy:** add `drafts.spotlight { title(n, label), body, button }` to `bilateral-ai-processes.copy.ts` (American English).
  - **Guide:** update `my-draft-results/CLAUDE.md` with the spotlight contract and traps P-12, P-14, P-15, P-17 and P-18. Keep it ≤ 120 lines.
- **Implements:**
  - ADS-R-1:
    - AC-1a: "scrolls to J's group and the spotlight starts".
    - AC-1b: "spotlight starts once J's group is rendered".
    - AC-1c: "scroll and spotlight run again", through re-arm.
    - AC-1d: "spotlight starts on J's group".
  - ADS-R-2:
    - AC-2a: every clause. Everything except J's group is under the overlay; the header and rows are lit; the title names the run; the body states N and the next step; there is a Got it button; and the BUT "drafts of any other job MUST NOT be lit", since the lit element is J's card only.
    - AC-2b: "only after the scroll has settled", and the AND IT MUST "no offset cut-out" (unit part).
    - AC-2c: unit part (driver handles `block: 'start'`).
  - ADS-R-3:
    - AC-3a: the three close paths, "focus moves to J's group", and "ring and New badge remain". The BUT "no scroll lock, leftover overlay, or inert region" is covered by the unit part; the rendered part is in T-3.
    - AC-3b: navigation away, center change, destroy.
  - ADS-R-4:
    - AC-4a: the BUT "spotlight MUST NOT appear" on reload or a new tab (no request).
    - AC-4b: the component side, "MUST NOT fire later on an unrelated visit".
  - ADS-R-5:
    - AC-5a: filters cleared, then spotlight.
    - AC-5b: "no overlay, no error, page behaves as today".
  - ADS-R-6:
    - AC-6a: the wait or drop rule, and the BUT "two dimming layers MUST NOT be shown", including the reverse tour guard.
    - AC-6b: "spotlight closes first and the action proceeds".
  - ADS-R-7: AC-7b, the unit part (container scroll and list change call `refresh`).
  - ADS-R-8: component side (no write method).
  - NFRs:
    - NFR-2: focus on dismiss only.
    - NFR-3: the `pr-guide` theme.
    - NFR-4: copy.
    - NFR-5: no new dependency.
- **Design refs:** §2.1, §2.2, §6.2 (all component and spotlight-service rows), §6.3, §6.4, §7; DD-3, DD-4, DD-5, DD-7, DD-8, DD-9; P-3..P-11, P-13..P-15, P-17, P-18
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/draft-spotlight.service.ts` (+ `.spec.ts`), new
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.{ts,html,spec.ts}`
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-tour.service.ts` (+ `.spec.ts`)
  - `onecgiar-pr-client/src/app/internationalization/bilateral-ai-processes.copy.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/CLAUDE.md`
- **Depends on:** `ADS-T-1`
- **Blocks:** `ADS-T-3`
- **Review:** `full`. It touches a shared effect (the `?job=` highlight), has signal-dependency traps (P-18), integrates a third-party library (P-15, P-17), and carries an XSS guard.
- **Skills:** `angular-developer`, `tdd`, `tailwind-design-system` (card focus classes only)
- **Tests:**
  - `draft-spotlight.service.spec.ts`, with `driver` mocked via `jest.mock('driver.js')`:
    1. The `highlight()` argument's `popover` has `showButtons: ['next']`, `nextBtnText` = Got it, and an `onNextClick` function. The `driver()` config has `animate: false`, `popoverClass: 'pr-guide'` and `allowClose: true`.
    2. Invoking `onNextClick`, then `onDestroyStarted` (Esc or overlay) **immediately after `show`** → `destroy` is called and `onDismiss` fires exactly once per show.
    3. `close('programmatic')` → `destroy` is called and `onDismiss` is **not** called.
    4. `show` while active → the previous instance is destroyed before the new one.
    5. The container `scroll` event → `refresh` is called. After `close`, the event → no `refresh`.
    6. Label `<img src=x onerror=alert(1)>` → the composed title contains `&lt;img` and no `<img`.
  - `my-draft-results.component.spec.ts`, new `describe('draft spotlight (ADS)')`, with `DraftSpotlightService` stubbed and fake timers:
    7. A request for J, with `?job=J` emitted and the group present → after the 600 ms settle, `show` is called once with `#mdr-session-J`, and the title holds N and the label.
    8. **Same job, URL unchanged, `draftList` untouched**, run settled, new nonce → the scroll spy records 2 more passes and `show` is called a second time (FC-1).
    9. Cold mount with both the `?job=J` subscription and a request → the scroll spy records **2** passes in total, not 4, and `show` is called once.
    10. A request for B while the URL says A → no ring move and no `show`. After a cancelled navigation (request consumed), the ring stays on A (FC-4).
    11. A stale `highlightSettledJobId` from an earlier `?job=J` visit is reset when `?job=` changes. A new request for J does not `show` before the new settle (FC-3).
    12. Reload: `?job=J` and no request → ring and scroll as today, and `show` is never called.
    13. The group is hidden by a project filter but present in `allDrafts` → the search debounce is cancelled and `clearFilters` is called once, then `show`. The group is visible → `clearFilters` is not called.
    14. J is absent from `allDrafts` → no `show`, no `clearFilters`, and after 10 s the request is consumed by the T-1 timer.
    15. The center gate: a request for `cip` while the center is `CIP` acts; a request for `ICRISAT` while the center is `CIP` does nothing.
    16. Layers: `selectedDraft` set → no `show` until it is cleared. Tour active → no `show`; once the tour ends, the next 1 s poll gives `show`.
    17. `onReview`, `onPromoteClick` and `onDiscardClick` each call `close('programmatic')` before their existing behavior. Center change and `ngOnDestroy` call `close('programmatic')`.
    18. `onDismiss` → `document.activeElement` is the card. `close('programmatic')` → focus is not moved.
    19. A `sessionGroups()` change while active → `refresh` is called.
    20. No write method on any path.
  - `bilateral-tour.service.spec.ts`:
    21. `startBilateralTour` while the spotlight is active → no `driver()` instance is created.
- **Verification:**
  - **Command:** `cd onecgiar-pr-client && npx jest src/app/pages/bilateral --silent --reporters=summary --no-coverage`, then `npx tsc -p tsconfig.app.json --noEmit` and `npx ng lint --quiet`
  - **Falsifier:**
    - Move `showButtons` into the `driver()` config → test 1 goes red.
    - Use `onDestroyed` instead of the service's own `onDismiss` call → test 2 goes red (the mock never calls `onDestroyed`).
    - Re-arm by re-setting `pendingHighlightJobId(jobId)` without `highlightRearmSeq` → test 8 goes red (the scroll spy stays at the earlier count). The diverging fixture is "settled run, same job, no `draftList` write".
    - Scroll from the request effect too → test 9 goes red (4 passes).
    - Re-arm before the URL lands → test 10 goes red.
    - Drop the subscription reset of `highlightSettledJobId` → test 11 goes red.
    - Gate the center with `===` → test 15 goes red.
    - Focus the card on `'programmatic'` → test 18 goes red.
    - Pass the raw label → test 6 goes red.
    - Assign `close('cancel')` → `tsc` goes red.
  - **Red run:** `predicted — greenfield artifact (observed in ADS-T-2)`. `DraftSpotlightService`, `highlightRearmSeq`, `highlightSettledJobId` and the request effect do not exist at `edcf190f0`. Quote the first red of tests 1, 2, 6, 7, 8, 9, 10, 11 and 21 verbatim in `execution.md` before the code that turns them green.
  - **Disqualifier:**
    - A scroll-pass count taken without advancing fake timers past `SCROLL_SETTLE_MS` and flushing `afterNextRender` (the same flush the existing `?job=` tests use) is not evidence.
    - A green test 8 that passes only because the fixture writes `draftList` is inert. The fixture must leave `draftList` untouched.
    - If any **existing** `?job=` or `ADN` test in `my-draft-results.component.spec.ts` needs its expectation changed, stop and report it as a Pivot. The design says those stay green unchanged.
  - **What these tests cannot prove:** driver.js is mocked. That the overlay, cut-out, Got it button and focus actually render in a browser (P-13, P-17), and that `refresh()` keeps the cut-out aligned, are proved only by `ADS-T-3`.
  - **Consumers:**
    - `my-draft-results.component.spec.ts`: existing `?job=` (P2-3853) and `ADN` suites, which must stay green unchanged.
    - `my-draft-results.component.scss`: `mdr-session-` selectors, unchanged.
    - `my-draft-results/CLAUDE.md`.
    - `bilateral-tour.service.spec.ts`.
    - `bilateral-page-header.component.{ts,html,spec.ts}`: calls `startBilateralTour`; behavior unchanged when no spotlight is active.
    - `bilateral-ai-processes.copy.ts` consumers (`grep -rln BILATERAL_AI_PROCESSES_COPY src`, to be listed in `execution.md`).
    - No Cypress hit for `mdr-session-`.
- **Done criteria:**
  - [ ] Tests 1–21 green. Each listed first red is quoted in `execution.md`.
  - [ ] Each falsifier above was applied once against the post-change code and observed red, then reverted.
  - [ ] The whole `src/app/pages/bilateral` Jest suite is green, with no existing expectation edited. `ng lint --quiet` is clean and `tsc` exits 0.
  - [ ] `CLAUDE.md` is ≤ 120 lines and lists the traps.
  - [ ] No secrets logged (`.cursorrules`).

### `ADS-T-3` — HITL: real-browser visual, keyboard and geometry check

- **Status:** [ ] not started
- **Type:** manual (HITL)
- **Size:** S
- **Description:** On the local stack (`docs/infrastructure.md` §6: `npm run start:dev` for the server and `npm start` for the client), use a center that has an own AI job just completed. Check the matrix below at **375 px and 1280 px** (effective CSS px, browser zoom 100 %), and record a screenshot per row in `execution.md`.

  | # | Check | Covers |
  |---|---|---|
  | H-1 | From Draft Results, click Open drafts on the toast → the page dims, only J's card is lit, and the popover title shows N and the label | AC-1a, AC-2a |
  | H-2 | From the Overview tab → it lands on Draft Results and the spotlight starts once the card is on screen | AC-1b |
  | H-3 | After Got it, open the drawer and click "View N drafts" for J (same URL) → the spotlight shows again | AC-1c, AC-1d |
  | H-4 | **The Got it button is visible and focused on open.** Tab cycles through the popover and the card's buttons. Esc closes. Focus is then on the card | NFR-2, P-9, P-17 |
  | H-5 | Close by overlay click. Afterwards the page scrolls normally, there is no dim layer, and clicks work everywhere | AC-3a BUT |
  | H-6 | A job with many drafts (card taller than the viewport) → the card header is visible, the popover is fully on screen, and there is no horizontal scroll | AC-2c, AC-7a |
  | H-7 | With the spotlight open, scroll inside the list → the cut-out follows the card. Resize the window → it follows | AC-2b, AC-7b, DD-9 |
  | H-8 | With the spotlight open, click Review inside the lit card → the spotlight closes and the Review panel opens with focus in it | AC-6b, P-13 |
  | H-9 | Reload the page with `?job=J` → ring only, no spotlight | AC-4a |
  | H-10 | Set a project filter that hides J, then click Open drafts → the filters clear and the spotlight shows | AC-5a |

- **Implements:** the rendered parts of ADS-R-2, R-3, R-6 and R-7 (ADS-D5, D7), and the P-13 and P-17 library behavior.
- **Depends on:** `ADS-T-2`
- **Review:** `skip-eligible`. A human check is the gate itself, and there is no code diff to review. The claim to prove at execute: no file changes outside `execution.md`.
- **Skills:** `playwright-cli` (optional, if installed locally, for screenshots); otherwise manual
- **Verification:**
  - **Command:** manual, by the user at the HITL pause.
  - **Falsifier:**
    - Revert `ADS-DD-9` (no container listener) → H-7 shows the cut-out detached after scrolling.
    - Move `showButtons` to the config → H-4 shows no button.
  - **Red run:** n/a. This is a manual check of greenfield behavior. The pre-change state is "no spotlight at all", and H-1 on `edcf190f0` is that red (the user's own report, 2026-10-27).
  - **Disqualifier:**
    - A check done at only one width is not evidence for H-6 or H-7.
    - Screenshots at browser zoom other than 100 % are not evidence for the px claims.
    - If H-6 shows the popover off-screen, record it as a finding for the user, not a pass.
  - **Consumers:** none
- **Done criteria:**
  - [ ] H-1..H-10 pass at 375 and 1280 px, with screenshots in `execution.md`.
  - [ ] The user approves at the HITL pause.

---

## 4. Coverage map (scenario and clause level)

| Requirement clause | Owner task(s) |
|---|---|
| AC-1a lands, scrolls, spotlight; BUT no reload or second click | T-1 (nav, same-URL), T-2 (7), T-3 (H-1) |
| AC-1b from another page | T-1 (1), T-2 (7, 9), T-3 (H-2) |
| AC-1c same job again; AND IT MUST not be ignored | T-1 (2), T-2 (8), T-3 (H-3) |
| AC-1d drawer entry point | T-1 (8, 9), T-3 (H-3) |
| AC-2a lit area, popover, Got it; BUT other jobs not lit | T-2 (1, 7), T-3 (H-1, H-4) |
| AC-2b after settle; AND IT MUST no offset cut-out | T-2 (7, 9, 11), T-3 (H-7) |
| AC-2c tall group | T-3 (H-6) |
| AC-3a close paths, focus, ring and badge remain; BUT no scroll lock or leftover overlay | T-2 (2, 3, 18), T-3 (H-4, H-5) |
| AC-3b leaving the page | T-2 (17) |
| AC-4a reload; BUT spotlight MUST NOT appear | T-2 (12), T-3 (H-9) |
| AC-4b request expires; AND IT MUST NOT fire later | T-1 (4, 5, 6), T-2 (14) |
| AC-5a filters hide group | T-2 (13), T-3 (H-10) |
| AC-5b group missing → no overlay, no error | T-2 (14) |
| AC-6a another layer; BUT never two dimming layers | T-2 (16, 21) |
| AC-6b Review or Create from the lit group | T-2 (17, 18), T-3 (H-8) |
| AC-7a 375 / 1280 | T-3 (H-1, H-6) |
| AC-7b resize while open | T-2 (19), T-3 (H-7) |
| ADS-R-8 no data change | T-1 (7), T-2 (20) |
| NFR-1 ≈ 1 s | T-3 (H-1, observed) |
| NFR-2 a11y | T-2 (18), T-3 (H-4) |
| NFR-3 / NFR-5 tour look, no new dependency | T-2 (1), review |
| NFR-4 copy | T-2 (copy) |
| NFR-6 gates | T-1, T-2 done criteria |

## 5. Dependency graph

`ADS-T-1` → `ADS-T-2` → `ADS-T-3` (linear, no cycles).
