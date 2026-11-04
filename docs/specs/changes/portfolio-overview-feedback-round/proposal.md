# Proposal — Portfolio Overview: stakeholder feedback round (6 points)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round` |
| Slug | `portfolio-overview-feedback-round` — derived from free-text argument (screenshot of a ticket with 6 numbered requests about `/portfolio-overview`) |
| Type | **Change** (point 4 has a bug-shaped component, diagnosed in §9.4) |
| Approval Mode | `gated` |
| Ticket | Not given (screenshot only). Point 7 of the same ticket (delete test notifications in prod) is **out of scope** — data cleanup, not code |
| Date | 2026-11-04 |
| Screen | `/portfolio-overview` (admin-only), client `pages/result-framework-reporting/pages/portfolio-overview/` |

## 2. Intent

Act on the stakeholder's review of the Portfolio overview: fewer confusing figures (no %s, no "Centers reporting"), numbers that reconcile between blocks, a funding-source filter, W3 "Approved" tracking, and a new view of contribution requests per Program/Accelerator so reminders can be sent before the deadline.

## 3. Problem / Current Behavior (one line per point)

| # | Ask | What the code does today | Evidence |
|---|---|---|---|
| 1 | Filter by funding source | Bar has 5 dimensions: Program, Project, Center, Typology, Status. Funding (W1/W2 vs W3) is only a card split | `services/portfolio-filters.ts` `FILTER_DIMENSIONS` |
| 2a | Remove % on W1/W2 and W3 cards | Chips `N% submitted / QA` and `N% approved`. W3 "approved" counts status 2 **or** 6, so the % is not even "approved" | `portfolio-overview.component.html:128,166`; service `:288-293` |
| 2b | Add "Approved" under W3/Bilateral | W3 New line shows `Submitted X · Editing Y`; "Submitted" = every non-Editing status (Pending Review, Approved, Rejected all lumped) | service `tally()` `:299-312`, html `:180` |
| 3 | Remove % in "Portfolio Results Reporting Status" | Each tile shows `count (N%)` | html `:271` |
| 4 | Values don't add up | Top deck: W3 = 9 new + 279 replicated = **288**. Centers block: **328** = 10 + 318. See §9.4 | `centers-block.component.ts:128-141` |
| 5 | Remove "Centers reporting 12 / 14" | Second KPI card of the CGIAR Centers block | `centers-block.component.html:75-79` |
| 6 | Contribution notifications aggregated per P/A | Nothing on this screen. Data exists in `share_result_request` (requester / shared initiative, `request_status_id`, `request_type = contribution`) | server `api/results/share-result-request/entities/` |

## 4. Proposed Outcome

1. A 6th filter **Funding source** (`W1/W2`, `W3/Bilateral`) in the bar, URL-mirrored (`?funding=`), feeding every block that reads `filteredRows()`.
2. KPI cards without % chips; the W3/Bilateral card shows **Pending review · Approved · Editing** (and Rejected if > 0) instead of the ambiguous "Submitted".
3. Status tiles show only the count, no `(N%)`.
4. Top deck and Centers block **reconcile** (or, where they legitimately differ, say why on screen).
5. "Centers reporting" card removed; the W3 card takes the full width.
6. New block **Contribution requests by Program/Accelerator**: per P/A, requests **sent** and **received**, split Pending / Accepted / Declined, for the open phase, with drill-down to the pending ones.

## 5. Scope

- Client: `portfolio-overview` page, `filter-bar`, `portfolio-filters.ts`, service `kpiTotals`, `centers-block`, copy files `portfolio-overview.copy.ts`, `portfolio-centers-block.copy.ts`.
- Server (point 6 only, possibly point 4): one new admin-only read endpoint under `results-framework-reporting/portfolio/…`, same pattern as `portfolio/bilateral-projects`.
- Component guide `portfolio-overview/CLAUDE.md` (it pins DD-4, the % chips and the Centers cards).

## 6. Non-Goals

- Point 7 (deleting test notifications in prod) — a one-off data task, handled with SQL outside this spec.
- No change to Results Center, Center Overview, or the bilateral review flow.
- No sending of reminders from this screen (point 6 is **monitoring**; reminders stay manual unless asked).
- No change to the server endpoint feeding the deck (`GET_AllResultsWithUseRole`).

## 7. Affected Users, Systems, And Specs

- **Users:** PMU/portfolio admins (only role with access).
- **Archived specs touched (behavior they pinned changes):** `portfolio-overview-kpi-breakdown` (card breakdown), `…revamp--global-filters` (bar dimensions, URL mirror), `…revamp--centers-new-vs-replicated` (DD-4 KPIs, Centers reporting card).
- **Related open spec:** `bugfix/portfolio-overview-partial-counts` (not touched).

## 8. Visual Reference

- Source: Ticket screenshot (annotated red marks on the current screen). No Figma.
- Notes: points 1–5 reuse existing components (filter multi-select, KPI card, tiles). Point 6 is a new block → offer a quick HTML mockup during `/akili-specify` if wanted.

## 9. Requirement Delta Preview

### 9.1 ADDED

- **Funding source filter** (W1/W2 = `source_name !== 'W3/Bilaterals'`, W3 = `=== 'W3/Bilaterals'`, same rule the deck already uses). Blocks with their own data path behave like with Project/Center today: W3-only blocks (Centers, Projects) show "Not affected by: Funding source" or hide when only W1/W2 is selected; ToC KPI (W1/W2-only by rule) likewise for W3. "View in Results Center" passes `funding=` (Results Center already supports `funding=bilateral`).
- **W3 Approved count** on the W3/Bilateral card.
- **Contribution requests by P/A** block + admin-only endpoint.

