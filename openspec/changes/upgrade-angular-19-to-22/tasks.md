## 0. Worktree bootstrap (frontend)

- [x] 0.1 Confirm isolated worktree `.claude/worktrees/angular-upgrade-19-22` (branch `angular-upgrade-19-22` off `staging`), tree clean
- [x] 0.2 `cd onecgiar-pr-client && npm ci` — install baseline (Angular 19) node_modules in the worktree
- [x] 0.3 Baseline gate — record that `npm run build:dev`, `npm run test`, `npm run test:ct` are green on Angular 19 BEFORE upgrading (so regressions are attributable)
- [x] 0.4 Check local Node version vs Angular 20/21/22 engine floors; note if a bump is needed

## 1. Major 19 → 20 (frontend)

- [x] 1.1 `ng update @angular/core@20 @angular/cli@20 @angular/cdk@20` — let framework + CDK migration schematics run
- [x] 1.2 Bump lockstep deps to major 20: `primeng@20`, `@primeng/themes@20`, `@ncstate/sat-popover@15`, `@angular-eslint/*@20`, build tooling (`@angular-devkit/build-angular`, `@angular/build`, `@angular/compiler-cli`); `npm install` resolves with no ERESOLVE
- [x] 1.3 Fix compiler/template errors from Angular 20 + PrimeNG 20 API drift (minimal, no behaviour change)
- [ ] 1.4 Gate: `npm run build:dev` ✅ → `npm run test` ✅ → `npm run test:ct` ✅
- [ ] 1.5 Smoke-test key screens (`npm start`): Result Detail, a dialog, a p-table, toast, a form with pr-select/pr-textarea
- [x] 1.6 Commit `chore(deps): upgrade Angular 19→20 (PrimeNG/CDK/sat-popover lockstep)`; log codemod + API changes in the QA doc

## 2. Major 20 → 21 (frontend)

- [x] 2.1 `ng update @angular/core@21 @angular/cli@21 @angular/cdk@21`
- [x] 2.2 Bump lockstep deps to major 21: `primeng@21`, `@primeng/themes@21`, `@ncstate/sat-popover@16`, `@angular-eslint/*@21`, build tooling; `npm install` resolves
- [x] 2.3 Fix Angular 21 + PrimeNG 21 API drift (minimal)
- [ ] 2.4 Gate: `build:dev` ✅ → Jest ✅ → CT ✅
- [ ] 2.5 Smoke-test key screens
- [x] 2.6 Commit `chore(deps): upgrade Angular 20→21`; log changes in the QA doc
- [x] 2.7 CHECKPOINT — Angular 21 reached: Spartan is now installable. Decide with the user whether to continue to 22 or stop here and start the Spartan foundation change

## 3. Major 21 → 22 (frontend, optional — only if deps support it)

- [x] 3.1 BLOCKED — Angular 22 not reachable: primeng only at 22.0.0-rc.2 (no stable), @primeng/themes has no v22 at all, @ncstate/sat-popover has no v22 (max 16/Angular 21). Angular 22 must wait until PrimeNG is removed (post-Spartan) + sat-popover replaced. STOP at 21 — already unblocks Spartan (needs >=21 <23).
- [ ] 3.2 `ng update @angular/core@22 @angular/cli@22 @angular/cdk@22` + lockstep dep bumps; `npm install` resolves
- [ ] 3.3 Fix Angular 22 API drift (minimal)
- [ ] 3.4 Gate: `build:dev` ✅ → Jest ✅ → CT ✅
- [ ] 3.5 Smoke-test key screens
- [ ] 3.6 Commit `chore(deps): upgrade Angular 21→22`; log changes in the QA doc

## 4. Infra & docs (frontend)

- [ ] 4.1 If the Node floor rose, report the required CI/Docker Node bump to the user for sign-off (do NOT edit CI workflows / Dockerfile without OK)
- [ ] 4.2 Create `onecgiar-pr-client/docs/angular-upgrade-19-22.md` — per-major log: version bumps, codemods applied, PrimeNG API fixes, test results, any blockers/decisions
- [ ] 4.3 Final verification — full `npm run test`, `npm run test:ct`, `npm run build` (prod) all green on the final major
- [ ] 4.4 Confirm PrimeNG still present and functional (upgrade, not removal) — `primeng` in package.json, app renders
