# Design — Global search command palette

## Context

The topbar's Search control is today a live `<input type="search">` hard-wired to one screen: every
keystroke writes `ResultsListFilterService.text_to_search` and `Enter` routes to
`/result/results-outlet/results-list` (`shell-topbar.component.ts:114-126`). The approved Claude
Design has already moved past this — its topbar control is a **button** bound to `openPalette`
(`.design-snapshots/PRMS-Reporting.dc.html:232`).

**⚠️ The palette's own markup is not readable in the design snapshot.** `DesignSync`'s `get_file`
truncates at 256 KiB and the file is ~266 KB, so the last ~10 KB is unreachable. `openPalette`
appears exactly once — on the trigger — and none of the palette's own strings (`All programs`, `Esc`,
`RESULTS`, `INDICATORS`, `PROGRAMS`, `Editing`) nor a single `position:fixed` rule appear anywhere in
the readable portion. The palette block therefore lives entirely in the unreachable tail. The visual
spec below is reconstructed from (a) the screenshot Yeck described, and (b) primitives that **do**
appear in the readable design, reused verbatim. Diffing today's snapshot against yesterday's: the
trigger button at line 232 is **byte-identical**, and the first difference is at line 419 (a
`centerMode`/`tabDrafts` tab, a different feature) — so nothing about this trigger changed
day-over-day. Whether the palette's internals changed cannot be determined from a truncated file, and
must not be claimed either way.

**Stack, verified today:** Angular 21.2.18, `@angular/cdk` 21.2.14, Tailwind 4.3.2,
`@spartan-ng/brain` 1.1, `@spartan-ng/cli` 1.1, Jest. `primeng` is **absent from `package.json`**;
only the `primeicons` CSS font survives. `spartanHelm` is `null` — Helm code is generated locally into
`src/app/spartan/` (alias `@spartan`, style `vega`).

**Data reality, verified live against prtest on 2026-08-21:**

| Group | Endpoint | Free-text? | Verdict |
|---|---|---|---|
| Results | `GET /api/results/get/all/roles/filter/:userId?title=` (`results.controller.ts:251-256`; `LOWER(title) LIKE LOWER('%t%')` at `result.repository.ts:705-708`) | **yes** | **implement** |
| Indicators | `contribution-to-indicators/{eois,outcomes}/:initiativeCode`, `toc/*` (`contribution-to-indicators.controller.ts:39-60`, `toc-results.controller.ts:15-44`) | **no** — context-scoped fetch-all only | **Coming soon** |
| Programs | already in memory: `ResultFrameworkReportingHomeService.{mySPsList,otherSPsList,otherProjectsList}()` (`result-framework-reporting-home.service.ts:48-50`) | n/a — sync local filter | **implement** |

The results endpoint returns exactly the three fields the design's row needs: `title`, `submitter`
(the `SP01` official code) and `status_name` — whose value is literally `Editing`, matching the
design. It also accepts `submitter_id` (one science programme) and `portfolio_id`, so the
`All programs` selector maps onto a real query param rather than a client-side afterthought.

## Goals / Non-Goals

**Goals**
- The palette the design shows, built from what the backend can honestly serve.
- Reuse the house behaviour (endpoint, status token pairs, programme colours, debounce shape) over
  writing anything new and elegant.
- Keyboard and screen-reader support treated as part of the feature.
- The one group the backend cannot serve is visible, disabled, tagged `Coming soon`, and ticketed.

**Non-Goals**
- No new backend endpoint, and no indicator search. Not in this change.
- No relevance ranking, scoring or typo tolerance. The endpoint is a substring `LIKE`; the UI must
  not imply more.
- No pagination or "load more" inside the palette. The design shows neither. The existing Results
  Center list is the "see all" escape hatch.
- No Elasticsearch. Its documents lack the programme code and the status
  (`elastic.interface.ts:13-23`), so it cannot draw the row, and the client's call to it uses
  hardcoded Basic auth straight to AWS (`results-api.service.ts:104-170`) — a separate problem this
  change does not touch.

## Decisions

### D1 — Overlay: generate Spartan `command` + `dialog`; do NOT reuse `app-pr-dialog`

