# program-overview

**Verified:** 2026-09-02 · branch qa-development-2026 · 167cd2244

**What this owns:** the **Overview** tab of the programme shell — the six cards under
`entity-details/:entityId/overview`. Purely presentational: every figure arrives as a signal input.

## Invariants

- 🛑 **This is the live Overview. `pages/entity-details/` is NOT.** That route loads
  `DashboardLabComponent` (`shared/routing/routing-data.ts:574-581`, `data.rfrView: 'overview'`),
  which renders `<app-program-overview>` at `dashboard-lab.component.html:1163`. The legacy
  `EntityDetailsComponent` is retired and unrouted (`routing-data.ts:597`) — editing it changes
  nothing on screen. Its `AGENTS.md` and the OpenSpec change `guided-result-reporting-flow` both
  still describe it as live; they are wrong.
- **Card order is asserted, deliberately.** The spec pins all six `<h2>` in order, because the order
  *is* the requirement (P2-3303: "prominent … under about this program"). A reorder must be an
  explicit edit to that assertion, never a silent diff.
- **Computes almost nothing — one exception.** No `inject()`, no HTTP, no service; every OTHER
  figure arrives as a signal input. The exception (`changes/overview-aow-progress-hero`): `richStats`
  SUMS the `richRows` input itself — the hero rail's own derivation (OAH-R-1 "internal coherence").
  `richRows: OverviewAowProgressRowRich[]` is a **type-only** import from the host
  (`dashboard-lab.component.ts`); the row data itself still comes from the parent's
  `overviewAowProgressRich` computed. `richRows` coexists with the untouched thin
  `aowProgress`/`xcutProgress` inputs (DD-4) — those keep feeding card 4/`aowStats`/the section-tab
  badge/the hub under the OLD unfiltered rule, while `richRows` feeds the hero under the
  zero-target rule (DD-1): two inputs, two rules, on purpose. Any OTHER wrong number is still
  `DashboardLabComponent`'s bug, not this one's.
- **Scope control (`changes/overview-aow-cross-filter`, OSF-T-6):** `scopeGroups`/`scopeFlatKeys`/
  `selectedScopeOption`/`scopeTriggerLabel`/`scopeTriggerCode`/`scopeOptionAriaLabel` reshape the
  `scopeOptions` input for rendering and keyboard order — group, flatten, look up. None of them sum
  or produce a NEW figure, so they don't break the "computes almost nothing" invariant above; they're
  presentation-shaping, same category as `scopeGroups`' own docstring. `activeScopeKey` is pure local
  UI state (the keyboard cursor), not a figure at all.
- **Overview states (OSF-T-7):** `isFiltered` (`selectedScope() !== null`) gates three renderings —
  the `Program-wide` pill + sentence on card 4 (W1/W2 category×status: the ONE card with no ToC join,
  `OSF-R-5`; every other card filters instead, settled `OSF-T-5`), the hero's no-plan swap
  (`heroNoPlan`), and the per-scope breakdown (`!isFiltered()`, `OSF-R-13`). `heroNoPlan` reads
  `richStats().total === 0` — it is `true` both when `richRows()` came back empty (an outcome/
  untagged scope: no AoW code ever equals those keys) AND when the one matched AoW row's own `total`
  is `0`; the hero template checks it BEFORE `richRows().length` so a zero-total row never renders as
  a bare `0/0`. `breakdownGroups` is `scopeGroups`' OWN grouping rule (`groupScopeOptions`, extracted
  so the control and the breakdown can never drift on order) applied to `scopeBreakdown().rows` — a
  group-by, not a sum; `aowSubtotal`/`total` come from the host verbatim. A row whose `count` is `0`
  still renders — only an EMPTY group is dropped.
