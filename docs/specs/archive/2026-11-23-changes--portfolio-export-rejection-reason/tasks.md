# Tasks — Rejection reason in the Portfolio Overview Excel export

> **Answer first:** 4 tasks. PER-T-1 (server) and PER-T-2 (client rows) run in parallel. PER-T-3 (component hyperlink + types) follows PER-T-2. PER-T-4 is the human check (PROD count + the real `.xlsx`). About 90 LOC of production code + 150 of tests, one PR.

## 1. Scope

| Field | Value |
|---|---|
| Linked spec | `requirements.md` (PER-R-1..5) + `design.md` (PER-DD-1..5, Premise Ledger P-1..P-10) |
| Owner | Santiago Sanchez |
| Status | in-progress (T-1, T-2 done) |
| Ticket | none (Nicoleta email, 2026-11-17). Commit tag `[SPEC:changes/portfolio-export-rejection-reason]` |

**Test-run rules (CLAUDE.md global, copy into every brief):** Jest always `--maxWorkers=2`, always scoped to the files below, one test run on the machine at a time, lint only touched files (`npx eslint <files> --quiet`). Before pushing: `npx jest --findRelatedTests <changed files> --maxWorkers=2`.

## 2. Pre-flight

- [x] `requirements.md` approved (2026-11-17)
- [x] `design.md` approved (2026-11-17, Continue without judgment-day)
- [x] Open questions resolved (OQ-1..3 in proposal)
- [x] No migration
- [x] No in-flight spec on `results-detail.rows.ts` / `getPortfolioResultDimensions` (active specs in `docs/specs/changes/`: none touch them)

## 3. Task list

### [x] PER-T-1 — Server: latest rejection per Rejected result in the dimensions map

