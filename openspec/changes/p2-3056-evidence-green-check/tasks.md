## 1. Rename Impact-Area checkbox labels

- [x] 1.1 Update the five Impact-Area `label` strings in the `tagFields` array in `rd-evidences.component.ts` (Gender equality, youth and social inclusion / Climate adaptation and mitigation / Nutrition, health and food security / Environmental health and biodiversity / Poverty reduction, livelihoods and jobs) — keep `field` keys unchanged
- [x] 1.2 Update the five `app-pr-checkbox` labels in `evidence-item.component.html` to the same canonical names — keep the `[(ngModel)]` bindings (incl. Climate → `youth_related`) unchanged
- [x] 1.3 Confirm the read-only impact-tag chips (`getSelectedImpactTags()`) now render the canonical names automatically

## 2. Block the Evidence green check

- [x] 2.1 Add a getter on `rd-evidences.component.ts` (e.g. `evidenceSectionComplete`) combining: base evidence present (or result type 5) AND `validateCheckBoxes()` returns empty AND `validateHasInnoReadinessLevelEvidence()` is true; guard the readiness condition so it only applies to Innovation Development (result_type_id 7)
- [x] 2.2 Bind `[isComplete]` of the Evidence `appFeedbackValidation` block (`rd-evidences.component.html:101`) to the new getter
- [x] 2.3 Sanity-check that the yellow warnings and the green check now agree in all branches (no evidence, Principal marker missing, readiness 1–9 missing, readiness 0, type 5)

## 3. Tests

- [x] 3.1 Add/extend `rd-evidences.component.spec.ts`: green check blocked with no evidence; blocked when a Principal marker lacks tagged evidence; blocked when Innovation Development readiness is 1–9 without readiness evidence; satisfied when readiness is 0; satisfied for type 5 with no evidence; satisfied when all rules met
- [x] 3.2 Add/extend `evidence-item.component.spec.ts` (or rd-evidences spec): the five checkboxes render the canonical labels (covered via `getSelectedImpactTags` test in rd-evidences spec)
- [x] 3.3 Run `npm run test src/.../rd-evidences.component.spec.ts` and the evidence-item spec; ensure green — 46 + 29 passing

## 4. Manual verification

- [ ] 4.1 Run the client locally; on an Innovation Development result, confirm the Evidence green check stays red until base + Principal-marker + readiness evidence are provided, and turns green once all are met
- [ ] 4.2 On a non-Innovation-Development result with a Principal marker, confirm the green check requires the marker evidence and is NOT blocked by readiness
- [ ] 4.3 Confirm where the user-visible check (in-section flag vs side-menu/backend) was turning green prematurely, and that the fix closes the reported P2-3056 case; capture before/after screenshots into `onecgiar_pr/.local-screenshots/`
- [ ] 4.4 Report results to reporter Santiago Sánchez (Slack) with the panorama and verification status
