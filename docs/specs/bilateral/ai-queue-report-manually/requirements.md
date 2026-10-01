# Requirements — "Report manually" Opens the Normal Create Drawer

## Document Control

| Field | Value |
|---|---|
| **Module** | `bilateral` |
| **Sub-feature** | `ai-queue-report-manually` |
| **Spec Path** | `docs/specs/bilateral/ai-queue-report-manually/` |
| **Type** | Change |
| **Depth** | **Standard**: client only, but it moves a shared drawer mount and changes a cross-route action. Re-checked against the design in `design.md` (Budget). |
| **Approval Mode** | gated (inherited from `proposal.md`) |
| **Requirement prefix** | `ARM` (AI Report Manually): `ARM-R-n`, `ARM-AC-n`, `ARM-D-n` |
| **Owner** | Juan David Delgado (j.delgado@cgiar.org) |
| **Status** | approved (gated, 2026-09-30) |
| **Ticket(s)** | P2-3853 (no separate ticket, user 2026-09-30) |
| **Source of intent** | `proposal.md` (2026-09-30); OQ-1, OQ-2, OQ-3 resolved by the user |
| **Visual reference** | None. Reuses the existing "+ Create result" drawer (`bilateral/manual-create-drawer`) |
| **Builds on** | `bilateral/ai-processing-queue` (`AIQ-R-9` D: this spec pins the "Report manually" target, which `AIQ-R-9` D left undefined) |
| **Baseline cited** | `docs/prd.md` G4 · `docs/ux-ui/design.md` §6 drawers, §10 a11y · `docs/trd/trd.md` (client routing, no API change) |
| **Kaizen lessons applied** | none. `docs/specs/kaizen-log.md` does not exist (`ls docs/specs/kaizen-log.md` → no such file) |

---

## 1. Executive Summary

When an AI job finishes with no results, the card in the "AI processes" drawer offers **Report manually**. Today the button navigates to the create wizard and opens the create drawer straight on the Manual entry form, which **skips the Program step**.

After this change, **Report manually** opens the **same drawer as "+ Create result"**:

- the job's project is preselected;
- the Program step is shown (or the Program is auto-picked when the project has only one);
- both reporting ways are offered, Manual entry and AI assisted.

The drawer opens **on the page the user is already on**. The only route change is for a job from another Center: the user goes to **that Center's home** and the drawer opens there.

## 2. Glossary

| Term | Meaning |
|---|---|
| **AI drawer** | The app-level "AI processes" drawer (`AIQ-R-9`) |
| **Create drawer** | The shared "+ Create result" drawer (project info → Program → reporting way → form) |
| **Normal state** | The create drawer with a project preselected and **no reporting way chosen**: the Program step (or its auto-pick) and the reporting-way options are visible |
| **Manual entry state** | The create drawer already on the Manual entry form, with the Program and reporting-way steps hidden |
| **Job Center** | The Center the AI job was started under (`centerAcronym` on the job) |
| **Current Center** | The Center in the current bilateral route (`/bilateral/:acronym/...`); none outside bilateral routes |

## 3. System Context & Scope

Current behavior. Each claim carries its citation, checked on `e7ca42ce6`:

- **Report manually** is rendered only on the `no_candidates` card. That card is for a job that is not `PROCESSING`, `PENDING` or `FAILED` and has `resultCount === 0` (`ai-job-card.component.ts:122-131`, `ai-job-card.component.html:162-174`).
- The action navigates to `/bilateral/<job center>/create?project=<id>&way=manual` (`ai-processes-drawer-host.component.ts:109-115`). The creator applies `way=manual` through `onReportingWaySelected('manual')` → `openDrawerForManual()`, which sets the reporting way to `manual` (`bilateral-result-creator.component.ts:519-530`, `:769-776`; `bilateral-manual-create-flow.service.ts:129-132`).
- With a reporting way set, the create drawer skips the setup block that holds the Program and reporting-way steps (`bilateral-manual-create-drawer-host.component.html:25`, `:103-104`).
- "+ Create result" on the home projects panel calls `beginFromProject(project)`. That preselects the project, clears the reporting way, auto-picks a single Program and opens the drawer in place (`bilateral-projects-panel.component.ts:393-396`; `bilateral-manual-create-flow.service.ts:120-126`).
- The create drawer is mounted only on the creator (`bilateral-result-creator.component.html:39`) and the home projects panel (`bilateral-projects-panel.component.html:448`). The AI drawer trigger is in the bilateral page header (`bilateral-page-header.component.html:213,262,372`). The AI drawer itself is launched app-wide (`app.component.html:64`; `ai-processes-drawer-launcher.service.ts:43-70`).

### In scope

- The **Report manually** action of the AI drawer's `no_candidates` card.
- Making the create drawer available on every bilateral route.

### Out of scope

- **Upload different files**. It keeps navigating to the creator's AI way (`way=ai`).
- The `no_candidates` rule, the job list API and every server file.
- The content of the create drawer (steps, form, copy).
- The `center_id` entitlement gap on `createJob` (`ASC-DD-7`, pre-existing).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Center user reporting a bilateral result | After an empty AI job, they choose the Program and the reporting way, instead of landing on a form with the Program already fixed |

