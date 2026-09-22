# Module Spec — `tasks.md`

> Linked: [`requirements.md`](./requirements.md) + [`design.md`](./design.md) (same folder). Depth: **Standard**. Budget from `design.md` §"Budget (Step 2.4)": **4 tasks, ~180 LOC, 1 review round each** — `/akili-execute` should stop and escalate if actuals run materially past this.

---

## 1. Scope of this task list

- **Module / feature:** `changes/ai-review-save-flow` — AI Review modal save/validate flow
- **Linked spec:** `docs/specs/changes/ai-review-save-flow/requirements.md` + `design.md`
- **Sprint / target phase:** none declared
- **Owner / driver:** M.Giraldo@cgiar.org (requester)
- **Status:** not-started

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved (status: approved at Phase 1 gate, 2026-09-17).
- [x] `design.md` is approved (status: approved at Phase 2 gate, 2026-09-17 — user selected Continue without requesting `judgment-day` review).
- [x] Open questions in `requirements.md` and `design.md` are all resolved (none outstanding).
- [ ] CLARISA dependencies — N/A, none exist for this spec.
- [x] No conflicting in-flight spec touching the same files — confirmed via repo search: no other spec under `docs/specs/` references `ai-review.component.*` or `ai-review.service.ts`.
- [ ] Migration name and reversibility — N/A, no migration in this spec.

---

## 3. Task list

### `AIR-T-1` — Remove the bulk Validate control and its dead code

