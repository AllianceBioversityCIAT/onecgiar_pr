## 1. AC1 — Section title

- [ ] 1.1 In `entity-details.component.html` (~line 73), change the card header from `Results planned in your {{ entityAowService.reportingPhaseYear }} ToC` to `Report Results Linked to Program's {{ entityAowService.reportingPhaseYear }} ToC` (keep the dynamic year interpolation; drop the leading "your " and the extra space).

## 2. AC2 — Remove pop-up field

- [ ] 2.1 In `aow-hlo-create-modal.component.html` (~lines 96–115), remove the TOC-pathway block: the preceding `separator` div, the `app-pr-field-header` label, the `app-alert-status` info helper, and the `app-pr-textarea` bound to `createResultBody().toc_progressive_narrative`.
- [ ] 2.2 Confirm no TS change is needed: `toc_progressive_narrative` stays initialized `''` and is still included in the save payload; verify the modal has no leftover reference to the removed control.

## 3. AC4 — Trim redundant "indicators"

- [ ] 3.1 In `rd-contributors-and-partners.component.ts` `tocQuestionInfoNote` computed, CP2026 branch (~line 114), change "…being reported outside the 2026 TOC KPI/indicators." to "…being reported outside the 2026 TOC KPI." (remove only `/indicators`; leave "KPI and indicator" and "indicator target"; do not touch the 2025 branch).

## 4. AC6 — Contribution-to-target completion fix

- [ ] 4.1 In `multiple-wps.component.ts` `completnessStatusValidation(tab)` (~lines 176–182), compute a `contributionFilled` boolean from `tab.indicators[0].targets[0].contributing_indicator` using the same 3-way empty-check (`!== null && !== undefined && !== ''`) used in `multiple-wps-content.component.html`.
- [ ] 4.2 Gate the new condition to where the field is mandatory (CP2026 + a KPI indicator selected, i.e. `related_node_id` set) and AND it into the green result, so IPSR/bilateral/2025/share-request/no-indicator contexts keep their current completion behavior.

## 5. AC3 — ToC question copy (text only)

- [ ] 5.1 In `rd-contributors-and-partners.component.ts` `tocQuestionLabel` computed, CP2026 branch (~line 108), change `'Can this result be mapped to a planned TOC KPI or indicator?'` → `'Can this result be mapped to a ToC KPI?'`. Do NOT touch the 2025 branch, the planned/unplanned logic, or the duplicate copies in IPSR/share-request/bilateral (confirmed by Santi: text-only, C&P only).

## 6. AC5 — External Partners ToC-inheritance banner

- [ ] 6.1 In `rd-contributors-and-partners.component.ts`, add `externalPartnersInfoNote = 'Partner information is inherited/sourced from the HLO/Outcome level in the ToC.'` near the other ToC info-note properties.
- [ ] 6.2 In `rd-contributors-and-partners.component.html`, render `<app-alert-status [description]="externalPartnersInfoNote">` above the External Partners selectors (~line 393), gated `@if (isCP2026())` so it shows only in P25 2026 and not in the shared IPSR selector.

## 7. Verify

- [ ] 7.1 Run `npm run build` on the client (no new errors).
- [ ] 7.2 Manual check (client on prtest backend): AC1 header text; AC2 field gone from Report-result pop-up + save still works; AC3 question reads "Can this result be mapped to a ToC KPI?" and Yes/No still behaves as before; AC4 note reads "…KPI." ; AC5 banner shows in P25 External Partners and not in IPSR; AC6 tab red with empty contribution / green when filled on a CP2026 result, unchanged on a reuse context.
