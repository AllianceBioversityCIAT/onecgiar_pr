# Tasks — ToC KPI block: disclose KPIs with no target

| Field | Value |
|---|---|
| Status | approved (2026-10-22), executed 2026-10-22 (performance on PRTest pending) |
| Approval Mode | gated |
| Budget | 3 tasks · ≈ 260 LOC · ≤ 2 review rounds per code task (design §12) |
| PR strategy | Single PR (< 400 LOC). Commit order: T-1 server, then T-2 client |

Test rules for every task: Jest with `--maxWorkers=2`, always scoped (`--testPathPattern`), one test run at a time. Before any push, run `--findRelatedTests` on the changed files. No commit until the user says so. No agent runs SQL against prdb.

## TND-T-1 — Server: `noTarget` in query, service and DTO [x]

- **Size:** M (≈ 120 LOC, ≈ 35 production)
- **Depends on:** none
- **Implements:** TND-R-1 (S-1.1 … S-1.5), TND-NFR-3. Design §6, §7, DD-1, DD-2.
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Files:** `aow-bilateral.repository.ts` + spec, `results-framework-reporting.service.ts` + spec, `dto/portfolio-toc-coverage.dto.ts`. No other file.
- **Test-first (red, then green):**
  - Repository, SQL text: the target join is `LEFT JOIN`. `total` is conditioned on `tgt.indicator_id IS NOT NULL`. `covered` is conditioned on **both** `tgt` and `cov` being non-null (S-1.3, DD-2). `no_target` is conditioned on `tgt.indicator_id IS NULL` (S-1.1, S-1.2). The subquery still has `target_date = ?` and `> 0` (S-1.2).
  - Repository, params: same array, same order as today (design §7.1).
  - Repository, mapping: `no_target` → `noTarget` as a number.
  - Service: with rows OUTPUT `{3,1,2}` and OUTCOME `{1,0,4}`, the program gets `outputs.noTarget=2`, `outcomes.noTarget=4`, `noTarget=6`. Over two programs, `portfolio.noTarget` is the sum. A seeded program with no rows has `noTarget=0` everywhere (S-1.4).
  - Service: `total` and `covered` are the same as for the same rows before this change (S-1.3 BUT). Existing service cases stay green with no edits other than added `noTarget` expectations (S-1.5).
  - DTO: `noTarget` is on `TocKpiCountsDto` with `@ApiProperty`. No existing property is renamed or removed (S-1.5).
- **Verification** (from `onecgiar-pr-server`):
  - `npx jest --silent --reporters=summary --forceExit --maxWorkers=2 --testPathPattern="aow-bilateral.repository|results-framework-reporting.service"`
  - `npx eslint <the 5 files> --quiet`
- **Input that must fail:** move the `tgt` condition out of `covered` and the S-1.3 case must go red. Change `LEFT JOIN` back to `JOIN` and the SQL-text case must go red.
- **What this cannot prove:** the SQL-text cases prove the shape of the query, not the counts on real data. T-3 proves the counts.
- **Done:**
  - [x] Red run recorded, then green
  - [x] eslint clean on the touched files
  - [x] Reviewer PASS

## TND-T-2 — Client: format helpers, copy and block lines [x]

- **Size:** M (≈ 140 LOC, ≈ 55 production)
- **Depends on:** TND-T-1 (contract only; the client works against the old server, DD-3)
- **Implements:** TND-R-2 (S-2.1 … S-2.4), TND-R-3 (S-3.1 … S-3.3), TND-R-4 (S-4.1), TND-NFR-4. Design §8, DD-3, DD-4, DD-5.
- **Skills:** `angular-developer`, `tailwind-design-system`, `tdd`. `spartan` is not needed: there are no interactive primitives, only plain text.
- **Files:** `portfolio-toc-coverage.interface.ts`, `toc-kpi.format.ts` + spec, `toc-kpi-block.component.{ts,html}` + spec, `portfolio-overview.copy.ts`. No other file.
- **Test-first (red, then green):**
  - Format: `toViewRows` and `toSummary` carry `noTarget`. A missing `noTarget` reads as 0 (DD-3). `sumRows` adds up `noTarget` (S-2.3).
  - Copy: `excludesNoTarget(1)` → `excludes 1 KPI with no target set`; `excludesNoTarget(3)` → `excludes 3 KPIs with no target set`. `noTargetOnly(4)` and `emptyNoTarget(12)` match the requirement text exactly. The subtitle contains `out of the KPIs with a target` (S-4.1).
  - Component DOM:
    - S-2.1: row `noTarget=2` shows `toc-kpi-no-target` with the plural text, and the summary `noTarget=40` shows `toc-kpi-summary-no-target`.
    - S-2.2: `noTarget=1` shows the singular. `noTarget=0` renders **no** `toc-kpi-no-target` element.
    - S-2.3: with the Program filter on 2 rows (2 + 3), the summary shows 5, and the API spy is called once.
    - S-2.4: the `toc-kpi-split` text is unchanged.
    - S-3.1: `total=0, noTarget=4` shows `noTargetOnly` and not `No ToC KPIs in this phase`. S-3.2: `total=0, noTarget=0` keeps `noKpis`.
    - S-3.3: every visible row has `total=0` and the visible `noTarget` sum is 12 → `emptyNoTarget(12)`. The same with a sum of 0 keeps `copy.empty`.
    - NFR-4: the disclosure elements have no `role`, no `tabindex`, and are not buttons.
