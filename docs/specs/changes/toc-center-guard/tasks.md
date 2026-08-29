# Tasks — Guard Against Removing All ToC-Planned Contributing CGIAR Centers

## 1. Scope of this task list

- **Module / feature:** `results` → `rd-contributors-and-partners` (client-only)
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Depth:** Lite
- **Owner / driver:** Santiago Sanchez
- **Status:** executed (pending commit — see `execution.md`)

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] No open questions blocking.
- [x] No CLARISA dependency (client-only, no new catalog).
- [x] No conflicting in-flight spec on the same file — `changes/toc-science-program-guard`, `bugfix/lead-center-full-catalog`, and `bugfix/toc-unmapped-orange-notes` are already shipped/archived, not in-flight.
- [x] No migration involved.

---

## 3. Task list

### `TOC-C-T-1` — Add the minimum-Contributing-Center guard to delete handlers

- **Type:** `client`
- **Description:** In `rd-contributors-and-partners.component.ts`, add `getRealCenterCount()`, the `hasTocPlannedCenter` getter, and `blockIfLastCenter(willRemoveCount)` (design §6.2, `TOC-C-DD-1`, `TOC-C-DD-2`, `TOC-C-DD-3`). Wire both into `deleteContributingCenter(index, updateComponent?)` and `deleteOtherCenter(index)` so the last real Contributing CGIAR Center cannot be removed while the ToC has planned Centers for this result — showing the existing `customizedAlertsFeSE.show(...)` blocking alert (`status: 'warning'`, no `confirmText`, id `'toc-center-min'`) instead. No template change. Guard logic is new/standalone on the component — does not reuse the service's `getContributingCentersUnion()` / `isUnmappedOrFlat()` (`TOC-C-DD-2`).
- **Implements:** `TOC-C-R-1`, `TOC-C-R-2`, `TOC-C-R-3`, `TOC-C-R-4`, `TOC-C-R-5`, `TOC-C-AC-1`, `TOC-C-AC-2`, `TOC-C-AC-3`, `TOC-C-AC-4`, `TOC-C-AC-5`, `TOC-C-AC-6`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` (new dated entry, `TOC-C-DD-1..3`, per `onecgiar-pr-client/docs/COMPONENT-DOCS.md`)
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S` (single file's logic + tests, ~55–75 LOC per design budget)
- **Scope (in):**
  - `getRealCenterCount()`, `hasTocPlannedCenter`, `blockIfLastCenter()` as private/internal members on the component.
  - Early-return guard in both delete handlers, computing `willRemoveCount` per `TOC-C-DD-3` (sentinel-removal case = `otherCentersSelected.length`; normal chip = `1`), placed before any existing side effect (lead-code clearing, `updatingLeadData` toggling).
- **Scope (out — do NOT touch):**
  - `applyTocMappingOnLoad`, `preselectCentersEffect`, `onContributingCenterSelect`, `onOtherCenterSelect`, any ToC-prefill logic.
  - `onLeadCenterSelected`, `getContributingCentersUnion`, `isUnmappedOrFlat`, `setPossibleLeadCenters`, or any other Lead Center auto-sync logic (service or component).
  - `deleteScience`, `deleteOtherScience`, or any Contributing Science Program logic (already guarded by `changes/toc-science-program-guard`).
  - The alert component itself (`CustomizedAlertsFeService`) — reuse only, no edits.
- **Tests:**
  - `TOC-C-AC-1` — 3 ToC-planned Centers, delete 2 sequentially → both succeed, no alert, 1 remains.
  - `TOC-C-AC-2` — 1 remaining ToC-planned Center, attempt delete → blocked, `customizedAlertsFeSE.show` called once with `status: 'warning'` and id `'toc-center-min'`, array unchanged.
  - `TOC-C-AC-3` — `tocReferenceCenterInstitutionIds()` empty (or `planned_result === false`), delete all chips → all succeed, no alert call.
  - `TOC-C-AC-4` — split CP2026 UI, 1 ToC-origin + 1 "Other" Center, delete the Other one → succeeds (combined count 2→1), no alert.
  - `TOC-C-AC-5` (sentinel-cascade case) — ToC guard active, sentinel chip is the only thing keeping the real count above zero → deleting the sentinel via `deleteContributingCenter` is blocked exactly as if deleting a real chip.
  - `TOC-C-AC-6` (flat/unmapped UI parity) — same allow-down-to-one and block-the-last scenarios repeated with only `contributing_center` populated (no split, no `otherCentersSelected`) to prove the guard isn't implicitly coupled to the split UI shape.
- **Negative / boundary checks the tests MUST also assert** (per `BUT`/`AND IT MUST` coverage rule):
  - BUT the guard must NOT fire when `hasTocPlannedCenter` is false, even at zero remaining chips (`TOC-C-AC-3`) — this is the over-blocking failure mode; a passing `TOC-C-AC-2` alone does not prove this, a separate assertion that `show` was NOT called in the `TOC-C-AC-3` case is required.
  - AND IT MUST count `otherCentersSelected` toward the real total even when the sentinel (not a real chip) is what's being deleted (`TOC-C-DD-3` cascade case, `TOC-C-AC-5`) — a test that only deletes real chips does not exercise this branch.
  - AND IT MUST produce the same block/allow outcome in the flat/unmapped UI as in the split UI (`TOC-C-AC-6`) — a test suite that only exercises the split UI (as the twin Science Program spec's suite does, since that field has no flat variant) would leave this asymmetry uncovered.
- **What the test suite CANNOT verify (accepted, per design §10):** no visual/rendered-output defect class exists in this change (no new markup); nothing is deferred to a human/T6 check.
- **Definition of done:**
  - [~] Code merged via the project commit convention (`🔧 fix(rd-contributors-and-partners): <description>` — matches sibling commits `7bee37dec`, `c56be9d79`, `860667baa`, `6687adbf1` in this same folder). Implemented and reviewed; commit pending explicit user go-ahead (see `execution.md`).
  - [x] Lint clean (`npx ng lint --quiet`).
  - [x] All 6 test cases above pass (`npx jest --silent --reporters=summary --no-coverage -- --testPathPattern="rd-contributors-and-partners.component.spec"`) — 77/77 passed.
  - [x] No secret/token leaked in logs or messages.
  - [x] No API/DTO surface changed (n/a — client-only).
  - [x] No i18n `TermKey` needed — confirmed consistent with sibling hardcoded notes (`noCentersNote`, `contributingScienceInfoNote`) in the same file, per design §6.3.
  - [x] `rd-contributors-and-partners/CLAUDE.md` updated with a new dated `TOC-C-DD-1..3` entry (component-docs convention). `Verified:` hash stamp still needs updating once committed.
  - [x] No bilateral/platform-report payload touched — n/a, no change-log entry needed.

---

### `TOC-C-T-2` — Correction: sentinel chip is always deletable (supersedes part of `TOC-C-T-1`)

- **Type:** `client`
- **Status:** `[x]`
- **Description:** Per `TOC-C-DD-4` (Pivot, 2026-08-29): remove the `blockIfLastCenter(...)` call from the sentinel-removal branch of `deleteContributingCenter` — deleting the `OTHER_CENTERS_CODE` chip must always succeed, regardless of the cascade on `otherCentersSelected`. The guard stays unchanged for real-chip removal (`deleteContributingCenter` on a non-sentinel chip, and `deleteOtherCenter`).
- **Implements:** `TOC-C-R-4` (revised), `TOC-C-AC-5` (revised)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts` — invert `TOC-C-AC-5`'s assertions (now asserts the delete succeeds and no alert fires).
- **Depends on:** `TOC-C-T-1`
- **Scope (out — do NOT touch):** `deleteOtherCenter`'s guard, `getRealCenterCount()`, `hasTocPlannedCenter`, any other requirement's behavior.
- **Definition of done:**
  - [x] `deleteContributingCenter` skips the guard entirely when removing the sentinel chip.
  - [x] `TOC-C-AC-5` test inverted and passing (sentinel deletion always succeeds, no alert).
  - [x] All other existing tests (`TOC-C-AC-1..4`, `TOC-C-AC-6`) still pass unchanged.
  - [x] Lint clean.

---

### `TOC-C-T-3` — Correction: floor scoped to ToC-origin count only (supersedes `TOC-C-DD-2`'s combined formula)

- **Type:** `client`
- **Status:** `[x]`
- **Description:** Per `TOC-C-DD-5` (Pivot, 2026-08-29): `getRealCenterCount()` must count only non-sentinel entries in `contributing_center` (drop `+ otherCentersSelected.length`). `deleteOtherCenter` must no longer call `blockIfLastCenter` at all — removing an "Other" Center is never blocked. `deleteContributingCenter`'s real-chip guard call stays `blockIfLastCenter(1)` (unchanged shape; the count source it reads from is what changed).
- **Implements:** `TOC-C-R-1` (revised), `TOC-C-R-6` (new), `TOC-C-AC-4` (revised reasoning), `TOC-C-AC-7` (new), `TOC-C-AC-8` (new)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts` — add `TOC-C-AC-7` (2 ToC-origin + 1 Other; delete both ToC ones, 2nd is blocked) and `TOC-C-AC-8` (0 ToC-origin edge state; deleting an Other entry always succeeds).
- **Depends on:** `TOC-C-T-2`
- **Scope (out — do NOT touch):** the sentinel-exemption logic from `TOC-C-T-2` (`isRemovingOtherSentinel` branch), `hasTocPlannedCenter`, `blockIfLastCenter`'s internal formula/alert shape.
- **Definition of done:**
  - [x] `getRealCenterCount()` no longer references `otherCentersSelected`.
  - [x] `deleteOtherCenter` has no `blockIfLastCenter` call.
  - [x] `TOC-C-AC-7` test added and passing (discriminates old combined-count formula from the new ToC-origin-only floor).
  - [x] `TOC-C-AC-8` test added and passing.
  - [x] All prior tests (`TOC-C-AC-1..6`) still pass — re-verify `TOC-C-AC-4`'s description/comment reflects the new reasoning even though its assertions are unchanged.
  - [x] Lint clean.

---

## 4. Dependency graph

```
TOC-C-T-1  →  TOC-C-T-2  →  TOC-C-T-3  (two corrections, both Pivot 2026-08-29)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `TOC-C-TEST-1` | unit (client, Jest) | `TOC-C-R-1`, `TOC-C-AC-1` | `rd-contributors-and-partners.component.spec.ts` |
| `TOC-C-TEST-2` | unit (client, Jest) | `TOC-C-R-1`, `TOC-C-AC-2` | `rd-contributors-and-partners.component.spec.ts` |
| `TOC-C-TEST-3` | unit (client, Jest) | `TOC-C-R-2`, `TOC-C-AC-3` | `rd-contributors-and-partners.component.spec.ts` |
| `TOC-C-TEST-4` | unit (client, Jest) | `TOC-C-R-3`, `TOC-C-AC-4` | `rd-contributors-and-partners.component.spec.ts` |
| `TOC-C-TEST-5` | unit (client, Jest) | `TOC-C-R-4`, `TOC-C-DD-3` sentinel-cascade, `TOC-C-AC-5` | `rd-contributors-and-partners.component.spec.ts` |
| `TOC-C-TEST-6` | unit (client, Jest) | `TOC-C-R-5`, `TOC-C-AC-6` | `rd-contributors-and-partners.component.spec.ts` |

Note: this folder is excluded from `collectCoverageFrom` (`onecgiar-pr-client/CLAUDE.md` §"Coverage thresholds") — tests still run and gate correctness; they do not move the global coverage percentage. No new Cypress CT is required (no `custom-fields/` component touched).

---

## 6. Rollout & verification

- [ ] PR opened against `staging` (or per current release cadence) with commit message per convention.
- [ ] CI green: lint, Jest, build. No `migration:check:ci` impact (no migration).
- [ ] Manual QA on staging: open a result whose selected indicator's ToC has planned Contributing CGIAR Centers (both a CP2026-mapped result and a flat/unmapped one); delete down to one, confirm alert on the last one; open a result with no ToC-planned Centers, confirm unrestricted deletion still works.
- [ ] No downstream (bilateral/platform-report) consumer to notify — payload shape unchanged.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged.

---

## 8. Roll-back plan

1. Revert the single PR for `TOC-C-T-1`.
2. No migration to revert (client-only, no schema change).
3. No feature flag involved — the guard ships unconditionally; reverting the commit fully restores prior unrestricted-deletion behavior.
4. No bilateral/platform-report payload to check — unaffected.
5. No downstream consumer notification needed.

---

## Required cross-references

- [`requirements.md`](./requirements.md), [`design.md`](./design.md), [`proposal.md`](./proposal.md) (same folder)
- `docs/prd.md` (`AC-6`)
- `docs/specs/changes/toc-science-program-guard/tasks.md` (`TOC-SP-T-1`, the task shape this mirrors)
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` (updated as part of `TOC-C-T-1`'s Definition of Done)
