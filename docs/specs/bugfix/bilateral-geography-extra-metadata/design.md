# Design — Bilateral extra geography as optional metadata

## 1. Summary

This design removes extra-geography metadata from bilateral MDS completeness while preserving it in saves and showing only stored values in the bilateral editor and review drawer. The bilateral green checks and submit gate are calculated in the frontend; repository tracing found no bilateral application call to the P25 SQL validation function. It is a client-only change: the nullable stored field and geographic-location API already support `null`, `false`, and `true`.

Requirements: [requirements.md](requirements.md). Project context: [PRD](../../../../docs/prd.md) `G1`/`AC-6`, [UX/UI](../../../../docs/ux-ui/design.md) §4, and [TRD](../../../../docs/trd/trd.md) §§2–3.

## 1A. Premise Ledger

Premise Ledger: 9 verified, 0 UNVERIFIED (High: 0; Low: 0).

Blast-radius triggers: live-path, shared-state, consumer — the design changes two user-action paths and the treatment of a persisted field read across bilateral, W1/W2, API, and review code.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|
| BIL-GEO-P-1 | `has_extra_geo_scope` is persisted as a nullable result field and geographic-location GET/UPDATE pass it through. | `data-env` | `result.entity.ts:397-402`; `create-geographic-location.dto.ts:7-14`; `geographic-location.service.ts:91, 223` ([entity](../../../../onecgiar-pr-server/src/api/results/entities/result.entity.ts), [DTO](../../../../onecgiar-pr-server/src/api/results-framework-reporting/geographic-location/dto/create-geographic-location.dto.ts), [service](../../../../onecgiar-pr-server/src/api/results-framework-reporting/geographic-location/geographic-location.service.ts)) | `c4672034b` | Re-scope persistence/API behavior before keeping this client-only. Impact: High. | — |
| BIL-GEO-P-2 | The bilateral editor counts an unanswered extra-geography answer as incomplete and adds it to the MDS tracker for innovations. | `location` | `section-geography.component.ts:560-565, 590-623, 665-674`; `section-geography.component.html:121-147` ([component](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.ts), [template](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.html)) | `c4672034b` | The requirements would need a different editor cause/path. Impact: High. | — |
| BIL-GEO-P-3 | The review drawer renders the extra-geography radio under a concrete main scope, and the radio defaults to required unless overridden. | `location` | `result-review-drawer.component.html:358-390`; `pr-radio-button.component.ts:34` ([drawer](../../../../onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.html), [radio](../../../../onecgiar-pr-client/src/app/custom-fields/pr-radio-button/pr-radio-button.component.ts)) | `c4672034b` | Drawer conditional rendering/required-state design changes. Impact: High. | — |
| BIL-GEO-P-4 | The editor autosave maps null to false and clears dependent extras when they are hidden by result type or main scope; the drawer mapper also maps null to false. | `location` | `section-geography.component.ts:234-270`; `result-review-drawer.component.ts:852-864` ([editor](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.ts), [drawer](../../../../onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.ts)) | `c4672034b` | The preservation requirement and proposed payload change would need re-evaluation. Impact: High. | — |
| BIL-GEO-P-5 | Bilateral editor route `result/:id` lazy-loads `BilateralResultCreatorComponent`, whose template mounts `app-section-geography`; its tracker feeds the rail submit gate. The reviewer route lazy-loads `BilateralReviewComponent`, whose template mounts `app-result-review-drawer`. | `live-path` | `rg -n 'path: .*(bilateral-review|result/:id)|BilateralReviewComponent|BilateralResultCreatorComponent' onecgiar-pr-client/src/app/shared/routing/routing-data.ts` → editor lines 751–755; review lines 656–660. `rg -n 'app-section-geography|canSubmitFromRail|app-result-review-drawer' onecgiar-pr-client/src/app/pages/bilateral onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review` → creator template 273, creator gate 778 / submit button 183, drawer mount 624. ([routes](../../../../onecgiar-pr-client/src/app/shared/routing/routing-data.ts), [creator](../../../../onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.html), [review](../../../../onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.component.html)) | `c4672034b` | A UI-only correction would not cover the named user actions; re-open diagnosis. Impact: High. | — |
| BIL-GEO-P-6 | `BilateralExpandableStateService` stores each result's full-metadata disclosure separately by result ID and section key; Innovation Development and Innovation Use use it. | `shared-state` | `bilateral-expandable-state.service.ts:3-45`; type components call `getShowAllFields` / `setShowAllFields` at `type-innovation-dev.component.ts:173-180` and `type-innovation-use.component.ts:279,347-349` ([service](../../../../onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-expandable-state.service.ts)) | `c4672034b` | Use component-local disclosure state or another existing section key; user-visible behavior remains. Impact: Low. | — |
| BIL-GEO-P-7 | W1/W2 uses the same nullable field but has its own question visibility and required-answer logic; server storage is shared. | `shared-state` | `rg -n 'has_extra_geo_scope' onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location onecgiar-pr-client/src/app/shared/services/fields-manager.service.ts onecgiar-pr-server/src/api/results-framework-reporting/geographic-location onecgiar-pr-server/src/api/results/entities/result.entity.ts` → W1/W2 component/model/template, field manager, geographic API, entity. Key readers: `rd-geographic-location.component.ts:119,286,346`; template `:34-50`; `FieldsManagerService:268`; server service `:91,223`. ([W1/W2 component](../../../../onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.ts), [field manager](../../../../onecgiar-pr-client/src/app/shared/services/fields-manager.service.ts)) | `c4672034b` | Restrict all UI and validation changes to bilateral; otherwise the approved scope expands to W1/W2. Impact: High. | — |
| BIL-GEO-P-8 | The field is read/written by a finite set of client/API consumers; this change does not alter API contracts. | `consumer` | `rg -n 'has_extra_geo_scope' onecgiar-pr-client/src onecgiar-pr-client/cypress onecgiar-pr-server/src --glob '!**/*.map'` returned field hits in bilateral editor `section-geography.component.{ts,html,spec.ts}` and `bilateral-geography-extra-scope.cy.ts`; bilateral review `result-review-drawer.component.{ts,html,interfaces.ts}`; W1/W2 `rd-geographic-location.component.{ts,html,spec.ts}` and `models/extraGeographicLocationBody.ts`; `FieldsManagerService.{ts,spec.ts}`; server `create-geographic-location.dto.ts`, `geographic-location.service.{ts,spec.ts}`, `result.entity.ts`, `result.repository.ts`, `review-update.dto.ts`, `innovation-pathway-step-four.service.spec.ts`; migrations `1761324189440-AddFieldHasExtraGeoScope.ts`, `1762528725798-createValidtionP25.ts`. | `c4672034b` | Re-scope if implementation needs a public API or W1/W2 change. Impact: High. | — |
| BIL-GEO-P-9 | Bilateral green checks are client-side; the bilateral submit guard uses the client MDS tracker, and source contains no bilateral call to `validation_geo_location_P25` or `geoLocationValidation`. | `live-path` | `rg -n 'setSectionFields|isGeographyComplete|canSubmitFromRail|submitResult' onecgiar-pr-client/src/app/pages/bilateral/components/section-geography onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator` → geography tracker/completeness and creator submit gate. `rg -n 'assertSubmittable|innovationUseMdsValidator|geoLocationValidation|validation_geo' onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts` → bilateral submit validators, no geography validator. `rg -n 'validation_geo_location_P25' onecgiar-pr-server/src --glob '*.ts'` → migration definition/drop only. | `c4672034b` | If a bilateral server caller is added, re-evaluate server scope. Impact: High. | User confirmed green checks are frontend-calculated; source call-site search verified. |

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client only:** `pages/bilateral/components/section-geography/` and `pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/`.
- **No server module, route, entity, migration, or bilateral payload contract changes.** The nullable storage and geographic GET/UPDATE path remain the persistence boundary (Premise BIL-GEO-P-1).
- **Existing shared state:** reuse `BilateralExpandableStateService` with the result ID and the `geography` section key to remember the Full Metadata disclosure (Premise BIL-GEO-P-6).

