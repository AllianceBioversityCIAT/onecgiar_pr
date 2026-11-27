# Requirements — Innovation Use 2026: W3/Bilateral aligned with the pooled form

## 1. Document Control

| Field | Value |
|---|---|
| Module | `bilateral` — W3 Innovation Use form (`type-innovation-use`), mounted in the centre editor `/bilateral/<centre>/result/<code>`. *Corrected at archive 2026-11-26: result-detail renders the pooled `innovation-use-form` for W3 results, not this component (P-7 refuted, execution.md IWA-T-3)* |
| Spec path | `changes/innovation-use-2026-w3-pooled-alignment` |
| Type | Change |
| Deliverable | software |
| Depth | **Lite** — client-only, one component (+ the shared Farmers copy once OQ-1 is answered) |
| Approval Mode | gated (inherited from `proposal.md`, approved 2026-11-26) |
| Status | approved 2026-11-26 (Phase 1 → Continue) |
| Ticket | SR/INC-169264 — Nicoleta Trifa PRTest feedback 2026-11-26 |
| ID prefix | `IWA` |
| Depends on | `changes/innovation-use-2026-total-and-new-users` (IU26: W3 totals, CUU block, 2026 phase gate) |

## 2. Executive Summary

On a **2026** W3/Bilateral Innovation Use result, the current-use part shows the same categories, fields and button labels as the pooled (W1/W2) form: Actors → **Organizations** → Other quantitative measures, no "Addressing demands", and "Add actor / Add organization / Add other". "Of which NEW" stays W1/W2-only (IU26). 2025 results and the bilateral API do not change.

## 3. Glossary

| Term | Meaning |
|---|---|
| Pooled | W1/W2 results — shared form `shared/components/innovation-use-form` |
| W3 | W3/Bilateral results — `pages/bilateral/components/section-type-specific/type-innovation-use` |
| Main block | The always-visible part of the W3 form, above "Complete full metadata" |
| Full metadata | The optional section behind the W3 toggle `showAllFields()` |
| 2026 gate | Phase year ≥ 2026 — the same gate IU26 uses (`currentUseTotalLabels`) |

## 4. System Context & Scope

Current behavior (cited in `proposal.md` §3, C-1..C-4):

- Organizations are only reachable inside full metadata (`type-innovation-use.component.html:210-227`), yet their total already feeds the W3 tiles (`type-innovation-use.component.ts:337-340`).
- W3 actor and organization cards show "Addressing demands" (`type-innovation-use.component.html:525,594`); the pooled current-use form has none.
- W3 buttons read "Add another actor" (`:136`), "Add another organization" (`:226`), "Add other" (`:179`); pooled reads "Add actor", "Add organization", "Add other" (`innovation-use-form.component.html:336,440,498`).
- The Farmers follow-up text is one shared constant (`farmer-follow-up.ts:46,52`) — already identical on both screens.

| In scope | Out of scope |
|---|---|
| W3 current-use layout, fields and labels for 2026+ | 2025 W3 screen (stays as is) |
| Shared Farmers copy (OQ-1 answered: remove) | `/api/bilateral/*`, bulk upload, DB schema |
| W3 component specs and folder `CLAUDE.md` | "Of which NEW" on W3 · PDF · QA drawer · IPSR · 2030 projection |

## 5. Stakeholders / Personas

| Persona | Interest |
|---|---|
| Centre reporter (W3 screen) | Same form as pooled colleagues; sees Organizations without hunting |
| Centre integrator (bilateral API) | Nothing changes for them |
| Nicoleta Trifa / Marc Schut (PMU) | Consistent data across funding sources |

## 6. Functional Requirements

### Requirement IWA-R-1: Organizations in the W3 main block (2026)

The W3 form SHALL show the Organizations category in the main block for 2026+ results, between Actors and Other quantitative measures, as an optional section.

#### Scenario: 2026 W3 result
- GIVEN a W3 result in a 2026 phase, with full metadata collapsed
- WHEN the reporter opens Innovation use
- THEN the order is Actors → Organizations → Other quantitative measures
- AND an organization added there counts in the "Organizations" tile
- BUT it must NOT add Organizations to the screen MDS or to the submit gate (optional, like pooled — OQ-2)
- AND IT MUST NOT render Organizations twice (not again inside full metadata)

