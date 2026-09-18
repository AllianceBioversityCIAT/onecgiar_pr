# Tasks — KP Project Match (`cg.identifier.project`)

## 1. Scope

| Field | Value |
|---|---|
| Module / feature | KP project match + bilateral wiring |
| Linked spec | `requirements.md` + `design.md` |
| Status | `shipped` |
| Estimated LOC | ~180 |
| PR strategy | **Single PR** (server DTO + client browse + bilateral wiring tightly coupled) |

---

## 2. Pre-flight Checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] Open questions resolved (KPPJ-OQ-1: default field name; KPPJ-OQ-2: wire SP on bilateral)
- [x] No conflicting in-flight spec on `cgspace-discovery` or `kp-cgspace-browse`
- [x] N/A — no migrations

---

## 3. Task List

### [x] KPPJ-T-1 — Server: map `projects[]` and merge union

- **Type:** server + tests
- **Description:** Add `projects` to `CgspaceItemDto`; extract `cg.identifier.project` in `CgspaceDiscoveryMapper.toItem`; union `projects[]` in `merge.ts` mirroring `programAccelerators`. Verify MELSpace/WorldFish fixtures — field absent → `[]`.
- **Implements:** KPPJ-R-1, KPPJ-R-2 · KPPJ-AC-1, KPPJ-AC-2
- **Design refs:** §6.1, §6.2, KPPJ-DD-1, KPPJ-DD-2
- **Files (expected):**
  - `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/dto/cgspace-item.dto.ts`
  - `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.ts`
  - `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.spec.ts`
  - `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/merge.ts`
  - `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/merge.spec.ts`
- **Depends on:** —
- **Estimate:** S
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Definition of done:**
  - [x] Mapper spec: populated, empty, missing field cases
  - [x] Merge spec: union + dedup case
  - [x] `cd onecgiar-pr-server && npm run test -- --testPathPattern="cgspace-discovery.mapper.spec|merge.spec"` green
- **Verification pass:** Mapper returns `projects: ['IRRI - USDA Fertilize Right Project']` for fixture with metadata.
- **Verification disqualifier:** Test passes only because expectation was copied from implementation without a fixture containing `cg.identifier.project` — must use explicit HAL snippet in spec.
- **Falsifiable input:** HAL document with **no** `cg.identifier.project` key must yield `projects: []`, not `undefined`.

---

### [x] KPPJ-T-2 — Client: project match, sort, toggle, badge in browse

- **Type:** client + tests
- **Description:** Extend `CgspaceItemDto` with `projects?`; add `projectCode`/`projectTitle` inputs; implement `matchesProject`, `projectMatchCount`, `contextualMatchCount`, `projectMatchLabel`; refactor shared normalize helpers; extend `displayItems` and `onlyMatches` filter per KPPJ-DD-3/4; update template for badge, counter suffix, toggle label; keep Gate D2 (KPAM) green.
- **Implements:** KPPJ-R-3, KPPJ-R-4, KPPJ-R-5, KPPJ-R-6, KPPJ-R-7, KPPJ-R-8 · KPPJ-AC-3, KPPJ-AC-4, KPPJ-AC-5, KPPJ-AC-7, KPPJ-AC-8
- **Design refs:** §7.1–§7.5, KPPJ-DD-3, KPPJ-DD-4
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/.../kp-cgspace-browse/kp-cgspace-browse.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/.../kp-cgspace-browse/kp-cgspace-browse.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/.../kp-cgspace-browse/kp-cgspace-browse.component.spec.ts`
- **Depends on:** KPPJ-T-1 (DTO field on wire; can mock client-side before T-1 lands but ship order is T-1 → T-2)
- **Estimate:** M
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Gate D3 spec block: normalization, false positive, sort order, toggle, dual-context union
  - [x] Gate D2 KPAM tests still pass
  - [x] `cd onecgiar-pr-client && npm run test -- --testPathPattern="kp-cgspace-browse.component.spec"` green
- **Verification pass:** `displayItems` order [project+SP, project-only, SP-only, neither] with both contexts set.
- **Verification disqualifier:** Sort test that only checks first item is a match without asserting SP-only item precedes neither.
- **Falsifiable input:** Item with `projects: ['Unrelated Project']` and context `A-AG10156` must **not** increment `projectMatchCount`.
- **Presence-assertion gap:** CSS class `border-l-4` alone does not prove badge copy — DOM test must assert badge text contains project code.

---

### [x] KPPJ-T-3 — Bilateral: wire context inputs drawer → form → browse

- **Type:** client + tests
- **Description:** Add `projectCode`, `projectTitle`, `programCode`, `programName` inputs to `BilateralManualCreateFormComponent`; bind from drawer host using `BilateralManualCreateFlowService` computeds; forward to `app-kp-cgspace-browse`.
- **Implements:** KPPJ-R-9 · KPPJ-AC-6
- **Design refs:** §7.6
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-manual-create-drawer-host/bilateral-manual-create-drawer-host.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-manual-create-form/bilateral-manual-create-form.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-manual-create-form/bilateral-manual-create-form.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-manual-create-form/bilateral-manual-create-form.component.spec.ts`
- **Depends on:** KPPJ-T-2
- **Estimate:** S
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Spec asserts template contains `[projectCode]`, `[projectTitle]`, `[programCode]`, `[programName]` on browse (or form inputs + forward bindings)
  - [x] `cd onecgiar-pr-client && npm run test -- --testPathPattern="bilateral-manual-create-form.component.spec"` green
