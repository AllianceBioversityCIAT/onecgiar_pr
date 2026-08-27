## ADDED Requirements

### Requirement: Single canonical colour token source

`src/styles/colors.scss` SHALL be the only place where a colour value is literally declared for the PRMS client. Every other layer — the Tailwind `@theme inline` bridge, the Spartan/Helm shadcn variables, component styles, and templates — SHALL reference those variables rather than restating a value.

Components MUST NOT hardcode a hex, `rgb()`, or `hsl()` literal. They consume either a `--pr-*` variable or one of the Tailwind aliases generated from it.

#### Scenario: A new colour is needed by a component

- **WHEN** a developer needs a colour that has no token
- **THEN** they add it to `src/styles/colors.scss` first, expose it through `@theme inline` if a utility is wanted, and only then consume it
- **AND** the component contains no colour literal

#### Scenario: Auditing for literals

- **WHEN** the client source is grepped for hex literals outside `src/styles/`
- **THEN** the only permitted survivors are values that no CSS variable can reach — colour arriving from the API, colour held in TypeScript data constants, and raster assets — and each is recorded in the change's out-of-scope list

### Requirement: Brand ramp is re-valued in place, never renamed

The `--pr-color-primary-*` ramp SHALL keep its existing stop names (`25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`) and the project convention that **`-300` is the main action colour**. A rebrand SHALL be delivered by changing values, not by renaming or renumbering stops.

`--pr-color-primary-300` SHALL be `#6b46e5`.

#### Scenario: Rebranding the application

- **WHEN** the ramp values in `colors.scss` are replaced
- **THEN** every existing `var(--pr-color-primary-*)` reference and every `*-brand-*` Tailwind utility renders the new brand
- **AND** no template, component style, or utility class name is edited to achieve it

#### Scenario: A stop's role conflicts with its new value

- **WHEN** a stop is consumed in a role its new value cannot satisfy (for example a light tint used as a focus ring)
- **THEN** the consuming sites are repointed to the semantically correct token
- **AND** the ramp value is not distorted to accommodate the misuse

### Requirement: Token pairs meet WCAG AA

Every foreground/background pair that the application actually renders SHALL meet its WCAG 2.1 AA threshold: **4.5:1** for normal text, **3.0:1** for large text, and **3.0:1** for non-text UI such as borders, focus indicators, and control boundaries (WCAG 1.4.11).

Contrast SHALL be computed, not estimated. Because `html, body` are set to **12px**, the normal-text threshold applies to nearly all copy.

A pair that cannot meet its threshold SHALL be either remediated or recorded as an explicit, justified exception — never left silently failing.

#### Scenario: Introducing or changing a token value

- **WHEN** a colour token's value changes
- **THEN** the contrast ratio of every pair a real consumer renders with it is recomputed
- **AND** any pair below its threshold is listed with the file and line that renders it

#### Scenario: The main action colour on light surfaces

- **WHEN** `--pr-color-primary-300` is rendered as text on white, as text on `--pr-color-primary-50`, or as a fill carrying white text
- **THEN** each of those pairs measures at or above 4.5:1

#### Scenario: A composited hover or translucent state

- **WHEN** a state is produced by compositing a token over a background rather than by selecting a distinct token — such as a Tailwind opacity modifier
- **THEN** the resulting composite colour is computed against its real backdrop and checked, not assumed to inherit the base token's ratio

### Requirement: Spartan/Helm components render the PRMS brand

The shadcn/Helm raw variables that Spartan components style against — including `--primary`, `--primary-foreground`, `--background`, `--foreground`, `--border`, `--input`, `--ring`, and the `--sidebar*` family — SHALL resolve to PRMS brand values drawn from the `--pr-*` canon.

These variables SHALL be re-valued in a plain `:root` declaration. A second `@theme` block SHALL NOT be introduced for them, because Helm's own preset already maps them into Tailwind's colour namespace with `@theme inline`.

#### Scenario: Rendering any Spartan component

- **WHEN** a Spartan/Helm component such as `hlm-button`, `hlm-input`, or `hlm-sidebar` is rendered
- **THEN** it paints PRMS brand colours
- **AND** no shadcn default palette is visible anywhere in the application

