# Module Spec — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `results` — `kp-bare-handle-format` (bugfix)
- **Linked spec:** `docs/specs/bugfix/kp-bare-handle-format/requirements.md` + `design.md`
- **Depth:** Lite (Bug Mode)
- **Owner / driver:** M.Giraldo@cgiar.org
- **Status:** done

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions resolved or explicitly accepted as risk (`KPH-OQ-1` — optional live QA, not blocking).
- [x] No CLARISA dependency.
- [x] No conflicting in-flight spec (checked `docs/specs/` for other Manual-entry / `kp-handle` work — none active).
- [x] No migration involved — `npm run migration:check` not applicable.

## 3. Task list

### [x] `KPH-T-1` — Extend `KP_HANDLE_REGEX` and add `normalizeKpHandle()`

- **Type:** `client`
- **Description:** In `kp-handle.validator.ts`, add the bare-handle alternative `(?:10568|20\.500\.11766|20\.500\.12348)\/\d+` to `KP_HANDLE_REGEX` (existing URL alternatives untouched), and add a new exported pure function `normalizeKpHandle(handle: string): string` that rewrites a matched bare handle to its canonical URL (`10568` → `https://cgspace.cgiar.org/handle/<prefix>/<digits>`; `20.500.11766` / `20.500.12348` → `https://hdl.handle.net/<prefix>/<digits>`) and returns any other input unchanged.
- **Implements:** `KPH-R-1`, `KPH-R-2`, `KPH-R-5`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/kp-handle.validator.ts` (+ new/updated spec file for this module, e.g. `kp-handle.validator.spec.ts` if one does not already exist)
- **Depends on:** `—`
- **Blocks:** `KPH-T-2`, `KPH-T-3`
- **Estimate:** `S`
- **Skills:** `angular-developer` (Skill Map — any Jest work in `onecgiar-pr-client`), `tdd` (pure logic change with a mandatory red→green regression test — write the failing test first)
- **Definition of done:**
  - [ ] `validateKpHandle('10568/183891')`, `validateKpHandle('20.500.11766/9021')`, `validateKpHandle('20.500.12348/9021')` all return `{ status: false, message: '' }` — **regression test, red before this task's change, green after** (Bug Mode requirement).
  - [ ] `normalizeKpHandle('10568/183891')` → `'https://cgspace.cgiar.org/handle/10568/183891'`; `normalizeKpHandle('20.500.11766/9021')` → `'https://hdl.handle.net/20.500.11766/9021'`.
  - [ ] `normalizeKpHandle('https://cgspace.cgiar.org/items/<uuid>')` returns the input unchanged (already-URL passthrough).
  - [ ] `validateKpHandle('99999/1')` and `validateKpHandle('not-a-handle')` still return `{ status: true, ... }` (negative case — `KPH-R-5`, no over-acceptance).
  - [ ] All pre-existing accepted URL forms in the module's spec still pass unchanged (no regression).
  - [ ] Lint clean (`npx ng lint --quiet`); no coverage regression on this file.
  - [ ] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` (e.g. `🔧 fix(kp-handle.validator): accept bare CGSpace/MELSpace/WorldFish handle format`).

### [x] `KPH-T-2` — Route `report-result-form.component.ts`'s Sync through the shared validator

