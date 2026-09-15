# Design: Results Center platform reporting guide

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/results-center-reporting-guide` |
| **Requirements** | [`requirements.md`](./requirements.md) |
| **Depth** | Standard |
| **Status** | in-review |
| **Depends on** | `changes/results-center-sp-layout` (hero actions) |
| **Date** | 2026-09-11 |

---

## 1. Summary

Add a **platform wrapper** around the shipped SP **Where to report** hub: a Results Center hero CTA opens a modal that (1) computes user persona, (2) optionally shows a program picker, (3) embeds `WhereToReportModalComponent` content for the selected `programCode`, or (4) renders **guide-only** static lanes when the user lacks SP access. **Client-only**; maximum reuse of `ReportingEntryHubComponent`, `hub-copy.ts`, and existing API calls.

**Budget (tripwire for `/akili-execute`):**

| Metric | Estimate |
|---|---|
| Tasks | 5 |
| LOC | 280–380 |
| Review rounds | 1–2 |

---

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Touch |
|---|---|
| **Client — RC** | `results-list.component.{html,ts}` — hero CTA + modal host |
| **Client — new** | `results-center-reporting-guide/` under `results-outlet/pages/results-list/` OR `result-framework-reporting/pages/shared/` |
| **Client — reuse** | `where-to-report-modal`, `reporting-entry-hub`, `hub-copy.ts` |
| **Client — services** | `PlatformReportingGuideService` (persona + SP list), `EntityAowService` (prime `entityId`) |
| **Server** | none |

### 2.2 Modal state machine

```
[RC Hero: Where to report]
        │
        ▼
┌───────────────────────────────────────┐
│  ResultsCenterReportingGuideComponent │
│  (shell: header + body slot)          │
└───────────────────────────────────────┘
        │
        ├─ hasSpAccess === false ──► GUIDE_ONLY (static lanes RCG-R-5, RCG-R-6)
        │
        ├─ spChoices.length > 1 ──► PICK_PROGRAM ──select──► HUB
        │
        └─ spChoices.length === 1 ──► HUB (auto programCode)
                    │
                    ▼
        ┌─────────────────────────────┐
        │ app-where-to-report-modal   │  OR inline hub only (body without double dialog)
        │ programCode = selected      │
        │ returnTab = null            │
        └─────────────────────────────┘
