> **FRONTEND ONLY.** No task below touches `onecgiar-pr-server/`, runs a migration, or changes git
> state. Two items need work this change does not do — the optional `Parent` column and a real AoW
> description — and they leave as Jira tickets in group 8, not as code.
>
> Paths are relative to `onecgiar-pr-client/`. Shorthands:
> `AOW-TABLE` = `src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component`
> `BAND` = `src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component`
> `HOST` = `src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component`
>
> ⚠️ A sibling change is proposing work on the **Overview** tab in this same feature folder. Do not
> touch `components/program-overview/*` or the `showOverview()` branch of `HOST.html`.
> ⚠️ Run only the touched specs (`npm run test -- --testPathPattern="<file>.spec"`), never the suite.

## 1. Frontend — kill the dead row control (D1)

- [x] 1.1 In `HOST.html`, bind `(openRowMenu)="onReportingRowMenu($event)"` on `<app-reporting-aow-table>` (the element currently binds `openRow`, `reportRow`, `openTarget`, `openAchieved`, `allOpenChange`, `openAow` — and not this one).
- [x] 1.2 In `AOW-TABLE.ts`, add local menu state (`openMenuRowKey = signal<string | null>(null)`) and a `toggleRowMenu(row, event)` that stops propagation so opening the menu does not also fire `openRow`.
- [x] 1.3 In `AOW-TABLE.html`, render the design's 3-item menu anchored to the `⋯` button (`PRMS-Reporting.dc.html:1814-1821`): `View reported results`, `Target details`, `Copy indicator code`. Reuse the existing `pr-row-action`-adjacent styling; tokens only.
- [x] 1.4 Close the menu on `Escape` and on outside click (hard UI rule 4). Do not open a second menu while one is open.
- [x] 1.5 **CHANGED FROM PLAN.** Items 1 and 2 re-dispatch to the EXISTING `openAchieved` / `openTarget` outputs from inside the table, so the host needed no new handler at all. Item 3 (`Copy indicator code`) ships **visible but disabled with a `Coming soon` tag** instead of copying: the payload has no user-facing indicator code — `indicator_id` is an internal key that is never displayed anywhere in the UI, so copying it would hand the user a number they have never seen. `openRowMenu` was removed rather than bound (nothing else used it).
- [x] 1.6 **DROPPED — no longer applicable.** No clipboard write ships (see 1.4), so there is no fallback to build. Re-open together with the backend indicator-code field.
- [x] 1.7 Spec: `AOW-TABLE.spec.ts` — the `⋯` button emits `openRowMenu` and does NOT emit `openRow`; menu closes on `Escape`. `HOST.spec.ts` — the copy handler falls back on clipboard rejection.

## 2. Frontend — honest empty states + Clear filters (D4)

- [x] 2.1 In `HOST.ts`, add a `reportingFiltersActive` computed reading all five signals (`plannedSearch`, `reportingAowFilter`, `reportingTypeFilter`, `reportingTypologyFilter`, `reportingStatusFilter`). One computed, so a sixth filter later changes one place.
- [x] 2.2 Add `filtersActive = input<boolean>(false)` to `AOW-TABLE.ts` and bind it from `HOST.html`.
- [x] 2.3 In `AOW-TABLE.html`, replace all four `search().trim() || statusFilter() !== 'all'` conditions (≈L14, L98, L174) with `filtersActive()` — this is the bug where a Category filter made a card claim "This area of work has no planned indicators yet."
- [x] 2.4 Add the design's ghost `Clear filters` button (`PRMS-Reporting.dc.html:1674`) to the filtered-empty state only, as a new `clearFilters` output. Leave the genuinely-empty copy without it.
- [x] 2.5 In `HOST.ts`, implement `clearReportingFilters()` resetting all five signals, and bind it.
- [x] 2.6 Spec: `AOW-TABLE.spec.ts` — with `filtersActive` true the message is the filtered one and `Clear filters` renders; with it false the message is the not-planned-yet one and the button is absent.

## 3. Frontend — real info popover on the card header (D3)

- [x] 3.1 In `AOW-TABLE.html`, replace the `<span [prTooltip]="group.aow.name">` ⓘ (≈L58-62) with a `<button>` carrying `aria-label="About this group"` and `aria-expanded`, matching the design's 20×20 hit area and hover colour.
- [x] 3.2 Build the popover per `PRMS-Reporting.dc.html:1706-1715`: 420px, title row with a close button, a scrollable body capped at 132px, and a meta footer above a divider. Tokens only.
- [x] 3.3 Fill the derivable parts: title = chip + group name; meta footer = KPI count and, for AoW cards, the band split (High level outputs / Outcomes counts).
- [x] 3.4 Body renders `No description available yet` + a `Coming soon` tag. `BAND.ts`'s `resolvedDescription` SP01-blurb fallback was deliberately NOT copied (it is now recorded as a trap in `dashboard-lab/CLAUDE.md`).
- [x] 3.5 Close on `Escape`, on the close button, and on outside click. Opening/closing must not toggle the card's expanded state (`stopPropagation` on the header button).
- [x] 3.6 Spec: `AOW-TABLE.spec.ts` — the ⓘ is a button, opens the popover, `Escape` closes it, the card stays collapsed, and the body shows the Coming-soon copy when no description exists.

