## Why

The question *"Is this innovation linked or bundled with another CGIAR-reported result (such as another innovation or a different type of result)?"* is rendered twice in the P25 result form: in **Section 2 — Contributors and partners** and again in **Section 4 — Innovation Use info**. Beyond the visible duplication reported by business ([P2-3199](https://cgiarmel.atlassian.net/browse/P2-3199)), the two copies write to the same backing column, so saving Section 4 **overwrites the answer given in Section 2** — and when the overwritten value is `false`, the backend also deletes the linked results the user had selected there. This is silent data loss on a field users are asked to report.

This change is **frontend-only**. No server change is required or requested.

## What Changes

- Remove the duplicated question — and its dependent *"Please select a result"* multi-select — from **Section 4 (Innovation Use info)**, so the question exists only in **Section 2 (Contributors and partners)**.
- Make the Section 4 save carry a **freshly read** `has_innovation_link` / `linked_results` instead of whatever the component loaded when it was mounted, so saving Section 4 can no longer overwrite the Section 2 answer nor drop its linked results.
  - **Why not simply omit the fields?** The server endpoint evaluates `if (!has_innovation_link)` and, when falsy, calls `createForInnovationUse(resultId, [], user)` — which **wipes the linked results**. An omitted field arrives as `undefined`, which is falsy, so omitting it would delete the very data this change is meant to protect. Omission only becomes safe once the server ignores absent fields; that is a backend change and is **handed to the user / backend team**, not implemented here.
- **No behaviour change for P22 or IPSR.** The question is already hidden for P22 (`hide: isP22()`) and the IPSR innovation-use pathway renders the shared form with `isIpsr = true`, which excludes the block. Only P25 result reporting is affected.
- **Not a breaking change** for stored data: the value keeps being captured and persisted from Section 2, whose endpoint already writes the same `results_innovations_use.has_innovation_link` / `results_innovations_dev.has_innovation_link` column.

### Handed to the backend team (not implemented here)

- `PATCH /results-framework-reporting/innovation-use` treats an absent `has_innovation_link` as `false` and therefore deletes the result's linked results. The endpoint SHOULD leave both the flag and the linked results untouched when the field is not present in the payload. Evidence: `api/results-framework-reporting/innovation-use/innovation-use.service.ts` — `if (!has_innovation_link) { await this._linkedResultService.createForInnovationUse(InnUseRes.results_id, [], user); }`.

### Explicitly out of scope

- The section green check. `validation_innovation_use_P25` still requires `has_innovation_link` on the Innovation Use side, so a result may stay grey until Section 2 is answered. Santiago Sánchez validates that separately with Juan David Delgado; it is likely the same root cause as [P2-3191](https://cgiarmel.atlassian.net/browse/P2-3191) (*"Innovation Development section does not turn green"*). **This is a backend/validation concern and must not be touched here.**

## Capabilities

### New Capabilities

- `innovation-link-question-single-source` — the linked/bundled question is authored and saved in exactly one place (Section 2), and no other section may write that field.

### Modified Capabilities

None. No existing spec under `openspec/specs/` covers this behaviour.

## Impact

**Affected client code**

- `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.html` — hosts the duplicated radio button (`fieldRef="[innovation-use-form]-has-innovation-link"`) and the dependent multi-select. Shared with IPSR via `isIpsr`.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/innovation-use-info.component.ts` — builds the Section 4 payload that currently carries `has_innovation_link`.
- `onecgiar-pr-client/src/app/shared/services/fields-manager.service.ts` — holds the field definitions for both copies, including the orphan key `[contributors-partners]-is-lead-by-partner`, whose label was copy-pasted from this same question and which no template consumes.
- Co-located Jest specs for the touched components and for `fields-manager.service.spec.ts`.

**Server code (read-only, for context)**

- `api/results-framework-reporting/contributors-partners/contributors-partners.service.ts` — already persists `has_innovation_link` + `linked_results` for `result_type_id` 2 and 7. This is the surviving write path.
- `api/results-framework-reporting/innovation-use/innovation-use.service.ts` — writes the same column from the Section 4 endpoint and clears linked results when the flag is false. Not modified; the client simply stops sending the field.

**SDD baseline**

- `docs/prd.md` — result reporting completeness and data integrity.
- `docs/ux-ui/design.md` — result-detail section layout and field placement.
- `docs/trd/trd.md` — frontend/backend field ownership.

**Jira:** [P2-3199](https://cgiarmel.atlassian.net/browse/P2-3199) — requested by Santiago Sánchez Correa (27 Jul 2026). Related, not included: [P2-3191](https://cgiarmel.atlassian.net/browse/P2-3191).
