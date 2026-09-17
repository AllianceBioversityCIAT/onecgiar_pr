# Bilateral AI Draft Results — Search & Filter Toolbar — `requirements.md`

## 1. Module / Feature

- **Module:** `bilateral` — AI Draft Results tab (`onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/`)
- **Sub-feature:** Draft list filter toolbar
- **Owner:** Frontend (client team)
- **Status:** shipped
- **Ticket(s):** none provided (P2-3319 precedent for project filter only)
- **Depth:** Standard (client-only; no API, migration, or auth surface)
- **Approval Mode:** gated — proposal approved by user 2026-09-16
- **Linked proposal:** `docs/specs/changes/bilateral-ai-draft-filters/proposal.md`

---

## 2. Context

The **AI Draft Results** tab lists AI-generated draft suggestions grouped by extraction session for a bilateral center (`/bilateral/:centerAcronym/drafts`). P2-3319 added a **Project** single-select filter; creator identity is rendered per card but not filterable. The original design mockup included a list-level search box that was never built (`my-draft-results/CLAUDE.md` §Pending).

The bilateral **Results** tab (`bilateral-results-list`, commit `712fea2f7`) now ships search + Created by + filter chips — a proven in-repo pattern for this product area. This spec brings the **Drafts** tab to comparable findability without changing promote/discard flows or the card layout.

This touches the bilateral listing UX pattern in `docs/ux-ui/design.md` §6 (filter strip above content) and supports bilateral reporting personas from `docs/prd.md` who must review and promote AI drafts before they become real results.

---

## 3. In Scope / Out of Scope

### In scope

- List-level **search bar** (title, category/indicator, project label, creator display name)
- **Created by** multiselect filter with **Me** shortcut when the logged-in user appears among creators
- Retain and visually unify the existing **Project** single-select filter
- **Filter chips** row with per-chip removal and **Clear all**
- Extend `MyDraftResultsFilterService` with pure predicates per dimension (AND across dimensions)
- Distinct empty states: no drafts vs filters hid everything (`isFilteredEmpty()`)
- Scoped unit tests for filter service and toolbar behavior

### Out of scope

- Bilateral **Results** tab changes (`bilateral-results-list`)
- Bulk draft selection / multi-actions
- Per-card kebab menu or source-document link from legacy mockup
- Server-side search or pagination of drafts
- **URL query-param persistence** for draft filters (v1 — session-only, component-scoped service)
- Promote, discard, review aside flows

### Conditional (SHOULD — ship if low effort during execute)

- **Category** (indicator) multiselect — options from loaded drafts' `extracted_mds.indicator`
- **Result level** (Output/Outcome) multiselect — options from `result.result_level_id`

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Center reporter | Finds their own or colleagues' drafts by name or title without scrolling |
| Center AI draft reviewer | Narrows a large draft backlog by project and creator before review/promote |
| Platform admin | Same filter set when assisting a center |

---

## 5. User Stories

- **`BADF-US-1`** — As a center reporter, I want to search drafts by title or category, so that I can locate a specific AI suggestion quickly.
- **`BADF-US-2`** — As a center reporter, I want to filter drafts by who created the AI extraction session, so that I can focus on my drafts or a colleague's.
- **`BADF-US-3`** — As any user on the Drafts tab, I want to see active filters as removable chips and clear them all at once, so that filtering behaves like Programme Results and bilateral Results.
- **`BADF-US-4`** — As a user who over-filters, I want a clear empty state when drafts exist but none match, so that I know to adjust filters rather than assume the center has no drafts.

---

## 6. Functional Requirements

### Required (MUST)

- **`BADF-R-1`** The system MUST provide a list-level search input on the Drafts toolbar, applied live (debounced ~300ms) over the loaded draft list.
- **`BADF-R-2`** Search MUST match case-insensitively against: draft title (`extracted_mds.title`), indicator/category label (`extracted_mds.indicator`), project display name/code (via `projectNameMap`), and creator display name (same rules as card badges).
- **`BADF-R-3`** The system MUST provide a **Created by** multiselect filter; empty selection means no creator filter.
- **`BADF-R-4`** Created by options MUST be derived only from creators present in the currently loaded `draftList()` — no catalogue fetch.
- **`BADF-R-5`** When the logged-in user's id appears among draft creators, the filter MUST offer a **Me** option that selects that user id.
- **`BADF-R-6`** Created by filter MUST use OR semantics within the dimension (any selected creator matches) and AND semantics across dimensions (combined with search, project, etc.).
- **`BADF-R-7`** The existing **Project** single-select filter MUST continue to work; selecting a project narrows drafts by `draft.job.project_id` with the same id-normalization rules as P2-3319.
- **`BADF-R-8`** The system MUST render active filter dimensions as chips below the toolbar, each individually removable, plus a **Clear all** action.
- **`BADF-R-9`** When `allDrafts().length > 0` and filtered `drafts().length === 0`, the system MUST show the filtered-empty state (not the "no drafts yet" state).
- **`BADF-R-10`** `MyDraftResultsFilterService` MUST remain **provided on the component only** — never `providedIn: 'root'`.
- **`BADF-R-11`** Filter state MUST NOT survive leaving the Drafts tab or switching center (existing P2-3319 contract).

