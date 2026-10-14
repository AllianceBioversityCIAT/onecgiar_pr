# Module Spec — `design.md`

**Spec:** `bugfix/stale-bundle-refresh-prompt` · Links `requirements.md` (same folder) · `docs/prd.md` · `docs/trd/trd.md` §"Feature modules lazy-load via their own routing module" (trd.md:412) · `onecgiar-pr-client/src/CLAUDE.md` §§2.3, 4, 21.1.

---

## 1. Summary

Extend `AppComponent`'s existing `Router.events` subscription (already used to drive sidebar layout off `NavigationEnd`) with a sibling subscription filtered to `NavigationError`. When the error text matches a dynamic-import/chunk-load failure pattern, call the app's existing `PrToastService` with a sticky, keyed toast carrying a "Refresh now" action that runs `window.location.reload()`, rendered through a second `<app-pr-toast key="stale-bundle-refresh" />` host mounted in `app.component.html` (added 2026-10-14, Pivot `SBR-P-3b` — see §1A). No new component, no new dependency, no server change. The biggest accepted trade-off: detection is regex-matched against the browser's thrown error message, so a future browser wording change could slip past (Open Gap §13).

---

## 1A. Premise Ledger

**Count:** 8 verified, 0 `UNVERIFIED` (0 High, 1 Low). **Updated 2026-10-14 (Pivot):** `SBR-P-3` amended and `SBR-P-3b` added after the Reviewer found the originally-designed toast key had no rendering host — see `execution.md` Pivot Record.
**Blast-radius triggers:** `live-path` fires (see `P-1`); `shared-state` and `consumer` do not fire (reasoning below the table).

