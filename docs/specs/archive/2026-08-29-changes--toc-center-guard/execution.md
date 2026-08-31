# Execution Log — Guard Against Removing All ToC-Planned Contributing CGIAR Centers

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/toc-center-guard` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Started | 2026-08-29 |

---

## 2. Task Execution History

### `TOC-C-T-1` — Add the minimum-Contributing-Center guard to delete handlers

**Final status:** PASS
**Date:** 2026-08-29
**Implementer attempts:** 2

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts` — added `getRealCenterCount()`, `hasTocPlannedCenter` getter, `blockIfLastCenter(willRemoveCount)`; wired into `deleteContributingCenter(index, updateComponent?)` and `deleteOtherCenter(index)` before any existing mutation/side-effect, per `TOC-C-DD-1..3`.
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts` — added `describe('TOC-C-T-1 — minimum Contributing CGIAR Center guard', ...)` covering `TOC-C-AC-1..6` (+ an `AC-3b` `planned_result === false` variant); added default `otherCentersSelected: []` / `tocReferenceCenterInstitutionIds: signal([])` to the shared `mockRdPartnersSE` fixture so pre-existing tests keep exercising unrestricted deletion.
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` — new dated entry documenting `TOC-C-DD-1..3`, mirroring the `TOC-SP-DD-*` entry style.
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners.component.spec"` → 1 suite / 77 tests passed. `npx ng lint --quiet` → clean.
- **Reviewer verdict:** **FAIL**
  - **Discovered Issue:** The `TOC-C-AC-5` sentinel-cascade test did not discriminate the behavior it claimed to prove — fixture used one Other center, so `otherCentersSelected.length === 1` was numerically identical to a naive `willRemoveCount = 1`. A mutation deleting the entire `TOC-C-DD-3` cascade logic would leave the test green.
  - **Violated Rule:** `tasks.md` §3 `TOC-C-T-1` negative/boundary check for `TOC-C-AC-5`; `design.md` §10 defect table row "Miscounting across the two arrays... cascade not counted".
  - **Remediation Suggestion:** Change the fixture to two Other centers so a naive `willRemoveCount = 1` would wrongly allow the delete (`2 - 1 = 1 > 0`), while the correct cascade computation (`2 - 2 = 0`) blocks it.

#### Attempt 2 (rework, effort bumped medium → high)

- **Files changed:** `rd-contributors-and-partners.component.spec.ts` only — added `OTHER_C2` fixture constant, changed `TOC-C-AC-5`'s `otherCentersSelected` fixture and assertion from `[OTHER_C]` to `[OTHER_C, OTHER_C2]`. No implementation or other test changes.
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners.component.spec"` → 1 suite / 77 tests passed. `npx ng lint --quiet` → clean.
- **Reviewer verdict:** **PASS** — confirmed the fixture now carries 2 Other centers, traced `deleteContributingCenter`/`getRealCenterCount` to show the test genuinely fails under a naive `willRemoveCount = 1` mutation (all 3 assertions break), and confirmed no other test/fixture/implementation code was touched.

**ADVISORY (4R lens, attempt 1 Reviewer, non-gating):**
- Reliability: `blockIfLastCenter` can show the alert when deleting the sentinel with `otherCentersSelected` already empty (`0 - 0 = 0`) even though no real Center is lost — state is barely reachable (the guard itself prevents getting there) and matches design §6.2/§2.2 exactly; not a violation.
- Readability: the component `CLAUDE.md` `Verified:` stamp reads `pending commit (TOC-C-T-1)` — re-stamp with the real commit hash once committed.
- Risk (pre-existing, not caused by this diff): `rd-contributors-and-partners/CLAUDE.md` is now ~231 lines against the 120-line cap in `onecgiar-pr-client/docs/COMPONENT-DOCS.md`. Worth a separate condensation pass; out of scope for this task.

**Requirements covered:** `TOC-C-R-1`, `TOC-C-R-2`, `TOC-C-R-3`, `TOC-C-R-4`, `TOC-C-R-5`; `TOC-C-AC-1..6`.

