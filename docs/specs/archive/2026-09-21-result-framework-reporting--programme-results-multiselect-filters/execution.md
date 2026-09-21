# Programme Results — Phase / Status / Created by multiselect — `execution.md`

## Summary

Shipped multiselect for Phase, Status, and Created by on the Results tab and My Work board, with comma-separated URL params, OR-within / AND-across filter semantics, and phase sticky-default behaviour.

## Tasks

| Task | Status | Evidence |
|------|--------|----------|
| PRM-T-1 | PASS | `programme-results-filter.service.ts` — `selectedPhases[]`, `selectedStatuses[]`, `selectedCreatedBy[]`; `matchesProgrammeResultPhase`; chip/clear/toggle helpers |
| PRM-T-2 | PASS | `programme-results.component.{html,ts}` — three `app-pr-filter-multiselect`; URL hydrate/mirror via `parseListParam`/`joinListParam`; status pills toggle array membership |
| PRM-T-3 | PASS | `my-work-board.component.{html,ts}` — Phase + Created by multiselect; URL bridge; `my-work-board.service.ts` multi-phase `phaseRows` |

## Verification (2026-09-15)

```bash
cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="programme-results-filter.service.spec|programme-results.component.spec|my-work-board.component.spec|my-work-board.service.spec"
```

**Result:** 4 suites, 284 tests passed.

## Reviewer

PASS — scope matches PRM-R-1..R-9 and design PRM-DD-1..4; legacy single-value deep links preserved; phase default unchanged.

## HITL — live browser, 2026-09-21

Orca embedded browser against this worktree's `ng serve` (API `localhost:3400`), SP01 Results tab.
Counts read from the table's own "N results" line; every OR claim is proven by arithmetic, not by eyeballing rows.

| # | Step | Evidence | Verdict |
|---|------|----------|---------|
| SP01 | Filters popover shape | 7 × `app-pr-filter-multiselect`, **0 × `app-pr-filter-select`** in the open popover | PASS (PRM-R-1/2/3/9) |
| SP01 | 2 phases + 2 statuses | 4 chips, one per value; `?phase=Reporting 2026 - P25,Reporting 2024 - P25&status=Editing,Submitted` | PASS (PRM-R-5, PRM-R-7) |
| SP01 | Phase OR semantics | 2026 → 284 · 2024 → 5 · both → **289 = 284+5** | PASS (PRM-R-1) |
| SP01 | Status OR semantics | Editing → 231 · Submitted → 13 · both → **244 = 231+13**; Quality Assessed (2) excluded; no-status baseline 289 | PASS (PRM-R-2) |
| SP01 | AND across dimensions | 2 phases + `status=Editing` + `createdBy=Admin PRMS` → 2 results, 4 chips | PASS (PRM-R-4) |
| 2 | URL reload restores selections | every deep link above was a cold `goto`; all hydrated, including single-value legacy `?status=Submitted` | PASS (PRM-R-5) |
| 3 | Status pills with multiselect | real clicks on "226 Editing" then "13 Submitted" → both `aria-pressed=true`, additive not exclusive, `?status=Editing,Submitted`, 239 = 226+13; pill counts unchanged → `{ ignoreStatus: true }` intact | PASS (PRM-R-2) |
| 4 | Clear filters | statuses + pills cleared, phase chip retained, 284 = phase-only baseline, "Clear filters" button hides | PASS (PRM-R-6) |
| 5 | Keyboard (Tab / Escape) | 3 real `Tab` presses reach `a.field`; panel opens on focus (option height 0 → 30px); real `Escape` collapses it (30 → 0) | PASS |
| — | My Work parity | URL shared from Results hydrates 2 phase chips, trigger reads "2 phases", 0 × `app-pr-filter-select` | PASS (PRM-R-8) |

**Method note:** filter-popover option selection used programmatic `.click()` on the `.option` rows (the native
checkboxes are 0×0 and unclickable by pointer); status pills, `Clear filters`, `Tab` and `Escape` used **real**
mouse and key input, which is what the keyboard step requires.

### Observations (not failures, no PRM regression)

- **Escape has no owner.** `pr-filter-multiselect.component.ts` holds only `removeFocus()`; the panel is opened by
  CSS `:focus`/`:focus-within` on `a.field`, so Escape closes it only as a side effect of the browser blurring the
  element. Focus then lands on `<body>`, not back on the trigger. Correct today, unowned by any code.
- Tab order inside a multiselect traverses every hidden 0×0 `input.pr-native-check` (90 on this page). Pre-existing
  in the shared component since MWB-T-13; not introduced here.
- My Work exposes Phase/Category/Funding/Center; **Created by** is rendered only under *All program results* (by
  design, per the template comment) and **Status** is not a My Work dimension because the board columns are the
  statuses. PRM-T-3's DoD wording ("phase/status/createdBy") was looser than the design it implements.
- My Work chip strip renders a `+0 more` overflow chip when nothing is hidden. Cosmetic, outside PRM scope.

## Undeclared scope shipped in this commit

`f075a1adc` also delivered an **optional `phase` table column** — `phaseAcronym` and `phaseSort` on
`ProgrammeResultRow`, `formatProgrammeResultPhaseShort()` (`2026 · P25`), `{ key: 'phase', sortField: 'phaseSort',
optional: true }` at `programme-results.component.ts:126`, rendered at `programme-results.component.html:513`.

No `PRM-R-*` requires it, no `PRM-T-*` implements it, no DoD gates it, and no other spec under `docs/specs/`
mentions it (`grep` → 0 hits). It is live, off by default, and was **accepted as delivered scope** at archive
(user decision, 2026-09-21) rather than reverted or re-specified. Documenting it in the module guide is queued as
a `guide-sync` pending item in the Kaizen entry.
