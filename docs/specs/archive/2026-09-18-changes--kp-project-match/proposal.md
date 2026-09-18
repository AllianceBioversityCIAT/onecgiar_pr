# Proposal: KP Project Match & Highlighting (`cg.identifier.project`)

**One line:** Extract `cg.identifier.project` from CGIAR repository metadata and reuse the Science Program match UX (badge, soft-sort, “show matches only”) so bilateral Knowledge Product browse surfaces publications tagged for the active W3/bilateral project first — without hiding untagged items.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-project-match` |
| Proposal Path | `docs/specs/changes/kp-project-match/proposal.md` |
| Slug | `kp-project-match` — derived from user request to match `cg.identifier.project` with the active bilateral project in KP browse |
| Type | Change |
| Approval Mode | gated |
| Parent Spec | none |
| Depends on | archived `docs/specs/archive/2026-09-15-changes--kp-program-accelerator-match` (pattern reuse) · archived `docs/specs/archive/2026-09-14-changes--kp-multi-repository-browse` (discovery DTO) |
| Parallel-safe | yes — scoped to DSpace discovery mapper + shared `app-kp-cgspace-browse` + bilateral host wiring |
| Author | Juan Cadavid + AKILI (T1) |
| Date | 2026-09-18 |
| Status | specified |

Constitution cited: `docs/prd.md` persona *Result submitter* / bilateral reporting user · `G1` (`M1.3` — reduce time-to-submit) · `docs/ux-ui/design.md` §7 tokens, §8 components · `docs/trd/trd.md` Integrations (DSpace Discovery proxy, bilateral manual create drawer).

---

## 2. Intent

When a Center user creates a **Knowledge Product** from the bilateral **Set up bilateral result** drawer (project already selected, e.g. `A-AG10156 — Accelerating Impacts of CGIAR Climate Research for Africa`), repository browse should highlight items whose metadata includes the same project in `cg.identifier.project` (e.g. `IRRI - USDA Fertilize Right Project` in CGSpace item detail).

The UX should mirror what Programme Results already does for Science Programs (`Matches Breeding for Tomorrow`, soft-sort, optional “Show matches only”) — not a hard Solr filter that hides untagged publications.

---

## 3. Problem / Current Behavior

1. **Metadata not mapped:** `CgspaceDiscoveryMapper.toItem` maps `cg.contributor.programAccelerator` → `programAccelerators[]` but **does not** map `cg.identifier.project`. Items arrive at the client with no project tags.
2. **Bilateral browse has no project context:** `app-kp-cgspace-browse` inside `bilateral-manual-create-form` receives `phaseYear`, `busy`, etc. but **not** `projectCode` / `projectTitle` from `BilateralManualCreateFlowService` / `BilateralCreationService.selectedProject()`.
3. **No project match UI:** Even if metadata existed, there is no `matchesProject()`, badge, counter suffix, or soft-sort — unlike the shipped SP match path (`matchesProgram()` in `kp-cgspace-browse.component.ts`).
4. **User impact:** Submitters searching KP repositories from a project card cannot tell which hits belong to their project without opening each external record (screenshots 2026-09-18).

Programme Results (`lab-report-form`) **does** pass `[programCode]` / `[programName]` and shows SP matches. Bilateral KP create is the gap.

---

## 4. Proposed Outcome

1. **Server enrichment:** `CgspaceItemDto` exposes `projects?: string[]` from `cg.identifier.project` (multi-valued, de-duplicated, same pattern as `programAccelerators`).
2. **Client matching:** `KpCgspaceBrowseComponent` accepts optional `projectCode` and `projectTitle` inputs; implements normalized `matchesProject(item)` (code + title fuzzy match, same normalization helpers as SP match).
3. **Visual parity with SP match:**
   - Badge on card: `Matches <project label>` (prefer code + short title when both fit).
   - Left accent border using `--pr-color-primary-300`.
   - Results counter suffix: `· N match <project label>`.
   - Optional toggle: **Show matches only (N)** / **Show all results** (default: all).
4. **Soft-sort:** When project context is present and `matchProjectCount > 0`, project matches float to the top (stable relative order within each group). When **both** project and SP context are provided, sort key: project match → SP match → others (project takes precedence on bilateral screen).
5. **Bilateral wiring:** Pass project from drawer/form:
   - `shortName` → `projectCode` (e.g. `A-AG10156`)
   - `fullName` → `projectTitle`
   - Optionally pass primary SP (`drawerProgramCode` / `drawerProgramName`) so dual badges can appear when both metadata dimensions match.

---

## 5. Scope

### In scope

| Layer | Work |
|---|---|
| **Server** | Map `cg.identifier.project` in `CgspaceDiscoveryMapper`; extend `CgspaceItemDto`; union on dedup in `merge.ts` (mirror `programAccelerators`); mapper + merge specs |
| **Client shared** | Extend `CgspaceItemDto`; `projectCode` / `projectTitle` inputs; `matchesProject`, `projectMatchCount`, extend `displayItems` sort/filter; template badges + toggle; specs in `kp-cgspace-browse.component.spec.ts` |
| **Bilateral host** | Wire inputs in `bilateral-manual-create-form.component.html` from `BilateralCreationService.selectedProject()` or drawer computed props; spec assertion |
| **Docs** | Update `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` only if API response shape changes (discovery search payload — additive field) |

### Out of scope

- Hard backend filter on `cg.identifier.project` (same rationale as SP match).
- MQAP / `create-header` / handle validation changes (separate fix shipped as `quick/bilateral-kp-create-handle`).
- New repository facets for project (future kaizen).
- Mandatory project match before “Use this item” (informational only).

---

## 6. Non-Goals

- Replacing or removing SP match behaviour.
- Auto-selecting the first project match.
- Changing bilateral project catalogue or CLARISA sync.
- E2E Cypress in v1 (unit tests sufficient unless product asks).

---

## 7. Affected Users, Systems, And Specs

| Actor / system | Impact |
|---|---|
| Bilateral Center submitter | Faster KP selection when metadata tags align with active project |
| Programme Results submitter | No regression; project inputs optional (empty = today’s behaviour) |
| `onecgiar-pr-server` | `cgspace-discovery.mapper.ts`, `dto/cgspace-item.dto.ts`, `merge.ts` |
| `onecgiar-pr-client` | `kp-cgspace-browse.*`, `bilateral-manual-create-form.html` (+ spec) |
| Archived reference | `docs/specs/archive/2026-09-15-changes--kp-program-accelerator-match/` |

---

## 8. Visual Reference

- Source: **User screenshots** (2026-09-18) — bilateral KP browse empty state; CGSpace item metadata showing `cg.identifier.project`; Programme Results SP match UI (`Matches Breeding for Tomorrow`, show-matches toggle).
- Location: conversation assets; replicate SP badge geometry from `kp-cgspace-browse.component.html` (program match block).
- Notes: No new Figma. Badge copy for project should use project code when available (`Matches A-AG10156`) with full title in `aria-label`.

---

## 9. Requirement Delta Preview

### ADDED Requirements

- **KPPJ-R-1:** Discovery mapper MUST expose `projects: string[]` from `cg.identifier.project` on every searchable repository adapter (default field name `cg.identifier.project` on CGSpace; verify MELSpace/WorldFish fixtures in specify).
- **KPPJ-R-2:** Browse component MUST accept optional `projectCode` and `projectTitle` inputs.
- **KPPJ-R-3:** When project context is non-empty, items whose `projects[]` matches code or title (normalized fuzzy) MUST show a project match badge and primary left accent.
- **KPPJ-R-4:** When `projectMatchCount > 0`, matching items MUST sort above non-matching items; relative order within each group preserved.
- **KPPJ-R-5:** Results counter MUST append `· N match <label>` when `projectMatchCount > 0`.
- **KPPJ-R-6:** User MUST be able to toggle “Show matches only (N)” without losing access to full results (default off).
- **KPPJ-R-7:** Bilateral manual create form MUST pass the selected project’s `shortName` and `fullName` into browse while the drawer is open.

### MODIFIED Requirements

- **KPPJ-R-8:** `displayItems` soft-sort MUST combine project and SP dimensions: project match → SP match → others when both contexts are provided.

### REMOVED Requirements

- None.

---

## 10. Approach Options

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **A — Mirror SP match (recommended)** | Add `projects[]` + client fuzzy match, badge, soft-sort, toggle; wire bilateral project inputs | Proven pattern; non-breaking; minimal risk | Fuzzy matching needs careful tests for code vs title |
| **B — Backend Solr filter** | Filter discovery query by project metadata | Exact server-side filter | Hides untagged KPs; field inconsistency across repos; breaks parity with SP approach |
| **C — Client-only match on title search** | Infer project from search query | No server change | Unreliable; ignores metadata contract |

**Recommended: A** — same architecture as `kp-program-accelerator-match`, extended for `cg.identifier.project`.

---

## 11. Risks, Dependencies, And Open Questions

| Risk / OQ | Mitigation |
|---|---|
| **OQ-1:** `cg.identifier.project` values are free text (`IRRI - USDA Fertilize Right Project`) while bilateral uses CLARISA `shortName` + `fullName` — formats may differ | Matching uses normalized code token, title substring, and compact compare (same as SP); document examples in design.md |
| **OQ-2:** MELSpace / WorldFish may omit `cg.identifier.project` | Mapper emits `[]`; match count 0 → no UI change (graceful) |
| **OQ-3:** Wire primary SP on bilateral browse too? | Recommended in v1 (inputs already exist); badges can stack (project + SP) |
| **OQ-4:** Dedup merge when same item appears in multiple repos | Union `projects[]` like `programAccelerators` in `merge.ts` |

---

## 12. Success Criteria

- [ ] CGSpace search returns items with `projects[]` populated when metadata present (fixture or live sample).
- [ ] Bilateral drawer KP browse shows `Matches A-AG10156` (or equivalent) on tagged items when project selected.
- [ ] Project matches appear first in the list; “Show matches only” works.
- [ ] Programme Results KP browse unchanged when `projectCode` / `projectTitle` not passed.
- [ ] Scoped Jest green: `cgspace-discovery.mapper.spec`, `merge.spec`, `kp-cgspace-browse.component.spec`, `bilateral-manual-create-form.component.spec`.

---

## 13. Next Step

After approval:

```text
/akili-specify changes/kp-project-match
```

---

*AKILI-SPECS · proposed 2026-09-18*
