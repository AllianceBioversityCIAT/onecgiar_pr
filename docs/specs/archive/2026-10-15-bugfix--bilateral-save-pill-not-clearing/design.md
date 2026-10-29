# Module Spec — `bilateral/bilateral-save-pill-not-clearing` — `design.md`

## 1. Summary

**Pivot, 2026-10-15 — rewritten after a `FATAL_FAIL`.** The original design (below, superseded) added a single-section safety guard to two new call sites, reusing the premise behind the already-shipped GI-drawer guard: "only the currently-open section can have unsaved data." The Reviewer proved that premise false (`selectSection()` skips its flush while `isSubmitting()` is true) and found a second, independent defect (a stale `'error'`-status field miscounted as "pending" in `triggerManualSave()`). The user chose to fix all three call sites — including the pre-existing, already-shipped GI-drawer guard — with one unified, **page-wide** safety check instead of patching around the single-section premise.

**Final design:** add `BilateralAutoSaveService.hasAnyUnsavedAnywhere(): boolean` — true iff ANY field's status, in ANY section, is `'dirty'`, `'saving'`, or `'error'` (a direct scan of `fieldStatus()`, the service's own existing state, no new tracking). Add `BilateralResultCreatorComponent.maybeBumpSavedTick(section, hadRealChange)`, called from all three places a Bilateral save reaches the server — `triggerManualSave()`, `selectSection()`, and `handleGiFieldSaveRequested()` (whose existing `safeToBumpSavedTick` is REPLACED, not kept alongside) — bumping `SaveButtonService.savedTick` iff `hadRealChange && section !== 'evidence' && !hasAnyUnsavedAnywhere()`. This is correct regardless of whether any call site's own flush-before-switch assumption holds, because it checks the ACTUAL state of every field, not an inference about navigation order.

Linked: `docs/specs/bugfix/bilateral-save-pill-not-clearing/requirements.md`.

## 1A. Premise Ledger

**Count:** 12 verified, 0 `UNVERIFIED` (P-6 **refuted** during attempt 1's Reviewer FATAL_FAIL — kept in the table per the Pivot Protocol's instruction to never quietly edit a refuted premise; P-7..P-10 added post-Pivot). **Blast-radius triggers:** `shared-state` fires — `SaveButtonService.savedTick` is a global signal read by every mounted `app-field-card` across every Bilateral section (P-1, P-2), and the new `hasAnyUnsavedAnywhere()` reads `fieldStatus()` across every section too; `consumer` fires for `hasAnyUnsavedAnywhere()` as a new exported method (no existing consumers — brand new, confirmed by it not existing before this pass).

