# Tasks — SP approval notice for everyone on the center

## 1. Scope of this task list

- **Module / feature:** `notifications` / bilateral approval notice for center staff
- **Linked spec:** `requirements.md` (SACN-R-1..9) + `design.md` (SACN-DD-1..5)
- **Branch:** `qa-development-2026-ss` (current checkout)
- **Status:** in-progress (T-1, T-2, T-3 PASS · T-4 [~] code PASS, pending user HITL check)
- **Budget (design §11):** 4 tasks · ~200 LOC · 1 review round

## 2. Pre-flight checklist

- [x] `requirements.md` and `design.md` approved (2026-10-02).
- [ ] Proposal OQ-1..OQ-4 accepted at their defaults (submitter wording unchanged · Reject unchanged except chip · lead center only · chip on Approved + Rejected).
- [x] No migration (SACN-NFR-1).
- [ ] No in-flight spec editing `getBilateralReviewRecipientIds` / `buildBilateralReviewDescription` / `getResultNotificationTextParts` (check `git status` and open specs before T2/T3).

**Test command rule:** always scoped (`--testPathPattern`), never the full suite.

## 3. Task list

### SACN-T-1 — Any-role center lookup

- **Type:** server
- **Description:** Add `RoleByUserRepository.getUserIdsByCenterAnyRole(centerCode)` per design §7.1: active rows of any role for the center, de-duplicated, invalid ids dropped. `getUserIdsByCenter` unchanged.
- **Implements:** SACN-R-1 (any active role; "MUST NOT … inactive"), SACN-R-9
- **Files (expected):** `onecgiar-pr-server/src/auth/modules/role-by-user/RoleByUser.repository.ts`, `RoleByUser.repository.spec.ts`
- **Depends on:** —
- **Blocks:** SACN-T-2
- **Estimate:** S
- **Review:** checklist
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** the new query string contains a `role` predicate, omits `active > 0`, or omits `center_id = ?` → spec fails. The existing `getUserIdsByCenter` spec still asserting `rbu.\`role\` = 9` fails if someone widened it instead (SACN-R-9).
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern RoleByUser.repository.spec --silent --reporters=summary --forceExit` (new cases red before the method exists).
  - **Disqualifier:** the presence-assertion on the SQL string cannot prove behaviour on real data; if the user wants proof, run the query against a non-prod DB at the HITL pause. A spec that only checks the method exists is not evidence.
  - **Consumers:** none (new symbol).
- **Status:** [x] PASS 2026-10-02 (attempt 1; see `execution.md`)
- **Definition of done:**
  - [x] Cases: returns ids; no role predicate; `active > 0` + `center_id = ?`; drops null/0/non-numeric; empty → `[]`.
  - [x] Existing `getUserIdsByCenter` cases untouched and green.
  - [x] ESLint quiet on touched files.

### SACN-T-2 — Approve branch: recipients, stored sentence, toast

- **Type:** server
- **Description:** Design §7.2–7.4. `getBilateralReviewRecipientIds` takes the decision: Approve → any-role lookup, Reject → existing. Approve center branch stores `"<SPXX>, as primary Science Program, has approved your center's result"` or the no-code fallback. `buildBilateralReviewDescription` gains the first branch for the new shape → `"<text> <code> - <title>"`. Lead-sentence pieces in one server constant.
- **Implements:** SACN-R-1 (lead center only; "MUST NOT … tagged but not lead"; no-lead-center scenario), SACN-R-2 (both scenarios), SACN-R-3 (server text, both scenarios), SACN-R-4, SACN-R-5, SACN-R-8, SACN-NFR-2/3/4
- **Files (expected):** `onecgiar-pr-server/src/api/results/results.service.ts`, `results.service.spec.ts`, `onecgiar-pr-server/src/api/notification/notification.service.ts`, `notification.service.spec.ts`, a constants file under `api/notification/`
- **Depends on:** SACN-T-1
- **Blocks:** —
- **Estimate:** M
- **Review:** full (shared notification emitter; reverts NDCW-R-2 approve wording)
- **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`
- **Verification:**
  - **Falsifier (each is a spec case that must fail on wrong code):**
    - Approve with a non-role-9 center user mocked from the any-role lookup → that user is in the center emit; with Reject → the any-role lookup is **not** called.
    - Submitter also returned by the lookup → appears only in the submitter emit; approver returned → in neither.
    - Owner code `SP06` → stored text is exactly `SP06, as primary Science Program, has approved your center's result`; owner unresolved → exactly `The primary Science Program has approved your center's result`.
    - Description builder with the new text + code 9330 + title → exactly `SP06, as primary Science Program, has approved your center's result 9330 - <title>`; legacy center text and empty text keep their current output (SACN-R-5/R-7).
    - Lookup throws → `reviewBilateralResult` still resolves success and the submitter emit still happens.
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern "(results.service|notification.service).spec" --silent --reporters=summary --forceExit`
  - **Disqualifier:** if the existing review-decision specs can only be made green by weakening Reject assertions, stop — Reject is out of scope. If budget passes 2 review rounds, escalate.
  - **Consumers:** `getBilateralReviewRecipientIds` / `emitBilateralReviewNotification` — only `reviewBilateralResult` (private). `buildBilateralReviewDescription` — `emitResultNotification` for Approved/Rejected only.
- **Status:** [x] PASS 2026-10-02 (attempt 1; see `execution.md`)
- **Definition of done:**
  - [x] Old approve-center assertions (`where your center was tagged … approved`) replaced; Reject center assertions unchanged.
  - [x] Logs carry ids only.
  - [x] ESLint quiet; no migration (`npm run migration:check` unaffected).

### SACN-T-3 — Client sentence parser + copy

- **Type:** client
- **Description:** Design §8.1–8.2. New `internationalization/bilateral-decision-notice.copy.ts`. In `notification-type.constants.ts`, `BILATERAL_RESULT_APPROVED` first tries the new-shape parser (segments: bold SP code + verb, or fallback lead), else today's logic. Make sure `buildResultNotificationText` flattens segments so search finds the new sentence.
- **Implements:** SACN-R-3 (render, both scenarios incl. "MUST NOT … where your center was tagged / Your Result", spacing, no empty bold), SACN-R-4 (list/pop-up/update tab share the parser), SACN-R-5, SACN-R-7
- **Files (expected):** `onecgiar-pr-client/src/app/internationalization/bilateral-decision-notice.copy.ts`, `shared/constants/notification-type.constants.ts`, `notification-type.constants.spec.ts`, `pages/.../update-notification/update-notification.component.spec.ts` (old-wording assertion, if Approve)
- **Depends on:** — (contract fixed in design §5; parallel with T1/T2)
- **Blocks:** SACN-T-4
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** flattened text for `{type: Approved, text: 'SP06, as primary Science Program, has approved your center\'s result', code 9330, title}` must equal exactly `SP06, as primary Science Program, has approved your center's result 9330 - <title>` — a double space, a stray comma or a missing bold SP06 segment fails. Fallback text → no emphasized segment. Legacy `where your center was tagged …` and empty text → current outputs unchanged. Rejected with any text → unchanged.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern "(notification-type.constants|update-notification.component).spec" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** string-equality on parts proves the parts, not the rendered DOM spacing; DOM spacing is checked in T4 + HITL visual. If the parser needs to touch other types' branches, stop and re-scope.
  - **Consumers:** `getResultNotificationTextParts` — `notification-item`, `update-notification`, `pop-up-notification-item`, `filter-notification-by-search.pipe` (via `buildResultNotificationText`).
