# Tasks — Results detail filters and rejection reason in the Portfolio Overview export

> **Answer first:** 4 tasks. T-1 (server) and T-3 (filters UI) are independent; T-2 (export seam) needs T-1's contract; T-4 verifies everything on PRTest and in a real browser. ≈ 530 LOC including tests → **2 PRs** recommended: PR 1 = T-1 + T-2 (data → Excel, which answers SR-168253), PR 2 = T-3 (filters).

## 1. Scope

| Field | Value |
|---|---|
| Feature | Portfolio Overview · Results detail filters + rejection reason export |
| Spec | `requirements.md` (PRE-R-1..9) · `design.md` (DD-1..9, P-1..10, budget) |
| Cross-refs | `docs/prd.md` G2, US-P1 · `docs/ux-ui/design.md` (tokens, a11y) · `docs/trd/trd.md` (results-framework-reporting module) |
| Ticket | SR-168253 |
| Status | not-started |

## 2. Pre-flight

- [x] `requirements.md` approved (2026-11-17)
- [x] `design.md` approved (2026-11-17)
- [x] No open questions block the tasks (P-10 is owned by T-4)
- [x] No migration (read-only SQL over existing tables)
- [x] No in-flight spec touching `results-detail` / `result-dimensions` (the Leader checks `git log origin/staging` at T-1 start)

## 3. Task list

### [x] PRE-T-1 — Server: `rejections` on `portfolio/result-dimensions`

- **Type:** server
- **Description:** Add the rejection query to `getPortfolioResultDimensions` (repository) and map it in the service to `rejections[]` as in design §6/§7. Add `PortfolioRejectionDto` and the field on the response DTO, and append one sentence to the Swagger description.
- **Implements:** PRE-R-8 (all scenario clauses: version scope, exclusions of types 10/11, inactive and other versions; `AND IT MUST` keep the guard and generic 500), PRE-R-7 data side (newest record DD-3, `REJECT`+`REJECTED`, null SP), DD-1, DD-2, DD-3, DD-7, DD-9
- **Design refs:** §5, §6, §7, DD-1/2/3/7/9, P-1..4
- **Files:** `onecgiar-pr-server/src/api/results/result.repository.ts`, `…/results-framework-reporting/results-framework-reporting.service.ts`, `…/dto/portfolio-result-dimensions.dto.ts`, `…/results-framework-reporting.controller.ts`, and their `.spec.ts` files
- **Scope:** `Backend route: nestjs-expert + api-design-principles; test-first: no; stack: project conventions (raw SQL via this.query)`
- **Depends on:** — · **Blocks:** PRE-T-2, PRE-T-4
- **Estimate:** M · **Review:** `full` (response-shape change on a shared endpoint)
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Verification:**
  - Command: `cd onecgiar-pr-server && npx jest src/api/results-framework-reporting src/api/results/result.repository.spec.ts --silent --reporters=summary --forceExit` + `npx tsc --noEmit -p tsconfig.json` + `npx eslint "src/api/results-framework-reporting/**/*.ts" src/api/results/result.repository.ts --quiet`
  - Repository spec asserts that the fifth query is issued with `[versionId]` and that its SQL text contains `status_id = 7`, `IN ('REJECT', 'REJECTED')`, the `result_type_id NOT IN (10, 11)` / `is_active = 1` / `version_id = ?` scope, and the `created_at DESC, id DESC` + `LIMIT 1` ordering. Service spec asserts the mapping: `Number(result_id)`, a trimmed comment, `''`→null, a null SP kept null, `rejectedAt` passed through, `rejections: []` when the query returns none.
  - **Falsifier:** change the service mapping so `programCode` falls back to `''` instead of null, or drop `'REJECTED'` from the SQL IN-list. The fixture holds one row with a null `initiative_code` and the SQL assertion checks both spellings, so the spec goes red on each mutation.
  - **Red run:** `predicted — greenfield artifact (observed in PRE-T-1)`: the new spec cases fail with `rejections` undefined before the code exists. The red must be quoted verbatim in `execution.md`.
  - **Disqualifier:** SQL correctness (the newest record, real column names) cannot be proven by Jest, because the query text is asserted, not executed. A green here is **not** evidence that the query returns the right rows. That evidence is T-4's PRTest check. If `tsc` is skipped, the DTO typing is unproven.
  - **Consumers:** server `results-framework-reporting.controller.spec.ts`, `results-framework-reporting.service.spec.ts`, `result.repository.spec.ts` (P-8). Any spec that builds the full response with `toEqual` must gain `rejections`.
