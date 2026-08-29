# Design — Guard Against Removing All ToC-Planned Science Programs

## 1. Summary

Client-only guard added to the two Science Program deletion handlers in `rd-contributors-and-partners.component.ts`: when the result's ToC has planned Science Programs, block the deletion that would take the combined real Science Program count to zero, and show the existing `CustomizedAlertsFeService` blocking alert. No server, data-model, or API change. Biggest constraint: the "Other(s)" sentinel chip (`OTHER_SP_CODE`) is itself deletable and cascades to clear `otherScienceSelected` — the guard must count real Science Programs (excluding the sentinel) and account for that cascade, not just decrement by 1.

Requirements: [`requirements.md`](./requirements.md) (`TOC-SP-R-1..3`, `TOC-SP-AC-1..4`).

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/` — `rd-contributors-and-partners.component.ts` only. No template change (the delete `(click)` handlers already call `deleteScience(i)` / `deleteOtherScience(i)` — see `.component.html:348,372` — their signatures are unchanged).
- **Service touched:** none directly edited; reads existing `RdContributorsAndPartnersService` state (`scienceSelected`, `otherScienceSelected`, `tocReferenceSynergyInitiativeIds`, `partnersBody.result_toc_result.planned_result`).
- **No server, no CLARISA, no migration.**

### 2.2 Sequence (primary flow)

```
[Submitter clicks × on a Science Program chip]
  └── deleteScience(index) / deleteOtherScience(index)
        ├── compute hasTocPlannedScience (planned_result !== false AND tocReferenceSynergyInitiativeIds().length > 0)
        ├── IF hasTocPlannedScience AND (realScienceCount - willRemoveCount) <= 0
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

New private/internal members on `RdContributorsAndPartnersComponent` (no new files):

- `private getRealScienceCount(): number` — `(scienceSelected excluding OTHER_SP_CODE).length + otherScienceSelected.length`.
- `private get hasTocPlannedScience(): boolean` — `partnersBody?.result_toc_result?.planned_result !== false && tocReferenceSynergyInitiativeIds().length > 0`. Reuses the exact `planned_result !== false` condition already used in this file's `@if` branches (`bugfix/toc-unmapped-orange-notes`), combined with the live ToC synergy-id set already exposed by the service.
- `private blockIfLastScience(willRemoveCount: number): boolean` — returns `true` (and shows the alert) when the guard should block; `false` otherwise. Both delete handlers call this first and `return` early on `true`.

Modified methods (both already exist, signatures unchanged):

- `deleteScience(index: number)` — computes `willRemoveCount`: `1` for a normal chip, or `otherScienceSelected.length` when the removed chip is the `OTHER_SP_CODE` sentinel itself (because removing it cascades to clear `otherScienceSelected` via the existing `if (!this.showOtherScience) otherScienceSelected = []` line). Calls `blockIfLastScience(willRemoveCount)` before mutating.
- `deleteOtherScience(index: number)` — calls `blockIfLastScience(1)` before mutating.

No change to `applyTocMappingOnLoad`, `buildOtherScienceSentinel`, `onScienceSelect`, or any ToC-prefill logic.

### 6.3 Design system usage

- Reuses `CustomizedAlertsFeService.show(...)` (`shared/services/customized-alerts-fe.service.ts`), already injected in this component as `customizedAlertsFeSE` and already used in the same file (`onSyncSection`, line ~348) — no new alert mechanism.
- Alert call: `status: 'warning'`, no `confirmText` (renders a single "Ok" dismiss button — a blocking notice, not a confirm/cancel flow), a stable `id` (e.g. `'toc-science-program-min'`) distinct from other alert ids in this component (`'delete-tab'`).
- Alert copy follows the existing sibling notes in this file (`contributingScienceInfoNote`, `noScienceProgramsNote`) — **plain hardcoded string, not a new `TermKey`.** This field group has no P22 variant (`isCP2026()`-gated only), matching the precedent of its sibling notes; adding i18n scaffolding here would be inconsistent with the surrounding code, not more correct.
- No new component, no new route, no new a11y surface beyond what `CustomizedAlertsFeService` already provides (it renders a `role`-less DOM alert today — pre-existing, out of scope to change here).

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

- Unit tests (Jest, `rd-contributors-and-partners.component.spec.ts`) covering all four requirements scenarios:
  - `TOC-SP-AC-1` — delete down to 1 remaining (two sequential deletes), no alert, both succeed.
  - `TOC-SP-AC-2` — delete the last remaining chip → blocked, alert shown (assert `customizedAlertsFeSE.show` called), array unchanged.
  - `TOC-SP-AC-3` — no ToC-planned data (`tocReferenceSynergyInitiativeIds` empty, or `planned_result === false`) → unrestricted, no alert.
  - `TOC-SP-AC-4` — mixed ToC + Other, delete the Other one (combined count 2 → 1) → succeeds, no alert.
  - Sentinel-cascade case: deleting the `OTHER_SP_CODE` chip when it's the only thing keeping the real count above zero (e.g. 1 ToC SP + 1 Other SP, ToC-ref count is 0 so `hasTocPlannedScience` is false in that specific sub-case) — include one case where `hasTocPlannedScience` is true and the sentinel removal would cascade the real count to 0, to prove the cascade is actually counted (not just the sentinel chip's own removal).
- This folder (`rd-contributors-and-partners/`) is **excluded from Jest coverage** (`onecgiar-pr-client/CLAUDE.md` §"Coverage thresholds") — tests still run and still gate correctness; they just don't move the global coverage number. No Cypress CT needed (no `custom-fields/` component touched); existing `cypress/e2e/result-detail/contributors-and-partners.cy.ts` may optionally get one added scenario but is not required for this spec's Lite depth.

