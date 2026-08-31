# Proposal: Stop showing "not found" ToC-reference notes when the result is unmapped

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/toc-unmapped-orange-notes` |
| Slug | `toc-unmapped-orange-notes` — derived from user's free-text description |
| Type | Bug |
| Approval Mode | gated |
| Author | Claude (session), reviewed with Santiago Sanchez |
| Date | 2026-08-28 |

## 2. Intent

When a user answers **No** to the ToC-mapping question — "Can this result be mapped to a ToC KPI?" (2026 phase, classic Result Detail) — three orange warning notes appear that should not, because they only make sense when the result *is* mapped to a ToC node.

## 3. Problem / Current Behavior

In the **Contributors & Partners** section (2026 phase, `rd-contributors-and-partners`), Contributing CGIAR Centers, Science Program/Accelerator, and External Partners each try to pre-fill their dropdown from the ToC node the result was mapped to. When no node is referenced, each one falls back to an orange `.pr-message` note:

- "No CGIAR Centers related to the established HLO/Outcomes were found"
- "No Science Programs related to the established HLO/Outcomes were found"
- "No External Partners related to the established HLO/Outcomes were found"

These notes are meant for the case where the result **is** mapped (Yes) but the mapped ToC node happens to carry no linked centers/programs/partners (P2-2998 AC4 / P2-2929). They were never scoped to the **No** (unplanned) case — but the reference lists they check are *always* empty when unplanned, because no ToC node is ever selected. The result: answering **No** always lights up all three notes, regardless of the actual data, which reads as broken/alarming rather than informative.

## 4. Proposed Outcome

When the result is answered **No** (`planned_result === false`) on the ToC-mapping question, Centers / Science Program / External Partners fall back to the same plain, full-catalog dropdown used before the 2026 split (no note, no reference-based filtering) — exactly like the pre-2026 (legacy) behavior. The reference-based split and its "not found" notes only apply when the result is answered **Yes**.

## 5. Scope

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html` — Contributing CGIAR Centers block (~L100-125) and Contributing Science Program/Accelerator block (~L302-327).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.html` — External Partners block (~L33-53). This component is shared by both the classic Result Detail flow and the IPSR P25 flow (`ipsr-contributors.component.html:209`), so the fix here also covers IPSR wherever this component renders.
- Regression tests in `rd-contributors-and-partners.component.spec.ts` (Centers/Science) and the `normal-selector` spec (External Partners), covering: No answer → flat dropdown, no note; Yes + empty ToC refs → note still shows (must not regress AC4); Yes + non-empty refs → split dropdown (unchanged).

## 6. Non-Goals

- No change to the pre-2026 (legacy, non-`isCP2026`) Centers/Partners rendering — it already shows the flat dropdown unconditionally and is unaffected.
- No change to the Centers/Science Program UI in IPSR — **confirmed these do not exist there** (see Bug Diagnosis §Impact & Scope). Only the shared External Partners component is reachable from IPSR.
- No change to the "Level"/Output/Outcome ToC selector that legacy (non-2026) phases still show on **No** — that is intentional, documented behavior (lets the user pick the closest HLO for an unplanned result), not part of this bug.
- No change to `hasTocResultMapped()` / the "Please select a TOC result above" bilateral-projects note — that is a separate, pre-existing condition not raised in this report.

## 7. Affected Users, Systems, And Specs

- **Users:** Result submitters editing Contributors & Partners on a 2026-phase result and answering "No" to the ToC-mapping question.
- **Systems:** `RdContributorsAndPartnersComponent`, `CPNormalSelectorComponent`, shared `RdContributorsAndPartnersService` state (`partnersBody.result_toc_result.planned_result`).
- **Related specs (do not restate, cite only):** `openspec/changes/p2-3036-*` (Centers/Science Program split origin), `openspec/specs/results-toc-reporting-adjustments/spec.md` (ToC question copy), P2-3066 (External Partners split), P2-2998 AC4 / P2-2929 (the notes this bug misfires).

## 8. Visual Reference

- Source: None (user-provided browser screenshots showing the "No" state; no note visible above the fold in either screenshot, confirming the report describes what appears further down / around Centers-Science-Partners, consistent with the diagnosis below).
- Location: n/a
- Notes: This is a logic-condition fix, not a new visual pattern — no mockup needed.

## 9. Bug Diagnosis

### Observed Symptom

After answering **No** to "Can this result be mapped to a ToC KPI?" in Contributors & Partners (2026 phase), the Contributing CGIAR Centers, Science Program/Accelerator, and External Partners sections each show an orange "not found" note, even though nothing is actually wrong — the result is simply unmapped.

### Reproduction Steps

1. Open a 2026-phase result's Contributors & Partners section (classic Result Detail).
2. Answer **No** to "Can this result be mapped to a ToC KPI?".
3. Observe the Contributing CGIAR Centers, Science Program/Accelerator, and External Partners sections: each renders its orange "No ... related to the established HLO/Outcomes were found" note.
4. Expected: no note; instead, a plain full-catalog dropdown (same as pre-2026 / same as what a "Yes" answer with unmapped centers is *not* supposed to look like).

### Root Cause (confirmed)

All three sections gate their UI on `isCP2026()` alone, then branch on a `hasReferenceX()` computed that is `true` only when the ToC node the result is mapped to actually returned matching ids:

```html
<!-- rd-contributors-and-partners.component.html:100-125 (Centers), :302-327 (Science) -->
@if (isCP2026()) {
  @if (hasReferenceCenters()) { <!-- dropdown filtered to the ToC node --> }
  @else { <!-- orange note --> }
} @else { <!-- flat dropdown, no note --> }
```

```html
<!-- normal-selector.component.html:33-53 (External Partners) -->
@if (isCP2026() && !dataControlSE.isKnowledgeProduct) {
  @if (hasReferencePartners()) { ... } @else { <!-- orange note --> }
} @else { <!-- flat dropdown --> }
```

`hasReferenceCenters()` / `hasReferenceScience()` / `hasReferencePartners()` (rd-contributors-and-partners.component.ts:146,264; normal-selector.component.ts:60) all read from `tocReferenceCenterInstitutionIds()` / `tocReferenceSynergyInitiativeIds()` / `tocReferencePartnerInstitutionIds()` — ids resolved from the ToC node the result is mapped to. **When the user answers No, no ToC node is ever selected, so these id lists are always empty**, and `hasReferenceX()` is always `false` — the `@else` (orange note) branch fires unconditionally, not because anything is actually missing.

The notes' original intent (P2-2998 AC4 / P2-2929, confirmed by the code comments citing Santi's 2026-07-03 decision) was to flag a **mapped** result whose specific ToC node happens to carry no centers/programs/partners — not to flag an intentionally-unmapped result.

### Impact & Scope

- Confirmed reachable in the classic Result Detail flow (`rd-contributors-and-partners.component.html`) for all three sections, for any 2026-phase result answered **No**.
- **IPSR:** the IPSR P25 template (`ipsr-contributors.component.html`) does **not** render the Centers/Science-Program split UI at all (Centers is always the flat dropdown there; there is no Science Program section in that template) — so those two notes cannot appear in IPSR today. However, IPSR **does** render `<app-normal-selector>` (line 209) unconditionally for P25 results, and that component reads the same shared `RdContributorsAndPartnersService.partnersBody`, gated only on `isCP2026()` (which depends on `phase_year`, not portfolio — see the existing trap documented in `rd-contributors-and-partners/CLAUDE.md`). So the **External Partners** note **can** appear in IPSR today, for a P25 IPSR result whose phase is 2026+, answered No. The Centers/Science notes cannot occur in IPSR because the markup that would show them isn't there.
- No data-integrity impact — this is a display-logic bug only; nothing is saved incorrectly.

### Fix Strategy

Add one extra condition to each of the three outer `@if (isCP2026())` gates so the reference-based split (and its "not found" note) only applies when the result is actually mapped (`planned_result !== false`); otherwise fall through to the existing flat, no-note dropdown branch (already implemented, just needs to be reachable):

```html
@if (isCP2026() && this.rdPartnersSE.partnersBody.result_toc_result.planned_result !== false) {
  @if (hasReferenceCenters()) { ... } @else { <!-- orange note, Yes-only --> }
} @else {
  <!-- flat dropdown — now also serves the "No" case -->
}
```

Same pattern for the Science Program block and for `normal-selector.component.html`'s External Partners block. This is a display-condition change with no data/API impact, but it touches three `@if` gates across two components and needs a regression test proving the AC4 "Yes + genuinely empty ToC refs" note still fires — so it is **not** cosmetic and routes to `/akili-specify` (Lite) in Bug Mode with a mandatory regression test, not `/akili-quick`.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Gate the split on `planned_result !== false` (recommended)** | Add the extra condition to the three existing `@if (isCP2026())` gates; unplanned results fall through to the already-existing flat dropdown branch. | Smallest safe change — reuses existing markup, no new template branch, no change to preselect effects (they already no-op when reference lists are empty). |
| B — Suppress only the orange note, keep the reference-filtered (empty) dropdown | Change only the `@else` branch to render nothing instead of the note. | Leaves an empty/unhelpful dropdown with zero options instead of the useful full catalog — worse UX than A, and still misrepresents "no note" as "nothing to pick from ToC" rather than "not applicable when unmapped." |
| C — Add a new dedicated "unplanned" template branch per section | Write bespoke markup for the No case instead of reusing the flat dropdown. | More template churn for an identical visual/behavioral result to Option A (this exact reuse-over-new-branch reasoning was already used for the bilateral-projects gate in P2-3001's design.md) — rejected for the same reason. |

## 11. Recommended Approach

**Option A.** It is the minimal, safe fix: one added boolean per gate, no new markup, and it naturally reuses the flat-dropdown path that already exists and is already tested for the pre-2026 case.

## 12. Risks, Dependencies, And Open Questions

- **Risk:** the fix must not affect the AC4 "Yes-but-genuinely-empty" note — the regression test must cover both states explicitly.
- **Dependency:** none beyond the existing `RdContributorsAndPartnersService` state (`partnersBody.result_toc_result.planned_result`), already used by sibling conditions in the same templates.
- **Open question (confirm before `/akili-specify`):** the user's report also asked for the same fix in IPSR's "Does this result align with the Program's planned TOC indicators?" (pre-2026-style question, reused in the P25 IPSR template). As diagnosed above, the Centers/Science notes structurally cannot appear there (the split markup isn't present in that template), but the External Partners note **can**, via the shared `normal-selector` component, whenever an IPSR P25 result's phase is 2026+. **Should we confirm this is the only IPSR-reachable case, or does the user have a specific IPSR screen/screenshot showing a Centers or Science Program note that would mean there's a second, not-yet-found code path?**

## 13. Success Criteria

- Answering **No** to the ToC-mapping question in Contributors & Partners (2026 phase) shows the flat, full-catalog dropdown with no orange note for Centers, Science Program, and External Partners.
- Answering **Yes** with a ToC node that genuinely has no linked centers/programs/partners still shows the existing orange note (AC4 behavior preserved).
- The same holds for the shared External Partners component when reached from IPSR.
- Regression tests cover both states for all three sections.

## 14. Next Step

```text
/akili-specify bugfix/toc-unmapped-orange-notes
```
(Bug Mode — convert the confirmed root cause into a fix plan + mandatory regression test covering both the No/flat-dropdown state and the Yes/AC4-note state.)
