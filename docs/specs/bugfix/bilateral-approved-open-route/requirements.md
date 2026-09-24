# Requirements — Approved W3 bilateral opens the bilateral center page

## 1. Module / Feature

- **Module:** bilateral (client routing)
- **Sub-feature:** open-route for Approved W3/Bilateral results
- **Owner:** Santiago Sanchez
- **Status:** approved (proposal approved 2026-09-24; Lite spec, Bug Mode)
- **Ticket(s):** none
- **Proposal:** `proposal.md` (same folder)

## 2. Context

Opening an Approved W3/Bilateral result lands on Result Detail (`/result/result-detail/{code}/general-information?phase=`) because `classifyBilateralOpenRoute` sends `Approved` to `result-detail` (`bilateral-result-open-route.util.ts:67`). The user wants every bilateral result, including Approved, to open the bilateral center page `/bilateral/{center}/result/{code}?phase={phase}`. The `phase` is the result's `version_id`; the server resolves `result_code + version_id` and answers 404 for a phase where no active row exists (`results.service.ts:3754-3777`), which is why a hand-typed `phase=8` for a phase-6 result fails.

Surfaces sharing the rule: Results Center list, Programme Results, global search palette (all call `resolveBilateralResultOpenRoute`). Refines the routing introduced in `archive/2026-09-15-bugfix--bilateral-w3-editing-route`. PRD: `AC-5` (phase correctness), `AC-3` (authorization unchanged). Screens: `docs/ux-ui/design.md` bilateral center editor (read-only state). TRD: bilateral module, `GET /api/results/bilateral/:resultId?versionId=`.

## 3. In Scope / Out of Scope

### In scope

- Classifier change so Approved, non-AVISA W3 rows with a lead center open the center editor.
- Same behavior from Results Center, Programme Results and global search.
- Unit-test updates for the classifier and the three callers.
- Browser verification that the editor renders an Approved closed-phase result read-only.

### Out of scope

- Server or `/api/bilateral/*` changes.
- AVISA (`SGP-02`) routing, review-drawer lane, Editing/Draft rule.
- Creating or redirecting between phase copies of a result (versioning).
- "Update result" / carry-forward eligibility (`isW3BilateralForUpdate`).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Center user / result submitter | Approved bilateral opens in the bilateral editor (read-only), same as other bilateral rows |
| Programme lead / PMU | Approved bilateral from Programme Results or search opens the same bilateral page instead of Result Detail |
| Platform admin | Same |

## 5. User Stories

- **`BAO-US-1`** — As a user opening an Approved bilateral result from any list or search, I want to land on `/bilateral/{center}/result/{code}?phase={phase}`, so that I see the same view as every other bilateral result.

## 6. Functional Requirements

### Required (MUST)

- **`BAO-R-1`** For a W3/Bilaterals row, not AVISA, with status Approved and a non-empty lead center, the open route MUST be `['/bilateral', leadCenter, 'result', resultCode]` with query param `phase = versionId`.
- **`BAO-R-2`** The same route MUST be produced from Results Center, Programme Results and the global search palette (single shared classifier, no per-surface branch).
- **`BAO-R-3`** An Approved W3 row with an empty lead center MUST keep opening Result Detail (same fallback as Editing).
- **`BAO-R-4`** AVISA (`SGP-02` / `SGP02`) and non-W3 rows MUST keep opening Result Detail, including when Approved.
- **`BAO-R-5`** Editing/Draft → center editor and Pending/Rejected → review drawer MUST be unchanged.
- **`BAO-R-6`** Approved detection MUST accept `statusId = 6` or, when no id is present, `statusName = 'Approved'` (same id-first pattern as `isBilateralCenterEditorStatus`).
- **`BAO-R-7`** Opening an Approved result MUST NOT set `currentResultToReview` or open the review drawer.
- **`BAO-R-8`** The phase MUST come from the row's `version_id`; no hard-coded phase.

### Should (SHOULD)

- **`BAO-R-10`** The center page SHOULD render the Approved result read-only for users who are not Center Users of the lead center, with no error state.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Security | No new endpoint; existing GET and PATCH gates unchanged. Read-only via `isEditableByCenterUser()` prevents writes. |
| Backwards compatibility | Existing Result Detail deep links (`/result/result-detail/...`) keep working. |
| Internationalization | No new strings. |
| Accessibility | No UI change. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BAO-AC-1` | W3 row, Approved, lead center `CIMMYT`, code `28728`, version `6` | Classifier/resolver runs | `kind = center-editor`, commands `['/bilateral','CIMMYT','result',28728]`, `queryParams {phase: 6}` |
| `BAO-AC-2` | Same row with `statusId 6` and no `statusName` | Resolver runs | Same result as AC-1 |
| `BAO-AC-3` | Approved W3 row with empty lead center | Resolver runs | `kind = result-detail` |
| `BAO-AC-4` | Approved W3 row from `SGP-02` | Resolver runs | `kind = result-detail` |
| `BAO-AC-5` | Approved non-W3 row | Resolver runs | `kind = result-detail` |
| `BAO-AC-6` | Editing, Draft, Submitted rows | Resolver runs | Unchanged: center-editor, center-editor, review-drawer |
| `BAO-AC-7` | Approved W3 row in the global search palette | User activates it | Router navigates to the `BAO-AC-1` URL |
| `BAO-AC-8` | Approved W3 row in Programme Results | User opens it | Navigates to the `BAO-AC-1` URL; review drawer stays closed |
| `BAO-AC-9` | Results Center Approved W3 row | Row link rendered | `href` is the `BAO-AC-1` URL |
| `BAO-AC-10` | Browser, Approved closed-phase result | `/bilateral/CIMMYT/result/28728?phase=6` opened | Page loads, form read-only, no "couldn't load" state |

Cross-cutting ACs referenced: `AC-3`, `AC-5`.

## 9. Dependencies & Assumptions

### Upstream dependencies

- `GET /api/results/bilateral/:resultId?versionId=` (unchanged).

### Downstream consumers

- `results-list.component.ts` (`getResultRoute`), `programme-results.component.ts` (`resultRoute`, `openResult`), `global-search-palette.component.ts` (`openResult`).

### Assumptions

- `phase=8` in the user's reference URL is the pattern; the row's own `version_id` is used (`BAO-R-8`). Verified in code: server 404s when the phase has no active row.
- Approved status id is 6 for bilateral rows (per `bilateral-creation.service.ts` comment); confirmed in task `BAO-T-3` against a real row.

## 10. Open Questions

| ID | Question | Status |
|---|---|---|
| `BAO-OQ-1` | Do Programme Results rows expose `statusId`, or only `statusName`? | Resolved by `BAO-R-6` (name fallback) |

## 11. Out-of-Band Notes

Programme-side reviewers lose Result Detail as the landing for Approved W3; accepted by the user (2026-09-24).

## Required cross-references

`docs/prd.md` (`AC-3`, `AC-5`), `docs/ux-ui/design.md` (bilateral editor), `docs/trd/trd.md` (bilateral module), `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (no payload change).
