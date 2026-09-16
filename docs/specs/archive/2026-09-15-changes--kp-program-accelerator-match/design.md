# Module Spec — KP Program Accelerator Match & Highlighting (`design.md`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-program-accelerator-match` |
| Design Path | `docs/specs/changes/kp-program-accelerator-match/design.md` |
| Slug | `kp-program-accelerator-match` |
| Type | Change |
| Approval Mode | gated |
| Parent Spec | none |
| Depends on | archived `docs/specs/archive/2026-09-14-changes--kp-multi-repository-browse` (`KPM`) |
| Parallel-safe | yes — scoped to DSpace discovery proxy and `app-kp-cgspace-browse` |
| Author | Juan Cadavid + Antigravity (AKILI T1) |
| Date | 2026-09-15 |
| Status | proposed |

Constitution cited: `docs/prd.md` persona *Result submitter*, `G1` (`M1.3`) · `docs/ux-ui/design.md` §5 SP navigation, §7 brand tokens, §8 components · `docs/trd/trd.md` Integrations (DSpace Discovery proxy for CGSpace, MELSpace, WorldFish).

---

## 2. Summary

This design specifies the architectural implementation of Science Program / Accelerator recognition in the Knowledge Product repository search. It extracts `cg.contributor.programAccelerator` metadata from DSpace HAL items in the backend proxy, propagates active program context from host forms (`lab-report-form`) to `app-kp-cgspace-browse`, renders a high-craft visual badge on matching publications, soft-promotes matching cards to the top of the search results, and offers an inline non-restrictive toggle between "All results" and "Matches only".

Crucially, this design honors the product directive that **results must not be restricted or hidden**: all search hits from the knowledge repositories remain accessible and eligible for reporting.

---

## 3. Architecture Overview

### 3.1 Where this lives in the system

- **Server modules:**
  - `src/api/results/results-knowledge-products/cgspace-discovery/dto/cgspace-item.dto.ts`
  - `src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.ts`
  - `src/api/results/results-knowledge-products/cgspace-discovery/repositories.config.ts`
- **Client modules:**
  - `src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.{ts,html,scss}`
  - `src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.{ts,html}`
  - `src/app/pages/results/pages/result-creator/components/report-result-form/report-result-form.component.{ts,html}`

### 3.2 Sequence / interaction flow

```text
[User opens Report Result drawer under SP01]
  │
  ├── [lab-report-form] passes programCode="SP01" and programName="Sustainable Farming"
  │     │
  │     ▼
  ├── [app-kp-cgspace-browse] triggers search via ResultsApiService.GET_CgspaceDiscoverySearch
  │     │
  │     ▼
  ├── [Server: CgspaceDiscoveryController & Service]
  │     ├── Fan-out query to CGSpace, MELSpace, WorldFish
  │     ├── CgspaceDiscoveryMapper.toItem extracts metadata['cg.contributor.programAccelerator']
  │     │     └── Maps to item.programAccelerators: ["Sustainable Farming"]
  │     ├── Multi-source merge & deduplication (KPM-DD-4) preserves programAccelerators
  │     └── Emits CgspaceMergedSearchPageDto with enriched items
  │     │
  │     ▼
  └── [Client: KpCgspaceBrowseComponent]
        ├── Evaluates matches: normalized programAccelerators vs activeProgram
        ├── Soft-ranks matching items to top of list
        ├── Updates counter: "Showing 15 results (4 match Sustainable Farming)"
        └── Renders [✨ Matches Sustainable Farming] badge + border accent on matching cards
```

---

## 4. Data Model Changes

### 4.1 Entities & Database Migrations
- **None required.** This feature operates exclusively on live DSpace Discovery-API responses returned by CGIAR repositories. No database schema changes or migrations are needed.

### 4.2 DTO Changes (Server)

In `src/api/results/results-knowledge-products/cgspace-discovery/dto/cgspace-item.dto.ts`:
- Add `@ApiPropertyOptional({ type: [String], description: 'Science Programs or Accelerators tagged on the item' })`
- `programAccelerators?: string[];` to `CgspaceItemDto`.

---

## 5. API Surface & Payload Contract

### 5.1 Endpoint `GET /api/results/knowledge-products/cgspace/search`
- **Method & Path:** `GET /api/results/knowledge-products/cgspace/search` (unchanged endpoint).
- **Contract Impact:** Strictly **additive**.
- **Payload difference:** Each object in `items[]` gains an optional field `programAccelerators?: string[]`.
  - Example before: `{ "uuid": "...", "title": "Maize agronomy", "repository": "cgspace", ... }`
  - Example after: `{ "uuid": "...", "title": "Maize agronomy", "repository": "cgspace", "programAccelerators": ["Sustainable Farming"], ... }`

---

## 6. Server Workflow / Business Rules

### 6.1 Metadata Extraction in `CgspaceDiscoveryMapper`
- `toItem(objectNode: any, adapter: RepositoryAdapter)`:
  - Reads `metadata['cg.contributor.programAccelerator']`.
  - Extracts every element's `.value` string, trimming whitespace and filtering out falsy entries.
  - Defaults to `[]` when metadata key is absent (e.g. repositories without this field).
  - Preserves array order without mutating other metadata mappings.

### 6.2 Multi-source deduplication retention
- In `merge.ts` (multi-repository merger):
  - When primary item survives deduplication against secondary duplicates, `programAccelerators` from both survivor and duplicates are unioned and de-duplicated to ensure tags are not lost if a secondary repository tagged the item.

