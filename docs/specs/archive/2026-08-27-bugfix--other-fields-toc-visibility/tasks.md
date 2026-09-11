# Tasks — Other(s) Contributing Centers/Science Programs shown by default (P2-3499)

**Linked spec:** `docs/specs/bugfix/other-fields-toc-visibility/requirements.md` + `design.md` (post-Judgment Day, `judgment.md` — APPROVED).
**Module / feature:** `bugfix/other-fields-toc-visibility` (client-only)
**Status:** archived-partial (2026-08-27) — `OTV-T-1` ✅ · `OTV-T-2` ✅ shipped; `OTV-T-3` (`lab-report-form`), `OTV-T-4` (Cypress), `OTV-T-5` (CLAUDE.md re-stamp) **never started** — zero working-tree changes on their target files, confirmed at archive time. If this work is still wanted, open a new spec referencing this archived one rather than resuming here (see `execution.md` final disposition).
**Owner / driver:** Current user (santiago.sanchez@cgiar.org)

## 1. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved (Judgment Day round 2 — APPROVED).
- [x] Open questions resolved (`OTV-OQ-1` resolved by `OTV-DD-2`; requirements amended to match).
- [x] No CLARISA dependency — client-only, no catalog/endpoint change.
- [x] No conflicting in-flight spec touching the same files (verified: no other `docs/specs/` entry references `rd-contributors-and-partners`, `aow-hlo-create-modal`, or `lab-report-form`).
- [x] No migration involved (client-only).

## 2. Task list

### [x] `OTV-T-1` — `rd-contributors-and-partners`: conditional label + header de-dup + fix pre-existing broken test

