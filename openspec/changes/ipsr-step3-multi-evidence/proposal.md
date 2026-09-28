## Why

P2-3824 (reported by business, epic P2-2338): in an innovation package, Step 3 "Package and Assess" only accepts ONE evidence link per level, and users upload files to their personal SharePoint. The PO (Ángel, 25-Sep-2026, "option B is the correct option") wants IPSR to work like the Evidence section of a regular result: several pieces of evidence, links or files uploaded to the PRMS repository, each tagged with the Impact Area it supports. The P2-3210 delivery put the Impact Area evidence under each score in General information, which the PO confirmed is not what was asked.

**Full-stack.** Backend is included on purpose: `reporting/CLAUDE.md` R14/R25 (2-Sep-2026) allow simple backend work and simple additive migrations; this supersedes the older openspec config rule that hands all server work away. Juan David (backend owner) reviewed the approach by Slack on 25-Sep and handed the ticket back to us. The SQL green-check function is NOT changed (R31: the live function must be read first, which needs VPN + Yeck's OK).

## What Changes

- Step 3, core innovation and every complementary innovation / enabler, readiness level and use level: the single "Evidence link" (+ "details") becomes an evidence list with "Add evidence" (link or file uploaded to the PRMS repository, shared publicly yes/no, details up to 50 words, Impact Area tags + Innovation Use tag). Maximum 6 pieces of evidence per component (both levels together).
- Step 3 shows an alert for every Impact Area scored 2 (Principal) in General information that has no tagged evidence anywhere in Step 3.
- General information (P25): the per-score "Evidence" box added by P2-3210 is removed; the score-2 note points to Step 3. Older portfolios keep their behaviour.
- Backward compatibility: the first evidence of each level is also written to the legacy columns (`readinees_evidence_link`, `readiness_details_of_evidence`, `use_evidence_link`, `use_details_of_evidence`), so the green check, the bilateral payload and phase replication keep working unchanged. A package with only a legacy link shows it as its first evidence.
- Data: additive migration — new `evidence_types` row `ipsr_step_three` and a new child table `result_ip_step_three_evidence` (component + level per evidence). The shared `evidence` table/entity is not altered.
- The P2-3210 Impact Area evidence lookups only read rows with no evidence type, so Step 3 rows never collide with them.

## Capabilities

### New Capabilities
- `ipsr-step3-evidence`: multi-evidence list per component and level in IPSR Step 3, SharePoint upload, Impact Area tags, score-2 alert, legacy compatibility.

### Modified Capabilities
- (none — no existing spec covers IPSR Step 3 or the IPSR General information evidence box)

## Impact

- Server: `api/ipsr/innovation-pathway/innovation-pathway-step-three.service.ts` (GET/PATCH step three), `api/results/evidences` entity + repository (new columns), `api/ipsr-framework/ipsr_general_information/ipsr_general_information.service.ts`, `api/ipsr/result-innovation-package/result-innovation-package.service.ts`, `api/ipsr/ipsr.repository.ts` (type filter), new migration.
- Client: `pages/ipsr/.../step-n3/**` (core + complementary), new evidence-list component, `ipsr-general-information` component, `results-api.service.ts` (no new endpoint: upload session reuses `POST_createUploadSession` with the package result id).
- Baseline: `docs/trd/trd.md` (IPSR module, evidence data model), `docs/ux-ui/design.md` §8 components. Contract: `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` unchanged (legacy fields still filled).
