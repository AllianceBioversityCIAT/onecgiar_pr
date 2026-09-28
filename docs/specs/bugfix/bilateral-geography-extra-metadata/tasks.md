# Tasks — Bilateral extra geography as optional metadata

## 1. Scope

- **Module / feature:** Bilateral extra geography metadata
- **Linked spec:** [requirements.md](requirements.md) · [design.md](design.md)
- **Owner / driver:** Frontend implementer
- **Status:** not-started
- **Depth:** Lite · Bug Mode

## 2. Pre-flight

- [x] User approved requirements and design by continuing to Phase 3.
- [x] Open questions resolved; no server, API, schema, or migration work.
- [x] Consumer/test sweep recorded below; W1/W2 consumers remain out of scope.
- [x] No external CLARISA dependency.

## 3. Task list

### [~] BIL-GEO-T-1 — Make bilateral extra geography optional, preservable metadata

- **Status:** not-started
- **Type:** client
- **Description:** Update bilateral Geography MDS tracking/completeness, editor Full Metadata disclosure and autosave serialization, and review drawer rendering/serialization. Show only stored values after the current result's geography data loads; preserve null/false/true and existing child selections during ordinary saves. Keep main geography validation and W1/W2 behavior unchanged. Add regression coverage against production component logic and shipped templates for empty, saved false/true, child-only data, and main-geography save cases.
- **Implements:** `BIL-GEO-R-1` scenarios (unanswered extra geography; missing main focus still blocks); `BIL-GEO-R-2` scenarios (absent data; saved data; child values with null answer; save preserves metadata); `BIL-GEO-AC-1`–`BIL-GEO-AC-5`.
- **Design references:** §§2.2–2.3, 4, 6.2–6.3, DD-1 and DD-2.
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.spec.ts`
  - `onecgiar-pr-client/cypress/e2e/bilateral-geography-extra-scope.cy.ts` and, if needed, a dedicated template-backed drawer render test; the existing drawer spec globally overrides the component template.
- **Depends on:** —
- **Blocks:** —
- **Estimate:** M (~100–140 LOC including regression tests)
- **Review:** full — shared metadata semantics, two bilateral surfaces, and preservation behavior.
- **Skills:** `angular-developer`, `ui-ux-pro-max`.
- **Verification:**
  - **Falsifier:** With innovation result fixtures, null answer plus valid main focus must complete Geography; null answer plus missing required main focus must remain incomplete. With loaded data, false must display “No”; child-only data must display the saved child values without the Yes/No prompt; no saved values must render no extra-geography controls. Save main focus and assert the existing null/false/true answer and child arrays are unchanged. Apply mutations that restore the extra-answer MDS check, null-to-false fallback, or unconditional prompt; the corresponding assertions must fail.
  - **Red run:** `npx jest src/app/pages/bilateral/components/section-geography/section-geography.component.spec.ts --runInBand --no-coverage` from `onecgiar-pr-client` must fail on the regression assertions before the fix and pass after it. Run `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.spec.ts --runInBand --no-coverage` for drawer serialization and rendered behavior. Ensure actual shipped templates are exercised (the existing drawer spec globally overrides its component template); add a dedicated template-backed test if the existing harness cannot prove rendering. Run the existing Cypress spec against the shipped editor template when its required local environment is available: `npx cypress run --e2e --spec cypress/e2e/bilateral-geography-extra-scope.cy.ts`. Include `npx ng lint --quiet` and `npm run build` for the typed Angular changes.
  - **Disqualifier:** If the regression assertion fails during fixture setup, or only a test-local template/predicate is exercised, the run is inconclusive. If the tested current code does not fail on the behavioral assertion, revise the test before implementation; do not count a setup error or timeout as the red run.
  - **Consumers:** Test-file grep for `has_extra_geo_scope|extra-geo-answer|extraGeo` across client/server `*spec.ts` and `*.cy.ts` found: `onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.spec.ts`; `onecgiar-pr-client/cypress/e2e/bilateral-geography-extra-scope.cy.ts`; `onecgiar-pr-client/src/app/shared/services/fields-manager.service.spec.ts`; `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.spec.ts`; `onecgiar-pr-server/src/api/results-framework-reporting/geographic-location/geographic-location.service.spec.ts`; `onecgiar-pr-server/src/api/ipsr/innovation-pathway/innovation-pathway-step-four.service.spec.ts`. Preserve W1/W2 and server behavior pinned by the latter four; add/update bilateral coverage in the first two and drawer-specific tests. The consumer sweep command was `rg -l 'has_extra_geo_scope|extra-geo-answer|extraGeo' onecgiar-pr-client/src onecgiar-pr-client/cypress onecgiar-pr-server/src --glob '*spec.ts' --glob '*.cy.ts'`.
- **Definition of done:**
  - [x] Regression fails on current behavioral assertions and passes after the fix.
  - [x] All scenarios and ACs above are covered with production component logic and actual rendered templates; main-scope blockers remain active.
  - [x] Bilateral save paths preserve absent and saved metadata; W1/W2 and server consumer tests remain green and unchanged in behavior.
  - [x] Focused client Jest tests, lint, and build pass; Cypress environment limitation is recorded explicitly.
  - [x] No API, server, schema, migration, or secret changes are introduced.

## 4. Dependency graph

```text
BIL-GEO-T-1
```

Single focused task; no parallel branches or PR split.

## 5. Acceptance coverage

| Requirement scenario / criterion | Owner | Evidence |
|---|---|---|
| R-1 unanswered optional answer does not block; missing main focus still blocks | T-1 | Production completeness/tracker test |
| R-2 no saved data stays hidden and optional | T-1 | Shipped-template rendering test in editor and drawer |
| R-2 saved false/true and child-only data render accurately | T-1 | Shipped-template rendering test |
| R-2 ordinary main-geography save preserves null and stored extras | T-1 | Production serialization test |
| AC-1 through AC-5 | T-1 | Focused regressions above |

## Required cross-references

- [Requirements](requirements.md)
- [Design](design.md)
- [PRD](../../../../docs/prd.md)
- [UX/UI design](../../../../docs/ux-ui/design.md)
- [TRD](../../../../docs/trd/trd.md)
- No bilateral API payload or server contract is changed.
