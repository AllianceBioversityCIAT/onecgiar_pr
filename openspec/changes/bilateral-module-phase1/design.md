## Context

The PRMS codebase already has substantial bilateral infrastructure:
- **Backend**: `api/bilateral/` module with headless ingestion (4,609-line service, 5 type-specific handlers, CLARISA API key auth)
- **Backend**: `api/ai/` module with full AI review lifecycle (sessions, proposals, events, revisions)
- **Frontend**: `bilateral-results/` review surface (1,666-LOC review drawer, filters, table)
- **Frontend**: `result-creator/` with initiative selector, level/type picker, AI assistant stub
- **Frontend**: `result-detail/` with `rd-*` section components, `GreenChecksService`, panel menu
- **Data**: `clarisa_project_mappings` table already synced with `program_code`, `allocation` (decimal 5,2), `program_id`

The `clarisa_project_mappings` entity already has the SP mapping data needed:
```
ClarisaProjectMapping
  ├── programCode  →  ClarisaInitiative.official_code  (SP match, guaranteed)
  ├── programId    →  ClarisaInitiative.id
  ├── allocation   →  DECIMAL(5,2)  (the percentage)
  └── status
```

**But no endpoint currently queries this join.** The `clarisa_project_mappings` relation is defined on `ClarisaProject.obj_project_mappings` but never loaded in any `find()` call. The CLARISA sync (`clarisatask.service.ts`) writes mappings but nothing reads them.

## Goals / Non-Goals

**Goals:**
- Center users can create bilateral results via a manual form (Route A)
- Form uses accordion layout with dashboard header (Section 0)
- MDS completeness tracked on frontend (no backend green-checks dependency)
- Auto-save on every field change (800ms debounce text, immediate selects)
- Expandable state persisted per section per result
- Professional, research-oriented design aligned with CGIAR brand

