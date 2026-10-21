# Primary request decision state — Execution Log

## 1. Document Control

| Field | Value |
|---|---|
| **Spec** | `bugfix/primary-request-decision-state` (`PRDS`) |
| **Branch** | `qa-development-2026-ss` |
| **Approval Mode** | gated (proposal §1) |
| **Leader** | Claude Opus 5.5 (T1) |
| **Implementer / Reviewer** | `akili-implementer` (T2 wrapper) / `akili-reviewer` (T3 wrapper) |
| **Started** | 2026-10-21 |

**Pre-flight (2026-10-21):** user confirmed the open assumptions in `requirements.md` §1 before PRDS-T-1. The chip reads **Accepted / Rejected**, and the caption reads **"<verb> by <SP code>"** with no person and no date. Unrelated uncommitted changes in the checkout (server `results.*`, client bilateral files, other specs) belong to another work stream and are out of scope. Diffs and any rollback are scoped to the task's files only.

## 2. Task Execution History

### PRDS-T-1 — Status-driven decision state on primary rows (+ regression test)

- **Final status:** PASS (attempt 1) · **Date:** 2026-10-21
- **Implements:** PRDS-R-1, R-2, R-3, R-4 · design §8.1–§8.5, DD-1..DD-4
- **Skills / effort:** `angular-developer`, `spartan` (badge reuse only), `tdd` (as listed in the task) · medium

**Attempt 1**
- **Files changed (all under `onecgiar-pr-client/src/app/`):**
  - `internationalization/contribution-request-drawer.copy.ts`: added `primaryRequestKindChip`, `primaryDecisionAccepted` and `primaryDecisionRejected`.
  - `.../notification-item/notification-item.component.ts`: new `primaryDecision` getter; `requestKindLabel` is status-aware for primary rows.
  - `.../notification-item/notification-item.component.html`: the `@case (2)`/`@case (3)` footers are now `@if (!isPrimaryRequest)` (old markup untouched) `@else if (primaryDecision)`, which renders the shared `#primaryDecisionFooter` template.
  - `.../notification-item/notification-item.component.spec.ts`: new `PRDS — primary decision state` describe with 11 tests, plus the step-5 fixture fixes.
  - `.../notification-item/CLAUDE.md`: new PRDS-T-1 section and `Verified:` stamp; the PRA-T-2 chip bullet is marked as amended.
- **Red** (`npx jest --maxWorkers=2 --no-coverage --testPathPattern="notification-item.component.spec" -t "PRDS"`, unchanged source): 9 failed, 2 passed.
  - The 2 that passed were the PRDS-R-4 non-primary rows.
  - Row 1 failed on its absence assertion. Received: footer `Accepted by Carla Submitter · …` with `data-notif-decision-chip="accepted"`.
- **Green:**
  - The PRDS run passed: `Tests: 441 skipped, 11 passed, 452 total`.
  - findRelatedTests on the touched files passed: `Test Suites: 41 passed, 41 total` and `Tests: 1830 passed, 1830 total`. Its first run failed 2 tests, both step-5 fixtures, which were then fixed.
- **Lint:** `npx eslint` cannot run in the client package (ESLint 9, no `eslint.config.*`). Substituted `npx ng lint --quiet --lint-file-patterns <touched files>`: "All files pass linting." The Reviewer accepted this as equivalent.
- **Step 5:**
  - Two existing primary fixtures got `obj_result: { status_id: 5 }`: the "Needs your review chip … (PSR-R-9, PRA-R-3)" test and the `detailTitle()` test.
  - The `detailTitle()` test was also renamed from "(incl. resolved)" to "pending (status 5)". No assertion was weakened, and NOTIF-T-10/15/16 were not touched.
- **Reviewer verdict: PASS.** Conforms to R-1..R-4 and design §8.1–§8.5 / DD-1..DD-4 with the confirmed wording. The red run proves the bug on the behavioural absence assertion.
  - Rows 3/4 assert `SP12`, the code from the shared fixture, rather than the table's `SP03`. The Reviewer judged this not to be a deviation.

**ADVISORY (4R, non-gating — recorded only, not new tasks):**
- RELIABILITY: a decided primary row with no `obj_shared_inititiative` would render "Accepted by " with an empty code. PRDS-T-2 should confirm on PRTest that the code is present on decided rows.
- READABILITY: the caption uses the raw SP code rather than `| spLabel` (PFN-T-3 convention). This is deliberate per the spec and the user's choice; a one-line note in the folder CLAUDE.md would stop a later "fix".
- READABILITY: the chip-word ternary appears twice in `#primaryDecisionFooter`. A `primaryDecisionWord` getter would remove the duplication (optional).

**Forward pointer → PRDS-T-2:** step 3/4 must also confirm the SP code is non-empty in the caption (advisory 1).

