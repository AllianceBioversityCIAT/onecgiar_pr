# Tasks — IPSR empty-state check counts unsaved rows

## 1. Scope of this task list

- **Module / feature:** `ipsr` (client) — Step 1 Facilitators/Experts, Step 3 Current Use Actors/Organizations/Other
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Owner / driver:** santiago.sanchez@cgiar.org
- **Status:** ready
- **Depth:** Lite · **Mode:** Bug · **Budget:** 6 tasks / ~110 LOC / 3 review rounds (design §11, revised after Pivot 2 2026-09-28 — see `execution.md` → Pivot Record 1 and Pivot Record 2)

## 2. Pre-flight checklist

- [x] `proposal.md` approved (2026-09-28).
- [x] Root cause confirmed (proposal Bug Diagnosis): `is_active` starts `undefined`, truthy check drops it.
- [x] No server, DTO, or green-check change.
- [x] `requirements.md` / `design.md` / `tasks.md` approved (2026-09-28).

## 3. Task list

### `IPSR-ESC-T-1` — Regression tests for the three affected files (RED) `[x]`

- **Type:** `tests`
- **Implements:** `IPSR-ESC-R-1` (1.1, incl. its `AND IT MUST` on all three surfaces)
- **Files:**
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/step-n1.component.spec.ts`
  - `.../pages/step-n1/components/step-n1-experts/step-n1-experts.component.spec.ts`
  - `.../pages/step-n3/components/step-n3-current-use/step-n3-current-use.component.spec.ts`
- **Description:** in each file, add one case alongside the existing `hasElementsWithId` tests (`step-n1.component.spec.ts:384`, `step-n1-experts.component.spec.ts:66`, `step-n3-current-use.component.spec.ts:76`):
  | File | New case |
  |---|---|
  | `step-n1.component.spec.ts` | `readOnly = false`; `list = [{}, { is_active: false }]` (mirrors a freshly pushed `ExpertWorkshopOrganized` with no `is_active` set, plus one deleted row) → `hasElementsWithId(list, 'is_active')` expect `1` |
  | `step-n1-experts.component.spec.ts` | `readOnly = false`; `list = [{ id: 1 }, { id: 2, is_active: false }]` → `hasElementsWithId(list, 'name')` expect `1` |
  | `step-n3-current-use.component.spec.ts` | `readOnly = false`; `list = [{ id: 1 }, { id: 2, is_active: false }]` → `hasElementsWithId(list, 'id')` expect `1` |
  Do not modify any existing test — all current fixtures set `is_active` explicitly to `true`/`false` and must stay green unchanged.
- **Depends on:** — · **Blocks:** `IPSR-ESC-T-2` · **Estimate:** S · **Skills:** `angular-developer`, `tdd`
- **Verification:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="(step-n1|step-n1-experts|step-n3-current-use).component.spec"`
  - **Must be RED on current code**: each new case's item with no `is_active` is dropped by the current `item.is_active` truthy filter, so the count comes back one short of expected.
  - **Input that makes it fail:** an item with `is_active` omitted (not `false`, not `true`) in the edit-mode (`readOnly = false`) branch.
  - **Disqualifier:** if a new case passes before `IPSR-ESC-T-2`, it is not exercising the `undefined` path — check the fixture has no `is_active` key at all (not `is_active: undefined` written explicitly, which some strict-equality mocks may still special-case; use plain omission).

### `IPSR-ESC-T-2` — Apply the `!= false` fix in the three files (GREEN) `[x]`

- **Type:** `client`
- **Implements:** `IPSR-ESC-R-1`, `IPSR-ESC-DD-1`
- **Files:**
  - `step-n1.component.ts:61` — `list.filter(item => item.is_active)` → `list.filter(item => item.is_active != false)`
  - `step-n1-experts.component.ts:37` — same change
  - `step-n3-current-use.component.ts:40` — same change
