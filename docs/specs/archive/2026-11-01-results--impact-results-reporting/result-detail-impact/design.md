# Design — Impact Results: Result Detail

## 1. Summary

| Field | Value |
|---|---|
| **Spec** | `results/impact-results-reporting/result-detail-impact` (child 3/3, P2-3901) |
| **Requirements** | [`requirements.md`](./requirements.md) — IRD-R-1..13, IRD-NFR-1..6 |
| **Status** | approved (2026-10-31) |
| **Packages** | `onecgiar-pr-client` only |
| **Server contracts used** | E2–E5, green check `impact-level-info`, contributors ToC exemption, geo guard — [`../server-foundation/design.md`](../server-foundation/design.md) §4–5 (live on PRTest) |

The client gains one shared predicate, **"is this a P25 impact result"**, and everything below keys off it:

| Change | Requirement |
|---|---|
| New route entry and new page, Impact level info | R-1..R-7 |
| Contributors hides the ToC and linked-results blocks | R-8 |
| The geoscope component accepts an allowed-scopes list | R-9 |
| Evidence adds one copy line | R-10 |
| A display-label helper renames type 9 to "Impact result" in the badge, header and lists | R-11 |
| The type-change modal adds a warning | R-12 |

Paths are relative to `onecgiar-pr-client/src/app/` unless absolute.

---

## 2. Architecture Overview

```text
result-detail (shell)
 ├─ sidebar  ← result-sections.service: route list filtered by portfolio + prHide
 │             NEW route {path:'impact-level-info', prHide:9, portfolioAcronym:'P25'} placed AFTER 'evidences'
 ├─ header   ← resultTypeLabel() + impactAreaLabel()                      (R-11)
 └─ <router-outlet>
      ├─ rd-contributors-and-partners  @if(!isImpact) ToC block / linked-results block   (R-8)
      ├─ rd-geographic-location → geoscope-management [allowedScopeIds]=[2,3] when isImpact (R-9)
      ├─ rd-evidences  alertStatus() + impact <li>                       (R-10)
      └─ impact-level-info  NEW
            E2 study types ─┐
            E3 stored values ┴→ form (type · statement + counter · Yes/No · selected list)
            picker dialog → E5 search (debounced, paged) → Done
            Save → E4 PATCH → interceptor refreshes green checks          (R-7)
```

The predicate is `isP25ImpactResult(result)`, meaning `result_type_id === 9` AND portfolio `P25`. It is a pure helper in `shared/utils/`; `DataControlService` exposes it as a computed on `currentResultSignal()`.

---

## 3. Directory Structure (new / changed)

| Path | Change |
|---|---|
| `shared/utils/impact-result.util.ts` (+ spec) | **New.** Contains `isP25ImpactResult`, `resultTypeDisplayName(typeId, dbName)` ("Impact result" for 9, otherwise `dbName`) and `principalImpactAreaNames(result)` |
| `shared/utils/impact-word-count.util.ts` (+ spec) | **New.** A line-for-line port of the server's `count-words.ts` (DD-3) |
| `shared/services/api/results-api.service.ts` | **Add** `GET_impactStudyTypes`, `GET_impactLevelInfo(resultId)`, `PATCH_impactLevelInfo(resultId, body)`, `GET_impactPreviousResultsSearch(params)` |
| `shared/interfaces/impact-level.interface.ts` | **New.** E2/E3/E4/E5 types |
| `shared/routing/routing-data.ts` | **Add** the `impact-level-info` entry after `evidences` in `resultDetailRouting` |
| `pages/results/pages/result-detail/pages/rd-result-types-pages/impact-level-info/` | **New** page: component, module, routing module with `canDeactivate`, spec, `.cy.ts`, `CLAUDE.md` |
| `.../impact-level-info/components/previous-results-picker/` | **New** picker component (+ spec, `.cy.ts`) |
| `custom-fields/pr-textarea/` | **Add** an optional `wordCounterFn` input; the default is unchanged (DD-3); CT updated |
| `pages/results/pages/result-detail/pages/rd-contributors-and-partners/` | `isImpactResult` computed; `@if` around the ToC and linked-results blocks; save omits the link fields; impact copy |
| `shared/components/geoscope-management/` | **Add** an optional `allowedScopeIds` input that filters the main and extra-scope options (DD-6) |
| `pages/results/pages/result-detail/pages/rd-geographic-location/` | Passes `[allowedScopeIds]` when the result is an impact result; shows the "pick Regional or Country" hint |
| `pages/results/pages/result-detail/pages/rd-evidences/` | Adds the impact `<li>` in `alertStatus()` |
| `result-sections.service.ts` / sidebar | Badge through `resultTypeDisplayName`, uppercased in the template |
| `result-header` | Type label plus impact-area label |
| `results-outlet/pages/results-list` | Type cell through `resultTypeDisplayName` |
| `result-framework-reporting/pages/programme-results` (row mapper + filter service) | "Impact result" category, own group (DD-8) |
| `rd-general-information/components/change-result-type-modal` | Warning line when the current type is 9 |
| Folder `CLAUDE.md` guides of touched folders | Update and re-stamp `Verified:` |

