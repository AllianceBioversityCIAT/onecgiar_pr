## Context

The Reporting tab is rendered by three components under
`src/app/pages/result-framework-reporting/pages/dashboard-lab/`:

```
dashboard-lab.component.{html,ts}          host — owns data, filters and the drawer
├── components/reporting-program-band/      toolbar — search + 4 filters + Grouped/All
└── components/reporting-aow-table/         cards + rows (PRESENTATION ONLY, no service)
```

**Data flow today.**

```
GET /api/results-framework-reporting/toc-results?program=&areaOfWork=
        │  rows: indicator_description, type_name, result_type_name,
        │        target_value_sum (string), actual_achieved_value_sum,
        │        progress_percentage, unit_messurament, center_id, center_acronym,
        │        toc_result_id, __hlo, __tier, __aowCode, __aowName
        ▼
dashboard-lab.reportingGroups()            ← applies Section / Type / Category filters here
        │  ReportingAowGroup[] { aow{code,name}, indicators[], count, loading, kind }
        ▼
<app-reporting-aow-table [groups] [search] [statusFilter] [viewMode] … >
        │  applies ONLY search + statusFilter (visibleRows)
        ▼  outputs: openRow · reportRow · openTarget · openAchieved · openRowMenu · openAow · allOpenChange
dashboard-lab handlers → manageIndicator(row, hlo, 'info'|'report') → indicator-drawer
```

The split matters: **three of the five filters never reach the table.** That is the root cause of
the misleading empty-state copy, and it is why `filtersActive` must be computed by the host, not
inferred by the child.

`ReportingAowTableComponent` is deliberately service-free and OnPush — the class doc states it "owns
no fetching and no service … which keeps it testable without the 287-LOC EntityAowService and
reusable from the Results Center later." Every change below preserves that: new behaviour arrives as
`input()` and leaves as `output()`.

**Other consumers of the same data.** `entity-aow/pages/entity-aow-aow/components/aow-hlo-table/`
renders the same rows on the legacy AoW surface and derives status with the *same* thresholds
(`>100` overachieved / `100` achieved / `>=1` in-progress / else not-started). `program-overview`
renders the same `done/total` ratio and the same 120×8 bar for the Overview tab, fed by
`overviewAowProgress()`. **Do not change `statusOf`, `progressOf`, `figure` or `ratioOf`** — three
surfaces agree on them today and drift would be invisible until someone compares two tabs.

## Goals / Non-Goals

**Goals:**
- No inert controls on the surface.
- The `All indicators` mode is the design's table, over columns the payload actually has.
- Every string the surface shows is true (empty-state copy, info popover body).
- Colours come from tokens.
- The two accepted deviations survive the next fidelity pass.
- The child component stays presentation-only and OnPush.

**Non-Goals:**
- Changing what "progress" means (`ratioOf`) or any status threshold — see *Open Questions*.
- Replacing the `indicator-drawer` with anchored popovers.
- The optional `Parent` column, and any new backend field.
- Touching the Overview tab (a sibling change is proposing there — same feature folder, different
  files; `program-overview.*` and `dashboard-lab`'s Overview branch are off-limits here).
- The `Expand all` / `Collapse all` button, which the design does not show but QA asked for
  (P2-3252, Ready For UAT). It stays.

## Decisions

### D1 — Wire the `⋯` menu rather than delete it

`openRowMenu` is emitted from `reporting-aow-table.component.html:293` and bound nowhere.

*Alternative considered (recommended by BOTH external advisors): delete the button.* Their argument
is sound — two of the three items duplicate the Target and Achieved click targets that already open
the drawer, so the menu is mostly a scavenger hunt, and "a dead control is worse than no control."

**Rejected**, because the project's hard rule is to build what the live design shows and never
silently drop it; the menu is in the design at `PRMS-Reporting.dc.html:1814-1821`. The decision
resolves the advisors' real objection a different way: the two duplicate items cost one line each
(they re-dispatch to `onReportingOpenTarget` / `onReportingOpenAchieved`), so wiring removes the
dead control *and* adds the one genuinely new capability the design asks for — `Copy indicator
code` — without creating a second surface for any data. If product later agrees the menu is
redundant, deleting it is a one-line follow-up; shipping an inert button is not defensible either way.

### D2 — Build the table with payload-backed columns only; no per-row `Coming soon`

Both advisors independently rejected shipping the full 8-column design table with placeholder cells.
Taken.

The audit brief was **wrong** that `Center` is unavailable — `center_acronym` is on the row
(`reporting-aow-table.component.ts:18`). So six of the design's eight columns plus the two the
design already had are covered: `Indicator`, `AoW`, `Type`, `Center`, `Target`, `Achieved`,
`Status`. Only `Parent` is missing, and it is the design's *optional* column.

Consequence: the design's `Optional columns` popover (`allParent` / `allCenter`) has nothing left to
toggle once `Parent` is out and `Center` is always shown, so it is not built. That is not a silent
drop — the design's own trigger button for it is missing (blank line at
`PRMS-Reporting.dc.html:1624`), so the control is unreachable in the design too. Recorded in the
proposal's *Out of scope* for design to resolve.

*Alternative considered: leave the flat list and ticket the whole table* (grok's preference, since
"the list already lists"). Rejected as the primary path: the `Grouped | All indicators` switch is
already live and a user who flips it gets the grouped row with a text prefix, i.e. a mode that looks
unfinished. But the sequencing is honoured — the table is the last task group, so the cheap
correctness fixes can ship without waiting on it.

