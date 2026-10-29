# Module Spec — `requirements.md`

**Spec:** `bugfix/stale-bundle-refresh-prompt` · **Depth:** Lite · **Mode:** Bug Mode (no prior `proposal.md`) · **Status:** draft

---

## 1. Document Control

- **Module:** `bugfix` (client-only — Angular shell / routing)
- **Sub-feature:** `stale-bundle-refresh-prompt`
- **Owner:** M. Giraldo (QA)
- **Status:** draft
- **Ticket(s):** none supplied — reproduced on TEST 2026-10-13, no P2 ticket number given
- **Type:** Bug
- **Approval Mode:** interactive (no `proposal.md`; each phase gate waits for explicit user input)
- **Delegation note:** Step 0/2.1 exploration was delegated to an `Explore` scout (announced as background, duration unannounced-but-short); it returned in ~2.5 min with file:line citations, consumed below. No fallback needed.

---

## 2. Executive Summary

After a new client deploy, a browser tab that still holds the previous `index.html`/bundle references a lazy-loaded chunk (e.g. the Bilateral module) by its **old, now-404ing hash**. Angular's Router catches the failed dynamic `import()` as a `NavigationError`, but **nothing in the app currently listens for it** — so the click that triggers the lazy load produces zero visible feedback. The user sees a dead click and concludes the module is broken; only a hard reload fixes it.

This spec adds a global listener for exactly this `NavigationError` shape and reuses the app's existing toast mechanism (`PrToastService`) to show a sticky "refresh to continue" banner with a one-click reload action. No new UI component, no server change, no new dependency.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| Stale bundle | The browser tab is still running JS built against a previous deploy's chunk-hash map. |
| Chunk-load failure | A lazy route's `loadChildren`/`loadComponent` dynamic `import()` rejects — in this repo, because the server returns the SPA's `index.html` (HTTP 200) for a chunk URL whose hash no longer exists. |
| `NavigationError` | An `@angular/router` event the `Router` emits when a route's resolution (including a lazy-load `import()`) throws or rejects. |

---

## 4. System Context & Scope

Claims about current behavior (citations as run, commit `5bb4d1cb9`):

- The Bilateral module is lazy-loaded via `loadChildren: () => import('../../pages/bilateral/bilateral.module')` — `onecgiar-pr-client/src/app/shared/routing/routing-data.ts:133-134`. Its `result/:id` child route (the `/bilateral/{CENTER}/result/{code}` path in the bug report — the live param name is `:id`, composed with the parent `:acronym` param) is a further `loadComponent` entry — `onecgiar-pr-client/src/app/pages/bilateral/bilateral-routing.module.ts:6-11` + `routing-data.ts:734-740`.
- "Where to report" has no route of its own; its W3 project rows are `[routerLink]="['/bilateral', center.acronym, 'home']"` — `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-entry-hub/reporting-entry-hub.component.html:318` — so clicking one triggers the exact same `BilateralModule` lazy chunk load cited above.
- No stale-bundle / chunk-load / version-check mechanism exists today. Verified absent by (commands run against the repo root, excluding `node_modules`): `grep -rn "ChunkLoadError" src` → no hits; `grep -rn "dynamically imported module\|Failed to fetch dynamically" src --include="*.ts"` → no hits; `grep -rln "SwUpdate\|VersionReady\|VersionEvent" src --include="*.ts"` → no hits; `find . -iname "ngsw-config.json" -not -path "./node_modules/*"` → no file; `grep -n "service-worker" onecgiar-pr-client/package.json` → no match. The one `"stale"`-named file found (`shared/constants/app-version.constants.ts:37`) is a manually-bumped display string shown in the sidebar for humans to eyeball — it performs no comparison or check.
- `GeneralInterceptorService`'s error path only rethrows (`return throwError(error)`) — `onecgiar-pr-client/src/app/shared/interceptors/general-interceptor.service.ts:69-84` — it does not and should not handle router-level navigation errors (it's an HTTP interceptor, not a router listener).
- A general-purpose toast mechanism already exists and already supports everything this bug needs: a sticky (non-auto-dismissing) toast with a one-click action button — `PrToastService.add()` at `onecgiar-pr-client/src/app/shared/components/pr-toast/pr-toast.service.ts:11-23,36-42`; each rendered toast carries `role="alert"` (an ARIA live region) — `onecgiar-pr-client/src/app/shared/components/pr-toast/pr-toast.component.html:5`. Registered app-wide — `onecgiar-pr-client/src/app/app.module.ts:19,53`.
- `AppComponent` already subscribes to `this.router.events` (filtered to `NavigationEnd`) in `ngOnInit()` to drive the sidebar layout — `onecgiar-pr-client/src/app/app.component.ts:56-58` — the natural, already-established place to add a sibling subscription filtered to `NavigationError`.
- Production builds content-hash every chunk filename (`"outputHashing": "all"` — `onecgiar-pr-client/angular.json:83`), which is the mechanism that makes a stale tab's cached chunk URL go missing the moment a new deploy ships.
- The app is NgModule-based, not standalone (`main.ts` calls `platformBrowserDynamic().bootstrapModule(AppModule)`; no `app.config.ts` exists), and the root `Router` is configured via `RouterModule.forRoot(...)` in `app-routing.module.ts` (per `onecgiar-pr-client/src/CLAUDE.md` §2.2) — this rules out the standalone-only `provideRouter(..., withNavigationErrorHandler(...))` router feature as the wiring point; a `Router.events` subscription is the version-portable mechanism.