---

## 4. Data Model

No persistence change. Client shapes:

| Shape | Fields |
|---|---|
| Study type (E2) | `{ id, name, definition }` |
| Impact level info (E3 / E4 response) | `{ impact_study_type_id, cgiar_contribution, previously_reported, previous_results: PreviousResult[] }` |
| PreviousResult | `{ result_id, result_code, title, result_type_name, phase_name, portfolio_acronym, status_name }` |
| Save body (E4) | `{ impact_study_type_id, cgiar_contribution, previously_reported, previous_result_ids }` — all four always sent from the form; `previous_result_ids` is `[]` when No |
| Search params (E5) | `q, versionId, portfolioId, typeIds (csv), excludeResultId, page, limit=20` → `{ items, meta:{ total, page, limit, totalPages } }` |

---

## 5. API Design (client side)

| Method | Endpoint (`baseApiBaseUrl` + `results-framework-reporting/impact-level/…`) | Used by |
|---|---|---|
| `GET_impactStudyTypes()` | `GET study-types` | page load (R-2, R-3) |
| `GET_impactLevelInfo(resultId)` | `GET get/result/:resultId` | page load (R-2) |
| `PATCH_impactLevelInfo(resultId, body)` | `PATCH save/result/:resultId` | save (R-7) |
| `GET_impactPreviousResultsSearch(params)` | `GET previous-results/search` | picker (R-6) |
| `GET_versioning(ALL, REPORTING)` — existing | versioning | picker phase filter options (IRD-A-3) |
| Result types catalog — existing method (confirm the name in T-1) | result types | picker type filter options |

The server's 400 messages are shown verbatim. The `auth` header comes from the interceptor, and a PATCH on a result-detail route already triggers the green-check refresh, so the page writes no refresh code (R-7).

---

## 6. Frontend / UX Component Architecture

### 6.1 Route and section order (R-1)

- A new `resultDetailRouting` entry `{ path: 'impact-level-info', prName: 'Impact level info', prHide: 9, portfolioAcronym: 'P25', loadChildren }` sits **immediately after `evidences`**.
- `result-sections.service.ts` keeps array order and filters by portfolio and `prHide == typeId`, so the order is right by construction.
- The P22-only routes are already filtered out. `rdResultTypesPages` has no type-9 entry, so no other type page appears.
- `path` must equal the green-check key `impact-level-info`.

### 6.2 `impact-level-info` page (R-2..R-7)

The page mimics `policy-change-info` (section skeleton, dirty tracker, `saveSection()` and `performSave()` with a snapshot in `tap`, `app-section-bottom-bar`).

