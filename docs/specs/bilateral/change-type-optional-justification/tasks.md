# Tasks — Bilateral "Change result type": optional justification

## 1. Scope

- **Module / feature:** `bilateral/change-type-optional-justification`
- **Linked spec:** `./requirements.md` (approved 2026-10-26) + `./design.md` (approved 2026-10-26)
- **Owner:** Maria Camila Giraldo
- **Status:** done (2026-10-26)
- **Order:** T-1 and T-2 are independent and parallel-safe (different packages, no shared file).

## 2. Pre-flight

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] No open questions; Premise Ledger has 0 `UNVERIFIED` rows
- [x] No migration (NFR-2)
- [x] No conflicting in-flight spec (`grep -rln "change-type\|ChangeResultType\|changeResultType" docs/specs | grep -v change-type-optional-justification` → 0 hits)

## 3. Tasks

### BIL-CTJ-T-1 — Client: make the reason optional in the dialog

- **Status:** [x] done (PASS attempt 1 + manual check on 9901, 2026-10-26)
- **Size:** S (~10 LOC production, ~80 LOC test)
- **Depends on:** none
- **Implements:** BIL-CTJ-R-1 (all three scenarios, incl. the `BUT` no-`*` clause and the `AND IT MUST` disabled-without-type / while-submitting clause); NFR-1 (client side)
- **Design refs:** design §7, DD-1, DD-4
- **Skills:** `angular-developer`, `tdd`
- **Scope:**
  - `bilateral-change-result-type-dialog.component.ts` — remove the `justification` term from `canSubmit()`; nothing else changes (body still sends `justification.trim()`).
  - `bilateral-change-result-type-dialog.component.html` — remove the `*` span from the "Why is this change needed?" label; placeholder → `Optional — explain the correction for the review history.`
  - **New** `bilateral-change-result-type-dialog.component.spec.ts` covering:
    1. new type selected + empty reason → `canSubmit()` true and the rendered "Change result type" button is not `disabled`;
    2. `submit()` with empty reason calls `PATCH_changeBilateralResultType` with `justification: ''` and, on success, closes and emits `changed`;
    3. reason `'  Fixed  '` → body carries `'Fixed'`;
    4. no type selected → disabled; `submitting = true` → disabled;
    5. Knowledge Product + empty reason + empty handle → disabled; handle typed → enabled;
    6. the rendered reason label (`.bctd-field-title` containing "Why is this change needed?") has no `*` text; the "Select the new result type" label still has its `*`.
- **Verification:** `cd onecgiar-pr-client && npx jest src/app/pages/bilateral/components/bilateral-change-result-type-dialog --silent --reporters=summary --no-coverage` → all green; `npx ng lint --quiet` clean.
- **Falsifier:** restore `!!this.justification.trim() &&` in `canSubmit()` → cases 1 and 2 go red on the `canSubmit()`/`disabled` assertion; restore the `*` span → case 6 goes red. Case 6's second assertion guards against a selector that matches nothing (inert fixture).
- **Red run:** `predicted — greenfield artifact (observed in BIL-CTJ-T-1)`. The spec file does not exist at `897b85c2b`. Write the spec first, run it against unchanged production code, and quote the red for cases 1, 2 and 6 verbatim in `execution.md` before changing production code.
- **Disqualifier:** a red caused by TestBed setup (missing provider, `PrDialogComponent` template error) is not a red. Mock `BilateralApiService` and confirm the failing line is the behavioral `expect`. Case 1 must check the **rendered button's** `disabled` property, not just `canSubmit()`.
- **Consumers:** none. `grep -rln "bctd\|change-result-type-dialog\|Change result type" onecgiar-pr-client/src onecgiar-pr-client/cypress | grep -E "spec|cy"` → 2 hits, both in the W1/W2 `result-header` / `rd-general-information` specs, a different component (design P-4).
- **Review:** `checklist` — scoped UI rule change, no shared symbol.
- **Done criteria:**
  - [ ] Red for cases 1, 2 and 6 quoted in `execution.md` (assertion-level)
  - [ ] All six cases green after the change; falsifier re-applied once and observed red, then reverted
  - [ ] No other change to the dialog's behavior (KP handle, reset on close, error message)
  - [ ] Manual check at the HITL pause on IRRI result 9901 (Phase 36): change the type with an empty reason and it succeeds

