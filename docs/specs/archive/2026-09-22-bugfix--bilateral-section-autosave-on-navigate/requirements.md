# `bugfix/bilateral-section-autosave-on-navigate` — Requirements

**Depth:** Lite (Bug Mode) · **Status:** draft · **Ticket(s):** none (reported by santiago.sanchez@cgiar.org, 2026-09-18)

## 1. Module / Feature

- **Module:** `bilateral` (`pages/bilateral/`, TRD "Bilateral" module)
- **Sub-feature:** Section navigation (Next/Back/side-rail) in the Bilateral result editor
- **Owner:** Frontend (onecgiar-pr-client)
- **Status:** draft

## 2. Context

The Bilateral result editor (`BilateralResultCreatorComponent`) renders every section under one route and switches between them via a local `openSectionName` signal. Clicking **Next**, **Back**, or a different section in the side rail calls `moveSection()` → `selectSection()`, which today shows a native `window.confirm(...)` — *"This section has unsaved changes. Keep them in this session and continue?"* — whenever `BilateralAutoSaveService.hasPendingFor(current)` is true, and never saves the pending edits itself (confirmed root cause: `proposal.md` §3). The W1/W2 (Result Detail) editor solves the same problem differently and correctly: `SectionBottomBarComponent.goNext()` flushes the section's save via `SaveButtonService.saveAndSettle()` **before** navigating, with no popup, and the route-based `UnsavedChangesGuard` silently auto-saves as a fallback if anything remains dirty. The user asked for the same "no popup, auto-save on Next" outcome in Bilateral, scoped to Bilateral only — W1/W2 is a reference, not a change target.

Reference: `docs/prd.md` `US-S5` ("autosave / explicit save with clear error messages so that I never lose entered work"). `docs/trd/trd.md` — Bilateral module section-editor pattern. `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` — documents today's (soon-to-change) contract: *"navegar o destruir el editor nunca escribe"* (navigating or destroying the editor never writes).

## 3. In Scope / Out of Scope

### In scope

- Making Next, Back, and side-rail section switches in the Bilateral editor auto-save the currently open section's pending edits before navigating, with no browser popup.
- Keeping the user on the current section, with the existing save-failure error affordance, when the auto-save fails — never a silent navigate-away or a silent data loss.
- Updating `bilateral-result-creator/CLAUDE.md`'s now-outdated "navigating never writes" statement in the same change.
- A regression test proving the popup is gone and the flush happens before navigation.

### Out of scope

- Any change to W1/W2 (Result Detail)'s `SectionBottomBarComponent`/`UnsavedChangesGuard` flow — reference only.
- Wiring Bilateral into the shared route-based `UnsavedChangesGuard`/`CanDeactivate`/`UnsavedNavigationIntentService` machinery — structurally inapplicable since Bilateral's sections are not separate routes.
- Changing the explicit "Save draft" button's behavior (`triggerManualSave()`) — already correct.
- Any "keep or discard" choice for the user — edits are always kept and saved silently, matching W1/W2.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Center/Initiative user editing a Bilateral result) | Clicking Next/Back/a section tab saves silently; no more native confirm popup; a genuine save failure keeps them on the section with a visible reason instead of losing the edit or discarding silently. |

## 5. User Stories

- **`BIL-US-1`** — As a result submitter editing a Bilateral result, I want Next/Back to save my current section automatically, so that I never see an unsaved-changes popup and never lose an edit by navigating away.
- **`BIL-US-2`** — As a result submitter, I want to be told and kept on the section if the auto-save fails, so that I don't lose work or think it saved when it didn't.

## 6. Functional Requirements

### Required (MUST)

- **`BIL-R-1`** When the user clicks Next, Back, or a different section in the side rail while the currently open section has pending unsaved edits (`BilateralAutoSaveService.hasPendingFor(current)` is true), the system MUST flush those edits via `BilateralAutoSaveService.flush(...)` for the current section before switching `openSectionName`, and MUST NOT show a `window.confirm(...)` dialog or any other blocking prompt.
- **`BIL-R-2`** If the flush settles with an error (`BilateralAutoSaveService.hasErrorFor(current)` true after settling), the system MUST NOT switch sections; it MUST keep the current section open and surface the existing save-failure messaging (including `lastErrorMessageFor(current)` when available), mirroring the message shown by the explicit "Save draft" path (`triggerManualSave()`).
- **`BIL-R-3`** When the currently open section has no pending edits (`hasPendingFor(current)` is false), the system MUST switch sections immediately with no flush call and no added delay.
- **`BIL-R-4`** The fix MUST apply uniformly to Next, Back, and direct side-rail section selection — all three currently route through `selectSection()`/`moveSection()`.

### Should (SHOULD)

