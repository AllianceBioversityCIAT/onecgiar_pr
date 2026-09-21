# Module Spec — KP Program Accelerator Match & Highlighting (`tasks.md`)

## 1. Scope of this task list

- **Module / feature:** `results` / `result-framework-reporting` — Knowledge Product Program Accelerator Match
- **Linked spec:** `docs/specs/changes/kp-program-accelerator-match/requirements.md` + `docs/specs/changes/kp-program-accelerator-match/design.md`
- **Short Code:** `KPAM`
- **Owner / driver:** Results & Science Program Reporting
- **Status:** `completed`

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` are all resolved (OQ-1: non-restrictive policy confirmed).
- [x] No schema migrations required (DSpace proxy mapping only).
- [x] Budget verified against design: 4 tasks, ~250 net LOC, 1 review round.

---

## 3. Task list

### `KPAM-T-1` — Server-side DSpace metadata extraction for `programAccelerators` [x]

- **Type:** `server`
- **Description:** Update `CgspaceItemDto` to declare `programAccelerators?: string[]`. Update `CgspaceDiscoveryMapper.toItem` to read `metadata['cg.contributor.programAccelerator']` and extract all non-empty string values. Ensure that repositories lacking this field safely return `[]`. Add unit test cases in `cgspace-discovery.mapper.spec.ts` asserting exact parsing.
- **Implements:** `KPAM-R-1`, `KPAM-AC-1`, `KPAM-AC-7`, Defect Gates `D1`, `D5`.
- **Files (expected):**
  - `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/dto/cgspace-item.dto.ts`
  - `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.ts`
  - `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.spec.ts`
- **Depends on:** `—`
- **Blocks:** `KPAM-T-2`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `nestjs-expert`
- **Definition of done:**
  - [x] `CgspaceItemDto` contains optional `programAccelerators?: string[]`.
  - [x] `CgspaceDiscoveryMapper.toItem` maps values from `cg.contributor.programAccelerator`.
  - [x] Unit tests pass 100%: `npx jest src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.spec.ts`.
  - [x] ESLint passes cleanly: `npx eslint "src/api/results/results-knowledge-products/cgspace-discovery/**/*.ts" --quiet`.

---

### `KPAM-T-2` — Client `KpCgspaceBrowseComponent` matching, soft-boost ranking, and badge UI [x]

- **Type:** `client`
- **Description:** 
  1. Update `CgspaceItemDto` in `kp-cgspace-browse.component.ts` to include `programAccelerators?: string[]`.
  2. Add `programCode = input<string>('')` and `programName = input<string>('')` inputs.
  3. Implement `matchesProgram(item: CgspaceItemDto): boolean` with resilient case-insensitive substring/keyword matching.
  4. Compute `sortedItems` which soft-boosts matching items to the top of the results list in default mode.
  5. In template: render `[✨ Matches <ProgramName>]` badge with token styling (`bg-violet-50 text-violet-700 border-violet-200`) and subtle card left border (`border-l-4 border-l-[var(--pr-color-primary-300)]`).
  6. In results counter: display `(N match <ProgramName>)` and add non-restrictive toggle chip between "All results" (default) and "Matches only".
  7. Add comprehensive unit tests in `kp-cgspace-browse.component.spec.ts`.
- **Implements:** `KPAM-R-2`, `KPAM-R-3`, `KPAM-R-4`, `KPAM-R-5`, `KPAM-R-6`, `KPAM-R-7`, `KPAM-AC-2`, `KPAM-AC-3`, `KPAM-AC-4`, `KPAM-AC-5`, `KPAM-AC-6`, Defect Gates `D2`, `D3`, `D4`.
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.spec.ts`
- **Depends on:** `KPAM-T-1`
- **Blocks:** `KPAM-T-3`
- **Estimate:** `M` (≤ 1d)
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [x] Badge renders on matching cards with `bg-violet-50 text-violet-700 border-violet-200`.
  - [x] Non-matching items are NEVER excluded in default view (`KPAM-R-5`).
  - [x] Matching items appear first in the list (`KPAM-R-6`).
  - [x] Toggle chip switches between all items and matches only (`KPAM-R-7`).
  - [x] Unit tests pass: `npx jest src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.spec.ts`.
  - [x] Lint passes: `npx ng lint --lint-file-patterns="src/app/pages/result-framework-reporting/pages/entity-aow/**/*.ts"`.

