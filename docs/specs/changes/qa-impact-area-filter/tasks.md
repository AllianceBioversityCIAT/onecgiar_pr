# Tasks: `changes/qa-impact-area-filter`

- **Status:** `done` — `IAF-T-1` PASS 2026-11-26
- **Budget:** 1 task · ~200 LOC · 1 review round

### `IAF-T-1`: Read each impact-area component field from its own area

- **Type:** `server`
- **Implements:** `IAF-R-1`..`IAF-R-5`
- **Design:** `IAF-DD-1`..`IAF-DD-3`
- **Files:**
  - `onecgiar-pr-server/src/api/qa-catalog/definitions/closed-control-lists.ts`
  - `onecgiar-pr-server/src/api/qa-catalog/definitions/sections/general-information.ts`
  - `onecgiar-pr-server/src/api/qa-catalog/values/label-sources.ts` (comment only)
  - `onecgiar-pr-server/src/api/qa-catalog/definitions/versions.ts` + `__snapshots__/qa-catalog.snapshot.json` + the three version pins
  - `onecgiar-pr-server/src/api/qa-catalog/qa-results.impact-area-filter.spec.ts` (new)
  - `onecgiar-pr-server/docs/qa-catalog.en.md`
- **Skills:** `nestjs-expert`, `tdd`
- **Review:** `full` (contract change)
- **Verification:**
  - **Falsifier:** the new spec runs the real catalog and resolvers through `QaResultsService.details` over an in-memory database. Two mutations, each red:
    - (a) remove the five closed lists → 5 of 6 cases red;
    - (b) remove `is_active` from the binding → the deselected-row case red.
  - **Run:** `cd onecgiar-pr-server && npx jest --silent --forceExit src/api/qa-catalog`. Never the unscoped suite.
- **Definition of done:**
  - [x] `IAF-AC-1`..`IAF-AC-3` each have a named passing case; `IAF-AC-4` in the doc
  - [x] Both mutations observed red
  - [x] Scoped jest green · eslint `--quiet` · no tsc errors in `qa-catalog`
- **Status:** [x] — PASS attempt 1, 2026-11-26 (`execution.md` → `IAF-T-1`)