**Budget check (design §11):**
- Source ≈ 55 LOC (estimate ~60).
- Spec ≈ 111 LOC (estimate ~120).
- Docs ≈ 10 LOC (estimate ~15).
- 1 review round (estimate 1).
- Within budget.

**Commit:** not committed (memory: no auto-commit). Suggested message, to send only on the user's go-ahead: `🔧 fix(notifications) [SPEC:bugfix/primary-request-decision-state]: primary request rows show Accepted or Rejected only after the SP decides on the result`

**Constitution impact:** none. The only public-surface change is within the component; the folder CLAUDE.md was updated in the task itself.

### PRDS-T-2 — PRTest check (HITL) — partial, 2026-10-21

- **Status:** `[~]`. Steps 1, 2 and 5 were observed; steps 3 and 4 have no data in this inbox.
- **Run by:** Leader, via Claude in Chrome, read-only, at the user's request. No write controls were clicked; the only clicks were on the list's load-more control.
- **Deploy:** the fix reached PRTest through `performance-refactor` merge `686445be9`. That merge contains `146747a0b` and `7536e0788`.

**Results by step:**
- **Step 1 (served bundle):** `chunk-Y44CKC46.js`, the chunk that renders "Needs your review", contains "Primary Science Program request" and `primaryDecisionAccepted`, fetched with `cache: no-store`.
- **Step 2 (row 9864):** chip "Needs your review" and validate CTA present; no footer row, no decision chip, no "Accepted by". **PASS.**
- **Inbox scan:** Santiago Sanchez's Received inbox, all 757 rows loaded. There are 7 primary rows.
  - 6 rows (9864, 9861, 9762, 9753, 9752, 9742) show "Needs your review" + CTA, with no footer and no chip.
  - 1 row (9737, AfricaRice → SP07) shows "Primary Science Program request", with no CTA, no footer and no chip. That is the expected state for a result not in 5/6/7.
  - No primary row shows a person-based caption.
- **Step 5 (contribution rows):** rows such as 9795 and 9765 still show "Accepted/Declined by <person> · <date>" + chip. **PASS.**
- **Steps 3/4 (approved / rejected primary rows):** **NOT OBSERVED.** No primary row in this inbox has a result in status 6 or 7, so the SP-code caption ("Accepted by SPxx" / "Rejected by SPxx") and advisory 1 (code non-empty) remain unproven on real payload.
  - To observe them, a primary result has to be approved or rejected (a write the user drives), or the check has to run from an inbox that holds such a row.

**PRDS-T-2 re-scan (2026-10-21, after the user approved 9861 and rejected 9742):**
- **Step 3 (approved, row 9861):** chip "Primary Science Program request", caption **"Accepted by SP03"** (SP code present, no person, no date), decision chip `accepted` "Accepted" with `notification_decision_chip_accepted`, no validate CTA. **PASS.** This also closes advisory 1: the SP code is present on the real payload.
- **Step 4 (rejected, 9742):** the row is **no longer in the inbox** (757 → 756 rows; no row mentions 9742).
  - The server hides it by design: in `share-result-request.service.ts`, `PRIMARY_PREPARATION_STATUS_IDS` (Editing, Rejected, Draft; spec `bugfix/primary-notify-on-submit-regression` PNR-DD-3/4) hides a primary card while the result is Rejected, because the result goes back to the Center.
  - **Finding (spec gap, not a code defect):** the PRDS-R-2 "SP rejected" scenario cannot be reached in the inbox. The client's `rejected` branch is harmless but unreachable while PNR-DD-3 stands. This was escalated to the user.
- Rows 9864, 9762, 9753 and 9752 are unchanged ("Needs your review" + CTA). Row 9737 is unchanged (neutral chip).
- **User decision (2026-10-21):** close PRDS-T-2 with step 4 marked N/A by design, and add a note to `requirements.md`. No code change.
- **Final status: PASS (HITL).** Steps 1, 2, 3 and 5 were observed on PRTest; step 4 is N/A because of PNR-DD-3.
- **Still open:** the Jira P2-3157 comment for QA (Angel), left to the user because posting it is an outward-facing action.

## 3. Summary

PRDS-T-1 was implemented and reviewed (PASS on attempt 1). It was committed as `146747a0b` on `qa-development-2026-ss`, merged with `performance-refactor` (`7536e0788`), and deployed to PRTest through `686445be9`.

PRDS-T-2 was verified on PRTest:
- Pending primary rows show no fake "Accepted".
- An approved primary row shows "Accepted by SP03" and the Accepted chip.
- Contribution rows are unchanged.
- The rejected-primary case is hidden server-side by design (PNR-DD-3).

Kept within budget: 1 code task, 1 review round.
