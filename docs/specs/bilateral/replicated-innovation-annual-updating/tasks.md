# Tasks — Annual updating for replicated W3/Bilateral innovations

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `bilateral` + `results` / `replicated-innovation-annual-updating` |
| Linked spec | `requirements.md` (`BIL-RAU-R-1..R-11`) + `design.md` (`BIL-RAU-DD-1..DD-9`, premises `P-1..P-15`) |
| Owner / driver | Santiago Sanchez |
| Status | not-started |
| Budget (design §14) | 9 tasks · ~950 LOC incl. tests · ~14 review rounds. `/akili-execute` escalates if exceeded |
| Test commands (scoped only — never an unscoped suite) | Server: `npx jest --silent --reporters=summary --forceExit --testPathPattern="<file>"` · Client: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="<file>"` |

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Phase 1, 2026-09-29)
- [x] `design.md` approved (Phase 2, 2026-09-29)
- [x] Blocking open questions resolved (only `BIL-RAU-OQ-1`, the Jira id, remains, and it does not block)
- [x] No CLARISA dependency
- [x] No migration
- [ ] No conflicting in-flight spec: check `git status`. The working tree currently has uncommitted `bilateral-overview` changes from another spec, so do not mix them into these commits.

## 3. Task list

### [x] `BIL-RAU-T-1` — Optional `EntityManager` on the two discontinuation repositories

- **Type:** server
- **Description:** Add an optional trailing `manager` to `ResultsInvestmentDiscontinuedOptionRepository.inactiveData` and `ResultInnovationMergeSplitRepository.replaceForResult`, plus to the `findOne`/`update`/`save` path the helper will use. When `manager` is absent, SQL and behavior are identical to today (DD-6).
- **Implements:** NFR data integrity; enables `BIL-RAU-R-3`
- **Files:** `onecgiar-pr-server/src/api/results/results-investment-discontinued-options/results-investment-discontinued-options.repository.ts`, `…/result-innovation-merge-split/result-innovation-merge-split.repository.ts` (+ their specs)
- **Depends on:** — · **Blocks:** T-2, T-6
- **Estimate:** S · **Review:** checklist
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** calling each method with a mock `manager` must run the query on `manager.query`, not `this.query`. Called without it, it must use `this.query` with byte-identical SQL.
  - **Red run:** `npx jest … --testPathPattern="result-innovation-merge-split.repository|results-investment-discontinued-options.repository"` (new cases fail before the change)
  - **Disqualifier:** if a method opens its own `queryRunner`/transaction internally, stop and re-specify DD-6, because nesting would break atomicity.
  - **Consumers:** `results.service.ts` (`createResultGeneralInformation`), every other caller found by grepping both method names.
- **Definition of done:** tests green, existing repo specs unchanged, lint clean.

### [x] `BIL-RAU-T-2` — Extract `applyInnovationDiscontinuation` + `resolveDiscontinuationStatus`

- **Type:** server
- **Description:** Move `results.service.ts:832-896` (both branches) into a private helper, and move the status rule `949-956` into a pure function. `createResultGeneralInformation` calls both at the same points, without `manager`, and after the P2-3597 title check (DD-4). Add the **first positive tests** of the discontinued branch (P-14).
- **Implements:** `BIL-RAU-R-4` (S-4.1, S-4.2 rule), `BIL-RAU-R-9` (server side), `BIL-RAU-AC-8`, `AC-9`, `AC-15`
- **Files:** `onecgiar-pr-server/src/api/results/results.service.ts`, `…/result.spec.ts`
- **Depends on:** T-1 · **Blocks:** T-6
- **Estimate:** M · **Review:** full (shared writer)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** status table for types 7/2. `(No, 1) → 4`, `(Yes, 4) → 1`, `(Yes, 6) → 6`, `(Yes, 5) → 5`, `(Yes, 7) → 7`. For type 5, any input leaves the status unchanged. Discontinued branch: `inactiveData` is called with the ticked ids, and `replaceForResult` with the targets. Active branch: `inactiveData([])` and `replaceForResult([])`.
  - **Red run:** `npx jest … --testPathPattern="results/result.spec"` (the positive tests are new; the P2-3597 test at `result.spec.ts:1112-1187` must stay green **with its assertions unchanged**)
  - **Disqualifier:** if any existing assertion in `result.spec.ts` has to change, stop. That is a W1/W2 behavior change (R-9).
  - **Consumers:** `createResultGeneralInformation` only (new helper). The pure function is also consumed by T-6.
- **Definition of done:** helper and rule used by W1/W2; existing specs untouched and green; new cases green.

### [x] `BIL-RAU-T-3` — Relocate `rd-annual-updating` to `shared/components/annual-updating/`

- **Type:** client
- **Description:** Move the component (ts/html/scss/2 specs/`CLAUDE.md`) to `shared/components/annual-updating/`, keeping selector `app-rd-annual-updating` so no template changes. Replace the `GeneralInfoBody` page-model import with a local structural interface. Fix the relative imports and point `rd-general-information.module.ts` at the new path. This is a pure move with no behavior change (DD-1).
- **Implements:** prerequisite for `BIL-RAU-R-1` (P-2); `BIL-RAU-R-9`
- **Files:** `onecgiar-pr-client/src/app/shared/components/annual-updating/**`, `…/rd-general-information/rd-general-information.module.ts`, removal of `…/rd-general-information/components/rd-annual-updating/`
- **Depends on:** — · **Blocks:** T-4
- **Estimate:** S · **Review:** skip-eligible if `git diff -M` shows ≥95% similarity renames and only import lines changed; otherwise checklist
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:** `git diff -M --stat` shows the files as **renames**, and any non-import line changed fails the task. `rd-annual-updating.component.spec.ts`, `rd-annual-updating.merge-split.spec.ts` and `rd-general-information.component.spec.ts` stay green.
  - **Red run:** n/a (no test gate; a pure move). Gate: those 3 specs green + `npm run build` (templates are type-checked only by the build, per `src/CLAUDE.md` §21.7).
  - **Disqualifier:** if the structural interface forces a change in `rd-general-information.component.ts` beyond the import, re-specify DD-1.
  - **Consumers:** `rd-general-information.module.ts`, `rd-general-information.component.html:1`.
- **Definition of done:** moved; build green; the 3 specs green with unchanged assertions; `CLAUDE.md` moved and `Verified:` re-stamped.

### [x] `BIL-RAU-T-4` — Context input + `answerChange` output on the shared component

- **Type:** client
- **Description:** Add `@Input() context?: AnnualUpdatingContext` (`resultId`, `resultTypeId`, `phaseYear`, `storedIsDiscontinued`, `isAdmin`, `editable`) and `@Output() answerChange`. Route every read listed in the scout report (Q4) through one resolver: context first, current source as fallback. Keep the construction-time resolution, and re-resolve `usesStatusTriggerWording` / `headerLabel` / `options` in `ngOnChanges` when `context` is set (DD-2). Emit `answerChange` on the radio, checkbox, description and target changes and on reopen.
- **Implements:** `BIL-RAU-R-2` (S-2.1), `BIL-RAU-R-6` (S-6.1, S-6.2 client side), `BIL-RAU-R-3` S-3.1 clause "IT MUST hold … tinyint", `BIL-RAU-R-9`, `AC-3`, `AC-5` (unit part), `AC-11`, `AC-12` (UI part)
- **Files:** `shared/components/annual-updating/rd-annual-updating.component.{ts,html}`, new `rd-annual-updating.context.spec.ts`
- **Depends on:** T-3 · **Blocks:** T-8
- **Estimate:** M · **Review:** full
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** with `context = { resultTypeId: 7, phaseYear: 2026, storedIsDiscontinued: 1, isAdmin: false, editable: true }` and **no** `dataControlSE.currentResult`: `usesStatusTriggerWording` is true, `lockedByDiscontinuation` is true, and `canReopenDiscontinuation` is false. The same with `isAdmin: true` gives lock false and reopen true. Type 2 gives the legacy labels "Innovation use is …". `storedIsDiscontinued: null` gives no lock. Picking No while stored active gives no lock (S-6.1). Each mutation emits `answerChange` exactly once.
  - **Red run:** `npx jest … --testPathPattern="annual-updating"` (the new context spec fails before; the two moved specs stay green, unchanged)
  - **Disqualifier:** if keeping the W1/W2 specs green requires editing any of their assertions, stop (R-9). If emitting from the merge/split handlers reintroduces a new-reference-per-CD pattern (NG0103, see the component `CLAUDE.md`), stop and re-design the emission.
  - **Consumers:** `rd-general-information` (no binding change), T-8 wrapper.
  - ⚠️ **Cannot prove:** the rendered radio selection and the NG0103 loop (jsdom does not run the real multi-select). Owned by T-9's browser check.
- **Definition of done:** new spec green; old specs green, unchanged; `CLAUDE.md` gains a "Context input" section.

### [x] `BIL-RAU-T-5` — Bilateral GET returns the stored answer

- **Type:** server
- **Description:** `getCommonFieldsBilateralResultById` selects `r.is_replicated`, `r.is_discontinued`. `getBilateralResultById` adds `annualUpdating: { discontinued_options, merge_split_targets }` for types 7/2 only, where `discontinued_options` means active stored rows `{investment_discontinued_option_id, description}` and `merge_split_targets` comes from `findActiveByResult`. For other types the key is absent (DD-8).
- **Implements:** `BIL-RAU-R-3` S-3.1 (load half), `BIL-RAU-R-1` (data for the gate)
- **Files:** `onecgiar-pr-server/src/api/results/result.repository.ts`, `results.service.ts` (`getBilateralResultById`), their specs
- **Depends on:** — · **Blocks:** T-7
- **Estimate:** S · **Review:** checklist
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Verification:**
  - **Falsifier:** a type-7 fixture with 2 active + 1 inactive reason rows returns exactly the 2 active ones. A type-5 fixture has no `annualUpdating` key and no reasons/targets query called. `commonFields.is_replicated` equals the DB value for rows with `0` and with `1` (not a constant).
  - **Red run:** `npx jest … --testPathPattern="results/result.spec|result.repository"`
  - **Disqualifier:** if `getCommonFieldsBilateralResultById` is shared with a consumer whose fixture breaks on new columns, fix the fixture; do not drop the column.
  - **Consumers:** `BilateralCreationService.loadResult`, plus any other caller of `getCommonFieldsBilateralResultById` (grep).
- **Definition of done:** additive fields, tests green, Swagger response note updated if one exists.

### [x] `BIL-RAU-T-6` — Bilateral writer accepts and persists the answer

- **Type:** server
- **Description:** Extend `UpdateBilateralGeneralInfoDto` with the three optional keys. In `updateBilateralGeneralInfo`:
  - the "nothing to save" guard counts `is_discontinued !== undefined`;
  - after `assertCenterWrite`, when `'is_discontinued' in dto` and the type is 7/2 and the value is a boolean, the status comes from `resolveDiscontinuationStatus`, and `is_discontinued` + `status_id` go into `updates`;
  - `applyInnovationDiscontinuation(…, manager)` runs **inside** the existing transaction;
  - the "No changes" early return must not fire;
  - the response returns `status_id` + `is_discontinued`.

  When the key is absent, no discontinuation code runs (DD-7).
- **Implements:** `BIL-RAU-R-3` (S-3.2 incl. "BUT must NOT treat a payload without the keys as Yes", S-3.3 incl. "BUT must NOT be rejected"), `BIL-RAU-R-4` (S-4.1, S-4.2 incl. "BUT must NOT move 5/6/7 to 1"), `BIL-RAU-R-10`, `AC-6`, `AC-7`, `AC-8`, `AC-9`, `AC-16`
- **Files:** `onecgiar-pr-server/src/api/results/dto/update-bilateral-general-info.dto.ts`, `results.service.ts`, `result.spec.ts` (the `updateBilateralGeneralInfo` describe near line 2291)
- **Depends on:** T-1, T-2 · **Blocks:** T-8
- **Estimate:** M · **Review:** lenses (status transition + data wipe risk)
- **Skills:** `nestjs-expert`, `tdd`, `api-design-principles`
- **Verification:**
  - **Falsifier:**
    - (a) title-only payload on a stored-4 result: `inactiveData`, `replaceForResult` never called, and `updates` has no `status_id` / `is_discontinued`;
    - (b) `{ is_discontinued: true, discontinued_options: [1 ticked] }` only: 200 (not 400 "Nothing was saved"), status 4, helper called with `manager`;
    - (c) `{ is_discontinued: false }` on status 6: `status_id` stays 6;
    - (d) type 5 + `is_discontinued: true`: helper not called, status unchanged;
    - (e) non-admin at status 5: 403 and no repo write;
    - (f) the helper throws inside the transaction: the transaction rejects and no partial `Result` update is committed (mocked `manager`).
    - (g) *(added 2026-09-29, owner decision, S-11.3)*: `{ is_discontinued: true }` with `discontinued_options` missing or `[]` (type 7/2) returns 400 "Please provide a reason." before the transaction. No repo write happens and the helper is not called. `{ is_discontinued: false }` with no reasons is still accepted.
  - **Red run:** `npx jest … --testPathPattern="results/result.spec"`
  - **Disqualifier:** if (f) cannot be made atomic because the helper's `findOne`/`save` escapes `manager`, stop. T-1 is incomplete.
  - **Consumers:** client `BilateralApiService.PATCH_generalInfo` (T-7/T-8); the existing `updateBilateralGeneralInfo` tests must stay green unchanged.
- **Definition of done:** all six cases green; the existing bilateral general-info tests unchanged and green; DTO documented with Swagger decorators.

### [x] `BIL-RAU-T-7` — Bilateral client plumbing: signals, status refresh, key-scoped read-only exemption

- **Type:** client
- **Description:**
  - **`BilateralCreationService`**: signals `isReplicated`, `storedIsDiscontinued` (raw, normalized by consumers), `storedDiscontinuedOptions`, `storedMergeSplitTargets` from the T-5 payload; `setResultStatus(id)`.
  - **`BilateralAutoSaveService`**: map the three keys to `generalInfo` in `FIELD_ENDPOINT_KEYS`, and add `setReadOnlyExemptions(keys)`. `updateField` / `updateFieldsBatch` let only exempt keys through while `isReadOnly()`.
  - **Creator**: the read-only gate becomes an `effect` on `resultStatusId` (verify P-10 first and record it). Exemptions are set to the three keys iff `rolesSE.isAdmin && status === 4 && isReplicated && type ∈ {7,2}`, and cleared otherwise (DD-5, DD-9).
- **Implements:** `BIL-RAU-R-6` (S-6.3 incl. "BUT must NOT make the other fields editable or saveable", "editor MUST become editable without a manual reload"), `AC-17`
- **Files:** `pages/bilateral/services/bilateral-creation.service.ts`, `bilateral-auto-save.service.ts`, `pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts` (+ specs)
- **Depends on:** T-5 (payload shape; can start on fixtures) · **Blocks:** T-8
- **Estimate:** M · **Review:** full (autosave is shared by every bilateral section)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:**
    - autosave read-only + exemption `[is_discontinued]`: `updateField('title', …)` stages nothing, and `updateField('is_discontinued', false)` stages it;
    - with no exemption set, read-only drops both, as today;
    - creator with status 4 + admin + replicated type 7: exemptions are the three keys;
    - the same as non-admin, or as admin on a non-replicated result: no exemptions;
    - `setResultStatus(1)` from 4: the read-only gate flips to editable with no reload.
  - **Red run:** `npx jest … --testPathPattern="bilateral-auto-save|bilateral-creation|bilateral-result-creator"`
  - **Disqualifier:** if P-10 shows `setReadOnly` is driven from a place where an effect would re-run on every section's own status updates and cause save storms, stop and re-design DD-9.
  - **Consumers:** every bilateral section using `BilateralAutoSaveService` (`section-*`, `type-*`). Their specs must stay green.
- **Definition of done:** tests green; the `bilateral-result-creator/CLAUDE.md` and autosave notes updated with the exemption rule.

### [x] `BIL-RAU-T-8` — Bilateral wrapper `app-bilateral-annual-updating` mounted in Section 1

- **Type:** client
- **Description:** New standalone wrapper (design §6.2).
  - **Load:** calls `GET_investmentDiscontinuedOptions(type, reportingYear)` and merges the stored reasons. `loaded` signal; a failed load shows `app-alert-status status="error"` and blocks writes.
  - **Context:** builds `context` for `app-rd-annual-updating`, with `editable = isEditableByCenterUser() || (isAdmin && status === 4)`.
  - **Yes:** stages the Yes batch.
  - **No:** stages nothing. The secondary button **Mark as discontinued** is enabled only when the answer is complete, and a Spartan `hlm-dialog` confirm (pattern of `bilateral-change-result-type-dialog`) stages all three keys in one batch and flushes. Cancel sends nothing.
  - **After save:** calls `setResultStatus` from the response.
  - **MDS:** group `'annual-updating'` items, set only while rendered, `[]` otherwise.
  - **Mount:** at the top of `section-general-info` under `@if (isReplicatedInnovation())`.
- **Implements:** `BIL-RAU-R-1` (S-1.1, S-1.2 incl. "BUT must NOT add any MDS item … or change Submit"), `BIL-RAU-R-2` (S-2.2 incl. "BUT must NOT offer the result itself": catalogue reused, asserted via the excluded code param), `BIL-RAU-R-5` (S-5.1), `BIL-RAU-R-7` (S-7.1), `BIL-RAU-R-11` (S-11.1 incl. "BUT must NOT be possible to confirm with zero reasons", S-11.2), `AC-1`, `AC-2`, `AC-4` (unit), `AC-10`, `AC-13`, `AC-18`, `AC-19`
- **Files:** `pages/bilateral/components/bilateral-annual-updating/**` (+ `CLAUDE.md`), `pages/bilateral/components/section-general-info/section-general-info.component.{ts,html}` (+ spec)
- **Depends on:** T-4, T-6 (contract), T-7 · **Blocks:** T-9
- **Estimate:** L · **Review:** full
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `tdd`
- **Verification:**
  - **Falsifier:**
    - (a) replicated type 7: wrapper rendered first in Section 1. `is_replicated: 0`, or type 5: not rendered and the `'annual-updating'` MDS group is `[]`, with the percentage equal to the baseline fixture;
    - (b) catalogue GET → 500: error visible, and a subsequent `answerChange` stages nothing;
    - (c) pick No, `jest.advanceTimersByTime(1000)`: 0 staged, button disabled; tick 1 reason: button enabled; confirm: exactly one `updateFieldsBatch` carrying all three keys, reasons mapped `{id, is_active: true, description}` for ticked only;
    - (d) cancel: 0 staged;
    - (e) replicated + unanswered: MDS item `annual-update` unfilled, so `overallStatus() !== 'complete'`;
    - (f) Yes on stored 4 (admin): batch `is_discontinued: false, discontinued_options: [], merge_split_targets: []`, and the response `status_id: 1` calls `setResultStatus(1)`.
    - (g) *(added 2026-09-29, owner decision, S-11.3)*: when the answer is No and no reason is ticked, the text "Please provide a reason." is visible and the confirm button stays disabled. Ticking a reason removes the warning. A server 400 on save is shown to the user as an error.
  - **Red run:** `npx jest … --testPathPattern="bilateral-annual-updating|section-general-info"`
  - **Disqualifier:** if the confirm dialog cannot be mounted without importing from `pages/results/` (P-2), stop and re-specify.
  - **Consumers:** `section-general-info` existing spec (Title/Description/Lead contact MDS items must be unchanged: the group isolation).
  - ⚠️ **Cannot prove:** placement, rendered wording, the NG0103 loop, the dialog focus trap. Owned by T-9.
- **Definition of done:** tests green; `section-general-info` spec green unchanged; new folder `CLAUDE.md` (120-line cap, `Verified:` stamp); `section-general-info` and `type-innovation-dev` / `type-innovation-use` `CLAUDE.md` pointers updated.

### [x] `BIL-RAU-T-9` — Real-browser + DB verification on prtest (HITL, mandatory before merge)

- **Type:** rollout
- **Description:** With a real replicated bilateral Innovation Development (phase 2026) and a replicated Innovation Use, logged in with `token` + `user` in localStorage (client `CLAUDE.md` §9), and after confirming the served bundle is not stale, walk through:
  - Yes → reload;
  - No → tick merge reason → pick a W1/W2 and a W3 target → confirm → read-only;
  - admin Reopen → save → editable without reload;
  - non-replicated result: no block;
  - a W1/W2 replicated result: identical to before.

  Read `result.is_discontinued`, `status_id`, `results_investment_discontinued_option` and `result_innovation_merge_split` for the tested ids (handed to the user; DB steps are theirs, per memory).
- **Implements:** `AC-1`, `AC-3`, `AC-4`, `AC-5` (rendered), `AC-12`, `AC-14` (S-8.1: no Submit on status 4, list shows Discontinued), `AC-15` (W1/W2 rendered), `AC-17`, `AC-18`; defect classes D7, D8
- **Depends on:** T-8 · **Blocks:** merge of PR 3
- **Estimate:** S · **Review:** checklist (evidence review)
- **Skills:** `claude-in-chrome` (if available) or manual
- **Verification:**
  - **Falsifier:** a blank radio after reload; NG0103 in the console when opening the merge picker; W1/W2 block wording or position changed; a DB row that disagrees with the screen; a Submit button visible at status 4.
  - **Red run:** n/a (no test gate; manual evidence)
  - **Disqualifier:** a stale bundle (the served `answerChange` / wrapper code does not match disk) makes the run void, so repeat on an own dev server.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:** screenshots + DB readings attached to `execution.md`; any defect goes back to the owning task.

### [x] `BIL-RAU-T-10` — Bind the discontinued-option ids in `inactiveData` (SQL injection fix)

- **Origin:** added 2026-09-29 by owner decision. The T-6 reliability/risk Reviewer (advisory R1) found that `ResultsInvestmentDiscontinuedOptionRepository.inactiveData` builds `in (${options.toString()})` from client-supplied ids. There is no ValidationPipe, so a crafted id such as `1) OR (1=1` turns the deactivate statement into a table-wide UPDATE. The flaw already existed on the W1/W2 path and T-6 made it reachable from the bilateral path too. The owner said: "hay que arreglarlo bien … asegúrate de que no se vaya a romper ningún flujo … ni para W1, W2 ni para W3".
- **Type:** server (security)
- **Description:**
  - Rewrite `inactiveData` so every client-supplied value is a bound parameter: `in (?, ?, …)` plus a params array, and the same for `result_id` and `user_id` if they are not already bound. Keep the observable behavior identical:
    - the same rows are deactivated and activated;
    - the empty-list case keeps today's semantics;
    - the optional `manager` from T-1 still routes the query.
  - While in these two repository files, bind any other client-supplied value that is interpolated into SQL. Values that are not client-supplied can stay as they are.
- **Implements:** NFR Security; `BIL-RAU-R-9` (no W1/W2 regression) and `BIL-RAU-R-3` (W3 persistence unchanged).
- **Files:** `onecgiar-pr-server/src/api/results/results-investment-discontinued-options/results-investment-discontinued-options.repository.ts` and its spec. Also `result-innovation-merge-split.repository.ts` and its spec, only if the grep finds an interpolated client value there.
- **Depends on:** T-1 (manager param), T-6 (the new bilateral caller) · **Blocks:** T-9
- **Estimate:** S · **Review:** lenses (security)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:**
    - An injection payload such as `["1) OR (1=1"]` ends up only as a bound parameter value. The SQL text contains no client value; assert on the exact SQL string and the params array.
    - Numeric ids `[1,2]` produce the same deactivate/activate semantics as today.
    - The empty list keeps today's behavior.
    - With a `manager`, the query still runs on `manager.query`.
    - The T-1 pin test that asserted today's exact SQL text is **intentionally updated** to the bound form. This is the only allowed change to an existing assertion, and it must be noted.
  - **Red run:** `npx jest … --testPathPattern="results-investment-discontinued-options.repository"`. The injection case fails before the fix.
  - **Every caller stays green (the owner's condition):**
    - `results/result.spec`: W1/W2 `createResultGeneralInformation` and W3 `updateBilateralGeneralInfo`, through the shared helper;
    - the specs of `ipsr/result-innovation-package/result-innovation-package.service.ts`;
    - `ipsr-framework/ipsr_general_information/ipsr_general_information.service.ts`;
    - `results-framework-reporting/innovation-use/innovation-use.service.ts`.

    Every caller spec must be green, with no assertion changes.
  - **Disqualifier:** if a caller passes something other than an array of ids (a string, objects, a nested array) and the bound form changes its outcome, stop and report the caller. Do not coerce silently.
- **Definition of done:** there is no client value in the SQL text, every caller spec is green and unchanged, and lint is clean.

## 4. Dependency graph

```
PR 1 (server)                         PR 2 (client, W1/W2-only, safe)
T-1 ──┬─> T-2 ──┐                     T-3 ──> T-4 ─────────┐
      └────────>T-6 ────────────┐                          │
T-5 ───────────────────┐        │     PR 3 (bilateral client)
                       └─> T-7 ─┴──────────────> T-8 <─────┘
                                                  └─> T-9 (HITL)
```

- **Parallel:** {T-1, T-5, T-3} can start together. T-7 can run alongside T-4 once T-5's shape is fixed.

## 5. Coverage — scenario / clause → task

| Scenario / clause | Owner task |
|---|---|
| S-1.1 block renders, Status Trigger wording | T-8 (unit), T-9 (rendered) |
| S-1.2 not rendered; **BUT** no MDS item / % / Submit change | T-8 (a) |
| S-2.1 type 2 legacy wording | T-4, T-9 |
| S-2.2 W1/W2 + W3 targets; **BUT** never itself | T-8 (catalogue call with the result id; server exclusion already covered by `result.repository.merge-split-targets.spec.ts`), T-9 |
| S-3.1 reload keeps No + reason; **AND IT MUST** hold for tinyint | T-5 (load), T-4 (tinyint unit), T-9 (rendered radio) |
| S-3.2 partial save untouched; **BUT** missing key ≠ Yes | T-6 (a) |
| S-3.3 answer-only payload valid; **BUT** not rejected | T-6 (b) |
| S-4.1 No → 4 | T-2, T-6 (b) |
| S-4.2 Yes keeps status; **BUT** never 5/6/7 → 1 | T-2 table, T-6 (c) |
| S-5.1 failed load → no keys, error visible | T-8 (b) |
| S-6.1 lock follows stored value; **BUT** no lock before stored | T-4 |
| S-6.2 admin reopen → Yes, no reasons, status 1 | T-4 (UI), T-8 (f), T-6 (c-variant `(Yes,4)→1` via T-2), T-9 |
| S-6.3 only the block editable; **BUT** no other field saveable | T-7 |
| R-6 "editable without manual reload" | T-7, T-8 (f), T-9 |
| S-7.1 unanswered → incomplete, Submit disabled | T-8 (e) |
| S-8.1 no Submit at status 4, list shows Discontinued | pre-existing (P-12, `bilateral-results-list.component.ts:111`); T-9 confirms |
| R-9 no W1/W2 regression | T-2, T-3, T-4 (unchanged specs), T-9 |
| R-10 write gate / AC-16 | T-6 (e) |
| S-11.1 No not sent until confirm; one batch; **BUT** no confirm with zero reasons | T-8 (c) |
| S-11.2 cancel sends nothing | T-8 (d) |
| NFR one writer | T-2, T-6 |
| NFR ≤1 extra request, replicated only | T-8 (a: no catalogue call when not rendered) |

## 6. Rollout & verification

- [ ] **PR 1** server (T-1, T-2, T-5, T-6). Harmless alone: nothing sends the keys yet.
- [ ] **PR 2** client move + context (T-3, T-4). W1/W2 only. Review first: the renames diff.
- [ ] **PR 3** bilateral (T-7, T-8, T-9). Depends on PR 1 deployed and PR 2 merged.
- [ ] Commit subjects: `<emoji> <type>(<scope>) [ticket]: …`, **no apostrophes, `$` or quotes** (Jenkins).
- [ ] CI green; T-9 evidence in `execution.md`.

## 7. Cleanup & follow-ups

- [ ] Spec status → shipped.
- [ ] Follow-up (PO): lock notice for type 2 at status 4 in bilateral (design §13).
- [ ] Follow-up: server-side lock (shared with W1/W2), if ever wanted.

## 8. Roll-back plan

1. Revert PR 3: the block disappears, and stored answers stay intact and visible in W1/W2 readers.
2. PR 2 can stay (behavior-neutral) or be reverted independently.
3. PR 1 can stay: the extra keys are ignored when not sent. No migration to revert.

## Required cross-references

`requirements.md`, `design.md`, `proposal.md` (this folder) · `docs/prd.md` · `docs/ux-ui/design.md` §8 · `docs/trd/trd.md` (results, bilateral) · `onecgiar-pr-client/.../rd-annual-updating/CLAUDE.md` (moves in T-3).
