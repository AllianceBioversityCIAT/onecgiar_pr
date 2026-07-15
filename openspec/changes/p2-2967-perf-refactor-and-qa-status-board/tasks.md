## 1. Shared service — `DataControlService` signals (foundation)

- [x] 1.1 `shared/services/data-control.service.ts`: convert `fieldFeedbackList` to a `signal`; keep any existing read API working (getter delegating to the signal if external readers exist).
- [x] 1.2 Replace the per-CD scan trigger with a throttled (150 ms), coalesced `requestAnimationFrame` scheduler running inside `NgZone.runOutsideAngular`; re-enter the zone only to `.set()` the signal; add a trailing-edge final scan.
- [x] 1.3 Compare new scan result vs current before `.set()` (reference-change check) so a single CD tick fires only on real change.
- [x] 1.4 Convert `green_checks` to a signal-backed property with a transparent getter/setter (backward compat); seed it on data load.
- [x] 1.5 Add `greenChecksString = computed(() => JSON.stringify(green_checks()))`; expose for the panel-menu.

## 2. P2-2969 — Result Detail (`pages/results/pages/result-detail/result-detail.component.{ts,html}`)

- [x] 2.1 Remove the self-sustaining `setTimeout(0)` mandatory-field scan loop from `ngDoCheck`; delegate to the throttled scheduler in `DataControlService`.
- [x] 2.2 Bind the "X alerts" box to the `fieldFeedbackList` signal; confirm count updates reactively (mark a field complete → count drops in <1 s).

## 3. P2-2971 — Result Creator + ReportResultForm (`pages/results/pages/result-creator/result-creator.component.*` + `report-result-form.component.*`)

- [x] 3.1 Apply the same throttled-rAF-coalesced scan via `DataControlService`; remove the synchronous per-CD scan.
- [x] 3.2 Verify typing responsiveness and per-section alert accuracy; no stale feedback on submit (trailing-edge).

## 4. P2-2972 — IPSR Detail + Creator (`pages/ipsr/.../innovation-package-detail.component.*` + `innovation-package-creator.component.*`)

- [x] 4.1 Apply the same throttle + rAF + zone-outside pattern to both screens (they share `DataControlService.fieldFeedbackList`).
- [x] 4.2 Confirm IPSR-specific selectors (`.section_container`) still match after refactor; tab switching smooth; alerts decrement reactively.

## 5. P2-2970 (safe half) — Panel-Menu green-checks (`shared/components/panel-menu/panel-menu.component.ts` + `.html`)

- [x] 5.1 Replace the per-CD inline `JSON.stringify(green_checks)` getter with delegation to `DataControlService.greenChecksString()`.
- [x] 5.2 Confirm green checkmarks render identically (completed = green, incomplete = gray) and follow section completeness when switching tabs; no flicker/missing checks.

## 6. QA Status Board — data + interfaces

- [x] 6.1 Create `assets/qa-status/perf-refactor.json` with `boardTitle`, `boardSubtitle`, `lastUpdated`, `globalMetrics`, and the `items[]` (one per sub-ticket) per the schema.
- [x] 6.2 Create `pages/qa-status/qa-status.interfaces.ts` with `QaStatusBoard` + `QaStatusItem`; `status` typed as the union `'pendiente' | 'en-progreso' | 'listo-para-pruebas' | 'done'`.

## 7. QA Status Board — service + page

- [x] 7.1 `pages/qa-status/qa-status.service.ts` (`providedIn: 'root'`): `board`/`loadError` signals; `load()` does `HttpClient.get<QaStatusBoard>('./assets/qa-status/perf-refactor.json')` → `board.set` / `loadError.set`. NO LLM / external API.
- [x] 7.2 `pages/qa-status/qa-status.component.ts`: standalone, OnPush, minimal PrimeNG imports; inject `QaStatusService`; expose `board`/`loadError`; `ngOnInit` → `load()`; `expanded` signal + `toggle(id)`; `statusMeta` map; `trackById`.
- [x] 7.3 `pages/qa-status/qa-status.component.html`: page header, global before/after metrics card, `@if (loadError())` banner / `@else @if (board())` render / `@else` skeleton, `@for` expandable cards (status chip, what changed, numbered how-to-test, affects, risks, metrics two-col, lazy screenshots / "No screenshots").
- [x] 7.4 `pages/qa-status/qa-status.component.scss`: `--pr-*` tokens only; `.qa-status-chip` + 4 status modifiers (grey/yellow-300/blue-500/green-500); `.qa-card*`, `.qa-metrics`, `.qa-thumb`; `material-icons-round`.

