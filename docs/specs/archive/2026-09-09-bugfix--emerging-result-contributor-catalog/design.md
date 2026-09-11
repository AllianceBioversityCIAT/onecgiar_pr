# Design — Emerging Result: full CGIAR Center / Science Program catalogue

## 1. Summary

Gate `preselectTocCenters()` and `preselectTocSciencePrograms()` in `AowHloCreateModalComponent` on `entityAowService.currentResultToReport()?.indicators?.length > 0`. When false (emerging/unplanned flow), skip the ToC match entirely so `tocCenters()`/`tocSciencePrograms()` stay `[]` and the existing `@else` template branches (full catalogue, no "Other(s)" gate) render — those branches already exist and are correct; they are just unreachable today for this flow. No new signals, no template changes, no API changes.

Linked: `requirements.md` (this folder) `ERC-R-1..3`; `proposal.md` §9 Root Cause / §10 Option A.

## 2. Architecture Overview

### 2.1 Where this lives

- **Client module touched:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.ts` only. No template (`.html`), no server, no other client module.
- No external integrations touched (CLARISA/`CentersService`, `GET_AllInitiatives` continue to fetch unconditionally, unchanged).

### 2.2 Flow (before → after)

```
Before (both flows):
  ngOnInit → preselectTocCenters() → reads node.toc_partner_institution_ids (always)
                                    → tocCenters.set(matched)   [non-empty even when indicators=[]]
           → preselectTocSciencePrograms() → reads node.contributing_synergy_program_initiative_ids (always)
                                            → tocSciencePrograms.set(matched)

After:
  ngOnInit → preselectTocCenters()
               IF currentResultToReport().indicators?.length > 0 (ToC/indicator flow):
                 → same as before (match node ToC fields)
               ELSE (emerging flow):
                 → tocCenters.set([]); contributingCenters.set([])   [no ToC match attempted]
           → preselectTocSciencePrograms() — same gate, mirrored
