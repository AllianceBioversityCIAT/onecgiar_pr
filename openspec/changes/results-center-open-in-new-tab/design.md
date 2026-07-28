## Context

The Results Center table (`results-list.component.html`) renders each cell's content inside `<a [class]="column.class" (click)="navigateToResult(subResult)">` — an anchor with **no `href`**. Browsers only treat an anchor as a link when it has an `href`, so today middle-click and the right-click context menu offer nothing, and navigation exists only as a JS side effect.

`navigateToResult()` (`results-list.component.ts:367-385`) has two branches:

| Case | Condition | Destination |
|---|---|---|
| **A** | `isW3BilateralsAvisa(result)` or `status_name === 'Approved'`, plus the default fallback | `/result/result-detail/{result_code}/general-information?phase={version_id}` |
| **B** | `source_name === 'W3/Bilaterals'` (pending review) | `/result-framework-reporting/entity-details/{submitter}/results-review` **+** `currentResultToReview.set(result)` **+** `showReviewDrawer.set(true)` |

Case B is the hard one: the review drawer opens from **in-memory signals** on `BilateralResultsService`, not from the URL. A new tab boots a fresh Angular app with `currentResultToReview = null`, so the deep link would land on the review list with no drawer.

**Data flow today (Case B):** `GET_ResultToReview(entityId, centers)` → `bilateralResultsService.tableResults` (flattened `ResultToReview[]`) → `results-review-table.component.html` rows → `reviewResult(result)` sets both signals → `<app-result-review-drawer [(visible)] [(resultToReview)]>` renders. The drawer consumes the whole `ResultToReview` object (`status_id`, and more at lines 878 / 1570 / 1604), not just an id — so a new tab must recover the **object**, which is only available after the list request resolves.

**Other consumers of the same signals** (must keep working unchanged):
- `results-review-table.component.ts:106-107` — the in-screen "review" action.
- `notification-item.component.ts:130-133` — the notifications entry point.
- `results-list.component.ts:83` and `:112` — programmatic navigation right after creating/updating a result.

**Constraint:** `RouterModule` is already in `results-list.module.ts:31`, so `routerLink` needs no module change.

## Goals / Non-Goals

**Goals:**
- Result titles in the Results Center behave as real links: middle-click, ⌘/Ctrl+click and right-click → "Open in new tab" all work natively.
- Plain left-click keeps the exact current behaviour for both cases (same tab, same destination, drawer opens for Case B).
- A Case B URL is **self-sufficient**: pasted into a fresh tab it opens the review drawer for the right result.
- One source of truth for URL construction, shared by the template link and the programmatic navigation.

**Non-Goals:**
- Changing the review drawer's internals or its data contract.
- Making the notifications entry point (`notification-item`) deep-linkable — out of scope for this request.
- Any backend change; no new endpoint, no payload change.
- Reworking the Results Center table layout or the other columns (the `[href]` on line 139 stays as is).

## Decisions

### D1 — `routerLink` + `queryParams` instead of `[href]` + click interception

Use Angular's `routerLink` on the anchor rather than a raw `[href]` with a manual `(click)` handler.

*Why:* `routerLink` renders a real `href` (which is what unlocks middle-click and the context menu) **and** already intercepts plain left clicks for in-app SPA navigation while deliberately letting modified clicks (Ctrl/⌘/Shift/middle) fall through to the browser. A raw `[href]` would force us to hand-roll that modifier logic in a click handler — more code, easy to get wrong.

*Alternative considered:* `[href]` + `(click)="$event.preventDefault(); navigateToResult(...)"`. Rejected: it reimplements what `routerLink` already does correctly, and a missed modifier check causes a full page reload.

*Alternative considered:* `target="_blank"` by default. Rejected — Ángel asked to **enable** new-tab, not to force it; forcing it would change the default behaviour for every user.

### D2 — Case B carries the result identity in the URL, not only in a signal

Append a query param (e.g. `?reviewResult={result_code}`) to `/result-framework-reporting/entity-details/{submitter}/results-review`.

*Why:* it is the minimum needed to make the link self-sufficient. The destination screen already fetches the full list; matching the param against `tableResults` after the request resolves recovers the same `ResultToReview` object the drawer expects — no new endpoint, no new payload.

*Alternative considered:* serializing the whole result object into the URL or into `sessionStorage`. Rejected: fragile, leaks payload shape into the URL, and breaks as soon as the result changes server-side.

