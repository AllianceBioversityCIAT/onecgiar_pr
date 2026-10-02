# Primary SP Decline Rejects the Result — Tasks

## 1. Scope

| Field | Value |
|---|---|
| **Spec** | `notifications/primary-decline-rejects-result` |
| **Linked** | `requirements.md` (`PDR-R-1`..`R-11`) · `design.md` (budget §13: 5 tasks + HITL, ~420 LOC) |
| **Owner** | Santiago Sanchez |
| **Status** | not-started |
| **Approval Mode** | gated |
| **Branch** | `qa-development-2026-ss` |

## 2. Pre-flight

- [ ] `requirements.md` and `design.md` approved.
- [ ] The uncommitted `notifications/w1w2-center-tagged` work (`execution.md`, `tasks.md`) is committed or stashed. It shares `notification-item.*` (design R-4).
- [ ] No migration in this spec (`migration:check` unaffected).
- [ ] Tests run **scoped only** (`--testPathPattern`), never the full suite.

---

## 3. Task list

### [x] `PDR-T-1` — Server: `decline()` rejects ownerless results, no auto-move

- **Type:** server
- **Description:** Rewrite `PrimaryProgramRequestService.decline` to take a `justification`, as in design §7.1:
  - **Input:** trim the justification; if blank, return `invalid_input`.
  - **Remove:** delete the auto-move branch in full. Grep the callers of `getOtherAlignment`, `getAlignments`, `findLeadProjectId` and `request(…, { cancelRound })`, and delete only what is left unused.
  - **Ownerless result:** in the same transaction, set `Result` to status 7 with `reviewed_by` and `reviewed_at`, insert a `ResultReviewHistory` row (REJECTED, prefixed comment, `created_by`), and deactivate the contribution rows with status 1 or 4. The primary row stays active with status 3.
  - **Swap request:** status 3 only. No `Result` or history write.
  - **Outcome type:** `state` drops `'moved'` and adds `'rejected'`; `reason` adds `'invalid_input'`.
  - **Notices:** post-commit Center notice texts as in `PDR-R-10`, ownerless and swap. Nothing emits "moved" any more.
  - **Logs:** the justification never appears in a log line.
  - **First step:** prove premise `PDR-P-6` (writing `ResultReviewHistory` through `manager`) by running the existing spec. If that fails, add `forFeature`.
