# Requirements: the quality-check drawer never offers a Submit the server will reject as stale

| Field | Value |
|---|---|
| Spec Path | `changes/qa-submit-stale-guard` |
| Type | Change (bug-shaped UX) · Depth **Lite** · Approval Mode `gated` |
| Module | client `pages/bilateral/` — AI quality-assessment drawer |
| Parent specs | `bilateral/qa-ai-traffic-light` (`BIL-QAI-*`) · `bilateral/qa-ai-verdict-drawer` (`BIL-QAD-*`) |
| Origin | User, 2026-09-29, after `BadRequestException: The quality assessment is stale` ×3 in 27 s on TEST |
| Code | `QSG` |

## 1. Problem

Submit sends the `assessment_id` the drawer holds. The server rebuilds the payload, compares hashes, and rejects the request when that assessment is not the latest or not current (`bilateral-center.service.ts:2297-2306`).

The drawer already hides Submit and explains why when `is_current === false` (`bilateral-quality-assessment-dialog.component.html:74-75`, `:169`). However, it reads an `is_current` captured **when the assessment was fetched**, and nothing refreshes that value.

| Path | Where | What goes wrong |
|---|---|---|
| **"View AI assessment"** | `openStored()` (`bilateral-quality-assessment-ui.service.ts:167-169`) | Reopens the in-memory row without asking the server. Edits made since the check stay invisible, so Submit shows. |
| **After a rejected Submit** | `submit()` error handler (`:193`) | Returns the drawer to `deciding` with Submit still shown. Every retry hits the same 400, which matches the three rejections 13 s apart. |

## 2. Requirements

- **`QSG-R-1`** When the drawer opens a stored assessment, it MUST show the server's current `is_current` for that result, never the value captured when the assessment was loaded.
- **`QSG-R-2`** After a rejected Submit, the drawer MUST re-read the latest assessment. When that assessment is not current, or is not the one it holds, the drawer MUST hide Submit and show the existing "run it again" message.
- **`QSG-R-3`** If that re-read fails, the drawer MUST fail closed: Submit hidden and the stale message shown. It must NOT re-offer a Submit whose currency is unknown.
- **`QSG-R-5`** *(added at the Phase 3 gate, user 2026-09-29: "si el result ya está submitted siguen saliendo los botones de Make adjustments y Submit for review")* When the result is not editable (status outside Editing/Draft, e.g. Pending Review after a submit), the drawer MUST show the verdict read-only. It shows no "Make adjustments", no Submit, and no "run it again" line. Close (✕, Escape, scrim) still works.
- **`QSG-R-4`** The server guard is unchanged and stays the enforcing gate. Only the client stops offering a Submit the guard would refuse.

## 3. Scenarios

### Scenario: Reopen after an edit (`QSG-R-1`)
- GIVEN a completed check is on the rail with `is_current: true`
- AND the user then edits and saves the result
- WHEN they click "View AI assessment"
- THEN the drawer shows *"This assessment predates your latest edits…"* and no Submit button
- BUT it must NOT show Submit on the strength of the stored `is_current: true`

### Scenario: Rejected Submit is not re-offered (`QSG-R-2`)
- GIVEN the drawer shows Submit
- WHEN the server rejects the Submit as stale
- THEN the drawer re-reads the latest assessment, hides Submit, and shows the stale message
- AND IT MUST NOT let the user send the same `assessment_id` again

### Scenario: Submitted result is read-only (`QSG-R-5`)
- GIVEN the result is in Pending Review
- WHEN the user opens "View AI assessment"
- THEN the drawer shows the verdict and sections with no footer action buttons
- AND IT MUST still close via ✕ / Escape
- BUT it must NOT show "Make adjustments" or Submit

### Scenario: Current assessment still submits (`QSG-R-1`, `QSG-R-2`)
- GIVEN no edit happened since the check
- WHEN the user reopens the drawer
- THEN Submit is shown and works, exactly as today

## 4. Defect classes and their gates

| # | Defect | Gate |
|---|---|---|
| D1 | Reopen shows Submit on a stale row | Jest on the UI service: the stored row is current, the `GET latest` stub returns `is_current: false`, and after `openStored()` the stale flag is set |
| D2 | Retry after a rejected Submit is still offered | Jest: submit fails with a 400, the re-read returns not current, and the drawer state is stale |
| D3 | Unknown currency re-offers Submit | Jest: the re-read errors, and the result is fail-closed |
| D4 | Regression: a current row loses its Submit | Jest: the re-read returns current, and Submit stays |
| D5 | Rendered button still visible | Jest on the dialog: render with `is_current: false` and assert no Submit button in the DOM (already covered; re-run) |
| D7 | A submitted result still offers Make adjustments / Submit | Jest on the dialog: `readOnly: true`, then assert no footer buttons and no stale line in the rendered DOM; and a creator-binding assertion that the dialog gets `readOnly` from the form's editability |
| D6 | Non-deterministic `content_hash` makes every row permanently stale | **No automated gate here.** Substitute: the DB check in `design.md` `P-5`, owned by the user at the HITL pause |
