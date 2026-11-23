# Requirements — Bilateral External partners back in the MDS

## 1. Document Control

| Field | Value |
|---|---|
| Module | `bilateral` — Contributors & partners section (section 2) of the centre-authored form |
| Spec Path | `changes/bilateral-partners-mds` |
| Type | Change |
| Deliverable | software |
| Depth | Standard |
| Approval Mode | gated |
| Ticket(s) | TBD — no Jira ticket known (user, 2026-11-18). Commits use `[TBD]` until one exists |
| Requirement source | Nicoleta Trifa email 2026-11-16, point 2 · `proposal.md` (approved by the user 2026-11-18, Option A) |
| Decision | **Mandatory field confirmed by Angel Jarrin** (relayed by the user, 2026-11-18). This supersedes P2-3821, the PO decision of 2026-09-28 (`bilateral/contributors-partners-optional`) |
| Status | approved (user, 2026-11-18) |

## 2. Executive Summary

External partners becomes an MDS field of bilateral results again. It moves out of "Complete full metadata" into the main body of section 2, and it must be answered before the centre submits. The answer is **at least one partner, or "This result has no external partners"**. The rule is enforced in two places: on the form (section completion and Submit) and on the server (submit-for-review). Results the centre cannot edit never show it as missing. Knowledge Products and `POST /api/bilateral/create` keep today's optional rule.

## 3. Glossary

| Term | Meaning |
|---|---|
| MDS | Minimum data standards: the fields the form requires before Submit |
| Partner answer | At least one active external partner, **or** the "no external partners" flag set |
| Editable result | A bilateral result the centre user can edit on the form (Editing, Draft, Rejected). Everything else is read-only |
| Full metadata | The optional fields behind the "Complete full metadata" toggle of section 2 |

## 4. System Context & Scope

**Today:**
- The partners block renders only inside Full metadata (`section-contributors.component.html:303`).
- It is optional: there is no tracker item (`section-contributors.component.ts:997-1015`) and `[required]="false"` (`section-contributors.component.html:349-360`).
- The server submit guards do not look at partners (`bilateral-center.service.ts:2685-2775`, `assertSubmittable`).
- Partners are stored as `results_by_institution` rows, with role 2, or role 8 for Knowledge Products. The "none" answer is stored as `result.no_applicable_partner` (`bilateral-center.service.ts:2081-2101`).
- Knowledge Products use the same section (`bilateral-result-creator.component.html:280`). Their partners come from the repository record (`docs/specs/changes/bilateral-pdf-mds-only/design.md:70`, DD-4).

### In scope

- Placement and required state of the partners block on the form, for every result type. Required only for non-KP results.
- The section completion and Submit gate on the form.
- The server gate on submit-for-review, shared with the AI quality check and the field-revision audit.
- The MDS-only bilateral PDF: show non-KP partners again. The code lives in a separate repo, `alliance-ibd-pdf-viewer`.
- Supersession notes in the P2-3821 and P2-3368 specs, and in code comments.

### Out of scope

- `POST /api/bilateral/create` and the Fetcher. Ingest stays optional, and the contract is unchanged (AC-4).
- The AI service and its prompts.
- Partner type and nature attributes.
- W1/W2 and IPSR partner forms.
- A backfill of existing results.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter (centre user) | Sees External partners in section 2 without expanding anything. Cannot submit a non-KP result without a partner answer |
| SP reviewer / read-only viewer | Sees partners up front. A read-only result never shows them as missing |
| Bilateral producers (Fetcher, `POST /create`) | No change |
| PMU (Nicoleta) | Partner data is collected for every human-submitted bilateral result |

User story — **BPX-US-1**: As a result submitter, I want the External partners field in the main form and required, so that every bilateral result I submit reports its partners (refines PRD AC-2).

## 6. Functional Requirements

### BPX-R-1 — Placement

The External partners block (the "no external partners" checkbox, the partners multi-select and the selected-partner chips) SHALL render in the main body of section 2, outside Full metadata, for **every** result type. It renders whatever the state of the Full metadata toggle.

#### Scenario: Visible without expanding

- GIVEN any bilateral result, of any type, open in section 2
- WHEN Full metadata is collapsed
- THEN the External partners block is visible
- BUT it must NOT be rendered a second time when Full metadata is expanded

### BPX-R-2 — Required for non-KP editable results

For a non-Knowledge-Product result that the centre user can edit, the partner answer MUST be required:
- the field carries the required marker;
- the red hint "Add at least one external partner, or tick 'This result has no external partners'." shows while there is no answer;
- section 2 lists "External partners" as missing until it is answered.

#### Scenario: No answer blocks completion

- GIVEN an Editing non-KP result with no partner selected and the checkbox unticked, every other tracked field complete
- WHEN section 2 is evaluated
- THEN the missing list contains "External partners", and Submit is disabled
- AND IT MUST show the required marker and the red hint

#### Scenario: Either answer completes

- GIVEN the same result
- WHEN the user selects one partner, **or** ticks "This result has no external partners"
- THEN "External partners" leaves the missing list, and the section can read "Section complete"

#### Scenario: Answer not yet loaded

- GIVEN the stored partners have not loaded (the read is pending, or it failed)
- WHEN section 2 is evaluated
- THEN "External partners" counts as missing
- BUT it must NOT count as answered, even if the user picked partners on screen, because their keys are not saved (the P2-3443 invariant)

### BPX-R-3 — Never missing on read-only results

When the centre user cannot edit the result (Pending Review, Approved, Submitted…), External partners MUST NOT appear in the missing list, and the red hint MUST NOT show.

#### Scenario: Ingested result in Pending Review (#9503)

