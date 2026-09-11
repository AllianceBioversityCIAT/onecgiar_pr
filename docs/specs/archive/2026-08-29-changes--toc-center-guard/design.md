# Design — Guard Against Removing All ToC-Planned Contributing CGIAR Centers

## 1. Summary

Client-only guard added to the two Contributing CGIAR Centers deletion handlers in `rd-contributors-and-partners.component.ts`: when the result's ToC has planned Centers, block the deletion that would take the combined real Center count to zero, and show the existing `CustomizedAlertsFeService` blocking alert — the exact same shape as the already-shipped `TOC-SP-DD-1`/`TOC-SP-DD-2` guard for Contributing Science Programs. No server, data-model, or API change. Same constraint class as the twin spec: the `OTHER_CENTERS_CODE` sentinel chip is itself deletable and cascades to clear `otherCentersSelected` — the guard must count real Centers (excluding the sentinel) and account for that cascade, not just decrement by 1. One additional wrinkle not present in the Science Program field: Centers renders in **two UI shapes** (flat/unmapped single dropdown vs. split CP2026 ToC/Other(s)) — the guard must work identically in both, since both ultimately mutate the same two underlying arrays.

Requirements: [`requirements.md`](./requirements.md) (`TOC-C-R-1..5`, `TOC-C-AC-1..6`).

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/` — `rd-contributors-and-partners.component.ts` only. No template change (the delete `(click)` handlers already call `deleteContributingCenter(i)` / `deleteOtherCenter(i)` — `.component.html:154`, and the other-center chip removal handler — their signatures are unchanged).
- **Service touched:** none directly edited; reads existing `RdContributorsAndPartnersService` state (`partnersBody.contributing_center`, `otherCentersSelected`, `tocReferenceCenterInstitutionIds`, `partnersBody.result_toc_result.planned_result`). The service's own `getContributingCentersUnion()` / `isUnmappedOrFlat()` (private, used by Lead Center auto-sync) are **not** reused — see `TOC-C-DD-2`.
- **No server, no CLARISA, no migration.**

### 2.2 Sequence (primary flow)

```
[Submitter clicks × on a Contributing CGIAR Center chip]
  └── deleteContributingCenter(index, updateComponent?) / deleteOtherCenter(index)
        ├── compute hasTocPlannedCenter (planned_result !== false AND tocReferenceCenterInstitutionIds().length > 0)
        ├── IF hasTocPlannedCenter AND (realCenterCount - willRemoveCount) <= 0
        │     └── customizedAlertsFeSE.show({status:'warning', ...}) → return (no mutation)
        └── ELSE proceed with existing filter-and-reassign logic (unchanged)
