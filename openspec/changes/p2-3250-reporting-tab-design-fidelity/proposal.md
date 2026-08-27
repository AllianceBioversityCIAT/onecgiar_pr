## Why

A design-fidelity audit of the **Reporting** tab of the Science Program shell (`Report results
linked to the programme's <year> ToC`) against the live Claude Design snapshot
(`.design-snapshots/PRMS-Reporting.dc.html`, block `showReporting` L1541–1919) found one
user-facing dead control, one view that was never built, two pieces of copy that state something
false, and a set of hardcoded colours that break the tokens-only rule. None of these are covered by
an existing Jira ticket.

The audit also found that the Reporting block is **byte-identical** to the previous snapshot, so
this is a gap between the code and a design that has been stable — not a chase after a moving target.

**Scope: frontend-only.** No server change is required by any item below. Two items are deliberately
*not* implemented here because they need data the backend does not return or a product decision;
they are handed back to the user as Jira work (see *Out of scope*).

Jira: **P2-3250** (`General Enhancements`, child of epic **P2-3172** `Reporting Tool - Revamp`) — the
same parent that already holds the two accepted Reporting-tab tweaks P2-3251 and P2-3252.

Baseline: `docs/ux-ui/design.md` (screens, tokens, components), `docs/prd.md`.
Client rules: `onecgiar-pr-client/CLAUDE.md` §5 (Tailwind-first, no hardcoded hex, no rem type
utilities), `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md`.

## What Changes

- **Wire the row overflow `⋯` menu.** `ReportingAowTableComponent` declares and emits
  `openRowMenu`, but `dashboard-lab.component.html` never binds it — the button is a no-op the user
  can click. Bind it and render the design's three-item menu (`View reported results`,
  `Target details`, `Copy indicator code`). The first two re-dispatch to the handlers that already
  work; only clipboard copy is new behaviour, and the design specifies it.

- **Rebuild the `All indicators` view as the design's table.** Today the flat view re-uses the
  96px grouped row with `showAow: true`, which turns the AoW code into a text prefix. Replace it
  with the design's sticky-header, horizontally scrollable table: sortable `Indicator`, `AoW`,
  `Type`, `Center`, `Target`, `Achieved`, `Status` columns, sticky left edge (status mark + title)
  and sticky right edge (action + `⋯`). All seven are payload-backed (`center_acronym` is present on
  the row). The design's optional-`Parent` column is **excluded** — see *Out of scope*.

- **Replace the fake AoW info affordance.** The ⓘ is currently a hover-only
  `<span [prTooltip]="group.aow.name">` whose content is the name already printed beside it. Make it
  the design's click-to-open popover (title, scrollable body, meta footer, close button, `Escape`
  closes). The meta footer is derivable today (code + KPI count); the description body renders an
  explicit "No description available yet" with a `Coming soon` tag rather than a placeholder blurb.

- **Fix the empty-state copy and add the recovery action.** `ReportingAowTableComponent` only
  receives `search` and `statusFilter`, so when a card is emptied by the **Section**, **Type** or
  **Category** filter it says *"This area of work has no planned indicators yet."* — which is false.
  Pass a single `filtersActive` input covering all five controls, and add the design's ghost
  `Clear filters` button to the filtered-empty state (kept off the genuinely-empty state).

- **Tokenise the hardcoded colours.** `headerChipClass()` returns `bg-[#E0E7FF] text-[#3730A3]`
  and `bg-[#D1FAE5] text-[#0F766E]`; `#D1FAE5` is literally the value of `--pr-status-approved-bg`,
  so the 2030 chip is borrowing a status token's meaning. Also `hover:bg-[#EFEEF3]` and
  `hover:bg-[#F3F2F7]` in the template and `color: #6b46e5` twice in the SCSS. Add dedicated chip
  tokens to `src/styles/colors.scss` and consume them.

- **Catalogue the two accepted deviations** in `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md`:
  (1) Target/Achieved open the shared `indicator-drawer` instead of the design's anchored popovers;
  (2) Intermediate Outcomes and 2030 Outcomes render as top-level sibling cards. Both are currently
  justified only by a source comment, so the next fidelity pass would file them again. *(Note: the
  live design's `a.hasTag` branch now supports sibling cards, so deviation 2 has become agreement —
  the entry records that the code comment is stale.)*

- **Close the small metric drift**: card name `text-[17px]` → `16px`; row separator
  `border-bottom` → `border-top`; drop the `w-[42px]` pin on the `%` cell that can clip `100%`.

- **Write the missing folder docs.** Neither `dashboard-lab/` nor
  `components/reporting-aow-table/` nor `components/reporting-program-band/` has a `CLAUDE.md`,
  despite being the most-edited surface in the module.

## Capabilities

### New Capabilities
- `reporting-tab-indicator-table`: the `All indicators` flat view as a sortable, sticky, horizontally
  scrollable table over payload-backed columns, and the rules for which columns exist.
- `reporting-tab-row-actions`: the row overflow menu contract — which actions exist, which
  re-dispatch to existing surfaces, and the rule that no row control may be inert.
- `reporting-tab-group-disclosure`: the AoW / bucket card header contract — chip, name, info
  popover, KPI count, progress ratio — and the empty/zero-state rules for cards and filters.

### Modified Capabilities
<!-- None. No existing spec under openspec/specs/ describes the Reporting tab; the three
     capabilities above are new. -->

## Impact

**Frontend only.** Files:

- `src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.{html,ts,scss,spec.ts}`
- `src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.{html,ts,spec.ts}` (Clear-filters output, filter-reset)
- `src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.{html,ts}` (bind `openRowMenu`, provide `filtersActive`, clipboard handler, clear-filters handler)
- `src/styles/colors.scss` (new chip tokens)
- `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md` (two entries)
- New `CLAUDE.md` in the three folders above

**No backend change required.** Every column and field this change renders is already in
`GET /api/results-framework-reporting/toc-results`.

**Out of scope — handed back to the user as Jira work, not implemented here:**

1. **The optional `Parent` column** (design's `allParent` / `row.parentName`). Not in the payload.
   Needs a new field. → new ticket under P2-3250, and the backend field request.
   *Also note the design's own `Optional columns` popover has **no trigger button** — the
   `isAllView` wrapper contains a blank line where it should be — so the design cannot open the
   control it defines. Worth raising with design before anyone builds it.*
2. **A real AoW description** for the info popover body. Not in the payload. → Jira ticket for
   Ángel (Ángel Alberto Jarrín Rivas), written in plain language, flagged as an FYI he may close.
3. **PRODUCT DECISION — the AoW progress bar.** P2-2276 (`Released Into Live`, 2025) deliberately
   *removed* the AoW percentage bar from the SP page; the current design reinstates it and the code
   ships it. The shipped bar is also a *different metric* (`ratioOf` counts KPIs with anything
   reported, not KPIs at 100%) and the same bar already appears on the Overview tab. This change
   touches neither the bar nor the metric — it asks product whether the coverage ratio is the agreed
   replacement, and whether P2-2276 should be marked superseded. Related: P2-3296
   (`[ToC Progress] Display % Achievement at Indicator, HLO, AoW and SP Level`).
