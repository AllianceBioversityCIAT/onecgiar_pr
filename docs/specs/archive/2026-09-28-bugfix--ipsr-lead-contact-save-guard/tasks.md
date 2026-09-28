# Tasks — IPSR Lead contact person save guard parity

## 1. Scope of this task list

- **Module / feature:** `ipsr` / General information — Lead contact person save guard
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Owner / driver:** santiago.sanchez@cgiar.org
- **Status:** ready
- **Depth:** Lite · **Mode:** Bug · **Budget:** 2 tasks / ~60 LOC / 1 review round (design §11)

## 2. Pre-flight checklist

- [x] `proposal.md` approved (2026-09-28).
- [x] Root cause confirmed and reproductions A/B documented (proposal Bug Diagnosis).
- [x] No server, SQL or contract change.
- [x] `requirements.md` / `design.md` / `tasks.md` approved (2026-09-28).

## 3. Task list

### `IPSR-LCG-T-1` — Regression tests for the save guard and tooltip binding (RED) `[x]`

- **Type:** `tests`
- **Implements:** `IPSR-LCG-R-1` (1.1, 1.2 incl. `BUT must NOT send null`), `IPSR-LCG-R-2` (2.1 incl. `AND IT MUST NOT show "not found"`, 2.2, 2.3), `IPSR-LCG-R-3` (3.1 incl. `BUT must NOT change when flag off`), `IPSR-LCG-DD-2`
- **File:** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.component.spec.ts`
- **Description:** In `describe('onSaveSection()')`, add cases driven by `isP22`/`isP25` mocks, `mockUserSearchService.{searchQuery, selectedUser}` and a stubbed `component.leadContactPersonField` (the spec uses `NO_ERRORS_SCHEMA`, so the real field is not rendered):
  | Case | Portfolio | Field state | Expect |
  |---|---|---|---|
  | 1.1 | P25 | typed `'Juan Per'`, no pick, child stub `queryCameFromHydration: false` | `PATCHIpsrGeneralInfo` **not** called, `showContactError === true`, `hasValidContact === false`, body `lead_contact_person` untouched |
  | 1.2 | P22 | same | same |
  | DD-2 | P25 | typed, no pick, `leadContactPersonField` **undefined** | not called (blocks) |
  | 2.1 | P22 and P25 | query `'External Consultant'`, no pick, stub `queryCameFromHydration: true` | called, `showContactError` stays `false` |
  | 2.2 | P22 and P25 | same as 2.1 (loaded name) | called |
  | 2.3 | P25 | picked user / blank `'   '` | called |
  | 3.1 | — | `isReportingFormGuidance2026` true vs false, `detectChanges()` | `app-lead-contact-person-field` DebugElement `properties.guidanceAsTooltip` is `true` / `false` |
- **Invert** the existing `:483` "should skip contact validation when isP22 is false" into case 1.1 (it asserts the defect). Keep `:495` (blank query saves) as is. Record the inversion in `execution.md`.
- **Depends on:** — · **Blocks:** `IPSR-LCG-T-2` · **Estimate:** S · **Skills:** `angular-developer`, `tdd`
- **Verification:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="ipsr-general-information.component.spec"`
  - **Must be RED on current code** for 1.1 (P25 sends the PATCH), DD-2, 2.1/2.2 on P22 (blocked), and 3.1 with the flag on (binding absent). 1.2, 2.3 and the blank case may already pass — that is expected, they guard against over-correction.
  - **Input that makes it fail:** P25 + typed-unpicked query → current guard skips and calls `PATCHIpsrGeneralInfo`.
  - **Disqualifier:** if 1.1 passes before `IPSR-LCG-T-2`, the test is not reaching the guard (wrong mock or portfolio flag) — it is not evidence. If 3.1 reads the property off the host instead of the field element, it proves nothing about the binding.

### `IPSR-LCG-T-2` — Mirror the Results guard, bind the tooltip, fix docs (GREEN) `[x]`

