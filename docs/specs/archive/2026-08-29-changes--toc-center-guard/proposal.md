# Proposal: Guard Against Removing All ToC-Planned Contributing CGIAR Centers

## 1. Document Control

| Field | Value |
|---|---|
| Type | Change |
| Slug | `toc-center-guard` — derived from free-text argument (no slug/path given) |
| Spec Path | `docs/specs/changes/toc-center-guard` |
| Approval Mode | gated |
| Related specs | [`changes/toc-science-program-guard`](../toc-science-program-guard/) (same component, twin min-one guard just shipped for Science Programs — commit `7bee37dec`), [`archive/2026-08-29-bugfix--lead-center-full-catalog`](../../archive/2026-08-29-bugfix--lead-center-full-catalog/) (same component, same `contributing_center`/`otherCentersSelected` arrays, Lead Center auto-sync), [`archive/2026-08-29-bugfix--toc-unmapped-orange-notes`](../../archive/2026-08-29-bugfix--toc-unmapped-orange-notes/) (origin of the `planned_result !== false` ToC-mapping guard) |

## 2. Intent

When a result's selected indicator carries ToC (Theory of Change) data with planned Contributing CGIAR Centers, the report screen must never let the user save that result with **zero** Contributing CGIAR Centers selected — at least one ToC-planned Center has to remain, exactly like the guard already shipped for Contributing Science Programs.

## 3. Problem / Current Behavior

- Field: "Contributing CGIAR Centers" on `rd-contributors-and-partners.component.html`, backed by `partnersBody.contributing_center` (ToC-origin + manually-added chips in the flat/unmapped UI, or ToC-only in the split CP2026 UI) and `otherCentersSelected` (manually added chips in the split "Other(s)" dropdown).
- `deleteContributingCenter(index, updateComponent)` (`rd-contributors-and-partners.component.ts:412`) and `deleteOtherCenter(index)` (`:211`) both remove a chip with a plain array filter — **no minimum-count check exists**. A user can remove every ToC-planned Center down to zero and save.
- This is the exact gap the team already closed for **Contributing Science Programs** (`changes/toc-science-program-guard`, shipped `7bee37dec`): `deleteScience`/`deleteOtherScience` now call `blockIfLastScience(willRemoveCount)` before mutating. No equivalent floor/guard exists yet for Contributing CGIAR Centers.
- The sibling spec's own Open Question flagged this: its research found **no code-level coupling** between the Science Program arrays and the Centers arrays — they're separate catalogs (CLARISA initiatives vs. CLARISA centers) with independent state — and recommended filing the Centers guard as its own proposal rather than bundling it. This proposal is that follow-up.

## 4. Proposed Outcome

