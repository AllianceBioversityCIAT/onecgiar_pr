# Proposal: Guard Against Removing All ToC-Planned Science Programs

## 1. Document Control

| Field | Value |
|---|---|
| Type | Change |
| Slug | `toc-science-program-guard` — derived from free-text argument (no slug/path given) |
| Spec Path | `docs/specs/changes/toc-science-program-guard` |
| Approval Mode | gated |
| Related specs | [`bugfix/lead-center-full-catalog`](../../archive/2026-08-29-bugfix--lead-center-full-catalog/) (same component, analogous auto-add-back pattern for Lead Center), [`bugfix/toc-unmapped-orange-notes`](../../archive/2026-08-29-bugfix--toc-unmapped-orange-notes/) (same component, same ToC-mapping guard family) |

## 2. Intent

When a W1/W2 result's selected indicator carries ToC (Theory of Change) data with planned Contributing Science Programs, the report screen must never let the user save that result with **zero** Science Programs selected — at least one ToC-planned Science Program has to remain.

## 3. Problem / Current Behavior

- Field: "Contributing Science Program/Accelerator" on `rd-contributors-and-partners.component.html:307-380`, backed by `scienceSelected` (ToC-origin chips) and `otherScienceSelected` (manually added chips).
- `deleteScience(index)` in `rd-contributors-and-partners.component.ts` (~line 314) removes a chip with a plain array filter — **no minimum-count check exists**. A user can remove every ToC-planned Science Program (e.g. delete SP01, SP02, SP03 down to zero) and save.
- This mirrors a gap the team already fixed for **Lead Center** (`bugfix/lead-center-full-catalog`), which added an `onLeadCenterSelected` auto-sync so a picked Lead Center always lands in the right underlying array. No equivalent floor/guard exists for Science Programs.

## 4. Proposed Outcome

- If the linked ToC has planned Science Programs for the result's indicator, the user may remove Science Programs down to **one remaining**, but the last one is blocked.
- Attempting to remove the last remaining ToC-planned Science Program shows a blocking alert (toast/dialog, consistent with existing validation alerts in this form) stating that at least one Contributing Science Program is required.
- If the ToC has **no** planned Science Programs for the result (or the result isn't ToC-mapped — same `planned_result !== false` guard used in `toc-unmapped-orange-notes`), no minimum applies; the field can be emptied freely, matching current behavior.

## 5. Scope

- `rd-contributors-and-partners.component.ts` / `.html`: guard in `deleteScience()` (and `deleteOtherScience()` if the last item overall is one from `otherScienceSelected`), gated on ToC planned-SP presence for the current result/indicator.
- New/updated user-facing validation message.
- Regression coverage for: delete-down-to-one (allowed), delete-the-last-one (blocked), no-ToC-data case (unrestricted, unchanged).

## 6. Non-Goals

- Not touching Lead Center or Contributing CGIAR Centers logic — those are separate arrays/catalogs (CLARISA centers vs. CLARISA initiatives) with no code-level coupling to Science Programs (confirmed by codebase research below).
- Not changing how ToC prefill populates `scienceSelected` vs `otherScienceSelected` (`applyTocMappingOnLoad`) — only gating removal.
- Not addressing bilateral/W3 `science_program_id` validation paths (unrelated ingestion flow).

## 7. Affected Users, Systems, And Specs

- **Users:** Result reporters on W1/W2 results whose selected indicator has ToC data with planned Science Programs.
- **Client:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/` (`.component.ts`, `.component.html`, `.service.ts`).
- **Related specs:** the two sibling specs above touch the same file family and already established the `planned_result !== false` ToC-mapping guard pattern this proposal will reuse for detecting "does this result have ToC-planned data."

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: Backend-logic/validation change on an existing form; no new screens or layout. The blocking alert should reuse the existing alert/toast component already used elsewhere in this form for consistency.

## 9. Requirement Delta Preview

### ADDED Requirements

- The system blocks removing the last remaining Contributing Science Program from a W1/W2 result when the linked ToC has planned Science Programs for that result's indicator, and shows an alert requiring at least one.

### MODIFIED Requirements

- `deleteScience()` (and, if applicable, `deleteOtherScience()`) gains a precondition check before mutating the underlying array.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Guard in the deletion handlers (recommended)** | Check "is this the last Science Program chip across both arrays AND does the ToC have planned SPs for this result" before allowing `deleteScience`/`deleteOtherScience` to mutate state; short-circuit with an alert otherwise. | Smallest, most localized change; mirrors the existing `planned_result !== false` guard pattern already in this codebase from the sibling specs. |
| B — Disable the delete affordance on the last chip | Hide/disable the chip's remove (×) button when it's the last one and ToC-guarded. | Prevents the action but gives weaker feedback (no explicit "why"); user may not understand why the last chip can't be removed until they hover/try. |
| C — Validate only at save-time | Let deletion happen freely; block the whole result save if the final state has zero Science Programs under ToC guard. | Delays feedback to save time, worse UX (user does work, then gets rejected), and diverges from the immediate-alert pattern requested. |

**Recommended: Option A.** It matches the requested behavior exactly ("bloquear la acción y mostrar una alerta"), is the smallest change, and reuses an existing guard pattern already validated in two recently-merged sibling specs — lowest regression risk.

## 11. Risks, Dependencies, And Open Questions

- **Risk:** Need to determine "last Science Program" across *both* `scienceSelected` and `otherScienceSelected` combined (not each array independently), since the user's rule is about the field's total count, not per-source-array count. Design phase must confirm this with the user.
- **Dependency:** Detecting "does the ToC have planned Science Programs for this result" reuses the same `planned_result !== false` / ToC-mapping check already implemented by `toc-unmapped-orange-notes` (`isCP2026()` branches) — should NOT be reimplemented from scratch.
- **Open question — "reappears in Contributing CGIAR Centers":** The user's free-text description also mentions that re-selecting a previously removed Science Program can make it appear in the "Contributing CGIAR Centers" field instead. Codebase research found **no code-level coupling** between the Science Program arrays (`scienceSelected`/`otherScienceSelected`, CLARISA-initiative-backed) and the Contributing Centers arrays (`contributing_center`/`otherCentersSelected`, CLARISA-center-backed) — they're fed from different catalogs with no shared state. This may be a UI/labeling confusion (both blocks reuse similar "Other(s)" sentinel patterns) rather than an actual bug. **Recommend treating this as out of scope for this change** and, if reproducible, filing it as its own `bugfix/` proposal with concrete repro steps — bundling an unconfirmed second symptom into this spec would violate the "confirmed root cause" bar for bug fixes.
- **No Active Lesson** in `docs/specs/kaizen-log.md` currently applies to this domain.

## 12. Success Criteria

- Deleting Science Program chips down to exactly one, when the result's ToC has planned Science Programs, succeeds without alert.
- Attempting to delete the last remaining chip in that same scenario is blocked and shows an alert requiring at least one Contributing Science Program.
- When the result has no ToC-planned Science Programs (or isn't ToC-mapped), the field can still be emptied entirely — no regression to existing unrestricted behavior.
- Existing sibling-spec behavior (Lead Center auto-sync, orange-note suppression) is untouched.

## 13. Next Step

```text
/akili-specify docs/specs/changes/toc-science-program-guard
```
