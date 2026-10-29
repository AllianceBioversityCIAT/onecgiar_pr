# Module Spec — `bilateral-save-pill-not-clearing` — `tasks.md`

- **Linked spec:** `requirements.md` + `design.md` (same folder).
- **Status:** done

---

## 1. Scope of this task list

- **Module / feature:** `bilateral` (result-creator save-state signaling)
- **Owner / driver:** — (not specified)
- **Status:** done

---

## 2. Pre-flight checklist

- [ ] `requirements.md` is approved (status `approved`).
- [ ] `design.md` is approved.
- [ ] `BSP-OQ-1` resolved by supersession (see design.md P-6 refuted, P-7..P-10, `BSP-DD-1`).
- [ ] No conflicting in-flight spec touching `bilateral-result-creator.component.ts` or `SaveButtonService` found under `docs/specs/`.
- [ ] No migration involved — client-only change.

---

## 3. Task list

### `BSP-T-1` — Bump `savedTick` safely, page-wide, from all three save call sites `[x]` — PASSed on attempt 3 (final value: page-wide `hasAnyUnsavedAnywhere()` check; ToC's narrative-field gap accepted as a documented carve-out, not fixed), see `execution.md`

- **Type:** `client`
- **Description:** **Pivot-amended, 2026-10-15** (attempt 1's single-section guard FATAL_FAILed — `design.md` P-6 refuted). Add `hasAnyUnsavedAnywhere(): boolean` to `BilateralAutoSaveService` — scans `fieldStatus()` (ALL entries, including the `'evidence'` key — P-9/P-10) and returns true if any is `'dirty'`, `'saving'`, or `'error'`. Add a private helper to `BilateralResultCreatorComponent`: `maybeBumpSavedTick(section: BilateralEditorSection, hadRealChange: boolean): void` — bumps `this.saveButtonSE.savedTick` iff `hadRealChange && section !== 'evidence' && !this.autoSaveService.hasAnyUnsavedAnywhere()`. Wire it into THREE call sites: (1) `triggerManualSave()` — replace the bump's "had changes" signal with `flushTargets.length > 0` (the existing `pendingStatusKeysFor` capture from `BSF-T-2`, NOT the `hadChanges`/`hasPendingFor` variable, which P-7 proved can be true from a stale `'error'` alone; `hadChanges` itself is untouched, still drives the alert-copy branching); (2) `selectSection()` — add a NEW `pendingStatusKeysFor(current)` capture before its flush (mirroring `triggerManualSave()`'s existing pattern), use `.length > 0` the same way; (3) `handleGiFieldSaveRequested()` — DELETE its existing `safeToBumpSavedTick`/`openSection` block entirely, replace with `this.maybeBumpSavedTick(this.openSectionName(), true)` (NOT the literal `'general-info'` — P-11: the Evidence exclusion must key on which section the user currently has open, since Evidence's invisible `showDraft()` state can only be protected that way, not by the save's fixed persistence target).
- **Implements:** `BSP-R-1`, `BSP-R-2`, `BSP-R-3`, `BSP-R-4`, `BSP-R-5`, `BSP-AC-1`, `BSP-AC-2`, `BSP-AC-3`, `BSP-AC-4`, `BSP-AC-5`, `BSP-AC-6`, `BSP-AC-7`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-auto-save.service.ts` (new `hasAnyUnsavedAnywhere()`)
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-auto-save.service.spec.ts` (new tests for it)
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts` (3 call sites + new helper)
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` (re-stamp; update the 2026-09-29 GI-drawer entry to say its guard was REPLACED, not just note a new fix alongside it)
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `M`
- **Review:** `full` — this task REVERTS already-delivered behavior (the GI drawer's `safeToBumpSavedTick` guard, shipped `bugfix/bilateral-save-draft-footer` era) and is itself a rework attempt following a `FATAL_FAIL`; per `/akili-execute` Step 2.3 override (d) and (e), both independently mandate a full conformance Reviewer regardless of predicate.
- **Verification:**
  - **Falsifier:** (1) **The exact scenario the Pivot found broken (`BSP-AC-6`):** stage a real change in section A; mock `isSubmitting()` to `true` (simulating the quality-assessment `'refreshing'` window) so `selectSection()` skips A's flush; switch to section B; stage and successfully save a real change in B — confirm (walked on the SUPERSEDED single-section design, reproducing the FATAL_FAIL) that `savedTick` WOULD have bumped and cleared A's pill; after this fix, confirm `hasAnyUnsavedAnywhere()` returns `true` (A's field is still `'dirty'`/`'error'` in `fieldStatus()`) and the bump is correctly suppressed. (2) **The stale-error scenario (`BSP-AC-7`):** stage and fail a save on field X (now `'error'`); stage and successfully save a DIFFERENT field Y in the same section; confirm pre-fix the bump would fire (X's error state ignored); post-fix, confirm `hasAnyUnsavedAnywhere()` returns `true` (X is still `'error'`) and the bump is suppressed. (3) The original 4 falsifier cases from attempt 1 (bump on success, no bump on Evidence, no bump on failure, no bump on no-real-change) must ALL still pass under the new page-wide check on a clean page.
  - **Red run:** New Jest tests for (1) and (2) above must FAIL against a reintroduction of the single-section guard (or the absence of `hasAnyUnsavedAnywhere()`'s page-wide scan) and PASS against this task's implementation. `npx jest --testPathPattern="bilateral-result-creator.component.spec|bilateral-auto-save.service.spec"`.
  - **Disqualifier:** If `hasAnyUnsavedAnywhere()` is observed to EXCLUDE the `'evidence'` key from its scan (P-10's warning) — STOP, this reopens a narrower version of the exact bug this spec fixes, just relocated to Evidence. If any OTHER reachable path is found where a section's data is neither flushed NOR reflected as `'dirty'`/`'saving'`/`'error'` in `fieldStatus()` at the moment of a bump (i.e., genuinely invisible to the page-wide check, the way Evidence's `showDraft()` is) — STOP and report a checkpoint; this would be a THIRD distinct gap, not covered by `BSP-R-3`'s already-accepted Evidence carve-out, and needs its own decision before shipping.
  - **Consumers:** `grep -rn "savedTick" src/ --include="*.ts"` (re-run from scratch, not reused from attempt 1 — confirm the count/list is still accurate after this attempt's changes) to confirm no other consumer exists. `grep -n "hasAnyUnsavedAnywhere\|safeToBumpSavedTick" bilateral-result-creator.component.spec.ts bilateral-auto-save.service.spec.ts` before editing, to find any existing test that might assert the OLD guard's specific mechanism (not just its outcome) and would need updating with a stated reason.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(bilateral-result-creator): ...`).
  - [ ] Lint + format clean (`npx ng lint --quiet`).
  - [ ] New Jest tests for all 6 falsifier cases (4 original + 2 new) added and green, across both spec files; any pre-existing test asserting the OLD guard's specific mechanism updated with a stated reason.
  - [ ] No migration involved.
  - [ ] No secret or token leaked in logs or messages.
  - [ ] No API surface changed.
  - [ ] No new i18n keys needed.
  - [ ] No bilateral/platform-report payload change.
  - [ ] `bilateral-result-creator/CLAUDE.md` re-stamped in the same commit, its 2026-09-29 GI-drawer entry updated to reflect the guard replacement (not just a new fix noted alongside the old one), AND a new trap bullet documenting the accepted ToC narrative-field carve-out (`design.md` P-12/`requirements.md` `BSP-AC-8`) — same spirit as the existing Evidence trap, citing the exact file/lines and the recommended follow-up (a synchronous debounce-flush hook).
  - [ ] Manual check in a running `ng serve`: (a) edit a field, Save draft — pill clears; (b) edit a field, navigate away and back — pill clears; (c) edit a field in section A, open the AI quality-assessment drawer, switch to section B before it resolves, save a real change in B — confirm A's pill still shows "Unsaved changes" (the scenario the Pivot found broken); (d) fail a save on one field, succeed a save on a different field in the same section — confirm the failed field's pill still shows "Unsaved changes".

---

## 4. Dependency graph

```
BSP-T-1 (only task)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BSP-TEST-1` | unit (client, Jest) | `BSP-R-1..4`, `BSP-AC-1..3`, `BSP-AC-5` | `bilateral-result-creator.component.spec.ts` |
| `BSP-TEST-2` | unit (client, Jest) | `BSP-R-5`, `BSP-AC-6`, `BSP-AC-7` | `bilateral-result-creator.component.spec.ts` + `bilateral-auto-save.service.spec.ts` |

Client coverage MUST stay above 50/60/60/60.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention, citing `P2-3962`.
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on staging/test env across at least 2 sections (one non-Evidence, confirm Evidence unchanged).
- [ ] No bilateral/platform-report consumer notification needed.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once the task lands and manual QA passes.
- [ ] Evidence's own `showDraft()`/`hasPendingFor('evidence')` gap remains open — file as a follow-up if the user wants it tracked separately; not part of this spec.

---

## 8. Roll-back plan

1. Revert the PR.
2. No migration, no feature flag, no payload change to verify.

---

## Required cross-references

- `docs/specs/bugfix/bilateral-save-pill-not-clearing/requirements.md` and `design.md` (same folder).