- If the linked ToC has planned Centers for the result's indicator, the user may remove Contributing CGIAR Centers down to **one remaining** (combined across `contributing_center` and `otherCentersSelected`), but the last one is blocked.
- Attempting to remove the last remaining ToC-planned Center shows a blocking alert (reusing `CustomizedAlertsFeService`, no `confirmText`, consistent with the Science Program guard) stating that at least one Contributing CGIAR Center is required.
- If the ToC has **no** planned Centers for the result (or the result isn't ToC-mapped — same `planned_result !== false` guard used by the sibling specs), no minimum applies; the field can be emptied freely, matching current behavior.

## 5. Scope

- `rd-contributors-and-partners.component.ts` / `.html`: guard in `deleteContributingCenter()` and `deleteOtherCenter()`, gated on ToC planned-Center presence for the current result/indicator.
- New/updated user-facing validation message (mirrors `contributingScienceInfoNote`/`noScienceProgramsNote` precedent — plain hardcoded string, no new `TermKey`).
- Regression coverage for: delete-down-to-one (allowed), delete-the-last-one (blocked), no-ToC-data case (unrestricted, unchanged), and the `OTHER_CENTERS_CODE` sentinel cascade (its removal already clears `otherCentersSelected` per the existing `if (!this.showOtherCenters) otherCentersSelected = []` line — the guard must count that cascade, not just the sentinel chip's own removal, mirroring `TOC-SP-DD-2`).

## 6. Non-Goals

- Not touching Contributing Science Programs — that guard already shipped (`toc-science-program-guard`) and is out of scope here.
- Not touching Lead Center auto-sync/full-catalog logic (`bugfix/lead-center-full-catalog`) — already resolved; this proposal only adds a deletion-time floor to the Centers arrays it reads from (`contributing_center`, `otherCentersSelected`), it does not change how Lead Center sources its options or auto-adds into those arrays.
- Not changing how ToC prefill populates `contributing_center` vs. `otherCentersSelected` (`applyTocMappingOnLoad`) — only gating removal.
- Not addressing the flat/unmapped vs. split CP2026 UI distinction beyond what the ToC-mapping guard already handles (`isUnmappedOrFlat()` / `planned_result !== false`) — both surfaces reuse the same guard condition, no new UI branch introduced.

## 7. Affected Users, Systems, And Specs

- **Users:** Result reporters on results whose selected indicator has ToC data with planned Contributing CGIAR Centers.
- **Client:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/` (`.component.ts`, `.component.html`, `.service.ts`).
- **Related specs:** `changes/toc-science-program-guard` established the exact guard pattern (`blockIfLastX`, `getRealXCount`, `hasTocPlannedX`) this proposal mirrors for a different array pair; `bugfix/lead-center-full-catalog` and `bugfix/toc-unmapped-orange-notes` established the `contributing_center`/`otherCentersSelected` array semantics and the `planned_result !== false` ToC-mapping check this proposal reuses, not reimplements.

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: Backend-logic/validation change on an existing form; no new screens or layout. The blocking alert reuses the existing `CustomizedAlertsFeService` alert component already used elsewhere in this form (including by the twin Science Program guard) for consistency.

## 9. Requirement Delta Preview

### ADDED Requirements

- The system blocks removing the last remaining Contributing CGIAR Center from a result (combined across `contributing_center` and `otherCentersSelected`) when the linked ToC has planned Centers for that result's indicator, and shows an alert requiring at least one.

### MODIFIED Requirements

- `deleteContributingCenter()` and `deleteOtherCenter()` each gain a precondition check before mutating the underlying array.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Guard in the deletion handlers (recommended)** | Check "is this the last real Contributing CGIAR Center across both arrays AND does the ToC have planned Centers for this result" before allowing `deleteContributingCenter`/`deleteOtherCenter` to mutate state; short-circuit with an alert otherwise. Mirrors `TOC-SP-DD-1`/`TOC-SP-DD-2` exactly, applied to the Centers array pair. | Smallest, most localized change; reuses an already-validated pattern from the sibling spec — lowest regression risk. |
| B — Disable the delete affordance on the last chip | Hide/disable the chip's remove (×) button when it's the last one and ToC-guarded. | Weaker feedback (no explicit "why"); inconsistent with the Science Program guard's chosen UX, which would leave the two "twin" fields behaving differently for no reason. |
| C — Validate only at save-time | Let deletion happen freely; block the whole result save if the final state has zero Centers under ToC guard. | Delays feedback to save time; diverges from the immediate-alert pattern the sibling guard already established and the user is now used to. |

**Recommended: Option A.** It matches the requested "same pattern as Science Programs" behavior exactly, is the smallest change, and reuses a pattern already validated and shipped in the sibling spec — lowest regression risk, and keeps the two "twin" fields behaviorally consistent.

## 11. Risks, Dependencies, And Open Questions

- **Risk:** "Last Contributing CGIAR Center" must be counted across *both* `contributing_center` (minus the `OTHER_CENTERS_CODE` sentinel, per the existing `OTHER_SP_CODE`-exclusion precedent) and `otherCentersSelected` combined — not each array independently — matching the Science Program guard's `TOC-SP-DD-2` decision. Design phase must confirm the exact counting rule against the current code (`getRealScienceCount()` is the direct precedent to mirror as `getRealCenterCount()`).
- **Risk:** Confirmed — an `OTHER_CENTERS_CODE` sentinel analogous to `OTHER_SP_CODE` already exists (`rd-contributors-and-partners.component.ts:152`, `readonly OTHER_CENTERS_CODE = '__OTHER_CENTERS__'`), and its removal already cascades to clear `otherCentersSelected` (`:428`, `if (!this.showOtherCenters) otherCentersSelected = []`) — the exact same cascade shape as the Science Program sentinel. The guard must count this cascade in `willRemoveCount` when the deleted chip is the sentinel itself, exactly as `TOC-SP-DD-2` did for `deleteScience`.
- **Dependency:** Detecting "does the ToC have planned Centers for this result" reuses the existing `tocReferenceCenterInstitutionIds()` (already exposed by `RdContributorsAndPartnersService`, backing the current `hasReferenceCenters` computed at `component.ts:146`) combined with the same `planned_result !== false` check used by `hasTocPlannedScience` and the sibling ToC-mapping guard — should NOT be reimplemented from scratch.
- **Dependency:** The Centers field has two UI shapes (flat/unmapped single dropdown into `contributing_center` directly, vs. split CP2026 ToC/Other(s) dropdowns) per `bugfix/lead-center-full-catalog`'s `LC-DD-5` (`isUnmappedOrFlat()`). The guard's counting logic must work correctly under both shapes — design phase must verify against both, not just the split case that Science Programs happens to always use.
- **No Active Lesson** in `docs/specs/kaizen-log.md` currently applies to this domain.

## 12. Success Criteria

- Deleting Contributing CGIAR Center chips down to exactly one, when the result's ToC has planned Centers, succeeds without alert.
- Attempting to delete the last remaining chip in that same scenario is blocked and shows an alert requiring at least one Contributing CGIAR Center.
- When the result has no ToC-planned Centers (or isn't ToC-mapped), the field can still be emptied entirely — no regression to existing unrestricted behavior.
- Existing sibling-spec behavior (Science Program guard, Lead Center auto-sync, orange-note suppression) is untouched.

## 13. Next Step

```text
/akili-specify docs/specs/changes/toc-center-guard
```
