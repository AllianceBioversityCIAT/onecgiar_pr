## Why

P2-3036 Level 2 (subtask **P2-3062**). After the copy-only Level 1, this level makes the **edit-existing** changes to the Contributors & Partners (P25) section per the 2026 Excel: remove a field, conditionally remove fields in the "No" scenario, and relax a validation. Still **frontend only**, on existing fields — no new fields and no backend (those are Level 3 / Juan David).

## What Changes

In `rd-contributors-and-partners` (P25) and its `multiple-wps-content` subcomponent:

1. **Remove the "Submitter" field** (Excel row 3). Delete the `app-pr-select label="Submitter"` block and its "…not possible to change the submitter" note (rd-contributors-and-partners.component.html ~lines 5–32). The service keeps setting `changePrimaryInit` so the save payload is unaffected.
2. **No scenario — remove "Level"** (Excel row 20). The Level dropdown (multiple-wps-content.component.html ~line 3) must not render when the ToC answer is **No** (`isUnplanned`).
3. **No scenario — remove "High Level Output/Intermediate Outcome/2030 Outcome"** dropdown (Excel row 21). The second/Title dropdown block (multiple-wps-content.component.html ~lines 18–65) must not render when `isUnplanned`.
4. **Relax word limit 30 → 50** on "Why is the result being reported?" (Excel row 24). `[maxWords]="30"` → `"50"` (rd-contributors-and-partners.component.html ~line 71).

Explicitly **NOT** changed:
- **Lead center** stays in its current position (Excel said move; Ángel confirmed with Juan Pablo: do NOT move).
- Hiding the new Centers/Science-Program info notes in the No scenario — those info notes are **new** (Level 3); their visibility rule ships with them.
- All Level 3 work (new read-only fields, radio, Other(s), centers/SP-from-ToC) and all backend.

## Capabilities

### New Capabilities
- `toc-contributors-edits`: Field-level edit behavior of the P25 Contributors & Partners section for 2026 — removal of the Submitter field, conditional removal of Level and HLO/Outcome in the "No" scenario, and the relaxed justification word limit. No new fields, no backend.

### Modified Capabilities
<!-- None at requirement level beyond the new capability above. -->

## Impact

- **Files (client):**
  - `rd-contributors-and-partners.component.html` — remove Submitter block; `maxWords` 30→50.
  - `components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.html` — gate Level and HLO/Outcome dropdowns on `!isUnplanned`.
- **Behavioral note:** removing the Submitter UI also removes the ability to change the primary initiative from this section (already disabled when a single accepted initiative existed). `changePrimaryInit` continues to be set in `rd-contributors-and-partners.service.ts` (~line 261), so PATCH save is unchanged.
- **No** API/DTO/entity/routing/theme/backend changes. Component tree is excluded from Jest coverage → gate is build + visual before/after.
- **Risk:** low — UI removals and one validation constant; the only logic touched is two `*ngIf/@if` visibility conditions and one block deletion.
