# Proposal: KP Program Accelerator Match & Highlighting

**One line:** Extract and match `cg.contributor.programAccelerator` metadata from CGIAR knowledge repositories to visibly badge and prioritize publications belonging to the active Science Program/Accelerator without restricting or hiding other search results.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-program-accelerator-match` |
| Proposal Path | `docs/specs/changes/kp-program-accelerator-match/proposal.md` |
| Slug | `kp-program-accelerator-match` — derived from free-text user request (match `cg.contributor.programAccelerator` with active SP in KP search) |
| Type | Change |
| Approval Mode | gated |
| Parent Spec | none |
| Depends on | archived `docs/specs/archive/2026-09-14-changes--kp-multi-repository-browse` |
| Parallel-safe | yes — scoped to DSpace discovery mapper and `app-kp-cgspace-browse` component |
| Author | Juan Cadavid + Antigravity (AKILI T1) |
| Date | 2026-09-15 |
| Status | proposed |

Constitution cited: `docs/prd.md` persona *Result submitter*, `G1` (`M1.3` — reduce time-to-submit and search friction) · `docs/ux-ui/design.md` §7 brand and status tokens, §8 components · `docs/trd/trd.md` Integrations (DSpace Discovery proxy for CGSpace, MELSpace, WorldFish).

---

## 2. Intent

When submitting or creating a Knowledge Product result from within a Science Program (SP) context (e.g. `SP01` / "Sustainable Farming"), submitters searching CGIAR repositories (CGSpace, MELSpace, WorldFish) need to immediately identify which publications are already affiliated with and contributed to their Science Program. 

Rather than restricting the query (which would exclude relevant cross-cutting or un-tagged publications), the system should detect matching `cg.contributor.programAccelerator` metadata, highlight matching cards with a dedicated SP badge, soft-boost them in relevance, and provide an optional quick toggle so users can easily see their program's outputs while retaining full access to all publications.

---

## 3. Problem / Current Behavior

1. **Ignored Metadata in Discovery Proxy:** DSpace repositories tag CGIAR publications with metadata such as:
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
   However, `CgspaceDiscoveryMapper.toItem` in `onecgiar-pr-server` currently maps only title, type, year, authors, affiliations, countries, DOI, URI, repository, and alsoIn. The `programAccelerator` field is completely omitted from `CgspaceItemDto`.
2. **Missing Program Context in Browse Component:** `KpCgspaceBrowseComponent` on the client receives repository items with no information about whether an item was authored/contributed under the user's active Science Program.
3. **Submitter Friction:** In indicators with high publication volumes, submitters cannot easily tell which search hits belong to their own program without opening each publication's external repository link.
4. **Risk of Over-Filtering:** A hard backend Solr filter on `cg.contributor.programAccelerator` would prematurely hide valuable publications that haven't been tagged yet by librarians or that span across initiatives.

---

## 4. Proposed Outcome

1. **Server Enrichment:** `CgspaceItemDto` and `CgspaceDiscoveryMapper` in `onecgiar-pr-server` extract and expose `programAccelerators: string[]` from `cg.contributor.programAccelerator`.
2. **Client Context Awareness:** `app-kp-cgspace-browse` receives the active Science Program code and name (e.g. `code: 'SP01', name: 'Sustainable Farming'`) from its host containers (`lab-report-form`, `report-result-form`, `aow-hlo-create-modal`, etc.).
3. **Visual Match Badge & Accent:** Items matching the active Science Program display a prominent badge (e.g., `[✨ Sustainable Farming]` or `[✨ Program Match: Sustainable Farming]`) using the primary brand token (`--pr-color-primary-300`) with a subtle left card accent.
4. **Soft Sorting / Non-Restrictive Filtering:** 
   - Matching items are soft-promoted to the top of the search results list.
   - The result counter indicates match count: e.g., *"Showing 18 results (4 match Sustainable Farming)"*.
   - An optional non-restrictive toggle or chip allows the user to filter down to only SP matches or view all results (default: **all results**).

---

## 5. Scope

- **Backend (`onecgiar-pr-server`):**
  - Update `CgspaceItemDto` to include `programAccelerators?: string[]`.
  - Update `RepositoryAdapterFields` in `repositories.config.ts` to support program accelerator field mapping (defaulting to `'cg.contributor.programAccelerator'`).
  - Update `CgspaceDiscoveryMapper.toItem` to map values into `item.programAccelerators`.
  - Unit tests in `cgspace-discovery.mapper.spec.ts` and `cgspace-discovery.service.spec.ts`.
- **Frontend (`onecgiar-pr-client`):**
  - Update `CgspaceItemDto` interface in `kp-cgspace-browse.component.ts`.
  - Add input `activeProgram` or `programCode` / `programName` to `KpCgspaceBrowseComponent`.
  - Implement normalized matching logic: case-insensitive match against active program name/short name/code (e.g. "Sustainable Farming" or "SP01").
  - Render SP match badge on the card header/meta row with design-token styling.
  - Add optional soft-sort comparator prioritizing matches while preserving secondary repository sort order.
  - Pass program details from `lab-report-form.component.html` and other host views to `app-kp-cgspace-browse`.
  - Comprehensive unit tests in `kp-cgspace-browse.component.spec.ts` and `lab-report-form.component.spec.ts`.

---

## 6. Non-Goals

- Hard-filtering backend Solr queries by program accelerator (which would hide untagged or cross-program results).
- Modifying MQAP validation service or external repository ingestion schemas beyond the discovery search proxy.
- Auto-tagging or mutating DSpace metadata in upstream repositories.
- Re-architecting repository fan-out or deduplication logic established in `changes/kp-multi-repository-browse`.

---

## 7. Affected Users, Systems, And Specs

- **Primary Persona:** Result submitters reporting Knowledge Products against Science Program / Accelerator indicators.
- **Client Components:**
  - `KpCgspaceBrowseComponent` (`kp-cgspace-browse.component.{ts,html,scss}`)
  - `LabReportFormComponent` (`lab-report-form.component.{ts,html}`)
  - `AowHloCreateModalComponent` (`aow-hlo-create-modal.component.html`)
  - `ReportResultFormComponent` (`report-result-form.component.html`)
- **Server Services:**
  - `CgspaceDiscoveryMapper` (`cgspace-discovery.mapper.ts`)
  - `CgspaceItemDto` (`cgspace-item.dto.ts`)
  - `RepositoryAdapter` (`repositories.config.ts`)
- **Related Specs:**
  - Archived `changes/kp-multi-repository-browse` (preserves multi-source search and dedup contract)
  - Archived `changes/kp-cgspace-browse`

---

## 8. Visual Reference

- **Source:** User screenshot from live session (`orca-paste-1789480065281-dc1aeea0-7444-43f4-b734-281d7b303f39.png`).
- **Surface:** "Report result" drawer for a Knowledge Product indicator under `SP01` (Breeding for Tomorrow / Sustainable Farming).
- **Target Design:**
  - In each matching card's badge bar (next to `[● CGSpace]` / `[Also in MELSpace]`):
    - Render `[✨ SP Match: Sustainable Farming]` in brand violet badge (`bg-violet-50 text-violet-700 border-violet-200`).
  - Result count header:
    - `"Showing 15 results (5 match Sustainable Farming)"` with a quick toggle chip `[Only Sustainable Farming (5)]` / `[All (15)]`.

---

## 9. Requirement Delta Preview

### ADDED Requirements
- **KP-SP-1 (Metadata Extraction):** The discovery proxy shall extract all string values from `cg.contributor.programAccelerator` into `CgspaceItemDto.programAccelerators`.
- **KP-SP-2 (Match Detection):** The client browse component shall compare `item.programAccelerators` against the active Science Program's code, short name, and full name (case-insensitive, trimmed).
- **KP-SP-3 (Visual Badge):** When an item matches the active program, the card shall display a visible Program Match badge using PRMS brand tokens.
- **KP-SP-4 (Non-Restrictive Quick Filter):** When matches exist, an optional toggle chip shall allow the user to view only matching items or view all results (defaulting to all results).

### MODIFIED Requirements
- **KP-SP-5 (Card Sorting):** Search results shall sort matching items to the top of the list while maintaining relative relevance order among non-matching items.

### REMOVED Requirements
- None (fully additive).

---

## 10. Approach Options

### Option 1 (Recommended): Visual Match Badge + Soft Boost + Quick Filter Chip
- **Mechanism:** Extract `programAccelerators` on server; client matches against active SP; displays a distinct brand badge on matching cards; soft-promotes matches to top of list; shows quick toggle chip `[All results (15)]` vs `[Matches Sustainable Farming (4)]`.
- **Pros:** Completely respects the user constraint ("no deberiamos restringir pero si mostrar que hacen parte del mismo SP"); submitters immediately see their papers first; one click to filter down without losing un-tagged papers.
- **Cons:** Slightly more UI state for the optional toggle.

### Option 2: Visual Match Badge Only (No Sorting, No Toggle)
- **Mechanism:** Extract `programAccelerators`; display badge on matching cards; leave server search result order untouched.
- **Pros:** Minimal implementation.
- **Cons:** If matching papers appear on page 2 or 3, submitter still has to scroll or search specifically to find them.

### Option 3: Backend Solr Filter Facet
- **Mechanism:** Add `f.programAccelerator=<SP>,equals` to backend Solr query.
- **Pros:** Offloads filtering to DSpace Solr.
- **Cons:** **Violates user instruction:** restricts and hides any publication not formally tagged with that exact string in DSpace. Discarded per user requirement.

---

## 11. Recommended Approach

We recommend **Option 1**:
1. **Server:** Extract `cg.contributor.programAccelerator` into `item.programAccelerators: string[]`.
2. **Client Component:** `KpCgspaceBrowseComponent` receives `activeProgram` (or `programCode`/`programName`).
3. **Card Display:** Render `[✨ Matches <Program Name>]` badge in violet brand tokens.
4. **Counter & Toggle:** Display match summary in the counter (`"Showing 12 results · 4 match Sustainable Farming"`) with an inline toggle chip to switch between "All results" (default) and "Matches only".

---

## 12. Risks, Dependencies, And Open Questions

| Risk / Question | Severity | Mitigation |
|---|---|---|
| **Naming Variations:** DSpace metadata might store "Sustainable Farming", "SP02", or "SP02 - Sustainable Farming". | Low | Implement flexible matcher: normalize strings, check inclusion of code (`SP01`, `SP02`) and core program name keywords. |
| **Multi-program publications:** A publication may belong to multiple Science Programs / Accelerators. | Low | `programAccelerators` is an array; matching any value in the array satisfies the match condition. |
| **Repositories lacking this metadata:** MELSpace or WorldFish might not have `cg.contributor.programAccelerator`. | Low | Field is optional (`programAccelerators?: string[]`); if empty, card renders without badge and is treated as non-matching. |

---

## 13. Success Criteria

1. Server unit tests verify that DSpace search objects containing `cg.contributor.programAccelerator` map correctly to `item.programAccelerators: string[]`.
2. When searching for publications in the "Report result" drawer under a Science Program (e.g. Sustainable Farming), items tagged with that program display the `[✨ Matches Sustainable Farming]` badge.
3. Items not tagged with that program remain fully visible (no restriction/exclusion).
4. The user can toggle between "All results" and "Matches only" seamlessly.
5. Zero regressions in existing multi-repository search, pagination, deduplication, and manual entry.

---

## 14. Next Step

Upon approval, run:
```bash
/akili-specify docs/specs/changes/kp-program-accelerator-match
```
