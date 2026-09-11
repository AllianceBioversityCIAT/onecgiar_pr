# Archive Summary — Innovation Development (P25) save fails with HTTP 500 from phase 2026

## 1. Document Control

| Field | Value |
|---|---|
| Module code | `IDEV` |
| Original spec path | `docs/specs/bugfix/innovation-dev-p25-save-500/` |
| Type | Bug · Depth: Lite |
| Archive date | 2026-09-08 |
| Branch | `qa-development-2026-ss` (spec branch — default is `master`) |
| Final status | **Bug is closed in production — but NOT by this spec's own work product.** `IDEV-T-1` (as designed and as `execution.md` reports it — Reviewer PASS, 12/12 tests, red→green regression proof) was **never the code that shipped**. A teammate landed an independent, differently-shaped fix for the same underlying defect and the same ticket one day before this spec's own proposal date. See §7 for the full drift finding. This archive closes the spec's paperwork as **superseded**, not as a shipped deliverable of this spec's execution. |

## 2. Requirements Delivered

| ID | Statement | Status |
|---|---|---|
| `IDEV-R-1` | Save succeeds when `responsible_innovation_and_scaling.q4` is absent (phase 2026+ shape) | **Satisfied in production today** — but by the superseding commit's `_saveNestedQuestionGroup()` refactor, not by this spec's designed 8-site guard patch. |
| `IDEV-R-2` | Save succeeds when `intellectual_property_rights.q4` is absent | Same — satisfied in production, by the superseding fix. |
| `IDEV-R-3` | Full `q1..q4` payload (pre-2026 shape) still saves identically | Satisfied — the superseding fix is a generic slot-iteration helper, so it does not special-case away the full-payload behavior either. |
| `IDEV-R-10` | Guard every `qN` slot uniformly, not just the confirmed-missing `q4` | Satisfied by construction in the superseding fix (`_saveNestedQuestionGroup` iterates whatever slots exist for any group, not a per-`qN` hardcode) — arguably a cleaner realization of this exact requirement than this spec's own `design.md` `IDEV-DD-1` (which called for 8 separate hardcoded guard sites). |

The **outcome** this spec set out to achieve is real and live. The **mechanism** is not this spec's own.

## 3. Files Changed Summary

**What `execution.md` claims was changed (attempt 1, reported PASS):**

| File | Claimed change |
|---|---|
| `onecgiar-pr-server/.../innovation_dev/innovation_dev.service.ts` | 8 read sites guarded: `?.group?.qN?.radioButtonValue`, `?.group?.qN?.options ?? []`, across `responsible_innovation_and_scaling` and `intellectual_property_rights` × `q1..q4` |
| `onecgiar-pr-server/.../innovation_dev/innovation_dev.service.spec.ts` | 2 new regression tests (missing `responsible_innovation_and_scaling.q4`; missing `intellectual_property_rights.q4`) |

**What is actually in the repository today (verified via `git log` + direct file read, 2026-09-08):**