| Part | Control | Behavior |
|---|---|---|
| Study type | `app-pr-select` (E2 options, `optionValue: id`) | Shows the definition of the selected option underneath; both definitions are listed in the field description (guide placement confirmed at HITL) |
| CGIAR contribution | `app-pr-textarea [maxWords]=100 [wordCounterFn]=impactWordCount` | Live counter; over 100 words → invalid + save blocked with message (R-4) |
| Already reported in PRMS? | `app-pr-yes-or-not` | Yes → selected list + "Add results" button; No with links → confirm "N links will be removed" before switching (R-5) |
| Selected list | list of chips/rows | Code (mono), title, type, phase · portfolio, status; remove button with accessible name "Remove result <code>" |
| Picker | `app-previous-results-picker` (6.3) | Opens from "Add results"; returns the working selection on Done |
| States | `sectionLoading` signal | Skeleton while E2 + E3 load; error banner + save disabled if either fails (Scenario 2.3); read-only per `rolesSE.readOnly` (NFR-6) |

**Save.** The page builds the full body (§4) and sends the PATCH. On success it re-hydrates from the E4 response (the server is the source of truth), takes a new dirty snapshot and shows a toast. On a 400 it shows the server message and keeps the form as typed.

Partial data can be saved (Scenario 7.2). Only the word limit blocks a save on the client, so the client never sends a body the server would reject for word count.

### 6.3 `app-previous-results-picker` (R-6)

The picker is a Spartan `hlm-dialog`, because the CDK dialog gives a focus trap, autofocus and focus restore (src guide §21.7: `app-pr-dialog` has none). The section is not itself a modal, so the "no modal on modal" rule is not broken.

| Part | Behavior |
|---|---|
| Inputs | `resultId` (sent as `excludeResultId`), the `initialSelection` list |
| Search box | Debounced ≥ 300 ms; a new query resets to page 1 and cancels the in-flight request (`switchMap`) |
| Filters | Phase/portfolio and result type, built with `app-pr-filter-select` / `app-pr-filter-multiselect`. These are invisible to the mandatory DOM scan, unlike `custom-fields` |
| List | Items in server order; an already-selected item shows a "Selected" state and its add control is disabled (Scenario 6.4) |
| Paging | Next/previous with `meta.totalPages` |
| Empty and error states | Empty: one line plus a hint. Error: message plus retry |
| Working selection | Edited inside the dialog. **Done** emits it; **Cancel** or Escape discards it |

### 6.4 Contributors & partners (R-8)

- `isImpactResult` is a computed on the predicate.
- `@if (!isImpactResult())` wraps the ToC block (html :38-95) and the generic linked-results block (:618-660+).
- The save path deletes `has_innovation_link` and `linked_results` from the body when the result is an impact result. This follows the existing conditional-`delete` precedent (P2-3424).
- An impact copy line ("Include contributors to the whole intervention and scaling endeavour", final text at HITL) is added under the section title.
- The centers block must render its flat dropdown when `planned_result` is false. T-5 verifies this, and if it does not, the same `@if` covers the centers branch.

### 6.5 Geography (R-9)

- `geoscope-management` gets `allowedScopeIds = input<number[] | null>(null)`. When it is set, the main options and the extra-scope options are filtered to that list, and "To be determined" is not appended.
- `rd-geographic-location` passes `[2, 3]` for impact results.
- A stored scope outside the list is left untouched: no option shows as selected, and a hint asks the user to pick Regional or Country. Nothing changes until the user saves (Scenario 9.2).

### 6.6 Evidence (R-10)

- `alertStatus()` gets a `result_type_id === 9` branch that appends one `<li>` with the MELIA guidance, the same way the type-5 branch does today.

### 6.7 Labels (R-11)

| Place | Change |
|---|---|
| Sidebar | `result-sections.service.ts:120` passes the type name through `resultTypeDisplayName`; the badge is uppercased in the template (`IMPACT RESULT`) |
| Header | The type label uses the helper, and the level line becomes `Impact · Impact Area <names>` from `principalImpactAreaNames(result)`: areas whose `*_tag_level_id === 3`, named from the IRE `IMPACT_AREAS` constant and joined with ", ". If none, just `Impact` (IRD-A-1). **T-7 confirms the header's data has the five tag columns**; if not, it reads them from the general-info data the shell already loads |
| Results Center | The type cell goes through the helper |
| SP Results tab | DD-8 |