- **Definition of done:**
  - [ ] The red is observed and quoted, then green; `tsc` and eslint clean
  - [ ] No `console`/logger call prints a comment; the catch path is unchanged
  - [ ] Swagger description mentions `rejections`
  - [ ] Commit `✨ feat(portfolio-overview) [SR-168253]: … [SPEC:changes/portfolio-rejection-reason-export]`

### [x] PRE-T-2 — Client: rejection fields and 16-column export

- **Type:** client
- **Description:** Add `DimensionRejection` and `rejections` to `PortfolioResultDimensions`. Extend `buildDetailLabels` (the rejections map), `DetailRow` (3 fields), `toDetailRows` (the status-slot rule of design §8.4), `EXPORT_COLUMNS` / `toExportRows` (3 headers after `Status`, truncation to 32,767 characters), and `EXPORT_WSCOLS` widths. Screen columns stay unchanged.
- **Implements:** PRE-R-7 (all scenarios: rejected row incl. `AND IT MUST` newest record as served; non-rejected incl. resubmitted → `—`; incomplete record with the `BUT` "never empty/null/undefined"; map not ready → `Unavailable`; legacy spelling as served by T-1), PRE-R-9, DD-6, DD-8
- **Design refs:** §8.4, §9, DD-6, DD-8, P-6, P-9
- **Files:** `onecgiar-pr-client/src/app/shared/interfaces/portfolio-result-dimensions.interface.ts`, `…/portfolio-overview/components/results-detail/results-detail.rows.ts`, `…/results-detail.rows.spec.ts`, `…/results-detail.component.ts`, `…/results-detail.component.spec.ts`, `src/app/internationalization/portfolio-overview.copy.ts` (if headers live in copy)
- **Scope:** `Design route: n/a — no visual surface (file columns only)`
- **Depends on:** PRE-T-1 (contract shape only; it can run against the design §6 contract in parallel) · **Blocks:** PRE-T-4
- **Estimate:** M · **Review:** `full` (exported symbols `EXPORT_COLUMNS`, `DetailRow`, and the shared interface)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - Command: `cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/portfolio-overview src/app/shared/services/api/results-api.service.spec.ts --silent --reporters=summary --no-coverage` + `npx tsc --noEmit -p tsconfig.app.json` + `npx ng lint --quiet`
  - Rows spec, a fixture table with 6 rows: a rejected row with a full record; a rejected row with two records where only the newest is served; a rejected row with a null comment and a null SP; a rejected row with no record; an approved row whose id *does* have a record (the resubmitted case); a rejected row with the map not ready. Plus one 40,000-character comment.
  - Component spec asserts at the **sink**: the `exportExcel` mock's first argument has 16 keys in order, and the 3 values for the full-record row (`KZ-changes--portfolio-overview-revamp--filtered-detail-export-1`).
  - **Falsifier:** (a) drop the status-slot check, so any row with a record gets values. The approved-row-with-record fixture then shows a reason instead of `—`, which goes red. (b) Return `''` for a missing comment. The null-comment fixture then expects `—`, which goes red. (c) Remove the truncation. The 40,000-character fixture expects length ≤ 32,767, which goes red. (d) Assign `rejections` a wrong type in a hand-built map; `tsc` goes red while Jest stays green (compile gate).
  - **Red run:** the existing pin `results-detail.rows.spec.ts:188` (`expect(Object.keys(r)).toEqual([...13 keys])`) goes red once the 3 columns are added. The Implementer updates it **in the same task** and quotes the before-red. The new cases are `predicted — greenfield artifact (observed in PRE-T-2)`, quoted in `execution.md`.
  - **Disqualifier:** a green with `exportExcel` asserted only in the rows spec (not at the component sink) is not evidence for the file. If any fixture row's expected value was copied from the implementation's output instead of the requirement table, the case is void.
  - **Consumers:** `results-detail.rows.spec.ts` (`:188` key pin), `results-detail.component.spec.ts`, `portfolio-overview.component.spec.ts`, `services/portfolio-filters.spec.ts`, `services/portfolio-overview.service.spec.ts`, `shared/services/api/results-api.service.spec.ts` (hand-built `PortfolioResultDimensions` may need `rejections: []`), `portfolio-filters.ts`, page `CLAUDE.md`. `results-list-filters.component.ts` matched `DetailRow`; confirm it is an unrelated symbol (P-9) and record the result.
