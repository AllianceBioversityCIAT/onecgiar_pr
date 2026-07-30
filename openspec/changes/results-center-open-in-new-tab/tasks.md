## 1. Frontend — Case A: real links for standard results

- [x] 1.1 In `results-list.component.ts`, extract the branch logic of `navigateToResult()` into `getResultLink(result)` / `getResultQueryParams(result)`, backed by a private `getResultRoute()` that caches one `ResultRoute` per result so `routerLink` keeps a stable object identity across change detection.
- [x] 1.2 Refactor `navigateToResult()` to build its URL from those helpers (now `router.navigate(commands, { queryParams })`), keeping the Case B side effects so lines 83 and 112 keep working.
- [x] 1.3 In `results-list.component.html` line 86, swap the `(click)` navigation for `[routerLink]` + `[queryParams]`. `RouterModule` was already imported in `results-list.module.ts:31` — no module change needed.
- [x] 1.4 Anchor still fills the cell; no SCSS change was required (verified in the browser, screenshot `final-01-results-center.png`).

## 2. Frontend — Case B: deep-linkable review drawer

- [x] 2.1 Checked the existing convention in `result-framework-reporting` (`center`, `search`, `phase`) → params named **`reviewResult`** (code) and **`reviewResultId`** (id), exported from `bilateral-results.service.ts`.
- [x] 2.2 In `results-review-table.component.ts`, read both params from `ActivatedRoute` and, once `tableResults()` is populated, open the drawer through the existing `reviewResult()`. Fires once.
- [x] 2.3 Clear both params afterwards with `router.navigate([], { relativeTo, queryParamsHandling: 'merge', replaceUrl: true })`.
- [x] 2.4 Miss case handled: the list renders with no drawer and no error when neither the code matches nor an id is given.
- [x] 2.5 In-screen review action and the notifications entry point left untouched — both verified unchanged.
- [x] 2.6 **Added after a finding (see design.md F1):** results not present in the review list — drafts in `Editing` status — fall back to a minimal `{ id, result_code }` object built from the params, so the drawer still opens.
- [x] 2.7 **Regression fix:** the anchor keeps an `onResultLinkClick($event, result)` handler that preloads the drawer state on a plain left click only, returning early on ctrl/cmd/shift/alt or a non-primary button. Without it, plain clicks on drafts stopped opening the drawer.

## 3. Unit tests (client, Jest)

- [x] 3.1 `results-list.component.spec.ts`: `getResultLink` / `getResultQueryParams` for AVISA-approved, `status_name === 'Approved'` and the default fallback → all resolve to the result detail with `phase`.
- [x] 3.2 Case B branch → resolves to the results-review screen carrying `reviewResult` + `reviewResultId`.
- [x] 3.3 `navigateToResult()` still sets `currentResultToReview` / `showReviewDrawer` for a W3/Bilaterals result pending review; plus a test asserting the route objects are cached (stable identity).
- [x] 3.4 `results-review-table.component.spec.ts`: param opens the drawer once results load, params are cleared afterwards, unknown param leaves the drawer closed without throwing, id fallback opens the drawer, and the list object wins over the id fallback.
- [x] 3.5 New `onResultLinkClick()` tests: plain click preloads state; ctrl/cmd/shift/middle click does not; non-bilateral results do not.
- [x] 3.6 Full suite green — **378 suites / 3993 tests** — with coverage above the gate (branches 65.34% ≥ 50, functions 81.55% ≥ 60, lines 84.37% ≥ 60, statements 83.91% ≥ 60).

## 4. Verification in the app (Playwright)

> Ports 4200 and 4300 were already in use by other sessions, so the client ran on **4500** (`npm start -- --port 4500`), pointing at the prtest backend. The worktree had no `node_modules` and no `src/environments/` — both were provisioned before running.

- [x] 4.1 Case A — link format `/result/result-detail/{code}/general-information?phase={version}`.
- [x] 4.2 Case A — plain left click navigates in the same tab, no full reload.
- [x] 4.3 Case A — middle click opens a new background tab on the result detail; the original tab stays on the Results Center.
- [x] 4.4 Case A — ctrl/⌘+click opens a new tab. Right-click "Open link in new tab" is covered by the presence of a resolved `href` (the native menu cannot be automated).
- [x] 4.5 Case B — plain click still opens the drawer for a draft (no regression), and middle click opens it in a new tab with the drawer already open.
- [x] 4.6 Case B — deep link works for a result in review (code 8339); params are cleared; refreshing does NOT reopen the drawer; a bogus code degrades with no drawer and no console error.
- [x] 4.7 Screenshots saved to `.local-screenshots/` (gitignored): `final-01` … `final-04`, plus the earlier diagnosis set. `final-02` (plain click) and `final-03` (new tab) are identical for the same draft.

## 5. Gate before handing over

- [x] 5.1 `npm run lint` → **All files pass linting**.
- [x] 5.2 `npx tsc --noEmit` → 0 errors; `npx jest --coverage` → green, thresholds met.
- [x] 5.3 Jira ticket created and documented: **P2-3203** — "Results Center - Allow opening a result in a new browser tab (middle click and right click)" (Enhancement, Open, assigned to Yecksin). Handed over to Ángel Jarrín on Slack for testing.
- [ ] 5.4 Commit with `✨ feat(results-list) P2-3203: …` and push to dev. The AI does not run git write commands — pending on the user.
