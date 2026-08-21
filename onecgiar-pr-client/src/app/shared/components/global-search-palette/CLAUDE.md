# global-search-palette

**Verified:** 2026-08-21 · branch performance-refactor · eed5bb706

The command palette behind the topbar Search button (P2-3401). Three groups: **Results**
(server-side `?title=` search), **Indicators** (visible-but-disabled, `Coming soon`, P2-3402) and
**Programs** (in-memory filter). Design source: `.design-snapshots/PRMS-Reporting.dc.html:232`
binds the trigger to `openPalette`.

## Contract

- `GlobalSearchPaletteComponent` owns **open/closed** (`open` signal) and activation/navigation.
  `GlobalSearchPaletteService` owns **query, scope and rows**, and is `providers:`-scoped to the
  component — **not** `root` — so closing the palette drops the state instead of leaking it into the
  next open.
- The topbar is the only consumer. It holds the component via `viewChild` and calls
  `openPalette()` / `toggle()`; that co-location is what makes CDK's `restoreFocus` land back on the
  trigger button.
- Results: `ApiService.resultsSE.GET_AllResultsWithUseRole(userId, { title, limit: 5, page: 1,
  submitter_id? })`. `SearchParams.title` was added for this
  (`shared/services/api/api.service.ts:27`) — the server already honoured it, the client type could
  not express it.
- Programs: read straight off `ResultFrameworkReportingHomeService.{mySPsList, otherSPsList,
  otherProjectsList}()`. Already in memory, so the filter is a synchronous `computed` with **no**
  debounce and **no** request.
- Scope: `null` = `All programs` (omit `submitter_id`). Not `portfolio_id` — that is the P22/P25
  axis, a different thing.

## Where it is used

- `shared/components/shell-topbar/shell-topbar.component.html` — the trigger button, and
  `<app-global-search-palette />` mounted after the popover templates.
- `shell-topbar.component.ts` — `openSearchPalette()` and the `Cmd/Ctrl+K` `document:keydown`
  listener.

## Traps (⚠️ = would ship broken without this)

- ⚠️ **`[filter]="alwaysVisible"` is load-bearing.** Brain's default filter is
  `(value, search) => value.toLowerCase().includes(search.toLowerCase())` and our rows are already
  filtered (server for Results, `computed` for Programs). Leaving it on **double-filters** and drops
  legitimate server hits, because each item's `value` is a stable id (`result:<id>`) that never
  contains the typed text.
- ⚠️ **Never hide a row with CSS.** `skipPredicate` is `item.disabled || !item.visible()` and
  `visible()` is *only* the filter's return value — with the filter neutralised every rendered row
  stays arrow-key reachable. Render matches only; that is why both groups use `@for` over hits.
- ⚠️ **The Indicators block must stay OUTSIDE `[brnCommandGroup]` and must not be a
  `brnCommandItem`.** `BrnCommandGroup._visible = items().some(i => i.visible())`, so a group with
  no items hides itself and the `Coming soon` block would vanish; and a *disabled* item is skipped
  by the key manager but still announced as an `option` in the listbox.
- ⚠️ **`aria-expanded` and `aria-controls` are set in our template, not by Brain.** The brain input
  host supplies only `role=combobox`, `aria-autocomplete=list` and `aria-activedescendant` (zero
  occurrences of the other two in the shipped bundle). Without them JAWS reads a plain text field.
- ⚠️ **Scope belongs in the stream key, not inside the `switchMap`.** Reading `scope()` in the
  projector means a scope change with an unchanged query emits nothing, leaving the wrong
  programme's rows on screen. A request-generation token does not fix that. Covered by the spec
  "RE-REQUESTS when only the scope changes".
- ⚠️ **`_lastScope` / `_lastRows` are plain fields, not signals.** They are read and written inside
  the `switchMap` projector; reading the `resultsState` signal there would be a circular read of the
  signal this pipeline feeds.
- ⚠️ **A 404 from the results endpoint means EMPTY, not broken.** `?title=<no match>` answers
  HTTP 404 `Results Not Found` instead of 200 with an empty `items` array (verified on prtest
  2026-08-21). `catchError` maps 404 → `loaded` with no rows and everything else → `error`; before
  that, a normal no-match search told the user the search had failed.