- **Verification** (from `onecgiar-pr-client`):
  - `npm run test:local -- --testPathPattern="toc-kpi"`, or `npx jest --silent --reporters=summary --no-coverage --maxWorkers=2 --testPathPattern="toc-kpi"`
  - `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests <changed client files>`, so a consumer spec in another folder is not missed (the interface is shared)
  - `npx eslint <touched files> --quiet`
- **Input that must fail:** render the disclosure with `@if (row.noTarget >= 0)` and S-2.2 must go red. Drop `noTarget` from `sumRows` and S-2.3 must go red.
- **What this cannot prove:** jsdom does not measure layout, so TND-NFR-2 (no wrap or overflow) is left to T-3.
- **Done:**
  - [x] Red run recorded, then green
  - [x] `--findRelatedTests` green (1 pre-existing flake outside scope, see execution.md)
  - [x] eslint clean
  - [x] Reviewer PASS

## TND-T-3 — Verification: real-data parity, performance, layout (HITL) [x]

- **Size:** S
- **Depends on:** TND-T-1, TND-T-2
- **Implements:** the real-data check of TND-R-1 (S-1.1, S-1.2, S-1.3), TND-NFR-1, TND-NFR-2. Requirements §8 rows 1, 2, 6, 7.
- **Steps:**
  1. **Parity (user-run).** The agent gives a read-only query inline in chat (never as a file). It counts, for 2 programs (SP05 BDN and one Accelerator), the in-scope indicators with and without a target for the reporting year. The user runs it. Pass: `total` and `noTarget` from the endpoint match the query, and `total` / `covered` match what the endpoint returned before the change.
  2. **Layout (local browser, read-only).** Open Portfolio overview at 1280, 768 and 375. Check the summary line, a row with the line, and a row with only no-target KPIs if one exists. Pass: no figure or bar wraps or overflows. Do not click any write action (shared prdb).
  3. **Performance (PRTest, after deploy).** Make 3 calls to the endpoint and record each time. Pass: p95 ≤ 2 × 850 ms.
- **What disqualifies the evidence:**
  - If the 3 timings vary by more than the difference from the baseline, report the spread and do not report a pass.
  - If the parity query and the endpoint use different reporting years or versions, the comparison does not count.
  - If no program has only no-target KPIs, S-3.1 is checked by the T-2 spec only, and this must be stated.
- **Done:**
  - [x] Parity accepted by the user (full portfolio, 2026-10-22)
  - [x] Layout accepted by the user at 3 widths
  - [x] Performance marked pending until the PRTest deploy

## Coverage (scenario level)

| Scenario / clause | Owner |
|---|---|
| S-1.1, S-1.2 | T-1 (SQL shape) + T-3 step 1 (counts) |
| S-1.3 incl. BUT (total/covered unchanged) | T-1 (DD-2 case, service equality) + T-3 step 1 |
| S-1.3 AND IT MUST (`total + noTarget` = in-scope) | T-3 step 1 |
| S-1.4 | T-1 service cases |
| S-1.5 incl. BUT (no rename/removal) | T-1 DTO + existing service cases |
| S-2.1, S-2.2 incl. BUT (no element at 0) | T-2 DOM |
| S-2.3 incl. AND IT MUST NOT refetch | T-2 format + DOM (API spy once) |
| S-2.4 | T-2 DOM |
| S-3.1 incl. BUT, S-3.2 | T-2 DOM |
| S-3.3 incl. BUT and the AND clause | T-2 DOM |
| S-4.1 | T-2 copy |
| NFR-1 | T-3 step 3 |
| NFR-2 | T-3 step 2 (no automated gate) |
| NFR-3 | T-1 (bound params, `debug: false` kept) |
| NFR-4 | T-2 DOM |
