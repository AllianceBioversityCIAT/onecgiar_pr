# Design — Lead Center Independent of Contributing Centers

## 1. Summary

`RdContributorsAndPartnersService.setPossibleLeadCenters()` will source `possibleLeadCenters` directly from the full CLARISA centers catalog (`centersSE.centersList`) instead of filtering it down to whatever is in `contributing_center` / `otherCentersSelected`. Because the shared service backs both Result Detail (`rd-contributors-and-partners`) and IPSR (`ipsr-contributors`), this one change fixes the empty-dropdown bug on both surfaces. The auto-assign-single-center convenience is relocated (not dropped) so it keeps working from the Contributing Centers selection rather than from the now-always-full `possibleLeadCenters` list.

Linked: `docs/specs/bugfix/lead-center-full-catalog/requirements.md` (`LC-R-1..4`), `docs/trd/trd.md` "Results Framework Reporting", `docs/ux-ui/design.md` shared-sections principle.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/` (service + component template).
- **Consumer touched (no service change needed):** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-contributors/` — inherits the fix by injecting the same `RdContributorsAndPartnersService`.
- **External integration:** none new — `CentersService` / `GET_AllCLARISACenters()` (CLARISA) is already loaded independent of this flow.

### 2.2 Interaction (current vs. corrected)

```
Current (buggy):
  setPossibleLeadCenters()
    IF contributing_center has any OR otherCentersSelected has any
      possibleLeadCenters = centersSE.centersList.filter(in contributing_center ∪ otherCentersSelected)
    ELSE
      possibleLeadCenters unchanged (stays [] on first load)

Corrected:
  setPossibleLeadCenters()
    possibleLeadCenters = centersSE.centersList.map(reset selected/disabled)   // always, unconditional
    tryAutoAssignLeadCenter() now checks the Contributing Centers selection (not possibleLeadCenters.length)
```

## 3. Data Model Changes

None. No entity, DTO, or migration changes — this is client-side state wiring only.

## 4. API Surface

None. No new/changed endpoints. `GET_AllCLARISACenters()` (`results-api.service.ts:298`) is reused as-is.

## 5. Server Workflow / Business Rules

N/A — client-only fix.

## 6. Frontend Plan

### 6.1 Routes / modules

No routing changes. Affected screens: `result/result-detail/:id/contributor-partners?phase=<id>` and the IPSR Contributors step.

### 6.2 Components & services

- **`rd-contributors-and-partners.service.ts`** (`setPossibleLeadCenters`, `tryAutoAssignLeadCenter`) — see Design Decisions.
- **`rd-contributors-and-partners.component.html`** — remove the "select a contributing center first" note block (currently rendered when `!possibleLeadCenters?.length`, which will no longer occur).
- **`ipsr-contributors.component.ts` / `.html`** — no code change expected; verified via regression test that it inherits the fix through the shared service.
- State boundary unchanged: `possibleLeadCenters`, `leadCenterCode` continue to live on `RdContributorsAndPartnersService`.

### 6.3 Design system usage

