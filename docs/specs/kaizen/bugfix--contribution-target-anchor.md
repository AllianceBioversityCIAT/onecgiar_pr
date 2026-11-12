# Kaizen Entry — bugfix/contribution-target-anchor

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/contribution-target-anchor` (INC-168252) |
| Date | 2026-11-12 |
| Branch | `qa-development-2026-ss` (not apply-capable; the apply-capable branch is `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-2 attempt 1: COMMIT before the decision line; no centres in the ambiguous list) | execution.md: T-2 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 (P-8 settled, no other-year sender) | execution.md: T-1 |
| PRODUCT_BUGs | n/a (no `test-report.md`; red/green evidence lives in execution.md, absence accepted) | — |
| Judgment-day severe findings | not run | — |
| Validation FAIL / WARN | 0 / 4 (W-1 PRTest new-save pending, W-2 LOC overrun, W-3 post-review SQL edit, W-4 design test-count drift, fixed) | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects | 1 at HITL: backfill block 2 failed in PROD with error 1292, caught before any UPDATE ran | execution.md: T-2 HITL block 2 error |
| Budget | ~280 LOC planned vs 52 code + 212 tests + ~480-line backfill doc | execution.md: running totals |

## Lessons

- **KZ-bugfix--contribution-target-anchor-1 — A concurrent session's unscoped `git stash` swept this spec's uncommitted files mid-task.** (Product + Methodology, Medium)
  - **Root cause:**
    - Several sessions share one checkout. To check its committed tree, the IUY/IWH session ran a bare `git stash` ("iwh-temp-during-iuy-ci-check-3"). That took T-1's repository and spec files along with its own.
    - The project's committed-tree check advises stashing the leftovers but does not say to scope the stash to your own paths.
  - **Recurrence:** this is the third occurrence, after `bugfix/lead-center-full-catalog` (noted, not a lesson: "feeds the recurrence check if it happens again") and `changes/overview-chart-view-toggle`.
  - **Evidence:** execution.md, T-1 Issues encountered (Concurrency), and the Implementer's report section 1.
  - **Standardization:** → P1 (local) · P2 (upstream)

- **KZ-bugfix--contribution-target-anchor-2 — A read-only preview SELECT passed, but the same SELECT failed inside `CREATE TABLE … AS SELECT` in PROD.** (Product, Low)
  - **Root cause:**
    - `YEAR()` on ToC `target_date` ISO strings such as `2024-12-30T22:00:00.000Z` only raises a warning in a plain SELECT.
    - Strict mode turns that warning into error 1292 inside CTAS and INSERT … SELECT.
    - The preview step cannot surface the problem, and a Reviewer reading the SQL cannot either.
  - **Evidence:** execution.md, "T-2 HITL — block 2 error", and the `backfill-prod.md` year parser.
  - **Standardization:** → P3 (local)

## Noted, not a lesson

- **Budget overrun:** the LOC overrun is driven by tests (212) and the backfill doc's guard and verification blocks. That is appropriate for a PROD write, so it is not a sizing defect.
- **T-2 attempt 1 FAIL** was a run-order wording ambiguity: "2 + 3 + 4 together". The Reviewer caught it before the hand-off, so the gate worked as designed.
- **Overview "0 of 111" (validation advisory):** the proposal's non-goal says this header counts KPIs that met their target. After the backfill, AOW02 shows "1 of 111" with 1 of 5 achieved. The non-goal's premise may be wrong; worth a check before it is quoted again.
- **Target display mismatch:** the app shows target 5 for KPI 9378 while catalog meta 333606 carries `number_target` 6 (P-6 vs P-11). Out of scope.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `AGENTS.md` → AKILI-SPECS constitutional baseline, **Concurrency convention** |
| Edit | Append: "In a checkout shared with other sessions, never run a bare `git stash`; stash only your own spec's paths (`git stash push -- <paths>`), or verify the committed tree in a throwaway `git worktree add <scratch> HEAD`." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | Leader and Implementer personas: committed-tree verification must not mutate the shared working tree. Use a scoped stash or a throwaway worktree. A bare stash in a shared checkout destroys a peer session's state. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-server/AGENTS.md` (data hand-off / SQL conventions) |
| Edit | Append: "Hand-off SQL that writes through `CREATE TABLE … AS SELECT` / `INSERT … SELECT` must not call date functions on free-text date columns (ToC `target_date` holds ISO `…T…Z` strings): parse with `CAST(LEFT(col, 4) AS UNSIGNED)`. Strict mode turns the SELECT's warnings into error 1292." |
| Severity | Low |
| Status | pending |

### Step 3 sync (constitution)

No `## Constitution Impact` block, and no module was created or reshaped, so there are no `guide-sync` items. Factual-claims sweep of root `CLAUDE.md` / `AGENTS.md`: no claim was falsified by this cycle. No `trd-adr` item: the design overturned no ADR.
