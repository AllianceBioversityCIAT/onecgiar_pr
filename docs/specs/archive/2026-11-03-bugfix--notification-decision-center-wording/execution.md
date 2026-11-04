# Execution Log — Bilateral decision notification wording per recipient

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/notification-decision-center-wording` |
| Task file | `task.md` |
| Approval Mode | gated |
| Started | 2026-09-24 |
| Budget (design §9) | 3 tasks, about 140 LOC, 1-2 review rounds. Not exceeded so far |

## Task Execution History

### NDCW-T-1 — Server: split emit, stored center text, matching live copy — PASS (2026-09-24)

- Implementer attempts: 1. Reviewer verdicts: 1 (PASS).
- Files changed: `onecgiar-pr-server/src/api/results/results.service.ts`, `.../notification/notification.service.ts`, `results.service.spec.ts`, `notification.service.spec.ts`.
- Implementer verification: `npx jest --forceExit --testPathPattern="results.service.spec|notification.service.spec"` gave 5 suites / 102 tests passed. `npx eslint` on the 4 touched files was clean.
- Reviewer verdict: PASS. Checked the emitter/submitter leak, the 6th `renderedText` param on both stored row and toast, no duplicate rows, NFR-1..3, and the consumers.
- Requirements covered: NDCW-R-1, R-2 (server side), R-3 (description), R-4, NFR-1, NFR-2, NFR-3.
- Decisions:
  - Added private `resolveOwnerProgramCodeForResult`. It calls `getResultByInitiativeOwnerFull`, reads the raw column `inititiative_id` (the raw SQL row spells it that way, the entity property is `initiative_id`), then does a CLARISA `findOne` for `official_code`. A failed lookup returns null and yields the no-code sentence.
  - The disqualifier was not triggered: both repositories were already injected.
- Known gap: the red run was not run separately against the old code. The new assertions (two emits, `renderedText` undefined on the submitter, exact center strings) could not pass on the single-emit code.
- Implementer `Not Done / Assumptions`: only the `as any` cast for the raw column and the real socket/DB check, which is owned by `NDCW-T-3`. Neither is outstanding scope.
- ADVISORY (4R, recorded only, not gating and not new tasks):
  - RELIABILITY: the toast lookup in `emitResultNotification` re-reads one row by result + emitter + level + type (`created_date DESC`). With two emits, the center emit can pick the submitter's row as `notification.result` in the socket payload. The toast text is unaffected, but an online Center User could see one optimistic pop-up row with the legacy "Your Result" copy until the refetch. Pre-existing row selection. Scoping the `findOne` by `target_user` would fix it, and that is out of this spec.
  - READABILITY: the center sentence identity uses `truncateTitle(..., 60)`, while the client list shows the full title. For titles over 60 characters the toast and the list differ by an ellipsis. Pre-existing for the legacy copy. Watch for it in `NDCW-T-3`.
  - RISK: one extra query and one extra `emitResultNotification` round trip per decision. Negligible.

### NDCW-T-2 — Client: center wording when `text` is present, attached comma — PASS (2026-09-24)

- Implementer attempts: 1. Reviewer verdicts: 1 (PASS, checklist mode).
- Files changed: `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` (+ `.spec.ts`), `pop-up-notification-item.component.html`, `update-notification.component.html` (+ `.spec.ts`, new jsdom DOM test).
- Implementer verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="notification-type.constants.spec|pop-up-notification-item|update-notification|filter-notification-by-search"` gave 4 suites / 71 tests passed. `npx ng lint --quiet` passed.
- Reviewer verdict: PASS. Exact flattened string asserted, no `T ,`, the null / empty / whitespace `text` fallback keeps "Your Result", no stale trailer, other notification types unaffected.
- Requirements covered: NDCW-R-1 (client legacy render), R-2 (parts, flatten, templates), R-3 (list side), R-5.
- Decisions: `linkTrailer` field (DD-3), no new i18n key. The disqualifier was not triggered. No folder `CLAUDE.md` exists in the touched folders, so no re-stamp.
- Known gaps: no separate red run. The pop-up template has no DOM spacing test (the identical idiom is proven by the update-notification DOM test), so `NDCW-T-3` must look at the bell pop-up variant specifically.
- Implementer `Not Done / Assumptions`: only the gaps above. No outstanding scope.

### NDCW-T-3 — Manual look + parent-spec amendment — PASS (2026-09-24, manual, user-confirmed)

- Amendment: NOTIF-R-2 in `docs/specs/notifications/bilateral-review-decision/requirements.md` now points at NDCW-R-2 for non-submitter wording. Docs only, no Reviewer (skip-eligible).
- Manual check on a local stack, result 9544 (CIMMYT lead, SP01 primary), user Angel as submitter and Center User:
  - Submitter variant: screenshot shows one row, `Your Result 9544 - ... has been Approved by the Science Program SP01.`, no "where your center was tagged". Pass.
  - Center variant: reported by the user as OK ("center ok"), no screenshot recorded.
  - Not individually confirmed: live socket toast and the bell pop-up spacing (the user reported everything else fine).
- Out-of-scope findings (recorded only, not tasks in this spec):
  - Clicking the decision notification opens `/result/result-detail/9544/general-information?phase=36`; expected `/bilateral/CIMMYT/result/9544?phase=36` (parent NOTIF-R-4).
  - Clicking "submitted for your review" opens `/entity-details/SP01/bilateral-review` without opening the result drawer; expected `...bilateral-review?search=9544` with the drawer open.
  - Proposed as one separate spec, `bugfix/notification-decision-deeplinks`.

## Pending

- All tasks `[x]`. No commit made (standing rule: commit only on the user's go-ahead).
- Follow-up spec proposed: `bugfix/notification-decision-deeplinks`.