- GIVEN a non-KP result ingested without partners, in Pending Review, opened read-only
- WHEN section 2 loads
- THEN the missing list does not contain "External partners", and the section is not held incomplete by it

#### Scenario: Becomes editable

- GIVEN that result is rejected, so it becomes editable
- WHEN section 2 loads
- THEN "External partners" is listed as missing until it is answered

### BPX-R-4 — Knowledge Products stay optional

For a Knowledge Product result, External partners MUST remain optional: no required marker, no red hint, no missing-list item, and no server refusal.

#### Scenario: KP without partners

- GIVEN an Editing KP result with no partner answer
- WHEN it is submitted for review
- THEN partners do not block the submit

### BPX-R-5 — Server gate on submit

For a non-KP bilateral result, `submit-for-review` MUST refuse with HTTP 400 when the result has neither an active external-partner row nor the "no external partners" flag. The message names External partners. The same refusal applies to the AI quality check and the field-revision audit, which share the submit preconditions.

#### Scenario: API submit without partners

- GIVEN an Editing non-KP result with no active partner row and `no_applicable_partner` not true
- WHEN `submit-for-review` is called
- THEN the response is 400 with a message naming External partners, and `status_id` is unchanged
- BUT it must NOT write a review-history row

#### Scenario: API submit with an answer

- GIVEN the same result with one active partner row, **or** `no_applicable_partner = true`
- WHEN `submit-for-review` is called
- THEN the partners check passes. The other preconditions decide the outcome as they do today

### BPX-R-6 — Persistence unchanged

Saving and reloading partners and the "none" flag MUST behave exactly as today. That covers the payload keys `institutions`, `no_external_partners` and `is_lead_by_partner`, sent only once the stored partners have loaded. Ticking the box clears the selection.

### BPX-R-7 — Hidden-fields note

The "N hidden field(s) have values and will be saved." note MUST NOT count the partner block, since it is never hidden. The linked/bundled question keeps its current rule.

### BPX-R-8 — MDS PDF shows non-KP partners

The bilateral MDS-only PDF MUST print the Partners table for non-KP results that have partners. KP results keep printing their repository partners as today.

#### Scenario: Non-KP PDF

- GIVEN a non-KP bilateral result with two partners
- WHEN its PDF is rendered
- THEN the Partners table lists both
- BUT the PDF must NOT print any other block that `bilateral-pdf-mds-only` removed

### BPX-R-9 — Supersession is recorded

Code comments and specs that call External partners optional (P2-3821: `BIL-R-1`, `BIL-R-2`, `BIL-R-4`; P2-3368 AC5) SHOULD cite this spec and the 2026-11-18 decision, so no later reader restores the optional rule.

### BPX-R-10 — Ingest unchanged

`POST /api/bilateral/create` MUST keep accepting payloads without `contributing_partners`, with no new error and no new warning.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | No change to any `/api/bilateral/*` request or response shape (AC-4). The new 400 is a refusal on an existing endpoint, with the same error envelope |
| Performance | The server gate adds at most 2 indexed reads per submit (the flag and an active-partner count) |
| Accessibility | The required marker and the hint use the existing `pr-multi-select` and `pr-checkbox` affordances (WCAG 2.1 AA, `docs/ux-ui/design.md` §10) |
| Observability | No new logs. The 400 goes through `HttpExceptionFilter` |

## 8. Defect Classes And Gates

| Defect class | Gate |
|---|---|
| Tracker reports partners answered while the payload omits their keys | Client Jest on `updateContributorsMds` with `partnersHydrated` false (BPX-R-2 scenario 3) |
| #9503 regression: read-only result held incomplete | Client Jest with `readOnly()` true, including a readOnly flip after load |
| Block still inside Full metadata, or rendered twice | Static read of the real `.html` plus a component render test, collapsed and expanded |
| Server accepts a submit with no answer, or refuses a valid answer / a KP | Server Jest on `assertSubmittable` / `submitForReview`, cases: none, row, flag, KP, inactive row only |
| Typed contract mismatch (client build stricter than Jest) | `npx ng build` (client) and `npx tsc --noEmit -p tsconfig.json` (server) |
| PDF missing or duplicating the table | No test runner in `alliance-ibd-pdf-viewer`. Substitute: a render of a fixture before and after, inspected at the HITL pause. The repo is cloned at `D:\Desarrollo Empresa\alliance-ibd-pdf-viewer` |
| Rendered layout (block placement, hint position) | jsdom cannot measure layout. Substitute: a human check at the HITL pause on prtest |

## 9. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| BPX-R-1 | Placement | SHALL |
| BPX-R-2 | Required for non-KP editable results | MUST |
| BPX-R-3 | Never missing on read-only results | MUST |
| BPX-R-4 | KP stays optional | MUST |
| BPX-R-5 | Server gate on submit | MUST |
| BPX-R-6 | Persistence unchanged | MUST |
| BPX-R-7 | Hidden-fields note | MUST |
| BPX-R-8 | MDS PDF shows non-KP partners | MUST |
| BPX-R-9 | Supersession recorded | SHOULD |
| BPX-R-10 | Ingest unchanged | MUST |

Cross-references: `docs/prd.md` AC-2 (submission gate), AC-4 (bilateral stability) · `docs/trd/trd.md` bilateral module · supersedes `docs/specs/bilateral/contributors-partners-optional/requirements.md` (BIL-R-1, BIL-R-2, BIL-R-4) · amends `docs/specs/changes/bilateral-pdf-mds-only/requirements.md:45`.

## 10. Open Questions

- **BPX-OQ-1** Existing Editing results without partners just ask for the field. Is a notice to centres needed? Default: no.
- **BPX-OQ-2** Should Option B (requiring partners on ingest) follow as its own spec? Default: no.