- **Depends on:** `IPSR-ESC-T-1` · **Blocks:** — · **Estimate:** S · **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] All `IPSR-ESC-T-1` cases GREEN; every pre-existing case in the same three spec files stays green, unchanged.
  - [ ] `npx ng lint --quiet` clean.
  - [ ] The `readOnly` branch line (`item[attr]`) in all three files is untouched (diff review — one line changed per file, not two).
  - [ ] **Manual check at the HITL pause (no automated gate — requirements "Defect Classes"):** on a local build, reproduce scenario 1.1 — add a Facilitator row in IPSR Step 1, fill it in, confirm "No facilitators provided" no longer shows. Report as not verified if no editable package is available — do not mark as passed without doing it.
- **Verification:**
  - `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="(step-n1|step-n1-experts|step-n3-current-use).component.spec"`
  - `cd onecgiar-pr-client && npx ng lint --quiet`
  - **Input that makes it fail:** reverting any of the three lines back to `item.is_active` turns that file's new T-1 case red again.
  - **Disqualifier:** never run the unscoped suite (memory rule: no full `npx jest`); a green run of anything other than the three named specs is not evidence for this task.

### `IPSR-ESC-T-3` — Regression tests for the blank-placeholder-row gap (RED) `[x]`

- **Type:** `tests`
- **Implements:** `IPSR-ESC-R-2` (2.1, 2.2, 2.3)
- **Files:**
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/step-n1.component.spec.ts`
  - `.../pages/step-n3/components/step-n3-current-use/step-n3-current-use.component.spec.ts`
- **Description:** add cases proving a blank placeholder row (structurally identical to what `getSectionInformation()` auto-pushes) does NOT count once `significantFields` is passed, and DOES count once its primary field is set:
  | File | New cases |
  |---|---|
  | `step-n1.component.spec.ts` | (a) `readOnly = false`; `list = [{}]`; `hasElementsWithId(list, 'result_ip_expert_workshop_organized_id', ['first_name','last_name','email','workshop_role'])` expect `0` (blank placeholder, no significant field set). (b) same list shape but `list = [{ first_name: 'Ana' }]` → expect `1` (Scenario 2.2). |
  | `step-n3-current-use.component.spec.ts` | Actors: (a) `list = [{}]`; `hasElementsWithId(list, 'result_ip_actors_id', ['actor_type_id'])` expect `0`. (b) `list = [{ actor_type_id: 3 }]` → expect `1`. Organizations: (c) `list = [{}]`; `hasElementsWithId(list, 'id', ['institution_types_id'])` expect `0`. (d) `list = [{ institution_types_id: 12 }]` → expect `1`. |
  Do not modify any existing test (including the `IPSR-ESC-T-1` cases from the previous attempt) — every 2-arg call (Experts, Other quantitative measures) and every existing fixture must stay green unchanged, proving `significantFields` is opt-in and does not leak.
- **Depends on:** `IPSR-ESC-T-2` (PASSed) · **Blocks:** `IPSR-ESC-T-4` · **Estimate:** S · **Skills:** `angular-developer`, `tdd`
- **Verification:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="(step-n1|step-n1-experts|step-n3-current-use).component.spec"`
  - **Must be RED on current code** for the "expect 0" cases: the current `hasElementsWithId(list, attr)` 2-arg signature ignores a 3rd argument entirely (JS discards extra args), so `item.is_active != false` alone is `true` for `{}` and the count comes back `1`, not the expected `0`.
  - **Disqualifier:** the "expect 1" cases (b) and (d) will already pass on current code (a filled significant field is also `is_active != false`) — that is expected and fine; only the "expect 0" cases are the RED signal for this task.

### `IPSR-ESC-T-4` — Add `significantFields` parameter and pass it at the 3 call sites (GREEN) `[x]`

- **Type:** `client`
- **Implements:** `IPSR-ESC-R-2`
- **Files:**
  - `step-n1.component.ts:61` — signature + body per design.md §8.1
  - `step-n3-current-use.component.ts:40` — signature + body per design.md §8.1
  - `step-n1.component.html:74` — pass `['first_name', 'last_name', 'email', 'workshop_role']`
  - `step-n3-current-use.component.html:89` — pass `['actor_type_id']`
  - `step-n3-current-use.component.html:143` — pass `['institution_types_id']`
