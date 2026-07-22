## ADDED Requirements

### Requirement: Persistent, non-blocking context panel
The reporting flow SHALL provide a persistent side panel that gives the user the information needed to continue without leaving the current step. The panel SHALL be non-blocking (it never prevents interacting with the main flow).

#### Scenario: Panel accompanies the flow
- **WHEN** the user is anywhere in the reporting flow (decision step, stepper, or indicator selection)
- **THEN** a context panel SHALL be available alongside the main content and SHALL update its content to match the current step

#### Scenario: Panel does not block the flow
- **WHEN** the panel is open
- **THEN** the user SHALL still be able to interact with the main flow, and dismissing/collapsing the panel SHALL not lose their progress

### Requirement: Category and typology glossary with examples
The panel SHALL present plain-language definitions and concrete examples for the indicator categories and typologies relevant to the current step.

#### Scenario: Explaining the current category
- **WHEN** the user is choosing or has selected an indicator category (e.g. Capacity sharing)
- **THEN** the panel SHALL show a plain-language definition and at least one concrete example for that category, sourced from the backend when available and from a maintained front-side glossary otherwise

### Requirement: Already-reported awareness
The panel SHALL help the user avoid duplicates by surfacing results already reported in the relevant program/indicator context.

#### Scenario: Showing existing results in context
- **WHEN** the user is in a step where a program/indicator context is known
- **THEN** the panel SHALL list existing results already reported in that context (with their status) using existing data, so the user can recognize a duplicate before creating one

### Requirement: Accessible context panel
The panel and its interactive elements SHALL be operable by keyboard and expose accessible names; guidance SHALL be persistent text rather than relying on hover.

#### Scenario: Keyboard operation
- **WHEN** a user navigates with the keyboard
- **THEN** the panel's controls SHALL be focusable, operable with the keyboard, and have visible focus states
