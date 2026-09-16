# Design — W3 bilateral in Editing opens center editor, not review drawer

## 1. Summary

Add a **shared open-route resolver** that classifies a list row into three destinations (center editor · review drawer · Result Detail) and wire it into `programme-results.component.ts` and `results-list.component.ts`. Editing W3 rows take the center-editor branch; the review-drawer branch narrows to non-Editing in-review statuses. No server, schema, or payload change.

- **Depth:** Lite · **Mode:** Bug
- **Requirements:** `BIL-R-1` … `BIL-R-6`
- **Touches:** `onecgiar-pr-client` only

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Path | Change |
|---|---|---|
| Shared util (new) | `src/app/shared/routing/bilateral-result-open-route.util.ts` | Pure functions: classify row + build `commands` / `queryParams` |
| Shared util spec (new) | `…/bilateral-result-open-route.util.spec.ts` | Table-driven routing matrix |
| Programme Results | `pages/result-framework-reporting/pages/programme-results/programme-results.component.ts` | Replace inline `usesBilateralReviewFlow` / `resultRoute` branching |
| Results Center | `pages/results/pages/results-outlet/pages/results-list/results-list.component.ts` | Same |
| Specs | `programme-results.component.spec.ts`, `results-list.component.spec.ts` | Regression + guard existing review tests |

**Unchanged:** `bilateral-results-list.component.ts` (already routes to center editor), review drawer components, `BilateralResultsService` review APIs.

### 2.2 Sequence — open result (after fix)

```
User clicks row (Programme Results | Results Center)
  └── resolveBilateralResultOpenRoute(row)
        ├─ W3 + Editing (+ Draft?) + lead_center → ['/bilateral', acronym, 'result', code], { phase }
        │     └── router.navigate → NO review drawer signals
        ├─ W3 + in-review (not AVISA, not Approved, not Editing) → bilateral-review deep link
        │     └── router.navigate → set currentResultToReview + showReviewDrawer
        └─ else → Result Detail + ?phase=
```

## 3. Data Model Changes

None.

## 4. API Surface

None.

## 5. Shared Routing Contract

### 5.1 Input shape (minimal)

The util accepts a normalized slice both list types can supply:

| Field | Programme Results | Results Center |
|---|---|---|
| Origin / source | `row.origin` | `result.source_name` |
| Status id | `row.statusId` | `result.status_id` |
| Status name | `row.statusName` | `result.status_name` |
| Lead center acronym | `row.center` | `result.lead_center` |
| Result code | `row.code` | `result.result_code` |
| Version / phase | `row.versionId` | `result.version_id` |
| Submitter SP code | `row.submitterCode` | `result.submitter` or `initiative_official_code` |
| Internal id | `row.id` | `result.id` |

### 5.2 Classification rules

| Predicate | Rule |
|---|---|
| `isW3Bilateral` | `origin/source === 'W3/Bilaterals'` |
| `isAvisa` | submitter in `SGP-02`, `SGP02` (existing parity) |
| `isEditingOrDraft` | `statusId === 1` or `8`, OR `statusName` in `Editing`, `Draft` |
| `opensCenterEditor` | `isW3 && !isAvisa && isEditingOrDraft && leadCenter` truthy |
| `opensReviewDrawer` | `isW3 && !isAvisa && statusName !== 'Approved' && !isEditingOrDraft` |
| `opensResultDetail` | everything else |

When `opensCenterEditor` but `leadCenter` is missing → **Result Detail fallback** (`BIL-R-5` scenario).

Review drawer route keeps today's query param constants (`REVIEW_RESULT_QUERY_PARAM`, `REVIEW_RESULT_ID_QUERY_PARAM`) and programme code fallback chain.

### 5.3 Update eligibility (separate from open route)

`canUpdateResult` in programme-results MUST NOT key off `opensReviewDrawer`. Keep a dedicated **`isW3BilateralForUpdate`** predicate: W3 + not AVISA + not Approved — same boolean union as today's `usesBilateralReviewFlow` **before** this fix, so carry-forward menu rules do not move when open routing fixes (`BIL-R-5`, defect class D6).

## 6. Frontend Plan

- Import util in both list components; delete duplicated `usesBilateralReviewFlow` bodies (or thin-wrap for tests).
- `openResult` / `navigateToResult`: only set review-drawer signals when classification is `opensReviewDrawer`.
- Center-editor branch: plain `router.navigate` — no `rememberResultDetailOrigin` (bilateral editor has its own Smart Back contract).
- `resultRoute` / `getResultRoute` / `resultLink` / `copyLink`: all call the same resolver.
- Cache key in results-list `getResultRoute` must include status + lead_center so Editing W3 does not reuse a cached review URL.

## 7. Security & Authorization

Routing-only change. Server guards on save/submit unchanged.

## 8. Testing Plan

| Test | Proves | Fails when |
|---|---|---|
| Util matrix: Editing W3 + AfricaRice | `BIL-R-1`, D1 | Returns review URL |
| Util matrix: Submitted W3 | `BIL-R-2`, D2 | Returns center editor URL |
| Util matrix: Approved / AVISA | `BIL-R-3`, D3 | Not Result Detail |
| Util: missing lead_center | Fallback scenario | `/bilateral//result/` |
| `programme-results`: `openResult` Editing W3 | Drawer not mounted | `showReviewDrawer.set` called |
| `programme-results`: `copyLink` Editing W3 | `BIL-R-4`, D5 | URL contains `bilateral-review` |
| `results-list`: `getResultLink` Editing W3 | D4 parity | Differs from util |
| Existing review-drawer tests (Submitted W3) | `BIL-AC-6` | Assertions edited to pass |

**Regression entry condition:** `BIL-AC-5` — new Editing W3 tests **fail on current code** before T-2.

## 9. Design Decisions

### `BIL-DD-1` — Shared util over duplicated predicates

**Chosen:** one pure module in `shared/routing/` consumed by both lists.

**Rejected:** patch `usesBilateralReviewFlow` only — fixes drawer but leaves no center-editor route; two files still drift.

### `BIL-DD-2` — Status keyed on `statusId` with `statusName` mirror

Prefer numeric id (`1`, `8`) from list payloads; mirror string for defensive tests. Matches `BILATERAL_STATUS` in `bilateral-creation.service.ts`.

### `BIL-DD-3` — Separate update predicate from open-route predicate

Narrowing `usesBilateralReviewFlow` without splitting would move Editing W3 onto `shouldShowUpdate` in `canUpdateResult`. A dedicated `isW3BilateralForUpdate` preserves today's update menu semantics (`BIL-R-5`).

**Reversion challenge:** None — this adds a branch; it does not remove shipped behavior except the incorrect review-drawer open for Editing.

## 10. Budget (Step 2.4 tripwire)

| Metric | Expected |
|---|---|
| Tasks | 2 |
| LOC | ~100 (≈40 production, ≈60 tests) |
| Review rounds | 1 |

Lite depth confirmed. `/akili-execute` escalates if actuals exceed budget.

## 11. Open Gaps

| ID | Item |
|---|---|
| `BIL-OQ-1` | Draft routing — implement with Editing unless user rejects at execute gate |
| `BIL-OQ-3` | Bilateral review tab — separate ticket if needed |

## Required cross-references

- `./proposal.md`, `./requirements.md`
- `docs/prd.md` — `US-S1`, `AC-3`
- `archive/2026-09-08-changes--sp-bilateral-review-tab` — review drawer deep-link contract
