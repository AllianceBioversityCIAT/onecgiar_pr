## ADDED Requirements

### Requirement: Heavy PrimeNG components render without PrimeNG

The system SHALL render dialogs, tables, toasts, overlays, buttons and the remaining form controls (toggleswitch, datepicker, input number, password, splitbutton, chart) using Spartan `hlm-*` components or reused PRMS custom components, with no `primeng` dependency remaining, while preserving each surface's behavior (only the UI may change).

#### Scenario: A migrated dialog behaves the same
- **WHEN** a screen that used `<p-dialog>` is migrated to the Spartan dialog
- **THEN** it opens/closes via the same trigger and `[visible]`/close controls, traps focus, and shows the same header/footer/content
- **AND** no infinite change-detection loop occurs on form-heavy pages

#### Scenario: A migrated table preserves sort/paginate/filter/expand
- **WHEN** a `<p-table>` is migrated to the Spartan/CDK table
- **THEN** column sorting, pagination, column filtering and row expansion behave as before

#### Scenario: No PrimeNG remains at the finish line
- **WHEN** the migration is complete
- **THEN** there are 0 `<p-*>`/`pXxx` usages and 0 `primeng/*` imports app-wide, `primeng`/`@primeng/themes`/`@ncstate/sat-popover` are uninstalled, and `npm run build:dev` is green

#### Scenario: The two special selects keep working
- **WHEN** `search-user-select` (live AD search) and `manage-user-modal` (inline select) are migrated
- **THEN** the live-search-on-type + loading/empty states, and the inline row select, behave as before