- **Type:** server
- **Description:** Add a 5th read query to `ResultRepository.getPortfolioResultDimensions` (same `Promise.all`): REJECT entries of active results in the version, type ∉ {10, 11}, `status_id = 7`, keeping only the latest per result through a correlated `NOT EXISTS` on `(created_at, id)`, with `LEFT JOIN clarisa_initiatives` for `official_code` (design §5). Return it as `rejections`. In the service, map rows to `[Number(result_id), official_code ?? null, comment ?? '']`. Add `rejections` to `PortfolioResultDimensionsResponseDto` with an `@ApiProperty` description. Update the controller's `ApiOperation` description sentence to mention it.
- **Implements:** PER-R-1 (S-1.1..1.5), PER-R-2 (S-2.1, S-2.2), PER-DD-1/2/3
- **Backend route:** `nestjs-expert` (repository, service, DTO, Jest), `api-design-principles` (additive admin field); test-first: yes
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts`, `…/result.repository.spec.ts`, `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts`, `…/results-framework-reporting.service.spec.ts`, `…/dto/portfolio-result-dimensions.dto.ts`, `…/results-framework-reporting.controller.ts` (description only)
- **Depends on:** —
- **Blocks:** PER-T-4
- **Estimate:** S
- **Review:** full. It changes a response shape and adds SQL
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Command (in `onecgiar-pr-server/`):** `npx jest src/api/results/result.repository.spec.ts src/api/results-framework-reporting/results-framework-reporting.service.spec.ts --maxWorkers=2 --silent --forceExit` · `npx eslint <touched files> --quiet` · `npm run build`
  - **Falsifier:** (a) remove the `NOT EXISTS` clause → the repo test asserting the 5th SQL contains the tie-break on `id` and `status_id = 7` goes red. (b) Map `official_code ?? null` as `?? ''` → the service test with a raw row `{ result_id: '101', official_code: null, comment: 'x' }` expecting `[101, null, 'x']` goes red. (c) Drop `rejections` from the response → the service test expecting `rejections` goes red, while the existing-fields assertion (S-2.1) stays green. (d) Make the 5th query reject → the service returns the generic 500 and `logger.error` is called only with the code string; a test asserting the logged text does not contain the comment `'SECRET-COMMENT'` goes red if the comment is logged.
  - **Red run:** `predicted — greenfield artifact (observed in PER-T-1)`. The new assertions target a query and a field that do not exist yet; the Implementer quotes each red verbatim in `execution.md` before writing production code. The existing pin `result.repository.spec.ts:1860` (`toHaveBeenCalledTimes(4)`) is updated to 5 as part of the test-first step.
  - **Disqualifier:** a mocked `query` cannot prove SQL semantics. A green here does not count as evidence that the right entry is picked; that is PER-T-4's job. If the tests assert only that `query` was called, the gate is inert: they must assert the SQL text predicates and the bound `[versionId]`.
  - **Consumers:** `result.repository.spec.ts`, `results-framework-reporting.service.spec.ts`, `results-framework-reporting.controller.spec.ts` (mocks the service; check it still passes), client `portfolio-result-dimensions.interface.ts` (PER-T-2). Design P-8.
- **Definition of done:**
  - [ ] Each falsifier (a)–(d) executed against the post-change code and seen red, quoted in `execution.md`
  - [ ] Scoped Jest green, eslint clean on touched files, `npm run build` green
  - [ ] No new log line; repository keeps `debug: false`
  - [ ] Swagger description on the new DTO property
  - [ ] No change in `/api/bilateral/*` or `bilateral-result-summaries.en.md`

### [x] PER-T-2 — Client: rejection fields in detail rows and export rows

- **Type:** client
- **Description:** Add `ResultRejection = [number, string | null, string]` and optional `rejections?: ResultRejection[]` to `PortfolioResultDimensions`. In `results-detail.rows.ts`: `DetailLabels` gains `rejections: ReadonlyMap<number, { by: string | null; reason: string }>` plus a flag for whether the map carried the field; `buildDetailLabels` fills them; `DetailRow` gains `rejectionReason`, `rejectedBy`; `toDetailRows` resolves them per design §6 (non-Rejected → `—`; Rejected + map not ready or field absent → `Unavailable`; Rejected + no entry → `Not recorded`; entry → comment as-is / code or `Not recorded`). Add `NOT_RECORDED` constant. `EXPORT_COLUMNS` and `toExportRows` insert `Rejection reason`, `Rejected by` after `Status`. `searchRows`, `sortRows`, `DetailSortKey` unchanged.
- **Implements:** PER-R-3 (S-3.1..3.5), PER-R-5 (search part of S-5.1), PER-DD-5
- **Design route:** n/a. No visual surface (spreadsheet columns only); `impeccable-bridge` not loaded. Evidence: the HTML template is not in Files
- **Files (expected):** `onecgiar-pr-client/src/app/shared/interfaces/portfolio-result-dimensions.interface.ts`, `…/portfolio-overview/components/results-detail/results-detail.rows.ts`, `…/results-detail.rows.spec.ts`
- **Depends on:** —
- **Blocks:** PER-T-3
- **Estimate:** S
- **Review:** checklist. A pure function with an exported list, consumers listed
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Command (in `onecgiar-pr-client/`):** `npx jest --maxWorkers=2 --no-coverage --testPathPattern=results-detail.rows` · `npx eslint <touched files> --quiet`
  - **Falsifier:** fixture with **three** rows sharing the map, where wrong and right readings diverge: row A status Rejected (id 7) with entry `[A, 'SP06', 'line1\nline2']`; row B status Approved whose id **also has an entry** in the map; row C status Rejected with no entry. Mutations: (a) drop the status check → B shows a reason instead of `—`, red. (b) Return `—` for C instead of `Not recorded`, red. (c) Trim or collapse the newline → A's reason ≠ `'line1\nline2'`, red. (d) Treat field absent as empty map → the "map without `rejections`" case shows `Not recorded` instead of `Unavailable`, red. (e) Insert the columns after `Origin` → the 15-key order assertion goes red.
  - **Red run:** `predicted — greenfield artifact (observed in PER-T-2)`. Fields and columns don't exist yet. The existing 13-key pin `results-detail.rows.spec.ts:188-202` is updated to 15 keys first and must be seen red on the current code; the Implementer quotes that red.
  - **Disqualifier:** a fixture where every Rejected row has an entry and no non-Rejected row has one is inert for mutations (a) and (b). It does not count.
  - **Consumers:** `results-detail.component.ts` (PER-T-3), `results-detail.rows.spec.ts`. The interface is read by `portfolio-filters.ts`, `filter-bar.component.ts` and `portfolio-overview.service.ts` (+ specs); the field is optional and they don't iterate keys (design P-10), so no edits are expected. Confirm by running their specs once: `--testPathPattern="portfolio-filters|portfolio-overview.service|filter-bar"`
- **Definition of done:**
  - [ ] Falsifiers (a)–(e) executed against post-change code, reds quoted in `execution.md`
  - [ ] Scoped Jest green (rows + the 3 consumer specs), eslint clean

### PER-T-3 — Client: export call — Link column by name, widths, default map

- **Type:** client
- **Description:** In `results-detail.component.ts`: the hyperlink entry uses `cellNumber: EXPORT_COLUMNS.indexOf('Link') + 1` (PER-DD-4); `EXPORT_WSCOLS` gives `Rejection reason` width 60; the fallback map passed to `buildDetailLabels` stays valid with the new optional field. Update `results-detail.component.spec.ts` (`wscols` length 15, link `{ cellNumber: 15, cellKey: 'Link' }`), and add an assertion that the table header cells and the search behavior are unchanged (no `Rejection` text in the rendered header).
- **Implements:** PER-R-4 (S-4.1), PER-R-5 (S-5.1), PER-DD-4
- **Design route:** n/a. No template change
- **Files (expected):** `…/results-detail/results-detail.component.ts`, `…/results-detail.component.spec.ts`
- **Depends on:** PER-T-2
- **Blocks:** PER-T-4
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`
- **Verification:**
  - **Command (in `onecgiar-pr-client/`):** `npx jest --maxWorkers=2 --no-coverage --testPathPattern=results-detail` · `npx tsc --noEmit -p tsconfig.app.json` · `npx eslint <touched files> --quiet`
  - **Falsifier:** leave `cellNumber: 13` → the spec expecting `15` goes red (on the 15-column file, cell 13 is `Projects`). Hard-code `15` and then move `Link` in `EXPORT_COLUMNS` → an added assertion `links[0].cellNumber === EXPORT_COLUMNS.indexOf('Link') + 1` keeps the two tied. Type gate: assign `rejections: [[1, 2, 'x']]` (number as code) in a typed fixture → `tsc` red, Jest green.
  - **Red run:** after PER-T-2, the current `cellNumber: 13` against the updated spec (15) is observed red; quote it.
  - **Disqualifier:** Jest can't open the `.xlsx`. A green here proves the argument passed to `exportExcel`, not the rendered hyperlink. The rendered file is PER-T-4.
  - **Consumers:** `results-detail.component.spec.ts`; `ExportTablesService.exportExcel` signature unchanged (`export-tables.service.ts:28-38`)
- **Definition of done:**
  - [ ] Red quoted, scoped Jest green, `tsc` green, eslint clean
  - [ ] `npx jest --findRelatedTests <all changed client files> --maxWorkers=2 --no-coverage` green before push

### PER-T-4 — Human check: real data and the real file (HITL)

- **Type:** rollout
- **Description:** Two checks at the HITL pause, run by the user.
  1. **PROD, read-only:** the count of the new query per version equals the Rejected count (expected v6 = 165, v8 = 5, settles Premise P-5). The agent pastes the SQL inline (PROD · read), the user runs it in DBeaver.
  2. **The file:** with the server+client running (local against shared prdb: export is read-only, no write buttons clicked; or PRTest once deployed), the user exports the Portfolio Overview for the 2026 phase as Admin and opens the `.xlsx`: 15 columns in order; a Rejected row shows the same reason as the result's review history in PRMS; a non-Rejected row shows `—`; `Link` is the hyperlink and `Projects` keeps its text.
- **Implements:** PER-R-1 semantics (S-1.1..1.3 against real data), PER-R-3/PER-R-4 on the rendered file
- **Depends on:** PER-T-1, PER-T-3
- **Estimate:** S
- **Review:** skip-eligible. Claim to prove: no code changes; the evidence is the user's observed counts and file, quoted in `execution.md`
- **Skills:** none
- **Verification:**
  - **Falsifier:** count of query rows ≠ Rejected count of the version, or one Rejected result in the file with a reason different from its latest history entry → FAIL.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** if the file was exported before the map finished loading (`Unavailable` cells), it proves nothing; export again.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] PROD counts quoted (per version)
  - [ ] File check result quoted (one Rejected code + its reason, one non-Rejected row, Link cell)

## 4. Dependency graph

```
PER-T-1 (server) ─────────────┐
PER-T-2 (client rows) ─ PER-T-3 (component) ─┴─ PER-T-4 (HITL)
```

T-1 and T-2 are parallel-safe (different packages; client field optional). Only one Jest run at a time on the machine.

## 5. Test plan / coverage map

| Clause | Owner | Test |
|---|---|---|
| S-1.1 latest only, once | T-1 | repo SQL predicate (NOT EXISTS) + PER-T-4 count |
| S-1.2 resubmitted excluded | T-1 | repo SQL has `status_id = 7` + PER-T-4 |
| S-1.3 tie by id | T-1 | repo SQL tie-break on `id` |
| S-1.4 null P/A | T-1 | service mapping test |
| S-1.5 other versions | T-1 | repo bound params `[versionId]` |
| S-2.1 existing fields | T-1 | service test, existing fields equal |
| S-2.2 no SQL/comment in errors | T-1 | service error test (falsifier d) |
| S-3.1 reason as-is (AND IT MUST: newline kept) | T-2 | rows test row A |
| S-3.2 not Rejected → `—` (even with entry) | T-2 | rows test row B |
| S-3.3 no entry → `Not recorded` | T-2 | rows test row C |
| S-3.4 null code | T-2 | rows test |
| S-3.5 not ready / absent → `Unavailable`; non-Rejected `—` | T-2 | rows test |
| S-4.1 Link hyperlink, BUT not over another column | T-3 | component spec + PER-T-4 file |
| S-5.1 table / search unchanged | T-2 (search), T-3 (header) | rows + component spec |

## 6. Rollout

- [ ] One PR to `staging`. The description states: `/api/bilateral/*` payload unchanged (AGENTS.md §6)
- [ ] Commit subjects: `✨ feat(portfolio-overview): …` with no apostrophes (Jenkins)
- [ ] Reply to Nicoleta after PER-T-4

## 7. Roll-back

Revert the PR. The field is additive and the client reads its absence as `Unavailable`, so server and client can be reverted independently.
