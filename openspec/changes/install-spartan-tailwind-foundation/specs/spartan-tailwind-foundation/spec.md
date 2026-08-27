## ADDED Requirements

### Requirement: Tailwind 4 + Spartan installed on Angular 21
The client SHALL have Tailwind CSS 4 and Spartan (`@spartan-ng/brain` + CLI) installed and configured, resolving on Angular 21.

#### Scenario: Dependencies present
- **WHEN** the change is complete
- **THEN** `package.json` includes `tailwindcss@^4`, `@tailwindcss/postcss`, `@spartan-ng/brain`, and the Spartan CLI (dev), and `npm install` completes (with `--legacy-peer-deps`)

#### Scenario: App still builds
- **WHEN** `npm run build:dev` runs
- **THEN** the build succeeds with Tailwind + Spartan wired in

### Requirement: PrimeNG coexists without visual regression
Installing Tailwind SHALL NOT restyle existing PrimeNG components; the global Tailwind preflight reset is not applied app-wide.

#### Scenario: Preflight not applied globally
- **WHEN** the Tailwind CSS entry is inspected
- **THEN** it does not import `tailwindcss/preflight.css` globally (theme tokens + opt-in utilities + the Spartan hlm preset are imported, preflight is omitted or scoped)

#### Scenario: PrimeNG screens unchanged
- **WHEN** a PrimeNG-heavy screen (Result Detail with p-table, p-dialog, buttons, form fields) is rendered before and after this change
- **THEN** it looks and behaves identically — no reset of borders, buttons, spacing, or typography

#### Scenario: PrimeNG still installed
- **WHEN** the change is complete
- **THEN** `primeng` remains a dependency and no PrimeNG import or template was modified

### Requirement: A Spartan Helm component renders
At least one Spartan `hlm` component SHALL render correctly, proving the Tailwind + Spartan pipeline works end to end.

#### Scenario: hlm-button renders styled
- **WHEN** an `hlm-button` (`<button hlmBtn>`) is placed on a dev surface and the app runs
- **THEN** it renders with Spartan's Tailwind-based styling (not an unstyled native button)

### Requirement: Tailwind utilities are opt-in only
Tailwind utility classes SHALL apply only where explicitly used, not to un-classed existing markup.

#### Scenario: Un-classed elements untouched
- **WHEN** an existing element without Tailwind classes is rendered
- **THEN** its appearance is unchanged by the Tailwind installation