### D3 — The info popover is built, with an honest body

Both advisors said a `Coming soon` tag on an ⓘ is incoherent ("a disabled ⓘ says *there is
information, you may not have it*"), and grok argued for hiding the ⓘ entirely until a description
exists.

**Partially taken.** Hiding it is rejected — it drops something the design shows. The reconciliation:
build the design's popover shell, fill the parts that are derivable (title = chip + name; meta
footer = KPI count and, for AoW cards, the band split), and render the description body as an
explicit `No description available yet` with the `Coming soon` tag *on the body*, not on the trigger.
The trigger works; only the one field that has no data is marked. That satisfies both the
mockup-fidelity rule and the advisors' honesty objection.

**Explicitly not copied:** `reporting-program-band`'s `resolvedDescription` falls back to a hardcoded
SP01 "Breeding for Tomorrow" blurb when the description is empty
(`reporting-program-band.component.ts:218-222`). grok flagged this as more dishonest than the
tooltip it replaces. Do not reuse that pattern here. (It is pre-existing and out of scope to fix,
but it is noted so nobody copies it.)

### D4 — `filtersActive` is computed by the host

The child cannot know about Section / Type / Category. Add one boolean input, computed in
`dashboard-lab` from all five controls, and use it to choose between the two empty states:

| `filtersActive` | Card body / list is empty → message |
|---|---|
| `true` | "No indicators match your filters." **+ `Clear filters` ghost button** |
| `false` | "This area of work has no planned indicators yet." / "No indicators in this bucket yet." |

Keeping two states rather than collapsing to the design's single `No results match these filters.`
is a deliberate improvement: with no filters set, that sentence would be false. `Clear filters`
appears only on the filtered state and emits up to the band, which owns the five signals.

### D5 — Chip tokens in `colors.scss`, not inline hex

`#D1FAE5` is the value of `--pr-status-approved-bg`, so reaching for that token would make a 2030
chip mean "approved". Add a dedicated pair per bucket
(`--pr-chip-intermediate-bg/-fg`, `--pr-chip-2030-bg/-fg`) and expose them through the existing
`@theme inline` bridge if a utility is needed. Sweep the four other literals in the same two files
at the same time (`#EFEEF3`, `#F3F2F7`, and `#6b46e5` twice in the SCSS).

### D6 — Deviations go in the catalogue, and the code comment points at it

Both advisors: a source comment is the *reason*, the catalogue is the *memory*. Taken. Two entries in
`onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md`, each with the surface, the design behaviour, the
shipped behaviour, the reason and the ticket; the existing comments get a
`See docs/DESIGN-DEVIATIONS.md#…` pointer. The 17px/16px and `border-top` nits do **not** go in the
catalogue — they get fixed instead.

Entry 2 records something the audit turned up: the code comment claims "the design reference nests
[Intermediate/2030] under each AoW — that is a known bug the owner rejected", but the live design's
`repCards` list is flat and its `a.hasTag` branch renders exactly the sibling cards the code ships.
**The comment is stale and code and design now agree** — the entry exists so nobody "restores"
nesting on the strength of an old note.

## Risks / Trade-offs

- **The table is a new grid and the biggest piece of work here** → it is the last task group and is
  independently revertable; the six correctness fixes land first and do not depend on it.
- **Sticky left + sticky right edges inside a horizontal scroller are fragile** (the design uses
  `position:sticky` on grid children with `background:inherit`) → build it as its own template with
  its own Cypress component test at 1280 and 1440; do not retrofit sticky onto `.pr-reporting-row`,
  which the grouped view shares.
- **Sorting must not reorder inside the grouped view** → sort state lives in the flat-table
  template only; `visibleGroups()` / `bandsOf()` stay untouched.
- **`filtersActive` is a new host→child contract that can go stale** if a sixth filter is added
  later and forgotten → derive it from a single `reportingFiltersActive` computed that reads the
  same five signals the band binds, so adding a filter changes one place.
- **Clipboard copy needs a fallback** → `navigator.clipboard` is unavailable on non-secure origins;
  fall back to the existing toast with the code so the action never silently fails.
- **Regression risk on the shared derivations** → `statusOf` / `progressOf` / `figure` / `ratioOf`
  are read by `aow-hlo-table` and `program-overview` too. They are not touched; the spec pins that.

## Open Questions

1. **PRODUCT — the AoW progress bar.** P2-2276 removed it in 2025; the design reinstates it and the
   code ships it, over a *different* metric (coverage of KPIs with anything reported, not completion).
   The same bar is already on Overview. Question for product, in one sentence: *is coverage the
   agreed replacement metric, and is P2-2276 superseded?* Nothing in this change depends on the
   answer. Related: P2-3296.
2. **DESIGN — the `Optional columns` control has no trigger** in the live snapshot. Is the control
   intended, and is `Parent` wanted enough to justify a backend field?
3. **The third toolbar dropdown.** The design's `selInd` is a wide (420px) single-select with wrapping
   options; the shipped control is `Category` (result-type name). The design's placeholder is a
   runtime binding so the snapshot cannot confirm the label. Treated as already correct pending a
   design answer — no change made.
4. **Snapshot truncation.** `get_file` caps at 256 KiB and the file is ~262 KB, so the last ~3.6 KB
   is unreachable. Today's snapshot reaches *less far* than yesterday's (59 lines were added
   upstream), so ~83 lines of the result-detail ToC drawer that were readable yesterday are now out
   of range. The Reporting block itself is fully within range and byte-identical, so this change is
   unaffected — but a future audit of the drawer must account for it.
