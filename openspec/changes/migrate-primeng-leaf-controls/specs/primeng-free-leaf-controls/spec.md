## ADDED Requirements

### Requirement: Tooltips render without PrimeNG

The system SHALL present hover tooltips using the shared `PrTooltipDirective` (`[prTooltip]`) instead of PrimeNG `pTooltip`, with no `primeng/tooltip` dependency remaining in the affected templates. The directive SHALL support the tooltip text, position (`top`/`bottom`/`left`/`right`), and a custom style class, and SHALL render the tooltip on `document.body` so it is never clipped by an ancestor's `overflow: hidden`.

#### Scenario: Hovering an element with a tooltip
- **WHEN** the user hovers an element annotated with `[prTooltip]="text"`
- **THEN** a tooltip showing `text` appears positioned per `prTooltipPosition`
- **AND** it is removed when the pointer leaves or the element is destroyed

#### Scenario: No PrimeNG tooltip remains
- **WHEN** the affected templates are searched for `pTooltip` / `[pTooltip]`
- **THEN** none remain, and `TooltipModule` is not imported by any module that no longer needs it

#### Scenario: Tooltip option not yet supported is preserved
- **WHEN** an existing `pTooltip` usage relied on an option the directive did not support (e.g. `escape`, `showDelay`, `hideDelay`)
- **THEN** the directive is extended to honor that behavior rather than dropping it silently

### Requirement: Bare checkboxes render without PrimeNG

The system SHALL render bare checkboxes (outside `custom-fields/`) as native `<input type="checkbox" class="pr-native-check">` bound with `ngModel`, replacing PrimeNG `<p-checkbox>`, while preserving the previous checked-state semantics for both binary and value/group checkboxes.

#### Scenario: Toggling a migrated checkbox
- **WHEN** the user clicks a migrated checkbox
- **THEN** its `ngModel` updates exactly as the PrimeNG checkbox did (binary boolean, or membership for `[value]`/group checkboxes)
- **AND** any `(onChange)`/change handler still fires via `(ngModelChange)`

#### Scenario: No PrimeNG checkbox remains
- **WHEN** the affected templates are searched for `<p-checkbox>`
- **THEN** none remain, and `CheckboxModule` is not imported by any module that no longer needs it

### Requirement: Leaf visual indicators render without PrimeNG

The system SHALL render inline messages, skeleton loaders, chips, avatars and progress indicators without PrimeNG, using native elements plus PRMS/Tailwind styling, preserving each element's appearance and role.

#### Scenario: Inline message and skeleton (already migrated)
- **WHEN** a page previously used `<p-message>` or `<p-skeleton>`
- **THEN** it now uses `<app-alert-status>` (message) or `<div class="pr-skeleton">` with the global shimmer (skeleton), with `MessageModule`/`SkeletonModule` no longer imported

#### Scenario: Chip, avatar and progress
- **WHEN** a page previously used `<p-chip>`, `<p-avatar>`, `<p-progressBar>` or `<p-progressSpinner>`
- **THEN** it renders an equivalent native/Tailwind element with the same visual role, and the corresponding PrimeNG module import is removed where unused

### Requirement: Migration is facade-preserving and verified

The system SHALL keep all consumer-facing behavior identical after each swap, introduce no `@spartan-ng/brain` host-directives, and be verified before completion.

#### Scenario: Build and runtime verification
- **WHEN** the leaf-control migration is complete
- **THEN** `npm run build:dev` succeeds
- **AND** navigating the affected screens shows no new console errors versus the pre-change baseline
- **AND** no infinite change-detection loop is introduced on form-heavy pages
