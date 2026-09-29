# Requirements — QA AI: edit Title/Description in the verdict drawer, with optional AI suggestions (W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` · sub-feature `qa-ai-text-suggestions` · module code **`BIL-QTS`** |
| Spec path | `docs/specs/bilateral/qa-ai-text-suggestions/` |
| Depth | **Standard**. It spans an outbound-contract addition, server sanitization and one drawer card with a save/re-check flow. Not Full: no migration, no new endpoint, no auth change |
| Type | **Change** |
| Approval Mode | **gated** |
| Status | **approved** 2026-09-29 (Phase 1) |
| Owner | Juan David Delgado |
| Date | 2026-09-29 |
| Ticket(s) | [P2-3848](https://cgiarmel.atlassian.net/browse/P2-3848) (Enhancement, epic P2-2338 *Enhancements 2026*; INC-163884 insumo 5) — replaces the planned sub-task under P2-3150 |
| Proposal | `proposal.md` (this folder), approved 2026-09-29 with OQ-1…OQ-4 resolved (§10) |
| Parent specs | `bilateral/qa-ai-traffic-light` (flow, contract v0.2, `BIL-QAI-R-6` freshness) · `bilateral/qa-ai-verdict-drawer` (drawer; `BIL-QAD-R-8` narrowed here) |
| Baseline | `docs/prd.md` **US-S1**, **US-S4**, **AC-2**, **AC-4**, **AC-9** · `docs/ux-ui/design.md` **§6** (drawers for side-by-side review/edit), §7 + DD-12, §8, **§10** a11y · `docs/trd/trd.md` **W1**, **W8** · `docs/bilateral-module/integration-contracts.md` §Quality assessment |
| Visual reference | `docs/specs/bilateral/qa-ai-verdict-drawer/mockup/reference-ai-review-drawer.png` (only the *AI suggestion → Apply → your version → Save* sub-block) · W1/W2 `ai-review.component.html` (interaction model) |

---

## 2. Executive Summary

When the AI grades **General information** amber or red, the Centre user can fix **Title** and **Description** inside the verdict drawer, next to the feedback, and save them without closing the drawer. If the AI sent a suggested title or description, it appears above the field with **Accept & save** (amended 2026-09-29, P2-3848). The suggestions are **optional** contract keys: today the AI sends none, and the feature is useful without them. Saving makes the verdict outdated, so the drawer offers **Check again**, and **Submit anyway** stays unavailable until a current check exists. No other field is editable or suggestible.

## 3. Glossary

| Term | Meaning |
|---|---|
| **GI card** | The drawer card for the `general_information` section |
| **Flagged** | GI section verdict is `amber` or `red` in the assessment on screen |
| **Suggestion** | `sections.general_information.suggestions.title` / `.description` from the AI (§6 `BIL-QTS-R-7`) |
| **Usable suggestion** | A suggestion that survived server sanitization (`BIL-QTS-R-8`) |
| **Stale** | `assessment.is_current === false`: saved content changed after the verdict was produced |
| **Check again** | Running a fresh assessment from inside the drawer |
| **Editable result** | A result the current user may edit in the bilateral form (not submitted, not a Knowledge Product title) |

## 4. System Context & Scope

### Context (current behavior, cited)

- The drawer is read-only. Per section it shows `comments`, and behind *See feedback* it shows `issues`/`strengths` (`onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-quality-assessment-dialog/bilateral-quality-assessment-dialog.component.html:96,133-142`). *Go to <section>* closes it onto the form section (`…component.html:98-109`; `bilateral-result-creator.component.ts:872-885`).
- A stale assessment already hides the submit button (`…component.html:169`) and shows *"…you must run it again before submitting"* (`…component.html:74-75`). The drawer itself offers no way to run it again. The only trigger is the page's Submit for review (`bilateral-result-creator.component.ts:825`).
- The server rejects a submit with a stale assessment (`onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts:2302-2305`).
- Title/description are saved through `PATCH api/results/bilateral/general-info/:resultId` (`onecgiar-pr-client/src/app/shared/services/api/bilateral-api.service.ts:103-104`). The form caps them at 30/300 words (`section-general-info.component.html:24,38`). Word limits are enforced at submit, not at autosave (`bilateral-result-creator.component.ts:809-822`).
- The v0.2 response carries no proposed text (`onecgiar-pr-server/src/api/bilateral/services/quality-assessment/bilateral-quality-rules.ts:26-43`). Unknown keys inside a section are persisted raw in the `sections` JSON column (`bilateral-quality-assessment.client.ts:433-438`; `entities/bilateral-quality-assessment.entity.ts:132-135`).
- Knowledge Products never reach the AI (`BIL-QAI-R-9`). Whether the bilateral form lets a KP title be edited is `UNVERIFIED — confirm at source before relying on it`.

### In scope

- Editing and saving Title and Description in the GI card when flagged.
- Rendering usable AI suggestions for those two fields with **Accept & save** (amended 2026-09-29).
- Re-running the check once when the drawer closes after a save (`BIL-QTS-R-12`) and recording each drawer save's provenance (`BIL-QTS-R-13`) — added 2026-09-29 for P2-3848.
- **Check again** in the drawer whenever the assessment is stale.
- Server: validate/sanitize `suggestions`; allow-list the section keys that reach the database.
- Contract copy + change log, and a hand-off section for the AI team.

### Out of scope

- Any field other than Title and Description, including Short title, ToC, partners, geography, evidence and type-specific fields (owner, 2026-09-29).
- Editing when GI is `green` or `grey` (owner decision OQ-2).
- ~~Recording whether saved text came from the AI (owner decision OQ-3).~~ Reversed 2026-09-29 by the owner for P2-3848 AC11 → `BIL-QTS-R-13`.
- P2-3848 AC1/AC2 beyond Title and Description (inline editing of every flagged field): out of scope, owner 2026-09-29 (Nicoleta's request names only title and description; the PO was notified on Slack the same day).
- P2-3848 AC5 (parity with the Bulk Uploader's inline editing): being validated by the owner; not a technical dependency of any task here.
- Implementing suggestion generation on the AI side.
- A request-payload change or a `contract_version` bump.
- The reference drawer's counter, per-field re-run, *Keep my version* and *Finish review*.

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Result submitter (Centre reporter) | Fixes title/description beside the AI feedback, optionally from an AI suggestion, and re-checks without leaving the drawer |
| QA / Program reviewer | Nothing visible. Stored assessments may carry two extra texts |
| AI QA service team | Gets an optional, documented response addition; nothing breaks if they never send it |
| Bilateral consumer (downstream) | None. No `/api/bilateral/*` read shape changes (AC-4) |

### User stories

- **`BIL-QTS-US-1`** As a result submitter, I want to correct a flagged title/description right next to the AI's feedback, so that I don't lose the feedback while I edit. *Refines US-S4.*
- **`BIL-QTS-US-2`** As a result submitter, I want to take or adjust the AI's proposed title/description, so that I don't rewrite it from the feedback alone. *Refines US-S1.*
- **`BIL-QTS-US-3`** As a result submitter, I want to re-run the check after my fix, so that I see whether it cleared the flag before I submit. *Refines US-S4, AC-2.*

## 6. Functional Requirements

### Required (MUST)

#### `BIL-QTS-R-1` — Flagged GI card offers Title and Description edits

When the assessment on screen has GI flagged and the result is editable, the GI card MUST show Title and Description as editable fields, prefilled with the values the form currently holds (the saved value unless the user has unsaved form edits), each with its own **Save**.

##### Scenario: Amber GI

- GIVEN a completed assessment whose `general_information.verdict` is `amber`
- AND an editable, non-KP result
- WHEN the user opens the drawer
- THEN the GI card shows an editable Title and Description holding the form's current values, each with Save
- AND IT MUST keep the existing verdict pill, comments, *See feedback* and *Go to General information* unchanged

##### Scenario: Not flagged

- GIVEN `general_information.verdict` is `green` or `grey`
- WHEN the drawer renders
- THEN the GI card shows no editable fields and no suggestion, exactly as today
- BUT it must NOT render an edit affordance for any other section card, whatever its verdict

##### Scenario: Not editable

- GIVEN the result is not editable by the user, or is a Knowledge Product, or the assessment status is `unavailable` / `skipped_kp_rule`
- WHEN the drawer renders
- THEN no editable fields are shown
- AND IT MUST NOT show them while the check is running or a submit is in flight

#### `BIL-QTS-R-2` — Save from the drawer persists through the normal path

Saving MUST persist the value through the same general-info save the form uses, with the form's limits, and the form MUST reflect it afterwards.

##### Scenario: Save a new title

- GIVEN a flagged GI card and a Title changed to a valid value
- WHEN the user presses Save for Title
- THEN the title is persisted, a success confirmation shows, and that field's Save disables until the next change
- AND the page header and the General information section show the new title without a reload
- BUT it must NOT let a later form autosave write the previous title or description back

##### Scenario: Invalid value

- GIVEN a Title over 30 words, a Description over 300 words, or an empty/whitespace-only Title
- WHEN the user tries to Save
- THEN Save is disabled and the field shows the limit/required message the form uses
- AND IT MUST NOT send the request

##### Scenario: Save fails

- GIVEN the save request errors
- WHEN the response arrives
- THEN an error alert shows, the typed value stays in the field and Save stays enabled
- AND IT MUST NOT mark the assessment stale on the client

#### `BIL-QTS-R-3` — Usable suggestions render with Accept & save *(amended 2026-09-29, P2-3848 AC6–AC9)*

When the assessment carries a usable suggestion for Title or Description and GI is flagged, the GI card MUST show it above that field labelled **Suggested title** / **Suggested description**, with **Accept & save**. *(Superseded: "AI suggestion" label and an Apply action that only copied the text.)*

##### Scenario: Accept & save

- GIVEN a usable `suggestions.title`
- WHEN the user presses Accept & save
- THEN the Title field takes the suggested text and it is saved through the `BIL-QTS-R-2` path in the same action (same confirmation, same failure handling, same stale mark)
- AND IT MUST NOT save when the drawer's own validation would block a manual Save

##### Scenario: Adjust before saving

- GIVEN a usable suggestion
- WHEN the user copies or types a variant into the field and presses Save
- THEN it saves as a manual edit (`BIL-QTS-R-13` records it as such)

##### Scenario: No suggestion

- GIVEN no usable suggestion for a field (the case for every assessment today)
- WHEN the GI card renders
- THEN no suggestion block shows for that field, and the field is still editable per `BIL-QTS-R-1`
- AND IT MUST show no placeholder or "no suggestion available" text

##### Scenario: Already applied

- GIVEN the field's current value equals the suggestion
- WHEN the card renders
- THEN the suggestion block shows an *Applied* state instead of the Accept & save action

#### `BIL-QTS-R-4` — Saving makes the verdict outdated; Check again re-runs it

After any successful save from the drawer, the drawer MUST treat the assessment as stale. Whenever the assessment is stale, the drawer MUST offer **Check again**, and MUST NOT offer Submit anyway.

##### Scenario: After a save

- GIVEN the user saved Title from the drawer
- WHEN the save succeeds
- THEN the stale notice shows, the submit button disappears, and **Check again** shows in the footer
- AND the user can still edit and save the other field before checking again

##### Scenario: Check again

- GIVEN a stale assessment in the drawer
- WHEN the user presses Check again
- THEN a fresh assessment runs with the same preconditions and error handling as Submit for review (unsaved-sections and invalid-fields guards included), the drawer shows the running state, and then it shows the new verdict
- AND IT MUST NOT submit the result
- BUT it must NOT allow Submit anyway on the stale assessment at any point (`BIL-QAI-R-6` unchanged)

##### Scenario: Stale for another reason

- GIVEN the drawer reopened on an assessment made stale by edits in the form
- WHEN it renders
- THEN Check again is offered there too

#### `BIL-QTS-R-5` — Unsaved drawer edits are not lost silently

If the user closes the drawer, presses *Go to…*, or presses Check again while a drawer field has unsaved changes, the drawer MUST warn before discarding them. A reminder like W1/W2's is enough: *"This change hasn't been saved yet — it will be lost if you close this window."*

#### `BIL-QTS-R-6` — Suggestions are optional; they never change the verdict's validity

A response without `suggestions`, or with any invalid `suggestions`, MUST be processed exactly as today. It MUST NEVER become `malformed` or `unavailable` because of that key.

##### Scenario: Garbage suggestions

- GIVEN a well-formed v0.2 response whose GI section has `suggestions: 42`, or `suggestions.title: ["x"]`
- WHEN PRMS processes it
- THEN the assessment is `completed`, verdicts are stored as sent, and no suggestion is stored

#### `BIL-QTS-R-7` — The contract defines exactly two optional suggestion keys

The contract MUST define, in the response only, `sections.general_information.suggestions` as an optional object. It holds optional `title` and `description`, each `string | null`: a full replacement text in plain English, with no markdown, HTML or surrounding quotes, within 30 / 300 words. `contract_version` MUST remain `"0.2"`, with a change-log row per the bump procedure (additive and optional both ways).

#### `BIL-QTS-R-8` — Server sanitization of suggestions

Before persisting, the server MUST keep a suggestion only if all of these hold:

| Rule | Drop the suggestion when |
|---|---|
| Section | the key sits in any section other than `general_information` |
| Verdict | GI verdict is not `amber`/`red` |
| Type | not a string |
| Content | empty after trimming |
| Limit | over 30 words (title) or 300 words (description), counted the way the form counts |
| Novelty | equal, after trimming, to the value PRMS sent in the request |
| Keys | any key other than `title`/`description` (silently ignored) |

- IT MUST store the kept text trimmed and otherwise verbatim, and never truncate it.
- BUT it must NOT log suggestion text. It may log only the number dropped, per assessment.

#### `BIL-QTS-R-9` — Only known section keys reach the database

The server MUST persist each section with only `verdict`, `score`, `comments`, `strengths`, `issues`, `fields`, plus `suggestions` for `general_information`. Any other key MUST be dropped.

##### Scenario: Unknown key

- GIVEN a response whose `evidence` section carries `"debug": "…"`
- WHEN it is stored
- THEN the stored `sections.evidence` has no `debug` key, and the verdict is unaffected

#### `BIL-QTS-R-10` — Suggestions are served and rendered as text

The existing assessment reads (`POST quality-assessment/:resultId`, `GET …/latest`) MUST return the stored `suggestions` inside `sections.general_information`. The client MUST render them as plain text, preserving `\n` line breaks, never as HTML or markdown.

#### `BIL-QTS-R-12` — Closing the drawer after a save re-runs the check *(added 2026-09-29, P2-3848 AC3)*

##### Scenario: Close after a successful save

- GIVEN at least one drawer save succeeded since the drawer opened, and the held assessment is stale
- WHEN the user closes the drawer (✕, Escape, scrim, Make adjustments, Go to…) and nothing unsaved remains in the drawer
- THEN the quality check runs once through the same path and guards as Check again (`BIL-QTS-R-4`), and the drawer shows the running state and then the new verdict
- AND IT MUST run at most once per close, however many fields were saved
- BUT it MUST NOT run when no drawer save succeeded, when the result is not editable, or when Check again already ran after the last save

##### Scenario: Guards refuse

- GIVEN a form section has unsaved changes
- WHEN the close would trigger the re-run
- THEN the existing "Save your changes before submitting" alert shows, the drawer closes, and nothing runs

#### `BIL-QTS-R-13` — Drawer saves are recorded with their provenance *(added 2026-09-29, P2-3848 AC11)*

After each successful drawer save of Title or Description, PRMS MUST write one `result_field_revision` row (`old_value`, `new_value`, user, field) with `provenance = AI_SUGGESTED` when the saved value equals, after trimming, the usable suggestion served for that field in the held assessment, and `USER_EDIT` otherwise. The server decides the provenance; the client never asserts it.

##### Scenario: Accepted verbatim

- GIVEN the user pressed Accept & save and the save succeeded
- THEN one row is written with `AI_SUGGESTED` and `change_reason` naming the assessment id

##### Scenario: Adjusted or typed

- GIVEN the saved value differs from the suggestion, or there was none
- THEN one row is written with `USER_EDIT`

##### Scenario: Recording fails

- GIVEN the save succeeded but writing the row fails
- THEN the save stands, the user sees no error, and PRMS logs the failure without any field text
- AND IT MUST NOT write a row for a failed save

### Should (SHOULD)

- **`BIL-QTS-R-11`** The contract copy SHOULD carry a self-contained *For the AI team* block (the proposal's §12), so the hand-off can be sent without the spec.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No extra request on drawer open. Check again costs one AI call bounded by `BILATERAL_AI_QUALITY_TIMEOUT_MS` (60 s default), same as Submit for review |
| Security / Privacy | Suggestion text and request bodies never logged (W8, AC-9). Text rendered through Angular interpolation only |
| Backwards compatibility | Additive contract change. No `/api/bilateral/*` read-shape change (AC-4). Stored pre-change rows render as "no suggestion" |
| Accessibility | New fields and buttons labelled. Accept & save/Save/Check again keyboard-operable with visible focus. Save results announced (`aria-live`), per `docs/ux-ui/design.md` §10 |
| Layout | Fields usable in the drawer from 520 px (its minimum width) and at the phone breakpoint, per §9 |

### Defect classes and their gates

| Defect class | Gate |
|---|---|
| Suggestion kept/dropped wrongly; unknown key persisted; response wrongly `malformed` | Server Jest over the AI client (`--testPathPattern=quality-assessment`) |
| Typed-contract mismatch (`QualitySectionResult` / client interface) | `npx tsc --noEmit` (server) and client type-check. The test runner erases types |
| Card shows/hides edit, suggestion, Applied, Check again under the wrong verdict/state | Client Jest over the dialog component |
| Drawer save not reflected in the form, or overwritten by a later autosave | Client Jest over the creator/state wiring, **plus a manual check at the execute HITL pause** (cross-component timing is weakly covered by jsdom) |
| Submit allowed on stale | Existing server guard test + client component test |
| Layout of fields/buttons inside the 520 px drawer and on phone | **No automated gate.** Human check at the HITL pause, or a T6 screenshot review |
| Quality of the AI's suggestions | **Accepted risk**. It belongs to the AI side, outside PRMS |

## 8. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| `BIL-QTS-R-1` | Flagged GI card offers Title/Description edits | MUST |
| `BIL-QTS-R-2` | Save persists through the normal path | MUST |
| `BIL-QTS-R-3` | Usable suggestions render with Accept & save (amended 2026-09-29) | MUST |
| `BIL-QTS-R-4` | Save → stale → Check again | MUST |
| `BIL-QTS-R-5` | Unsaved drawer edits warned | MUST |
| `BIL-QTS-R-6` | Suggestions never invalidate a response | MUST |
| `BIL-QTS-R-7` | Contract: two optional keys, v0.2 kept | MUST |
| `BIL-QTS-R-8` | Server sanitization of suggestions | MUST |
| `BIL-QTS-R-9` | Section key allow-list | MUST |
| `BIL-QTS-R-10` | Served and rendered as text | MUST |
| `BIL-QTS-R-11` | AI-team hand-off block in the contract copy | SHOULD |
| `BIL-QTS-R-12` | Closing after a save re-runs the check once | MUST |
| `BIL-QTS-R-13` | Drawer saves recorded with provenance (`result_field_revision`) | MUST |

## 9. Dependencies & Assumptions

- **Upstream:** AI QA service (optional participation). Existing general-info save endpoint. Existing assessment run/read endpoints.
- **Downstream:** the drawer and the bilateral rail card (read `sections`). The reviewer-side rendering (`BIL-QAI-GAP-4`) is not built yet.
- **Assumption:** no reader relies on a section key outside the allow-list. `UNVERIFIED — confirm at source before relying on it`: sample stored rows in prtest (settled in design).

## 10. Open Questions — resolved

| ID | Decision (owner, 2026-09-29) |
|---|---|
| `BIL-QTS-OQ-1` | Explicit **Check again**; Submit anyway disabled until the check is current → `R-4` |
| `BIL-QTS-OQ-2` | No editing on green/grey → `R-1` |
| `BIL-QTS-OQ-3` | No AI-provenance tracking → out of scope — **reversed 2026-09-29** (P2-3848 AC11) → `BIL-QTS-R-13` |
| `BIL-QTS-OQ-4` | Sub-task under P2-3150 |

## Required cross-references

`docs/prd.md` (US-S1, US-S4, AC-2, AC-4, AC-9) · `docs/ux-ui/design.md` (§6, §9, §10) · `docs/trd/trd.md` (W1, W8) · `docs/bilateral-module/integration-contracts.md` · `docs/specs/bilateral/qa-ai-traffic-light/` · `docs/specs/bilateral/qa-ai-verdict-drawer/`