- **Type:** `client`
- **Implements:** `IPSR-LCG-R-1..3`, `IPSR-LCG-DD-1..3`
- **Files:**
  - `…/ipsr-general-information/ipsr-general-information.component.ts` — `@ViewChild(LeadContactPersonFieldComponent) leadContactPersonField?`; guard = `searchQuery.trim() && !selectedUser && !leadContactPersonField?.queryCameFromHydration` (no portfolio check); fix the doc comment at `:55-59` (no shared `validation_general_information_P25`; see proposal OQ-1)
  - `…/ipsr-general-information/ipsr-general-information.component.html` — `[guidanceAsTooltip]="guidanceAsTooltip()"` on `app-lead-contact-person-field`
  - `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.component.html` — comment only: the opt-in note now says IPSR opts in, Bilateral does not
  - `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/CLAUDE.md` — Traps: both section consumers (Results, IPSR) share one save-guard rule; re-stamp `Verified:`
- **Depends on:** `IPSR-LCG-T-1` · **Blocks:** — · **Estimate:** S · **Skills:** `angular-developer`
- **Definition of done:**
  - [x] All `IPSR-LCG-T-1` cases GREEN; rest of the IPSR General information spec unchanged and green. (execution.md T-2: 105/105)
  - [x] `lead-contact-person-field.readonly.spec.ts` still green (renders the field template; guards the comment-only edit). (execution.md T-2)
  - [x] `npx ng lint --quiet` clean. (execution.md T-2; re-run in validation-report.md §5)
  - [x] Guard expression is textually the same as `rd-general-information.component.ts:390-394` (diff review). (Reviewer PASS; validation-report.md §8)
  - [x] (verified by the user 2026-09-28, execution.md T-2) **Manual check at the HITL pause (no automated gate — requirements "Defect Classes"):** on a local build, reproductions A (P25, type without picking → Save blocked, contact kept after reload) and B ("use this name anyway" → Save stores the name). Report as not verified if no editable package/phase is available — do not mark as passed.
- **Verification:**
  - `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="(ipsr-general-information.component|lead-contact-person-field.readonly).spec"`
  - `cd onecgiar-pr-client && npx ng lint --quiet`
  - **Input that makes it fail:** re-adding `isP22() &&` turns 1.1 red; dropping `!queryCameFromHydration` turns 2.1/2.2 red.
  - **Disqualifier:** never run the unscoped suite (memory rule); a green run of anything other than the two named specs is not evidence for this task.

## 4. Dependency graph

```text
IPSR-LCG-T-1 (regressions — RED)
   └── IPSR-LCG-T-2 (guard + tooltip + docs — GREEN)
```

## 5. Coverage closure (scenario / clause → task)

| Requirement clause | Owned by |
|---|---|
| R-1 · 1.1 no save request, "not found" shown | T-1 case 1.1 → T-2 |
| R-1 · 1.1 `BUT must NOT send null / alter stored contact` | T-1 case 1.1 (PATCH not called, body untouched); manual check A (contact kept after reload) |
| R-1 · 1.2 P22 | T-1 case 1.2 |
| R-2 · 2.1 accepted name saves | T-1 case 2.1; manual check B |
| R-2 · 2.1 `AND IT MUST NOT show "not found"` | T-1 case 2.1 (`showContactError` false) |
| R-2 · 2.2 loaded free-text saves | T-1 case 2.2 |
| R-2 · 2.3 picked / blank saves | T-1 case 2.3 + existing `:438`, `:495` |
| R-3 · 3.1 tooltip with flag on | T-1 case 3.1 |
| R-3 · 3.1 `BUT must NOT change when flag off` | T-1 case 3.1 (flag off → `false`) |
| DD-2 unresolved child blocks | T-1 case DD-2 |

## 6. Commit (after user go-ahead only)

`🔧 fix(ipsr-general-information): apply the Results lead contact save guard on every portfolio` — no apostrophes, `$` or quotes in the subject (Jenkins).
