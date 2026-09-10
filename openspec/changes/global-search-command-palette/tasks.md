# Tasks — Global search command palette

**All tasks are CLIENT-side.** No server task exists in this change: the endpoints already serve what
is needed. No task modifies server code, runs a migration, or alters git state.

## 0. Pre-flight (do these before writing a line)

- [ ] 0.1 🛑 **NOT DONE — `DesignSync` was not available in this session** (the tool is not exposed here, and `WebFetch` to a `claude.ai/design/p/…` URL returns 403 for private content). Worked from the on-disk snapshot dated today 09:19, diffed against yesterday's copy: the trigger at line 232 is byte-identical and the first difference is line 419 (a different feature). The palette block itself is in the unreachable tail in BOTH snapshots, so no claim is made about whether its internals changed. **Re-run `DesignSync get_file` before committing.** Original task: Re-read the live design: `DesignSync method=get_file projectId=b6234307-e82b-43d0-b4c4-a2bb13b12242 path="PRMS Reporting.dc.html"`, diff against `onecgiar_pr/.design-snapshots/PRMS-Reporting.dc.html`, and report what changed before overwriting the snapshot. The design changes daily.
- [ ] 0.2 Depends on 0.1. Grepped the on-disk snapshot instead — the palette strings and any `position:fixed` rule are absent from the readable 256 KiB, so §D6's values remain reconstructed from the reused primitives, flagged as such. Original task: Grep the fresh snapshot for the palette block (`All programs`, `Esc`, `RESULTS`, `INDICATORS`, `PROGRAMS`, `openPalette`, `position:fixed`). If the tail is now reachable, replace the reconstructed values in `design.md` §D6 with the real ones. If it is still truncated, say so — never claim the design lacks something because grep missed it.
- [x] 0.3 Confirm no sibling agent is editing `src/app/shared/services/api/api.service.ts` or `src/app/shared/components/shell-topbar/`, and that the concurrent test-suite workflow has finished. This is the only file overlap risk in the change.
- [x] 0.4 Verify the working branch with `git branch --show-current && git status -sb` in the same block as any later commit. Read-only otherwise — the user runs `add`/`commit`/`push`.

## 1. Jira before code

- [x] 1.1 Open a User Story under epic **P2-3172** (Reporting Tool - Revamp) for this palette — no ticket exists today. Use it as the ticket id in every commit.
- [x] 1.2 Open the `Coming soon` notification ticket for the disabled `INDICATORS` group, assigned to **Ángel Alberto Jarrín Rivas** (`a.jarrin@cgiar.org`, accountId `712020:ed59efaa-46e7-439b-9dd1-702edad6bc10`). Plain words, no jargon, no file paths: where it is (topbar Search box → the search panel), what the user sees (a greyed-out "Indicators" section marked "Coming soon"), why in one sentence (the system has no way to search indicators yet), and say explicitly that it is only an FYI he may close. Confirm first it is not a duplicate of **P2-3399** or **P2-3395** — those are about showing an indicator on a result, not searching indicators.
- [x] 1.3 Note in the parent ticket that the topbar Search box changes from a live filter field to a button, so QA does not file the removal as a bug.

## 2. Generate the Spartan primitives

- [x] 2.1 `cd onecgiar-pr-client && npx ng g @spartan-ng/cli:ui --name=command` — creates `src/app/spartan/command/`. Required for the `[data-hidden]` styles as well as the listbox machinery.
- [x] 2.2 `npx ng g @spartan-ng/cli:ui --name=dialog` — creates `src/app/spartan/dialog/`. It is absent today despite `ng g @spartan-ng/cli:info --json` claiming otherwise; trust the filesystem.
- [x] 2.3 Generate `kbd` (`--name=kbd`) for the `Esc` hint, and `native-select` if the scope selector uses it rather than the shared `app-pr-filter-select`.
- [x] 2.4 Confirm each new folder exists on disk with `ls src/app/spartan/`, and confirm the build still compiles.

## 3. Client API plumbing

- [x] 3.1 Add optional `title?: string` to the `SearchParams` interface in `src/app/shared/services/api/api.service.ts:24-34`. Additive only — no existing caller changes.
- [x] 3.2 Verify with curl that the endpoint honours it, and record the real output in the ticket:
      `TOKEN=$(grep '^USER_TOKEN=' /Users/yeck/Desktop/reporting/.env | cut -d'"' -f2)` then
      `curl -s -H "auth: $TOKEN" "https://prtest-back.ciat.cgiar.org/api/results/get/all/roles/filter/<userId>?title=maize&limit=5"`.
      Confirm each row carries `title`, `submitter` and `status_name`. Never print the token.