- **Do NOT touch:** `step-n1-experts.component.ts`/`.html` (Experts stays on the plain 2-arg `IPSR-ESC-R-1` fix); `step-n3-current-use.component.html:173` (Other quantitative measures, same reason)
- **Depends on:** `IPSR-ESC-T-3` · **Blocks:** — · **Estimate:** S · **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] All `IPSR-ESC-T-3` cases GREEN; every pre-existing case (including `IPSR-ESC-T-1`'s) in the same two spec files, and every case in `step-n1-experts.component.spec.ts`, stays green unchanged.
  - [ ] `npx ng lint --quiet` clean.
  - [ ] The `readOnly` branch line is untouched in both `.ts` files.
  - [ ] `step-n1-experts.component.ts`/`.html` and the Other-quantitative-measures call site are byte-identical to before this task (diff review).
  - **Manual check at the HITL pause (no automated gate):** on a local build, (1) reproduce scenario 1.1/2.2 — fill in a Facilitator/Actor/Organization row, confirm the empty state disappears; (2) reproduce scenario 2.1 — save a section down to zero real rows, reload, confirm the auto-added blank row still shows "No … provided"; (3) confirm Experts and Other quantitative measures still behave per the original `IPSR-ESC-R-1` fix. Report as not verified if no editable package is available.
- **Verification:**
  - `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="(step-n1|step-n1-experts|step-n3-current-use).component.spec"`
  - `cd onecgiar-pr-client && npx ng lint --quiet`
  - **Disqualifier:** never run the unscoped suite; a green run of anything other than the three named specs is not evidence.

### `IPSR-ESC-T-5` — Regression tests for `innovation-use-form.component.ts` (RED) `[x]`

- **Type:** `tests`
- **Implements:** `IPSR-ESC-R-3` (3.1, 3.2, 3.3)
- **Files:** `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.spec.ts`
- **Description:** add cases mirroring `IPSR-ESC-T-3`'s pattern, for this file's 3 "current use" call sites:
  | Case | Fixture | Call | Expected |
  |---|---|---|---|
  | Actors blank | `readOnly=false`; `[{}]` | `hasElementsWithId(list, 'result_actors_id', ['actor_type_id'])` | `0` |
  | Actors filled | `[{ actor_type_id: 3 }]` | same call | `1` |
  | Organizations blank | `[{}]` | `hasElementsWithId(list, 'id', ['institution_types_id'])` | `0` |
  | Organizations filled | `[{ institution_types_id: 12 }]` | same call | `1` |
  | Measures blank-but-unit-prefilled | `[{ unit_of_measure: '# of hectares' }]` (mirrors the real auto-pushed placeholder — `quantity` unset) | `hasElementsWithId(list, 'result_ip_measure_id', ['quantity'])` | `0` |
  | Measures filled | `[{ unit_of_measure: '# of hectares', quantity: 5 }]` | same call | `1` |
  Do not modify any existing test in this file (including the `hasElementsWithId - non-array input` describe block at line 643, and the readOnly-branch tests at lines 245/319). Do not touch the 2030-projection call sites or any other file.
- **Depends on:** `IPSR-ESC-T-4` (PASSed) · **Blocks:** `IPSR-ESC-T-6` · **Estimate:** S · **Skills:** `angular-developer`, `tdd`
- **Verification:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="innovation-use-form.component.spec"`
  - **Must be RED** for the 3 "expect 0" cases — current 2-arg signature ignores a 3rd argument, so `item && item.is_active != false` alone is `true` for `{}` / `{ unit_of_measure: '# of hectares' }`.
  - The "expect 1" cases are expected to already pass (not a defect) — same disqualifier pattern as `IPSR-ESC-T-3`.

### `IPSR-ESC-T-6` — Add `significantFields` to `innovation-use-form.component.ts` (GREEN) `[x]`

- **Type:** `client`
- **Implements:** `IPSR-ESC-R-3`
- **Files:**
  - `innovation-use-form.component.ts:507` — signature + body per design.md §8.3 (preserve `Array.isArray` and `item &&` guards)
  - `innovation-use-form.component.html:249` — pass `['actor_type_id']`
  - `innovation-use-form.component.html:333` — pass `['institution_types_id']`
  - `innovation-use-form.component.html:369` — pass `['quantity']`
- **Do NOT touch:** lines 641/726/766 (2030-projection call sites); any file under `pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/`
- **Depends on:** `IPSR-ESC-T-5` · **Blocks:** — · **Estimate:** S · **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] All `IPSR-ESC-T-5` cases GREEN; every pre-existing case in the same spec file stays green unchanged.
  - [ ] `npx ng lint --quiet` clean.
  - [ ] The `readOnly` branch and the `Array.isArray`/`item &&` guards are untouched.
  - [ ] The 3 "2030" call sites and the Results-module usage are byte-identical to before this task (diff review).
  - **Manual check at the HITL pause:** in IPSR Step 1's "Targeted innovation use" section, click "Add actor" without filling anything, confirm "No actors provided" shows; fill in Actor type, confirm it disappears; same for Organizations and Other quantitative measures (using Quantity, not Unit of measure, as the trigger).
- **Verification:**
  - `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="innovation-use-form.component.spec"`
  - `cd onecgiar-pr-client && npx ng lint --quiet`
  - **Disqualifier:** never run the unscoped suite.

## 4. Dependency graph

```text
IPSR-ESC-T-1 (regressions — RED)              [x] PASS
   └── IPSR-ESC-T-2 (3× one-line fix — GREEN)  [x] PASS (manual check confirmed 2026-09-28)
          └── IPSR-ESC-T-3 (regressions for R-2 — RED)          [x] PASS
                 └── IPSR-ESC-T-4 (significantFields param — GREEN)  [x] PASS (manual check confirmed 2026-09-28)
                        └── IPSR-ESC-T-5 (regressions for R-3 — RED)  [x] PASS
                               └── IPSR-ESC-T-6 (significantFields in innovation-use-form — GREEN)  [x] PASS (manual check confirmed 2026-09-28)
```

## 5. Coverage closure (scenario / clause → task)

| Requirement clause | Owned by |
|---|---|
| R-1 · 1.1 unsaved row with data counts as present (Facilitators) | T-1 `step-n1` case → T-2 |
| R-1 · 1.1 `AND IT MUST` also apply to Experts | T-1 `step-n1-experts` case → T-2 |
| R-1 · 1.1 `AND IT MUST` also apply to Actors/Organizations/Other (Step 3) | T-1 `step-n3-current-use` case → T-2; manual check covers the actual rendered lists (Actors, Organizations, Other all use the same helper on the same component) |
| R-1 · 1.2 all-deleted still shows empty state | Existing `is_active: false` fixtures in each spec file, unchanged |
| R-1 · 1.3 read-only branch unaffected | Existing readOnly-branch test in each spec file, unchanged; diff-review checklist item in T-2 |
| R-2 · 2.1 blank placeholder row (no significant field) does not count | T-3 "expect 0" cases (Facilitators, Actors, Organizations) → T-4 |
| R-2 · 2.2 filling the primary field makes it count | T-3 "expect 1" cases → T-4; same as R-1 1.1 once the field is set |
| R-2 · 2.3 Experts / Other quantitative measures unaffected | Existing T-1 cases + `step-n1-experts.component.spec.ts` suite, unchanged (no `significantFields` argument passed); diff-review checklist item in T-4 |
| R-3 · 3.1 blank placeholder (Actors/Organizations/Measures in `innovation-use-form.component.ts`) does not count | T-5 "expect 0" cases → T-6 |
| R-3 · 3.2 filling the primary field makes it count | T-5 "expect 1" cases → T-6 |
| R-3 · 3.3 2030 projection / Results-module usage unaffected | Existing `innovation-use-form.component.spec.ts` suite (2030-branch tests, non-array-input tests), unchanged; diff-review checklist item in T-6 |

## 6. Commit (after user go-ahead only)

`🔧 fix(ipsr): count unsaved rows as present in the No X provided empty-state check` — no apostrophes, `$` or quotes in the subject (Jenkins). No ticket recorded yet (proposal Document Control).
