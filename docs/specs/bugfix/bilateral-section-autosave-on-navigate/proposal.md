# Proposal: Bilateral section editor must auto-save on Next/Back instead of prompting a browser confirm

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/bilateral-section-autosave-on-navigate` |
| Slug | `bilateral-section-autosave-on-navigate` — derived from free-text argument (bilateral Next/Back showing an "unsaved changes" popup instead of auto-saving like W1/W2) |
| Type | **Bug** |
| Approval Mode | `gated` (default — no end-to-end mandate given) |
| Requested by | santiago.sanchez@cgiar.org |
| Date | 2026-09-18 |
| Scope note | User explicitly limited this to **Bilateral only** — W1/W2 (Result Detail) is the reference behavior, not part of the change. |

## 2. Intent

When a user edits a field in a Bilateral result section and then clicks **Next** or **Back**, the section's pending edits must be saved automatically before navigating, with no browser popup. This must match the UX already shipped in the W1/W2 (Result Detail) forms.

## 3. Problem / Current Behavior — confirmed root cause

### Observed Symptom
In the Bilateral result editor, editing a field and then clicking Next/Back triggers a native browser `confirm()` dialog: *"This section has unsaved changes. Keep them in this session and continue?"* This does not happen in W1/W2, where Next silently saves the section and moves on.

### Reproduction Steps
1. Open a Bilateral result in the editor (`pages/bilateral/pages/bilateral-result-creator`).
2. Edit any field in a section (creating a pending auto-save entry) without clicking "Save draft".
3. Click **Next** (or a different section in the side rail).
4. A `window.confirm(...)` dialog appears asking to keep or discard the change, instead of silently saving and moving on.

### Root Cause (confirmed in code)
There are two independent, non-overlapping navigation-guard mechanisms in this codebase, and Bilateral was never wired into the one that does auto-save:

**W1/W2 (Result Detail, `rd-*`) — auto-saves, no popup:**
- `SectionBottomBarComponent.goNext()` (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/section-bottom-bar/section-bottom-bar.component.ts:251`) resolves the destination link first, then — when `autoSavesOnNext()` is true (`fieldsManagerSE.isSectionAutoSaveOnNext2026()`, gated by phase year) — calls `saveThenGo(link, queryParams)`.
- `saveThenGo` (`section-bottom-bar.component.ts:273`) awaits `SaveButtonService.saveAndSettle(() => this.clickSave.emit())`; only on a non-`'failed'` outcome does it call `navigateTo(link, queryParams)`.
- `navigateTo` calls `UnsavedNavigationIntentService.markSilent()` **before** `router.navigate(...)`, so if anything is still dirty, the route-level `UnsavedChangesGuard` (`shared/guards/unsaved-changes.guard.ts`, registered per-section via `canDeactivate`) saves silently instead of opening the Save/Discard dialog.
- This entire mechanism is route-based (`CanDeactivate` fires on `router.navigate` between per-section routes) and is wired only under `rd-*` routing modules — confirmed zero references under `pages/bilateral/`.

**Bilateral — no auto-save, ad hoc `window.confirm`:**
- `BilateralResultCreatorComponent.selectSection()` (`onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts:625-634`):
  ```ts
  selectSection(section: BilateralEditorSection): void {
    const current = this.openSectionName();
    if (current === section) return;
    if (this.autoSaveService.hasPendingFor(current)) {
      const shouldContinue = window.confirm('This section has unsaved changes. Keep them in this session and continue?');
      if (!shouldContinue) return;
    }
    this.pendingOpen.set(false);
    this.openSectionName.set(section);
  }
  ```