- **Type:** `client | tests`
- **Description:** Delete the "Validate" button and its wrapper from the Impact Areas section, and everything that exists only to support it: the component members, the SCSS rule, and the spec assertions that exercise them. This is the only task that touches `.scss`.
- **Implements:** `AIR-R-1`, `AIR-R-2`, `AIR-AC-1`, `AIR-AC-2`
- **Design refs:** `design.md` §6.2 (Components & services), `AIR-DD-1` (including its reversion-challenge verdict: confirmed single call site each, safe to remove)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.scss`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `AIR-T-4`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Tests:**
  - Remove the `describe('onValidateAll', ...)` block and every assertion reading `hasPendingChanges` / `pendingDacScores` / `isValidatingAll` — these would otherwise fail to compile once the members are deleted (TypeScript, not just Jest, catches a missed reference).
  - Add one assertion that the rendered template contains no element carrying the `validate-all-button` class (or equivalent query for the removed button) after `fixture.detectChanges()`.
  - Keep and re-run the existing `onSaveDacScore` describe block unmodified — it is the regression guard for `AIR-R-2` (per-card save path must be untouched).
- **What disqualifies the evidence:** a green suite that still imports/compiles against a deleted member would mean the deletion was incomplete somewhere else in the file (a stray reference) — `tsc`/`ng build` failing on this file is the disqualifying signal, not a Jest failure. The new "no Validate button" assertion is a presence-check (proves absence, which is exactly what `AIR-R-1` asks for) — it does **not** prove the per-card save flow still works; that proof is the unmodified `onSaveDacScore` suite passing.
- **Input that would make this check fail:** re-adding any markup with the `validate-all-button` class, or leaving one reference to `onValidateAll`/`isValidatingAll`/`hasPendingChanges`/`pendingDacScores` anywhere in `.ts`/`.html`/`.spec.ts` — either fails the new template assertion or fails TypeScript compilation.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`♻️ refactor(ai-review) [SPEC:changes/ai-review-save-flow]: ...` per root `CLAUDE.md`).
  - [ ] `npx eslint` / `npx ng lint --quiet` clean on the four files.
  - [ ] `npx jest --silent --reporters=summary --no-coverage` green, including the updated `ai-review.component.spec.ts`.
  - [ ] No secret/token in any diff (`.cursorrules`) — trivially true, no such surface touched.
  - [ ] Manual grep confirms zero remaining references to `onValidateAll`, `isValidatingAll`, `hasPendingChanges`, `pendingDacScores`, or the `validate-all-button`/`validate-all-section` classes anywhere under `onecgiar-pr-client/src/`.

---

### `AIR-T-2` — Add the unsaved-proposal reminder to the Fields section

- **Type:** `client | tests`
- **Description:** Render `app-alert-status status="warning"` under each field's "Result version" input, before its "Save changes" button, visible exactly when that field has an unsaved change (`field.canSave === true`). English copy per `AIR-R-10`.
- **Implements:** `AIR-R-3`, `AIR-R-4`, `AIR-R-10`, `AIR-R-20`, `AIR-AC-3`
- **Design refs:** `design.md` §6.2, §6.3 (Design system usage), `AIR-DD-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.spec.ts`
- **Depends on:** `AIR-T-1` (same template file — sequenced to avoid overlapping edits, not a functional dependency)
- **Blocks:** `AIR-T-4`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Tests:**
  - Set `field.canSave = true` on a field, run `fixture.detectChanges()`, assert the `app-alert-status` (or its host element) is present with the expected `status="warning"` and non-empty `description`.
  - Set `field.canSave = false`, assert it is absent (behavioral toggle, not just an initial presence check — exercise both states in the same test to prove the `@if` actually reacts to the flag rather than always rendering).
- **What disqualifies the evidence:** a test that only checks the "shown" state proves presence, not the conditional logic — it would still pass if the reminder were unconditionally rendered. The task's tests explicitly assert **both** states to rule that out.
- **Input that would make this check fail:** hardcoding the reminder to always render (fails the "hidden when `canSave` is false" assertion), or binding it to the wrong flag (fails to appear when `canSave` is set true in the test).
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`✨ feat(ai-review) [SPEC:changes/ai-review-save-flow]: ...`).
  - [ ] Lint clean.
  - [ ] `npx jest --silent --reporters=summary --no-coverage` green, including both new reminder-visibility cases.
  - [ ] i18n: no `internationalization/` `TermKey` added — this is the documented, requester-approved exception (`requirements.md` NFR row); confirm the copy stays plain English, matching sibling strings in the same template.
  - [ ] Manual browser check deferred to `AIR-T-4` (jsdom cannot evaluate the reminder's real visual placement/spacing — `design.md` §10).

---

### `AIR-T-3` — Fix `canSave` reset logic and add manual-edit dirty tracking

- **Type:** `client | tests`
- **Description:** In `AiReviewService.onApplyProposal()`, stop unconditionally resetting `field.canSave = true` in `finally`; reset it only on a thrown/rejected save, leaving it `false` after success. In the template, add `(ngModelChange)="field.canSave = true"` on the "Result version" input/textarea so a direct edit re-enables a previously-disabled field.
- **Implements:** `AIR-R-5`, `AIR-R-6`, `AIR-R-7`, `AIR-AC-4`, `AIR-AC-5`, `AIR-AC-6`
- **Design refs:** `design.md` §6.2, `AIR-DD-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts`
  - `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.spec.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.spec.ts`
- **Depends on:** `AIR-T-2` (same template file — sequenced, not a functional dependency)
- **Blocks:** `AIR-T-4`
- **Estimate:** `M`
- **Skills:** `angular-developer`, `tdd`
- **Tests:**
  - `ai-review.service.spec.ts`: write the success-path assertion (`field.canSave === false` after `onApplyProposal` resolves) **first**, confirm it fails against current code (`finally` still resets to `true` unconditionally) — red before the fix, green after, same discipline as a bug regression test even though this spec is Type: Change.
  - `ai-review.service.spec.ts`: write the failure-path assertion (`field.canSave === true` after `onApplyProposal` rejects) — this one should already pass today (existing behavior) and must **stay** passing after the fix, guarding `AIR-R-6` (no regression on retry).
  - `ai-review.component.spec.ts`: simulate a manual edit on the "Result version" control after `field.canSave` was set `false` (post-save state) and assert it flips back to `true` (`AIR-AC-5`).
- **What disqualifies the evidence:** if the "success" test passes without first having been red against the pre-fix code, it is not proven to test the actual defect — it could be passing for an unrelated reason (e.g., a typo that never exercises the real branch). The task requires demonstrating the red-then-green transition, not just a final green.
- **Input that would make this check fail:** reverting the `finally` block to its original unconditional reset (fails the success-path test); forgetting the `(ngModelChange)` hook or binding it to the wrong field object (fails the manual-edit test); swallowing the rejection instead of re-throwing/letting it propagate (fails the failure-path test by never reaching the `catch`/rejection branch).
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(ai-review.service) [SPEC:changes/ai-review-save-flow]: ...`).
  - [ ] Lint clean.
  - [ ] `npx jest --silent --reporters=summary --no-coverage` green for both spec files, with the success-path test's red-before/green-after transition demonstrated in the PR description or task notes.
  - [ ] `onSaveDacScore` / DAC score card behavior re-verified unchanged (no edit made to that path in this task — confirm via unchanged assertions still passing).

