## Why

On the General Information section of a P25 result, the Lead Contact Person field's clear (`✕`) button renders **on top of** the floating "alerts" feedback widget anchored bottom-right, overlapping its arrow and the missing-fields text. This is a visual defect introduced alongside the P2-2960 Lead Contact Person field: the button's `z-index: 10` outranks the feedback widget's `z-index: 5`. **Jira: P2-2960** (UI polish follow-up).

This change is **frontend-only**. No backend work is required.

## What Changes

- Give the Lead Contact Person field's `.contact-select-wrapper` its own CSS stacking context so the clear button's `z-index` is confined locally and can no longer paint over the global fixed feedback widget.
- No markup, TypeScript, or behavioural change: the clear button keeps working and still sits above the input it overlays.

## Capabilities

### New Capabilities
- `lead-contact-clear-button-layering`: defines the stacking/layering contract for the Lead Contact Person clear button — it must never paint over the global fixed feedback ("alerts"/save) widget, while remaining above the input field it controls.

### Modified Capabilities
<!-- None — no existing spec's requirements change. -->

## Impact

- **Code (frontend, 1 file):** `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.component.scss` — add `isolation: isolate` to `.contact-select-wrapper`.
- **Related component (unchanged):** `onecgiar-pr-client/src/app/custom-fields/save-button/save-button.component.scss` — the fixed feedback widget at `z-index: 5` whose layering must win.
- **SDD baseline:** touches client UI layering; consistent with `docs/system-design/design.md` (component layering / overlays). No API, DTO, or `docs/detailed-design/detailed-design.md` data-model impact.
- **APIs / dependencies / backend:** none.
