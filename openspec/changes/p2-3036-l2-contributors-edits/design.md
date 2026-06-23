## Context

Level 2 edits existing fields in the P25 Contributors & Partners section. Two files:
- `rd-contributors-and-partners.component.html` — hosts the Submitter block (`@if (getConsumed())`, ~lines 5–32) and the "Why is the result being reported?" textarea (`[maxWords]="30"`, ~line 71, rendered only when `planned_result === false`).
- `multiple-wps-content.component.html` — renders **Level** (`app-pr-select label="Level"`, ~line 3, wrapped in `*ngIf="resultLevelId === 1 ? !activeTab?.planned_result : true"`) and the **HLO/Outcome (Title)** dropdown (`@if (secondFieldLabel() && activeTab.toc_level_id)` switch, ~lines 18–65). The component receives `isUnplanned` (= the ToC answer is "No").

The Indicator + Contribution-target block already renders only when `!isUnplanned` (~line 67), so it needs no change.

## Goals / Non-Goals

**Goals:** remove Submitter; in the "No" scenario hide Level and HLO/Outcome; raise the justification limit to 50 words. Keep diffs minimal and reversible.

**Non-Goals:** no Lead-center move; no new fields/info-notes; no backend; no change to the YES-scenario rendering of Level/HLO (they stay in YES).

## Decisions

**D1 — Hide (not delete) Level & HLO in the No scenario via `!isUnplanned`.**
Level and HLO must still render in the YES scenario, so this is a visibility rule, not a removal. Add `&& !isUnplanned` to the Level wrapper `*ngIf` (line 3) and to the HLO `@if` condition (line 18). Chosen over deleting because the same fields are required in YES. The existing `resultLevelId === 1 ? !planned_result : true` term stays; we AND `!isUnplanned` so NO always hides them.

**D2 — Delete the Submitter block outright.**
Row 3 says "Remove this field" unconditionally (both scenarios). Delete the `app-pr-select label="Submitter"` and the adjacent "…not possible to change the submitter" note. Keep the service's `changePrimaryInit` assignment so the PATCH body is unchanged (no save regression). Alternative (hide with `*ngIf="false"`) rejected — dead markup.

**D3 — `maxWords` constant 30 → 50.**
Single attribute change on the existing `app-pr-textarea`. The word-counter logic already enforces `maxWords`; no other change needed.

## Risks / Trade-offs

- [Removing Submitter hides change-primary-initiative control] → Intended per Excel; was already disabled for single-initiative results. `changePrimaryInit` still set in service → save unaffected. Mitigation: verify save + green-check on a multi-initiative result.
- [Hiding Level/HLO in NO could strand previously-saved toc_level_id/toc_result_id] → In the 2026 NO flow these are not used; saved values are simply not shown/edited. Confirm no validation requires them when `isUnplanned` (the `[required]="!isUnplanned"` already makes them optional in NO).
- [No unit tests] → component excluded from coverage; gate = build + before/after on a YES result (Level/HLO still show) and a NO result (Level/HLO gone, Submitter gone, 50-word limit).

## Open Questions

- **OQ1:** In the NO scenario, should the whole `multiple-wps` tab UI still appear (now empty of Level/HLO) or collapse entirely? Excel only lists field removals; default is to keep the container and just hide Level/HLO. Confirm visually against the mockup when implementing.