```

## 3. Data Model Changes

None. No entity, no migration, no DTO changes — this is client-only signal-computation logic.

## 4. API Surface

None. No endpoint added or changed.

## 5. Client Workflow / Business Rules

- **`preselectTocCenters()`** (currently `aow-hlo-create-modal.component.ts` L245-263): wrap the existing `centersSE.getData().then(...)` body in a check — `const node = this.entityAowService.currentResultToReport(); const hasIndicator = (node?.indicators?.length ?? 0) > 0;`. When `!hasIndicator`, set `this.tocCenters.set([])` and `this.contributingCenters.set([])` and return before computing `tocAcronyms`/`partnerInstitutionIds`/`preselected`. When `hasIndicator`, keep today's logic unchanged (both sources (a) node-level `toc_partner_institution_ids` and (b) `indicators[0].targets_by_center.centers` — both are only meaningful when an indicator is actually selected, so gating on `hasIndicator` covers both sources with one check, no need to split (a) vs (b)).
- **`preselectTocSciencePrograms()`** (currently L291-300): identical gate — when `!hasIndicator`, `this.tocSciencePrograms.set([])` and `this.entityAowService.selectedEntities.set([])`, returning before reading `contributing_synergy_program_initiative_ids`.
- No change to `onContributingCentersChange`, `onContributingCenterSelect`, `onScienceSelect`, `deleteContributingCenter`, `deleteOtherCenter`, `deleteOtherScience`, `createResult()` — these already operate correctly off whatever `tocCenters()`/`otherCentersSelected()` (and their SP equivalents) end up holding, and `createResult()`'s payload merge (L502-522) is agnostic to which branch populated them.
- No change to the template (`aow-hlo-create-modal.component.html`): `hasReferenceCenters()`/`hasReferenceScience()` and their `@if`/`@else` branches (L233-256, L272, L310-329, L350) are already correct — this fix only changes what feeds them.

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Same component, same modal, same entry point (`entity-details/:entityId/aow`).

### 6.2 Components & services

- Modify `AowHloCreateModalComponent.preselectTocCenters()` and `.preselectTocSciencePrograms()` only.
- No new component, no new service, no new API method.

### 6.3 Design system usage

Not applicable — no visual/markup change. The `@else` branches that will now render for the emerging flow already exist, are already styled, and were already reachable (and tested) for the "ToC returned nothing" case on an indicator-based report — this fix only makes them reachable for the emerging flow too.

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

No change. No new input surface, no new endpoint, no auth implication.

## 8. Performance & Capacity

Negligible — removes a filter/match computation on the emerging-report path (fewer array operations than before, not more).

## 9. Observability

No new logging needed. No behavior worth telemetry beyond existing error handling.

## 10. Testing Plan (forward-looking)

- **Unit (Jest, client):** extend `aow-hlo-create-modal.component.spec.ts`'s existing `describe('Component Integration Tests …')` block (it already builds a full `TestBed` with `mockEntityAowService`/`mockCentersService`/`mockApiService`, see lines 301-455). Add two cases mirroring `ERC-AC-1` / `ERC-AC-2`:
  - Emerging case: `mockEntityAowService.currentResultToReport.set({ indicators: [], toc_partner_institution_ids: [100], contributing_synergy_program_initiative_ids: [51] })`, `fixture.detectChanges()`, assert `component.tocCenters()` / `component.tocSciencePrograms()` are `[]` and `component.hasReferenceCenters()` / `component.hasReferenceScience()` are `false`.
  - Indicator/ToC case (regression guard for `ERC-R-3`): same node-level ids but `indicators: [{ ... }]` non-empty (as the file's existing default mock already sets at L381-398), assert `tocCenters()` / `tocSciencePrograms()` come back populated and `hasReferenceCenters()` / `hasReferenceScience()` are `true` — this is effectively the existing "P2-3114" tests at L54-217 and L716-813; confirm they still pass unmodified (they already use non-empty `indicators`, so the new gate does not change their outcome — this is the regression guard, not new coverage).
- **Build:** `ng build --configuration development` — per `KZ-bugfix--lead-center-full-catalog-1` (`docs/specs/kaizen/bugfix--lead-center-full-catalog.md`), Jest/`ts-jest` does not catch every Angular-compiler-level break in this component family; the task's verification command must include the real build, not only the test runner.
- **Lint:** `npx ng lint --quiet`.
- No Cypress/CT needed — this component is not under `custom-fields/` and has no new DOM/overlay behavior; existing Jest coverage of the template-gating computed signals is sufficient (the template itself is unchanged).

## 11. Backwards Compatibility & Migration Plan

No migration. No API contract change. The only behavior that changes is the emerging-result flow (previously broken); the indicator/ToC flow is required to stay identical (`ERC-R-3`, verified by the unchanged-outcome regression case above).

## 12. Design Decisions (ADRs)

### `ERC-DD-1` — Gate ToC preselection on `indicators.length > 0`, not on node-level field presence

- **Context:** `preselectTocCenters()`/`preselectTocSciencePrograms()` currently key off whether the node object *has* ToC partner/SP ids, which are present at the HLO/Outcome node level regardless of whether an indicator was picked — causing the emerging flow to incorrectly inherit ToC preselection.
- **Decision:** Gate on `currentResultToReport()?.indicators?.length > 0` instead — the exact signal `openReportResultModal` already uses to distinguish "indicator report" (`indicators: [...]`) from "emerging report" (`indicators: []`).
- **Alternatives considered:**
  - Strip the ToC id fields from the node object in `openReportResultModal` when `currentItemId` is `null` (Option B in `proposal.md`) — rejected: pushes a modal-internal concern into the table component, easier to silently miss for a future second entry point.
  - Add an explicit `isEmergingResult` flag threaded into the modal (Option C in `proposal.md`) — rejected: unnecessary new state for a distinction the data already encodes.
- **Consequences:** Correct behavior depends on `openReportResultModal` remaining the only caller that opens this modal with `indicators: []` for an otherwise ToC-linked node — **user-confirmed (2026-09-09)**, see `requirements.md` §9 Assumptions. No implementation-time grep verification is required for this.

### `ERC-DD-2` — Reversion challenge (Step 2.3)

- **What is reverted:** ToC preselection of centers/SPs for one call path (the emerging-report flow) that currently *does* run, even though it produces the reported defect.
- **Challenge question:** "what does removing this break?"
- **Answer:** Nothing currently relies on the emerging flow silently preselecting ToC centers/SPs as chips — `createResult()`'s payload merge (L502-522) works identically whether items arrive via `contributingCenters()`/`selectedEntities()` (today, incorrectly, ToC-sourced+chip-preselected) or via `otherCentersSelected()`-style full-catalogue selection (after the fix, user-picked). No test in the existing suite asserts that an emerging report arrives with ToC centers pre-checked — the closest tests (`describe('preselectTocCenters logic …')`, L54-110) all use **indicator-bearing** nodes. This confirms the reversion is safe and is, in fact, the entire point of the fix.

## 13. Open Gaps & Follow-ups

- `ERC-OQ-1` (from `requirements.md`): closed — `rd-contributors-and-partners` is explicitly out of scope for this spec by direct user instruction (2026-09-09) and MUST NOT be touched, regardless of whether it shares the same defect shape.

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Tasks | 1 |
| LOC | ~15-25 (two guarded early-returns in existing methods; no new files) |
| Review rounds | 1 |

This is well below `Lite` depth's usual ceiling for a spec — the depth choice (Lite) already matches the estimate; no downgrade to `/akili-quick` because the change is a logic/behavior fix requiring a regression test (per `/akili-propose`'s own routing: "genuinely cosmetic one-liner → quick; anything with logic, data, or a behavior change → specify"), not a copy/token tweak.

## Required cross-references

- `docs/specs/bugfix/emerging-result-contributor-catalog/requirements.md` (this folder).
- `docs/specs/bugfix/emerging-result-contributor-catalog/proposal.md` (this folder) — Bug Diagnosis, Option A.
- `docs/specs/kaizen/bugfix--lead-center-full-catalog.md` — `KZ-bugfix--lead-center-full-catalog-1` (build-command verification requirement).