### 2.2 Sequence / interaction diagram

```text
Editor: route result/:id → BilateralResultCreatorComponent → SectionGeographyComponent
  → GET geographic data → hydrate main + extra geography state
  → update MDS tracker with main geography only
  → show Full Metadata disclosure only if saved extra data exists
  → autosave main/extra data while preserving null and existing values
  → Submit for review remains gated by all other MDS fields and main geography

Review: entity-details/:entityId/bilateral-review → BilateralReviewComponent
  → ResultReviewDrawerComponent → load/normalize data standards
  → render extra geography only when saved data exists
  → data-standard save preserves null/true/false and existing nested selections
```

### 2.3 Validation and submission

The geography tracker contains the main scope and the current scope-dependent main regions, countries, and sub-national requirements. It excludes the extra-geography answer and all dependent extra selections for every result type. `isGeographyComplete()` continues enforcing the existing main geographic requirements. The creator's overall MDS completion and Submit for Review guard remain unchanged; only the extra metadata is removed from the tracker and completeness predicate.

## 3. Data Model Changes

### 3.1 Entities

| Entity | Change |
|---|---|
| `Result.has_extra_geo_scope` and extra geography relations | No schema or entity change. Keep the existing nullable boolean and relation data. |

### 3.2 Migrations

None. The migration function `validation_geo_location_P25` is not changed; it has no application caller in the bilateral flow traced here.

