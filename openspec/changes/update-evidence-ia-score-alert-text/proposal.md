## Why

When a result records a **principal contribution score (2)** for an Impact Area in the General Information section, the Evidence section shows a warning alert reminding the user to attach supporting evidence. Business reviewed the current copy and flagged two problems (P2-3005):

- The sentence is phrased as a **conditional** ("...must have the X checkbox marked **if** the X tag has a score of 2"), which reads as hypothetical when the score of 2 has already been recorded — it should state the fact and the required action directly.
- It uses **short internal tag names** ("gender", "climate change", "environment") instead of the official Impact Area names users see elsewhere in the platform.

This is a **frontend-only**, copy-only change. No backend work is required.

## What Changes

- Reword the Evidence-section warning alert shown per Impact Area with a recorded score of 2, removing the conditional "if" phrasing.
- New copy, one line per affected Impact Area:
  > `A principal contribution score (2) has been recorded for {Impact Area name}. Please provide evidence to support this claim.`
- Replace the short internal tag labels with the official Impact Area names:
  - `gender` → **Gender equality, youth and social inclusion**
  - `climate change` → **Climate adaptation and mitigation**
  - `nutrition` → **Nutrition, health and food security**
  - `environment` → **Environmental health and biodiversity**
  - `poverty` → **Poverty reduction, livelihoods and jobs**
- No change to the alert's trigger logic, styling (`warning` status), per-tag iteration, or the `isOptional` side effect.

## Capabilities

### New Capabilities
- `evidence-ia-score-alert`: The behavior and copy of the warning alert shown in the Evidence section when one or more Impact Areas have a recorded score of 2 and lack a matching evidence checkbox.

### Modified Capabilities
<!-- None — no existing spec covers this behavior. -->

## Impact

- **Frontend only** — `onecgiar-pr-client`.
- File: `src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` — `validateCheckBoxes()` (the `tags` array labels + the per-tag alert template string).
- Test: `rd-evidences.component.spec.ts` — `validateCheckBoxes` describe block.
- No backend, API, entity, DTO, or migration changes. No change to the `*_tag_level` / `*_related` data contract from `GET_evidences()`.
- SDD baseline: UI copy governed by `docs/system-design/design.md` (alerts use the shared `app-alert-status` component); no requirement-level change to `docs/prd.md` or `docs/detailed-design/detailed-design.md`.
- Jira: **P2-3005** (Enhancement under epic P2-2338 "Enhancements 2026").