- **Definition of done:**
  - [ ] Every PRE-R-7 scenario clause maps to a named spec case (list them in `execution.md`)
  - [ ] Screen table column set unchanged (the existing component spec stays green)
  - [ ] `tsc`, Jest, and lint green; coverage ≥ client gates

### [x] PRE-T-3 — Client: Filters dropdown in the Results detail toolbar

- **Type:** client
- **Description:** Create `components/detail-filters/` (`app-portfolio-detail-filters`) per design §8.1 (Spartan Popover + Brain Command, two sections, count badge, hint line, Clear). Add `<ng-content select="[detailFilters]" />` to the results-detail toolbar between Search and Export (§8.2). Wire it on the page to `data.options()`, `data.selection()`, `data.filtersPending()`, `toggleValue`, and `clearDimension('funding')` + `clearDimension('status')` (§8.3). Add copy keys under `PORTFOLIO_OVERVIEW_COPY.detail`.
- **Implements:** PRE-R-1 (both scenarios, incl. `BUT` no Program/Project/Center/Typology), PRE-R-2 (both scenarios, incl. `BUT` no table-only state and `AND IT MUST` behave like the top bar), PRE-R-3 (incl. `BUT` Program kept), PRE-R-4, PRE-R-5 (incl. `AND IT MUST` enabled on an empty list), PRE-R-6, DD-4, DD-5
- **Design refs:** §8.1–8.3, §8.5, DD-4, DD-5, P-5, P-7
- **Files:** `…/portfolio-overview/components/detail-filters/detail-filters.component.{ts,html,spec.ts}`, `…/results-detail/results-detail.component.html`, `…/portfolio-overview.component.{html,ts}`, `…/portfolio-overview.component.spec.ts`, `src/app/internationalization/portfolio-overview.copy.ts`
- **Scope:** `Design route: impeccable-bridge — match existing top-bar multi-select (dashboard/tool page mode, existing --pr-* tokens, no new tokens); stack: angular-developer + spartan + tailwind-design-system`
- **Depends on:** — · **Blocks:** PRE-T-4
- **Estimate:** M–L (sized ×2 per the FDE kaizen budget note) · **Review:** `full` (it writes the shared `selection` state and adds a DOM hook)
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `impeccable-bridge`
- **Verification:**
  - Command: `cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/portfolio-overview --silent --reporters=summary --no-coverage` + `npx tsc --noEmit -p tsconfig.app.json` + `npx ng lint --quiet`
  - Component spec (detail-filters): renders exactly the Funding and Status sections from the inputs; a toggle emits `{dimension, value}`; Clear emits `cleared` and is disabled when both sets are empty; the count badge equals funding + status size; the accessible name includes the count; disabled blocks opening; Escape closes and focus returns to the trigger.
  - Page spec (with the **real** `PortfolioOverviewService` selection signal, not a stub): a toggle in the detail filters makes `data.selection().status` contain `rejected` and the top-bar trigger for Status show count 1. Clear with Program set leaves `program` intact. `filtersPending` true → button disabled. An empty filtered list → button enabled.
  - **Falsifier:** (a) implement Clear as `data.clearAll()`. The page spec with Program = SP01 expects `program` to still hold SP01, so it goes red. (b) Keep a local `signal` copy of the selection in the component and toggle it. The page spec reads the service selection, which does not change, so it goes red. (c) Bind `disabled` to `listed().length === 0`. The empty-list case expects enabled, so it goes red.
  - **Red run:** `predicted — greenfield artifact (observed in PRE-T-3)`. Quote the first failing assertion in `execution.md`.
  - **Disqualifier:** jsdom cannot measure the toolbar layout or the popover's clipping, and Brain overlay focus can behave differently in jsdom. A green here proves wiring and state only, not layout or real focus; those are T-4's browser checks. A page spec that stubs the service's `toggleValue` (instead of using the real selection) proves nothing about PRE-R-2.
  - **Consumers:** `results-detail.component.html` / `.spec.ts` (toolbar DOM: `detail-search`, `detail-export` test ids must still resolve), `portfolio-overview.component.html` / `.spec.ts`, `centers-block.component.spec.ts` (matched `detail-export`/`app-portfolio-results-detail`; confirm it is unaffected), `portfolio-overview.service.ts` (`toggleValue` / `clearDimension` callers grow by one), `filter-bar.component.html` (the other writer of the same state, P-7), `portfolio-overview.copy.ts`.
