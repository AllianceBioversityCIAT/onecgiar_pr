## Context

The 2026 Contributors & Partners section prefills ToC-derived contributors when the selection is empty:

```ts
// preselectScienceEffect (~215) — Centers effect (~145) is the mirror image
preselectScienceEffect = effect(() => {
  if (!this.isCP2026() || this.userTouchedScience) return;
  const refs = this.referenceScience();            // ToC synergy Science Programs
  const sel = this.rdPartnersSE.scienceSelected;
  if (refs.length && (!sel || sel.length === 0)) {
    this.rdPartnersSE.scienceSelected = refs.map(sp => ({ ...sp, new: true, is_active: true }));
  }
});
```

`userTouchedScience` / `userTouchedCenters` are `false` at construction and are only flipped by `onScienceSelect` / `onContributingCenterSelect`. `deleteScience` / `deleteOtherCenter` do NOT flip them. On a full page reload the component is recreated, so the flag resets to `false`; `applyTocMappingOnLoad` sets `scienceSelected` from the (now empty) GET, and the effect then re-adds the ToC items — the resurrection.

Verified in prtest (result 8575/11043): DB `contributing_initiatives` is `{accepted:[],pending:[]}` yet the UI shows SP01/SP03/SP12 after F5. Backend already persists the deletion correctly; this is frontend-only.

The `GET /v2/api/contributors-partners/:id` payload has no explicit "section was saved" flag (top-level fields are `no_applicable_partner`, `is_lead_by_partner`, `has_innovation_link`, plus the data arrays). So the frontend cannot currently distinguish "saved empty on purpose" from "never touched" purely from this section's payload.

## Goals / Non-Goals

**Goals:**
- A deliberate, saved deletion of ToC-derived Science Programs and Centers survives reload (no resurrection).
- Genuine first-time prefill still works for never-saved sections.
- Same mechanism for Science Programs and Centers.
- 2025 legacy branch untouched; all new logic gated by `isCP2026()`.

**Non-Goals:**
- Changing the reactive recompute of the reference set on HLO/KPI selection (`toc-centers-reactive-preload` stays as-is).
- Changing backend persistence (already correct).
- Redesigning the dropdowns or the "Other(s)" split.

## Decisions

**Decision 1 — Frontend-only fix; the ToC suggest is a catalogue/pre-fill, never the post-save source of truth.** The backend owner (Juan David) reviewed the diagnosis and confirmed: the section GET already reflects the persisted truth (if an SP/Center isn't in it, the backend cancelled/deactivated it), and he would NOT add a backend "suggested synergy ids" flag because it duplicates what GET TOC v2 already provides. So the fix lives entirely in the frontend and treats the two sources distinctly (same as Centers):
- **Dropdown 1 (ToC / suggest):** options = `referenceScience()` / `referenceCenters()` from `tocReferenceSynergyInitiativeIds` / `tocReferenceCenterInstitutionIds`. Catalogue + visual pre-fill only — never authoritative after save.
- **Dropdown 2 (Other(s)):** options = `otherScienceList()` (CLARISA minus ToC).
- **Chips / real selection:** `scienceSelected` / `otherScienceSelected` / `contributing_center` hydrated ONLY from the section GET in `applyTocMappingOnLoad()` (split by `from_toc`). Post-save / F5 MUST NOT re-merge GET TOC v2 on top of the section GET.

**Decision 2 — Gate the on-load prefill so it never resurrects a saved-empty section (Juan David's recommended mechanism, no backend contract change):**
1. `preselectScienceEffect` runs only on genuine initial load — when the section GET's `accepted + pending` are empty AND the section has not yet been hydrated post-GET (a `scienceHydratedFromSection` flag set by `applyTocMappingOnLoad`).
2. `deleteScience()` sets `userTouchedScience = true` (today only `onScienceSelect` does) — mirror in `deleteOtherCenter()` / centers.
3. After `applyTocMappingOnLoad()`, if the persisted selection is empty, do NOT run the automatic preselect again.
4. Never write the ToC suggest directly into chips without a user action or without it coming from the section GET.

**Decision 3 — One shared approach for Science Programs and Centers.** Apply the identical hydration-flag + `userTouched`-on-delete + no-re-preselect-after-hydration logic to both `preselectScienceEffect`/`deleteScience` and `preselectCentersEffect`/`deleteOtherCenter`, so the two cannot drift.

**Decision 4 — Keep reactive-on-selection preload intact.** The reactive recompute of the reference set when the user picks an HLO/KPI (`toc-centers-reactive-preload`) is a user action and stays as-is; genuine first-time prefill for a new result flows through that path and the initial-load branch, not through a post-save re-merge.

**Rejected — `userTouched`-on-delete alone.** Necessary (step 2) but not sufficient: the flag resets on a fresh component after F5, so without the hydration gate the resurrection returns. **Rejected — backend "suggested ids" flag:** declined by the backend owner as duplicative of GET TOC v2.

## Risks / Trade-offs

- [Option B misclassifies a legitimately empty first save as "already saved"] → Prefer Option A; if Option B ships, choose the most reliable available signal and cover it with a scenario test; document the edge case.
- [Divergence between Science Programs and Centers] → Mitigated by the single shared predicate (Decision 2).
- [Accidentally touching the 2025 path] → All new logic stays inside the `isCP2026()` guard; add a 2025-unchanged scenario/test.
- [Backend flag not delivered in time] → Ship Option B as the fallback so the fix is not blocked, then swap to Option A when the signal exists.

## Migration Plan

- Frontend-only change; no data migration. Deploy with the P2-2928 epic branch.
- Rollback: revert the component (and any interface) change; behavior returns to the current prefill (with the known resurrection).

## Open Questions

- **Resolved:** backend "suggested synergy ids" / "section saved" flag — declined by the backend owner (Juan David) as duplicative of GET TOC v2. Fix is frontend-only.
- Implementation nuance to nail during apply: the `scienceHydratedFromSection` flag prevents re-preselect after a saved-empty load, but a genuinely never-saved result must still receive its ToC contributors. Confirm first-time prefill flows correctly (via the reactive HLO/KPI-selection path and/or a first-load-only branch) so a brand-new mapped result still gets SP/Centers, while a saved-empty one stays empty after F5.