### 6.8 Type-change warning (R-12)

- When the current type is 9, `change-result-type-modal` shows a warning line: "Changing the type deletes this result's Impact level info and its links to previous results."

---

## 7. Shared Contracts

| Contract | Owner |
|---|---|
| E2–E5 shapes and error messages | server child #1, consumed as is |
| Word definition | server `count-words.ts`; the client port must stay identical (DD-3). The server folder guide says changing one forces the other, so that rule is extended to the client file |
| `IMPACT_AREAS` constant | child #2, reused for header names |
| Bucket-key `?category=` vocabulary of SP Results | `programme-results`; DD-8 adds one value |

---

## 8. Design Decisions

### IRD-DD-1 — Impact level info as a top-level detail route after Evidence, not in `rdResultTypesPages`
- **Decision:** the new entry goes in `resultDetailRouting` after `evidences`, with `prHide: 9` and `portfolioAcronym: 'P25'`.
- **Why:** `rdResultTypesPages` is spread **before** Evidence, and R-1 needs it after. The `portfolioAcronym` keeps the two P22 type-9 rows unchanged (Scenario 1.2).
- **Rejected:** a special-case sort in `result-sections.service`, because order would then depend on code instead of the table.

### IRD-DD-2 — Mirror `policy-change-info` (NgModule page with inner `canDeactivate`)
- **Decision:** the new page follows the existing type-page shape.
- **Why:** the leave-page guard, skeleton, dirty tracker and bottom bar all expect it. A standalone `loadComponent` page would need a new guard wiring path.

### IRD-DD-3 — Client word counter ported from the server; shared counter untouched
- **Decision:** add `impact-word-count.util.ts`, a copy of the server's `countWords` (same separator regex, including the U+0085 and U+FEFF rules). Add an optional `wordCounterFn` input to `pr-textarea`; it defaults to the existing `WordCounterService`.
- **Why:** the shared counter splits only on `' '`, so `a\nb` counts as 1 on the client and 2 on the server. A 100-word text with line breaks would pass the client and fail E4, which breaks Scenario 4.2.
- **Rejected:** changing `WordCounterService` itself. It has 21 consumers, and their limits would shift silently.
- **Rejected:** a separate counter next to a plain textarea, which would duplicate the field-card chrome.
- **Reversion challenge:** nothing is removed; the default path is byte-identical, and the CT `pr-textarea.contract.cy.ts` guards it.

### IRD-DD-4 — Picker in a Spartan dialog with a working selection and Done
- **Decision:** `hlm-dialog`; the selection is committed only on Done. The section save is what persists.
- **Why:** it matches the guide (selected list + Done) and NFR-1 keyboard use. `app-pr-dialog` has no focus trap.

### IRD-DD-5 — Hide, don't disable, the contributors ToC and linked-results blocks; omit their fields on save
- **Decision:** `@if` blocks plus a conditional `delete` on the save body, for impact results only.
- **Why:** the server exempts type 9 from these checks (server DD-5). Hidden controls drop out of the mandatory DOM scan, so the alert list and the green check agree.
- **Reversion challenge — "what does removing this break for type 9?":**
  - (a) `planned_result` stays `false` from create, and the server ignores it for type 9. No break.
  - (b) A type-9 result whose type changes later to another type would show the blocks again, empty. That is expected, because the type-change flow already requires filling the new type.
  - (c) The centers dropdown branches on `planned_result`. This is open until T-5 verifies it (§6.4).
  - No break was found for other types, because the condition is the predicate.

