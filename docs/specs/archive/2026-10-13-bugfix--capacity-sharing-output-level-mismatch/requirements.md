# Module Spec — `requirements.md`

> Depth: **Lite** (Bug Mode). Single-file client display bug, no backend/migration change.

---

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** `bilateral-result-creator` — W3/Bilateral breadcrumb result-level label
- **Owner:** QA (reported) / Bilateral module
- **Status:** draft
- **Ticket(s):** none (QA finding, no P2 ticket provided)
- **Type:** Bug

---

## 2. Context

QA reproduced live on TEST (prtest.ciat.cgiar.org, 2026-10-13): creating a W3/Bilateral result with Result Level = **Output** and Result Type = **Capacity Sharing for Development** renders a detail-page breadcrumb reading `Outcome | W3/Bilateral | IRRI | R-A-2013-126` — the opposite of the level actually selected and persisted.

Root cause confirmed by code investigation (not guessed): `BilateralResultCreatorComponent.resultLevelName` (`onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts:197-211`) maps `result_level_id` 3 → `'Output'` and 4 → `'Outcome'` — **inverted** relative to every other mapping in the codebase:

- `ResultLevelEnum` (`onecgiar-pr-server/src/shared/constants/result-level.enum.ts`): `INITIATIVE_OUTCOME = 3`, `INITIATIVE_OUTPUT = 4`.
- `BilateralResultLevelSelectorComponent` (`.../bilateral-result-level-selector.component.ts:3-6`): `{id:3,label:'Outcome'}`, `{id:4,label:'Output'}`.
- `RESULT_LEVEL_LABELS` / `RESULT_TYPES_BY_LEVEL` (`onecgiar-pr-client/.../shared/result-types-by-level.ts:3-19`).
- `bilateral-change-result-type-dialog.component.ts:15-23`.
- Seed data (`onecgiar-pr-server/src/migrations/1665530247113-refactorResultLevels.ts:61-67`): Capacity Sharing for Development is seeded under the **Output** level.

The frontend submits the correct selected level and the backend validates and persists it unchanged (`bilateral-center.service.ts:527-535,555-567`) — **this is a display-only bug**, not a persistence bug, and not a case where "Output" should be removed as a selectable level for this type (Output is the correct and only intended level for Capacity Sharing for Development).

Touches `docs/ux-ui/design.md` §6 (Layout Patterns — page shell breadcrumb) and `docs/trd/trd.md` §6 (Frontend Architecture, `pages/bilateral`).

---

## 3. In Scope / Out of Scope

### In scope

- Correct the `resultLevelName` id→label mapping in `bilateral-result-creator.component.ts` so it matches `ResultLevelEnum` (3 = Outcome, 4 = Output).
- A regression test proving the previous (wrong) mapping is red and the corrected mapping is green.

### Out of scope

- Any backend change — the backend already persists the submitted level correctly (confirmed, not assumed).
- Removing or restricting the "Output" option for Capacity Sharing for Development — Output is the correct, intended, and only valid level for this type; the QA report's alternative hypothesis does not apply.
- Levels 1 (`Initiative`) and 2 (`End of Initiative Outcome`) in the same `switch` — not reachable from the bilateral creation flow (`BilateralResultLevelSelectorComponent` only offers ids 3/4) and are not mislabeled relative to any other source in the codebase.
- Extracting a shared `RESULT_LEVEL_LABELS`-style constant used by both the selector and the creator component (a reasonable follow-up, but out of scope for a one-line display fix — see `design.md` DD-1).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | The W3/Bilateral breadcrumb now shows the level they actually selected at creation. |
| QA reviewer | The reviewer sees the correct level while assessing a bilateral result. |
| Bilateral consumer (downstream) | Not affected — `/api/bilateral/*` payloads are untouched; this is a client-only display fix. |

---

## 5. User Stories

- **`BIL-US-1`** — As a result submitter, I want the breadcrumb strip on a W3/Bilateral result to show the Result Level I actually selected at creation, so that I don't mistake an Output result for an Outcome (or vice versa) when reviewing it later. Refines `US-S1` (`docs/prd.md`).