### 9.2 MODIFIED

- W3 card breakdown: `Submitted X · Editing Y` → `Pending review X · Approved Z · Editing Y` (+ `Rejected` when > 0).
- Centers block W3 total: see 9.4.

### 9.3 REMOVED

- `% submitted / QA` and `% approved` chips (deck); `(N%)` on status tiles; the Centers block `% approved` chip (same meaning, same confusion); "Centers reporting" card. Dead fields `w1w2SubmittedPercent`, `bilateralApprovedPercent`, `bilateralCentersCount`, `centersReporting` dropped.

### 9.4 Point 4 — why 288 ≠ 328 (diagnosis)

**Confirmed in code (one cause):** the Centers block builds its KPI with `loaded.flatMap(center => center.w3Rows)` — rows from **one request per Center**, with **no dedupe by result**. A W3 result whose lead Center and contributing Center(s) are both CGIAR Centers is counted once per Center. The component guide even records it: *"A result shared by several Centers counts once per Center … differs from the page's own W3 tile"*. The stakeholder reads both as "W3 results", so it looks wrong — and the gap (40) lands almost entirely on Replicated (318 vs 279), where multi-Center replicated innovations are common.

**Not yet confirmed (possible second cause):** the two paths classify W3 differently — deck: `source_name === 'W3/Bilaterals'` from the all-results endpoint; Centers: `source === 'API'` from the Center Overview endpoint. Deduping may give 288 exactly, or may leave a residue (different status/visibility filters per endpoint). **Must be verified against prod data before specify closes** (dedupe count of the Centers path vs 288).

**Fix direction:** headline W3 total in the Centers block counts **distinct results**; per-Center figures (donut, tiles) keep counting per Center, labelled so ("a result shared by 2 Centers counts in both"). Any residue after dedupe is either fixed (align the W3 rule) or explained in a tooltip.

## 10. Approach Options

| Option | What | Pro | Con |
|---|---|---|---|
| **A — Split in 3 children (recommended)** | (1) `cleanup-and-approved`: points 2, 3, 5 + 4 · (2) `funding-filter`: point 1 · (3) `contribution-requests-by-pa`: point 6 | Small client-only child ships this week; the server work (6) does not block it; each fits the review loop | 3 specs to track |
| B — One spec, all 6 | Single spec | One cycle | Mixes a 1-day client cleanup with a new endpoint + block; one blocker delays all |
| C — Points 1–5 now, 6 deferred | Ship 1–5, park 6 | Fastest | Point 6 is the stakeholder's operational need before the deadline |

## 11. Recommended Approach

**Option A**, build order (MoSCoW):

| # | Child | Points | Must/Should | Depends on | Parallel-safe |
|---|---|---|---|---|---|
| 1 | `cleanup-and-approved` | 2, 3, 4, 5 | Must (visible errors) | none | yes |
| 2 | `funding-filter` | 1 | Should | none (touches `portfolio-filters.ts`, child 1 touches the service `kpiTotals` + centers block — low overlap, but run **after** 1 to avoid template conflicts) | no (serial after 1) |
| 3 | `contribution-requests-by-pa` | 6 | Must (deadline) | none (server endpoint + new block) | yes |

On approval, `family.md` is written in `docs/specs/changes/portfolio-overview-feedback-round/` and each child gets its own proposal.

## 12. Risks, Dependencies, And Open Questions

| ID | Question / risk | Default if no answer |
|---|---|---|
| OQ-1 | W3 card: should **Approved** also count replicated rows, or only New (like today's Submitted/Editing split)? | Show Approved on **both** lines (New and Replicated), since replicated W3 also go through review |
| OQ-2 | Remove the `(N%)` also in the **Centers block** status tiles and its `% approved` chip (not marked in the ticket, same pattern)? | Yes, for consistency |
| OQ-3 | Point 4: after dedupe, if a residue remains, align the W3 rule (fix) or just explain it (tooltip)? | Verify data first; fix if it is a classification mismatch |
| OQ-4 | Point 6: "notifications for contributions" = `share_result_request` with `request_type = contribution` (requests between P/As to contribute to a result)? Or also include bilateral "primary SP" requests and center/project tagging notices? | Contribution requests only |
| OQ-5 | Point 6: "sent" = requester P/A, "received" = P/A asked to contribute (`shared_inititiative_id`)? Pending = not accepted/declined yet? | Yes |
| OQ-6 | Point 6: need to list which result/user is pending (for the reminder), or counts only? | Counts per P/A + expandable list of pending requests (result code, title, date) |
| R-1 | Archived specs pinned DD-4 ("Centers KPIs ignore filters, must not shrink") and "Centers reporting" as a card; the guide must be updated or later agents will re-add them | Update `portfolio-overview/CLAUDE.md` in each child |
| R-2 | Point 7 is pending in the same ticket and is about **my** test notifications in prod | Handle separately (SQL, inline) |

## 13. Success Criteria

- No `%` figures remain on the deck or status tiles.
- W3 card shows how many W3 results are Approved, matching Results Center filtered by W3 + Approved for the same phase.
- Top-deck W3 total equals the Centers block W3 total, or the screen states why they differ.
- Selecting Funding = W3 makes the total equal the W3 card; URL reload keeps it.
- Admin can see, per P/A, pending contribution requests sent and received in the open phase.

## 14. Next Step

```text
/akili-specify changes/portfolio-overview-feedback-round
```

(After approval, the family manifest is created and specify runs per child, starting with `cleanup-and-approved`.)
