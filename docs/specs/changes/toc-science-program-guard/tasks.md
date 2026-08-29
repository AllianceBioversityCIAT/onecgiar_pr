# Tasks — Guard Against Removing All ToC-Planned Science Programs

## 1. Scope of this task list

- **Module / feature:** `results` → `rd-contributors-and-partners` (client-only)
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Depth:** Lite
- **Owner / driver:** Santiago Sanchez
- **Status:** complete (pending commit — see `execution.md`)

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] No open questions blocking (the "reappears in Contributing CGIAR Centers" item is explicitly deferred, not blocking).
- [x] No CLARISA dependency (client-only, no new catalog).
- [x] No conflicting in-flight spec on the same file — `bugfix/lead-center-full-catalog` and `bugfix/toc-unmapped-orange-notes` are already archived/shipped, not in-flight.
- [x] No migration involved.

---

## 3. Task list

### `TOC-SP-T-1` — Add the minimum-Science-Program guard to delete handlers

- **Type:** `client`
- **Description:** In `rd-contributors-and-partners.component.ts`, add `getRealScienceCount()`, the `hasTocPlannedScience` getter, and `blockIfLastScience(willRemoveCount)` (design §6.2, `TOC-SP-DD-1`, `TOC-SP-DD-2`). Wire both into `deleteScience(index)` and `deleteOtherScience(index)` so the last real Science Program cannot be removed while the ToC has planned Science Programs for this result — showing the existing `customizedAlertsFeSE.show(...)` blocking alert (`status: 'warning'`, no `confirmText`) instead. No template change.
- **Implements:** `TOC-SP-R-1`, `TOC-SP-R-2`, `TOC-SP-R-3`, `TOC-SP-AC-1`, `TOC-SP-AC-2`, `TOC-SP-AC-3`, `TOC-SP-AC-4`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` (new dated entry, `TOC-SP-DD-1`/`TOC-SP-DD-2`, per `onecgiar-pr-client/docs/COMPONENT-DOCS.md`)
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S` (single file's logic + tests, ~45–60 LOC per design budget)
- **Scope (in):**
  - `getRealScienceCount()`, `hasTocPlannedScience`, `blockIfLastScience()` as private/internal members.
  - Early-return guard in both delete handlers, computing `willRemoveCount` per `TOC-SP-DD-2` (sentinel-removal case = `otherScienceSelected.length`; normal chip = `1`).
- **Scope (out — do NOT touch):**
  - `applyTocMappingOnLoad`, `buildOtherScienceSentinel`, `onScienceSelect`, any ToC-prefill logic.
  - `deleteOtherCenter`, `deleteContributingCenter`, Lead Center auto-sync (`onLeadCenterSelected`), or any Contributing-Centers array.
  - The alert component itself (`CustomizedAlertsFeService`) — reuse only, no edits.
- **Tests:**
  - `TOC-SP-AC-1` — 3 ToC-planned SPs, delete 2 sequentially → both succeed, no alert, 1 remains.
  - `TOC-SP-AC-2` — 1 remaining ToC-planned SP, attempt delete → blocked, `customizedAlertsFeSE.show` called once with `status: 'warning'`, array unchanged.
  - `TOC-SP-AC-3` — `tocReferenceSynergyInitiativeIds()` empty (or `planned_result === false`), delete all chips → all succeed, no alert call.
  - `TOC-SP-AC-4` — 1 ToC-origin + 1 "Other" SP, delete the Other one → succeeds (combined count 2→1), no alert.
  - Sentinel-cascade case (design §10): ToC guard active, sentinel chip is the only thing keeping the real count above zero → deleting the sentinel is blocked exactly as if deleting a real chip.
- **Negative / boundary checks the tests MUST also assert** (per `BUT`/`AND IT MUST` coverage rule):
  - BUT the guard must NOT fire when `hasTocPlannedScience` is false, even at zero remaining chips (`TOC-SP-AC-3`) — this is the over-blocking failure mode; a passing `TOC-SP-AC-2` alone does not prove this, a separate assertion that `show` was NOT called in the `TOC-SP-AC-3` case is required.
  - AND IT MUST count `otherScienceSelected` toward the real total even when the sentinel (not a real chip) is what's being deleted (`TOC-SP-DD-2` cascade case) — a test that only deletes real chips does not exercise this branch.
- **What the test suite CANNOT verify (accepted, per design §10):** no visual/rendered-output defect class exists in this change (no new markup); nothing is deferred to a human/T6 check.
- **Definition of done:**
  - [x] Code merged via the project commit convention (`🔧 fix(rd-contributors-and-partners): <description>` — Change track, but this is a defect-class fix in spirit; `fix` emoji/type matches existing sibling commits `c56be9d79`, `860667baa`, `6687adbf1` in this same folder). Original guard shipped `7bee37dec`; corrections committed `64d072490`, pushed to `qa-development-2026-ss`.
  - [x] Lint clean (`npx ng lint --quiet`).
  - [x] All 5 test cases above pass (`npx jest --silent --reporters=summary --no-coverage -- --testPathPattern="rd-contributors-and-partners.component.spec"`).
  - [x] No secret/token leaked in logs or messages.
  - [x] No API/DTO surface changed (n/a — client-only).
  - [x] No i18n `TermKey` needed — confirmed consistent with sibling hardcoded notes (`contributingScienceInfoNote`, `noScienceProgramsNote`) in the same file, per design §6.3.
  - [x] `rd-contributors-and-partners/CLAUDE.md` updated with a new dated `TOC-SP-DD-1`/`TOC-SP-DD-2` entry (component-docs convention) in the **same commit**.
  - [x] No bilateral/platform-report payload touched — n/a, no change-log entry needed.

---

### `TOC-SP-T-2` — Correction: sentinel chip is always deletable (supersedes part of `TOC-SP-T-1`, post-ship)

- **Type:** `client`
- **Status:** `[x]`
- **Description:** Per `TOC-SP-DD-3` (Pivot, 2026-08-29, corrective fix on top of already-shipped `7bee37dec`): remove the `blockIfLastScience(...)` call from the sentinel-removal branch of `deleteScience` — deleting the `OTHER_SP_CODE` chip must always succeed, regardless of the cascade on `otherScienceSelected`. The guard stays unchanged for real-chip removal (`deleteScience` on a non-sentinel chip, and `deleteOtherScience`).
- **Implements:** Corrects the sentinel-cascade behavior implied by `TOC-SP-DD-2` / the design §10 sentinel-cascade test.
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts` — invert the sentinel-cascade test (now asserts the delete succeeds and no alert fires).
- **Depends on:** `TOC-SP-T-1` (already shipped, `7bee37dec`)
- **Scope (out — do NOT touch):** `deleteOtherScience`'s guard, `getRealScienceCount()`, `hasTocPlannedScience`, any other requirement's behavior.
- **Definition of done:**
  - [x] `deleteScience` skips the guard entirely when removing the sentinel chip.
  - [x] Sentinel-cascade test inverted and passing (sentinel deletion always succeeds, no alert).
  - [x] All other existing tests (`TOC-SP-AC-1..4`) still pass unchanged.
  - [x] Lint clean.

---

### `TOC-SP-T-3` — Correction: floor scoped to ToC-origin count only (supersedes `TOC-SP-DD-2`'s combined formula)

- **Type:** `client`
- **Status:** `[x]`
- **Description:** Per `TOC-SP-DD-4` (Pivot, 2026-08-29): `getRealScienceCount()` must count only non-sentinel entries in `scienceSelected` (drop `+ otherScienceSelected.length`). `deleteOtherScience` must no longer call `blockIfLastScience` at all. `deleteScience`'s real-chip guard call stays `blockIfLastScience(1)` (unchanged shape).
- **Implements:** `TOC-SP-R-1` (revised), `TOC-SP-R-4` (new), `TOC-SP-AC-4` (revised reasoning), `TOC-SP-AC-5` (new), `TOC-SP-AC-6` (new)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts` — add `TOC-SP-AC-5` and `TOC-SP-AC-6`.
- **Depends on:** `TOC-SP-T-2`
- **Scope (out — do NOT touch):** the sentinel-exemption logic from `TOC-SP-T-2`, `hasTocPlannedScience`, `blockIfLastScience`'s internal formula/alert shape.
- **Definition of done:**
  - [x] `getRealScienceCount()` no longer references `otherScienceSelected`.
  - [x] `deleteOtherScience` has no `blockIfLastScience` call.
  - [x] `TOC-SP-AC-5` and `TOC-SP-AC-6` tests added and passing.
  - [x] All prior tests still pass.
  - [x] Lint clean.

---

## 4. Dependency graph

```
TOC-SP-T-1 (shipped, 7bee37dec)  →  TOC-SP-T-2  →  TOC-SP-T-3  (two corrections, both Pivot 2026-08-29)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `TOC-SP-TEST-1` | unit (client, Jest) | `TOC-SP-R-1`, `TOC-SP-AC-1` | `rd-contributors-and-partners.component.spec.ts` |
| `TOC-SP-TEST-2` | unit (client, Jest) | `TOC-SP-R-1`, `TOC-SP-AC-2` | `rd-contributors-and-partners.component.spec.ts` |
| `TOC-SP-TEST-3` | unit (client, Jest) | `TOC-SP-R-2`, `TOC-SP-AC-3` | `rd-contributors-and-partners.component.spec.ts` |
| `TOC-SP-TEST-4` | unit (client, Jest) | `TOC-SP-R-3`, `TOC-SP-AC-4` | `rd-contributors-and-partners.component.spec.ts` |
| `TOC-SP-TEST-5` | unit (client, Jest) | `TOC-SP-DD-2` sentinel-cascade | `rd-contributors-and-partners.component.spec.ts` |

Note: this folder is excluded from `collectCoverageFrom` (`onecgiar-pr-client/CLAUDE.md` §"Coverage thresholds") — tests still run and gate correctness; they do not move the global coverage percentage. No new Cypress CT is required (no `custom-fields/` component touched).

---

## 6. Rollout & verification

- [ ] PR opened against `staging` (or per current release cadence) with commit message per convention.
- [ ] CI green: lint, Jest, build. No `migration:check:ci` impact (no migration).
- [ ] Manual QA on staging: open a W1/W2 result whose selected indicator's ToC has planned Science Programs; delete down to one, confirm alert on the last one; open a result with no ToC-planned Science Programs, confirm unrestricted deletion still works.
- [ ] No downstream (bilateral/platform-report) consumer to notify — payload shape unchanged.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged.
- [ ] File a separate `bugfix/` proposal for the "reappears in Contributing CGIAR Centers" report **only if** it is reproduced with concrete steps (per `proposal.md` §11) — not a blocking follow-up of this spec.

---

## 8. Roll-back plan

1. Revert the single PR for `TOC-SP-T-1`.
2. No migration to revert (client-only, no schema change).
3. No feature flag involved — the guard ships unconditionally; reverting the commit fully restores prior unrestricted-deletion behavior.
4. No bilateral/platform-report payload to check — unaffected.
5. No downstream consumer notification needed.

---

## Required cross-references

- [`requirements.md`](./requirements.md), [`design.md`](./design.md), [`proposal.md`](./proposal.md) (same folder)
- `docs/prd.md` (`AC-6`)
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` (updated as part of `TOC-SP-T-1`'s Definition of Done)
