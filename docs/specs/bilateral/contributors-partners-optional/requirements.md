# Requirements — Bilateral External partners: optional, in Full metadata

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` |
| Sub-feature | `contributors-partners-optional` |
| Owner | Juan David Delgado |
| Status | approved (2026-09-29) |
| Depth | **Lite** |
| Type | Change (origin: bug P2-3821) |
| Proposal | `./proposal.md` (approved — Option A, 2026-09-28) |
| Ticket | P2-3821 · supersedes P2-3368 AC5 · decision recorded on P2-3821 (comment 43169) |
| Approval Mode | gated |

## 1. Context

The bilateral **Contributors & partners** section (`onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/`) treats External partners as a minimum-data answer: a partner, or the "This result has no external partners" box.

- **The form requires it** in three places: the MDS tracker item `external-partners` (`section-contributors.component.ts:725-735`), `[required]="true"` on the multi-select, and a red hint (`section-contributors.component.html:220-247`).
- **The Fetcher does not.** `contributing_partners` is absent from `required` (`onecgiar_result_functions/services/fetcher/src/validator/schemas/common_fields.json:7-17,313-331`), and the API has no way to declare "no partners" (`create-bilateral.dto.ts:1277-1286`).
- **The gap.** A result ingested without partners is born in Pending Review (`initial-status.constants.ts:21-27`). There the form is read-only (`section-contributors.component.ts:73`) while the footer still lists External partners as missing (`bilateral-result-creator.component.ts:251`). Example: #9503 (IITA).

PO decision (2026-09-28): the form follows the Fetcher. External partners becomes optional and moves into the section's Full metadata block.

Cross-references:
- `docs/prd.md` AC-2 (submission workflow) and AC-4 (bilateral stability; untouched, since no payload changes).
- `docs/ux-ui/design.md` DD-6 (the bilateral result-creator: MDS tracker, per-type sections).
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`: no change, because no contract changes.

## 2. In Scope / Out of Scope

### In scope

- Where the External partners block sits in the section: Minimum data → Full metadata.
- Whether it is required: required → optional (MDS tracker, required marks, red hint).
- The Full metadata hidden-fields note, which now counts the partner block.
- The unit specs that pin the old mandatory behaviour.

### Out of scope

- The Fetcher, `POST /create`, `SaveBilateralContributorsDto`, entities, migrations and MySQL functions.
- `keep_editing` and initial-status logic.
- The W1/W2 and IPSR partner forms.
- Any data backfill.
- The linked/bundled question: its behaviour and its type exclusion stay as they are.

## 3. Personas Affected

| Persona | Effect |
|---|---|
| Centre reporter (Editing) | Partners become optional and sit behind "Complete full metadata" |
| Reviewer / read-only viewer | Partners sit behind the toggle; the hidden-fields note says when data exists |
| External platform (Fetcher) | Indirect: ingested results without partners no longer show an unanswerable missing field |

## 4. Functional Requirements

### Required (MUST)

- **`BIL-R-1` Placement.** The External partners block (the "This result has no external partners" checkbox, the partners multi-select, and the selected-partner chips) MUST render only while Full metadata is expanded. It MUST render there for **every** result type, Innovation Use and Innovation Development included.
- **`BIL-R-2` Optional.** External partners MUST NOT be a required answer:
  - no required marker on the multi-select;
  - no "Add at least one external partner…" hint;
  - no "External partners" entry in the section's missing-fields list;
  - no effect on the section's completion or on the Submit gate.
- **`BIL-R-3` Persistence unchanged.** Selecting or removing partners, and ticking or unticking the checkbox, MUST keep saving and reloading exactly as today. That includes:
  - ticking the box clears any selected partners;
  - the partner keys travel only once the stored partner block has loaded;
  - "led by a partner = false" is still sent alongside them.
- **`BIL-R-4` Hidden-fields note.** With Full metadata collapsed, the "N hidden field(s) have values and will be saved." note MUST count the partner block as one field when it holds an answer: at least one partner selected, or the checkbox ticked. It MUST NOT count the block before the stored partners have loaded.
- **`BIL-R-5` Load-error banners.**
  - The centres-catalogue load error and its Retry button MUST stay visible in the minimum-data block without expanding Full metadata.
  - The partners load error and its Retry button MUST render together with the partner block.