**Non-Goals:**
- No AI route (Phase 3)
- No draft status/lifecycle (Phase 3)
- No Tailwind CSS (deferred to Yecksin)
- No GreenChecks backend integration (frontend-only MDS tracker)
- No webhook notifications (Phase 5)
- No Excel bulk upload (future consideration)

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND                                                                │
│                                                                         │
│  GET /api/bilateral/projects?centerId={id}                             │
│  ─────────────────────────────────────────────                          │
│  Query:                                                                 │
│    SELECT cp.*, ci.name as lead_center_name, ci.acronym,               │
│           cpm.program_id, cpm.program_code, cpm.allocation,            │
│           ci_sp.name as sp_name, ci_sp.short_name as sp_short_name     │
│    FROM clarisa_projects cp                                             │
│    LEFT JOIN clarisa_institutions ci ON ci.id = cp.organization_code    │
│    LEFT JOIN clarisa_project_mappings cpm ON cpm.project_id = cp.id    │
│    LEFT JOIN clarisa_initiatives ci_sp ON ci_sp.official_code           │
│                                    = cpm.program_code                  │
│    WHERE cp.organization_code = ? AND cp.is_active = 1                  │
│                                                                         │
│  Response shape:                                                        │
│  {                                                                      │
│    projects: [{                                                         │
│      id, shortName, fullName, summary, description,                    │
│      leadCenter: { id, name, acronym },                                │
│      sciencePrograms: [{                                               │
│        programId, programCode, allocation,                             │
│        spName, spShortName                                             │
│      }]                                                                │
│    }]                                                                   │
│  }                                                                      │
│                                                                         │
│  POST /api/results/create (existing, extended)                         │
│  ─────────────────────────────────────────                              │
│  Accepts: source='API', status_id=1, result_type_id, result_level_id,  │
│           version_id, title, description, ...                           │
│  Validates: SP exists in project's W3 Registry mappings                │
│                                                                         │
│  PATCH /api/results/:id (existing, no changes needed)                  │
│  ──────────────────────────────────────────────────────                 │
│  Accepts partial updates to any result field                           │
│  Used by auto-save for every field change                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                               │
│                                                                         │
│  bilateral-result-creator.component                                     │
│  ───────────────────────────────────────                                │
│  1. onLoad → GET /api/bilateral/projects?centerId={user.centerId}      │
│  2. User selects project → populates Section 0 dashboard               │
│  3. User selects SP → stored in form state                             │
│  4. User fills sections → BilateralAutoSaveService debounces + PATCHes │
│  5. BilateralMdsTrackerService watches signals → updates progress ring │
│  6. Accordion collapse → localStorage persist + flush pending saves    │
│  7. Submit → status transition Editing(1) → Pending Review(5)          │
│                                                                         │
│  BilateralMdsTrackerService                                             │
│  ────────────────────────────                                           │
│  Input: form field signals (title, description, geo_scope, evidence[]) │
│  Output: MdsSectionStatus[] per section + overall percentage           │
│  Logic: field.required ? (value ? filled : empty) : always filled      │
│  No backend calls. Pure computation from signal values.                │
│                                                                         │
│  BilateralAutoSaveService                                               │
│  ──────────────────────────                                             │
│  Text fields: 800ms debounce + save on blur                           │
│  Selects/checkboxes: immediate on change                               │
│  Accordion collapse: flush pending → then collapse                     │
│  Route navigation: canActivate guard → flush pending → then navigate   │
│  Visual feedback: "Saving..." → "Saved ✓" → fade                      │
│                                                                         │
│  Expandable persistence                                                 │
│  ────────────────────────                                               │
│  localStorage key: bp_expand_{resultId}_{sectionName}                  │
│  Default: Section 1 open, all others collapsed                         │
│  User toggle → persist immediately                                     │
│  New result → defaults apply                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
bilateral-result-creator/
├── bilateral-result-creator.component.ts      (page shell, routing)
├── bilateral-result-creator.module.ts
├── bilateral-result-creator-routing.module.ts
│
├── components/
│   ├── section-zero-dashboard/
│   │   ├── section-zero-dashboard.component.ts
│   │   ├── section-zero-dashboard.component.html
│   │   └── section-zero-dashboard.component.scss
│   │
│   ├── bilateral-accordion/
│   │   ├── bilateral-accordion.component.ts   (reusable accordion container)
│   │   ├── bilateral-accordion.component.html
│   │   └── bilateral-accordion.component.scss
│   │
│   ├── bilateral-project-selector/
│   │   ├── bilateral-project-selector.component.ts
│   │   ├── bilateral-project-selector.component.html
│   │   └── bilateral-project-selector.component.scss
│   │
│   ├── bilateral-sp-selector/
│   │   ├── bilateral-sp-selector.component.ts
│   │   ├── bilateral-sp-selector.component.html
│   │   └── bilateral-sp-selector.component.scss
│   │
│   ├── mds-progress-ring/
│   │   ├── mds-progress-ring.component.ts     (SVG circle, 80px)
│   │   ├── mds-progress-ring.component.html
│   │   └── mds-progress-ring.component.scss
│   │
│   ├── section-general-info/
│   │   ├── section-general-info.component.ts  (wraps/adapts rd-general-information)
│   │   ├── section-general-info.component.html
│   │   └── section-general-info.component.scss
│   │
│   ├── section-contributors/
│   │   └── ... (wraps rd-contributors-and-partners for bilateral)
│   │
│   ├── section-geography/
│   │   └── ... (wraps rd-geographic-location)
│   │
│   ├── section-evidence/
│   │   └── ... (wraps rd-evidences)
│   │
│   └── section-type-specific/
│       └── ... (routes to policy-change, innovation-dev, etc.)
│
└── services/
    ├── bilateral-creation.service.ts          (API calls: projects, create, patch)
    ├── bilateral-mds-tracker.service.ts        (frontend MDS completeness)
    ├── bilateral-auto-save.service.ts          (debounce + PATCH)
    └── bilateral-expandable-state.service.ts   (localStorage persistence)
