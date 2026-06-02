## Why

The Evidence section of PRMS result forms uses outdated, inconsistent guidance text and only shows the per-typology checkbox for two result types. The client (Nicoleta Trifa, CGIAR System Org) requested clearer labels; the team (Ángel Jarrín) extended this to a consistent per-typology title + checkbox across all result types. This change delivers the **frontend** work for ticket **P2-2981 (INC-152147)**. The DB columns and server-side persistence are **out of scope** (separate backend task owned by Juanda); the frontend will already send the new fields so persistence "lights up" once the columns exist.

## What Changes

- Rename the public-file question: "Is this a public file?" → **"Can this evidence be shared publicly?"** (both evidence components).
- **Public** info note: replace the third bullet *"You agree to the link to the file being displayed in the CGIAR Results Dashboard."* with **"Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products."** (per Ángel's updated User Story, 2026-06-02). In the innovation-dev component (which has no third bullet), add this bullet to the public branch. The "NOT public" branch is unchanged.
- Make the checkbox-group **title dynamic by result typology**: "Indicate whether this evidence is related to an Impact Area score of 2 and/or to the **{typology}** metadata".
- Show the **per-typology type checkbox** for all typologies (Innovation Use, Policy Change, Capacity Sharing for Development, Knowledge Product, Other Output, Other Outcome, Innovation Development), bound to `*_related` fields on the evidence model. Checkboxes are **informational** (no new validation). Persistence of the new typologies is completed by the backend task; the frontend already sends the fields.
- Update the intro notes: replace bullet 1 with the new legacy-result text, **remove** "Please list evidence from most to least important", and **remove** the "innovation readiness level" evidence bullet. The existing knowledge-product intro branch is preserved.
- Bring the **innovation-dev evidence component** (`user-evidence`) in line with the standard evidence item: add the dynamic title and the typology/Impact-Area checkboxes it currently lacks.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `result-evidence`: Evidence-section behavior — public-file question label, public info-note third bullet, dynamic per-typology checkbox-group title, per-typology informational checkboxes shown for all typologies, and updated intro notes. No change to existing validation/green-check behavior; server persistence of new typology fields is out of scope.

## Impact

- **Client only** (`onecgiar-pr-client`):
  - `pages/results/pages/result-detail/pages/rd-evidences/evidence-item/evidence-item.component.{html,ts}`
  - `pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/components/user-evidence/user-evidence.component.{html,ts}`
  - `pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` (`alertStatus()` intro notes; preserve the `isKnowledgeProduct` branch)
  - `pages/results/pages/result-detail/pages/rd-evidences/model/evidencesBody.model.ts` (`EvidencesCreateInterface` — add new `*_related` fields)
  - Specs: `evidence-item.component.spec.ts`, `user-evidence.component.spec.ts`, `rd-evidences.component.spec.ts`
- **No backend changes** here. Dependency: server persistence of the new typology checkboxes (columns `policy_change_related`, `capacity_sharing_related`, `other_output_related`, `other_outcome_related`, `knowledge_product_metadata_related` — existing `knowledge_product_related` is an ID, NOT reusable) is Juanda's separate ticket. Until then, the new checkboxes render and are sent in the payload but are not persisted server-side.
- No API contract changes from the client side beyond extra optional fields, no migrations, no validation/green-check changes.
