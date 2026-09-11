# Module Spec — `design.md` Template

## 1. Summary

This design accomplishes the addition of "Result typology" and "Funding source" filters to the "Please select a result" dropdown in the Contributors & Partners section, and ensures the list of results includes all QA'd and Approved results from past phases.
The solution modifies the backend repository query to widen the scope and fetch required fields, and updates the frontend component to render the filters and perform local client-side filtering on the fetched results list.

Link to requirements: `docs/specs/results/linked-results-filters/requirements.md`

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/results/result.repository.ts`, `api/results/CLAUDE.md`.
- **Client modules touched:** `pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`, `rd-contributors-and-partners.component.html`, `shared/services/global/innovation-use-results.service.ts`.

### 2.2 Sequence / interaction diagram

```text
[Submitter UI] -> [Contributors & Partners Component]
  └── Loads page, injecting InnovationUseResultsService
        └── InnovationUseResultsService calls GET_innovationUseResults()
              └── [Results Controller] -> [Results Service] -> [Result Repository]
                    ├── Executes getResultsForInnovUse()
                    ├── Returns all Results with status_id IN (2, 6) across all phases
                    ├── Includes r.source and r.result_type_id
                    └── Returns 200 OK
        └── Client stores the full array in resultsList
        └── [Submitter UI] renders Typology & Funding Source filters
        └── User interacts with filters
        └── Component computes a derived `filteredResultsList` locally
        └── Dropdown uses `filteredResultsList` for display
```

---

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `Result` | `api/results/entities/result.entity.ts` | No change. |

### 3.2 Migrations

- No migration is necessary as this only changes an existing `SELECT` query.

### 3.3 CLARISA / external-data implications

- No impact.

---

## 4. API Surface

### 4.1 New / changed endpoints

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results/get/innov-use-linked-results` |
| **Version** | `v2` |
| **Response DTO** | No formal DTO class exists for this endpoint's response, but the JSON schema changes to add `source` and `status_id`. |
| **Errors** | Existing 500 error mapping remains. |

**Sample Output Changes:**
```json
{
  "id": 123,
  "acronym": "INIT",
  "phase_year": 2023,
  "result_code": 456,
  "name": "Policy change",
  "title": "Example policy",
  "source": "Result", // NEW field
  "status_id": 2 // NEW field
}
```

### 4.2 Bilateral / platform-report impact

- No impact on payloads.

---

## 5. Server Workflow / Business Rules

The primary change is in `ResultRepository.getResultsForInnovUse()`:
- **Current state**: Hardcodes `v.phase_name = 'Reporting 2025'` and has no check on `r.status_id`.
- **New state**:
  - Remove `v.phase_name = 'Reporting 2025'`.
  - Add `AND r.status_id IN (2, 6)` to only return QA Assessed and Approved results.
  - Add `r.source` and `r.status_id` to the `SELECT` clause so the frontend can compute the Funding Source filter. `SourceEnum.Result` implies W1/W2, `SourceEnum.Bilateral` ('API') implies W3/Bilateral.

---

## 6. Frontend Plan

### 6.1 Routes / modules

- No routing changes.

### 6.2 Components & services

- **`innovation-use-results.service.ts`**:
  - Expose a `filteredResultsList` signal or observable alongside the raw `resultsList`.
  - Or, let the component handle the derived state if the filters are local to the `rd-contributors-and-partners` component. The component handles it best since the filters only appear there.
- **`rd-contributors-and-partners.component.ts`**:
  - Add `selectedTypologies: number[] = [];` and `selectedFundingSources: string[] = [];`.
  - Create a method to compute `availableTypologies` (from unique `result_type_id`/`name`) and `availableFundingSources` (from unique `source`).
  - Create a method `get filteredLinkedResults()` that applies the selected filters to `innovationUseResultsSE.resultsList`.
- **`rd-contributors-and-partners.component.html`**:
  - Render two `app-pr-multi-select` components before the "Please select a result" dropdown.
  - Bind the "Please select a result" dropdown `[options]` to `filteredLinkedResults`.

### 6.3 Design system usage

- Use `app-pr-multi-select` for the new filters, ensuring they fit within the existing spacing (`segment_title_margin`).

### 6.4 Real-time / notification UX

- No changes.

---

## 7. Security & Authorization

- The `GET` endpoint remains under JWT authentication.
- No PII is exposed.
- No secret handling changes.

---

## 8. Performance & Capacity

- Widening the query to all phases will increase the result set size. Given that we filter by `status_id IN (2, 6)`, the number of results is bounded by the total historical submissions.
- Expected row count is in the low thousands. Client-side memory and rendering (with PrimeNG's virtual scroll if needed) should handle this gracefully.
- The `UNION ALL` query in `getResultsForInnovUse` currently fetches a specific subset. We must ensure the `UNION` structure remains valid and both branches apply the `status_id` filter.

---

## 9. Observability

- No changes needed beyond existing error logs.

---

## 10. Testing Plan (forward-looking)

- **Unit tests (server)**: `result.spec.ts` (if any tests mock `getResultsForInnovUse()`, they may need to assert the new `status_id` behavior or return shape).
- **Unit tests (client)**: `rd-contributors-and-partners.component.spec.ts` needs tests to verify the computed `filteredLinkedResults` filters correctly based on the selected criteria.
- **Coverage**: The component and repository coverage must be maintained.

---

## 11. Backwards Compatibility & Migration Plan

- The API is strictly additive in the fields returned.
- Frontend components relying on `GET_innovationUseResults()` (e.g., Bilateral creation surfaces if any) will now see results from past phases. This is intended by the business.

---

## 12. Design Decisions (ADRs)

### `RES-DD-LRF-1` — Client-side filtering vs Server-side filtering

- **Context:** The dropdown lists all QA'd/Approved results.
- **Decision:** Use client-side filtering.
- **Alternatives considered:** Server-side pagination with query params. Rejected because the existing UX uses a PrimeNG dropdown with a built-in local search, and rewriting it to use an autocomplete/lazy-load paradigm would be disproportionate effort for the expected payload size.
- **Consequences:** The initial payload size is larger, but UX is faster once loaded.

---

## 13. Open Gaps & Follow-ups

- None identified.

---

## Required cross-references

- `docs/specs/results/linked-results-filters/requirements.md`
- `docs/prd.md`
- `docs/ux-ui/design.md`
- `docs/trd/trd.md`
