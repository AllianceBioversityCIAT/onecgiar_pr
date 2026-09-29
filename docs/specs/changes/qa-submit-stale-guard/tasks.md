# Tasks — `changes/qa-submit-stale-guard`

- **Status:** `done` — `QSG-T-1`, `QSG-T-2` PASS 2026-09-29; `P-5` (hash determinism) pending the user DB check
- **Budget (`design.md` §3):** 2 tasks · ~150 LOC · 1 review round per task
- **Branch:** `fix/qa-submit-stale-guard` from `performance-refactor` @ `9be3db51e`

### `QSG-T-1` — Re-read the latest assessment on reopen and after a rejected Submit

- **Type:** `client`
- **Size:** `S`
- **Depends on:** `—`
- **Implements:** `QSG-R-1`, `QSG-R-2`, `QSG-R-3`, `QSG-R-4` (server untouched)
- **Design:** `QSG-DD-1`, `QSG-DD-2`, `QSG-DD-3`, `QSG-DD-4`; Premise Ledger `P-1`..`P-7`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-quality-assessment-ui.service.ts` · `.service.spec.ts`
- **Scope:**
  - `openStored()` enters a short busy state (`refreshing`), re-reads the latest row, replaces `assessment`, then opens (`deciding`). `refreshing` counts in `isBusy()` but not in `isDialogOpen()`.
  - `submit()` error path: re-read the latest row, replace `assessment`, then `deciding`. Keep the existing `finalize` behaviour.
  - Fail closed: on a re-read error or `latest: null`, keep the held row as a copy with `is_current: false`.
  - Signatures unchanged. No template, copy, or server change.
- **Skills:** `angular-developer`, `tdd`
- **Review:** `full` — it changes the submit flow and the root service's shared `assessment` signal, which has several readers (override b)
- **Verification:**
  - **Falsifier:** a held row with `is_current: true`, and a `GET latest` stub returning the same id with `is_current: false`.
    - After `openStored()`, the service's `assessment().is_current` must be `false` and `state()` must be `deciding`.
    - Mutation (a): skip the re-read in `openStored()`. The reopen case goes red, because `is_current` is still `true`.
    - Mutation (b): skip the re-read in the Submit error path. The rejected-Submit case goes red.
    - Mutation (c): on a re-read error, keep the row as-is. The fail-closed case goes red.
    - 🛑 The stub must return `is_current: false` for the **same** id the service holds. With a different id, or `true`, mutation (a) reads the same as correct code.
  - **Red run:** `cd onecgiar-pr-client && npx jest --no-coverage --testPathPattern="bilateral-quality-assessment-ui.service"`. The reopen and rejected-Submit cases fail on current code on their `is_current` assertion, not on a missing method.
  - **Disqualifier:**
    - A case that asserts the HTTP call was made, without asserting the resulting `assessment()` / `state()`, proves plumbing, not behaviour.
    - Synchronous `of(...)` stubs are acceptable here, because there is no timing race in scope. The disabled-while-refreshing state still needs one case with a deferred stub, asserting `isBusy()` is `true` before the read resolves.
    - `P-5` (hash determinism) has no gate in this task. It is the user's DB check at the HITL pause.
  - **Consumers:** `bilateral-result-creator.component.ts:888-890` (calls `openStored()`) · `bilateral-result-creator.component.spec.ts` (pins `openStored`) · `bilateral-quality-assessment-dialog.component.spec.ts` (the `stale()` rendering, `P-1`) · the `assessment()` readers in `design.md` `P-6`
  - Commands, from `onecgiar-pr-client/`:
    - `npx jest --no-coverage --silent --reporters=summary --testPathPattern="(bilateral-quality-assessment|bilateral-result-creator)"`
    - `npx tsc --noEmit -p tsconfig.app.json`
    - `npx ng lint --quiet`
- **Definition of done:**
  - [x] `QSG-R-1`: reopen shows the server's current `is_current`, with a case where the stored value is `true` and the server's is `false`
  - [x] `QSG-R-2`: a rejected Submit re-reads; a not-current row hides Submit; a newer current row is offered
  - [x] `QSG-R-3`: a re-read error or `latest: null` fails closed
  - [x] Regression: a current row still opens with Submit available
  - [x] Busy while refreshing, asserted with a deferred stub
  - [x] All three mutations executed and observed **red**
  - [x] Commands above green; no server file touched
- **Status:** [x] — PASS attempt 1, 2026-09-29 (`execution.md` → `QSG-T-1`)

---

### `QSG-T-2` — A submitted result opens the drawer read-only *(added at the Phase 3 gate, user 2026-09-29)*

- **Type:** `client`
- **Size:** `S`
- **Depends on:** `—` (disjoint files from `QSG-T-1`; run after it to share one review loop)
- **Implements:** `QSG-R-5`
- **Design:** `QSG-DD-5`; Premise Ledger `P-8`, `P-9`
- **Files (expected):**
  - `…/components/bilateral-quality-assessment-dialog/bilateral-quality-assessment-dialog.component.{ts,html,spec.ts}`
  - `…/pages/bilateral-result-creator/bilateral-result-creator.component.html` (binding only)
  - `…/pages/bilateral-result-creator/CLAUDE.md` (the folder-guide rule: update and re-stamp `Verified:` in the same commit)
- **Scope:**
  - Add a `readOnly = input(false)` to the dialog. When it is true, render neither the footer nor the stale line.
  - In the creator, bind `[readOnly]="isFormReadOnly()"`.
  - No copy change. Close paths untouched.
- **Skills:** `angular-developer`
- **Review:** `full` — it adds a component input and changes the rendered DOM that specs pin (override b)
- **Verification:**
  - **Falsifier:** render the real dialog template with a completed assessment and `readOnly: true`.
    - No `button` whose text is "Make adjustments" or "Submit for review" exists.
    - The ✕ close button still exists.
    - Mutation: ignore `readOnly` in the footer `@if`. The read-only case goes red, because "Make adjustments" is present.
    - A second case with `readOnly: false` still renders both buttons (regression for `dialog.component.spec.ts:336-340`).
  - **Red run:** `npx jest --no-coverage --testPathPattern="bilateral-quality-assessment-dialog"`. The read-only case fails on current code on its "no Make adjustments" assertion.
  - **Disqualifier:** asserting on the component's `readOnly()` signal instead of the rendered DOM is not evidence. A hand-built template fragment is not evidence.
  - **Consumers:** `bilateral-result-creator.component.html:44-51` · `bilateral-quality-assessment-dialog.component.spec.ts:123,155,336-340` · `bilateral-result-creator.component.spec.ts` (renders the creator)
  - Commands, from `onecgiar-pr-client/`:
    - `npx jest --no-coverage --silent --reporters=summary --testPathPattern="(bilateral-quality-assessment|bilateral-result-creator)"`
    - `npx tsc --noEmit -p tsconfig.app.json`
    - `npx ng lint --quiet`
- **Definition of done:**
  - [x] `QSG-R-5`: read-only renders no footer buttons and no stale line; ✕ still closes
  - [x] Editable case unchanged (existing footer tests green)
  - [x] The creator binds `readOnly` from `isFormReadOnly()`, asserted in the creator spec or by a static read of the real template
  - [x] Mutation executed and observed **red**
  - [x] `pages/bilateral-result-creator/CLAUDE.md` updated and its `Verified:` line re-stamped
  - [x] Commands above green
- **Status:** [x] — PASS attempt 1, 2026-09-29 (`execution.md` → `QSG-T-2`)