- **Implements:** `PDR-R-3` (service side), `PDR-R-4` (all 4 writes, "any number of alignments", "atomic", race), `PDR-R-5`, `PDR-R-6` (no request), `PDR-R-7`, `PDR-R-10` (texts, no "moved", notice failure does not undo), `PDR-R-11` (row stays active)
- **Files (expected):** `onecgiar-pr-server/src/api/results/share-result-request/services/primary-program-request.service.ts` (+ `.spec.ts`); possibly `share-result-request.module.ts` (only if `PDR-P-6` is false)
- **Depends on:** —
- **Blocks:** `PDR-T-2`
- **Estimate:** M
- **Review:** full (transactional rewrite, removed behavior)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** each of the following inputs must fail a test.
    - (a) Lead project with 2 alignments (SP09 and SP12), ownerless, SP09 declines with text: any new `primary` row for SP12, or `Result.status_id` ≠ 7.
    - (b) The same with 1 and with 3 alignments.
    - (c) `ResultReviewHistory` save throws: the `Result` update or the contribution deactivation still committed (assert that everything goes through the transaction `manager` and that the error propagates to the `internal_error` outcome).
    - (d) Owner exists (swap): `Result.update` or a history save is called.
    - (e) A contributor draft for SP12 remains `is_active = true`, or any email or notification is sent to SP12.
    - (f) The primary row ends `is_active = false`.
    - (g) The justification is `""`, `"   "` or `undefined`: any repository write.
    - (h) A logger spy receives the justification text.
    - (i) The notice emitter throws: the outcome is not `ok`.
    - (j) The row is already status 3 (race): any write; the outcome must be `conflict`.
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern="primary-program-request" --silent --reporters=summary --forceExit`. The new tests for (a), (b), (d), (e) and (g) fail before the change. The old auto-move tests (`PSR-R-5`, "both decline") are rewritten to the new expectation, not deleted silently. List each one rewritten in the execution log.
  - **Disqualifier:** if `ResultReviewHistory` cannot be written inside this transaction without a cycle-prone module import, stop and re-specify. Do not write it post-commit (that would break atomicity, `PDR-R-4`). A test that mocks `manager.transaction` to run the callback with **separate** repositories, not the callback's `manager`, proves nothing about atomicity: (c) must assert on the `manager` passed in.
  - **Consumers:** `PrimaryDecisionOutcome` (`share-result-request.service.ts` `mapPrimaryDecisionOutcomeToResponse`, `dispatchPrimaryDecision`). Grep `'moved'` across `onecgiar-pr-server/src` and `onecgiar-pr-client/src`.
- **Definition of done:**
  - [x] Falsifiers (a)–(j) are covered by tests and green.
  - [x] `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint <touched files> --quiet` clean.
  - [x] No justification text in logs.

### [x] `PDR-T-2` — Server: DTO + dispatcher + 400 mapping

- **Type:** server
- **Description:** Add optional `justification` (Swagger `@ApiProperty({ required: false })`) to `CreateShareResultRequestDto`. Both `dispatchPrimaryDecision` callers (V1 ~L1372, V2 ~L1935) pass `dto.justification`. For `request_status_id = 3` the dispatcher returns 400 with *"Justification is required when declining a primary request"* when the text is blank, before calling the service. It passes the text to `decline()`. `mapPrimaryDecisionOutcomeToResponse` maps `invalid_input` → 400 with the same message. On an accept or a contribution decision the justification is ignored.
- **Implements:** `PDR-R-3` (endpoint 400, "nothing changes", ignored on accept/contribution)
- **Files (expected):** `onecgiar-pr-server/src/api/results/share-result-request/dto/create-share-result-request.dto.ts`, `share-result-request.service.ts` (+ `.spec.ts`)
- **Depends on:** `PDR-T-1`
- **Blocks:** `PDR-T-4`
- **Estimate:** S
- **Review:** checklist
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Verification:**
  - **Falsifier:** each of these inputs must fail a test.
    - V1 **and** V2 with `{ request_status_id: 3, justification: "  " }` on a primary row: the service `decline` is called, or the status is not 400.
    - V2 with `{ request_status_id: 2, justification: "x" }`: the text reaches `accept` or anything stored.
    - A contribution row declined without a justification gets 400. That would be a regression of `PDR-R-2` on the server.
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern="share-result-request.service" --silent --reporters=summary --forceExit`
  - **Disqualifier:** if a third route reaches `decline()` (grep shows another caller), re-specify. Premise `PDR-P-5` would be refuted.
  - **Consumers:** `CreateShareResultRequestDto` is used by `updateRequest` / `updateRequestV2` in the controller (field is additive).
- **Definition of done:**
  - [x] Tests green; tsc and eslint clean; Swagger shows the optional field.

### [x] `PDR-T-3` — Client: `primary-decline-justification-dialog` component

- **Type:** client
- **Description:** A standalone presentational dialog per design §8.1. It is a copy of the W3 reject dialog (`result-review-drawer.component.html:849-877`): `app-pr-dialog` with `confirmation-modal reject`, Spartan `hlmBtn`, required textarea and spinner.
  - **Inputs:** `visible` (model), `resultCode`, `programCode`, `isSaving`.
  - **Outputs:** `cancelEvent`, `confirm(justification: string)`. The emitted value is trimmed.
  - **Behavior:** the text resets on every open. Confirm is disabled when the text is blank after trim or while saving. Cancel, close, Escape and the mask do nothing while saving.
  - **Copy:** in `internationalization/primary-decline-justification.copy.ts`.
