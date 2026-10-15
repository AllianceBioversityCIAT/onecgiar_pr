# Proposal — SP Overview: Total General reconciles + rows drill down to their results

## 1. Document Control

| Field | Value |
|---|---|
| Type | Change (supersedes `STG-R-2` of the archived `changes/sp-overview-total-general-card`) |
| Spec path | `changes/sp-overview-total-drilldown` |
| Slug | `sp-overview-total-drilldown` — derived from free-text argument |
| Approval Mode | gated |
| Owner | santiago.sanchez@cgiar.org |
| Date | 2026-10-15 |
| Depends on | none |
| Parallel-safe | yes (not a child of `portfolio-overview-revamp`; that family touches the Portfolio overview, not the SP Overview) |
| Evidence | Prod SP05: headline 69, rows 62 + 7 + 8. Test SP05: headline 7, rows 1 + 6 + 2 |

## 2. Intent

The **Total General** card on a Science Program's Overview (`entity-details/:code/overview`) must (a) show a headline equal to the sum of its rows, and (b) let a user click a row to see **which** results make up that number.

## 3. Problem / Current Behavior

| # | What users see | Why (confirmed in code) |
|---|---|---|
| P-1 | Headline does not add up: prod `69` vs `62 + 7 + 8 = 77`; test `7` vs `1 + 6 + 2 = 9` | By design of `STG-R-2`: `programResultsTotal = replicated + new`, it never adds the W3/Bilateral "awaiting review" row (`program-overview` CLAUDE.md, "Total General (KPI 1)") |
| P-2 | Clicking **New results** or **Innovations replicated for update** shows no list of those results | Both rows call `setActiveSection('w1w2')` (`program-overview.component.html:~95-108`), which only hides non-W1/W2 cards. No card lists results, and no view splits new vs replicated |
| P-3 | Clicking **W3/Bilateral results awaiting review** shows cards, not the 8 pending results | Row calls `setActiveSection('bilateral')`; the pending list lives in the **Bilateral review** tab |

Side observation (not in scope): the prod screenshot URL carries `status=Editing`, and the host drops Editing rows from every W3/Bilateral card, so those cards read "No bilateral results" while the KPI (unfiltered, status 5) shows 8. That mismatch is expected but confusing.

## 4. Proposed Outcome

- Headline = **replicated + new + awaiting review** (prod 77, test 9). Tooltip states the three parts.
- **Composition bar (chosen: Option A of the chart follow-up, 2026-10-15):** a horizontal stacked bar under the headline, inside the same card, with three segments — Replicated · New · W3/Bilateral awaiting review — each width = its count ÷ headline. Plain DOM (not a canvas), same discipline as the card's other bars, so each segment is a focusable button with a tooltip (`"62 innovations replicated for update — view list"`). A zero-count segment is not rendered; an all-zero card shows an empty track. The legend is the existing three rows (a colored dot is added before each label to tie row ↔ segment).
- Each segment **and** each row is a link that **navigates** to the list behind it:

| Row | Destination |
|---|---|
| Innovations replicated for update | **Results** tab · `?origin=W1/W2&replication=replicated&phase=<effective>` |
| New results | **Results** tab · `?origin=W1/W2&replication=new&phase=<effective>` |
| W3/Bilateral results awaiting review | **Bilateral review** tab · `?status=pending&phase=<versionId>` |

- The Results tab gains a **Replication** filter (`New` / `Previously reported`), backed by the `isReplicated` flag every row already carries (same `is_replicated` the server counts in `results.service.ts:1938-1944`). Chip + URL sync like the other filters.

## 5. Scope

- `program-overview` (Total General card template + composition bar, `OverviewLink`, row click handlers, headline computed).
- `dashboard-lab` host (`programResultsTotal`/`overviewTotalBreakdown`, `onOverviewLink`, a navigation to the Bilateral review tab).
- `programme-results` (new `replication` dimension: query-param map, filter service, toolbar control, chip).
- Jest specs for the three areas; component guides (`program-overview/CLAUDE.md`, `programme-results/CLAUDE.md`).

## 6. Non-Goals

