# Proposal — Emerging Result: Contributing Centers/SPs show only "Other(s)"

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/emerging-result-contributor-catalog` |
| Slug | `emerging-result-contributor-catalog` — derived from free-text argument (no slug/path token supplied) |
| Type | **Bug** |
| Approval Mode | gated |
| Date | 2026-09-09 |
| Reported by | Santiago Sánchez (QA), screenshot on `entity-details/SP01?tocView=aows` |
| Component | `AowHloCreateModalComponent` (`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/`) |

## 2. Intent

In the **"Report emerging result"** modal (achievements not planned in the program's Theory of Change), the *Contributing CGIAR Centers* and *Contributing Science Programs* dropdowns must let the user pick from the **full CLARISA catalogue** directly. The "Other(s)" gate is a mechanism for the ToC-**indicator** reporting flow only, and must not appear in the emerging-result flow.

## 3. Problem / Current Behavior

Opening a dropdown in the emerging-result modal shows a single selectable option: **"Other(s) CGIAR Centers"** (respectively **"Other(s) Science Program(s)/Accelerator(s)"**). The real centers/SPs are not visible until the user manually picks "Other(s)" to reveal a second dropdown — an extra, confusing step that shouldn't exist for this flow at all.

## 4. Proposed Outcome

When the modal is opened for an **emerging (unplanned) result**, both dropdowns render the complete CLARISA centers/Science-Programs catalogue directly, with no ToC preselection and no "Other(s)" sentinel step. The existing ToC-derived "dropdown 1 (ToC) + Other(s) (dropdown 2)" split is preserved unchanged for the **indicator-based** reporting flow.

## 5. Scope

- `aow-hlo-create-modal.component.ts`: `preselectTocCenters()`, `preselectTocSciencePrograms()`, and the computed signals that gate the two dropdowns (`hasReferenceCenters`, `hasReferenceScience`, `dropdown1Options`, `dropdown1ScienceOptions`).
- Detecting "this is the emerging/unplanned flow" from the data already available on `entityAowService.currentResultToReport()` (see Root Cause) — no new inputs/APIs needed.
- Regression test(s) covering both flows (indicator-based keeps the ToC/Other split; emerging shows the full catalogue with no split).

## 6. Non-Goals

- No change to the **indicator-based** ToC/Other split behavior (`P2-3114`/`P2-2998`), which is working as designed and covered by prior specs (`changes/toc-center-guard`, `changes/toc-science-program-guard`).
- No change to `rd-contributors-and-partners` (the analogous Contributors & Partners surface on Result Detail) — out of scope unless the user asks to mirror the fix there.
- No backend/API changes — this is a client-side gating bug.

## 7. Affected Users, Systems, And Specs

- **Users:** Program result submitters using "Report emerging result" from the Areas of Work / HLO table (`entity-details/:entityId/aow`).
- **Code:** `AowHloCreateModalComponent` (client only).
- **Related specs (context, not modified):** `docs/specs/changes/toc-center-guard`, `docs/specs/changes/toc-science-program-guard`, `docs/specs/kaizen/bugfix--lead-center-full-catalog.md` (same "full catalogue when no ToC reference" shape, different surface).

## 8. Visual Reference

- Source: User-provided screenshot (in-app), no Figma/mockup.
- Location: attached to the originating chat message (not persisted under this spec folder).
- Notes: shows the "Contributing CGIAR Centers" dropdown open with a single checkbox, "Other(s) CGIAR Centers" — the reported defect. No new visual design is needed; this is a logic-gating fix using the existing dropdown components.

## 9. Bug Diagnosis

### Observed Symptom

In the "Report emerging result" modal, expanding **Contributing CGIAR Centers** or **Contributing Science Programs** shows only one option — **"Other(s)..."** — instead of the full list of CGIAR Centers / Science Programs. The user must select "Other(s)" first to reveal a second dropdown with the real catalogue.

### Reproduction Steps

1. Go to `result-framework-reporting/entity-details/SP01?tocView=aows`.
2. Open any Area of Work row and click **"Report emerging result"** (the unplanned-achievement entry point — no indicator/target is selected; the modal shows "Select Output or Outcome" and "The indicator category cannot be determined for this indicator").
3. Expand **Contributing CGIAR Centers**.
4. **Observed:** only "Other(s) CGIAR Centers" is offered.
5. **Expected:** every CGIAR Center is offered directly. Same for Science Programs.

### Root Cause (confirmed)

`aow-hlo-create-modal.component.ts` preselects "ToC-derived" centers/SPs unconditionally from **node-level** ToC fields, regardless of whether the modal was opened for an indicator (ToC-linked) result or an emerging (unplanned) one:

- `preselectTocCenters()` (L245-263) reads `node?.toc_partner_institution_ids` and `node?.indicators?.[0]?.targets_by_center?.centers` off `entityAowService.currentResultToReport()`. The HLO/Outcome **node** itself carries `toc_partner_institution_ids` even when no specific indicator was picked, because that field describes the ToC node's own partners, not the indicator's.
- `preselectTocSciencePrograms()` (L291-300) reads `node?.contributing_synergy_program_initiative_ids` the same way — also present at node level independent of indicator selection.
- `openReportResultModal(item, currentItemId, targetId)` in `aow-hlo-table.component.ts` (L292-309) sets `indicators: []` when `currentItemId` is `null` (the emerging-result entry point) — but leaves every other node-level field, including the two ToC id arrays above, untouched on the object it hands to the modal.
- Downstream, `hasReferenceCenters()` / `hasReferenceScience()` (`tocCenters().length > 0` / node's `selectedEntities` from ToC) come back **true** because those node-level arrays are non-empty, so the template (`aow-hlo-create-modal.component.html` L233, L310) renders **dropdown 1** (ToC centers + the `Other(s)` sentinel) instead of the full-catalogue dropdown that the `@else` branch (L248-256, L322-329) would render for `hasReferenceCenters() === false`.
- Because the matched ToC centers/SPs are simultaneously preselected into `contributingCenters()` / `entityAowService.selectedEntities()` (shown as chips), the multiselect's own panel — which does not re-offer already-selected values — has nothing left to show except the one still-unselected entry: the `Other(s)` sentinel. This is what the screenshot shows.

In short: the "ToC vs Other" split is gated on "does this ToC node have partner/SP ids", but it should be gated on "was this modal opened for a specific ToC **indicator**" — which is exactly what `indicators.length > 0` already encodes (set by `openReportResultModal`) and what the user's own words describe: *"este other es para cuando usamos un indicador de ToC"*.

### Impact & Scope

- Confined to `AowHloCreateModalComponent`. `rd-contributors-and-partners` (Result Detail's Contributors & Partners tab) uses the same ToC/Other pattern (per the kaizen entries) but preselects from the **already-created result's** ToC linkage, not from a node passed in with an empty `indicators[]` — needs a quick confirmation during `/akili-specify` whether it shares the same emerging-flow entry point; not assumed in scope here (§6 Non-Goals).
- No data-integrity or security impact — this only affects which options are *offered*; whatever the user picks is still saved and payload-mapped correctly (`createResult()` merges dropdown 1 + dropdown 2 either way, L502-522).
- Every emerging-result submission today requires an unnecessary extra click ("Other(s)") to reach the real catalogue — a UX/usability defect affecting all users of this entry point, not a data-loss risk.

### Fix Strategy

Gate the ToC preselection (and therefore the dropdown split) on **whether an indicator is actually being reported**, using the signal already available: `entityAowService.currentResultToReport()?.indicators?.length > 0` (mirrors how `openReportResultModal` itself distinguishes the two flows).

- When **no indicator** is present (emerging flow): skip `preselectTocCenters()` / `preselectTocSciencePrograms()` matching entirely — leave `tocCenters()` / `tocSciencePrograms()` empty, so `hasReferenceCenters()` / `hasReferenceScience()` are `false` and the existing `@else` branches (full catalogue, no "Other(s)" wording, no preselection) render — this code path already exists and is unit-tested for the "ToC returned nothing" case; it just needs to be reached.
- When an **indicator** is present: keep current behavior unchanged (ToC dropdown 1 + Other(s) dropdown 2).
- Regression test: one case with `indicators: []` (emerging) asserting `tocCenters()`/`tocSciencePrograms()` stay empty even though node-level `toc_partner_institution_ids`/`contributing_synergy_program_initiative_ids` are non-empty; one case with a populated indicator asserting today's ToC/Other split is untouched.
- Route: **not** cosmetic (logic + data-shape change) → `/akili-specify bugfix/emerging-result-contributor-catalog` in **Bug Mode**, mandatory regression test (red before fix, green after). Per `KZ-bugfix--lead-center-full-catalog-1` (active lesson, same component family), the task's verification command must include `ng build`/`ng lint`, not only Jest — `ts-jest` alone would not have caught a prior build break in this same modal.

## 10. Approach Options

| # | Approach | Trade-off |
|---|---|---|
| **A (recommended)** | Gate `preselectTocCenters()` / `preselectTocSciencePrograms()` on `indicators.length > 0`, skipping ToC matching entirely for the emerging flow. | Smallest, most targeted change; reuses the existing "no reference found" template branch as-is; matches the user's stated mental model exactly. |
| B | Have `openReportResultModal` strip `toc_partner_institution_ids` / `contributing_synergy_program_initiative_ids` from the node object when `currentItemId` is `null`, so the modal's existing logic naturally sees "no ToC data". | Also works, but pushes a modal-internal concern (what counts as "no ToC reference") into the table component, and is easier to silently break if another future entry point also passes `indicators: []` without going through this exact code path. |
| C | Add a new explicit `isEmergingResult` flag threaded from the table into the modal. | Most explicit, but adds a new piece of state to keep in sync for a distinction the data already encodes (`indicators.length`) — unnecessary surface area for this fix. |

**Recommended: Option A.** It fixes the bug at its actual source (the two `preselectToc*` methods), needs no new state, and every downstream computed/template branch already exists and is correct once the input signal (`tocCenters`/`tocSciencePrograms`) is right.

## 11. Recommended Approach

Option A, scoped exactly as in §9 Fix Strategy and §5 Scope.

## 12. Risks, Dependencies, And Open Questions

- **Risk:** if some *other* current caller relies on `indicators: []` + non-empty node-level ToC ids still triggering the ToC/Other split (i.e., some legitimate ToC-linked flow also opens the modal with an empty `indicators` array), Option A would change its behavior too. Grep during `/akili-specify` should confirm `openReportResultModal` is the only caller that sets `indicators: []`, and that no other reachable path does the same for a genuinely ToC-linked report.
- **Open question:** does `rd-contributors-and-partners` need the mirrored fix? Flagged in §9 Impact & Scope as **not assumed** — resolve during `/akili-specify` by checking whether it has an equivalent "emerging" entry point.
- **Dependency:** none — no backend change needed; `centersSE`/`allInitiatives` catalogues are already fetched unconditionally today.
- No `docs/specs/kaizen-log.md` `## Active Lessons` table exists in this repo yet (only per-spec kaizen entries under `docs/specs/kaizen/`) — the two most relevant entries were read directly and cited above (`KZ-bugfix--lead-center-full-catalog-1`, and the `toc-center-guard`/`toc-science-program-guard` twin-spec pattern on counting rules spanning two state sources, relevant if the regression test ends up touching combined-array counting).

## 13. Success Criteria

- Opening "Report emerging result" and expanding Contributing CGIAR Centers shows every CGIAR Center directly (no "Other(s)" gate, no ToC preselection).
- Same for Contributing Science Programs/Accelerators.
- Opening the modal for an indicator-based ToC report (existing flow) is pixel/behavior-identical to today — ToC dropdown 1 + "Other(s)" dropdown 2 unchanged.
- New regression test(s) red-before/green-after the fix; `ng build` and `ng lint` both pass (per `KZ-bugfix--lead-center-full-catalog-1`).

## 14. Next Step

```text
/akili-specify bugfix/emerging-result-contributor-catalog
```
Bug Mode — converts the confirmed root cause above into a fix plan and a mandatory regression test.