---

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Result submitter / Center staff (reporting flows, incl. W3 "Where to report") | Sees a clear, actionable prompt instead of a dead click after a deploy. |
| Bilateral result author/reviewer | Same — this is the reproduction path from the bug report. |
| QA / support | Fewer "the module doesn't work" tickets that are actually stale-tab issues. |

---

## 6. Functional Requirements

### Required (MUST)

- **`SBR-R-1`** The system MUST detect a lazy-route dynamic-import failure (an `@angular/router` `NavigationError` whose underlying error message matches a chunk-load/dynamic-import failure pattern) and MUST NOT leave the triggering click with no visible effect.
- **`SBR-R-2`** When `SBR-R-1` fires, the system MUST show a visible, sticky banner/toast reading "A new version of PRMS is available — refresh to continue" (exact string owned by a new i18n copy constant, not hardcoded inline).
- **`SBR-R-3`** The banner MUST offer a one-click action that reloads the page via a full browser reload (fetches fresh `index.html` + current hashed bundles).
- **`SBR-R-4`** Detection MUST be wired once, globally (app-root level), so it covers every lazy route — not just Bilateral — but this spec's test obligation is scoped to `/bilateral/**` per the user's acceptance criteria.

### Should (SHOULD)

- **`SBR-R-10`** The system SHOULD avoid showing duplicate/stacked banners if more than one stale-bundle `NavigationError` fires before the user acts (e.g. rapid double-click), falling back to a single reused toast (keyed) if a second failure arrives while the first is still visible.

#### Scenario: Main case — stale tab clicks into a Bilateral result

- GIVEN a browser tab still running a previous deploy's bundle
- WHEN the user clicks a Bilateral result link (`/bilateral/{CENTER}/result/{code}`) or a W3 project row inside "Where to report" (which routes through the same `/bilateral/:acronym/home` → lazy `BilateralModule` chunk)
- AND the dynamically-imported chunk fails (the stale chunk URL 200s with `index.html` instead of JS, or any equivalent network/import failure)
- THEN the app's root-level listener receives the Router's `NavigationError`
- AND a sticky toast is shown with the approved copy and a "Refresh now" action
- BUT it must NOT leave the click silently doing nothing
- AND IT MUST NOT be a one-shot flag that stops working after the first failure in the session (each qualifying `NavigationError` must be evaluated, not just the first)

#### Scenario: User acts on the banner

- GIVEN the banner is visible
- WHEN the user clicks "Refresh now"
- THEN `window.location.reload()` is invoked
- AND IT MUST result in the browser requesting the server's current `index.html` and the current hashed chunk (not a cached stale copy — ordinary browser reload behavior, no special cache-busting code needed since the index/document request is not itself content-hashed)

#### Scenario: Unrelated navigation errors are not mistaken for a stale bundle