- **Status:** [x] PASS 2026-10-02 (attempt 1; see `execution.md`)
- **Definition of done:**
  - [x] Exact-string cases for new, fallback, legacy-center, submitter.
  - [x] Any spec asserting the old approve-center sentence for **new** rows updated; legacy cases kept.
  - [x] `npx ng lint --quiet` clean on touched files.

### SACN-T-4 — Row: check icon + "Decision update" chip

- **Type:** client
- **Description:** Design §8.3. In the `notification-item` update branch: Approved rows show `pi pi-check-circle` in the avatar box instead of initials; `rowTypeChipLabel` returns `Decision update` for Approved and Rejected (pattern of the WCT/WPT overrides). Funding chip, meta line, link style untouched. Spartan `hlmBadge` + existing tokens only.
- **Implements:** SACN-R-6 (reference-row scenario incl. "MUST NOT render action buttons"; rejected-row chip scenario), SACN-R-7 (chip on legacy rows), SACN-NFR-5
- **Files (expected):** `pages/results/pages/results-outlet/pages/results-notifications/components/notification-item/notification-item.component.{ts,html,spec.ts}`, its `CLAUDE.md` (component notes)
- **Depends on:** SACN-T-3
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`, `spartan`
- **Verification:**
  - **Falsifier:** Approved update row → `[data-notif-type-chip]` text `Decision update`, `.pi-check-circle` present, no initials, `[data-notif-funding-chip]` `W3/Bilateral`, no Accept/Decline buttons, body text contains the T3 sentence with single spaces. Rejected row → chip `Decision update`, initials still shown. Center-tagged / project-tagged rows → chips unchanged.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern notification-item.component.spec --silent --reporters=summary --no-coverage`
  - **Disqualifier:** jsdom proves presence, not looks. **Visual match to `mockup/reference-row.png` (icon size, chip colours, line wrap) has no automated gate** → manual look in the running app (or a T6 visual review) at the HITL pause; if it does not match, the task is not done regardless of green specs.
  - **Consumers:** `rowTypeChipLabel` — row template and drawer `view` metadata (verify drawer still shows a sensible type label).
