# Tasks: Results Center platform reporting guide

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/results-center-reporting-guide` |
| **Requirements** | [`requirements.md`](./requirements.md) |
| **Design** | [`design.md`](./design.md) |
| **Status** | shipped |
| **Depends on** | `changes/results-center-sp-layout` hero shipped (or same PR) |

---

## 1. Pre-flight checklist

- [ ] `requirements.md` approved
- [ ] `design.md` approved
- [ ] OQ-1..OQ-3, OQ-5 resolved in requirements §10
- [ ] No conflicting in-flight spec on `where-to-report-modal` behavior change
- [ ] Coordinator confirms RC hero has slot for second CTA

---

## 2. Task list

### RCG-T-1 — Persona service + mode resolution

- **Type:** client | tests
- **Description:** Create `PlatformReportingGuideService` (or co-located pure helpers) computing `hasSpAccess`, `hasCenterAccess`, `spChoices`, `modalMode`, and admin catalog merge. Export pure functions for unit tests.
- **Implements:** RCG-R-3, RCG-R-6 (flags), RCG-R-7 (picker list)
- **Design:** design.md §6.1
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/services/platform-reporting-guide.service.ts`
  - `platform-reporting-guide.service.spec.ts`
- **Depends on:** —
- **Estimate:** M
- **Skills:** `angular-developer`, `tdd`
- **Definition of done:**
  - [ ] All persona combinations in design §2.4 map to correct `modalMode`
  - [ ] Admin path includes other Science Programs
  - [ ] Scoped Jest green: `npm run test -- --testPathPattern="platform-reporting-guide.service.spec"`
- **Verification:**
  - **Pass:** table-driven tests for 5 persona rows + admin multi-SP
  - **Disqualifier:** if tests only assert `hasSpAccess` boolean without mode — insufficient; must assert `modalMode`
  - **Falsifiable input:** user with `myInitiativesListReportingByPortfolio=[]`, `isAdmin=false`, `getMyCenters=[]` → `guide-only`

---

### RCG-T-2 — Guide modal shell + guide-only lanes

- **Type:** client
- **Description:** Create `ResultsCenterReportingGuideComponent` with dialog chrome (SP modal header parity), guide-only static lanes (`platform-guide-copy.ts`), center-only W3 explainer, and program picker UI.
- **Implements:** RCG-R-2 (guide copy), RCG-R-5, RCG-R-6, RCG-R-7 (picker UI)
- **Design:** design.md §6.2, §6.3
- **Files (expected):**
  - `components/results-center-reporting-guide/results-center-reporting-guide.component.{ts,html,scss}`
  - `platform-guide-copy.ts`
  - `results-center-reporting-guide.component.spec.ts`
- **Depends on:** RCG-T-1
- **Estimate:** M
- **Skills:** `angular-developer`, `frontend-design`
- **Definition of done:**
  - [ ] Guide-only mode renders no hub child
  - [ ] Picker lists `spChoices` and emits selected code
  - [ ] Copy imports `HUB_COPY` for shared strings (no forked no-centers text)
  - [ ] Scoped Jest: `results-center-reporting-guide.component.spec`
- **Verification:**
  - **Pass:** component spec asserts guide-only template has no `app-reporting-entry-hub`
  - **Disqualifier:** presence of CSS class alone — must assert hub component absent in guide-only fixture
  - **Gap:** visual parity — HITL side-by-side with SP modal (record in execution.md)

---

### RCG-T-3 — Hub embed + EntityAow prime + navigation

- **Type:** client
- **Description:** In hub mode, embed `ReportingEntryHubComponent` with same bindings as `where-to-report-modal`; prime `EntityAowService` for selected `programCode`; wire Report/Emerging outputs to existing navigation handlers (close modal + `router.navigate`).
- **Implements:** RCG-R-2, RCG-R-4, RCG-R-7, RCG-R-8, RCG-R-9
- **Design:** design.md §6.2, §6.4, RCG-DD-1
- **Files (expected):**
  - `results-center-reporting-guide.component.ts` (hub branch)
  - Optional small `@Input() hideShell` on `where-to-report-modal` **only if** embed path chosen over inline hub
