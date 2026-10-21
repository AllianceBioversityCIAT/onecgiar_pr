# Primary request decision state — Tasks

## 1. Scope of this task list

- **Module / feature:** Notifications inbox — primary SP request row decision state
- **Linked spec:** `requirements.md` (`PRDS-R-1..4`) + `design.md`
- **Owner / driver:** Santiago Sanchez
- **Status:** in-progress (T-1 done 2026-10-21)
- **Budget (design §11):** 1 code task + 1 HITL · ~60 src / ~120 spec / ~15 docs LOC · 1 review round

## 2. Pre-flight checklist

- [ ] Branch `qa-development-2026-ss`; no commit without the user's go-ahead (memory: no auto-commit)
- [ ] Every Jest run: `--maxWorkers=2`, scoped (`--testPathPattern` / `--findRelatedTests`); one test run at a time on the machine
- [ ] Lint only touched files: `npx eslint <files> --quiet`
- [x] Open assumptions in `requirements.md` §1 (chip wording, SP-code caption) confirmed by the user (2026-10-21)

## 3. Task list

### [x] `PRDS-T-1` — Status-driven decision state on primary rows (+ regression test)

- **Type:** bugfix · **Size:** S · **Depends on:** none
- **Implements:** `PRDS-R-1`, `PRDS-R-2`, `PRDS-R-3`, `PRDS-R-4` · **Design:** §8.1–§8.5, DD-1..DD-4
- **Skills:** `angular-developer`, `spartan` (badge reuse only), `tdd`
- **Scope:**
  1. **Red first:** add the regression spec (row 1 of the table below) to `notification-item.component.spec.ts`; run it on unchanged code and record that it FAILS.
  2. Copy: `primaryRequestKindChip`, `primaryDecisionAccepted`, `primaryDecisionRejected` in `contribution-request-drawer.copy.ts` (`notificationItem`).
  3. `primaryDecision` getter (§8.1); `requestKindLabel` primary branch status-aware (§8.3).
  4. Template `@case (2)` and `@case (3)` footers: `!isPrimaryRequest` → today's markup untouched; primary + decision → SP footer; primary without decision → no footer row (§8.2).
  5. Fix any existing primary fixture asserting "Needs your review" without `status_id: 5` by adding `status_id: 5` (design §10 challenge) — never by weakening the assertion. `grep -n "primaryRequestChip\|Needs your review" notification-item.component.spec.ts` lists the candidates.
  6. Update folder `CLAUDE.md` (new "PRDS-T-1" section + `Verified:` stamp; mark the PRA-T-2 "Chip … reads Needs your review" bullet as amended).
- **Tests (scenario → assertion):**

| # | Scenario (requirement) | Fixture | Must assert | Fails if |
|---|---|---|---|---|
| 1 | **Regression** — reproduction 9864 (R-1) | primary, `request_status_id: 2`, `obj_approved_by` set, `status_id: 5` | no `.notification_content_footer_row`, no `[data-notif-decision-chip]`, text has no "Accepted by"; chip "Needs your review"; `[data-testid=validate-bilateral-cta]` present | any decision chip/caption rendered (today's code → RED) |
| 2 | Editing / other status (R-1) | primary, `request_status_id` 2 and 3, `status_id: 1` and `4` | no footer row, no decision chip | footer rendered for either `request_status_id` |
| 3 | SP approved (R-2) | primary, `request_status_id: 2`, `status_id: 6`, shared initiative `SP03` | chip `[data-notif-decision-chip="accepted"]` text "Accepted"; caption contains "Accepted by" and "SP03"; caption has NO approver first/last name and NO date | person name or date appears; chip missing |
| 4 | SP rejected (R-2) | primary, `request_status_id: 2`, `status_id: 7` | chip `[data-notif-decision-chip="rejected"]` text "Rejected", class `notification_decision_chip_declined`; caption "Rejected by SP03" | "Accepted" shown; chip missing |
| 5 | Decided → neutral kind (R-3) | primary, `status_id` 6 and 7 | `requestKindLabel` / `detailTitle()` = "Primary Science Program request"; no validate CTA | "Needs your review" or CTA present |
| 6 | Non-primary unchanged (R-4) | contribution row `request_status_id` 2 and 3 with approver | "Accepted by Jane Approver" / "Declined by …" + date + chip exactly as today | existing NOTIF-T-10/15/16 specs modified to pass |

- **Verification:**
  - Red: `npx jest --maxWorkers=2 --no-coverage --testPathPattern="notification-item.component.spec" -t "PRDS"` on unchanged source → row 1 fails.
  - Green: same command after the fix → all PRDS pass; then `npx jest --maxWorkers=2 --no-coverage --findRelatedTests <touched .ts/.html files>` → green (memory: findRelatedTests before push).
  - Lint: `npx eslint <touched .ts files> --quiet`.
- **Disqualifies the evidence:** the regression test was never observed red on unchanged code (it can't prove the fix); row 6 passes only because an existing NOTIF spec was edited; a test asserts presence of the new chip class but not the ABSENCE of the person name/date (rows 1, 3 must assert absence).
- **Cannot be proven here:** that the live payload carries `obj_result.status_id` and `obj_shared_inititiative.official_code` on decided primary rows (jsdom) → `PRDS-T-2`.
- **Definition of done:** rows 1–6 green, row 1 seen red first; related tests green; lint clean; folder `CLAUDE.md` updated.

### [ ] `PRDS-T-2` — PRTest check (HITL)

- **Type:** rollout · **Depends on:** `PRDS-T-1` deployed to PRTest (memory: via `performance-refactor`, ~30 min)
- **Implements:** `PRDS-R-1..3` end-to-end; closes the defect class "real payload" (`requirements.md` §7.1)
- **Steps (read-only for the agent; the user drives any approve/reject — memory: no write clicks in browser checks):**
  1. Confirm the served bundle has the change (memory: verify served build first).
  2. SP03 inbox → row 9864 (Pending Review): no "Accepted by", no decision chip; "Needs your review" + validate CTA present.
  3. A primary row whose result was approved: chip **Accepted**, "Accepted by SPxx", chip label "Primary Science Program request", no CTA.
  4. A primary row whose result was rejected: chip **Rejected**, "Rejected by SPxx".
  5. A contribution request row resolved by a person: "Accepted by <name> · date" unchanged.
- **Disqualifies the evidence:** checking a bundle that isn't the deployed commit; steps 3/4 on rows whose result status was not confirmed in the review drawer.
- **Definition of done:** steps 2–5 observed; Jira P2-3157 comment noting the fix for QA (Angel).

## 4. Dependency graph

```
PRDS-T-1 ──► PRDS-T-2
```

## 5. Coverage closure (scenario / clause → task)

| Requirement clause | Owner |
|---|---|
| R-1 Reproduction: no caption/chip · BUT not "Accepted by <person>" · AND IT MUST keep "Needs your review" + CTA | T-1 row 1; T-2 step 2 |
| R-1 Other status, either request_status_id | T-1 row 2 |
| R-2 Approved: chip + "Accepted by SP" · BUT no person/date | T-1 row 3; T-2 step 3 |
| R-2 Rejected | T-1 row 4; T-2 step 4 |
| R-3 Decided: neutral kind · BUT no "Needs your review" nor CTA | T-1 row 5; T-2 step 3 |
| R-4 Non-primary unchanged | T-1 row 6; T-2 step 5 |

## 6. Rollout & roll-back

Single client commit. Deploy path qa-dev → performance-refactor (PRTest) → staging per team cadence. Roll-back: revert the commit; no data touched.
