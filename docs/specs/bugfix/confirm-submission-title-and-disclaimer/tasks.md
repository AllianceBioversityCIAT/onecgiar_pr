# Module Spec — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `results` — Confirm Submission dialog (stale title after AI Review + disclaimer copy)
- **Linked spec:** `docs/specs/bugfix/confirm-submission-title-and-disclaimer/requirements.md` + `design.md`
- **Owner / driver:** santiago.sanchez@cgiar.org
- **Status:** both tasks complete, ready for staging QA / archive

**`SUB-OQ-1` resolution:** kept **out of scope**, consistent with `requirements.md` §3 — the IPSR submission modal has a different title source (`ipsrDataControlSE.detailData.title`) and is not affected by this root cause. A copy-only parity fix for its identical disclaimer sentence can be proposed separately if desired.

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` resolved (`SUB-OQ-1` above).
- [x] No conflicting in-flight spec touching `ai-review.service.ts` or `submission-modal.component.html` found under `docs/specs/`.
- [x] No migration involved (client-only fix).

## 3. Task list

### `SUB-T-1` — Refresh shared title state after AI Review save + fix disclaimer copy `[x]`

- **Type:** `client`
- **Description:** In `AiReviewService.notifySectionChanged()` (`ai-review.service.ts:391-396`), inject `CurrentResultService` and call `this.currentResultSE.GET_resultById()` in addition to the existing `generalInformationSaved` bump, so `DataControlService.currentResult`/`currentResultSignal` reflects the latest saved title. In `submission-modal.component.html:13-14`, replace "Please note that further changes cannot be made once approved." with "Please note that further changes to this result can only be made during the QA process." — no other text in that sentence changes.
- **Implements:** `SUB-R-1`, `SUB-R-2`, `SUB-R-3`, `SUB-AC-1`, `SUB-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/submission-modal/submission-modal.component.html`
- **Depends on:** `—`
- **Blocks:** `SUB-T-2` (test must run against this fix to prove green)
- **Estimate:** `S`
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(submission-modal) [ticket]: ...` per root `CLAUDE.md`) — not committed yet, awaiting user go-ahead to commit.
  - [x] Lint clean: `npx ng lint --quiet` (client).
  - [x] Disqualifier: a lint pass with the disclaimer string still containing the old wording, or with the `GET_resultById()` call added somewhere it doesn't run on every successful title-affecting save (e.g. gated only behind a route check that excludes some result types), does NOT count as done — re-check both edits against `SUB-R-1`/`SUB-R-3` verbatim. Reviewer-confirmed conformant on both counts.
  - [x] No secret/token leaked in logs (`.cursorrules`) — n/a to this change but checked per convention.
  - [x] Manual browser check: accept an AI-suggested title, open Confirm Submission, confirm the new title renders; confirm no jarring visual flash from the added `GET_resultById()` call (per `design.md` §8/§10). Performed by santiago.sanchez@cgiar.org on result `#9139` — see `execution.md` §3.

### `SUB-T-2` — Regression test: Confirm Submission shows AI-Review-saved title `[x]`

- **Type:** `tests`
- **Description:** Add a Cypress E2E spec that reproduces the exact bug from `proposal.md`'s Bug Diagnosis reproduction steps: open a result, set an initial title, run AI Review, accept the suggested title, open Confirm Submission, and assert the dialog text contains the AI-suggested title (not the original). Also assert the disclaimer text matches the exact approved string. **Must be authored/run against pre-`SUB-T-1` code first to confirm it fails (red)**, then re-run after `SUB-T-1` lands to confirm it passes (green) — this is the evidence the bug is fixed, not merely that a change was made.
- **Implements:** `SUB-R-1`, `SUB-R-2`, `SUB-R-3`, `SUB-AC-1`, `SUB-AC-2` (regression coverage)
- **Files (expected):** `onecgiar-pr-client/cypress/e2e/results/confirm-submission-title.cy.ts` (new)
- **Depends on:** `SUB-T-1` (to reach green; the red run happens against the pre-fix commit)
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Test file added under `onecgiar-pr-client/cypress/e2e/`.
  - [x] Confirmed RED against pre-fix code — see `execution.md` §5 for the AssertionError output (stale title + old disclaimer both present in the failure text).
  - [x] Confirmed GREEN against post-fix code — 4 clean runs total (3 initial + 1 final sanity), no flakiness. See `execution.md` §5.
  - [x] Disqualifier: a spec that only asserts the AI Review dialog itself shows the new title (the section-local `generalInfoBody`, which was never broken) does NOT satisfy this task — the assertion MUST be against the Confirm Submission dialog specifically, since that is the component that read stale shared state. Reviewer-confirmed: assertion targets `.submission-modal-dialog .description`, not the AI Review proposal card.
  - [x] Disqualifier: if the Cypress run is flaky (passes/fails inconsistently across 2-3 local runs) without a code reason, report the flake — do not report green on a single lucky run. No flakiness observed across 4 runs.

## 4. Dependency graph

```
SUB-T-1 (fix: state refresh + disclaimer copy)
   └── SUB-T-2 (regression test, verified red-before / green-after)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `SUB-TEST-1` | cypress (client) | `SUB-R-1`, `SUB-R-2`, `SUB-AC-1` | `onecgiar-pr-client/cypress/e2e/results/confirm-submission-title.cy.ts` |
| `SUB-TEST-2` | cypress (client, same spec) | `SUB-R-3`, `SUB-AC-2` | `onecgiar-pr-client/cypress/e2e/results/confirm-submission-title.cy.ts` |
| `SUB-TEST-3` | unit (client, existing) | Regression guard on `ai-review.service.ts` / `rd-general-information` refresh paths | `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.spec.ts` (re-run, no new assertions required unless the injected `CurrentResultService` needs a mock added there) |

Client coverage MUST stay above 50/60/60/60 (unaffected — this is a small addition, not a reduction).

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`🔧 fix(submission-modal) [ticket]: fix stale AI-review title and disclaimer copy in Confirm Submission dialog`).
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on staging/test env: reproduce the exact repro steps from `proposal.md` Bug Diagnosis and confirm both fixes.
- [ ] No bilateral/platform-report/admin/role impact — nothing else to notify.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified in staging.
- [ ] File a follow-up spec if the team decides to also fix the IPSR modal's identical disclaimer sentence (`SUB-OQ-1`).

## 8. Roll-back plan

1. Revert the PR.
2. No migration to revert (client-only).
3. No feature flag involved.
4. No bilateral/platform-report payload affected.

## Required cross-references

- `docs/specs/bugfix/confirm-submission-title-and-disclaimer/requirements.md` and `design.md` (same folder).
- `docs/specs/bugfix/confirm-submission-title-and-disclaimer/proposal.md` — Bug Diagnosis reproduction steps this regression test encodes.