| # | Premise | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | `app-field-card`'s `edited` signal (driving the "Unsaved changes" pill) is cleared ONLY by an `effect()` watching `SaveButtonService.savedTick`, which fires for every mounted field-card, not scoped to any section | `existence` | `field-card.component.ts:113-132` (the `edited` signal, the `effect()` body, `untracked` clearing block) | this session | No fix is needed here; the reported symptom has a different mechanism — re-investigate | — |
| P-2 | Every Bilateral section stays mounted in the DOM under `[hidden]`, never destroyed, which is why a global signal bump affects sections the user isn't currently viewing | `shared-state` | `bilateral-result-creator.component.html:269-293` | this session | The blast radius of a global bump would be narrower than assumed | — |
| P-3 | `triggerManualSave()` never calls `saveButtonSE.savedTick` anywhere in its body | `existence` | `bilateral-result-creator.component.ts:1233-1313`, full method read, no match | this session | The reported bug for this call site doesn't exist; re-specify | — |
| P-4 | `selectSection()` never calls `saveButtonSE.savedTick` anywhere in its body, independent of `triggerManualSave()` | `existence` | `bilateral-result-creator.component.ts:860-887`, full method read, no match | this session | Same as P-3, for this call site | — |
| P-5 | There is no separate background/debounced autosave path that reaches the server independent of these two call sites plus the already-fixed GI-drawer path | `existence` | `bilateral-auto-save.service.ts:193-194` — `schedulePayload()`'s own doc comment: "despite its historic method name, this method never makes an HTTP request: explicit section Save draft owns that" | this session | A fourth call site would need the same fix; re-specify with it included | — |
| P-6 | ~~`handleGiFieldSaveRequested()`'s existing guard's OR-branch exists only because the GI drawer always targets `'general-info'`, a mismatch the other two call sites don't have, so they only need the Evidence exclusion~~ | `other` | **REFUTED**, attempt 1 Reviewer `FATAL_FAIL` (`execution.md`): `selectSection()` skips its flush entirely while `isSubmitting()` is true (`:863`), which includes the AI quality-assessment drawer's `'refreshing'` state (`bilateral-quality-assessment-ui.service.ts:54`, set by `openStored()`, deliberately excluded from `isDialogOpen()`) — the rail's section buttons have no disabled binding during that window, so a section CAN be switched without the one being left ever flushing. The "only the open section can have unsaved data" premise is false for ALL THREE call sites, including the already-shipped GI-drawer guard, which rests on the same assumption. | attempt-1 HALT | (already acted on — see P-9/P-10, the replacement design) | `BSP-T-1` (this spec's only task), via the Pivot |
| P-7 | `BilateralAutoSaveService.hasPendingFor(section)` returns `true` for a field whose status is `'dirty'`, `'saving'`, **OR `'error'`** — a field that failed an earlier save and was never retried stays counted as "pending" indefinitely, even though it has left `_pendingFields` and nothing would actually be dispatched for it | `existence` | `bilateral-auto-save.service.ts:302-318` (`hasPendingFor`'s full body) | this session | `triggerManualSave()`'s `hadChanges` (`= hasPendingFor(activeSection)`) is not a safe "did a real, dispatchable change exist" signal — must use `pendingStatusKeysFor(section).length > 0` instead, read before `flush()` | — |
| P-8 | A field's `'error'` status clears ONLY via `markFieldsSavedThenIdle`, which runs on a SUBSEQUENT successful flush of that exact field — there is no automatic retry and no other path that clears a stuck `'error'` | `existence` | `bilateral-auto-save.service.ts:591` (`markFieldsSavedThenIdle`), cross-checked against every `setFieldStatuses(..., 'error')` call site — none pairs with an automatic retry | this session | The accepted trade-off (`requirements.md` §3) — a stuck error blocks ALL bumps until fixed — could instead silently resolve itself over time; it does not, so the trade-off is real and must be stated, not assumed temporary | — |
| P-9 | `BilateralAutoSaveService.fieldStatus()` is a single signal holding every tracked field's status across every section (not partitioned by section in its public shape) — a direct, page-wide scan of its values is possible without iterating `sectionNavigation()` or calling `hasPendingFor()` once per section | `existence` | `bilateral-auto-save.service.ts:125` (`fieldStatus = signal<Record<string, FieldStatus>>({})`), confirmed by `hasPendingFor`'s own implementation iterating `Object.entries(this.fieldStatus())` | this session | The new `hasAnyUnsavedAnywhere()` would need a different implementation (e.g., iterating all known sections) — more code, same result | — |
| P-10 | Evidence's `fieldStatus()['evidence']` entry (set by `runImmediate('evidence', ...)`) IS visible to a page-wide scan of `fieldStatus()` — this is DIFFERENT from Evidence's separate, untracked `showDraft()` draft-item UI state, which is invisible to everything. `hasAnyUnsavedAnywhere()` MUST scan `fieldStatus()` WITHOUT excluding the `'evidence'` key — a dirty/saving/error Evidence field-status entry should still block another section's bump (protecting Evidence's own pill from a wrongful global clear), even though a dedicated Evidence SAVE never triggers `maybeBumpSavedTick` itself (`section !== 'evidence'`, a separate, unrelated exclusion) | `existence` | `bilateral-auto-save.service.ts:222,226,231` (`runImmediate`'s `fieldStatus.update` calls, keyed `'evidence'`) | this session | If the implementation DOES exclude `'evidence'` from the scan, a genuinely-pending Evidence field could be wrongly cleared by an unrelated section's bump — exactly the class of bug this whole spec exists to fix, just relocated to Evidence | `BSP-T-1` |
| P-11 | `handleGiFieldSaveRequested()`'s save always persists to `'general-info'`, regardless of which section the user currently has open (`openSectionName()`) — the drawer can be opened from any section via "View AI assessment." Evidence's invisible `showDraft()` draft-item state (P-10's OTHER half — not tracked in `fieldStatus()` at all) can only be protected by checking the OPEN section, not the save's fixed target | `other` | `section-evidence.component.ts:102,251,257,261` (`showDraft` signal, fully local, no interaction with `BilateralAutoSaveService` until an actual save via `runImmediate` at `:463`); `openQualityAssessment()`/`goToQualitySection()` confirmed to have no section-dependent guard (found via Implementer checkpoint, attempt 2) | attempt-2 checkpoint | `maybeBumpSavedTick(this.openSectionName(), true)` (passing the OPEN section, not the fixed `'general-info'` target) is the corrected call — documented in §6.2 | `BSP-T-1` |
| P-12 | `section-toc.component.ts`'s narrative field debounces TWICE before staging into `BilateralAutoSaveService` — `onNarrativeInput()` waits 1500ms before calling `saveTocDebounced()`, which waits another 1000ms before `saveTocMapping()` → `schedulePayload()` sets `fieldStatus['toc_mapping']`. The field renders through `app-field-card` (`section-toc.component.html:149-158`), whose `edited` signal flips on the first keystroke — so for up to ~2.5s, the pill shows "Unsaved changes" while `fieldStatus()` stays clean, invisible to `hasAnyUnsavedAnywhere()`. A grep for `setTimeout`/`debounceTime` staging patterns across `pages/bilateral` confirms this is the ONLY section shaped this way | `existence` | `section-toc.component.ts:435-453` (`saveTocDebounced`), `:576-582` (`onNarrativeInput`'s own 1500ms timer) — found via attempt-2's Reviewer, adversarially hunting per the brief, independently spot-checked by the Leader | attempt-2 `FATAL_FAIL` | Second Pivot — this is a genuine, newly-exposed gap (unlike Evidence's pre-existing one); user accepted it as a second, documented carve-out rather than fixing `section-toc.component.ts` in this spec | explicitly accepted, not settled — `requirements.md` §3/`BSP-R-3`/`BSP-AC-8` |

