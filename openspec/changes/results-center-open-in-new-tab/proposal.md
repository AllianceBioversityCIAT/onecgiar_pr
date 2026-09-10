## Why

Users cannot open a result from the Results Center in a new browser tab: middle-click and right-click → "Open link in new tab" do nothing, because the result title is rendered as an anchor **without an `href`** and navigation happens only through a JavaScript `(click)` handler.

This blocks a normal review workflow — opening several results side by side in separate tabs — and was requested directly by Ángel Jarrín (Product) on 2026-07-28: *"que cuando se le dé clic a un resultado en el Result Center abra en una nueva pestaña… habilitar el clic derecho new tab, y clic central"*, explicitly *"aplica a los dos"* (both navigation cases).

**Scope: frontend-only.** No backend change is required — both destination URLs already exist and are served by the existing Angular routes.

**Jira ticket:** **P2-3203** (Enhancement) — created from Ángel Jarrín's direct Slack request (DM, 2026-07-28).

## What Changes

- The result title in the Results Center table becomes a **real link** (`routerLink` → renders an `href`), so the browser natively supports:
  - left click → same-tab navigation (unchanged behaviour),
  - middle click / ⌘+click / Ctrl+click → new tab,
  - right click → native "Open link in new tab / new window" context menu.
- **Case A — standard results and approved W3/Bilaterals (AVISA):** link points to `/result/result-detail/{result_code}/general-information?phase={version_id}`. Behaviour is preserved exactly; only the mechanism changes from `router.navigateByUrl()` to a declarative link.
- **Case B — W3/Bilaterals results pending review:** today the destination screen relies on an **in-memory signal** (`currentResultToReview`) to open the review drawer, which a fresh tab cannot have. The result identity moves into the **URL as a query param**, and the results-review screen opens the drawer from that param once its data has loaded. This makes the deep link self-sufficient and identical in the current tab and in a new tab.
- Programmatic navigation after creating a result (`results-list.component.ts` lines 83 and 112) keeps working through the same URL builders — single source of truth, no duplicated URL strings.

No breaking changes: every existing entry point keeps its current behaviour on a plain left click.

## Capabilities

### New Capabilities
- `results-center-result-links`: how a result row in the Results Center is linked and navigated — real anchors, native new-tab support, and the deep-linkable review drawer for W3/Bilaterals results pending review.

### Modified Capabilities
<!-- None. No existing spec under openspec/specs/ defines Results Center navigation. -->

## Impact

**Affected code (client only):**
- `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.html` — line 86, the `<a (click)=…>` that wraps every cell's content.
- `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts` — `navigateToResult()` (lines 367-385) refactored into reusable URL builders.
- `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.module.ts` — may need `RouterModule` in `imports` for `routerLink`.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-results/components/results-review-table/results-review-table.component.ts` — reads the new query param and opens the review drawer once `tableResults` is populated.

**Not affected:** backend, API contracts, database, `result-review-drawer` internals, and the notifications entry point (`notification-item.component`), which keeps its current behaviour.

**Baseline docs consulted:** `docs/ux-ui/design.md` (navigation and interaction patterns for the client UI) and `docs/trd/trd.md` (frontend state / routing). No module spec under `docs/specs/` currently covers Results Center navigation.

**Risk:** low for Case A (declarative equivalent of existing navigation), moderate for Case B — it touches the bilateral review screen, which already carries changes on the `staging-front-upload` branch. Mitigated by keeping the signal-based path working as a fallback.

**Verification:** browser check with Playwright on `localhost:4200` — plain click, middle click and right-click → "Open link in new tab", for both Case A and Case B.