### Should (SHOULD)

- **`BADF-R-12`** The toolbar SHOULD mirror bilateral Results / Programme Results placement: search left, facet controls on the same row, chips below (`brl_filter_bar` visual parity).
- **`BADF-R-13`** The system SHOULD provide a **Category** multiselect when indicator values in the loaded list form a bounded option set.
- **`BADF-R-14`** The system SHOULD provide a **Result level** multiselect (Output / Outcome labels from existing `RESULT_LEVEL_LABELS`).

### Could (MAY)

- **`BADF-R-20`** The system MAY extract a small shared pure helper for creator display name resolution if it avoids duplicating logic between card grouping and filter option building.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Client-side filtering over center-scoped draft counts MUST remain instant; debounce search to avoid re-filtering on every keystroke. |
| **Accessibility** | Search input and filter controls MUST have accessible names; focus-visible rings on interactive controls; `Escape` closes any open dropdown/popover. |
| **Backwards compatibility** | Existing project filter behavior and P2-3319 tests MUST NOT regress — extend specs, do not delete coverage. |
| **Design consistency** | Tailwind utilities referencing `--pr-*` tokens per `onecgiar-pr-client/CLAUDE.md` §5; avoid new SCSS blocks beyond existing `mdr-*` host hooks. |

### Defect coverage

| Defect class | Gate |
|---|---|
| Wrong empty state (no drafts vs filtered empty) | Unit test on `isFilteredEmpty()` + component spec |
| Creator id string/number mismatch | Unit test on `normalizeUserId` / predicate with mixed types |
| Filter survives center switch | Component provider scope + manual check at HITL |
| Search matches wrong fields | Filter service spec with fixture drafts |

---

## 8. Acceptance Scenarios

| ID | Given | When | Then |
|---|---|---|---|
| **`BADF-AC-1`** | Center has ≥1 draft | User types a substring of a draft title | Only matching draft groups/cards render |
| **`BADF-AC-2`** | Drafts from users A and B | User selects Created by = A | Only A's session groups remain |
| **`BADF-AC-3`** | User is creator of some drafts | User selects **Me** | Only current user's drafts remain |
| **`BADF-AC-4`** | Project filter active | User clicks chip remove for project | Project filter clears; list widens |
| **`BADF-AC-5`** | Filters yield zero matches | — | Filtered-empty message shown with Clear all |
| **`BADF-AC-6`** | User clicks Clear all | — | Search empty, all facet selections cleared, full list restored |

---

## 9. Open Questions (resolved for specify)

| ID | Question | Resolution |
|---|---|---|
| **`BADF-OQ-1`** | URL persistence? | **No** for v1 — filters live in component-scoped service only |
| **`BADF-OQ-2`** | Category + Result level in v1? | **SHOULD** (`BADF-R-13`, `BADF-R-14`) — implement if execute stays within scope; not blocking ship |
| **`BADF-OQ-3`** | Created by multiselect? | **Yes** — multiselect per Programme Results precedent |
| **`BADF-OQ-4`** | Jira ticket | None — record if ticket appears later |

---

## 10. Traceability

| Requirement | Proposal section | Reference implementation |
|---|---|---|
| `BADF-R-1`–`R-2` | §4 Proposed Outcome | `bilateral-results-list` search |
| `BADF-R-3`–`R-6` | §4, §9 | `programme-results-filter.service.ts` Created by |
| `BADF-R-7` | §4 | `my-draft-results-filter.service.ts` (P2-3319) |
| `BADF-R-8` | §4 | `bilateral-results-list` chips row |

---

*AKILI-SPECS · approved 2026-09-16*
