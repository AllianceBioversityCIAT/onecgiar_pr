## Context

IPSR Step 3 stores one evidence link (+ details) per level per component in `result_by_innovation_package` (`readinees_evidence_link`, `readiness_details_of_evidence`, `use_evidence_link`, `use_details_of_evidence`; `ipsr.entity.ts:49-60,105-116`). One row per component: core (`ipsr_role_id=1`) and each complementary innovation (`=2`). Readers that depend on those columns today: green check v1 (`results-innovation-packages-validation-module.repository.ts:712-727,931-942`), green check P25 SQL `validation_ipsr_step_three_P25` (`CreatIPSRGreen.ts:342-357,561-572`), bilateral payload (`bilateral.service.ts:2839-2867`), phase replication (`ipsr.repository.ts:26-117`), step 1 save echo (`innovation-pathway-step-one.service.ts:553`), client complementary check icon.

Results already have the target behaviour: `evidence` rows (`evidence.entity.ts`) with tag flags, `evidence_sharepoint` for uploaded files, save = soft replace-all scoped by `(result_id, is_supplementary, evidence_type_id)` (`evidences.repository.ts:320-368`), upload via `POST results/evidences/createUploadSession` + `SharepointUploadService.uploadPending`. The SharePoint folder is computed from the result's phase and code, and works for an IPSR result (type 10).

P2-3210 writes General-information Impact Area evidence as `evidence` rows on the package result with `evidence_type_id = NULL` and reads them back with no type filter (`ipsr_general_information.service.ts:313-366`, P22 twin `result-innovation-package.service.ts:814+`, `ipsr.repository.ts:368-493`).

## Goals / Non-Goals

**Goals:** evidence list per component+level in Step 3 (link/upload, public, details, IA + Innovation Use tags), max 6 per component, score-2 alert in Step 3, P25 General information box removed, zero change for any reader of the legacy columns.

**Non-Goals:** changing `validation_ipsr_step_three_P25` or any SQL function (needs the live function, R31); bilateral payload with the full list; replicating Step 3 evidence rows to a new phase with their component link; PDF.

## Decisions

1. **Store in `evidence`, new type `ipsr_step_three` (id 7, inserted with explicit id, guarded).** Reuses tags, SharePoint and `saveSPData`. Alternative (new child table) rejected: duplicates SharePoint + tags plumbing and would need its own upload flow.
2. **Component and level in a CHILD table `result_ip_step_three_evidence` (evidence_id unique, result_by_innovation_package_id, ipsr_evidence_level, is_active)** — not as columns on `evidence`. `Evidence` is read/written by the whole platform (every `find`/`save` + the phase replication of every result): a column there makes code-before-migration break the Evidence section of ALL results. With the child table, only IPSR Step 3 queries name it (reporting/CLAUDE.md R25, 25-Sep-2026). `innovation_readiness_related`/`innovation_use_related` are not reused as level flags (they are user-facing tags).
3. **Save scoped per component+level.** New repository/service methods deactivate only type-7 rows joined to the child row of component X and level L that are not in the kept list, then upsert each item (same field copy + `saveSPData` as Results). The Results replace-all is untouched.
4. **Dual write to the legacy columns (expand phase).** After saving a level's list, the server writes its first evidence (oldest by creation, i.e. list order) link and description into the legacy columns; empty list → legacy set to NULL. So both green checks, the bilateral payload and replication keep working with no change. The client stops sending the legacy fields.
5. **Read compat.** GET step three returns `readiness_evidences` / `use_evidences` per component. If a level has no type-7 rows but a legacy link, the server returns one synthetic item `{ id: null, link, description, is_sharepoint: false, legacy: true }`; saving the list persists it as a real row.
6. **Score-2 alert computed server-side.** GET step three adds `principal_impact_areas` (package result `*_tag_level_id = 3` → `gender|climate|nutrition|environment|poverty`). Client shows one alert per area with no tagged evidence in any list (core or any enabler) — the mockup behaviour.
7. **P2-3210 lookups filtered to `evidence_type_id IS NULL`** in both General information services and `ipsr.repository.ts`, so a tagged Step 3 row is never read or overwritten by a General information save. The v1 General-information green check counts any tagged evidence on the package, which Step 3 rows now satisfy — the intended B semantics.
8. **Client: new standalone `app-ipsr-step3-evidence-list`** (list + "Add evidence" dialog built from custom-fields primitives + `pr-dialog`, copy in a `*.copy.ts`). Reusing `EvidenceItemComponent` rejected: not exported, coupled to `dataControlSE.currentResult` type checks, and changing it risks the Results section.
9. **Uploads** happen on Step 3 save: pending files of every list go through `SharepointUploadService.uploadPending(items, { resultId: <package result id>, flow: 'evidences' })` before the PATCH.
10. **General information P25:** `showImpactAreaEvidenceField()` returns false for P25; the score-2 note keeps pointing to Step 3 (already does since `0bf8ee4d5`). Older portfolios unchanged.

## Risks / Trade-offs

- [Phase replication copies type-7 `evidence` rows without their child link] → the new phase still has the legacy columns (first evidence) so nothing is lost on screen; follow-up noted for the owner of versioning.
- [Green check does not yet require an IA-tagged evidence in Step 3] → front alert only; the SQL change waits for the live function (VPN + Yeck OK).
- [Live `validation_general_information_P25` may differ from the repo copy] → not verified (R31); removing the box only removes a front requirement.
- [Cap "6 per component" vs mockup counter per level — PO asked 25-Sep] → one constant `IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT` on both sides; switching to per level is a one-line change.

## Migration Plan

One hand-written additive migration: insert evidence type 7 if missing; `CREATE TABLE IF NOT EXISTS result_ip_step_three_evidence`. Down: drop the table only when empty, delete type 7 only if no evidence uses it. Deploy order: old code ignores the table; new code without the table fails ONLY on IPSR Step 3 evidence reads/saves (nothing else names it).

## Open Questions

- PO confirmation of the two points sent by Slack on 25-Sep (cap per component vs per level; tagged evidence anywhere in Step 3).
