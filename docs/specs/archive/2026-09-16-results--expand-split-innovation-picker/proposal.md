# Proposal: Expand Split-Innovation Picker to All Active Innovations

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `expand-split-innovation-picker` — derived from free-text argument (image + Spanish/English request describing the change) |
| Spec Path | `docs/specs/results/expand-split-innovation-picker/` |
| Type | **Change** |
| Approval Mode | `gated` (default — no explicit pre-approval mandate given) |
| Parent Spec | none |
| Author context | User-supplied screenshots (Image #10, Image #11) + inline request, 2026-09-16 |

## 2. Intent

When a result submitter marks a pooled innovation as **"Discontinued: splitting into multiple innovations"** in Annual Updating, the **"Which innovations did this one split into?"** picker currently only offers innovations that are already **Quality Assessed / Approved**. The user wants that pool widened to **all active, non-discontinued innovations** — including ones freshly reported and not yet QA'ed — because a brand-new innovation can legitimately be the one absorbing a discontinued innovation's scope. The user also wants the picker's **look and interaction model** upgraded to match the richer filtered/searchable picker already used for "Is this result linked or bundled with another CGIAR-reported result?" (Image #11).

## 3. Problem / Current Behavior

- **Data scope (server):** `ResultRepository.getMergeSplitTargetInnovations()` (`onecgiar-pr-server/src/api/results/result.repository.ts` ~L3010) filters candidates to `status_id IN (MERGE_SPLIT_TARGET_STATUS_IDS)`, where `MERGE_SPLIT_TARGET_STATUS_IDS = [QualityAssessed(2), Approved(6)]` (~L82). A newly reported innovation still in `Editing`/`Submitted` status is invisible to this dropdown even though it is active and not discontinued.
- **Copy:** The field's helper text in both the merge and split pickers (`rd-annual-updating.component.html` L109 and L127) literally says *"Only quality-assessed innovations that are not themselves discontinued can be selected."* — accurate today, but it will be stale once the filter is widened, and the user wants it removed regardless.
- **UI:** The picker is a plain `app-pr-multi-select` (client-side search over a pre-fetched list) — a simple checkbox list with no filter affordances. It does not match the richer picker pattern (search bar + filter chips + scrollable checkbox rows + selection footer) already established for the "linked or bundled result" field in `rd-contributors-and-partners.component.html`/`.ts` (~L589–707), which the user wants mirrored here.

## 4. Proposed Outcome

- The split-target picker (and, pending one open question below, the merge-target picker, since both currently share the same catalogue and endpoint) lists **all active (`is_active = TRUE`), non-discontinued (`is_discontinued IS NULL OR FALSE`) Innovation Development results**, regardless of QA status — not just `QualityAssessed`/`Approved`.
- The info text no longer references "quality-assessed"; it describes the actual eligibility rule (active, not discontinued, not itself).
- The picker's visual/interaction pattern is upgraded to the searchable/filterable style used in Image #11 (search bar + scrollable checkbox rows with a clear selection affordance), scoped to whichever filter dimensions are actually meaningful for a single-typology (Innovation Development), single-portfolio-relevant candidate list — not a blind copy of every filter chip from the linked-result picker.

## 5. Scope

- `onecgiar-pr-server`: `result.repository.ts` → `getMergeSplitTargetInnovations()` status filter; `MERGE_SPLIT_TARGET_STATUS_IDS` constant (or its replacement logic).
- `onecgiar-pr-client`: `rd-annual-updating.component.ts/html` — info text, and swapping the plain `app-pr-multi-select` binding for the new/upgraded picker UI.
- A new or extracted shared "filtered result picker" building block, styled after the `rd-contributors-and-partners` linked-result picker, sized to this use case (server-side search stays server-side; no client-side full-list refetch).

## 6. Non-Goals

- Not touching the "linked or bundled result" picker itself (`rd-contributors-and-partners`) beyond using it as a visual/interaction reference.
- Not changing eligibility rules for the third, separate QA'd-innovation-link single-select noted in that same file.
- Not relaxing the result-type constraint — candidates stay scoped to Innovation Development results (the user only asked to drop the QA-status gate, not the type gate).
- Not building a fully generic, reusable "result picker" component library in this change unless the Recommended Approach below is accepted; a narrower, purpose-built picker is the default scope.

## 7. Affected Users, Systems, And Specs

- **Users:** Result submitters doing Annual Updating on pooled innovations (discontinuation / split flow).
- **Systems:** `onecgiar-pr-server` (`results.controller.ts`, `results.service.ts`, `result.repository.ts`), `onecgiar-pr-client` (`rd-annual-updating` component, `results-api.service.ts` `GET_mergeSplitTargetInnovations`).
- **Specs:** No existing spec folder for pooled-innovation split/merge; `docs/specs/results/linked-results-filters` documents the precedent UI pattern being referenced (per that folder's `CLAUDE.md`) but is not itself modified.

## 8. Visual Reference

- Source: User-provided screenshots (current behavior + desired style reference), pasted inline in this conversation.
- Location: Image #10 (current split-target picker, plain checkbox list, "Discontinued: splitting into multiple innovations" flow) and Image #11 (desired style — the "linked or bundled result" picker with search bar, result-typology chips, portfolio All/P22/P25 toggle, funding-source W1W2/W3-Bilateral toggle).
- Notes: Image #11's full filter-chip set is typology/portfolio/funding-tuned for a cross-typology, cross-portfolio result list. The split-target list is always single-typology (Innovation Development). Carrying over the *visual language* (search bar, scroll list, chip-style filters, footer) is in scope; carrying over *irrelevant filter dimensions* (typology chips, funding source) is not — see Recommended Approach.

## 9. Requirement Delta Preview

### ADDED Requirements

- Split-target (and, pending confirmation, merge-target) candidates include any active, non-discontinued Innovation Development result regardless of `status_id`, not only `QualityAssessed`/`Approved`.
- A searchable, filterable picker UI for this field, visually aligned with the linked-result picker pattern.

### MODIFIED Requirements

- `getMergeSplitTargetInnovations()` status filter: from `status_id IN (2, 6)` to "no status restriction" (still gated by `is_active` and `is_discontinued`).
- Info text on both merge and split pickers: remove "quality-assessed" wording.
- Picker component: from plain `app-pr-multi-select` to the new/extracted filtered-picker pattern.

### REMOVED Requirements

- None.

## 10. Approach Options

**Option A — Recommended: Broaden the server-side filter; build a purpose-built filtered picker (not a full copy of Image #11's chip set).**
Drop the `status_id IN (...)` clause in `getMergeSplitTargetInnovations()` (keep `is_active`, `is_discontinued`, self-exclusion, result-type, and the version-dedup logic as-is). Build a small shared component that reuses the *search + scrollable checkbox list + footer* pattern visually, but only exposes filter chips that are meaningful for this candidate set (e.g., a portfolio/phase toggle if useful — TBD in `/akili-specify`), rather than typology/funding chips that would always be single-valued here. Keeps server-side search/pagination (the endpoint already supports `search`/`limit`, just unused by the client today) — no regression to full-client-side-list scale.
*Trade-off:* still net-new UI work, but scoped tightly; avoids inheriting meaningless filters.

**Option B — Extract and directly reuse `rd-contributors-and-partners`'s picker as a generic shared component with its full filter set.**
Heavier lift (that picker isn't currently a standalone component/module — it's private markup+getters) and it would surface typology/funding-source chips that are always single-valued for this use case, which is confusing UI. Also its data source is a fully-client-filtered list (`InnovationUseResultsService`), architecturally opposite of the server-filtered merge/split endpoint — reusing it as-is means either abandoning server-side filtering or forking it to support two fetch modes.

**Option C — Minimal: broaden the backend filter only, keep the existing plain multi-select UI.**
Satisfies the data-scope ask but explicitly ignores the user's restyle request ("usa el mismo estilo del dropdown... con filtros y todo"). Not recommended since the visual upgrade was explicitly requested.

**Recommendation:** Option A — it's the smallest change that satisfies both the data-scope fix and the explicit styling request, without inheriting filter chips that don't apply to this candidate set or forking a client-heavy fetch pattern onto a server-filtered endpoint.

## 11. Risks, Dependencies, And Open Questions

- **OQ-1 — Does the merge dropdown get the same broadening?** Merge and split currently share one endpoint call and one `mergeSplitCatalogue` array, distinguished only by `transition_type`. Broadening the query benefits both automatically; the user only mentioned "split" explicitly. Needs a yes/no before `/akili-specify` — if merge should stay QA-gated, the endpoint needs a `transition_type`-aware filter, adding complexity.
- **OQ-2 — Which filter dimensions actually apply?** Since candidates are always Innovation Development results, typology chips are meaningless. A portfolio/phase-year toggle may still be useful at scale (the merge/split endpoint already paginates via `limit`); to be settled in `/akili-specify` design.
- **Risk — status broadening side effects:** Removing the QA-status gate could let a submitter target an innovation that is itself mid-review or about to be rejected. No compensating control is proposed here beyond the existing `is_discontinued` and self-exclusion checks; flag for QA/PM sign-off during specify.
- **Dependency:** Reuses the existing `GET /v2/api/results/get/merge-split-target-innovations/:resultId` endpoint's unused `search` param — wiring it up server-side-first avoids re-fetching the full innovation catalogue client-side.

## 12. Success Criteria

- A newly reported (non-QA'ed), active, non-discontinued Innovation Development result appears and is selectable in the split-target picker.
- QA'ed/Approved innovations continue to appear (no regression).
- Discontinued or inactive innovations, and the innovation being edited itself, never appear.
- The info text no longer mentions "quality-assessed."
- The picker visually matches the search + scrollable list + chip-filter interaction pattern from Image #11, scoped to dimensions relevant to this candidate set.

## 13. Next Step

```text
/akili-specify docs/specs/results/expand-split-innovation-picker
```