```

## Design Decisions

### Decision 1 — Single endpoint with nested SP mappings

**Choice:** `GET /api/bilateral/projects?centerId={id}` returns projects with nested `sciencePrograms[]` array.

**Rejected:** Separate calls for projects and mappings.

**Rationale:** The creation flow always needs both — user picks project → immediately sees SP options. Two calls = two loading states = waterfall. Mapping data is tiny (2-5 rows per project). One endpoint, one loading state, one source of truth.

### Decision 2 — Frontend-only MDS tracker (no GreenChecks dependency)

**Choice:** `BilateralMdsTrackerService` computes completeness from form signals in the browser.

**Rejected:** Extending GreenChecksService or creating backend bilateral green-checks.

**Rationale:** GreenChecks is section-level binary (valid/invalid) tied to stored procedures. Bilateral needs field-level granularity ("3/5 fields complete"). Frontend computation is instant, no API calls, and decouples from the P22/P25 validation infrastructure. Can migrate to backend later if needed.

### Decision 3 — Auto-save strategy

**Choice:** 800ms debounce for text fields, immediate for selects/checkboxes. Flush on accordion collapse and route navigation.

**Rationale:** Scientists write long titles and descriptions. 500ms fires mid-sentence too often. 800ms + blur gives natural rhythm: type → pause → save, or type → click away → save. Selects are discrete choices — user expects instant feedback.

### Decision 4 — Component SCSS (no Tailwind)

**Choice:** Use existing `--pr-color-*` tokens + new bilateral-specific SCSS variables.

**Rejected:** Installing Tailwind for bilateral only.

**Rationale:** Tailwind is not installed. Decision D15 says "Tailwind migration" but Yecksin will handle that later. Installing Tailwind now adds complexity (config, PostCSS, potential conflicts) for no immediate benefit. Component SCSS with the existing token system is sufficient and consistent.

### Decision 5 — Expandable state in localStorage

**Choice:** `localStorage` with key pattern `bp_expand_{resultId}_{sectionName}`.

**Rejected:** Backend persistence or session storage.

**Rationale:** Expandable state is UI preference, not data. localStorage is instant, survives page reloads, and doesn't need API calls. Per-result key prevents stale state from other results bleeding in.

### Decision 6 — Reuse rd-* components vs. rebuild

**Choice:** Wrap existing `rd-*` section components where possible. Create thin bilateral-specific wrappers that adapt the form fields to the accordion context and MDS tracker.

**Rejected:** Rebuilding all sections from scratch.

**Rationale:** The rd-* components already handle complex field validation, API calls, and edge cases. Wrapping them preserves that logic while adding the bilateral accordion chrome. Type-specific pages already route correctly based on `result_type_id`.

## Visual Design

### Color Tokens (SCSS variables)

```scss
// Bilateral palette — extends existing --pr-color-* system
$bp-blue:        #1565C0;   // primary action, active states
$bp-blue-light:  #E3F2FD;   // selected backgrounds, badges
$bp-green:       #2E7D32;   // complete, success
$bp-green-light: #E8F5E9;   // complete backgrounds
$bp-amber:       #F57F17;   // partial, warning
$bp-amber-light: #FFF8E1;   // partial backgrounds
$bp-red:         #C62828;   // missing, error
$bp-gray-50:     #FAFAFA;   // page background
$bp-gray-100:    #F5F5F5;   // accordion header bg
$bp-gray-200:    #EEEEEE;   // borders
$bp-gray-400:    #BDBDBD;   // disabled
$bp-gray-600:    #757575;   // secondary text
$bp-gray-900:    #212121;   // primary text
```

### Typography

```
Headers:     Inter Semi-Bold, 18/16/14px hierarchy
Body:        Inter Regular 14px, line-height 1.5
Mono:        JetBrains Mono 13px (codes: P2837, R-2026-0142)
Labels:      Inter Medium 12px, uppercase, letter-spacing 0.5px, color #546E7A
```

### Section 0 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  PROJECT               │  │  PROGRESS    │  │  ACTIONS               │  │
│  │                        │  │              │  │                        │  │
│  │  P2837                 │  │    ╭───╮     │  │  [Generate Narrative]  │  │
│  │  CIMMYT Wheat Yield    │  │   ╱ 67%╲    │  │  [Download PDF]        │  │
│  │  Improvement           │  │  │  ▓▓▓ │   │  │  [AI Review]           │  │
│  │                        │  │  │  ▓▓░ │   │  │  [Submit for Review]   │  │
│  │  ┌──────────────────┐  │  │   ╲ ▓░╱    │  │                        │  │
│  │  │ Climate Action   │  │  │    ╰──╯     │  │                        │  │
│  │  │ ████████░░ 45%   │  │  │              │  │                        │  │
│  │  └──────────────────┘  │  │  ──────────  │  │                        │  │
│  │  ┌──────────────────┐  │  │  ● General 3/3│  │                        │  │
│  │  │○ Breeding Tomato │  │  │  ● Contrib 5/8│  │                        │  │
│  │  │  ████░░░░░ 25%   │  │  │  ● Geo     3/3│  │                        │  │
│  │  └──────────────────┘  │  │  ○ Evidence 2/4│  │                        │  │
│  │                        │  │  ○ Type    6/10│  │                        │  │
│  │  Result: R-2026-0142   │  │              │  │                        │  │
│  │  Status: ● Editing     │  │              │  │                        │  │
│  └────────────────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Progress ring: SVG circle, 80px diameter, 8px stroke. Track: #EEEEEE. Fill: gradient amber→green.
- SP badges: pill shape, 4px border-radius. Primary: filled blue bg, white text. Secondary: outlined gray.
- Section progress: compact 12px font, micro progress bars (60px wide, 4px tall).

### Accordion Headers

```
COLLAPSED:
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋  GENERAL INFORMATION              ● Complete      3/3 fields   ▓▓▓▓▓▓  │
└─────────────────────────────────────────────────────────────────────────────┘