## 2. Architecture Overview

### 2.1 Where this lives

- **Client component touched:** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts` — `triggerManualSave()`, `selectSection()`, `handleGiFieldSaveRequested()` (its existing guard replaced), plus one new private helper.
- **Shared service touched (one new method, additive):** `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-auto-save.service.ts` — new `hasAnyUnsavedAnywhere()`.
- **Shared service read, not modified:** `SaveButtonService` (`src/app/custom-fields/save-button/save-button.service.ts`).

### 2.2 Interaction

```
[Save draft button] ──▶ triggerManualSave()
                          ├── pendingStatusKeysFor(section) captured BEFORE flush (P-7's fix — not hasPendingFor)
                          ├── flush(section) + waitForSectionSave(section)
                          ├── error? → alert "Save failed", return (no bump)
                          └── success + flushTargets.length>0 → maybeBumpSavedTick(section, true)

[Navigate to another section] ──▶ selectSection(target)
                          ├── pendingStatusKeysFor(current) captured BEFORE flush   [only if hasPendingFor(current)]
                          ├── flush(current) + waitForSectionSave(current)
                          ├── error? → alert "Save failed", return (no bump, no section switch)
                          └── success + flushTargets.length>0 → maybeBumpSavedTick(current, true)

[GI drawer save] ──▶ handleGiFieldSaveRequested()
                          ├── updateField(...) [a real change, always] + flush('general-info')
                          ├── error? → alert "Save failed", return (no bump)
                          └── success → maybeBumpSavedTick(this.openSectionName(), true)
                                         (P-11: keyed on the OPEN section, not the fixed
                                          'general-info' save target — protects Evidence's
                                          showDraft() state when IT is the open section.
                                          OLD safeToBumpSavedTick guard REMOVED.)

maybeBumpSavedTick(section, hadRealChange):
  if (!hadRealChange || section === 'evidence') return;
  if (this.autoSaveService.hasAnyUnsavedAnywhere()) return;   // P-6's replacement: page-wide, not
                                                                // single-section — correct regardless
                                                                // of whether any flush-before-switch
                                                                // assumption holds
  this.saveButtonSE.savedTick.update(count => count + 1);

hasAnyUnsavedAnywhere() [BilateralAutoSaveService]:
  return Object.values(this.fieldStatus()).some(s => s === 'dirty' || s === 'saving' || s === 'error');
  // scans EVERY tracked field, EVERY section, INCLUDING the 'evidence' key (P-10) — protects a
  // genuinely-pending/failed field anywhere from a wrongful global clear triggered elsewhere
```

## 3. Data Model Changes

None.

## 4. API Surface

None — no endpoint, DTO, or payload touched.

## 5. Server Workflow / Business Rules

None — client-only.

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Single component: `BilateralResultCreatorComponent`.

### 6.2 Components & services

- **New method** on `BilateralAutoSaveService`:
  ```
  hasAnyUnsavedAnywhere(): boolean
  ```
  Returns true iff any entry in `fieldStatus()` (page-wide, every section, including `'evidence'` — P-9/P-10) is `'dirty'`, `'saving'`, or `'error'`. Pure read of existing state, no new tracking.
- **New private helper** on `BilateralResultCreatorComponent`:
  ```
  maybeBumpSavedTick(section: BilateralEditorSection, hadRealChange: boolean): void
  ```
  Bumps `this.saveButtonSE.savedTick` iff `hadRealChange && section !== 'evidence' && !this.autoSaveService.hasAnyUnsavedAnywhere()`. This REPLACES the single-section reasoning the superseded design (and the original GI-drawer guard) relied on.
- **`triggerManualSave()`** (`bilateral-result-creator.component.ts:1233-1313`): the existing `flushTargets = this.autoSaveService.pendingStatusKeysFor(activeSection)` capture (already present, from `BSF-T-2`, read before `flush()`) is now ALSO the "had a real change" signal for the bump — `flushTargets.length > 0` — instead of the existing `hadChanges` variable (`= hasPendingFor(activeSection)`), which P-7 proved can be true from a stale `'error'` alone. `hadChanges` itself is UNCHANGED and keeps driving the "Nothing to save yet"/"Up to date" vs "Draft saved"/"Success" alert copy — that's a different concern (what to tell the user about THIS click), not the bump's safety condition. Call `this.maybeBumpSavedTick(activeSection, flushTargets.length > 0)` right after the `hasErrorForFields(flushTargets)` check's implicit success, before the alert branches.
- **`selectSection()`** (`bilateral-result-creator.component.ts:860-887`): add a new capture, `const flushTargets = this.autoSaveService.pendingStatusKeysFor(current);`, read BEFORE `flush()` is called (same position and timing discipline as `triggerManualSave()`'s existing capture). Call `this.maybeBumpSavedTick(current, flushTargets.length > 0)` after the `hasErrorFor(current)` check's implicit success, before `pendingOpen.set(false)`/`openSectionName.set(section)`.
- **`handleGiFieldSaveRequested()`** (`bilateral-result-creator.component.ts:1031-1115`): DELETE the existing `safeToBumpSavedTick`/`openSection` block (`:1078-1082`) entirely. Replace `if (safeToBumpSavedTick) this.saveButtonSE.savedTick.update(...)` with `this.maybeBumpSavedTick(this.openSectionName(), true)` — **NOT** `this.maybeBumpSavedTick('general-info', true)` (found and corrected via an Implementer checkpoint during attempt 2, before Review): the save's PERSISTENCE target is always `'general-info'`, but `maybeBumpSavedTick`'s `section` parameter means "which section to exclude if it's Evidence" — and the thing that needs excluding is whichever section the user **currently has open** (where Evidence's invisible `showDraft()` draft-item state might be sitting), not the drawer's fixed save target. Passing the literal `'general-info'` would mean a GI-drawer save, while the user has Evidence open with an un-persisted `showDraft()` item, incorrectly bumps and clears Evidence's pill — widening the already-accepted Evidence carve-out (`BSP-R-3`) rather than preserving it. Passing `openSectionName()` instead exactly reproduces the OLD guard's conservatism (which checked `openSection !== 'evidence'`, unconditionally blocking the bump — including the drawer's own General-Info save's pill clear — whenever Evidence was open) — a faithful restoration, not a new behavior.

### 6.3 Design system usage

No visual change — this spec fixes signal plumbing, not rendering. No new tokens, no i18n, no a11y surface.

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

None.

## 8. Performance & Capacity

None — one extra signal `.update()` call per successful save, same cost class as the existing GI-drawer bump.

## 9. Observability

None.

## 10. Testing Plan (forward-looking)

- **Unit (Jest), `bilateral-auto-save.service.spec.ts`:** `hasAnyUnsavedAnywhere()` — returns `false` on a clean `fieldStatus()`; returns `true` for a `'dirty'`/`'saving'`/`'error'` entry in ANY section key, including `'evidence'`.
- **Unit (Jest), `bilateral-result-creator.component.spec.ts`:** for each of `triggerManualSave()`, `selectSection()`, `handleGiFieldSaveRequested()` — (a) a successful save with a real change on a non-Evidence section, page otherwise clean, bumps `savedTick`; (b) a successful save on Evidence does NOT bump it; (c) a failed save does NOT bump it; (d) **(new, `BSP-AC-6`)** a successful save succeeds for section B while section A has a genuinely-pending field (mock `hasAnyUnsavedAnywhere()` → `true`) — `savedTick` does NOT bump; (e) **(new, `BSP-AC-7`)** a field stuck in `'error'` status (not in this flush's `flushTargets`) blocks the bump even when THIS flush's own fields all succeeded.
- Coverage uplift: client thresholds 50/60/60/60, unaffected (small, well-covered component + one new service method).

## 11. Backwards Compatibility & Migration Plan

Purely additive; no contract, no migration, no flag. The GI drawer's user-visible behavior is unchanged in the common case (a clean page, no errors elsewhere) — only its INTERNAL safety mechanism changes, from the single-section guard to the page-wide check.

## 12. Design Decisions (ADRs)

### `BSP-DD-1` — One shared helper AND one shared page-wide check, replacing all three independent guards (superseding the original `BSP-DD-1`)

- **Context:** The original decision (single-section guard, GI drawer left untouched) was built on a premise the Reviewer proved false — `FATAL_FAIL`, attempt 1 (`execution.md`'s Pivot Record). The false premise was shared by all three call sites, including the already-shipped GI-drawer guard.
- **Decision:** Replace the per-call-site single-section reasoning with ONE page-wide fact (`hasAnyUnsavedAnywhere()`) that is correct regardless of navigation order, and use it from all three call sites via the shared `maybeBumpSavedTick` helper — including REPLACING the GI drawer's existing guard, not leaving it alongside.
- **Alternatives considered:**
  1. **Patch only the "is this the open section" check to also account for the `isSubmitting()` gap** (e.g., add an `isSubmitting()` check to the guard) — rejected: this treats the SYMPTOM (one specific way the premise breaks) rather than the actual invariant needed (nothing anywhere is unsaved); another, undiscovered way to switch sections without flushing would reopen the same class of bug.
  2. **Leave the GI drawer's guard alone, fix only the two new call sites with the page-wide check** — this was the Pivot's alternative #2, available but not chosen; the user explicitly chose to fix the shared root cause once (alternative #1 in the Pivot Record).
  3. **Fix the `isSubmitting()`/`'refreshing'` window itself** (disable section switching while it's open) — the Pivot's alternative #3, not chosen; a different, arguably more durable fix, but changes a different component's behavior (`bilateral-quality-assessment-ui.service.ts`/the rail) rather than the save-pill signaling this spec is scoped to.
- **Consequences:** A single stuck `'error'` field anywhere on the page now blocks `savedTick` from ever bumping again until that field is retried and succeeds (P-8 — it does not self-clear) — an explicit, accepted trade-off (`requirements.md` §3), not a new bug. The GI drawer's `safeToBumpSavedTick` logic is deleted, not deprecated-in-place — its only reason to exist (the single-section exception for a save that doesn't target the open section) is now handled correctly by a check that doesn't care which section is open at all.

**Step 2.3 Reversion Challenge:** This DD DOES revert already-delivered behavior — the GI drawer's `safeToBumpSavedTick` guard (shipped `bugfix/bilateral-save-draft-footer` era, 2026-09-29). Challenge: *"What does removing this break?"* Answer: nothing it was actually protecting against still needs that exact mechanism — the thing it protected against (a different section having genuinely-unsaved data) is now protected by a STRICTLY MORE CORRECT check (page-wide fact vs. single-section inference). The old guard's own documented premise is the thing that turned out false; removing it removes a guard that was already silently wrong in the `isSubmitting()` case. No test currently pins the OLD guard's specific open-section/`general-info` logic as a behavioral requirement (confirmed: existing GI-drawer tests assert outcomes — does the pill clear in the common case — not the internal mechanism).

## 13. Open Gaps & Follow-ups

- Evidence's own `showDraft()`/`hasPendingFor('evidence')` draft-item gap remains unsolved, exactly as before — out of scope here, per `requirements.md` §3.
- **New (second Pivot): `section-toc.component.ts`'s narrative field has the identical shape of gap as Evidence's (P-12)** — a component-local "unsaved" signal invisible to `hasAnyUnsavedAnywhere()`'s `fieldStatus()` scan, for up to ~2.5s after a keystroke. Explicitly accepted as a second carve-out, not fixed here. **Recommended follow-up** (Reviewer's option 1): expose a synchronous debounce-flush hook from `section-toc.component.ts`, called by `triggerManualSave()`/`selectSection()` before reading staged state — this would also close a pre-existing silent-data-loss window on Next/Back navigation that predates this spec.
- **Methodology note for the archive's kaizen pass:** this gap was missed in the FIRST Pivot's design because the Premise Ledger treated Evidence as a single known exception rather than asking "does this class of gap (a component-local signal the autosave service never sees) generalize to other sections?" A targeted grep (`setTimeout`/`debounceTime` near a staging call) would have found it before any code was written, not after a second `FATAL_FAIL`.
- The AI quality-assessment drawer's `'refreshing'` window still allows switching sections without flushing the one being left — this spec makes that SAFE for `savedTick` (via the page-wide check) but does not close the window itself (Pivot alternative #3, not chosen). If the window causes OTHER problems beyond `savedTick` (e.g., actual data loss, not just a pill-signaling issue), that would need its own spec.
- The accepted trade-off (a stuck error blocks all bumps page-wide until fixed) should be verified against real user expectations in QA — it is correct given the architecture, but may feel surprising ("why didn't my OTHER save's pill clear?") without a UI affordance explaining it. No such affordance is in scope here.

## Budget (Step 2.4)

- **Expected tasks:** 1 (still — the scope grew in depth, not in task count; it remains one cohesive change)
- **Expected LOC:** ~50-70 (one new service method + its tests, the helper rewritten, three call sites touched instead of two, more Jest cases for the two new falsifier scenarios)
- **Expected review rounds:** 2 (raised from 1, post-Pivot — this now touches a previously-separately-reviewed, already-shipped mechanism (the GI drawer) and reverts its guard; `checklist`-depth is no longer appropriate — see `tasks.md`'s `Review` field). **Exceeded, 2026-10-15:** 2 `FATAL_FAIL` rounds already spent (attempt 1's single-section premise, attempt 2's ToC debounce gap), a 3rd round pending for final confirmation — the user was informed and explicitly approved continuing (ship + document ToC as an accepted carve-out) rather than this being silently absorbed.

If execution trips past 4 review rounds or touches a file beyond `bilateral-result-creator.component.ts`/`.spec.ts`/`bilateral-auto-save.service.ts`/`.spec.ts`, stop and escalate again.

## Required cross-references

- `docs/specs/bugfix/bilateral-save-pill-not-clearing/requirements.md` (same folder).
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md`.
- `docs/specs/archive/2026-10-15-bugfix--bilateral-save-draft-footer/` (the `BSF-T-2` scoped-check mechanism this spec's timing discipline mirrors).