---

## 7. Frontend Architecture

### 7.1 Component Interface Extensions (`KpCgspaceBrowseComponent`)

```typescript
// Conceptual interface extension — no implementation code
inputs:
  programCode: input<string>(''); // e.g. "SP01"
  programName: input<string>(''); // e.g. "Sustainable Farming"
```

### 7.2 Matching Logic & Normalization
- A helper function `matchesProgram(item: CgspaceItemDto, code: string, name: string): boolean`:
  1. Normalizes `code` and `name` (lowercased, trimmed).
  2. Normalizes each entry in `item.programAccelerators`.
  3. Returns `true` if:
     - Any accelerator string equals normalized name or code; OR
     - Any accelerator string contains the program code (e.g. `"SP01"`) or program name (e.g. `"Sustainable Farming"`); OR
     - The program name contains the accelerator string.

### 7.3 Soft-Sorting Algorithm
- `sortedItems = computed(() => { ... })`:
  - When quick toggle is in default `"all"` mode:
    - Partition items into `matches` and `others`.
    - Returns `[...matches, ...others]`.
  - When quick toggle is in `"matches-only"` mode:
    - Returns `matches`.

### 7.4 Visual Design & Styling (UI/UX)
- **Badge:**
  - Placed immediately beside the repository badge in `.flex.flex-wrap.items-center.gap-1.5`.
  - Styling: `bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 text-[11px] font-semibold flex items-center gap-1`.
  - Icon: `pi pi-sparkles` (or `pi pi-check`) with text `Matches <ProgramName>`.
- **Card Accent:**
  - Matching card container receives `border-l-4 border-l-[var(--pr-color-primary-300)]` providing an unmistakable visual distinction while scanning.
- **Counter & Quick Toggle Chip:**
  - When `matchCount > 0`:
    - Counter text: `Showing N results (M match <ProgramName>)`.
    - Chip beside counter: `<button>` with `[class.bg-violet-100]="filterOnlyMatches()"`.
    - Clicking toggles `filterOnlyMatches.update(v => !v)`.

### 7.5 Host Integration (`lab-report-form.component.html`)
- Pass `[programCode]="programCode()"` and `[programName]="resolvedProgramName()"`.
- `resolvedProgramName()` resolves from `api.dataControlSE.mySPsList()` or `tocNode()?.official_code` fallback.

---

## 8. Sizing & Tripwire Budget

- **Expected Tasks:** 4 tasks (T1: Server mapping, T2: Client component matching/badge/sort, T3: Host integration, T4: Verification suite).
- **Expected Net LOC:** ~250 LOC net.
- **Expected Review Rounds:** 1 round.
- **Budget Tripwire:** If execution exceeds 6 tasks or +400 net LOC, stop and escalate.

---

## 9. Reversion Challenge

- **Check:** Does this design remove, disable, or invert any existing behavior?
- **Answer:** **No.** All existing multi-source repository searches, pagination, deduplication, and manual entry flows are preserved intact. All items continue to be displayed by default.

---

## 10. Design Decisions (ADRs)

### `KPAM-DD-1` — Client-side Non-restrictive Soft Sort & Badge over Backend Solr Filter
- **Context:** The user instructed: *"tal vez no filtrar la informacion pero si mostrar que hacen parte del mismo SP - no deberiamos restringir"*.
- **Decision:** Do not add a Solr facet query for `programAccelerator`. Return all search hits, extract the metadata, and perform non-restrictive visual badging and soft-ranking on the client.
- **Alternatives considered:**
  1. *Backend Solr filter:* Rejected because it hides un-tagged or cross-program publications that submitters may validly report.
  2. *Badge only with no sorting:* Rejected because matching items on subsequent pages would be missed.
- **Consequences:** Submitters immediately see their own program's papers first without losing access to any repository papers.

### `KPAM-DD-2` — Flexible Substring and Acronym Normalization
- **Context:** DSpace metadata entries may be tagged as `"Sustainable Farming"`, `"SP01 - Sustainable Farming"`, or with inconsistent capitalization/spacing.
- **Decision:** Implement a resilient normalizer comparing case-insensitive trimmed strings against both the code (`SP01`) and the descriptive name (`Sustainable Farming`).
- **Alternatives considered:**
  1. *Strict equality:* Rejected due to high risk of false negatives when DSpace metadata includes code prefixes.
- **Consequences:** Eliminates match false negatives (`Defect Gate D2`).

### `KPAM-DD-3` — Additive Contract on `CgspaceItemDto`
- **Context:** Existing consumers of `CgspaceItemDto` must not break.
- **Decision:** Declare `programAccelerators?: string[]` as optional on both server and client interfaces.
- **Consequences:** 100% backwards-compatible.

### `KPAM-DD-4` — Default "All Results" State with 1-Click Toggle
- **Context:** Users should never feel trapped in a filtered view or miss relevant papers.
- **Decision:** Default view displays all results (with matches soft-boosted to the top), while providing an explicit toggle chip in the counter bar to narrow down to matches only if desired.
- **Consequences:** Maximum transparency and freedom for the submitter.

---

## 11. Required Cross-References

- `docs/specs/changes/kp-program-accelerator-match/requirements.md`
- `docs/prd.md`: Goal `G1` (Result creation), `US-S1`.
- `docs/ux-ui/design.md`: §5 SP navigation, §7 brand tokens, §8 components.
- `docs/trd/trd.md`: §Integrations (DSpace Discovery proxy).
