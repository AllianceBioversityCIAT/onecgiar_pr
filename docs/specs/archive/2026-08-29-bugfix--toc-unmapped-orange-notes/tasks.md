# Tasks — Stop ToC-reference "not found" notes when unmapped

## 1. Scope of this task list

- **Module / feature:** `results` / `rd-contributors-and-partners` (bugfix), shared with `ipsr`
- **Linked spec:** `docs/specs/bugfix/toc-unmapped-orange-notes/requirements.md` + `design.md`
- **Status:** not-started

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] Open questions resolved (none — confirmed with user 2026-08-28)
- [x] No conflicting in-flight spec on the same files (checked `docs/specs/` — no other active spec touches these two files)

## 3. Task list

### `TOC-T-1` — Suppress Centers/Science Program notes on unmapped (No) results `[x]` PASS (attempt 3) — see execution.md

- **Type:** `client | tests`
- **Description:** In `rd-contributors-and-partners.component.html`, extend the `@if (isCP2026())` gate on the Contributing CGIAR Centers block (~L100) and the Contributing Science Program/Accelerator block (~L302) with `&& this.rdPartnersSE.partnersBody.result_toc_result.planned_result !== false`, so both fall through to the existing flat full-catalog `@else` branch when the result is answered No. Add the regression test (red before, green after).
- **Implements:** `TOC-R-1`, `TOC-R-2`, `TOC-AC-1`, `TOC-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S`
- **Regression test (Bug Mode, mandatory):**
  - New spec case: render with `isCP2026()` true and `partnersBody.result_toc_result.planned_result = false` → assert **zero** `.pr-message` elements render inside the Centers and Science Program blocks, and the Centers/Science multi-selects receive the full catalog (`centersSE.centers()` / `allScienceProgramsList()`), not the empty reference-filtered list.
  - This test MUST fail against current `main`/branch code (proves the bug) and pass once the condition is added.
- **AC4 regression guard (same task, second case):**
  - Render with `planned_result = true` and `tocReferenceCenterInstitutionIds()` / `tocReferenceSynergyInitiativeIds()` empty → assert the "not found" `.pr-message` note is still present for both Centers and Science Program (proves TOC-R-2 / AC4 is untouched).
- **What disqualifies the evidence:** if the new test passes on current (unfixed) code without any change, the test isn't actually exercising the buggy branch — verify red-before-fix by running the test against the file before applying the condition edit (`git stash` the `.html` change, run, confirm failure, `git stash pop`).
- **Definition of done:**
  - [ ] Both `@if` conditions updated exactly as specified — no unrelated markup touched.
  - [ ] New test cases added and passing; confirmed red-before-fix per the disqualifier above.
  - [ ] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners.component.spec"` green.
  - [ ] `npx ng lint --quiet` clean on touched files.
  - [ ] No secret/token in code or test fixtures.
  - [ ] Commit follows `<emoji> <type>(<scope>) [ticket]: <description>` (`🔧 fix(rd-contributors-and-partners): ...`).

### `TOC-T-2` — Suppress External Partners note on unmapped (No) results (shared component, covers IPSR) `[x]` PASS — see execution.md

- **Type:** `client | tests`
- **Description:** In `normal-selector.component.html`, extend the `@if (isCP2026() && !dataControlSE.isKnowledgeProduct)` gate on the External Partners block (~L33) with `&& this.rdPartnersSE.partnersBody.result_toc_result.planned_result !== false`. Because this component is shared by both the classic Result Detail flow and IPSR (`ipsr-contributors.component.html:209`), no IPSR-specific file changes are needed — add the test at this component's own spec.
- **Implements:** `TOC-R-1`, `TOC-R-2`, `TOC-R-3`, `TOC-AC-1`, `TOC-AC-2`, `TOC-AC-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.spec.ts` (create if it does not exist yet)
- **Depends on:** `—` (independent file from `TOC-T-1`; parallel-safe)
- **Blocks:** `—`
- **Estimate:** `S`
- **Regression test (Bug Mode, mandatory):**
  - New spec case: render with `isCP2026()` true and `partnersBody.result_toc_result.planned_result = false` → assert **zero** `.pr-message` elements render, and the External Partners multi-select receives the full `institutionsWithoutCentersPartners()` catalog, not the empty reference-filtered list.
  - Must fail against current code (red-before-fix, same verification method as TOC-T-1) and pass once the condition is added.
- **AC4 regression guard (same task, second case):**
  - Render with `planned_result = true` and `tocReferencePartnerInstitutionIds()` empty → assert the "No External Partners related..." note still renders.
- **What disqualifies the evidence:** same as TOC-T-1 — a passing test against unfixed code means the test isn't reaching the buggy branch; confirm red-before-fix explicitly.
- **Definition of done:**
  - [ ] Condition updated exactly as specified.
  - [ ] New test cases added and passing; confirmed red-before-fix.
  - [ ] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="normal-selector.component.spec"` green.
  - [ ] `npx ng lint --quiet` clean on touched files.
  - [ ] No secret/token in code or test fixtures.
  - [ ] Commit follows `<emoji> <type>(<scope>) [ticket]: <description>` (`🔧 fix(normal-selector): ...`).

## 4. Dependency graph

```
TOC-T-1 (Centers + Science Program, rd-contributors-and-partners.component.html)
TOC-T-2 (External Partners, normal-selector.component.html)
```

No shared files between the two tasks — both are **parallel-safe**.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| TOC-TEST-1 | unit (client, Jest/TestBed) | TOC-R-1, TOC-AC-1 | `rd-contributors-and-partners.component.spec.ts` — No → no note, full catalog |
| TOC-TEST-2 | unit (client, Jest/TestBed) | TOC-R-2, TOC-AC-2 | `rd-contributors-and-partners.component.spec.ts` — Yes + empty refs → note still shows |
| TOC-TEST-3 | unit (client, Jest/TestBed) | TOC-R-1, TOC-R-3, TOC-AC-1, TOC-AC-3 | `normal-selector.component.spec.ts` — No → no note, full catalog |
| TOC-TEST-4 | unit (client, Jest/TestBed) | TOC-R-2, TOC-AC-2 | `normal-selector.component.spec.ts` — Yes + empty refs → note still shows |

`rd-contributors-and-partners/` is excluded from `collectCoverageFrom` (per `onecgiar-pr-client/CLAUDE.md` §3) — tests still run and gate the PR, they just don't count toward the coverage percentage. `normal-selector` is under the same excluded path.

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on test env: open a 2026-phase result, answer No, confirm no orange notes on Centers/Science/Partners; answer Yes with an unmapped-to-anything node (if reproducible) and confirm the note still appears.
- [ ] IPSR spot-check: an IPSR P25 result on a 2026-phase, answered No, confirm External Partners shows no note.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged.
- [ ] No new cross-cutting decision to promote (fix stays local to these two templates).

## 8. Roll-back plan

1. Revert the PR (both condition edits + tests are in one PR; single revert is safe since tasks are independent files).
2. No migration, no flag — reverting the diff fully restores prior (buggy) behavior with no further steps.

## Required cross-references

- `docs/specs/bugfix/toc-unmapped-orange-notes/requirements.md`, `design.md` (same folder)
- `docs/specs/bugfix/toc-unmapped-orange-notes/proposal.md`
- `onecgiar-pr-client/CLAUDE.md`
