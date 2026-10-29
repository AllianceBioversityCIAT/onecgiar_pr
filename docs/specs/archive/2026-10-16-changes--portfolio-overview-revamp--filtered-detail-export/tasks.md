# Tasks — Portfolio Overview: filtered results detail + Excel export

## 1. Scope of this task list

| Field | Value |
|---|---|
| Spec | `changes/portfolio-overview-revamp/filtered-detail-export` (family #9) |
| Linked | [`requirements.md`](./requirements.md) (approved) · [`design.md`](./design.md) (approved 2026-10-16, Phase 2 gate; no Judgment Day) |
| Owner | Santiago Sanchez (via AKILI) |
| Status | approved (2026-10-16, Phase 3 gate). Executing since 2026-10-16 (#6 committed) |
| Budget | 4 tasks · ≈ 520 LOC · ≤ 5 review rounds (design §8) |

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] Open questions resolved (FDE-OQ-1..3 at defaults).
- [x] **#6 `global-filters` committed.** 9946d37d7 (server), 6cfde7ed8 (client), 93a494e06 (docs), 2026-10-16. No renames (onecgiar-pr-5e).
- [x] No migration, no endpoint.

**Test runs (every task):** `--maxWorkers=2`, scoped `--testPathPattern`, one run at a time on the machine, free RAM ≥ 4 GB before a build.

## 3. Task list

### `FDE-T-1` [x] — Pure logic: detail rows, search, sort, page, export rows

- **Type:** client
- **Implements:** FDE-R-2 (S-2.3 multiplicity), R-3 (S-3.1), R-4 (S-4.1 order), R-5 (S-5.1 filter), R-6 (URL), R-7 (`pageOf`), R-8 (S-8.1 row shape, file name), R-10 (`_partial`)
- **Design:** §1A P-1..P-8, §3, §5.1, DD-1, DD-3, DD-4
- **Files:**
  - `portfolio-overview/components/results-detail/results-detail.rows.ts` (new)
  - `portfolio-overview/components/results-detail/results-detail.rows.spec.ts` (new)
  - `portfolio-overview/services/portfolio-overview.service.ts` (`RawResult.result_code` only)
- **Depends on:** #6 committed · **Blocks:** T-2 · **Size:** M · **Skills:** `angular-developer`, `tdd`
- **First step:** re-read #6's committed service and `portfolio-filters.ts`; adapt the input names in §5.2 if they changed (P-2). Record any rename in `execution.md`.
- **Verification:**
  - `npx jest --testPathPattern="results-detail.rows" --maxWorkers=2 --silent --no-coverage`
  - `npx ng build --configuration development` (typed model touched; KZ-bugfix--lead-center-full-catalog-1)
  - **Cases that must exist:**
    - two page rows with the same id → two detail rows (no dedupe);
    - map `loading` and `error` → both map columns "Unavailable", never "—"; map ready with no links → "—";
    - unknown type → Level "Unclassified";
    - 30 rows, sort by title asc → first 25 of the **whole** set; code sorts numerically (`9` before `10`);
    - search `"  DROUGHT "` matches title "Drought…" and code search matches by substring;
    - `toExportRows` keys = R-3 order + `Link`, full title, no key containing `creat`/`email`/`user`;
    - `exportFileName('Reporting 2026 - P25', date, true)` ends `_partial.xlsx`;
    - `resultUrl` = `<origin>/result/result-detail/<code>/general-information?phase=<version_id>`.
  - **Falsifier:** sorting the page slice instead of the full array makes the 30-row case fail; returning `'—'` for a missing map makes the "Unavailable" case fail.
  - **Disqualifier:** a test that builds its expected values with the function under test (tautology), or fixtures with ≤ 25 rows for sort/search cases, is not evidence.
- **Done:** tests green; build clean; lint clean on touched files.

### `FDE-T-2` [x] — `results-detail` component, template and copy

- **Type:** client
- **Implements:** FDE-R-1 (header), R-4 (`aria-sort`, page reset), R-5 (count "M of N", no-hit state, Clear search, no URL/figure change), R-6 (new tab + `noopener`), R-7 (one page in DOM, prev/next, range), R-8 (whole list, busy, disabled at 0, failure re-enables), R-9 (pending skeleton, export disabled), R-10 (partial line)
- **Design:** §5.2, §5.4, DD-2, DD-5, DD-6, DD-7, DD-8
- **Files:**
  - `…/results-detail/results-detail.component.{ts,html}` (new)
  - `…/results-detail/results-detail.component.spec.ts` (new)
  - `internationalization/portfolio-overview.copy.ts` (`detail` group)
  - `shared/services/export-tables.service.ts` + its spec: additive optional `{ exactFileName: true }` (FDE-DD-9, pivot 2026-10-16)
  - `tests/mocks/spartanBrainMock.ts` only if a Helm input is missing (NG0311)
- **Depends on:** T-1 · **Blocks:** T-3 · **Size:** M · **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - `npx jest --testPathPattern="results-detail" --maxWorkers=2 --silent --no-coverage`
  - `npx ng build --configuration development`
  - **Cases that must exist:**
    - 60 input rows → exactly 25 `<tbody> tr` rendered; Next → 25, then 10; range text "51–60 of 60";
    - on page 3, typing a search → page 1; changing the sort → page 1; new `rows` input → page 1;
    - header button click flips `aria-sort` ascending → descending;
    - search with no hits → "No results match this search" + Clear search restores the list;
    - export spy: called once with **all** searched rows (not 25), file name from T-1, `cellsToLink` on the Link column, `{ exactFileName: true }` passed; a service spec proves the saved name is exactly the given name with the flag and unchanged (`_<ts>.xlsx`) without it; a second click while the first is pending does **not** call again; a never-resolving then resolving promise toggles busy off;
    - export disabled when 0 listed rows and when `pending`;
    - `pending` → skeleton rows, no table rows;
    - `partial` → the partial line shows `fetchedCount`;
    - code link has `target="_blank"` and `rel` containing `noopener`.
  - **Falsifier:** binding the export to the paged slice fails the "all rows" case; omitting `finally` fails the busy-reset case.
  - **What these cannot prove:** layout, title clamp, horizontal scroll at 375, focus ring → T-4.
- **Done:** tests green; build clean; lint clean on touched files; all strings in the copy file.

### `FDE-T-3` [x] — Mount on the page + reconciliation + folder doc

- **Type:** client
- **Implements:** FDE-R-1 (last section, figures gate), R-2 (S-2.1, S-2.2), R-9 (no-match → not rendered), docs NFR
- **Design:** §5.3
- **Files:**
  - `portfolio-overview.component.{ts,html}`
  - `portfolio-overview.component.spec.ts` (new cases only)
  - `portfolio-overview/CLAUDE.md` (new section + re-stamp)
- **Depends on:** T-2 · **Blocks:** T-4 · **Size:** S · **Skills:** `angular-developer`
- **Verification:**
  - `npx jest --testPathPattern="portfolio-overview.component" --maxWorkers=2 --silent --no-coverage`
  - `npx ng build --configuration development`
  - **Cases that must exist:**
    - with a selection (e.g. one Program + one Status) the section's count equals `kpiTotals().total` (S-2.1); clearing the selection → equals the unfiltered total (S-2.2);
    - 0 filtered rows → the section is absent (no-match panel only);
    - loading / error / phase-empty → section absent;
    - the section is the last section in the DOM.
  - **Falsifier:** binding `[rows]` to `data.rows()` instead of `filteredRows()` fails S-2.1.
- **Done:** tests green; build clean; `CLAUDE.md` re-stamped in the same commit.

### `FDE-T-4` [x] — HITL browser + file check (read-only)

- **Type:** manual (T6 visual)
- **Implements:** NFR responsive, a11y, sort/search/export time; R-8 file opens with links; R-2 live parity
- **Runner:** Leader with the user, local stack or PRTest after deploy. Confirm the served bundle first. Never click write buttons; Export is read-only.
- **Checks:**
  - 375 / 768 / 1280: no page-level horizontal scroll; table scrolls inside its container; title clamps to 2 lines with tooltip; keyboard reaches search → export → sort headers → links → pager with a visible focus ring.
  - Live parity: with 2 selections (one Program-only, one Center + Status), section count = KPI total.
  - Download the file for the largest selection: opens in Excel, header + N rows, Link cells clickable, no creator column, `_partial` only when the banner shows.
  - Timing: sort and search on the unfiltered list (median of 5 ≤ 100 ms); export duration on 3 runs.
- **Disqualifier:** a timing spread > 2× the median is reported as the spread, not as a pass. A check on a bundle that is not confirmed to contain this change is not evidence.
- **Done:** evidence in `execution.md`; any defect reopens the owning task.

## Requirement → Task Coverage (scenario / clause level)

| Requirement · clause | Task |
|---|---|
| R-1 last section, header contents | T-2 (header), T-3 (position) |
| R-1 BUT not in loading / error / phase-empty | T-3 |
| R-2 S-2.1 count = KPI total; BUT row outside filters must NOT appear | T-3 (S-2.1 binding), T-1 (no extra rows) |
| R-2 S-2.2 Clear all → unfiltered total | T-3 |
| R-2 S-2.3 Discontinued follow the filter | T-1 (no status exclusion in `toDetailRows`) + T-3 (bound to filtered rows) |
| R-2 once per page row | T-1 (multiplicity case) |
| R-3 columns, order, empty values | T-1 |
| R-3 S-3.1 "Unavailable"; BUT must NOT show "—" | T-1 |
| R-4 all rows, page 1 on sort, default code desc | T-1 (order), T-2 (default + reset) |
| R-4 S-4.1 direction exposed to AT | T-2 (`aria-sort`) |
| R-5 match code/title, trimmed, case-insensitive | T-1 |
| R-5 "M of N"; no figure / chip / URL change | T-2 (component holds search locally; no service/router call) |
| R-5 BUT no hits → own message + Clear search | T-2 |
| R-6 link, new tab, `noopener` | T-1 (URL), T-2 (attributes) |
| R-7 25 per page, range, prev/next, reset; MUST NOT render more than one page | T-1 (`pageOf`), T-2 |
| R-8 whole listed set, current sort, Link column, file name | T-1 (rows, name), T-2 (call) |
| R-8 busy, no second export, disabled at 0, failure re-enables | T-2 |
| R-8 S-8.1 1 + N rows; MUST contain no creator / email | T-1 (keys), T-2 (count), T-4 (real file) |
| R-8 S-8.2 map failed → "Unavailable" in file | T-1 |
| R-9 pending → skeleton, export disabled | T-2 |
| R-9 no match → hidden | T-3 |
| R-10 partial line + `_partial` | T-1 (name), T-2 (line), T-4 (live) |
| NFR responsive / a11y / timing / file opens | T-4 |

## PR Strategy

Single PR after #6 is committed. Client-only, one folder, ≈ 520 LOC of which ≈ 290 are tests; splitting would only chain review overhead.

**Recommended first task:** `FDE-T-1`.
