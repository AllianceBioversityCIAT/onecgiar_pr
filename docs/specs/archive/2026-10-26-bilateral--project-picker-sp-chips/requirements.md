# Requirements — Science Program chips in the replicated-result project picker (`PSC`)

## 1. Document Control

| Field | Value |
|---|---|
| Module / sub-feature | `bilateral` / project picker SP chips |
| Spec path | `docs/specs/bilateral/project-picker-sp-chips/` |
| Type | Change |
| Depth | Lite |
| Approval Mode | gated |
| Status | approved (Santiago Sanchez, 2026-10-26) |
| Owner | Santiago Sanchez |
| Source | `proposal.md` (approved 2026-10-26; OQ-1..OQ-4 recommendations accepted) |
| Related | archived `bilateral/replicated-innovations-2026-pa` (PAA — Section 0 project + P/A assignment, P-4, PAA-R-6); P2-3807 (id vs code) |

## 2. Executive Summary

On a **replicated** W3/Bilateral result, the Section 0 Project dropdown gets a row of Science Program chips. The chip of the result's current primary program (carried from the previous phase) is on by default, so the list opens showing projects linked to that program. Reporters can switch any number of chips on/off (OR), combine with text search, or clear them to see everything. Nothing about saving changes. Client-only.

## 3. Glossary

| Term | Meaning |
|---|---|
| Catalogue | Projects of the result's lead Center, as returned by `GET /api/bilateral/center/projects`, each with its reportable Science Program mappings |
| Program code | Official SP code (e.g. `SP06`) — the identity shared by the stored primary and the catalogue mappings |
| Default program | The result's stored role-1 (primary) program; for a replicated result this is the previous-phase program unless already changed |
| Replicated result | `result.is_replicated = 1` |

## 4. Scope

**In:** inline (Section 0) project picker of replicated results, both the "has lead project" and "no lead project" branches.
**Out:** create wizard; non-replicated results; server/API/payload; save rules and Program (P/A) selection; persistence of chip state.

## 5. Personas

| Persona | What changes |
|---|---|
| Result submitter (Center reporter) re-pointing a replicated 2026 result | Sees projects of the result's previous program first; can filter by several programs |
| Everyone else | No change |

## 6. Functional Requirements

### PSC-R-1 — Chip row on replicated results only

The project picker SHALL show a Science Program chip row inside the open dropdown, between the search box and the option list, only when the picker is the inline (Section 0) variant **and** the result is replicated.

#### Scenario PSC-S-1.1: Replicated result

- GIVEN a replicated result in Section 0 whose catalogue maps projects to SP01, SP03 and SP06
- WHEN the reporter opens the Project dropdown
- THEN a chip row is shown with one chip each for SP01, SP03, SP06
- AND each chip shows the program code, short name and the number of catalogue projects mapped to it
- AND chips are ordered by program code ascending

#### Scenario PSC-S-1.2: Not replicated / wizard

- GIVEN a non-replicated result in Section 0, or the create wizard
- WHEN the dropdown opens
- THEN no chip row is rendered
- BUT the list and search MUST behave exactly as today

#### Scenario PSC-S-1.3: Only programs present in the catalogue

- GIVEN a catalogue where no project maps to SP12
- THEN no SP12 chip exists
- AND IT MUST deduplicate programs by program code (two projects mapping SP06 → one SP06 chip with count 2)
- AND IT MUST NOT render the chip row when the catalogue has no program mappings at all

### PSC-R-2 — Default program chip pre-selected

The chip matching the result's default program SHALL be selected when the chip row first appears, matched **by program code** (trimmed, case-insensitive), never by id.

#### Scenario PSC-S-2.1: Default present

- GIVEN a replicated result whose stored primary is SP06 and the catalogue has projects mapped to SP06
- WHEN the dropdown opens for the first time
- THEN the SP06 chip is selected
- AND only projects mapped to SP06 are listed

#### Scenario PSC-S-2.2: Id mismatch (P2-3807)

- GIVEN the stored primary carries the CLARISA initiative id (e.g. 52) and the catalogue mapping carries a different W3 mapping id (e.g. 269) for the same code SP06
- THEN the SP06 chip is still pre-selected
- BUT a catalogue program whose id equals the stored id with a different code MUST NOT be pre-selected

#### Scenario PSC-S-2.3: Default absent

