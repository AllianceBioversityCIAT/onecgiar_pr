# Module Spec — `bilateral/bilateral-save-pill-not-clearing` — `requirements.md`

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** `bilateral-save-pill-not-clearing` (result-creator save-state signaling)
- **Owner:** Bilateral QA (Ángel) via Maria Camila Giraldo
- **Status:** `draft`
- **Ticket(s):** `P2-3962` (related — separate symptom from the two already-shipped fixes on this ticket)

## 2. Context

Follow-up to this session's `bugfix/bilateral-save-draft-footer` (`BSF-T-2`, shipped) and `bugfix/field-card-save-pill-truncation` (shipped). Both fixed *what the save-pill shows while unsaved/saving*. This spec fixes a separate, already-documented gap: **the pill never clears to "Saved" after a genuinely successful save**, in two of the three ways a Bilateral section's data reaches the server.

Root cause (confirmed by direct read, not inference, 2026-10-15): `app-field-card`'s "Unsaved changes" pill is driven by a component-local `edited` signal (`field-card.component.ts:114`), set `true` on any user edit (`markEdited`/`markEditedFromPointer`) and cleared **only** by one mechanism — an `effect()` (`field-card.component.ts:119-132`) that watches `SaveButtonService.savedTick` (a global counter signal, `save-button.service.ts:77`) and clears `edited` on every field-card mounted in the DOM (every section stays mounted under `[hidden]`, never destroyed — `bilateral-result-creator.component.html:269-293`).

Three places reach the server for a Bilateral section:

1. **`handleGiFieldSaveRequested()`** (GI drawer save) — bumps `savedTick`, **conditionally**, since 2026-09-29 (already shipped, comment at `bilateral-result-creator.component.ts:1065-1082`). The guard (`safeToBumpSavedTick`) exists because bumping is global: it only bumps when provably safe not to clear a genuinely-unsaved edit sitting in a different, currently-open section.
2. **`triggerManualSave()`** (the ordinary "Save draft" button, `bilateral-result-creator.component.ts:1233-1313`) — **never bumps `savedTick`**, confirmed by reading its full body: no call to `saveButtonSE.savedTick` anywhere. After a successful manual save with real changes, every field-card in that section still shows "Unsaved changes".
3. **`selectSection()`** (navigating away auto-flushes the section being left, `bilateral-result-creator.component.ts:860-884`) — **also never bumps `savedTick`**, same gap, independently confirmed. Navigating away after editing a field silently saves it, then navigating back still shows "Unsaved changes" on that field.

`schedulePayload()`'s own doc comment confirms there is no separate background/debounced autosave to account for — "despite its historic method name, this method never makes an HTTP request: explicit section Save draft owns that" (`bilateral-auto-save.service.ts:193-194`). So the three call sites above are the **complete** set of places a save reaches the server; (2) and (3) share the identical gap, (1) is the only one already fixed.

Relates to `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` (documents this gap since 2026-09-29 as "verified, not fixed, out of scope").

### Pivot — scope expanded after a `FATAL_FAIL` (2026-10-15)

`BSP-T-1`'s first attempt (fixing only call sites 2 and 3 above, reusing `handleGiFieldSaveRequested`'s existing `safeToBumpSavedTick` reasoning as-is) was rejected by the Reviewer with a `FATAL_FAIL`: the premise behind **all three** call sites' safety guards — "navigation always flushes the section being left first, so only the currently-open section can have a genuinely-unsaved edit" — is **false**. `selectSection()` skips its flush entirely while `isSubmitting()` is true, which includes a brief `'refreshing'` window opening the AI quality-assessment drawer; the section-rail buttons aren't disabled during that window, so a user can switch sections without the one being left ever flushing. **This same false premise already underlies the shipped `handleGiFieldSaveRequested()` guard** — a narrow, pre-existing production gap, discovered as a side effect of this spec, not introduced by it.

