# Archive Summary — filtered-detail-export (family #9)

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/portfolio-overview-revamp/filtered-detail-export/` |
| Archive Date | 2026-10-16 |
| Final Status | **Done.** 4/4 tasks `[x]`, all Reviewer PASS, HITL accepted by the user |
| Branch / commits | `qa-development-2026-ss` · `d3a37c35a` (export flag), `824d3bd6f` (feature), `58104126f` (spec docs) — pushed |
| Parent | `changes/portfolio-overview-revamp/family.md` row #9 → `done` |

## Outcome

Portfolio Overview gets a last section, **Results detail**: the results behind the global filters, searchable, sortable, 25 per page, with links to each result and an **Excel export** of the whole listed set (exact file name, `_partial` when the load was partial).

## Requirements Delivered

| Requirement | Status |
|---|---|
| FDE-R-1 last section, figures gate | ✅ |
| FDE-R-2 count = KPI total (S-2.1, S-2.2, S-2.3) | ✅ live parity 1000/181/87 |
| FDE-R-3 columns, empty words, "Unavailable" | ✅ |
| FDE-R-4 sort (default code desc, `aria-sort`) | ✅ |
| FDE-R-5 search code/title, "M of N", no-hit + Clear | ✅ |
| FDE-R-6 link in new tab, `noopener` | ✅ |
| FDE-R-7 25 per page, range, prev/next | ✅ |
| FDE-R-8 export all rows, Link column, exact file name | ✅ (via FDE-DD-9) |
| FDE-R-9 pending skeleton / no-match hidden | ✅ |
| FDE-R-10 partial line + `_partial` | ✅ |
| NFR responsive / a11y / timing | ✅ (focus ring and Excel open checked by the user) |

## Files Changed

| Area | Files |
|---|---|
| Pure logic | `portfolio-overview/components/results-detail/results-detail.rows{,.spec}.ts` |
| Component | `…/results-detail/results-detail.component.{ts,html,spec.ts}` |
| Page | `portfolio-overview.component.{ts,html,spec.ts}`, `services/portfolio-overview.service.ts` (`RawResult.result_code`) |
| Shared | `shared/services/export-tables.service{,.spec}.ts` (`exactFileName` option) |
| Copy / docs | `internationalization/portfolio-overview.copy.ts` (`detail`), `portfolio-overview/CLAUDE.md` |

Production ≈ 566 LOC (design ≈ 230; overrun accepted by the user) · tests ≈ 556 LOC.

## Test Evidence

- Jest (scoped, `--maxWorkers=2`): `results-detail|portfolio-overview.component` → 15 suites, **326 passed**; `export-tables.service` green.
- Falsifiers proven per task (whole-set sort, export of all rows, `finally`, flag threading, filtered binding, tooltip).
- `ng build --configuration development` clean; lint clean on touched files.
- HITL (Claude in Chrome + user): see `execution.md` → FDE-T-4.

## Validation

No `test-report.md` / `validation-report.md`: the user accepted archiving on the FDE-T-4 HITL evidence (same practice as the family's earlier children).

## Accepted Warnings / Follow-Ups

- Busy spinner missing on Export (text + `aria-busy` only).
- `▲▼‹›` glyphs instead of `@ng-icons/lucide` icons.
- Title tooltip is hover-only (not keyboard-reachable); full title is in the file.
- Empty titles ("—") sort first ascending.
- `export-tables.service.spec.ts:57-69` pre-existing test not awaited.
- Export first run ≈ 470 ms (lazy `exceljs` import), then ≈ 170 ms.

## Historical Notes

- Pivot (T-2): FDE-P-5 missed that `saveAsExcelFile` appends `_<timestamp>.xlsx`; user chose the additive `exactFileName` flag (FDE-DD-9).
- T-4 tooltip "defect" was a Leader false positive (DOM attribute check cannot see Angular property-bound directives).
- One Reviewer round ran on `haiku` after the Opus Reviewer hit the session rate limit (author ≠ auditor kept).
- Design §3, §5.2, §5.3 synced to the as-built code at archive.
