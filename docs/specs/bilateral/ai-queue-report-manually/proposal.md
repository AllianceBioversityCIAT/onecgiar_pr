# Proposal — "Report manually" opens the normal create drawer in place

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/ai-queue-report-manually/` |
| Slug | `ai-queue-report-manually` — derived from free-text argument |
| Type | Change |
| Approval Mode | gated |
| Ticket | P2-3853 (follow-up to `bilateral/ai-processing-queue`) |
| Branch | `JuanGuzman-io/p2-3853-jira-understanding` |
| Depends on | `bilateral/ai-processing-queue` (same branch, executed, not archived) |
| Parallel-safe | no — touches the same drawer host the parent spec edited |
| Date | 2026-09-30 |

## Intent

When an AI job finds no results, **Report manually** should open the same create-result drawer as the bilateral home's "+ Create result". The drawer opens on the page the user is already on, with the job's project preselected, and the user chooses the Program there. Today the button navigates to the create wizard and opens the drawer straight in the Manual entry form, which skips the Program step.

## Problem / Current Behavior

- The action appears only on the `no_candidates` card, which is shown for any job that is not `PROCESSING`, `PENDING` or `FAILED` and has `resultCount === 0` (`ai-job-card.component.ts:122-131`).
- Clicking it closes the AI drawer and **navigates to `/bilateral/<job center>/create?project=<id>&way=manual`** (`ai-processes-drawer-host.component.ts:109-115`).
- The creator applies the deep link through `pendingAiQueueDeepLink`, then calls `onReportingWaySelected('manual')` (`bilateral-result-creator.component.ts:519-530`). That calls `manualCreateFlow.openDrawerForManual()` (`bilateral-result-creator.component.ts:769-776`), which sets `selectedReportingWay('manual')` (`bilateral-manual-create-flow.service.ts:129-132`).
- With a reporting way set, the drawer host skips the setup block that holds the Program selector and the reporting-way selector, and renders `app-bilateral-manual-create-form` directly (`bilateral-manual-create-drawer-host.component.html:25`, `:97`, `:103`). **The user cannot pick the Program.** The wizard only shows its own Program step after a project is picked, and the deep link lands straight in the drawer.
- The "normal" entry, `beginFromProject(project)` (`bilateral-manual-create-flow.service.ts:120-126`), opens the drawer **in place**. It preselects the project, sets `selectedReportingWay(null)` so the Program selector and the reporting-way options appear, and auto-selects the Program when the project has only one. The home projects panel calls it (`bilateral-projects-panel.component.ts:393-396`).
- The create drawer host is mounted only on the creator (`bilateral-result-creator.component.html:39`) and the home projects panel (`bilateral-projects-panel.component.html:448`). The AI processes drawer opens from the bilateral page header on every bilateral route (`bilateral-page-header.component.html:213,262,372`) and from app-level toasts (`app.component.html:64`). **On drafts, results, overview or a result page there is no create drawer to open.**
- `beginFromProject` needs a full `BilateralProject`, including `sciencePrograms`. The job only carries `projectId`, `centerId` and `centerAcronym` (`bilateral-ai-job.model.ts:196-219`). `creationService.projects()` is loaded per center only when something calls `getProjects(centerId)` (`bilateral-creation.service.ts:93-109`).
- `submitCreate` builds its post-create route from `ctx.centerAcronym()`, not from the project's center (`bilateral-manual-create-flow.service.ts:205`). A job from **another center** than the current page would therefore land on the wrong center.

## Proposed Outcome

| # | Behavior |
|---|---|
| 1 | Clicking **Report manually** closes the AI drawer and **does not change the route** when the job's center is the current center. For a job from another center, it goes to **that center's home** and opens the drawer there, never to `/create`. |
| 2 | The create drawer opens in its normal state: project preselected, **Program selector visible** (or auto-picked when the project has one), and the reporting-way options to choose from. It never opens directly on the Manual entry form. |
| 3 | This works from every bilateral route where the AI drawer can open, not only on home and the creator. *Amended at design (`ARM-DD-4`): inside a result editor (`result/:id`) it takes the Center-home path.* |

## Scope

- Client only. Change the `onReportManually` handler, mount the create drawer once, and resolve the job's project into a `BilateralProject`.
- Remove the `?way=manual` use from the AI drawer. The creator's `?way=` parser stays, because **Upload different files** still uses `way=ai`.
- Update tests for the drawer host, the flow service and the creator. Update the folder `CLAUDE.md` files these tasks touch.

## Non-Goals

- **Upload different files** keeps its current behavior (navigates to the creator's AI way).
- The server, the job list payload and the `no_candidates` rule are unchanged.
- The Manual entry form itself is unchanged.
- The pre-existing `center_id` entitlement gap on `createJob` (`ASC-DD-7`) stays as it is.

## Affected Users, Systems, And Specs

| Area | Files |
|---|---|
| AI drawer action | `components/ai-processes-drawer/ai-processes-drawer-host.component.ts` (+spec) |
| Create flow | `services/bilateral-manual-create-flow.service.ts` (+spec): new entry point that takes a project id and center |
| Drawer mount | `bilateral.component.html` (shell) · remove the duplicate mounts in `bilateral-result-creator.component.html:39` and `bilateral-projects-panel.component.html:448` |
| Specs | `bilateral/ai-processing-queue` (`AIQ-R-9` D does not define where Report manually goes; this spec pins it) · `bilateral/manual-create-drawer` (shared drawer) |
| Users | Center users reporting bilateral results whose AI job came back empty |

## Visual Reference

- Source: None (reuses an existing screen).
- Location: n/a. The target is the existing "+ Create result" drawer from bilateral home.
- Notes: no new UI. The parent spec's mockup `docs/specs/bilateral/ai-processing-queue/mockup/ai-processes-drawer.html` still covers the card.

## Requirement Delta Preview

### ADDED Requirements

- **Report manually** opens the shared create drawer in place, with the job's project preselected and `selectedReportingWay = null`. The Program selector shows when the project has more than one Program, and is auto-picked when it has exactly one.
- The create drawer is available on every bilateral route, mounted once.

### MODIFIED Requirements

- `AIQ-R-9` D, the "Report manually" action: it no longer navigates to `/create` and no longer passes `way=manual`.

### REMOVED Requirements

- The AI drawer no longer sends the `way=manual` deep link. The creator's `manual` parse branch can stay as a harmless dead value, or be removed (decided at specify).

## Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Mount the drawer in the shell + new `beginFromProjectId`** | Mount `app-bilateral-manual-create-drawer-host` once in `bilateral.component.html` and remove the two page mounts. Add `beginFromJob(projectId, centerId)` to the flow, which reuses `creationService.projects()` when it is already loaded for that center, calls `getProjects` otherwise, and then calls `beginFromProject`. | Works on every bilateral route; one drawer instance (no duplicate render from two hosts reading the same `drawerOpen`); reuses the normal entry exactly | Touches two pages' templates; has to wait for projects to load (small loading state) |
| B. Navigate to center home and open there | Route to `/bilateral/<center>` (home) and open the drawer with `beginFromProject` after the projects panel loads | The drawer host already exists there | Still a redirect, only to home instead of create; breaks the "stay where I am" intent |
| C. Mount a second host inside the AI drawer host | Render the create-drawer host inside the app-level AI drawer's tree | No shell change | Two drawer hosts on home and the creator render twice; stacked overlays and focus traps; outside the bilateral route there is no center context |

## Recommended Approach

**Option A.** It is the only option that meets all three points on every bilateral route. It reuses `beginFromProject` without changes, so the Program step behaves exactly like "+ Create result". It also removes a latent risk: two mounted hosts reading the same `drawerOpen` signal.

For a job from **another center** than the current page, the drawer cannot create in place: `ctx`, `canUseAi` and the post-create route all read the current center. The action navigates to that center's **home** (not `/create`) and opens the drawer there. This is the only case with a route change (OQ-1, resolved).

## Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| OQ-1 | **Resolved 2026-09-30 (user):** a job from another center navigates to **that center's home** (`/bilateral/<job center>`) and opens the drawer there. This is the only case with a route change. |
| OQ-2 | **Resolved 2026-09-30 (user):** the drawer keeps both reporting ways (Manual entry and AI assisted), identical to "+ Create result". No variant of the drawer. |
| OQ-3 | **Resolved 2026-09-30 (user):** there is no separate ticket; the work goes under P2-3853. |
| R-1 | Shared state. `beginFromProject` writes `creationService.selectedProject` and `selectedPrimarySp`, the same signals the creator wizard uses. Clicking on the creator while the wizard has another project picked would overwrite it. Accept it (the user chose this project) or restore on close; decided at specify. |
| R-2 | Moving the mount to the shell changes where focus returns on close (`restoreFocusTarget` is unused by both current mounts, so low risk). |
| R-3 | Projects are still loading when the user clicks. The drawer needs a short loading state or must wait before opening; it must never open empty. |
| R-4 | A project not found in the center catalogue (for example, deactivated since the job ran). Fall back to a toast, never to an empty drawer. |

## Success Criteria

- From drafts, results, home and the creator, **Report manually** on a same-center job leaves the URL unchanged and opens the create drawer with the job's project and the Program step visible.
- A project with one Program opens with that Program already selected, and the reporting-way options are enabled.
- The drawer never opens on the Manual entry form from this action.
- Exactly one create drawer renders on home and on the creator.
- The client Jest tests for the drawer host, flow service, creator and projects panel pass; lint is clean.

## Next Step

```text
/akili-specify bilateral/ai-queue-report-manually
```
