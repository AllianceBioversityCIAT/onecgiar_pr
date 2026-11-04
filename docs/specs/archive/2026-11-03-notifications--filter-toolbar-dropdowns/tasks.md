# Tasks — Notifications filter toolbar: one dropdown per facet

## 1. Scope of this task list

- **Module / feature:** `notifications/filter-toolbar-dropdowns`
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Owner / driver:** Santiago Sanchez
- **Status:** `implemented` — FTD-T-1..T-3 PASS (T-3 closed 2026-10-06 after a11y + anchoring fixes). Open: root-zoom overlay offset → separate change (user decision); commit; manual QA on test env
- **Budget (design §12A):** 3 tasks · ~450 LOC · ≤2 review rounds per task — exceeding it stops `/akili-execute` for a user decision.

**Test-run rules (every task):** Jest only scoped and with ≤2 workers — `npm run test:local -- --testPathPattern=results-notifications.component` (or `npx jest --maxWorkers=2 --testPathPattern=...`). Never the full suite; one test run at a time on the machine. Lint only touched files: `npx eslint <files> --quiet`.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Phase 1 → Continue, 2026-10-05)
- [x] `design.md` approved (Phase 2 → Continue, 2026-10-05; judgment-day review declined)
- [x] Open questions resolved or defaulted (FTD-OQ-1 → Phase first)
- [x] No CLARISA / migration dependency
- [x] Working tree: the target files (`results-notifications.component.*`, `.module.ts`, `contribution-request-drawer.copy.ts`) have no uncommitted edits (`git status`, 2026-10-05) — re-check before T-1

## 3. Task list

### FTD-T-1 — Component state: per-facet open/close, counts, Phase/Program pick

