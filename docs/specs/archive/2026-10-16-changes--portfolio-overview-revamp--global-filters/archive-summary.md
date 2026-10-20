# Archive Summary — Portfolio Overview: global filters

**Outcome:** shipped. The admin Portfolio Overview has 5 global filters: Program, Project, Center, Typology and Status. They are mirrored in the URL. Every row-driven figure reads the filtered rows, and the ToC KPI, Projects and Centers blocks narrow what they already hold. Live parity on version 36 matches an independent SQL exactly.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/portfolio-overview-revamp/global-filters/` |
| Archive date | 2026-10-16 |
| Parent | `changes/portfolio-overview-revamp`, family #6. The `family.md` row is `done` |
| Branch | `qa-development-2026-ss` (a spec branch; the default branch is `master`) |
| Commits | `9946d37d7` server · `6cfde7ed8` client · `93a494e06` spec docs, all pushed |
| Final status | **8/8 tasks PASS.** No `test-report.md` or `validation-report.md` exists. Validation was done by the GLF-T-8 HITL task, and the user accepted the archive without a separate `/akili-test` or `/akili-validate` run |

## Requirements delivered

| Requirement | Delivered by |
|---|---|
| GLF-R-1: the bar, its count and chips, and render gating | T-4, T-5 |
| GLF-R-2: AND across, OR inside; Center and Project through the map; levels | T-2 |
| GLF-R-3: options, their order and labels | T-2, T-4 |
| GLF-R-4: every figure reconciles to the filtered rows | T-3 |
| GLF-R-5: the status tiles become the global Status; the Results Center link rule | T-2, T-5 |
| GLF-R-6, R-7: ToC KPI and Projects narrow with no refetch | T-6 |
| GLF-R-8: the Centers block applies the selection before its local controls | T-7 |
| GLF-R-9: the "Not affected by" lines | T-2, T-5, T-6, T-7 |
| GLF-R-10: the no-match panel; the ToC KPI block always renders | T-5 |
| GLF-R-11, R-12: the admin-only `portfolio/result-dimensions` endpoint (`DISTINCT`, bound parameters, no SQL in logs) | T-1, T-8 |
| GLF-R-13: map loading, failed and pending states | T-3, T-4, T-5 |
| GLF-R-14: the URL mirror with `replaceUrl` | T-2, T-5, T-8 |
| GLF-R-15: the phase and partial guards stay on unfiltered rows | T-3, T-5 |

## Files changed

| Area | Files |
|---|---|
| Server (617 lines, all additions) | `result.repository.ts` (+ spec), `results-framework-reporting.{service,controller}.ts` (+ specs), `dto/portfolio-result-dimensions.dto.ts` |
| Client: pure logic and state | `services/portfolio-filters.ts`, `portfolio-status-slot.ts` (`resolveStatusSlot` moved out of the service), `portfolio-overview.service.ts` (+ specs) |
| Client: UI | `components/filter-bar/*` (new), `portfolio-overview.component.{ts,html}`, and the `toc-kpi-block`, `projects-block` and `centers-block` blocks (+ specs) |
| Client: shared | `results-api.service.ts` (+1 method), `portfolio-result-dimensions.interface.ts`, `tests/mocks/spartanBrainMock.ts` (structural `BrnCommandEmpty`), copy files |
| Docs | Folder `portfolio-overview/CLAUDE.md`, re-stamped by T-5 |

## Test evidence

| Suite | Result |
|---|---|
| Server, scoped (`result.repository`, service, controller) | 4 suites / 257 passed |
| Client, every consumer of the shared mock (`portfolio-overview\|centers-block\|global-search\|filter-bar\|filter-multi-select\|results-notifications`) | 40 suites / 1311 passed |
| `ng build --configuration development` | OK, the first AOT check of the filter bar |

## Validation (GLF-T-8, live on version 36)

| Check | Result |
|---|---|
| Parity: CENTER-03 / CENTER-02 / CENTER-11 / project 1368 | 141 / 235 / 160 / 58. Each equals the SQL count, with no duplicate rows |
| Endpoint | 666 / 661 / 658 ms; 78,568 bytes |
| Client recompute | median 0.7 ms |
| URL restore, `foo` kept, no history entries | ✅ |
| Layout at 375 / 768 / 1280 | ✅ with no horizontal scroll. The sheet is used below the 900 px `md` breakpoint |
| Non-admin 403 | Accepted by the user without a live call (the module is hidden for guests; the metadata is asserted in specs) |
| PRTest smoke (2026-10-19) | ✅ CIP filter 124 of 1,002, `?center=CENTER-06` survives reload, the 3 portfolio endpoints return 200, and a guest cannot open the page. See `execution.md` |

## Accepted warnings and follow-ups

- ~~**PRTest smoke**, after merging to `performance-refactor`: one Center filter, a reload with params, and a real non-admin 403 call.~~ **Done 2026-10-19** (see `execution.md` → *PRTest smoke*).
- **Advisories, recorded and not acted on** (see `execution.md`):
  - Project options use the phase-wide `w3ProjectIds`.
  - The page test for S-14.1 uses a mocked Router.
  - "View in Results Center" is still a hard-coded string.
  - `load()` does not reset the map before reconciling.
  - There is no `ORDER BY` on the pairs.
  - The project-label join is an INNER JOIN.
- **`codegraph sync`**, for the new files.
- **Design deviation accepted on 2026-10-16:** items use `aria-checked`, not `aria-selected` (design §6.4 amended).

## Historical notes

- The budget was exceeded: about 3,060 lines added against about 1,500 estimated (roughly 60 % specs), and 12 review rounds. The user accepted continuing.
- **One defect reached the live check.** `<p brnCommandEmpty>` was used as an attribute, but `BrnCommandEmpty` is structural, so the popovers rendered empty. jsdom passed because the mock was not structural. GLF-T-4 was reopened and fixed (attempt 3), and the mock is now structural.
- **Archive-time text corrections**, applied in this spec's own files:
  - design §6.4 and tasks GLF-T-4: 768 px changed to the project's 900 px `md` breakpoint;
  - design DD-7 table row 1: GLF-T-6 changed to GLF-T-5.
