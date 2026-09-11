# Module Spec — `requirements.md` Template

## 1. Module / Feature

- **Module:** `results`
- **Sub-feature:** `linked-results-filters`
- **Owner:** Platform Dev Team
- **Status:** `draft`
- **Ticket(s):** TBD

---

## 2. Context

The "Please select a result" dropdown, shown when answering "Yes" to "Is this result linked or bundled with another CGIAR-reported result?" can become very long and difficult to navigate. Users currently lack a way to narrow down the list by key dimensions such as the result typology (e.g., Innovation, Policy change) or the funding source (W1/W2 vs W3/Bilateral). 

Furthermore, the existing list is not clearly defined in terms of lifecycle completeness. It must be ensured that all previously reported results that have been QA'd and approved (from any reporting cycle) are included in this selectable list.

Reference: `docs/prd.md`

---

## 3. In Scope / Out of Scope

### In scope

- Adding a "Result typology" filter (e.g., Innovation, Policy change, Capacity development) to the linked results selector.
- Adding a "Funding source" filter (W1/W2 vs W3/Bilateral) to the linked results selector.
- Modifying the underlying data fetch to guarantee that all QA'd and Approved results from previous reporting cycles are included.
- Ensuring the existing text search functionality stacks and works alongside the new filters.

### Out of scope

- Changes to the core save mechanism of linked results (`has_innovation_link`, `linked_results`).
- Modifying the P25 `QA'd Innovation Development` specific dropdown logic, unless necessary for parity.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Can easily find past results using typology and funding source filters, saving time and improving data linkage quality. |
| QA reviewer | Can trust that the options presented to submitters are strictly QA'd and Approved results. |

---

## 5. User Stories

- **`RES-US-LRF-1`** — As a Result submitter, I want to filter the linked results dropdown by result typology and funding source, so that I can quickly find the exact result I need to link.
- **`RES-US-LRF-2`** — As a Result submitter, I want to see all QA'd and Approved results from previous cycles in the dropdown, so that I am not artificially limited to the current phase when linking results.

---

## 6. Functional Requirements

### Required (MUST)

- **`RES-R-1`** The system MUST provide a UI filter for "Result typology" allowing multiple selections (Innovation, Policy change, etc.).
- **`RES-R-2`** The system MUST provide a UI filter for "Funding source" allowing multiple selections (W1/W2, W3/Bilateral).
- **`RES-R-3`** The system MUST fetch and display all results that have a status of QA'd (2) or Approved (6), regardless of the phase year they were reported in.
- **`RES-R-4`** When multiple filters are applied (typology + funding source + text search), the system MUST apply an intersection (AND) logic across the categories.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | The expanded result list (all past QA'd/Approved results) MUST load within the existing SLO. If the list is too large, the frontend filtering SHOULD remain responsive or pivot to server-side search. |
| **Backwards compatibility** | The save payload for linked results MUST NOT change. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RES-AC-LRF-1` | A submitter is on the Contributors & Partners section | They view the "Please select a result" dropdown | A filter for "Result typology" is available and functioning. |
| `RES-AC-LRF-2` | A submitter is on the Contributors & Partners section | They view the "Please select a result" dropdown | A filter for "Funding source" is available and functioning. |
| `RES-AC-LRF-3` | The submitter selects "Policy change" and "W1/W2" | They open the dropdown | Only W1/W2 Policy change results are listed. |
| `RES-AC-LRF-4` | A result from a previous phase (e.g., 2023) is QA'd | The submitter opens the dropdown | The 2023 result appears in the list. |

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- Requires the `getResultsForInnovUse` repository method (or equivalent) to surface the `source` field (to distinguish W1/W2 vs W3/Bilateral) and `status_id`.

### Assumptions

- Client-side filtering is performant enough for the volume of QA'd/Approved results across all cycles.

---

## 10. Open Questions

- `RES-OQ-1` What are the exact `status_id` values to include? Assumed `2` (QA'd) and `6` (Approved). Should `3` (Submitted) be included?
- `RES-OQ-2` Does the existing grouping by Result Type in the PrimeNG dropdown need to be maintained when filters are active, or should it flatten?

---

## Required cross-references

- `docs/prd.md`
- `docs/ux-ui/design.md`
- `docs/trd/trd.md`