The house modal is a hand-rolled `app-pr-dialog`, whose docstring says it exists to avoid Spartan's
`hlm-dialog` "which drags in @ng-icons". **That stated reason is stale**: `@ng-icons/core` and
`@ng-icons/lucide` are direct dependencies and the topbar already renders `<ng-icon name="lucideSearch">`.

The real reason to not reuse it is **verified in its own source**: `grep` for
`cdkTrapFocus|FocusTrap|A11yModule|autoFocus|restoreFocus|focus()` across
`pr-dialog.component.{ts,html}` returns **nothing**. It has `role="dialog"` and `[attr.aria-modal]`
and a ref-counted scroll lock, but **no focus trap, no autofocus, and no focus restore**. For a modal
whose entire interaction is keyboard-driven that is a WCAG 2.1.2 / 2.4.3 failure, not a style
preference — Tab would walk out of the palette into the dimmed shell behind it.

`@spartan-ng/brain/dialog` sits on CDK Dialog and exposes `autoFocus`, `restoreFocus`, `disableClose`,
`hasBackdrop`, `closeOnOutsidePointerEvents` and `aria-modal`/`aria-labelledby` as inputs. It is also
**already in the running app** — the generated `spartan/sidebar` provides `BrnDialog` through
`hlm-sheet` — so this introduces no second overlay runtime.

*Alternative considered:* compose `brnCommand` inside `app-pr-dialog`. Rejected: we would still have
to generate Helm `command` for its `[data-hidden]` styles, then re-implement the trap, autofocus and
focus restore, suppress the header and its leftover `<i class="pi pi-times">`, and run two competing
`document:keydown.escape` listeners (`pr-dialog.component.ts:97` plus the topbar's own at
`shell-topbar.component.ts:142`) — strictly more code for a weaker result.

→ `ng g @spartan-ng/cli:ui --name=command` and `--name=dialog`.

### D2 — Neutralise `brnCommand`'s filter and own visibility with `@for`

Read from the shipped bundle, not from memory (`spartan-ng-brain-command.mjs`):

```js
filter: (value, search) => value.toLowerCase().includes(search.toLowerCase())
skipPredicate((item) => item.disabled || !item.visible());
_visible = computed(() => this._items().some((item) => item.visible()))   // BrnCommandGroup
```

Three consequences, all verified:

1. `[brnCommand]` has **one** `filter` input for every item. Per-group filtering semantics are
   impossible. Leaving the default on server-fed rows **double-filters**: a legitimate `LIKE` hit
   whose `value` string does not literally contain the query in that order silently vanishes.
2. `skipPredicate` keys off `item.visible()`, which is *only* the filter's return value. So with
   `[filter]="() => true"` every **rendered** item stays keyboard-reachable — hiding a row with CSS
   does **not** make `↑`/`↓` skip it. The only correct move is to **not render misses**.
3. `BrnCommandGroup` hides itself when it has zero visible items. So the `INDICATORS` group, which by
   definition has no items, **would disappear** if wrapped in `[brnCommandGroup]`.

→ `[filter]="() => true"`; `@for` over `resultHits()` and `programHits()`, rendering only matches;
the `INDICATORS` `Coming soon` block is **static markup outside `[brnCommand]`'s item query**, never a
disabled `brnCommandItem` (a disabled item is skipped by the key manager but still counts as an
`option` in the listbox).

Each item's required `value` is a **stable id** (`result:<id>`, `program:<code>`), not the title:
activation routes by id, and the accessible name is a separate concern (D5).

### D3 — Results: server per debounced keystroke. Not prefetch, not hybrid.

*(a) backend per keystroke · (b) prefetch cross-programme and filter in memory · (c) hybrid.*

**Chosen: (a).** One programme alone is ~476 rows and the programme Results tab already pulls
`limit: 2000`; cross-programme prefetch is thousands of **fat** rows (each carries
`initiative_entity_user`) held speculatively in case someone opens Search — a startup tax for a
navigation shortcut, and stale while the shell sits open. Prefetching also buys no ranking, because
the endpoint is a substring `LIKE` either way.

**(c) is rejected as the clever-looking trap.** Whatever is in memory is one programme's subset of
what the server returns for *All programs*; the server list then replaces it, so rows
duplicate-then-vanish, ordering shifts, and `aria-activedescendant` ends up pointing at a destroyed
node. Note that *keeping the previous results on screen until the new ones land* is **not** (c) — it
is just not clearing the array, and we do that.

