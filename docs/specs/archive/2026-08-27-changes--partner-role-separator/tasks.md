# Tasks — Partner typology / role visual separation (Lite)

- **Linked spec:** requirements.md + design.md (this folder) · Budget: 2 tasks · ~90 LOC · 1 review round
- **Status:** done (2026-08-27)
- **Execution rule (user):** Jest always scoped by path; never the full suite locally.

### [x] `PRS-T-1` — Restructure both partner rows: role group + label + divider + a11y
- **Type:** client
- **Implements:** PRS-R-1, PRS-R-2, PRS-R-3 (both scenarios incl. BUT/AND IT MUST clauses)
- **Files:** `.../multiple-wps/components/normal-selector/normal-selector.component.{html,scss}`
- **Depends on:** — · **Estimate:** S · **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Scope:** per design §2, applied to the ToC block AND the Other(s) block; no TS changes; handlers/tooltips/read-only markup attributes byte-identical (moved, not edited).
- **Verification:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners` green. **Fails if:** any existing test in the suite breaks (behavior regression), or either block lacks the label/divider (T-2's tests). **Evidence worthless if:** run with `--passWithNoTests` or the suite matched 0 files. **Presence caveat:** divider *visibility/contrast* is not jsdom-provable → HITL screenshot check (accepted gap, requirements §defect classes).
- **Done:** suite green · scoped `ESLINT_USE_FLAT_CONFIG=false npx eslint "<component folder>/**/*.ts" --quiet` clean · commit `🎨 style(normal-selector) : Separate partner typology from role selector`.

### [x] `PRS-T-2` — DOM tests for both blocks (edit + read-only)
- **Type:** tests
- **Implements:** gates for PRS-R-1..3; scenario clauses: "BUT not alter emitted payload" (spy on `onSelectDeliveryPartners` args unchanged), "AND IT MUST render identically in the ToC block" (iterate both containers), read-only no-orphan-divider.
- **Files:** `.../normal-selector/cpnormal-selector.component.spec.ts`
- **Depends on:** PRS-T-1 · **Estimate:** S · **Skills:** `angular-developer`, `tdd`
- **Verification:** same scoped Jest command; new tests fail when reverting T-1's template (checked once via `git stash`-free revert of the HTML in the working tree — name the failing test in the report). **Fails if:** the new tests pass against the pre-change template (they'd prove nothing). **Evidence worthless if:** assertions query only the first block.
- **Done:** suite green with N+≥5 tests · lint clean.

## Dependency graph
`PRS-T-1 → PRS-T-2` (sequential; same files).

## Rollback
Revert the single commit; no data/API surface.