---

## 6. Functional Requirements

### Required (MUST)

- **`BIL-R-1`** The W3/Bilateral breadcrumb strip (`bilateral-page-header`, `data-testid="bilateral-header-level"`) MUST display the label corresponding to the result's actual `result_level_id` using the canonical mapping (`3 → 'Outcome'`, `4 → 'Output'`), matching `ResultLevelEnum` and `BilateralResultLevelSelectorComponent`.

#### Scenario: Output-level bilateral result shows "Output"

- GIVEN a submitter creates a W3/Bilateral result with Result Level = Output (`result_level_id = 4`) and Result Type = Capacity Sharing for Development (`result_type_id = 5`)
- WHEN the result is created and its detail page breadcrumb renders
- THEN the breadcrumb strip MUST show `Output`
- BUT it must NOT show `Outcome`

#### Scenario: Outcome-level bilateral result shows "Outcome"

- GIVEN a submitter creates a W3/Bilateral result with Result Level = Outcome (`result_level_id = 3`) and any valid Outcome-level Result Type (Policy Change, Innovation Use, or Other Outcome)
- WHEN the result's detail page breadcrumb renders
- THEN the breadcrumb strip MUST show `Outcome`
- BUT it must NOT show `Output`
- AND IT MUST continue reading `result_level_id` from `BilateralCreationService.resultLevelId()` (the persisted, server-sourced value) rather than deriving the label from `result_type_id`

---

## 7. Non-Functional Requirements

Not applicable beyond the existing platform baseline — this is a pure display-mapping correction with no new surface, no new data flow, and no performance/security impact.

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BIL-AC-1` | A W3/Bilateral result persisted with `result_level_id = 4` | The result detail page renders | `resultLevelName()` returns `'Output'` and the breadcrumb shows `Output` |
| `BIL-AC-2` | A W3/Bilateral result persisted with `result_level_id = 3` | The result detail page renders | `resultLevelName()` returns `'Outcome'` and the breadcrumb shows `Outcome` |

Cross-cutting project ACs that already apply (not restated): `AC-1` Typed result integrity (this fix makes the *displayed* level honest to the *persisted* level, closing a gap in AC-1's intent).

**Defect class this spec can produce, and its gate:** an incorrect id→label mapping for a known, closed enumeration (`result_level_id` ∈ {1,2,3,4}). Caught by a unit test asserting the computed's exact output string for each reachable id (3 and 4) — fully automated, no gap, no HITL substitute needed.

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- None new. Reads the existing `BilateralCreationService.resultLevelId()` signal, already populated from the GET response (`bilateral-creation.service.ts:208`).

### Downstream consumers

- `bilateral-page-header.component` (`[resultLevelName]="resultLevelName()"` binding) — the only consumer of this computed; unaffected in its own contract (it still receives a string or `null`, just the correct one).

### Assumptions

- None beyond what was verified in `design.md`'s Premise Ledger.

---

## 10. Open Questions

None. Root cause and fix location are confirmed, not open.

---

## 11. Out-of-Band Notes

Blast radius (confirmed by investigation): this mislabeling affects **every** W3/Bilateral result at level 3 or 4 — i.e. every bilateral result type, not only Capacity Sharing for Development. An Outcome-level result (Policy Change, Innovation Use, Other Outcome) currently shows "Output"; an Output-level result (Capacity Sharing for Development, Knowledge Product, Innovation Development, Other Output) currently shows "Outcome". The fix corrects all of these at once because it swaps the two case values in the single shared `switch`.

---

## Required cross-references

- `docs/prd.md` — `US-S1` (typed result capture), `AC-1` (typed result integrity).
- `docs/ux-ui/design.md` — §6 Layout Patterns (page shell / breadcrumb), §8 Component Inventory (result-level badges MUST use the canonical mapping).
- `docs/trd/trd.md` — §2 Domain Modules (`pages/bilateral`), §6 Frontend Architecture.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — not touched (no payload change).
