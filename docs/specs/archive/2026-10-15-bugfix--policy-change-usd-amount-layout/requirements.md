# Module Spec — `policy-change-usd-amount-layout` — `requirements.md`

> Spec taxonomy: client-only bugfix spanning the `results` module (Pool Funding / W1-W2) and the `bilateral` module. Depth: **Lite** (narrow UI bugfix). Mode: **Bug**.

---

## 1. Module / Feature

- **Module:** `results` (Pool Funding W1/W2 Policy Change Info) + `bilateral` (Type-Specific Detail)
- **Sub-feature:** `policy-change-usd-amount-layout`
- **Owner:** — (not specified)
- **Status:** draft
- **Ticket(s):** — (no `P2-XXXX` ticket given; reported directly as a QA defect description)
- **Type:** Bug (Bug Mode)

---

## 2. Context

Policy Change results carry a "Policy Type" dropdown. When the submitter picks **"Program, budget or investment"** (CLARISA `policy_type_id == 1`), the form must additionally capture a **USD Amount** and a **Status** (Confirmed/Estimated/Unknown). Two independent client components render a Policy Change result, and today they disagree on how that pair is presented:

- **Pool Funding (W1/W2)** — `pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/` ("Policy Change Info" section). USD Amount and Status already render side by side, directly in the section, whenever `policy_type_id == 1`. But the USD Amount field renders its "USD amount" wording **twice** (once as the field's label, once as its description — rendered as two separate boxed elements by the shared `app-field-card` wrapper), which reads as a broken/duplicated field.
- **Bilateral** — `pages/bilateral/components/section-type-specific/type-policy-change/` ("Type-Specific Detail" / "Type-Specific Details" accordion). The MDS fields (Policy type, Stage, Implementing organizations) render directly and always-visible. USD Amount and Status, however, are nested inside a secondary **"Complete full metadata"** disclosure, alongside an unrelated "Is this result related to:" question — so a submitter who has already picked "Program, budget or investment" must open a second panel to enter the one additional field that selection requires.

This is a genuine layout inconsistency between two renderings of the same conceptual type-specific section (`docs/ux-ui/design.md` §1 "One result, many lenses" — the same result data should vary by lens, not by presentation drift), and both defects are confirmed against the live templates (see `design.md` Premise Ledger).

Relates to `docs/prd.md` **US-S2** ("type-specific sections... capture domain detail without forcing the wrong shape onto my result") and **AC-1** (typed result integrity — the UI must present a type's full required detail coherently). Touches `docs/ux-ui/design.md` §8 PRMS Form UX Pattern (Cognitive Card Chunking, `RFUX-R-2`) and `docs/trd/trd.md` QAS-8 (Modifiability — a type-specific section should vary only by registered type, not drift by funding-source presentation).

---

## 3. In Scope / Out of Scope

### In scope

- Remove the duplicated "USD amount" text in Pool Funding's (W1/W2) Policy Change Info section when `policy_type_id == 1`, keeping exactly one USD Amount field, still side by side with Status.
- Relocate Bilateral's USD Amount and Status fields (shown when `policy_type_id == 1`) out of the "Complete full metadata" disclosure into the always-visible Type-Specific Detail area, laid out side by side to match Pool Funding.
- Leave Bilateral's "Full Metadata" disclosure holding only the "Is this result related to:" field once USD Amount/Status are relocated.
- Regression tests proving each defect's red state before the fix and green after (Bug Mode mandatory).
- Update the existing tests/E2E specs that assert on the current (soon-to-be-former) structure (see `design.md` Premise Ledger, consumer rows).

### Out of scope

- The QA review drawer's `policy-change-content` component (`pages/result-framework-reporting/pages/bilateral-review/.../policy-change-content/`), which never renders USD Amount/Status today and was not reported in this ticket. It carries the same duplicate-description defect pattern for Policy type/Stage per prior commit history — a candidate for a separate follow-up bugfix, not this one.
- Introducing a shared "USD Amount + Status" field-pair component across Pool Funding and Bilateral. No such component exists today; both hand-roll it independently. A legitimate future refactor, not required to fix these two layout bugs.
- Any change to the CLARISA policy-type catalog, the `policy_type_id` clearing logic (`clearAmountWhenNotApplicable()` in Pool Funding / `onPolicyTypeChange()` in Bilateral), the Bilateral MDS (`policy-type`, `policy-stage`, `policy-institutions`), or any server/API contract — this is a client template/layout-only fix.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees one correct "USD amount" field in Pool Funding's Policy Change Info; sees USD Amount + Status directly in Bilateral's Type-Specific Detail without opening "Complete full metadata". |
| QA reviewer | Not directly affected — the review drawer (`policy-change-content`) is out of scope. |

---

## 5. User Stories

Refines `US-S2`.

- **`PCL-US-1`** — As a result submitter editing a Pool Funding Policy Change result, I want to see exactly one "USD amount" label/placeholder (not a duplicated one), so the form doesn't look broken while I'm filling it in.
- **`PCL-US-2`** — As a result submitter editing a Bilateral Policy Change result, I want USD Amount and Status to appear directly in Type-Specific Detail as soon as I pick "Program, budget or investment" — the same as Pool Funding — so I don't have to open a separate "Full Metadata" panel to enter data my own selection already requires.

---

## 6. Functional Requirements

### Required (MUST)

- **`PCL-R-1`** In Pool Funding (W1/W2) Policy Change Info, when `policy_type_id == 1`, the system MUST render exactly one "USD amount" label/description for the USD Amount field (the redundant `description` duplicate MUST be removed), and the USD Amount and Status fields MUST remain displayed side by side.
- **`PCL-R-2`** In Bilateral's Type-Specific Detail section for Policy Change, when `policy_type_id == 1`, the system MUST render the USD Amount and Status fields directly in the always-visible Type-Specific Detail area (outside the "Complete full metadata" disclosure), laid out side by side to match Pool Funding's layout.
- **`PCL-R-3`** Once USD Amount and Status are relocated, Bilateral's "Full Metadata" disclosure MUST contain only the "Is this result related to:" field.
- **`PCL-R-4`** Changing Policy Type away from "Program, budget or investment" MUST continue to clear `amount`/`status_amount` in both Pool Funding and Bilateral (existing `clearAmountWhenNotApplicable()` / `onPolicyTypeChange()` contracts, unchanged by this spec).

### Should (SHOULD)

- **`PCL-R-10`** The USD Amount + Status field pair SHOULD use the same grid/layout utility in both Pool Funding and Bilateral (Pool Funding's `grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[20px]` pattern, `policy-change-info.component.html:6`), so visual consistency holds if either section is restyled later.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | Removing the duplicate description REDUCES redundant screen-reader announcement (no regression; WCAG 2.1 AA labels per `docs/ux-ui/design.md` §10 unaffected). |
| **Internationalization** | No new user-facing strings; reuse existing field labels/placeholders already flowing through the app (no new hard-coded English). |
| **Backwards compatibility** | No API, DTO, or data-model change. Template/layout-only; `onPolicyTypeChange()` / `clearAmountWhenNotApplicable()` data contracts unchanged (`AC-4` not implicated — no bilateral/platform-report payload touched). |
| **Testability** | Each defect gets a regression test that fails before the fix and passes after (Bug Mode). |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `PCL-AC-1` | A Pool Funding Policy Change result in Editing status, Policy Change Info section open | The submitter selects "Program, budget or investment" from the Policy Type dropdown | Exactly one "USD amount" label/description renders above the currency input; USD Amount and Status remain side by side. |
| `PCL-AC-2` | A Bilateral Policy Change result, Type-Specific Detail section open | The submitter selects "Program, budget or investment" from the Policy Type dropdown | USD Amount and Status render immediately in Type-Specific Detail, side by side, with no need to click "Complete full metadata". |
| `PCL-AC-3` | The same Bilateral Policy Change result, "Program, budget or investment" selected | The submitter clicks "Complete full metadata" | Only the "Is this result related to:" field appears in the disclosure — no USD Amount, no Status. |
| `PCL-AC-4` | A Bilateral or Pool Funding Policy Change result with `policy_type_id == 1` and values entered in USD Amount/Status | The submitter changes Policy Type to a different value | `amount` / `status_amount` are cleared exactly as before this fix (unchanged behavior). |

Cross-cutting project ACs that already apply (not restated): `AC-1` (typed result integrity), `AC-9` (no secrets — not implicated by a layout-only change).

---

## 8a. Defect Classes & Verification Gates

| Defect class | Example in this spec | Gate |
|---|---|---|
| **DOM duplication** (same text rendered twice) | Bug 1 — "USD amount" rendered as both label and description | Jest DOM-query count assertion (`PCL-TEST-1`) — automated, catches it directly. |
| **Wrong-section placement** (field present/absent under the wrong toggle state) | Bug 2 — USD Amount/Status gated behind "Complete full metadata" instead of always-visible | Jest presence/absence assertion under `showAllFields()` states (`PCL-TEST-2`) + Cypress E2E exercising the real toggle (`PCL-TEST-3`) — both automated. |
| **Visual side-by-side layout** (geometry — are the two fields actually rendered in a row, not just present in the DOM) | PCL-R-10 (SHOULD) — reusing Pool Funding's grid utility in Bilateral | **No automated gate** — a DOM presence assertion does not prove geometry (jsdom cannot lay out CSS Grid). Substitute: the manual browser check recorded in each task's Definition of Done ("...side by side..."). Accepted as a human-checked step, not an automated one, because this spec reuses an already-proven grid utility class rather than authoring new layout CSS — low risk, but still recorded here rather than silently assumed. |

No defect class in this spec is left as an unacknowledged blind spot.

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `PolicyControlListService` (CLARISA `clarisa-policy-types` catalog) — read-only, unchanged.
- Shared `app-pr-input` / `app-pr-select` / `app-field-card` custom-field components — unchanged (consumed differently, not modified).

### Downstream consumers

- `cypress/e2e/bilateral-policy-change-mds.cy.ts` — currently asserts the pre-fix structure (USD Amount/Status gated behind "Complete full metadata"); must be updated to assert the new always-visible-when-type-1 behavior.
- `src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/policy-change-info.component.spec.ts` — the existing P2-3667 regression test only scans `app-pr-select` elements; extend/add coverage for the `app-pr-input` USD-amount field.
- `src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts` — `showAllFields()` / alert-ordering assertions (lines ~466-527) should be re-run after the template restructure.
- `cypress/e2e/bilateral-type-specific-section.cy.ts` — asserts the "Type-Specific Details" accordion heading/count; unaffected as long as the accordion itself is not split (it is not, per this spec's scope).

### Assumptions

- The Bilateral "Full Metadata" gate on USD Amount/Status (`body.policy_type_id == 1`, nested inside `@if (showAllFields())`) was an intentional design choice (P2-3388, cited as "AC6" in the component's own template comment and `CLAUDE.md`), not a defect in itself — this spec treats the *inconsistency with Pool Funding* as the defect to fix, and records the reversal as a deliberate, justified UX decision (see `design.md` §2.3 reversion challenge), not an oversight correction.
- Relocating USD Amount/Status out of the Full Metadata toggle does not affect the Bilateral MDS green-check tracker, because that tracker only tracks `policy-type`, `policy-stage`, `policy-institutions` (confirmed in the component's own `CLAUDE.md` "Contract" section) — USD Amount/Status were never part of it.

---

## 10. Open Questions

- **`PCL-OQ-1`** Should the QA review drawer's `policy-change-content` component receive the same consistency fix (it shares the duplicate-description defect class for Policy type/Stage, per prior commit history) in a follow-up ticket? Flagged only — not blocking this spec.

---

## 11. Out-of-Band Notes

None — single, self-contained spec; no cross-spec coordination or rollout flags needed.

---

## Required cross-references

- `docs/prd.md` — `US-S2`, `AC-1`.
- `docs/ux-ui/design.md` — §1 ("One result, many lenses"), §8 (PRMS Form UX Pattern, `RFUX-R-2`).
- `docs/trd/trd.md` — §1B `QAS-8` (Modifiability), §2 (Results / Bilateral client modules).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/CLAUDE.md`.
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md`.