- **Status:** [~] code PASS 2026-10-02 (attempt 3, post-Pivot; see `execution.md`) — pending user HITL visual + manual check
- **Definition of done:**
  - [x] Spec cases above; existing chip assertions for Approved/Rejected updated.
  - [ ] Manual check: one center user (non-role-9) and the submitter each see their row after an approval on local/test. *(Pivot: no non-9 center role exists in the data — check with a role-9 non-submitter user.)*
  - [x] `npx ng lint --quiet` clean.

## 4. Coverage matrix (scenario / clause level)

| Requirement · scenario / clause | Task |
|---|---|
| R-1 non-Center-User role receives | T1 (query) + T2 (wiring) |
| R-1 "MUST NOT … inactive role" | T1 |
| R-1 "MUST NOT … tagged but not lead" | T2 (lead center resolution unchanged; spec asserts lookup called with lead code only) |
| R-1 no lead center → only submitter | T2 |
| R-2 several roles / also submitter → one row, submitter wording | T2 (+ T1 DISTINCT) |
| R-2 approver excluded | T2 |
| R-3 code known, SP06 emphasized, no "where your center…"/"Your Result", spacing | T2 (stored text) + T3 (render) + T4 (DOM) |
| R-3 code unknown fallback, no empty bold / leading comma | T2 + T3 |
| R-4 toast = list | T2 (toast string) + T3 (list string) — toast render: HITL manual |
| R-5 submitter unchanged | T2 + T3 |
| R-6 reference row (icon, chips, meta, MUST NOT actions) | T4 + HITL visual |
| R-6 rejected-row chip | T4 |
| R-7 legacy rows | T3 (text) + T4 (chip) |
| R-8 lookup fails → approval succeeds, no email, no PII logs | T2 |
| R-9 other flows unchanged | T1 |
| NFR-1..5 | T1/T2 (1–4), T3/T4 (5) |

## 5. Order

```
T1 ──► T2            (server)
T3 ──► T4            (client, parallel with T1/T2)
```

Single PR (~200 LOC). Commit per task, e.g. `✨ feat(role-by-user) [SPEC:notifications/sp-approval-center-notice]: any-role center lookup` — no apostrophes in subjects (Jenkins).
