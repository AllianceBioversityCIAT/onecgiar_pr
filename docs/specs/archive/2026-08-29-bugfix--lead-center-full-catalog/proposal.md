# Proposal: Lead Center Independent of Contributing Centers

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/lead-center-full-catalog` |
| Slug Derivation | Derived from user's Spanish objective/problem statement ("Desacoplar la lógica del campo Lead Center de la sección de Contributing CGIAR Centers…") — no literal slug was supplied. |
| Type | Bug |
| Approval Mode | gated |
| Affected Apps | `onecgiar-pr-client` |
| Affected Surfaces | Result Detail → Contributors & Partners (`result/result-detail/:id/contributor-partners?phase=36`, P25 redesign), IPSR → Contributors (P25) |
| Date | 2026-08-28 |

## 2. Intent

The **Lead Center** dropdown must always let the user pick a principal CGIAR center from the **full CLARISA catalog**, regardless of what (if anything) is present in **Contributing CGIAR Centers** — whether that section is empty, populated from Theory of Change (ToC), or populated manually.

## 3. Problem / Current Behavior (Bug Diagnosis)

### Observed Symptom
When a result has no centers from ToC and the user has not manually added any Contributing CGIAR Centers, the **Lead Center** dropdown renders with **zero options** — it is a required field, so the form cannot be validly saved/submitted. This happens on both the Result Detail Contributors & Partners tab and the IPSR Contributors tab.

### Reproduction Steps
1. Open a result whose Theory of Change contributes no CGIAR centers (or clear all Contributing CGIAR Centers, ToC + manual).
2. Go to `result/result-detail/<id>/contributor-partners?phase=36` (or the equivalent IPSR Contributors screen).
3. Observe the **Lead Center** dropdown: no selectable options; Result Detail shows an inline note "Please select at least one contributing center to choose a lead center", IPSR shows no options and no note.
4. Attempt to save/submit — blocked because Lead Center is required and unset.

### Root Cause (confirmed)
Both surfaces share a single state service, `RdContributorsAndPartnersService` (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts`). Its `setPossibleLeadCenters()` (lines ~537–569) builds `possibleLeadCenters` by **filtering the full CLARISA catalog (`centersSE.centersList`) down to only the centers already present in `partnersBody.contributing_center` and `otherCentersSelected`**. When both of those are empty, the filter yields `possibleLeadCenters = []`.

- Result Detail template (`rd-contributors-and-partners.component.html:441-457`) binds `[options]="rdPartnersSE.possibleLeadCenters"` and shows the "select a contributing center first" note when that array is empty.
- IPSR template (`ipsr-contributors.component.ts` / `.html:232-243`) injects the same `RdContributorsAndPartnersService` and binds to the same `possibleLeadCenters`, with no empty-state note at all.
- The full independent catalog already exists and is loaded once, decoupled from Contributing Centers state: `CentersService.getData()` → `GET_AllCLARISACenters()` (`shared/services/global/centers.service.ts:33-48`, `shared/services/api/results-api.service.ts:298`), exposed as `centersSE.centersList` / `centersSE.centers()`.
- Lead Center is conditionally required in both templates: `[required]="!rdPartnersSE.partnersBody.is_lead_by_partner"` — required whenever the result is not led by an external partner.

### Impact & Scope
- **Blocking**: any result with no ToC/manual contributing centers cannot be saved because a required field has no options.
- **Blast radius**: single shared service (`RdContributorsAndPartnersService`) — a fix here automatically applies to both Result Detail and IPSR, since neither has its own duplicate logic.
- No data-integrity or security implication; this is a client-side population/filtering bug.
- Prior work-in-progress on this exact spec path was discarded earlier today (uncommitted + 5 local unpushed commits) because the requirements had drifted from what was actually needed — this proposal restarts that effort with the root cause explicitly confirmed first.

### Fix Strategy
Decouple `possibleLeadCenters` from `contributing_center` / `otherCentersSelected` filtering: populate it directly from `centersSE.centersList` (the full catalog), independent of Contributing Centers state. Remove the now-incorrect "select a contributing center first" note in the Result Detail template (IPSR never had one). Keep Lead Center's existing required-conditional logic untouched — only the **source of its options** changes.

This is a logic change to a shared service consumed by two components plus a template cleanup — not a cosmetic one-liner — so it routes to `/akili-specify` in **Bug Mode**, which requires a regression test proving the dropdown is populated when Contributing Centers is empty.

## 4. Proposed Outcome