- **`BIL-R-6` Linked question untouched.** The linked/bundled question MUST keep its current type rule: hidden for Innovation Use and Innovation Development, shown for every other type while Full metadata is expanded. The hidden-fields note keeps its current rule for it.

### Should (SHOULD)

- **`BIL-R-10`** Comments and copy that describe External partners as mandatory (P2-3368 AC5/AC7) SHOULD be updated to cite this decision (P2-3821), so the next reader does not restore the requirement.

## 5. Non-Functional Requirements

- No change to any HTTP request shape or endpoint (AC-4).
- No new component and no new design token. The block reuses its existing markup (`docs/ux-ui/design.md` §7–§8).
- Read-only rendering keeps the current disabled behaviour of the checkbox and the multi-select (P2-3520).

## 6. Acceptance Criteria

| ID | Req | Given | When | Then |
|---|---|---|---|---|
| `BIL-AC-1` | R-2 | A result with no partners and the checkbox unticked, **read-only** (Pending Review, as #9503) | The section loads | The missing-fields list is empty and the section reads "Section complete". **BUT** it must NOT list "External partners" |
| `BIL-AC-2` | R-2 | An Editing result, every other tracked section complete, no partners, checkbox unticked | The rail evaluates Submit | Submit is enabled. **AND IT MUST** register no `external-partners` item with the MDS tracker |
| `BIL-AC-3` | R-1 | Any result type (Policy, Innovation Use, Innovation Development…) | Full metadata is collapsed | The partner block is not rendered. When expanded, it is rendered for every type |
| `BIL-AC-4` | R-1, R-6 | An Innovation Use or Innovation Development result | Full metadata is expanded | The partner block renders. **BUT** the linked/bundled question must NOT render |
| `BIL-AC-5` | R-3 | Stored partners have loaded | The user selects partners, or ticks the box | The contributors payload carries `institutions`, `no_external_partners` and `is_lead_by_partner: false`. Ticking clears `institutions` to `[]` |
| `BIL-AC-6` | R-3 | The stored partners have **not** loaded (read pending or failed) | A contributors payload is built | It carries none of the three partner keys |
| `BIL-AC-7` | R-4 | Full metadata collapsed, partners loaded, one partner selected (or the box ticked), no linked answer | The note is evaluated | The count is 1. It is 0 when partners have not loaded or hold no answer. It is 2 when the linked question is also answered on a type that asks it |
| `BIL-AC-8` | R-5 | The centres-catalogue read failed, Full metadata collapsed | The section renders | The centres error banner and Retry are visible |
| `BIL-AC-9` | R-2 | The partner multi-select renders | — | It carries no required marker and the red hint is absent |

Cross-cutting: AC-2 (the submission gate changes only by one fewer required field) and AC-4 (untouched).

## 7. Defect Classes → Gates

| Defect class | Caught by |
|---|---|
| The tracker still registers `external-partners`, so the section never completes | Jest: `section-contributors.component.spec.ts` asserts the fields passed to `setSectionFields` |
| Wrong visibility gate: the block is hidden for Innovation Use / Innovation Development, or visible while collapsed | Jest on the named gate computed. Because the suite overrides the template, a **static read of the real `.html`** binds the block to that gate (real-artifact lock) |
| Partner keys dropped, or sent before hydration | Jest on `buildContributorsPayload` (BIL-AC-5/6) |
| Hidden-fields count wrong | Jest on `hiddenFieldsWithValues` (BIL-AC-7) |
| Centres banner moved behind the toggle | Static read of the real `.html`: the banner sits outside the Full metadata block (BIL-AC-8) |
| Type error in the edited component | `npx tsc -p tsconfig.app.json --noEmit` (client) |
| **Visual placement and spacing inside Full metadata** | **No automated check** (jsdom does not lay out). Substitute: a human check on the local app at the execute HITL pause, on one Policy and one Innovation Use result |

## 8. Dependencies & Assumptions

- **Upstream.** None. The server already accepts an absent partner answer (`submitForReview` has no server-side MDS check; verified in design P-1).
- **Downstream consumers.** The bilateral result-creator footer and rail, which read the MDS tracker, and the section's unit specs.
- **Assumption.** No server green check (`validation_partners_*`) gates a bilateral result's transition or its displayed completion (verified in design P-2).

## 9. Open Questions

- **OQ-1.** Should Full metadata auto-expand in read-only mode when partners are stored? Default: **no**; the hidden-fields note signals it.