---

### `AIR-T-4` — Manual browser verification (the check nothing above can automate)

- **Type:** `tests`
- **Description:** jsdom cannot lay out `app-alert-status`'s real CSS or prove the modal's end-to-end feel — this task is the substitute named in `design.md` §10 for that gap, not an optional nice-to-have. Exercise the full modal by hand against a real dev server: apply a proposal, confirm the reminder appears in a sensible position with readable contrast, save it, confirm the reminder disappears and the button visibly disables, edit the field again, confirm it re-enables, and repeat the same click-through for a DAC score card (Save changes only — no Validate button anywhere).
- **Implements:** `AIR-AC-1` through `AIR-AC-6` (end-to-end smoke, not new automated coverage)
- **Design refs:** `design.md` §10 (Testing Plan — "no automated check" row), `onecgiar-pr-client/CLAUDE.md` §9 ("Verifying in a REAL browser")
- **Files (expected):** none — verification only, no code change.
- **Depends on:** `AIR-T-1`, `AIR-T-2`, `AIR-T-3`
- **Blocks:** `—`
- **Estimate:** `S`
- **Skills:** none (manual verification; no `playwright-cli` — not required to be installed for this check)
- **Tests:** manual, per `onecgiar-pr-client/CLAUDE.md` §9 — inject both `token` **and** `user` into `localStorage` (the two-key trap), and confirm the dev server serving the check is not a stale long-running instance (`window.ng.getComponent(...)` sanity check against disk, per the same section).
- **What disqualifies the evidence:** testing against a stale `ng serve` bundle, or a session missing the `user` localStorage key (both documented traps in `onecgiar-pr-client/CLAUDE.md` §9) — either produces a convincing false negative/positive that looks like a real result but isn't.
- **Input that would make this check fail:** the reminder rendering with unreadable contrast or overlapping the "Save changes" button; the Validate button still visible after a hard refresh; the "Save changes" button staying visibly enabled right after a successful save (the exact defect this whole spec exists to fix).
- **Definition of done:**
  - [ ] Every item in the Description's click-through completed against a freshly-started (non-stale) local dev server with a real, valid session.
  - [ ] Any discrepancy from the expected behavior is filed back against `AIR-T-1`/`AIR-T-2`/`AIR-T-3` rather than silently accepted.
  - [ ] Screenshot or short note of the reminder's real rendered appearance attached to the PR for reviewer reference (no automated gate can substitute for this).

---

## 4. Dependency graph

```
AIR-T-1 (remove Validate + dead code)
   └── AIR-T-2 (add reminder) — sequenced, same template file
         └── AIR-T-3 (fix canSave logic + dirty tracking) — sequenced, same template file
               └── AIR-T-4 (manual browser verification — needs all three landed)
```

