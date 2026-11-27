# Execution log: `changes/qa-impact-area-filter`

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/qa-impact-area-filter` (Lite) |
| Branch | `feature/qa-impact-area-filter` from `qa-development-2026-ss` @ `c12bb4d29` |
| Executor | Claude Opus 5.5 (single agent, Lite) |
| Ticket | P2-4108 |

## `IAF-T-1`: PASS (attempt 1, 2026-11-26)

- **Changes:**
  - Five closed lists `impact_area_components_<area>` with the seeded ids (`IAF-DD-1`).
  - `filter: { is_active: true }` on the shared binding (`IAF-DD-2`).
  - Revision 37 → 38; snapshot regenerated (`npm run qa-catalog:snapshot`); version pins in `qa-catalog.shape.spec.ts`, `qa-catalog.service.spec.ts`, `qa-catalog.controller.spec.ts`.
  - `qa-catalog.en.md`: revision heading and examples 2026.38, the five label-table rows, gap 19 removed (other numbers kept), change-log row v1.38.
- **Evidence:**
  - First full run after the bump: only the three version pins failed (37 vs 38); nothing else moved.
  - Mutation (a), closed lists removed: `Tests: 5 failed, 1 passed`.
  - Mutation (b), `is_active` filter removed: only "a deselected (inactive) score row is not read" failed.
  - Final: `npx jest src/api/qa-catalog` → 55 suites, 1311 tests passed; `npx eslint src/api/qa-catalog --quiet` clean; `tsc --noEmit` no errors in `qa-catalog`.
- **Live check:** before/after of `POST /api/qa/results/details` on prtest, recorded in the ticket once deployed.
- **Review:** Reviewer `opus` (T3, independent), 2026-11-26: **PASS**. Advisories applied in the same attempt: the stale comment on `IMPACT_COMPONENT` (`values/label-sources.ts`) now says the lists are closed per area, and the client file is cited with its package path. Advisory kept open: confirm `SELECT id, impact_area FROM impact_areas_scores_components` on prod before release (prtest is covered by the live check); if the ids differed, those fields would return `[]`.
- **Re-run after the advisories:** one run reported 1 failed test, which `--silent` hid and which did not reproduce; the next two runs passed 1311/1311.