- `moveSection(direction)` (line ~638, invoked by the template's Back/Next buttons) simply resolves the target section and delegates to `selectSection()`.
- Bilateral does not use `router.navigate` for section switching — all sections live under one route and `openSectionName` is a local signal — so the shared route-based `UnsavedChangesGuard` **structurally cannot apply here** even if wired in.
- `BilateralAutoSaveService` (`pages/bilateral/services/bilateral-auto-save.service.ts`) already has everything needed to fix this without new plumbing: `flush(endpointKeys)` (line 194) PATCHes pending fields for a section, and `hasPendingFor()` / `hasErrorFor()` / `lastErrorMessageFor()` exist for outcome checks. Today `flush()` is only invoked from the explicit "Save draft" button path (`triggerManualSave()`, line ~788, with its own `waitForSectionSave()` helper, line ~870) — never from `moveSection`/`selectSection`.

The bilateral component's own folder guide already states the current (soon-to-change) contract: *"navegar o destruir el editor nunca escribe"* (navigating or destroying the editor never writes) and *"Save draft dice la verdad. Guarda parcial (como W1/W2)"* — i.e. today only the explicit Save-draft button writes; this proposal makes Next/Back write too, the same way Save draft already does.

### Impact & Scope
- Affects every Bilateral result editor session where a field is edited and the user then clicks Next, Back, or a different section in the side rail.
- No data-integrity risk today (nothing is silently lost — the popup lets the user keep editing), but it is a real UX regression relative to W1/W2 and a support-ticket generator (unexpected native browser dialogs read as broken software).
- No migration, no schema change — purely a client-side navigation/save-sequencing fix reusing an existing service.

### Fix Strategy
Not cosmetic — it changes save-triggering behavior and touches the folder's own documented contract, so this is not a `/akili-quick` candidate. Route: `/akili-specify` (Lite) in **Bug Mode**, with a mandatory regression test (red before / green after) proving:
1. Editing a field then clicking Next/Back flushes the pending changes for the *current* section (via `autoSaveService.flush()`) before switching `openSectionName` — no `window.confirm` call.
2. If the flush fails (`hasErrorFor()` true after settling), the section does **not** navigate away silently — the user stays on the section and sees the existing error affordance (mirroring how `triggerManualSave()` already surfaces save failures), rather than losing the edit or seeing a native popup.
3. A section with no pending changes (`hasPendingFor()` false) navigates immediately, with no flush call and no dialog — no added latency for the common case.

Smallest safe correction, reusing code already proven by `triggerManualSave()`:
1. In `selectSection()` (or a small helper it and `moveSection()` both call), replace the `window.confirm(...)` branch with: if `autoSaveService.hasPendingFor(current)`, call `autoSaveService.flush(...)` for the current section's endpoint keys and await settlement via the existing `waitForSectionSave()` pattern.
2. Only switch `openSectionName` once the flush has settled without error; on error, keep the section open and reuse the existing save-failure UI/messaging path instead of `window.confirm`.
3. Update `bilateral-result-creator/CLAUDE.md`'s "navegar o destruir el editor nunca escribe" line (and re-stamp its `Verified:` line in the same commit) per the client's own "Folder docs" convention, since this proposal changes that documented behavior.

## 4. Proposed Outcome

Clicking Next or Back in the Bilateral editor auto-saves the current section's pending edits silently (via `BilateralAutoSaveService.flush()`) before navigating — identical UX to W1/W2's Next. No native browser popup appears. A genuine save failure keeps the user on the section with a visible error instead of silently discarding or losing work.

## 5. Scope

- `BilateralResultCreatorComponent.selectSection()` / `moveSection()` — replace the `window.confirm` branch with a flush-then-navigate flow.
- Reuse of `BilateralAutoSaveService.flush()`, `hasPendingFor()`, `hasErrorFor()`, `lastErrorMessageFor()`, and the existing `waitForSectionSave()` helper already exercised by `triggerManualSave()`.
- `bilateral-result-creator/CLAUDE.md` — update the now-outdated "navigating never writes" statement and re-stamp `Verified:`.
- Regression tests covering: dirty-section auto-save-on-navigate, save-failure stays on section, clean-section navigates with no flush.

## 6. Non-Goals

- Not touching W1/W2 (Result Detail) — its `SectionBottomBarComponent`/`UnsavedChangesGuard` flow is the reference pattern only, not a change target.
- Not wiring Bilateral into the shared route-based `UnsavedChangesGuard`/`CanDeactivate`/`UnsavedNavigationIntentService` machinery — that guard fires on `router.navigate` between routed sections, and Bilateral's sections are not separate routes (all render under one route, switched via a local signal), so that mechanism does not structurally apply here.
- Not changing the explicit "Save draft" button's behavior — it already flushes correctly via `triggerManualSave()`.
- Not adding a "keep or discard" choice for the user — per the desired behavior (matching W1/W2), edits are always kept and saved silently; there is no discard path.

## 7. Affected Users, Systems, And Specs

- **Users:** Any Center/Initiative user editing a Bilateral result across multiple sections.
- **Systems:** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts` (`.html` for the Next/Back buttons), `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-auto-save.service.ts` (consumed, not modified), `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` (doc update).
- **Related specs:** No open AKILI spec found under `docs/specs/bilateral/` covering section navigation/autosave; nearest reference is the W1/W2 pattern documented in `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` ("Next guarda la sección antes de navegar").

## 8. Visual Reference

- Source: None — this is a behavioral/interaction fix (no visual/layout change). The user described the desired behavior by reference to the existing, already-shipped W1/W2 Next/Back UX.
- Location: n/a.
- Notes: No mockup needed; the reference implementation to mirror already exists and is running in production (W1/W2 Result Detail forms).

## 9. Requirement Delta Preview

Not applicable — this proposal follows the Bug track (see §3 Bug Diagnosis above, which replaces the Requirement Delta Preview per the `/akili-propose` template).

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Flush-before-navigate inside `selectSection()`/`moveSection()` (recommended)** | Replace `window.confirm(...)` with `autoSaveService.flush()` + await settlement, reusing the pattern already proven by `triggerManualSave()`/`waitForSectionSave()`. Only navigate on success. | Smallest diff, no new services, mirrors W1/W2's save-then-navigate shape, reuses code already covered by existing behavior (Save draft). |
| B — Wire Bilateral into the shared `UnsavedChangesGuard`/`CanDeactivate` machinery | Convert each Bilateral section into its own route so the existing W1/W2 guard applies unmodified. | Rejected as oversized: it would require restructuring Bilateral's single-route, signal-driven section switching into per-section routing — a much larger, riskier change for the same outcome Option A achieves with the service Bilateral already has. |
| C — Debounced background auto-save independent of Next/Back | Auto-save on a timer/blur regardless of navigation, removing the need to flush specifically on Next/Back. | Doesn't guarantee the edit is persisted *before* the user leaves the section (race with the timer), and changes save cadence for the whole editor, not just navigation — larger surface than the reported problem needs. |

**Recommended:** Option A — reuses existing, already-tested primitives (`flush`, `hasPendingFor`, `hasErrorFor`, `waitForSectionSave`) with the smallest possible diff, and produces the exact UX parity with W1/W2 that was requested.

## 11. Risks, Dependencies, And Open Questions

- **Open question:** should a flush failure on Next/Back show the same error affordance as "Save draft" (inline message near the field/section), or does it need a distinct message since the trigger was navigation rather than an explicit save click? Resolve during `/akili-specify`.
- **Risk:** `flush()` currently targets specific `endpointKeys` per section — confirm during implementation that `selectSection()`/`moveSection()` can resolve the correct endpoint keys for *any* section (not just the ones `triggerManualSave()` is invoked from) before generalizing the call site.
- **Dependency:** none external — reuses `BilateralAutoSaveService`, already present and used by the Save-draft path.
- **No migration needed** — client-only behavioral fix.

## 12. Success Criteria

- Editing a field and clicking Next or Back in the Bilateral editor auto-saves the section silently and navigates — no `window.confirm` dialog appears.
- A genuine save failure on Next/Back keeps the user on the section with a visible error, never a silent data loss and never a native popup.
- A section with nothing pending navigates immediately with no added flush call.
- `bilateral-result-creator/CLAUDE.md`'s "navigating never writes" statement is corrected and re-stamped in the same change.

## 13. Next Step

```text
/akili-specify bugfix/bilateral-section-autosave-on-navigate
```
Bug Mode — convert the confirmed root cause above into a fix plan and a mandatory regression test.
