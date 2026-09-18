# Design — KP Project Match (`cg.identifier.project`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/kp-project-match` |
| Linked requirements | `requirements.md` |
| Status | `shipped` |
| Depth | Standard |
| Budget | **3 tasks · ~180 LOC · 1 review round** |

---

## 2. Executive Summary

Extend the shipped KP Program Accelerator Match (KPAM) pipeline with a parallel **project** dimension: server extracts `cg.identifier.project` into `projects[]`; client reuses the same fuzzy-match + soft-sort + toggle pattern; bilateral drawer passes project and primary SP context into the shared browse component. No new endpoints, no DB migrations, no Solr filter changes.

---

## 3. Architecture Overview

### 3.1 Modules touched

| Package | Path | Change |
|---|---|---|
| Server | `results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.ts` | Map `cg.identifier.project` |
| Server | `cgspace-discovery/dto/cgspace-item.dto.ts` | Add `projects?: string[]` |
| Server | `cgspace-discovery/merge.ts` | Union `projects[]` on dedup |
| Client | `kp-cgspace-browse/kp-cgspace-browse.component.{ts,html,spec.ts}` | Project match UX + combined sort/toggle |
| Client | `bilateral-manual-create-drawer-host.component.html` | Pass context inputs to form |
| Client | `bilateral-manual-create-form.component.{html,ts,spec.ts}` | Forward inputs to browse |

### 3.2 Sequence

```text
[Bilateral drawer — project A-AG10156 selected]
  └── app-bilateral-manual-create-form
        └── app-kp-cgspace-browse [projectCode, projectTitle, programCode, programName]
              └── GET /api/results/knowledge-products/cgspace/search (unchanged path)
                    └── CgspaceDiscoveryService fan-out
                          └── CgspaceDiscoveryMapper.toItem()
                                └── projects[] from cg.identifier.project
              └── matchesProject() / matchesProgram() client-side
              └── displayItems soft-sort + optional filter toggle
```

Programme Results path unchanged except additive DTO field on response; SP inputs already wired via `lab-report-form`.

---

## 4. Data Model

No database or entity changes.

### 4.1 DTO extension (additive)

| Field | Type | Source metadata | Notes |
|---|---|---|---|
| `projects` | `string[]` | `cg.identifier.project` | Multi-valued; `[]` when absent; mirrors `programAccelerators` |

Client `CgspaceItemDto` interface in `kp-cgspace-browse.component.ts` gains the same optional field (keep in sync with server DTO).

---

## 5. API Surface

No endpoint signature changes. Discovery search response items gain optional `projects[]`.

**Backwards compatibility:** Additive field only (`AC-4`). Clients that ignore unknown fields unaffected.

**Docs:** No change to `bilateral-result-summaries.en.md` — discovery search is not a bilateral export contract.

---

## 6. Server Design

### 6.1 Mapper (`KPPJ-DD-1`)

In `CgspaceDiscoveryMapper.toItem`, after `programAccelerators` extraction:

- Read `metadata['cg.identifier.project']` → map values → filter Boolean → assign to `projects`.
- Default `[]` when key missing (never `undefined` on wire for consistency with `programAccelerators`).

Field name pinned to `cg.identifier.project` for all adapters in v1 (`KPPJ-OQ-1`). MELSpace/WorldFish fixtures checked in T-1; if absent in fixture, mapper still emits `[]`.

### 6.2 Merge (`KPPJ-DD-2`)

Mirror `programAccelerators` union block in `merge.ts`:

- Build `projectsSet` from survivor + dropped items.
- Emit sorted/stable `Array.from(projectsSet)` on survivor.

---

## 7. Frontend / UX Architecture

### 7.1 New inputs

| Input | Type | Default | Source (bilateral) |
|---|---|---|---|
| `projectCode` | `input<string>` | `''` | `drawerProjectCode()` |
| `projectTitle` | `input<string>` | `''` | `drawerProjectTitle()` |

Existing `programCode` / `programName` unchanged.

### 7.2 Matching (`KPPJ-DD-3`)

Extract shared normalization helpers from `matchesProgram` into private methods (`normalizeMatchString`, `compactMatchString`) used by both matchers to avoid drift.

`matchesProject(item)` logic: identical structure to `matchesProgram`, iterating `item.projects[]` instead of `programAccelerators[]`.

### 7.3 Computed signals

| Signal | Definition |
|---|---|
| `projectMatchCount` | `items().filter(matchesProject).length` |
| `contextualMatchCount` | Union count when both contexts; else project-only or SP-only count |
| `projectMatchLabel` | `projectCode() \|\| projectTitle()` |
| `displayItems` | See sort/filter rules below |

