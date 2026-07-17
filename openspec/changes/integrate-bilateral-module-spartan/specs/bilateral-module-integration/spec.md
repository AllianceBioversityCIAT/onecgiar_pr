# Spec — bilateral-module-integration

## ADDED Requirements

### Requirement: Bilateral module merged without losing either side's features
The `performance-refactor` branch SHALL contain the full bilateral module from `origin/001-AI-Driven-Evidence-Quality-Assessment-Module` merged so that no feature from either parent branch is lost in conflicted files (user-management Center-User role, redesigned admin UI, redesigned RFR home, his center cards, header-panel notification changes, bilateral route).

#### Scenario: Merge preserves both parents in conflicted files
- **WHEN** the merge commit is diffed against each parent (`git diff HEAD^1`, `git diff HEAD^2`) for the 14 conflicted files
- **THEN** every intentional feature of each parent remains present (Center-User role logic AND redesigned admin UI; center cards AND insights widget/compact toggle on RFR home; bilateral route present in routing tables)

#### Scenario: Unrelated local WIP untouched
- **WHEN** the merge completes
- **THEN** the uncommitted dashboard-lab modifications and the untracked `openspec/changes/guided-result-reporting-flow/` folder remain exactly as they were

### Requirement: Zero PrimeNG on the branch after migration
The client SHALL build and run with no `primeng` imports, no `<p-*>` component tags, and no `.p-*` style overrides introduced by the merge; `src/styles/primeng-custom-styles.scss` SHALL remain deleted.

#### Scenario: Static sweep is clean
- **WHEN** grepping `src/` for `from 'primeng`, `<p-select`, `<p-multiSelect`, and `primeng-custom-styles`
- **THEN** there are zero matches

#### Scenario: Production build passes
- **WHEN** `npm run build` executes on the merged branch
- **THEN** it completes with no compilation errors

### Requirement: Bilateral selects use project custom fields
Every dropdown in the bilateral module SHALL use `app-pr-select` (single) or `app-pr-multi-select` (multiple) with equivalent bindings (options, labels, values, disabled/required states, change events) so selection behavior matches Juanda's original PrimeNG behavior, and controls SHALL be interactive outside result-detail context (explicit `editable` handling where `RolesService.readOnly` would otherwise hide them).

#### Scenario: Single select works
- **WHEN** the user opens a migrated single select (e.g. project selector, contributor role) and picks an option
- **THEN** the bound model updates and dependent logic (auto-save, validations) fires as before

#### Scenario: Multi select works
- **WHEN** the user selects and deselects multiple options in a migrated multi select (e.g. contributors, geography)
- **THEN** the bound array updates correctly, including grouped/disabled option behavior where used

### Requirement: Toasts via project alerts service
User feedback previously emitted through PrimeNG `MessageService` SHALL be emitted through `CustomizedAlertsFeService` (`api.alertsFe.show`) with equivalent severity mapping (success/error/warning → status).

#### Scenario: Creation feedback
- **WHEN** a bilateral result creation or auto-save succeeds or fails
- **THEN** the user sees the corresponding project-styled alert (success or error) instead of a PrimeNG toast

### Requirement: Module functions under Angular 21 change detection
Bilateral components SHALL render their async-updated state under Angular 21 + zoneless-leaning CD: template-bound flags set asynchronously SHALL be signals (or otherwise verified to render).

#### Scenario: Async state renders
- **WHEN** the module loads data asynchronously (project list, ToC, auto-save state) and flips loading/visibility flags
- **THEN** the UI reflects the state change without requiring user interaction to trigger re-render

#### Scenario: Jest suite green
- **WHEN** `npm run test` runs on the merged branch
- **THEN** all suites pass, including Juanda's bilateral specs (adapted to Ng21 render behavior where needed, never deleted)

### Requirement: Bilateral UI follows the brand design line
Bilateral module surfaces SHALL use the brand design line: violet accent (`#6b6dc4` ramp / `brand-*` tokens), navy-carbon chrome gradient (`#1e202f→#1f2235`) for dark chrome surfaces, Poppins typography, `material-icons-round` icons; all NEW styling SHALL be Tailwind utilities (no new custom SCSS classes).

#### Scenario: Visual audit
- **WHEN** the creator shell, section-zero dashboard, and accordion sections are reviewed in the browser
- **THEN** accents, headers, buttons, focus states and badges use the brand tokens and no legacy PrimeNG-look styling remains

### Requirement: Brand rules documented in system design baseline
`docs/system-design/design.md` SHALL document the current brand design line (violet accent ramp, chrome gradient usage, Tailwind-first styling rule, icon set) so future modules can cite it.

#### Scenario: Rules present
- **WHEN** a developer consults `docs/system-design/design.md` for visual rules
- **THEN** the violet/chrome brand line and Tailwind-first rule are explicitly stated (added under Design Decisions if previously absent)
