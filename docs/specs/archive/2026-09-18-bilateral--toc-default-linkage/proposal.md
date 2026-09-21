# Proposal — Bilateral ToC Question: Default Project Linkage First, Detail On Demand

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/bilateral/toc-default-linkage` |
| **Slug** | `toc-default-linkage` — derived from free-text argument (module folder `bilateral/` chosen because the change is bilateral-only) |
| **Type** | Change |
| **Approval Mode** | gated (default) |
| **Date** | 2026-09-18 |
| **Requester** | Nicoleta Trifa (via the team) |
| **Depends on** | none (project-to-ToC linkage already exists in `Integration_information`, see §3) |
| **Parallel-safe** | yes vs `changes/multi-hlo-result-linking` (that spec touches the classic `multiple-wps` component; this one touches `pages/bilateral/components/section-toc` and `BilateralCenterService`) |

## 2. Intent

Centers often do not know how a bilateral result links to the Program's ToC. Instead of asking them to build the link from scratch, show them how the **project** is already linked to the Program's ToC, and let them either keep it or refine it.

## 3. Problem / Current Behavior

Confirmed in code (2026-09-18):

- Bilateral result creator, section 2 (`section-contributors` embeds `section-toc`): Primary SP badge (read-only, "Assigned from the project's mapping; it cannot be changed here") -> checkbox "I'm not sure, the P/A will complete the ToC mapping" -> Yes/No "Can this result be mapped to a ToC KPI?".
  - Yes -> Level -> ToC result (AoW/HLO/EOI) -> Indicator -> Target (read-only) -> contribution value -> narrative.
  - No -> required "Why is this result being reported?" text.
- Persisted through `PATCH /api/bilateral/center/toc-mapping/:resultId` (`BilateralCenterService.saveTocMapping` -> `ResultsTocResultsService.updateTocResultPartial`) into `results_toc_result`, `results_toc_result_indicators`, `result_indicators_targets`. Read back with `GET /api/bilateral/center/toc-state/:resultId`.
- The "I'm not sure" checkbox lives only in `sessionStorage`; the server never sees it.
- The entire ToC block is `optional: true` in the submit checklist (PO decision, 2026-09-09): it never gates "Submit for review".
- Project-level data in the PRMS DB is SP-level only (`clarisa_project_mappings`: project, program, allocation %). Nothing there says which AoW/HLO/indicator a project contributes to.
- Per the team (2026-09-18), projects **are** linked to ToC nodes and indicators in the `Integration_information` schema (`env.DB_TOC`). Confirmed by DB inspection and existing code:
  - `toc_result_projects` (`id`, `project_id`, `name`, `project_summary`, `start_date`, `end_date`, `creation_date`, `toc_result_id_toc`) links a project to a ToC node. Already joined in `aow-bilateral.repository.ts` (`findBilateralProjectById` L905-935, `findBilateralProjectsByProgramOfficialCode` L937-970) as `trp.toc_result_id_toc = tr.related_node_id` and `clarisa_projects.id = trp.project_id`, so **`project_id` is the CLARISA project id**.
  - `toc_result_indicator_target` carries a `project_id` column, so targets can be project-specific.
  - Existing queries only go node -> projects (used by the AoW/bilateral views). The reverse (project -> its nodes, indicators and targets) is what this change needs and does not exist yet.
  - `toc_result_synergy_programs` (`cgiar_project`, `project_state`) also matched the discovery query but is about synergies between programs, not this linkage.

## 4. Proposed Outcome

For bilateral results only, the ToC question becomes a two-step decision:

1. **Default shown first.** "This is how the project has been linked to this Program's ToC", listing the project's linked ToC node(s) and indicator(s) with details underneath (level AoW/HLO/EOI, node name, indicator, target).
2. **Question:** "Do you want to leave the ToC linkage as is or go further and select more details?"
   - **YES** = leave as is. Nothing else is asked and the result keeps the project's linkage.
   - **NO** = "I would like to link it to the Program's ToC deliverable". The existing Level / ToC result / Indicator / Target / contribution flow appears, with the rule from pooled: result typology must match indicator typology.

## 5. Scope

- **Server:** new reverse read in `aow-bilateral.repository.ts` (project_id -> `toc_result_projects` -> `toc_results` by `related_node_id` and phase -> `toc_results_indicators` -> `toc_result_indicator_target` filtered by `project_id`), exposed with the toc-state payload (or a sibling endpoint); persist the YES/NO decision; typology-match validation on the NO path (shares the rule with `multi-hlo-result-linking`).
- **Client:** rewrite the head of `section-toc` (default block + leave-as-is question); keep the current detail form as the NO branch; drop or repurpose the "I'm not sure" checkbox (see open questions).
- **Data:** likely one new persisted field for the decision (e.g. a mode on `results_toc_result`) via TypeORM migration; no migration if the decision is derived instead. Decide in `/akili-specify`.
- **Docs:** update `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` change log if any `/api/bilateral/*` payload changes.

## 6. Non-Goals

- Classic W1/W2 ToC screen (`rd-contributors-and-partners` / `multiple-wps`): untouched.
- Creating or editing the project-to-indicator linkage: it is read-only here, owned by `Integration_information`.
- Changing Primary SP assignment (`primary-assignment` endpoint) or contributing-SP consent flow (`share_result_request`).
- Making the ToC block gate submission (stays optional).
- Backfilling historical bilateral results.

## 7. Affected Users, Systems, And Specs

- **Users:** center staff creating bilateral results; P/A reviewers who today finish the ToC mapping.
- **Client:** `onecgiar-pr-client/src/app/pages/bilateral/components/section-toc/`, `section-contributors/`, `services/bilateral-auto-save.service.ts`.
- **Server:** `src/api/bilateral/` (controller, `BilateralCenterService.getTocState/saveTocMapping`, DTOs), `src/api/results/results-toc-results/`, `src/toc/toc-results/`.
- **DB:** `Integration_information` (read), `results_toc_result` (+ children), `results_by_projects`, `clarisa_projects`.
- **Specs:** `changes/multi-hlo-result-linking` (shared typology rule), `bilateral/*` family.

## 8. Visual Reference

- Source: None (screenshot of the current screen provided in conversation only).
- Location: n/a
- Notes: UI surface exists; a mockup of the default block + YES/NO is worth generating at `/akili-specify` (Spartan components, per team preference).

## 9. Requirement Delta Preview

### ADDED
- Default project-to-ToC linkage block on the bilateral result.
- "Leave as is / go further" question with persisted answer.
- Typology-match validation on the NO path (server + client).

### MODIFIED
- "Can this result be mapped to a ToC KPI?" is replaced by the leave-as-is question; the detail form becomes the NO branch.
- `toc-state` payload gains the project default and the decision.

### REMOVED
- Client-only "I'm not sure, the P/A will complete the ToC mapping" checkbox, unless the requester confirms it must stay (open question).

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. Derive at read time (recommended)** | Join `Integration_information` by `project_id` on every `toc-state` read; YES stores only the decision, no copied rows. | Always current if the project mapping changes; small schema footprint. Needs the decision persisted and a rule for what a report shows when the mapping later changes. |
| **B. Copy on YES** | On YES, materialize the project's nodes into `results_toc_result` rows. | Downstream reports keep working unchanged; but stale if the project mapping changes and duplicates data. |
| **C. Wording-only** | Change the copy and order without any project data. | No data dependency, but does not deliver the requested default. |

**Recommended: A**, with B revisited only if reporting needs rows in `results_toc_result` for YES results.

> Superseded in part by `design.md` BIL-TOC-DD-2 (2026-09-18): the default is still read from `Integration_information` at load time, but YES also writes one node row per default node (no indicator rows), because readers of `results_toc_result` would otherwise see YES results as unmapped.

**Join key (resolved):** `project_id` (= `clarisa_projects.id`, `toc_result_projects.project_id`), never the project name. `toc_result_projects.name` is a display label only. Existing code already joins on `project_id`.

## 11. Risks, Dependencies, And Open Questions

| # | Item | Blocks |
|---|---|---|
| OQ-1 | ~~Which table links project to indicator?~~ Resolved: `toc_result_projects` (project -> node) and `toc_result_indicator_target.project_id` (project-specific targets). Still to verify with a sample query (hand-off): is `toc_result_indicator_target.project_id` NULL for non-project targets, can one project have several nodes/indicators, and does `toc_result_projects` hold rows per phase or only current ones? | Design |
| OQ-2 | A project can link to several indicators/nodes: show all, and does YES accept all of them? Multi-project results (`results_by_projects`, lead project) — which project drives the default? | Requirements |
| OQ-3 | Does the project link also cover the result's Primary SP (project linked to nodes of a different Program than the result's SP)? Filter by primary SP's ToC? | Requirements |
| OQ-4 | Typology rule: same `indicator_type_id`, or broader? (also open in `multi-hlo-result-linking`) | Design |
| OQ-5 | What does YES mean for reporting: does the result count toward the project's indicators, and how do QA/reports read it if nothing is stored in `results_toc_result`? | Design |
| OQ-6 | Keep the "I'm not sure, the P/A will complete" path? It is client-only today. | Requirements |
| OQ-7 | Projects with no linkage in `Integration_information`: fall back to the current Yes/No form? | Requirements |

Risks: cross-schema read cost and permissions on `Integration_information`; existing tests for `section-toc` and `results-toc-results.service` will need updates (run scoped Jest before any commit); bilateral payload stability (AC-4) if `toc-state` shape changes.

## 12. Success Criteria

- A bilateral result whose project has a ToC linkage shows the default block, and answering YES leaves the result linked with no further input.
- Answering NO reveals the detail flow, saves as today, and blocks indicators whose typology differs from the result's.
- A project without linkage still works through the NO-style form.
- Classic (non-bilateral) ToC screens behave exactly as before.

## 13. Next Step

Optionally confirm the OQ-1 sample checks, then:

```text
/akili-specify bilateral/toc-default-linkage
```
