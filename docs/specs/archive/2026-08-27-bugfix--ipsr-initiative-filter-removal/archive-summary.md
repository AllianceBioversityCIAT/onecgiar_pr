# Archive Summary — Innovation Packages filter shows Initiatives instead of Science Programs only

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/ipsr-initiative-filter-removal/` |
| Archive Date | 2026-08-27 |
| Final Status | **Shipped — PASS (both tasks), committed in one commit `2389051c3`** |
| Owner | Current user (santiago.sanchez@cgiar.org) |

## 2. Original Spec Path

`docs/specs/bugfix/ipsr-initiative-filter-removal/`

## 3. Archive Date

2026-08-27

## 4. Final Status

- `IPF-T-1`: PASS on **attempt 3** of a 3-attempt ceiling (attempt 1 FAIL — unguarded `undefined` spread; attempt 2 PASS on the guard, then REOPENED before commit when the user found blank/inert filter chips in a real browser check; attempt 3 PASS — added the missing enrichment loop).
- `IPF-T-2`: code PASS on attempt 1; held on `[~]` for the mandatory `IPF-OQ-1` manual browser verification. **User completed and confirmed the manual verification 2026-08-27** — Science-Program-only chips, deselect-all works, Results module list unchanged. Marked `[x]`.
- Both tasks committed together in a single commit (`2389051c3`) per the Reviewer's explicit ship-order constraint (`IPF-T-1` must not ship standalone — `deselectInits()`/`everyDeselected`/`ngOnDestroy()` would otherwise mutate the wrong list).

## 5. Requirements Delivered

| ID | Delivered |
|---|---|
| `IPF-R-1` | ✅ IPSR filter repointed to `myInitiativesListIPSRByPortfolio` |
| `IPF-R-2` | ✅ Success and error branches both corrected |
| `IPF-R-3` | ✅ All four dependent references (`deselectInits`, `everyDeselected`, `ngOnDestroy`, `initsSelectedJoinText`) repointed |
| `IPF-R-10` | ✅ Results module filter confirmed byte-for-byte unchanged |
| `IPF-AC-1..4` | ✅ All verified — AC-1/AC-4 include the manual-verification half, now completed |

## 6. Files Changed Summary

From `execution.md` (final, attempt 3 + `IPF-T-2` attempt 1), committed in `2389051c3`:

- `onecgiar-pr-client/src/app/shared/services/api/api.service.ts` — repointed both `updateMyInitiatives` call sites (success + error) to `myInitiativesListIPSRByPortfolio`; added `?? []` guard on the `ipsr`/`reporting` split assignment; added a second enrichment loop (`.role`/`.name`/`.official_code_short_name`) over `myInitiativesListIPSRByPortfolio`, mirroring the existing `myInitiativesList` loop — this closed a real UI defect (blank/inert chips) the first two Reviewer passes missed.
- `onecgiar-pr-client/src/app/shared/services/api/api.service.spec.ts` — regression tests for the data-source swap (both branches), the `undefined`-guard case, and the enrichment fix.
- `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/innovation-package-list.component.ts` — repointed all four dependent references to the scoped list.
- `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/innovation-package-list.component.spec.ts` — new scoped-list regression suite + 4 pre-existing tests updated to seed the scoped list.
- `ipsr-list-filter.service.ts` and `results-list-filter.service.ts` — confirmed untouched (in scope of the fix's design, not part of the diff).

## 7. Test Evidence Summary

- `npx jest --silent --reporters=summary --no-coverage --testPathPattern="api.service|innovation-package-list"` → **485/485 passed** (re-run in this archive session, post-commit).
- `npx ng lint --quiet` → clean (per execution.md, each attempt).
- RED→GREEN confirmed at every attempt (1, 2, 3 for `IPF-T-1`; 1 for `IPF-T-2`).
- `results-list-filter.service.spec.ts` run unmodified — confirms `IPF-R-10`/`IPF-AC-4` regression guard holds.

## 8. Validation Summary

No separate `validation-report.md` — this Lite Bug Mode spec's validation evidence is the Implementer/Reviewer PASS cycle (3 attempts on `IPF-T-1`, 1 on `IPF-T-2`) plus the mandatory manual browser verification (`IPF-OQ-1`), now completed and recorded in `tasks.md`/`execution.md`. No unresolved FAIL findings remain — the one FAIL (attempt 1, undefined-guard gap) was closed in attempt 2, and the REOPENED defect (blank chips) was closed in attempt 3.

## 9. Accepted Warnings Or Follow-Ups

- **RELIABILITY (non-blocking):** two enrichment loops in `api.service.ts` are now duplicated 5-line bodies over two arrays — a small `enrichInitiatives(list, roles)` helper would prevent a future data-source repoint from reproducing this exact defect class. Not required, recorded as a follow-up.
- **RELIABILITY (non-blocking):** `api.service.ts:88`'s `myInitiativesList` assignment has the same unguarded-`undefined` defect class as the one fixed for `myInitiativesListIPSRByPortfolio`/`myInitiativesListReportingByPortfolio` — out of this task's scope (feeds the Results path, which must not be touched). Suggested follow-up `?? []` there.
- **RELIABILITY (non-blocking):** `?.sort()` still throws if the server returns a non-array truthy `ipsr` — not addressed; the manual verification confirmed real payload shape is fine today, but this remains a latent gap if the server contract ever changes.
- **TEST (non-blocking):** dead getters `initsSelectedJoinText`/`everyDeselected` have no consumer anywhere in `src/` (grep-confirmed) — maintained/tested but unused; deletion candidate, not this spec's scope.
- **Documentation follow-up (not blocking):** promote the "Science Program" portfolio concept into `docs/prd.md`/`docs/trd/trd.md` — both baseline docs still describe only the legacy Initiatives taxonomy.

## 10. Historical Notes

- This spec's execution log is a strong worked example of why the mandatory manual-verification gate exists: two clean, source-verified Reviewer PASSes (attempts 1 and 2 of `IPF-T-1`) both missed a real, user-visible defect (blank/inert filter chips) because neither the regression tests nor the source audit rendered the template or traced the `.name`→`.attr` filter-matching chain. The user's own browser check caught it before any commit landed, one task earlier than the process's own designated checkpoint (`IPF-T-2`'s `IPF-OQ-1`).
- Spec file-path citations (`requirements.md`/`design.md`/`tasks.md`) originally named `auth.service.ts` for `updateUserData()`; corrected in place during `IPF-T-1` attempt 1 to `api.service.ts` — not a Pivot, a citation fix.
- Ship-order constraint (`IPF-T-1` cannot ship standalone) was identified by the Reviewer in attempt 3 and honored by committing both tasks together.