- `git log` for `innovation_dev.service.ts` shows exactly **one** commit touching this defect: `0f849b61d` — `🔧 fix(innovation-development) P2-3557: Save the 2026 questionnaire that arrives without q4`, authored by **Yecksin Mauricio**, **2026-09-02 02:59** (one day *before* this spec's own `proposal.md`/`execution.md` dates of 2026-09-03). No commit matching this spec's described 8-site guard pattern exists anywhere in the file's history.
- The live method (`saveInnovationDev()`) calls a generic `_saveNestedQuestionGroup(resultId, user.id, group)` helper for both `responsible_innovation_and_scaling` and `intellectual_property_rights` — a structurally different fix than the one `design.md`/`execution.md` describe. Per the shipped commit's own message: `resolveScalingSlotsForPhase` now returns only the slots a given phase actually owns (question 137 was retired for phase ≥2026 with no replacement), and the save path was reworked to iterate exactly those slots rather than assume `q1..q4` always exist.
- No trace of this spec's own regression tests (`innovation_dev.service.spec.ts` cases for a deleted `q4` key, as described in `execution.md`) was found in the current test file history for this defect.

## 4. Test Evidence Summary

`execution.md` reports (for the spec's own, non-shipped fix): `npx jest --testPathPattern="innovation_dev.service"` → 12/12 passing, red→green regression proof via `git stash` cycle, `eslint` clean. **This evidence describes a patch that was not the one merged** — it cannot be treated as evidence for what is live today. No independent test evidence for the actually-shipped commit (`0f849b61d`) was reviewed as part of this archive pass; that commit carries its own history and review trail outside this spec's tracking.

## 5. Validation Summary

Reviewer verdict recorded in `execution.md` was **PASS**, against the spec's own (non-shipped) patch. No `validation-report.md` exists. This PASS verdict is **not evidence of the current production behavior** — it reviewed code that was superseded before or shortly after this spec's own execution ran.

## 6. Accepted Warnings / Follow-Ups

- **The pre-existing `In([])` no-op query** flagged as an ADVISORY in `execution.md` (a `find({ result_question_id: In([]) })` round-trip that can never match, when a slot's `options` resolves to `[]`) — not verified against the actually-shipped `_saveNestedQuestionGroup` implementation; may or may not still apply. Not re-investigated as part of this archive pass (out of scope for closing the paperwork).
- **Manual QA** (`IDEV-TEST-4`, curl/app smoke test against a real phase-2026+ result) — `execution.md` records this as outstanding at the time this spec's own work concluded. Moot now: the bug is independently confirmed closed in production via the superseding commit, so this checklist item is not being chased further under this spec.

## 7. Historical Notes — the drift finding (read this before trusting anything else in this folder)

**This spec's diagnosis (`proposal.md`) was accurate — its own fix was not what shipped.** Sequence, as best reconstructed from git history:

1. **2026-09-02, 02:59** — Yecksin Mauricio commits `0f849b61d` on (apparently) a different branch/lineage, fixing the exact same production defect under the same ticket, **P2-3557**, via a generic slot-iteration refactor (`_saveNestedQuestionGroup`).
2. **2026-09-03** — this spec's `proposal.md` is authored, independently diagnosing the identical root cause (confirmed via live repro against a phase-2026 result) and proposing a narrower fix (guard each of 8 hardcoded `qN` read sites). Nothing in this spec's docs references or is aware of Yecksin's commit — the diagnosis appears to have been done without knowledge that the same ticket had already been closed elsewhere.
3. **2026-09-03** — `execution.md` reports `IDEV-T-1` implemented and Reviewer-PASSed against the 8-site guard pattern, with its own regression tests, entirely on this branch (`qa-development-2026-ss`).
4. **At some point since** — a merge (this branch has several `align with origin/performance-refactor` merge commits in its history around this period) brought in the mainline/upstream state of `innovation_dev.service.ts`, which already carried Yecksin's `_saveNestedQuestionGroup` refactor. Whether this spec's own patch was ever actually committed to this branch, and then overwritten/replaced by the merge, or was implemented locally and simply never survived into what got merged upstream, was not fully reconstructable from the available git history — the file's commit log shows only Yecksin's commit, nothing from this spec's own attempt.

**Consequence:** the requirement this spec targeted (P25 Innovation Development save no longer 500s from phase 2026 on) is genuinely satisfied in production today. But crediting this spec's own execution for that would misrepresent the record — the actual fix is someone else's independent, differently-shaped patch under the same ticket, that landed a day before this spec even started. This spec is archived as **closed / superseded**, not as a shipped deliverable — see the Kaizen entry (`docs/specs/kaizen/bugfix--innovation-dev-p25-save-500.md`) for the methodology gap this exposes (an AKILI pre-flight conflict check that only looks at `docs/specs/`, not at code/tickets that may have already been fixed outside that tracking).