A second, independent defect was found in the same pass: `triggerManualSave()`'s own `hasPendingFor()`-based "had changes" check counts a field stuck in `'error'` status (from an earlier failed save, never retried) as "pending" — so a later, unrelated successful save in the same section can bump `savedTick` and falsely clear that still-failed field's pill.

**Resolution (user decision, 2026-10-15):** fix all three call sites together with one shared, page-wide safety check, rather than patching the two new call sites and leaving the pre-existing GI-drawer gap open. See `design.md`'s amended Premise Ledger (P-6 refuted, P-7..P-10 added) and the superseding `BSP-DD-1` for the mechanism. Attempt 2's own first sub-pass (a mid-attempt checkpoint, not a Pivot) found and corrected a related gap at the GI-drawer call site — see `execution.md`.

### Second Pivot — a new, accepted carve-out for ToC's narrative field (2026-10-15)

Attempt 2's full Reviewer pass, specifically instructed to hunt for a THIRD gap of the same shape, found one: `section-toc.component.ts`'s narrative textarea stages into `BilateralAutoSaveService` only after a double debounce (1500ms then another 1000ms) — for up to ~2.5s after a keystroke, that field-card shows "Unsaved changes" while `fieldStatus()` stays clean, invisible to the new page-wide check (`hasAnyUnsavedAnywhere()`). A realistic sequence (type, pause briefly so the first chunk stages, type more, click Save draft quickly) can clear that pill while the newest keystrokes are still genuinely unsaved. Unlike Evidence's pre-existing, already-accepted `showDraft()` gap, this one is newly exposed by this spec (`triggerManualSave()`/`selectSection()` never bumped `savedTick` before, so this race window had no user-visible consequence until now).

**Resolution (user decision, 2026-10-15):** ship the already-verified page-wide check and GI-drawer fix now; accept ToC's narrative-field race as a second, explicitly documented carve-out — same legal status as Evidence's, narrower in window (~2.5s vs. indefinite) but real. Fixing it (exposing a synchronous debounce-flush hook from `section-toc.component.ts`) is explicitly deferred to a follow-up, not this spec.

## 3. In Scope / Out of Scope

### In scope

- `triggerManualSave()` — bump `savedTick` after a successful save with real changes.
- `selectSection()` — same fix, for the navigate-away auto-flush path.
- **`handleGiFieldSaveRequested()`** (amended scope, post-Pivot) — replace its existing `safeToBumpSavedTick` (open-section-based) guard with the new shared, page-wide safety check, since that guard rests on the same false premise the other two call sites would have inherited.
- A single shared safety primitive used by all three call sites, since the unsafe premise and its fix are identical across them (`BSP-DD-1`).
- Fixing `triggerManualSave()`'s stale-`'error'`-field false-positive (the second defect found during the Pivot) as part of the same unified check.
- The Evidence-section carve-out already documented in the GI-drawer fix (`hasPendingFor('evidence')` doesn't see Evidence's own draft-item state via `showDraft()`) — this spec inherits that caveat rather than re-solving it.

### Out of scope

- Evidence's own draft-item state gap (`showDraft()` not reflected in `hasPendingFor('evidence')`) — a separate, already-flagged architectural gap, not re-opened here. This spec's fix must not make it WORSE.
- The field-card save-pill's own visual rendering (text/icon/truncation) — already fixed this session (`bugfix/field-card-save-pill-truncation`).
- Redesigning `SaveButtonService.savedTick`'s global (not per-section) signal mechanism — this spec works within that existing mechanism, it does not replace it.
- Fixing the AI quality-assessment drawer's `'refreshing'` window itself (disabling section switching while it's open) — the Pivot's alternative #3, not chosen; this spec works around the window's effect on `savedTick` safety, it does not close the window.
- **Accepted trade-off (new, post-Pivot):** because the safety check is now page-wide, a single stuck `'error'` field ANYWHERE on the page blocks `savedTick` from bumping for ANY subsequent successful save, until that field is retried and succeeds (or the page reloads). This is a direct, structural consequence of `savedTick` being one global signal (out of scope to redesign, per above) — not a new bug, but a user-visible consequence the design must state plainly, not bury.
- **Second accepted carve-out (new, post-second-Pivot):** `section-toc.component.ts`'s narrative field's ~2.5s double-debounce window (see above) MAY let a successful save elsewhere incorrectly clear that field's "Unsaved changes" pill while the newest keystrokes are still staging. Explicitly accepted, not fixed, in this spec. Closing it (a synchronous debounce-flush hook in `section-toc.component.ts`) is deferred to a follow-up spec.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Bilateral) | After clicking "Save draft" or navigating to another section, a field they just edited correctly shows "Saved" (or no pill) instead of permanently showing "Unsaved changes" even though the data was actually persisted. |