| # | Claim | Class | Citation (as run) | Verified at | If false |
|---|---|---|---|---|---|
| `SBR-P-1` | The Bilateral result link / W3 "Where to report" row actually dispatches to the lazy `BilateralModule` chunk this design targets | `live-path` | Dispatch chain: `reporting-entry-hub.component.html:318` (`[routerLink]="['/bilateral', center.acronym, 'home']"`) → Router navigation → `routing-data.ts:133-134` (`loadChildren: () => import('.../bilateral.module')`) → `bilateral-routing.module.ts:6-11` (`:acronym` param) → `routing-data.ts:734-740` (`result/:id` `loadComponent` child, the `/bilateral/{CENTER}/result/{code}` path from the bug report) | `5bb4d1cb9` | High — the whole spec targets the wrong code path |
| `SBR-P-2` | No existing stale-bundle / chunk-load / `ErrorHandler` mechanism exists to extend instead | `existence` | `grep -rn "ChunkLoadError" src` → 0; `grep -rn "dynamically imported module\|Failed to fetch dynamically" src --include="*.ts"` → 0; `grep -rln "SwUpdate\|VersionReady\|VersionEvent" src --include="*.ts"` → 0; `find . -iname "ngsw-config.json" -not -path "./node_modules/*"` → none; `grep -rn "ErrorHandler" src --include="*.ts"` (excl. specs) → 0 | `5bb4d1cb9` | Low — would extend/merge into the existing mechanism instead of adding a new listener |
| `SBR-P-3` | `PrToastService` already supports a sticky, keyed toast with a one-click action button, rendered as an ARIA live region — **but a toast only renders through an `<app-pr-toast>` host whose own `[key]` input matches the toast's `key`; a toast added under a key with no matching host is added to the service's signal and never displayed.** The app shell mounts exactly one host today, `<app-pr-toast key="globalUserNotification" />` (`app.component.html:91`) | `existence` | `pr-toast.service.ts:11-23` (`PrToastMessage.sticky`, `.key`, `.action: PrToastAction`), `pr-toast.service.ts:36-42` (`add()` honors `sticky`), `pr-toast.component.html:5` (`role="alert"` per toast), `pr-toast.component.ts:25` (`visible = computed(() => this.svc.toasts().filter(t => (t.key ?? '') === (this.key ?? '')))` — the host-key filter), `app.component.html:91` (the one existing host, keyed `globalUserNotification`) | `5bb4d1cb9` initial; host-key gap found in `/akili-execute` Reviewer pass on attempt 1, confirmed by Leader 2026-10-14 | High — would need to build a new banner component from scratch, far exceeding Lite budget. **Corrected per Pivot (2026-10-14, see `execution.md` Pivot Record):** this premise's first sentence is still true of `PrToastService`; its omission (no host exists for an arbitrary new key) is exactly what the Pivot fixes by adding `SBR-P-3b` below |
| `SBR-P-3b` | Mounting a second `<app-pr-toast key="stale-bundle-refresh" />` host in `app.component.html`, alongside the existing `globalUserNotification` host, is sufficient for a toast added under that key to render — no new component, just a second instance of the existing one | `existence` | `pr-toast.component.ts` has no constraint limiting it to a single instance per page (it is a plain `@Component` with a `[key]` `@Input()`, no `providedIn` singleton semantics); every other consumer listed in `design.md` §1A's original reasoning (18 `*.spec.ts` call sites) already demonstrates multiple hosts with distinct keys coexisting app-wide (`myKey1`, `br`, `outcomeIndicators`, `copyResultLinkPdf`, `copykey`, plus two keyless hosts) | confirmed 2026-10-14 (Pivot resolution) | Low — if false, a second host instance would conflict somehow with the first, which no evidence suggests and no existing multi-host usage contradicts |
| `SBR-P-4` | `AppComponent` is the right, already-established extension point: it already runs a `Router.events` subscription in `ngOnInit()`, and the app is NgModule-based (no standalone `provideRouter` wiring) | `location` + `data-env` | `app.component.ts:56-58` (existing `NavigationEnd` subscription); `main.ts` (`platformBrowserDynamic().bootstrapModule(AppModule)`); `find src/app -maxdepth 1 -iname "app.config*"` → none | `5bb4d1cb9` | High — wiring point and mechanism (`withNavigationErrorHandler`, a standalone-only router feature) both change |
| `SBR-P-5` | Production builds content-hash every chunk filename, which is the mechanism that turns a stale tab's cached chunk URL into a 404/fallback-HTML response after a new deploy | `data-env` | `angular.json:83` — production config `"outputHashing": "all"` | `5bb4d1cb9` | Low — the *symptom* mechanism differs, but the fix (catch `NavigationError`, prompt refresh) is unaffected |
| `SBR-P-6` | `@angular/service-worker` is not installed — ruling out an `SwUpdate`-based alternative | `data-env` | `grep -n "service-worker" onecgiar-pr-client/package.json` → no match (checked against full dependency block) | `5bb4d1cb9` | Low — SW-based version polling would become an available alternative/complement, not a blocker to this design |
| `SBR-P-7` | `GeneralInterceptorService` (the app's one HTTP interceptor) is not and should not be the handling layer — it only rethrows on error today | `location` | `general-interceptor.service.ts:69-84` (`manageError` → `return throwError(error)`) | `5bb4d1cb9` | Low — purely confirms this is the wrong layer; doesn't change the chosen design |

**Why `shared-state` does not fire:** the design adds a *new, independent* subscriber to `Router.events` (a multicast observable). It does not modify what the two existing subscribers receive or do: `SaveButtonService` (`save-button.service.ts:345-350`, filters `NavigationEnd|NavigationCancel|NavigationError`) and `AppComponent`'s own `NavigationEnd` subscriber (`app.component.ts:56-58`) are both unaffected by a third subscriber reading the same stream.

**Why `consumer` does not fire:** no exported symbol, DOM hook, emitted event, or stored field changes. `PrToastService.add()` is called with its existing, unmodified signature; `AppComponent` gains a new *private* method and a second internal subscription, not a new public member. The one pre-existing test that exercises the touched method (`app.component.spec.ts`) is carried as the implementing task's `Consumers` field (Step 3.2 sweep), not as a Premise Ledger row, because nothing it asserts on is a changed contract.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/app.component.ts` and `app.component.html` (root shell component, already bootstrapped once per session; template edit added 2026-10-14, Pivot `SBR-P-3b` — a second `<app-pr-toast>` host).
- **New file:** one i18n copy constants file under `onecgiar-pr-client/src/app/internationalization/` (pattern: `bilateral-decision-notice.copy.ts`).
- **Reused, unmodified:** `PrToastService` (`shared/components/pr-toast/pr-toast.service.ts`), `Router` (`@angular/router`), project `logger.service.ts`.
- **No server, no database, no API surface touched.**

### 2.2 Sequence

```
[Stale tab] user clicks Bilateral link / W3 project row
  └── Router.navigateByUrl(...)
        └── lazy route resolution: import('.../bilateral.module') REJECTS
              └── Router emits NavigationError (event.error = the rejection)
                    └── AppComponent's new Router.events subscriber (ngOnInit)
                          ├── test event.error message against stale-bundle pattern
                          ├── NOT a match → no-op (existing behavior unchanged)
                          └── IS a match
                                ├── already-shown? (toasts() has key 'stale-bundle-refresh') → no-op
                                └── else → PrToastService.add({ key, severity:'warn', sticky:true,
                                              summary/detail: copy constants,
                                              action: { label, run: () => window.location.reload() } })
                                      ├── logger.service logs route + message (no secrets)
                                      └── rendered by the new <app-pr-toast key="stale-bundle-refresh" />
                                            host mounted in app.component.html (SBR-P-3b, Pivot 2026-10-14) —
                                            without this host the toast enters toasts() but never renders
```

---

## 3. Data Model

None. No entity, no migration.

---

## 4. API Surface

None. No endpoint added or changed. No bilateral/platform-report payload impact.

---

## 5. Server Workflow / Business Rules

Not applicable — this is a client-only defensive-UX fix.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route changes. The listener is wired once at the app shell (`AppComponent`), so it covers every lazy route (`loadChildren` and `loadComponent`) without touching any individual feature's routing module.

### 6.2 Components & services

- **`AppComponent` (`app.component.ts`)** — add, alongside the existing `ngOnInit()` `NavigationEnd` subscription:
  - a second `router.events` subscription filtered to `NavigationError`;
  - a private method (conceptually `isStaleBundleError(error: unknown): boolean`) matching the error's message against a small set of known dynamic-import/chunk-load failure phrasings (e.g. "Failed to fetch dynamically imported module", "Importing a module script failed", "Loading chunk ... failed");
  - a private method (conceptually `showStaleBundleBanner(): void`) that checks `prToastSE.toasts()` for the fixed key before calling `add()` (de-dup, `SBR-R-10`), then calls `add()` with the copy constants and the reload action;
  - inject `PrToastService` the same way existing injectables are wired (`inject(PrToastService)`), and the project logger.
- **`app.component.html`** — add a second `<app-pr-toast key="stale-bundle-refresh" />` host, alongside the existing `<app-pr-toast key="globalUserNotification" />` (line 91). **Added 2026-10-14 (Pivot, `SBR-P-3b`):** without this host, a toast added under the `stale-bundle-refresh` key enters `PrToastService.toasts()` but has no `<app-pr-toast>` instance filtering it in, so nothing renders — the exact dead-click symptom this spec exists to fix. This is a second *instance* of the existing component, not a new component (DD-2 still holds).
- **No new shared component.** `PrToastComponent`/`PrToastService` are reused exactly as-is (DD-2) — a second host instance of the same component, not a new one.

### 6.3 Design system usage

- No new styling — the toast renders through the existing `.pr-toast--warn` variant already defined for the `severity: 'warn'` case (pre-existing CSS, no new tokens).
- No new a11y surface: `role="alert"` and the focusable action `<button>` are pre-existing `PrToastComponent` markup (`pr-toast.component.html:5,13`).
- i18n: new `stale-bundle-refresh.copy.ts` exporting the banner title/message/action-label as a plain `as const` object — not a `TermKey` (text doesn't vary P22/P25), matching the established `*.copy.ts` pattern (`internationalization/bilateral-decision-notice.copy.ts`).

### 6.4 Real-time / notification UX

Not applicable — no socket/Pusher event, no `user-notification-settings` interaction (this is a client-local, session-scoped detection, not a server-driven notification).

---

## 7. Security & Authorization

- No new input surface, no DTO, no auth/role change.
- `window.location.reload()` takes no attacker-controlled argument.
- The logged error (route attempted + browser error message) contains no token, credential, or webhook URL — chunk-load failures carry only a JS file URL and a generic browser message (`.cursorrules` compliant).

---

## 8. Performance & Capacity

- Negligible: one additional `Router.events` subscription (already a hot, lightweight observable every page subscribes to in some form) and a string-match on the rare `NavigationError` path.
- No Lambda/bundle-size concern — this is a client-side addition of roughly a dozen lines plus a constants file.

---

## 9. Observability

- Logs (via `logger.service.ts`, never `console.log`): on detection, the attempted route URL and the underlying error message — enough to confirm in the field that the mechanism fired, without PII or secrets.
- No new `docs/prd.md` metric is directly moved by this fix; it is a defensive-UX improvement outside the M1–M4 metric set (no PRD story currently covers client resiliency to stale deploys — noted in `requirements.md` §"Required cross-references").

---

## 10. Testing Plan (forward-looking)

- One Jest unit/integration test (`app.component.spec.ts`, extended) that configures `RouterTestingModule` with a route whose `loadChildren` is made to reject with a realistic chunk-load error message, performs a real `Router.navigateByUrl()` into it, and asserts:
  1. `PrToastService.toasts()` gains exactly one entry with the expected key/summary/action;
  2. **(added 2026-10-14, Pivot `SBR-P-3b`)** after `fixture.detectChanges()`, the rendered DOM actually shows the toast's message and action button — not just the service-level list — proving the new `<app-pr-toast key="stale-bundle-refresh" />` host (added to `app.component.html`) renders it;
  3. invoking that entry's `action.run()` calls a spied `window.location.reload`;
  4. a second rejection with the same shape does **not** add a second entry (dedup, `SBR-R-10`);
  5. a `NavigationError` with an unrelated message does **not** add any entry (false-positive guard).
- This test is the mandatory Bug Mode regression test: red before the fix exists (no listener → no toast), green after.
- Coverage: client thresholds (50/60/60/60) are unaffected at this scale; `app.component.spec.ts` already contributes coverage for the touched file.

---

## 11. Backwards Compatibility & Migration Plan

- Purely additive client behavior. No contract change, no rollout flag needed (every session gets the listener on next deploy of the client itself — which is, pointedly, not affected by the very staleness this fix targets, since the fix only activates for tabs that already have the *old* bundle loaded when a *newer* one lazy-load-fails against it).
- Rollback: revert the PR; no data/schema to unwind.

---

## 12. Design Decisions (ADRs)

### `SBR-DD-1` — Detect via a `Router.events` `NavigationError` listener in `AppComponent`, not a global `ErrorHandler` or `SwUpdate`

- **Context:** need a version-portable way (NgModule-based app, `RouterModule.forRoot`, no `app.config.ts` — `SBR-P-4`) to globally catch a failed lazy-route import.
- **Decision:** extend `AppComponent.ngOnInit()`'s existing `router.events` pattern with a second subscription filtered to `NavigationError`, regex-matching the error text.
- **Alternatives considered:**
  - A global `@angular/core` `ErrorHandler` — rejected: none exists today to extend (`SBR-P-2`), and the Router already normalizes a failed lazy-load into its own `NavigationError` event rather than necessarily re-throwing to `ErrorHandler`; subscribing to the Router's own event is the more direct, documented signal.
  - `@angular/service-worker` `SwUpdate` polling — rejected: not an installed dependency (`SBR-P-6`); adds a whole PWA layer (`ngsw-config.json`, asset manifest) to solve "a user already hit a wall", which is heavier than this Lite bugfix warrants. Left as a possible future defense-in-depth layer (§13).
- **Consequences:** detection is regex-based against the browser's thrown error text — a future, differently-worded browser error could slip past undetected (§13 Open Gap). This DD adds a new subscription alongside the existing one; it reverts nothing (Step 2.3 reversion challenge: not applicable).

### `SBR-DD-2` — Reuse `PrToastService`, no new banner component

- **Context:** need a visible, actionable UI surface for the prompt.
- **Decision:** call the existing `PrToastService.add()` with `severity: 'warn'`, `sticky: true`, a fixed `key`, and an `action` running `window.location.reload()` (`SBR-P-3`).
- **Alternatives considered:** a dedicated top-of-page banner component — rejected as pure duplication of what `add()` + `action` already provides; violates the "extend existing architecture" guideline and the client source-tree guide's anti-pattern list (reimplementing an existing primitive).
- **Consequences:** visually consistent with every other toast in the app. No reversion involved. **Amended 2026-10-14 (Pivot, `SBR-P-3b`):** "no new banner component" requires one new *host element* (`<app-pr-toast key="stale-bundle-refresh" />` in `app.component.html`) — `PrToastComponent`'s rendering only activates per-key, so a toast under a new key needs a matching host instance. This was missed in the original Premise Ledger (`SBR-P-3`) and surfaced by the Reviewer on `SBR-T-1` attempt 1; see `execution.md` Pivot Record. The two hosts render independently (each filters `toasts()` by its own key) and are not expected to visually collide under normal use (the stale-bundle banner is rare and sticky; `globalUserNotification` is the app's general notification channel) — not re-verified pixel-for-pixel since both are pre-existing, unmodified rendering paths.

### `SBR-DD-3` — De-dup at the call site via a key check, not by changing `PrToastService.add()`

- **Context:** `SBR-R-10` needs repeat failures to not stack banners.
- **Decision:** before calling `add()`, `AppComponent` checks `prToastSE.toasts()` for an existing entry with the fixed key and skips if present. `PrToastService` itself is untouched.
- **Alternatives considered:** adding key-based dedup logic inside `PrToastService.add()` — rejected: `add()` is called from roughly 18 other spec-covered call sites across the app (toast consumer sweep below); changing its shared contract is exactly the `consumer`-trigger class this Lite-depth bugfix should not casually invite for an unrelated problem.
- **Consequences:** dedup logic lives at this one call site; if a second caller needs the same pattern later, promoting it into `PrToastService` is its own small follow-up (§13).

---

## 13. Open Gaps & Follow-ups

- Detection is regex/string-match based on today's known Chrome/Firefox/Safari dynamic-import error phrasings. A browser wording change, or a failure mode that doesn't surface as a `NavigationError` at all, would not be caught by this mechanism. Accepted risk for this Lite fix; a future `SwUpdate`-based proactive version check (currently blocked only by `@angular/service-worker` not being installed, `SBR-P-6`) would be a stronger, complementary layer.
- Dedup logic lives per-caller (`SBR-DD-3`); promote to `PrToastService` itself if a second caller needs the same pattern.
- **Resolved 2026-10-14 (Pivot, `SBR-P-3b`):** the originally designed toast key (`stale-bundle-refresh`) had no `<app-pr-toast>` host to render through — found by the Reviewer on `SBR-T-1` attempt 1 before merge, not in production. Fixed by adding a second host to `app.component.html`. The jsdom DOM-assertion added to the Testing Plan (§10 item 2) only proves the Angular component tree renders the toast; it does not replace the tasks.md manual smoke check for actual pixel-level visibility/positioning relative to the pre-existing `globalUserNotification` host, which remains the accepted human-check gate for that condition.

---

## Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Expected tasks | 1 |
| Expected LOC | ~75–95 (constants file ~12, `AppComponent` additions ~25–30, `app.component.html` +1 line, test ~55–75, test is the bulk) — revised 2026-10-14 (Pivot, `SBR-P-3b`) to add the new host line + one DOM-assertion test step |
| Expected review rounds | 2 (`checklist` depth — one review round already spent finding the host-key gap on attempt 1; one more expected to confirm the pivot fix) — revised 2026-10-14, was 1 |

Depth check: `Lite` was chosen in Phase 0 and the design resolves to exactly one task, now touching 4 files (was 3) under ~95 LOC — still within Lite budget. No escalation, no downgrade needed. The review-round revision reflects the pivot, not an underlying scope increase — same task, same files class, one new template line and one new host-mount line.

## Step 2.3 — Reversion Challenge

No design decision here removes, disables, or inverts existing delivered behavior — all three DDs are pure additions alongside existing, unmodified subscriptions/components. Challenge not triggered; none run.

---

## Required cross-references

- `docs/specs/bugfix/stale-bundle-refresh-prompt/requirements.md` (same folder).
- `docs/trd/trd.md:412` ("Feature modules lazy-load via their own routing module").
- `onecgiar-pr-client/src/CLAUDE.md` §21.1 (service shape, `inject()` pattern), §21.6 (i18n), §21.8 (toast row is a stale description — see note below).
- **Documentation drift note (not actioned here):** `onecgiar-pr-client/src/CLAUDE.md` §2.1's "Toast" table row still describes `MessageService` + `ToastModule` (PrimeNG-era). The actual mechanism is `PrToastService`/`PrToastComponent` (confirmed primary-source citation, `SBR-P-3`). Per shared-file write discipline this spec does not edit that `CLAUDE.md`; flagging for `/akili-audit` to pick up as persona/doc drift.
