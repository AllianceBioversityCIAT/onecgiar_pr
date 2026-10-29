# Archive Summary — Portfolio Overview: W3/Bilateral projects, by P/A and by Center

**Outcome:** delivered. `/portfolio-overview` now shows a last section with the W3/Bilateral projects mapped to a P/A, how many report W3 results, and how many contribute to W1/W2, by P/A and by Center. Live parity on PRTest data (version 36 / 2026) matched an independent SQL on every figure.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/portfolio-overview-revamp/w3-projects-section/` |
| Parent | `changes/portfolio-overview-revamp` (family #8) |
| Archive date | 2026-10-16 |
| Branch | `qa-development-2026-ss` (spec branch for archive gating) |
| Final status | **Done** — 6 / 6 tasks `[x]`, every code task Reviewer PASS |
| Owner | santiago.sanchez@cgiar.org |

## Requirements delivered

| Requirement | Delivered by | Evidence |
|---|---|---|
| WPS-R-1..R-3 (mapped, with-W3, W1/W2 rules) | T-1 SQL + T-2 aggregation | Live parity 911 / 95 / 8 |
| WPS-R-4 (unmapped footnote) | T-2, T-3, T-4 | 0 live; spec-tested singular/plural |
| WPS-R-5 (every P/A, multi-P/A caption) | T-2, T-4 | 14 seed P/As incl. SGP-02 = 0 |
| WPS-R-6 (Center, CIAT alias, Unassigned, SO ≠ SMO) | T-2 | 14 Centers identical; CIAT 145 via alias |
| WPS-R-7 (order, no ranking) | T-3, T-4 | Natural P/A order; Centers A→Z |
| WPS-R-8 (KPIs, switches, chart / table) | T-3, T-4 | Total row 911 / 95 / 8 from `totals` |
| WPS-R-9 (states, one request per Retry) | T-4, T-5 | Block spec; page spec |
| WPS-R-10 (admin only) | T-2, T-6 | Guard metadata spec; no-auth 401; non-admin user-reported |
| NFR parity / performance / responsive / a11y | T-6 | p95 0.98 s; no page scroll at 375; keyboard + focus ring |

## Files changed

| Area | Files |
|---|---|
| Server | `clarisa/clarisa-projects/clarisa-projects.repository.ts` (+spec), `api/bilateral/constants/approved-mapping-statuses.constants.ts` (new), `api/bilateral/services/bilateral-projects.service.ts` (constant import only), `api/results-framework-reporting/results-framework-reporting.{module,service,controller}.ts` (+specs), `…/dto/portfolio-bilateral-projects.dto.ts` (new) |
| Client | `shared/services/api/results-api.service.ts` (+spec), `shared/interfaces/portfolio-bilateral-projects.interface.ts` (new), `portfolio-overview/components/projects-block/*` (new), `portfolio-overview.component.{html,ts,spec.ts}`, `portfolio-overview/CLAUDE.md`, `internationalization/portfolio-overview.copy.ts` |
| Size | ≈ 2,000 LOC added vs ≈ 1,100 estimated (user approved past the ≈ 1,500 tripwire) |

## Test evidence

- No separate `test-report.md`: the user asked to archive directly; verification evidence lives in `execution.md`.
- Final combined-tree runs (after other sessions' merges, 2026-10-16): server 5 suites / 210 tests green; client 14 suites / 598 tests green. All runs scoped, `--maxWorkers=2`.

## Validation

- No separate `validation-report.md` (absence accepted by the user's archive instruction). WPS-T-6 live checks stand in: parity, timing, browser, keyboard — all PASS; non-admin 403 user-reported.

## Accepted warnings and follow-ups

| Item | Source | Disposition |
|---|---|---|
| `Version.phase_year` NULL → 200 with zeros instead of 404 | T-2 advisory | Follow-up candidate |
| Design §9 "No new logs" vs the mandated #5 catch that logs the method + driver code | T-2 advisory | Align §9 wording in a later spec |
| Empty state with unmapped > 0 shows two lines (R-9 "one line" vs R-4 footnote) | T-4 advisory | Accepted; R-4 wins |
| No page-level test for "other sections render when the block errors" (S-9.1) | T-5 advisory | Follow-up test candidate |
| Non-admin 403 body not captured by the agent | T-6 | User-reported; accepted |

## Historical notes

- **Pivot (WPS-T-6, chart colours):** design's remedy "swap W1/W2 to a non-violet chart token already defined in `colors.scss`" was unviable — no such token exists. User chose A1: Mapped `--pr-chart-1`, With W3 `--pr-chart-3`, W1/W2 `--pr-chart-2` + diagonal-stripe decal.
- Endpoint lives in `results-framework-reporting`, not `/api/bilateral/*` (WPS-DD-1), so the bilateral payload contract doc is unchanged.
- Concurrency: sibling sessions fixed and archived #5 / #10 in the same service file while this spec ran; coordinated through the family orchestrator, no conflicts.
