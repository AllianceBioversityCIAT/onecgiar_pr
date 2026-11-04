# Tasks — SP Overview: W3/Bilateral "received" row + "awaiting review" card

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/sp-overview-w3-received` |
| Depth | Lite |
| Requirements / Design | approved 2026-10-26 |
| Status | approved (2026-10-26) |

Test rule for every task: Jest with `--maxWorkers=2`, scoped (`--findRelatedTests` on the changed files before push). No full suite.

## SWR-T-1 — Host counts + click handling

| Field | Value |
|---|---|
| Status | [x] |
| Size | S |
| Depends on | — |
| Requirements | SWR-R-1 (S-1.1), SWR-R-2 (S-2.1), SWR-R-3 (S-3.1 destination) |
| Design | §4.1, §4.5, SWR-DD-1, SWR-DD-3 |
| Skills | `angular-developer`, `tdd` |

**Scope** (`dashboard-lab.component.ts` + spec):
- add `received` (status ∈ {5, 6, 7}) to `overviewTotalBreakdown`;
- `onTotalSegment('received')` sets `overviewSection` to `bilateral`;
- `pendingReview` keeps its navigation.

**Tests** (update `dashboard-lab.component.spec.ts` S-2.1 / S-3.3 blocks):

| Clause | Test |
|---|---|
| S-1.1 | Rows 5×2, 6×3, 7×1, 1×1, 8×1 → `received: 6`, `pendingReview: 2` |
| S-1.1 BUT | Editing 1/8 and Discontinued 4 are excluded |
| S-1.1 AND IT MUST | An active scope matching nothing leaves `received` unchanged |
| S-2.1 | `onTotalSegment('received')` → `overviewSection() === 'bilateral'` and `router.navigate` not called |
| S-2.1 AND IT MUST NOT | Calling it twice keeps `'bilateral'` |
| S-3.1 | `pendingReview` still navigates to `bilateral-review` with `status=pending` and the phase |

**Fails if:** the filter uses `=== 5` only (received 2 ≠ 6); Editing is counted (7 ≠ 6); a toggle is used (the second call gives `'all'`).

**Done:** the scoped Jest run is green and the listed cases pass.

## SWR-T-2 — Total General row + Awaiting review card

| Field | Value |
|---|---|
| Status | [x] |
| Size | M |
| Depends on | SWR-T-1 (breakdown shape) |
| Requirements | SWR-R-1 (S-1.1, S-1.2), SWR-R-2 (row/segment emit), SWR-R-3 (S-3.1–S-3.4) |
| Design | §4.2, §4.3, §4.4, SWR-DD-2, SWR-DD-4 |
| Skills | `angular-developer`, `tailwind-design-system`, `spartan` |

**Scope** (`program-overview.component.{ts,html}` + spec + folder `CLAUDE.md`):
- `received` in the types;
- headline and segments use `received`;
- W3 row: label "W3/Bilateral results received", tooltip, and emit `received`;
- new card between Total General and AoW (AoW shell, amber badge, skeleton, footer), which emits `pendingReview`;
- grid `xl:grid-cols-4`, Total General `sm:col-span-2 xl:col-span-2`;
- folder doc updated.

**Tests** (update `program-overview.component.spec.ts` STD blocks):

| Clause | Test |
|---|---|
| S-1.1 | breakdown `{8, 5, received 5, pendingReview 4}` → headline 18, row text "W3/Bilateral results received" shows 5 |
| S-1.2 | segment kinds `['replicated','new','received']`, received width uses 5/18 |
| S-2.1 | row click emits `'received'` |
| S-3.1 | card `overview-kpi-pending-review` shows 4 and click emits `'pendingReview'` |
| S-3.2 | `pendingReview: 0` → shows 0 and is still a button |
| S-3.3 | `programResultsLoading` true → skeleton, no figure |

**Cannot prove:** layout, column wrap and visual parity with the AoW card. jsdom cannot measure these, so SWR-T-3 covers them.

**Fails if:** the headline still adds `pendingReview` (gives 17); the card emits `received`.

**Done:** the scoped Jest run is green, and `npx eslint` passes on the touched `.ts` files with `--quiet`.

## SWR-T-3 — PRTest visual + parity check (HITL)

| Field | Value |
|---|---|
| Status | [x] |
| Size | S |
| Depends on | SWR-T-2, deployed on `performance-refactor` |
| Requirements | SWR-R-2 (S-2.1 parity), SWR-R-3 (S-3.4) |
| Skills | `claude-in-chrome` (read-only; no write buttons) |

**Check:** on PRTest SP11, Reporting 2026:

| Expected | Value |
|---|---|
| Row "received" | 5 |
| Headline | 18 |
| Card | 4 |

**Steps:**
1. Click the row: the URL gets `section=bilateral`, and the row number equals the Bilateral review "All" tab count (the donut may be higher: it also counts Discontinued/Submitted — pivot 2026-10-26).
2. Click the card: Bilateral review opens on Pending.
3. Take screenshots at xl, md and 375px widths.

**Fails if:** the row ≠ Bilateral review "All" count, the card wraps beside Total General at md, or there is horizontal scroll at 375px.

**Inconclusive if:** bilateral data changes during the check. Re-read both numbers in the same page load before judging.

**Done:** the user approves the screenshots.

## Coverage

| Clause | Task |
|---|---|
| S-1.1 (incl. BUT / AND IT MUST) | T-1 (counts), T-2 (headline/row) |
| S-1.2 | T-2 |
| S-2.1 (incl. MUST NOT navigate / toggle) | T-1 (behavior), T-2 (emit), T-3 (parity) |
| S-3.1 | T-1 (destination), T-2 (card emit) |
| S-3.2, S-3.3 | T-2 |
| S-3.4 | T-3 |

Estimated LOC: ~160 (70 prod + 90 spec). Single PR.
