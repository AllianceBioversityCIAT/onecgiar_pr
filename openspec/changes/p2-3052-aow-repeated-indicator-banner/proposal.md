## Why

In TOC, Science Programs (P/As) can plan the **same indicator twice** within a single High-Level Output (HLO) or Outcome — once per separate target — to allow granular planning (e.g. assigning a distinct $ value to each target). When this is retrieved in the Reporting Tool's **Area of Work (AoW)** page, the two entries look identical and appear duplicated. This is **not an error** and the data is not duplicated, but users have no way to know that from the UI.

Ticket **P2-3052** (parent P2-2928 "TOC Improvements") requests an always-visible message that explains this on the AoW page, so users stop reporting it as a bug.

## What Changes

- Add a **fixed, always-visible informational banner** on the AoW page, placed **directly below the two tabs** (High-Level Outputs / Outcomes) and above the indicators table — so it applies to both tabs.
- The banner uses a **soft yellow warning style** (the team's chosen "Diseño 3" pill), built with the project's existing yellow design tokens (no new hex literals).
- The message text (final, including the addition requested by the reporter Ángel Jarrín — `in a HLO/Outcome`):
  > "When the same indicator is repeated twice in a HLO/Outcome, this is because the P/A planned the indicator with two separate targets to facilitate granular planning. Reporting reflects data originally recorded without aggregating them."
- The banner is **static** (not conditional on the data) per the acceptance criteria — shown always.

## Capabilities

### New Capabilities
- `aow-repeated-indicator-banner`: A static informational banner on the TOC AoW page that explains why an indicator may appear repeated (two separate targets planned in TOC), shown below the High-Level Outputs / Outcomes tabs.

### Modified Capabilities
<!-- None — this is additive UI copy; no existing spec-level behavior changes. -->

## Impact

- **Frontend only** (`onecgiar-pr-client`). No backend, API, or data-model changes.
- Affected files:
  - `src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/entity-aow-aow.component.html` — insert the banner markup between the tabs and the `entity-aow-aow_content` block.
  - `src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/entity-aow-aow.component.scss` — banner styling using `--pr-color-yellow-*` tokens.
- No new dependencies. No routing, guard, interceptor, or state changes.
- Accessibility: banner is decorative/informational text; the warning icon is non-essential (text carries the meaning).