**Decisions made:** None beyond what `design.md` (`TOC-C-DD-1..3`) already specified — implementation mirrors the twin Science Program guard exactly, substituting Centers-specific signals.

**Issues encountered:** One rework round on test quality (mutation-survivable assertion) — resolved per remediation above; no spec ambiguity, no environment issue, no pivot.

**Not Done / Assumptions:** No commit was made during execution, per the standing project instruction that commits require explicit user go-ahead. The component `CLAUDE.md` `Verified:` line reads `pending commit (TOC-C-T-1)` and should be re-stamped with the real short hash when the commit lands (this is a docs-hygiene follow-up, not a functional gap — all code, tests, and doc content are complete and reviewed PASS).

**Final verification result:** Jest 77/77 passed, `ng lint` clean, Reviewer PASS on attempt 2.

---

## Pivot Record: `TOC-C-T-1` sentinel-deletion behavior

**Date:** 2026-08-29 (post-PASS, post-approval correction)

**Trigger:** The user clarified (in response to a direct clarifying question) that in both this field and its twin (Contributing Science Programs), the "Other(s)" sentinel chip must always remain deletable — including when its cascade (clearing `otherCentersSelected`) would bring the real combined count to zero. This overturns `TOC-C-DD-3`'s cascade-counting decision, which had already passed Reviewer review as part of `TOC-C-T-1`.

**Resolution:** Rather than reopening `TOC-C-T-1` (already `[x]`, Reviewer-PASSed), added a new superseding design decision `TOC-C-DD-4` in `design.md` and a new task `TOC-C-T-2` in `tasks.md`, keeping `TOC-C-DD-3`/`TOC-C-T-1` as historical record with an explicit "superseded" note. Also revised `requirements.md` `TOC-C-R-4` and `TOC-C-AC-5` in place, with the original text struck through and preserved for traceability.

**Cross-cutting effect:** The same correction applies to the twin, already-shipped `toc-science-program-guard` spec (`TOC-SP-DD-2` → superseded by new `TOC-SP-DD-3`, new task `TOC-SP-T-2`) — see that spec's own `execution.md` for its Pivot Record. Both corrections were implemented in a single Implementer pass (same file, same pattern) and reviewed together.

### `TOC-C-T-2` — Correction: sentinel chip is always deletable

**Final status:** PASS
**Date:** 2026-08-29
**Implementer attempts:** 1

- **Files changed:** `rd-contributors-and-partners.component.ts` (`deleteContributingCenter` now skips `blockIfLastCenter(...)` entirely when the removed chip is the `OTHER_CENTERS_CODE` sentinel; unchanged for real-chip removal and `deleteOtherCenter`), `rd-contributors-and-partners.component.spec.ts` (inverted `TOC-C-AC-5` to assert the sentinel deletion always succeeds), `rd-contributors-and-partners/CLAUDE.md` (new dated note for `TOC-C-DD-4`).
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners.component.spec"` → 77/77 passed. `npx ng lint --quiet` → clean.
- **Reviewer verdict:** **PASS** — confirmed the sentinel branch is fully unguarded (traced the method body to the end, no re-introduced block), real-chip and `deleteOtherCenter` paths byte-equivalent to the prior PASS, and the inverted test would have failed under the old (blocking) implementation (genuine discriminator, not just an inverted assertion).

**Requirements covered:** `TOC-C-R-4` (revised), `TOC-C-AC-5` (revised).

