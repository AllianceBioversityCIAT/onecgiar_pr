# Tasks: report-popup-qa-adjustments

## 1. Frontend — empty-state notes + spacing (P2-3114)

- [x] 1.1 Add `noCentersNote` / `noScienceProgramsNote` constants (strings copied verbatim from `rd-contributors-and-partners.component.ts:133,209`) to `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.ts`
- [x] 1.2 In `aow-hlo-create-modal.component.html`, render the orange note (`app-alert-status`, warning) under the "Contributing CGIAR Centers" header when `!hasReferenceCenters()`
- [x] 1.3 In the same template, render the orange note under the "Contributing Science Programs/Accelerators" header when `!hasReferenceScience()` — placed between the main header and the "Other(s)" block so the two headers no longer render stuck together
- [x] 1.4 Adjust `aow-hlo-create-modal.component.scss` spacing only if the note alone does not visually separate the SP blocks

## 2. Frontend — ToC parity info notes (P2-3114)

- [x] 2.1 Add the blue info note constants to `aow-hlo-create-modal.component.ts` — Centers: verbatim from `rd-contributors-and-partners.component.ts:118`; SP: QA-specified wording "The Science Programs listed below were identified in your 2026 ToC. To select a different Science Program, choose 'Other' from the drop-down menu and then make your selection from the options that appear."
- [x] 2.2 Render the Centers info note (`app-alert-status`, info) above the Centers dropdown when `hasReferenceCenters()` in `aow-hlo-create-modal.component.html`
- [x] 2.3 Render the SP info note above the SP dropdown when `hasReferenceScience()` in the same template
- [x] 2.4 Unify wording in C&P: update `contributingScienceInfoNote` in `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts:207` to the QA wording ("The Science Programs listed below… To select a different Science Program…"); Centers note already matches — verify only

## 3. Frontend — HLO Partners ∪ Targets centers preselection (P2-2998 AC1/AC2)

- [x] 3.1 In `aow-hlo-create-modal.component.ts` `preselectTocCenters()`: read `currentResultToReport()?.toc_partner_institution_ids ?? []`, match against `centersSE.centersList` by `institutionId`, union with the existing `targets_by_center` acronym match, dedupe by `code`, tag all `from_toc: true` (defensive: field absent ⇒ current behavior unchanged)
- [x] 3.2 Add/extend Jest specs in `aow-hlo-create-modal.component.spec.ts`: partners-only node, targets-only node, overlap dedupe, missing field fallback, empty-state note flags (client coverage gates 50/60/60/60)

## 4. Backend — hand-off (⚠️ server code; requires Yeck's go-ahead)

- [x] 4.1 Hand off / get authorization for the server change: expose `toc_partner_institution_ids: number[]` per AoW toc-result node in `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts`, reusing `TocResultsRepository.getTocPartnersByResultIds` (mirror of the P2-3114 `contributing_synergy_program_initiative_ids` enrichment, commit `bad223a34`); map partner `code` → CLARISA institution id
- [ ] 4.2 Confirm the field arrives in the AoW payload once deployed (see 5.2)

## 5. Verification

- [x] 5.1 UI: `npm start` in `onecgiar-pr-client`, open an Entity AoW page, click "Report result" on (a) a node with ToC SPs/Centers → blue notes visible, preselection correct; (b) a node without them → orange notes visible, Other(s) dropdowns active, SP headers separated
- [ ] 5.2 API: `curl` GET (prtest, `auth` header) the AoW toc-results endpoint for an SP01 "Steer to Impact" node and confirm `toc_partner_institution_ids` lists the expected partners (Alliance, IFPRI, CIMMYT, IITA) once the backend ships
- [ ] 5.3 End-to-end: create a result from an SP01 node and confirm the partner-derived centers land pre-selected in the popup and, after redirect, in the C&P ToC bucket (no re-bucketing as Other)
- [x] 5.4 Client gates: `npm run test` + `npm run lint:fix` green
