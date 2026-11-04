# Requirements — Annual updating for replicated W3/Bilateral innovations

## 1. Module / Feature

| Field | Value |
|---|---|
| Module | `bilateral` (client Section 1 General information) + `results` (shared general-information writer) |
| Sub-feature | `replicated-innovation-annual-updating` |
| Requirement prefix | `BIL-RAU` |
| Depth | **Standard**. It touches a shared W1/W2 component and a shared server writer, with no migration and no external contract change |
| Owner | Santiago Sanchez |
| Status | approved — 2026-09-29 (Phase 1, amended in Phase 2: R-6 narrow admin escape, R-11 explicit "No") |
| Approval Mode | gated (inherited from `proposal.md`) |
| Ticket(s) | none yet (`BIL-RAU-OQ-1`) |
| Source | `proposal.md` (approved 2026-09-29, with decisions OQ-1..OQ-4) |

## Executive Summary

A W3/Bilateral **Innovation Development (7)** or **Innovation Use (2)** result that was **replicated** into the current phase must ask the same *Annual updating* question W1/W2 asks: is the innovation still active? A "No" collects reasons (and merge/split targets) and moves the result to **Discontinued (4)**, exactly as in W1/W2. Non-replicated bilateral results and every W1/W2 screen stay unchanged.

## Glossary

| Term | Meaning |
|---|---|
| Replicated | A result copied into a newer phase by the phase change (`result.is_replicated = 1`). Replication always lands the copy in **Editing (1)** (verified `result.repository.ts:96-98`) |
| Annual updating block | The W1/W2 block at the top of General Information (`rd-annual-updating`): question, reasons, "Other" text, merge/split targets, lock, admin reopen (P2-3292 Steps 1–4) |
| Stored answer | The value already saved on the result, as opposed to the value being edited on screen |
| Status Trigger wording | P2-3292 Step 1 wording, used for type 7 from phase year 2026: "Is this innovation active and receiving investment?" with Yes / No |
| Reopen | Admin action on a stored-inactive result: sets the answer back to active and clears the reasons. Saving it moves Discontinued (4) back to Editing (1) (P2-2923) |
| MDS | Bilateral minimum data set, tracked per section. Submit requires every section complete |

## 2. Context

The Bilateral Home already counts "N replicated" per project (`bilateral/project-overview-metrics`). That spec left *how a team updates a replicated innovation* to a separate spec, and this is it. Today the bilateral Section 1 has no Annual updating block. Its writer, `PATCH api/results/bilateral/general-info/:id`, also accepts no discontinuation key, so the answer cannot be given or stored.

- PRD: `docs/prd.md` bilateral reporting goals (W3/Bilateral results reported with the same rigour as pooled). Refines the bilateral reporting user stories.
- UX: `docs/ux-ui/design.md` §8 components. The visual reference is the existing W1/W2 block, reused as-is.
- TRD: `docs/trd/trd.md` results + bilateral modules. Entities `result` (`is_discontinued`, `status_id`, `is_replicated`), `results_investment_discontinued_option`, `result_innovation_merge_split`.

## 3. In Scope / Out of Scope

### In scope

- Showing the Annual updating block in bilateral Section 1 for replicated types 7 and 2.
- Saving the answer, reasons, "Other" text and merge/split targets through the bilateral General info writer, into the same storage W1/W2 uses.
- The Discontinued (4) ↔ Editing (1) status rule, the same as W1/W2.
- Lock + admin reopen, the same as W1/W2.
- MDS / Submit gating of the answer for replicated innovations only.

### Out of scope

