# Requirements — Innovation Use: unit and nature of the number for Farmers actors

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/innovation-use-farmer-count-nature` |
| Module code | `IFC` (Innovation use Farmer Count) |
| Type | Change · Depth: **Standard** |
| Ticket | P2-4048 (`[167167-6]`, Marc Schut, epic P2-3094) |
| Owner | Santiago Sanchez |
| Status | draft |
| Approval Mode | gated |
| Source | `proposal.md` (approved intent) + `mockup/` (wording and placement approved 2026-11-03) |
| Date | 2026-11-03 |

## 1. Executive Summary

On a **2026+ W1/W2 Innovation Use** result, every actor row of type **Farmers/(agro)pastoralists/herders/fishers**, in both the **current use** and the **2030 projection** block, asks two required single-choice follow-up questions under the actor type select: **what was counted** (households or individuals) and **what the number means** (received information/advice/inputs, or applied the innovation). Farmers may be added more than once per block so that both groups can be reported separately. When the unit is Households, the Women/Men × Youth grid is replaced by one total. The answers are stored as neutral codes, they block the section until answered, and they are catalogued for QA. IPSR, bilateral (W3) and phase ≤ 2025 results are unchanged.

## 2. Glossary

| Term | Meaning |
|---|---|
| Farmers row | An active actor row whose actor type is *Farmers/(agro)pastoralists/herders/fishers* |
| Block | Current use (`section_id` 1) or 2030 projection (`section_id` 2) of the Innovation Use section |
| Unit | Answer to Q-a: `households` \| `individuals` |
| Nature | Answer to Q-b: `information_received` \| `innovation_applied` |
| In-scope result | Result type Innovation Use (2), reporting phase year ≥ 2026, source not `API` (W1/W2) |
| Single total | The one-number path that already exists for "Sex and age disaggregation does not apply" |

## 3. System Context & Scope

Refines `docs/prd.md` AC-1 (typed result integrity) and AC-5 (phase/versioning correctness); touches the Result Detail → Innovation Use info flow (`docs/ux-ui/design.md`) and the `result_actors` entity + `validation_innovation_use_P25` green check (`docs/trd/trd.md`).

**In scope:** the W1/W2 Innovation Use form (both blocks), its save/read API, the `result_actors` storage, the live Innovation Use green-check function, phase replication and recovery of the new answers, and the QA catalog.

**Out of scope:** IPSR Step 1/3 (167167-11), the QA assessor view next to the evidence (167167-15), anything bilateral (creation form, ingestion, payloads, review drawer), Innovation Development, the public dashboard, and converting households into people inside totals.

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter | Answers two questions per Farmers row; can add Farmers twice; enters one total for households |
| QA reviewer | The two answers are catalogued fields of the actor rows |
| PMU / portfolio | Farmer numbers become separable by unit and by received vs applied |
| Platform admin | One migration; the green check now includes the new rule |
| IPSR / bilateral users | No change (explicit non-impact) |

## 5. Functional Requirements

### IFC-R-1 — Follow-up block for Farmers rows (MUST)

The system MUST show, for each Farmers row of an in-scope result, in both blocks, a block titled *"Follow-up questions for actor type Farmers/(agro)pastoralists/herders/fishers"* placed directly under the "Actor type" select of that row (the left column), with the two questions of IFC-R-2 and IFC-R-3.

#### Scenario: Farmers selected on a 2026 W1/W2 result
- GIVEN an Innovation Use result with phase year 2026 and source `Result`
- WHEN the submitter selects Farmers as the actor type of a current-use row
- THEN the follow-up block appears under the select of that row
- AND the same happens for a Farmers row of the 2030 projection block
- BUT it must NOT appear for any other actor type
- AND IT MUST disappear, and its answers be cleared, when the row's type changes away from Farmers

#### Scenario: Out-of-scope surfaces
- GIVEN a Farmers row on (a) a phase-2025 result, (b) a bilateral `source = 'API'` result, or (c) IPSR Step 1 / Step 3
- WHEN the form renders
- THEN the follow-up block MUST NOT appear and the row behaves exactly as today

### IFC-R-2 — Q-a unit of counting (MUST)

The system MUST ask *"Do the reported numbers refer to households or individual actors?"* as a required single choice with the options **Households** and **Individual actors**, shown on one line, stored as `households` / `individuals`.

### IFC-R-3 — Q-b nature of the number (MUST)

The system MUST ask *"What best characterises the nature of this innovation use number?"* as a required single choice, with the wording of `mockup/farmer-follow-up-questions.png` verbatim:
- **Actors who received information, advice or inputs**, with its description, stored as `information_received`;
- **Actors who applied the innovation**, with its description, stored as `innovation_applied`;
- followed by the italic helper *"If your numbers include both groups, add the actor type a second time and report each group separately. Receiving and applying are not the same as benefiting; benefit is reported as impact evidence."*

The 2030 projection block uses the same text.
- BUT it must NOT render the mock-up's developer note ("Single choice. Stored as …").

### IFC-R-4 — Farmers more than once per block (MUST)

On in-scope results, the system MUST let the submitter add Farmers more than once in the same block, each row keeping its own answers and numbers through save and reload.

#### Scenario: Two Farmers rows
- GIVEN a 2026 W1/W2 result with a saved Farmers row (Individuals, received)
- WHEN the submitter adds a second Farmers row (Individuals, applied) with different numbers and saves
- THEN after a reload both rows exist with their own answers and numbers
- BUT the second row must NOT overwrite the first
- AND IT MUST keep today's rule for other actor types (an already-chosen type other than Farmers/Other stays disabled)

### IFC-R-5 — Households → single total (MUST)

When Q-a is **Households**, the system MUST hide the Women/Men × Youth grid of that row and ask for one total, using the same single-total behavior as "Sex and age disaggregation does not apply".

#### Scenario: Switch to Households
- GIVEN a Farmers row with Women/Men values
- WHEN the submitter chooses Households
- THEN the grid is hidden, one total field is shown and required, and the gender/youth values of the row are cleared on save
- AND choosing Individuals again restores the grid as today
- BUT it must NOT change rows of other actor types

### IFC-R-6 — Completeness and Submit (MUST)

On in-scope results, the Innovation Use section green check MUST stay incomplete while any active Farmers row of either block lacks a unit or a nature, and the form's mandatory feedback MUST list the missing question.

#### Scenario: Missing answer
- GIVEN a 2026 W1/W2 result whose other Innovation Use fields are complete
- WHEN a Farmers row has a unit but no nature
- THEN the section is not green and the result cannot be submitted
- AND answering it turns the section green
- BUT a phase-2025 result or a bilateral result with the same row MUST keep exactly today's green/red outcome

### IFC-R-7 — Stored values (MUST)

The system MUST store only `households`/`individuals` and `information_received`/`innovation_applied` (or empty), MUST never persist any other value (an unknown value is saved as empty, without failing the section save; see design IFC-DD-3), and MUST keep existing rows untouched (empty) until a submitter answers.

### IFC-R-8 — Replication and recovery (MUST)

Phase replication and deleted-result recovery MUST carry both answers with the actor row.

### IFC-R-9 — QA catalog (MUST)

The QA catalog MUST expose the unit and the nature as fields of the actor rows of both Innovation Use blocks, visible and required only for Farmers on 2026, with closed lists of the four codes, under a new catalog revision.

### IFC-R-10 — No change elsewhere (MUST NOT)

The change MUST NOT alter any existing actor total or sum (current-use totals, previous-phase current use, 2030 projection reads), the 0–9 innovation use level, IPSR, or any bilateral payload.

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | Migration only adds nullable columns; no existing value changes; no bilateral payload change |
| Phase correctness | Gate on the **result's** phase year (not the open phase); `NULL` year = legacy behavior, never a false green |
| Accessibility | Radio groups via the existing `pr-radio-button` primitive, with a programmatic label and keyboard selection |
| Copy | The verbatim strings of IFC-R-1..3; no "reach"/"adoption" added beyond the approved text |
| Security | Existing JWT/role gates; no new endpoint |

## 7. Defect Classes → Gate

| Defect class | Caught by |
|---|---|
| Block shows on the wrong type/phase/source or in IPSR | Client Jest specs of `innovation-use-form` (type, phase, `isIpsr`, source cases) |
| Second Farmers row overwrites the first | Server Jest spec of the save matching + manual save/reload on local |
| Green check wrong (2026 red/green, 2025 or bilateral changed) | **No automated gate**: the function lives only in the DB. Substitute: a SQL check before and after on real rows (2025, bilateral, 2026 with/without answers) run by Santiago, at a HITL pause |
| Answers lost on replicate/recover | Server spec on the replicate SQL column lists + a manual duplicate check on local |
| Invalid code stored | Server DTO validation spec |
| QA catalog drift | Existing catalog specs (shape, golden bindings, snapshot) |
| Layout/placement wrong vs mock-up | **No automated gate** (jsdom cannot lay out). Substitute: a visual check at a HITL pause, comparing with `mockup/` |
| Existing totals change | Server specs of `currentUseActorCount` / previous-phase sums stay green unchanged |

## 8. Requirement ID Index

| ID | Short name | Strength |
|---|---|---|
| IFC-R-1 | Follow-up block for Farmers rows | MUST |
| IFC-R-2 | Q-a unit | MUST |
| IFC-R-3 | Q-b nature | MUST |
| IFC-R-4 | Farmers more than once per block | MUST |
| IFC-R-5 | Households → single total | MUST |
| IFC-R-6 | Completeness and Submit | MUST |
| IFC-R-7 | Stored values | MUST |
| IFC-R-8 | Replication and recovery | MUST |
| IFC-R-9 | QA catalog | MUST |
| IFC-R-10 | No change elsewhere | MUST NOT |

## 9. Open Questions

- `IFC-OQ-1` **Measured in PROD 2026-11-03:** **130** W1/W2 2026 Innovation Use results with a Farmers row in current use, and **34** in the 2030 projection (exactly one Farmers row per result and section); **139 distinct results, all in status 1 (Editing)**, none Submitted or QA. **Resolved 2026-11-03, option A (Santiago):** require it on all 2026 W1/W2 Farmers rows, existing ones included. Nothing submitted turns incomplete, and those results still have to be completed before submit. Users should be told when it ships.
  **Existing 2026 Farmers rows** (replicated from 2025): IFC-R-6 turns them red until answered. Is that accepted? The size comes from the proposal's R-1 query. Default if not answered: accepted, because the ticket requires these answers before 2026 data is used.