All three implementation tasks touch `ai-review.component.html`; they are sequenced to avoid overlapping edits to the same file, not because of a functional ordering requirement. `AIR-T-3`'s service-side half (`ai-review.service.ts`) has no file overlap with `AIR-T-1`/`AIR-T-2` and could in principle start earlier, but is kept last to land the full Fields-section behavior (`AIR-T-2` + `AIR-T-3`) as one coherent, testable unit.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `AIR-TEST-1` | unit (client) | `AIR-R-1`, `AIR-AC-1` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.spec.ts` |
| `AIR-TEST-2` | unit (client) | `AIR-R-2`, `AIR-AC-2` (regression, unmodified) | same file — existing `onSaveDacScore` describe block |
| `AIR-TEST-3` | unit (client) | `AIR-R-3`, `AIR-R-4`, `AIR-AC-3` | same file — reminder show/hide cases |
| `AIR-TEST-4` | unit (client) | `AIR-R-5`, `AIR-R-6`, `AIR-AC-4`, `AIR-AC-6` | `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.spec.ts` — success/failure `canSave` branches |
| `AIR-TEST-5` | unit (client) | `AIR-R-7`, `AIR-AC-5` | `ai-review.component.spec.ts` — manual-edit re-enable |
| `AIR-TEST-6` | manual (browser) | `AIR-AC-1`..`AIR-AC-6` (smoke) | `AIR-T-4` — no file, human verification against a real dev server |

Client coverage MUST stay above 50/60/60/60 (`onecgiar-pr-client/package.json`). Net effect of this spec is expected to be neutral-to-positive: dead code and its now-meaningless tests are removed, and every new branch (`AIR-R-3`..`AIR-R-7`) gains direct test coverage in the same task that introduces it.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`<emoji> <type>(<scope>) [SPEC:changes/ai-review-save-flow]: <description>`).
- [ ] CI green: lint, `npx jest --silent --reporters=summary --no-coverage`, build, SonarCloud. (`migration:check:ci` is unaffected — no migration in this spec.)
- [ ] `AIR-T-4`'s manual QA completed and attached to the PR (screenshot/note) before merge — this is the substitute for the one defect class nothing above automates.
- [ ] Bilateral / platform-report: N/A, not touched.
- [ ] Admin / role / phase change: N/A.
- [ ] Telemetry: N/A — no new logging introduced; nothing new to verify post-deploy beyond the existing `onApplyProposal`/`persistDacScore` call volume being unchanged.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified in the target environment.
- [ ] Consider promoting "AI Review modal" into a `docs/trd/trd.md` module entry — it has none today (`design.md` §13).
- [ ] File a follow-up for the deferred i18n retrofit of this component's copy into `TermKey`s, if the team decides to pursue it (`requirements.md` NFR row).
- [ ] `docs/prd.md` Open Questions — none of this spec's items map to an existing `OQ-#`; no update needed there.

---

## 8. Roll-back plan

1. Revert the PR(s) covering `AIR-T-1` through `AIR-T-3` (single PR expected, given the ~180 LOC budget — see PR Strategy in the Phase 3 summary).
2. No migration to run `migration:revert` on — N/A.
3. No feature flag to disable — N/A, this ships always-on.
4. No bilateral/platform-report payload to verify — N/A, unaffected.
5. No downstream consumer notification needed — client-only UI/behavior change with no external contract.

---

## Required cross-references

- [`requirements.md`](./requirements.md) and [`design.md`](./design.md) (same folder).
- `docs/prd.md` — `US-S1`, `AC-1`.
- `docs/ux-ui/design.md` — §10 a11y baseline.
- `docs/trd/trd.md` — no AI Review module entry exists yet (gap noted, not blocking).
- `onecgiar-pr-client/CLAUDE.md` §9 — "Verifying in a REAL browser" (two traps), authoritative for `AIR-T-4`.
