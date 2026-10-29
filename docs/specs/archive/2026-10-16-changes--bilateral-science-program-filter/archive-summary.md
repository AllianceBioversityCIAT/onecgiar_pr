# Archive Summary — Bilateral Results: Science Program filter

**Outcome:** delivered and in production. The Bilateral Results tab's Filters popover has a Science Program multiselect fed by the CLARISA initiatives catalog (AVISA filtered out), with chip, Clear all and `?program=` URL round-trip, mirroring the Project filter. Committed `8764605b0` + `c9a340e16` (folder doc re-stamp); both are on `master`.

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/bilateral-science-program-filter/` |
| Archive Date | 2026-10-16 |
| Final Status | Complete — 2 / 2 tasks `[x]` |
| Owner | Santiago Sanchez |
| Archived on branch | `qa-development-2026-ss` (spec branch for shared-file writes) |

## 2. Requirements Delivered

| Requirement | Task | Evidence |
|---|---|---|
| BSF-R-1 control shown | T-1, T-2 | Popover field-order test |
| BSF-R-2 selection narrows rows | T-1, T-2 | `filteredResults()` test |
| BSF-R-3 removable chip, code-first label | T-1 (attempt 2), T-2 | Chip test, `SP01 - <name>` |
| BSF-R-4 Clear all clears program | T-1, T-2 | `clearAllFilters()` test |
| BSF-R-5 URL read + write | T-2 (attempt 2) | Hydration test + write-path test via real chip click |
| BSF-R-10 options from catalog, not rows | T-1 | Catalog success / failure tests |

## 3. Files Changed

| File | Change |
|---|---|
| `bilateral-results-list.component.ts` | Catalog load + cache, computeds, handlers, `'program'` chip dimension |
| `bilateral-results-list.component.html` | Science Program field after Project |
| `bilateral-results-list.component.spec.ts` | 8 new tests + field-order fix |
| `bilateral-results-list/CLAUDE.md` | Re-stamped (`c9a340e16`) |

## 4. Test Evidence

- `npx jest --testPathPattern="bilateral-results-list.component"` → 71 / 71.
- `npx ng lint --quiet` clean; `npx ng build --configuration development` clean (attempt 3).
- Manual browser check by the user: options, filtering, chip, Clear all and URL round-trip work.

## 5. Validation

No `test-report.md` / `validation-report.md`. The spec ran Leader → Implementer → Reviewer per task plus the user's live browser check, and has been in production since the `master` release. Absence accepted by the user at archive (2026-10-16).

## 6. Accepted Warnings / Follow-ups

- [x] Folder `CLAUDE.md` re-stamp — done in `c9a340e16`.
- [ ] Advisory only: an empty-string `short_name` now yields the bare code instead of falling through to `name`. Still satisfies BSF-R-3; no action planned.

## 7. Historical Notes

- 3 rework attempts: label without code (T-1 #1), TS2339 compile error caught only by `ng serve` (T-1 #3), missing URL write-path test (T-2 #1).
- DD-2 claimed `clearAllFilters()` lacked `programFilter.set([])`; it was already there.
- `execution.md` §3 still says "commit pending"; superseded by this summary.
