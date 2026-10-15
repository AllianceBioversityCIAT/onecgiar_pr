# Requirements — Portfolio Overview: CGIAR Centers block, W3 only, New vs Replicated

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/centers-new-vs-replicated/` |
| Parent Spec | `changes/portfolio-overview-revamp` (family #3) |
| Depends on | #2 `remove-rankings-status-copy` (`done`) **and #7 `remove-centers-progress`, which must be executed and committed first**. This spec is written against the block as #7 leaves it: no Progress by Center card, no search or sort, and a "Retry failed Centers" action in the Reporting status card |
| Module | `result-framework-reporting` › `portfolio-overview` › `components/centers-block` (client only) |
| Type | Change |
| Depth | Standard (a data-scope change, a new filter dimension that composes with the existing status filter, and copy) |
| Approval Mode | gated |
| Status | approved (2026-10-15, Phase 1 gate); rev 2 (2026-10-15) rebased on #7 |
| Source | Parent `proposal.md` item 7 (stakeholder feedback, 2026-10-14). Decisions by the user on 2026-10-15 (see §10) |
| Requirement prefix | `CNR` |

**Rev 2 (2026-10-15).** Family #7 `remove-centers-progress` removes the Progress by Center card and runs before this spec. Every clause about that card's table, chart, column highlight or Center listing was removed. The origin filter now acts on the KPI-dependent views that remain: the donut and the tiles. User approval: "adelante con tu recomendación".

## 2. Executive Summary

The CGIAR Centers block is titled **W3/Bilateral**, but it counts every row that each Center Overview shows. On PRTest (P25, 2026-10-15), 572 of its 1284 rows are **W1/W2** results that a Center leads or contributes to. Its cards also do not say which results are new and which were replicated from a previous phase.

This spec makes the block **W3/Bilateral only**: 712 rows, 548 new and 164 replicated. The W3/Bilateral KPI card splits into **New** and **Replicated**, and the two parts reconcile to the total. New and Replicated become a filter. Picking one recalculates the Reporting status donut and tiles, and it combines with the existing status filter.

Counting stays **per Center**: a result that involves several Centers counts once for each.

## 3. Glossary

| Term | Meaning here |
|---|---|
| Block | `app-portfolio-centers-block` after #7: header, KPI cards (W3/Bilateral results, Centers reporting), and Reporting status card (donut, tiles, active-filter strip, partial note + retry) |
| Center row | One row of `bilateral-center-results` for one Center. The same result can appear under several Centers |
| W3 row | A Center row whose source is W3/Bilateral (`source = 'API'`) |
| Replicated | A W3 row flagged as replicated from a previous phase. The flag can arrive as `1`, `'1'` or `true`; any other value means **New** |
| Origin filter | The new selection *All · New · Replicated* |
| Status filter | The existing selection of one status (Editing · Pending review · Approved · Rejected) from the donut or the tiles |

## 4. Scope

**In:**
- Restricting every figure of the block to W3 rows.
- Splitting the W3/Bilateral KPI card into New and Replicated.
- The origin filter, and how it composes with the status filter.
- The block subtitle, which would otherwise be false.

**Out:**
- Any server or API change (the flag is already on the wire).
- The removal of Progress by Center and the retry relocation (family #7).
- The page's top KPI deck (family #1).
- The Center Overview page itself, which keeps showing W1/W2 + W3.
- Results Center gaining a replicated filter.
- Global filters (family #6).
- Distinct-result counting (rejected, see §10).

## 5. Personas

Admin / PMU readers of `/portfolio-overview` (`CheckAdminGuard`).

## 6. Functional Requirements

### CNR-1 — The block counts W3/Bilateral rows only (MUST)

Every figure in the block MUST be computed from W3 rows only: the W3/Bilateral total, the approved percentage, "Centers reporting", the donut, and the tiles.

#### Scenario: W1/W2 rows are left out
- GIVEN one Center whose rows are 10 W3 rows (2 Editing, 7 Approved, 1 Submitted) and 5 W1/W2 rows (all Editing), and no other Center
- WHEN the block renders
- THEN the W3/Bilateral total reads 10, the Editing tile 2 and the Approved tile 7
- AND the 5 W1/W2 rows appear in no figure
- BUT it must NOT drop W3 rows whose status is outside the 4 tiles (the Submitted row). They still count in the total, as today

#### Scenario: Centers reporting
- GIVEN a Center that has only W1/W2 rows in the phase
- WHEN "Centers reporting N / M" is computed
- THEN that Center is not counted in N
- AND IT MUST still be counted in M (all Centers in the catalogue), as today

### CNR-2 — W3/Bilateral KPI card shows New and Replicated (MUST)

The W3/Bilateral results card MUST show the total, and under it **New** and **Replicated** with their counts. New + Replicated MUST equal the total.

#### Scenario: Reconciles
- GIVEN W3 rows where 548 are not flagged and 164 are flagged replicated
- WHEN the card renders
- THEN it reads 712, New 548, Replicated 164
- AND IT MUST treat the flag values `1`, `'1'` and `true` as replicated, and `0`, `'0'`, `false`, `null` and a missing value as new

#### Scenario: Zero
- GIVEN no W3 rows
- THEN the card reads 0, New 0, Replicated 0, with no error and no `NaN`

### CNR-3 — Origin filter recalculates the status view (MUST)

Choosing **New** or **Replicated** MUST restrict the donut and the tiles (counts and percentages) to that origin. Choosing it again, or using "Clear filter", returns to All.

#### Scenario: Replicated selected
- GIVEN the Replicated origin is selected
- WHEN the block renders
- THEN the donut and the tiles count replicated W3 rows only
- AND the active-filter strip names the origin
- AND the KPI card still shows the total, New and Replicated, unchanged (the card is the control; it does not shrink to the selection)
- BUT "Centers reporting" and "% approved" must NOT change with the origin filter

#### Scenario: Toggle off
- GIVEN Replicated is selected
- WHEN the reader activates Replicated again, or uses "Clear filter"
- THEN the origin returns to All and the donut and tiles return to the unfiltered W3 values

### CNR-4 — Origin and status filters compose (MUST)

The two filters MUST apply together (AND). Each can be set or cleared independently.

#### Scenario: Both set
- GIVEN origin = New and status = Pending review
- THEN the Pending review tile is pressed and the donut highlights it, as today (RCP-3 of #7)
- AND the tile counts are those of new W3 rows
- AND the active-filter strip shows both, for example "New · Pending review"
- AND "Clear filter" clears both
- BUT it must NOT reset the status filter when the origin changes, or the origin when the status changes

### CNR-5 — Origin control is accessible (MUST)

#### Scenario: Keyboard and screen readers
- GIVEN a keyboard-only reader
- THEN New and Replicated are reachable with Tab and toggled with Enter or Space
- AND each exposes its selected state (`aria-pressed`), as the status tiles do
- AND IT MUST show a visible focus ring

### CNR-6 — Copy tells the truth (MUST)

- The block subtitle MUST NOT claim "the same numbers each Center Overview shows". After CNR-1 that is false.
- It MUST say that the block counts **W3/Bilateral** results per Center, and that a result shared by several Centers counts for each.
- New strings live in `internationalization/portfolio-centers-block.copy.ts`.

#### Scenario
- GIVEN the block renders
- THEN no visible text in the block says it matches the Center Overview
- AND the subtitle names W3/Bilateral and the per-Center counting rule

### CNR-7 — Results Center link stays honest (SHOULD)

- "View in Results Center" MUST carry `funding=bilateral` plus the selected status, because the block is now W3 only.
- Results Center has no replicated filter. While the origin filter is New or Replicated, the link MUST NOT be shown, because the list it would open could not match the block.

#### Scenario
- GIVEN status = Approved and origin = All
- THEN the link opens Results Center with `funding=bilateral&status=6`
- GIVEN origin = Replicated
- THEN the link is not rendered, and "Clear filter" is still available

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| CNR-N1 | No new HTTP request and no server change. The same one call per Center is made, and the result is filtered on the client |
| CNR-N2 | The figures are derived (computed) from the loaded rows, never accumulated by hand. A Center that loads late, or recovers through "Retry failed Centers" (#7), updates every figure |
| CNR-N3 | The loading, error, partial-with-retry and empty states delivered by #7 keep working. The New / Replicated counts show skeletons while loading, like the card's total |
| CNR-N4 | Strings in `internationalization/` (client CLAUDE.md §5/§10). Tokens only, no hex (UI rule 8). Px type sizes (UI rule 20) |
| CNR-N5 | `portfolio-overview/CLAUDE.md` is updated in the same change and its `Verified:` line re-stamped. The ⚠️ note that says the block repeats the Center Overview must be rewritten |

## 8. Defect classes → gate

| Defect class | Caught by |
|---|---|
| W1/W2 rows still counted somewhere (one path filtered, another not) | Component spec with a mixed W3 + W1/W2 fixture, asserting every output: KPIs, `centerTotals()`, segments |
| Flag encodings misread (`'1'`, `true`, `null`) | Encoding-matrix spec on the origin classifier |
| New + Replicated ≠ total | Invariant spec over the fixture |
| Origin filter not applied to the donut or the tiles, or wrongly applied to the KPI card | Component spec under origin = Replicated asserting segments **and** `kpis()` |
| The filters reset each other | Component spec: set both, change one, assert the other |
| A retried Center ignores the origin or keeps W1/W2 rows | Component spec: a failed Center recovers through `retryFailedCenters()` with mixed rows |
| Results Center link shown under an origin filter, or missing `funding` | Component spec on both states |
| Template binding errors | `npm run build:dev` (`tsc` does not check templates) |
| Visual: the split crowds the card, focus ring missing, wrap at 375 px | **No automated check** (jsdom cannot lay out). Substitute: a browser check at the HITL pause (375 / 768 / 1280) on PRTest or a local server whose bundle is confirmed, read-only |
| Real-data reconciliation (548 + 164 = 712 on PRTest) | **Not automatable here.** Substitute: the browser check compares the card with the PRTest figures in §10 (they may drift; the invariant must hold) |

## 9. Requirement ID Index

| ID | Strength | Owner task |
|---|---|---|
| CNR-1 | MUST | see `tasks.md` |
| CNR-2 | MUST | see `tasks.md` |
| CNR-3 | MUST | see `tasks.md` |
| CNR-4 | MUST | see `tasks.md` |
| CNR-5 | MUST | see `tasks.md` |
| CNR-6 | MUST | see `tasks.md` |
| CNR-7 | SHOULD | see `tasks.md` |
| CNR-N1..N5 | MUST | see `tasks.md` |

## 10. Decisions and Open Questions

**User decisions (2026-10-15):**

| Decision | Choice | Rejected |
|---|---|---|
| Scope | W3 only, for the whole block | Keep W1/W2 + W3 (the "W3/Bilateral" title would stay misleading); show both sources split |
| Filterable | The origin filter recalculates the status view and composes with the status filter | Display-only cards; link out to Results Center |
| Counting | Per Center, as today | Distinct results |
| Rebase on #7 | Write #3 against the block without Progress by Center | Wait for #7 to finish; keep the stale spec |

**PRTest evidence (2026-10-15, P25, 16 Centers):**
- 1284 rows: 712 W3 (548 new + 164 replicated) and 572 W1/W2 (543 + 29).
- These are 885 distinct results.
- Replicated rows by type: Innovation use 169, Innovation development 17, Policy change 5, Capacity sharing 2. So "replicated" is **not** innovations only; the card does not say "Innovations".

| ID | Question | Default |
|---|---|---|
| OQ-1 | Should Results Center gain a replicated filter, so the link can survive an origin filter? | No. The link is hidden while an origin filter is active (CNR-7). A separate request if wanted |
| OQ-2 | The Center Overview page still mixes W1/W2 and W3. Should anyone be told that the two now differ? | Yes: CNR-6 copy and the CLAUDE.md note. No change to the Overview page |