- No server change, no new endpoint (all data is already on the client).
- No change to the Portfolio overview (`portfolio-overview-revamp` family).
- Not making the KPI follow the Filter popover / AoW scope — it stays program-wide.
- Not fixing the `status=Editing` vs W3 cards confusion (P-side observation).

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| SP leads / PMU on the Overview | Primary users |
| `changes/sp-overview-total-general-card` (archived) | `STG-R-2` replaced: headline now includes awaiting review |
| `changes/sp-overview-echarts/results-tab-filter-deeplink` | Query-param contract extended with `replication` |
| SR-164368 (row → section toggle) | Behavior replaced by navigation |

## 8. Visual Reference

- Source: Screenshots in the request (prod + test SP05) + agreed sketch below (Option A, 2026-10-15).
- Notes: segment colors must come from approved `--pr-*` chart tokens with ≥3:1 contrast on the purple gradient (WCAG 1.4.11); the spec picks them from `docs/ux-ui/design.md` §7.

```
TOTAL GENERAL                                   [Program]
77 results
[██████████████████████████████████████|███|████]
 ● Innovations replicated for update  62  →
 ● New results                         7  →
 ● W3/Bilateral awaiting review        8  →
```

## 9. Requirement Delta Preview

### ADDED
- Results tab: `Replication` filter (`new` | `replicated`), URL param `?replication=`, chip, clear.
- Each Total General row navigates to its list (table above).
- Total General composition bar: 3 clickable segments, widths proportional to the headline, dot legend on the rows.

### MODIFIED
- Total General headline = replicated + new + awaiting review (was replicated + new).
- Row `aria-pressed` toggle → link semantics (`aria-label="View N new results"`).

### REMOVED
- Rows no longer toggle the `w1w2` / `bilateral` section (the Filter popover still does).

## 10. Approach Options

| Option | How | Trade-off |
|---|---|---|
| **A. Navigate to existing tables + add Replication filter** | Results tab filter on `isReplicated`; bilateral row → Bilateral review `?status=pending` | Small, client-only, reuses lists users already know. Needs one new filter dimension |
| B. In-page drawer listing the results | New drawer component on the Overview | Duplicates the Results table (sorting, open-result routes) — more code, two lists to keep in sync |
| C. Navigate without a new filter (only `origin=W1/W2`) | Rows go to Results unfiltered by new/replicated | Smallest, but doesn't answer "which are the new ones" — fails the request |

## 11. Recommended Approach

**Option A.** It answers "which results are these" with the tables users already work in, adds one filter that maps 1:1 to a flag already on every row, and needs no server work.

## 12. Risks, Dependencies, And Open Questions

| # | Item |
|---|---|
| R-1 | **Count parity.** KPI counts rows by owner (`submitter_id`); the Results tab may also list contributor-only rows (see `programme-results/CLAUDE.md` contributor deltas). Clicking "New 7" could show a different count. Spec must pin which population the filter shows and verify on SP05 prod/test numbers |
| R-2 | Bilateral review tab counts must match `8` / `2` for the effective phase (its `?phase=` is a `versionId`, not a label) |
| R-4 | Bar segment contrast on the purple gradient card — white/semi-white fills may fail 3:1; needs token choice + check |
| R-5 | Tiny segments (e.g. 1 of 77) get a minimum visible width so they stay clickable, without breaking proportion meaningfully |
| R-3 | Card-row tests assert `aria-pressed` toggle (SR-164368) — they will be rewritten deliberately |
| OQ-1 | Should the headline include **all** W3/Bilateral in review (Pending + Approved + Rejected) instead of only awaiting review? Proposal assumes the literal sum of the three visible rows |
| OQ-2 | Label for the filter: "Replication: New / Previously reported" (matches the existing pill) or "New / Replicated for update" (matches the KPI row)? |

## 13. Success Criteria

- On SP05 the headline equals the sum of the three rows (prod 77, test 9), and the bar segments are proportional to those counts.
- Clicking each row lands on a list whose count equals the row's number for the same phase.
- Results tab `?replication=new` deep link reload restores the filter and chip.
- Affected Jest specs green (`--maxWorkers=2`, scoped).

## 14. Next Step

```text
/akili-specify changes/sp-overview-total-drilldown
```
