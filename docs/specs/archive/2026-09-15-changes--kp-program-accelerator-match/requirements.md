# Module Spec — KP Program Accelerator Match & Highlighting (`requirements.md`)

## 1. Module / Feature

- **Module:** `results` / `result-framework-reporting`
- **Sub-feature:** Knowledge Product Repository Search — Science Program / Accelerator Matching & Highlighting
- **Short Code:** `KPAM`
- **Owner:** Results & Science Program Reporting
- **Status:** `in-review`
- **Type:** `Change`
- **Approval Mode:** `gated`
- **Parent Spec:** none
- **Depends on:** archived `docs/specs/archive/2026-09-14-changes--kp-multi-repository-browse` (Module code `KPM`)
- **Parallel-safe:** yes — scoped to DSpace discovery mapper and `app-kp-cgspace-browse` component

---

## 2. Context

When submitting or creating a Knowledge Product result from within a Science Program (SP) context (such as `SP01` / "Sustainable Farming"), submitters query CGIAR repositories (CGSpace, MELSpace, WorldFish) through the discovery search component (`app-kp-cgspace-browse`).

In DSpace 7, publications are tagged with metadata field `cg.contributor.programAccelerator`:
```json
"cg.contributor.programAccelerator": [
  {
    "value": "Sustainable Farming",
    "language": null,
    "authority": null,
    "confidence": -1,
    "place": 0
  }
]
```

Currently, the PRMS discovery proxy (`cgspace-discovery.mapper.ts`) drops this field, preventing the UI from recognizing publications contributed under the active Science Program. Furthermore, a hard backend filter would be counterproductive and harmful because it would restrict and hide relevant cross-cutting or un-tagged publications.

This specification addresses this gap: it enriches the discovery proxy to capture `programAccelerators`, propagates the active Science Program context into the browse component, visually badges matching publications, soft-prioritizes them in the results list, and provides an optional quick toggle without restricting search results.

Constitutional alignment:
- `docs/prd.md`: Persona *Result submitter*, `G1` (`M1.3` — reduce time-to-submit and friction in finding publications).
- `docs/ux-ui/design.md`: §5 SP navigation, §7 status & brand tokens (`--pr-color-primary-300`), §8 components.
- `docs/trd/trd.md`: §Integrations — DSpace Discovery proxy (CGSpace, MELSpace, WorldFish).

---

## 3. In Scope / Out of Scope

### In scope

- **Server-side metadata extraction:** Parse all values of `cg.contributor.programAccelerator` from DSpace item metadata in `CgspaceDiscoveryMapper` and expose them as `programAccelerators?: string[]` on `CgspaceItemDto`.
- **Client component context binding:** Support `activeProgram` (or `programCode` and `programName`) inputs on `KpCgspaceBrowseComponent` and forward them from `lab-report-form` and related hosts.
- **Resilient string matching:** Match `item.programAccelerators` against the active program name, short name, and code, normalized for case and whitespace.
- **Visual match badge:** Render a distinct brand badge (`[✨ Program Match: <Program Name>]`) and subtle card styling on matching cards.
- **Soft ranking & quick toggle:** Soft-promote matching items to the top of the search results list, update the results counter with the match summary, and provide an optional toggle chip (`All` vs `Matches only`) defaulting to **All**.
- **Comprehensive test suite:** Unit tests covering server mapping, matching logic, non-restriction behavior, sorting, and host input propagation.

### Out of scope

- Hard-filtering upstream Solr discovery queries with `programAccelerator` facets (explicit non-goal to avoid excluding un-tagged publications).
- Altering MQAP handle validation or metadata fetching pipelines.
- Editing or pushing metadata updates back into CGSpace, MELSpace, or WorldFish.
- Touching other result types (Policy Change, Innovation Use, etc.).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| **Result submitter** | Can immediately spot publications belonging to their Science Program via prominent badges, without having to inspect external links or worry that un-tagged publications are hidden. |
| **Science Program Lead / PMU** | Increased accuracy and faster reporting of Science Program publications toward indicator targets. |
| **QA reviewer** | Reduced misattributions of publications to incorrect Science Programs. |

