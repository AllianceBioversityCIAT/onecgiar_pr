# Requirements — Bilateral "Change result type": optional justification

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` |
| Sub-feature | `change-type-optional-justification` |
| Owner | Maria Camila Giraldo |
| Status | approved (2026-10-26) |
| Depth | **Lite** |
| Type | Change (enhancement) |
| Proposal | none — specified directly from the ticket |
| Source | User Feedback – October 2026, item 20 (Pascale Sabbagh) |
| Reference result | IRRI — Result ID 9901, Phase 36 |
| Approval Mode | gated |
| Builds on | `PATCH /api/bilateral/center/change-type/:resultId` (P2-3233, contract log 2026-09-10) |

## 1. Executive Summary

A bilateral result promoted from an AI draft can change its result type from General Information. Today the dialog will not let the user confirm without typing a reason. The reason becomes **optional**: the field stays, the red `*` goes, and the change goes through with or without text.

## 2. Glossary

| Term | Meaning |
|---|---|
| Change result type dialog | The modal opened by the "Change result type" button in the bilateral General Information section |
| Justification | The "Why is this change needed?" text; it is appended to the review-history comment |
| Review-history comment | The `result_review_history` row written for each type change |

## 3. System Context & Scope

Current behavior (cited at `897b85c2b`):

- **The client blocks it.** `canSubmit()` requires `justification.trim()` (`onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-change-result-type-dialog/bilateral-change-result-type-dialog.component.ts:67-70`); the label shows `*` (`…component.html:7`).
- **The server does not enforce it at runtime.** The DTO declares `@IsNotEmpty()` (`onecgiar-pr-server/src/api/bilateral/dto/change-center-result-type.dto.ts:30-32`), but the route has no `ValidationPipe` (`bilateral-center.controller.ts:79-91`), and `grep -rn "useGlobalPipes\|APP_PIPE" onecgiar-pr-server/src` returns no non-spec hit.
- **The audit comment is not safe for an empty reason.** It always appends `. ${dto.justification}` (`bilateral-center.service.ts:799-800`): an omitted field writes the word `undefined` into the review history.

**In scope:** the dialog's required rule and marker; the DTO's declared contract; the review-history comment when no reason is given; the contract change-log row.
**Out of scope:** the result-type options, the Knowledge Product handle rule, the W1/W2 change-type flow (`delete-recover-data`), eligibility rules (AI-promoted, Editing, lead centre).

## 4. Personas

| Persona | Need |
|---|---|
| Result submitter (centre staff) | Fix a misclassified AI draft without writing a redundant explanation |
| QA reviewer / PMU | Read a clean review history; see the reason when one was given |

## 5. Functional Requirements

### BIL-CTJ-R-1 — The justification is optional in the dialog

The dialog SHALL let the user change the result type without a justification.

#### Scenario: Empty reason (ticket test scenario)

- GIVEN a bilateral result promoted from an AI draft, in Editing, and the dialog open
- WHEN the user selects a result type other than the current one and leaves "Why is this change needed?" empty
- THEN the "Change result type" button is enabled
- AND clicking it sends the change and the dialog closes on success
- BUT the "Why is this change needed?" label must NOT show the `*` required marker
- AND IT MUST still keep the button disabled while no new type is selected, or while submitting

#### Scenario: Reason given

- GIVEN the same dialog
- WHEN the user selects a new type and types a reason
- THEN the request carries the trimmed reason, as today

#### Scenario: Knowledge Product handle unchanged

- GIVEN the user selects Knowledge Product with no reason
- WHEN the CGSpace handle is empty
- THEN the button stays disabled
- AND it enables once a handle is typed, reason still empty

### BIL-CTJ-R-2 — The server accepts and records a change without a reason

`PATCH /api/bilateral/center/change-type/:resultId` SHALL accept a body where `justification` is absent, empty, or blank, and process the change exactly as it does with a reason.

#### Scenario: No reason

- GIVEN a valid change request with no justification
- WHEN the server records the review-history comment
- THEN the comment is `Result type changed from level X, type Y to level A, type B.`
- BUT it must NOT contain `undefined`, `null`, or a trailing space

#### Scenario: Reason given

- GIVEN a valid change request with justification `Classification corrected`
- THEN the comment ends with `. Classification corrected`, as today

### BIL-CTJ-R-3 — The contract states the field is optional

The API docs (Swagger) and the bilateral contract change log SHALL describe `justification` as optional for this endpoint.

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| BIL-CTJ-NFR-1 | No other validation of the change-type flow changes (eligibility, level/type pair, KP handle) |
| BIL-CTJ-NFR-2 | No migration, no new endpoint, no read-payload shape change |

## 7. Defect classes and gates

| Defect class | Gate |
|---|---|
| Button still disabled with an empty reason | Client Jest on the dialog (new spec) |
| `*` marker still rendered | Client Jest DOM query on the rendered label |
| KP handle rule or "no type selected" rule regressed | Client Jest on `canSubmit()` |
| Review comment prints `undefined` / trailing space | Server Jest on `changeResultType` comment |
| Type mismatch after DTO change | Server `tsc` build (`npm run build`) |
| Visual layout of the dialog | n/a — markup removes one inline `<span>`; manual check on result 9901 at the HITL pause |

## 8. Requirement ID Index

| ID | Title |
|---|---|
| BIL-CTJ-R-1 | Justification optional in the dialog |
| BIL-CTJ-R-2 | Server accepts and records a change without a reason |
| BIL-CTJ-R-3 | Contract states the field is optional |
| BIL-CTJ-NFR-1 | No other validation changes |
| BIL-CTJ-NFR-2 | No migration or payload change |