**Not Done / Assumptions:** None. Commit still pending explicit user go-ahead (unchanged from `TOC-C-T-1`'s note).

---

## Pivot Record: `TOC-C-T-2` count-scope correction (second pivot, same day)

**Date:** 2026-08-29 (immediately after `TOC-C-T-2`'s Pivot)

**Trigger:** User gave a concrete scenario to test the sentinel-exemption fix: if 2 Centers come from the ToC and the user also selected an "Other" Center, only 1 of the 2 ToC-origin Centers should be deletable — attempting the 2nd must still block, even with the Other Center present. This revealed that `TOC-C-DD-2`'s original combined-count formula (`getRealCenterCount()` summing `contributing_center` + `otherCentersSelected`) was itself wrong, not just the sentinel-cascade handling fixed by `TOC-C-DD-4` — the guard must floor on ToC-origin count alone, ignoring "Other" entirely.

**Resolution:** Added superseding design decision `TOC-C-DD-5` in `design.md`, revised `requirements.md` (`TOC-C-R-1`, new `TOC-C-R-6`, revised `TOC-C-AC-4` reasoning, new `TOC-C-AC-7`/`TOC-C-AC-8`), and new task `TOC-C-T-3` in `tasks.md`. Same cross-cutting effect on the twin `toc-science-program-guard` spec (`TOC-SP-DD-4`, `TOC-SP-T-3`) — implemented and reviewed in the same pass.

### `TOC-C-T-3` — Correction: floor scoped to ToC-origin count only

**Final status:** PASS
**Date:** 2026-08-29
**Implementer attempts:** 1

- **Files changed:** `rd-contributors-and-partners.component.ts` (`getRealCenterCount()` no longer adds `otherCentersSelected.length`; `deleteOtherCenter` no longer calls `blockIfLastCenter` at all), `rd-contributors-and-partners.component.spec.ts` (added `TOC-C-AC-7`: 2 ToC-origin + 1 Other, 2nd ToC-origin deletion now blocked; `TOC-C-AC-8`: 0-ToC-origin edge state, Other deletion always succeeds; updated `TOC-C-AC-4`'s description), `CLAUDE.md` (new dated note for `TOC-C-DD-5`).
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners.component.spec"` → 81/81 passed. `npx ng lint --quiet` → clean.
- **Reviewer verdict:** **PASS** — confirmed the combined-count term is fully removed (not conditionally excluded), `deleteOtherCenter` has no guard call anywhere, `TOC-C-AC-7`/`TOC-C-AC-8` are genuine discriminators (manually traced old vs. new formula against each fixture — both would fail under the superseded combined formula), no bad interaction with the sentinel-exemption from `TOC-C-T-2`, and no scope creep into other methods.
- **ADVISORY (process, non-gating):** the Implementer also flipped the `[x]` checkboxes for `TOC-C-T-3` in `tasks.md` itself — normally the Leader's post-PASS bookkeeping. No code/test defect; the checkbox state is correct now that this PASS confirms it, so left as-is.

**Requirements covered:** `TOC-C-R-1` (revised), `TOC-C-R-6` (new), `TOC-C-AC-4` (revised reasoning), `TOC-C-AC-7` (new), `TOC-C-AC-8` (new).

**Not Done / Assumptions:** None. Commit still pending explicit user go-ahead.

---

## 3. Summary

All tasks in `tasks.md` are complete (`TOC-C-T-1` → `[x]`, `TOC-C-T-2` → `[x]`, `TOC-C-T-3` → `[x]`). Budget (`design.md` §"Budget (Step 2.4)") expected 1 task / 1 review round; actual was 3 tasks / 4 review rounds total (one rework attempt on test rigor in `TOC-C-T-1`, plus two same-day post-approval Pivot corrections triggered by user clarifications on the exact guard semantics, not defects) — not escalated as a tripwire since the overage traces entirely to scope clarification on a genuinely ambiguous requirement, not underestimation or rework failure.

Outstanding before this spec can be marked `shipped` (per `tasks.md` §6/§7):
- User approval to commit (no auto-commit per standing instruction) — commit message should follow `🔧 fix(rd-contributors-and-partners): <description>` convention, matching sibling commits `7bee37dec`, `c56be9d79`, `860667baa`, `6687adbf1`.
- Re-stamp `rd-contributors-and-partners/CLAUDE.md`'s `Verified:` line with the real commit hash in that same commit.
- PR opened against `staging` (or current release cadence); manual QA per `tasks.md` §6.
