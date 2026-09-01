# Tasks — Lead Center Independent of Contributing Centers

## 1. Scope of this task list

- **Module / feature:** `bugfix/lead-center-full-catalog`
- **Linked spec:** `docs/specs/bugfix/lead-center-full-catalog/requirements.md` + `design.md`
- **Depth:** Lite (Bug Mode)
- **Owner / driver:** Santiago Sanchez
- **Status:** not-started

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions resolved (`LC-OQ-1` → resolved in `design.md` `LC-DD-3`: no IPSR note needed).
- [x] No external CLARISA dependency change — `GET_AllCLARISACenters()` reused as-is.
- [x] No conflicting in-flight spec touching `RdContributorsAndPartnersService` found under `docs/specs/`.
- [x] No migration involved (client-only fix).

## 3. Task list

### `LC-T-1` — Decouple `possibleLeadCenters` from Contributing Centers and relocate auto-assign `[x]`

- **Type:** `client | tests | docs`
- **Description:** In `rd-contributors-and-partners.service.ts`, change `setPossibleLeadCenters()` to unconditionally set `possibleLeadCenters` from the full `centersSE.centersList` (mapped to `{ ...center, selected: false, disabled: false }`), removing the `contributing_center?.length > -1 || otherCentersSelected?.length > 0` guard and the `.filter(...)`. Change `tryAutoAssignLeadCenter()` to compute the single-center auto-assign check from the de-duplicated union of `partnersBody.contributing_center` and `otherCentersSelected` (by `code`) instead of `possibleLeadCenters.length`. Add the regression test proving the bug is fixed (red before, green after). Update `rd-contributors-and-partners/CLAUDE.md`'s "Lead center" trampa entry to describe the corrected behavior and re-stamp its `Verified:` line, per repo convention.
- **Implements:** `LC-R-1`, `LC-R-2`, `LC-R-3`, `LC-AC-1`, `LC-AC-2`, `LC-AC-3` (partial — required-field behavior), `LC-DD-1`, `LC-DD-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.spec.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`
- **Depends on:** `—`
- **Blocks:** `LC-T-2`, `LC-T-3`
- **Estimate:** `M`
- **Definition of done:**
  - [x] `possibleLeadCenters` equals the full mapped `centersSE.centersList` when `contributing_center` and `otherCentersSelected` are both empty — regression test (`LC-TEST-1`) fails against the pre-fix code and passes after.
  - [x] `possibleLeadCenters` still equals the full catalog (not a subset) when Contributing Centers has entries — proves no accidental narrowing survived (`LC-TEST-2`).
  - [x] `leadCenterCode`, once set, is not cleared by adding/removing a Contributing Center, as long as the center remains in the catalog (`LC-TEST-3`).
  - [x] `tryAutoAssignLeadCenter()` still auto-assigns when exactly one Contributing Center is selected (via ToC or manual) and no valid `leadCenterCode` is set — proves `LC-DD-2`'s relocation preserves the existing convenience (`LC-TEST-4`).
  - [x] `tryAutoAssignLeadCenter()` does NOT auto-assign when two or more Contributing Centers are selected (`LC-TEST-5` — negative case, guards against the relocation over-firing).
  - [x] The `is_lead_by_partner` required-conditional path is untouched — existing tests for that branch still pass unmodified.
  - [x] Lint + format clean (`npx ng lint --quiet`).
  - [x] No secret/token leaked in logs or diffs.
  - [x] `rd-contributors-and-partners/CLAUDE.md` "Lead center" entry rewritten to match corrected behavior; `Verified:` date and commit hash re-stamped.
  - **Verification command:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners.service.spec"` from `onecgiar-pr-client/`.
  - **What would make this FAIL:** running the exact same command against the pre-fix `rd-contributors-and-partners.service.ts` (i.e., before this task's diff) must show `LC-TEST-1` failing (empty `possibleLeadCenters`) — if it does not fail on the old code, the test is not exercising the bug and is not evidence.
  - **What disqualifies a pass:** a green run where `LC-TEST-4`/`LC-TEST-5` were skipped or stubbed (e.g., `centersSE.centersList` mocked as a single-element array so `tryAutoAssignLeadCenter`'s old `.length === 1` path would have passed anyway) — that would certify the relocation without actually exercising it; the mock catalog MUST have 3+ centers so the two code paths (full-catalog length vs. Contributing-Centers-union length) are distinguishable.

### `LC-T-2` — Remove the stale Result Detail empty-state note `[x]`

- **Type:** `client | tests`
- **Description:** Remove the "Please select at least one contributing center to choose a lead center" note and its guiding condition from `rd-contributors-and-partners.component.html`. Add/update a component test asserting the note is never rendered, and that the Lead Center `app-pr-select` receives a non-empty `[options]` binding even with 0 Contributing Centers.
- **Implements:** `LC-R-4`, `LC-AC-1` (template-level assertion), `LC-AC-4`, `LC-DD-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts`
- **Depends on:** `LC-T-1`
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of done:**
  - [x] The note markup and its `*ngIf`/condition are removed from the template.
  - [x] Component test (`LC-TEST-6`) asserts the note's text is absent from the rendered DOM with 0 Contributing Centers.
  - [x] Component test (`LC-TEST-7`) asserts the Lead Center select's options array is non-empty with 0 Contributing Centers (full catalog present).
  - [x] `rd-contributors-and-partners.zoneless.spec.ts` still passes unmodified (guards the folder's known hide/re-show-via-timer regression class).
  - [x] Lint + format clean.
  - **Verification command:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners.component.spec|rd-contributors-and-partners.zoneless.spec"` from `onecgiar-pr-client/`.
  - **What would make this FAIL:** re-adding the note's string literal to the template and re-running — `LC-TEST-6` must catch it (fail) to count as evidence the assertion is real, not vacuous.
  - **What disqualifies a pass:** asserting only that the note's *string constant* was deleted from the `.ts`/`.html` source (a presence/absence grep) without rendering the component — that proves the source no longer contains the string, not that the rendered DOM never shows it (e.g., a leftover reference via `TermKey`/i18n dictionary would still render). The test MUST render the component (`TestBed`/`ComponentFixture`) and query the DOM.

### `LC-T-3` — Verify IPSR inherits the fix (no code change expected) `[x]`

- **Type:** `tests`
- **Description:** Add/extend `ipsr-contributors.component.spec.ts` (and `ipsr-contributors.zoneless.spec.ts` if applicable) to assert the Lead Center dropdown is populated with the full catalog when 0 Contributing CGIAR Centers are selected, confirming the shared-service fix reaches IPSR without any IPSR-specific code change. If the assertion fails, that is new information invalidating the design's "no code change expected" claim — stop and report to the user rather than patching IPSR silently, since it would mean a second, undiscovered divergence exists.
- **Implements:** `LC-R-10`, `LC-AC-1` (IPSR surface)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-contributors/ipsr-contributors.component.spec.ts`
- **Depends on:** `LC-T-1`
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Test (`LC-TEST-8`) constructs the IPSR component with 0 Contributing Centers and asserts `rdPartnersSE.possibleLeadCenters` (bound to the IPSR Lead Center select) is non-empty.
  - [x] No IPSR component/template code changed (confirms the shared-service design assumption); if a change turns out to be necessary, this task is marked blocked and escalated instead of silently expanding scope.
  - [x] Lint + format clean.
  - **Verification command:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="ipsr-contributors"` from `onecgiar-pr-client/`.
  - **What would make this FAIL:** if `LC-T-1`'s fix were reverted, this test must fail — confirming it actually exercises the shared service and isn't a tautology against a local IPSR mock.
  - **What disqualifies a pass:** mocking `RdContributorsAndPartnersService` itself in this spec (rather than using the real service or a fixture that goes through `setPossibleLeadCenters`) — that would prove the component reads a signal correctly, not that the shared fix reaches IPSR, which is the entire point of this task.

### `LC-T-4` — Auto-sync an empty-state Lead Center pick into Contributing Centers (resolves `LC-GAP-1`) `[x]`

- **Type:** `client | tests | docs`
- **Description:** In `rd-contributors-and-partners.service.ts`, add `_autoAddedLeadCenterCode: string | null` (reset in `resetState()`) and a new method `onLeadCenterSelected(code: string | null)` implementing the trigger/swap/no-op logic in `design.md` `LC-DD-4`. Wire it to the Lead Center `app-pr-select`'s `(selectOptionEvent)` in `rd-contributors-and-partners.component.html` (alongside the existing `[(ngModel)]="this.rdPartnersSE.leadCenterCode"`). In `rd-contributors-and-partners.component.ts`'s `deleteOtherCenter`, also clear `_autoAddedLeadCenterCode` when the removed center matches it (alongside the existing `leadCenterCode` clear at `:217-219`). Add regression tests proving `LC-GAP-1` is fixed (red before, green after) and that the swap doesn't accumulate entries. Update `rd-contributors-and-partners/CLAUDE.md`'s "Lead center" trampa entry to document the new auto-sync behavior and re-stamp `Verified:`.
- **Implements:** `LC-R-11`, `LC-R-12`, `LC-R-13`, `LC-AC-5`, `LC-AC-6`, `LC-AC-7`, `LC-DD-4`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.spec.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`
- **Depends on:** `LC-T-1` (uses `getContributingCentersUnion()`, `setPossibleLeadCenters()`)
- **Blocks:** `—`
- **Estimate:** `M`
- **Definition of done:**
  - [x] `LC-TEST-9` (regression): with Contributing Centers empty, selecting a Lead Center adds it to `otherCentersSelected` and `_autoAddedLeadCenterCode` is set — fails against pre-`LC-T-4` code (no auto-add happens today), passes after.
  - [x] `LC-TEST-10`: with the single auto-added entry present, selecting a DIFFERENT Lead Center removes the old entry and adds the new one — `otherCentersSelected` still has exactly 1 element, now for the new code.
  - [x] Clearing the Lead Center (`code` falsy) while in the auto-added state removes that entry, leaving Contributing Centers empty again.
  - [x] With 2+ Contributing Centers already present (or a single manually/ToC-added one, not the auto-added one), changing the Lead Center does NOT add or remove anything from Contributing Centers — `LC-R-13` / existing `LC-R-3` behavior intact, verified by an explicit negative test.
  - [x] `deleteOtherCenter` clears `_autoAddedLeadCenterCode` when the removed center was the auto-added one (no stale reference survives a manual delete).
  - [x] All `LC-T-1`/`LC-T-2`/`LC-T-3` tests still pass unmodified (no regression in the existing 8 test IDs).
  - [x] Lint + format clean (`npx ng lint --quiet`).
  - [x] `rd-contributors-and-partners/CLAUDE.md` "Lead center" entry updated with the auto-sync mechanic; `Verified:` re-stamped.
  - **Verification command:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners"` from `onecgiar-pr-client/`.
  - **What would make this FAIL:** running the same command against pre-`LC-T-4` code must show `LC-TEST-9` failing (no auto-add occurs, `otherCentersSelected` stays empty after selecting a Lead Center) — if it doesn't fail on the old code, the test isn't exercising the gap.
  - **What disqualifies a pass:** a test that only checks `leadCenterCode` was set (already true before this task) without also asserting `otherCentersSelected` gained the matching entry — that would certify the wrong half of the fix, since `leadCenterCode` was never the part that failed to persist.

### `LC-T-5` — Generalize the Lead Center auto-sync by active UI target field, fix `applyTocMappingOnLoad`'s sentinel reconciliation (`LC-DD-5`) `[x]`

- **Type:** `client | tests | docs`
- **Description:** In `rd-contributors-and-partners.service.ts`:
  1. Add a private `isUnmappedOrFlat()` helper: `!this.fieldsManagerSE.isContributorsPartners2026() || this.partnersBody.result_toc_result?.planned_result === false`.
  2. Rewrite `onLeadCenterSelected(code)` per `LC-DD-5` steps 1-4: no-op if `code` already in `getContributingCentersUnion()`; else remove the current `_autoAddedLeadCenterCode` entry (if any, from wherever it lives — filtering both `contributing_center` and `otherCentersSelected` by code is safe) before adding the new `code` via `isUnmappedOrFlat()`'s target-field rule (`contributing_center` directly if true, else `otherCentersSelected` + ensure the `OTHER_CENTERS_CODE` sentinel via the existing `buildOtherCentersSentinel()` helper, tracked by a new `_autoAddedSentinel: boolean`). If the auto-added entry's removal empties `otherCentersSelected` and `_autoAddedSentinel` is `true`, strip the sentinel too and reset the flag.
  3. Fix `applyTocMappingOnLoad` (`service.ts:441-448`): only re-add the sentinel when `tocCenters.length > 0 && otherCenters.length > 0`; when `tocCenters.length === 0`, set `contributing_center = tocCenters` (`[]`) with no sentinel regardless of `otherCenters.length`.
  4. Update `rd-contributors-and-partners/CLAUDE.md`'s "Lead center" trampa entry to describe `LC-DD-5`'s target-field rule and the `applyTocMappingOnLoad` fix; re-stamp `Verified:`.
- **Implements:** `LC-R-14`, `LC-R-15`, `LC-R-16`, `LC-R-17`, `LC-AC-8`, `LC-AC-9`, `LC-AC-10`, `LC-AC-11`, `LC-DD-5`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.spec.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`
- **Depends on:** `LC-T-4` (rewrites `onLeadCenterSelected`, reuses `_autoAddedLeadCenterCode`)
- **Blocks:** `—`
- **Estimate:** `L`
- **Definition of done:**
  - [x] `LC-TEST-11`: flat/unmapped (`isUnmappedOrFlat()` true), 0 Contributing Centers, selecting a Lead Center adds it directly to `contributing_center` — `otherCentersSelected` stays empty, no sentinel.
  - [x] `LC-TEST-12`: CP2026 + ToC-mapped, ToC brought real reference centers already in `contributing_center`, user selects a Lead Center NOT among them — it's added to `otherCentersSelected`, the sentinel is added to `contributing_center` (was not present before), `_autoAddedSentinel` is `true`.
  - [x] `LC-TEST-13`: same setup as `LC-TEST-12`, but the sentinel was ALREADY present (user had manually checked "Other(s)") before the Lead Center pick — after auto-add, `_autoAddedSentinel` stays `false` (this mechanism didn't add it, so it must not remove it later).
  - [x] `LC-TEST-14`: swap removes ONLY the auto-added entry — real ToC-derived centers in `contributing_center` are untouched; if `otherCentersSelected` becomes empty AND `_autoAddedSentinel` was `true`, the sentinel is also removed; if `_autoAddedSentinel` was `false` (pre-existing manual check), the sentinel survives.
  - [x] `LC-TEST-15`: selecting a Lead Center whose code is already in `contributing_center` (ToC-derived) is a no-op — `otherCentersSelected` and the sentinel are untouched.
  - [x] `applyTocMappingOnLoad` unit test: `tocCenters.length===0 && otherCenters.length>0` → no sentinel added, `contributing_center` is empty; `tocCenters.length>0 && otherCenters.length>0` → sentinel added (existing/unchanged behavior); `otherCenters.length===0` → unchanged (existing behavior).
  - [x] All prior `LC-T-1`..`LC-T-4` tests still pass (regression guard on the rewritten `onLeadCenterSelected`).
  - [x] Lint + format clean.
  - [x] `CLAUDE.md` updated, `Verified:` re-stamped.
  - **Verification command:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners"` from `onecgiar-pr-client/`.
  - **What would make this FAIL:** re-running `LC-TEST-11` against pre-`LC-T-5` code (which always targets `otherCentersSelected`) must show the center landing in the wrong field (`otherCentersSelected` non-empty, `contributing_center` still empty) — proving the test actually distinguishes the two targets.
  - **What disqualifies a pass:** any test that only checks `leadCenterCode` or a generic "something got added somewhere" without asserting WHICH array received the entry — the entire point of `LC-T-5` is correcting the target, so the target itself must be the assertion.

## 4. Dependency graph

```
LC-T-1 (service fix + regression tests + CLAUDE.md update)
   ├── LC-T-2 (Result Detail template cleanup + tests)
   ├── LC-T-3 (IPSR verification tests)
   └── LC-T-4 (auto-sync Lead Center into Contributing Centers, resolves LC-GAP-1)
          └── LC-T-5 (generalize target field by active UI + fix applyTocMappingOnLoad, LC-DD-5)
```

`LC-T-2`, `LC-T-3`, and `LC-T-4` are all parallel-safe once `LC-T-1` lands in isolation, BUT `LC-T-4` touches the same files as `LC-T-2` (`rd-contributors-and-partners.component.ts/.html/.component.spec.ts`) — run `LC-T-4` **serially after `LC-T-2`** to avoid a merge conflict on the same template/component, even though neither depends on the other's logic. `LC-T-3` (IPSR-only files) remains parallel-safe against both. `LC-T-5` must run after `LC-T-4` (it rewrites the same method) — not parallel-safe with it.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `LC-TEST-1` | unit (client, service) | `LC-R-1`, `LC-AC-1` | `.../rd-contributors-and-partners/rd-contributors-and-partners.service.spec.ts` |
| `LC-TEST-2` | unit (client, service) | `LC-R-1` (no narrowing) | same file |
| `LC-TEST-3` | unit (client, service) | `LC-R-3`, `LC-AC-2` | same file |
| `LC-TEST-4` | unit (client, service) | `LC-DD-2` (auto-assign preserved) | same file |
| `LC-TEST-5` | unit (client, service) | `LC-DD-2` (auto-assign negative case) | same file |
| `LC-TEST-6` | unit (client, component) | `LC-R-4`, `LC-AC-4` | `.../rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts` |
| `LC-TEST-7` | unit (client, component) | `LC-AC-1`, `LC-AC-3` | same file |
| `LC-TEST-8` | unit (client, component) | `LC-R-10`, `LC-AC-1` | `.../ipsr-contributors/ipsr-contributors.component.spec.ts` |

Client coverage note: `rd-contributors-and-partners/` is excluded from `collectCoverageFrom` (existing repo convention) — these tests gate correctness but do not move that percentage. `ipsr-contributors/` is not excluded and does count toward the 50/60/60/60 client thresholds.

## 6. Rollout & verification

- [ ] PR opened with commit format `<emoji> <type>(<scope>) [ticket]: <description>` — suggested scope `rd-contributors-and-partners.service` / `rd-contributors-and-partners` / `ipsr-contributors`, ticket `P25`.
- [ ] `npx ng lint --quiet` clean.
- [ ] All three tasks' Jest commands green (see per-task verification commands).
- [ ] Manual QA on `result/result-detail/<id>/contributor-partners?phase=36` and the IPSR Contributors tab: open a result with 0 ToC centers and 0 manual centers, confirm Lead Center is selectable and save succeeds once chosen.
- [ ] No bilateral/platform-report payload impact (out of scope) — no change log entry needed.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified in staging.
- [ ] No new cross-cutting UX/technical decision to promote — this is a scoped bug fix using existing patterns.
- [ ] Open Gaps from `design.md` §13 (stale `leadCenterCode` referencing a deactivated catalog center) remain a known, unchanged, out-of-scope edge case — no follow-up ticket filed unless the user requests one.

## 8. Roll-back plan

1. Revert the PR containing `LC-T-1`, `LC-T-2`, `LC-T-3`.
2. No migration to revert (client-only change).
3. No feature flag involved.
4. No bilateral/platform-report payload to restore.
5. No downstream consumers to notify (client-internal fix).

## Estimated LOC & PR Strategy

- **Estimated LOC:** ~60 (service ~25, template removal ~10, tests ~25 net).
- **Recommendation:** single PR — all three tasks are small, tightly related, and share one review context (one shared-service fix + its two consumer verifications). Splitting would add review overhead without isolating risk.

## Required cross-references

- `docs/specs/bugfix/lead-center-full-catalog/requirements.md`, `design.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `onecgiar-pr-client/CLAUDE.md`, `onecgiar-pr-client/src/CLAUDE.md`, `onecgiar-pr-client/.../rd-contributors-and-partners/CLAUDE.md`.