- [x] 3.3 Confirm `submitter_id` narrows the same query to one programme, and that omitting it searches across programmes.

## 4. The search service

- [x] 4.1 Create `src/app/shared/components/global-search-palette/global-search-palette.service.ts`, `providedIn` the component (not root) so closing the palette drops its state.
- [x] 4.2 Expose `query` and `scope` signals, and a single `queryAndScope = computed(() => ({ q: query().trim(), scope: scope() }))`. The scope MUST be part of the stream key, not read inside the `switchMap` projector.
- [x] 4.3 Build the results pipeline: `toObservable(queryAndScope)` → `debounceTime(250)` → `distinctUntilChanged` comparing **both** fields → `switchMap` → `takeUntilDestroyed`. Under 2 characters emit a too-short state and issue no request. Never call the endpoint with an empty `title`. Always `limit=5`.
- [x] 4.4 Put `startWith(loading)` and `catchError` **inside** the `switchMap` projector, never on the outer pipe, so one 500 does not kill the type-ahead and a cancelled request cannot leave a stuck spinner.
- [x] 4.5 Keep the previous rows on a keystroke; clear them immediately on a scope change.
- [x] 4.6 Expose `programHits()` as a synchronous `computed` filtering `ResultFrameworkReportingHomeService.{mySPsList,otherSPsList,otherProjectsList}()` case-insensitively on `initiativeCode` and `initiativeName`. No debounce, no request.
- [x] 4.7 Map each result row to `{ id, title, code: submitter, statusId, statusName }` and each item's `brnCommandItem` `value` to a stable id (`result:<id>` / `program:<code>`), never the title.

## 5. The palette component

- [x] 5.1 Create `global-search-palette.component.{ts,html}` — standalone, `OnPush`, `inject()`, new control flow.
- [x] 5.2 Compose the Spartan dialog with `autoFocus` on the input, `restoreFocus` to the trigger, `hasBackdrop`, `aria-modal` and an `aria-label` of `Search`. Do NOT use `app-pr-dialog`: it has no focus trap, no autofocus and no focus restore (verified — `grep cdkTrapFocus|FocusTrap|autoFocus|restoreFocus` over `pr-dialog.component.*` returns nothing).
- [x] 5.3 Set `[filter]="alwaysTrue"` on `[brnCommand]` and render **only** matches with `@for`. Do not hide misses with CSS: `skipPredicate` is `item.disabled || !item.visible()` and `visible()` is only the filter's return value, so a CSS-hidden row stays keyboard-reachable.
- [x] 5.4 Put the scope selector and the `Esc` `<kbd>` in the dialog chrome **outside** `[brnCommand]` — its host binds `(keydown.enter)` to `selectActiveItem()`, so `Enter` on a `<select>` inside it would both apply the scope and navigate.
- [x] 5.5 Render the `INDICATORS` `Coming soon` block as **static markup outside** `[brnCommandGroup]` and outside the item query. `BrnCommandGroup._visible = items().some(i => i.visible())`, so a group with no items hides itself — the block would vanish.
- [x] 5.6 Add `aria-expanded="true"` and `aria-controls="<listId>"` to the input yourself. Brain sets neither (verified: zero occurrences of both in the shipped bundle).
- [x] 5.7 Give each row an explicit `aria-label` in spoken order (`"<title>, <code>, <status>"`) and `aria-hidden="true"` on the code chip and status pill spans. The required `value` input is the key manager's label, not the accessible name.
- [x] 5.8 Name each `role=group` with `aria-labelledby` pointing at its eyebrow heading id. No live region for counts.
- [x] 5.9 Set `aria-busy` on the list while fetching. Show per-group static lines for too-short / loading / empty / error. Do not use `*brnCommandEmpty` — it is global across all groups.
- [x] 5.10 Add one visually-hidden `aria-live="polite" aria-atomic="true"` node carrying the **active option's name**, updated on key-manager change only — the VoiceOver+Safari mitigation. Never update it per keystroke.
- [x] 5.11 Wire row activation: results navigate to the result, programmes navigate to the programme addressed by code (`.../entity-details/SP01`). Close the palette first, then navigate.