- **Type:** `client | tests`
- **Description:** In `rd-contributors-and-partners.component.html`: remove the redundant `app-pr-field-header` from the Centers `@else` branch (~117-124) and the Science `@else` branch (~316-324); change the auto-activated Centers dropdown's `label="Other(s) Contributing CGIAR Centers"` (~165) to `[label]="hasReferenceCenters() ? 'Other(s) Contributing CGIAR Centers' : 'Contributing CGIAR Centers'"` plus `data-testid="toc-other-centers"`; same for the Science dropdown (~340) → `[label]="hasReferenceScience() ? 'Other(s) Science Program(s)' : 'Contributing Science Program/Accelerator'"` plus `data-testid="toc-other-science"`. No `.ts` logic change. **Regression test (Bug Mode, mandatory):** fix `rd-contributors-and-partners.zoneless.spec.ts:172-174`'s `otherCentersSelectEl()` helper to select `[data-testid="toc-other-centers"]` instead of `[label="Other(s) Contributing CGIAR Centers"]` (RB-S1 — the old selector cannot match once `label` is a property binding); confirm this test is RED against pre-fix code (selector never matches → helper returns null → dependent assertions fail) and GREEN after. Add a new assertion in the same describe block: opt-in case (non-empty ToC + sentinel selected) still resolves the label to `"Other(s) Contributing CGIAR Centers"` (`OTV-AC-7`).
- **Implements:** `OTV-R-1`, `OTV-R-2`, `OTV-R-10`, `OTV-AC-1`, `OTV-AC-2`, `OTV-AC-7` (rd half)
- **Design refs:** `design.md` §6.2 rows 1-4, §12 `OTV-DD-1`/`OTV-DD-2`, §10 (rd bullets)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`, `rd-contributors-and-partners.zoneless.spec.ts`
- **Depends on:** —
- **Blocks:** `OTV-T-4`, `OTV-T-5`
- **Estimate:** M
- **Skills:** `angular-developer` (client component/template work, Angular 21 standalone + signals — per root `CLAUDE.md` Skill Map); `tdd` (regression test is the primary deliverable of this task, not an afterthought).
- **Definition of done:**
  - [x] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` commit convention.
  - [x] Lint clean (`npx ng lint --quiet` from `onecgiar-pr-client/`). *(path-scoped `eslint` on `.ts` + `.html`; see `execution.md` DoD-deviation note)*
  - [x] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners"` green (this folder is excluded from `collectCoverageFrom` — coverage % is not the gate here, the test passing is). *(8 suites, 133 tests — up from 123)*
  - [x] The regression test fails on a pre-fix checkout (verify by stashing the template change and re-running) and passes post-fix — this is the evidence, not just a green run (per Bug Mode: an inconclusive/always-passing test is not acceptable evidence). *(attempt 2: genuine label-text mismatches, not null hooks; attempt 1 was FAILed for exactly this)*
  - [x] No secret/token leaked (`.cursorrules`) — n/a surface, confirm nothing new logs anything.
  - [x] `rd-contributors-and-partners/CLAUDE.md` **not** re-stamped in this task (deferred to `OTV-T-5` so the stamp reflects the folder's final state after both `T-1` and any Cypress additions in `T-4`). *(Reviewer-verified: still `2026-08-27 · b9b46642b`)*

### [x] `OTV-T-2` — `aow-hlo-create-modal`: conditional label (Centers) + conditional header (Science) + snapshot regen

- **Type:** `client | tests`
- **Description:** In `aow-hlo-create-modal.component.html`: remove the redundant `app-pr-field-header` from the Centers `@else` branch (~214); change the Centers auto-activated dropdown's `label` (~238) to the same conditional pattern as `OTV-T-1`, plus `data-testid="toc-other-centers"`. For Science (~264-342): wrap the existing `app-pr-field-header label="Other(s) Science Program(s)/Accelerator(s)"` (~313-317) in `@if (hasReferenceScience())`, adding `data-testid="toc-other-science-header"` on that header; leave the `app-pr-filter-multiselect` below it untouched (no `label` input exists on it). No `.ts` logic change (all four computeds/getters already exist in this component). **Regression test (Bug Mode, mandatory):** extend `aow-hlo-create-modal.component.spec.ts` with cases asserting, via the new `data-testid`s (never `[label="…"]`, per RB-S1): (a) empty-ToC state — Centers dropdown's resolved label text is `"Contributing CGIAR Centers"`, not `"Other(s)…"`, and no sibling header duplicates it; Science header is absent from the DOM entirely; (b) non-empty-ToC + sentinel-selected state — both still show/carry `"Other(s)…"` (`OTV-AC-7`). Confirm RED against pre-fix code, GREEN after.
- **Implements:** `OTV-R-3`, `OTV-R-4`, `OTV-R-10`, `OTV-AC-3`, `OTV-AC-4`, `OTV-AC-7` (aow half)
- **Design refs:** `design.md` §6.2 rows 5-7, §12 `OTV-DD-1`/`OTV-DD-2`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.html`, `aow-hlo-create-modal.component.spec.ts`, `__snapshots__/aow-hlo-create-modal.component.spec.ts.snap`
- **Depends on:** —
- **Blocks:** —
- **Estimate:** M
- **Skills:** `angular-developer`; `tdd`.
- **Definition of done:**
  - [x] Code merged via commit convention.
  - [x] Lint clean. *(path-scoped `npx eslint` — see `execution.md` DoD-deviation note; full `ng lint` at the post-wave gate)*
  - [x] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="aow-hlo-create-modal"` green. *(1 suite, 39 tests, 1 snapshot)*
  - [x] Snapshot regenerated (`-u` locally) and **hand-reviewed** — confirm the diff touches only the intended label/header text (no unrelated structural change slipped in). Do not accept a blind `-u`. *(word-level diff: exactly 3 intended regions)*
  - [x] Regression test confirmed RED pre-fix / GREEN post-fix (same evidence standard as `OTV-T-1`). *(RED method limitation accepted — mutation-sensitivity proven by Reviewer inspection; see `execution.md`)*
  - [x] No secret/token leaked.

### `OTV-T-3` — `lab-report-form`: add the missing empty-ToC branch (Centers + Science)

- **Type:** `client | tests`
- **Description:** In `lab-report-form.component.ts`: add `hasReferenceCenters = computed(() => this.tocCenters().length > 0)` and `hasReferenceScience = computed(() => this.tocSciencePrograms().length > 0)`. Reuse the four existing constants (`contributingCentersInfoNote`, `noCentersNote`, `contributingScienceInfoNote`, `noScienceProgramsNote` — do NOT re-declare, they already exist at `:239,241,242,244`). In `lab-report-form.component.html`: wrap the primary Centers dropdown (~208-217) in `@if (hasReferenceCenters()) { … } @else { <div class="pr-message">…{{ noCentersNote }}…</div> }`; change the second dropdown's gate (~236) from `@if (showOtherCenters())` to `@if (showOtherCenters() || !hasReferenceCenters())`; make its `placeholder` conditional: `[placeholder]="hasReferenceCenters() ? 'Other CGIAR Centers' : 'Add another center…'"` (no `label` added — this component intentionally has none). Mirror for Science (~270-331): wrap ~272-281, change gate at ~300, conditional placeholder `[placeholder]="hasReferenceScience() ? 'Other Science Programs' : 'Add another programme…'"`. **Regression test (Bug Mode, mandatory):** extend `lab-report-form.component.spec.ts` (already exists — this is an extend, not a new file; note its suite renders no DOM via `.overrideComponent(..., { set: { template: '' } })`, so assertions here are signal/property-level, e.g. read `hasReferenceCenters()`/`hasReferenceScience()` directly, or use the existing `readFileSync` string-matching pattern at `:318-325` for template-shape assertions). Also re-run the existing sentinel-deselection test near `describe('removable chips')` (`:289`) to confirm it still passes unmodified (it asserts signals, not DOM, so it should not collide with the template change — confirm, don't assume).
- **Implements:** `OTV-R-5`, `OTV-R-6`, `OTV-R-10`, `OTV-AC-5`, `OTV-AC-6`
- **Design refs:** `design.md` §6.2 rows 8-10, §13 (accepted-gap note re: async race — out of scope for this task, do not attempt to fix it here)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`, `lab-report-form.component.html`, `lab-report-form.component.spec.ts`
- **Depends on:** —
- **Blocks:** `OTV-T-5`
- **Estimate:** M
- **Skills:** `angular-developer`; `tdd`.
- **Definition of done:**
  - [ ] Code merged via commit convention.
  - [ ] Lint clean.
  - [ ] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="lab-report-form"` green.
  - [ ] Regression test confirmed RED pre-fix / GREEN post-fix.
  - [ ] `optionValue` on both `app-pr-multi-select` instances confirmed unchanged (`code` / `id`) — this task re-gates existing dropdowns, it does not create new ones; verify no accidental removal.
  - [ ] Manual/browser spot-check of the empty-ToC state in this component specifically — recorded per `design.md` §10, this component has **no** DOM-level automated coverage (Jest template is overridden empty, no Cypress spec exists), so this is the only verification for the actual rendered branch.
  - [ ] No secret/token leaked.

