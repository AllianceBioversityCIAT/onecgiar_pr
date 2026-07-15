## 1. Pre-flight / confirmations

- [x] 1.1 Confirmed with Juan David (Slack 2026-06-24): dropdown 1 = union of `toc_partners` + `toc_target_center_ids`, matched against `/clarisa/centers/get/all` by `institutionId` (code → institutionId cross is correct). Only the **selected node**, not the whole response.
- [x] 1.2 Confirmed in live data: `toc_target_center_ids` are institutionIds (e.g. 49 → ABC, 50 → CIMMYT). `toc_partners[].code` crosses the same way; non-center ids simply don't match.
- [x] 1.3 Confirmed SAVE is deferred (Juan David: "el patch por ahora no lo abordemos").

## 2. Visual layer

- [x] 2.1 Service: add `tocReferenceCenterInstitutionIds` signal, `otherCentersSelected`, `showOtherCenters`.
- [x] 2.2 `multiple-wps-content`: effect feeding the selected node's institutionIds (toc_partners ∪ toc_target_center_ids) into the service. Gated by `isCP2026()`.
- [x] 2.3 Parent: `referenceCenters` / `otherCentersList` computeds (filter CLARISA by institutionId) + the 2026 info note.
- [x] 2.4 Template: info note + dropdown 1 (referenceCenters) + "Other(s)" toggle + dropdown 2 (otherCentersList), gated by `isCP2026()`; legacy single dropdown kept for non-2026.
- [x] 2.5 `build:dev` passes. Verified on a served prod build (Playwright): dropdown 1 shows 6 TOC centers, dropdown 2 the other 9 (15 total, no overlap); info note + Other(s) toggle render. Screenshot in `.local-screenshots/verify-centers-split.png`.

## 2b. UI adjustments (from review, 2026-06-24)

- [x] 2b.1 "Other(s) CGIAR Centers" is an item at the END of the first dropdown's list (not an outside checkbox); selecting it keeps it as a chip and reveals the second dropdown (Excel: "add a new item … Other(s)").
- [x] 2b.2 Preselect ALL reference (TOC) centers on load, only when the result has no centers selected yet; respect existing selection otherwise; no re-preselect after manual deselect.
- [x] 2b.3 Chips show acronyms (gated 2026) for both dropdowns; the "Other(s)" chip shows "Other(s)".
- [x] 2b.4 Second dropdown shows its own selected-centers chips with delete (same pattern as dropdown 1); chips stay pinned under their own dropdown (order: dropdown1 → chips1 → dropdown2 → chips2).
- [x] 2b.5 Removing "Other(s)" (deselect or delete its chip) hides the second dropdown AND clears its selection (`otherCentersSelected = []`).
- [x] 2b.6 Verified each of the above via Playwright on a served prod build.

## 3. DEFERRED — SAVE (do NOT forget)

- [ ] 3.1 Design the persistence with Juan David: how dropdown 1 + dropdown 2 merge into `contributing_center[]`; whether a `from_toc` flag / new shape is needed.
- [ ] 3.2 Auto-preselect all reference centers at load ("all reference chosen at the beginning") — tied to 3.1.
- [ ] 3.3 "At least one CGIAR Center" validation + Lead-center reposition fine-tuning.
- [ ] 3.4 Wire PATCH and re-verify save + green-check + lead-center recalculation.

## 4. QA (after save)

- [ ] 4.1 2026: dropdown 1 only TOC centers, Other(s) reveals the rest; 2025 unchanged (single dropdown).
