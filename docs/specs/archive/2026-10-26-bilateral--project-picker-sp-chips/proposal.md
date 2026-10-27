# Proposal — Science Program chips in the replicated-result project picker

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/project-picker-sp-chips` |
| Slug | `project-picker-sp-chips` — derived from free-text argument (`/akili-propose` called with a paragraph + screenshot, no slug) |
| Type | Change |
| Approval Mode | gated |
| Status | Approved (Santiago Sanchez, 2026-10-26) — OQ recommendations accepted as defaults |
| Date | 2026-10-26 |
| Author | Santiago Sanchez (intent) · Claude (draft) |
| Parent Spec | none (standalone; follows the archived family `bilateral/replicated-innovations-2026-pa`) |
| Depends on | none |
| Parallel-safe | yes — client-only, no migration, no API contract change |

## 2. Intent

In the **Project** dropdown of Section 0 (Overview) of a **replicated** W3/Bilateral result, add **Science Program chips** that filter the project list to projects mapped to the selected programs. Several chips can be active at once (e.g. `SP01 Breeding for Tomorrow` + `SP03 Sustainable Animal…`).

**Why:** a result created under SP06 in the previous phase should keep its story in SP06 in the current phase. Pre-selecting the result's previous-phase program as a chip puts the projects linked to SP06 (Climate Action) in front of the reporter, so the re-pointed project keeps the result in the same program instead of drifting to another one by accident.

## 3. Problem / Current Behavior

| Today | Evidence |
|---|---|
| The dropdown lists the whole lead-Center catalogue (CIP ≈ dozens of projects) with only free-text search on code/name. | `bilateral-project-selector.component.ts` → `filteredProjects` |
| Each project already carries its program mappings (`sciencePrograms: ScienceProgramMapping[]` with `programCode`, `spShortName`, `allocation`), but the picker never shows or uses them. | `bilateral-creation.interfaces.ts:14` |
| The replicated result's previous-phase primary program is already loaded (`selectedPrimarySp`, role-1 initiative), but nothing connects it to the project choice. If the reporter picks a project not mapped to that program, the Program field then offers only *other* programs, and the result silently moves SP. | `bilateral-creation.service.ts` (loadResult), `section-zero-dashboard.component.ts` → `availablePrimaryPrograms`, `onProjectCandidate` |

## 4. Proposed Outcome

When the reporter opens the Project dropdown on a replicated result:

1. A chip row appears under the search box: one chip per Science Program present in the loaded catalogue (`CODE · short name`, optional project count).
2. The chip matching the result's **previous-phase primary program** is **pre-selected** — the list opens already narrowed to "projects linked to SP06".
3. The reporter can toggle any number of chips. A project is shown if it maps to **any** selected program (OR). Text search applies on top (AND).
4. Clearing all chips shows the full catalogue again (today's behavior). A "No projects for the selected programs" empty state offers a one-click *Clear filters*.
5. Nothing about saving changes: the chosen project and the Program field behave exactly as in PAA (`onProjectCandidate`, single-allocation auto-pick, Save).

## 5. Scope

- `BilateralProjectSelectorComponent`, **inline** variant (Section 0 of an existing result), gated on `creationService.isReplicated()`.
- Chip list derived client-side from `creationService.projects()[].sciencePrograms` (deduped by `programCode`).
- Default chip = stored primary SP matched **by program code**, not id (P2-3807: persisted primary uses the CLARISA initiative id, the catalogue uses the W3 mapping id — see `assignmentPrimary`).
- Both Section 0 branches that render the picker: result **with** a lead project and result **without** one (PAA-R-6 / `bp-no-project`) — the no-project branch is where the filter helps most.
- Built with Spartan primitives (toggle/badge) per the UI rule; Jest spec updates for the selector.

## 6. Non-Goals

- No server change: no new query param on `GET /api/bilateral/center/projects`, no payload change (bilateral payload contract untouched).
- Not changing what is saved, nor the Program (P/A) selection rules, nor the consent/share-request workflow.
- Not adding chips to the **create wizard** (new results have no previous-phase program) — see OQ-2.
- Not blocking a project outside the previous program: the chip is a guide, the reporter can still clear it and pick anything (cross-SP moves stay legitimate).
- No persistence of chip selection across results/sessions.

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| Center reporters re-pointing replicated 2026 innovations | Primary beneficiary |
| `onecgiar-pr-client/.../bilateral-project-selector/*` | Main change (TS, HTML, SCSS, spec) |
| `section-zero-dashboard.component.*` | Possibly passes the default program code as an input (or the selector reads `selectedPrimarySp` directly) |
| `bilateral-creation.service.ts` | Read-only use of `projects`, `selectedPrimarySp`, `isReplicated` |
| Archived `bilateral/replicated-innovations-2026-pa` (PAA) | Behavior it defined (P-4 stored P/A, PAA-R-6 no-project picker) must stay intact |
| Server | None |

## 8. Visual Reference

- Source: Screenshot provided by the user (result #28403, CIP, Reporting 2026 — dropdown open, no chips).
- Location: conversation attachment (Image #6); no mockup generated yet.
- Notes: chip row sits between the search input and the option list. `/akili-specify` can generate a mockup (stitch-design / self-contained HTML) if wanted.

## 9. Requirement Delta Preview

### ADDED Requirements

- On a replicated result, the inline project picker shows a Science Program chip row built from the catalogue's program mappings.
- The result's previous-phase primary program chip is pre-selected when the dropdown first opens (matched by program code); if no catalogue project maps to it, no chip is pre-selected and the full list shows.
- Multi-select chips filter with OR semantics; combined with text search by AND.
- Empty-state message + *Clear filters* action when the filter leaves zero projects.
- Chips are keyboard-operable and expose pressed state (`aria-pressed`).

### MODIFIED Requirements

- `filteredProjects` = text filter ∧ program filter (today: text only).

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Client-side chip filter in the selector** | Derive chips from `projects()[].sciencePrograms`; default from `selectedPrimarySp().programCode`; extend `filteredProjects` | No API change; catalogue is already in memory; smallest diff; reuses PAA's code-matching rule | Projects with no SP mapping disappear while a chip is on (mitigated by clear + empty state) |
| B. Server-side filter (`?programCodes=`) | New query param on the projects endpoint | Smaller payload for big centers | Contract change + migration-free but still a payload/API touch; extra round-trip on every toggle; no real payload problem today |
| C. Sort/group only, no filter | "Linked to SP06" group on top, rest below | Never hides anything | Does not deliver the multi-chip filtering the user asked for |

## 11. Recommended Approach

**Option A.** Everything needed is already on the client (project → program mappings, the result's stored primary program, `isReplicated`). The change is local to one standalone component plus its spec, keeps the server and bilateral contract untouched, and inherits PAA's proven rule of matching programs by code. Optionally borrow C's idea inside A: a small "previous program" marker on the pre-selected chip so the reporter understands why it is on.

Lite spec depth is enough (one component, no data/contract change).

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R-1 | **Id mismatch** CLARISA initiative id vs W3 mapping id (P2-3807) — default chip must match by `programCode` (trim/upper), never by id. |
| R-2 | Projects with empty `sciencePrograms` vanish under any active chip; reporter may think the project is missing. Mitigation: chip pre-selection is visible + clear action + empty state. |
| R-3 | Program code format may differ between `selectedPrimarySp.programCode` and catalogue `programCode` (e.g. `SP06` vs `SP-06`). Normalize; verify on PRTest with a real replicated result. |
| R-4 | Existing selector/Section 0 specs assert the option list; renaming or restructuring may break them — run affected Jest specs with `--findRelatedTests` before push (memory: client tests before commit). |
| OQ-1 | Semantics confirmed as **OR** (projects linked to SP01 *or* SP03)? Recommended yes — AND would rarely match anything. |
| OQ-2 | Only replicated results (as requested), or also non-replicated existing results and the create wizard? Recommendation: replicated + inline only now; widen later if useful. |
| OQ-3 | Should chips list **all** SPs in the catalogue, or only those with ≥1 project? Recommendation: only those present (no dead chips), each with a count. |
| OQ-4 | Previous-phase program = the result's stored role-1 primary today (replication copies it). If a reporter already changed the primary in 2026, should the default follow the current primary? Recommendation: yes — use whatever `selectedPrimarySp` holds. |

## 13. Success Criteria

- Opening the Project dropdown on a replicated SP06 result shows the SP06 chip active and only SP06-mapped projects.
- Selecting SP01 + SP03 shows exactly the union of projects mapped to either; search narrows within it.
- Clearing chips restores today's full list; non-replicated results and the create wizard are unchanged.
- No server diff; selector and Section 0 Jest specs green (`--maxWorkers=2`, scoped).

## 14. Next Step

```text
/akili-specify bilateral/project-picker-sp-chips
```

(Lite depth, Change track.)
