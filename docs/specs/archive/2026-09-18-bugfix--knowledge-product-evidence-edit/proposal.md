# Proposal — Knowledge Product Evidence: Enable Tag-Marker Editing

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/knowledge-product-evidence-edit` |
| Slug | `knowledge-product-evidence-edit` — derived from free-text argument (Hector Tobon's bug report + Santiago's framing) |
| Type | Bug |
| Approval Mode | gated |
| Author (session) | Proposed on behalf of santiago.sanchez@cgiar.org |
| Date | 2026-09-08 |
| Related | `docs/specs/bugfix/evidence-modal-sticky-actions/`, `docs/specs/bugfix/evidence-storage-link-validation/`, `docs/specs/bugfix/p2-3355-kp-section-five-empty/` (same `rd-evidences` / Knowledge Product surface) |

## 2. Intent

Let a submitter mark which Impact-Area tag(s) a Knowledge Product's (synced) CGSpace evidence supports, so a KP result with a Principal (score = 2) contribution score can actually satisfy its own evidence requirement and reach the green check / submission state.

## 3. Problem / Current Behavior

**Reported by Hector Tobon (Slack, 2026-09-08):** *"otro bug. Cuando traigo una evidencia de CGSpace y la marco como que tiene principal contribution score, me sale en la sección de evidence que hay algo incompleto que debo llenar. Pero la interfaz está toda en modo lectura. No me está permitiendo como completar algo."*

For Knowledge Product results (`result_type_id === 6`), the Evidence section renders every evidence card **fully read-only** — there is no way to open it for editing at all:

- `rd-evidences.component.html:42` — the edit/delete icon pair (`.ev_actions`) is hidden by `*ngIf="!dataControlSE.isKnowledgeProduct && ..."`.
- `rd-evidences.component.html:98` — the "Add evidence" button is hidden by `*ngIf="... && !this.api.dataControlSE.isKnowledgeProduct && ..."`.

Both are the only two triggers that open `<app-evidence-item>` inside the create/edit modal. For a KP result, neither renders, so the modal — and the Impact-Area tag checkboxes it contains (`evidence-item.component.html:105-128`, e.g. `gender_related`, `youth_related`, `nutrition_related`, …) — is **unreachable**.

Meanwhile `RdEvidencesComponent.validateCheckBoxes()` (`rd-evidences.component.ts:431`) requires, for every Impact-Area tag whose `*_tag_level === '3'` (Principal), that **at least one evidence row carry the matching `*_related` flag**. Since KP evidence rows are synced in from CGSpace with those flags defaulted to falsy and the UI gives no way to set them, this check can never pass — the yellow warning ("A principal contribution score (2) has been recorded for … tag. Please provide evidence to support this claim.") is permanent, and `evidenceSectionComplete` (`rd-evidences.component.ts:472`) never turns green for a KP result with any Principal Impact-Area score. This blocks AC-6 (evidence completeness) from ever being satisfiable for that result.

## 4. Bug Diagnosis

### Observed Symptom

On a Knowledge Product result, after CGSpace evidence is synced and an Impact-Area score is set to Principal (2), the Evidence section shows a persistent "incomplete" warning demanding evidence for that tag — but every control in the section is read-only, so the warning can never be resolved.

### Reproduction Steps

1. Open a result of type Knowledge Product (`result_type_id = 6`).
2. Sync/attach evidence from CGSpace (`sync-button`), or have an existing synced evidence row.
3. In General Information, set any Impact-Area score (e.g. Gender equality, youth and social inclusion) to Principal (level `'3'`).
4. Go to the Evidence section.
5. **Expected:** a way to indicate which tag(s) the existing evidence supports, clearing the warning.
6. **Actual:** the evidence card has no edit affordance (no pencil icon), no add-evidence button, and no way to check "Gender equality, youth and social inclusion" (or any tag) on that evidence. The warning never clears; the section's green check never completes.

### Root Cause (confirmed)

`rd-evidences.component.html` gates the **only two entry points** into the evidence edit modal (`editEvidence()` via the pencil icon at line 42, and `addEvidence()` via the button at line 98) behind `!dataControlSE.isKnowledgeProduct`. This was written to prevent submitters from manually adding/editing/removing CGSpace-synced evidence rows (correct for the link/file/description fields) — but it also hides the tag-marker checkbox block that already exists in `evidence-item.component.html:105-128` and is **not itself gated on `isKnowledgeProduct`**. The checkbox UI was built to work for KP; the surrounding entry point was not.

### Impact & Scope

- Affects every Knowledge Product result that has any Impact-Area score set to Principal (2) — a common combination, since Knowledge Products are explicitly the type `alertStatus()` (`rd-evidences.component.ts:70`) already singles out for a lighter evidence requirement ("this section only requires an indication of whether the knowledge product is associated with any of the Impact Area tags").
- Blocks the Evidence section's green check and therefore submission readiness (AC-6) for those results — a hard blocker, not cosmetic.
- No data-integrity risk: the fix only needs to expose already-existing, already-validated fields (`*_related` booleans) on already-existing evidence rows. It does not touch evidence creation, deletion, or the link/file/source fields.

### Fix Strategy

Smallest safe correction, scoped to the KP case only:

1. In `rd-evidences.component.html`, add a **KP-specific edit trigger** on each evidence card (reuse the existing pencil icon / `editEvidence(i)` call) so the modal opens for Knowledge Products too. Keep the delete icon and the "Add evidence" button hidden for KP — CGSpace sync remains the only way to add/remove evidence; a maximum of the tag-marker fields is what's editable.
2. In `evidence-item.component.html`, when `isKnowledgeProduct` is true inside the modal, keep the existing "Source of evidence" radio hidden and the Link field disabled (already the case at lines 5 and 20) — no behavior change there — and leave the tag checkbox block (lines 105-128) as the only interactive part of the form, plus the description textarea (already unconditional).
3. Saving reuses the existing `confirmCreateEvidence()` → `onSaveSection()` → `POST_evidences` path (already used for every other result type); no API/contract change.
4. Route: `/akili-specify bugfix/knowledge-product-evidence-edit` in **Bug Mode** — this has a real (if small) UI/logic change and needs a regression test (e.g. a KP result with a Principal score must be completable once a tag is checked on its evidence), so it does not qualify for `/akili-quick`.

If the root cause were only "the checkboxes are missing," this would be a one-line CSS/template fix; it is instead a missing entry point, so a scoped `*ngIf` change plus a regression test is the right size.

## 5. Proposed Outcome

- A Knowledge Product evidence card gets a single **edit (pencil)** affordance that opens the existing evidence modal.
- Inside that modal, for Knowledge Products: the "Source of the evidence" (link vs. upload) fields stay locked (unchanged from today), but the **Impact-Area tag checkboxes become checkable**, letting the submitter say which tag marker(s) this evidence supports.
- No "Add evidence" and no "Delete evidence" for Knowledge Products — evidence rows continue to come exclusively from CGSpace sync.
- Once the relevant tag is checked, the existing `validateCheckBoxes()` / `evidenceSectionComplete` logic (unchanged) naturally clears the warning and the section can go green.

## 6. Scope

- `rd-evidences.component.html` — reveal the edit (pencil) trigger for Knowledge Products; keep delete and add-evidence hidden for KP.
- `evidence-item.component.html` / `.ts` — no structural change expected; the tag checkbox block already renders correctly once the modal is reachable. Verify `getEvidenceRelatedTitle()` copy still reads correctly for KP (`resultTypeLabels[6] = 'Knowledge Product'`).
- A regression test asserting: KP result + Principal score + evidence with matching tag checked → `evidenceSectionComplete` is `true`.

## 7. Non-Goals

- No change to how KP evidence is added or synced from CGSpace (`sync-button`, `SharePointUploadService`, CGSpace metadata mapping) — out of scope.
- No change to the Link/file/source-of-evidence fields for KP — they remain read-only/disabled, matching current (correct) behavior.
- No change to non-KP result types' evidence editing behavior.
- No change to the underlying `validateCheckBoxes()` / Principal-score business rule itself — only to whether the UI lets the user satisfy it.

## 8. Affected Users, Systems, And Specs

- **Users:** Result submitters authoring Knowledge Products with at least one Principal (2) Impact-Area score.
- **Systems:** `onecgiar-pr-client` only — `pages/results/pages/result-detail/pages/rd-evidences/` and its `evidence-item/` child. No server change identified (the same `POST /api/evidences/create/:resultId` payload shape already supports these boolean flags).
- **Specs:** none currently own this exact behavior; nearest siblings are `bugfix/evidence-modal-sticky-actions` (same modal) and `bugfix/p2-3355-kp-section-five-empty` (same KP + evidence surface).

## 9. Visual Reference

- Source: None
- Location: n/a
- Notes: Backend-unchanged, UI-only change reusing the existing evidence modal and its existing (already-styled) tag checkboxes — no new visual surface to mock. Reporter's screenshot (Hector Tobon, Slack) shows the read-only card and the "incomplete" warning; kept as bug evidence, not a design reference.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Scoped edit trigger (recommended)** | Show only the pencil/edit icon for KP evidence cards; modal already disables the non-tag fields for KP. | Smallest change, reuses 100% of existing modal/validation code, matches the ask exactly ("no se va a permitir añadir más, solo seleccionar el tag marker"). |
| B — New lightweight "tag only" inline editor | Build a separate, smaller UI (e.g. inline checkboxes on the card, no modal) just for KP tag selection. | More UI surface to build and test for no functional gain — the modal + checkboxes already exist and already render correctly for KP once reachable. |
| C — Auto-derive tags from CGSpace metadata | Have the CGSpace sync set `*_related` flags automatically from the item's subject/metadata instead of a manual UI. | Requires a mapping the team hasn't defined (which CGSpace fields map to which Impact Area), server-side changes, and doesn't match the explicit ask for the user to "seleccione a qué tag marker está haciendo referencia esta evidencia." Bigger, unscoped bet. |

## 11. Recommended Approach

**Option A.** It is a two-`*ngIf` change plus a regression test, reuses validated code (the tag checkboxes and the save pipeline already work for every other result type), and matches the requirement precisely: editable evidence for the tag-marker selection only, no ability to add more evidence for Knowledge Products.

## 12. Risks, Dependencies, And Open Questions

- **Risk (low):** Exposing the pencil icon must not also re-enable delete or "Add evidence" for KP — the fix must add a *new*, narrower condition rather than simply removing the existing `isKnowledgeProduct` exclusions wholesale.
- **Dependency:** None on other in-flight specs; touches a leaf template/edit-trigger, not shared state.
- **Open question:** Should the Link/description fields remain visible-but-disabled in the modal for KP (current behavior), or should the modal show a KP-specific slimmed-down view with only the checkboxes + description? Recommend keeping the current fields visible-but-disabled (Option A as scoped) unless `/akili-specify` surfaces a UX reason to hide them — smaller diff, and the disabled state already communicates "this came from CGSpace, not editable here."

## 13. Success Criteria

- A Knowledge Product result with a Principal (2) Impact-Area score can have its Evidence section reach `evidenceSectionComplete = true` by checking the matching tag on an existing (CGSpace-synced) evidence row, with no code path that lets the user add a new evidence row or edit the link/file for a KP.
- Existing non-KP evidence editing behavior is unchanged (no regression in `rd-evidences.component.spec.ts` / `evidence-item.component.spec.ts`).
- A new regression test (red before the fix, green after) locks: KP + Principal tag level + evidence with tag checked → warning clears / section complete.

## 14. Next Step

```text
/akili-specify bugfix/knowledge-product-evidence-edit
```
Run in **Bug Mode** — convert the confirmed root cause above into a fix plan and a mandatory regression test.
