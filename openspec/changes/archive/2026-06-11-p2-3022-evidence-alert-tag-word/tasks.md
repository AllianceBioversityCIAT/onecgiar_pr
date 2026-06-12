## 1. Fix the alert template

- [x] 1.1 In `rd-evidences.component.ts` → `validateCheckBoxes()`, change the `.map()` template to append ` tag` after `${tag}`: `A principal contribution score (2) has been recorded for ${tag} tag. Please provide evidence to support this claim.`

## 2. Update tests

- [x] 2.1 In `rd-evidences.component.spec.ts`, update the assertion to expect `...recorded for Poverty reduction, livelihoods and jobs tag. Please provide evidence to support this claim.` (keep the `not.toContain(' if ')` check)
- [x] 2.2 Run the spec: `npm run test src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts` and confirm it passes
