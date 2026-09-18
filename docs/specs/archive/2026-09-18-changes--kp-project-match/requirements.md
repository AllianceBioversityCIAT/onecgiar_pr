# Requirements — KP Project Match (`cg.identifier.project`)

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results` (shared KP browse) + `bilateral` (host wiring) |
| Sub-feature | KP project match & highlighting |
| Spec path | `changes/kp-project-match` |
| Owner | Bilateral / Results platform |
| Status | `shipped` |
| Type | Change |
| Approval Mode | gated — requirements approved via `/akili-specify` 2026-09-18 |
| Depends on | Shipped `changes/kp-program-accelerator-match` · `changes/kp-multi-repository-browse` |
| Constitution | `docs/prd.md` G1 / M1.3 · `docs/ux-ui/design.md` §7–§8 · `docs/trd/trd.md` Integrations (DSpace Discovery) |

---

## 2. Executive Summary

**Answer:** Map `cg.identifier.project` from CGIAR repository metadata, then highlight and soft-sort Knowledge Product browse results that match the active bilateral project — using the same non-blocking UX already shipped for Science Program matches.

Center submitters creating a KP from the bilateral drawer (project already selected) cannot see which repository hits belong to their project. Programme Results already surfaces SP-tagged items first; bilateral KP browse does not. This spec closes that gap without hiding untagged publications.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Project context** | CLARISA project `shortName` + `fullName` active in the bilateral create drawer |
| **SP context** | Science Program `programCode` + display name passed to browse (Programme Results or bilateral primary SP) |
| **Project tag** | One value from repository metadata field `cg.identifier.project` |
| **Soft-sort** | Reorder visible results client-side; no Solr filter |
| **Contextual match** | Item matches project context and/or SP context per fuzzy rules |

---

## 4. System Context & Scope

### In scope

- Server: extract `cg.identifier.project` → `projects[]` on discovery DTO; union on multi-repo dedup.
- Client: `app-kp-cgspace-browse` project inputs, matching, badge, counter, toggle, combined sort with SP.
- Bilateral: wire project (+ primary SP) from drawer flow into browse.
- Scoped unit tests on mapper, merge, browse component, bilateral form host chain.

### Out of scope

- Hard backend filter on project metadata.
- MQAP / `create-header` / handle validation.
- Repository project facets.
- Mandatory project match before “Use this item”.
- E2E Cypress in v1.

**PRD:** Refines result-submitter efficiency (`G1`, `M1.3`). **TRD:** DSpace Discovery proxy (`results-knowledge-products/cgspace-discovery`). **UX:** Reuses KP browse card pattern from Programme Results SP match.

---

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Bilateral Center submitter | Sees project-tagged KPs first when browsing repositories from a project card |
| Programme Results submitter | No change when project inputs omitted |
| Platform admin | No admin surface change |
| Downstream bilateral consumers | Unaffected (discovery search is internal to create flow) |

---

## 6. User Stories

- **KPPJ-US-1** — As a **bilateral Center submitter**, I want repository hits tagged with my project to appear first and be labelled, so that I can pick the right Knowledge Product without opening every external record.
- **KPPJ-US-2** — As a **Programme Results submitter**, I want existing SP match behaviour unchanged, so that my reporting flow is not regressed.

Refines PRD result-submitter stories around bilateral and KP reporting efficiency.

---

## 7. Functional Requirements

### Required (MUST)

#### KPPJ-R-1 — Discovery mapper exposes project tags

The discovery mapper MUST map repository metadata field `cg.identifier.project` to `projects: string[]` on each `CgspaceItemDto`, de-duplicated, empty array when absent.

**Scenario: CGSpace item with project metadata**

- GIVEN a discovery HAL document whose metadata includes `cg.identifier.project` with value `IRRI - USDA Fertilize Right Project`
- WHEN the mapper converts the document to `CgspaceItemDto`
- THEN `projects` MUST equal `['IRRI - USDA Fertilize Right Project']`
- AND IT MUST NOT omit the field (empty array is acceptable when metadata absent)

#### KPPJ-R-2 — Dedup merge unions project tags

When duplicate items are merged across repositories, the survivor MUST receive the union of all `projects[]` values, de-duplicated.

**Scenario: Same item in two repos with different project tags**

- GIVEN two duplicate cards where repo A has `projects: ['Proj X']` and repo B has `projects: ['Proj Y']`
- WHEN merge deduplication runs
- THEN the survivor MUST have `projects: ['Proj X', 'Proj Y']` (order stable, de-duplicated)

#### KPPJ-R-3 — Browse accepts project context inputs

`app-kp-cgspace-browse` MUST accept optional inputs `projectCode` and `projectTitle` (default empty).

**Scenario: No project context**

- GIVEN `projectCode` and `projectTitle` are both empty
- WHEN results render
- THEN no project match badge, counter suffix, or project sort MUST appear
- BUT SP match behaviour MUST remain as today when SP inputs are provided

#### KPPJ-R-4 — Fuzzy project matching

When project context is non-empty, `matchesProject(item)` MUST return true when any `item.projects[]` value matches `projectCode` and/or `projectTitle` using the same normalization strategy as `matchesProgram` (lowercase, strip punctuation, compact compare, token/substring checks).

**Scenario: Title substring match**

- GIVEN `projectTitle` = `Accelerating Impacts of CGIAR Climate Research for Africa`
- AND an item with `projects: ['AICCRA - Accelerating Impacts of CGIAR Climate Research for Africa']`
- WHEN `matchesProject` runs
- THEN it MUST return true

**Scenario: Code token match**

- GIVEN `projectCode` = `A-AG10156`
- AND an item with `projects: ['A-AG10156 - AICCRA Project']`
- WHEN `matchesProject` runs
- THEN it MUST return true

**Scenario: No false positive on unrelated tag**

- GIVEN `projectCode` = `A-AG10156`
- AND an item with `projects: ['IRRI - USDA Fertilize Right Project']`
- WHEN `matchesProject` runs
- THEN it MUST return false

#### KPPJ-R-5 — Project match visual affordances

When `matchesProject(item)` is true, the result card MUST show:

- A badge: `Matches <label>` where `<label>` prefers `projectCode` when set, else `projectTitle`
- Left accent border using `--pr-color-primary-300`
- `aria-label` including the full project title when truncated in visible copy

**Scenario: Bilateral drawer with tagged hit**

- GIVEN project context `A-AG10156` / full title set
- AND a search result whose `projects[]` matches
- WHEN the card renders
- THEN the badge MUST be visible
- AND the left accent MUST be applied

#### KPPJ-R-6 — Results counter includes project matches

When `projectMatchCount > 0`, the results counter MUST append `· N match <label>` (same label rule as R-5). When SP matches also exist, SP suffix MUST still append after project suffix (both visible when both counts > 0).

#### KPPJ-R-7 — Show matches only toggle (project-aware)

The user MUST be able to toggle **Show matches only (N)** / **Show all results** (default: all).

- When **only** project context is set: N = project match count; toggle filters to project matches only.
- When **only** SP context is set: existing SP-only behaviour MUST be preserved.
- When **both** contexts are set: N = count of items matching project **or** SP; toggle filters to that union.

**Scenario: Toggle filters project matches**

- GIVEN 3 project matches and 10 total items, project context only
- WHEN the user activates **Show matches only (3)**
- THEN exactly 3 cards MUST render
- AND WHEN the user toggles back to **Show all results**
- THEN all 10 MUST render again with soft-sort intact

#### KPPJ-R-8 — Combined soft-sort

`displayItems` MUST soft-sort when any contextual match count > 0:

1. Project matches (highest priority)
2. SP-only matches (SP match AND NOT project match)
3. All others

Relative order within each group MUST preserve the original API order.

**Scenario: Both contexts, mixed hits**

- GIVEN items [A=project+SP, B=SP only, C=neither, D=project only]
- WHEN `displayItems` computes without filter toggle
- THEN order MUST be [A, D, B, C]

#### KPPJ-R-9 — Bilateral host wiring

The bilateral manual create flow MUST pass `projectCode`, `projectTitle`, `programCode`, and `programName` from `BilateralManualCreateFlowService` through `bilateral-manual-create-form` into `app-kp-cgspace-browse` while the create form is visible.

**Scenario: Drawer open on KP browse**

- GIVEN a selected project with `shortName` / `fullName` and primary SP
- WHEN the user reaches KP repository browse inside the drawer
- THEN browse MUST receive all four inputs bound from the flow service

### Should (SHOULD)

- **KPPJ-R-10** Badge copy SHOULD use monospace styling for project code when code is the visible label (match SP badge styling).
- **KPPJ-R-11** When both project and SP badges apply to one card, both badges SHOULD stack without overlapping primary actions.

### Could (MAY)

- **KPPJ-R-12** Programme Results MAY pass project context in a future spec; not required for v1 ship criteria.

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Client-side match/sort on ≤30 visible items MUST stay imperceptible (<16 ms on typical laptop); no extra API calls |
| **Backwards compatibility** | `projects[]` is additive on discovery DTO; omitting project inputs MUST preserve today’s browse behaviour (`AC-4`) |
| **Accessibility** | Badges and toggle MUST have discernible names; toggle uses `aria-pressed`; focus order unchanged (`docs/ux-ui/design.md` §10) |
| **Security** | No new endpoints; no secrets in logs (`.cursorrules`) |
| **i18n** | New user-visible strings SHOULD go through `bilateral-manual-create.copy.ts` or browse-local copy only if bilateral-specific; reuse SP match string pattern where possible |

---

## 9. Defect Classes & Verification Gates

| Defect class | How caught | Substitute if no automation |
|---|---|---|
| Metadata not mapped / lost on merge | `cgspace-discovery.mapper.spec.ts`, `merge.spec.ts` | — |
| Wrong fuzzy match (false pos/neg) | `kp-cgspace-browse.component.spec.ts` Gate D3 scenarios | — |
| Sort/toggle regression | Browse component spec (displayItems + DOM toggle) | — |
| Bilateral wiring broken (inputs not passed) | `bilateral-manual-create-form.component.spec.ts` template binding | — |
| SP match regression | Existing KPAM specs in browse component spec (must stay green) | — |
| Visual badge layout/contrast | No automated layout gate in Jest | **Accepted risk** — human spot-check on bilateral drawer + Programme Results in staging |
| Cross-browser rendering | Not in v1 scope | Accepted risk |

---

## 10. Acceptance Criteria Index

| ID | Given | When | Then |
|---|---|---|---|
| KPPJ-AC-1 | CGSpace HAL with `cg.identifier.project` | Mapper runs | `projects[]` populated |
| KPPJ-AC-2 | Duplicate items with distinct `projects[]` | Merge runs | Union on survivor |
| KPPJ-AC-3 | Project context + matching item | Card renders | Badge + accent visible |
| KPPJ-AC-4 | Project context + 5 matches / 20 items | List renders | Matches appear before non-matches |
| KPPJ-AC-5 | Project context + matches | User toggles show-matches-only | Only matches visible |
| KPPJ-AC-6 | Bilateral drawer with selected project | KP browse tab active | Browse receives project + SP inputs |
| KPPJ-AC-7 | No project inputs (Programme Results) | Search runs | Behaviour identical to pre-change SP match |
| KPPJ-AC-8 | Both project + SP context | Mixed items | Sort order: project → SP-only → other |

---

## 11. Requirement ID Index

| ID | Summary |
|---|---|
| KPPJ-R-1 | Mapper `projects[]` |
| KPPJ-R-2 | Merge union |
| KPPJ-R-3 | Project inputs |
| KPPJ-R-4 | Fuzzy match |
| KPPJ-R-5 | Badge + accent |
| KPPJ-R-6 | Counter suffix |
| KPPJ-R-7 | Toggle |
| KPPJ-R-8 | Combined sort |
| KPPJ-R-9 | Bilateral wiring |
| KPPJ-R-10 | Badge styling (SHOULD) |
| KPPJ-R-11 | Dual badges (SHOULD) |
| KPPJ-R-12 | Lab project context (MAY) |

---

## 12. Dependencies & Assumptions

### Upstream

- DSpace Discovery proxy (`GET` multi-repo search) — unchanged contract except additive DTO field.
- `BilateralManualCreateFlowService` already exposes `drawerProjectCode`, `drawerProjectTitle`, `drawerProgramCode`, `drawerProgramName`.

### Assumptions

- `cg.identifier.project` field name is consistent on CGSpace; MELSpace/WorldFish may omit it (empty `[]` acceptable).
- Fuzzy match sufficient for free-text project names vs CLARISA catalogue names (same assumption as SP match).

---

## 13. Open Questions

| ID | Question | Resolution for v1 |
|---|---|---|
| KPPJ-OQ-1 | Exact MELSpace/WorldFish field name for project | Default `cg.identifier.project`; verify against fixtures in KPPJ-T-1; empty if absent |
| KPPJ-OQ-2 | Wire SP on bilateral browse? | **Yes** — flow service already has primary SP; pass through with project (proposal OQ-3) |

---

## 14. Cross-References

- `docs/specs/changes/kp-project-match/proposal.md`
- `docs/specs/archive/2026-09-15-changes--kp-program-accelerator-match/` (pattern reference)
- `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/`