## 5. Functional Requirements

### `ARM-R-1`: Same Center opens the create drawer in place (MUST)

When the Job Center equals the Current Center and the user is not inside a result editor (`result/:id`, see `ARM-R-2`), **Report manually** SHALL close the AI drawer and open the create drawer in its **normal state** for the job's project, without changing the route.

- **Scenario A: project with several Programs**
  - GIVEN the user is on any bilateral route of Center C
  - AND the AI drawer shows a `no_candidates` card for a job of Center C whose project has 2+ Programs
  - WHEN the user clicks **Report manually**
  - THEN the AI drawer closes
  - AND the create drawer opens with that project's code and title
  - AND the Program step is visible with no Program chosen
  - AND the reporting-way options (Manual entry, AI assisted) are visible, locked until a Program is chosen, as in "+ Create result"
  - BUT the URL must NOT change (path and query)
  - BUT the drawer must NOT open on the Manual entry form
- **Scenario B: project with one Program**
  - GIVEN the same, with a project that has exactly 1 Program
  - WHEN the user clicks **Report manually**
  - THEN that Program is already chosen and both reporting ways are enabled
  - BUT no reporting way is preselected
- **Scenario C: parity with "+ Create result"**
  - GIVEN the same project opened once from "+ Create result" and once from **Report manually**
  - THEN both drawers show the same steps in the same state
  - AND IT MUST offer both reporting ways (OQ-2, resolved by the user 2026-09-30)

### `ARM-R-2`: Another Center goes to that Center's home (MUST)

When the Job Center differs from the Current Center, there is no Current Center (a non-bilateral route), or the user is inside a result editor (`result/:id`), **Report manually** SHALL navigate to `/bilateral/<job center>/home` and open the create drawer there, in the normal state of `ARM-R-1`.

- **Scenario A: cross-center**
  - GIVEN the user is on a route of Center C and the job belongs to Center D
  - WHEN the user clicks **Report manually**
  - THEN the app goes to Center D's home
  - AND the create drawer opens once for the job's project, as in `ARM-R-1` A/B
  - BUT it must NOT navigate to `/create`
  - BUT the URL must NOT carry `way` or `project` query parameters
- **Scenario B: one shot**
  - GIVEN the drawer was opened by `ARM-R-2` A and the user closed it
  - WHEN the user reloads the home page or navigates away and back
  - THEN the create drawer does NOT open again
- **Scenario C: outside bilateral**
  - GIVEN the AI drawer was opened from a completion toast on a non-bilateral route
  - WHEN the user clicks **Report manually**
  - THEN the behavior is `ARM-R-2` A
- **Scenario D: inside a result editor** (amended at design, `ARM-DD-4`)
  - GIVEN the user is editing a result on `result/:id` of Center C and the job belongs to Center C
  - WHEN the user clicks **Report manually**
  - THEN the behavior is `ARM-R-2` A for Center C
  - AND IT MUST leave the edited result's project and Program unchanged

### `ARM-R-3`: The create drawer is reachable from every bilateral route (MUST)

The create drawer SHALL be openable by `ARM-R-1` on every bilateral route except the result editor: `overview`, `home`, `create`, `drafts`, `drafts/:draftId`, `results`. On `result/:id` it opens through `ARM-R-2` D (amended at design, `ARM-DD-4`).

- **Scenario A: a route without it today**
  - GIVEN the user is on `drafts` of Center C
  - WHEN `ARM-R-1` fires
  - THEN the create drawer opens on `drafts`