- **Depends on:** RCG-T-2
- **Estimate:** M
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] `myCentersCount=0` → W3 `no-centers` state (RCG-AC-2)
  - [ ] `canReportW1W2` reflects primed `EntityAowService`
  - [ ] Emerging respects Avisa exclusion
  - [ ] No `GET_ScienceProgramTocProgress` in guide-only mode (spy in component spec)
  - [ ] Scoped Jest green for guide component hub branch
- **Verification:**
  - **Pass:** mock API not called when mode is guide-only; called when hub mode with code
  - **Disqualifier:** test that only checks modal `visible` signal
  - **Falsifiable input:** open guide-only → expect zero hub API calls

---

### RCG-T-4 — Results Center hero CTA wiring

- **Type:** client
- **Description:** Add **Where to report** button to `results-list` hero; host guide component; wire open/close; ensure document click / Escape closes guide without breaking columns picker.
- **Implements:** RCG-R-1
- **Design:** design.md §6.2 CTA
- **Files (expected):**
  - `results-list.component.{html,ts}`
  - `results-list.module.ts` (import standalone guide)
  - `results-list.component.spec.ts` (extend)
- **Depends on:** RCG-T-2 (can stub guide in T-4 tests before T-3 completes)
- **Estimate:** S
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] CTA visible on hero with label **Where to report**
  - [ ] Click opens guide; second click after close works
  - [ ] Scoped Jest: `results-list.component.spec` — "Where to report" section
- **Verification:**
  - **Pass:** spec clicks CTA, guide `visible` true
  - **Disqualifier:** test without querying button label text

---

### RCG-T-5 — HITL manual QA + execution record

- **Type:** tests | docs
- **Description:** Manual checklist at ≥900px; document in `execution.md`. Verify persona scenarios live.
- **Implements:** RCG-AC-1..5, RCG-NFR-1 (keyboard smoke)
- **Depends on:** RCG-T-3, RCG-T-4
- **Estimate:** S
- **Skills:** `playwright-cli` (optional; manual OK)
- **Definition of done:**
  - [ ] HITL matrix executed: SP+Center, SP only, Center only, neither, admin multi-SP
  - [ ] SP band Where to report unchanged (smoke on SP01)
  - [ ] `execution.md` created with pass/fail notes
- **Verification:**
  - **Pass:** checklist all green or gaps documented
  - **Substitute:** human HITL — no automated visual gate

---

## 3. Dependency graph

```
RCG-T-1
  └── RCG-T-2
        └── RCG-T-3
              └── RCG-T-5
RCG-T-2 ──► RCG-T-4 ──► RCG-T-5
```

**Parallel:** RCG-T-4 can start once RCG-T-2 exposes a stub guide component.

---

## 4. PR strategy

**Single PR recommended** (~280–380 LOC). If RC layout spec is unmerged, either:

1. Stack PR: `results-center-sp-layout` first, then this spec; or
2. Combine hero CTA into layout PR as a follow-up commit on same branch.

---

## 5. Scenario ownership matrix

| Scenario / clause | Task |
|---|---|
| RCG-R-1 open guide, focus, Escape | RCG-T-4, RCG-T-5 |
| RCG-R-2 SP visual parity | RCG-T-2, RCG-T-3, RCG-T-5 HITL |
| RCG-R-3 mode selection | RCG-T-1 |
| RCG-R-4 no-centers W3 | RCG-T-3 |
| RCG-R-5 guide-only W1/W2 | RCG-T-2 |
| RCG-R-6 center-only W3 | RCG-T-2 |
| RCG-R-7 picker + auto-select | RCG-T-1, RCG-T-2, RCG-T-3 |
| RCG-R-8 canReport + Avisa | RCG-T-3 |
| RCG-R-9 deep links | RCG-T-3 |
| SP modal regression | RCG-T-5 smoke |

---

## 6. Recommended first task

**RCG-T-1** — persona service with table-driven tests; unblocks all UI work.