#### Scenario: A subtree overrides a token

- **WHEN** a scoped selector redefines a raw variable for its subtree — for example the sidebar setting its own `--sidebar` value
- **THEN** descendants of that scope resolve the overridden value at runtime
- **AND** elements outside the scope keep the root value

#### Scenario: A supplied value is not a valid colour

- **WHEN** a raw variable is given a value that is not a parseable colour, such as a bare channel triplet
- **THEN** the failure is caught before merge, because such a value resolves to transparent and disappears silently rather than erroring

### Requirement: Components consume semantic tokens, not ramp stops

Surfaces, borders, text, status chips, charts, and elevation SHALL be expressed through semantic tokens (for example a surface token, a border token, a text-ramp token, a focus-ring token) rather than by reaching directly into a numbered ramp stop.

Status foreground/background pairs SHALL be treated as fixed units: a foreground SHALL NOT be recombined with a different background, and no additional status colour SHALL be invented.

Brand colour SHALL be reserved for navigation and actions. Content surfaces SHALL be neutral — no violet border and no tinted background inside the content area, except the program band, brand chips, and the primary action.

#### Scenario: Styling a content-area card

- **WHEN** a card or panel inside the content area needs a boundary
- **THEN** it uses the neutral border token
- **AND** a brand-coloured border is used only to express a selected state

#### Scenario: Indicating keyboard focus

- **WHEN** an interactive control receives keyboard focus
- **THEN** the indicator is rendered from the focus-ring token, which is derived from the main action colour
- **AND** the indicator meets the 3.0:1 non-text threshold against its surroundings

#### Scenario: Displaying a report status

- **WHEN** a status chip is rendered
- **THEN** it uses one of the defined foreground/background pairs exactly as paired

### Requirement: Numeric and code content uses the monospace face

Result codes, identifiers, and numeric figures SHALL be rendered in the monospace face with tabular figures, so that values align vertically in columns and are right-aligned where they appear in a table.

The monospace face SHALL be used only for codes and figures. Display and UI text SHALL remain in the sans face already established for the application.

#### Scenario: Rendering a figures column

- **WHEN** numeric values are rendered in a column
- **THEN** they use the monospace face with tabular figures and are right-aligned
- **AND** digits occupy identical width so the column scans vertically

#### Scenario: Rendering an entity code

- **WHEN** an identifier such as a program or area-of-work code is displayed
- **THEN** it is rendered in the monospace face

### Requirement: Dark surfaces share one token

All dark chrome surfaces — application sidebar, footer, unauthenticated backgrounds, dark panels, and dark modal headers — SHALL derive from the same dark brand token, so that rebranding the dark chrome is a single value change and cannot drift between surfaces.

Every foreground rendered on a dark surface SHALL meet its contrast threshold against that surface.

#### Scenario: Rebranding the dark chrome

- **WHEN** the dark surface token's value changes
- **THEN** every dark surface in the application changes together
- **AND** no template or component style is edited to achieve it

#### Scenario: A dark surface would carry dark text

- **WHEN** a foreground on a dark surface would fall below its threshold
- **THEN** it is repointed to an on-dark foreground token before merge

### Requirement: A token change is verified visually, not only by build

A change to the token layer SHALL NOT be considered complete on the basis of a passing build, a passing lint, or a passing unit-test run. It SHALL be verified by inspecting the rendered application.

Verification SHALL cover, at minimum: the unauthenticated entry screen, the global application header, any surface that renders white text on a brand fill, status and completeness indicators, an active step or selected state, and a focused form control.

Test suites that assert literal colour values SHALL be updated in the same change as the token values they assert.

#### Scenario: Completing a token change

- **WHEN** the token layer has been edited
- **THEN** before/after captures of the required surfaces are produced and reviewed
- **AND** the lint, unit-test, coverage-threshold, and component-test gates are all green

#### Scenario: A spec asserts a colour literal

- **WHEN** a token value changes and a test asserts the previous literal
- **THEN** that test is updated in the same change
- **AND** the suite is never left red between commits

#### Scenario: A translucent overlay derives from a changed token

- **WHEN** a token is consumed through an alpha overlay whose hue shift no automated test can detect
- **THEN** those surfaces are added to the visual review list explicitly