- **Type:** `client`
- **Description:** In `report-result-form.component.ts`'s `GET_mqapValidation()` (~lines 502-533), remove the inline duplicated `regex`/message block and replace it with a call to `validateKpHandle(this.resultLevelSE.resultBody.handler)` (already imported at line 20). On success, call `normalizeKpHandle(...)`, assign the normalized value back to `resultLevelSE.resultBody.handler`, then proceed to `api.resultsSE.GET_mqapValidation(normalized)` as today.
- **Implements:** `KPH-R-3`, scenario "Bare CGSpace handle resolves (the reported case)", scenario "Unsupported handle still rejected"
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-creator/components/report-result-form/report-result-form.component.ts`, `report-result-form.component.spec.ts`
- **Depends on:** `KPH-T-1`
- **Blocks:** `—`
- **Estimate:** `S`
- **Skills:** `angular-developer`, `systematic-debugging` (confirm no other consumer of this handler relies on the pre-fix inline message wording before removing it)
- **Definition of done:**
  - [ ] **Regression test:** a new spec case setting `mockResultLevelService.resultBody.handler = '10568/183891'` and calling `component.GET_mqapValidation()` asserts no `mqapUrlError`, and that `mockApiService.resultsSE.GET_mqapValidation` is called with `'https://cgspace.cgiar.org/handle/10568/183891'` — **red before this task's change (repro of the exact reported bug), green after**.
  - [ ] Existing spec cases at `report-result-form.component.spec.ts:563-599` ("empty handler" / "invalid handler format" / "correct CGSpace handle format") still pass unchanged.
  - [ ] No literal duplicated regex remains in this file (`grep -c 'https:\\\\/\\\\/(?:(?:cgspace' report-result-form.component.ts` → `0`).
  - [ ] Lint clean; `npx jest --silent --no-coverage --testPathPattern="report-result-form.component.spec"` green.
  - [ ] Code merged via `🔧 fix(report-result-form): accept bare handle in Manual entry Sync and use the shared validator`.

### [x] `KPH-T-3` — Patch `result-creator.component.ts` and `aow-hlo-create-modal.component.ts` in place

- **Type:** `client`
- **Description:** In both files' `GET_mqapValidation()` (`result-creator.component.ts:439`, `aow-hlo-create-modal.component.ts:414`), replace the local `regex` literal with the same extended pattern from `KPH-T-1` (copied, not imported — matches `KPH-DD-1`), and insert a call to the newly-exported `normalizeKpHandle()` (imported from `kp-handle.validator.ts`) on the validated value before it is assigned to `handler` / `createResultBody().handler` and sent to each file's `GET_mqapValidation` call. No other logic in either handler changes.
- **Implements:** `KPH-R-4`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-creator/result-creator.component.ts` (+ spec), `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.ts` (+ spec)
- **Depends on:** `KPH-T-1`
- **Blocks:** `—`
- **Estimate:** `M` (two files, each a small mechanical patch + test)
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] **Regression test in each file's spec:** bare handle `'10568/183891'` (`result-creator`) and `'10568/183891'` (`aow-hlo-create-modal`, via `createResultBody().handler`) now pass validation and call the file's own `GET_mqapValidation` with the normalized URL — red before, green after.
  - [ ] Existing "empty handler" / "invalid format" / accepted-URL spec cases in both files' specs (`aow-hlo-create-modal.component.spec.ts:555-565` and the equivalent in `result-creator.component.ts`'s spec) still pass unchanged.
  - [ ] Negative case retained: an unsupported value (e.g. `99999/1`) still shows the existing unsupported-handle message in both files.
  - [ ] Lint clean; `npx jest --silent --no-coverage --testPathPattern="(result-creator|aow-hlo-create-modal).component.spec"` green.
  - [ ] Code merged via `🔧 fix(result-creator,aow-hlo-create-modal): accept bare CGSpace/MELSpace/WorldFish handle format`.

## 4. Dependency graph

```
KPH-T-1 (validator: regex + normalizeKpHandle)
   ├── KPH-T-2 (report-result-form — reported flow)
   └── KPH-T-3 (result-creator + aow-hlo-create-modal)
```

`KPH-T-2` and `KPH-T-3` are independent of each other once `KPH-T-1` lands — parallel-safe.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `KPH-TEST-1` | unit (client) | `KPH-R-1`, `KPH-R-2`, `KPH-R-5` | `kp-handle.validator.spec.ts` |
| `KPH-TEST-2` | unit (client) | `KPH-R-3`, `KPH-AC-1` | `report-result-form.component.spec.ts` |
| `KPH-TEST-3` | unit (client) | `KPH-R-4`, `KPH-AC-1`/`KPH-AC-2` | `result-creator.component.spec.ts` |
| `KPH-TEST-4` | unit (client) | `KPH-R-4`, `KPH-AC-1`/`KPH-AC-2` | `aow-hlo-create-modal.component.spec.ts` |

Client coverage must stay ≥ 50/60/60/60 (all four files already have specs; this only adds cases). No Cypress/E2E needed — see `design.md` §10 for why Jest is sufficient for this defect class.

## 6. Rollout & verification

- [ ] PR opened with the commit convention.
- [ ] CI green (lint, `npx jest --silent --reporters=summary --no-coverage`, build; `migration:check:ci` not applicable — no migration).
- [ ] Manual QA on `prtest.ciat.cgiar.org` (or equivalent test env): re-run the original repro — paste `10568/183891` into Manual entry, click Sync, confirm it resolves instead of showing the unsupported-handle error.
- [ ] `KPH-OQ-1`: if a MELSpace or WorldFish test item is available, repeat the manual QA with its bare handle.
- [ ] No downstream consumer notification needed (not a bilateral/platform-report field).

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped`.
- [ ] Update `onecgiar-pr-client/.../shared/report-result/CLAUDE.md`'s "Dónde se usa" / "Pendiente" notes: `report-result-form.component.ts`'s Manual-entry Sync now also uses `validateKpHandle`/`normalizeKpHandle`; `aow-hlo-create-modal.component.ts` and `result-creator.component.ts` still hold local regex copies, now current (bare-handle-aware) rather than stale.
- [ ] File a follow-up spec for the deferred de-duplication (`KPH-DD-1`) if the team decides to pursue it.

## 8. Roll-back plan

1. Revert the PR (single PR covers all three tasks — see Review Handoff).
2. No migration to revert, no feature flag to disable.
3. Confirm the three `GET_mqapValidation()` handlers return to rejecting bare handles (prior, if undesired, behavior) — not applicable to any payload contract, so no downstream notification needed.

---

## Required cross-references

- `docs/specs/bugfix/kp-bare-handle-format/requirements.md` and `design.md` (same folder).
- `docs/prd.md`, `docs/trd/trd.md` (MQAP integration).
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/CLAUDE.md`.