- **Verification pass:** Template binding chain host → form → browse present in spec.
- **Verification disqualifier:** Test only checks form component exists without asserting browse input bindings.
- **Falsifiable input:** Removing `[projectCode]` binding must fail the spec.

---

## 4. Scenario → Task Coverage

| Requirement scenario / clause | Task |
|---|---|
| KPPJ-R-1 mapper populated / empty | KPPJ-T-1 |
| KPPJ-R-2 merge union | KPPJ-T-1 |
| KPPJ-R-3 no project context → no project UI | KPPJ-T-2 |
| KPPJ-R-4 title substring match | KPPJ-T-2 |
| KPPJ-R-4 code token match | KPPJ-T-2 |
| KPPJ-R-4 no false positive | KPPJ-T-2 |
| KPPJ-R-5 badge + accent | KPPJ-T-2 |
| KPPJ-R-6 counter suffix (project + SP) | KPPJ-T-2 |
| KPPJ-R-7 toggle project-only | KPPJ-T-2 |
| KPPJ-R-7 toggle dual-context union | KPPJ-T-2 |
| KPPJ-R-8 sort project → SP-only → other | KPPJ-T-2 |
| KPPJ-R-9 bilateral wiring | KPPJ-T-3 |
| KPPJ-AC-7 SP regression | KPPJ-T-2 (Gate D2) |
| Visual layout/contrast | **Gap** — manual staging check |

---

## 5. Dependency Graph

```text
KPPJ-T-1 (server DTO + mapper + merge)
   └── KPPJ-T-2 (browse match UX)
         └── KPPJ-T-3 (bilateral wiring)
```

---

## 6. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| KPPJ-TEST-1 | unit (server) | KPPJ-AC-1 | `cgspace-discovery.mapper.spec.ts` |
| KPPJ-TEST-2 | unit (server) | KPPJ-AC-2 | `merge.spec.ts` |
| KPPJ-TEST-3 | unit (client) | KPPJ-AC-3–5, KPPJ-AC-8 | `kp-cgspace-browse.component.spec.ts` Gate D3 |
| KPPJ-TEST-4 | unit (client) | KPPJ-AC-7 | `kp-cgspace-browse.component.spec.ts` Gate D2 |
| KPPJ-TEST-5 | unit (client) | KPPJ-AC-6 | `bilateral-manual-create-form.component.spec.ts` |

---

## 7. Rollout & Verification

- [ ] Single PR: `✨ feat(kp-browse) [KPPJ]: project match from cg.identifier.project`
- [x] Scoped Jest green (three patterns above)
- [ ] Manual: bilateral drawer → KP browse → search → confirm badge/sort for project-tagged item
- [ ] Manual: Programme Results KP browse → confirm SP match unchanged

---

## 8. Rollback

1. Revert PR.
2. No migration revert needed.
3. Confirm discovery items omit `projects` after revert (optional spot check).

---

## 9. First Task

**KPPJ-T-1** — server mapper + merge (unblocks client DTO alignment).

Run execution with:

```text
/akili-execute changes/kp-project-match
```