- **Implements:** `PDR-R-1` (scenarios: opens with title, message and empty required field; Confirm disabled; blank text; cancel resets; saving disables both and blocks a double confirm)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/components/primary-decline-justification-dialog/*` (ts, html, spec), `onecgiar-pr-client/src/app/internationalization/primary-decline-justification.copy.ts`
- **Depends on:** —
- **Blocks:** `PDR-T-4`
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** each of these inputs must fail a test.
    - Text `"   \n "`: Confirm enabled.
    - Text `"ok"` with `isSaving = true`: Confirm or Cancel enabled.
    - Two clicks on Confirm: `confirm` emitted twice.
    - Reopen after Cancel: the old text is still there.
    - Title not equal to `DECLINE PRIMARY ROLE – 9391` for `resultCode = 9391`.
    - Emitted value not trimmed.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern="primary-decline-justification-dialog" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** these tests assert presence and state in jsdom. They **cannot** prove visual parity with the W3 dialog (layout, spacing, colors). That is a gap, closed only by the `PDR-T-6` visual check, and it must not be claimed from these tests.
  - **Consumers:** none (new component).
- **Definition of done:**
  - [x] Spec green; `npx ng lint --quiet` clean on the new files; copy in `internationalization/`.

### [x] `PDR-T-4` — Client: wire the dialog into the inbox row and the drawer

- **Type:** client
- **Description:** In `notification-item`, when `isPrimaryRequest`:
  - the row Decline opens the new dialog (new signal), not `showConfirmRejectDialog`;
  - the drawer's Decline for a primary request closes the drawer and opens the same dialog instead of the `confirm-decline` footer;
  - Confirm calls `acceptOrReject(false, false, justification)`, which adds `justification` to the body only for a primary decline;
  - a **400** keeps the dialog open with its text and shows the server message. 403, 409 and 500 keep today's behavior (close, toast, 409 stale message);
  - the decline toast reads "Request successfully declined".

  Contributor and W1/W2 Decline paths stay byte-for-byte unchanged. Read the drawer's real output name first (premise `PDR-P-7`).
- **Implements:** `PDR-R-1` (both surfaces; "server error" scenario incl. 400 keeps text; "request not sent until Confirm"), `PDR-R-2`, `PDR-R-3` (client sends the field)
- **Files (expected):** `results-notifications/components/notification-item/notification-item.component.{ts,html,spec.ts}`; `contribution-request-drawer.component.{ts,html,spec.ts}` only if the drawer must emit a different event for primary
- **Depends on:** `PDR-T-2`, `PDR-T-3`
- **Blocks:** `PDR-T-6`
- **Estimate:** M
- **Review:** full (shared component with 3 sibling specs)
- **Skills:** `angular-developer`, `spartan`
- **Verification:**
  - **Falsifier:** each of these inputs must fail a test.
    - Primary row: Decline click → `showConfirmRejectDialog()` true, or the PATCH sent before Confirm.
    - Primary Confirm with `"Outside portfolio"`: the PATCH body lacks `justification: "Outside portfolio"` or has `request_status_id` ≠ 3.
    - Bilateral contributor row: Decline opens the justification dialog, or the body has a `justification` key.
    - W1/W2 row: same as the contributor row.
    - PATCH errors 400: the dialog closes or the text is lost.
    - PATCH errors 409: the dialog stays open.
    - Primary drawer Decline: the drawer stays open under the dialog.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern="notification-item|contribution-request-drawer" --silent --reporters=summary --no-coverage`. Record the pass count before and after. Any existing test that changes expectation must be listed with its reason. Memory rule: run the affected specs before commit.
  - **Disqualifier:** if wiring the drawer requires changing the contributor `confirm-decline` flow, stop and re-specify, because `PDR-R-2` forbids touching it. A green suite where the contributor tests were edited to match new behavior is **not** evidence for `PDR-R-2`.
  - **Consumers:** `acceptOrReject` (row buttons, drawer outputs, ToC prompt dialog paths L480, L598-608): the new parameter is optional with default undefined.
- **Definition of done:**
  - [x] Specs green with counts recorded; `npx ng lint --quiet` clean.

### [x] `PDR-T-5` — Client: Project Information banner for a rejected result

- **Type:** client
- **Description:** In `section-zero-dashboard`, when `primaryRequest().state === 'sent_back'` **and** `readOnly()` is true, the banner reads *"Declined by {codes} as primary Science Program. The result was rejected."* with tone `danger`, and no "Pick another" text. When not read-only (old sent-back results), today's banner and picker remain. The copy goes in `bilateral-primary-assignment.copy.ts`.
- **Implements:** `PDR-R-9` (client: no "Pick another primary Science Program" hint; form read-only, already true per `PDR-P-3`)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/section-zero-dashboard/section-zero-dashboard.component.{ts,spec.ts}`, `onecgiar-pr-client/src/app/internationalization/bilateral-primary-assignment.copy.ts`
- **Depends on:** —
- **Blocks:** `PDR-T-6`
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:** each of these inputs must fail a test.
    - `state: 'sent_back'`, `declined_by_codes: ['SP09']`, `readOnly: true`: the banner contains "Pick another".
    - The same with `readOnly: false`: the banner lacks "Pick another" (old results broken).
    - `state: 'pending'`, `readOnly: true`: the rejected text shows.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern="section-zero-dashboard" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** if `readOnly()` is also true for non-rejected results the Center cannot edit (e.g. Pending Review with `sent_back`, which should be impossible), check on the testing DB before relying on it. If a real case exists, re-specify to key on `status_id = 7`.
  - **Consumers:** `BILATERAL_PRIMARY_ASSIGNMENT_COPY` (section-zero only; grep confirms).
- **Definition of done:**
  - [x] Spec green; lint clean.

### `PDR-T-6` — HITL: end-to-end check on the testing DB

- **Type:** rollout
- **Description:** The user runs this with the server and client on the testing DB (`prdb`). The agent does not connect to the DB. Steps:
  1. Create a bilateral result on a 2-SP project with SP09 as primary and SP12 saved as contributor.
  2. As SP09, press Decline. Check that Confirm is disabled while blank, then confirm with a text.
  3. Check that the result is Rejected in the Center list and that "View rejection justification" shows the decliner, the date and *"SP09 declined to be the primary Science Program of this result: …"*.
  4. Check that SP12's inbox has nothing for the result.
  5. Check that SP09's inbox shows the row as Declined under For your information.
  6. Check that the Center got one notice with the reason.
  7. Open the result as the Center: read-only, with the rejected banner.
  8. Repeat step 2 on a 3-SP project and on a 1-SP project.
  9. Compare the dialog side by side with the W3 "Reject result" dialog.
  10. Contributor Decline still shows the old yes/no confirmation.
  11. The SP review queue does not show the rejected result as pending (design R-1).
- **Implements:** `PDR-R-8` (no automated gate), `PDR-R-1` visual parity (no automated gate), end-to-end `PDR-R-4`, `PDR-R-6`, `PDR-R-9`, `PDR-R-10`, `PDR-R-11`
- **Files (expected):** `execution.md` evidence only
- **Depends on:** `PDR-T-4`, `PDR-T-5`
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Skills:** —
- **Verification:**
  - **Falsifier:** any of steps 3–11 differing from the expected outcome. For example, a "moved" notice appears, SP12 sees a request, or the modal says "No justification was recorded."
  - **Red run:** n/a (no test gate; manual)
  - **Disqualifier:** a check done on a result created **before** the deploy (old rule) is not evidence. Use a fresh result.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] Each step marked pass or fail by the user in `execution.md`.

---

## 4. Dependency graph

```
PDR-T-1 ── PDR-T-2 ──┐
PDR-T-3 ─────────────┴── PDR-T-4 ──┐
PDR-T-5 ───────────────────────────┴── PDR-T-6 (HITL)
```

The parallel-safe pairs are `T-1`/`T-3`/`T-5`, `T-2`/`T-3` and `T-4`/`T-5`, because they touch disjoint files.

---

## 5. Coverage (scenario and clause level)

| Requirement · scenario / clause | Owner task | Test or check |
|---|---|---|
| R-1 · opens with title, message, empty required field, Confirm disabled | T-3 | dialog spec |
| R-1 · BUT not sent until Confirm | T-4 | notification-item spec (no PATCH on Decline click) |
| R-1 · blank / whitespace keeps Confirm disabled | T-3 | dialog spec |
| R-1 · cancel (button, icon, Escape, mask) closes, nothing sent, still pending, reopen empty | T-3 (close + reset), T-4 (nothing sent, row still actionable) | dialog spec, item spec |
| R-1 · saving disables both + spinner; AND IT MUST NOT double send | T-3 | dialog spec |
| R-1 · 403/409/500 close + existing toast | T-4 | item spec |
| R-1 · BUT 400 keeps the dialog and the text, shows error | T-4 | item spec |
| R-1 · both surfaces (row, drawer) | T-4 | item spec |
| R-1 · same layout as W3 dialog | T-6 | **manual visual check** (no automated gate) |
| R-2 · contributor Decline keeps yes/no; BUT no justification field or text | T-4 (client), T-2 (server: no 400 for contribution) | item spec, service spec |
| R-3 · 400 with message, nothing changes (request pending, status unchanged, no history) | T-2 (endpoint), T-1 (service guard: no writes) | service specs |
| R-3 · ignored on accept / contribution | T-2 | service spec |
| R-4 · request Declined, status 7, REJECTED history with prefixed comment by decliner, contributions dropped | T-1 | primary-program-request spec |
| R-4 · BUT no new primary request to SP12 | T-1 | falsifier (a) |
| R-4 · any number of alignments (1/2/3) | T-1 | falsifier (b) |
| R-4 · atomic: a failed write persists nothing | T-1 | falsifier (c) |
| R-4 · AND IT MUST race-safe: one outcome, loser 409, no writes | T-1 | falsifier (j) |
| R-5 · no auto-move ever | T-1 | falsifiers (a), (b) |
| R-6 · contributors get no request / notice / email | T-1 (server), T-6 (inbox) | falsifier (e), HITL step 4 |
| R-6 · AND IT MUST stay so after reload / acting on the declined row | T-1 (row status 3 + accept re-check → 409), T-6 | spec, HITL step 4 |
| R-7 · swap: owner stays, status unchanged; BUT not Rejected; no history | T-1 | falsifier (d) |
| R-7 · justification required in swap too | T-2 (400 applies to every primary decline), T-4 | service spec, item spec |
| R-8 · Rejected status + modal shows name, date, comment | T-1 (data written), T-6 (read) | spec + **manual** HITL step 3 |
| R-9 · read-only, no "Pick another" hint | T-5 | section-zero spec, HITL step 7 |
| R-9 · server keeps refusing a primary change (400) | existing guard (`PDR-P-3`), T-6 | no code change; verified premise. HITL step 7 |
| R-10 · ownerless and swap notice texts; exactly one notice | T-1 | spec |
| R-10 · "moved" no longer emitted; old rows still render | T-1 (not emitted), existing render untouched | spec + grep |
| R-10 · notice failure does not undo the decline | T-1 | falsifier (i) |
| R-11 · declined row stays visible, Declined, no buttons | T-1 (active), T-6 (inbox) | falsifier (f), HITL step 5 |

---

## 6. Estimate & PR strategy

| Task | LOC (incl. tests) |
|---|---|
| T-1 | ~+150 / −110 |
| T-2 | ~50 |
| T-3 | ~120 |
| T-4 | ~100 |
| T-5 | ~30 |
| **Total** | **~450 changed (~340 net)** |

**One PR.** The change is about 400 LOC and makes sense as a unit: the server 400 and the client dialog must ship together, or a deployed client with no text gets 400 on every primary decline. Review order in the PR: T-1, T-2, then T-3 to T-5.
