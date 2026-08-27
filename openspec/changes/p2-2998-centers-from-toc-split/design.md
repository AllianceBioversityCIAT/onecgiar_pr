## Context

P2-2998: Contributing CGIAR Centers must reflect the centers referenced by the result's TOC node, with an "Other(s)" escape hatch. Agreed optimization with Ángel: two dropdowns over the same CLARISA service. This change is the **visual layer**; persistence is deferred by decision (Juan David).

**Goals:** dropdown 1 = TOC-referenced centers; "Other(s)" toggle reveals dropdown 2 with the rest; 2026-only; don't break 2025 or the reuse contexts; don't touch the save.

**Non-Goals (deferred):** the PATCH/persistence shape, auto-preselection, "at least one" validation, lead-center reposition fine-tuning.

## Decisions

**D1 — Derive the reference set in the child, consume it in the parent via the shared service.**
The TOC node data (`toc_partners`, indicator `toc_target_center_ids`) lives in `multiple-wps-content` (inside the ToC tabs). The Centers dropdown lives in the parent. An `effect()` in the child writes the union of institutionIds into `RdContributorsAndPartnersService.tocReferenceCenterInstitutionIds` (signal); the parent derives `referenceCenters` / `otherCentersList` with `computed()`.

**D2 — Cross by `institutionId`.**
Both `toc_target_center_ids` and `toc_partners[].code` are institutionIds (confirmed live + by Juan David). Match against CLARISA `institutionId`. Non-center ids simply don't match and disappear.

**D3 — Only the selected node.**
Per Juan David, use the selected node/indicator, not the union across the whole response.

**D4 — Gate everything by `isCP2026()`.**
The legacy single multi-select stays for 2025 / IPSR / bilateral / share-request. Zero risk to existing behaviour.

**D5 — Defer the save.**
The PATCH is untouched; dropdown 1 keeps binding to `contributing_center` (so the current save still works), dropdown 2 binds to a separate `otherCentersSelected` for now. The real merge/persistence is designed later with Juan David. This is explicitly tracked in tasks §3.

## Risks / Trade-offs

- [Two dropdowns over one logical field] → persistence undefined yet; deferred on purpose. Visual layer must not silently corrupt the current save → dropdown 2 uses a separate array, PATCH unchanged.
- [Multiple HLO tabs] → the reference set follows the active node; multi-tab semantics revisited with the save design.

## Open Questions

- **OQ1:** Save shape — merge into `contributing_center[]` vs separate fields / `from_toc` flag. Pending Juan David.
- **OQ2:** Auto-preselect all reference centers at load — pending, tied to OQ1.