- **Type:** client
- **Description:** In `results-notifications.component.ts`, add `FilterFacetKey`, ordered `filterFacets`, `openFacet` signal, `toggleFacet`, `closeFacet(refocus)`, `onFacetStateChanged` with the 50 ms re-open guard (DD-4), `facetSelectedCount(key)`, `selectedPhaseLabel`, `selectPhase(id)`, `selectProgram(id)`, `programSearchQuery` + `filteredProgramOptions`. Add `provideIcons({ lucideChevronDown })`. Add the new `filterToolbar` copy keys (design §6.3c) — **additive only**: the legacy popover members and the `filterButton`/`phasesLabel`/`phasesPlaceholder` keys stay until FTD-T-2 (re-sequenced 2026-10-05, user decision: the current template and 5 legacy tests still read them, so removing them here would leave the spec red). Unit tests for every new member go in the component spec in this task.
- **Implements:** FTD-R-3 (S1, S2), FTD-R-4 (state side of S1/S2: overlay `closed` → `openFacet=null`; refocus on Escape), FTD-R-5.S2 (hint condition = no `phaseFilter`), FTD-R-5.S3 (all clauses incl. `BUT Phase must NOT be clearable / must NOT reload`), FTD-R-5.S4 (Program search filter + "Nothing matches"), FTD-R-6 (count + Phase label), FTD-R-11 (copy), FTD-AC-4, FTD-AC-9, FTD-AC-10 (state part)
- **Files (expected):** `results-notifications.component.ts`, `results-notifications.component.spec.ts`, `src/app/internationalization/contribution-request-drawer.copy.ts`
- **Depends on:** —
- **Blocks:** FTD-T-2
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier:** `toggleFacet('type'); toggleFacet('funding')` leaves `openFacet()` ≠ `'funding'`; `selectPhase(currentId)` calls `onPhaseChange` (spy called ≥1); `selectProgram('5')` twice leaves `initiativeIdFilter` ≠ `null`; `facetSelectedCount('center')` with `centerIdsFilter=[1,2]` ≠ 2; `onFacetStateChanged('type','closed')` then `toggleFacet('type')` within 50 ms reopens it.
  - **Red run:** the new `describe('FTD — facet dropdown state')` block fails before (members don't exist → TS/compile error is the red) and passes after: `npm run test:local -- --testPathPattern=results-notifications.component`
  - **Disqualifier:** if the re-open guard requires fake timers that make the test pass regardless of the 50 ms window (e.g. `performance.now` mocked to a constant), it proves nothing — mock `performance.now` with explicit values **inside and outside** the window and assert both outcomes. If a facet predicate in the service must change to satisfy a test, stop: that is out of scope (requirements §3).
  - **Consumers:** `filterPopoverOpen` / `toggleFilterPopover` are read only by `results-notifications.component.html` (rewritten in T-2) and its spec (ported in T-3); copy keys `filterButton`, `phasesLabel`, `phasesPlaceholder` — grep `src/app` for other readers before removal (removal itself now happens in T-2).
  - **Cannot prove:** real overlay dismissal and focus — owned by T-3's browser check.
- **Definition of done:**
  - [x] New members unit-tested; scoped Jest green (old popover members removed in T-2)
  - [x] `npx eslint <touched files> --quiet` clean
  - [x] Copy only via `filterToolbar` keys; no hard-coded strings
  - [x] No commit without explicit user go-ahead

### FTD-T-2 — Template + module: toolbar row of seven popovers

- **Type:** client
- **Description:** Replace the Filter trigger + `@if (filterPopoverOpen())` panel (html L65-234) with the search input followed by `@for (facet of filterFacets)` → `hlm-popover` (controlled `[state]`/`(stateChanged)`, `align="start"`, `sideOffset="6"`, `[autoFocus]="false"`), trigger button (`data-facet`, `aria-haspopup="dialog"`, `aria-expanded`, label/phase name, `hlmBadge` count, chevron, active style) and `hlm-popover-content *hlmPopoverPortal` (`role="dialog"`, `aria-label` = facet label) with a `@switch` whose bodies are today's sections moved verbatim; Phase/Program become `role="listbox"` option buttons (DD-3) with the Program search box and "Select a phase first" hint. Search placeholder uses the new key. Add `...HlmPopoverImports` and `NgIcon` to `results-notifications.module.ts`. **Moved from T-1 (2026-10-05):** remove `filterPopoverOpen`, `filterTriggerRef`, `filterPanelRef`, `filterPopoverAlign`, both `FILTER_POPOVER_*` constants, `computeFilterPopoverAlign`, `toggleFilterPopover`, `onDocumentClick`, `onDocumentEscape` (and `HostListener` import if unused), the now-unread copy keys `filterButton`/`phasesLabel`/`phasesPlaceholder`, and delete the legacy spec tests bound to them so the spec stays green (T-3 adds the DOM replacements). Keep the spacer, "Mark all as read", "Notification settings", chip row and everything below unchanged.
- **Implements:** FTD-R-1 (S1 incl. `BUT must NOT render Filter` and `AND IT MUST NOT render on settings`), FTD-R-2.S1 (incl. `BUT must NOT contain any other facet's controls`), FTD-R-4.S1 `BUT inside clicks must NOT close` (checkboxes/search stay inside the overlay element), FTD-R-5 (table of controls; S1, S4 empty/“no … yet” messages), FTD-R-6 (visual badge/active style), FTD-R-7 (chip row untouched), FTD-R-10 (`flex-wrap`), FTD-AC-1, FTD-AC-2, FTD-AC-3, FTD-AC-7, FTD-AC-8
- **Files (expected):** `results-notifications.component.html`, `results-notifications.module.ts`, `results-notifications.component.ts`, `results-notifications.component.spec.ts` (legacy-test deletion only), `contribution-request-drawer.copy.ts`
- **Depends on:** FTD-T-1
- **Blocks:** FTD-T-3
- **Estimate:** M
- **Review:** full (design-system surface; Spartan contract)
- **Verification:**
  - **Falsifier:** rendering the inbox route yields a `button[data-facet]` list whose order ≠ `phase,type,funding,resultType,program,center,bilateral`, or any `button` with text `Filter`; opening `center` yields a content element that contains a `bilateral` checkbox; settings route yields any `[data-facet]`.
  - **Red run:** `npm run build -- --configuration development` (templates are not type-checked by `tsc`; a broken binding fails here) + the T-3 DOM tests. Removing the legacy members first (before the template rewrite) fails the build — that is the red.
  - **Disqualifier:** if `hlm-popover-content` cannot render inside jsdom so the DOM tests only pass by asserting on the component state, the DOM assertion is not evidence — record it and lean on T-3's browser check. Any new hex, `text-sm`-style rem utility or `app-pr-select` inside a popover fails review.
  - **Consumers:** none (no shared symbol changed); `NotificationItemModule` and the chip row untouched.
  - **Cannot prove:** layout, viewport fit, visual match — T-3.
- **Definition of done:**
  - [x] Build green; `npx eslint` on the touched TS clean
  - [x] Only `var(--pr-*)` tokens, px type sizes, Spartan primitives, lucide icon
  - [x] Spartan MCP consulted for `hlm-popover` inputs before writing (client `CLAUDE.md` rule)

### FTD-T-3 — Port the toolbar tests + real-browser check

- **Type:** tests
- **Description:** Rewrite the spec's "Filter toolbar" `describe` (L305-443): the legacy tests bound to `filterPopoverOpen`/`[aria-label=Filter]`/document clicks are already deleted in T-2 (re-sequenced 2026-10-05); add DOM tests for trigger order, no `Filter` button, settings-route absence, `aria-expanded` toggling, only-its-facet content (portal content queried from `document`, per `program-overview.scope.spec.ts`), overlay `stateChanged('closed')` → closed. Keep every facet-option / chip / Clear-all test. Then run the app and verify in a real browser (inject `token` **and** `user`, confirm the bundle is not stale — client `CLAUDE.md` §9) at 1280 px and 768 px.
- **Implements:** FTD-R-1..R-7 test ownership, FTD-R-2.S2, FTD-R-4.S1 (outside click — real), FTD-R-4.S2 (Escape + focus — real), FTD-R-10, FTD-AC-5, FTD-AC-6, FTD-AC-11, FTD-P-4 confirmation
- **Files (expected):** `results-notifications.component.spec.ts`
- **Depends on:** FTD-T-2
- **Blocks:** —
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier (Jest):** temporarily swap two entries in `filterFacets` → the order test must fail; temporarily render the `bilateral` body in every popover → the only-its-facet test must fail. If neither fails, the tests are not reading the DOM.
  - **Falsifier (browser):** at 1280 px the `Bilateral project` dropdown extends past the right edge; clicking a checkbox inside closes it; Escape leaves focus on `body`; clicking the open trigger leaves it open (FTD-P-4 race); at 768 px the page scrolls horizontally.
  - **Red run:** `npm run test:local -- --testPathPattern=results-notifications.component` — red until T-2's DOM exists, green after.
  - **Disqualifier:** a browser check run against a dev server you did not start, or without the `user` localStorage key, is not evidence (client `CLAUDE.md` §9). Screenshots must show the actual dropdown open, not just the row.
  - **Consumers:** none (no shared symbol changed)
  - **Cannot prove (Jest):** layout and overlay dismissal in a real browser — covered only by the manual step; record the result (pass/fail + screenshots) in `execution.md`.
- **Definition of done:**
  - [x] Scoped Jest green; the two falsifier mutations each turned a test red, then reverted
  - [x] Browser check recorded at 1280/768 px incl. outside click, Escape focus, trigger re-click, **dropdown anchored under its trigger** (re-checked 2026-10-06)
  - [x] Coverage of the component not lower than before

## 4. Dependency graph

```
FTD-T-1 (state + copy + unit tests)
   └── FTD-T-2 (template + module)
         └── FTD-T-3 (DOM tests + real-browser check)
```

Strictly sequential — all three touch the same component; no parallel branch.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| FTD-TEST-1 | unit (client) | R-3, R-4 (state), R-5.S2/S3/S4, R-6, AC-4, AC-9, AC-10 | `results-notifications.component.spec.ts` (T-1) |
| FTD-TEST-2 | DOM (client, Jest) | R-1, R-2.S1, R-7, AC-1, AC-2, AC-3, AC-7, AC-8 | same spec (T-3) |
| FTD-TEST-3 | manual browser | R-2.S2, R-4 (real), R-10, AC-5, AC-6, AC-11, P-4 | `execution.md` evidence (T-3) |

## 5A. Scenario / clause coverage

| Requirement clause | Owner |
|---|---|
| R-1.S1 order · `BUT no Filter` · `MUST NOT on settings` | T-2 (impl), T-3 (test) |
| R-2.S1 anchored + `aria-expanded` · `BUT no other facet controls` | T-2, T-3 |
| R-2.S2 viewport fit | T-3 browser |
| R-3.S1 switch · `MUST exactly one` | T-1 |
| R-3.S2 re-toggle closes | T-1 |
| R-4.S1 outside closes · `BUT inside must NOT close` | T-1 (state), T-2 (inside DOM), T-3 browser |
| R-4.S2 Escape + focus restore | T-1 (refocus), T-3 browser |
| R-5 table of controls | T-2 |
| R-5.S1 multi-select list/chip/count · stays open | T-2 (kept existing handlers), T-3 (existing tests kept) |
| R-5.S2 hint · programs after phase | T-1, T-2 |
| R-5.S3 close on pick · Program re-pick clears · `BUT Phase not clearable / no reload` | T-1 |
| R-5.S4 search · nothing-matches · empty | T-1 (Program), T-2 (all facets) |
| R-6.S1 badge · no badge empty · Phase name · updates on chip/Clear all | T-1, T-2 |
| R-7 chips + Clear all unchanged | T-2 (untouched), T-3 (kept tests) |
| R-10 wrap | T-2, T-3 browser |
| R-11 placeholder | T-1 (copy), T-2 (binding) |

## 6. Rollout & verification

- [ ] Commit(s) only on explicit user go-ahead; subject `🎨 style(results-notifications) [SPEC:notifications/filter-toolbar-dropdowns]: …` — no apostrophes/`$`/quotes (Jenkins)
- [ ] Manual QA on test env: open every dropdown, apply one value each, Clear all

## 7. Cleanup & follow-ups

- [ ] Spec status → `shipped`
- [ ] If the per-facet dropdown pattern is to be reused elsewhere, promote it to `docs/ux-ui/design.md` §12 on `staging`

## 8. Roll-back plan

1. Revert the commit(s). No migration, flag or payload involved.

## Required cross-references

[`requirements.md`](./requirements.md) · [`design.md`](./design.md) · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md`