### IRD-DD-6 — `allowedScopeIds` input on geoscope-management
- **Decision:** a generic optional input, `null` meaning today's behavior.
- **Why:** the component is shared by IPSR and other forms. An input keeps impact knowledge out of it, and the default keeps every caller unchanged.
- **Rejected:** a type-9 check inside the component.

### IRD-DD-7 — Display label in a helper, DB name unchanged
- **Decision:** `resultTypeDisplayName` is used at the four label sites.
- **Why:** proposal OQ-4 says display only, because a DB rename changes exports and bilateral payloads. One helper keeps the four places consistent.

### IRD-DD-8 — SP Results: impact results get their own "Impact result" category
- **Decision:** the row mapper sets `category = 'Impact result'` for `result_type_id 9` (rows keep `raw`). The filter service lists "Impact result" after the five RF categories and before `Other`. The `Other` bucket no longer includes type 9.
- **Why:** this is proposal R-A7 and BR9.
- **Reversion challenge — "what does taking type 9 out of Other break?":**
  - The Overview cards deep-link `category=Other` / exact non-RF names. The count behind an Overview "Other" link would then disagree with the Results tab by the number of impact results.
  - T-7 checks the Overview's Other count source. If it counts type 9, the Overview link for impact rows is left as is, and the mismatch is recorded as a follow-up rather than changing the Overview here.
  - Exact `category=Impact contribution` deep links still resolve, because the mapper keeps a reverse alias.

### IRD-DD-9 — Header area from Principal scores
- **Decision:** the header area is derived on the client from the tag columns. There is no new field.
- **Why:** the result stores no entry-point area (IRD-A-1); the server is unchanged in this spec.

---

## 9. Testing Plan

| Level | What | Requirement |
|---|---|---|
| Jest — utils | Predicate (P25/9, P22/9, P25/1); display name; principal names (0/1/2 areas); word count, with the server spec cases copied 1:1 | R-1, R-4, R-11 |
| Jest — routing/sections | Section list for P25 type 9 (5 in order), P25 type 1, P22 type 9 | R-1, R-13 |
| Jest — page | Load success/error/skeleton; definitions shown; save body exact (Yes with ids, No → `[]`); word over limit blocks; 400 keeps input; No-with-links confirm; read-only disables | R-2..R-5, R-7, NFR-6 |
| Jest — picker | Debounce + cancel; exclude self param; dedupe; remove; Done vs Cancel; paging; empty/error | R-6 |
| Jest — contributors | Blocks absent for 9, present for 1; save body has no link fields for 9 and is unchanged for 1 | R-8, R-13 |
| Jest — geo | Options [Regional, Country] for 9 (main + extra); unchanged for others; legacy Global not preselected | R-9 |
| Jest — evidence, header, sidebar, results-list, programme-results, type modal | Copy branch; labels; category bucket; warning line | R-10..R-12 |
| Cypress CT | `pr-textarea` contract (default counter unchanged + custom fn); page + picker at 1280 / 900 px | NFR-2, DD-3 |
| HITL | Visual vs guide v2; exact copy; keyboard through the picker; PRTest walk: result 10039 (or a new one) to 5/5 green, then Submit (the user clicks) | all |

Jest always runs with `--maxWorkers=2` (or `--runInBand` under 4 GB free), scoped, with `--findRelatedTests` before push. CT never runs alongside Jest. Lint uses `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet`.

---

## 10. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 8 (7 code + 1 HITL) |
| LOC | ~1,400 (≈ 650 production, ≈ 750 tests/CT) |
| Review rounds | ≤ 10 |

Depth check: **Standard** (multi-component UI, no data or API change).

---

## 11. Open Gaps

- The guide PDF is not in the repo, so copy and visual fidelity are HITL checks (IRD-OQ-1).
- E3 returns soft-deleted links (IRD-G-1); the server follow-up is not in this spec.
- QA catalog scope for the two impact tables is a follow-up with Juan, at revision 33 (IRD-OQ-3).
- The Overview "Other" count may include type 9 (DD-8); it is checked in T-7 and recorded if so.