- **`BIL-R-10`** `bilateral-result-creator/CLAUDE.md` SHOULD be corrected in the same change to reflect that Next/Back now write (like Save draft), with its `Verified:` line re-stamped, per the client's "Folder docs" convention.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Correctness** | No stored data is lost or duplicated by the flush-on-navigate path; a section with nothing pending behaves identically to today (no new network call). |
| **Consistency** | Behavior matches W1/W2's Next-auto-saves UX from the user's perspective (no popup, silent save, error keeps user on section) without reusing W1/W2's route-based guard machinery (structurally inapplicable here). |
| **Accessibility** | Removing `window.confirm(...)` removes a native modal that traps focus outside the app's own a11y patterns — no new custom dialog is introduced, so no new a11y surface is added. |
| **Read-only mode** | The fix MUST respect `BilateralResultCreatorComponent`'s existing read-only gate (`isFormReadOnly()` / `autoSaveService.setReadOnly()`) — a read-only session has nothing pending to flush, so no behavior change is expected there; regression test SHOULD confirm no flush call fires in read-only mode. |

## 7a. Defect Classes & Verification Gates

| Defect class this spec can produce | Gate that catches it |
|---|---|
| `window.confirm(...)` still appears on Next/Back with pending edits | Jest component test spying on `window.confirm` (must not be called) and asserting `flush()` was called instead, for a section with pending edits (`BIL-AC-1`). |
| Section switches away before the flush settles, losing the edit | Jest test asserting `openSectionName` only changes after the flushed promise resolves (fake timers / deferred promise), and that a failed flush leaves `openSectionName` unchanged (`BIL-AC-2`). |
| Flush fires unnecessarily for a clean section (added latency / an extra PATCH) | Jest test asserting `flush()` is not called when `hasPendingFor()` returns false (`BIL-AC-3`). |
| Regression to read-only mode (a flush call fires while read-only) | Jest test with `isFormReadOnly()` true, asserting no flush is attempted on Next/Back (`BIL-AC-4`). |

No visual/layout defect class applies — this is a save-sequencing behavior change with no new markup or styling; the only UI-visible change is the absence of the native `confirm()` dialog, itself covered by `BIL-AC-1`.

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BIL-AC-1` | The active Bilateral section has a pending edit (`hasPendingFor` true) | The user clicks Next | No `window.confirm(...)` appears; `autoSaveService.flush(...)` is called for the active section. |
| `BIL-AC-2` | The flush from `BIL-AC-1` resolves with an error (`hasErrorFor` true) | The flush settles | `openSectionName` stays on the original section and the existing save-failure message (including `lastErrorMessageFor`, when present) is shown. |
| `BIL-AC-3` | The active Bilateral section has no pending edit (`hasPendingFor` false) | The user clicks Next | `openSectionName` switches immediately with no `flush()` call. |
| `BIL-AC-4` | The editor is in read-only mode (`isFormReadOnly()` true) | The user clicks Next/Back | No `flush()` call is attempted; navigation behaves as it does today for read-only sessions. |

Cross-cutting project ACs that already apply (not restated): `AC-9` Security and secrets (no new logging of sensitive data introduced by this change).

## 9. Dependencies & Assumptions

### Upstream dependencies

- `BilateralAutoSaveService` (`pages/bilateral/services/bilateral-auto-save.service.ts`) — `flush()`, `hasPendingFor()`, `hasErrorFor()`, `lastErrorMessageFor()`, `getEndpointKeys()` — all already exist and are exercised today by `triggerManualSave()`.

### Downstream consumers

- None beyond `BilateralResultCreatorComponent` itself — `moveSection()`/`selectSection()` are internal to this component; no other component calls them.

### Assumptions

- `autoSaveService.getEndpointKeys(activeSection)` correctly resolves endpoint keys for every section, not only the ones `triggerManualSave()` is invoked from today — needs confirmation during implementation (flagged as `BIL-OQ-2`).

## 10. Open Questions

- **`BIL-OQ-1`** Should a flush failure on Next/Back reuse the exact "Save draft" error message/UI as-is, or does navigation-triggered failure need a distinct message (e.g. "Couldn't save before leaving — fix the error and try again")? Does not block `design.md` — default to reusing the existing Save-draft error affordance verbatim unless the user says otherwise.
- **`BIL-OQ-2`** Does `autoSaveService.getEndpointKeys(section)` resolve correctly for every section, or only the ones exercised by `triggerManualSave()` today? **Blocks `design.md`** if any section returns an empty/incorrect key set — needs a quick check against `BilateralAutoSaveService`'s implementation before finalizing the design.

## 11. Out-of-Band Notes

None.

## Required cross-references

- `docs/prd.md` — `US-S5` (autosave / explicit save with clear error messages).
- `docs/trd/trd.md` — Bilateral module (`pages/bilateral/`).
- `docs/specs/bugfix/bilateral-section-autosave-on-navigate/proposal.md` — confirmed root cause and reproduction (source of truth for this spec).
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` — documents the current (to-be-corrected) "navigating never writes" contract.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` — documents the W1/W2 reference pattern ("Next guarda la sección antes de navegar").
