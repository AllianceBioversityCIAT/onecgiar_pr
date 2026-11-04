# Tasks — Approved W3 bilateral opens the bilateral center page

## 1. Scope of this task list

- **Module / feature:** bilateral open-route (client)
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Sprint / target phase:** none
- **Owner / driver:** Santiago Sanchez
- **Status:** not-started
- **Mode:** Bug (regression test red before the fix, green after)

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved by proposal decisions (2026-09-24).
- [x] Open questions resolved (`BAO-OQ-1`); assumptions `BAO-P-5/6/7` carried to `BAO-T-3`.
- [x] No conflicting in-flight spec on `bilateral-result-open-route.util.ts` (last touched by archived `bilateral-w3-editing-route`).
- [x] No migration.

## 3. Task list

### `BAO-T-1` — Classifier: Approved W3 with lead center → center editor

- **Status:** [x] done 2026-09-24 (Reviewer PASS, see `execution.md`; commit pending)
- **Type:** client
- **Description:** Add `isApprovedStatus` (id 6, name fallback) and reorder `classifyBilateralOpenRoute` per design §6. Write the failing spec first.
- **Implements:** `BAO-R-1`, `BAO-R-3`, `BAO-R-4`, `BAO-R-5`, `BAO-R-6`, `BAO-R-8`, `BAO-AC-1..6`
- **Files (expected):** `onecgiar-pr-client/src/app/shared/routing/bilateral-result-open-route.util.ts`, `bilateral-result-open-route.util.spec.ts`
- **Depends on:** —
- **Blocks:** `BAO-T-2`
- **Estimate:** S
- **Review:** full (shared symbol, three consumers)
- **Verification:**
  - **Falsifier:** `{W3, Approved, leadCenter 'CIMMYT', code 28728, versionId 6}` must resolve to `['/bilateral','CIMMYT','result',28728]` + `{phase: 6}`; `SGP-02` Approved and empty-lead Approved must still resolve to Result Detail.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern="bilateral-result-open-route.util.spec"` (fails on the Approved case before the change, passes after).
  - **Disqualifier:** if a caller row has neither `statusId` nor `statusName` for Approved rows, stop and re-specify the input mapping.
  - **Consumers:** `results-list.component.ts`, `programme-results.component.ts`, `global-search-palette.component.ts` (all via `resolveBilateralResultOpenRoute` / `usesBilateralReviewFlow`).
- **Definition of done:**
  - [ ] Commit follows `<emoji> <type>(<scope>) [ticket]: <description>`, subject without apostrophes, `$` or quotes (Jenkins).
  - [ ] Lint clean (`npx ng lint --quiet` on touched files).
  - [ ] Scoped Jest green; no full suite.
  - [ ] No secret or token logged.

### `BAO-T-2` — Callers: specs and stale comments

- **Status:** [x] done 2026-09-24 (Reviewer PASS on attempt 2, see `execution.md`; commit pending)
- **Type:** client
- **Description:** Add Approved-W3 assertions to the three caller specs (URL, no drawer side effect); confirm `smartNav.rememberResultDetailOrigin()` is harmless on the bilateral route; update the stale "Approved opens Result Detail" comments.
- **Implements:** `BAO-R-2`, `BAO-R-7`, `BAO-AC-7`, `BAO-AC-8`, `BAO-AC-9`
- **Files (expected):** `results-list.component.ts` + spec, `programme-results.component.ts` + spec, `global-search-palette.component.ts` + spec
- **Depends on:** `BAO-T-1`
- **Blocks:** `BAO-T-3`
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier:** Approved W3 row in each surface navigates to `/bilateral/CIMMYT/result/28728?phase=6`; `showReviewDrawer` stays false.
  - **Red run:** `npx jest --testPathPattern="results-list.component.spec|programme-results.component.spec|global-search-palette.component.spec"`
  - **Disqualifier:** if the palette row has no `leadCenter` for W3 rows, raise it as a mapper task before continuing.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:**
  - [ ] Commit convention, no apostrophes in the subject.
  - [ ] Lint clean; scoped Jest green.
  - [ ] Folder `CLAUDE.md` touched by the edit is updated and its `Verified:` line re-stamped in the same commit.

### `BAO-T-3` — Browser verification and assumptions check

- **Status:** [x] done 2026-09-24 (manual, by the user; see `execution.md`)
- **Type:** tests
- **Description:** With `npm start` (own port), open an Approved closed-phase W3 row from Results Center, Programme Results and search; confirm URL, load, read-only form, and the real Approved `status_id`.
- **Implements:** `BAO-R-10`, `BAO-AC-10`, premises `BAO-P-5/6/7`
- **Files (expected):** none (evidence recorded in `execution.md`)
- **Depends on:** `BAO-T-2`
- **Blocks:** —
- **Estimate:** S
- **Review:** skip-eligible
- **Verification:**
  - **Falsifier:** `/bilateral/CIMMYT/result/28728?phase=6` renders the editor read-only; no "We couldn't load this result".
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** if the editor errors or lets a non-center user edit an Approved result, stop and re-specify (editor fix task).
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:**
  - [ ] Session injects both `token` and `user` in localStorage (client CLAUDE.md §9).
  - [ ] Evidence noted; `BAO-P-5/6/7` marked verified or refuted in `design.md`.

## 4. Dependency graph

```
BAO-T-1 ── BAO-T-2 ── BAO-T-3
```

No parallel branches.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BAO-TEST-1` | unit (client) | `BAO-R-1,3,4,5,6,8`, `BAO-AC-1..6` | `shared/routing/bilateral-result-open-route.util.spec.ts` |
| `BAO-TEST-2` | unit (client) | `BAO-AC-9` | `results-list.component.spec.ts` |
| `BAO-TEST-3` | unit (client) | `BAO-AC-8`, `BAO-R-7` | `programme-results.component.spec.ts` |
| `BAO-TEST-4` | unit (client) | `BAO-AC-7` | `global-search-palette.component.spec.ts` |
| `BAO-TEST-5` | manual browser | `BAO-AC-10` | Results Center, Programme Results, search |

Client coverage stays at 50/60/60/60.

## 6. Rollout & verification

- [ ] PR against `staging` with the commit convention.
- [ ] CI green.
- [ ] Manual check on staging with a real Approved row.

## 7. Cleanup & follow-ups

- [ ] Status to `shipped`; note the changed routing rule in `bilateral-result-creator/CLAUDE.md` if touched.
- [ ] Follow-up: Approved results in later phases (versioning), not this spec.

## 8. Roll-back plan

1. Revert the commit(s) for `BAO-T-1` and `BAO-T-2` (client only).
2. No migration or flag involved.
3. Approved W3 rows go back to Result Detail.

## Required cross-references

`requirements.md`, `design.md`, `docs/prd.md`, `docs/trd/trd.md`.
