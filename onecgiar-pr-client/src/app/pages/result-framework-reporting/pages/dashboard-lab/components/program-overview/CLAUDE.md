# program-overview

**Verified:** 2026-09-01 · branch qa-development-2026 · 52ddf00af

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
- Bar widths normalise against the **series maximum**, and each card has its own denominator
  (`categoriesMax` / `bilateralCategoriesMax`). The largest bar is always 100%, so the two cards are
  two independent scales — never compare a bar in one against a bar in the other.

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
- The three cards removed by P2-3298 / P2-3299 / P2-3300 (Reporting pace, Needs attention, Impact so
  far) are gone with their geometry. `reportingPhases` in the parent is now written-but-never-read
  and is flagged there for removal.
- The disabled review-status sub-list is P2-3407. This folder's story is P2-3406, detail in P2-3409.
- Note the convention drift: `docs/COMPONENT-DOCS.md` §5 says the `Verified:` stamp goes last, but
  every file in this shell puts it on line 3. Line 3 wins here, for consistency.
