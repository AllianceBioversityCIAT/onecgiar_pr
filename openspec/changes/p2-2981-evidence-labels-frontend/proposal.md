## Why

The Evidence section of PRMS result forms uses outdated, inconsistent guidance text. The client (Nicoleta Trifa, CGIAR System Org) requested clearer labels so submitters understand when an uploaded file becomes public and how evidence relates to each result typology. This change delivers the **frontend text/label updates** for ticket **P2-2981 (INC-152147)**. The persistence of the new per-typology checkbox is **out of scope** (separate backend task owned by Juanda).

## What Changes

- Rename the public-file question: "Is this a public file?" → **"Can this evidence be shared publicly?"** (standard evidence item and the innovation-development evidence component).
- In the "NOT public" info note, add a second bullet: *"Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products."*
- Make the checkbox-group **title dynamic by result typology**: "Indicate whether this evidence is related to an Impact Area score of 2 and/or to the **{typology}** metadata" ({typology} = Innovation Use / Policy Change / Capacity Sharing for Development / Knowledge Product / Other Output / Other Outcome / Innovation Development).
- Update the intro notes: replace bullet 1 with the new legacy-result text, **remove** "Please list evidence from most to least important", and **remove** the "innovation readiness level" evidence bullet.
- The new per-typology **type checkbox** keeps using existing fields where they exist (innovation_use, innovation_readiness). For typologies without a column it is **deferred** to the backend task. New checkboxes are **informational** — no new validation rules.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `result-evidence`: Evidence section copy — public-file question label, "NOT public" info note bullets, dynamic checkbox-group title per result typology, and intro/guidance notes are updated. No change to validation behavior; checkbox persistence for new typologies is out of scope.

## Impact

- **Client only** (`onecgiar-pr-client`):
  - `pages/results/pages/result-detail/pages/rd-evidences/evidence-item/evidence-item.component.{html,ts}`
  - `pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/components/user-evidence/user-evidence.component.{html,ts}`
  - `pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` (`alertStatus()` intro notes)
  - Specs: `evidence-item.component.spec.ts`, `rd-evidences.component.spec.ts`
- **No backend changes** in this change. Dependency: the per-typology checkbox persistence requires 5 new nullable boolean columns on the `evidence` table (Juanda's separate ticket); `knowledge_product_related` is an ID and is NOT reusable.
- No API contract changes, no migrations, no validation/green-check changes.
