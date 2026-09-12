# Module Spec — `requirements.md`

## 1. Module / Feature

- **Module:** `results`
- **Sub-feature (if any):** `unsubmit-button-clarification`
- **Owner:** `UX/UI Team / Developer`
- **Status:** `shipped`
- **Ticket(s):** TBD

---

## 2. Context

Currently, there is a contradiction in the UX for submitting results. When a result is in "SUBMITTED" status, the UI presents an "Unsubmit result" button on the sidebar. However, the submission confirmation dialog states: "Please note that further changes to this result can only be made during the QA process."

This creates confusion among result submitters regarding what actions are actually permitted after submission. The disclaimer implies the result is locked until QA, while the button implies the user can revert the submission freely.

This spec addresses the confusion by keeping the "Unsubmit result" button but adding an informative tooltip that explains when and why a user might need to unsubmit (e.g., "Use this only if you need to make corrections before QA begins").

Reference: `docs/prd.md`

---

## 3. In Scope / Out of Scope

### In scope

- Adding an informative tooltip/helper text to the "Unsubmit result" button in the result detail sidebar.
- Ensuring the tooltip appears on hover and clarifies the purpose of the action.

### Out of scope

- Modifying the underlying logic or backend state transitions of the submission/unsubmission process.
- Changing the submission confirmation disclaimer (as agreed upon, we are keeping the disclaimer as is and resolving the UX contradiction by adding the tooltip to the button).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | They will see an informative tooltip when hovering over the "Unsubmit result" button, clarifying when it should be used. |

---

## 5. User Stories

- **`RES-US-1`** — As a result submitter, I want to see a clear explanation of what the "Unsubmit result" button does, so that I understand my ability to make corrections before the QA process begins.

---

## 6. Functional Requirements

### Required (MUST)

- **`RES-R-1`** The system MUST display an informative tooltip over the "Unsubmit result" button on the result detail sidebar.
- **`RES-R-2`** The tooltip text MUST read: "Use this only if you need to make corrections before QA begins."

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | The tooltip MUST be accessible via screen readers and keyboard navigation per `docs/ux-ui/design.md` §10. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RES-AC-1` | A result with `status_id=3` (Submitted) is viewed by a submitter | The submitter hovers over the "Unsubmit result" button | A tooltip appears saying "Use this only if you need to make corrections before QA begins." |

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `PrimeNG` tooltip module (`prTooltip`) is available for use on the button.

### Downstream consumers

- None.

### Assumptions

- The text "Use this only if you need to make corrections before QA begins." is fully approved by the product owner.

---

## 10. Open Questions

None.

---

## 11. Out-of-Band Notes

None.

---

## Required cross-references

- `docs/prd.md`
- `docs/ux-ui/design.md`
