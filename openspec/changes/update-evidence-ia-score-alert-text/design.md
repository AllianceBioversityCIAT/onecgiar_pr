## Context

P2-3005 is a copy-only adjustment to an existing warning alert in the Result Detail → Evidence section (`rd-evidences`). The alert already exists and is rendered via the shared `app-alert-status` component (`status="warning"`, `[description]` bound to `validateCheckBoxes()` output, which returns an HTML `<ul>` string consumed through `[innerHTML]`).

Current data flow (unchanged by this change):
- `GET_evidences()` populates `evidencesBody` with five `*_tag_level` strings (`gender_tag_level`, `climate_change_tag_level`, `nutrition_tag_level`, `environmental_biodiversity_tag_level`, `poverty_tag_level`) and the `evidences[]` array with the `*_related` checkbox flags.
- `validateCheckBoxes()` builds a local `tags` array mapping each Impact Area to its `level` and its `related` checkbox key, filters those with `level === '3'` (= recorded score of 2) that have no matching evidence checkbox, and renders one `<li>` per remaining tag.
- The result string is bound in `rd-evidences.component.html` via `<app-alert-status *ngIf="validateCheckBoxes()" [description]="validateCheckBoxes()" status="warning">`.

## Goals / Non-Goals

**Goals:**
- Replace the conditional "if" copy with a direct factual statement + call to action.
- Use the official Impact Area names instead of short internal labels.

**Non-Goals:**
- No change to the alert trigger condition (`level === '3'` with no matching `*_related` flag).
- No change to the `isOptional` side effect, the `<ul>/<li>` HTML structure, the `warning` status, or the `app-alert-status` component.
- No change to the `*_tag_level` / `*_related` data contract or any backend code.
- No change to the legacy `climate_change_tag_level → youth_related` mapping quirk.

## Decisions

- **Edit the `tag` label values in place** rather than introducing a separate `label` field. The `tag` property is used in exactly one place (the alert template string), so renaming the values is the minimal change and adds no new structure. (Verified by grep: no other consumer of `tag`.)
- **Keep the `<ul><li>` structure.** Multiple Impact Areas can have a score of 2 simultaneously, so a bulleted list of one sentence per area stays consistent with current rendering.
- **Strengthen the existing unit test** to assert the exact new copy and the absence of " if " (the explicit acceptance criterion), instead of only asserting `toContain('<ul>')`.

## Risks / Trade-offs

- [Tag names hardcoded in the component, not sourced from a shared catalog] → Accepted: this matches the existing implementation; centralizing Impact Area names is out of scope for a copy fix. The official names are also hardcoded in `rd-general-information.component.ts`, so no shared source exists to consume here.
- [Copy could drift from the official Impact Area names if Business renames them] → Mitigation: the unit test pins the exact string for at least one tag, surfacing accidental edits.