Pipeline — **the query and the scope are one key**, not two:

```ts
queryAndScope = computed(() => ({ q: search().trim(), scope: scope() }));

toObservable(queryAndScope).pipe(
  debounceTime(250),
  distinctUntilChanged((a, b) => a.q === b.q && a.scope === b.scope),
  switchMap(({ q, scope }) => q.length < 2 ? of(TOO_SHORT) : this.fetch(q, scope).pipe(
    startWith(LOADING), catchError(() => of(ERROR)),
  )),
  takeUntilDestroyed(),
);
```

- **250 ms**, not the house 500 ms. 500 ms is the convention for two *field-level* lookups
  (`report-result-form.component.ts:396-406`, `lead-contact-person-field.component.ts:49-51`); a
  palette is a navigation control where 500 ms reads as lag. The 300 ms elsewhere
  (`programme-results`) is a pure in-memory re-filter, a different job.
- **The first keystroke IS debounced** — it is the most expensive `LIKE '%x%'` of the sequence.
- **Minimum 2 characters** before any HTTP; never fire with an empty `title` (that is the unpaginated
  join). Always `limit=5`.
- **`scope` must be inside the observable key.** Reading `this.scope()` inside the `switchMap`
  projector is the real bug: changing *All programs* without changing the query emits nothing, so
  stale rows from the wrong corpus stay on screen. A request-generation token does **not** fix that —
  keying the stream does.
- `catchError` goes **inside** the projector. On the outer pipe, one 500 kills the type-ahead until
  the component remounts.
- Loading state lives **inside** the inner stream (`startWith`/`finalize`), never in an outer `tap` —
  otherwise a cancelled request never clears the spinner.
- `switchMap` here genuinely aborts the XHR (Angular's `HttpXhrBackend` teardown calls
  `xhr.abort()`), which frees one of the browser's ~6 connections per host. It does **not** kill the
  MySQL query — debounce, the 2-char minimum and `limit=5` are what protect the database.
- On a **keystroke**, keep the previous rows until the new ones land. On a **scope change**, clear
  them immediately — they are the wrong corpus.
- No request-generation token. It is belt-and-braces once the stream is keyed and `loading` lives
  inside it.

**Programs filter synchronously with no debounce**, from the first character, over the in-memory
list. The two-stage paint (local instantly, remote at 250 ms) is what every good palette does; the
groups are separately headed, so it reads as one group resolving, not as the list jumping.

`(5)` in the eyebrow is **"showing 5"**, the visible cap — not `meta.total`.

### D4 — `All programs` scope

The selector enumerates the science programmes already in memory and maps to **`submitter_id`** on
the results query (`results.controller.ts:188-200` → `ci.id IN (...)` at `result.repository.ts:699`).
`All programs` = omit `submitter_id`. This is deliberately *not* `portfolio_id`, which selects the
CGIAR portfolio (`P22`/`P25`), a different axis. The scope has no effect on the Programs group, which
is a list of programmes itself.

It renders as Spartan `native-select` (or the shared `app-pr-filter-select`), and sits in the dialog
chrome **outside `[brnCommand]`** — because `[brnCommand]`'s host binds `(keydown.enter)` to
`selectActiveItem()`, so `Enter` on a `<select>` inside it would both apply the scope *and* navigate
to the highlighted row. `stopPropagation` would be a patch; sibling layout is the fix.

🛑 It must **not** be `custom-fields/pr-select`. Those render `.pr-field.mandatory` /
`.pr-select.mandatory`, and the green-check machinery counts those nodes by CSS class through a DOM
scan (`data-control.service.ts:208`, `:224`) — documented in
`programme-results/CLAUDE.md` as a real trap.

### D5 — Keyboard & screen readers: `aria-activedescendant`, and what Brain does not give us

Spartan already commits to `aria-activedescendant` via CDK's `ActiveDescendantKeyManager`, with
`role=combobox` + `aria-autocomplete=list` on the input, `role=listbox` on the list, `role=group` on
groups, `role=option tabIndex=-1` on items. That is the right model: roving `tabindex` moves DOM focus
into the list, so the next character the user types no longer reaches the input — fatal for a
type-ahead. We adopt it rather than fork Brain.