- ⚠️ **Helm's `sm:max-w-md` caps the panel at 336px.** `hlm-dialog-content` concatenates its classes
  instead of merging them with `tailwind-merge`, so a plain `w-[640px]` loses to that max-width and
  titles get squeezed to ~107px. The `sm:max-w-[640px]!` on the content element is load-bearing.
- ⚠️ **Brain does not activate a first row.** `ActiveDescendantKeyManager` starts empty and only
  activates on a key press, so the design's highlighted first row and a working `Enter`-without-
  arrowing both need the `setFirstItemActive()` effect. It is deferred by a microtask because
  `contentChildren` for the new rows are not collected yet when the effect runs.
- **`startWith`/`catchError` go inside the projector.** On the outer pipe one 500 kills the
  type-ahead until remount, and a cancelled request leaves a stuck spinner.
- **250 ms debounce, not the house 500 ms.** 500 ms is for field-level lookups
  (`report-result-form.component.ts:396`); on a navigation control it reads as lag. 2-character
  minimum, `limit=5`, and never a request with an empty `title` (that is the unpaginated join).
- **Rows persist across a keystroke, clear on a scope change** — a new query is the same corpus, a
  new scope is not.
- **`--pr-scrim` needs `overlayClass`.** `HlmDialog`'s template renders `<hlm-dialog-overlay />` and
  the backdrop lives in the CDK overlay container, so no component style can reach it. An additive
  `overlayClass` input was added to the generated `spartan/dialog/src/lib/hlm-dialog.ts`
  (default `''`, every other usage unchanged).
- 🛑 **Do not rebuild this on `app-pr-dialog`.** It has no focus trap, no autofocus and no focus
  restore (`grep cdkTrapFocus|FocusTrap|autoFocus|restoreFocus` over `pr-dialog.component.*` →
  nothing), which is a WCAG 2.1.2 / 2.4.3 failure for a keyboard-driven modal.
- **The scope control is Spartan `hlm-native-select`, not a bare `<select>`.** The design wants a
  native-looking select and the client `CLAUDE.md` forbids raw native controls; `hlm-native-select`
  satisfies both (it supplies the chevron and takes `[value]` / `(valueChange)`). It needs
  `BrnFieldControl` + `provideBrnLabelable` in the Jest brain mock. Its value is a **string**, so
  `null` (All programs) maps to `''` via the `scopeValue` computed — Angular templates have no
  `String()`, which the build (not `tsc --noEmit`) is what catches.
- 🛑 **Do not use `custom-fields/pr-select` for the scope control.** Those render
  `.pr-field.mandatory` / `.pr-select.mandatory`, and the green-check machinery counts those nodes
  by CSS class through a DOM scan (`shared/services/data-control.service.ts:208`).
- **`programDotColor` is a deliberate local copy** of `reporting-nav-sidebar.component.ts:595-614`
  (the palette is a private member there, so it cannot be injected). Follow-up, own PR: lift both
  into `shared/utils/`.
- **The chip shows `submitter`,** which is `SP0X` for 2026 science programmes but `INIT-XX` for
  legacy portfolios. Both are real; do not "fix" it to SP-only.

- ⚠️ **A missing `keyManager` method on the Jest brain stub HANGS the whole suite.** The effect calls
  `setFirstItemActive()` inside a `queueMicrotask`; when the stub lacked that method the TypeError
  surfaced as the full run stalling for 7+ minutes on this one spec, not as a failed assertion. If
  you call a new `keyManager` method, add it to `tests/mocks/spartanBrainMock.ts` in the same commit.

## Not covered by Jest

`@spartan-ng/brain/*` is mocked (`tests/mocks/spartanBrainMock.ts`), so the stubs have no
`ActiveDescendantKeyManager`, no `data-selected` and no `visible()`. **Arrow-key navigation, the
active-row highlight, `aria-activedescendant` announcement, the focus trap and focus restore are
browser-verified only** — re-check them in the browser after touching this folder.