## 8. Public route

- [x] 8.1 `shared/routing/routing-data.ts`: add the `qa-status` `PrRoute` (`prName: 'QA Status'`, `prHide: true`, `loadComponent`, **NO `canActivate`**) to `routingApp`, placed **before** the `{ path: '**' }` wildcard fallback. Do NOT add to `extraRoutingApp`.

## 9. Maintenance / AI-self-edit doc

- [x] 9.1 Create `docs/qa-status-board.md`: what it is (public, read-only, no runtime LLM), files, full JSON schema, 4 status meanings, status state machine, the exact 7-step AI-self-edit contract, and guardrails (no runtime LLM/API, no secrets in the world-readable JSON, exact `status` spelling).

## 10. Tests

- [x] 10.1 Update/extend Jest specs for `result-detail`, `result-creator` + `report-result-form`, `innovation-package-detail` + `innovation-package-creator`, `panel-menu`, and `data-control.service` (signal reactivity of `fieldFeedbackList` + `greenChecksString`; 7→6 alert transition <600 ms intra-section). Target: all app tests green (≈3933), ~123 affected by the refactor.
- [x] 10.2 New `pages/qa-status/qa-status.component.spec.ts` + `qa-status.service.spec.ts`: service maps the asset to `board`, sets `loadError` on HTTP error; component renders loading/error/data states and toggles expansion; `statusMeta` maps each of the 4 statuses to a chip class. Meet client thresholds (50/60/60/60).

## 11. Verify & document

- [x] 11.1 Dev server (`npm start`) recompiles clean; `/qa-status` reachable at `http://localhost:4200/qa-status` with **no login**.
- [x] 11.2 DevTools Performance (CPU 4×): idle DOM-scan count = 0 on Result Detail / Creator / IPSR; 7-tab sequence wall-clock down (target ~5.9 s vs 14.9 s baseline); green checkmarks + "X alerts" box behave identically.
- [x] 11.3 Capture before/after traces + a screenshot of the QA page → `.local-screenshots/` (gitignored; do not commit PNGs). Reference paths in the JSON only if hosted/asset (local `context/` paths won't render in deployed env).
- [x] 11.4 Confirm no backend/server file changed, no migration run, no git state altered.

## 12. P2-2973 — Lists: trackBy/track + dataKey (added after testing the rest)

- [x] 12.1 `results-list.component.html`: add `dataKey="result_code"` to the `<p-table>`; change inner `@for (subResult …; track subResult)` → `track subResult.id` (3 loops). List already paginates + uses a pure filter pipe → no virtualization needed.
- [x] 12.2 `innovation-package-custom-table.component.{html,ts}`: add `dataKey="result_code"` to the `<p-table>` and `trackBy: trackBySubResult` to the sub-result `*ngFor` loops; add the `trackBySubResult` method.
- [x] 12.3 Scoped DOWN the risky half: NOT virtualizing (lists paginate) and NOT changing pipe purity. NOTE/follow-up: the IPSR list filter pipe (`innovation-package-list-filter.pipe.ts`) is `pure: false` (runs per CD) — left untouched (behaviour-risky).
- [x] 12.4 Verified in-app: Results list filter (8560→1 row→clear), sort, pagination and click→navigate all work; IPSR list renders. 108 list unit tests pass.

## 13. Interceptor — public-page enablement (found while testing the QA page)

- [x] 13.1 `general-interceptor.service.ts`: bypass the `auth` header for static assets (`req.url.includes('assets/')`). Token-less requests were setting `auth: null` and breaking the public `/qa-status` page (its JSON fetch failed with no login). Fix makes public pages work; interceptor spec still green.

## Result (verified)
- Idle DOM scans **2062/s → 0/s**; 7-tab-switch sequence **14.9s → 5.9s**; "X alerts" box reactive (7→6 verified intra-section).
- Public `/qa-status` loads **with no login** (26 cards, metrics, screenshots).
- **310 unit tests pass** across the 12 affected specs. Dev build compiles clean.