## 4. Frontend — tokens, and the metric drift (D5, D6-adjacent)

- [x] 4.1 In `src/styles/colors.scss`, add `--pr-chip-intermediate-bg/-fg` and `--pr-chip-2030-bg/-fg`. Do **not** point the 2030 pair at `--pr-status-approved-bg` — `#d1fae5` is that token's value and a bucket chip must not mean "approved".
- [x] 4.2 In `AOW-TABLE.ts` `headerChipClass()`, replace `bg-[#E0E7FF] text-[#3730A3]` and `bg-[#D1FAE5] text-[#0F766E]` with the new tokens.
- [x] 4.3 Sweep the remaining literals: `hover:bg-[#EFEEF3]` (`AOW-TABLE.html:130`), `hover:bg-[#F3F2F7]` (`AOW-TABLE.html:291`), and `color: #6b46e5` twice in `AOW-TABLE.scss` (L80, L94).
- [x] 4.4 Card name `text-[17px]` → `text-[16px]` (`AOW-TABLE.html:54`), matching the design's 16px/700.
- [x] 4.5 Row separator: `border-bottom` → `border-top` in `.pr-reporting-row` (`AOW-TABLE.scss:49`).
- [x] 4.6 Drop the `w-[42px]` pin on the `%` cell (`AOW-TABLE.html:82`), which can clip `100%`; keep `whitespace-nowrap` so it still never wraps.
- [x] 4.7 Verify no hex literal remains: `grep -nE '#[0-9A-Fa-f]{3,6}' AOW-TABLE.{html,scss}` returns only comment lines.

## 5. Frontend — the `All indicators` table (D2) — last, and independently revertable

- [x] 5.1 In `AOW-TABLE.html`, replace the `viewMode() === 'flat'` branch (currently the grouped `indicatorRow` template with `showAow: true`) with a dedicated table template. Leave `.pr-reporting-row` and the grouped branch untouched.
- [x] 5.2 Columns, in the design's order: `Indicator`, `AoW`, `Type`, `Center`, `Target`, `Achieved`, `Status`, then the row action and the `⋯`. All are payload-backed (`center_acronym` is on the row, `AOW-TABLE.ts:18`). **No `Parent` column and no placeholder cell for it.**
- [x] 5.3 **CHANGED FROM PLAN.** No new `overflow-x: auto` wrapper: `app-pr-table` already renders its own `.pr-table-wrap` scroller, and adding one gave two scrollbars for one axis. Sticky edges verified in-browser at 1280 and 1440 (page never scrolls sideways). The row gutter had to move from `padding` into the first/last grid tracks — as padding, the 20px strip beside each pinned cell stayed uncovered and scrolled columns showed through it.
- [x] 5.4 `AoW` cell: monospace code chip, or an em dash when the row is a programme-level bucket. `Type` cell: the category chip. `Status` cell: the design's dot + label pill, coloured from status tokens.
- [x] 5.5 Add sort state (column + direction) local to the flat template. Numeric sort for `Target` / `Achieved`; rows with no reported figure group at one end rather than sorting as `0`. Only one column sorts at a time, with a visible direction indicator.
- [x] 5.6 Do **not** let sorting reach `visibleGroups()` or `bandsOf()` — the grouped view's order must not change.
- [x] 5.7 Do **not** modify `statusOf`, `progressOf`, `figure` or `ratioOf`: `aow-hlo-table` and `program-overview` read the same derivations and would drift invisibly.
- [x] 5.8 The `Optional columns` popover is not built — with `Parent` out of scope and `Center` always shown it has nothing to toggle, and the design's own trigger button is missing (blank line at `PRMS-Reporting.dc.html:1624`). Recorded in the proposal.
- [x] 5.9 Spec: `AOW-TABLE.spec.ts` — flat mode renders a header row; each header sorts and reverses; `Target` sorts numerically; em-dash rows do not sort as zero; grouped order is unaffected.
- [ ] 5.10 **NOT DONE — carried forward.** Cypress CT for the sticky edges at 1280/1440. Verified manually in the real browser this session instead (measured `scrollWidth` 1392 vs `clientWidth` 954, one scroller, pinned-cell offsets, zero gutter bleed, no page-level x-scroll) and captured in `.local-screenshots/p2-3405-06-*`. A CT still belongs here because jsdom cannot lay out `position: sticky` — the Jest suite would stay green while this breaks.