EXPANDED:
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋  GENERAL INFORMATION              ● Complete      3/3 fields   ▓▓▓▓▓▓  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Title *                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Improved wheat varieties for climate resilience                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  Description *                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ This result documents the development and initial testing of...     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ─── Additional fields ───                                                  │
│  ≫ Show lead contact person, impact areas, KRS status                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Header: #F5F5F5 bg, 1px bottom border #EEEEEE.
- Expanded: white bg, left 3px accent border #1565C0.
- Completion dot: 8px circle (green=complete, amber=partial, gray=empty).
- "Show all fields" link: #1565C0, underline on hover.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|---|---|---|
| `programCode` ↔ `official_code` data alignment | High — SP selector breaks | Guaranteed match per user confirmation. Verify with sample data in dev. |
| Large result detail forms slow to PATCH | Medium — auto-save UX degrades | Only send changed fields (partial PATCH). 800ms debounce prevents spam. |
| rd-* component wrappers diverge from originals | Medium — maintenance burden | Thin wrappers only. Upstream fixes still apply. Document delta. |
| localStorage quota / clearing | Low — expandable state lost | Fallback to defaults (Section 1 open). No data loss. |
| September deadline vs. scope | High — Phase 1 is hard requirement | AI route (Phase 3) is aspirational. Manual route is the deliverable. |

## Migration Plan

**Backend:** New endpoint + validation changes. No schema migration (uses existing `clarisa_project_mappings` table). Deploy with server build.

**Frontend:** New module under `pages/bilateral/`. No changes to existing components. Deploy with client build. Rollback = revert commit.

## Open Questions

| # | Question | Status | Impact |
|---|---|---|---|
| 1 | Does the existing `PATCH /api/results/:id` handle all bilateral MDS fields, or are some fields write-once? | Open — needs verification | Affects auto-save scope |
| 2 | Should the bilateral project list include inactive projects (is_active=0)? | Open — default to active only | Affects dropdown options |
| 3 | What is the exact MDS field list per result type for the frontend tracker? | Resolved — see spec §2.3.1 | Drives BilateralMdsTrackerService config |
