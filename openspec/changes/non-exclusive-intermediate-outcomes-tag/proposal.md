## Why

A Theory of Change node that is **not linked to any Area of Work** (`toc_results.wp_id IS NULL`) is program-level by design, so the AoW query deliberately returns it under **every** AoW of the Science Program (`aow-bilateral.repository.ts`, the `AND (wp.toc_id IS NOT NULL OR tr.wp_id IS NULL)` predicate). The very same nodes are also listed on the sidebar page **Intermediate Outcomes** (`/aow/unplanned`, the `intermediateOnly` predicate `AND tr.wp_id IS NULL`).

Verified on prtest with `SP05`: `toc_result_id` **7208** and **7258** are returned by all six AoW (AOW01–AOW06) and are exactly the set returned by `/toc-results/intermediate-outcomes`. Every other outcome is returned by a single AoW.

Today the UI shows both kinds in one undifferentiated list, so a user inside AOW06 cannot tell that an Outcome is shared with the whole program rather than owned by their AoW. Reported on Slack (2026-08-03) by **Ángel Jarrín**, with mockups from **Héctor Tobón**, for a stakeholder presentation on 2026-08-04.

## What Changes

- On the AoW page **Outcomes** tab, split the single list in two: the Outcomes **exclusive to that AoW** stay in the main table; the ones that are **not exclusive** move to a **separate section below it**, under its own heading.
- Each group in that new section carries a **tag** (`Not exclusive to this AoW`) with a tooltip explaining that the node is not assigned to a single Area of Work, plus a short info note above the section.
- On the sidebar page **Intermediate Outcomes** (`/aow/unplanned`), add a **descriptive note** explaining what those entries are and why they differ from the Outcomes shown inside an AoW.
- The split is driven by the backend flag **`is_aow`** (`false` ⇒ not exclusive), added by Juan David Delgado in commit `3620284f3` on this branch. The client only reads the flag; it does not re-derive the rule.

## Capabilities

### New Capabilities
- `aow-non-exclusive-outcomes`: On the AoW Outcomes tab, program-level Intermediate Outcomes are separated into their own tagged section below the AoW-exclusive ones, and the Intermediate Outcomes page explains what those entries are.

### Modified Capabilities
<!-- None. `aow-indicator-search` (P2-3141) and `aow-repeated-indicator-banner` (P2-3052) keep their current behaviour; the search filter applies to each table instance independently. -->

## Impact

- **Frontend** (`onecgiar-pr-client`). The backend flag already shipped on this branch — no further server change is required for this proposal.
- Affected files:
  - `.../entity-aow/services/entity-aow.service.ts` — two derived lists split by `is_aow`.
  - `.../entity-aow-aow/components/aow-hlo-table/aow-hlo-table.component.{ts,html,scss}` — new `tableType`, the tag, and two inputs (`showSearch`, `renderOverlays`) so a second instance does not duplicate the search box or the modal/drawers.
  - `.../entity-aow-aow/entity-aow-aow.component.{html,scss}` — the second section below the main table.
  - `.../entity-aow-unplanned/entity-aow-unplanned.component.{html,scss}` — the descriptive note.
- **Behaviour preserved:** tab counts keep showing the unfiltered total; the High-Level Outputs tab, the 2030 Outcomes page and the Intermediate Outcomes page are untouched in behaviour; the P2-3141 search filter and the pre-expanded groups keep working on both tables.
- No routing, guard, interceptor, API, data-model or migration change. No new dependency.
- Copy is authored in **English, hardcoded in the templates** — the `result-framework-reporting` tree does not use the terminology pipe anywhere, and this copy does not vary between P22 and P25.