*Alternative considered:* a dedicated `GET result by code` call on the review screen. Rejected as unnecessary — the list request already returns the object; adding a second call would duplicate state and risk drift.

### D3 — The signal path stays as a fallback, it is not replaced

On plain left click the existing `currentResultToReview.set(...)` still runs; the query param is additive. The destination screen only opens the drawer *from the param* when the drawer is not already open.

*Why:* minimal, incremental change (per the project's investigate-before-modify rule). The in-screen action and the notifications entry point keep working untouched, and if the param lookup finds nothing the screen simply shows the list — degraded, never broken.

### D4 — Clean the query param after opening the drawer

Once the drawer opens from the param, replace the URL (`router.navigate([], { queryParams: {…}, replaceUrl: true })`) to drop it.

*Why:* prevents the drawer from re-opening on refresh, back-navigation, or after the user closes it and the screen re-renders.

### D5 — URL builders live in the component, returning `routerLink` + `queryParams` pairs

Extract two small helpers (e.g. `getResultLink(result)` / `getResultQueryParams(result)`) mirroring the existing branch logic; `navigateToResult()` is refactored to consume them.

*Why:* the template and the programmatic path must never drift apart. Keeps the branch logic in one place, testable by unit tests without a DOM.

## Risks / Trade-offs

- **[Case B new tab races the list request]** → the param lookup must run *after* `getResultsToReview()` resolves and `tableResults` is populated, not in `ngOnInit`. Implement as a reaction to the populated signal, guarded so it fires once.
- **[The result code is not in the loaded list]** (different center filter, already reviewed, or a stale link) → no drawer opens; the user sees the review list. Acceptable degraded state — must not throw or blank the screen.
- **[This branch already carries bilateral changes]** (`staging-front-upload`) → touching `results-review-table.component.ts` risks conflicts. Mitigated by keeping the addition small and additive (no refactor of existing methods there).
- **[`<a>` nested inside a `<td>` with `cursor: pointer`]** → the anchor must fill the cell so the clickable area does not shrink; verify styling did not change visually after adding `routerLink`.
- **[Regression on programmatic navigation]** (`results-list.component.ts:83`, `:112`, after creating a result) → covered by refactoring through the shared builders plus a unit test per branch.
- **[Client coverage gate: branches 50% / functions 60% / lines 60% / statements 60%]** → new branch logic needs unit tests, or the gate can drop below threshold.

## Migration Plan

Not applicable — no data migration, no API change. Deploy is the normal client build. Rollback = revert the commit; nothing persists in the database or in user state.

## Findings during implementation

### F1 — The review list does not contain every deep-linkable result

Verified against prtest: `GET /api/results/by-program-and-centers?programId=SP01` returns 152 results, and the two W3/Bilaterals rows the Results Center links to (codes 8677 and 8676) are **not among them** — both are in status **`Editing`**, i.e. drafts that were never submitted for review.

This invalidated the original D2 assumption ("the destination screen already fetches the list, so matching by code recovers the object"). Matching by code alone works only for results already in review.

**Consequence:** removing the `(click)` handler in favour of a pure `routerLink` broke the plain-click behaviour for drafts — the drawer stopped opening, because nothing populated `currentResultToReview` and the code was not in the list. Caught by browser verification, not by unit tests.

**Resolution (supersedes part of D2 and D3):**
1. The Case B link also carries **`reviewResultId={result.id}`**. The drawer loads its content with `loadResultDetail(result.id)`, so the id is enough to render it.
2. `results-review-table` prefers the object found in the list (complete) and falls back to a minimal `{ id, result_code }` object built from the params when the result is not in the list.
3. The anchor keeps a `(click)` handler — `onResultLinkClick()` — that only preloads the drawer state on a **plain** left click and returns early on ctrl/cmd/shift/alt or a non-primary button, so opening a new tab never mutates the current tab's state. `routerLink` still owns the navigation.

Verified in the browser: for the same draft, the drawer rendered in a new tab is identical to the one rendered by a plain click.

## Open Questions

- ~~Query param name~~ — **resolved**: `reviewResult` + `reviewResultId`, matching the existing lowercase convention on the bilateral screens (`center`, `search`, `phase`).
- Should a draft in `Editing` status open in the **review** drawer at all, or in the editing flow? Out of scope here — this change preserves the existing destination — but worth raising with Product.
- No P2 Jira ticket exists yet for this request. To be created/linked before opening the PR — the commit convention requires a ticket id.