---

## 5. User Stories

- **`KPAM-US-1`** — As a **result submitter**, I want search results in the Knowledge Product repository browser to clearly indicate which publications match my active Science Program, so that I can quickly select relevant papers for my indicator report.
- **`KPAM-US-2`** — As a **result submitter**, I want the repository search to remain unrestricted and show all matching publications, so that I can still report cross-cutting or un-tagged publications when needed.
- **`KPAM-US-3`** — As a **result submitter**, I want publications matching my Science Program to be elevated to the top of the search results and optionally filterable with a single click, so that I do not have to hunt across pages.

Refines `US-S1` (Result creation from repository handle) in `docs/prd.md`.

---

## 6. Functional Requirements

### Required (MUST)

- **`KPAM-R-1` (Server Metadata Extraction):** The discovery mapper `CgspaceDiscoveryMapper.toItem` MUST extract all string values from `cg.contributor.programAccelerator` into `CgspaceItemDto.programAccelerators: string[]`. If the field is missing or empty, it MUST default to `[]`.
- **`KPAM-R-2` (Active Program Input):** `KpCgspaceBrowseComponent` MUST accept the active Science Program context (including `programCode` and `programName`). The host container (`lab-report-form`) MUST supply these values.
- **`KPAM-R-3` (Normalized Matching Logic):** The browse component MUST evaluate whether an item belongs to the active Science Program by comparing each entry in `item.programAccelerators` against the active program name, short name, and code. The comparison MUST be case-insensitive, trimmed, and match partial or full program names (e.g. `"Sustainable Farming"` matching `"SP02 - Sustainable Farming"`).
- **`KPAM-R-4` (Visual Badge & Accent):** When an item matches the active Science Program, the card in `KpCgspaceBrowseComponent` MUST render a dedicated badge in the badge row displaying the program match (e.g. `[✨ Sustainable Farming]`) using brand violet tokens (`bg-violet-50 text-violet-700 border-violet-200`) and a subtle left border accent (`border-l-4 border-l-[var(--pr-color-primary-300)]`).
- **`KPAM-R-5` (Non-Restriction Guarantee):** The system MUST NOT exclude or hide non-matching publications from the search results by default. All items returned by the repositories MUST remain available for selection.
- **`KPAM-R-6` (Soft Ranking Boost):** When results are displayed in the default view, items matching the active Science Program MUST be ranked before non-matching items, preserving relative repository sort order within each subgroup.
- **`KPAM-R-7` (Match Counter & Quick Toggle):** When one or more matching items exist, the results counter MUST display the match breakdown (e.g. *"Showing 15 results (4 match Sustainable Farming)"*) and MUST provide an inline toggle chip to switch between "All results" (default) and "Matches only".

---

## 7. Defect Gates & Verification Strategy

