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