- **Breakdown short codes + status bar (`changes/overview-aow-cross-filter`, `OSF-T-13`/`OSF-T-14`,
  mockup drift fixes).** `overviewScopeDisplayCode` (module-level exported function, single-homed
  per `OSF-DD-6`) maps the two outcome/untagged internal enum keys to the mockup's short codes
  (`INTERMEDIATE`→`INT`, `EOI_2030`→`2030`, `UNTAGGED`→`—`); AoW keys pass through unchanged. BOTH
  the breakdown row's `.pr-code` cell AND `scopeTriggerCode()` call it — never re-derive the mapping
  a second time. DISPLAY ONLY: `row.key`/`selectScope(row.key)`/the `?scope=` value always stay the
  RAW key. The `.pr-code` cell is `aria-hidden`; the row's own (non-hidden) name span is what carries
  the accessible name — required for the untagged row's bare `—` glyph to mean anything to AT. The
  breakdown's 4th grid track (150px, `breakdownEditingWidth`/`breakdownSubmittedWidth`/`breakdownQaWidth`,
  status ids 1/3/2) mirrors the AoW row bar's TS-computed-widths discipline below; its denominator is
  `row.count` (= `bucket.total`, ALL statuses), so the three painted segments need not sum to 100%
  width — same as the mockup's own `bucketTotal(r)`. ⚠️ **`OverviewScopeOption.byStatus` is populated
  in the HOST** (`dashboard-lab.component.ts`'s `scopeOptions()`) from the already-fetched
  `ScopeBucket.byStatus` (`OSF-T-3`) — no new fetch, no server change. This component only reads it.
- Bar widths normalise against the **series maximum**, and each card has its own denominator
  (`categoriesMax` / `bilateralCategoriesMax`). The largest bar is always 100%, so the two cards are
  two independent scales — never compare a bar in one against a bar in the other.
- **AoW row responsive ladder (`changes/overview-aow-cross-filter`, `OSF-T-2b`, design.md `OSF-DD-8`
  §8.2).** The identity column's `minmax(0,1fr)` track collapses to near-zero at narrow widths not
  because it's broken but because three sibling `max-content` tracks are rigid by definition — the
  fix removes tracks at narrow widths, never raises the identity minimum (that trades a collapsed
  name for page overflow, `OSF-AC-9`/`OSF-AC-10`'s exact trade-off this spec spent three tasks
  removing). **The skeleton row (`:510`) and the real row (`:588`) MUST move in lockstep** — same
  breakpoints, same cell placements — or the skeleton→content swap visibly jumps. ⚠️ **Tailwind's
  `max-[Npx]:` variant is EXCLUSIVE** (`@media (width < Npx)`, confirmed against the generated
  CSSOM), not `<= Npx` the way plain CSS `max-width` reads — `max-[899px]` and `min-[900px]` do
  **not** tile (width=899 matches neither). Use the SAME boundary value on both sides
  (`max-[900px]`/`min-[900px]`) to tile with no gap. The pre-existing `max-[899px]` at `:267`/`:352`
  (scope trigger, `OSF-DD-7`/`OSF-T-6`) has this same property and was left as-is — out of this
  task's scope, logged for the owner.

## Data flow

Every input is a `computed()` on the parent (`dashboard-lab.component.ts`):

| Input | Parent computed | Source |
|---|---|---|
| `statusSegments` | `overviewStatusSegments` | `GET_ScienceProgramsProgress()` |
| `aowProgress` / `xcutProgress` | `overviewAowProgress` / `overviewXcutProgress` | `GET_ClarisaGlobalUnits`, ToC loads |
| `categories` | `overviewCategories` | `GET_IndicatorContributionSummary(code)` |
| `bilateralCategories` / `bilateralRoles` | `overviewBilateralCategories` / `overviewBilateralRoles` | `GET_ResultToReview(code)`, loaded by an **overview-gated** effect |

## Gotchas

- ⚠️ **`initiative_role_id` and `status_id` arrive as STRINGS** (`'1'`, `'5'`). `=== 1` is silently
  always false. `result-review-drawer.component.ts:1100-1106` has that exact bug today (no ticket yet — reported to
  Yeck, see P2-3409) — do not copy it. This folder's parent compares with `String(...)`.
- ⚠️ **"Tagged" really means "tagged AND reached review."** The server filters
  `status_id IN (5,6,7)` (`result.repository.ts:2844`), so bilateral results in Editing / Submitted /
  Draft never reach us. P2-3302 asked for "tagged", full stop — the gap is real and unresolved
  (P2-3406). Do not present the number as a total without re-reading that ticket.
- The field named `indicator_category` actually carries the **result-type** name — the server
  overwrites it (`results.service.ts:3234`). Harmless here only because the own-results endpoint uses
  the same vocabulary, so the two cards compare like with like. Do not rely on it meaning "indicator".
- Bars are **plain DOM**, not `chart.js`, even though the dependency exists: a `<canvas>` cannot be a
  focusable per-row button with a tooltip on a truncated label. Do not "upgrade" this to a chart.
- Category rows are `<button disabled>` with one `Coming soon` chip per card, because no destination
  accepts a category yet — the Results tab filters only from its own dropdown, never from the URL
  (P2-3408). Wire `(click)` and drop the chip when that lands.
- `--pr-chart-2-muted` (`#8b7cc4`) is the bilateral fill and is **non-text-only**: 3.52:1 on the
  track clears WCAG 1.4.11, but the same hex failed AA as a sidebar foreground.
- The two category cards are titled **"W1/W2 results by indicator category"** and **"W3/Bilateral
  results by indicator category"** (P2-3481). The funding type is part of the title on purpose: the
  two cards are otherwise identical and users could not tell which was which. The spec asserts the
  six headings in order, so renaming one means editing that assertion deliberately.
- The two reporting-status cards are titled **"W1/W2 Reporting Status"** and **"W3/Bilateral Reporting Status"**
  (`quick/sp-overview-reporting-status-titles`) for the same reason. Renaming either means editing
  the heading-order assertion deliberately.
- The three cards removed by P2-3298 / P2-3299 / P2-3300 (Reporting pace, Needs attention, Impact so
  far) are gone with their geometry. `reportingPhases` in the parent is now written-but-never-read
  and is flagged there for removal.
- The disabled review-status sub-list is P2-3407. This folder's story is P2-3406, detail in P2-3409.
- Convention drift: `docs/COMPONENT-DOCS.md` §5 puts `Verified:` last; every file in this shell puts it on line 3 instead — line 3 wins here, for consistency.
- **Card 2 is collapsible** (`RGS-T-3`). Header (`h2`+subtitle+trigger, default expanded) sits
  OUTSIDE the `.pr-collapse` body; that body is `[attr.inert]` while closed, never `aria-hidden`.