### BIL-CTJ-T-2 — Server: optional `justification` and a clean audit comment

- **Status:** [x] done (PASS attempt 1, 2026-10-26)
- **Size:** S (~10 LOC production, ~30 LOC test, 1 doc row)
- **Depends on:** none
- **Implements:** BIL-CTJ-R-2 (both scenarios, incl. the `BUT` no `undefined` / `null` / trailing-space clause); BIL-CTJ-R-3; NFR-1 (server side), NFR-2
- **Design refs:** design §5, §6, §8, DD-2, DD-3
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Scope:**
  - `dto/change-center-result-type.dto.ts` — `justification` → `@ApiPropertyOptional`, `@IsOptional`, `@IsString`, drop `@IsNotEmpty`, `justification?: string`.
  - `services/bilateral-center.service.ts:799-800` — keep the prefix `Result type changed from level X, type Y to level A, type B.` byte-for-byte; append `' ' + reason` only when the trimmed reason is non-empty.
  - `services/bilateral-center.service.spec.ts` (`describe('changeResultType')`) — add tests that capture the `ResultReviewHistory` payload (`manager.save` 2nd arg, via a `mockImplementationOnce` on `resultRepository.manager.transaction`) for: absent reason, `''`, `'   '` → exact `'… type 7.'`; reason `'Classification corrected'` → `'… type 7. Classification corrected'`.
  - `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — one change-log row dated on merge: `justification` on `PATCH /api/bilateral/center/change-type/:resultId` is optional; without it the review comment has no reason; no read-payload change.
- **Verification:** `cd onecgiar-pr-server && npx jest src/api/bilateral --silent --reporters=summary --forceExit` → green; `npm run build` → exit 0; `npx eslint "src/api/bilateral/**/*.ts" --quiet` clean.
- **Falsifier:** revert the service line to `. ${dto.justification}` → the absent-reason test goes red with `+ "… type 7. undefined"`; the `''` case goes red with a trailing space `"… type 7. "`.
- **Red run (observed at `897b85c2b`, temp probe, reverted):**
  ```
  - "Result type changed from level 3, type 2 to level 4, type 7.",
  + "Result type changed from level 3, type 2 to level 4, type 7. undefined",
  Tests: 1 failed, 242 skipped, 243 total
  ```
- **Disqualifier:** a test that reads `save.mock.calls[n][0]` reads the entity class, not the payload, and returns `[]`. That is an inert fixture, already hit once while probing. The assertion must check the exact string with `toEqual`/`toBe`, not `toContain`, or the trailing-space case cannot fail.
- **Consumers:** `ChangeCenterResultTypeDto` → controller `bilateral-center.controller.ts:20,88`, service `:68,:721`, `bilateral-center.controller.spec.ts:131-144` (passes a reason, unaffected). Comment text → no reader (design P-5). Client caller `bilateral-api.service.spec.ts:101` (body passthrough, unaffected).
- **Review:** `full` — changes a published endpoint contract and its change log.
- **Done criteria:**
  - [ ] New tests red before the service edit (quote in `execution.md`), green after
  - [ ] Existing three `changeResultType` tests still green (reason, manual-refusal, KP handle)
  - [ ] Build passes (DTO type change compiles)
  - [ ] Change-log row present; no other contract text changed

## 4. Coverage map (scenario / clause → task)

| Requirement clause | Task |
|---|---|
| R-1 Empty reason: button enabled; change sent; dialog closes | T-1 cases 1, 2 |
| R-1 `BUT` no `*` on the reason label | T-1 case 6 |
| R-1 `AND IT MUST` disabled with no type / while submitting | T-1 case 4 |
| R-1 Reason given → trimmed reason sent | T-1 case 3 |
| R-1 KP handle rule unchanged | T-1 case 5 |
| R-2 No reason → exact comment | T-2 absent/`''`/blank tests |
| R-2 `BUT` no `undefined`/`null`/trailing space | T-2 exact-string assertions |
| R-2 Reason given → suffix kept | T-2 reason test |
| R-3 Swagger + change log optional | T-2 DTO + doc row |
| NFR-1 no other validation changes | T-1 case 5 + T-2 existing tests |
| NFR-2 no migration / payload change | T-2 scope (no entity/migration file touched) |