### `OTV-T-4` — Cypress regression: `rd-contributors-and-partners` empty-ToC + opt-in-preserved

- **Type:** `tests`
- **Description:** Extend `cypress/e2e/result-detail/contributors-and-partners.cy.ts` with two cases: (1) a result whose ToC node maps to zero Centers/Science Programs — assert the orange note is visible and no element with text "Other(s) Contributing CGIAR Centers" / "Other(s) Science Program(s)" is present; (2) a result whose ToC node maps to at least one Center/Science Program, user selects the "Other(s)" sentinel from the primary dropdown — assert the second dropdown IS labeled "Other(s)…" (this is the real-browser `OTV-AC-7` regression guard, complementing `OTV-T-1`'s unit-level one).
- **Implements:** `OTV-AC-1`, `OTV-AC-2`, `OTV-AC-7` (browser-level)
- **Design refs:** `design.md` §10 Cypress bullet
- **Files (expected):** `onecgiar-pr-client/cypress/e2e/result-detail/contributors-and-partners.cy.ts`
- **Depends on:** `OTV-T-1`
- **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer` (Cypress e2e is client-side, same skill scope per Skill Map — no dedicated e2e skill listed for this project).
- **Definition of done:**
  - [ ] `npm run cypress:run` (or the scoped spec) green locally.
  - [ ] Both new cases confirmed to fail against a stashed pre-`OTV-T-1` checkout, pass after.
  - [ ] No secret/token in fixtures or test data.

### `OTV-T-5` — Re-stamp touched `CLAUDE.md` files

- **Type:** `docs`
- **Description:** Per `docs/COMPONENT-DOCS.md` convention, re-stamp the `**Verified:**` line in `rd-contributors-and-partners/CLAUDE.md` and `lab-report-form/CLAUDE.md` (the two touched folders that own a `CLAUDE.md`; `aow-hlo-table-create-modal/` has none of its own — verify at task time whether the parent `entity-aow/CLAUDE.md` references this component closely enough to warrant a mention, but do not create a new `CLAUDE.md` file as part of this bugfix). Add a one-line "Trampa" note to each documenting the new `data-testid` hooks and the conditional label/placeholder pattern, since a future editor relabeling these fields again needs to know property bindings don't reflect as DOM attributes (RB-S1) — this is exactly the kind of non-obvious wiring the folder-doc convention exists to capture.
- **Implements:** — (process requirement, not a functional `OTV-R-*`)
- **Design refs:** `design.md` §12 `OTV-DD-1` consequences
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`, `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/CLAUDE.md`
- **Depends on:** `OTV-T-1`, `OTV-T-3`
- **Blocks:** —
- **Estimate:** S
- **Skills:** none required (documentation-only task, no code skill applies).
- **Definition of done:**
  - [ ] Both `Verified:` lines updated with current date/branch/commit per the convention.
  - [ ] New trap note added, ≤3 lines each, per the folder-doc brevity convention.
  - [ ] Committed in the same PR as the code it documents (not a separate follow-up).

## 3. Dependency graph

```
OTV-T-1 (rd-contributors-and-partners)  ──┬── OTV-T-4 (Cypress, rd)
                                           └── OTV-T-5 (CLAUDE.md re-stamp)
OTV-T-2 (aow-hlo-create-modal)             — independent, parallel-safe with T-1/T-3
OTV-T-3 (lab-report-form)                 ──── OTV-T-5 (CLAUDE.md re-stamp)
```

`OTV-T-1`, `OTV-T-2`, `OTV-T-3` touch disjoint files (three different components) and can run fully in parallel. `OTV-T-4` depends only on `OTV-T-1` (same component). `OTV-T-5` depends on both `OTV-T-1` and `OTV-T-3` (the two components whose `CLAUDE.md` gets re-stamped).

## 4. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `OTV-TEST-1` | unit (Jest, zoneless) | `OTV-R-1`, `OTV-R-2`, `OTV-AC-1`, `OTV-AC-2`, `OTV-AC-7` (rd) | `rd-contributors-and-partners.zoneless.spec.ts` |
| `OTV-TEST-2` | unit (Jest) | `OTV-R-3`, `OTV-R-4`, `OTV-AC-3`, `OTV-AC-4`, `OTV-AC-7` (aow) | `aow-hlo-create-modal.component.spec.ts` |
| `OTV-TEST-3` | unit (Jest) | `OTV-R-5`, `OTV-R-6`, `OTV-AC-5`, `OTV-AC-6` | `lab-report-form.component.spec.ts` |
| `OTV-TEST-4` | cypress | `OTV-AC-1`, `OTV-AC-2`, `OTV-AC-7` (browser) | `cypress/e2e/result-detail/contributors-and-partners.cy.ts` |
| `OTV-TEST-5` | manual/browser | `OTV-AC-5`, `OTV-AC-6` (DOM-level, since `lab-report-form` has no automated DOM coverage — see `design.md` §10 accepted gap) | Manual QA note in `OTV-T-3`'s DoD |

Client coverage MUST stay above 50/60/60/60 (`rd-contributors-and-partners` is excluded from the coverage calculation per `package.json`, but its tests must still pass).

## 5. Rollout & verification

- [ ] PR opened with commit convention.
- [ ] CI green (lint, `npx jest --silent --reporters=summary`, build).
- [ ] Manual QA on staging/test env: verify all three entry points (Result Detail Contributors & Partners on a 2026-phase result, the "Report result" modal, the Reporting-tab drawer) against a real indicator/HLO with zero mapped Centers/Science Programs, and one with at least one mapped Center/Science Program.
- [ ] No bilateral/platform-report impact — nothing to notify downstream.
- [ ] No admin/role/phase change — no runbook update needed.

## 6. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified in staging.
- [ ] File a separate follow-up ticket for `design.md` §13's two out-of-scope items: (a) extracting a shared "Contributing Centers/Science Programs, ToC-split" section component across all three call sites; (b) `lab-report-form`'s accepted async ToC-resolution race (`SP-2`) — revisit only if observed in practice.
- [ ] No `docs/prd.md` Open Questions resolved by this spec.

## 7. Roll-back plan

1. Revert the PR(s) for `OTV-T-1` through `OTV-T-5` (or the single combined PR, if not split).
2. No migration to revert (client-only).
3. No feature flag involved.
4. Confirm the three forms' empty-ToC state returns to the pre-fix "Other(s)…"-labeled behavior (compare against pre-change screenshots/snapshots).
5. No downstream consumer to notify.

## Required cross-references

- `docs/specs/bugfix/other-fields-toc-visibility/requirements.md`, `design.md`, `judgment.md` (same folder).
- `docs/prd.md` — `US-S1`, `US-S2`.
- `docs/ux-ui/design.md` — DD-5.
- `docs/trd/trd.md` — §2 client page-module table.
- `docs/COMPONENT-DOCS.md` — folder-doc `CLAUDE.md` re-stamp convention (`OTV-T-5`).
