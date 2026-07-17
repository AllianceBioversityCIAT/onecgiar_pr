# Tasks — integrate-bilateral-module-spartan

## 1. Merge

- [x] 1.1 Verify working tree safety (dashboard-lab WIP + untracked openspec folder untouched by merge paths) and run `git merge --no-commit origin/001-AI-Driven-Evidence-Quality-Assessment-Module`
- [x] 1.2 Resolve `user-management` conflicts (×6): our redesigned UI + Juanda's Center-User role logic
- [x] 1.3 Resolve `result-framework-reporting-home` conflicts (×3): our redesign + his center cards + `center-report-stub` wiring
- [x] 1.4 Resolve `header-panel` conflicts (×2): combine notification pop-up changes
- [x] 1.5 Resolve `routing-data.ts`: add bilateral route to our table
- [x] 1.6 Resolve `primeng-custom-styles.scss`: keep deleted (`git rm`)
- [x] 1.7 Resolve server conflicts (×3) mechanically preserving both sides
- [x] 1.8 Commit the merge (English message, ticket P2-2965)

## 2. PrimeNG → Spartan/custom-fields migration

- [x] 2.1 `section-contributors`: p-select/p-multiSelect → app-pr-select/app-pr-multi-select, remove primeng imports
- [x] 2.2 `section-geography`: same migration
- [x] 2.3 `section-toc`: p-select → app-pr-select
- [x] 2.4 `bilateral-result-creator`: MessageService → `api.alertsFe.show`
- [x] 2.5 Remove `.p-accordion` overrides; restyle `bilateral-accordion` directly
- [x] 2.6 Sweep: zero `primeng` matches in `src/`

## 3. Angular 21 compatibility

- [x] 3.1 Normalize standalone/NgModule wiring of bilateral components to branch conventions
- [x] 3.2 Convert async template-bound flags to signals (Ng21 CD gotcha)
- [x] 3.3 `npm run build` green
- [x] 3.4 Jest green (adapt Juanda's specs to Ng21 render behavior if needed)

## 4. Brand/UI pass

- [x] 4.1 Audit bilateral screens in browser; apply violet/chrome brand tokens via Tailwind (creator shell, section-zero dashboard, accordion, selects context)
- [x] 4.2 Restyle RFR-home center cards to match redesigned home
- [x] 4.3 /impeccable-style polish: hierarchy, spacing, focus/empty/loading states
- [x] 4.4 Document brand design line in `docs/system-design/design.md` if absent

## 5. Verification

- [x] 5.1 Check `/api/bilateral/*` availability on prtest (read-only curl); note E2E reach
- [x] 5.2 Browser walkthrough of bilateral creator happy path + conflicted screens (admin user-management, RFR home, header panel); screenshots to `.local-screenshots/`
- [ ] 5.3 Adversarial review workflow (finders + refuters) over the full diff; fix confirmed findings
- [ ] 5.4 Final gates: build + Jest + zero-primeng sweep re-run