### 7.4 Sort & filter (`KPPJ-DD-4`)

**Filter (`onlyMatches` toggle — extend semantics, keep signal name for minimal churn):**

- Project-only context → filter `matchesProject`
- SP-only context → filter `matchesProgram` (unchanged)
- Both contexts → filter `matchesProject(item) \|\| matchesProgram(item)`

**Soft-sort when toggle off and `contextualMatchCount > 0`:**

1. Bucket A: `matchesProject`
2. Bucket B: `matchesProgram && !matchesProject`
3. Bucket C: remainder

Preserve relative order within buckets (stable partition).

When no contextual matches, return raw `items()` unchanged.

### 7.5 Template

Duplicate SP badge block for project matches:

- Badge copy: `Matches {{ projectMatchLabel() }}`
- `aria-label`: `Matches project: {{ projectTitle() || projectCode() }}`
- Counter: append project suffix before SP suffix when `projectMatchCount > 0`
- Toggle chip: use `contextualMatchCount` for label when both contexts; project-only label when only project

**Design tokens:** `--pr-color-primary-100/300/400` (same as KPAM). No new tokens.

### 7.6 Bilateral wiring chain

```text
bilateral-manual-create-drawer-host
  └── app-bilateral-manual-create-form
        [projectCode]="flow.drawerProjectCode()"
        [projectTitle]="flow.drawerProjectTitle()"
        [programCode]="flow.drawerProgramCode()"
        [programName]="flow.drawerProgramName()"
        └── app-kp-cgspace-browse (same four bindings)
```

Form component adds four optional `input()` signals and forwards to browse template.

---

## 8. Security & Authorization

No change. Discovery search remains JWT-gated as today. No new logging of query content beyond existing patterns.

---

## 9. Performance

O(n) partition over ≤30 visible items per page — negligible. No extra network round-trips.

---

## 10. Testing Strategy

| Layer | Spec file | Covers |
|---|---|---|
| Server mapper | `cgspace-discovery.mapper.spec.ts` | KPPJ-R-1, KPPJ-AC-1 |
| Server merge | `merge.spec.ts` | KPPJ-R-2, KPPJ-AC-2 |
| Client browse | `kp-cgspace-browse.component.spec.ts` Gate D3 | KPPJ-R-4–R-8, KPPJ-AC-3–5, KPPJ-AC-8 |
| Client browse | Existing Gate D2 (KPAM) | Regression KPPJ-AC-7 |
| Bilateral form | `bilateral-manual-create-form.component.spec.ts` | KPPJ-R-9, KPPJ-AC-6 |

Scoped Jest only — no full suite.

---

## 11. Design Decisions

### KPPJ-DD-1 — Client-side fuzzy match (not Solr filter)

- **Context:** Repository project tags are free text; CLARISA uses code + full name.
- **Decision:** Reuse KPAM fuzzy normalization on the client; no discovery query filter.
- **Alternatives rejected:** Solr filter (hides untagged KPs); exact string equality (too brittle).
- **Consequences:** Match quality depends on tagging discipline; same as SP match.

### KPPJ-DD-2 — Field name `projects` on DTO

- **Context:** Need stable JSON key distinct from CLARISA bilateral `project` entities.
- **Decision:** `projects: string[]` sourced from `cg.identifier.project`.
- **Alternatives rejected:** `identifierProjects` (verbose); nested object (over-engineered for v1).

### KPPJ-DD-3 — Shared toggle `onlyMatches` with union filter when dual context

- **Context:** Bilateral will pass both project and SP; two toggles would confuse.
- **Decision:** Extend existing toggle to filter contextual union; N reflects union count.
- **Alternatives rejected:** Separate toggles; project-only toggle ignoring SP on bilateral.
- **Consequences:** Programme Results (SP-only) behaviour unchanged.

### KPPJ-DD-4 — Sort priority project before SP

- **Context:** Bilateral user selected a project; project tag is primary signal on that screen.
- **Decision:** Project bucket first, then SP-only, then rest.
- **Reversion challenge:** N/A — additive behaviour only; SP-only sort preserved when project inputs empty.

---

## 12. Rollback

Revert single PR. Additive DTO field ignored by older clients. No migration.

---

## 13. Open Gaps

- Lab-report-form project context deferred (`KPPJ-R-12`).
- Repository-specific project field aliases beyond `cg.identifier.project` — future kaizen if fixtures show divergence.

---

## 14. Cross-References

- `docs/specs/changes/kp-project-match/requirements.md`
- `docs/prd.md` · `docs/trd/trd.md` · `docs/ux-ui/design.md`