- **Scenario B: a single instance**
  - GIVEN the user is on `home` or on `create`
  - WHEN the create drawer opens by any entry (the "+ Create result" button, the wizard's Manual entry, **Report manually**)
  - THEN exactly one create drawer is rendered
  - AND IT MUST keep the current behavior of both existing entries

### `ARM-R-4`: Never an empty or wrong drawer (MUST)

- **Scenario A: catalogue still loading**
  - GIVEN the Center's project catalogue has not loaded yet (a cold route, or `ARM-R-2` right after navigating)
  - WHEN **Report manually** fires
  - THEN the create drawer opens only once the job's project is resolved from the catalogue, with its Programs
  - BUT it must NOT open with an empty project or an empty Program list
- **Scenario B: project not in the catalogue**
  - GIVEN the job's project is not in the Center's catalogue (for example, deactivated since the job ran)
  - WHEN the catalogue finishes loading
  - THEN an error toast explains that the project is not available for new results
  - AND the create drawer stays closed
- **Scenario C: job without a project or Center**
  - GIVEN the job has no `projectId` or no `centerAcronym`
  - THEN **Report manually** does nothing, as it does today for a missing Center (`ai-processes-drawer-host.component.ts:110`)

### `ARM-R-5`: Creator wizard stays consistent (MUST)

- **Scenario A: clicking on the creator**
  - GIVEN the user is on `create` of Center C with the wizard showing another project, Program or reporting way
  - WHEN **Report manually** opens the drawer for the job's project
  - THEN, while the drawer is open and after it closes, the wizard never shows the project of one selection next to the Program or the reporting way of another
  - AND IT MUST NOT leave the wizard's AI upload open for a project different from the one shown

### `ARM-R-6`: Other AI drawer actions keep their behavior (MUST)

- **Scenario A: non-regression**
  - GIVEN a `failed` card
  - WHEN the user clicks **Upload different files**
  - THEN it still navigates to `/bilateral/<job center>/create?project=<id>&way=ai` and closes the AI drawer
  - AND **View N drafts** and **Start with evidence** are unchanged

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| `ARM-NFR-1` | Accessibility: when the AI drawer closes and the create drawer opens, focus moves into the create drawer, and **one** focus trap is active at any time (`docs/ux-ui/design.md` §10) |
| `ARM-NFR-2` | At most one `GET_bilateralProjects(center)` call per click (amended at design, `ARM-DD-2`) |
| `ARM-NFR-3` | No hard-coded colors, spacing or copy strings. New copy goes into `internationalization/*.copy.ts` |

## 7. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `ARM-AC-1` | Same Center, 2+ Programs | Report manually | URL unchanged; create drawer in normal state; Program step visible; both ways shown (`ARM-R-1` A, C) |
| `ARM-AC-2` | Same Center, 1 Program | Report manually | Program chosen; ways enabled; none preselected (`ARM-R-1` B) |
| `ARM-AC-3` | Other Center, or a non-bilateral route | Report manually | Lands on `/bilateral/<D>/home` with no `way`/`project` params; drawer opens once (`ARM-R-2`) |
| `ARM-AC-4` | `drafts` / `results` / `overview` | Report manually | Drawer opens there (`ARM-R-3` A) |
| `ARM-AC-9` | `result/:id` of the Job Center | Report manually | Goes to that Center's home and opens the drawer; the edited result is unchanged (`ARM-R-2` D) |
| `ARM-AC-5` | `home` / `create` | Any entry | Exactly one create drawer in the DOM (`ARM-R-3` B) |
| `ARM-AC-6` | Catalogue loading / project missing | Report manually | No empty drawer; missing → toast, drawer closed (`ARM-R-4`) |
| `ARM-AC-7` | On `create` with another selection | Report manually | No mixed wizard state (`ARM-R-5`) |
| `ARM-AC-8` | `failed` card | Upload different files | Unchanged (`ARM-R-6`) |

## 8. Defect Classes And Their Gates

| Defect class | Gate |
|---|---|
| Wrong route (navigates to `/create`, keeps `way=manual`, or navigates when it should stay) | Jest on the AI drawer host with a spied `Router.navigate`: asserts the exact call, or no call |
| Drawer opens in the wrong state (reporting way preset, Program step hidden) | Jest on the flow service: signals after the new entry. Jest on the create drawer host's template: the setup block renders and the manual form does not |
| Duplicate create drawer on `home`/`create` | Jest render of the creator and the projects panel inside the shell, counting `app-bilateral-manual-create-drawer-host` instances, plus a grep over templates for the selector (expected: 1 mount, in the shell) |
| Race: drawer opens before the catalogue arrives (empty drawer) or never opens | Jest with a **deferred** `GET_bilateralProjects` observable, so the load actually lands after the click. A synchronous mock hides this race and does not count |
| One-shot violated (reopens on reload/return) | Jest: pending intent cleared after open and after a failed lookup |
| Type mismatch on the new entry point | `npx tsc --noEmit -p tsconfig.app.json` and `npx tsc --noEmit -p tsconfig.spec.json` (client). Jest does not type-check the specs that build the job by hand |
| Two overlays / focus traps at once, focus lost (`ARM-NFR-1`) | **No automated check**: jsdom cannot evaluate focus traps across the Spartan dialog and the create drawer. Substitute: a live browser check at the HITL pause (`ARM-D-1`) |

## 9. Dependencies & Assumptions

- Depends on `bilateral/ai-processing-queue` being in the branch (it is: `e7ca42ce6`).
- The job list already carries `projectId`, `centerId` and `centerAcronym` (`bilateral-ai-job.model.ts:196-219`). No server change.

## 10. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| `ARM-R-1` | Same Center opens the create drawer in place | MUST |
| `ARM-R-2` | Another Center goes to that Center's home | MUST |
| `ARM-R-3` | Create drawer reachable from every bilateral route | MUST |
| `ARM-R-4` | Never an empty or wrong drawer | MUST |
| `ARM-R-5` | Creator wizard stays consistent | MUST |
| `ARM-R-6` | Other AI drawer actions keep their behavior | MUST |
| `ARM-NFR-1..3` | a11y focus, one catalogue call, tokens and copy | MUST |
| `ARM-AC-1..9` | Acceptance criteria | — |
| `ARM-D-1` | HITL live check (focus / overlays, `ARM-NFR-1`) | — |