- Any change to W1/W2 behavior, wording, or reason catalogue (epic P2-3243).
- New reason texts or catalogue rows (P2-3292, owned by Juan David Delgado).
- The external `/api/bilateral/*` payload contract.
- A server-side lock (W1/W2's lock is UI-only too).
- MySQL `validation_innovation_*_P25` green-check functions.
- Replication itself (which results get carried forward).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (center reporter, W3 project) | Answers "still active?" on replicated innovations. A "No" closes the result as Discontinued |
| PMU / P&A reviewer | Sees the active / discontinued status of replicated bilateral innovations |
| Platform admin | Can reopen a discontinued bilateral innovation closed by mistake |
| W1/W2 submitter | Nothing changes |

## 5. User Stories

- **`BIL-RAU-US-1`**: As a center reporter, I want to state whether a replicated bilateral innovation is still active, so that the new phase does not carry dead innovations as if they were alive.
- **`BIL-RAU-US-2`**: As a center reporter, when an innovation is no longer active, I want to record why and, for a merge or split, where it continued, so that the portfolio keeps the lineage.
- **`BIL-RAU-US-3`**: As an admin, I want to reopen a bilateral innovation closed by mistake, so that the reporter is not trapped (P2-2923).

## 6. Functional Requirements

### Requirement BIL-RAU-R-1: Visibility

The system **MUST** show the Annual updating block at the top of bilateral Section 1 when, and only when, the result is bilateral, `is_replicated = 1`, and the type is 7 or 2.

#### Scenario BIL-RAU-S-1.1: replicated innovation shows the block
- GIVEN a bilateral Innovation Development result with `is_replicated = 1` in phase 2026
- WHEN the reporter opens Section 1 General information
- THEN the Annual updating block renders above the Title field
- AND the question reads "Is this innovation active and receiving investment?" with options Yes / No

#### Scenario BIL-RAU-S-1.2: non-replicated or other types do not
- GIVEN a bilateral result with `is_replicated = 0` (or `NULL`), OR a replicated result of any type other than 7 and 2
- WHEN Section 1 opens
- THEN no Annual updating block renders
- BUT it must NOT add any item to the Section 1 MDS, change its completeness percentage, or change Submit availability

### Requirement BIL-RAU-R-2: Parity of wording, catalogue and pickers with W1/W2

The block **MUST** behave exactly as the W1/W2 block does for the same type and phase year: header wording, option labels, the reason-checklist prompt, the reason catalogue generation for that phase year, the "Other" free-text box, and the merge/split target pickers shown when a merge or split reason is ticked.

#### Scenario BIL-RAU-S-2.1: Innovation Use keeps the legacy wording
- GIVEN a replicated bilateral Innovation Use (2) result
- WHEN the block renders
- THEN it uses the legacy wording ("Innovation use is active/investment was continued" / "…discontinued, because:"), the same as W1/W2 for type 2

#### Scenario BIL-RAU-S-2.2: merge/split lists the whole portfolio
- GIVEN the reporter answered No and ticked "Discontinued: merging with another innovation"
- WHEN they open the merge picker and search
- THEN active, non-discontinued Innovation Development results from **both** W1/W2 and W3/Bilateral are offered
- BUT it must NOT offer the result itself, in any phase

### Requirement BIL-RAU-R-3: Persistence through the bilateral writer

The system **MUST** save the answer, the ticked reasons (with the "Other" description) and the merge/split targets through the bilateral General info save. The data **MUST** land in the same storage W1/W2 uses, so every existing reader sees it.

#### Scenario BIL-RAU-S-3.1: answer survives a reload
- GIVEN the reporter answered No, ticked one reason, and autosave reported success
- WHEN they reload Section 1
- THEN No is selected (the radio is **not blank**) and the same reason is ticked
- AND IT MUST hold when the stored flag arrives as the MySQL tinyint `1` / `0`, not a boolean

#### Scenario BIL-RAU-S-3.2: a partial save does not touch the answer
- GIVEN a result stored as Discontinued (4) with two reasons
- WHEN the reporter edits only the Title and it autosaves
- THEN `is_discontinued`, the reasons, the merge/split targets and `status_id = 4` are unchanged
- BUT it must NOT treat a payload **without** the discontinuation keys as "answered Yes"

#### Scenario BIL-RAU-S-3.3: a payload with only the answer is valid
- GIVEN a payload carrying only `is_discontinued` (and its reasons)
- WHEN it is sent to the bilateral General info writer
- THEN it is accepted and stored
- BUT it must NOT be rejected with "Nothing was saved…"

### Requirement BIL-RAU-R-4: Status rule, same as W1/W2

When the answer is saved, the system **MUST** apply the W1/W2 rule. **No** sets `status_id = 4`. **Yes** on a result stored at 4 sets `status_id = 1`. **Yes** on any other status leaves it unchanged.

#### Scenario BIL-RAU-S-4.1: No closes the result
- GIVEN a replicated bilateral innovation at Editing (1)
- WHEN the reporter answers No, ticks a reason and it saves
- THEN `status_id = 4`

#### Scenario BIL-RAU-S-4.2: Yes on an active result keeps its status
- GIVEN a replicated bilateral innovation at Editing (1)
- WHEN the reporter answers Yes and it saves
- THEN `status_id` stays 1
- BUT it must NOT move a result at Pending Review (5), Approved (6) or Rejected (7) to 1

### Requirement BIL-RAU-R-5: Nothing saves before the stored state is loaded

The block **MUST NOT** send any discontinuation data until both the stored answer and the reason catalogue have loaded. If the load fails, the block **MUST NOT** save, and an error **MUST** be visible.

#### Scenario BIL-RAU-S-5.1: failed load cannot wipe stored reasons
- GIVEN the reasons request fails (HTTP 500)
- WHEN the reporter interacts with any Section 1 field
- THEN no discontinuation keys are sent
- AND an error message is visible in the block

### Requirement BIL-RAU-R-6: Lock and admin reopen

For type 7 from phase year 2026, a result **stored** as inactive **MUST** render the block read-only for non-admins, with a notice naming who to ask. An admin **MUST** see **Reopen this innovation**, which sets the answer to Yes and clears the reasons. Saving that reopens the result (R-4: 4 → 1).

Bilateral difference, from phase-1 discovery: the bilateral editor is already read-only for **every** status other than 1/8, admins included (`isEditableByCenterUser`, `autoSaveService.setReadOnly`). So at status 4:
- non-admins get a read-only result for **both** types 7 and 2;
- an admin **MUST** still be able to change and save the Annual updating answer, for both types, and nothing else in the result.

After a reopen saves, the editor **MUST** become editable without a manual reload.

#### Scenario BIL-RAU-S-6.3: admin escape is narrow
- GIVEN an admin on a bilateral result at status 4
- WHEN they open the result
- THEN only the Annual updating block is editable
- BUT it must NOT make the other Section 1–N fields editable or saveable

#### Scenario BIL-RAU-S-6.1: the lock follows the stored value, not the edited one
- GIVEN a non-admin on a replicated type-7 result stored as active
- WHEN they pick No (not yet saved)
- THEN the reason checklist stays editable
- BUT it must NOT lock the block before the answer is stored

#### Scenario BIL-RAU-S-6.2: admin reopens
- GIVEN an admin on a result stored as inactive (status 4)
- WHEN they click Reopen and the save completes
- THEN the answer is Yes, no reason is ticked, and `status_id = 1`

### Requirement BIL-RAU-R-11: "No" is committed explicitly, not by autosave

Bilateral autosaves every field about 800 ms after a change, and a stored "No" makes the result read-only (R-4 + R-6). If "No" autosaved on its own, it would lock the result **before** any reason could be ticked. So:
- a **Yes** answer **MUST** autosave like any other field;
- a **No** answer **MUST NOT** be sent until the reporter confirms it. Confirming is only possible once the answer is complete: at least one reason, the "Other" text when that reason requires it, and at least one target per ticked merge/split reason.

This mirrors W1/W2, where a save that ticks a reason shows a confirmation modal first.

#### Scenario BIL-RAU-S-11.1
- GIVEN a replicated innovation at status 1
- WHEN the reporter picks No and waits
- THEN nothing is sent and the checklist stays editable
- WHEN they tick a reason and confirm
- THEN the answer, reasons and targets are sent in **one** save and the result becomes Discontinued (4), read-only
- BUT it must NOT be possible to confirm with zero reasons

#### Scenario BIL-RAU-S-11.3: "No" without a reason shows a warning (owner decision, 2026-09-29)
- GIVEN the reporter answered No and ticked no reason
- WHEN they view the block, or try to confirm
- THEN a visible warning reads "Please provide a reason." and nothing is sent
- AND IT MUST hold on the server too: a bilateral General info save carrying `is_discontinued: true` with a missing or empty `discontinued_options` is rejected with HTTP 400 and the message "Please provide a reason.", and nothing is written
- BUT the W1/W2 writer must NOT change (R-9). The server check lives only on the bilateral path

#### Scenario BIL-RAU-S-11.2: cancelling the confirmation
- GIVEN the confirmation dialog is open
- WHEN the reporter cancels
- THEN nothing is sent and the form keeps No and the ticked reasons, still unsaved

### Requirement BIL-RAU-R-7: MDS and Submit gating

For a replicated innovation, Section 1 **MUST** count as incomplete until the question is answered. If the answer is No, at least one reason is required, plus at least one target for each ticked merge/split reason. For any other bilateral result the Section 1 MDS **MUST** stay exactly as today.

#### Scenario BIL-RAU-S-7.1: unanswered question blocks Submit
- GIVEN a replicated innovation with every other MDS field filled and the question unanswered
- WHEN the reporter views the MDS status
- THEN Section 1 is incomplete and Submit is disabled, naming "Annual update" as missing

### Requirement BIL-RAU-R-8: A discontinued bilateral result is not submitted

A bilateral result at status 4 **MUST NOT** be offered **Submit for review**, and its other sections **MUST NOT** be required to be completed.

#### Scenario BIL-RAU-S-8.1
- GIVEN a replicated bilateral innovation saved as Discontinued (4)
- WHEN the reporter views the result
- THEN no Submit-for-review action is available
- AND the results list shows its status as Discontinued

### Requirement BIL-RAU-R-9: No W1/W2 regression

W1/W2 Result Detail **MUST** render and save the Annual updating block exactly as before this change: same wording, lock, reopen, merge/split and status rule.

### Requirement BIL-RAU-R-10: Write authorization unchanged

The discontinuation save **MUST** go through the same bilateral write gate as the rest of Section 1. Admins can always save. Non-admins cannot save while the result is at Pending Review (5).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | `UpdateBilateralGeneralInfoDto` changes are **additive** (optional keys). The GET gains fields only. `/api/bilateral/*` is untouched, so no change-log row |
| Data integrity | Exactly **one** server code path writes discontinuation data for both W1/W2 and bilateral |
| Performance | At most one extra request on Section 1 load, and only for replicated innovations (reasons catalogue, plus the merge/split catalogue when stored inactive) |
| Security | JWT-gated as today. No new public route. No secrets in logs (`.cursorrules`) |
| Accessibility | Reuses W1/W2 controls (labels, focus) without change |
| i18n | No new copy. Reused strings stay where W1/W2 defines them |

## 8. Acceptance Criteria

| ID | Given | When | Then | Scenario |
|---|---|---|---|---|
| `BIL-RAU-AC-1` | Replicated bilateral type 7, phase 2026 | Open Section 1 | Block renders with Status Trigger wording | S-1.1 |
| `BIL-RAU-AC-2` | Non-replicated, or replicated type ∉ {7,2} | Open Section 1 | No block, MDS and Submit unchanged | S-1.2 |
| `BIL-RAU-AC-3` | Replicated type 2 | Open Section 1 | Legacy wording | S-2.1 |
| `BIL-RAU-AC-4` | Merge reason ticked | Search picker | W1/W2 + W3 innovations, never itself | S-2.2 |
| `BIL-RAU-AC-5` | No + reason saved | Reload | No selected, reason ticked (tinyint input) | S-3.1 |
| `BIL-RAU-AC-6` | Stored 4 + reasons | Title-only autosave | Answer, reasons, targets, status unchanged | S-3.2 |
| `BIL-RAU-AC-7` | Payload with only `is_discontinued` | PATCH | Accepted, not "Nothing was saved" | S-3.3 |
| `BIL-RAU-AC-8` | Status 1 | Save No | Status 4 | S-4.1 |
| `BIL-RAU-AC-9` | Status 1 / 5 / 6 / 7 | Save Yes | Status unchanged | S-4.2 |
| `BIL-RAU-AC-10` | Reasons GET fails | Interact | No discontinuation keys sent, error visible | S-5.1 |
| `BIL-RAU-AC-11` | Non-admin, stored active | Pick No | Not locked | S-6.1 |
| `BIL-RAU-AC-12` | Admin, stored 4 | Reopen + save | Yes, no reasons, status 1 | S-6.2 |
| `BIL-RAU-AC-13` | Replicated, unanswered | View MDS | Incomplete, Submit disabled | S-7.1 |
| `BIL-RAU-AC-14` | Bilateral status 4 | View | No Submit, list shows Discontinued | S-8.1 |
| `BIL-RAU-AC-15` | W1/W2 result | Existing specs | All green, assertions unchanged | R-9 |
| `BIL-RAU-AC-16` | Non-admin, status 5 | Save answer | 403, nothing written | R-10 |
| `BIL-RAU-AC-17` | Admin, status 4 | Open result | Only the block is editable, other fields read-only | S-6.3 |
| `BIL-RAU-AC-18` | Status 1, pick No | Wait / tick + confirm | Nothing sent until confirm, then one save, status 4 | S-11.1 |
| `BIL-RAU-AC-19` | Confirm dialog open | Cancel | Nothing sent | S-11.2 |

Cross-cutting project ACs: `AC-1` (typed result integrity), `AC-2` (submission workflow), `AC-3` (authorization), `AC-5` (phase correctness).

## 9. Defect Classes → Gate

| # | Defect class this spec can produce | Gate that catches it | Input that makes it FAIL |
|---|---|---|---|
| D1 | A partial autosave treats "no key" as "Yes", wiping reasons and resetting 4 → 1 | Server Jest on `updateBilateralGeneralInfo` | Title-only payload on a stored-4 result, then assert no discontinuation write and no status change |
| D2 | Status rule wrong for bilateral (5/6/7 moved to 1) | Server Jest, table of statuses | Yes on status 6 → expect 6 |
| D3 | W1/W2 regression in the shared component or writer | Existing Jest specs `rd-annual-updating*` / `rd-general-information*` / `createResultGeneralInformation` specs (`result.spec.ts`), unchanged assertions | Any assertion edit counts as a FAIL of R-9 unless justified |
| D4 | Blank radio after reload (tinyint `1`) | Client Jest feeding `1` / `0` / `null` through the input context. ⚠️ Jest cannot see the rendered radio, so the substitute is the real-browser check (D8) | Seed `is_discontinued: 1` → expect No selected |
| D5 | Block visible on non-replicated, or MDS item stuck amber | Client Jest on `section-general-info` MDS items | `is_replicated: 0` → expect no `annual-updating` item |
| D6 | Save before load (wipe) | Client Jest: reasons GET errors → no discontinuation keys queued | Mock 500 |
| D7 | NG0103 infinite loop in the merge/split multi-select, or teleport/layout breakage | **No automated gate** (documented in `rd-annual-updating/CLAUDE.md`: 19 green unit tests while broken) | Substitute: real-browser check on prtest at the HITL pause (D8) |
| D8 | Visual placement, rendered wording, real DB persistence | **Manual**: prtest browser run with a real replicated bilateral innovation (`token` + `user` in localStorage), plus a DB read of `result.is_discontinued` / `status_id` / reason rows | A reload that shows a blank radio, or a DB row mismatch |
| D10 | "No" autosaves alone and locks the result before any reason is ticked | Client Jest: pick No, advance timers past the debounce, assert nothing staged. Then confirm, assert exactly one batch with all three keys | Picking No then `jest.advanceTimersByTime(1000)` → expect 0 sends |
| D11 | Admin escape too wide (whole editor editable on status 4) | Client Jest on the creator/autosave read-only gate: status 4 + admin, a Title `updateField` must be dropped | Title update on status 4 → expect not staged |
| D9 | Submit offered on status 4 | Client Jest on the submit gate + manual check | Status 4 fixture → expect no Submit |

Accepted risk: none unmeasured. D7/D8 rely on a human browser check, which is mandatory before merge.

## 10. Dependencies & Assumptions

- **Upstream:** phase replication (`result.repository.ts` `createQueries`: status 1, `is_replicated = true`). Reasons catalogue `GET_investmentDiscontinuedOptions(type, phase_year)`. Merge/split catalogue `GET_mergeSplitTargetInnovations`.
- **Downstream:** W1/W2 screens, exports and validation functions that read `is_discontinued` / reasons. Bilateral overview counts (`is_replicated`).
- **Assumptions:** the bilateral client can know `is_replicated`, the type, the phase year and the stored `is_discontinued` for the open result (to be confirmed in design). A discontinued (4) bilateral result leaving the review workflow is the intended outcome (owner decision, 2026-09-29).

## 11. Open Questions

- **`BIL-RAU-OQ-1`**: Jira ticket id for commits? (non-blocking)
- ~~`BIL-RAU-OQ-2`~~ **Resolved**: server `assertSubmittable` (`bilateral-center.service.ts:2362-2371`) allows only Editing (1) / Draft (8), so status 4 is already refused. The client list already labels status 4 "Discontinued" (`bilateral-results-list.component.ts:111`).

## Requirement ID Index

| ID | Title | Scenarios |
|---|---|---|
| R-1 | Visibility | S-1.1, S-1.2 |
| R-2 | Parity with W1/W2 | S-2.1, S-2.2 |
| R-3 | Persistence | S-3.1, S-3.2, S-3.3 |
| R-4 | Status rule | S-4.1, S-4.2 |
| R-5 | Load gate | S-5.1 |
| R-6 | Lock + reopen (bilateral narrow admin escape) | S-6.1, S-6.2, S-6.3 |
| R-11 | "No" committed explicitly | S-11.1, S-11.2 |
| R-7 | MDS / Submit | S-7.1 |
| R-8 | Discontinued not submitted | S-8.1 |
| R-9 | No W1/W2 regression | AC-15 |
| R-10 | Write authorization | AC-16 |
