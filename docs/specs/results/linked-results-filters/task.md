# Module Spec — `task.md` Template

## 1. Scope of this task list

- **Module / feature:** `results/linked-results-filters`
- **Linked spec:** `docs/specs/results/linked-results-filters/requirements.md` + `docs/specs/results/linked-results-filters/design.md`.
- **Sprint / target phase:** Next release
- **Owner / driver:** Platform Dev Team
- **Status:** `not-started`

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` are all resolved.
- [x] CLARISA dependencies (cache tables, endpoints) confirmed (none).
- [x] No conflicting in-flight spec touching the same entities.
- [x] Migration name and reversibility confirmed (none).

---

## 3. Task list

### `RES-T-LRF-1` — Update getResultsForInnovUse repository query

- **Type:** `server`
- **Description:** Modify `ResultRepository.getResultsForInnovUse()` to remove the hardcoded `Reporting 2025` phase restriction, and add a check for `status_id IN (2, 6)`. Ensure both sides of the `UNION ALL` apply this. Include `r.source` and `r.status_id` in the `SELECT` clause.
- **Implements:** `RES-R-3`
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts`
- **Depends on:** `—`
- **Blocks:** `RES-T-LRF-2`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Code merged via the project commit convention.
  - [x] Lint + format clean.
  - [x] Unit tests updated; coverage thresholds met.
  - [x] No secret or token leaked in logs or messages.

### `RES-T-LRF-2` — Implement client-side filtering logic in components

- **Type:** `client`
- **Description:** Introduce local state in `rd-contributors-and-partners.component.ts` for selected typologies and funding sources. Implement a getter `filteredLinkedResults` that filters `innovationUseResultsSE.resultsList` based on these selections. Determine funding source by checking `source === 'Result'` (W1/W2) vs `source === 'API'` (W3/Bilateral).
- **Implements:** `RES-R-1`, `RES-R-2`, `RES-R-4`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`
- **Depends on:** `RES-T-LRF-1`
- **Blocks:** `RES-T-LRF-3`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Code merged via the project commit convention.
  - [x] Lint + format clean.
  - [x] Unit tests updated for component filtering logic.

### `RES-T-LRF-3` — Render UI filters in Contributors & Partners

- **Type:** `client`
- **Description:** Add two `app-pr-multi-select` components to `rd-contributors-and-partners.component.html` for Typology and Funding Source, placed just above the existing Linked Results dropdown. Bind the existing Linked Results dropdown's `[options]` to `filteredLinkedResults`.
- **Implements:** `RES-R-1`, `RES-R-2`, `RES-AC-LRF-1`, `RES-AC-LRF-2`, `RES-AC-LRF-3`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`
- **Depends on:** `RES-T-LRF-2`
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Code merged via the project commit convention.
  - [x] Lint + format clean.
  - [x] UI tested and visually aligns with PrimeNG / `reportingTheme` patterns.

---

## 4. Dependency graph

```text
RES-T-LRF-1 (server query update)
   └── RES-T-LRF-2 (client logic)
         └── RES-T-LRF-3 (client UI)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RES-TEST-LRF-1` | unit (server) | `RES-R-3` | `onecgiar-pr-server/src/api/results/result.repository.spec.ts` |
| `RES-TEST-LRF-2` | unit (client) | `RES-R-1`, `RES-R-2`, `RES-R-4` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts` |

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on staging per the `requirements.md` happy paths.
- [ ] Telemetry verified post-deploy.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped`.

---

## 8. Roll-back plan

1. Revert PRs for frontend and backend.
2. Deploy the reverted code to restore the previous endpoint behaviour (hardcoded phase year 2025).

---

## Required cross-references

- `docs/specs/results/linked-results-filters/requirements.md`
- `docs/specs/results/linked-results-filters/design.md`
- `docs/prd.md`
- `docs/ux-ui/design.md`
- `docs/trd/trd.md`
