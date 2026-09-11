# Module Spec — `design.md`

## 1. Summary

This design resolves a UX contradiction by adding an informative tooltip to the "Unsubmit result" button on the client's result detail sidebar. This ensures result submitters understand they can unsubmit to make corrections before the QA process begins. The change is purely front-end and involves adding PrimeNG tooltip attributes to an existing button.

See `docs/specs/results/unsubmit-button-clarification/requirements.md`.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/...`

### 2.2 Sequence / interaction diagram

No backend interaction changes. The user hovers over the "Unsubmit result" button and sees the tooltip.

---

## 3. Data Model Changes

No changes.

---

## 4. API Surface

No changes.

---

## 5. Server Workflow / Business Rules

No changes.

---

## 6. Frontend Plan

### 6.1 Routes / modules

- Module: `ResultSectionsSidebarComponent` in the `result-detail` flow.

### 6.2 Components & services

- Modified component template: `result-sections-sidebar.component.html`.
- Modified component TS / service: `result-sections.service.ts` to expose the tooltip text. Given that we have existing tooltips managed via `sectionsSE.incompleteTooltip`, we will add a new getter `unsubmitTooltip` to `result-sections.service.ts` to keep the template clean.

### 6.3 Design system usage

- PrimeNG components used: `prTooltip` / `pTooltip`.
- The button is already wrapped in an `@if (sectionsSE.showUnsubmit)` block. We will add the `[prTooltip]="sectionsSE.unsubmitTooltip"` directive directly to the wrapper div or button, ensuring `prTooltipPosition="right"` to match existing tooltips in the sidebar.

---

## 7. Security & Authorization

No changes.

---

## 8. Performance & Capacity

No changes.

---

## 9. Observability

No changes.

---

## 10. Testing Plan (forward-looking)

- **Unit tests:** Ensure `result-sections.service.spec.ts` covers the new `unsubmitTooltip` getter if added.
- **Integration tests:** (Cypress) Verify the tooltip is present and contains the correct text when the result is submitted.

---

## 11. Backwards Compatibility & Migration Plan

N/A

---

## 12. Design Decisions (ADRs)

### `RES-DD-1` — Tooltip Location

- **Context:** Where to define the tooltip text.
- **Decision:** Define the text directly in the template or via a getter in `ResultSectionsService` to follow the pattern used for `incompleteTooltip`.
- **Alternatives considered:** Hardcoding in HTML. Since `incompleteTooltip` uses a service getter, we will define `unsubmitTooltip` in the service for consistency.
- **Consequences:** Keeps template clean.

---

## 13. Open Gaps & Follow-ups

None.

---

## Required cross-references

- `docs/specs/results/unsubmit-button-clarification/requirements.md`
- `docs/ux-ui/design.md`