```

---

## 3. Data Model Changes

None. No entity, no migration, no CLARISA cache change.

---

## 4. API Surface

None. Purely client-side deletion guard; no new/changed endpoint.

---

## 5. Server Workflow / Business Rules

Not applicable — no server-side change in this spec.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Same `rd-contributors-and-partners` page (`result/result-detail/:id/contributor-partners`).

### 6.2 Components & services

New private/internal members on `RdContributorsAndPartnersComponent` (no new files), mirroring the Science Program guard's naming exactly, substituting "Center" for "Science":

- `private getRealCenterCount(): number` — `(partnersBody.contributing_center excluding OTHER_CENTERS_CODE).length + (otherCentersSelected || []).length`.
- `private get hasTocPlannedCenter(): boolean` — `partnersBody?.result_toc_result?.planned_result !== false && tocReferenceCenterInstitutionIds().length > 0`. Same condition shape as `hasTocPlannedScience`, substituting the Centers-specific ToC reference signal (already read by the existing `hasReferenceCenters` computed at `component.ts:146`).
- `private blockIfLastCenter(willRemoveCount: number): boolean` — returns `true` (and shows the alert) when the guard should block; `false` otherwise. Both delete handlers call this first and `return` early on `true`.

Modified methods (both already exist, signatures unchanged):

- `deleteContributingCenter(index: number, updateComponent: boolean = false)` — computes `willRemoveCount` **before** mutating: `1` for a normal chip, or `otherCentersSelected.length` when the removed chip is the `OTHER_CENTERS_CODE` sentinel itself (because removing it cascades to clear `otherCentersSelected` via the existing `if (!this.showOtherCenters) otherCentersSelected = []` line at `:428`). Calls `blockIfLastCenter(willRemoveCount)` before the existing `slice`/`filter` mutation; if blocked, returns before touching `leadCenterCode` or `updatingLeadData` so no partial side effect occurs.
- `deleteOtherCenter(index: number)` — calls `blockIfLastCenter(1)` before mutating (Other(s) chips are never the sentinel — the sentinel only ever lives in `contributing_center`).

No change to `applyTocMappingOnLoad`, `preselectCentersEffect`, `onContributingCenterSelect`, `onOtherCenterSelect`, `onLeadCenterSelected`, `getContributingCentersUnion`, `isUnmappedOrFlat`, or any ToC-prefill/Lead-Center-auto-sync logic.

### 6.3 Design system usage

- Reuses `CustomizedAlertsFeService.show(...)` (`shared/services/customized-alerts-fe.service.ts`), already injected in this component as `customizedAlertsFeSE` — same mechanism the twin Science Program guard already uses.
- Alert call: `status: 'warning'`, no `confirmText` (single "Ok" dismiss, blocking notice), a stable `id` (e.g. `'toc-center-min'`) distinct from `'toc-science-program-min'` and other alert ids in this component.
- Alert copy follows the existing sibling notes in this file (`noCentersNote`, `contributingScienceInfoNote`) — **plain hardcoded string, not a new `TermKey`**, matching the exact precedent `TOC-SP-DD-1`'s design established for the twin field.
- No new component, no new route, no new a11y surface beyond what `CustomizedAlertsFeService` already provides.

---

## 7. Security & Authorization

No change. Client-side UX guard only; server-side persistence and its existing role/JWT gates are untouched.

---

## 8. Performance & Capacity

Negligible — two array-length reads and one boolean signal read per delete click. No new HTTP calls, no new subscriptions.

---

## 9. Observability

None added. No new logs needed for a client-side UX guard with an immediate visible alert.

---

## 10. Testing Plan (forward-looking)

- Unit tests (Jest, `rd-contributors-and-partners.component.spec.ts`) covering all requirements scenarios:
  - `TOC-C-AC-1` — delete down to 1 remaining (two sequential deletes on `contributing_center`), no alert, both succeed.
  - `TOC-C-AC-2` — delete the last remaining chip → blocked, alert shown (assert `customizedAlertsFeSE.show` called with the `'toc-center-min'` id), array unchanged.
  - `TOC-C-AC-3` — no ToC-planned data (`tocReferenceCenterInstitutionIds` empty, or `planned_result === false`) → unrestricted, no alert.
  - `TOC-C-AC-4` — mixed ToC + Other (split CP2026 UI), delete the Other one (combined count 2 → 1) → succeeds, no alert.
  - `TOC-C-AC-5` (sentinel-cascade case) — ToC guard active, sentinel chip is the only thing keeping the real count above zero after an Other removal → deleting the sentinel via `deleteContributingCenter` is blocked exactly as if deleting a real chip; proves `willRemoveCount` is computed from the cascade, not from `1`.
  - `TOC-C-AC-6` (flat/unmapped UI parity) — same guard scenarios (allow-down-to-one, block-the-last) repeated with `contributing_center` as the only populated array (no split, no `otherCentersSelected`) to prove the guard doesn't implicitly assume the split UI shape.
- This folder (`rd-contributors-and-partners/`) is **excluded from Jest coverage** (`onecgiar-pr-client/CLAUDE.md` §"Coverage thresholds") — tests still run and still gate correctness; they just don't move the global coverage number. No Cypress CT needed (no `custom-fields/` component touched); existing `cypress/e2e/result-detail/contributors-and-partners.cy.ts` may optionally get one added scenario but is not required for this spec's Lite depth.

**Defect classes this spec can produce, and their gate:**

| Defect class | Gate |
|---|---|
| Guard fires when it shouldn't (over-blocking; e.g. blocks emptying the field when the result has no ToC-planned Centers) | `TOC-C-AC-3` unit test — direct, automated |
| Guard fails to fire when it should (under-blocking; last chip deletable when ToC has planned Centers) | `TOC-C-AC-2` unit test — direct, automated |
| Miscounting across the two arrays (sentinel counted as real, or `otherCentersSelected` cascade not counted) | `TOC-C-AC-4` + `TOC-C-AC-5` — direct, automated |
| Guard behaves differently in the flat/unmapped UI vs. the split CP2026 UI (asymmetric coverage — the class this spec's twin didn't have to worry about) | `TOC-C-AC-6` — direct, automated |
| Alert not shown / wrong alert shown on block | Assert the `customizedAlertsFeSE.show` call args (id/status) in the `TOC-C-AC-2` test — direct, automated |

No defect class in this spec is a visual/rendered-output class (no new markup, reused alert component) — no class requires a human/T6 substitute; none is recorded as an accepted risk.

---

## 11. Backwards Compatibility & Migration Plan

- No API contract change, no migration, no data backfill.
- Behavior change is additive-restrictive only in the specific state (ToC-planned + last chip) that today allows an unintended data loss — see §12 reversion challenge.

---

## 12. Design Decisions (ADRs)

### `TOC-C-DD-1` — Guard placed in the deletion handlers, not the multi-select `onRemove`/save-time, mirroring `TOC-SP-DD-1`

- **Context:** Need to stop the count reaching zero at the exact point of user action, with immediate feedback (per proposal §10 Option A), consistent with the already-shipped Science Program guard.
- **Decision:** Add the check inside `deleteContributingCenter`/`deleteOtherCenter`, before the existing filter-and-reassign lines — same placement pattern `TOC-SP-DD-1` established for `deleteScience`/`deleteOtherScience`.
- **Alternatives considered:** (1) Disable the chip's × affordance when it's the last one — rejected, weaker feedback, and would make the two "twin" fields behave inconsistently with each other for no reason (proposal §10 Option B). (2) Validate only at save-time — rejected, delayed feedback, same reasoning as `TOC-SP-DD-1` (proposal §10 Option C).
- **Consequences:** The guard is duplicated across two methods (small, ~3 lines each) rather than centralized in one place — same trade-off `TOC-SP-DD-1` accepted, for the same reason (the two methods already have separate mutation logic).

### `TOC-C-DD-2` — New standalone helpers on the component; do NOT reuse the service's `getContributingCentersUnion()` / `isUnmappedOrFlat()`

- **Context:** The service already exposes `getContributingCentersUnion()` (deduplicated union by `code` across both arrays, used by Lead Center auto-sync) and `isUnmappedOrFlat()` (used to pick which array a Lead Center auto-add targets). Both are `private` on `RdContributorsAndPartnersService`, and neither does exactly what this guard needs: the union does **not** exclude the `OTHER_CENTERS_CODE` sentinel (the sentinel has a real, truthy `code`, so it would count as one real Center and let the guard under-count by one), and `isUnmappedOrFlat()` answers a different question ("which array does an auto-add target") than what this guard needs ("is the ToC-planned floor active," which applies identically regardless of which array the real Centers currently live in).
- **Decision:** Add fresh, guard-specific private members on the **component** — `getRealCenterCount()`, `hasTocPlannedCenter`, `blockIfLastCenter()` — that explicitly exclude the sentinel and sum plain lengths (not a deduplicated union), exactly mirroring `TOC-SP-DD-2`'s shape for Science Programs rather than reusing or exporting the service's Lead-Center-specific helpers.
- **Alternatives considered:** Making `getContributingCentersUnion()` public and reusing it after filtering out the sentinel in the component — rejected: it performs a `Map`-based dedup by `code` that this guard doesn't need (the two arrays are assumed disjoint, same assumption the Science Program guard makes) and would couple this spec to a helper whose contract is owned by the Lead Center spec; a future change to `getContributingCentersUnion()`'s semantics (e.g., for Lead Center reasons) could silently change this guard's counting.
- **Consequences:** A small amount of logic duplication (counting Centers across two arrays) exists between this guard and the service's Lead Center helpers — acceptable, matches the existing precedent of `getRealScienceCount()` being its own independent thing, not derived from any Lead-Center-adjacent helper.

### `TOC-C-DD-3` — Real count excludes the `OTHER_CENTERS_CODE` sentinel and accounts for its cascade, mirroring `TOC-SP-DD-2`

- **Context:** `contributing_center` can contain the `OTHER_CENTERS_CODE` sentinel object as a rendered, deletable chip. Counting it as a "real" Center would let the guard both under-count (blocking one fewer real deletion than intended) and mis-fire on the sentinel's own removal, which has no direct real-Center effect but cascades to clear `otherCentersSelected` (existing line, `component.ts:428`).
- **Decision:** `getRealCenterCount()` filters out `code === OTHER_CENTERS_CODE`; `deleteContributingCenter` computes `willRemoveCount` as `otherCentersSelected.length` when the removed chip is the sentinel (the actual real-Center impact of that action), and `1` otherwise.
- **Alternatives considered:** Ignoring the sentinel-cascade case entirely (treat sentinel removal as `willRemoveCount = 0`) — rejected, identical reasoning to `TOC-SP-DD-2`: it would let a user empty the field to zero by deleting only the sentinel chip when it was the sole thing gating `otherCentersSelected`'s visibility, defeating the guard's purpose.
- **Consequences:** `deleteContributingCenter` carries slightly more branching than a plain filter, but the alternative silently reopens the exact gap this spec exists to close.

### `TOC-C-DD-4` — SUPERSEDES `TOC-C-DD-3`: the sentinel chip is always deletable, never blocked by the guard

- **Context (Pivot, 2026-08-29, post-approval correction):** The user clarified that in both this field and its twin (Contributing Science Programs), the "Other(s)" sentinel chip must always remain deletable — including when its cascade (clearing `otherCentersSelected`) would bring the real combined count to zero. `TOC-C-DD-3`'s original reasoning (treat the sentinel's cascade as equivalent to deleting a real chip, to stop a user from "laundering" a zero-count deletion through the sentinel) is explicitly overridden: the sentinel is a UI-shape control (it toggles whether the Other(s) dropdown is shown), not itself a Contributing CGIAR Center, and the product decision is that toggling it off must never be blocked.
- **Decision:** `deleteContributingCenter(index, updateComponent?)` no longer calls `blockIfLastCenter(...)` at all when the chip being removed is the `OTHER_CENTERS_CODE` sentinel — that branch proceeds directly to the existing filter/cascade logic unconditionally. The guard (`blockIfLastCenter`) still applies, unchanged, to: (a) removing a real (non-sentinel) chip from `contributing_center`, and (b) `deleteOtherCenter` (removing an individual "Other" chip). `getRealCenterCount()` and `hasTocPlannedCenter` are unchanged.
- **Alternatives considered:** Keep counting the cascade but only block when `otherCentersSelected` had 2+ entries (i.e., "half-measure") — rejected, the user was explicit that the sentinel is unconditionally deletable, not conditionally.
- **Consequences:** A user can now reach zero real Contributing CGIAR Centers via a single sentinel-chip deletion when `otherCentersSelected` held the only remaining real ToC-planned Center(s) and `contributing_center` held only the sentinel. This is an accepted, explicit product decision (confirmed by the user, not a defect) — the guard's remaining purpose is to stop deleting the *last real chip directly*, not to prevent the sentinel/UI-shape toggle. The `TOC-C-AC-5` test's fixture and assertions are inverted accordingly (see `tasks.md` `TOC-C-T-2`).

### `TOC-C-DD-5` — SUPERSEDES `TOC-C-DD-2`'s combined-count formula: the floor is scoped to ToC-origin (`contributing_center`) only

- **Context (Pivot, 2026-08-29, second post-approval correction, same day as `TOC-C-DD-4`):** The user clarified with a concrete scenario: if there are 2 Centers that come from the ToC AND the user additionally selected an "Other" Center, the guard must still allow deleting only **1** of the 2 ToC-origin Centers — not both — even though a manually-added "Other" Center is also selected. This means the combined-count formula from `TOC-C-DD-2` (real ToC-origin count + `otherCentersSelected.length`) is wrong: it let a user delete every ToC-origin Center as long as enough "Other" Centers existed to keep the *combined* total above zero, which defeats the actual intent (AC-6: the ToC's specific planned alignment must remain represented, not simply "some Center or other").
- **Decision:**
  - `getRealCenterCount()` now counts **only** non-sentinel entries in `contributing_center` — `otherCentersSelected.length` is no longer added.
  - `deleteContributingCenter`'s guard call for a real (non-sentinel) chip is unchanged in shape (`blockIfLastCenter(1)`), but now effectively enforces "at least 1 ToC-origin Center remains in `contributing_center`," independent of `otherCentersSelected`'s size.
  - `deleteOtherCenter` **no longer calls `blockIfLastCenter` at all** — removing an "Other" Center never affects the ToC-origin floor, so gating it against a count that ignores it entirely would be incoherent (and, under the old formula, could incorrectly block a same-array-unrelated deletion). `TOC-C-R-6` codifies this as its own requirement.
  - The sentinel-chip exemption from `TOC-C-DD-4` is unaffected and still applies (sentinel deletion always succeeds, regardless of any count).
- **Alternatives considered:** Keep the combined count but weight ToC-origin entries more heavily, or require "at least N ToC-origin where N = original planned count" — rejected as unnecessarily complex; the user's stated rule is a flat "≥1 ToC-origin remains," which is what `getRealCenterCount()` scoped to `contributing_center` alone already expresses with no new state.
- **Consequences:** `TOC-C-AC-4`'s original justification ("combined count governs") is now incorrect and is revised in `requirements.md` — the test's *outcome* (deleting the sole "Other" Center succeeds) is unchanged, but the *reason* is now "Other deletions are never gated," not "combined count was ≥1." A new discriminating test (`TOC-C-AC-7`) is required to catch a regression back to `TOC-C-DD-2`'s combined formula (2 ToC-origin + 1 Other present; deleting the 2nd ToC-origin chip must now block, where the old formula would have allowed it).

### Reversion challenge (Step 2.3)

This design **reverts already-shipped behavior**: today, every Contributing CGIAR Center chip (in either array, in either UI shape) is unconditionally deletable. Challenge: *what does removing this unconditional deletability break?*

- **Answer:** Nothing legitimate is broken. The only case newly blocked is emptying Contributing CGIAR Centers to zero while the linked ToC has planned Centers for that result — which is precisely the data-loss scenario `docs/prd.md` `AC-6` (ToC alignment presence) exists to prevent, enforced earlier (at delete-time) instead of only at submit-time, exactly as `TOC-SP-DD-1`'s reversion challenge concluded for the twin field. A user who genuinely has zero ToC-planned Centers is entirely unaffected (`TOC-C-AC-3`). No test, no other spec, and no documented UX pattern in this file relies on being able to remove the last ToC-planned Center chip. The one new consideration versus the twin spec — the flat/unmapped UI shape — does not change the answer: `TOC-C-AC-6` confirms the guard behaves the same way there.

---

## 13. Open Gaps & Follow-ups

- None. Both open items from the twin Science Program spec (the "reappears in Contributing CGIAR Centers" report, and `CustomizedAlertsFeService`'s missing ARIA `role`) are pre-existing and out of scope here — this spec does not touch either.

---

## Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 1 (implementation + unit tests together — Lite depth, same shape as the twin spec) |
| Expected LOC | ~55–75 (component: ~40–55 lines added/changed — slightly more than the twin due to the two-handler + two-UI-shape coverage; spec file: ~15–20 new test cases reusing existing test scaffolding) |
| Expected review rounds | 1 |

This is a small, single-file, client-only change — **Lite depth is confirmed correct** against this design (no split, no depth bump needed).

---

## Required cross-references

- [`requirements.md`](./requirements.md) (same folder)
- [`proposal.md`](./proposal.md) (same folder)
- `docs/prd.md` (`AC-6`)
- `docs/specs/changes/toc-science-program-guard/design.md` (`TOC-SP-DD-1`/`TOC-SP-DD-2`, the pattern this design mirrors)
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` — folder guide; **MUST be updated in the same commit** (per `onecgiar-pr-client/docs/COMPONENT-DOCS.md` convention) with a new dated entry documenting `TOC-C-DD-1..3`, following the existing `TOC-SP-DD-*` entry style in that file.