No new UI. The existing `app-pr-select` binding (`[options]`, `[required]`) is unchanged — only its data source changes. No new tokens, no new i18n strings (the removed note's string can be deleted from the component; if it's a `TermKey`, remove the unused key too — otherwise it's local template text).

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

No change — no new endpoint, no new role gate.

## 8. Performance & Capacity

Negligible — `centersSE.centersList` is already loaded once at app/service init; removing a filter is strictly cheaper than the current filtered map.

## 9. Observability

No new logging needed; this is a pure logic correction with no operational visibility requirement.

## 10. Testing Plan (forward-looking)

- **Unit (service):** `rd-contributors-and-partners.service.spec.ts` — assert `possibleLeadCenters` equals the full catalog when `contributing_center` and `otherCentersSelected` are both empty (regression test, red before fix). Assert it still equals the full catalog when Contributing Centers has entries (no behavior loss). Assert `tryAutoAssignLeadCenter()` still auto-picks the single center when exactly one Contributing Center is selected and no valid `leadCenterCode` is set.
- **Unit (component):** `rd-contributors-and-partners.component.spec.ts` — assert the stale note is never rendered. `rd-contributors-and-partners.zoneless.spec.ts` — assert no zoneless regression (per this folder's known "hide/re-show via timer" history).
- **Unit (IPSR):** `ipsr-contributors.component.spec.ts` / `ipsr-contributors.zoneless.spec.ts` — assert the Lead Center dropdown options are non-empty with 0 Contributing Centers.
- **Coverage note:** `rd-contributors-and-partners/` is excluded from `collectCoverageFrom` (per `onecgiar-pr-client/CLAUDE.md`) — tests still run and gate correctness, they just don't move the coverage percentage. `ipsr-contributors` is not excluded and does count.

## 11. Backwards Compatibility & Migration Plan

- Purely additive/corrective on the client; no API contract or persisted-data shape changes.
- No feature flag needed — this is a straight bug fix with a regression test.
- Rollback: revert the PR; no migration or data backfill involved.

## 12. Design Decisions (ADRs)

### `LC-DD-1` — Source `possibleLeadCenters` from the full catalog, unconditionally

- **Context:** The dropdown's required options were being filtered down to the Contributing Centers subset, which is empty on a fresh/ToC-less result — blocking save.
- **Decision:** `setPossibleLeadCenters()` always sets `possibleLeadCenters` to the mapped full `centersSE.centersList` (same `{ ...center, selected: false, disabled: false }` shape as before), dropping the `contributing_center?.length > -1 || otherCentersSelected?.length > 0` guard and the `.filter(...)` entirely.
- **Alternatives considered:**
  - Add a separate unfiltered property and repoint only the two templates (Option B in `proposal.md`) — rejected: more state to keep in sync for no behavioral benefit; research found no other consumer needs the filtered subset.
  - Fallback to full list only when the filtered list is empty (Option C in `proposal.md`) — rejected: reintroduces the same class of bug in partially-populated states.
- **Consequences:** `possibleLeadCenters.length` is no longer a reliable signal for "exactly one Contributing Center selected" — see `LC-DD-2`.

### `LC-DD-2` — Relocate the single-center auto-assign check off `possibleLeadCenters.length`

- **Context:** `tryAutoAssignLeadCenter()` currently auto-selects the only entry in `possibleLeadCenters` when its length is exactly 1 — today that coincides with "exactly one Contributing Center selected", because the list was filtered to that subset. After `LC-DD-1`, `possibleLeadCenters` is always the full catalog (length ≫ 1), so this auto-assign convenience would silently stop firing.
- **Decision:** Compute the auto-assign eligibility from the Contributing Centers selection directly — the deduplicated union of `partnersBody.contributing_center` and `otherCentersSelected` (by `code`) — instead of from `possibleLeadCenters.length`. When that union has exactly one entry and the current `leadCenterCode` is not already a valid selection, auto-assign that one center's code as before.
- **Reversion challenge (Step 2.3):** *What does removing this break?* Without this relocation, any result with exactly one Contributing Center would stop getting its Lead Center auto-filled, a small but real convenience regression for the common single-center case. Answer: the relocation (not removal) keeps the convenience — the challenge is satisfied by design, not by skipping it.
- **Alternatives considered:** Drop the auto-assign convenience entirely — rejected as an unnecessary regression when preserving it costs one small computed check.
- **Consequences:** `tryAutoAssignLeadCenter()` gains a small local computation (union + de-dup by `code`) instead of reading `.length` directly; behavior for the single-Contributing-Center case is unchanged from the user's perspective.

### `LC-DD-3` — Remove the stale empty-state note in Result Detail; no equivalent needed in IPSR

- **Context:** Result Detail shows "Please select at least one contributing center to choose a lead center" when `possibleLeadCenters` is empty. After `LC-DD-1`, that condition becomes unreachable (the full catalog is never empty once loaded).
- **Decision:** Remove the note and its guiding condition from `rd-contributors-and-partners.component.html`. IPSR never had this note (per `LC-OQ-1`), so no new empty-state UI is added there either — `LC-OQ-1` resolves to "not needed."
- **Alternatives considered:** Keep the note behind a defensive `*ngIf` in case the catalog itself fails to load — rejected: catalog-load failure is a distinct, unhandled-elsewhere failure mode (the whole form already depends on `centersSE.centersList`); inventing a bespoke message here would be new unscoped behavior, not a fix.
- **Consequences:** One less conditional branch and string in the Result Detail template.

### `LC-DD-4` — Auto-sync an empty-state Lead Center pick into Contributing Centers (resolves `LC-GAP-1`) — **partially superseded by `LC-DD-5`**

> **2026-08-29 update:** live browser testing on result 8952 (`result_id` 11420, `planned_result: false`) showed this decision's "always target `otherCentersSelected`" rule produces a confusing duplicate-labeled Contributing Centers field in the flat/unmapped UI. `LC-DD-5` below replaces the targeting rule and generalizes the trigger; the persistence mechanism itself (auto-add via a real Contributing Center row) and the swap concept are unchanged in spirit. Kept here, not deleted, per the spec's decisions-are-never-edited-in-place convention.


- **Context:** `LC-DD-1` decoupled the Lead Center dropdown from Contributing Centers, but the save/load contract still requires the lead to be a real `contributing_center`/`otherCentersSelected` entry (backend confirmation: `is_leading_result` is a column on `results_center`, every row of which already means "contributes to this result" — `onecgiar-pr-server/src/api/results/results-centers/entities/results-center.entity.ts:48`). Picking a Lead Center outside that list therefore never persists (`LC-GAP-1`).
- **Decision:** add `_autoAddedLeadCenterCode: string | null` (private, service-level, reset in `resetState()`) to `RdContributorsAndPartnersService`. A new method `onLeadCenterSelected(code: string | null)`, wired to the Lead Center `app-pr-select`'s `(selectOptionEvent)` (alongside its existing `[(ngModel)]`), implements:
  1. Compute `union = getContributingCentersUnion()` (already exists, `LC-DD-2`).
  2. **Trigger (`LC-R-11`):** if `union.length === 0` → find the full `CenterDto` for `code` in `centersSE.centersList`, push it into `otherCentersSelected`, set `_autoAddedLeadCenterCode = code`, then `setPossibleLeadCenters(true)`.
  3. **Swap (`LC-R-12`):** else if `union.length === 1 && union[0].code === _autoAddedLeadCenterCode && union[0].code !== code` → remove that one entry from `otherCentersSelected`, then do step 2's add for the new `code` (including clearing to `null`/removing outright if `code` is falsy — the user cleared the Lead Center via `[showClear]`, so the auto-added entry is removed with nothing replacing it).
  4. **No-op (`LC-R-13`):** any other shape of `union` (2+ entries, or a single entry that is NOT the auto-added one — i.e. a real ToC/manual center) → do nothing beyond letting `leadCenterCode` change via the existing `ngModel` binding. This is a fresh check every call, not a persisted invariant, so it self-corrects the moment the user adds a second real Contributing Center — no separate cleanup path needed.
- **Why service-level state, not a signal:** `_autoAddedLeadCenterCode` is a same-session UX convenience, not persisted UI state — it resets naturally on `resetState()` (new result) and is irrelevant after a reload (a previously auto-added center loads back as a normal, real Contributing Center — see Consequences).
- **Alternatives considered:** track "auto-added" as a flag on the `CenterDto` object itself (`_autoAdded: true`) instead of a separate service field — rejected: that flag would round-trip into the save payload / backend unless explicitly stripped, adding a stripping step for no benefit over a private service field that never leaves the client.
- **Consequences:** after a save + reload, an auto-added center is indistinguishable from any other Contributing Center (same `results_center` row shape) — `_autoAddedLeadCenterCode` is `null` again post-load, so changing the Lead Center at that point falls into the "no-op" case (`LC-R-13`) and the user must remove it manually via the existing `deleteOtherCenter` flow if they no longer want it. This is intentional: once persisted, it IS a real contributing center, and the spec never promised to un-persist it automatically.
- **Interaction with `deleteOtherCenter` (component.ts):** if the user manually removes the auto-added entry via the existing "Other(s)" chip delete (before saving), the existing code already clears `leadCenterCode` when the removed center was the lead (`component.ts:217-219`) — `LC-T-4` additionally clears `_autoAddedLeadCenterCode` there so a stale reference can't cause an incorrect swap later.

### `LC-DD-5` — Generalized Lead Center auto-sync: target field by active UI, trigger by "not already included" (supersedes `LC-DD-4`'s targeting rule)

- **Context:** Live testing on result 8952 (unmapped, `planned_result: false`) surfaced two compounding issues:
  1. `LC-DD-4` always targeted `otherCentersSelected`, but in the **flat** UI (not CP2026, or CP2026-but-unmapped — `rd-contributors-and-partners.component.html:126-140`) there is no ToC/Other(s) split at all; the only field is bound directly to `contributing_center`. Routing the auto-add through `otherCentersSelected` there relies on the peer spec's escape-hatch guard at line 163 just to become visible, and produces a second, confusingly-identically-labeled "Contributing CGIAR Centers:" field (the split block's label collapses to the same string as the flat field's hardcoded label whenever `hasReferenceCenters()` is `false` — `html:167`'s ternary).
  2. **Pre-existing, independent bug in `applyTocMappingOnLoad`** (`service.ts:431-448`, not introduced by this spec): on load, it re-adds the `OTHER_CENTERS_CODE` sentinel to `contributing_center` whenever `otherCenters.length > 0`, **regardless of whether any real ToC-derived centers (`tocCenters`) exist**. The sentinel/`showOtherCenters` mechanism only needs to exist to force the split view open when there ARE real ToC centers **and** the user also picked some non-ToC ones (dropdown 1 is otherwise closed and doesn't reveal dropdown 2 on its own). When `tocCenters.length === 0`, dropdown 2 already auto-activates via `!hasReferenceCenters()` — re-adding the sentinel in that case only produces a stray "Other(s)" chip with no dropdown 1 to meaningfully attach it to (the flat branch doesn't recognize the sentinel at all; the split branch's `@else` note branch doesn't render dropdown 1 either).
  - User confirmed (2026-08-29) the actual saved payload for result 8952 already had `is_leading_result: 1` on the auto-added center — **persistence itself was correct**; this decision is purely about which field/UI element the selection lands in, and cleaning up the pre-existing reconciliation bug that made it look broken.
- **Decision:**
  1. **Trigger generalized (`LC-R-14`):** `onLeadCenterSelected(code)` no longer requires the Contributing Centers union to be empty — it fires whenever `code` is not already a member of `getContributingCentersUnion()`, regardless of union size.
  2. **Target field by active UI (`LC-R-15`):** a new private check, e.g. `isUnmappedOrFlat()` = `!fieldsManagerSE.isContributorsPartners2026() || partnersBody.result_toc_result?.planned_result === false`. When true, auto-add goes straight into `contributing_center` (mirrors the flat dropdown's own binding — `onSaveSection`'s CP2026 branch, which runs independent of `planned_result`, will tag it `from_toc: true` on save; harmless since the flat branch never reads `from_toc` and `applyTocMappingOnLoad` re-buckets it straight back into `contributing_center` on the next load since it evaluates as ToC-origin — see Consequences). When false (CP2026 + ToC-mapped), auto-add goes into `otherCentersSelected` AND, if the "Other(s)" sentinel (`OTHER_CENTERS_CODE`, built via the existing `buildOtherCentersSentinel()` helper) is not already present in `contributing_center`, it is added too — tracked via a new `_autoAddedSentinel: boolean` flag so a later removal only strips a sentinel this mechanism itself put there, never one the user checked manually.
  3. **Swap targets only the auto-added entry (`LC-R-16`):** on a Lead Center change while `_autoAddedLeadCenterCode` is still a union member, remove it from wherever it lives (filtering both `contributing_center` and `otherCentersSelected` by that code is safe/idempotent — it only ever lives in one of them at a time per rule 2) before adding the new selection per rule 2 again. If that removal empties `otherCentersSelected` and `_autoAddedSentinel` is `true`, also strip the sentinel from `contributing_center` and reset the flag.
  4. **No-op when already included (`LC-R-17`):** if `code` is already in the union — a real ToC-derived center, a manually-added one, or the current auto-added one re-selected — do nothing. No dropdown appears or disappears.
  5. **Fix `applyTocMappingOnLoad`'s reconciliation** (independent of the above, same file): only re-add the sentinel when `tocCenters.length > 0 && otherCenters.length > 0` (the genuine "mixed" case). When `tocCenters.length === 0`, set `contributing_center = tocCenters` (i.e. `[]`) with no sentinel — dropdown 2 still auto-activates on its own via `!hasReferenceCenters()`, so nothing is lost, and the stray "Other(s)"-chip-with-collapsed-label artifact disappears.
- **Alternatives considered:**
  - Keep `LC-DD-4`'s "only when empty" trigger and simply special-case the flat/unmapped target field — rejected per direct user instruction (2026-08-29): a Lead Center picked outside the ToC-prefilled set, even when other ToC centers already exist, must still be auto-included via Other(s) — the "only when empty" restriction was never the actual requirement, just an artifact of the first (narrower) diagnosis.
  - Leave `applyTocMappingOnLoad` untouched and instead suppress the sentinel only in the component template — rejected: the sentinel is state (`contributing_center` content), not a rendering artifact; fixing it at the render layer would leave the wrong data persisted and re-corrupt the next load.
- **Consequences:** `_autoAddedLeadCenterCode` may now point into either `contributing_center` or `otherCentersSelected` depending on which branch added it — callers (`deleteOtherCenter`'s existing clear-on-match logic from `LC-T-4`) still work unchanged since they only compare codes, not array identity. The flat-case auto-added center is tagged `from_toc: true` on save purely as a byproduct of `onSaveSection`'s existing CP2026 payload construction (which doesn't distinguish "genuinely ToC" from "flat-UI selection" — both live in `contributing_center`) — this is pre-existing, unrelated behavior this spec does not change, and is harmless because the flat template branch never reads `from_toc`.
- **Cross-spec note:** the peer `toc-unmapped-orange-notes` spec's escape-hatch guard at `component.html:163` (`(otherCentersSelected?.length ?? 0) > 0`) becomes effectively unreachable for the flat/unmapped case once this decision lands (that case no longer touches `otherCentersSelected` at all) — harmless dead code, not worth asking them to revert; it remains a valid safety net for any other future path that populates `otherCentersSelected` while unmapped.

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | 3 (original) + 1 (`LC-T-4`, added post-completion for `LC-GAP-1`) = 4 |
| Expected LOC | ~60 (original 3 tasks) + ~50 (`LC-T-4`: service ~30, component wiring ~5, tests ~30 — net) |
| Expected review rounds | 1 per task |

Depth check: still `Lite` — `LC-T-4` is client-only (no new module/entity/endpoint/migration), confined to the same service + component already touched by `LC-T-1`/`LC-T-2`. The task count growing from 3 to 4 mid-spec is itself the budget signal the Leader's Tripwire watches for; it is disclosed here rather than silently absorbed.

## 13. Open Gaps & Follow-ups

- **Cross-spec interaction risk with `docs/specs/bugfix/toc-unmapped-orange-notes` (`TOC-T-1`), found 2026-08-29, not yet a problem today.** `LC-DD-4`'s auto-add (`onLeadCenterSelected`) pushes into `otherCentersSelected`, which is rendered/removable exclusively by the `@if (isCP2026() && (showOtherCenters || !hasReferenceCenters()))` block at `rd-contributors-and-partners.component.html:163`. That block currently has **no** `planned_result` guard, so today an auto-added Lead Center is visible and removable regardless of whether the result is ToC-mapped. `TOC-T-1` (a sibling, concurrently-in-flight spec, coordinated live with the other session on 2026-08-29) needs to add a `planned_result !== false` condition to that same line 163 to stop the "Other(s)" block from duplicating the flat full-catalog dropdown on unmapped results — but a bare `&& planned_result !== false` AND'd onto the whole expression would also hide an `LC-DD-4` auto-added chip on an unmapped result, since `!hasReferenceCenters()` is already true in that state regardless. **Confirmed correct combined guard** (verified with the other session, not yet applied by either spec as of this note): `isCP2026() && (showOtherCenters || (!hasReferenceCenters() && planned_result !== false) || (otherCentersSelected?.length ?? 0) > 0)` — the `planned_result` check must AND specifically into the `!hasReferenceCenters()` auto-activation clause (a bare OR addition doesn't narrow anything, since the clause it would be added to is already satisfied), while the `otherCentersSelected?.length > 0` term stays as an independent OR escape hatch so an auto-added chip remains visible/removable even when unmapped. **Neither spec has touched line 163 as of this note.** Whoever implements it (either spec, in either order) must use the combined guard above, not either half alone.

- If a persisted `leadCenterCode` ever refers to a center no longer in the live CLARISA catalog (e.g., a center was deactivated/removed upstream), the dropdown will show no matching selection — this is a pre-existing edge case, not introduced or worsened by this fix, and is out of scope here.
- Follow-up documentation task: `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`'s "Lead center" trampa entry describes the old filtered-by-both-dropdowns behavior — it must be updated in the same commit as the code change (repo convention: any edit to a file in a folder with its own `CLAUDE.md` re-stamps that guide's `Verified:` line). This is folded into `LC-T-1` below.
- **`LC-GAP-1` (found 2026-08-28, post-`LC-T-3`, before commit) — save/load does not persist a Lead Center that is not also a Contributing Center.** `LC-DD-1` decoupled the Lead Center *dropdown* from Contributing Centers, but the **save contract was never updated to match**: `onSaveSection` (`rd-contributors-and-partners.component.ts:407-459`) only stamps `is_leading_result = true` on entries already inside `contributing_center` / `otherCentersSelected`, and `setLeadCenterOnLoad` (`rd-contributors-and-partners.service.ts:648-659`) only looks for that flag inside those same two arrays. If a user picks a Lead Center that is **not** a Contributing Center (now possible, and the whole point of this spec), the save payload never includes that center at all, no row ever gets `is_leading_result = true`, and on the next load `leadCenterCode` resets to `null` — this is what the user reported as "the center disappears on save."
  - **Root cause confirmed in the backend data model, not just the client:** `is_leading_result` is a column on `results_center` (`onecgiar-pr-server/src/api/results/results-centers/entities/results-center.entity.ts:48`) — every row in that table already means "this center contributes to this result." There is no field that means "is the lead but not a contributor." So the straightforward client-only fix (include the Lead Center in the `contributing_center` payload even when it isn't one) would silently create a real contributing-center association in the database for a center the user never added to Contributing Centers — a UI/DB inconsistency (the center never appears in the Contributing Centers list, but the backend and any report reading `results_center` would see it as a contributor).
  - **Options originally considered (2026-08-28, first pass):**
    1. Accept the inconsistency (ship the client-only fix, document the DB side effect as known debt).
    2. Partially revert `LC-DD-1`'s decoupling — restrict the Lead Center dropdown back to Contributing Centers.
    3. Real fix: add a dedicated field decoupled from `results_center` — correct data model, needs a migration, out of scope for this Lite/client-only spec.
  - **Decision (2026-08-28, second pass, resolved — see `LC-DD-4`):** none of the three above. The user proposed a fourth option that resolves the inconsistency **without** touching the data model: when the user selects a Lead Center while Contributing Centers is empty, automatically add that same center to Contributing CGIAR Centers. The center then genuinely *is* a contributing center (visible in the UI list, real `results_center` row with `is_leading_result: true` on save) — there is no UI/DB divergence to accept, because the UI and the DB now agree. `LC-R-11`/`LC-R-12`/`LC-R-13` (added to `requirements.md`) and `LC-DD-4` below specify the exact mechanics. Tracked as task `LC-T-4`.

## Required cross-references

- `docs/specs/bugfix/lead-center-full-catalog/requirements.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `docs/specs/bugfix/lead-center-full-catalog/proposal.md` — confirmed root cause.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` — folder guide to be updated alongside the code change.
