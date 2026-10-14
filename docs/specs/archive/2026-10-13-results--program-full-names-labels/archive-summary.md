# Archive Summary — Program full names next to codes (Part 1)

**Outcome:** delivered and pushed. Every client-side place that showed a Science Program or Accelerator as a bare code (`SP10`) now shows `CODE - Name`, through one shared rule. The code alone is shown when no name is available. Filter values and API payloads are unchanged. It took 3 tasks; T-2 and T-3 each needed one rework.

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/results/program-full-names-labels/` |
| Archive Path | `docs/specs/archive/2026-10-13-results--program-full-names-labels/` |
| Archive Date | 2026-10-13 |
| Final Status | **Done** · HITL passed (Results Center Program column checked by the user) |
| Branch | `qa-development-2026-ss` |
| Commit | `44a7528a1` (pushed to `origin/qa-development-2026-ss`) |
| Requested by | Nicoleta Trifa |
| Part | 1 of 2. Part 2 (backend-dependent sites) still needs its own `/akili-propose` |

## 2. Requirements Delivered

| ID | Result |
|---|---|
| `PFN-R-1` Show `CODE - Name` at S1–S8 | ✅ T-2 (S1–S4), T-3 (S5–S8) |
| `PFN-R-2` Fallback to code; no `undefined`/`null`/trailing `" - "`; `—` kept | ✅ T-1 (rule), T-2, T-3 |
| `PFN-R-3` One shared rule, `" - "` separator | ✅ T-1 |

## 3. Files Changed

All paths are under `onecgiar-pr-client/src/app/`.

| Area | Files |
|---|---|
| Shared rule (new) | `shared/utils/science-program-label.util.ts`, `shared/pipes/sp-label.pipe.ts` (+ specs) |
| Moved helper | `aow-hlo-create-modal.component.ts` (re-exports `withScienceProgramLabel`) |
| S1–S4 | `current-result.interface.ts`, `results-list.component.{ts,html,scss}`, `results-list-filters.component.ts`, `results-to-update-modal.component.{ts,html}`, `global-search-palette.{service,component}.ts` + `.component.html` |
| S5–S8 | `lab-report-form.component.{ts,html}`, `outcome-indicator.component.ts`, `outcome-indicator.service.ts` (deviation: the S6 modal reads the service signal), `indicator-results-modal.component.html`, `user-management.component.{ts,html}`, `notification-item.{component.html,module.ts}`, `pop-up-notification-item.component.{ts,html}` |
| Folder guides | `lab-report-form/`, `notification-item/` and `global-search-palette/` `CLAUDE.md` re-stamped |

Totals: about 170 production lines and 290 test lines across 44 files. No server, DB or API change.

## 4. Test Evidence

| Task | Scoped Jest | Lint |
|---|---|---|
| T-1 | 3 suites · 73 ✅ | ✅ (see the lint note in §7) |
| T-2 | 9 suites · 358 ✅ | `ESLINT_USE_FLAT_CONFIG=false npx eslint` exit 0 |
| T-3 | 14 suites · 787 ✅ | same, exit 0 |

No `test-report.md`; accepted, since the spec is Lite and each task carried its own falsifier assertions.

## 5. Validation

No `validation-report.md`; accepted. The HITL check substituted: the user's screenshot (2026-10-13) shows the Results Center Program column at the default 200 px reading `SP13 - Genebank`, `SP01 - Breeding for Tomorr…`, on one line with ellipsis and the dot colour unchanged. A first, narrower screenshot was traced to a column width the user had saved in localStorage (`pr.resultsCenter.columnWidths.v1`). Double-clicking the column border resets it. This is not a defect.

## 6. Accepted Warnings Or Follow-Ups

- **Part 2:** IPSR tables, completeness status, history of changes, the outcome-indicator details table, bilateral review history and AI job cards. These need backend work, through a new `/akili-propose`.
- **Advisories, recorded and not actioned:**
  - lab-report-form ToC-branch select still uses `full_name`, so one form shows two formats;
  - acronym search was lost in lab-report-form;
  - the palette mapper has no `initiative_*` fallback;
  - the old-format comment in `ipsr-list-filter.service.ts:6-7`;
  - `sp_label` now travels in the create body (harmless).
- **S1 cell DOM test gap:** the results-list spec stubs `app-pr-table`, so the Program cell is covered by `programLabel` unit tests and the HITL check.
- **Users with a saved Program width** keep it. A one-time reset of saved widths is a product decision, not taken.

## 7. Historical Notes

- T-2 attempt 1 FAIL: `programLabel` skipped `initiative_*` name fallbacks for W3/Bilateral rows.
- T-3 attempt 1 FAIL: the User-management Entity chip rendered `[object Object]`. This bug predated the spec; the new test had set numeric ids that the real control never emits.
- **Lint note:** T-1's recorded `ng lint --lint-file-patterns` pass could not have run, because this CLI rejects the flag. The T-1 files were re-linted by the Leader with `ESLINT_USE_FLAT_CONFIG=false npx eslint` (exit 0).
- Another session worked in the same checkout (SR-164368, program-overview / bilateral-overview). Its files were kept out of this commit by staging explicit paths.
