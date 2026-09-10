# Proposal — AoW Selector When Reporting an Intermediate Outcome Result

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/results/intermediate-outcome-aow-visibility/aow-selector` |
| **Parent Spec** | `docs/specs/results/intermediate-outcome-aow-visibility/` |
| **Type** | Change |
| **Approval Mode** | gated (default) |
| **Date** | 2026-08-26 |
| **Requester** | santiago.sanchez@cgiar.org (chat request, no Jira ticket) |

## 2. Intent

When a user reports a result against an **Intermediate Outcome** indicator, let them pick which **Area of Work (AoW)** the contribution should be attributed to, instead of the system leaving that attribution implicit (or absent) because Intermediate Outcomes are transversal by design.

## 3. Problem / Current Behavior

Confirmed in code: Intermediate Outcomes are modeled as a program-level bucket, not tied to any single AoW (`dashboard-lab.component.ts` `reportingGroups()` — dedicated `GET_IntermediateOutcomes` endpoint, no `areaOfWork` filter; `aow-bilateral.repository.ts` `findIntermediateOutcomes` / `buildTocQuery` selects no AoW column for these rows). The two result-creation surfaces reflect this:

- **`lab-report-form`** (aside, used from the Reporting tab / `tocView=aows`) — builds its payload in `create-result-payload.util.ts` from `tocNode` + `indicator`; there is no AoW field anywhere in that payload today.
- **`aow-hlo-create-modal`** (legacy modal, `entity-aow` flow) — sends a single `toc_result_id` fixed to whichever ToC node opened the modal; also no AoW field.

Net effect: a result reported against an Intermediate Outcome carries no record of which AoW the submitter intended it for, even though PMU reporting and the Reporting tab's per-AoW progress bars would benefit from that attribution.

## 4. Proposed Outcome

When the result being reported has an Intermediate Outcome indicator (i.e. it comes from the `intermediate` bucket / is not tied to a single AoW), the creation surface shows an **AoW selector** (dropdown, `app-pr-select` per the client's component rules) listing the Areas of Work the user can attribute this contribution to. The selection is included in the create-result payload.

## 5. Scope

- **Client**: `lab-report-form.component.{ts,html}` — add the AoW `app-pr-select`, gated on the indicator being an Intermediate Outcome; wire the selection into `create-result-payload.util.ts`.
- **Client (legacy parity, if still in active use)**: `aow-hlo-create-modal.component.{ts,html}` — same addition, so both creation surfaces stay consistent. Confirm at `/akili-specify` whether this modal is still reachable for Intermediate Outcomes or fully superseded by `lab-report-form`.
- **Server**: a way to list the AoWs valid for a given `toc_result_id` / program (new query param on an existing endpoint, or a new lightweight endpoint — TBD at `/akili-specify`), and accepting the selected AoW on `POST /api/results-framework-reporting/create` (or its v2 equivalent).
- **Data**: whatever field carries "the AoW this contribution counts toward" — likely a new column/relation on the result-toc-result link, or reuse of an existing but unused field. Needs a `software-architect`-skill pass at `/akili-specify` before committing to a shape.

## 6. Non-Goals

- Not changing how HLO or 2030 Outcome results are attributed — they already have an unambiguous AoW (HLO) or are program-wide by design (2030).
- Not retrofitting AoW attribution onto **already-reported** Intermediate Outcome results — this proposal is forward-looking only, unless the user asks for a backfill separately.
- Not changing the per-AoW progress-bar math (`ratioOf`, `figure` in `reporting-aow-table` — explicitly flagged "don't touch" in that component's `CLAUDE.md`) — that stays a separate, already-open product question (P2-3405).

## 7. Affected Users, Systems, And Specs

- **Users**: result submitters (P/A) reporting against Intermediate Outcome indicators; PMU leads reading AoW-scoped progress.
- **Client code**: `dashboard-lab/components/lab-report-form/`, `dashboard-lab/shared/report-result/create-result-payload.util.ts`, possibly `entity-aow/.../aow-hlo-table-create-modal/`.
- **Server code**: `results-framework-reporting.service.ts` / `.controller.ts`, `aow-bilateral.repository.ts` (or sibling repository), the result-creation endpoint in `onecgiar-pr-server/src/api/results/` — exact files confirmed during `/akili-specify`.
- **Specs**: none pre-existing; this is the first spec under `docs/specs/results/`.

## 8. Visual Reference

- Source: User-provided screenshot (result-creation surface, dropdown for AoW selection — described in chat, not saved as a file).
- Location: none persisted.
- Notes: recommend generating a quick mockup (Stitch or a self-contained HTML sketch) at `/akili-specify` time to pin down exact placement in `lab-report-form`'s field order (`missingFields()` ordering matters for the "N fields left" counter — see that component's `CLAUDE.md`).

## 9. Requirement Delta Preview

### ADDED Requirements
- A result-creation flow for an Intermediate Outcome indicator shows an AoW selector.
- The selected AoW is persisted with the created result / its ToC contribution link.
- An endpoint (new or extended) returns the list of AoWs valid for a given Intermediate Outcome ToC node.

### MODIFIED Requirements
- `create-result-payload.util.ts` payload shape gains one field (name TBD, e.g. `area_of_work_code`) when reporting an Intermediate Outcome.
- The `POST` create-result endpoint accepts and stores that field.

### REMOVED Requirements
- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. New lightweight endpoint: "AoWs for a ToC node"** | `GET .../toc-results/:tocResultId/areas-of-work` (or a query param on an existing list endpoint) returns the program's AoW list (already fetched elsewhere as `entityAows` / `plannedFilteredAows()`), and the client just needs to know it's allowed to show all of them for any Intermediate Outcome (since by definition they are transversal — there may be no need to *filter* which AoWs are valid, only to let the user pick from the program's full AoW list). | Simplest if "valid AoWs" == "all AoWs in the program" (likely true, given IOs are program-wide by design) — in which case **no new endpoint is needed at all**, the client already has the AoW list loaded (`plannedFilteredAows()` / `entityAows`) and can reuse it client-side. |
| **B. Backend-validated candidate list per ToC node** | Only if some Intermediate Outcomes are in practice linked to a constrained subset of AoWs (needs confirmation against the ToC data model — `related_node_id` / work-package joins). | More correct if the constraint exists, but adds a new endpoint for a constraint that may not exist. Confirm with a BA/backend dev before building this. |

**Recommended: start with Option A's cheaper path — reuse the already-loaded AoW list** — and only build a filtered endpoint (Option B) if `/akili-specify`'s data-model review finds Intermediate Outcomes are in practice scoped to a subset of AoWs, not the full program list. This avoids over-building a validation layer for a constraint that may not exist.

## 11. Risks, Dependencies, And Open Questions

- **Open question (blocking design, not blocking this proposal)**: does the data model support "an Intermediate Outcome contribution counts toward exactly one AoW", or could a single reported result reasonably count toward more than one? Confirm with a BA/product owner before `/akili-specify` finalizes the payload shape — this changes whether the selector is single- or multi-select.
- **Open question**: where does the selected AoW get stored? Options include a new column on the result↔toc-result link table, or reusing/extending an existing field. Needs a `software-architect` pass.
- **Dependency**: none on the `target-tooltip` sibling spec — they can ship in either order.
- **Risk**: `lab-report-form`'s `missingFields()` drives the "N fields left before you can create" counter and `canSave()`. If the AoW selector becomes mandatory, it must be added to that array or the save-gating logic silently ignores it (see that component's own `CLAUDE.md` gotchas).
- **Risk**: two creation surfaces exist (`lab-report-form` and the legacy `aow-hlo-create-modal`). Confirm at `/akili-specify` whether the modal is still reachable for Intermediate Outcomes, to avoid building the selector twice or, worse, building it in only one and leaving the other inconsistent.

## 12. Success Criteria

- Reporting a result against an Intermediate Outcome indicator lets the user choose an AoW, and that choice is visible on the created result / persisted in the backend.
- Reporting against an HLO or 2030 Outcome indicator shows no such selector (unchanged behavior).
- Existing Jest/Cypress suites for `lab-report-form`, `create-result-payload.util`, and the create endpoint stay green; new tests cover the added field.

## 13. Next Step

```text
/akili-specify results/intermediate-outcome-aow-visibility/aow-selector
```

Recommend opening this in **Bug/Change standard depth** (not Bug Mode) — this is new capability, not a regression — and using the `software-architect` skill during `design.md` to settle the data-model question in Risks before task breakdown.