### 3.3 CLARISA / external-data implications

None.

## 4. API Surface

No endpoint or payload shape change. The editor continues using the existing geographic GET/PATCH path and the drawer its existing data-standard update path. Both client mappers must preserve the nullable extra-answer value and serialize already loaded dependent data even when the Full Metadata content is collapsed or hidden by the previous result-type/main-scope gates. The bilateral result summaries contract is untouched.

## 5. Server Workflow / Business Rules

None. Bilateral MDS completion and its submit gate are frontend logic. Existing main-geography checks remain as-is; W1/W2/server validation paths and the SQL function are outside this change.

## 6. Frontend Plan

### 6.1 Routes / modules

Routes do not change. Apply the two live paths in Premise BIL-GEO-P-5.

### 6.2 Components & services

- Keep `geographicLocationBody` and `extraGeographicLocationBody` as separate state; the extra data remains optional and is never folded into the main scope model.
- In `SectionGeographyComponent`, remove the extra answer and extra dependent fields from `isGeographyComplete()` and `updateTracker()`. Keep the main scope checks intact.
- Add a result-scoped Full Metadata disclosure using `BilateralExpandableStateService`. Show it only after the current result's geography load completes and stored extra metadata is populated, preventing stale values during result switches. Render the saved answer only when it is `true` or `false`, and each dependent field only when that value exists. If the answer is null but child values exist, show those saved values without an empty Yes/No question.
- In the review drawer, render the extra-geography group based on persisted-value presence, independent of the main scope's concrete-value display condition. Render only saved values, make rendered fields optional, and preserve the current role/read-only gate.
- Define populated data as a saved boolean answer (`false` is populated), saved extra scope ID, true extra-region/country flag, or non-empty saved extra regions/countries/sub-national collection. Preserve `null` if no answer is stored. Do not show empty question/select controls as prompts.
- Keep existing handlers for editing values already present. An explicit user change to “No” may clear dependent extra selections; merely changing/saving the main geography, collapsing metadata, or loading a non-innovation result must not clear those saved selections.
- In both editor autosave and drawer serialization, do not use truthiness fallback for the nullable answer. Carry `null`, `false`, and `true` as distinct values and carry extra child data already in state, even while the metadata view is collapsed.

### 6.3 Design system usage

Use the existing bilateral section disclosure, shared form controls, spacing, and color tokens; add no palette, typography, or motion tokens. The disclosure button remains keyboard-operable, has a visible focus state, and exposes its expanded state and controlled content. In the drawer, the conditional section follows existing responsive content flow and preserves its current tab order. No mockup/Figma design is available; this is an adaptation of the in-product Full Metadata pattern.

## 7. Security & Authorization

No auth, role, route, or server authorization changes. Preserve the review drawer's existing `canEditDataStandards()` behavior and the bilateral creator's existing read-only gate.

## 8. Performance & Capacity

No new requests, services, loops over unbounded data, or dependencies. Populated-state checks operate on the already hydrated geographic state.

## 9. Observability

No new logging or telemetry. Existing autosave status and review-save feedback remain authoritative.

## 10. Testing Plan (forward-looking)

- **Bilateral Geography unit/component tests:** invoke the real `isGeographyComplete()` and `updateTracker()` paths for Innovation Use, Innovation Development, and non-innovation; verify missing main scope-dependent values still fail while null extra metadata does not. Verify data hydration/payload handling preserves null, false, true, and saved extra selections.
- **Template/rendering regression tests:** assert the actual shipped editor template hides the empty question and shows populated metadata only after disclosure; do not rely on a test-local copy of the predicate (KZ-GEO-1). Verify no required marker or empty dependent controls appear.
- **Review drawer component tests:** use the actual drawer template to cover absent vs populated values, the required-state default, permission/read-only behavior, save serialization, and preservation of null and nested selections.
- **Consumer safety:** retain W1/W2 `rd-geographic-location` and `FieldsManagerService` behavior/tests unchanged. Update bilateral tests that assert the old innovation MDS requirement or that discard non-innovation extras; add coverage for the newly required preserve/display behavior.
- **Gate classes:** Jest component tests catch required-state, MDS, serialization, and data-preservation defects; a browser-level bilateral smoke check at the existing human review gate catches any mismatch in actual Full Metadata disclosure behavior. No visual geometry claim is introduced.