---

### `KPAM-T-3` — Host context propagation in `lab-report-form` [x]

- **Type:** `client`
- **Description:** Bind `[programCode]="programCode()"` and `[programName]="resolvedProgramName()"` to `<app-kp-cgspace-browse>` in `lab-report-form.component.html`. Compute `resolvedProgramName()` by matching `programCode()` against `api.dataControlSE.mySPsList()`, `initiativeId()`, or `SCIENCE_PROGRAM_DESCRIPTIONS` keys. Update unit tests in `lab-report-form.component.spec.ts` asserting that the inputs are bound and forwarded properly.
- **Implements:** `KPAM-R-2`, `KPAM-AC-2`, `KPAM-AC-4`, Defect Gate `D6`.
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`
- **Depends on:** `KPAM-T-2`
- **Blocks:** `KPAM-T-4`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `programCode` and `programName` bound to `app-kp-cgspace-browse` in `lab-report-form`.
  - [x] Unit test asserting input binding passes: `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`.
  - [x] Lint passes: `npx ng lint --lint-file-patterns="src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/**/*.ts"`.

---

### `KPAM-T-4` — Comprehensive test suite and regression verification [x]

- **Type:** `tests`
- **Description:** Run full test suites across server discovery proxy and client browse component. Verify zero regressions in multi-repository fan-out (`cgspace`, `melspace`, `worldfish`), deduplication, pagination, and error handling. Confirm database migrations status is clean (`npm run migration:check`).
- **Implements:** Full validation of Defect Gates `D1` through `D6`, `KPAM-AC-1` through `KPAM-AC-7`.
- **Files (expected):** All test suites.
- **Depends on:** `KPAM-T-3`
- **Blocks:** None.
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `systematic-debugging`
- **Definition of done:**
  - [x] Server Jest: `npx jest src/api/results/results-knowledge-products/cgspace-discovery/ --silent --reporters=summary` (100% pass).
  - [x] Server ESLint: `npx eslint "src/api/results/results-knowledge-products/cgspace-discovery/**/*.ts" --quiet` (0 errors).
  - [x] Client Jest: `npx jest src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/ src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/ --silent --reporters=summary` (100% pass).
  - [x] Client Lint: `npx ng lint --quiet` (0 errors).
  - [x] Migrations check: `npm run migration:check` (0 pending for KPAM).

---

## 4. Dependency graph

```text
KPAM-T-1 (Server metadata extraction)
   └── KPAM-T-2 (Client browse component matching, badge & soft sort)
         └── KPAM-T-3 (Host context binding in lab-report-form)
               └── KPAM-T-4 (Full regression & integration verification)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `KPAM-TEST-1` | unit (server) | `KPAM-R-1`, `KPAM-AC-1`, `KPAM-AC-7`, Gate `D1` | `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.spec.ts` |
| `KPAM-TEST-2` | unit (client) | `KPAM-R-3`, `KPAM-AC-4`, Gate `D2` | `onecgiar-pr-client/.../kp-cgspace-browse.component.spec.ts` (`matchesProgram` normalization) |
| `KPAM-TEST-3` | unit (client) | `KPAM-R-4`, `KPAM-R-5`, `KPAM-AC-2`, Gates `D3`, `D4` | `onecgiar-pr-client/.../kp-cgspace-browse.component.spec.ts` (badge rendering & non-restriction) |
| `KPAM-TEST-4` | unit (client) | `KPAM-R-6`, `KPAM-AC-3` | `onecgiar-pr-client/.../kp-cgspace-browse.component.spec.ts` (soft-boost sorting) |
| `KPAM-TEST-5` | unit (client) | `KPAM-R-7`, `KPAM-AC-5`, `KPAM-AC-6` | `onecgiar-pr-client/.../kp-cgspace-browse.component.spec.ts` (match counter & toggle chip) |
| `KPAM-TEST-6` | unit (client) | `KPAM-R-2`, `KPAM-AC-2`, Gate `D6` | `onecgiar-pr-client/.../lab-report-form.component.spec.ts` (host input forwarding) |
| `KPAM-TEST-7` | integration | Multi-repo fan-out & dedup regression (`D5`) | `onecgiar-pr-server/.../cgspace-discovery.service.spec.ts` |