## 6. Frontend — documentation (D6)

- [x] 6.1 Add two entries to `docs/DESIGN-DEVIATIONS.md`: (a) Target/Achieved open the shared `indicator-drawer` instead of the design's anchored popovers — reason: the drawer already ships and forking it would put the same data behind two surfaces; (b) Intermediate/2030 render as top-level sibling cards. For (b) record that the code comment in `AOW-TABLE.ts` calling this an "owner-rejected design bug" is **stale** — the live design's `a.hasTag` branch renders exactly these sibling cards, so code and design now agree.
- [x] 6.2 Point the source comments at the catalogue (`// See docs/DESIGN-DEVIATIONS.md#…`) in `HOST.ts` (≈L1657) and `AOW-TABLE.ts` (≈L30).
- [x] 6.3 Wrote `components/reporting-aow-table/CLAUDE.md` (58 lines) — contract, host-owns-data split, the untouchable shared derivations, and every trap that actually regressed this session (pr-table dark skin, absent card `overflow`, grid gutter, double scroller, string sort).
- [ ] 6.4 **NOT DONE, deliberately.** `reporting-program-band/**` was declared off-limits this session, so no file was added inside it. Its contract and the `resolvedDescription` blurb-fallback trap are instead recorded as a row in `dashboard-lab/CLAUDE.md` (the convention's "child without its own file" case). Promote to its own file whenever that folder is next opened for editing.
- [x] 6.5 Write `dashboard-lab/CLAUDE.md` — the tab branches, which signals own the filters, and where the drawer is opened from.
- [x] 6.6 Re-stamp every `Verified:` line touched, in the same commit as the code (repo hard rule).

## 7. Verification (no git actions)

- [x] 7.1 `npm run lint:fix` clean on the touched files.
- [x] 7.2 `npm run test -- --testPathPattern="reporting-aow-table.component.spec"` and the same for `reporting-program-band` and `dashboard-lab` — paste real output, never "should pass". Client thresholds 50/60/60/60 must hold.
- [ ] 7.3 **NOT RUN** — no new component test was added (see 5.10), so there was nothing new for `npm run test:ct` to cover.
- [x] 7.4 Confirm the payload really carries what group 5 renders: `TOKEN=$(grep '^USER_TOKEN=' /Users/yeck/Desktop/reporting/.env | cut -d'"' -f2)` then `curl -s -H "auth: $TOKEN" "https://prtest-back.ciat.cgiar.org/api/results-framework-reporting/toc-results?program=<SP-code>&areaOfWork=<AOW>" | head -c 2000` — check `center_acronym`, `type_name`, `result_type_name`, `progress_percentage` are present and no `parent` field exists. Never print the token.
- [x] 7.5 Browser check, `npm start` only (no local server — the client points at prtest): open a Science Program → Reporting. Verify (a) `⋯` opens the 3-item menu and Copy shows a toast; (b) setting **Category** alone to something with no rows shows "no indicators match the current filters" + `Clear filters`, and clearing restores the list; (c) ⓘ opens a popover, `Escape` closes it, the card stays collapsed; (d) `All indicators` shows a sortable table with a sticky header, and sorting does not change the Grouped order; (e) a `0 of N / 0%` card still expands.
- [x] 7.6 Screenshots to `onecgiar_pr/.local-screenshots/` as `p2-3250-<description>.png` (gitignored — never commit them).

## 8. Jira hand-off — user action, not code

- [ ] 8.1 File the **optional `Parent` column** under `P2-3250` (child of epic `P2-3172`): needs a new field on `GET /api/results-framework-reporting/toc-results`, plus a design answer on whether the `Optional columns` control is intended at all given its trigger button is missing from the mockup.
- [ ] 8.2 File a ticket for **Ángel** (Ángel Alberto Jarrín Rivas, `a.jarrin@cgiar.org`, accountId `712020:ed59efaa-46e7-439b-9dd1-702edad6bc10`) covering the `Coming soon` info-popover body. Plain language, no file paths, no component names: say where it is (Science Program → Reporting → the small ⓘ next to an Area of Work name), what the user sees ("a note saying the description isn't available yet"), why in one sentence, and state explicitly that the ticket is only an FYI he can close.
- [ ] 8.3 Raise the **product question** on the AoW progress bar under `P2-3250`, linking `P2-2276` (which deliberately removed an AoW percentage bar in 2025) and `P2-3296`: is coverage of KPIs-with-anything-reported the agreed replacement metric, and is `P2-2276` superseded? Note the same bar already ships on the Overview tab, so removing it here would make the two tabs disagree. **No code change either way until product answers.**
- [ ] 8.4 Note the naming collision before anyone files more: "Reporting tab" is also used by `P2-3314` (bilateral) and "Results tab" by `P2-3169`/`P2-3317` — title new tickets "Science Program shell → Reporting tab" to stay unambiguous.