## 5. User Stories

- **`BSP-US-1`** — As a Bilateral result submitter, I want the save-state pill to clear after my save actually succeeds (whether via the Save draft button or by navigating to another section), so that I can trust the pill as a true signal of whether my work is saved.

## 6. Functional Requirements

### Required (MUST)

- **`BSP-R-1`** After `triggerManualSave()` completes a flush with no error and a real change was actually dispatched (not merely a stale `'error'`-status field being miscounted as pending), the system MUST bump `SaveButtonService.savedTick`, gated by the new shared, page-wide safety check (`BSP-R-5`).
- **`BSP-R-2`** After `selectSection()`'s auto-flush completes with no error and a real change was actually dispatched, the system MUST bump `SaveButtonService.savedTick` under the same gate.
- **`BSP-R-3`** No call site MUST falsely clear a field-card's "Unsaved changes" pill for a field whose edit has not actually been persisted — in particular, Evidence's existing `showDraft()`/`hasPendingFor('evidence')` gap MUST be excluded exactly as before (not solved, not worsened), and a field anywhere on the page stuck in `'error'` status MUST block the bump (`BSP-R-5`). **Accepted exception (second Pivot):** `section-toc.component.ts`'s narrative field's ~2.5s double-debounce staging window is explicitly OUT of this requirement's guarantee — a known, documented, narrow race accepted by the user, not solved by this spec.
- **`BSP-R-4`** A failed save (an error reported by `hasErrorFor`/`hasErrorForFields`) MUST NOT bump `savedTick` — the pill must keep showing "Unsaved changes" so the user knows to retry.
- **`BSP-R-5`** (new, post-Pivot) A single shared safety check MUST gate every bump across all three call sites: `savedTick` MUST NOT bump unless NO field anywhere on the page (any section, including ones not currently open) currently has status `'dirty'`, `'saving'`, or `'error'` — a page-wide invariant, not a single-section one, since the "only the open section can have unsaved data" premise is false (confirmed by the Pivot). `handleGiFieldSaveRequested()`'s existing `safeToBumpSavedTick` guard MUST be replaced by this same check, not left running alongside it.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Correctness** | The pill's "Saved"/"Unsaved" state MUST be an accurate reflection of server-persisted state for every section reachable via `triggerManualSave()` or `selectSection()`, not just the GI drawer. |
| **Regression safety** | No existing passing test in `bilateral-result-creator.component.spec.ts` or `bilateral-auto-save.service.spec.ts` may be broken; `BSF-T-2`'s scoped-error-check mechanism (`pendingStatusKeysFor`, `hasErrorForFields`) is reused, not re-implemented. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BSP-AC-1` | A field in an open, non-Evidence section has been edited (pill shows "Unsaved changes") | The user clicks "Save draft" and the save succeeds | The field's pill clears to "Saved" (then to no pill, per the existing `justSaved` timer), not stuck on "Unsaved changes". |
| `BSP-AC-2` | A field in an open, non-Evidence section has been edited | The user navigates to a different section (triggering `selectSection()`'s auto-flush) and the save succeeds | The field's pill clears the same way, confirmed by navigating back to that section. |
| `BSP-AC-3` | A field's save FAILS (server error) | The user clicks "Save draft" or navigates away | The field's pill MUST still show "Unsaved changes" — `savedTick` MUST NOT bump. |
| `BSP-AC-4` | A field in a DIFFERENT, currently-hidden section has a genuinely unsaved edit (not yet flushed) | `triggerManualSave()` or `selectSection()` succeeds for the CURRENTLY open section | The other section's unsaved field's pill MUST still show "Unsaved changes" — the global `savedTick` bump must not falsely clear it. |
| `BSP-AC-5` | Evidence section's own `showDraft()`/`hasPendingFor` gap (pre-existing, out of scope) | Either fixed call site runs | Behavior for Evidence is unchanged from before this spec — neither newly broken nor newly fixed. |
| `BSP-AC-6` | (new) A field in section A is edited; the AI quality-assessment drawer is opened (triggering its `'refreshing'` window); before it resolves, the user switches to section B via the rail (bypassing A's flush) | A real change is then saved successfully in section B | Section A's field-card pill MUST still show "Unsaved changes" — the page-wide check (`BSP-R-5`) must see A's still-pending field and block the bump. This is the exact scenario the Pivot's `FATAL_FAIL` found broken. |
| `BSP-AC-7` | (new) A required field is cleared and Save draft is clicked, the server rejects it (field now `'error'`) | Save draft is clicked again, either with no new edit, or after editing a DIFFERENT field in the same section, and that flush succeeds | The originally-failed field's pill MUST still show "Unsaved changes" (it was never actually fixed) — `savedTick` MUST NOT bump while that field remains `'error'` anywhere on the page. This is the second defect the Pivot found. |
| `BSP-AC-8` | (new, accepted-risk documentation, not a MUST-pass gate) The ToC narrative field is typed in, paused ~3s (first chunk stages), typed in again, Save draft clicked within 1.5s | The save succeeds | **Known, accepted exception:** the narrative's pill MAY incorrectly clear even though the newest keystrokes are still staging — this AC documents the accepted risk, it does not require a passing test closing it. |

## 9. Dependencies & Assumptions

### Upstream dependencies

- `SaveButtonService.savedTick` (`src/app/custom-fields/save-button/save-button.service.ts`) — the global signal this spec bumps, unchanged in shape.
- `BilateralAutoSaveService.fieldStatus()` (the page-wide signal the new shared check scans directly), `hasErrorFor()` / `hasErrorForFields()` (from `BSF-T-2`, already shipped) — read-only dependencies.
- `handleGiFieldSaveRequested()`'s EXISTING `safeToBumpSavedTick` logic — superseded by this spec, not reused (post-Pivot).

### Assumptions

- `schedulePayload()`'s own doc comment ("explicit section Save draft owns that [the HTTP request]") is read as confirming no separate background-autosave path exists that would also need this fix — verified by direct read, not assumed from a summary.
- ~~"Navigation always flushes the section being left first, so only the currently-open section can have unsaved data"~~ — **refuted by the Pivot's `FATAL_FAIL`** (`selectSection()` skips its flush during `isSubmitting()`). The new design does not depend on this premise at all — the page-wide check (`BSP-R-5`) is correct regardless of whether it holds.

## 10. Open Questions

- ~~`BSP-OQ-1`~~ — **Superseded by the Pivot.** The original question (does `selectSection()` need the GI-drawer's full guard, or something simpler) assumed the single-section safety premise was true. It isn't — all three call sites now use one page-wide check (`BSP-R-5`), which is neither the old GI-drawer guard nor a simpler single-section variant of it.

## Required cross-references

- `docs/ux-ui/design.md` (field-card chrome, save-state signaling).
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` (documents this gap since 2026-09-29).
- `docs/specs/archive/2026-10-15-bugfix--bilateral-save-draft-footer/` (shipped `BSF-T-2`, whose scoped-error-check mechanism this spec reuses).