- Lead Center dropdown is **always** populated with the full CGIAR centers catalog, on both Result Detail (`contributor-partners?phase=36`) and IPSR Contributors screens.
- Lead Center stays a required field; the user can pick a value at any point before save/submit.
- Selecting a Lead Center does not clear or lock Contributing Centers or any other section.
- Adding/removing Contributing Centers (ToC or manual) no longer prunes the Lead Center option list.

## 5. Scope

- `RdContributorsAndPartnersService.setPossibleLeadCenters()` (and any caller that currently assumes it filters by contributing centers).
- `rd-contributors-and-partners.component.html` — remove the stale empty-state note tied to the old filtered behavior.
- `ipsr-contributors.component.ts` / `.html` — verify behavior via the shared service; add empty-state handling only if still needed once the catalog is always populated (likely becomes moot).
- Existing unit/spec files for both components and the shared service must be updated to reflect the new sourcing.

## 6. Non-Goals

- No change to the required/optional conditional for Lead Center (`is_lead_by_partner` logic stays as-is).
- No change to how Contributing CGIAR Centers itself is populated, split (ToC vs Other), or validated.
- No backend/API changes — `GET_AllCLARISACenters()` already provides the full catalog; this is a client-side wiring fix.

## 7. Affected Users, Systems, And Specs

- **Users**: any preparer/reviewer completing Contributors & Partners on a result or IPSR entry.
- **Systems**: `onecgiar-pr-client` only.
- **Files**:
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-contributors/ipsr-contributors.component.ts`
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-contributors/ipsr-contributors.component.html`
  - Corresponding `.spec.ts` files for each.
- **Related specs**: none found under `docs/specs/` for this exact behavior (prior attempt on this same path was discarded, not archived).

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: Bug fix to existing PrimeNG dropdown behavior; no new UI surface or visual design needed. Verification will use the existing screens at `result/result-detail/<id>/contributor-partners?phase=36` and the IPSR Contributors tab.

## 9. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. Decouple `possibleLeadCenters` from Contributing Centers (recommended)** | Change `setPossibleLeadCenters()` to source from `centersSE.centersList` directly, dropping the filter against `contributing_center`/`otherCentersSelected`. | Smallest safe change; fixes both surfaces at once since they share the service; requires re-checking any other consumer of `possibleLeadCenters` that assumed the filtered subset. |
| B. Add a separate "full catalog" property alongside the existing filtered one, and repoint only the two templates | Leaves `setPossibleLeadCenters()`'s filtered behavior intact for any other caller, adds a new signal/property for the unfiltered list. | More surface area (new property, more state to keep in sync) for no behavioral benefit — no other caller currently needs the filtered subset per the research. |
| C. Patch only the empty-catalog edge case (fallback to full list only when filtered list is empty) | Keeps existing filtering, adds fallback when `possibleLeadCenters.length === 0`. | Reintroduces the exact bug pattern seen in the previously discarded work — center removed from Contributing Centers could still silently prune Lead Center options in some states; doesn't fully satisfy "always full catalog" acceptance criteria. |

**Recommended: Option A.** It directly satisfies all four acceptance criteria with a single, well-scoped change to the shared service, and the research confirmed no other consumer depends on the filtered subset.

## 10. Risks, Dependencies, And Open Questions

- **Risk**: If `leadCenterCode` currently gets auto-cleared or reset whenever `setPossibleLeadCenters()` runs (e.g., on every Contributing Centers change), the fix must ensure an already-selected Lead Center is not wiped out when Contributing Centers changes — `/akili-specify` should design this against `setLeadCenterOnLoad` / `tryAutoAssignLeadCenter` to confirm.
- **Dependency**: `CentersService.getData()` must already be loaded before `possibleLeadCenters` is read (currently true — it's constructor-wired).
- **Open question**: Does IPSR need its own "no options" note (parity with Result Detail's old note), or does removing the filter make the empty state unreachable in practice? To be resolved in `/akili-specify` design.

## 11. Success Criteria

- [ ] Lead Center dropdown always shows the full CGIAR centers catalog, independent of Contributing CGIAR Centers state, on both surfaces.
- [ ] With 0 ToC centers and 0 manual centers, Lead Center still shows the full catalog.
- [ ] Form cannot be saved/submitted without a Lead Center selected (unchanged requirement behavior).
- [ ] Lead Center dropdown is never rendered empty or disabled while the form is active.
- [ ] Regression test added proving the empty-Contributing-Centers case populates Lead Center correctly.

## 12. Next Step

```text
/akili-specify bugfix/lead-center-full-catalog
```

Run in **Bug Mode** — `/akili-specify` will turn the confirmed root cause into a fix plan plus a mandatory regression test (red before the fix, green after).