```

**RCG-DD-1:** Prefer **single dialog shell** — the platform component owns the outer `app-pr-dialog` chrome; in `hub` mode it renders `ReportingEntryHubComponent` directly (same as modal body today) to avoid nested dialogs. `WhereToReportModalComponent` logic for fetch/navigation moves to a thin **facade** or the platform component duplicates the constructor `effect` by delegating to an extracted `ReportingEntryHubLoaderService` — **implementer choice:** simplest path is embed `WhereToReportModalComponent` with `[visible]` bound and **hide its outer duplicate header** via `@Input() chromeless` on the modal (small additive input, no behavior change for SP callers).

### 2.3 Primary flows

| User action | Behavior |
|---|---|
| Open guide | Compute persona; set mode |
| Pick SP (multi) | Set `selectedProgramCode`; prime `EntityAowService.entityId`; load hub |
| Report AoW | Close guide; `router.navigate` (reuse modal handlers) |
| Report emerging | Close guide; navigate with `reportEmerging=true` |
| Close | Reset picker step; clear loaded code cache optional |

### 2.4 Persona matrix (authoritative)

| SP | Center | Mode | W1/W2 | W3 | Emerging |
|---|---|---|---|---|---|
| ✓ | ✓ | hub | Hub rows | Hub W3 ready | Per SP rules |
| ✓ | ✗ | hub | Hub rows | `no-centers` | Per SP rules |
| ✗ | ✓ | guide-only | Explainer + link | Explainer (OQ-1) | Disabled + copy |
| ✗ | ✗ | guide-only | Explainer | `no-centers` copy | Disabled + copy |
| admin | any | hub/pick | Full catalog picker | Hub W3 | Per SP rules |

---

## 3. Data Model Changes

None.

---

## 4. API Design

Reuse existing client API methods only:

| Call | When |
|---|---|
| `GET_ScienceProgramsProgress` | Admin / populate picker labels |
| `GET_ScienceProgramTocProgress`, `GET_IntermediateOutcomes`, `GET_2030Outcomes` | Hub W1/W2 (hub mode only) |
| `GET_reportingEntryHubProjects`, `GET_ResultToReview` | Hub W3 (hub mode only) |
| `GET_phaseInitiativeStatus` | Via `EntityAowService` when priming |

---

## 5. Backend Module Design

Not applicable.

---

## 6. Frontend / UX Component Architecture

### 6.1 `PlatformReportingGuideService`

Injectable (provided in RC module or root). Signals/computed:

- `hasSpAccess()`, `hasCenterAccess()`, `spChoices(): Array<{ code, name, initiativeId }>`
- `modalMode(): 'guide-only' | 'pick-program' | 'hub'`
- `selectedProgramCode()` writable
- `loadSpChoices()` — from `dataControlSE.myInitiativesListReportingByPortfolio`; admin adds `GET_ScienceProgramsProgress` merge

Pure functions exported for Jest (`resolveGuideMode`, `buildSpChoices`).

### 6.2 `ResultsCenterReportingGuideComponent`

Standalone component imported into `ResultsListModule`.

| Section | Content |
|---|---|
| Header | Same as SP modal (compass icon, title, subtitle from `HUB_COPY`) |
| Body — guide-only | Two static lane cards + emerging card; copy from `platform-guide-copy.ts` |
| Body — pick-program | Radio/list of `spChoices`; Continue button |
| Body — hub | `ReportingEntryHubComponent` with inputs wired like `where-to-report-modal.html` |

**CTA on RC hero** (`results-list.component.html`):

- Button matches SP band: label **Where to report**, `material-icons-round explore`, soft outline style (`rc-btn--soft`).
- Placement: hero actions row, before **Update result** (compass primary action pattern from SP).

### 6.3 Copy file — `platform-guide-copy.ts`

Platform-only strings (guide-only lanes, center-without-SP W3, no-SP W1/W2). **Do not duplicate** `HUB_COPY.w3.noCentersBody` — import from `hub-copy.ts`.

### 6.4 `EntityAowService` priming

Before rendering hub with Report buttons, call existing dashboard-lab pattern:

- Set `entityAowService.entityId` to selected program code
- Invoke reporting access check so `canReportResults()` reflects the selected SP

Reference: `dashboard-lab.component.ts` `primeEntityAowContext()` pattern.

### 6.5 Optional `WhereToReportModalComponent` extension

If double-header avoided via inline hub, **no change** to SP modal. If embed full modal:

- Add optional `@Input() hideShell = false` — when true, render only inner hub (SP callers unchanged).

**Reversion challenge (Step 2.3):** Adding optional input defaults false — **does not revert** SP behavior; no challenge required.

---

## 7. Shared Contracts

| Contract | Notes |
|---|---|
| `HUB_COPY` | Shared W3 empty, tooltips, lane titles |
| `HubW3State` | `'no-centers'` status unchanged |
| Query params | `tocView`, `tocAow`, `reportEmerging` — existing SP contract |

---

## 8. Design Decisions

| ID | Decision | Rationale | Rejected |
|---|---|---|---|
| **RCG-DD-1** | Platform shell + hub body embed | Avoid nested dialogs; reuse hub | Full duplicate of hub (Option B) |
| **RCG-DD-2** | Guide-only when no SP | Prevents empty AoW fetch + confusing UX | Disabled buttons on empty lists |
| **RCG-DD-3** | Auto-select single SP | ≤2 clicks to Report | Always show picker |
| **RCG-DD-4** | Admin full catalog in picker | Admins report on behalf of any SP | My programs only |
| **RCG-DD-5** | No `returnTab` from RC v1 | RC outside SP shell; smart-nav future | `returnTab=results-center` |
| **RCG-DD-6** | CTA on hero not toolbar | Matches SP band primary actions | Filter toolbar (Columns/Export row) |

---

## 9. Testing Strategy

| Area | Spec file |
|---|---|
| Persona / mode resolution | `platform-reporting-guide.service.spec.ts` |
| RC wiring | `results-list.component.spec.ts` (open guide, CTA visible) |
| Guide-only template | `results-center-reporting-guide.component.spec.ts` |
| Hub regression | `where-to-report-modal.component.spec.ts`, `reporting-entry-hub.component.spec.ts` (scoped, no changes expected) |

---

## 10. Rollout & Risks

| Risk | Mitigation |
|---|---|
| `EntityAowService` not primed → wrong Report enabled state | Task RCG-T-3 explicitly primes before hub render |
| RC layout not shipped → cramped hero | Depend on `results-center-sp-layout` or add CTA in same PR |
| Admin SP list large | Picker scroll max-height 320px; search filter optional stretch |

---

## 11. Requirement Traceability

| Requirement | Design section |
|---|---|
| RCG-R-1 | §6.2 hero CTA |
| RCG-R-2..R-9 | §2.2 state machine, §6.2 body modes |
| RCG-NFR-1..4 | §6.3 copy, §9 tests |
