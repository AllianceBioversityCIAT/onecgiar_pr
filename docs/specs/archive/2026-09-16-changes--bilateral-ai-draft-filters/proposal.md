# Proposal — Bilateral AI Draft Results: Search & Filter Toolbar

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-ai-draft-filters` |
| Slug | `bilateral-ai-draft-filters` — derived from free-text argument (user sentence + screenshot; no slug token provided) |
| Type | Change |
| Approval Mode | gated (default — no explicit end-to-end mandate given) |
| Parent Spec | none |
| Author input | Free text (ES): improve filters on AI Draft Results screen; add **Created by** and a **search bar**; screenshot `orca-paste-1789588197166-abf78da3-5cc5-4cc3-9ea0-db70a4462084.png` (AfricaRice, **AI Draft Results** tab) |
| Date | 2026-09-16 |
| Related shipped work | `712fea2f7` — bilateral **Results** tab (`bilateral-results-list`) already has search + Created by; **out of scope here** |

## 2. Intent

Upgrade the **AI Draft Results** tab (`/bilateral/:centerAcronym/drafts`) from a single **Project** dropdown to a modern filter toolbar with a **list-level search bar**, a **Created by** multiselect, and room for additional draft-specific facets — aligned with Programme Results and the bilateral Results tab the team just shipped.

## 3. Problem / Current Behavior

The **AI Draft Results** tab (`my-draft-results`) lists AI-generated draft suggestions grouped by extraction session. Today the docked toolbar exposes **only one filter dimension**:

| Today | Detail |
|---|---|
| **Project** | Single-select dropdown (`draft.job.project_id`), P2-3319 |
| **Search** | Only inside the project dropdown when there are >5 projects — **not** a global list search |
| **Created by** | Shown per card as a badge (`Created by you` / colleague name) but **not filterable** |
| **Other facets** | Category, result level (Output/Outcome), program/initiative appear on cards but have no toolbar controls |

The original design mockup (`.design-snapshots/PRMS-Reporting.dc.html:1101-1140`, noted in `my-draft-results/CLAUDE.md`) included a **search box** that was never built. Users with many drafts across projects and colleagues cannot quickly narrow the list by title, creator, or category without scanning the full card stack.

**Not this screen:** The bilateral **Results** tab (`bilateral-results-list`) was recently enhanced with pagination, Created by column/filter, and search — that work does not apply to the Drafts tab, which uses a card layout and a different data source (`GET /api/bilateral/center/ai/drafts` via `BilateralAiService`).

## 4. Proposed Outcome

A docked toolbar directly under the tab header that lets center staff find drafts quickly:

1. **Search bar** — free-text filter across draft title, indicator/category label, project name/code, and creator display name (client-side, debounced).
2. **Created by** — multiselect built from creators present in the loaded draft list (`draft.job.user_id` / `job.user`), including a **Me** shortcut when the current user appears.
3. **Project** — retain existing single-select behavior (optionally refactor into the shared toolbar row for visual parity).
4. **Filter chips + Clear all** — active dimensions visible with per-chip removal; distinct empty states for “no drafts yet” vs “filters hid everything”.
5. **Optional v1 extras** (confirm in `/akili-specify`): **Category** and **Result level** (Output/Outcome) multiselects — data already on each draft payload.

Filtering stays **client-side** over `BilateralAiService.draftList()` (same as today’s project filter). No new API contract required for v1.

## 5. Scope

- `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.{html,ts,scss}`
- `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/services/my-draft-results-filter.service.ts` (+ spec)
- `my-draft-results.component.spec.ts` — filter + search + empty-state coverage
- Reuse patterns from:
  - `programme-results-filter.service.ts` (multi-dimension pure predicates)
  - `bilateral-results-list` toolbar (search + Created by multiselect UX, read-only reference)
  - Existing creator resolution logic already in `my-draft-results.component.ts` (`jobUser`, `creatorName`, `isCurrentUser`)

## 6. Non-Goals

- Bulk select / multi-draft actions (explicitly out of scope per P2-3319 notes)
- Per-card kebab menu or source-document link from the old mockup
- Changes to **bilateral Results** tab (`bilateral-results-list`) — already shipped separately
- Server-side search or pagination of drafts (list size is center-scoped; client filter is sufficient for v1)
- URL query-param persistence (nice-to-have; defer unless `/akili-specify` confirms parity requirement)
- Promote/discard/review flows — list filtering only

## 7. Affected Users, Systems, And Specs

| Actor | Impact |
|---|---|
| **Center reporters / AI draft reviewers** | Can find drafts by title, creator, or project without scrolling |
| **BilateralAiService** | Read-only consumer of existing `draftList()` |
| **MyDraftResultsFilterService** | Extended from 1 → N dimensions |

**Related specs (reference, not edited):**

- `docs/specs/result-framework-reporting/programme-results-created-by-filter/` — Created by filter precedent (Programme Results)
- Recent bilateral Results list work (commit `712fea2f7`) — UX parity target for search + Created by

## 8. Visual Reference

- **Source:** User screenshot (temp paste) + in-repo mockup gap documented in `my-draft-results/CLAUDE.md`
- **Location:** Screenshot path at propose time: `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1789588197166-abf78da3-5cc5-4cc3-9ea0-db70a4462084.png` (not committed — `/akili-specify` should copy or re-attach if needed)
- **Target pattern:** Programme Results / bilateral Results toolbar — search input left, facet dropdowns, chips row below
- **Notes:** No Figma link provided. Optional Stitch mockup during `/akili-specify` if toolbar layout needs sign-off; otherwise mirror existing RC/Programme Results components.

## 9. Requirement Delta Preview

### ADDED Requirements

- List-level **search bar** filtering drafts by title, category, project label, and creator name (case-insensitive substring)
- **Created by** multiselect filter with options derived from loaded drafts; **Me** option when applicable
- **Active filter chips** with per-dimension removal and **Clear all**
- Filtered-empty state copy when `allDrafts().length > 0` but `drafts().length === 0` (extend existing `isFilteredEmpty()`)

### MODIFIED Requirements

- **Project filter** moves into a unified toolbar row (behavior unchanged: single-select, options from drafts on screen)
- **MyDraftResultsFilterService** supports multiple dimensions (`searchQuery`, `createdBy`, `project`, optional `category`, `resultLevel`) with pure predicate functions per dimension

### REMOVED Requirements

- None — project filter remains; dropdown-internal project search may be simplified once global search exists (implementation detail for `/akili-specify`)

## 10. Approach Options

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **A — Extend filter service + toolbar in place** | Add signals/predicates to `MyDraftResultsFilterService`; rebuild docked bar with search + Created by + project; chips row | Smallest diff; matches P2-3319 extension notes; no new routes | Component HTML grows — may want a child `my-draft-results-filters` component |
| **B — Extract shared bilateral filter shell** | New shared component abstracting Results + Drafts toolbars | Long-term DRY | Over-scoped for one tab; Results and Drafts data shapes differ |
| **C — Server-side query params** | New API filters on `GET …/drafts` | Scales to huge lists | Unnecessary for center-scoped draft counts; backend work + latency |

## 11. Recommended Approach

**Option A** — extend `MyDraftResultsFilterService` following the programme-results pattern (pure state + pure predicates, `provided` on the component only), and add a dedicated filter toolbar section (inline or small child component) with:

- Debounced search signal (~300ms)
- Created by options computed from `draftList()` using the same user-resolution rules already in the component (avoid duplicating name/email logic — extract a small pure helper if needed)
- Reuse `app-pr-filter-select` or bilateral Results multiselect markup for Created by where it fits

This is the smallest safe path: no API change, preserves center-scoped filter lifecycle, and closes the mockup gap the module guide already flags.

## 12. Risks, Dependencies, And Open Questions

| Risk / question | Notes |
|---|---|
| **Creator option labels** | `job.user` may be partial; component already resolves names via `resolvedUserNames()` — filter options must use the same display rules as card badges |
| **TypeORM id typing** | `user_id` / `project_id` may arrive as strings — keep `normalizeProjectId`-style helpers for creator ids |
| **Filter service scope** | Must stay component-scoped, not `providedIn: 'root'` (existing trap in CLAUDE.md) |
| **OQ-1:** URL persistence? | Should draft filters sync to query params like bilateral Results? Default: **no** for v1 unless user asks |
| **OQ-2:** v1 facet set | Confirm whether **Category** and **Result level** ship in v1 or phase 2 |
| **OQ-3:** Created by multiselect vs single | Programme Results uses multiselect — recommend same; confirm with user |
| **OQ-4:** Jira ticket | User did not cite a ticket — capture ID in `/akili-specify` if one exists |

## 13. Success Criteria

- User can type in a search bar and see the draft card list narrow live (title/category/project/creator).
- User can filter by one or more creators; **Me** works when logged-in user created sessions.
- Project filter continues to work; combined filters apply as AND semantics.
- Active filters show as removable chips; **Clear all** restores full list.
- Empty states correctly distinguish zero drafts vs over-filtered list.
- Scoped unit tests pass for filter service predicates and component toolbar behavior.

## 14. Next Step

After approval:

```text
/akili-specify changes/bilateral-ai-draft-filters
```

---

*AKILI-SPECS · Juan Carlos Cadavid · [jcadavid.com](https://jcadavid.com)*