What Brain does **not** provide, verified by grepping the bundle (`aria-expanded` → 0 occurrences,
`aria-controls` → 0):

- **We must add `aria-expanded` and `aria-controls` to the input ourselves.** Without them JAWS reads
  a plain text field with a mysterious extra id instead of a combobox.
- **Option accessible names.** A row is three spans (`SP01` chip, title, `Editing` pill) which
  concatenate into an awkward name that leads with the code rather than the title the user is
  hunting. → put an explicit `aria-label` on the `button[brnCommandItem]` in spoken order
  ("<title>, SP01, Editing") and `aria-hidden="true"` on the chip and pill so they do not
  double-concatenate. Note the required `value` input is **not** the accessible name — it is the key
  manager's label and screen readers never read it.
- **Group names.** `role=group` is unnamed; point `aria-labelledby` at the eyebrow heading's id. The
  heading text `RESULTS (5)` *is* the name — **no live region for counts**, which would be chatty and
  would double-speak against the group name.
- **Loading vs empty.** `aria-busy="true"` on the listbox while fetching, plus a per-group static
  status line ("Searching results…" / "No matching results" / "Type at least 2 characters to search
  results"). Do **not** rely on `*brnCommandEmpty` — it is global ("nothing visible in the whole
  command"), so with Programs usually matching it fires exactly when you don't want it and never when
  you do.
- **VoiceOver + Safari is historically unreliable at announcing activedescendant changes.** Mitigation:
  one visually-hidden `aria-live="polite" aria-atomic="true"` node carrying the **active option's
  name**, updated on key-manager change only — never on every keystroke. This is a known trade
  (NVDA may double-speak on arrows); it is the accepted cost of the pattern.
- **Tab** goes input → scope selector → cycle, skipping the list (options are `tabIndex=-1`). That is
  correct, not a trap-ordering bug: CDK's trap owns `Tab`, the key manager owns the arrows, and they
  listen to different keys. The input must be first in DOM order (or explicitly autofocused) so the
  trap does not land on the selector.

**Shortcut: `Cmd/Ctrl+K` with `preventDefault()`**, ignored when the event target is an
`input`/`textarea`/`select`/contenteditable, and toggling closed on a second press. `Cmd/Ctrl+B` is
taken by `hlm-sidebar.service.ts:47-53`. `/` is rejected: PRMS users type slashes into result titles,
ToC strings and URLs all day, and one missed guard yanks a scientist out of a form.

The `Esc` hint is a real `<kbd>`, wrapped in `aria-hidden="true"` — a visual mnemonic for a key the
dialog already handles, not a control.

### D6 — Visual spec (Tailwind arbitrary px; tokens, never raw hex)

`html` is 12px, so rem utilities land 25% short — arbitrary px values throughout (`h-[36px]`).
Every colour comes from a `src/styles/colors.scss` token. Primitives lifted from the readable design:

| Element | Spec | Design source |
|---|---|---|
| Trigger button | `w-[480px] h-[36px]`, gap 8, pad `0 12px`, 1px border `--pr-border`, radius 8, `cursor-text`; hover border `--pr-border-strong`; 18px magnifier stroke `--pr-text-subtle`; label 14px/400 `--pr-text-subtle` | `PRMS-Reporting.dc.html:232-234` (verbatim) |
| Scrim | `--pr-scrim` (`rgb(25 21 36 / .32)`) | `colors.scss:238` |
| Panel | `bg-[--pr-surface-card]`, radius 12, `--pr-shadow-2` (`0 8px 24px rgb(25 21 36/.10)` — the design's only shadow, 52 occurrences), `light-scroll` scrollbar (8px thumb `--pr-border-strong`) | `colors.scss:236`, snapshot `<style>` |
| Eyebrow heading | 11px/600 uppercase, `letter-spacing:.08em`, `--pr-text-subtle`, pad `8px 10px 6px` | `:249` (cycle group label) |
| `SP01` chip | JetBrains Mono 12px/500, fg `--pr-color-primary-*` (`#5733C4`), bg `#EDE9FE`, radius 6, pad `2px 8px` | `:1868` (`row.aowCode`) |
| Indicator code chip | same chip, right-aligned, `whitespace-nowrap` | `:1868` |
| Status pill | the fixed `--pr-status-*-fg`/`-bg` **pair** via `STATUS_TOKENS` — `Editing` = `status_id 1` = `in-progress`. Never recombine a pair, never invent a sixth colour | `result-header.component.ts:17-20` |
| Program row | 6px dot (`programDotColor(code)`) + mono 11px/500 code + 13px/400 name, `truncate flex-1` | `:102-105` (sidebar program row, same structure) |
| Active row | `--pr-surface-band` / `#F5F3FF` hover, matching the design's `style-hover` | `:519`, `:562` |

`Editing` is the app's real vocabulary, not the design's invention — the codebase computes
`is_submitted ? 'Submitted' : 'Editing'` in several places (`export-tables.service.ts:387`,
`init-general-results-report.component.ts:92`) and the endpoint returns it as `status_name`.

## Risks / Trade-offs

- **The palette's exact markup is unverifiable (256 KiB truncation).** → Build from the reused
  primitives above and flag every reconstructed value as such. Re-run `DesignSync get_file` at the
  start of the apply session; if the tail becomes reachable, diff the palette block before styling is
  finalised. Do not claim the design lacks something merely because `grep` missed it.
- **Removing the topbar's live filter input is a user-visible regression for anyone using it to
  filter the Results Center list.** → The design mandates it, and the palette's rows navigate
  straight to the result, which is what the box was used for. The Results Center keeps its own search
  box. Call this out in the ticket so QA does not file it as a bug.
- **`LIKE '%term%'` has no ranking and no typo tolerance.** → Do not fake it. Highlight the substring
  actually matched; no fuzzy scoring.
- **`limit=5` per group means the palette never shows everything.** → The eyebrow count is the
  visible cap. If `meta.total` exceeds it, keep the design's number rather than inventing a
  "+N more" the design does not have.
- **`aria-activedescendant` is weak on VoiceOver + Safari.** → The single active-option live region
  in D5, accepting possible NVDA double-speak.
- **Generating Helm `command`/`dialog` adds two folders under `src/app/spartan/`.** → Generated, not
  hand-authored, and `dialog`'s Brain layer is already loaded via `hlm-sheet`.
- **⚠️ `ng g @spartan-ng/cli:info --json` lies about what is installed.** It lists `dialog` under
  `installedComponents` while `src/app/spartan/dialog/` does not exist, and omits `breadcrumb` which
  does. **Trust the filesystem, not the CLI's report.** Real state today: `breadcrumb, button, input,
  separator, sheet, sidebar, skeleton, tooltip, utils`.
- **A concurrent workflow is writing files and running the full test suite in this repo, and sibling
  agents are proposing changes to other tabs.** → This change touches the topbar and a new folder;
  the only shared file is `api.service.ts` (adding one optional field to `SearchParams`). Confirm that
  file is untouched by siblings immediately before editing.
- **`openspec/config.yaml`'s project context is stale** — it still says "Angular 19 SPA. PrimeNG 19".
  → Do not let it drive decisions; fix separately, not as a side effect of this change.

## What the browser changed (verified 2026-08-21, fresh build)

The gate (lint + 6096 tests + build) passed while three of these were still wrong. Recorded because
each one is invisible to Jest:

1. **The endpoint returns HTTP 404 for zero matches** (`?title=zzqqxx` → 404 `Results Not Found`;
   `?title=maize` → 200 with 5 items). The first build reported a perfectly normal no-match search as
   *"Results could not be loaded"*. `catchError` now maps 404 → empty and everything else → error.
2. **Helm's `sm:max-w-md` capped the panel at 336px**, not the 640px the design needs — a
   `max-width` beats a `width`, and `hlm-dialog-content` concatenates its classes rather than
   merging them with `tailwind-merge`. Result titles were squeezed to 107px and ellipsised after
   two words. Fixed with `sm:max-w-[640px]!`.
3. **No row was active on arrival.** Brain's `ActiveDescendantKeyManager` starts with nothing active
   and only activates on a key press, so the design's highlighted first row was missing and `Enter`
   did nothing until the user pressed `↓`. Fixed with an effect that calls `setFirstItemActive()`
   whenever the rendered row set changes (deferred a microtask — `contentChildren` for the new rows
   are not collected yet when the effect runs).
4. Cosmetic: some programme names carry trailing whitespace, so the accessible name read
   *"Sustainable Farming , SP02"*. Parts are now trimmed.

5. **The scope control shipped as a bare `<select>`**, which the client `CLAUDE.md` forbids ("never a
   bare native `<select>`/`<input>`") and which my own design note had said to avoid. Replaced with
   Spartan `hlm-native-select` (generated), keeping the design's native-looking control while
   staying on the design system.
6. **`npx tsc -p tsconfig.app.json --noEmit` does not typecheck Angular templates.** It passed a
   template calling `String(...)` — there is no such global in a template — which only
   `npm run build` caught. Template changes must be validated with the build, not `tsc`.

Also confirmed in the browser: the trigger is a 480x36 button with `cursor:text` and border
`#E3E3E8`; the backdrop computes to `rgba(25, 21, 36, 0.32)` (`--pr-scrim`, so the `overlayClass`
override works); one network request per settled query (11 keystrokes of "sustainable" → 1 request);
a scope change re-queried with `submitter_id=50` and the **same** query without retyping; `↑`/`↓`
cross the group boundary with focus never leaving the input; `Enter` navigated to both a result
(`/result/result-detail/8231/general-information?phase=34`) and a programme
(`entity-details/SP02/overview`); `Esc` closed and restored focus to the trigger button; `Tab` cycles
input → scope select → input, skipping the options and never leaving the overlay container; `End`
jumps to the last row and the list scrolls it into view (573px of content in a 420px viewport, with
the page behind scrolling in neither axis).

One further a11y gap found and fixed the same way: opening with `Cmd/Ctrl+K` left the
previously-focused element as `<body>`, so CDK's `restoreFocus` returned focus to `<body>` on close
and a keyboard user lost their place in the page entirely. The topbar now focuses its trigger
*before* opening, so CDK's own restore lands on the Search control. Verified: open with the
shortcut, close with the shortcut, `document.activeElement === .pr-topbar-search`.

### And one the full-suite run found that a targeted run did not

Running only the palette specs passed (53/53) while the **full** suite stalled: the
`setFirstItemActive()` call added in fix 3 sits inside a `queueMicrotask`, and the Jest brain stub
had no such method, so the TypeError surfaced as the whole run hanging for 7+ minutes on that one
spec rather than as a failing assertion. Fixed by completing the stub's `keyManager` surface. The
lesson is that a green targeted run is not evidence the gate is green — and that a hanging suite,
not a red one, is how a missing mock method presents.

## Migration Plan

1. Generate `command` and `dialog` into `src/app/spartan/` (no app code touched).
2. Add optional `title` to `SearchParams` — additive, no existing caller affected.
3. Build the palette component behind its own folder, unmounted.
4. Mount it in `app.component.html` next to `<app-shell-topbar />` and swap the topbar input for the
   design's button in the same commit, so the app is never left with two competing search models.

**Rollback:** the change is one component folder plus one topbar template swap. Reverting the topbar
template restores the previous input; the palette folder is inert once unmounted.

## Open Questions

Documented, not blocking — the house rule is to keep building and let product catch up.

1. **`INDICATORS` needs an owner.** Notification ticket for Ángel (non-technical: where it is, what
   the user sees, why, and that it is only an FYI he may close). Genuinely new work — the closest
   existing tickets, **P2-3399** (indicator line under a result title) and **P2-3395** (View
   indicator row action), are about *displaying* an indicator on a result, not searching indicators.
2. **No parent Jira ticket exists for this palette.** A User Story under **P2-3172** must be opened
   before UAT.
3. **Does `All programs` mean science programme or CGIAR portfolio?** Read as science programme
   (`submitter_id`) because the design's rows carry `SP01` chips. Needs Santi's confirmation; the
   other reading is a one-line param change.
4. **Should the topbar keep any route to the Results Center list filter?** Assumed no — two search
   models in one topbar is how this gets confusing. Worth confirming with Santi given someone may
   rely on it daily.
