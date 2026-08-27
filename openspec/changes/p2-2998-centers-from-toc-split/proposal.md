## Why

P2-2998 (Contributing CGIAR Centers behaviour from TOC), implemented as the **optimization agreed with Ángel**: split the single Contributing CGIAR Centers multi-select into **two dropdowns over the same CLARISA service** (`/clarisa/centers/get/all`). The first shows only the centers referenced by the selected TOC node; "Other(s)" lets the user add any of the rest. Confirmed with Juan David (backend) on Slack 2026-06-24.

This change delivers the **visual layer only**. The **SAVE / persistence is intentionally deferred** (Juan David: "el patch por ahora no lo abordemos") so the team can design the persistence (how TOC-derived vs Other centers are stored) carefully.

## What Changes

In `rd-contributors-and-partners` (P25), in the Yes scenario, gated by `isCP2026()`:

1. **Info note** above the centers: "The CGIAR Centers listed below were identified in your 2026 ToC. To select a different Center, choose 'Other'…" (Excel row 16).
2. **Dropdown 1 — Contributing CGIAR Centers**: shows only CLARISA centers whose `institutionId` matches the selected TOC node — union of `toc_partners` (node) and `toc_target_center_ids` (selected indicator), both cross to CLARISA by `institutionId`. Per Juan David, only the **selected node** is used (not the whole response).
3. **"Other(s) CGIAR Centers" toggle + Dropdown 2**: when toggled on, shows the remaining centers (not referenced by the TOC) for free selection (Excel rows 17–18).
4. Data plumbing: `multiple-wps-content` feeds the selected node's institutionIds into the shared service (`tocReferenceCenterInstitutionIds` signal); the parent derives `referenceCenters` / `otherCentersList`.

Phase 2025 and the IPSR / bilateral / share-request reuse contexts keep the original single-dropdown behaviour.

### ⚠️ Deferred (NOT in this change — tracked so we don't forget)
- **SAVE / PATCH**: how the two dropdowns persist into `contributing_center[]` (and whether a `from_toc` flag is needed) is **not implemented**. The current PATCH is untouched. To be designed with Juan David before wiring persistence.
- **Auto-preselection** of all reference centers at load (Excel: "at the beginning, all reference CGIAR Centers should be chosen") — pending, tied to the save design.
- **"At least one" validation** and the Lead-center reposition fine-tuning — pending.

## Capabilities

### New Capabilities
- `toc-contributors-centers`: split Contributing CGIAR Centers (TOC-referenced + Other) in the P25 section, visual layer, gated to 2026.

## Impact

- **Files (client):**
  - `rd-contributors-and-partners.service.ts` — `tocReferenceCenterInstitutionIds` signal, `otherCentersSelected`, `showOtherCenters`.
  - `multiple-wps-content.component.ts` — effect feeding the institutionIds of the selected node.
  - `rd-contributors-and-partners.component.ts` — `referenceCenters` / `otherCentersList` computeds + info note.
  - `rd-contributors-and-partners.component.html` — info note + 2 dropdowns + Other(s) toggle, gated by `isCP2026()`.
- **No backend/save change.** SAVE is deferred by design.
- **Risk:** medium — touches a shared section; mitigated by gating everything behind `isCP2026()` (2025 and reuse contexts unchanged) and leaving the PATCH untouched.
