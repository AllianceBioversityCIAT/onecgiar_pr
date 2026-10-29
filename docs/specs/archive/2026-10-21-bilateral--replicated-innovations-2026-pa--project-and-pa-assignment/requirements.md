# Requirements — Let Centers pick the 2026 project and P/A on replicated innovations

## 1. Module / Feature

| Field | Value |
|---|---|
| Module | `bilateral` (client: result editor Section 0 `section-zero-dashboard` + Contributors `section-contributors`) |
| Sub-feature | `replicated-innovations-2026-pa/project-and-pa-assignment` (child #1 of `family.md`) |
| Requirement prefix | `PAA` |
| Depth | **Standard (compact)**: client-only, reuses an existing endpoint, no migration, no payload change |
| Owner | Santiago Sanchez |
| Status | approved (2026-10-16) |
| Approval Mode | `gated` (inherited from `proposal.md`) |
| Ticket(s) | Freshdesk INC-164073 (due 2026-10-24); no Jira (`PAA-OQ-1`) |
| Source | `proposal.md` (2026-10-16), corrected by code discovery: see §11 |

## Executive Summary

A W3/bilateral result that has **no lead 2026 project** (63 replicated innovations today) gets the same **project + P/A picker** in Section 0 that results with a project already have. The Center links a project from its catalogue, chooses the P/A among that project's Programs, and the result immediately shows the default ToC block. Linking stays **optional**. The Contributors section stops saying "cannot be changed" and points to where it can be changed. For the 30 results whose P/A does not match their project, the existing flow is **verified**, not rebuilt.

## Glossary

| Term | Meaning |
|---|---|
| Lead project | Active `results_by_projects` row with `is_lead = 1` for the result |
| No lead project | No such row. Section 0 renders *"No project linked"* today |
| P/A | Primary Science Program/Accelerator: the active `results_by_inititiative` row, role 1 |
| Assignment save | `PATCH /api/bilateral/center/primary-assignment/:resultId`: writes the lead project + P/A in one transaction (P2-3283) |
| Center catalogue | Projects with a confirmed, positive allocation for the result's lead Center in the active year (`getProjectsByCenter`) |
| Group A / B | Group A: 30 results whose P/A ≠ project's 2026 Programs. Group B: 63 results with no lead project (13-Oct Excel) |

## 2. Context

Nicoleta Trifa (INC-164073, 15-Oct-2026) asked that Centers can change the P/A of replicated innovations and, for the 63 with no 2026 project, *optionally* add a Center W3/bilateral project from a drop-down. She does **not** want an SQL alignment.

Verified in code (2026-10-16):

- The assignment save already **creates** the lead row when none exists (`bilateral-center.service.ts` transaction, `if (!existingTargetProject) save(...)`), validates the project against the lead Center's catalogue and the P/A against that project, and, since 2026-10-07, **transfers the P/A directly** (no acceptance round), retiring the previous P/A's ToC mapping.
- The client hides the picker when there is no lead project (`section-zero-dashboard.component.html`, `@else` → `bp-empty-hint` "No project linked"). **That is the only gap for group B.**

References: `docs/prd.md` G3 / US-D1 · `docs/ux-ui/design.md` §8 · archive `2026-09-18-bilateral--toc-default-linkage` (BIL-TOC), `2026-10-02-bilateral--lead-project-not-in-contributors` (LPC) · `section-zero-dashboard/CLAUDE.md` (P2-3283, P2-3759, P2-3760, RRC).

## 3. In Scope / Out of Scope

### In scope
- Section 0: project + P/A picker in the no-lead-project state of an editable bilateral result.
- Contributors: helper copy under the read-only P/A.
- Verification of the group A switch on a real replicated result.

### Out of scope
- Server changes (the endpoint already does what is needed; `PAA-P-1` confirmed).
- SQL alignment of P/A; remapping L-CIA023; adding projects to CLARISA.
- Changing P/A **without** a project (proposal Option C; `PAA-OQ-2`).
- The rule "P/A ∈ project's Programs" (P2-3283 / P-7) and the default ToC logic (BIL-TOC).
- Replicating `results_by_projects` on phase change (separate debt).
- The Center Overview line (sibling child #2).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Center User / admin) | Can link a 2026 project + P/A to a result that has none; is told where to change the P/A |
| SP reviewer | Receives results already under the P/A the Center chose (direct transfer, existing behaviour) |
| PMU / P/A (Nicoleta) | More replicated innovations show the default ToC block |
| Bilateral consumer | No change (no payload change) |

## 5. User Stories

- **US-PAA-1:** As a Center User editing a replicated 2026 innovation whose 2025 project has no 2026 record, I want to pick one of my Center's 2026 projects and its P/A, so that the result gets the project's default ToC block.
- **US-PAA-2:** As a Center User whose result's P/A does not match its 2026 project, I want to switch the P/A to one of the project's Programs, so that the ToC section shows the project's nodes.
- **US-PAA-3:** As a Center User reading the Contributors section, I want to know where the P/A can be changed, so that I do not conclude it is locked.

## 6. Functional Requirements

### Required (MUST)

#### `PAA-R-1` — Picker in the no-lead-project state

An editable bilateral result with no lead project SHALL show, in Section 0, the same project picker and P/A picker shown for a result that has a lead project. The project options come from the Center catalogue.

**Scenario 1 — picker shown**
- GIVEN result 27270 (ILRI, Editing) with no lead project
- WHEN the Center User opens the result
- THEN Section 0 shows the project picker listing ILRI's 2026 catalogue projects
- AND a Program field that asks for a selection once a project is chosen
- BUT it must NOT show the static text "No project linked" while the result is editable

**Scenario 2 — read-only stays static**
- GIVEN a result with no lead project that is read-only (status Pending Review / Approved, or a user without edit rights on the lead Center)
- WHEN Section 0 renders
- THEN it shows "No project linked" with no picker
- AND IT MUST NOT render any control that can send an assignment save

#### `PAA-R-2` — Saving links project and P/A in one operation

Choosing a project and a P/A and saving SHALL persist both through the existing assignment save, after which the result shows the project and its P/A.

**Scenario 1 — project with one Program**
- GIVEN a result with no lead project and a chosen project allocated to exactly one Program
- WHEN the user chooses the project
- THEN that Program is preselected as P/A
- AND saving sends one assignment save with that project and Program
- AND after the reload Section 0 shows the project and Program, and the ToC section shows the default block when the project has nodes under that Program, otherwise the Yes/No question (BIL-TOC, unchanged)

**Scenario 2 — project with several Programs**
- GIVEN a chosen project allocated to two Programs (e.g. A-AG10156 → SP06, SP07)
- WHEN the user chooses the project
- THEN the save is not offered until a Program is chosen
- AND IT MUST NOT send an assignment save without a P/A

**Scenario 3 — server rejection**
- GIVEN the server rejects the save (project not eligible for the lead Center, P/A not aligned, catalogue unavailable)
- WHEN the save returns an error
- THEN Section 0 shows the existing save-error message ("The project and Primary Science Program could not be updated. Please try again.") and the result is left unchanged on screen
- BUT it must NOT show the picked project as linked

#### `PAA-R-3` — Linking is optional

A result with no lead project SHALL remain fully usable without linking one.

**Scenario — user does not pick**
- GIVEN a result with no lead project
- WHEN the user edits other sections and never touches the picker
- THEN no assignment save is sent
- AND the result keeps its current P/A and the Yes/No ToC question
- AND IT MUST NOT gain any new submit blocker or "missing field" because of the empty project

#### `PAA-R-4` — Group A switch works on replicated results

For an editable result that has a lead project and whose P/A is not among the project's Programs, the Program picker SHALL list the project's Programs and saving one SHALL switch the P/A.

**Scenario — SP09 → SP06**
- GIVEN result 28073 (AfricaRice, lead A-AG10156 mapped to SP06/SP07, P/A SP09)
- WHEN the user opens the Program picker in Section 0
- THEN it lists SP06 and SP07 and shows SP09 as the current value
- AND choosing SP07 and saving makes SP07 the P/A, and the ToC section shows A-AG10156's SP07 nodes
- BUT it must NOT show an empty picker or "This project has no alternative Primary Science Program" for a two-Program project

#### `PAA-R-5` — Contributors points to where the P/A changes

The helper under the read-only P/A in Contributors SHALL tell the user the P/A is changed in Section 0 (Project information), instead of saying it cannot be changed.

**Scenario**
- GIVEN any bilateral result with a P/A, open in the editor
- WHEN the Contributors section renders
- THEN the helper reads as a pointer to Project information (copy in `internationalization/`)
- AND IT MUST NOT contain "cannot be changed here"

#### `PAA-R-7` — The project list is the result's lead Center catalogue (added in execute, 2026-10-16, owner request)

In Section 0 of an existing result, the project picker SHALL list the catalogue of the **result's lead Center**, the same catalogue the server validates the save against, even when the page was opened under another Center (e.g. a `CIAT (Alliance)` result opened from the `Bioversity (Alliance)` page).

**Scenario — result opened under another Center**
- GIVEN a result whose lead Center is CIAT (Alliance), opened at `/bilateral/Bioversity (Alliance)/result/:id`
- WHEN Section 0 renders the project picker
- THEN it lists CIAT (Alliance)'s projects
- BUT it must NOT list the page Center's projects, which the server would reject on save
- AND the create wizard (no result loaded) keeps using the page Center's catalogue

### Should (SHOULD)
- `PAA-R-6`: In the no-lead-project state, Section 0 SHOULD show one short line explaining that linking a 2026 project gives the result its project's default ToC (copy in `internationalization/`).

### Could (MAY)
- None.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Security | Server authority unchanged: catalogue ownership, allocation, alignment and Center permission stay enforced server-side; the client never bypasses them |
| Backwards compatibility | No API, payload or DB change. Results with a lead project render exactly as today |
| Accessibility | The picker reuses the existing controls (keyboard, focus ring, labels); no new control types |
| Internationalization | Every new or changed string goes through `src/app/internationalization/` |
| Data safety | Browser checks on the shared prdb never click Save; the saving check runs only on a result the owner designates (`PAA-OQ-5`) |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `PAA-AC-1` | Editable result, no lead project | Section 0 renders | Project picker + Program field are visible; "No project linked" is not (R-1 S1) |
| `PAA-AC-2` | Read-only result, no lead project | Section 0 renders | "No project linked", no picker, no save control (R-1 S2) |
| `PAA-AC-3` | One-Program project picked | User saves | One PATCH with project + that Program; screen shows both (R-2 S1) |
| `PAA-AC-4` | Two-Program project picked, no Program chosen | — | No save offered; no PATCH sent (R-2 S2) |
| `PAA-AC-5` | Server returns 400 | Save fails | Existing save-error message shown; project not shown as linked (R-2 S3) |
| `PAA-AC-6` | Result with no lead project, picker untouched | User edits elsewhere / submits | No PATCH; no new blocker (R-3) |
| `PAA-AC-7` | 28073-like result (P/A outside project) | Program picker opened | Lists project Programs; switch saves (R-4) |
| `PAA-AC-8` | Any result | Contributors renders | Helper points to Project information; no "cannot be changed here" (R-5) |
| `PAA-AC-9` | Existing result, lead Center ≠ page Center | Section 0 picker loads | Catalogue requested for the result's lead Center code; wizard keeps the page Center (R-7) |

### Defect classes and the gate that catches each

| Defect class | Caught by |
|---|---|
| Picker not rendered / rendered when read-only (R-1) | Jest on `section-zero-dashboard`, asserting the **rendered DOM** (zoneless; class-property asserts are not proof, per the folder `CLAUDE.md`) |
| Wrong or premature PATCH (missing P/A, sent untouched) (R-2, R-3) | Jest: spy on `PATCH_primaryAssignment` call count and arguments |
| Error not surfaced / stale project shown (R-2 S3) | Jest: PATCH error → `assignmentError` text in DOM |
| Real data shape breaks the picker (loaded project without `sciencePrograms`, replicated-result specifics) (R-4, R-2 S1) | **No automated check**: fixtures cannot prove the real payload. Substitute: **HITL browser check** on 27270 (group B) and 28073 (group A), read-only up to opening the pickers; the save is run by the owner on a designated result (`PAA-OQ-5`) |
| Default ToC block not shown after linking (R-2 S1) | Same HITL check, after the owner's save |
| Copy regression (R-5, R-6) | Jest DOM text assert; `ng lint` on touched files |
| New submit blocker (R-3) | Jest on the rail submit gate is out of reach; substitute: HITL check that the Submit state of 27270 is unchanged before vs after the change |

## 9. Dependencies & Assumptions

### Upstream dependencies
- `PATCH /api/bilateral/center/primary-assignment/:resultId` (`bilateral-center.service.ts` `updatePrimaryAssignment`), unchanged.
- `GET /api/bilateral/center/projects` (Center catalogue), unchanged.

### Downstream consumers
- None new. `/api/bilateral/*` payloads already reflect the lead project and P/A.

### Assumptions
- `PAA-P-1` ✅ **confirmed**: the assignment save inserts the lead row when the result has none.
- ~~`PAA-P-2`~~ **superseded by `PAA-R-7` (2026-10-16):** the picker no longer depends on the page Center matching the result's lead Center; it reads the lead Center catalogue directly.
- `PAA-P-3`: no client or server completeness rule requires a lead project today (client MDS tracker has none). Verified client-side; server green checks are read-only for this spec.

## 10. Open Questions

| ID | Question | Recommendation |
|---|---|---|
| `PAA-OQ-1` | Jira ticket? | Use INC-164073 in the commit body if none |
| `PAA-OQ-2` | P/A change without a project for the 63? | No (out of scope); confirm with Nicoleta in the reply |
| `PAA-OQ-3` | Only replicated innovations or every editable bilateral result with no lead project? | Every editable bilateral result: same empty state, no extra condition |
| `PAA-OQ-4` | 28634 shows "no lead project 2026" yet a P/A mismatch | Check with the SQL given in the proposal report; it is either a contributor-only link (then group B behaviour applies) or a data issue |
| `PAA-OQ-5` | Which result may the owner save on, for the HITL save check? | Owner picks one result from group B and one from group A, or uses PRTest |

## 11. Out-of-Band Notes

Corrections against `proposal.md` after code discovery (2026-10-16):
- Changing the P/A is **not** a request reviewed on submit. Since 2026-10-07 it is a **direct transfer** (`updatePrimaryAssignment`, comment "confirmed by product 2026-10-07"). Proposal risk `PAA-R-RISK-1` is void.
- `PAA-P-1` is confirmed, so the server is out of scope.

## Required cross-references
- `proposal.md` · `../family.md` · `docs/prd.md` G3 · `docs/ux-ui/design.md` §8 · `section-zero-dashboard/CLAUDE.md`