## 6. Styling

- [x] 6.1 Style from `src/styles/colors.scss` tokens only — no raw hex anywhere. Use arbitrary px utilities (`h-[36px]`), never rem-based ones: `html` is 12px so rem lands 25% short.
- [x] 6.2 Status pills: reuse the `STATUS_TOKENS` fg/bg **pair** map from `result-header.component.ts:17-20` (`Editing` = `status_id 1` = the `in-progress` pair). Never recombine a pair; never add a sixth colour; unknown status falls back to `not-started`.
- [x] 6.3 Programme dots: reuse `programDotColor()` and its palette from `reporting-nav-sidebar.component.ts:595-613` — already contrast-checked. Do not invent a second palette.
- [x] 6.4 Apply the §D6 table: 480x36 trigger, `--pr-scrim` backdrop, `--pr-shadow-2` panel, radius 12, `light-scroll` internal scrollbar, uppercase `.08em` eyebrow headings, mono chips at 12px/500 on the violet chip background, ellipsis truncation on long titles and names.
- [x] 6.5 Confirm the panel scrolls internally and the page behind never scrolls horizontally or vertically.

## 7. Topbar swap

- [x] 7.1 Replace the `<input type="search">` at `shell-topbar.component.html:12-23` with the design's button (`PRMS-Reporting.dc.html:232-234`), including a `⌘K` hint.
- [x] 7.2 Remove `onSearchInput` / `onSearchSubmit` / the `searchQuery` signal / the `ngOnInit` sync and the `ResultsListFilterService` injection from `shell-topbar.component.ts:50-53,114-126`. Do not leave a second search model in the topbar.
- [x] 7.3 Mount the palette next to `<app-shell-topbar />` in `app.component.html:33-38`, in the **same commit** as the swap.
- [x] 7.4 Register the `Cmd/Ctrl+K` listener with `preventDefault()`, ignoring events whose target is an `input`/`textarea`/`select`/contenteditable, and toggling closed on a second press. Do not bind `/`.
- [x] 7.5 Confirm `Cmd/Ctrl+B` still toggles the sidebar (`hlm-sidebar.service.ts:47-53`) and that the two listeners do not interfere.

## 8. Tests (Jest — `jest.fn()`, `jest.spyOn()`, never Jasmine)

- [x] 8.1 Service: under 2 characters issues no request; at 2+ it requests once after the debounce; `title` is passed; `limit=5`.
- [x] 8.2 Service: a second keystroke mid-flight cancels the first and only the last response is rendered.
- [x] 8.3 Service: a scope change with an unchanged query **does** re-request, and clears rows immediately (this is the bug that keying the stream fixes — assert it explicitly).
- [x] 8.4 Service: an error response leaves the pipeline alive — a following keystroke still requests.
- [x] 8.5 Service: loading resolves to false after a cancelled request (no stuck spinner).
- [x] 8.6 Service: programme filtering is synchronous, case-insensitive, and matches on both code and name.
- [x] 8.7 Component: status ids map to the fixed `--pr-status-*` **pairs**, and an unknown id falls back to `not-started` — mirroring `programme-results.component.spec.ts:266-270`.
- [ ] 8.8 ~~Component: `↓`/`↑` move the active row…~~ **NOT POSSIBLE IN JEST.** `@spartan-ng/brain/*` is mocked, so the stubs have no `ActiveDescendantKeyManager`, no `data-selected` and no `visible()`. Verified in the browser instead (arrows cross Results→Programs, focus stays on the input, `Enter` navigates). What Jest *can* assert is asserted: the filter is neutralised and misses are not rendered.
- [ ] 8.9 ~~Component: `Escape` closes and focus returns to the trigger.~~ **NOT POSSIBLE IN JEST** (CDK Dialog is stubbed). Browser-verified: Esc closed, backdrop removed, `document.activeElement === .pr-topbar-search`.
- [x] 8.10 Component: `Cmd/Ctrl+K` opens; it is ignored when the event target is a text field. *(covered in `shell-topbar.component.spec.ts`, not the palette spec — the listener lives on the topbar.)*
- [x] 8.11 Component: the `INDICATORS` block renders, is not a `brnCommandItem`, and survives having zero rows.
- [x] 8.12 Component: each row's `aria-label` is title-first, and the chip and pill are `aria-hidden`.
- [x] 8.13 Run the client gate with real output before any push: `npm run lint:fix` and `npm run test` — coverage thresholds are branches 50 / functions 60 / lines 60 / statements 60. Paste the real output; never "should pass".

