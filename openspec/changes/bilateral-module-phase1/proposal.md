## Why

CGIAR is transitioning bilateral result reporting from a centralized manual curation model (Nicoletta curates Excel → loads via `/api/bilateral/create`) to a **self-service model** where 12 CG Centers report directly in PRMS. The bilateral module is embedded in PRMS — center users see only this module when they log in.

**Phase 1** delivers the **manual creation route** (Route A): center users select a bilateral project, pick a Science Program, fill MDS sections, and submit. No AI involvement. This is the hard requirement for the September 2026 bilateral reporting window.

This is also a **new product identity** within PRMS — the first module to use an accordion-based layout with a dashboard header, progressive disclosure, and a professional, research-oriented UX. Every subsequent phase (AI route, draft lifecycle, review) builds on the patterns established here.

**Scope: full-stack.** Backend endpoints for bilateral project data + frontend creation surface. Backend changes are required and flagged for hand-off.

**Jira:** P2-3100 (Create New Bilateral Result Form Workflow), P2-3101 (Common fields), P2-3122–P2-3127 (type-specific sections). Epic: P2-2965.

## What Changes

### Backend (hand-off to user)

1. **New endpoint** `GET /api/bilateral/projects?centerId={id}` — returns bilateral projects for a center with nested Science Program mappings (from `clarisa_project_mappings` joined with `clarisa_initiatives` via `program_code = official_code`). Includes `allocation` percentage per SP.
2. **Extend result creation validation** — accept `source=Bilateral`, validate SP selection against W3 Registry mappings, set `status_id=1` (Editing).
3. **Auto-save PATCH** — existing `PATCH /api/results/:id` already works; no new endpoint needed. Ensure bilateral fields are patchable.

### Frontend (AI-implementable)

1. **New page** `bilateral-result-creator` — the creation surface with accordion layout.
2. **Section 0: Dashboard** — three-column header: project context + SP badges, MDS progress ring (SVG), action buttons.
3. **Sections 1–5: Accordion panels** — General Info, Contributors & Partners, Geographic Location, Evidence, Type-Specific. Each shows MDS fields by default, non-MDS behind "Show all fields" expandable.
4. **`BilateralMdsTrackerService`** — frontend-only MDS completeness tracker. Computes per-section and overall % from form field values via Angular signals. No backend calls.
5. **`BilateralAutoSaveService`** — auto-save with 800ms debounce for text fields, immediate for selects/checkboxes. Flushes on accordion collapse and route navigation.
6. **Component SCSS** — no Tailwind (deferred to Yecksin). Uses existing `--pr-color-*` tokens + new bilateral-specific variables.
7. **Reuse existing `rd-*` section components** where possible (geography, evidence, type-specific pages).

## Capabilities

### New Capabilities
- `bilateral-project-selector`: Center users can select a bilateral project from a filtered dropdown. Project data includes lead center, summary, description, and mapped Science Programs with allocation percentages.
- `bilateral-sp-selector`: Users select a Primary Contributing Science Program from the project's W3 Registry mappings. Secondary SPs can also be selected. Allocation % displayed per SP.
- `bilateral-accordion-layout`: Accordion-based form layout with collapsible sections, completion indicators, and progressive disclosure of non-MDS fields.
- `bilateral-mds-tracker`: Frontend-only MDS completeness tracking. Per-section and overall progress computed from form field values. Drives the progress ring and accordion header indicators.
- `bilateral-auto-save`: Automatic field persistence with 800ms debounce for text, immediate for selects. Flushes on collapse and navigation.
- `bilateral-section-zero-dashboard`: Command center header showing project context, SP badges, MDS progress ring, and action buttons (Generate Narrative, Download PDF, AI Review, Submit).
- `bilateral-expandable-persistence`: Per-section expandable state persisted in localStorage. Defaults: Section 1 open, all others collapsed.

### Modified Capabilities
- `result-creation-flow`: The bilateral route creates results with `source=Bilateral` and `status_id=1` (Editing), following the bilateral lifecycle (not W1/W2 Quality Assessed/Submitted).

## Impact

### Backend files (hand-off)
- `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.controller.ts` — new endpoint
- `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.service.ts` — query with mappings join
- `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts` — new query method
- `onecgiar-pr-server/src/api/results/results.service.ts` — bilateral creation validation

### Frontend files (AI-implementable)
- `onecgiar-pr-client/src/app/pages/bilateral/` — new module directory
- `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` — new API methods
- Existing `rd-*` components reused (not modified)

### Not touched
- Tailwind CSS (deferred — Yecksin will migrate later)
- GreenChecksService (bilateral uses frontend-only MDS tracker)
- AI module (`api/ai/`) — Phase 3 scope
- `result-qaed/` module — empty scaffold, not touched
- Existing bilateral ingestion (`/api/bilateral/create`) — unchanged

## SDD References

- Epic: P2-2965
- Lead US: P2-3100
- Spec: `docs/specs/bilateral-ai-workflow/bilateral-ai-workflow-spec.md` (§2.7, §2.8, §5.3 Phase 1)
- Payload contract: `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- Bilateral module guide: `onecgiar-pr-server/src/api/bilateral/AGENTS.md`
- Decisions: D1 (SP from W3 Registry), D2 (is_planned removed), D4 (MDS-only AI scope), D5 (AI guides not blocks), D15 (Tailwind deferred), D19 (bilateral lifecycle), D21 (user chooses primary SP), D22 (secondary SPs from W3 Registry)