**Defect classes this spec can produce, and their gate:**

| Defect class | Gate |
|---|---|
| Guard fires when it shouldn't (over-blocking; e.g. blocks emptying the field when the result has no ToC-planned Science Programs) | `TOC-SP-AC-3` unit test — direct, automated |
| Guard fails to fire when it should (under-blocking; last chip deletable when ToC has planned SPs) | `TOC-SP-AC-2` unit test — direct, automated |
| Miscounting across the two arrays (sentinel counted as real, or `otherScienceSelected` cascade not counted) | `TOC-SP-AC-4` + the sentinel-cascade case above — direct, automated |
| Alert not shown / wrong alert shown on block | Assert the `customizedAlertsFeSE.show` call args (id/status) in the `TOC-SP-AC-2` test — direct, automated |

No defect class in this spec is a visual/rendered-output class (no new markup, reused alert component) — no class requires a human/T6 substitute; none is recorded as an accepted risk.

---

## 11. Backwards Compatibility & Migration Plan

- No API contract change, no migration, no data backfill.
- Behavior change is additive-restrictive only in the specific state (ToC-planned + last chip) that today allows an unintended data loss — see §12 reversion challenge.

---

## 12. Design Decisions (ADRs)

### `TOC-SP-DD-1` — Guard placed in the deletion handlers, not the multi-select `onRemove`/save-time

- **Context:** Need to stop the count reaching zero at the exact point of user action, with immediate feedback (per proposal §10 Option A).
- **Decision:** Add the check inside `deleteScience`/`deleteOtherScience`, before the existing filter-and-reassign line, mirroring exactly how `deleteOtherCenter` already guards a related invariant (clearing an orphaned lead) in the same file.
- **Alternatives considered:** (1) Disable the chip's × affordance when it's the last one — rejected, weaker feedback (proposal §10 Option B). (2) Validate only at save-time — rejected, delayed feedback and inconsistent with the existing immediate-alert pattern in this component (proposal §10 Option C).
- **Consequences:** The guard is duplicated across two methods (small, ~3 lines each) rather than centralized in one place; acceptable given the two methods already have separate mutation logic and no shared base method exists to hook into.

### `TOC-SP-DD-2` — Real count excludes the `OTHER_SP_CODE` sentinel and accounts for its cascade

- **Context:** `scienceSelected` can contain the `OTHER_SP_CODE` sentinel object as a rendered, deletable chip. Counting it as a "real" Science Program would let the guard both under-count (blocking one fewer real deletion than intended) and mis-fire on the sentinel's own removal, which has no direct real-SP effect but cascades to clear `otherScienceSelected`.
- **Decision:** `getRealScienceCount()` filters out `id === OTHER_SP_CODE`; `deleteScience` computes `willRemoveCount` as `otherScienceSelected.length` when the removed chip is the sentinel (the actual real-SP impact of that action), and `1` otherwise.
- **Alternatives considered:** Ignoring the sentinel-cascade case entirely (treat sentinel removal as `willRemoveCount = 0`) — rejected, it would let a user empty the field to zero by deleting only the sentinel chip when it was the sole thing gating `otherScienceSelected`'s visibility, defeating the guard's purpose.
- **Consequences:** `deleteScience` carries slightly more branching than a plain filter, but the alternative silently reopens the exact gap this spec exists to close.

### Reversion challenge (Step 2.3)

This design **reverts already-shipped behavior**: today, every Science Program chip (in either array) is unconditionally deletable. Challenge: *what does removing this unconditional deletability break?*

- **Answer:** Nothing legitimate is broken. The only case newly blocked is emptying Science Programs to zero while the linked ToC has planned Science Programs for that result — which is precisely the data-loss scenario `docs/prd.md` `AC-6` (ToC alignment presence) exists to prevent, just enforced earlier (at delete-time) instead of only at submit-time. A user who genuinely has zero ToC-planned Science Programs is entirely unaffected (`TOC-SP-AC-3`). No test, no other spec, and no documented UX pattern in this file relies on being able to remove the last ToC-planned chip.

---

## 13. Open Gaps & Follow-ups

- The "reappears in Contributing CGIAR Centers" report from the proposal remains unaddressed (out of scope, §11 of `proposal.md`) — no code path in this design touches `contributing_center` / `otherCentersSelected`.
- `CustomizedAlertsFeService`'s alert markup has no ARIA `role` (pre-existing, confirmed by reading the service) — not introduced or worsened by this design; flagged as a pre-existing a11y gap, not a new one.

---

## Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 1 (implementation + unit tests together — Lite depth) |
| Expected LOC | ~45–60 (component: ~35–45 lines added/changed; spec file: ~10–15 new test cases reusing existing test scaffolding) |
| Expected review rounds | 1 |

This is a small, single-file, client-only change — **Lite depth is confirmed correct** against this design (no split, no depth bump needed).

---

## Required cross-references

- [`requirements.md`](./requirements.md) (same folder)
- [`proposal.md`](./proposal.md) (same folder)
- `docs/prd.md` (`AC-6`)
- `docs/trd/trd.md` (workflows, terminology disambiguation only)
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` — folder guide; **MUST be updated in the same commit** (per `onecgiar-pr-client/docs/COMPONENT-DOCS.md` convention) with a new dated entry documenting `TOC-SP-DD-1`/`TOC-SP-DD-2`, following the existing `LC-DD-*` entry style in that file.