#### Scenario: 2025 W3 result
- GIVEN a W3 result in the 2025 phase
- WHEN the reporter opens Innovation use
- THEN Organizations stays inside full metadata, exactly as today

#### Scenario: "To be determined"
- GIVEN a 2026 W3 result with "This is yet to be determined" ticked
- THEN Organizations is hidden together with Actors and measures (same rule as the actor rows)

### Requirement IWA-R-2: No "Addressing demands" on 2026 W3 current use

The W3 form SHALL NOT show "Addressing demands" on current-use actor and organization cards for 2026+ results, and SHALL keep any stored value.

#### Scenario: Hidden, data kept
- GIVEN a 2026 W3 result whose actor has `addressing_demands = "x"` (e.g. sent by the API)
- WHEN the reporter edits that actor's figures and the form saves
- THEN the field is not shown
- AND the saved payload still carries `addressing_demands = "x"`
- BUT it must NOT send `null` or `""` for it
- AND IT MUST still show the field on 2025 results

### Requirement IWA-R-3: Pooled button labels (2026)

For 2026+ results the W3 current-use add buttons SHALL read "Add actor", "Add organization" and "Add other". 2025 keeps today's labels (IU26 test step 3: "the screen looks exactly as before").

### Requirement IWA-R-4: Farmers follow-up copy without the two examples

The Farmers follow-up descriptions SHALL NOT list "climate advisories" nor "actively used a digital tool or service" (OQ-1, Nicoleta 2026-11-26 09:43, Teams: "it is not listed for pooled results, it's only listed for w3/bilat … I haven't seen these examples used in PRMS for w1/w2 innov use"). One constant serves pooled and W3, so both change together.

#### Scenario: Both screens
- GIVEN any 2026 result (pooled or W3) with a Farmers row
- THEN "Actors who received information…" does not list "climate advisories"
- AND "Actors who applied the innovation" does not list "actively used a digital tool or service"
- AND the rest of each description is unchanged, word for word
- AND IT MUST change in one place only (`farmer-follow-up.ts`); the server holds only the labels, not the descriptions (`label-sources.ts:403`)

### Requirement IWA-R-5: Bilateral contract unchanged

The `/api/bilateral/*` request and response shapes SHALL NOT change.

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| IWA-NFR-1 | Client build (`ng build`/type-check) green |
| IWA-NFR-2 | Existing W3 component spec suite green; no lowered coverage |

### Defect classes → gate

| Defect class | Gate |
|---|---|
| Wrong order / section missing / duplicated | Component spec on the real template: DOM order of section headers for 2026 and 2025 |
| Stored `addressing_demands` lost on save | Unit spec on the save payload builder with a pre-filled value |
| MDS accidentally changed | Spec on `updateMds()` field list unchanged |
| 2025 regression | Same specs at phase 2025 |
| Compile-only error | Client build / type-check |
| Visual look on the real page (spacing, the tile) | **No automated check** — human check on PRTest (W3 8427, 2025 6433) at the HITL pause, then Nicoleta's acceptance |

## 8. Requirement ID Index

| ID | Title | Status |
|---|---|---|
| IWA-R-1 | Organizations in the W3 main block (2026) | ready |
| IWA-R-2 | No "Addressing demands" on 2026 W3 current use | ready |
| IWA-R-3 | Pooled button labels (2026) | ready |
| IWA-R-4 | Farmers follow-up copy without the two examples | ready |
| IWA-R-5 | Bilateral contract unchanged | ready |

## Open Questions

| # | Question | Owner | Default |
|---|---|---|---|
| OQ-1 | Remove "climate advisories" and "actively used a digital tool or service"? | Nicoleta | **Answered 2026-11-26: remove** (she reports pooled does not show them; code shows one shared text — removing it satisfies both readings) |
| OQ-2 | Organizations optional in W3? | Santiago | **Optional** (applied) |