## 9. Manual verification

- [x] 9.1 `cd onecgiar-pr-client && npm start` (client only — it already points at the prtest backend; do NOT start the local NestJS server).
- [x] 9.2 Open with `Cmd/Ctrl+K` and with the topbar button. Type a term you know exists; confirm the result rows show the programme code chip, the title and the status pill, and that the heading count matches the rows.
- [x] 9.3 Scope to a single programme and confirm the rows narrow; switch back to `All programs` and confirm they widen — without retyping.
- [x] 9.4 With DevTools Network open, type quickly and confirm only one request survives per pause and that superseded requests show as cancelled.
- [x] 9.5 Keyboard-only pass: `↑`/`↓`/`Enter`/`Esc`, `Tab` cycling between input and scope selector without escaping to the page behind, focus returning to the trigger on close.
- [ ] 9.6 🛑 **NOT DONE — no screen reader available in this environment.** No NVDA, JAWS or VoiceOver run. The ARIA wiring was asserted structurally and the activedescendant/live-region mechanics were observed in the DOM, but **no announcement was actually heard**. This is the highest-value remaining check and must happen before UAT sign-off.
- [x] 9.7 Confirm the `INDICATORS` block is visible, greyed, tagged `Coming soon`, and unreachable by arrow keys.
- [x] 9.8 Screenshots → `onecgiar_pr/.local-screenshots/` as `p2-XXXX-global-search-palette-*.png` (gitignored — never commit PNGs).

## 10. Documentation

- [x] 10.1 Write `src/app/shared/components/global-search-palette/CLAUDE.md` — under 120 lines, line 3 the `**Verified:** YYYY-MM-DD · branch <branch> · <short-sha>` seal. Contents: the contract, which service owns which state, where it is mounted with `file:line`, and the traps (the neutralised `brnCommand` filter, the group-hides-itself rule, `aria-expanded`/`aria-controls` being absent from Brain, scope-in-the-stream-key, and the `custom-fields/pr-select` green-check DOM-scan prohibition).
- [x] 10.2 Add or update the `CLAUDE.md` for `shell-topbar/` (it has none today) recording that the Search control is now a palette trigger and no longer touches `ResultsListFilterService`.
- [x] 10.3 Append the non-obvious wiring to `onecgiar-pr-client/src/CLAUDE.md` — one pointer plus one sentence, token-cheap.
- [x] 10.4 Post the human summary on the parent ticket (What was done / Why / How to verify / Technical references) and the full detail on a `Technical documentation` subtask: commit hashes, real test output, what was verified in the browser, and **what could not be verified and why**.
- [ ] 10.5 Before moving anything to UAT, run the 7-point UAT checklist in the root `CLAUDE.md` — especially: is it actually **deployed** where QA tests, and do the steps name the portfolio and phase to use?

## 11. Still open after this pass

- [ ] 11.1 🛑 Screen-reader pass (see 9.6) — the one substantive gap.
- [ ] 11.0 🛑 Re-read the live design with `DesignSync` (see 0.1) — it was unavailable in this session.
- [ ] 11.2 Commit and deploy. Nothing is committed (git is read-only for the agent) and nothing is deployed, so **this must not move to UAT yet**.
- [x] 11.3 Tab-order walk inside the palette — **DONE, browser-verified.** Tab from the input lands on the scope select (skipping the 13 `tabIndex=-1` options); a second Tab returns to the input. Focus never leaves the CDK overlay container: `escapedToPage: false`.
- [ ] 11.4 Narrow-viewport / mobile pass. Only 1440x900 was used.
- [ ] 11.5 Confirm with product whether legacy `INIT-XX` results belong in the palette (they appear today, because the endpoint returns whatever the user's roles allow).
- [ ] 11.6 Follow-up, own PR: lift `programDotColor` + its palette out of `reporting-nav-sidebar.component.ts` into `shared/utils/` so the palette stops duplicating it.
- [ ] 11.7 Separate ticket, not this change: `app-pr-dialog` has no focus trap / autofocus / focus restore. Every keyboard-driven surface still built on it is affected.
- [ ] 11.8 `openspec/config.yaml` still describes "Angular 19 SPA. PrimeNG 19" — stale, fix outside this change.