- **Definition of done:**
  - [ ] Every PRE-R-1..6 clause maps to a named spec case
  - [ ] No new signal or state holding filter values (grep the new component for `signal<` → only `open`)
  - [ ] Design route evidence: a screenshot at 1280 px and 768 px with the panel open, attached in `execution.md` (taken in T-4)
  - [ ] `tsc`, Jest, and lint green

### PRE-T-4 — Verification on PRTest and in a real browser

- **Type:** rollout
- **Description:** Deploy PR 1 (and PR 2) to PRTest. Settle P-10 and the SQL correctness, check the layout, keyboard behavior and latency, and record everything in `execution.md`.
- **Implements:** PRE-R-7, R-8 end-to-end (settles P-10); PRE-R-5, R-6 real-browser behavior; NFR performance and layout; the manual gates of requirements §8
- **Design refs:** §11 P-10, §12
- **Depends on:** PRE-T-1, PRE-T-2, PRE-T-3 · **Blocks:** —
- **Estimate:** S · **Review:** `checklist`
- **Skills:** `playwright-cli` (only if installed locally), `systematic-debugging` (on any mismatch)
- **Verification:**
  - SQL / data: on PRTest, pick ≥ 2 known rejected results, one of them rejected twice if available. Compare the export's 3 cells with each result's rejection notice (reason, SP, date). Check that a resubmitted result shows `—`.
  - Filters: tick W3/Bilateral + Rejected in the table panel; the top bar shows both and the table count equals the KPI total. Clear keeps a Program selection.
  - Layout: at 1280 and 768 px (100 % zoom, after data loads): toolbar on one row at 1280, clean wrap at 768, no page horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`), and the popover inside the viewport (bounding rect).
  - Keyboard: walk Tab → Filters → Enter → arrows/Space → Escape; focus returns to the button.
  - Latency: `result-dimensions` timing 3× before and 3× after.
  - **Falsifier:** a known rejected result whose export cell differs from its notice, or a Clear that drops Program, marks the task failed.
  - **Red run:** `n/a (no test gate — manual verification)`
  - **Disqualifier:** if the 3 latency runs vary more than the before/after difference, report the spread; the timing is then not evidence. If PRTest has no rejected results in the open phase, P-10 stays UNVERIFIED and is reported to the user, not passed.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] P-10 settled (verified or escalated)
  - [ ] Screenshots and the measurements recorded in `execution.md`
  - [ ] Ticket reply drafted for the user, mentioning the column-position change (DD-6)

## 4. Dependency graph

```text
PRE-T-1 (server) ──► PRE-T-2 (export seam) ──┐
                                             ├──► PRE-T-4 (PRTest + browser)
PRE-T-3 (filters UI, parallel) ──────────────┘
```

## 5. Test plan

| Test | Type | Covers | Location |
|---|---|---|---|
| PRE-TEST-1 | unit (server) | PRE-R-8, R-7 data | `results-framework-reporting.service.spec.ts`, `result.repository.spec.ts` |
| PRE-TEST-2 | unit (client) | PRE-R-7, R-9 | `results-detail.rows.spec.ts` |
| PRE-TEST-3 | component (client) | PRE-R-7 at the sink | `results-detail.component.spec.ts` |
| PRE-TEST-4 | component (client) | PRE-R-1, 3, 4, 6 | `detail-filters.component.spec.ts` |
| PRE-TEST-5 | page (client, real service) | PRE-R-2, 3, 5 | `portfolio-overview.component.spec.ts` |
| PRE-TEST-6 | manual PRTest / browser | P-10, layout, keyboard, latency | `execution.md` |

## 6. Rollout

- [ ] PR 1 (T-1 + T-2) → `staging`; PR 2 (T-3) → `staging`. Both carry `[SR-168253]`
- [ ] CI green (lint, tests, build, `migration:check:ci` unaffected, SonarCloud)
- [ ] PRTest checks (T-4), then release to `master` on the cadence
- [ ] Reply on SR-168253 once in PROD

## 7. Roll-back

1. Revert PR 2 (UI only, no data impact).
2. Revert PR 1. The extra response field disappears; no migration, no stored data.
3. No flags, no downstream consumers (admin-only internal endpoint).
