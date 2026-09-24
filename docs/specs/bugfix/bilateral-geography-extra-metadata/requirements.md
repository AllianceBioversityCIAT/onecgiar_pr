# Requirements — Bilateral extra geography as optional metadata

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** Geographic extra-scope metadata
- **Owner:** Bilateral submitter and reviewer flows
- **Status:** approved
- **Ticket(s):** none
- **Depth / Mode:** Lite · Bug
- **Approval Mode:** gated

## 2. Context

Bilateral submitters must be able to satisfy required geographic-focus fields without answering the optional question about other geographic areas. The bilateral Geography editor currently marks that follow-up required for innovation results and includes it in MDS completion ([section-geography.component.html:121-147](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.html), [section-geography.component.ts:545-565, 599-674](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.ts), verified at `c4672034b`). The review drawer renders the question for a concrete scope without overriding the radio control's default `required=true` ([result-review-drawer.component.html:358-390](../../../../onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.html), [pr-radio-button.component.ts:34](../../../../onecgiar-pr-client/src/app/custom-fields/pr-radio-button/pr-radio-button.component.ts), verified at `c4672034b`).

This spec refines [US-S1 and US-S5](../../../../docs/prd.md#result-submitter) and reviewer [US-Q1](../../../../docs/prd.md#qa-reviewer), supporting [G1](../../../../docs/prd.md#g1-submission-completeness-and-on-time-submission) and [AC-6](../../../../docs/prd.md#ac-6-evidence-and-toc-alignment-at-submit). It touches the bilateral creator/review surfaces in [UX/UI §4](../../../../docs/ux-ui/design.md), the client bilateral module and geographic-location reporting module in [TRD §2](../../../../docs/trd/trd.md), and the existing nullable `Result.has_extra_geo_scope` persistence field. Bilateral API creation validates `geo_focus` without an extra-scope property; its separate geographic update DTO makes `has_extra_geo_scope` optional ([create-bilateral.dto.ts:780-796, 1255-1264](../../../../onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts), [create-geographic-location.dto.ts:7-14](../../../../onecgiar-pr-server/src/api/results-framework-reporting/geographic-location/dto/create-geographic-location.dto.ts), verified at `c4672034b`).

The bilateral Geography autosave mapper also serializes a null answer as false and clears extra fields when the editor hides them for non-innovation or global/determined main focus ([section-geography.component.ts:234-270](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.ts), verified at `c4672034b`). Requirements therefore include preserving absent and previously saved metadata across main-geography saves.

## 3. In Scope / Out of Scope

### In scope

- Treat the extra-geography answer and any saved dependent scope/region/country data as optional metadata in all bilateral result types.
- Show this information in the bilateral editor's Full Metadata area and review drawer only when saved information exists.
- Keep the extra-geography fields out of MDS completeness and Submit for Review gating.
- Preserve existing answers and extra-geography selections, including the distinction between `null`, `false`, and `true`.

### Out of scope

- Changing validation of main geographic focus, regions, countries, or sub-national locations.
- Changing W1/W2 behavior, API contracts, database schema, or stored-value semantics.
- Adding a way to enter missing extra-geography metadata.
- Changing the P25 SQL function; repository tracing found no bilateral application caller, and backend validation is outside this frontend fix.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Bilateral submitter | Can submit without supplying optional extra-geography metadata; can see saved metadata in Full Metadata. |
| Bilateral reviewer | Sees saved extra-geography details when present, without an empty required prompt. |

## 5. User Stories

- **`BIL-GEO-US-1`** — As a bilateral submitter, I want extra-geography information to be optional metadata, so that missing optional data does not block submission. *(Refines US-S1, US-S5.)*
- **`BIL-GEO-US-2`** — As a bilateral reviewer, I want to see saved extra-geography information without an empty required question, so that the drawer reflects the reported data accurately. *(Refines US-Q1.)*

## 6. Functional Requirements

### Required (MUST)

- **`BIL-GEO-R-1`** The bilateral editor and Submit for Review completeness checks MUST NOT require the extra-geography answer or its dependent metadata for any result type. Main geographic-focus requirements MUST remain unchanged.

  **Scenario: Unanswered extra geography does not block bilateral submission**

  - GIVEN a bilateral result of any type has valid required main geographic-focus data and `has_extra_geo_scope` is `null`
  - WHEN the editor calculates Geography completeness and the submitter submits for review
  - THEN extra geography MUST NOT appear as a missing MDS field or block submission
  - BUT missing required main geographic-focus data MUST continue to block submission
  - AND the result MUST remain eligible for normal Submit for Review processing

- **`BIL-GEO-R-2`** The editor's Full Metadata area and the bilateral review drawer MUST show saved extra-geography information only. Each answer/detail MUST render only when that value is saved; a null answer MUST NOT become an empty question, even if other dependent data is saved. A saved `false` MUST remain distinguishable from `null`; saved details MUST remain visible when present.

  **Scenario: Absent optional metadata stays hidden**

  - GIVEN a bilateral result has `has_extra_geo_scope = null` and no saved extra scope, regions, or countries
  - WHEN the submitter opens Full Metadata or a reviewer opens the result drawer
  - THEN the extra-geography question and empty dependent controls MUST NOT be rendered
  - AND no required indicator or validation error for extra geography MUST be shown

  **Scenario: Saved optional metadata remains visible**

  - GIVEN a bilateral result has a saved `has_extra_geo_scope` answer or saved dependent extra-geography details
  - WHEN the submitter opens Full Metadata or a reviewer opens the result drawer
  - THEN the saved answer and any populated dependent details MUST be shown
  - AND a saved `false` MUST display as “No,” while `null` MUST NOT be converted to “No”
  - BUT absent dependent details MUST NOT appear as blank required controls

  **Scenario: Saved dependent details with no saved Yes/No answer**

  - GIVEN a bilateral result has `has_extra_geo_scope = null` and one or more saved extra scope, region, country, or sub-national values
  - WHEN the submitter opens Full Metadata or a reviewer opens the result drawer
  - THEN the saved dependent details MUST be shown
  - AND the empty Yes/No question MUST remain hidden

  **Scenario: Saving main geography preserves optional metadata state**

  - GIVEN a bilateral result has absent (`null`) extra-geography metadata, or saved extra-geography details that are not currently shown for its result type or main geographic scope
  - WHEN the submitter saves a change to the main geographic focus
  - THEN the save MUST preserve `null` as absent and retain any previously saved extra-geography answer and dependent details
  - BUT it MUST NOT synthesize “No” or clear saved extra-geography fields merely because the optional metadata is not currently displayed

### Should (SHOULD)

- None.

### Could / Nice-to-have (MAY)

- None.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Regression safety** | The fix MUST preserve existing main geographic-focus validation and saved extra-geography values. |
| **Accessibility** | Conditional display MUST preserve the existing accessible labels and keyboard behavior of any rendered controls. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BIL-GEO-AC-1` | Any bilateral result type has valid main scope and null/absent extra-geography data | Geography completeness is evaluated and Submit for Review is requested | Extra geography is not in missing MDS fields and does not block submission; missing main geographic data still blocks. |
| `BIL-GEO-AC-2` | A result has no saved answer or dependent extra-geography values | Full Metadata or the bilateral review drawer is opened | No empty extra-geography prompt, dependent controls, required indicator, or validation error is rendered. |
| `BIL-GEO-AC-3` | A result has saved `false`, `true`, or dependent extra-geography values | Full Metadata or the bilateral review drawer is opened | The saved answer/details display accurately; `false` remains “No,” and dependent details appear only when populated. |
| `BIL-GEO-AC-4` | A result has existing main geographic data and null or saved extra-geography metadata | Main geographic data is saved | Main geographic validation is unchanged; null stays absent, and existing extra-geography values are retained without coercion or clearing. |
| `BIL-GEO-AC-5` | A result has null extra answer but saved dependent extra-geography values | Full Metadata or the bilateral review drawer is opened | Saved dependent values display, and no empty Yes/No question is shown. |

Cross-cutting project ACs that apply: `AC-1`, `AC-2`, `AC-3`, `AC-6`, and `AC-9` ([docs/prd.md](../../../../docs/prd.md)).

## 9. Dependencies & Assumptions

### Upstream dependencies

- Existing bilateral result detail and geographic-location data returned by the server.
- Existing bilateral Full Metadata interaction pattern.

### Downstream consumers

- Bilateral MDS tracker and result creator submission gate.
- Bilateral review drawer and its data-standard save mapper.
- Existing result geography persistence; no API or schema change is in scope.

### Assumptions

- A stored boolean (`true` or `false`) counts as populated; `null`/absent with no dependent selections counts as empty.
- Non-empty dependent geography counts as saved information even if the boolean is unexpectedly null, so rendering does not conceal already stored values.
- Bilateral green checks and the submit gate are calculated through the frontend MDS tracker; source searches found no bilateral application call to `validation_geo_location_P25` or `geoLocationValidation` (verified at `c4672034b`).

## 10. Open Questions

- None for this client-side change.

## 11. Defect Classes & Verification Mapping

| Defect class | Catching check |
|---|---|
| Extra geography still blocks MDS completion or Submit for Review | Angular component test invokes the production completeness/tracker path with `null` for Innovation Use, Innovation Development, and a non-innovation type; submission-gate test verifies the result can proceed. |
| Empty extra-geography prompt or required indicator remains in editor/drawer | Tests against the shipped templates/component rendering cover null/empty, saved false, saved true, and populated dependent fields in both surfaces. |
| Null is silently converted to false or populated data is lost on save | Regression tests verify the production mapping preserves null and already saved values; saved false remains distinct. |
| Main geographic validation regresses | Existing geographic-scope tests plus focused cases with missing main data verify the main requirement remains enforced. |
| Bilateral MDS still blocks on extra geography | Frontend component tests invoke the production tracker/completeness and submit-gate paths; server SQL validation is outside the bilateral caller path verified in this spec. |

Regression coverage MUST exercise production component/tracker/template behavior; a test-local copy of the completeness logic is not evidence (KZ-GEO-1, [`docs/specs/kaizen/bugfix--innovation-geo-other-areas.md`](../../kaizen/bugfix--innovation-geo-other-areas.md)).

## Required cross-references

- [PRD](../../../../docs/prd.md) — `G1`, `US-S1`, `US-S5`, `US-Q1`, `AC-1`, `AC-2`, `AC-3`, `AC-6`, `AC-9`.
- [UX/UI design](../../../../docs/ux-ui/design.md) — §4 result editor and review drawer screen inventory.
- [TRD](../../../../docs/trd/trd.md) — §2 bilateral and Results Framework Reporting modules; §3 result storage.
- [Proposal](proposal.md) — approved intent and confirmed client root causes.
