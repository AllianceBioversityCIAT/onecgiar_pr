# Design — Annual updating for replicated W3/Bilateral innovations

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/replicated-innovation-annual-updating/` |
| Requirements | `requirements.md` (`BIL-RAU-R-1..R-11`) |
| Depth | Standard |
| Status | approved — 2026-09-29 (judgment-day review skipped by owner choice) |
| Research | Scout subagent report (2026-09-29), findings cited as file:line below |

## 1. Summary

The W1/W2 Annual updating block moves to `shared/components/`. It learns to take its context from an optional input, and without that input it behaves exactly as today. A new bilateral wrapper mounts it in Section 1, loads the stored state, autosaves **Yes**, and commits **No** through an explicit confirm. On the server, the discontinuation writes of `createResultGeneralInformation` become one helper, and the bilateral General info writer calls it inside its transaction. The biggest constraint is that the bilateral editor is read-only at status 4 for everyone. The design therefore adds a narrow, key-scoped admin exemption instead of reopening the whole editor.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| P-1 | Replication lands every copy at `status_id = 1`, `is_replicated = true` | `result.repository.ts:96-98, 114, 143, 193, 225` | Read `createQueries` (`1 as status_id`, `true as is_replicated`); `versioning.service.ts` sets no status afterwards | verified | Reporters could not answer on 5 (R-10); raise to owner |
| P-2 | Bilateral must not import components from `pages/results/` | `bilateral-result-creator/CLAUDE.md:119-121` | Quoted: "No importar componentes de `pages/results/` … Sólo … primitivas compartidas" | verified | DD-1 unnecessary; mount in place |
| P-3 | `rd-annual-updating` is used only by `rd-general-information` | Grep `app-rd-annual-updating` | Single hit `rd-general-information.component.html:1`; declared in `rd-general-information.module.ts:8,23` | verified | Move must update extra call sites |
| P-4 | Bilateral GET does not return `is_replicated`, `is_discontinued`, reasons or merge/split | `result.repository.ts:3403-3492`, `results.service.ts:3798-3903` | Scout listed `commonFields` columns; none of the four are present | verified | Skip DD-8 server part |
| P-5 | `commonFields` already has `result_type_id`, `status_id`, `reporting_year` (phase year) | `result.repository.ts:3418, 3424, 3442`; client signals `bilateral-creation.service.ts:64,69,79,180-191` | Scout citations | verified | Wrapper needs its own lookups |
| P-6 | The bilateral writer has no ValidationPipe, reads only named keys, has a "nothing to save" guard (5529-5554) and a "No changes" early return (5665-5671), and writes in `_dataSource.transaction` (5673-5699) | `results.controller.ts:1075-1091`, `results.service.ts` | Scout citations | verified | Guard edits change shape |
| P-7 | The bilateral writer never changes `status_id` today | `results.service.ts:5558` (select only) | Scout | verified | — |
| P-8 | The discontinuation repos are already injected in `ResultsService`, and neither accepts an `EntityManager` | `results.service.ts:197-198`; `results-investment-discontinued-options.repository.ts:50`; `result-innovation-merge-split.repository.ts:35-39` | Scout | verified | DD-6 needs no param work |
| P-9 | The bilateral editor is read-only for statuses ∉ {null, 1, 8}, and `autoSaveService.setReadOnly` blocks admins too | `bilateral-creation.service.ts:480-483`; `bilateral-result-creator.component.ts:430-432, 450-454` | Scout | verified | DD-5 unnecessary |
| P-10 | `setReadOnly` in the creator is re-evaluated when `resultStatusId` changes (effect), not set once | `bilateral-result-creator.component.ts:430-432` | **Not verified**: scout gave the line, not whether it is inside an `effect` | assumed | T-7 turns it into an `effect` (DD-9) |
| P-11 | Autosave sends only staged keys, drops keys absent from `FIELD_ENDPOINT_KEYS`, and carries arrays/objects | `bilateral-auto-save.service.ts:51-72, 207-243, 215, 368-384` | Scout | verified | — |
| P-12 | Bilateral `submit-for-review` refuses status 4 | `bilateral-center.service.ts:2362-2371` (`[Editing, Draft]` only) | Scout | verified | Add guard (R-8) |
| P-13 | The merge/split catalogue is portfolio-wide (no `source` filter) | `result.repository.ts:2993-3053`; `results.service.ts:3348-3374` | Read the SQL and the call (no `ownerInitiativeId`) | verified | Add W3 to the query |
| P-14 | W1/W2 discontinuation branch has **no** positive test, only the P2-3597 negative one | `result.spec.ts:1112-1187` | Scout | verified | — |
| P-15 | The W1/W2 save sends only ticked reasons (`value === true`, `is_active = true`) and clears them when not discontinued | `rd-general-information.component.ts:368-371, 421` | Scout | verified | Wrapper must replicate the mapping |

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Change |
|---|---|
| `shared/components/annual-updating/` (new home) | Relocated `rd-annual-updating` + optional context input + change output |
| `pages/results/.../rd-general-information` | Imports the shared component; template binding unchanged |
| `pages/bilateral/components/bilateral-annual-updating/` (new) | Wrapper: load, gate, Yes autosave, No confirm, MDS items |
| `pages/bilateral/components/section-general-info` | Mounts the wrapper at the top when replicated + type 7/2 |
| `pages/bilateral/services/bilateral-auto-save.service.ts` | 3 keys → `generalInfo`; key-scoped read-only exemption |
| `pages/bilateral/services/bilateral-creation.service.ts` | Exposes `isReplicated`, `storedIsDiscontinued`, the stored reasons and targets; accepts a status update after save |
| `pages/bilateral/pages/bilateral-result-creator` | Read-only gate reacts to status; sets the exemption for admin at status 4 |
| Server `results.service.ts` | Helper `applyInnovationDiscontinuation` + `resolveDiscontinuationStatus`; `createResultGeneralInformation` and `updateBilateralGeneralInfo` both call them |
| Server `result.repository.ts` | `getCommonFieldsBilateralResultById` selects `is_replicated`, `is_discontinued` |
| Server DTO `update-bilateral-general-info.dto.ts` | 3 optional keys |

### 2.2 Sequence

1. **Load:** the creator calls `GET api/results/bilateral/:id`. `commonFields` now carries `is_replicated` / `is_discontinued`, and the response gains `annualUpdating { discontinued_options, merge_split_targets }` for types 7/2. The wrapper then calls `GET investment-discontinued-options/:type?phaseYear=<reporting_year>`, merges the stored reasons into the catalogue, and sets `loaded = true`.
2. **Yes:** the radio changes and the wrapper, if `loaded`, stages `is_discontinued: false` + `discontinued_options: []` + `merge_split_targets: []`. Autosave sends `PATCH …/bilateral/general-info/:id` and the server helper runs. The status rule gives 4 → 1, otherwise no change. The response carries `status_id`, and the wrapper updates `creationService.resultStatusId`.
3. **No:** nothing is staged. **Mark as discontinued** is enabled once the answer is complete. It opens a confirm dialog, and confirming stages all three keys in one batch, then flushes. The server sets status 4. The response status makes the editor read-only (DD-9).
4. **Admin at status 4:** the creator sets exemptions `{is_discontinued, discontinued_options, merge_split_targets}`. The block is editable, Reopen works, and saving takes step 2's path.

## 3. Data Model Changes

No migration, and no entity change. Storage is the existing `result.is_discontinued`, `result.status_id`, `results_investment_discontinued_option` and `result_innovation_merge_split`.

## 4. API Surface

### 4.1 Changed endpoints (internal, JWT-gated)

| Endpoint | Change | Compatibility |
|---|---|---|
| `GET api/results/bilateral/:resultId` | `commonFields.is_replicated`, `commonFields.is_discontinued` (raw tinyint). New top-level `annualUpdating: { discontinued_options: [{investment_discontinued_option_id, description}], merge_split_targets: [{target_result_id, transition_type}] }`, present only for types 7/2 | Additive |
| `PATCH api/results/bilateral/general-info/:resultId` | Optional `is_discontinued` (bool), `discontinued_options[] {investment_discontinued_option_id, is_active, description}`, `merge_split_targets[] {target_result_id, transition_type}`. The response additionally returns `status_id` and `is_discontinued` when the answer was written | Additive |

### 4.2 Bilateral / platform-report impact

None. `/api/bilateral/*` is untouched, so no change-log row in `bilateral-result-summaries.en.md`.

## 5. Server Workflow / Business Rules

- **Helper `applyInnovationDiscontinuation(resultId, answer, userId, manager?)`**: the exact body of today's `results.service.ts:832-896`, both branches, moved as-is. `resolveDiscontinuationStatus(typeId, isDiscontinued, currentStatus)` is today's `949-956` rule, as a pure function.
- **`createResultGeneralInformation`**: calls both at the same points. No `manager`, the same ordering, and the P2-3597 title check stays before it.
- **`updateBilateralGeneralInfo`**, in order:
  1. The "nothing to save" guard counts `is_discontinued !== undefined` as content.
  2. After `assertCenterWrite`, if `'is_discontinued' in dto`, the type is 7/2 and the value is boolean: compute the new status, add `is_discontinued` + `status_id` to `updates`, and run the helper **inside** the existing transaction with `manager`.
  3. If the key is absent, **no discontinuation code runs** (R-3 S-3.2).
  4. For a type ∉ {7,2}, the key is ignored and the discontinuation code does not run.
  5. The "No changes" early return must not fire when the answer is present.
- **Repos**: `inactiveData` and `replaceForResult` gain an optional trailing `manager`. When it is absent they behave exactly as today, so the W1/W2 path is unchanged.
- **Authorization**: unchanged. `assertCenterWrite` runs first (admin always passes; non-admin passes unless status is 5).

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. `rd-general-information.module.ts` keeps importing the standalone component, from its new path.

### 6.2 Components & services

**Shared `app-annual-updating`** (relocated `RdAnnualUpdatingComponent`):
- **Body type**: a local structural interface (`is_discontinued`, `discontinued_options`, `merge_split_targets`) instead of importing `GeneralInfoBody` from `pages/results`. W1/W2's `GeneralInfoBody` satisfies it structurally.
- **Context input `context?: AnnualUpdatingContext`**: `{ resultId, resultTypeId, phaseYear, storedIsDiscontinued, isAdmin, editable }`.
  - Every current read of `dataControlSE.currentResult.*`, `rolesSE.isAdmin`, `rolesSE.access.canDdit` and `isPhaseOpen` goes through one private resolver. The resolver prefers `context` and falls back to today's source.
  - `usesStatusTriggerWording`, `headerLabel` and `options` keep their construction-time resolution (W1/W2 specs seed before `createComponent`). They are **re-resolved in `ngOnChanges`** when `context` arrives.
- **Output `answerChange`**: emits after every user mutation (radio, checkbox, description, merge/split selection, reopen). W1/W2 does not bind it.
- **Unchanged**: the `selectionCache` / object-binding NG0103 fixes, `toNullableBoolean` on the stored flag, `needsDescription`, the merge/split lazy load, and every `appFeedbackValidation`. In bilateral the DOM-scan directives are inert (there is no result-detail scan), and the wrapper's MDS items are what counts.
- `CLAUDE.md` moves with it, re-stamped. The old folder keeps no file.

**Bilateral `app-bilateral-annual-updating`** (new, standalone):
- **Inputs** come from `BilateralCreationService` signals: `currentResultId`, `resultTypeId`, `reportingYear`, `resultStatusId`, `storedIsDiscontinued`, the stored reasons and targets.
- `loaded = signal<boolean|null>(null)` (P2-3556 pattern). A failed catalogue load shows `app-alert-status status="error"` and blocks every write.
- **Owns a local body**: the reasons catalogue merged with the stored ones, and `is_discontinued` normalized with `toNullableBoolean`.
- **On `answerChange`**:
  - if the answer is Yes, stage the Yes batch;
  - if No, only recompute `canConfirmDiscontinuation` (≥1 ticked, "Other" text when `needsDescription`, targets for ticked merge/split).
- **Mark as discontinued** is a single secondary button under the block (not the page's brand button). Clicking it opens the confirm dialog. The dialog follows the pattern of the existing `bilateral-change-result-type-dialog` (Spartan `hlm-dialog`), with copy that mirrors W1/W2's `saveConfirmationModal`.
- **Confirm**: `updateFieldsBatch` with the three keys, reasons mapped as W1/W2 does (ticked only, `is_active: true`), then flush.
- **Status after save**: on the save response, call `creationService.setResultStatus(status_id)`. The Section 1 save status is read from the existing `fieldStatus`.
- **MDS**: `setSectionFields('general-info', items, 'annual-updating')`, a separate group, so the Title/Description/Lead contact items are not overwritten.
  - Items: `annual-update` (answered). When No: `annual-update-reasons`, and `annual-update-targets` when a merge/split reason is ticked.
  - Registered only when the block renders. When not rendered, the group is set to `[]`.

**`section-general-info`**: `@if (isReplicatedInnovation())` mounts the wrapper as the first child. `isReplicatedInnovation = isReplicated && type ∈ {7,2}`.

**`BilateralAutoSaveService`**:
- Add `is_discontinued`, `discontinued_options` and `merge_split_targets` to `FIELD_ENDPOINT_KEYS` → `generalInfo`.
- Add `setReadOnlyExemptions(keys: string[])`: `updateField` / `updateFieldsBatch` let exempt keys through while `isReadOnly()`, and drop every other key exactly as today.

**`BilateralCreationService`**: read `is_replicated` / `is_discontinued` from `commonFields` and `annualUpdating` from the response into signals. Add `setResultStatus(id)`.

**Creator**:
- The read-only gate becomes an `effect` on `resultStatusId` (P-10).
- Exemptions are set to the three keys when `isAdmin && status === 4 && isReplicatedInnovation`, and cleared otherwise.
- `rolesSE.readOnly` stays as is. The shared component's editability comes from `context.editable` = `isEditableByCenterUser() || (isAdmin && status === 4)`.

### 6.3 Design system usage

No new tokens or copy. The block keeps its existing SCSS (moved with it). The new button and dialog are Spartan/custom-fields primitives. Tailwind-first rules apply to the wrapper.

### 6.4 Real-time

None.

## 7. Security & Authorization

The server gate is unchanged (`assertCenterWrite`). The client exemption is UX only. The server already lets admins write at any status and refuses non-admins only at status 5. A non-admin who crafts a PATCH at status 4 can therefore write the answer, which is **the same exposure W1/W2 documents** (UI-only lock). It is accepted, and listed in §13.

## 8. Performance & Capacity

- **GET**: two more indexed lookups by `result_id`, only for types 7/2.
- **Client**: +1 catalogue request for replicated innovations, and +1 merge/split request only when stored inactive (the existing lazy rule).

## 9. Observability

Nest `Logger` warn on a discontinuation write failure inside the bilateral transaction (the transaction rolls back). No payload bodies are logged.

## 10. Testing Plan

| Gate | Covers |
|---|---|
| Server `result.spec.ts`: new positive tests of the helper (both branches) + the status table | D2, R-4 |
| Server `updateBilateralGeneralInfo` tests: partial payload leaves the answer untouched; answer-only payload accepted; type 5 ignores the key; status 5 non-admin → 403, nothing written | D1, R-3, R-10 |
| Existing W1/W2 specs (`rd-annual-updating*`, `rd-general-information*`, `result.spec.ts` P2-3597) green with **unchanged assertions** (only import paths may change) | D3, R-9 |
| New shared-component spec: context input with `is_discontinued: 1/0/null`, type 2/7, phase 2025/2026 | D4, R-2, R-6 |
| New wrapper spec: no staging before `loaded`; 500 → error + no writes; No + debounce → 0 sends; confirm → one batch; cancel → 0; MDS group items per state | D5, D6, D10, R-5, R-7, R-11 |
| Autosave spec: exemption lets only exempt keys through | D11, S-6.3 |
| Manual prtest browser run (HITL, mandatory before merge) | D7, D8, visual placement, NG0103, DB rows |

## 11. Backwards Compatibility & Migration Plan

Additive DTO and response fields, and no migration. W1/W2 goes through the same code with `manager` absent and `context` absent. **Rollback**: revert the client PR, which hides the block. The server additions stay harmless because nothing sends the keys.

## 12. Design Decisions

### BIL-RAU-DD-1: Relocate the component to `shared/components/annual-updating/`
- **Why**: P-2 forbids bilateral importing from `pages/results/`, and copying it would duplicate P2-3292 Steps 1–4 and every documented trap (proposal option C).
- **Rejected**: option A (write the bilateral result into `dataControlSE.currentResult`), because it leaks global W1/W2 state.
- **Reversion challenge ("what does moving it break?")**:
  - import paths in `rd-general-information.module.ts` and in 2 specs;
  - the `GeneralInfoBody` import from a page model (solved by the structural interface);
  - relative `CustomFieldsModule` / directive / util imports;
  - the folder `CLAUDE.md` location.
  - All are listed in T-3. Nothing behavioral.

### BIL-RAU-DD-2: Optional context input with a fallback, and construction-time resolution kept
- **Why**: W1/W2 specs seed `currentResult` before `createComponent` and read `usesStatusTriggerWording` as a field. Moving resolution to `ngOnInit` would break them (R-9).
- **Reversion challenge**: none. Adding `ngOnChanges` re-resolution only fires when `context` is bound, and W1/W2 never binds it.

### BIL-RAU-DD-3: "No" is committed through confirm, "Yes" autosaves (R-11)
- **Why**: status 4 makes the bilateral editor read-only (P-9). An autosaved "No" would lock the result before reasons exist. W1/W2 already confirms before saving a reason.
- **Rejected**: autosave everything with the status change deferred server-side until a reason exists. That splits the W1/W2 rule into two behaviors.

### BIL-RAU-DD-4: One server helper, called by both writers (NFR data integrity)
- **Why**: a second writer is what wiped stored links before P2-3199 (`api/results/CLAUDE.md` §9b).
- **Reversion challenge ("what does extracting it break?")**:
  - the P2-3597 ordering, which requires the title check to run before any discontinuation write. Kept, because the helper is called at the same line.
  - Non-transactional W1/W2 behavior is kept (no `manager`).

### BIL-RAU-DD-5: Key-scoped read-only exemption for admin at status 4 (S-6.3)
- **Why**: the escape must reach only the three keys, not the whole editor, which admins are deliberately kept out of on non-editable statuses (P-9).
- **Rejected**: `setReadOnly(false)` for admins at status 4, which opens every section.

### BIL-RAU-DD-6: Optional `manager` on the two discontinuation repos
- **Why**: the bilateral writer is transactional (P-6), and a discontinuation write outside it could commit half an answer when the result update fails.
- **Reversion challenge**: none. Parameter absent means today's behavior.

### BIL-RAU-DD-7: Key presence, not truthiness, decides whether the answer is written (S-3.2)
- **Why**: bilateral autosave sends partial bodies (P-11). `false` is a real answer, and a missing key is not an answer.

### BIL-RAU-DD-8: The GET returns the stored answer additively
- **Why**: P-4. Reasons and targets are queried only for types 7/2.

### BIL-RAU-DD-9: The editor's read-only gate reacts to status
- **Why**: after Reopen saves (4 → 1) the editor must become editable without a reload (R-6). After No it must become read-only.
- **If P-10 is already an `effect`**, T-7 only adds `setResultStatus`.

## 13. Open Gaps & Follow-ups

- **P-10 (`assumed`)**: verify in T-7.
- **UI-only lock**: accepted, the same as W1/W2 (§7).
- **`BIL-RAU-OQ-1`**: Jira ticket id.
- **Type 2 at status 4**: non-admins see the whole result read-only with no lock notice. The notice is W1/W2's type-7/2026 wording, and the creator's generic read-only state applies instead. Acceptable, and noted for the PO.

## 14. Budget (tripwire for `/akili-execute`)

| Measure | Estimate |
|---|---|
| Tasks | 9 |
| LOC (incl. tests) | ~950 (server ~350, client ~600) |
| Review rounds | ~1.5 per task (≈14 total). The component move (T-3) and the wrapper (T-6) are the likeliest to need 2 |

This fits the Standard depth, but it is large enough for **3 PRs** (see tasks).
