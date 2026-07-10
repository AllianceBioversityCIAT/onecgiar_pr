## ADDED Requirements

### Requirement: Angular platform target
The client SHALL run on Angular **21 or 22** (the minimum that unblocks Spartan UI, `@spartan-ng/brain` peer `>=21 <23`), reached by stepwise major upgrades (19→20→21→22).

#### Scenario: Angular major reached
- **WHEN** the upgrade is complete
- **THEN** `@angular/core` in `onecgiar-pr-client/package.json` is `^21` or `^22`, and no `@angular/*` package remains on `^19` or `^20`

#### Scenario: No skipped majors
- **WHEN** upgrading between majors
- **THEN** each major (20, 21, 22) is applied via its own `ng update @angular/core@N @angular/cli@N` run so the framework migration schematics execute

### Requirement: UI dependencies upgraded in lockstep
Every UI/tooling dependency that peers on the Angular major SHALL be upgraded to the matching major in the same step, so the dependency tree resolves without `--force`.

#### Scenario: PrimeNG tracks the Angular major
- **WHEN** Angular is on major N
- **THEN** `primeng` and `@primeng/themes` are on major N and `npm install` resolves with no `ERESOLVE` peer conflict

#### Scenario: CDK and sat-popover track the Angular major
- **WHEN** Angular is on major N
- **THEN** `@angular/cdk` is on major N and `@ncstate/sat-popover` is on the release whose peer accepts Angular N

### Requirement: PrimeNG remains functional across the upgrade
PrimeNG SHALL stay installed and working through the entire upgrade; it is upgraded, not removed. Removal is out of scope for this change.

#### Scenario: PrimeNG still renders after each major
- **WHEN** a major upgrade completes
- **THEN** PrimeNG components (dialog, table, textarea, select, toast, tooltip) still render and the app runs; `primeng` is still a dependency

### Requirement: Build and tests pass at every major
The client SHALL build and pass all three test suites after each major upgrade before the next major begins.

#### Scenario: Verification gate green
- **WHEN** a major upgrade step finishes
- **THEN** `npm run build:dev` succeeds, `npm run test` (Jest) passes, and `npm run test:ct` (Cypress CT) reports all specs passed

#### Scenario: No product-behaviour change
- **WHEN** the app is smoke-tested after an upgrade
- **THEN** screens render and behave as before the upgrade (only framework/tooling migration codemods were applied, no feature changes)

### Requirement: Node engine compatibility surfaced
When a major raises the minimum Node version, the change SHALL surface the CI/Docker Node bump as an explicit item rather than silently editing infrastructure.

#### Scenario: Node floor raised
- **WHEN** Angular 20+ requires a newer Node than CI/Docker currently pins
- **THEN** the required Node bump is reported to the user for infra sign-off, not auto-committed into CI workflows
