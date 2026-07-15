## ADDED Requirements

### Requirement: User-controlled text size

The top navigation SHALL provide a control that lets any user enlarge the text (and overall UI) of the whole application, so low-vision users can read comfortably without relying on browser zoom alone (WCAG 2.2 §1.4.4 Resize Text).

The control SHALL expose exactly four discrete steps with these labels and scale factors: **Default** (1.0), **Large** (1.15), **Larger** (1.3), **Largest** (1.5). No step below 1.0 SHALL be offered.

The chosen scale SHALL be applied by driving a single CSS custom property `--pr-font-scale` on the document root, consumed by `html { zoom: var(--pr-font-scale) }`, so that the entire app — including CDK overlays and dialogs — scales uniformly from one lever. The control SHALL NOT disable or interfere with native browser zoom, which continues to stack on top.

#### Scenario: Enlarging text scales the whole app

- **WHEN** the user selects "Largest" in the text-size control
- **THEN** `--pr-font-scale` is set to `1.5` on the document root
- **AND** all page content, the navigation bar, and any open overlays render at 1.5× size

#### Scenario: Returning to default

- **WHEN** the user selects "Default" (or activates "Reset to default")
- **THEN** `--pr-font-scale` returns to `1` and the app renders at its baseline 12px scale with no visual regression

#### Scenario: Default is the baseline

- **WHEN** a user has never changed the text size
- **THEN** the app renders at scale `1` (the current 12px baseline) with the "Default" option selected

### Requirement: Text-size preference persists across sessions

The selected text size SHALL be persisted to `localStorage` under the key `pr.a11y.fontScale` and re-applied automatically on subsequent visits. The persisted value SHALL be applied **before first paint** to avoid a visible flash/resize on load.

If `localStorage` is unavailable (private mode / blocked), the control SHALL still work for the current session without throwing.

#### Scenario: Preference survives reload

- **WHEN** the user has selected "Larger" and reloads the page
- **THEN** the app renders at 1.3× immediately on load without a flash
- **AND** the "Larger" option is shown as selected

#### Scenario: Storage unavailable

- **WHEN** `localStorage` cannot be read or written
- **THEN** the control still changes the text size for the current session and does not raise an error

### Requirement: Text-size control is keyboard accessible and announced

The text-size control SHALL meet WCAG 2.2 operability: it SHALL be a `radiogroup` with an accessible group label and one `radio` per step exposing `aria-checked`. Selection SHALL use a roving `tabindex` (selected option is tabbable, others are not), with **Arrow keys** moving and selecting between options and **Home/End** jumping to the first/last option. A change SHALL be announced via an `aria-live` region. The overlay SHALL trap focus while open, and **Escape** SHALL close it and return focus to the trigger. Every interactive element SHALL show a visible focus ring (using `--pr-color-primary-300`, never removing outlines).

#### Scenario: Arrow-key navigation selects a size

- **WHEN** focus is on the currently selected radio and the user presses ArrowRight
- **THEN** focus moves to the next option, that option becomes selected (`aria-checked="true"`), and the text size updates accordingly

#### Scenario: Escape returns focus

- **WHEN** the text-size overlay is open and the user presses Escape
- **THEN** the overlay closes and focus returns to the text-size trigger button

#### Scenario: Change is announced

- **WHEN** the user changes the text size
- **THEN** an `aria-live="polite"` region communicates the new size (e.g. "Text size: Larger")

### Requirement: Navigation action icons are labelled

Each action icon in the top navigation (Search, What's new, Alerts, Text size) SHALL display a short text label beneath its icon so its purpose is clear without relying on hover or icon recognition alone. The text-size control's icon SHALL be a size-indicating glyph (`format_size`), not a generic overflow/kebab icon.

#### Scenario: Icons show their purpose

- **WHEN** the top navigation is rendered
- **THEN** the Search, What's new, Alerts, and Text size actions each show a labelled icon
- **AND** the Text size action uses the `format_size` glyph

### Requirement: Baseline font size is unchanged by this control

This capability SHALL NOT change the application's default 12px base font size or the authored type scale; it only adds an opt-in user multiplier on top. Raising the default baseline (e.g. a px→rem migration) is explicitly out of scope and deferred to a separate future change.

#### Scenario: No regression at default

- **WHEN** the control is introduced and left at "Default"
- **THEN** the app looks identical to before the change (same 12px baseline and dense layout)