## 11. Backwards Compatibility & Migration Plan

No migration or public API change. Existing `null`, `false`, and `true` values remain valid. This intentionally changes bilateral client behavior only; W1/W2 answer requirements and payload behavior remain unchanged.

## 12. Design Decisions (ADRs)

### BIL-GEO-DD-1 — Keep extra geography optional and outside the bilateral MDS

- **Context:** The editor currently counts the extra answer as MDS for innovations; the drawer's shared control defaults to required (Premises BIL-GEO-P-2/3).
- **Decision:** Remove extra answer and dependent values from bilateral completion for all types. Keep the main geographic validation as-is.
- **Alternatives considered:** Keep the field in MDS but visually optional (still places it in the required-data flow); remove it from the UI completely (would conceal saved information).
- **Reversion challenge:** The editor tests currently pin the innovation answer as required (`section-geography.component.spec.ts:555-560`) and the tracker/completeness feed Submit for Review. Removing this could allow innovation submissions without that answer; that is the requested correction. Guardrail: retain main-scope/regions/countries/sub-national checks and test both an unanswered extra answer and missing required main geography. Update only bilateral assertions; leave W1/W2 tests intact.
- **Consequences:** Bilateral submission eligibility changes as requested; QA/reviewer can still inspect saved optional data.

### BIL-GEO-DD-2 — Preserve nullable and populated data across UI save paths

- **Context:** Both client payload mappers convert null to false; the editor clears extra selections when hidden by result type or main scope (Premise BIL-GEO-P-4).
- **Decision:** Keep null distinct from No and serialize the hydrated extra data regardless of disclosure state or result type. Clear dependent values only after an explicit No action, using the existing user-initiated behavior.
- **Alternatives considered:** Keep existing coercion/clearing rules (can manufacture “No” or lose data while saving main geography); move the logic to the server (adds unnecessary API work because server DTO/storage already support nullable values).
- **Reversion challenge:** A current editor test asserts non-innovation extras are cleared (`section-geography.component.spec.ts:563-588`). This is a deliberate bilateral behavior change to support the approved requirement that saved metadata is available across result types. Update that test to prove stored data survives ordinary main-geography saves and is visible in Full Metadata; an explicit user No remains the clearing path. Main-scope changes no longer discard optional data implicitly.
- **Consequences:** Existing unusual/stale extra data on non-innovation or Global/TBD results will be retained and surfaced as saved metadata. No data migration or W1/W2 change.

### BIL-GEO-DD-3 — Do not change the P25 SQL function in this spec

- **Context:** Its migration definition rejects null extra answers in some innovation cases, but source search found no application caller and deployed database routines are not available here (Premise BIL-GEO-P-9).
- **Decision:** Keep the function unchanged; settle the deployed call graph before any backend work or release claim.
- **Alternatives considered:** Change the SQL routine now (could alter W1/W2 validation without proving a bilateral caller); assume no caller because source search is empty (does not prove deployed database state).
- **Consequences:** A deployed external caller remains an explicit release verification dependency.

### Phase 2.4 — Size against the design

| Estimate | Value |
|---|---:|
| Expected tasks | 1 focused task |
| Expected LOC | ~100–140 |
| Expected review rounds | ≤1 |

These estimates fit Lite depth: the behavior is confined to two Angular surfaces and their focused tests; no backend or persistence changes are designed.

## 13. Open Gaps & Follow-ups

- Existing records with a saved `false` and populated extra child selections are internally inconsistent. The editor/drawer should preserve and display saved fields without replacing the answer; an explicit user-selected No may clear them.
- Existing non-innovation tests intentionally expect clearing the fields. The approved “all types, show saved metadata” requirement supersedes that bilateral-specific behavior; update only those expectations and retain W1/W2 coverage.

### Required cross-references

- [requirements.md](requirements.md)
- [docs/prd.md](../../../../docs/prd.md)
- [docs/ux-ui/design.md](../../../../docs/ux-ui/design.md)
- [docs/trd/trd.md](../../../../docs/trd/trd.md)
- [Bilateral geography guide](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/CLAUDE.md)
- [Bilateral drawer guide](../../../../onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/AGENTS.md)
