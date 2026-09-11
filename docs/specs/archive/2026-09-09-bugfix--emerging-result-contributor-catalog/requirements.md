# Requirements — Emerging Result: full CGIAR Center / Science Program catalogue

## 1. Document Control

| Field | Value |
|---|---|
| Module | `bugfix/emerging-result-contributor-catalog` |
| Depth | **Lite** (single-component, single-signal-gating logic fix) |
| Bug Mode | **Yes** — see `proposal.md` §9 Bug Diagnosis for the confirmed root cause |
| Owner | Frontend (client) |
| Status | draft |
| Ticket(s) | — (reported via screenshot/QA session, no Jira ticket provided) |

## 2. Context

`AowHloCreateModalComponent` ("Report emerging result" / "Report result" modal, `entity-details/:entityId/aow`) offers two multiselect fields — **Contributing CGIAR Centers** and **Contributing Science Programs/Accelerators** — that are meant to split into "ToC-derived" (dropdown 1) + "Other(s)" (dropdown 2) **only when the report is for a specific ToC indicator** (`P2-3114`/`P2-2998`). When the report is for an **emerging (unplanned) result** — opened via `openReportResultModal(item, null, ...)`, which sets `indicators: []` — the two preselect methods (`preselectTocCenters`, `preselectTocSciencePrograms`) still read the **node-level** ToC fields (`toc_partner_institution_ids`, `contributing_synergy_program_initiative_ids`), which are present regardless of indicator selection. This makes `hasReferenceCenters()`/`hasReferenceScience()` come back `true`, so the app renders dropdown 1 (ToC + "Other(s)" sentinel) instead of the full-catalogue dropdown the `@else` branch already provides — and since the matched ToC entries are simultaneously preselected as chips, the dropdown panel has nothing left to offer except the unselected "Other(s)" sentinel.

Reference: `proposal.md` (this folder) §9 Bug Diagnosis, §10/§11 Approach.

## 3. In Scope / Out of Scope

### In scope

- Gate `preselectTocCenters()` / `preselectTocSciencePrograms()` on whether an indicator is actually being reported (`entityAowService.currentResultToReport()?.indicators?.length > 0`).
- Regression test proving both flows behave correctly.

### Out of scope

- `rd-contributors-and-partners` (Result Detail Contributors & Partners tab) — flagged as an open question in `proposal.md` §12, not assumed to share the defect.
- Any change to the ToC/Other split behavior for indicator-based reports.
- Backend/API changes.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Reporting an emerging (unplanned) result now offers the full CGIAR Center / Science Program lists directly, without an extra "Other(s)" click. |

## 5. User Stories

- **`ERC-US-1`** — As a result submitter reporting an emerging (unplanned) result, I want the Contributing CGIAR Centers and Contributing Science Programs dropdowns to show every option directly, so that I don't have to discover and click "Other(s)" to find real values.

## 6. Functional Requirements

### Required (MUST)

- **`ERC-R-1`** When `entityAowService.currentResultToReport()?.indicators` is empty (the emerging/unplanned report flow), the system MUST NOT populate `tocCenters()` or `tocSciencePrograms()` from node-level ToC fields (`toc_partner_institution_ids`, `contributing_synergy_program_initiative_ids`), even when those fields are non-empty on the node.
- **`ERC-R-2`** When `tocCenters()` / `tocSciencePrograms()` are empty, the modal MUST render the full-catalogue dropdown for CGIAR Centers / Science Programs directly (existing `@else` template branch), with no "Other(s)" sentinel step.
- **`ERC-R-3`** When `entityAowService.currentResultToReport()?.indicators` is non-empty (the indicator/ToC-linked report flow), the system MUST preserve today's behavior exactly: `preselectTocCenters()` / `preselectTocSciencePrograms()` still match node-level ToC fields, and the ToC (dropdown 1) + "Other(s)" (dropdown 2) split renders as before.

### Should (SHOULD)

- **`ERC-R-10`** The fix SHOULD live entirely inside the two `preselectToc*` methods (no new inputs/signals), per `proposal.md` §10 Option A, to keep the change minimal and avoid new state to keep in sync.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | Indicator-based ("ToC") reporting flow MUST be pixel/behavior-identical to today (`ERC-R-3`). |
| **Test coverage** | Client Jest coverage stays ≥ 50/60/60/60 (unaffected — this file is not in the coverage-excluded list). |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `ERC-AC-1` | The modal opens with `currentResultToReport().indicators = []` and node-level `toc_partner_institution_ids: [100]`, `contributing_synergy_program_initiative_ids: [51]` (emerging flow, matching the bug repro) | The component initializes (`ngOnInit`) | `tocCenters()` and `tocSciencePrograms()` are both `[]`; `hasReferenceCenters()` and `hasReferenceScience()` are both `false`; the rendered dropdowns are the full-catalogue ones (no "Other(s)" sentinel, no ToC preselection chips). |
| `ERC-AC-2` | The modal opens with `currentResultToReport().indicators` containing one indicator, and the same non-empty `toc_partner_institution_ids` / `contributing_synergy_program_initiative_ids` (indicator/ToC flow, unchanged case) | The component initializes | `tocCenters()` / `tocSciencePrograms()` match the ToC ids as today; `hasReferenceCenters()` / `hasReferenceScience()` are `true`; dropdown 1 (ToC + "Other(s)" sentinel) renders as today. |

Cross-cutting project ACs that already apply (not restated): `AC-1` Typed result integrity, `AC-6` Evidence and ToC alignment at submit.

## 9. Dependencies & Assumptions

### Upstream dependencies

- `CentersService` (CLARISA centers catalogue) and `api.resultsSE.GET_AllInitiatives('p25')` (Science Programs catalogue) — both already fetched unconditionally today; no change needed.

### Assumptions

- **User-confirmed (2026-09-09):** `openReportResultModal(item, currentItemId, targetId)` in `aow-hlo-table.component.ts` is the **only** caller that opens this modal with `indicators: []` for an otherwise ToC-linked node. This resolves the risk noted in `proposal.md` §12 — no grep/verification step is needed during implementation; `ERC-T-1`'s pre-flight grep is downgraded from "confirm" to a cheap sanity check only.

## 10. Open Questions

- `ERC-OQ-1` — **Closed, out of scope by explicit user instruction (2026-09-09):** "nada de lo que está dentro de Contributors and Partners debe de ser tocado" — `rd-contributors-and-partners` MUST NOT be touched by this spec under any circumstance, confirmed or not. No follow-up spec is implied by this spec; a separate spec would need its own explicit request.

## 11. Out-of-Band Notes

None.

## Required cross-references

- `proposal.md` (this folder) — Bug Diagnosis, Approach Options, Recommended Approach.
- `docs/specs/changes/toc-center-guard`, `docs/specs/changes/toc-science-program-guard` — the ToC/Other split this spec must NOT disturb for the indicator-based flow.
- `docs/specs/kaizen/bugfix--lead-center-full-catalog.md` — `KZ-bugfix--lead-center-full-catalog-1` (verification commands must include `ng build`, not only Jest, for the same component family).
