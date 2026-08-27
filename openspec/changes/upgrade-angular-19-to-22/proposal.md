## Why

The client is on **Angular 19.2**. The strategic goal is to migrate PRMS off PrimeNG onto **Spartan UI + Tailwind**, but the maintained Spartan (`@spartan-ng/brain@1.1.0`) requires **Angular >=21 <23 + Tailwind 4**. So the Angular platform upgrade is the **hard prerequisite and the true first step** — Spartan cannot be installed on Angular 19 without falling back to an unmaintained alpha (dead-end, rejected).

Investigation (2026-07-10) confirmed:
- **PrimeNG 19 blocks a lone Angular bump** — `npm install @angular/core@20` fails with `ERESOLVE` because `primeng@19` peers `@angular/forms@^19` / `@angular/animations@^19`.
- **The fix is a lockstep upgrade, NOT uninstalling PrimeNG.** Every UI dep tracks the Angular major and moves together: `primeng` 19→20→21, `@angular/cdk` 19→20→21, `@ncstate/sat-popover` 14→15→16. None is abandoned.
- Angular requires **stepwise major upgrades** (19→20→21→22); you cannot jump majors.

Scope note: **frontend-only** (`onecgiar-pr-client`). Server untouched. No dedicated Jira ticket — this belongs to the `front-redesign` / Spartan-migration initiative. Runs in an isolated worktree (`.claude/worktrees/angular-upgrade-19-22`, branch `angular-upgrade-19-22`, based on `staging`).

## What Changes

- Upgrade the Angular platform **19 → 20 → 21 → 22** stepwise, using `ng update` at each major so Angular's migration schematics run.
- At each major, upgrade the UI/tooling deps **in lockstep**: `primeng` + `@primeng/themes`, `@angular/cdk`, `@ncstate/sat-popover`, `@angular-eslint/*`, `@angular-devkit/build-angular` / `@angular/build`, `@angular/cli`, `@angular/compiler-cli`.
- Apply any framework breaking-change codemods surfaced by `ng update` (control flow, standalone, effect/signal APIs, etc.) — but **no behavioural changes**; the app must render and behave identically.
- Keep **PrimeNG installed and working** the entire time (it is upgraded, not removed). Removing PrimeNG is a **later, separate** change once Spartan replaces it.
- Verify at every major: `npm run build:dev` passes, `npm run test` (Jest) passes, `npm run test:ct` (Cypress CT) passes, and a manual smoke of key screens.
- **NON-BREAKING** to product behaviour. **BREAKING** only in the sense of the toolchain/runtime version (Node engine, build output).

## Capabilities

### New Capabilities
- `frontend-build-platform`: the invariant contract of the Angular build platform after the upgrade — target Angular/PrimeNG/CDK/sat-popover versions, the requirement that the client builds and all three test suites pass, and that PrimeNG remains functional (not removed) so the app is continuously shippable across the upgrade.

### Modified Capabilities
<!-- None — no product-level requirement changes; this is a platform/tooling upgrade. -->

## Impact

- **Code:** `onecgiar-pr-client/package.json`, `package-lock.json`, `angular.json`, `tsconfig*.json`, and any files touched by `ng update` framework migrations (control-flow/standalone codemods). Potential PrimeNG API adjustments where v20/v21 renamed inputs or modules.
- **Dependencies:** all `@angular/*`, `primeng`, `@primeng/themes`, `@angular/cdk`, `@ncstate/sat-popover`, `@angular-eslint/*`, build tooling — each stepped per major.
- **Node engine:** Angular 20+ raises the minimum Node version; CI/Docker (`Dockerfile`, CI workflows) may need the Node bump — flag if so.
- **Risk surface:** large (framework majors + PrimeNG majors). Mitigated by stepwise majors with full build+test verification gates between each, all in an isolated worktree.
- **SDD baseline:** tooling change; no `docs/prd.md` acceptance-criteria change. Unlocks the subsequent Spartan/Tailwind foundation change.
