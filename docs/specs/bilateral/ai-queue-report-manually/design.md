# Design — "Report manually" Opens the Normal Create Drawer

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-queue-report-manually/` |
| **Type / Depth** | Change / Standard |
| **Approval Mode** | gated |
| **Status** | approved (gated, 2026-09-30) |
| **Verified at** | `e7ca42ce6` (branch `JuanGuzman-io/p2-3853-jira-understanding`) |
| **Requirements amended during this phase** | `ARM-R-3`: `result/:id` moves from "in place" to the home path (DD-4, premise P-9). `ARM-NFR-2`: "at most one catalogue call per click" (DD-2). Both approved by the owner at the design gate, 2026-09-30 |
| **Skills** | `angular-developer` (Skill Map, client) |
| **Kaizen lessons applied** | none (`docs/specs/kaizen-log.md` does not exist) |

## 1. Executive Summary

- The create drawer host moves to the **bilateral shell** (`BilateralComponent`). It is mounted once for every `/bilateral/:acronym/*` route and removed from the creator and the home projects panel (DD-1).
- A new flow entry, **`beginFromJob`**, receives the job's project and Center:
  - **in place** when the current URL is a bilateral route of the Job Center and the page is not a result editor;
  - otherwise it navigates to `/bilateral/<job center>/home`.

  Either way it fetches that Center's project catalogue once, finds the project and calls the existing `beginFromProject` (DD-2, DD-3, DD-4).
- The AI drawer's `onReportManually` closes the AI drawer and calls `beginFromJob`. It no longer calls the router (DD-3).
- The creator resets its own local reporting way when this entry fires, so the wizard never mixes two selections (DD-5).
- The create drawer closes when the route path changes, because the host now outlives the pages (DD-6).

## 2. Architecture Overview

```text
ai-job-card (no_candidates) ─reportManually─► ai-processes-drawer ─► ai-processes-drawer-host.onReportManually(job)
      │  service.drawerOpen(false)                       (AI drawer closes via launcher)
      └► manualCreateFlow.beginFromJob(job)
            ├─ in place?  URL = /bilateral/<job center>/… AND not result/:id
            │     yes ─► fetch catalogue(job.centerId) ─► find projectId ─► beginFromProject(p) + externalEntry
            │     no  ─► router.navigate(/bilateral/<job center>/home) ─► on true: same fetch/open
            └─ not found ─► error toast, drawer closed
BilateralComponent (shell) ─► <app-bilateral-manual-create-drawer-host/>   (single mount, all bilateral routes)
```

## 3. Extended Directory Structure (touched files)

| File | Change |
|---|---|
| `pages/bilateral/bilateral.component.html` · `bilateral.module.ts` | Mount the host; import the standalone host into the NgModule |
| `pages/bilateral/services/bilateral-manual-create-flow.service.ts` (+spec) | `beginFromJob`, `externalEntry` event, close on path change, not-found toast |
| `pages/bilateral/components/ai-processes-drawer/ai-processes-drawer-host.component.ts` (+spec) | `onReportManually` → `beginFromJob` |
| `pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.{ts,html}` (+spec) | Remove the mount and the host import; react to `externalEntry` |
| `pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.{ts,html}` (+spec) | Remove the mount; move the DI-regression test (P-8) |
| `internationalization/bilateral-manual-create.copy.ts` | Not-found toast copy |
| Folder `CLAUDE.md` files of the touched components | Update to the single-mount model |

## 4. Data Model / 5. API Design / 6. Backend

No change. It reuses `GET /api/bilateral/center/projects` through `BilateralApiService.GET_bilateralProjects(centerId)` (`shared/services/api/bilateral-api.service.ts:22`), keyed by the CLARISA institution id (P-5).

## 7. Frontend / UX Component Architecture

### 7.1 `BilateralManualCreateFlowService` (root)

| Member | Behavior | Req |
|---|---|---|
| `beginFromJob({ projectId, centerId, centerAcronym })` | Returns early when any of the three is missing. Decides in place or home (7.2). Fetches `GET_bilateralProjects(centerId)` once, finds `Number(p.id) === projectId`, then calls `beginFromProject(p)` and emits `externalEntry`. Not found → toast, drawer stays closed. A newer call supersedes an in-flight one (request token), so a stale response never opens the drawer | R-1, R-2, R-4 |
| `externalEntry` | An event (no replay) the creator subscribes to (DD-5). No replay means a later visit to `create` never sees an old entry | R-5, R-2 B |
| Close on path change | Subscribes to router `NavigationEnd`. When the URL **path** (without query or fragment) differs from the one at open time, it calls `closeDrawer()`. Query-only changes do not close it. `beginFromJob` records the path **after** its own navigation, so its own route change does not close the drawer | R-3, DD-6 |

### 7.2 "In place" rule

In place = **all** of the following:

- the router URL's first segment is `bilateral`;
- the second segment equals `job.centerAcronym`;
- the third segment is not `result`.

The rule reads the **router URL**, not `BilateralContextService`, because `ctx` keeps the last Center after the user leaves bilateral (P-6). Otherwise the action goes to `/bilateral/<job center>/home` (R-2, DD-4).

### 7.3 States

| State | UI |
|---|---|
| Catalogue loading | The AI drawer is already closed; the create drawer opens when the response arrives. No empty drawer (R-4 A) |
| Found | The normal state, exactly as with `beginFromProject` (R-1) |
| Not found / request error | Error toast via `api.alertsFe` (the flow's existing mechanism, `bilateral-manual-create-flow.service.ts:165`); drawer closed (R-4 B) |
| Missing project or Center on the job | No-op (R-4 C) |

## 8. Shared Contracts

- `beginFromJob`'s argument is a narrow type with `projectId`, `centerId` and `centerAcronym`. It is not `NormalizedBilateralAiListJob`, so the flow service does not import the AI job model.
- The `app-bilateral-manual-create-drawer-host` selector keeps its name. Only its mount points change (consumers in P-7).

## 9. Design Decisions

### `ARM-DD-1`: One mount in the bilateral shell

- **Decision:** mount the host in `bilateral.component.html` and remove it from `bilateral-result-creator.component.html:39` and `bilateral-projects-panel.component.html:448`.
- **Why:** R-3 needs the drawer on every bilateral route. Two mounts on the same `drawerOpen` signal would render twice anywhere both exist.
- **Alternatives:** (a) a third mount inside the app-level AI drawer tree: outside bilateral routes there is no Center, and it stacks with the Spartan dialog; rejected. (b) Mounting per page: 7 routes to keep in sync; rejected.
- **Reversion challenge (Step 2.3), "what does removing the two mounts break?":**
  1. In the creator, the host sat inside the creator's component-level providers (`BilateralAutoSaveService`, `BilateralMdsTrackerService`, `bilateral-result-creator.component.ts:67`). In the shell, the drawer's accordion gets `null` for autosave. The accordion already injects it with `{ optional: true }` for exactly this home case (`bilateral-accordion.component.ts:27-38`), and no other drawer child injects either service (P-8). **No breakage**; in the wizard there is nothing to autosave.
  2. The projects-panel DI-regression test mounts the host **through the panel** (`bilateral-projects-panel.component.spec.ts:240-250`). With the mount removed it would pass without rendering the host, an inert test. **Addressed:** T-2 moves it to a shell or host-level spec with the same no-autosave provider shape.
  3. On home, the drawer used to render inside the panel's DOM. It is `position: fixed` with `z-[140]`/`z-[141]` (`bilateral-create-drawer.component.html:2,8`), so leaving the panel does not change its layout; the stacking context is checked at the HITL pause (`ARM-D-1`).
  4. Neither mount passes `restoreFocusTarget` (both are bare `<app-bilateral-manual-create-drawer-host />`), so focus restore is unchanged.

### `ARM-DD-2`: Always fetch the Job Center's catalogue

- **Decision:** `beginFromJob` always calls `GET_bilateralProjects(job.centerId)` once. It does not read `creationService.projects()`.
- **Why:** `creationService.projects()` does not record which Center it belongs to, and on routes other than create it is empty or stale (P-4). One call per click is cheap and removes the cold-load race that took four attempts in `AIQ-T-8`. The response is not written into `creationService.projects()`, so the creator's own selector list stays unchanged.
- **Amends** `ARM-NFR-2` to "at most one catalogue call per click".

### `ARM-DD-3`: The AI drawer host delegates; no router call

- **Decision:** `onReportManually(job)` sets `service.drawerOpen(false)` (as today, `ai-processes-drawer-host.component.ts:111`) and calls `beginFromJob`. `AI_QUEUE_WAY_QUERY_PARAM` is no longer used for `manual`.
- **Not a reversion of `onUploadDifferentFiles`** (R-6): that handler keeps `way=ai`.

### `ARM-DD-4`: `result/:id` takes the home path (amends `ARM-R-3`)

- **Decision:** on `result/:id` the action goes to the Job Center's home, as for another Center.
- **Why:** `result/:id` mounts the creator in editor mode (`routing-data.ts:751-755`), and there `BilateralCreationService` **is** the open result's state: `selectedProject`, `selectedPrimarySp` and the section components read it (P-9). `beginFromProject` → `selectProject` overwrites `selectedProject` and clears `selectedPrimarySp` (`bilateral-creation.service.ts:335-340`). The open result's editor would then show the job's project and lose its Program.
- **Alternatives:** (a) snapshot and restore the editor state around the drawer: many signals, fragile, and a crash mid-drawer leaves a corrupted editor; rejected. (b) Give the drawer its own state: a refactor of the whole create flow; rejected for this scope.
- **User impact:** only when the user is inside a result's editor. This is the one route change the user did not list (P-9; confirmed by the owner, P-10).

### `ARM-DD-5`: The creator listens for the external entry

- **Decision:** the creator subscribes to `externalEntry` (`takeUntilDestroyed`). On each event it sets its local `selectedReportingWay(null)` and resets autosave and MDS, the same reset `onProjectSelected` applies (`bilateral-result-creator.component.ts:744-750`), without closing the drawer.
- **Why:** R-5. The drawer writes `creationService.selectedProject`, which the wizard shows behind it, while the creator's local `selectedReportingWay` could still be `'ai'` with the page-level AI upload open for the old project.

### `ARM-DD-6`: Close the drawer when the path changes

- **Decision:** the flow closes the drawer on a path change (7.1).
- **Why:** the host now outlives pages. Today a page change destroys the host but leaves `drawerOpen` true (only the creator's init calls `closeDrawer`, `bilateral-result-creator.component.ts:694,725`), so the drawer reappears on return. With one host in the shell it would stay open over the new page with that page's state.
- **Not a reversion:** it adds a guard.

### `ARM-DD-7`: Keep the creator's `?way=manual` parser

- **Decision:** leave `parseAiQueueWayParam` and the creator's `manual` branch as they are. They stay reachable by a hand-typed URL and are harmless; removing them is out of scope.

## 10. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 4 (flow service · shell mount + removals · AI host + creator reaction · HITL live check) |
| LOC | ~220 (≈90 production, ≈130 specs) |
| Review rounds | 1–2 per code task |

This matches Standard.

## 11. Premise Ledger

**Count:** 10 rows. 10 verified, 0 `UNVERIFIED`. P-10 settled by the owner at the design gate, 2026-09-30.
**Blast-radius triggers:** `live-path` (a user action is named) · `shared-state` (the design changes a service and signals several components read) · `consumer` (a DOM hook moves and an exported method is added). All three have rows.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | Clicking Report manually reaches `ai-processes-drawer-host.onReportManually` through card → drawer output → host | `live-path` | `ai-job-card.component.html:168-169` `(click)="onReportManually()"` → `ai-job-card.component.ts:228-229` emits → `ai-processes-drawer.component.html:90,115,138` `(reportManually)="onReportManually(job)"` → `ai-processes-drawer.component.ts:156-157` emits → `ai-processes-drawer-host.component.ts:44` binding → `:109-115`. The only branch point is `variant() === 'no_candidates'` (`ai-job-card.component.ts:130`) | `e7ca42ce6` | DD-3 targets the wrong handler — **High** | — |
| P-2 | `beginFromProject` gives the normal state (reporting way `null`, single Program auto-picked, drawer open) | `existence` | `bilateral-manual-create-flow.service.ts:120-126`, `:223-232`; host template `:25` shows the setup block only when `!flow.selectedReportingWay()` | `e7ca42ce6` | DD-2's reuse does not give R-1 — **High** | — |
| P-3 | The drawer state is shared: `flow.drawerOpen`/`selectedReportingWay` are read only by the host template; the flow is written by the creator (`closeDrawer` ×5, `openDrawerForManual`), the projects panel (`beginFromProject`) and the host | `shared-state` | `grep -rn "manualCreateFlow\.\|flow\.drawerOpen\|flow\.selectedReportingWay\|BilateralManualCreateFlowService" src/app \| grep -v "spec.ts\|CLAUDE.md\|cy.ts"` → host html `:1,25,92,97`; creator ts `:694,725,749,766,770,776`, html `:27`; panel ts `:395`; host ts `:26,38` | `e7ca42ce6` | Another writer reopens or closes the shell drawer unexpectedly — **Low** (T-1/T-3 adjust) | — |
| P-4 | `creationService.projects()` is filled only by the project selector (a creator child), keyed by `ctx.centerInstitutionId()` | `shared-state` | `grep -rn "getProjects(" src/app/pages/bilateral \| grep -v spec` → `bilateral-project-selector.component.ts:55` only; the panel keeps its own list (`bilateral-projects-panel.component.ts:139,294`) | `e7ca42ce6` | DD-2 could reuse a cache — **Low** | — |
| P-5 | `job.centerId` is the CLARISA institution id the projects endpoint expects, and `job.centerAcronym` is the route acronym | `data-env` | Client creates jobs with `ctx.centerInstitutionId()` (`bilateral-ai.service.ts:115-116`); the server lists `center_id: job.center_id`, `center_acronym: centerAcronymById.get(Number(job.center_id))` (`bilateral-ai.service.ts:372-373`, server); the drafts action already routes with `job.centerAcronym` (`ai-processes-drawer-host.component.ts:100-105`); the endpoint wants the institution id (`bilateral-project-selector.component.ts:47-52`) | `e7ca42ce6` | DD-2 fetches the wrong catalogue → always not-found — **High** | — |
| P-6 | `BilateralContextService` keeps the last Center after leaving bilateral, so "current Center" must come from the URL | `data-env` | `ctx` is `providedIn: 'root'` and is set only by `BilateralComponent` on `:acronym` changes (`bilateral.component.ts:26-45`); nothing clears it on leave (`grep -rn "setCenter(" src/app \| grep -v spec` → `bilateral.component.ts` only) | `e7ca42ce6` | 7.2 could read `ctx` — **Low** | — |
| P-7 | Consumers of the moved selector and the changed handler | `consumer` | `grep -rlnE "manual-create-drawer-host\|BilateralManualCreateDrawerHostComponent" src cypress \| grep -v CLAUDE.md` → creator ts/html, panel html + spec, host ts/spec, flow ts; comments only in accordion ts, ai-upload ts/spec, sp-selector spec. `grep -rlnE "onReportManually\|reportManually\|report-manually" src cypress` → job-card ts/html/spec, drawer ts/html/spec, host ts/spec, copy. `grep -rnE "way: 'manual'\|way=manual" src cypress` → host ts:113, host spec:144-148, creator spec:490-491. No `cypress/e2e` hit for either | `e7ca42ce6` | A missed spec breaks silently — **Low** | — |
| P-8 | No drawer child needs the creator's component-level providers besides the accordion, which injects optionally | `shared-state` | `grep -rn "inject(\(BilateralAutoSaveService\|BilateralMdsTracker\w*\|BilateralQualityAssessment\w*\)" components/{bilateral-manual-create-form,bilateral-reporting-way-selector,bilateral-sp-selector,bilateral-ai-upload,bilateral-create-drawer,bilateral-accordion}` → `bilateral-accordion.component.ts:38` (`optional: true`) only | `e7ca42ce6` | The shell mount throws `NullInjectorError` — **High** (DD-1 reverts) | — |
| P-9 | On `result/:id`, `BilateralCreationService` is the open result's editor state, so `selectProject` would corrupt it | `shared-state` | Route mounts the creator (`shared/routing/routing-data.ts:751-755`); `loadResult` writes the editor state (`bilateral-creation.service.ts:161-169`); `selectProject` clears `selectedPrimarySp` (`:335-340`); editor sections inject `BilateralCreationService` (`grep -rln "BilateralCreationService" components \| grep -v spec` → section-general-info, section-zero-dashboard, section-contributors, section-geography, section-evidence, section-toc, …) | `e7ca42ce6` | DD-4 unnecessary — **Low** | — |
| P-10 | The product accepts a route change to the Center home when Report manually is clicked inside a result editor | `other` | Product decision by the owner at the design gate, 2026-09-30 ("Continue", the option that confirms P-10). This is a decision, not a fact about the code | `e7ca42ce6` | DD-4 changes: the action is hidden or disabled inside the editor — **High** | — |