| Defect Class | Risk | Verification Command / Gate | Substitute (if no automated check) |
|---|---|---|---|
| **D1: Metadata Ingestion & Mapping Failure** | DSpace search HAL objects containing `cg.contributor.programAccelerator` are dropped or misparsed. | Server Jest: `npx jest src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.spec.ts` | — |
| **D2: String Normalization False Negatives** | Variations in naming (e.g., `"Sustainable Farming"`, `"SP01 - Sustainable Farming"`, trailing spaces) fail to match. | Client Jest: `npx jest src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.spec.ts` | Test matrix covering 6 naming variations. |
| **D3: Over-Restriction / Item Exclusion** | Non-matching items are accidentally filtered out, violating the non-restriction rule. | Client Jest: Asserting `items().length === total()` and all items present when filter toggle is in default "All" state. | — |
| **D4: Visual Rendering & Badge Overlap** | Badge overlaps title or breaks responsive wrapping at 768px. | Client Jest DOM assertions (`.kp-sp-match-badge`) + manual browser inspection of indicator drawer. | Visual inspection at HITL pause. |
| **D5: Multi-Repository Fan-out Regression** | New field breaks multi-source merging or dedup survivor rule (`KPM-DD-4`). | Server Jest: `npx jest src/api/results/results-knowledge-products/cgspace-discovery/` | — |
| **D6: Host Input Starvation** | `lab-report-form` fails to pass program code/name to browse component. | Client Jest: `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts` | — |

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | In-memory soft-sorting and match detection MUST take < 2ms for 50 items. |
| **Backwards Compatibility** | `programAccelerators` MUST be optional on `CgspaceItemDto` so existing mock fixtures or cached responses without it continue to work seamlessly. |
| **Accessibility** | The match badge MUST have `aria-label="Matches current Science Program: <Program Name>"`. The toggle chip MUST have `aria-pressed`. |
| **Design System** | Badge styling MUST use existing PRMS tokens (`var(--pr-color-primary-*)`, `bg-violet-50`, `text-violet-700`, `border-violet-200`). |

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| **`KPAM-AC-1`** | A DSpace item with `"cg.contributor.programAccelerator": [{"value": "Sustainable Farming"}]` | `CgspaceDiscoveryMapper.toItem` is called | The returned `CgspaceItemDto.programAccelerators` contains `['Sustainable Farming']`. |
| **`KPAM-AC-2`** | A search returns 5 items, where 2 have `programAccelerators: ['Sustainable Farming']` and 3 have no accelerator metadata, under active program `"Sustainable Farming"` | The browse component renders the results | All 5 items are visible in the list (no exclusion), and the 2 matching items render the `[✨ Matches Sustainable Farming]` badge. |
| **`KPAM-AC-3`** | Results containing both matching and non-matching items | Default search results are rendered | Matching items appear at the top of the list before non-matching items. |
| **`KPAM-AC-4`** | Active program has code `"SP01"` and name `"Sustainable Farming"`; an item has metadata `"SP01 - Sustainable Farming"` | Match detection executes | Item is recognized as a match (flexible normalization). |
| **`KPAM-AC-5`** | 10 items returned with 3 matching the active program | Results state is rendered | Counter displays *"Showing 10 results (3 match <Program Name>)"* and renders the quick toggle chip. |
| **`KPAM-AC-6`** | The quick toggle chip is clicked to filter matches only | Submitter activates the toggle | Only the 3 matching items are displayed, and clicking it again restores all 10 items. |
| **`KPAM-AC-7`** | An item from MELSpace or WorldFish with no `cg.contributor.programAccelerator` metadata | Item is mapped and rendered | Item is treated as non-matching without errors or broken UI. |

---

## 10. Dependencies & Assumptions

### Upstream dependencies
- Upstream DSpace 7 metadata schema in CGSpace exposing `cg.contributor.programAccelerator`.
- CLARISA Initiatives / Science Programs catalog providing program code and names (`SP01` ... `SP09`, `SGP`).

### Assumptions
- Upstream CGSpace provides consistent English values for program accelerator names matching CGIAR official Science Program nomenclature.
- In cases where a publication lists multiple program accelerators, an item is considered a match if at least one matches the active Science Program.

---

## 11. Open Questions

- **`KPAM-OQ-1` (Resolved):** Should non-matching items be hidden? **No.** User explicitly required: *"tal vez no filtrar la informacion pero si mostrar que hacen parte del mismo SP - no deberiamos restringir"*. All items remain visible, with soft ranking and an optional toggle.

---

## Required cross-references

- `docs/prd.md`: Goal `G1` (Result creation and submission), Story `US-S1`.
- `docs/ux-ui/design.md`: §5 Science Program navigation, §7 brand tokens, §8 card components.
- `docs/trd/trd.md`: §Integrations (DSpace Discovery proxy).
- `docs/specs/archive/2026-09-14-changes--kp-multi-repository-browse`: Base multi-repository architecture.
