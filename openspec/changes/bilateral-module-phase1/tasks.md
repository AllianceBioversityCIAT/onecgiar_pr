## 1. Backend — Bilateral Projects Endpoint (hand-off to user)

- [x] 1.1 Add new endpoint `GET /api/bilateral/projects?centerId={id}` in `bilateral-center.controller.ts`
- [x] 1.2 Implement query in `bilateral-projects.service.ts` joining `clarisa_projects` → `clarisa_institutions` (lead center) → `clarisa_project_mappings` → `clarisa_initiatives` (SP via `program_code = official_code`)
- [x] 1.3 Return shape: `{ projects: [{ id, shortName, fullName, summary, description, leadCenter: { id, name, acronym }, sciencePrograms: [{ programId, programCode, allocation, spName, spShortName }] }] }`
- [x] 1.4 Filter: `WHERE cp.organization_code = :centerId AND cp.is_active = 1`
- [x] 1.5 Add Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiQuery`)
- [x] 1.6 Add co-located spec (`bilateral-center.controller.spec.ts`)
- [ ] 1.7 Verify: curl endpoint returns projects with nested SPs

## 2. Backend — Bilateral Creation Validation (hand-off to user)

- [x] 2.1 Extend result creation validation in `results.service.ts` to accept `source=Bilateral` with SP validation against W3 Registry mappings — POST endpoint exists at `/api/results/create`
- [ ] 2.2 Ensure `PATCH /api/results/:id` handles all bilateral MDS fields (title, description, geographic scope, evidence, type-specific fields)
- [ ] 2.3 Verify: create a bilateral result via `POST /api/results/create` with `source=API`, `status_id=1`

## 3. Frontend — Module Scaffolding

- [x] 3.1 Create `onecgiar-pr-client/src/app/pages/bilateral/` directory structure:
  - `bilateral.module.ts`
  - `bilateral-routing.module.ts`
  - `pages/bilateral-result-creator/`
  - `components/` (section-zero-dashboard, bilateral-accordion, bilateral-project-selector, bilateral-sp-selector, mds-progress-ring, section-general-info, section-contributors, section-geography, section-evidence, section-type-specific)
  - `services/` (bilateral-creation.service.ts, bilateral-mds-tracker.service.ts, bilateral-auto-save.service.ts, bilateral-expandable-state.service.ts)
- [x] 3.2 Register bilateral module in `app-routing.module.ts` (route: `bilateral`)
- [x] 3.3 Add API methods in `results-api.service.ts`:
  - `GET_bilateralProjects(centerId: number)` → `GET /api/bilateral/projects?centerId={id}`
- [x] 3.4 Verify: `ng build` compiles with no errors

## 4. Frontend — BilateralCreationService

- [x] 4.1 Implement `bilateral-creation.service.ts`:
  - `getProjects(centerId: number): Observable<BilateralProject[]>`
  - `createResult(payload: BilateralResultCreateDto): Observable<Result>`
  - `patchResult(resultId: number, changes: Partial<Result>): Observable<Result>`
- [x] 4.2 Define interfaces: `BilateralProject`, `ScienceProgramMapping`, `BilateralResultCreateDto`
- [ ] 4.3 Add spec: `bilateral-creation.service.spec.ts` with mocked HTTP calls

## 5. Frontend — BilateralMdsTrackerService

- [x] 5.1 Implement `bilateral-mds-tracker.service.ts` per spec (`specs/bilateral-mds-tracker.spec.md`)
- [x] 5.2 Define MDS field configurations per section and per result type
- [x] 5.3 Implement reactive computation: `sectionStatus$`, `overallPercentage$`, `overallStatus$`
- [ ] 5.4 Add spec: `bilateral-mds-tracker.service.spec.ts` with field completion scenarios

## 6. Frontend — BilateralAutoSaveService

- [x] 6.1 Implement `bilateral-auto-save.service.ts` per spec (`specs/bilateral-auto-save.spec.md`)
- [x] 6.2 Text fields: 800ms debounce + save on blur
- [x] 6.3 Selects/checkboxes: immediate save on change
- [x] 6.4 `flush()` method: awaits all pending PATCHes
- [x] 6.5 Visual feedback signals: `fieldStatus$` map (idle → saving → saved/error)
- [ ] 6.6 Add spec: `bilateral-auto-save.service.spec.ts` with debounce and flush scenarios

## 7. Frontend — BilateralExpandableStateService

- [x] 7.1 Implement `bilateral-expandable-state.service.ts`
- [x] 7.2 localStorage key pattern: `bp_expand_{resultId}_{sectionName}`
- [x] 7.3 Default state: Section 1 open, all others collapsed
- [x] 7.4 Per-result, per-section persistence
- [x] 7.5 "Show all fields" expandable: separate key pattern `bp_extra_{resultId}_{sectionName}`

## 8. Frontend — MDS Progress Ring Component

- [x] 8.1 Implement `mds-progress-ring.component.ts` — SVG circle, 80px diameter, 8px stroke
- [x] 8.2 Inputs: `percentage: number`, `size: number = 80`
- [x] 8.3 Color logic: < 40% → #C62828, 40-80% → #F57F17, > 80% → #2E7D32
- [x] 8.4 Animate stroke-dashoffset on percentage change (300ms ease)
- [ ] 8.5 Add spec: `mds-progress-ring.component.spec.ts`

## 9. Frontend — Bilateral Accordion Component

- [x] 9.1 Implement `bilateral-accordion.component.ts` — reusable accordion container
- [x] 9.2 Inputs: `sectionName`, `sectionLabel`, `sectionIcon`, `totalFields`, `filledFields`
- [x] 9.3 Content projection: `[mds-fields]` and `[extra-fields]` slots
- [ ] 9.4 Single-open behavior: `openSection` signal shared across accordion instances (via parent or service)
- [x] 9.5 Integrate `BilateralExpandableStateService` for persistence
- [x] 9.6 Integrate `BilateralAutoSaveService.flush()` before collapse
- [x] 9.7 Smooth expand/collapse animation (300ms ease)
- [ ] 9.8 Add spec: `bilateral-accordion.component.spec.ts`

## 10. Frontend — Section 0 Dashboard

- [x] 10.1 Implement `section-zero-dashboard.component.ts` per spec (`specs/bilateral-section-zero-dashboard.spec.md`)
- [x] 10.2 Three-column card layout: Project Context | MDS Progress | Actions
- [x] 10.3 Project Context: project code, name, lead center, SP badges with allocation %
- [x] 10.4 MDS Progress: `mds-progress-ring` + per-section breakdown list
- [x] 10.5 Actions: Generate Narrative (disabled for Phase 1), Download PDF, AI Review (disabled), Submit
- [x] 10.6 Responsive: cards stack on mobile (< 768px)
- [x] 10.7 Click section name → scroll to accordion section
- [ ] 10.8 Add spec: `section-zero-dashboard.component.spec.ts`

## 11. Frontend — Project & SP Selectors

- [x] 11.1 Implement `bilateral-project-selector.component.ts` — dropdown filtered by center
- [x] 11.2 On project select: emit `selectedProject` with full project data + SPs
- [x] 11.3 Implement `bilateral-sp-selector.component.ts` — primary SP dropdown + secondary multi-select
- [x] 11.4 Display allocation % per SP option
- [x] 11.5 Validate: only SPs from project's W3 Registry mappings allowed
- [ ] 11.6 Add specs for both selectors

## 12. Frontend — Section Components (1-5)

- [x] 12.1 `section-general-info.component.ts` — title, description. Extra fields behind "Show all fields".
- [x] 12.2 `section-contributors.component.ts` — primary SP, lead center, contributing projects, ToC work packages.
- [x] 12.3 `section-geography.component.ts` — geographic_scope dropdown with conditional regions/countries.
- [x] 12.4 `section-evidence.component.ts` — evidence list, add/remove, max 6 pieces.
- [x] 12.5 `section-type-specific.component.ts` — type selector with field hints per result type.
- [x] 12.6 Each section integrates `BilateralAutoSaveService`
- [x] 12.7 Each section integrates `BilateralMdsTrackerService`

## 13. Frontend — Bilateral Result Creator Page

- [x] 13.1 Implement `bilateral-result-creator.component.ts` — page shell
- [x] 13.2 Routing: `bilateral/create` → creator page. `bilateral/result/:id` → edit existing.
- [x] 13.3 Creation flow: select project → select SP → select result level → select result type → create result
- [x] 13.4 Edit flow: load result → populate all sections → auto-save on changes
- [x] 13.5 Breadcrumb: CGIAR Center > [Full Center Name] (INITIALS)
- [x] 13.6 Submit button: enabled when overall MDS = 100%, triggers status transition
- [ ] 13.7 Add spec: `bilateral-result-creator.component.spec.ts`

## 14. Frontend — Styles

- [x] 14.1-14.3 Consistent SCSS tokens, accordion headers, completion dots, badges, progress bars across all components
- [x] 14.4 Responsive breakpoints: 768px (mobile), 1200px (tablet) in dashboard
- [x] 14.5 Typography: Inter + JetBrains Mono referenced in CSS

## 15. Verification

- [x] 15.1 Client `npm run build:dev` — passes
- [x] 15.2 Client `npm run lint` — passes
- [x] 15.1 Server `npm run lint` — passes
- [ ] 15.3 Unit tests
- [ ] 15.4-15.7 Manual verification (needs running server)
