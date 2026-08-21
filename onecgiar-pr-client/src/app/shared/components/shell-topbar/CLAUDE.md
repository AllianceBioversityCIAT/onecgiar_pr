# shell-topbar

**Verified:** 2026-08-21 · branch performance-refactor · eed5bb706

The app shell header: sidebar toggle · centered Search · notifications popover · user menu. Rendered
by `app.component.html:38`, and hidden entirely when `dataControlSE.show_qa_full_screen` or
`focusMode()` is on — so nothing in here exists in QA full-screen or focus mode, **including the
`Cmd/Ctrl+K` listener**.

## Contract

- The **Search control is a palette trigger, not a filter field** (P2-3401, design
  `.design-snapshots/PRMS-Reporting.dc.html:232`). It is a `<button>`; it holds the palette via
  `viewChild(GlobalSearchPaletteComponent)` and calls `openPalette()` / `toggle()`.
- `Cmd/Ctrl+K` is registered here (`onGlobalKeydown`, `document:keydown`) with `preventDefault()`,
  and is ignored when the event target is an `input`/`textarea`/`select`/contenteditable — except
  when the palette is already open, so the shortcut can still toggle it closed from its own input.
- Notifications and the user menu are `cdkConnectedOverlay` popovers driven by two local signals,
  both closed by the separate `document:keydown.escape` listener.

## Traps (⚠️ = already caused a change)

- ⚠️ **It no longer touches `ResultsListFilterService`.** Until P2-3401 the Search box wrote
  `text_to_search` on every keystroke and routed to `/result/results-outlet/results-list` on Enter.
  That is **removed on purpose** — two search models in one topbar. The Results Center keeps its own
  search box, and the palette's rows navigate straight to a result, which is what the old box was
  actually used for. QA was told (P2-3403). Do not reinstate an inline field "as well".
- ⚠️ **`onGlobalKeydown` focuses the trigger BEFORE opening.** CDK Dialog's `restoreFocus` returns to
  whatever had focus when the dialog opened; opened straight from the shortcut that is `<body>`, so
  closing dropped the keyboard user at the top of the document with no place in the page. Focusing
  `#searchTrigger` first makes CDK's own mechanism land correctly — don't "simplify" it away, and
  don't re-focus on the closing press.
- ⚠️ **`Cmd/Ctrl+B` is not ours** — it is Spartan's sidebar toggle, registered on `window` with its
  own `preventDefault` (`spartan/sidebar` → `hlm-sidebar.service.ts:47`). Do not bind it here, and do
  not bind `/` for search: PRMS users type slashes into result titles and ToC statements all day.
- **Two Esc listeners coexist.** The palette's Esc is CDK Dialog's; this component's
  `document:keydown.escape` only closes the two popovers. Both firing on one Esc press is harmless
  (the popovers are already closed), but do not "unify" them — they close different things.
- **`shortcutHint` sniffs the platform** to show `⌘K` vs `Ctrl K`. Cosmetic only; the handler
  accepts either modifier regardless.
- The search control keeps `cursor: text` even though it is a button — the design specifies it
  (`cursor:text` at snapshot line 232) because it opens a search surface.

## Children

| Component | What it does | Trap |
|---|---|---|
| `app-global-search-palette` | the palette overlay | has its own `CLAUDE.md` — read it before touching the trigger |
| `app-pop-up-notification-item` | one unread-notification row | lives under `header-panel/components/` |
