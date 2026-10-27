# Design — Bilateral AI Draft Results: Spotlight the Run's Drafts

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-draft-spotlight/` |
| **Requirements** | `requirements.md` (`ADS-R-1..8`), approved 2026-10-27 (Phase 1 gate: Continue) |
| **Depth** | Standard (confirmed by §Budget) |
| **Approval Mode** | gated |
| **Status** | approved (gated, 2026-10-27). **Revision 3**, `JUDGMENT: APPROVED ✅` (round 3, both judges). Post-approval info edits: FX-1 citation, FX-2 center reset, R3-3 budget. **Revision 4 (Pivot, 2026-10-27, after the ADS-T-3 HITL run):** DD-10 (tall-card scroll margin), DD-11 (close on a layer opening), the tour's `overlayColor`. These close HITL-F1, F2 and F3 (`execution.md` → *Pivot Record: ADS-T-3*). Pending user approval |
| **Verified at** | `edcf190f0` |
| **Ticket** | P2-4029 |
| **Baseline cited** | `docs/ux-ui/design.md` §10 (a11y) · `docs/trd/trd.md` `bilateral` client module row · `.cursorrules` (no secrets; not touched) |
| **Kaizen lessons applied** | `docs/specs/kaizen-log.md` does not exist. From the `ADN` archive: the `afterNextRender` plus second scroll pass rule (P2-3853) and the "read every signal before an early return" effect rule (page-guide trap) shape `ADS-DD-3` |

---

## 1. Summary

A click on **Open drafts** (toast) or **View N drafts** (drawer) records a **one-shot spotlight request** (a nonce) in `BilateralAiService`. It then navigates to Draft Results with `?job=<id>`, but only when the URL actually changes.

`MyDraftResultsComponent` attaches the request to the existing `?job=` highlight once the URL names the job. That one pipeline owns the ring and the two-pass scroll. If that job's highlight already finished earlier (a same-job re-click), the page re-runs it through a new `highlightRearmSeq` signal. When the highlight reports "settled", the page asks a new, thin `DraftSpotlightService` (a wrapper over the installed `driver.js` 1.8.0) to spotlight the group:
- `animate: false`.
- The buttons and the Got it handler are set on the **step's popover**.
- A single close path that the service owns.
- `refresh()` on the page's scroll container.

The URL never creates a spotlight, so a reload only rings. Everything is client-side.

---

## 1A. Premise Ledger

Count: 18 premises · 18 verified · 0 `UNVERIFIED`.
Blast-radius triggers: **live-path** (the design names user actions: toast click, drawer click, Esc, overlay click) · **shared-state** (the `?job=` highlight effect, its subscription and `highlightClearTimer` are now driven by two sources) · **consumer** (`onViewDrafts` and the session-card DOM gain behavior).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | Toast **Open drafts** runs `openDraftsForJob`, which navigates with no query params | live-path | `bilateral-ai.service.ts:439` (`action: { label: 'Open drafts', run: () => this.openDraftsForJob(job) }`) → `:463-466` | `edcf190f0` | DD-1 target changes (High) | — |
| P-2 | Drawer **View N drafts** runs `onViewDrafts`, which loads drafts, closes the drawer and navigates with `?job=` | live-path | `ai-processes-drawer-host.component.ts:104-109` | `edcf190f0` | DD-1 drawer half changes (Low) | — |
| P-3 | The `?job=` subscription ignores an id equal to `pendingHighlightJobId()` | shared-state | `my-draft-results.component.ts:408` (`if (jobId === this.pendingHighlightJobId()) return;`) | `edcf190f0` | DD-3 re-arm could double-scroll (High) | — |
| P-4 | The highlight effect finds the group, sets `highlightApplied` and the ring, then scrolls in two passes (`afterNextRender`, then +600 ms on `highlightClearTimer`) inside the nearest scroll container | shared-state | `my-draft-results.component.ts:249-283`, `:276-279`, `:368` | `edcf190f0` | DD-3 settle hook moves (High) | — |
| P-5 | Readers of the highlight state: the ring classes, the `?job=` subscription and the effect. `ADN` effects read `sessionGroups()` but not the highlight state | shared-state | `grep -n "highlightedSessionId\|pendingHighlightJobId\|highlightApplied" my-draft-results.component.{ts,html}` → ts `:211-256`, `:408-412`; html `:242-244` only | `edcf190f0` | DD-3 must not break the ring (High) | — |
| P-6 | Session cards carry `id="mdr-session-<jobId>"`, and the group's `sessionId` is the job id | location | `my-draft-results.component.html:239`; `my-draft-results.component.ts:252-253` (`group.sessionId === jobId`) | `edcf190f0` | DD-4 selector changes (High) | — |
| P-7 | Filters hide groups through `drafts` (filtered) vs `allDrafts` (unfiltered). `clearFilters()` resets `searchInput` and calls `filter.clearAll()` (projects, search, created-by) but does **not** cancel `searchDebounceTimer` | location | `my-draft-results.component.ts:421`, `:431`, `:446`, `:659-662`, `:664-671`; `my-draft-results-filter.service.ts:203-207` | `edcf190f0` | DD-5 changes (Low) | — |
| P-8 | `loadAllDrafts` keeps the newest response, and `isDraftListLoaded` is never reset, so "loaded" is not center-specific | data-env | `bilateral-ai.service.ts:479-497` | `edcf190f0` | DD-6 (TTL, center gate) (High) | — |
| P-9 | driver.js 1.8.0: Esc and overlay click call the internal `h()` destroy, which calls `onDestroyStarted` and returns **if that hook is configured**. The public `destroy()` calls `h(false)`, which skips that hook. On render it focuses the first focusable of popover plus active element, and its Tab trap cycles through both | data-env | `node_modules/driver.js/package.json` `"version": "1.8.0"`; `dist/driver.js.mjs`: `function n(){t.getConfig(\`allowClose\`)&&h()}`, `listen(\`escapePress\`,n)`, `function h(e=!0){…if(e&&a){a(…);return}…}`, `destroy:()=>{h(!1)}`, `h([m,e])…v[0].focus()` | `edcf190f0` | DD-4 close path (High) | — |
| P-10 | driver.js scrolls the element itself only when it is not fully inside the **window** rect, with `block: 'start'` when the element is taller than the window, else `'center'` | data-env | `dist/driver.js.mjs` (`function g(e,t){if(!e\|\|v(e))return;let n=e.offsetHeight>window.innerHeight;e.scrollIntoView({…block:n?\`start\`:\`center\`})}`) | `edcf190f0` | DD-3 and DD-9; HITL ADS-D5 (Low) | — |
| P-11 | driver.js writes the popover **title, description and button texts with `innerHTML`** | data-env | `dist/driver.js.mjs` (`r.title.innerHTML=i`, `r.description.innerHTML`, `r.nextButton.innerHTML=u`) | `edcf190f0` | DD-7 is required (High) | — |
| P-12 | The app router uses the default `onSameUrlNavigation: 'ignore'`. A `navigate()` to the current URL emits `NavigationSkipped` and **resolves `false`** | data-env | `app-routing.module.ts:8` (`RouterModule.forRoot(routes)`, no options); `grep -rn onSameUrlNavigation onecgiar-pr-client/src` → 0 hits; `@angular/router` `_router-chunk.mjs:3743-3748` (`NavigationSkipped` … `resolve(false)`), both judges, 2026-10-27 | `edcf190f0` | DD-6: `false` cannot mean "cancelled" (High) | — |
| P-13 | With `disableActiveInteraction: false` (default), clicks inside the lit card reach its buttons | data-env | `dist/driver.css` (`.driver-active *{pointer-events:none}`, `.driver-active .driver-active-element *{pointer-events:auto}`); the active-element click is a no-op without `advanceOnClick`, both judges, 2026-10-27 | `edcf190f0` | ADS-AC-6b (High); HITL re-checks | — |
| P-14 | driver.js re-measures only on **window** `scroll` and `resize`. Draft Results scrolls inside a nested container whose scroll events do not reach that listener | data-env | `dist/driver.js.mjs` (`window.addEventListener(\`resize\`,r),window.addEventListener(\`scroll\`,i)`, no capture); container scroll: `my-draft-results.component.ts:344` (`findNearestScrollContainer`), `:368-382` (`scrollWithinNearestScrollContainer` → `container.scrollTo`) | `edcf190f0` | DD-9 is required (High) | — |
| P-15 | For `highlight()`, `__activeElement` and `__activeStep` are set in the post-animation transition callback, and `h()` calls `onDestroyed` only when both are set. `highlight()` sets no `__activeOnDestroyed`, so driver does not restore focus | data-env | `dist/driver.js.mjs` (`…setState(\`__activeStep\`,n),e.setState(\`__activeElement\`,t))…requestAnimationFrame(y)`; `function h(…){…if(n&&r){…s&&s(…)}i&&i.focus()}`), architect re-run 2026-10-27 (JD-4) | `edcf190f0` | DD-4: no reliance on `onDestroyed` (High) | — |
| P-16 | The completion toast is hosted outside the routed outlet, so its action survives the navigation it triggers | location | `globalUserNotification` host in `app.component.html` (`pr-toast`), both judges, 2026-10-27 | `edcf190f0` | DD-1 (Low) | — |
| P-17 | `highlight()` injects popover defaults `showButtons: []` before the step's own popover. The empty array is truthy, so a config-level `showButtons` is ignored. `nextBtnText` and `onNextClick` fall back to the config, but buttons render only from the step popover | data-env | `dist/driver.js.mjs`: `highlight:e=>{u(),K(t,{...e,popover:e.popover?{showButtons:[],showProgress:!1,progressText:\`\`,...e.popover}:void 0})}`; `showButtons:r.showButtons\|\|e.getConfig(\`showButtons\`)`; both round-2 judges and an architect re-run, 2026-10-27 (FC-2) | `edcf190f0` | DD-4: buttons go in the step popover (High) | — |
| P-18 | The `?job=` highlight effect depends only on `pendingHighlightJobId()` and `sessionGroups()`. `highlightApplied` is a plain field, and setting a signal to an equal value does not notify, so writing the same job id cannot re-run the effect | shared-state | `my-draft-results.component.ts:249-256` (reads), `:229` (`private highlightApplied = false`); Angular signals use `Object.is` equality by default; both round-2 judges, 2026-10-27 (FC-1) | `edcf190f0` | DD-3: re-run needs its own signal (High) | — |

**Consumers** (`grep -rln "onViewDrafts\|openDraftsForJob\|Open drafts\|mdr-session-" src cypress`, in `onecgiar-pr-client`, as run):
- `onViewDrafts`: `ai-processes-drawer-host.component.{ts,spec.ts}`, `ai-processes-drawer.component.{ts,html}`, `ai-job-card.component.{ts,html}`, `my-draft-results.component.spec.ts`.
- `openDraftsForJob` / `Open drafts`: `bilateral-ai.service.ts` only (**no test pins it today**).
- `mdr-session-`: `my-draft-results.component.{ts,html,scss,spec.ts}`, folder `CLAUDE.md`.
- No Cypress hit.

---

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Item | Change |
|---|---|---|
| Service (root) | `BilateralAiService` | + `draftSpotlightRequest` signal; `requestDraftSpotlight` / `consumeDraftSpotlight(nonce)`; a 10 s expiry timer per request; `openDraftsForJob` navigates with `?job=`, only when the URL changes |
| Component | `AiProcessesDrawerHostComponent.onViewDrafts` | Requests, then uses the same "navigate only if the URL changes" rule |
| Service (root, new) | `DraftSpotlightService` (`pages/bilateral/services/draft-spotlight.service.ts`) | Wraps driver.js: `show`, `close(reason)`, `refresh`, `isActive`, an `active` signal |
| Page | `MyDraftResultsComponent` | Attaches a request to the `?job=` highlight once the URL names its job, re-running a finished run through a new `highlightRearmSeq` signal; adds a `highlightSettledJobId` signal; shows the spotlight on settle; closes it on in-card actions, center change and destroy |
| Tour | `BilateralTourService.startBilateralTour` | Returns early while `DraftSpotlightService.isActive()` (JD-14) |
| Copy | `bilateral-ai-processes.copy.ts` | `drafts.spotlight` title, body and button |
| Styles | none new | reuses global `pr-guide` (`src/styles.scss:699` import, `:702` `.driver-popover.pr-guide`) |

### 2.2 Sequence

```text
click Open drafts / View N drafts
  → service.requestDraftSpotlight({ jobId, centerAcronym, label })   new nonce, 10 s expiry timer
  → target URL == router.url ?  yes → no navigation (the page reacts to the request)
                                no  → router.navigate(... { queryParams: { job } })
                                      resolves false → consumeDraftSpotlight(nonce)   (only a different-URL false = cancelled)
Draft Results, request effect (reads request, ctx.centerAcronym, pendingHighlightJobId, allDrafts, sessionGroups,
                                selectedDraft, promoteTarget, discardTarget, drawerOpen, spotlight.active,
                                highlightSettledJobId first)
  → request.centerAcronym ≠ ctx.centerAcronym (case-insensitive)   → wait
  → pendingHighlightJobId ≠ jobId (the URL has not landed yet)      → wait   (no ring before the URL, FC-4)
  → group hidden by filters, present in allDrafts                  → cancel search debounce, clearFilters() once, wait
  → group absent from allDrafts                                    → wait (expiry timer drops it)
  → nonce not attached yet:
        highlightSettledJobId == jobId (an earlier run already finished: same-job re-click)
                                → re-arm: highlightApplied = false, highlightSettledJobId = null,
                                  highlightRearmSeq++ (FC-1); attach nonce
        else (a run for jobId is pending or in flight)  → attach nonce, no re-arm (one scroll only)
  → highlightSettledJobId ≠ jobId                                  → wait
  → another layer open (panel, dialog, drawer, tour)               → wait (signals re-run it; the tour is polled, see DD-8)
  → else consume nonce → DraftSpotlightService.show(card, container, popover)
?job= highlight effect (existing): reads highlightRearmSeq first (new), then as today ring + 2-pass scroll;
  the second pass sets highlightSettledJobId only if pendingHighlightJobId still equals the id
?job= subscription (existing): on any id change also resets highlightSettledJobId (FC-3); center change resets it
  and also sets highlightApplied = false (FX-2), so a later request for the same id re-runs instead of waiting
close: Got it / Esc / overlay → close('dismiss') → focus card
       Review / Create / Discard / center change / destroy / newer show → close('programmatic') → no focus move
```

---

## 3. Data Model Changes

None. A request is in-memory only: `{ jobId, centerAcronym, label, nonce }`.

## 4. API Surface

None (`ADS-R-8`).

## 5. Server Workflow / Business Rules

None.

---

## 6. Frontend Plan

### 6.1 Routes

Unchanged. `/bilateral/:acronym/drafts?job=<id>` is now also produced by the toast.

### 6.2 Components and services

| Unit | Responsibility | Requirements |
|---|---|---|
| `BilateralAiService.requestDraftSpotlight(job)` | Writes a new request with a fresh nonce, replacing any pending one (latest click wins). Starts a 10 s `setTimeout` that calls `consumeDraftSpotlight(nonce)`, and clears the previous request's timer | ADS-R-1, R-4 (AC-4b) |
| `BilateralAiService.consumeDraftSpotlight(nonce)` | Clears the request and its timer only if the nonce matches | ADS-R-4 |
| `openDraftsForJob` / `onViewDrafts` | Build the label (same rule as the toast summary) and request. Then navigate **only if** `router.serializeUrl(router.createUrlTree(['/bilateral', acronym, 'drafts'], { queryParams: { job } }))` differs from `router.url`. When it differs (another page, another job, or extra params such as `?project=`, which are dropped as the drawer does today), navigate. A `false` from that navigation consumes the nonce | ADS-R-1 (AC-1a..1d) |
| `MyDraftResultsComponent` request effect | The sequence in §2.2. Reads every signal before any return. It **never moves the ring ahead of the URL**: it acts only when `pendingHighlightJobId()` already equals the request's job (FC-4). Re-arm happens only for a completed earlier run, through `highlightRearmSeq` (FC-1); otherwise it attaches to the pending run, so a cold mount scrolls once | ADS-R-1, R-2, R-4..6 |
| Existing `?job=` highlight effect and subscription | Same scroll logic. The effect also reads `highlightRearmSeq` first. The second pass sets `highlightSettledJobId(id)` only if `pendingHighlightJobId()` still equals `id`. The subscription resets `highlightSettledJobId` on every id change, and the center-change effect resets it too (FC-3). It stays the **only** scroller; `highlightClearTimer` keeps one owner and is cleared in `ngOnDestroy` (`:861`, already) | ADS-AC-2b |
| `DraftSpotlightService.show(card, container, { title, description, buttonText, onDismiss })` | Closes any active instance first. One `driver()` with the tour's look (`popoverClass: 'pr-guide'`, `overlayColor: '#1e202f'`, `overlayOpacity: 0.65`, `stagePadding: 6`; the colour was added in rev. 4, HITL-F3), `animate: false`, `allowClose: true`, and `onDestroyStarted` (Esc, overlay) → `close('dismiss')`. Calls `highlight({ element: card, popover: { title, description, showButtons: ['next'], nextBtnText, onNextClick: → close('dismiss') } })`. **The buttons live in the step popover**, because `highlight()` overrides a config-level `showButtons` with `[]` (P-17). Attaches a passive scroll listener on `container` that calls `refresh()`. Sets `active` | ADS-R-2, R-3, R-7 |
| `DraftSpotlightService.close(reason)` | Idempotent: removes the listener, calls `destroy()`, clears `active`, and calls `onDismiss` **only** for `'dismiss'`. Never relies on `onDestroyed` (P-15) | ADS-R-3 |
| `DraftSpotlightService.refresh()` | Calls `driver.refresh()` when active. The page calls it from an effect on `sessionGroups()` while active (list reloads change row heights) | ADS-AC-7b |
| `onDismiss` (page) | Focuses the card (`tabindex="-1"` added to the card) | ADS-AC-3a, NFR-2 |
| `onReview` / `onPromoteClick` / `onDiscardClick`, center-change effect, `ngOnDestroy` | `spotlight.close('programmatic')` first | ADS-AC-3b, AC-6b |

### 6.3 Design system usage

- Overlay and popover: the existing `pr-guide` driver.js theme (`src/styles.scss:699-702`). No new tokens.
- Popover copy (`ADS-NFR-4`, final wording for the copy file):
  - Title: **"{N} new draft(s) from {label}"**
  - Body: *"These are the drafts this AI run just found. Open each one with **Review**, then create the result or discard it."*
  - Button: **Got it**
- Card: `tabindex="-1"` and `outline-none` only. Focus is visible through the existing ring.

### 6.4 Interaction rules

| Rule | Behavior |
|---|---|
| Lit element | The whole session card (`#mdr-session-<jobId>`), D-3 |
| Tall card | If the card is not fully in the window after the page's scroll, driver.js scrolls it itself (`block: 'start'` when taller than the window, P-10). **Rev. 4 (DD-10):** before `highlight()`, the service sets `card.style.scrollMarginTop` to the height of the app's fixed top chrome plus 8 px, so `scrollIntoView` lands the card header **below** that chrome. It clears the margin on close. Without it, at 375 px the header was hidden under the app bar (HITL-F1). The container listener keeps the cut-out aligned afterwards. Popover side is driver's auto placement. **HITL-checked** (ADS-D5) |
| Scrolling while open | Allowed. The container listener calls `refresh()` (DD-9) |
| Clicks inside the card | Allowed (P-13). Review, Create and Discard close the spotlight first |
| Keyboard | Focus starts on **Got it** (P-9). Tab cycles through the popover **and the lit card's buttons** (driver's trap, P-9). That is accepted, because those buttons are the next step. Esc closes |
| Clash guard | Wait while `selectedDraft()`, `promoteTarget()`, `discardTarget()` or `drawerOpen()` is set. The tour, which is not a signal, is checked when the effect runs and re-polled once per second while a request is pending. Expiry (10 s) drops the request either way. Reverse: the tour does not start while the spotlight is active. **Rev. 4 (DD-11):** while the spotlight is active, if `selectedDraft()`, `promoteTarget()`, `discardTarget()` or `drawerOpen()` becomes set (for example, a toast action opens the drawer), the page calls `close('programmatic')`, so two dimming layers never show (HITL-F2) |

---

## 7. Security & Authorization

- **XSS (P-11):** the popover title includes the project name, which is user-entered data, and driver.js writes title, description and button texts with `innerHTML`. `DraftSpotlightService` HTML-escapes every dynamic value (`& < > " '`) before composing title and body. The only markup is the static `<strong>` from the copy file (`ADS-DD-7`). A test feeds `<img src=x onerror=…>` as the label and asserts the text renders literally and no `img` element exists.
- No auth, token or secret is touched (`.cursorrules`).

## 8. Performance & Capacity

One driver instance at most, created on demand. One scroll listener only while it is active, and `refresh()` is driver's rAF-throttled call. One expiry timer per pending request.

## 9. Observability

None. A UI-only interaction; no logging (`.cursorrules`).

---

## 10. Testing Plan

| Defect class | Test |
|---|---|
| ADS-D1 | Service spec: `openDraftsForJob` writes a request and navigates with `{ queryParams: { job } }` when the URL differs; **does not navigate and keeps the request** when the URL is already `/bilateral/X/drafts?job=J`; a different-URL `false` consumes. Drawer-host spec: the same, for `onViewDrafts` |
| ADS-D2 | Component spec:<br>• request → attach → settle → `show` once.<br>• A reload with `?job=` and no request gives the ring and no `show`.<br>• **Same-job new nonce with the URL unchanged and no list reload** (`draftList` untouched) gives a second 2-pass scroll and a second `show`. This falsifies FC-1: a re-arm that only re-sets `pendingHighlightJobId` leaves the scroll spy at 2 passes.<br>• The expiry timer fires → consumed, no `show`.<br>• An older-nonce consume leaves a newer request intact.<br>• A cold mount with both the subscription and the request scrolls **once** (scroll spy = 2 passes, not 4).<br>• A request for B while the URL still says A gives no ring move until `?job=B` lands, and a cancelled navigation leaves the ring on A (FC-4).<br>• A stale `highlightSettledJobId` from an earlier visit is reset by the subscription before `show` (FC-3) |
| ADS-D3 | Group hidden by a filter but in `allDrafts` → debounce cancelled and `clearFilters` called once, then `show`. Group visible → `clearFilters` not called. Group absent → no `show`, no clear |
| ADS-D4 | `DraftSpotlightService` spec with `driver` mocked: the `highlight()` argument's `popover` carries `showButtons: ['next']`, `nextBtnText` and `onNextClick`. This falsifies FC-2: moving them to the `driver()` config fails the assertion. `close` destroys and removes the listener; `onDismiss` fires once for Got it, Esc (`onDestroyStarted`) and overlay, **immediately after `show`** (no animation wait); `'programmatic'` closes never call `onDismiss`; `show` while active closes the previous instance first. Component destroy and center change call `close('programmatic')` |
| ADS-D5 | **HITL** in a real browser at 375 and 1280 px: 1-draft job and many-draft job; from Draft Results, from another tab, and a same-job re-click; scroll inside the container while open; resize while open; Review click inside the lit card; screenshots in `execution.md` |
| ADS-D6 | Component spec: `selectedDraft` set → no `show` until cleared; tour active → no `show` until it ends (poll); spotlight active → `startBilateralTour` returns early |
| ADS-D7 | Service spec: dismiss → card focused (`document.activeElement`); Review-triggered close → focus not moved to the card. HITL keyboard pass |
| ADS-D8 | `npx tsc -p tsconfig.app.json --noEmit` (or `ng build`) |
| XSS | Service spec: an HTML label renders as text |
| Center gate | Component spec: a request for center Y while `ctx.centerAcronym()` is X → no clear, no re-arm, no `show` until it becomes Y; `cip` vs `CIP` counts as the same center |
| Got it renders | **HITL**: the Got it button is visible and focused on open (P-17 is a library behavior that the mock cannot prove) |

Fake timers drive the 600 ms settle pass, the expiry and the tour poll. `afterNextRender` is flushed the same way the existing `?job=` tests do.

## 11. Backwards Compatibility

- `?job=` deep links behave exactly as before (ring and scroll only). The existing `?job=` tests must stay green unchanged.
- The toast URL now carries `?job=`, so the ring also shows after a toast click. This is intended and matches the drawer.
- Rollback: revert the commit; no data to migrate.

---

## 12. Design Decisions

### `ADS-DD-1`: Both entry points target `?job=` and request a spotlight

The toast joins the drawer's existing URL contract (P-1, P-2). Ring, scroll, reload and share-link behavior come for free. The toast host lives outside the route (P-16), so its action survives the navigation. The spotlight itself is not in the URL (DD-2).

### `ADS-DD-2`: A one-shot request signal with a nonce, not a URL flag

A `?spotlight=1` flag would replay on reload and in shared links (ADS-AC-4a). It also could not re-trigger on the same URL (P-12). A root-service signal survives the route change, re-triggers through a new nonce, and dies with the tab.

### `ADS-DD-3`: The existing `?job=` highlight owns the scroll; the spotlight waits for its settle (JD-3)

There is one scroller and one timer owner (P-4, P-5).
- A request acts only once the URL names its job (`pendingHighlightJobId() === jobId`), so the URL-driven ring never runs ahead of the URL (FC-4).
- If that job's run is pending or in flight, the request attaches to it (one scroll).
- If the run already finished (a same-job re-click, where P-3 makes the URL emission a no-op), the page re-runs it by bumping `highlightRearmSeq`. Setting the same job id would not notify (P-18, FC-1).
- The page then waits for `highlightSettledJobId`, which the second pass sets only while its job is still the pending one. The subscription and the center change reset it (FC-3). All checks (center, layers, nonce) run again in the same effect run that calls `show`, so nothing is deferred without a re-check. If the card is still not fully in the window, driver.js scrolls it itself (P-10), and DD-9 keeps it aligned. The effect reads every signal before any return (page-guide trap).
*Rejected:* a second scroll inside the spotlight path (the round-1 design), which raced the `?job=` effect and leaked a timer.

### `ADS-DD-4`: A thin `DraftSpotlightService` over driver.js, with one close path it owns (JD-4)

driver.js gives overlay, cut-out, Esc, overlay-click, focus on open and the Tab trap (P-9, P-13). The service sets `animate: false` and routes Got it, Esc and overlay through `onNextClick` and `onDestroyStarted` into its own `close('dismiss')`. The Got it button and its handler are declared on the **step's popover** passed to `highlight()`, because `highlight()` forces `showButtons: []` over the config (P-17). That calls the public `destroy()`, which skips the hook (P-9). It never depends on `onDestroyed`, which does not fire for a close inside the animation window and restores no focus (P-15). It is separate from `BilateralTourService`, so the tour's `localStorage` completion flag is untouched.
*Rejected:* a hand-made CSS overlay (proposal option B).

### `ADS-DD-5`: Clear filters when they hide the target

If the group is in `allDrafts` but not in `sessionGroups()`, the page cancels the pending search debounce (JD-15) and calls `clearFilters()` once (P-7). Then it waits for the group (D-2).

### `ADS-DD-6`: Navigate only when the URL changes; expire by timer; gate on the center (JD-1, JD-6, JD-8)

- A same-URL `navigate()` resolves `false` (P-12), so `false` alone cannot mean "cancelled". The entry points skip navigation when the target equals `router.url`, and consume only on a different-URL `false` (for example, a guard).
- The comparison is `router.serializeUrl(router.createUrlTree(target))` against `router.url`. A current URL with extra params differs, so it navigates and drops them, as the drawer does today.
- Because "loaded" is not center-specific (P-8), the page acts only when `request.centerAcronym` equals the current center, compared case-insensitively (FC-6). Even then it never drops on a miss; a real 10 s timer in the service consumes an unused request (ADS-AC-4b, AC-5b).

### `ADS-DD-7`: Escape every dynamic popover value

driver.js writes title, description and button texts with `innerHTML` (P-11). The service escapes the label and the count before composing. The static copy is the only markup source.

### `ADS-DD-8`: Close on in-card actions, center change and destroy; focus returns only on dismissal (JD-5, JD-13, JD-14)

- Review, Create and Discard open their own layers, so they close the spotlight with `'programmatic'`, and focus stays with the new layer. Center change reuses the component (`ADN` P-10) and destroy covers route changes. Both close with `'programmatic'`.
- Only Got it, Esc and overlay return focus to the card.
- The tour is not a signal, so a pending request polls it once per second until expiry. The tour does not start while the spotlight is active.

### `ADS-DD-9`: Keep the cut-out aligned inside the nested scroll container (JD-2)

driver.js listens to window scroll and resize only (P-14). While active, the service listens (passively) to the card's scroll container and calls `refresh()`. The page also calls `refresh()` when `sessionGroups()` changes, because list reloads change heights. Both stop on close.

### `ADS-DD-10`: Land a tall card's header below the app's fixed top chrome (rev. 4, HITL-F1)

driver.js scrolls the card with `scrollIntoView({ block: 'start' })` when the card is taller than the window (P-10). At 375 px that puts the card top at y = 0, under the app's fixed top bar, so the header is hidden. `scrollIntoView` honours the target's `scroll-margin-top`, so `show()` sets `card.style.scrollMarginTop = <top-chrome height> + 8px` before `highlight()`, and `close()` restores the previous inline value.
- The top-chrome height is measured at show time. It is the bottom edge of the app shell's fixed or sticky header element(s) still visible at the top of the viewport.
- The exact element is identified by ADS-T-4: `UNVERIFIED — confirm at source before relying on it`.
- It is measured, not hard-coded, because the banner wraps at narrow widths.

*Rejected:* scrolling the card from the service before `highlight()`. That would be a second scroller, which DD-3 rules out.

### `ADS-DD-11`: Close the spotlight when another layer opens while it is active (rev. 4, HITL-F2)

The clash guard (§6.4) only stops the spotlight from **starting** over another layer. In the HITL run, the drawer opened programmatically by a toast action while the spotlight was active, and its backdrop stacked on the spotlight. That breaks the ADS-AC-6a BUT. While the spotlight is active, an effect on the four layer signals calls `close('programmatic')` as soon as any of them becomes set. Focus stays with the new layer (DD-8).

### Reversion challenge (Step 2.3)

No decision removes or inverts shipped behavior. The `?job=` scroll logic, ring, same-id guard and the `ADN` badge are kept. The changes to the existing `?job=` code are additive:
- The effect also reads `highlightRearmSeq`, a counter only the spotlight path bumps.
- The second pass also writes `highlightSettledJobId`.
- The subscription and the center change also reset it.

URL-driven behavior is identical when no request exists. The existing `?job=` tests must stay green unchanged.

---

## 13. Open Gaps

| Item | Owner |
|---|---|
| Tall-card popover placement (driver's auto side) | ADS-T-3, HITL (accepted risk if acceptable on screen) |
| Real-browser behavior of `refresh()` on container scroll | ADS-T-3, HITL |
| Got it button rendered and focused (P-17) | ADS-T-3, HITL. **Closed** 2026-10-27, H-4 PASS at 1280 and 375 |
| The "app top chrome" element(s) that DD-10 measures | ADS-T-4. The Implementer identifies them in the app shell. `UNVERIFIED — confirm at source before relying on it` |

---

## Budget

> **Rev. 4 note:** the user accepted the LOC overrun after ADS-T-2 (about 1 200 LOC against the 600 tripwire). The pivot adds `ADS-T-4`, which brings the count to **4 tasks**, the tripwire limit, not over it. ADS-T-4 is estimated at about 25 production LOC and about 60 test LOC.

| Measure | Estimate |
|---|---|
| Tasks | 3 (T-1 service request, expiry and navigation rule, both entry points; T-2 spotlight service and page integration; T-3 HITL visual and keyboard check) |
| LOC | ≈ 530 total: ≈ 220 production (service request ~40, spotlight service ~70, component ~100, tour guard ~2, copy ~8) plus ≈ 310 tests (re-estimated after round 3, R3-3) |
| Review rounds | 4 (T-2 is expected to take two) |

The tripwire trips at more than 4 tasks, more than 600 LOC, or more than 6 review rounds.

## Required cross-references

- `requirements.md`: `ADS-R-1..8`, `ADS-D1..D8`
- `judgment.md`: round-1 ledger (JD-1..JD-15)
- `archive/2026-10-27-bilateral--ai-draft-new-indicator/design.md`: `ADN-DD-3`, `ADN-DD-5`
- `pages/bilateral/pages/my-draft-results/CLAUDE.md`: to be updated in T-2 (spotlight contract and traps: P-12 same-URL `false`, P-14 window-only refresh, P-15 no `onDestroyed`)
