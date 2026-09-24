# Design — Approved W3 bilateral opens the bilateral center page

## 1. Summary

Change one branch of the shared classifier `classifyBilateralOpenRoute` so Approved W3 rows with a lead center resolve to `center-editor`. All three entry surfaces already call the resolver, so no caller logic changes. Trade-off accepted: programme-side users also land on the bilateral page for Approved rows. Requirements: `requirements.md` (same folder).

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| `BAO-P-1` | Approved is the only reason Approved rows reach Result Detail | `bilateral-result-open-route.util.ts:67` | Read: `!isW3BilateralRow \|\| AVISA \|\| statusName === 'Approved'` → `result-detail` | `verified` | Extra branch to remove |
| `BAO-P-2` | Results Center, Programme Results and search all use the shared resolver | Grep `resolveBilateralResultOpenRoute` | 3 call sites: `results-list:844`, `programme-results:1516`, `global-search-palette:214` | `verified` | Add the missing caller to tasks |
| `BAO-P-3` | The `/bilateral/:acronym` shell does not gate by membership | `bilateral.component.ts` `resolveCenter` | Read: non-member falls to CLARISA catalog lookup, no redirect | `verified` | Non-center users would be bounced; need per-surface handling |
| `BAO-P-4` | Server GET has no role gate and resolves by `result_code + version_id + is_active` | `results.controller.ts:932`, `results.service.ts:3754-3777` | Read | `verified` | Would need a server change |
| `BAO-P-5` | Approved status id is 6 for bilateral rows | Comment in `bilateral-creation.service.ts:66-68` | Comment only, no DB row | `assumed` | Name fallback (`BAO-R-6`) still routes correctly; fix the id constant |
| `BAO-P-6` | Editor renders an Approved closed-phase result read-only without errors | Editor code reading only | Not run in browser | `assumed` | Extra fix task in the editor; re-specify |
| `BAO-P-7` | Palette/list rows carry `leadCenter` (acronym) for Approved rows | Row mappers | `results-list` uses `lead_center`; palette passes `row.leadCenter` | `assumed` | Rows without it fall back to Result Detail (`BAO-R-3`), so the bug persists for those |

`BAO-P-5`, `BAO-P-6`, `BAO-P-7` are also in §13.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server:** none.
- **Client:** `shared/routing/bilateral-result-open-route.util.ts` (+ spec); callers listed in `BAO-P-2`.

### 2.2 Sequence

```
row click / link / palette Enter
  └── resolveBilateralResultOpenRoute(input)
        └── classifyBilateralOpenRoute
              ├── not W3 | AVISA                      → result-detail
              ├── Approved + leadCenter               → center-editor   (NEW)
              ├── Approved, no leadCenter             → result-detail
              ├── Editing/Draft + leadCenter          → center-editor
              ├── Editing/Draft, no leadCenter        → result-detail
              └── else                                → review-drawer
```

## 3. Data Model Changes

None.

## 4. API Surface

None. Existing `GET /api/results/bilateral/:resultId?versionId=`.

## 5. Server Workflow / Business Rules

None.

## 6. Frontend Plan

New classifier order (pseudo-code):

```ts
export const APPROVED_STATUS_ID = 6;

export function isApprovedStatus({ statusId, statusName }) {
  const id = statusId != null && statusId !== '' ? Number(statusId) : NaN;
  if (!Number.isNaN(id)) return id === APPROVED_STATUS_ID;
  return (statusName ?? '') === 'Approved';
}

classify(input) {
  if (!isW3BilateralRow(input) || isW3BilateralsAvisa(input)) return 'result-detail';
  const lead = (input.leadCenter ?? '').trim();
  if (isApprovedStatus(input)) return lead ? 'center-editor' : 'result-detail';
  if (isBilateralCenterEditorStatus(input)) return lead ? 'center-editor' : 'result-detail';
  return 'review-drawer';
}
```

`resolveBilateralResultOpenRoute` already builds `['/bilateral', leadCenter, 'result', code]` with `{ phase: versionId }` for `center-editor`; no change there. `isW3BilateralForUpdate` keeps its own `statusName !== 'Approved'` check (carry-forward eligibility is a different question) and is not touched.

Caller notes:

- `programme-results.openResult` goes through `usesBilateralReviewFlow` (false for Approved) then `smartNav.rememberResultDetailOrigin()`; check in `BAO-T-2` that this remembered origin is harmless for the bilateral route (the Editing lane already takes this path).
- `results-list.onResultLinkClick` only preloads the drawer for review-drawer rows; Approved does not.
- Update the stale comments that say "Approved opens Result Detail" (`results-list.component.ts` ~468, `programme-results.component.ts` ~1508 doc block).

## 7. Security & Authorization

No new access. Result reads keep the existing behavior; writes stay blocked by `isEditableByCenterUser()` (Editing + Center User of lead center) and `autoSaveService.setReadOnly()`. No secrets logged.

## 8. Performance & Capacity

None.

## 9. Observability

None.

## 10. Testing Plan (forward-looking)

- Update `bilateral-result-open-route.util.spec.ts`: replace "routes Approved and AVISA W3 to Result Detail" with separate Approved (center editor, id-only and name-only) and AVISA (result-detail) cases; add Approved-without-lead-center and non-W3-Approved cases.
- Caller specs (results-list, programme-results, global-search-palette): assert Approved W3 URL and no drawer side effect.
- Browser check on a real Approved closed-phase row.

## 11. Backwards Compatibility & Migration Plan

Client-only. Old Result Detail deep links still work. No migration.

## 12. Design Decisions (ADRs)

- **`BAO-DD-1`** Change the shared classifier, not each caller. Rationale: user wants the same view on every surface; one rule cannot drift. Alternative rejected: audience-aware routing (extra plumbing, user declined).
- **`BAO-DD-2`** Keep the no-lead-center fallback to Result Detail. Rationale: the center route needs an acronym; consistent with the Editing rule.
- **`BAO-DD-3`** Phase is the row's `version_id`, never hard-coded. Rationale: server resolves only existing `code + version` rows.

## 13. Open Gaps & Follow-ups

- `BAO-P-5`, `BAO-P-6`, `BAO-P-7` are verified in `BAO-T-3`.
- Follow-up (not in this spec): Approved results carried into a later phase (e.g. phase 8) are a versioning question.

## Required cross-references

`requirements.md` (same folder), `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
