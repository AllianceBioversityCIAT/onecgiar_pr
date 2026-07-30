## Why

In the results list table, the **Center** column shows the literal text `"Undefined"` whenever a result has no lead center. This happens when the result is led by an **external partner** (not a CGIAR center), so the backend returns an empty/null `lead_center`. The template falls back to the hardcoded string `'Undefined'`, which is confusing for users and was reported as a QA bug (P2-3049).

## What Changes

- Replace the hardcoded fallback `|| 'Undefined'` with an **empty string** `''` so the Center cell renders blank instead of `"Undefined"` when there is no lead center.
- Leave a code `TODO (P2-3049)` comment documenting that a future change should display the **lead partner** in this column when no lead center exists (i.e. take partners into account, not only centers).

Out of scope (documented for the future, not implemented now): actually resolving and rendering the lead partner name when `lead_center` is absent.

## Capabilities

### New Capabilities
- `results-list-center-column`: Defines how the Center column of the results list renders a result's lead center, including the empty-state behavior when no lead center exists.

### Modified Capabilities
<!-- none: this is a new spec capturing existing + corrected behavior -->

## Impact

- Frontend only. Single template line + a code comment.
- File: `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.html` (line 124).
- No backend, API, or data-model changes. No new dependencies.