- GIVEN a `NavigationError` fires for a reason unrelated to a chunk-load failure (e.g. a guard rejects navigation, a 404 route)
- WHEN the listener evaluates it
- THEN it MUST NOT show the stale-bundle banner
- BUT it MUST NOT suppress or interfere with whatever existing handling that other `NavigationError` already receives (none today, per System Context — so this is a no-op for the unrelated case, not a new path to maintain)

#### Scenario: Duplicate failures do not stack banners

- GIVEN the stale-bundle banner is already visible
- WHEN a second stale-bundle `NavigationError` fires before the user has acted
- THEN the existing toast is reused (same key) rather than a second toast being added
- BUT it must NOT silently reset the first toast's visible lifetime in a way that could auto-dismiss it before the user notices (toast is sticky, so no lifetime to reset — note only applies if a future change removes `sticky`)

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | Reuses `PrToastComponent`'s existing `role="alert"` live region (`pr-toast.component.html:5`) — no new a11y surface introduced; "Refresh now" button MUST be a real focusable `<button>` (already true of `PrToastAction` rendering). |
| **Performance** | No bundle-weight impact beyond a few lines in `AppComponent` + one new constants file; no polling, no new dependency. |
| **Backwards compatibility** | No API, DTO, or payload change. Pure client behavior addition. |
| **i18n** | Banner copy MUST live in a new `*.copy.ts` constant under `src/app/internationalization/` (established pattern, e.g. `bilateral-decision-notice.copy.ts:17-26`) — not a `TermKey` (the string doesn't vary P22/P25). |
| **Observability** | The caught error SHOULD be logged via the project logger (`logger.service.ts`, not `console.log`) with the route URL and error message — no tokens/secrets present in a chunk-load error, so no `.cursorrules` conflict. |
| **Security** | No new input surface; `window.location.reload()` takes no attacker-controlled argument. |

---

## 8. Defect Classes → Gates

| Defect class | Gate |
|---|---|
| Detector doesn't fire on a real lazy-route import failure | Jest test driving a real `Router.navigateByUrl()` against a route configured to reject its `loadChildren`, asserting the toast appears (integration-level, not a hand-built event object — see `design.md` Falsifier). |
| Detector fires on unrelated `NavigationError`s (false positive) | Same test suite, negative case: a `NavigationError` with an unrelated message MUST NOT add the toast. |
| Duplicate toasts stack | Same test suite: firing the qualifying error twice asserts only one matching toast entry exists. |
| Wrong/unapproved copy string | Test asserts the toast `detail`/`summary` exactly matches the new copy constant (compile-time single source of truth) — copy wording itself is a human/HITL call at Phase 1 approval, not re-litigated by the test. |
| TypeScript/template compile defect | `npm run build` (stricter than Jest's ts-jest transform for templates — see `onecgiar-pr-client/src/CLAUDE.md` §21.8 gotcha on `tsc --noEmit` not type-checking templates). |
| Visual/geometry defect (banner clipped, mis-positioned) | **Accepted as out of scope.** `PrToastComponent`'s rendering is pre-existing, already in production for every other toast in the app, and unchanged by this spec — we only add a new caller of its existing `add()` API. No new rendered-measurement checklist applies because no new DOM/CSS is introduced. |

No class is left both unmeasured and unsubstituted.

---

## 9. Requirement ID Index

| ID | Summary |
|---|---|
| `SBR-R-1` | Detect stale-bundle `NavigationError`, no silent dead click |
| `SBR-R-2` | Show sticky "new version available" banner |
| `SBR-R-3` | One-click reload action |
| `SBR-R-4` | Global wiring, test scope ≥ `/bilateral/**` |
| `SBR-R-10` | No duplicate/stacked banners |

---

## Required cross-references

- `docs/prd.md` — no existing `US-*`/`AC-*` covers client resiliency to stale deploys; this is a net-new defensive behavior, not a refinement of a cited PRD story.
- `docs/ux-ui/design.md` — no existing screen/flow section describes this state; `design.md` (this spec) will note it as a new transient system-level banner, not a page-level component.
- `docs/trd/trd.md` §"Feature modules lazy-load via their own routing module" (trd.md:412) — this spec operates exactly at that seam.
- `onecgiar-pr-client/CLAUDE.md`, `onecgiar-pr-client/src/CLAUDE.md` — routing (§7 / §4), toast/service conventions (§21.1), i18n pattern (§11 / §21.6).
