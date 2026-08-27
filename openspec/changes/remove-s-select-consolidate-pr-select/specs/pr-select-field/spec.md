## ADDED Requirements

### Requirement: Consumer-controlled dropdown panel styling
`app-pr-select` SHALL accept an optional `optionsInlineStyles` string input that is applied to the dropdown panel (`.options`) when `overlayToBody` is false, so consumers can tune the panel's height and position (e.g. opening upward near the bottom of a page). When `overlayToBody` is true, the internal `overlayStyles` positioning is used instead and `optionsInlineStyles` is ignored.

#### Scenario: Applying consumer inline styles without overlayToBody
- **WHEN** a consumer sets `optionsInlineStyles="max-height: 180px; bottom: -185px;"` and does not set `overlayToBody`
- **THEN** the dropdown panel renders with those inline styles

#### Scenario: overlayToBody takes precedence
- **WHEN** `overlayToBody` is true
- **THEN** the panel uses the internally computed `overlayStyles` and ignores `optionsInlineStyles`

#### Scenario: Default is empty
- **WHEN** `optionsInlineStyles` is not provided and `overlayToBody` is false
- **THEN** no consumer inline styles are applied and the panel falls back to the shared stylesheet defaults

## REMOVED Requirements

### Requirement: s-select component
**Reason:** `app-s-select` was a legacy duplicate of `app-pr-select` with a single, fragile consumer and a partial signals migration (calling `this.options()` on a plain `@Input`). It is removed and its consumer migrated to `app-pr-select`.

**Migration:** Replace `<app-s-select [options]="signalRef" ...>` with `<app-pr-select [options]="signalRef()" ...>` (pass the array value, not the Signal). The ControlValueAccessor value contract is identical (scalar `optionValue`); `selectOptionEvent` payload (the full option object) is unchanged.