- GIVEN the stored primary is missing, or no catalogue project maps to its code
- THEN no chip is pre-selected and the full list is shown

#### Scenario PSC-S-2.4: Reporter's choice is kept

- GIVEN the reporter changed the chip selection
- WHEN they close and reopen the dropdown (same result, no saved primary change)
- THEN their chip selection is still in effect
- AND IT MUST re-seed to the new default once a different primary program is saved

### PSC-R-3 — Multi-chip OR filter combined with search

The list SHALL show a project when it maps to **any** selected program; text search SHALL further narrow that set (AND). With no chip selected, the list SHALL be the full catalogue filtered only by search (today's behavior).

#### Scenario PSC-S-3.1: Two chips

- GIVEN SP01 and SP03 are selected
- THEN the list is exactly the projects mapped to SP01 or SP03, each listed once
- AND projects mapped to neither are hidden

#### Scenario PSC-S-3.2: Chips + search

- GIVEN SP06 is selected and the reporter types "potato"
- THEN only SP06-mapped projects whose code or name contains "potato" are listed

#### Scenario PSC-S-3.3: Toggle off

- WHEN the reporter deselects the last selected chip
- THEN the full catalogue (search-filtered) is listed again

#### Scenario PSC-S-3.4: Selecting does not commit

- WHEN the reporter toggles a chip
- THEN the dropdown stays open and no project is selected or saved
- BUT it MUST NOT change the staged project, the Program field, or any stored value

### PSC-R-4 — Empty state and clear

When the chip filter (with or without search) leaves zero projects, the list SHALL show "No projects for the selected programs" with a *Clear filters* action that deselects all chips. A *Clear* action SHALL also be available whenever at least one chip is selected.

#### Scenario PSC-S-4.1

- GIVEN SP12 is selected and the search text matches no SP12 project
- THEN the empty message and *Clear filters* are shown
- WHEN *Clear filters* is activated
- THEN all chips are deselected and the list is search-filtered only

### PSC-R-5 — Accessible chips

Chips SHALL be native buttons, keyboard-operable (Tab, Enter/Space), and expose selection with `aria-pressed`; the row SHALL have an accessible group label ("Filter by Science Program"). Clicking a chip MUST NOT close the dropdown (no propagation to the overlay).

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| PSC-NFR-1 | No new HTTP request: chips and filtering derive from the already loaded catalogue and stored primary |
| PSC-NFR-2 | No server, migration, or bilateral payload diff |
| PSC-NFR-3 | Chip row wraps within the dropdown width (≤ 13 SPs) without horizontal page scroll; option list keeps its scroll |
| PSC-NFR-4 | UI uses existing Spartan primitives (`hlmBtn` / `hlmBadge`) and existing tokens; no new colors |

## 8. Defect classes → gates

| Defect class | Caught by |
|---|---|
| Wrong filter set (OR/AND, dedupe, no-chip fallback) | Jest — selector spec (PSC-S-1.3, 3.1–3.3) |
| Default chip by id instead of code / wrong default | Jest — id-mismatch fixture (PSC-S-2.2) |
| Chip row leaking to non-replicated results or wizard | Jest (PSC-S-1.2) |
| Chip click closes dropdown or stages a project | Jest — DOM click, assert open + no `projectSelected` emit (PSC-S-3.4) |
| `aria-pressed`/group label missing | Jest presence check — proves presence only |
| Layout: chip row overflow, wrapping, scroll inside dropdown | **No automated check** (jsdom cannot measure layout) → manual browser check on local stack at the execute HITL pause (open dropdown only, never click Save — shared prdb) |
| Code format drift between stored primary and catalogue | Mitigated by normalization; confirmed in code (server maps catalogue `programCode` against initiative `official_code`) — residual verified in the browser check |

## 9. Requirement ID Index

| ID | Title | Scenarios |
|---|---|---|
| PSC-R-1 | Chip row on replicated results only | S-1.1, S-1.2, S-1.3 |
| PSC-R-2 | Default program chip pre-selected | S-2.1, S-2.2, S-2.3, S-2.4 |
| PSC-R-3 | Multi-chip OR filter + search | S-3.1, S-3.2, S-3.3, S-3.4 |
| PSC-R-4 | Empty state and clear | S-4.1 |
| PSC-R-5 | Accessible chips | — |
| PSC-NFR-1..4 | Non-functional | — |
