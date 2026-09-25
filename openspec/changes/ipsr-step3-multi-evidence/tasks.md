## 1. Backend (onecgiar-pr-server) — included per reporting/CLAUDE.md R14/R25

- [ ] 1.1 Hand-written additive migration `src/migrations/<ts>-IpsrStepThreeEvidence.ts`: insert `evidence_types` id 7 `ipsr_step_three` if missing; create child table `result_ip_step_three_evidence` (no change to `evidence`); guarded `down`
- [ ] 1.2 `shared/constants/evidence-type.enum.ts`: add `IPSR_STEP_THREE = 7` (the `Evidence` entity stays untouched)
- [ ] 1.3 `api/results/evidences/evidences.repository.ts`: `getIpsrStepThreeEvidences(resultId)` (same SELECT + sharepoint join, type 7) and `deactivateIpsrStepThreeEvidences(resultId, rbipId, level, keepIds, userId)` (parameterised)
- [ ] 1.4 `api/results/evidences/evidences.service.ts`: `saveIpsrStepThreeEvidences(result, rbipId, level, items, user)` reusing `_applyEvidenceInputFields` + `saveSPData`; returns first saved link/description
- [ ] 1.5 `api/ipsr/innovation-pathway/innovation-pathway-step-three.service.ts`: save lists per component+level (cap 6 per component, duplicate-link check), then dual-write first evidence to legacy columns; GET adds `readiness_evidences`, `use_evidences` (legacy fallback) per component and `principal_impact_areas`
- [ ] 1.6 P2-3210 lookups filtered to `evidence_type_id IS NULL`: `api/ipsr-framework/ipsr_general_information/ipsr_general_information.service.ts`, `api/ipsr/result-innovation-package/result-innovation-package.service.ts`, `api/ipsr/ipsr.repository.ts`
- [ ] 1.7 Jest specs for 1.3-1.6; `npx tsc --noEmit`, eslint, jest green

## 2. Frontend (onecgiar-pr-client)

- [ ] 2.1 `pages/ipsr/.../step-n3/components/ipsr-step3-evidence-list/` standalone component + `ipsr-step3-evidence-list.copy.ts`: list, "Add evidence" dialog (link/upload, public yes/no, IA + Innovation Use tags, 50-word details), remove, disabled at cap
- [ ] 2.2 `step-n3/step-n3.component.html|ts`: replace core readiness/use "Evidence link" + details with the list; alerts for `principal_impact_areas` without tagged evidence; upload pending files via `SharepointUploadService` before PATCH; stop sending legacy fields
- [ ] 2.3 `step-n3/components/step-n3-complementary-innovations/*`: same for each enabler; `allFieldsRequired()` counts list length instead of legacy link
- [ ] 2.4 `step-n3/model/Ipsr-step-3-body.model.ts`: `readiness_evidences`, `use_evidences`, `principal_impact_areas`
- [ ] 2.5 `pages/ipsr/.../ipsr-general-information/ipsr-general-information.component.ts|html`: P25 hides the Impact Area evidence box; older portfolios unchanged
- [ ] 2.6 Jest specs (behaviour + markup); `npm run build:dev`, `ng lint`, jest green

## 3. Verification

- [ ] 3.1 Local client against a local server (VPN needed — ask Yeck) or code-level verification if not authorised
- [ ] 3.2 UI steps in prtest after deploy: package → Step 3 → add link + upload file + tag Gender → save → reload → evidences persist, alert clears; General information shows no evidence box
