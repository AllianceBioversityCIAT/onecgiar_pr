# Design — SP Overview: W3/Bilateral "received" row + "awaiting review" card

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/sp-overview-w3-received` |
| Depth | Lite |
| Requirements | `requirements.md` (SWR-R-1..3), approved 2026-10-26 |
| Status | approved (2026-10-26) |

## 2. Summary

Client-only. The host (`dashboard-lab.component.ts`) already holds the program's bilateral rows; it now derives two counts from them — **received** (5/6/7) and **pendingReview** (5). The Overview child (`program-overview`) uses received in the Total General card and renders a new Awaiting review card with pendingReview. Clicks keep flowing through the existing `openTotalSegment` output → host `onTotalSegment(kind)`.

## 3. Files

| File | Change |
|---|---|
| `dashboard-lab/dashboard-lab.component.ts` | `overviewTotalBreakdown` adds `received`; `onTotalSegment` handles `received` (set section) |
| `dashboard-lab/components/program-overview/program-overview.component.ts` | `OverviewTotalBreakdown` + `TotalSegmentKind` gain `received`; headline + segments use it |
| `.../program-overview.component.html` | W3 row → received; new card; grid columns |
| Both `*.spec.ts` | Update STD expectations to SWR |
| `dashboard-lab/components/program-overview/CLAUDE.md` | Folder doc: Total General row + new card |

No data model, API, server or shared-contract change.

## 4. Frontend design

### 4.1 Counts (SWR-R-1, SWR-R-3)
- `OverviewTotalBreakdown` = `{ replicated, new, received, pendingReview }`.
- received = bilateral rows whose resolved status ∈ {5, 6, 7} (named constant beside the existing status-5 filter); pendingReview = status 5, unchanged.
- Still program-wide: reads `bilateralRows()`, never `scopedBilateralRows()` / `overviewScope()` (keeps STG-DD-1).
- Headline = replicated + new + received.

### 4.2 Total General card (SWR-R-1, SWR-R-2)
- Third row: kind `received`, label "W3/Bilateral results received", amber dot, tooltip "W3/Bilateral results tagged to this program and sent for your review (pending, approved or rejected)".
- Bar segment kind `received`, same amber color.
- Row/segment emit `openTotalSegment('received')`.
- Headline tooltip: "Program-wide: W1/W2 replicated + W1/W2 new + W3/Bilateral received".

### 4.3 Awaiting review card (SWR-R-3)
- `<button>` placed between the two existing cards, using the AoW card's shell classes (surface card, border, 12px radius, 18px padding, min-h 135px, hover border primary-300).
- Header "Awaiting review" + amber badge "W3/Bilateral" (amber-50/amber-700, mirroring AoW's blue-50/blue-700 "Plan" badge).
- Figure: pendingReview (32px `pr-figure`), suffix "results".
- Footer: "Open Bilateral review →".
- Loading: skeleton figure while `programResultsLoading()`.
- Click emits `openTotalSegment('pendingReview')` (existing destination).

### 4.4 Layout (S-3.4)
- Grid `sm:grid-cols-2 xl:grid-cols-3` → `sm:grid-cols-2 xl:grid-cols-4`.
- Total General: `xl:col-span-2` → `sm:col-span-2 xl:col-span-2`.
- New card and AoW: 1 column each.

### 4.5 Click handling (SWR-R-2)
- Host `onTotalSegment('received')` calls `overviewSection.set('bilateral')` directly — **not** the child's toggling `setActiveSection` — so a second click keeps the section (S-2.1 AND IT MUST NOT).
- The existing query-param sync writes `section=bilateral` and the chip appears.
- `pendingReview` keeps today's navigation; `replicated`/`new` unchanged.

## 5. Design Decisions

| ID | Decision | Rejected alternative |
|---|---|---|
| SWR-DD-1 | Derive received in the host from already-loaded rows | Server count — needless API change, no new request allowed |
| SWR-DD-2 | Reuse `openTotalSegment` for both new behaviors (new kind `received`) | New outputs per card — more wiring for the same seam |
| SWR-DD-3 | Section set by the host, not via child `setActiveSection` toggle | Toggle — second click would drop back to "All" |
| SWR-DD-4 | Card reuses AoW shell + existing amber palette | New tokens — gate forbids improvised tokens |

### Reversion challenge (Step 2.3)
- **What is removed:** the Total General row's navigation to Bilateral review, and the Pending-only headline.
- **What removing it breaks:** the one-click path to the pending list.
- **How the design keeps it:** the new card keeps that path with the same destination and query.
- **Test impact:** tests asserting `pendingReview` inside the breakdown and headline change in T-1/T-2. That is intended and superseded by SWR-R-1.

## 6. Budget (tripwire)

| Measure | Expected |
|---|---|
| Tasks | 3 (host, child, PRTest visual check) |
| LOC | ~70 prod + ~90 spec |
| Review rounds | 1 |
